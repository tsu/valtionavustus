(ns oph.va.schema
  (:require [schema.core :as s]
            [oph.form.schema :refer :all]))

(s/defschema AvustusHaku {:id Long
                          :content s/Any
                          :form Long
                          :created_at s/Inst})

(s/defschema Hakemus
  "Hakemus contains hakemus info and last submission"
  {:id      s/Str
   :status (s/enum "draft_unverified" "draft_verified" "submitted")
   :submission Submission})
