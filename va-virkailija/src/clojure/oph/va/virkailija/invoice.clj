(ns oph.va.virkailija.invoice
  (:require [oph.va.virkailija.lkp-templates :as lkp]
            [clojure.data.xml :refer [emit emit-str parse
                                      sexp-as-element]]
            [clj-time.core :as t]
            [clj-time.coerce :as c]
            [clj-time.format :as f]
            [clojure.string :as c-str]))

(def organisations {"XA" 6600
                    "XE" 6600
                    "XB" 6604})

(defn get-answer-value
  ([answers key]
   (:value
    (first
      (filter #(= (:key %) key) answers))))
  ([answers key not-found]
   (or (get-answer-value answers key) not-found)))

(defn get-batch-key
  ([organisation year batch-number]
   (format "%s%02d%03d" organisation year batch-number))
  ([batch grant]
   "Generating batch id of organisation, year and batch-number.
  Batch id is something like '660017006' where 6600 is organisation, 17 is
  year and 006 is order number or identification number, if you will.
  If some of values is missing, nil is being returned."
   (when (and (:created-at batch)
            (some? (get-in grant [:content :document-type]))
            (:batch-number batch))
     (get-batch-key
       (get organisations (get-in grant [:content :document-type]))
       (mod (t/year (c/to-date-time (:created-at batch))) 100)
       (:batch-number batch)))))

(defn payment-to-invoice [{:keys [payment application grant batch]}]
  (let [answers (:answers application)
        document (some
                   #(when (= (:phase %) (:phase payment)) %)
                   (:documents batch))]
    [:VA-invoice
     [:Header
      [:Maksuera (get-batch-key batch grant)]
      [:Laskunpaiva (.toString (:invoice-date batch))]
      [:Erapvm (.toString (:due-date batch))]
      [:Bruttosumma (:payment-sum payment)]
      [:Maksuehto "Z001"]
      [:Pitkaviite (:register-number application)]
      [:Tositepvm (.toString (:receipt-date batch))]
      [:Asiatarkastaja (:presenter-email document)]
      [:Hyvaksyja (:acceptor-email document)]
      [:Tositelaji (get-in grant [:content :document-type] "XE")]
      [:Maksutili (get-in grant [:content :transaction-account] "5000")]
      [:Toimittaja
       [:Y-tunnus (get-answer-value answers "business-id")]
       [:Nimi (:organization-name application)]
       [:Postiosoite (get-answer-value answers "address" "")]
       [:Paikkakunta (get-answer-value answers "city" "")]
       [:Maa (get-answer-value answers "country" "")]
       [:Iban-tili (get-answer-value answers "bank-iban")]
       [:Pankkiavain (get-answer-value answers "bank-bic")]
       [:Pankki-maa (get-answer-value answers "bank-country" "")]
       [:Kieli (:language application)]
       [:Valuutta (:currency batch)]]
      [:Postings
       [:Posting
        [:Summa (:payment-sum payment)]
        [:LKP-tili (lkp/get-lkp-account (:answers application))]
        [:TaKp-tili (:takp-account application)]
        [:Toimintayksikko (get-in grant [:operational-unit :code])]
        [:Projekti (get-in grant [:project :code])]
        [:Toiminto (get-in grant [:operation :code])]
        [:Kumppani (:partner batch)]]]]]))

(defn valid-pitkaviite? [pitkaviite]
  (and pitkaviite
       (re-seq #"^\d+\/\d+\/\d+(_\d+)?$" pitkaviite)))

(defn parse-pitkaviite
  ([pitkaviite default-phase]
  (when-not (valid-pitkaviite? pitkaviite)
    (throw (ex-info "Invalid pitkäviite" {:value pitkaviite})))
  (let [[body phase] (c-str/split pitkaviite #"_")]
    {:register-number body
     :phase (if (seq phase)
              (dec (Integer/parseInt phase))
              default-phase)}))
  ([pitkaviite] (parse-pitkaviite pitkaviite 0)))

(defn payment-to-xml [data]
  "Creates xml document (tags) of given payment of Valtionavustukset maksatus.
  Document should be valid document for VIA/Rondo."
  (sexp-as-element (payment-to-invoice data)))

(defn get-content [xml ks]
  (loop [content (list xml) xks ks]
    (if (empty? xks)
      content
      (let [k (first xks)
            v (some (fn [e] (when (= (:tag e) k) e)) content)]
        (when-not (nil? v)
          (recur (:content v) (rest xks)))))))

(defn read-response-xml [xml]
  {:register-number (first (get-content xml [:VA-invoice :Header :Pitkaviite]))
   :invoice-date (first (get-content xml [:VA-invoice :Header :Maksupvm]))})

(defn write-xml! [tags file]
  "Writes XML document to a file.
  Document should be tags as clojure.data.xml.elements."
  (with-open [out-file (java.io.FileWriter. file)]
    (emit tags out-file)))

(defn read-xml [file]
  "Reads XML from file path and returns xml document of
  clojure.data.xml.elements."
  (with-open [input (java.io.FileInputStream. file)]
    (parse input)))
