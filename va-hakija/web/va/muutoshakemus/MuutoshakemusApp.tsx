import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as Bacon from 'baconjs'
import * as queryString from 'query-string'

import HttpUtil from 'soresu-form/web/HttpUtil'

import 'soresu-form/web/form/style/main.less'
import '../style/main.less'
import {AvustuksenKayttoajanPidennys} from './components/jatkoaika/AvustuksenKayttoajanPidennys'
import {TopBar} from './components/TopBar'

type Language = 'fi' | 'sv'
function validateLanguage(s: unknown): Language {
  if (s !== 'fi' && s !== 'sv') {
    throw new Error(`Unrecognized language: ${s}`)
  }
  return s
}

const translationsFi = {
  hakemus: 'Hakemus',
  loading: 'Ladataan lomaketta...',
  contactPersonEdit: {
    haku: 'Haku',
    registerNumberTitle: 'Asianumero',
    hanke: 'Hanke',
    contactPerson: 'Yhteyshenkilö',
    email: 'Sähköposti',
    phone: 'Puhelin'
  },
  applicationEdit: {
    title: 'Muutosten hakeminen',
    contentEdit: 'Haen muutosta hankkeen sisältöön tai toteutustapaan',
    contentEditDetails: 'Kuvaile muutokset hankkeen sisältöön tai toteutustapaan',
    financeEdit: 'Haen muutosta hankkeen talouden käyttösuunnitelmaan',
    currentFinanceEstimation: 'Voimassaoleva talousarvio',
    newFinanceEstimation: 'Uusi talousarvio',
    expenses: 'Menot',
    expensesInTotal: 'Menot yhteensä',
    periodEdit: 'Haen pidennystä avustuksen käyttöajalle',
    currentPeriodEnd: 'Voimassaoleva päättymisaika',
    newPeriodEnd: 'Uusi päättymisaika',
    reasoning: 'Perustelut'
  }
}

type Translations = typeof translationsFi

const translationsSv: Translations = {
  ...translationsFi,
  hakemus: 'Ansökan'
}

const translations: { [key in Language]: typeof translationsFi } = {
  fi: translationsFi,
  sv: translationsSv
}

const query = queryString.parse(location.search)
const lang = validateLanguage(query.lang) || 'fi'
const userKey = query['user-key']
const avustushakuId = query['avustushaku-id']

interface AppProps {
  lang: Language,
}

interface ContactPersonEditProps {
  t: Translations
  avustushaku?: any
  hakemus?: any
}

function getAnswerFromHakemus(hakemus: any, keyName: string) {
  const answer = hakemus.submission.answers.value.find(({key}: {key: string}) => key === keyName)
  return answer.value
}

function ContactPersonEdit(props: ContactPersonEditProps) {
  const { t, avustushaku, hakemus } = props
  return (
  <section>
    <div className="muutoshaku__page-title">
      <h1 className="muutoshaku__title">{t.contactPersonEdit.haku}: <span data-test-id="avustushaku-name">{avustushaku?.content?.name?.[lang]}</span></h1>
      <span className="va-register-number">
        <span className="muutoshaku__register-number">{t.contactPersonEdit.registerNumberTitle}: </span>
        <span data-test-id="register-number">{avustushaku?.["register-number"]}</span>
      </span>
    </div>
    <div className="muutoshaku__form">
      <div className="muutoshaku__form-row">
        <div className="muutoshaku__form-cell">
          <div>{t.contactPersonEdit.hanke}</div>
          <div data-test-id="project-name">{getAnswerFromHakemus(hakemus, 'project-name')}</div>
        </div>
      </div>
      <div className="muutoshaku__form-row">
        <div className="muutoshaku__form-cell">
          <label htmlFor="muutoshaku__contact-person">{t.contactPersonEdit.contactPerson}</label>
          <input id="muutoshaku__contact-person" type="text" value={getAnswerFromHakemus(hakemus, "applicant-name")} />
        </div>
        <div className="muutoshaku__form-cell">
          <label htmlFor="muutoshaku__email">{t.contactPersonEdit.email}</label>
          <input id="muutoshaku__email" type="text" value={getAnswerFromHakemus(hakemus, 'primary-email')} />
        </div>
        <div className="muutoshaku__form-cell">
          <label htmlFor="muutoshaku__phone">{t.contactPersonEdit.phone}</label>
          <input id="muutoshaku__phone" type="text" value={getAnswerFromHakemus(hakemus, "textField-0")}/>
        </div>
      </div>
    </div>
  </section>
  )
}

interface ApplicationEditProps {
  t: Translations
}
function ApplicationEdit(props: ApplicationEditProps) {
  const { t } = props

  return (
  <section>
    <h1 className="muutoshaku__title">{t.applicationEdit.title}</h1>
    <div className="muutoshaku__form">
      <div className="soresu-checkbox">
        <input type="checkbox" id="content-edit" />
        <label htmlFor="content-edit">{t.applicationEdit.contentEdit}</label>
      </div>
      <div className="muutoshaku__application-edit-cell">
        <label htmlFor="muutoshaku__content-change">{t.applicationEdit.contentEditDetails}</label>
        <textarea id="muutoshaku__content-change" rows={20} />
      </div>
      <div className="soresu-checkbox">
        <input type="checkbox" id="finance-edit" />
        <label htmlFor="finance-edit">{t.applicationEdit.financeEdit}</label>
      </div>
      <div className="muutoshaku__application-edit-cell">
        <table>
          <thead>
            <tr>
              <th>{t.applicationEdit.currentFinanceEstimation}</th>
              <th>{t.applicationEdit.newFinanceEstimation}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th colSpan={2}>{t.applicationEdit.expenses}</th>
            </tr>
            <tr>
              <td>
                <div className="muutoshaku__current-amount">
                  <span>jotain</span>
                  <span>666 €</span>
                </div>
              </td>
              <td>
                <div className="muutoshaku__current-amount">
                  <input className="muutoshaku__currency-input" type="text" />
                  <span>€</span>
                </div>
              </td>
            </tr>
            <tr>
              <th colSpan={2}></th>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th>
                <div className="muutoshaku__current-amount">
                  <span>{t.applicationEdit.expensesInTotal}</span>
                  <span>666 €</span>
                </div>
              </th>
              <th>
                <div className="muutoshaku__current-amount">
                  <span>666</span>
                  <span>€</span>
                </div>
              </th>
            </tr>
          </tfoot>
        </table>
        <label htmlFor="muutoshaku__finance-reasoning">{t.applicationEdit.reasoning}</label>
        <textarea id="muutoshaku__finance-reasoning" rows={5} />
      </div>
    </div>
  </section>
  )
}

type EnvironmentApiResponse = {
  name: string
}

type AppState = {
  status: 'LOADING'
} | {
  status: 'LOADED'
  avustushaku: any
  environment: EnvironmentApiResponse
  hakemus: any
}

class MuutoshakemusApp extends React.Component<AppProps, AppState>  {
  unsubscribe: Function

  constructor(props: AppProps) {
    super(props)

    this.state = { status: 'LOADING' }

    const initialState = Bacon.combineTemplate({
      environment: Bacon.fromPromise(HttpUtil.get(`/environment`)),
      avustushaku: Bacon.fromPromise(HttpUtil.get(`/api/avustushaku/${avustushakuId}`)),
      hakemus: Bacon.fromPromise(HttpUtil.get(`/api/avustushaku/${avustushakuId}/hakemus/${userKey}`))
    })

    this.unsubscribe = initialState.onValue(({ avustushaku, environment, hakemus }: any) =>
      this.setState({ status: 'LOADED', avustushaku, environment, hakemus })
    )
  }

  componentWillUnmount() {
    this.unsubscribe()
  }

  render() {
    const {state, props} = this
    const t = translations[props.lang]

    if (state.status === 'LOADING')
      return <p>{t.loading}</p>

    return (
      <AppShell t={t} env={state.environment.name}>
        <ContactPersonEdit t={t} avustushaku={state.avustushaku} hakemus={state.hakemus}/>
        <ApplicationEdit t={t} />
        <AvustuksenKayttoajanPidennys nykyinenPaattymisaika={new Date()} />
        <Debug json={state} />
      </AppShell>
    )
  }
}

type AppShellProps = {
  t: Translations,
  env: string
  children?: JSX.Element[]
}

function AppShell({ children, t, env }: AppShellProps) {
  return (
    <div>
      <TopBar env={env} title={t.hakemus} />
      <section className="soresu-form" id="container">
        {children}
      </section>
    </div>
  )
}

type DebugProps = { json: object }
function Debug({ json }: DebugProps) {
  return <pre id="debug-api-response">{JSON.stringify(json, null, 2)}</pre>
}

ReactDOM.render(
  <MuutoshakemusApp lang={lang} />,
  document.getElementById('app')
)
