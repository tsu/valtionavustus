# Valtionavustukset

[Palvelukortti](https://confluence.csc.fi/pages/viewpage.action?pageId=51873238)

Opetushallituksen (OPH) valtionavustusten hakemiseen, käsittelyyn ja
myöntämiseen tarkoitetut palvelut.

Projekti koostuu kahdesta web-palvelusta: va-hakija ja
va-virkailija. Näillä on omat Leiningen-projektit tämän git-repositoryn
juurihakemistossa. Web-sovelluksien yhteinen koodi on
Leiningen-projektissa soresu-form.

Tässä README:ssä on yleiskuvaus palveluista, lisää dokumentaatiota:

* [Tekninen yleiskuvaus](doc/technical_overview.md)
* [Tietokantaoperaatiot](doc/database_operations.md)

## Käsitteitä ja käyttäjärooleja

_Hakija_ on käyttäjä, joka täyttää ja lähettää _hakemuksen_ avoimeen
_avustushakuun_. Kuka tahansa voi lähettää hakemuksen (ei
autentikointia). Tähän käytetään va-hakija-sovellusta.

Virkailijan käyttöliittymässä (va-virkailija-sovellus) arvioidaan
hakemuksia. Sovellukseen kirjaudutaan OPH:n CAS-palvelun (autentikointi)
ja Käyttöoikeuspalvelun (autorisointi) kautta.

Käyttäjätyypit:

* Normaali (VA-käyttäjä)
  - voi lukea kaikkia hakuja ja hakemuksia
  - voi muokata niitä hakuja, joissa on esittelijä-roolissa
  - voi arvioida niitä hakuja, joissa on arvioija-roolissa
* Admin (VA-pääkäyttäjä)
  - voi lukea ja muokata kaikkia hakuja ja hakemuksia

Hakukohtaiset roolit:

* Esittelijä
  - voi muokata hakua ja siihen saapuneita hakemuksia
  - haun "vastaava"
  - vastaa rahoituksen jakautumisesta hyväksyttyjen hakemuksien kesken
* Arvioija
  - voi rajatusti muokata hakua: arvioi tiettyjä kohtia hausta ja voi muokata osia rahoituksesta
  - tukeva rooli esittelijälle

Haun roolista huolimatta kuka tahansa VA-käyttäjä voi kommentoida hakemuksia.

| Käsite | Kuvaus |
|---|---|
| Haku tai avustushaku | Mahdollistaa rahan jakamisen hakijoille. Avustushaulle tehdään lomake, joka julkaistaan. Hakija lähettää avustushakukohtaisen hakemuksen. |
| Hakemus | Hakijan kirjoittama avustushakukohtainen anomus rahoituksen saamiseksi. |
| Asianumero | Tunniste haun arkistointia varten. Usealla haulla voi olla sama asianumero. va-virkailija-sovellus lähettää haun (joka sisältää asianumeron) sähköpostilla kirjaamo.oph.fi:hin, jossa haut tulostetaan ja arkistoidaan. OPH:lla on suunnitteilla on ottaa käyttöön sähköinen arkistointi, jolloin asianumero tulisi hakuun automaattisesti integraation kautta. |

## Riippuvuudet

* [Node.js](https://nodejs.org/)
  * asennus esim. [nvm](https://github.com/creationix/nvm):n tai [nodenv](https://github.com/nodenv/nodenv):n kautta
* [npm](https://www.npmjs.com/)
* [Leiningen](https://leiningen.org/), versio 2.8.1
* [Java SE Development Kit](http://www.oracle.com/technetwork/java/javase/index.html), versio 8
* [PostgreSQL](https://www.postgresql.org/), vähintään versio 12.2
* [GNU make](https://www.gnu.org/software/make/), vähintään versio 3.81

Käytä OPH:n VPN:ää, jotta voit ladata tarvittavat jar-paketit OPH:n
Artifactorystä.

## Kehitysympäristö

Kehitystyössä hyödyllisiä työkaluja:

* [FakeSMTP](https://nilhcem.github.io/FakeSMTP/)

Projektin juurihakemistossa on `Makefile`, jolla voi ajaa koko projektia koskevia yleisiä komentoja. Sen käyttöön on ohje:

``` shell
make help
```

Juurihakemisto sisältää `lein`-skriptin, jota voi käyttää Leiningenin
ajamiseen. Tämä takaa staattisen version käytön Leiningenistä.

### Suositeltu hakemistojärjestely

``` bash
ls -lA oph
```

```
drwxr-xr-x  26 username  staff    884 Feb 17 09:46 postgres-data/
drwxr-xr-x  26 username  staff    884 Feb 17 09:46 valtionavustus/
drwxr-xr-x  25 username  staff    850 Feb 17 10:54 valtionavustus-secret/
```

Missä `postgres-data` on data-hakemisto PostgreSQL:lle ja
`valtionavustus` ja `valtionavustus-secret` ovat projektin
git-repositoryt.

### Tietokanta

#### Ajaminen Dockerilla

Docker-imagen luonti:

``` shell
cd valtionavustus/script/postgres-docker
docker build -t va-postgres:12.2 .
```

Data-hakemiston luonti:

``` shell
mkdir -p postgres-data
```

Tietokannan ajaminen Dockerissa:

``` shell
run_database.sh
```

Tietokannan palauttaminen, esim Lammen backupista:

``` shell
pg_restore --user va -h localhost -v --clean --if-exists --no-acl --no-owner --dbname va-dev ./valtionavustukset-2.backup
```

#### Ajaminen manuaalisesti

*Huom:* Linux-koneilla Postgres-komennot on helpointa ajaa
postgres-käyttäjänä:

``` shell
sudo -s -u postgres
```

Luo data-hakemisto:

``` shell
initdb -D postgresql-data
```

Halutessasi aseta seuraavat tiedostoon `postgres-data/postgresql.conf`,
jotta voit seurata tarkemmin mitä tietokannassa tapahtuu:

```
log_destination = 'stderr'
log_line_prefix = '%t %u '
log_statement = 'mod'
```

Käynnistä tietokantapalvelin:

``` shell
postgres -D postgres-data
```

Luo käyttäjät `va-hakija` ja `va-virkailija` (kummankin salasana `va`):

``` shell
createuser -s va_hakija -P
createuser -s va_virkailija -P
```

Luo tietokanta nimeltään `va-dev`:

``` shell
createdb -E UTF-8 va-dev
```

Kun web-sovellus käynnistyy, ajaa se tarvittavat migraatiot
tietokantaan.

Tietokannan saa tyhjennettyä ajamalla:

``` shell
dropdb va-dev
createdb -E UTF-8 va-dev
```

### Frontend

Asenna kaikki frontendin buildaamiseen käytetyt npm-moduulit, projektin
juurihakemistossa:

``` shell
make npm-clean npm-install-modules
```

Käynnistä frontendin assettien buildi webpackilla. Tällöin webpack
generoi selaimen käyttämät JavaScript-tiedostot. Webpack buildaa
tarvittaessa uudelleen, jos lähdekoodi yllä olevissa hakemistoissa
muuttuu:

``` shell
cd va-hakija
npm run build-watch

cd va-virkailija
npm run build-watch
```

Frontendin tuotantoversion buildi, projektin juurihakemistossa:

``` shell
make npm-build
```

Kaikkien frontendin yksikkötestien ajo, projektin juurihakemistossa:

``` shell
make npm-test
```

### Backend

Varmista, että `JAVA_HOME`-ympäristömuuttuja osoittaa haluamaasi
JDK:hon.

Asenna ensin backendien riippuvuudet paikalliseen
`~/.m2`-hakemistoon. Tarvitset tätä varten OPH:n VPN:n, koska osa
riippuvuuksista on OPH:n Artifactoryssä. Projektin juurihakemistossa:

``` shell
make lein-clean lein-install-jar-commons
```

Backendien ajaminen Leiningenissa tapahtuu käyttämällä
`trampoline`-komentoa, jotta JVM ajaa shutdown-hookit, joissa
vapautetaan resursseja (uberjarin kautta ajaessa ongelmaa ei ole):

``` shell
cd va-hakija
../lein trampoline run

cd va-virkailija
../lein trampoline run
```

Backendin käynnistys ajaa tietokannan migraatiot automaattisesti.

Va-hakijan tai va-virkailijan käynnistys `lein trampoline run`:lla
saattaa epäonnistua:

```
Exception in thread "main" java.lang.IllegalArgumentException: No matching ctor found for class java.net.Socket, compiling:(/private/var/folders/sk/grc8h2hn49lc8wfgnxnl5jqh0000gn/T/form-init5349156603706809421.clj:1:125)

# tai

Exception in thread "main" java.lang.IllegalArgumentException: Duplicate key: null, compiling:(kayttooikeus_service.clj:15:5)
```

Tämä on todennäköisesti bugi Leiningenissä: se ei suorita tiedostoa
`soresu-form/src/oph/soresu/common/config.clj` silloin, kun va-hakija
tai va-virkailija requiraa sen. Ongelman voi kiertää komentamalla:

``` bash
touch soresu-form/src/oph/soresu/common/config.clj
```

Backendin uberjarrien buildi, projektin juurihakemistossa:

``` shell
make lein-build
```

Yksittäisen Leiningen-projektin testien ajaminen, esimerkkinä va-hakija:

``` shell
cd va-hakija
../lein with-profile test spec -f d       # kerta-ajo
../lein with-profile test spec -a         # monitorointi ja ajo muutoksista
../lein with-profile test spec -a -t tag  # monitorointi ja ajo vain testeille, jotka merkitty tägillä `tag`
```

Backendin testit sisältävät myös frontendin yksikkötestien ajon

Mikäli muutat frontendin koodia, pitää frontendin buildi ajaa uudelleen
(katso ylhäältä).

Huom! va-virkailijan testien ajaminen edellyttää, että va-hakijan testit on ajettu aiemmin.

Kaikkien Leiningen-projektien testien ajaminen, juurihakemistossa:

``` shell
make lein-test
```

### Ajoympäristöt

Sovelluksen ajoympäristön voi asettaa Leiningenin komennolla
`with-profile PROFILE`. Esimerkiksi `test`-ympäristön käyttö
web-sovelluksen ajamiseen:

``` shell
cd va-hakija
../lein with-profile test trampoline run
```

Ajoympäristojen konfiguraatiot ovat Leiningen-projektien
`config`-hakemistossa
[`.edn`](https://github.com/edn-format/edn)-tiedostoissa.

Komento `lein test` käyttää `test`-ympäristöä
automaattisesti. [Lisätietoja Leiningenin profiileista](https://github.com/technomancy/leiningen/blob/master/doc/PROFILES.md).

### Yleisiä komentoja

Tietokannan tyhjennys:

``` shell
cd va-hakija
../lein dbclear
```

Leiningenin komentoja voi ketjuttaa käyttämällä `do`-komentoa ja
erottelemalla halutut komennot pilkulla ja välilyönnillä. Esimerkiksi
tietokannan tyhjennys ja sovelluksen käynnistys:

``` shell
cd va-hakija
../lein trampoline do dbclear, run
```

Jos muutat backendin riippuvuutena toimivan soresu-formin Clojure-koodia, pitää soresu-formin jar-paketit asentaa uudelleen,
jotta backendit saavat muutokset käyttöön:

``` shell
cd soresu-form
../lein do clean, install
```

Vaihtoehtoisesti jarrien buildaus automaattisesti, kun lähdekoodi
muuttuu:

``` shell
cd soresu-form
../lein auto install
```

Hakijasovelluksen tuotantoversion ajo:

``` shell
cd va-hakija
../lein uberjar
CONFIG=config/va-prod.edn java -jar target/uberjar/hakija-0.1.0-SNAPSHOT-standalone.jar
```

Frontendin ja backendin puhdas buildi ja testien ajo, projekin
juurihakemistossa:

``` shell
make clean build test
```

Backendin riippuvuuksien versioiden tarkistus, projektin
juurihakemistossa:

``` shell
make lein-outdated-dependencies
```

Frontendin riippuvuuksien tarkistus, projektin juurihakemistossa:

``` shell
make npm-outdated-dependencies
```

Hakemusten generointi:

``` shell
cd va-hakija
../lein populate 400
```

### Interaktiivinen kehitys

Luo `checkouts`-hakemistot hakijan ja virkailijan
sovellusmoduuleihin. Projektin juurihakemistossa:

``` shell
make lein-install-checkouts
```

Leiningen tunnistaa nyt `soresu` ja `common` -kirjastot ns. [checkout
dependencyinä](https://github.com/technomancy/leiningen/blob/master/doc/TUTORIAL.md#checkout-dependencies),
jolloin muutokset lähdekoodissa ja muutoksen evaluointi voidaan saada
näkyviin hakijan ja virkailijan sovelluksissa ajonaikaisesti.

Jotkut kehitystyökalut saattavat injektoida Leiningeniä käynnistäessä
overridaavan riippuvuuden `org.clojure/tools.nrepl`-jarriin, jota myös
Leiningen itse käyttää. Mikäli overriden versio on eri kuin Leiningenin
käyttämä versio, ilmoittaa Leiningen virheestä ja aborttaa, koska asetus
`:pedantic? :abort` on päällä. Voit ratkaista ongelman kahdella eri
tavalla:

* Aseta `:pedantic? :range` Leiningenin user-profiiliin tiedostossa
  `~/.lein/profiles.clj`:

  ``` edn
  {:user {:pedantic? :range}
  ```

  Tällöin Leiningen varoittaa overridaavista riippuvuuksista, mutta ei
  aborttaa.

* Määrittele `org.clojure/tools.nrepl`-jarrin versio samaksi kuin mitä
  kehitystyökalu käyttää tiedostoon `~/.lein/profiles.clj`. Esimerkiksi:

  ``` edn
  {:repl {:dependencies [[org.clojure/tools.nrepl "0.2.13"]]}}
  ```

Esimerkiksi Emacsin
[CIDER](https://cider.readthedocs.io/)-kehitysympäristöä käyttäessä:

1. Aseta `(customize-set-variable 'cider-prompt-for-symbol nil)`, jotta
   CIDER ei [injektoi riippuvuuksia
   automaattisesti](https://github.com/clojure-emacs/cider/blob/master/doc/installation.md#ciders-nrepl-middleware).

2. Aseta CIDERin riippuvuudet `~/.lein/profiles.clj`:ssä (versionumerot
   riippuvat CIDER:n versiosta):

   ``` edn
   {:repl {:plugins [[cider/cider-nrepl "0.15.1"]]
           :dependencies [[org.clojure/tools.nrepl "0.2.13"]]}}
   ```

3. Käynnistä REPL hakijan tai virkailijan moduulissa: avaa moduulissa
   oleva clj-lähdekoodi puskuriin (esim. tiedosto
   `va-virkailija/src/oph/va/virkailija/routes.clj`) ja suorita
   Emacs-komento `cider-jack-in`

4. Kun REPL on käynnistynyt, käynnistä sovelluspalvelin REPL:ssä:

   ```
   oph.va.virkailija.main> (def main (-main))
   ```

5. Muokkaa `soresu` tai `common` -kirjastossa olevaa clj-lähdekoodia,
   evaluoi muutos (esim. Emacs-komento `cider-eval-defun-at-point`)

6. Muutoksen vaikutuksen pitäisi näkyä sovelluksessa.

## Integraatiot

Va-hakija ja va-virkailija käyttävät seuraavia palveluja integraatioina:

Kuvaus | Dokumentaatio | Käytössä | Muuta
---|---|---|---
CAS | [palvelukortti](https://confluence.csc.fi/display/oppija/Rajapintojen+autentikaatio) [protokolla](https://apereo.github.io/cas/4.2.x/protocol/CAS-Protocol.html) | va-virkailija | Käyttäjän autentikointi va-virkailijaan. Va-virkailija-sovelluksen autentikointi muihin OPH:n palveluihin (service user).
Käyttöoikeuspalvelu | [palvelukortti](https://confluence.csc.fi/pages/viewpage.action?pageId=68725146) [api](https://virkailija.testiopintopolku.fi/kayttooikeus-service/swagger-ui.html) | va-virkailija | VA-käyttäjän haku käyttäjätunnuksen perusteella, VA-palvelun kaikkien käyttäjien haku.
Organisaatiopalvelu | [palvelukortti](https://confluence.csc.fi/display/OPHPALV/Organisaatiotietojen+hallintapalvelu) [api](https://virkailija.testiopintopolku.fi/organisaatio-service/swagger/index.html) | va-hakija | Hakijan organisaation tietojen haku Y-tunnuksen perusteella.
Oppijanumerorekisteri | [palvelukortti](https://confluence.csc.fi/display/OPHPALV/Oppijanumerorekisteri) [api](https://virkailija.testiopintopolku.fi/oppijanumerorekisteri-service/swagger-ui.html) | va-virkailija | Käyttäjän haku person-oid:lla.
Koodistopalvelu | [palvelukortti](https://confluence.csc.fi/display/OPHPALV/Koodistopalvelu) [api](https://virkailija.opintopolku.fi/koodisto-service/swagger/index.html) [hallinta-ui](https://virkailija.opintopolku.fi/koodisto-ui/html/index.html#/etusivu) | va-hakija, va-virkailija | Koodien ja metatietojen haku ja luonti.

## Tuetut selaimet

Hakijan käyttöliittymä: viimeisin stabiili Google Chrome ja Mozilla
Firefox, IE11.

Virkailijan käyttöliittymä: viimeisin stabiili Google Chrome ja Mozilla
Firefox.

## Käyttöliittymän ratkaisuja

Ei näkymää, jossa listataan avoimet haut. OPH linkittää avoimet haut
oph.fi:hin käsin. Tämä johtuu prosessista, joilla hakuja luodaan (uusi
haku vaatii asetuksen).

Hakemuksen voi arvioida vasta hakuajan umpeuduttua. Tämä siksi, että
hakija voi muokata hakemusta siihen asti.

Hakemuksen tilat:

* hakijan näkökulmasta
  - uusi
  - luonnos
  - lähetetty
  - odottaa täydennystä
  - poistettu
* virkailijan ja arvioijan näkökulmasta
  - käsittelemättä
  - käsittelyssä
  - mahdollinen
  - hylätty (mahdollinen lopputila)
  - hyväksytty (mahdollinen lopputila)

va-virkailijan hakulomakkeen json-editorilla voi täysin muokata
lomakkeen sisältöä. Kaikkia graafisen lomake-editorin komponentteja ei
ole toteutettu. Lomakkeen voi kopioida json-editorin kautta toiseen
avustushakuun.

08/2018 lisätty kommenttien piilotus, jos käyttäjä ei ole itse vielä
kommentoinut ([Jira VA3-438](https://jira.csc.fi/browse/VA3-438)). Kommenteissa
ei ole ollut aiemmin käyttäjän tunnistetta. Näin ollen vanhemmissa hauissa ei
voida tarkistaa, onko käyttäjä vielä kommentoinut. Tällöin näytetään kaikki
kommentit.

Uudemmissa hauissa toimintatapa on seuraava:
- Kun haku on jossain muussa tilassa, kuin ratkaistu
  - Jos käyttäjä ei ole kommentoinut, näytetään teksti, että mahdolliset muiden
    käyttäjien kommentit näkyvät, kun käyttäjä on kirjoittanut oman kommenttinsa
  - Käyttäjä ei voi tietää, onko hakemuksessa kommentteja vai ei
- Kun haku on ratkaistu
  - Näytetään kaikki kommentit tai teksti "Ei kommentteja"

## Maksatus

Sovellus tarkistaa jokaisen maksatuksen lähetyksessä, että virkailija ei ole
asettanut "Ei maksuun" tietoa tai hakija ei ole ilmoittanut, että ei ota
avustusta vastaan.

Handi palauttaa XML-muodossa vastauksen maksatuksesta, mikä luetaan
payment-schedulerin avulla ajastetusti ja maksatuksen tila päivitetään
tietokantaan.

Maksatukset-näkymässä listataan sekä julkaistut että ratkaistut haut. Ainoastaan
ratkaistujen hakujen maksatuslistaukset ovat käytettävissä.

Kun haun päätökset lähetetään, kaikille hakemuksille luodaan 1. erän maksatus
seuraavin ehdoin:
- Tila on hyväksytty
- Virkailija ei ole asettanut "Ei maksuun" täppää
- Hakija ei ole ilmoittanut, että ei ota avustusta vastaan

Maksatusprosessi etenee seuraavasti yhdessä erässä maksettavan haun kanssa:

- Ensimmäisen erän suuruus on luonnollisesti myönnetty summa (OPH:n osuus)
- Virkailija luo Maksatukset-näkymässä uuden maksuerän täyttämällä tarvittavat
  tiedot ja lähettää maksatukset Handiin

Maksatusprosessi etenee seuraavasti useammassa erässä maksettavan haun kanssa:

- Ensimmäisen erän summa määräytyy haussa tehtyjen määritysten (avustuksen
  summan leikkuri yms.) mukaan
  - Jos näitä ei ole haun tietoihin määritelty, käytetään oletusarvona, että
    kaikille maksetaan useassa erässä ja ensimmäinen erä on 60% myönnetystä
    summasta
- Virkailija luo Maksatukset-näkymässä uuden maksuerän täyttämällä tarvittavat
  tiedot ja lähettää 1. erän maksatukset Handiin
    - Asiakirjoja virkailija voi lisätä mielivaltaisen määrän maksuerää ja
    vaihetta kohden. Näitä tietoja käytetään maksatusten sähköposti-ilmoituksen
    lähettämiseen.
- Seuraavan erän summan asettaa virkailija Väliselvitys-välilehdellä
  - Tämän jälkeen maksu ilmestyy Maksatus-näkymään, josta sen voi lähettää,
    kuten ensimmäisen erän

Maksusanomassa on pitkäviite, jolla tunnistetaan hakemuksen maksatus
VA-järjestelmässä. Pitkäviite koostuu hakemuksen asianumerosta ja maksuerän
numerosta alaviivalla erotettuna. Samainen pitkäviite palautuu Handista
sanoman mukana, kun maksatus on maksettu.

Vanhoissa maksatuksissa ei ole pitkäviitteessä maksuerän numeroa. Näitä
parsittaessa oletetaan, että kyseessä on maksatuksen 1. erä.

### Maksatuksen tila

Maksatusten mahdolliset tilat ja niiden selitteet löytyvät tietokannasta taulusta `paymentstatus`.

## Muutoksenhaku

Tällä hetkellä järjestelmä tukee hakijan luomaa muutosta ainoastaan avustuksen
vastaanottamatta jättämisen osalta.

Jokaiselle hakemukselle luodaan lähetysvaiheessa (submit) vahvistussähköpostin
luonnissa uniikki tunniste, jolla hakija pääsee lähettämään
muutoshakemuksen. Tämä tunniste vanhenee, kun avustuksen ensimmäinen maksatus
lähetetään.

## Käytänteitä

### Koodi

Koodin tyylissä tavoitellaan
[The Clojure Style Guidea](https://github.com/bbatsov/clojure-style-guide).

Ennen oman koodin julkaisua, olisi hyvä ajaa staattiset työkalut.

Sekä `va-virkailija` että `va-hakija` -projekteihin on lisätty
alias, jolla voi ajaa kaikki työkalut läpi:

``` shell
../lein checkall
```

Tämä ajaa lein check, kibit, eastwood ja bikeshed -työkalut projektin
koodipohjalle. Eastwood-työkalussa on filteröity pois migraatiot ja testit, jotta
työkalut eivät aja niitä ja muuta tietokantaa.

Yksittäin työkaluja voit ajaa seuraavasti:

``` shell
../lein check
../lein kibit
../lein eastwood
../lein bikeshed
```

Myös yksittäisille nimiavaruudelle voi ajaa eastwood-linterin:

``` shell
../lein eastwood "{:namespaces [oph.va.virkailija.payment-batches-routes oph.va.virkailija.payment-batches-data]}"
```

Kibitille voi antaa tarkastettavan tiedoston parametrina:

``` shell
../lein kibit src/clojure/oph/va/virkailija/payments_data.clj
```

Bikeshedin kanssa joutuu käyttämään grepiä hyväkseen:

``` shell
../lein bikeshed | grep 'Checking\|payments_data.clj'
```

Lisätietoja:

- [kibit](https://github.com/jonase/kibit)
- [eastwood](https://github.com/jonase/eastwood)
- [lein-bikeshed](https://github.com/dakrone/lein-bikeshed)

### Tyyli

- `.editorconfig`-tiedostossa on määritelty perustyylit, kuten
  - sisennys: 2 välilyöntiä
  - rivin pituus 80 merkkiä
- Frontendissä CSS-luokkien nimet pienellä ja sanat viivalla eroteltuna
