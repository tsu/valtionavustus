(ns oph.soresu.common.db
  (:use [oph.soresu.common.config :only [config config-name]]
        [clojure.tools.trace :only [trace]])
  (:require [buddy.core.hash :as buddy-hash]
            [buddy.core.codecs :as buddy-codecs]
            [clojure.java.jdbc :as jdbc]
            [clojure.string :as string]
            [clojure.tools.logging :as log]
            [hikari-cp.core :refer :all]
            [oph.soresu.common.jdbc.extensions])
  (:import [java.security SecureRandom]))

(def random (SecureRandom.))

(defn generate-hash-id []
  (-> (.generateSeed random (/ 512 8))
      buddy-hash/sha256
      buddy-codecs/bytes->hex))

(defn escape-like-pattern [pattern]
  (string/replace pattern #"(\\|%|_)" "\\\\$1"))

(defn- datasource-spec []
  "Merge configuration defaults and db config. Latter overrides the defaults"
  (merge {:auto-commit false
          :read-only false
          :connection-timeout 30000
          :validation-timeout 5000
          :idle-timeout 600000
          :max-lifetime 1800000
          :minimum-idle 10
          :maximum-pool-size 10
          :pool-name "db-pool"
          :adapter "postgresql"
          :currentSchema "virkailija,hakija"}
         (-> (:db config)
             (dissoc :schema))))

(def datasource
  (delay (make-datasource (datasource-spec))))

(defn get-datasource []
  @datasource)

(defn close-datasource! []
  (close-datasource @datasource))

(defn get-next-exception-or-original [original-exception]
  (try (.getNextException original-exception)
       (catch IllegalArgumentException iae
         original-exception)))

(defn clear-db-and-grant! [schema-name grant-user]
    (if (:allow-db-clear? (:server config))
      (try (apply (partial jdbc/db-do-commands {:datasource (get-datasource)} true)
                  (concat [(str "drop schema if exists " schema-name " cascade")
                           (str "create schema " schema-name)]
                          (if grant-user
                            [(str "grant usage on schema " schema-name " to " grant-user)
                             (str "alter default privileges in schema " schema-name " grant select on tables to " grant-user)])))
           (catch Exception e (log/error (get-next-exception-or-original e) (.toString e))))
      (throw (RuntimeException. (str "Clearing database is not allowed! "
                                     "check that you run with correct mode. "
                                     "Current config name is " (config-name))))))

(defn clear-db! [schema-name]
  (clear-db-and-grant! schema-name nil))

(defmacro exec [query params]
  `(jdbc/with-db-transaction [connection# {:datasource (get-datasource)}]
     (~query ~params {:connection connection#})))

(defmacro exec-all [query-list]
  `(jdbc/with-db-transaction [connection# {:datasource (get-datasource)}]
     (last (for [[query# params#] (partition 2 ~query-list)]
             (query# params# {:connection connection#})))))

(defmacro with-transaction [connection & body]
  `(let [~connection {:datasource (get-datasource)}]
     (jdbc/with-db-transaction [conn# ~connection]
       ~@body)))

(defn with-tx [func]
  (jdbc/with-db-transaction [connection {:datasource (get-datasource)}]
                            (func connection)))

(defn query
  ([sql params] (with-tx (fn [tx] (query tx sql params))))
  ([tx sql params] (jdbc/query tx (concat [sql] params) {:identifiers #(.replace % \_ \-)})))

(defn execute!
  ([sql params] (with-tx (fn [tx] (execute! tx sql params))))
  ([tx sql params] (jdbc/execute! tx (concat [sql] params) {:identifiers #(.replace % \_ \-)})))
