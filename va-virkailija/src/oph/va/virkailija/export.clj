(ns oph.va.virkailija.export
  (:use [clojure.tools.trace :only [trace]])
  (:require [clojure.java.io :as io]
            [clojure.set :refer :all]
            [dk.ative.docjure.spreadsheet :as spreadsheet]
            [oph.soresu.form.formutil :as formutil]
            [oph.va.virkailija.hakudata :as hakudata])
  (:import [java.io ByteArrayOutputStream ByteArrayInputStream]))

(def main-sheet-name "Hakemukset")
(def main-sheet-columns ["Diaarinumero"
                         "Hakijaorganisaatio"
                         "Hankkeen nimi"
                         "Ehdotettu budjetti"
                         "OPH:n avustuksen osuus"
                         "Myönnetty avustus"
                         "Arviokeskiarvo"])

(def answers-sheet-name "Vastaukset")

(def answers-fixed-fields
  [["fixed-register-number" "Diaarinumero" :register-number]
   ["fixed-organization-name" "Hakijaorganisaatio" :organization-name]
   ["fixed-project-name" "Projektin nimi" :project-name]
   ["fixed-budget-total" "Ehdotettu budjetti" :budget-total]
   ["fixed-budget-oph-share" "OPH:n avustuksen osuus" :budget-oph-share]
   ["fixed-budget-granted" "Myönnetty avustus" (comp :budget-granted :arvio)]
   ["fixed-score-total-average" "Arviokeskiarvo" (comp :score-total-average :scoring :arvio)]])

(defn- has-child? [id node]
  (when-let [children (:children node)]
    (let [child-list (->> children
                          (filter (fn [child] (= (:id child) id))))]
      (when (not (empty? child-list))
        node))))

(defn- find-parent-label [wrappers id]
  (when-let [found-parent (->> wrappers
                               (filter (partial has-child? id))
                               first)]
    (-> found-parent :label :fi)))

(defn- valid-hakemus? [hakemus]
  (or (= (:status hakemus) "submitted")
      (= (:status hakemus) "pending_change_request")))

(defn- avustushaku->formlabels [avustushaku]
  (let [form (-> avustushaku :form :content)
        wrappers (formutil/find-wrapper-elements form)]
    (->> form
         (formutil/find-fields)
         (map (fn [field] [(:id field)
                           (or (-> field :label :fi)
                               (find-parent-label wrappers (:id field)))
                           (:fieldType field)])))))

(defn- avustushaku->hakemukset [avustushaku]
  (->> (:hakemukset avustushaku)
       (filter valid-hakemus?)))

(defn- hakemus->map [hakemus]
  (let [answers (formutil/unwrap-answers (:answers hakemus))]
    (reduce (fn [answer-map [field-name _ lookup-fn]]
              (assoc answer-map field-name (lookup-fn hakemus)))
            answers
            answers-fixed-fields)))

(defn- extract-answer-values [avustushaku answer-keys answers]
  (let [get-by-id (fn [answer-set id] (get answer-set id))
        extract-answers (fn [answer-set] (map (partial get-by-id answer-set) answer-keys))]
    (map extract-answers answers)))

(defn flatten-answers [avustushaku answer-keys answer-labels]
  (let [hakemukset (avustushaku->hakemukset avustushaku)
        answers (map hakemus->map hakemukset)
        flat-answers (->> (extract-answer-values avustushaku answer-keys answers)
                          (sort-by first))]
    (apply conj [answer-labels] flat-answers)))

(defn- find-all-answer-keys [avustushaku]
  (let [hakemukset (avustushaku->hakemukset avustushaku)]
    (reduce (fn [answer-key-set hakemus]
                                 (apply conj
                                        answer-key-set
                                        (keys (hakemus->map hakemus))))
                               #{}
                               hakemukset)))

(defn- find-and-combine [accumulated [parent children]]
  (let [existing (->> accumulated
                      (filter (fn [val] (= val parent))))]
    (if (not (empty? existing))
      (trace "parent found" parent)
      (trace "no existing" parent))))

(defn generate-growing-fieldset-lut [avustushaku]
  (let [answer-list (->> (avustushaku->hakemukset avustushaku)
                         (sort-by first)
                         (map :answers))
        list-keys (fn [child]
                    (:key child))
        descend-to-child (fn [child]
                           [(:key child) (mapv list-keys (:value child))])
        convert-answers-to-lookup-table (fn [value]
                                          [(:key value) (mapv descend-to-child (:value value))])
        process-answers (fn [answers] (->> answers
                                           (filter (fn [value] (vector? (:value value))))
                                           (mapv convert-answers-to-lookup-table)))
        combine (fn [accumulated single-entry]
                  (map (partial find-and-combine accumulated) single-entry))]
    (->> answer-list
         (mapv process-answers)
         (reduce combine []))))

(defn testbox []
  (let [avustushaku (hakudata/get-combined-avustushaku-data 1)
        answer-key-label-type-triples (avustushaku->formlabels avustushaku)]
    (generate-growing-fieldset-lut avustushaku)))

(def hakemus->main-sheet-rows
  (juxt :register-number
        :organization-name
        :project-name
        :budget-total
        :budget-oph-share
        (comp :budget-granted :arvio)
        (comp :score-total-average :scoring :arvio)))

(defn- fit-columns [columns sheet]
  ;; Make columns fit the data
  (doseq [index (range 0 (count columns))]
    (.autoSizeColumn sheet index)))

(defn export-avustushaku [avustushaku-id identity]
  (let [avustushaku (hakudata/get-combined-avustushaku-data avustushaku-id)
        hakemus-list (->> (avustushaku->hakemukset avustushaku)
                          (sort-by first))

        output (ByteArrayOutputStream.)

        main-sheet-rows (mapv hakemus->main-sheet-rows hakemus-list)
        wb (spreadsheet/create-workbook main-sheet-name
                                        (apply conj [main-sheet-columns] main-sheet-rows))

        main-sheet (spreadsheet/select-sheet main-sheet-name wb)
        main-header-row (first (spreadsheet/row-seq main-sheet))

        answer-key-label-type-triples (avustushaku->formlabels avustushaku)
        answer-keys (apply conj
                           (mapv first answers-fixed-fields)
                           (map first answer-key-label-type-triples))
        answer-labels (apply conj
                             (mapv second answers-fixed-fields)
                             (map second answer-key-label-type-triples))
        answer-flatdata (flatten-answers avustushaku answer-keys answer-labels)
        answers-sheet (let [sheet (spreadsheet/add-sheet! wb answers-sheet-name)]
                        (spreadsheet/add-rows! sheet answer-flatdata)
                        sheet)
        answers-header-row (first (spreadsheet/row-seq answers-sheet))

        header-style (spreadsheet/create-cell-style! wb {:background :yellow
                                                         :font {:bold true}})]

    (fit-columns main-sheet-columns main-sheet)
    (fit-columns answer-keys answers-sheet)

    ;; Style first row
    (spreadsheet/set-row-style! main-header-row header-style)
    (spreadsheet/set-row-style! answers-header-row header-style)

    (.write wb output)
    (ByteArrayInputStream. (.toByteArray output))))
