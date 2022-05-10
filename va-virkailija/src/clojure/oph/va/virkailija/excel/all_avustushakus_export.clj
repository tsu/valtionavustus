(ns oph.va.virkailija.excel.all-avustushakus-export
  (:require [dk.ative.docjure.spreadsheet :as spreadsheet]
            [oph.soresu.common.db :refer [query]]
            [oph.common.datetime :refer [from-sql-time date-string time-string java8-date-string]])
  (:import [java.io ByteArrayOutputStream]))

(def export-data-query "
WITH avustushakus_to_export AS (
  SELECT id AS avustushaku_id, *
  FROM hakija.avustushaut
  WHERE status not in ('deleted', 'draft')
),
paatos_counts AS (
  SELECT
    avustushaku.id AS avustushaku_id,
    count(*) FILTER (WHERE arviot.status = 'accepted') AS hyvaksytty_count,
    count(*) FILTER (WHERE arviot.status = 'rejected') AS hylatty_count
  FROM avustushakus_to_export avustushaku
  LEFT JOIN hakija.hakemukset hakemus_version ON avustushaku.id = hakemus_version.avustushaku
  LEFT JOIN virkailija.arviot ON hakemus_version.id = arviot.hakemus_id
  WHERE hakemus_version.version_closed IS NULL
  GROUP BY avustushaku.id
),
maksatukset AS (
  SELECT
    avustushaku.id AS avustushaku_id,
    min(hakemus_version.created_at) AS maksatukset_lahetetty,
    coalesce(sum(payment_sum), 0) AS maksatukset_summa
  FROM avustushakus_to_export avustushaku
  JOIN hakija.hakemukset hakemus_version ON hakemus_version.avustushaku = avustushaku.id
  JOIN virkailija.payments ON hakemus_version.id = payments.application_id AND hakemus_version.version = payments.application_version
  WHERE payments.version_closed is NULL AND payments.paymentstatus_id IN ('sent', 'paid')
  GROUP BY avustushaku.id
),
vastuuvalmistelijat AS (
  SELECT
    avustushaku AS avustushaku_id,
    name AS vastuuvalmistelija_name,
    email AS vastuuvalmistelija_email
  FROM avustushakus_to_export AS avustushaku
  JOIN hakija.avustushaku_roles ON avustushaku = avustushaku_id
  WHERE hakija.avustushaku_roles.role = 'vastuuvalmistelija'
),
paatokset_lahetetty AS (
  SELECT avustushaku_id, min(tapahtumaloki.created_at) AS paatokset_lahetetty
  FROM avustushakus_to_export avustushaku
  JOIN virkailija.tapahtumaloki USING (avustushaku_id)
  WHERE success AND tapahtumaloki.tyyppi = 'paatoksen_lahetys'
  GROUP BY avustushaku_id
),
valiselvityspyynnot_lahetetty AS (
  SELECT avustushaku_id, min(tapahtumaloki.created_at) AS valiselvitykset_lahetetty
  FROM avustushakus_to_export avustushaku
    JOIN virkailija.tapahtumaloki USING (avustushaku_id)
  WHERE success AND tapahtumaloki.tyyppi = 'valiselvitys-notification'
  GROUP BY avustushaku_id
),
loppuselvityspyynnot_lahetetty AS (
  SELECT avustushaku_id, min(tapahtumaloki.created_at) AS loppuselvitykset_lahetetty
  FROM avustushakus_to_export avustushaku
  JOIN virkailija.tapahtumaloki USING (avustushaku_id)
  WHERE success AND tapahtumaloki.tyyppi = 'loppuselvitys-notification'
  GROUP BY avustushaku_id
)
SELECT
  avustushaku.id AS avustushaku_id,
  avustushaku.register_number AS asiatunnus,
  avustushaku.content->'name'->>'fi' AS avustushaku_name,
  avustushaku.haku_type AS avustuslaji,
  vastuuvalmistelija_name,
  vastuuvalmistelija_email,
  paatos_counts.hyvaksytty_count,
  paatos_counts.hylatty_count,
  paatos_counts.hyvaksytty_count + paatos_counts.hylatty_count AS paatokset_total_count,
  (avustushaku.content->'duration'->>'start')::timestamptz AS avustushaku_duration_start,
  (avustushaku.content->'duration'->>'end')::timestamptz AS avustushaku_duration_end,
  paatokset_lahetetty,
  avustushaku.valiselvitysdate AS valiselvitys_deadline,
  valiselvitykset_lahetetty,
  avustushaku.loppuselvitysdate AS loppuselvitys_deadline,
  loppuselvitykset_lahetetty,
  avustushaku.content->'total-grant-size' AS avustushaku_maararaha,
  (avustushaku.content->>'total-grant-size')::numeric - maksatukset_summa AS jakamaton_maararaha,
  avustushaku.hankkeen_alkamispaiva AS ensimmainen_kayttopaiva,
  avustushaku.hankkeen_paattymispaiva AS viimeinen_kayttopaiva,
  projekti.code AS projekti_code,
  projekti.code_value AS projekti_code_value,
  projekti.year AS projekti_year,
  toimintayksikko.code AS toimintayksikko_code,
  toimintayksikko.code_value AS toimintayksikko_code_value,
  toimintayksikko.year AS toimintayksikko_year,
  toiminto.code AS toiminto_code,
  toiminto.code_value AS toiminto_code_value,
  toiminto.year AS toiminto_year,
  avustushaku.content->'rahoitusalueet' AS rahoitusalueet
FROM avustushakus_to_export avustushaku
LEFT JOIN paatos_counts USING (avustushaku_id)
LEFT JOIN maksatukset USING (avustushaku_id)
LEFT JOIN vastuuvalmistelijat USING (avustushaku_id)
LEFT JOIN paatokset_lahetetty USING (avustushaku_id)
LEFT JOIN valiselvityspyynnot_lahetetty USING (avustushaku_id)
LEFT JOIN loppuselvityspyynnot_lahetetty USING (avustushaku_id)
LEFT JOIN virkailija.va_code_values projekti ON projekti.id = avustushaku.project_id
LEFT JOIN virkailija.va_code_values toimintayksikko ON toimintayksikko.id = avustushaku.operational_unit_id
LEFT JOIN virkailija.va_code_values toiminto ON toiminto.id = avustushaku.operation_id
ORDER BY avustushaku.id DESC
")

(defn format-sql-timestamp [ts]
  (let [dt (from-sql-time ts)]
    (str (date-string dt) " " (time-string dt))))

(defn db-row->excel-row [row]
  [(:avustushaku-id row)
   (or (:avustushaku-name row) "")
   (or (:avustuslaji row) "")
   ;"Koulutusasteet"
   (format-sql-timestamp (:avustushaku-duration-start row))
   (format-sql-timestamp (:avustushaku-duration-end row))
   (cond
     (:valiselvitykset-lahetetty row) (format-sql-timestamp (:valiselvitykset-lahetetty row))
     (:valiselvitys-deadline row) (str (java8-date-string (:valiselvitys-deadline row)) " DL")
     :else "")
   (cond
     (:loppuselvitykset-lahetetty row) (format-sql-timestamp (:loppuselvitykset-lahetetty row))
     (:loppuselvitys-deadline row) (str (java8-date-string (:loppuselvitys-deadline row)) " DL")
     :else "")
   (or (:asiatunnus row) "")
   (or (:avustushaku-maararaha row) "")
   ;"TA-tili"
   (or (:toimintayksikko-code-value row) "")
   (or (:projekti-code-value row) "")
   (or (:toiminto-code-value row) "")
   (or (:maksatukset-lahetetty row) "")
   (or (:maksatukset-summa row) "")
   (or (:jakamaton-maararaha row) "")
   (if (:paatokset-lahetetty row) (format-sql-timestamp (:paatokset-lahetetty row)) "")
   (str (:paatokset-total-count row) "/" (:hyvaksytty-count row) "/" (:hylatty-count row))
   (if (:ensimmainen-kayttopaiva row) (java8-date-string (:ensimmainen-kayttopaiva row)) "")
   (if (:viimeinen-kayttopaiva row) (java8-date-string (:viimeinen-kayttopaiva row)) "")
   (if (:vastuuvalmistelija-name row)
     (str (:vastuuvalmistelija-name row) ", " (:vastuuvalmistelija-email row))
     "")
   ])

(def headers
  [["" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "Manuaalisesti täydennettävät"]
   ["Haun ID"
    "Avustuksen nimi"
    "Avustuslaji"
    ;"Koulutusaste"
    "Haku auki"
    "Haku kiinni"
    "Väliselvitys lähetetty/DL"
    "Loppuselvitys lähetetty/DL"
    "Asiatunnus"
    "Määräraha (€)"
    ;"TA-tili"
    "Toimintayksikkö"
    "Projekti koodi"
    "Toiminto"
    "Maksettu pvm"
    "Maksettu €"
    "Jakamaton (määräraha miinus maksettu)"
    "Päätös pvm"
    "Päätösten lkm, yht/myönteinen/kielteinen"
    "1. käyttöpäivä"
    "viimeinen käyttöpäivä"
    "Vastuuvalmistelija"
    ; Manuaalisesti täydennettävät
    "Määrärahan nimi talousarviossa"
    "Arvioitu maksu pvm"
    "Käytettävä määräraha sidottu/purettu kirjanpidossa pvm"
    "Noudatettava lainsäädäntö"
    "OKM raportointivaatimukset"]])

(defn export-avustushakus []
  (let [data (query export-data-query [])
        output (ByteArrayOutputStream.)
        wb (spreadsheet/create-workbook
             "Avustushaut"
             (concat
               headers
               (vec (map db-row->excel-row data))))]
    (.write wb output)
    (.toByteArray output)))