(ns oph.va.admin-ui.payments.payments
  (:require [oph.va.admin-ui.payments.utils :refer [no-nils? valid-email?]]
            [oph.va.admin-ui.utils :refer [format]]
            [cljs-time.coerce :as tc]
            [cljs-time.format :as tf]))

(defn valid-batch-values?
  [values]
  (and (no-nils? values
                 [:transaction-account :due-date :invoice-date :document-type
                  :receipt-date])
       (valid-email? (:inspector-email values))
       (valid-email? (:acceptor-email values))))

(defn any-account-nil? [a]
  (some?
    (some #(when-not (and (some? (get % :lkp-account))
                          (some? (get % :takp-account))) %) a)))

(defn get-batch-values [batch]
  (assoc
    (select-keys batch
                 [:acceptor-email
                  :inspector-email
                  :batch-number
                  :receipt-date])
    :state 0
    :organisation
    (if (= (:document-type batch) "XB")
      "6604"
      "6600")
    :batch-id (:id batch)))

(defn batch-payable? [pred applications]
  (and
    (not (empty? applications))
    (true?
      (some
        pred
        applications))))

(defn multibatch-payable? [applications]
  (batch-payable?
    (fn [application]
      (some (fn [payment] (= (:state payment) 1))
            (:payments application)))
    applications))

(defn singlebatch-payable? [applications]
  (batch-payable?
    (fn [{:keys [payments]}]
      (or
        (empty? payments)
        (some (fn [payment]
                (< (:state payment) 2))
              payments)))
    applications))

(defn format-date [d]
  (when (some? d)
   (format "%04d-%02d-%02d"
           (.getFullYear d)
           (+ (.getMonth d) 1 )
           (.getDate d))))

(defn convert-payment-dates [values]
  (-> values
      (update :due-date format-date)
      (update :receipt-date format-date)
      (update :invoice-date format-date)))

(defn parse-date [s]
  (-> s
      tf/parse
      tc/to-date))

(defn parse-batch-dates [batch]
  (-> batch
      (update :due-date parse-date)
      (update :receipt-date parse-date)
      (update :invoice-date parse-date)))

(def error-messages
  {"timeout" "Rondo-yhteydessä onglemia"
   "already-paid" "Maksatukset on jo lähetetty"
   "exception" "Palvelinvirhe"})

(defn get-error-messages [errors default-value]
  (map #(get error-messages % default-value) errors))

(defn convert-application-payments [application]
  (let [application-info (select-keys application [:project-name :organization])]
    (map
      #(merge application-info application)
      (:payments application))))

(defn flatten-payments [applications]
  (reduce #(into %1 (convert-application-payments %2)) [] applications))
