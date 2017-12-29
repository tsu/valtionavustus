(ns va-payments-ui.payments
  (:require [reagent.core :as r]
            [cljsjs.material-ui]
            [cljs-react-material-ui.reagent :as ui]
            [cljs-time.format :as tf]
            [va-payments-ui.applications :refer [state-to-str]]))

(def date-formatter (tf/formatter "dd.MM.yyyy"))
(def date-time-formatter (tf/formatter "dd.MM.yyyy HH:mm"))

(defn to-simple-date [d] (tf/unparse-local date-formatter (tf/parse d)))

(defn to-simple-date-time
  [d]
  (tf/unparse-local date-time-formatter (tf/parse d)))

(defn render-history-item
  [i application]
  [ui/table-row {:key i}
   [ui/table-row-column (to-simple-date-time (:created-at application))]
   [ui/table-row-column (:version application)]
   [ui/table-row-column (state-to-str (:state application))]
   [ui/table-row-column (to-simple-date (:invoice-date application))]
   [ui/table-row-column (to-simple-date (:due-date application))]
   [ui/table-row-column (to-simple-date (:receipt-date application))]
   [ui/table-row-column (:transaction-account application)]
   [ui/table-row-column (:document-type application)]
   [ui/table-row-column (:inspector-email application)]
   [ui/table-row-column (:acceptor-email application)]
   [ui/table-row-column
    (when (:deleted application)
      (to-simple-date-time (:deleted application)))]])

(defn render-history
  [payments]
  [ui/table {:fixed-header true :selectable false}
   [ui/table-header {:adjust-for-checkbox false :display-select-all false}
    [ui/table-row [ui/table-header-column "Aika"]
     [ui/table-header-column "Versio"] [ui/table-header-column "Tila"]
     [ui/table-header-column "Laskun päivä"] [ui/table-header-column "Eräpäivä"]
     [ui/table-header-column "Tositepäivä"]
     [ui/table-header-column "Maksuliikemenotili"]
     [ui/table-header-column "Tositelaji"] [ui/table-header-column "Tarkastaja"]
     [ui/table-header-column "Hyväksyjä"] [ui/table-header-column "Poistettu"]]]
   [ui/table-body {:display-row-checkbox false}
    (doall (map-indexed render-history-item payments))]])

(defn find-application-payment
  [payments application-id application-version]
  (first (filter #(and (= (:application-version %) application-version)
                       (= (:application-id %) application-id))
           payments)))

(defn combine
  [applications payments]
  (mapv
    #(assoc % :payment (find-application-payment payments (:id %) (:version %)))
    applications))
