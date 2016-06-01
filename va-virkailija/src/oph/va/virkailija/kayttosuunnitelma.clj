(ns oph.va.virkailija.kayttosuunnitelma
  (:require [clojure.string :as str]
            [clostache.parser :refer [render]]
            [oph.common.email :as email]
            [oph.soresu.form.formutil :as formutil]
            [oph.va.budget :as va-budget]))


(defn amount-cell [children]
  (str "<th class='amount budgetAmount'>" children "</th>"))

(defn budget-row [language use-detailed-costs item]
  (let [rows
        (str "<tr>"
             "<td>"(-> item :label language) "</td>"
             "<td class='amount budgetAmount'>" (:original item) "</td>"
             "<td class='amount budgetAmount'>" (if use-detailed-costs (:overridden item)) "</td>"
             "</tr>")
        ]
    rows
    )
  )

(defn tbody [table language use-detailed-costs]
  (let [children (:children table)
        rows (mapv (partial budget-row language use-detailed-costs)  children)
        rows-s (str/join " " rows)
        ]
    (str "<tbody>" rows-s "</tbody>")))

(defn find-table [children index answers overridden-answers]
  (let [table (nth children index {})
        map-children (fn [x] (assoc x :original (va-budget/read-amount x answers) :overridden (va-budget/read-amount x overridden-answers)))
        new-children (map map-children (:children table))
        new-table (assoc table :children new-children)
        ]
    new-table))


(defn kayttosuunnitelma [avustushaku hakemus form-content answers translate language]
  (let [template (email/load-template "templates/kayttosuunnitelma.html")
        overridden-answers (-> hakemus :arvio  :overridden-answers)
        arvio (:arvio hakemus)
        use-detailed-costs (:useDetailedCosts arvio)
        budget-elements (->> form-content formutil/flatten-elements (filter va-budget/is-budget-field?))
        children (:children (first budget-elements))
        has-kayttosuunnitelma (not= nil children)
        table0 (find-table children 0 answers overridden-answers)
        tbody0 (tbody table0 language use-detailed-costs)
        table1 (find-table children 1 answers overridden-answers)
        table1-label (-> table1 :label language)
        tbody1 (tbody table1 language true)
        table2 (find-table children 2 answers overridden-answers)
        table2-label (-> table2 :label language)
        tbody2 (tbody table2 language true)
        cost-granted (:costsGranted arvio)
        self-financing-percentage (-> avustushaku :content :self-financing-percentage)
        oph-financing-percentage (- 100 self-financing-percentage)
        total-granted (:budget-granted arvio)
        sum-by-field (fn [table field] (reduce + (map field (:children table))))
        total-original-costs (sum-by-field table0 :original)
        total-overridden-costs (if use-detailed-costs
                                 (sum-by-field table0 :overridden)
                                 cost-granted)
        total-incomes (sum-by-field table1 :original)
        total-financing (sum-by-field table2 :original)
        netto-total-1 (- total-original-costs total-incomes)
        netto-total-2 (- total-overridden-costs total-incomes)
        total+original (- total-original-costs total-incomes total-financing)
        total+overridden (- total-overridden-costs total-incomes total-financing)
        total-avustus  (-> total+original
                        (* oph-financing-percentage)
                        (/ 100)
                        Math/floor)
        total-haettu-omarahoitus  (-> total+original
                           (* (- 100 oph-financing-percentage))
                           (/ 100)
                           Math/ceil)

        total-myonnetty-omarahoitus (-> total+overridden
                                        (* (- 100 oph-financing-percentage))
                                        (/ 100)
                                        Math/ceil)


        oph-financing-note (if (= 100 oph-financing-percentage) "" (str oph-financing-percentage "%"))
        show-financing-note (not= self-financing-percentage 0)
        params {:t                      translate
                :total-original-costs   total-original-costs
                :total-overridden-costs total-overridden-costs
                :amount-cell            amount-cell
                :total-incomes          total-incomes
                :netto-total-1          netto-total-1
                :netto-total-2          netto-total-2
                :total-financing        total-financing
                :oph-financing-note     oph-financing-note
                :show-financing-note    show-financing-note
                :total-granted          total-granted
                :total-avustus          total-avustus
                :total-haettu-omarahoitus      total-haettu-omarahoitus
                :total-myonnetty-omarahoitus      total-myonnetty-omarahoitus
                :tbody0 tbody0
                :tbody1 tbody1
                :table1-label table1-label
                :tbody2 tbody2
                :table2-label table2-label
                }
        body (render template params)
        ]
    {
     :body body
     :nettomenot-yhteensa (- total-overridden-costs total-incomes)
     :has-kayttosuunnitelma has-kayttosuunnitelma
     }
    )
  )