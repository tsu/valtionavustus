(ns oph.va.virkailija.server
  (:use [oph.va.virkailija.routes :only [all-routes]])
  (:require [ring.middleware.reload :as reload]
            [ring.middleware.logger :as logger]
            [ring.middleware.session :as session]
            [ring.middleware.session.cookie :as cookie]
            [ring.middleware.conditional :refer [if-url-doesnt-match]]
            [buddy.auth.middleware :refer [wrap-authentication]]
            [buddy.auth.backends.token :refer [token-backend]]
            [compojure.handler :refer [site]]
            [clojure.tools.logging :as log]
            [oph.common.server :as server]
            [oph.common.config :refer [config]]
            [oph.common.db :as db]
            [oph.va.virkailija.db.migrations :as dbmigrations]))

(defn- startup [config]
  (log/info "Using configuration: " config)
  (log/info "Running db migrations")
  (dbmigrations/migrate :db "db.migration"))

(defn- shutdown []
  (log/info "Shutting down all services")
  (db/close-datasource! :db))

(defn- create-site [] (site #'all-routes))

(defn- with-log-wrapping [site]
  (if (-> config :server :enable-access-log?)
    (if-url-doesnt-match site #"/api/healthcheck" logger/wrap-with-logger)
    site))

(defn- with-session [site]
  (session/wrap-session site {:store (cookie/cookie-store {:key "a 16-byte secret"})}))

(defn authenticate [request token]
  :admin)

(def backend (token-backend {:authfn authenticate}))

(defn- with-authentication [site]
  (wrap-authentication site backend))

(defn start-server [host port auto-reload?]
  (let [logged (-> (create-site)
                   (with-log-wrapping)
                   (with-session)
                   (with-authentication))
        handler (if auto-reload?
                  (reload/wrap-reload logged)
                  logged)]
    (server/start-server {:host host
                          :port port
                          :auto-reload? auto-reload?
                          :routes handler
                          :on-startup (partial startup config)
                          :on-shutdown shutdown})))
