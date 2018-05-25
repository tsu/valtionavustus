(ns oph.va.virkailija.rondo-service-spec
  (:require [speclj.core
            :refer [should should-not should= describe
                    it tags around-all run-specs]]
             [oph.common.testing.spec-plumbing :refer [with-test-server!]]
             [oph.va.virkailija.common-utils
              :refer [test-server-port create-submission create-application]]
             [oph.va.virkailija.server :refer [start-server]]
             [oph.va.virkailija.remote-file-service :refer [RemoteFileService]]
             [oph.va.virkailija.remote-file-service :refer :all]
             [oph.va.virkailija.rondo-service :as rondo-service]
             [oph.va.virkailija.grant-data :as grant-data]
             [oph.va.virkailija.application-data :as application-data]
             [oph.va.virkailija.payments-data :as payments-data]
             [oph.va.virkailija.rondo-scheduling :as rondo-scheduling]
             [clojure.string :as strc]
             [clojure.data.xml :as xml]
             [oph.va.virkailija.invoice :as invoice]
             [clojure.tools.logging :as log]
             [clj-time.format :as f]
             [clj-time.core :as t]))


(def configuration {:enabled? true
                   :local-path "/tmp"
                   :remote_path "/to_rondo"
                   :remote_path_from "/tmp"})

(def my-formatter (f/formatters :year-month-day))

(def invoice-date (f/unparse my-formatter (t/today-at 00 01)))

(def resp-tags
                  [:VA-invoice
                     [:Header
                      [:Pitkaviite "123/456/78"]
                      [:Maksupvm invoice-date]]])

(def user {:person-oid "12345"
           :first-name "Test"
           :surname "User"})

 (def test-data {:put nil
                 :get nil
                 :rm nil
                 :cdls (lazy-seq ["file.xml"])})

(defn do-test-sftp [& {:keys [file method path config]}]
  (= method :put) nil
  (= method :get) nil
  (= method :rm ) nil
  (= method :cdls) (lazy-seq ["file.xml"]))

(defrecord TestFileService [configuration]
  RemoteFileService
  (send-payment-to-rondo! [service payment-values] (rondo-service/send-payment! (assoc payment-values :config (:configuration service) :func do-test-sftp)))
  (get-remote-file-list [service]
                        (let [result (do-test-sftp :method :cdls
                        :path (:remote_path_from (:configuration service))
                        :config (:configuration service))]
   (map #(last (strc/split % #"\s+")) (map str result))))
  (get-local-path [service] (:local-path (:configuration service)))
  (get-remote-file [service filename]
                   (let [xml-file-path (format "%s/%s" (rondo-service/get-local-file-path (:configuration service)) filename)]
                     (invoice/write-xml! (xml/sexp-as-element resp-tags) xml-file-path)
                      ; (do-test-sftp :method :get
                      ;           :file xml-file-path
                      ;           :path (:remote_path_from (:configuration service))
                      ;           :config (:configuration service))
                     ))
  (get-local-file [service filename]
                  (format "%s/%s" (rondo-service/get-local-file-path (:configuration service)) filename))
  (delete-remote-file [service filename]
                      (do-test-sftp :method :rm
                            :file filename
                            :path (:remote_path_from (:configuration service))
                            :config (:configuration service))))

(defn create-test-service [conf]
  (TestFileService. conf))

(describe "Testing Rondo Service functions"
  (tags :rondoservice)

            (around-all [_] (with-test-server! :virkailija-db
                    #(start-server
                       {:host "localhost"
                        :port test-server-port
                        :auto-reload? false}) (_)))

          (it "gets list of files in mock server"
              (let [test-service (create-test-service configuration)
                    result (get-remote-file-list test-service)]
              (should= result (:cdls test-data))))

          (it "gets local path in mock server"
              (let [test-service (create-test-service configuration)]
              (should= (get-local-path test-service) (:local-path configuration))))

          (it "Gets state of payments from a remote server"
              (let [test-service (create-test-service configuration)
                    grant (first (grant-data/get-grants))
                    submission (create-submission (:form grant) {})
                    application (create-application grant submission)
                    payment (payments-data/create-payment
                      {:application-id (:id application)
                       :payment-sum 26000
                       :batch-id nil
                       :state 1
                       :invoice-date invoice-date}
                      user)
                     result  (rondo-scheduling/get-state-of-payments test-service)]
              (println grant)
              (should= 3 (:state (application-data/get-application-payment (:id application))))))
          )
(run-specs)
