export const translationsFi = {
  hakemus: 'Hakemus',
  muutoshakemus: 'Muutoshakemus',
  waitingForDecision: 'Odottaa käsittelyä',
  loading: 'Ladataan lomaketta...',
  sendMuutoshakemus: 'Lähetä käsiteltäväksi',
  sendContactDetails: 'Tallenna muutokset',
  savedNotification: 'Muutokset tallennettu',
  sentNotification: 'Muutoshakemus lähetetty',
  errorNotification: 'Muutoksien tallentaminen epäonnistui',
  originalHakemus: 'Alkuperäinen hakemus',
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
    currentFinanceEstimation: 'Voimassaoleva talousarvio',
    newFinanceEstimation: 'Uusi talousarvio',
    expenses: 'Menot',
    expensesInTotal: 'Menot yhteensä',
    reasoning: 'Perustelut'
  },
  kayttoajanPidennys: {
    checkboxTitle: 'Haen pidennystä avustuksen käyttöajalle',
    existingExpirationDateTitle: 'Voimassaoleva päättymisaika',
    newExpirationDateTitle: 'Uusi päättymisaika',
  },
  muutosTaloudenKayttosuunnitelmaan: {
    checkboxTitle: 'Haen muutosta hankkeen talouden käyttösuunnitelmaan',
    currentBudget: 'Voimassaoleva talousarvio',
    modifiedBudget: 'Uusi talousarvio',
    expenses: 'Menot'
  },
  formErrors: {
    required: 'Pakollinen kenttä',
    email: 'Sähköposti ei ole validi',
    haettuKayttoajanPaattymispaiva: 'Päättymispäivän pitää olla tuleva päivämäärä'
  }
}

const translationsSv: Translations = {
  ...translationsFi,
  hakemus: 'Ansökan'
}

export const translations: { [key in Language]: typeof translationsFi } = {
  fi: translationsFi,
  sv: translationsSv
}

export type Language = 'fi' | 'sv'
export type Translations = typeof translationsFi
export type FormErrors = typeof translationsFi.formErrors
