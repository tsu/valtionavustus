(ns oph.va.virkailija.invoice
  (:require [clojure.data.xml :refer [element]]))

(defn write-xml! [tags file]
  (with-open [out-file (java.io.FileWriter. file)]
    (xml/emit tags out-file)))

(defn read-xml [file]
  (with-open [input (java.io.FileInputStream. file)]
    (xml/parse input)))

(defn create-header-tags [invoice]
  (element :Header {}
    (element :Maksuera {})
    (element :Laskunpaiva {})
    (element :Erapvm {})
    (element :Bruttosumma {})
    (element :Maksuehto {})
    (element :Pitkaviite {})
    (element :Tositepvm {})
    (element :Asiatarkastaja {})
    (element :Hyvaksyja {})
    (element :Tositelaji {})
    (element :Toimittaja {}
      (element :Y-tunnus {})
      (element :Hlo-tunnus {})
      (element :Nimi {})
      (element :Postiosoite {})
      (element :Paikkakunta {})
      (element :Maa {})
      (element :Iban-tili {})
      (element :Pankkiavain {})
      (element :Pankki-maa {})
      (element :Kieli {})
      (element :Valuutta {}))))

(defn create-posting-tags [row]
  (element :Posting {}
    (element :Summa {})
    (element :LKP-tili {})
    (element :ALV-koodi {})
    (element :TaKp-tili {})
    (element :Toimintayksikko {})
    (element :Valtuusnro {})
    (element :Projekti {})
    (element :Toiminto {})
    (element :Suorite {})
    (element :AlueKunta {})
    (element :Kumppani {})
    (element :Seuko1 {})
    (element :Seuko2 {})
    (element :Varalla1 {})
    (element :Varalla2 {})))

(defn create-postings-tags [invoice]
  (element :Postings {}
    (doall (map create-posting-tags (get invoice :rows [])))))

(defn invoice-to-tags [invoice]
  (element :VA-invoice {}
    (create-header-tags invoice)
    (create-postings-tags invoice)))

(defn is-valid? [tags]
  false)
