import {test} from "@playwright/test"
import {MuutoshakemusFixtures} from "./muutoshakemusTest";
import {createRandomHakuValues} from "../utils/random";
import {KoodienhallintaPage} from "../pages/koodienHallintaPage";
import {HakujenHallintaPage} from "../pages/hakujenHallintaPage";
import {HakijaAvustusHakuPage} from "../pages/hakijaAvustusHakuPage";
import {HakemustenArviointiPage} from "../pages/hakemustenArviointiPage";
import {Budget, defaultBudget} from "../utils/budget";
import {answers} from "../utils/constants";

export interface BudjettimuutoshakemusFixtures extends MuutoshakemusFixtures {
  budget: Budget
  userKey: string
}

export const budjettimuutoshakemusTest = test.extend<BudjettimuutoshakemusFixtures>({
  answers,
  budget: defaultBudget,
  haku: async ({}, use) => {
    const randomHakuValues = createRandomHakuValues('Budjettimuutos')
    await use(randomHakuValues)
  },
  avustushakuID: async ({page, haku}, use) => {
    const koodienHallintaPage = new KoodienhallintaPage(page)
    const codes = await koodienHallintaPage.createRandomCodeValues()
    const hakujenHallintaPage = new HakujenHallintaPage(page)
    const avustushakuID = await hakujenHallintaPage.createBudjettimuutosEnabledHaku(haku.registerNumber, haku.avustushakuName, codes)
    await use(avustushakuID)
  },
  hakemus: async ({avustushakuID, page, budget, answers}, use) => {
    const hakijaAvustusHakuPage = new HakijaAvustusHakuPage(page)
    await hakijaAvustusHakuPage.navigate(avustushakuID, answers.lang)
    const {userKey} = await hakijaAvustusHakuPage.fillAndSendBudjettimuutoshakemusEnabledHakemus(avustushakuID, answers, budget)
    const hakujenHallintaPage = new HakujenHallintaPage(page)
    await hakujenHallintaPage.navigate(avustushakuID)
    await hakujenHallintaPage.closeAvustushakuByChangingEndDateToPast()
    const hakemustenArviointiPage = new HakemustenArviointiPage(page)
    await hakemustenArviointiPage.navigate(avustushakuID)
    const hakemusID = await hakemustenArviointiPage.acceptAvustushaku(avustushakuID, budget, "Ammatillinen koulutus")
    await hakujenHallintaPage.navigate(avustushakuID)
    await hakujenHallintaPage.resolveAvustushaku()
    await hakemustenArviointiPage.navigate(avustushakuID)
    await hakemustenArviointiPage.selectValmistelijaForHakemus(avustushakuID, hakemusID, "_ valtionavustus")
    await hakujenHallintaPage.navigateToPaatos(avustushakuID)
    await hakujenHallintaPage.sendPaatos(avustushakuID)
    await use({hakemusID, userKey})
  }
})
