(ns oph.va.hakija.schema
  (:require [schema.core :as s]
            [oph.soresu.form.schema :refer :all]
            [oph.va.schema :refer :all]))

(s/defschema Hakemus
  "Hakemus contains hakemus, last submission and server validation error info about it"
  {:id     (s/maybe s/Str)
   (s/optional-key :created-at) s/Inst
   :version Long
   :version-date s/Inst
   :status HakemusStatus
   :status-comment (s/maybe s/Str)
   :register-number (s/maybe s/Str)
   :submission VaSubmission
   :validation-errors SubmissionValidationErrors})

(s/defschema HakemusInfo
  "Hakemus with user key and language"
  {:id s/Str
   :language s/Str})
