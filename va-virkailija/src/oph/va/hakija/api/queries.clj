(ns oph.va.hakija.api.queries
  (:require [yesql.core :refer [defquery]]))

(defquery health-check "sql/hakija/healthcheck.sql")

(defquery list-hakemukset "sql/hakija/hakemus/list.sql")

(defquery list-avustushaut "sql/hakija/avustushaku/list.sql")
(defquery get-avustushaku "sql/hakija/avustushaku/get.sql")
(defquery get-avustushaku-roles "sql/hakija/avustushaku/get-roles.sql")
(defquery get-answers "sql/hakija/hakemus/list-by-avustushaku.sql")
