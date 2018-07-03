(ns oph.va.virkailija.scoring-routes-spec
  (require [speclj.core
            :refer [should should-not should= describe
                    it tags around-all run-specs]]
           [oph.common.testing.spec-plumbing :refer [with-test-server!]]
           [oph.va.virkailija.server :refer [start-server]]
           [oph.va.virkailija.grant-data :as grant-data]
           [oph.va.virkailija.common-utils :as u]
           [oph.va.virkailija.scoring :as scoring]))

(def user1 {:person-oid "12345"
           :first-name "First"
           :surname "User"})

(def user2 {:person-oid "45678"
            :first-name "Second"
            :surname "User"})

(defn get-scores [grant-id application-id]
  (-> (str "/api/avustushaku/" grant-id "/hakemus/" application-id "/scores")
      u/get!
      :body
      u/json->map
      :scores))

(describe
  "Remove score"

  (tags :scoring)

  (around-all
    [_]
    (u/add-mock-authentication u/user-authentication)
    (with-test-server!
      :virkailija-db
      #(start-server
         {:host "localhost"
          :port u/test-server-port
          :auto-reload? false
          :without-authentication? true}) (_))
    (u/remove-mock-authentication u/user-authentication))

  (it "removes score"
      (let [grant (first (grant-data/get-grants))
            submission (u/create-submission (:form grant) {})
            application (u/create-application grant submission)]
        (scoring/add-score
          (:id grant) (:id application) (:identity u/user-authentication) 0 3)
        (let [scores (get-scores (:id grant) (:id application))
              score (first scores)]
          (should= 1 (count scores))
          (let [result
                (u/delete!
                  (str "/api/avustushaku/evaluations/" (:arvio-id score)
                       "/scores/" (:selection-criteria-index score) "/"))]
            (should= 200 (:status result))
            (should= 0 (count (get-scores (:id grant) (:id application))))))))

  (it "prevents removing other user score"
      (let [grant (first (grant-data/get-grants))
            submission (u/create-submission (:form grant) {})
            application (u/create-application grant submission)]
        (scoring/add-score
          (:id grant) (:id application) (:identity u/admin-authentication) 0 3)
        (let [scores (get-scores (:id grant) (:id application))
              score (first scores)]
          (should= 1 (count scores))
          (let [result
                (u/delete!
                  (str "/api/avustushaku/evaluations/" (:arvio-id score)
                       "/scores/" (:selection-criteria-index score) "/"))]
            (should= 200 (:status result))
            (let [post-scores (get-scores (:id grant) (:id application))
                  post-score (first post-scores)]
              (should= 3 (:score post-score))
              (should= 0 (:selection-criteria-index post-score))
              (should= 1 (count post-scores))))))))
