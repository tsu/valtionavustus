import {ElementHandle, Page} from "playwright";
import {navigate} from "../utils/navigate";
import {
  clickElementWithText,
  expectToBeDefined, getChangedBudgetTableCells, getExistingBudgetTableCells,
  textContent
} from "../utils/util";
import {expect} from "@playwright/test";
import {VIRKAILIJA_URL} from "../utils/constants";

import {MuutoshakemusValues, PaatosStatus, PaatosValues} from "../utils/types";
import {
  AcceptedBudget,
  Budget,
  BudgetAmount,
  defaultBudget
} from "../utils/budget";

const jatkoaikaSelector = '[data-test-id=muutoshakemus-jatkoaika]' as const

export class HakemustenArviointiPage {
  readonly  page: Page

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(avustushakuID: number) {
    await navigate(this.page, `/avustushaku/${avustushakuID}/`)
  }

  async navigateToLatestMuutoshakemus(avustushakuID: number, hakemusID: number) {
    await navigate(this.page, `/avustushaku/${avustushakuID}/hakemus/${hakemusID}/muutoshakemukset/`)
    await this.page.waitForSelector('#tab-content')
  }

  async clickHakemus(hakemusID: number) {
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.click(`#hakemus-${hakemusID}`)
    ])
  }

  async search(text) {
    const searchSelector = '[aria-label="Enter your search term"]'
    await this.page.fill(searchSelector, text);
    await this.page.press(searchSelector, 'Enter');
  }

  async prepareSelectingValmistelijaForHakemus(hakemusID: number, valmistelijaName: string) {
    await this.page.click(`#hakemus-${hakemusID} .btn-role`)
    const selector = `table.hakemus-list tr.selected button:has-text("${valmistelijaName}")`
    const valmistelijaButton = await this.page.waitForSelector(selector)
    if (!valmistelijaButton) {
      throw new Error(`Valmistelija button not found with selector: ${selector}`)
    }
    return valmistelijaButton
  }

  async waitForArvioSave(avustushakuID: number, hakemusID: number) {
    await this.page.waitForResponse(`${VIRKAILIJA_URL}/api/avustushaku/${avustushakuID}/hakemus/${hakemusID}/arvio`)
  }

  async selectValmistelijaForHakemus(avustushakuID: number, hakemusID: number, valmistelijaName: string) {
    const valmistelijaButton = await this.prepareSelectingValmistelijaForHakemus(hakemusID, valmistelijaName)
    const valmistelijaButtonClass = await (await valmistelijaButton.getProperty('className'))?.jsonValue()

    if (!valmistelijaButtonClass.includes('selected')) {
      await Promise.all([
        this.waitForArvioSave(avustushakuID, hakemusID),
        (valmistelijaButton as ElementHandle).click(),
      ])
    }
  }

  async fillBudget(budget: Budget = defaultBudget, type: 'hakija' | 'virkailija') {

    const prefix = type === 'virkailija' ? 'budget-edit-' : ''

    await this.page.fill(`[id='${prefix}personnel-costs-row.description']`, budget.description.personnel)
    await this.page.fill(`[id='${prefix}personnel-costs-row.amount']`, budget.amount.personnel)
    await this.page.fill(`[id='${prefix}material-costs-row.description']`, budget.description.material)
    await this.page.fill(`[id='${prefix}material-costs-row.amount']`, budget.amount.material)
    await this.page.fill(`[id='${prefix}equipment-costs-row.description']`, budget.description.equipment)
    await this.page.fill(`[id='${prefix}equipment-costs-row.amount']`, budget.amount.equipment)
    await this.page.fill(`[id='${prefix}service-purchase-costs-row.description']`, budget.description['service-purchase'])
    await this.page.fill(`[id='${prefix}service-purchase-costs-row.amount']`, budget.amount['service-purchase'])
    await this.page.fill(`[id='${prefix}rent-costs-row.description']`, budget.description.rent)
    await this.page.fill(`[id='${prefix}rent-costs-row.amount']`, budget.amount.rent)
    await this.page.fill(`[id='${prefix}steamship-costs-row.description']`, budget.description.steamship)
    await this.page.fill(`[id='${prefix}steamship-costs-row.amount']`, budget.amount.steamship)
    await this.page.fill(`[id='${prefix}other-costs-row.description']`, budget.description.other)
    await this.page.fill(`[id='${prefix}other-costs-row.amount']`, budget.amount.other)

    if (type === 'hakija') {
      await this.page.fill(`[id='${prefix}self-financing-amount']`, budget.selfFinancing)
    }
  }

  async acceptBudget(budget: AcceptedBudget) {
    if (typeof budget === 'string') {
      await this.page.fill("#budget-edit-project-budget .amount-column input", budget)
    } else {
      await this.page.click( 'label[for="useDetailedCosts-true"]')
      await this.fillBudget(budget, 'virkailija')
    }
  }

  async acceptAvustushaku(
    avustushakuID: number,
    budget: AcceptedBudget = "100000",
    rahoitusalue?: string,
  ) {
    // Accept the hakemus
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.click('td:has-text("Akaan kaupunki")')
    ])

    const hakemusID = await this.page.evaluate(() => window.location.pathname.match(/\/hakemus\/(\d+)\//)?.[1]).then(possibleHakemusID => {
      expectToBeDefined(possibleHakemusID)
      return parseInt(possibleHakemusID)
    })

    expectToBeDefined(hakemusID)
    console.log("Hakemus ID:", hakemusID)

    if (rahoitusalue) {
      // await this.page.click(`//label[contains(., "${rahoitusalue}")]`)
      await this.page.click(`label:has-text("${rahoitusalue}")`)
    }

    await this.page.click("#arviointi-tab label[for='set-arvio-status-plausible']")
    await this.acceptBudget(budget)
    await this.page.click("#arviointi-tab label[for='set-arvio-status-accepted']")
    await this.waitForArvioSave(avustushakuID, hakemusID)
    return hakemusID
  }

  statusFieldSelector(hakemusID: number) {
    return `[data-test-id=muutoshakemus-status-${hakemusID}]`
  }

  async muutoshakemusStatusFieldContent(hakemusID: number) {
    const handle = await this.page.waitForSelector(this.statusFieldSelector(hakemusID))
    return await handle.textContent()
  }

  async clickMuutoshakemusStatusField(hakemusID: number) {
    await this.page.click(this.statusFieldSelector(hakemusID))
  }

  async clickMuutoshakemusTab() {
    await this.page.click('span.muutoshakemus-tab')
    await this.page.waitForSelector(jatkoaikaSelector)
  }

  async validateMuutoshakemusValues(muutoshakemus: MuutoshakemusValues, paatos?: PaatosValues) {
    const jatkoaika = await textContent(this.page, jatkoaikaSelector)
    expect(jatkoaika).toEqual(muutoshakemus.jatkoaika?.format('DD.MM.YYYY'))
    const jatkoaikaPerustelu = await textContent(this.page, '[data-test-id=muutoshakemus-jatkoaika-perustelu]')
    expect(jatkoaikaPerustelu).toEqual(muutoshakemus.jatkoaikaPerustelu)

    if (paatos) {
      await this.page.waitForSelector('[data-test-id="muutoshakemus-paatos"]')
      const form = await this.page.evaluate((selector: string) => document.querySelectorAll(selector).length, '[data-test-id="muutoshakemus-form"]')
      expect(form).toEqual(0)
      const muutospaatosLink = await textContent(this.page, 'a.muutoshakemus__paatos-link')
      expect(muutospaatosLink).toMatch(/https?:\/\/[^\/]+\/muutoshakemus\/paatos\?user-key=[a-f0-9]{64}/)
    } else {
      await this.page.waitForSelector('[data-test-id="muutoshakemus-form"]')
    }
  }

  async selectVakioperusteluInFinnish() {
    await clickElementWithText(this.page, 'a', 'Lisää vakioperustelu suomeksi')
  }

  async openPaatosPreview() {
    await Promise.all([
      clickElementWithText(this.page, 'a', 'Esikatsele päätösdokumentti'),
      this.page.waitForSelector('.muutoshakemus-paatos__content')
    ])
  }

  async paatosPreviewTitle() {
    return await textContent(this.page, '.hakemus-details-modal__title-row > span')
  }

  async paatosPreviewMuutoshakemusPaatosTitle() {
    return await textContent(this.page, '[data-test-id=muutoshakemus-paatos-title]')
  }

  async paatosPreviewJatkoaikaPaatos() {
    return await textContent(this.page, '[data-test-id="paatos-jatkoaika"]')
  }

  async paatosPreviewSisaltoPaatos() {
    return await textContent(this.page, '[data-test-id="paatos-sisaltomuutos"]')
  }

  async paatosPreviewTalousarvioPaatos() {
    return await textContent(this.page, '[data-test-id="paatos-talousarvio"]')
  }

  async paatosPreviewSisaltoContent() {
    return await textContent(this.page, '[data-test-id="sisaltomuutos-content"]')
  }

  async paatosPreviewJatkoaikaValue() {
    return await textContent(this.page, '[data-test-id="paattymispaiva-value"]')
  }

  async paatosPreviewEsittelija() {
    return await textContent(this.page, '[data-test-id="paatos-esittelija"]')
  }

  async paatosPreviewLisatietoja() {
    return await textContent(this.page, '[data-test-id="paatos-additional-info"]')
  }

  async paatosPreviewHyvaksyja() {
    return await textContent(this.page, '[data-test-id="paatos-decider"]')
  }

  async closePaatosPreview() {
    await Promise.all([
      clickElementWithText(this.page, 'button', 'Sulje'),
      this.page.waitForSelector('.muutoshakemus-paatos__content', { state: 'detached' })
    ])
  }

  async paatosPreviewRegisterNumber() {
    return await textContent(this.page, '[data-test-id="paatos-register-number"]')
  }

  async paatosPreviewProjectName() {
    return await textContent(this.page, '[data-test-id="paatos-project-name"]')
  }

  async paatosPreviewOrg() {
    return await textContent(this.page, 'h1.muutoshakemus-paatos__org')
  }

  async paatosPreviewPerustelu() {
    return await textContent(this.page, '[data-test-id="paatos-reason"]')
  }

  async setMuutoshakemusJatkoaikaDecision(status: PaatosStatus, value?: string) {
    if (status) {
      await this.page.click(`label[for="haen-kayttoajan-pidennysta-${status}"]`)
    }
    if (value) {
      await this.page.fill('div.datepicker input', value)
    }
  }

  async writeSisaltomuutosPaatos(text: string) {
    await this.page.fill('[name=hyvaksytyt-sisaltomuutokset]', text)
  }

  async setMuutoshakemusSisaltoDecision(status: PaatosStatus, value?: string) {
    if (status) {
      await this.page.click(`label[for="haen-sisaltomuutosta-${status}"]`)
    }
    if (value) {
      await this.writeSisaltomuutosPaatos(value)
    }
  }

  async fillMuutoshakemusBudgetAmount(budget: BudgetAmount) {
    await this.page.fill( "input[name='talousarvio.personnel-costs-row'][type='number']", budget.personnel)
    await this.page.fill( "input[name='talousarvio.material-costs-row'][type='number']", budget.material)
    await this.page.fill( "input[name='talousarvio.equipment-costs-row'][type='number']", budget.equipment)
    await this.page.fill( "input[name='talousarvio.service-purchase-costs-row'][type='number']", budget['service-purchase'])
    await this.page.fill( "input[name='talousarvio.rent-costs-row'][type='number']", budget.rent)
    await this.page.fill( "input[name='talousarvio.steamship-costs-row'][type='number']", budget.steamship)
    await this.page.fill( "input[name='talousarvio.other-costs-row'][type='number']", budget.other)
  }

  async setMuutoshakemusBudgetDecision(status: PaatosStatus, value?: BudgetAmount) {
    if (status) {
      await this.page.click(`label[for="talousarvio-${status}"]`)
    }
    if (value) {
      await this.fillMuutoshakemusBudgetAmount(value)
    }
  }

  async saveMuutoshakemus() {
    await this.page.click('[data-test-id="muutoshakemus-submit"]')
    await this.page.waitForSelector('[data-test-id="muutoshakemus-paatos"]')
  }

  async existingBudgetTableCells(selector?: string) {
    return await getExistingBudgetTableCells(this.page, selector)
  }

  async changedBudgetTableCells(selector?: string) {
    return await getChangedBudgetTableCells(this.page, selector)
  }

}
