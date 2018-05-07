(ns oph.va.virkailija.virkailija-server-spec
  (:use [clojure.tools.trace])
  (:require [clojure.string :as string]
            [speclj.core :refer :all]
            [org.httpkit.client :as http]
            [cheshire.core :refer :all]
            [clj-time.format :as f]
            [clj-time.local :as l]
            [oph.common.testing.spec-plumbing :refer :all]
            [oph.va.virkailija.server :refer :all]
            [oph.soresu.common.db :refer [exec]]
            [oph.va.hakija.api.queries :as hakija-queries]
            [oph.va.virkailija.payments-data :as payments-data]
            [oph.soresu.form.db :as form-db]))

(def test-server-port 9001)
(def base-url (str "http://localhost:" test-server-port))
(defn path->url [path] (str base-url path))
(defn get! [path] @(http/get (path->url path) {:as :text}))
(defn put! [path body] @(http/put (path->url path) {:body (generate-string body true)
                                                    :headers {"Content-Type" "application/json"}}))
(defn post! [path body] @(http/post (path->url path) {:body (generate-string body true)
                                                      :headers {"Content-Type" "application/json"}}))
(defn delete! [path] @(http/delete (path->url path) {:as :text}))
(defn json->map [body] (parse-string body true))

(def valid-payment-values
  {:state 1
   :batch-id nil
   :payment-sum 50000})

(def user-authentication
  {:cas-ticket nil
   :timeout-at-ms (+ 100000000 (System/currentTimeMillis))
   :identity {:person-oid "1.2.111.111.11.11111111111",
              :first-name "Kalle",
              :surname "Käyttäjä",
              :email nil,
              :lang "fi",
              :privileges '("va-user"),
              :username "kayttaja"}})

(def admin-authentication
  {:cas-ticket nil
   :timeout-at-ms (+ 100000000 (System/currentTimeMillis))
   :identity {:person-oid "1.1.111.111.11.11111111111",
              :first-name "Tero",
              :surname "Testaaja",
              :email nil,
              :lang "fi",
              :privileges '("va-admin" "va-user"),
              :username "testaaja"}})

(defn create-submission [form-id answers]
  (form-db/create-submission! form-id answers))

(defn- generate-hash-id []
  "Function for generating test id"
  (java.util.UUID/randomUUID))

(defn create-application [grant submission]
  (first (exec :form-db hakija-queries/create-hakemus
               {:avustushaku_id (:id grant)
                :status :submitted
                :user_key (generate-hash-id)
                :form_submission_id (:id submission)
                :form_submission_version (:version submission)
                :version (:version submission)
                :budget_total 200000
                :budget_oph_share 1500000
                :organization_name "Test Organisation"
                :project_name "Test Project"
                :language "fi"
                :register_number "123/456/78"
                :hakemus_type "hakemus"})))

(describe "HTTP server"

  (tags :server)

  ;; Start HTTP server for running tests
  (around-all [_] (with-test-server! :virkailija-db
                    #(start-server
                       {:host "localhost"
                        :port test-server-port
                        :auto-reload? false}) (_)))

  (it "GET to / without authentication should redirect to login page"
      (let [{:keys [status body]} (get! "/")]
        (should= 200 status)
        (should-contain #"login" body))))

(describe
  "Payments routes"

  (tags :server :payments)

  (around-all
    [_]
    (with-test-server!
      :virkailija-db
      #(start-server
         {:host "localhost"
          :port test-server-port
          :auto-reload? false
          :without-authentication? true
          :authentication admin-authentication}) (_)))

  (it "creates new payment"
      (let [{:keys [body]} (get! "/api/v2/grants/")
            grant (first (json->map body))
            submission (create-submission (:form grant) {})
            application (create-application grant submission)
            payment-values (assoc valid-payment-values
                                  :application-id (:id application)
                                  :application-version (:version application))
            {:keys [status body]}
            (post! "/api/v2/payments/" payment-values)]
        (should= 200 status)
        (should= (assoc payment-values
                        :version 0)
                 (dissoc (json->map body) :id))))

  (it "deletes created payment"
      (let [{:keys [body]} (get! "/api/v2/grants/")
            grant (first (json->map body))
            submission (create-submission (:form grant) {})
            application (create-application grant submission)
            payment-values (assoc valid-payment-values
                                  :application-id (:id application)
                                  :application-version (:version application))
            {:keys [body]}
            (post! "/api/v2/payments/" payment-values)
            payment (json->map body)]
        (should (some? (payments-data/get-payment (:id payment))))
        (let [{:keys [status body]}
              (delete! (format "/api/v2/payments/%d/" (:id payment)))]
          (should= 200 status)
          (should= nil (payments-data/get-payment (:id payment))))))

  (it "prevents delete of older payment"
      (let [{:keys [body]} (get! "/api/v2/grants/")
            grant (first (json->map body))
            submission (create-submission (:form grant) {})
            application (create-application grant submission)
            payment-values (assoc valid-payment-values
                                  :application-id (:id application)
                                  :application-version (:version application))
            {:keys [body]}
            (post! "/api/v2/payments/" payment-values)
            payment
            (payments-data/update-payment
              (assoc (json->map body) :state 2 :filename "")
              {:person-oid "" :first-name "" :surname ""})
            {:keys [status body]}
            (delete! (format "/api/v2/payments/%d/" (:id payment)))]
        (should= 400 status)
        (should (some? (payments-data/get-payment (:id payment)))))))

(run-specs)
