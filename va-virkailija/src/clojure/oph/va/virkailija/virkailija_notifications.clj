(ns oph.va.virkailija.virkailija-notifications
  (:use [oph.soresu.common.db])
  (:require [clojure.tools.logging :as log]
            [oph.va.virkailija.email :as email]))

(defn- get-loppuselvitys-asiatarkastamatta []
  (query "SELECT h.avustushaku, count(h.id) as hakemus_count, r.email
          FROM hakemukset h
          LEFT JOIN arviot a ON h.id = a.hakemus_id
          LEFT JOIN avustushaku_roles r ON a.presenter_role_id = r.id
          JOIN hakija.avustushaut ah ON ah.id = h.avustushaku
          WHERE h.status_loppuselvitys = 'submitted' AND h.version_closed IS NULL AND r.email IS NOT NULL
          AND ah.created_at > '2020-01-01'::timestamp
          GROUP BY h.avustushaku, r.email"
         []))

(defn- get-hakuaika-paattymassa-haut []
  (query "SELECT h.avustushaku as avustushaku_id, h.user_key, hakemus.contact_email AS contact_email,
            h.language,
            jsonb_extract_path_text(avustushaku.content, 'name', h.language) as avustushaku_name,
            avustushaku.content->'duration'->>'end' AS paattymispaiva
          FROM hakija.hakemukset h
          JOIN hakija.avustushaut avustushaku
            ON h.avustushaku = avustushaku.id
          JOIN virkailija.normalized_hakemus hakemus
            ON h.id = hakemus.hakemus_id
          WHERE version_closed IS NULL
          AND hakemus_type = 'hakemus'
          AND h.status = 'draft'
          AND date(avustushaku.content -> 'duration' ->> 'end') = date(now() + interval '1 DAY')"
         []))

(defn send-loppuselvitys-asiatarkastamatta-notifications []
  (let [rows    (get-loppuselvitys-asiatarkastamatta)
        grouped (group-by :email rows)]
    (doseq [keyval grouped]
      (email/send-loppuselvitys-asiatarkastamatta [(key keyval)] (val keyval)))))

(defn- get-loppuselvitys-taloustarkastamatta []
  (query "SELECT avustushaku, count(id) as hakemus_count
          FROM hakemukset
          WHERE status_loppuselvitys = 'information_verified' AND version_closed IS NULL
          GROUP BY avustushaku"
         []))

(defn send-loppuselvitys-taloustarkastamatta-notifications []
  (let [loppuselvitys-list (get-loppuselvitys-taloustarkastamatta)]
    (when (>= (count loppuselvitys-list) 1)
      (email/send-loppuselvitys-taloustarkastamatta loppuselvitys-list))))

(defn send-hakuaika-paattymassa-notifications []
  (let [hakemukset-list (get-hakuaika-paattymassa-haut)
        hakemukset-paattymassa-count (count hakemukset-list)]
    (when (>= hakemukset-paattymassa-count 1)
      (log/info "sending email to" hakemukset-paattymassa-count" contacts")
      (doseq [hakemus hakemukset-list]
        (email/send-hakuaika-paattymassa hakemus)))))

(defn- get-valiselvitys-tarkastamatta []
  (query "SELECT h.avustushaku, count(h.id) as hakemus_count, r.email
          FROM hakemukset h
          LEFT JOIN arviot a ON h.id = a.hakemus_id
          LEFT JOIN avustushaku_roles r ON a.presenter_role_id = r.id
          JOIN hakija.avustushaut ah ON ah.id = h.avustushaku
          WHERE h.status_valiselvitys = 'submitted' AND h.version_closed IS NULL AND r.email IS NOT NULL
          AND ah.created_at > '2020-01-01'::timestamp
          GROUP BY h.avustushaku, r.email"
         []))

(defn send-valiselvitys-tarkastamatta-notifications []
  (let [rows    (get-valiselvitys-tarkastamatta)
        grouped (group-by :email rows)]
    (doseq [keyval grouped]
      (email/send-valiselvitys-tarkastamatta [(key keyval)] (val keyval)))))

(defn- get-loppuselvitys-palauttamatta []
  (query "SELECT
            avustushaut.id as avustushaku_id,
            h.hakemus_id,
            hv.language,
            jsonb_extract_path_text(avustushaut.content, 'name', hv.language) as avustushaku_name,
            hv.user_key,
            coalesce(
              latest_jatkoaika.hyvaksytty_jatkoaika,
              avustushaut.loppuselvitysdate::date
            ) AS loppuselvitys_deadline,
            h.contact_email
          FROM hakija.hakemukset hv
          JOIN virkailija.arviot ON hv.id = arviot.hakemus_id
          JOIN hakija.avustushaut ON hv.avustushaku = avustushaut.id
          JOIN virkailija.normalized_hakemus h ON hv.id = h.hakemus_id
          LEFT JOIN LATERAL (
            SELECT coalesce(
              pj.paattymispaiva,
              mh.haettu_kayttoajan_paattymispaiva
            ) AS hyvaksytty_jatkoaika
            FROM virkailija.muutoshakemus mh
            JOIN virkailija.paatos mhp ON mhp.id = mh.paatos_id
            JOIN virkailija.paatos_jatkoaika pj USING (paatos_id)
            WHERE mh.hakemus_id = hv.id
            AND mh.haen_kayttoajan_pidennysta AND pj.status IN ('accepted', 'accepted_with_changes')
            ORDER BY mhp.created_at DESC
            LIMIT 1
          ) latest_jatkoaika ON true
          WHERE hv.hakemus_type = 'hakemus'
            AND hv.version_closed IS NULL
            AND arviot.status = 'accepted'
            AND hv.status_loppuselvitys = 'missing'
            -- There are a few nulls
            AND avustushaut.loppuselvitysdate IS NOT NULL
            AND coalesce(
              latest_jatkoaika.hyvaksytty_jatkoaika,
              avustushaut.loppuselvitysdate::date
            ) BETWEEN current_timestamp::date AND current_timestamp::date + '14 days'::interval
            AND EXISTS (
              SELECT * FROM tapahtumaloki
              WHERE tapahtumaloki.hakemus_id = h.hakemus_id
                AND tyyppi = 'loppuselvitys-notification'
            )"
         []))

(defn send-loppuselvitys-palauttamatta-notifications []
  (let [notifications (get-loppuselvitys-palauttamatta)]
    (when (>= (count notifications) 1)
      (log/info "sending email to" (count notifications) " contacts")
      (doseq [notification notifications]
        (email/send-loppuselvitys-palauttamatta notification)))))

(defn- get-valiselvitys-palauttamatta []
  (query "SELECT
            avustushaut.id as avustushaku_id,
            h.hakemus_id,
            hv.language,
            jsonb_extract_path_text(avustushaut.content, 'name', hv.language) as avustushaku_name,
            hv.user_key,
            avustushaut.valiselvitysdate::date AS valiselvitys_deadline,
            h.contact_email
          FROM hakija.hakemukset hv
          JOIN virkailija.arviot ON hv.id = arviot.hakemus_id
          JOIN hakija.avustushaut ON hv.avustushaku = avustushaut.id
          JOIN virkailija.normalized_hakemus h ON hv.id = h.hakemus_id
          WHERE hv.hakemus_type = 'hakemus'
            AND hv.version_closed IS NULL
            AND arviot.status = 'accepted'
            AND hv.status_valiselvitys = 'missing'
            AND avustushaut.valiselvitysdate IS NOT NULL
            AND avustushaut.valiselvitysdate::date BETWEEN current_timestamp::date AND current_timestamp::date + '14 days'::interval
            AND EXISTS (
              SELECT * FROM tapahtumaloki
              WHERE tapahtumaloki.hakemus_id = h.hakemus_id
                AND tyyppi = 'valiselvitys-notification'
            )
            AND NOT EXISTS (
              SELECT * FROM email_event e
              WHERE e.hakemus_id = h.hakemus_id
                AND e.email_type = 'valiselvitys-palauttamatta'
            )"
         []))

(defn send-valiselvitys-palauttamatta-notifications []
  (let [notifications (get-valiselvitys-palauttamatta)]
    (doseq [notification notifications]
      (email/send-valiselvitys-palauttamatta notification))))
