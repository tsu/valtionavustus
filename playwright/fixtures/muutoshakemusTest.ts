import { expect } from '@playwright/test'
import {HakemustenArviointiPage} from "../pages/hakemustenArviointiPage";
import {HakujenHallintaPage} from "../pages/hakujenHallintaPage";
import moment from "moment"
import {HakijaAvustusHakuPage} from "../pages/hakijaAvustusHakuPage";
import { defaultValues } from "./defaultValues";

export interface MuutoshakemusFixtures {
  finalAvustushakuEndDate: moment.Moment
  avustushakuID: number
  closedAvustushaku: {
    id: number
  }
  submittedHakemus: {
    userKey: string
  }
  acceptedHakemus: {
    hakemusID: number
    userKey: string
  }
}

/**
 * Creates a muutoshakuenabled hakemus with käyttöaika and sisältö, but no budjetti
 */
export const muutoshakemusTest = defaultValues.extend<MuutoshakemusFixtures>({
  finalAvustushakuEndDate: moment().subtract(1, 'year'),
  avustushakuID: async ({page, hakuProps, userCache}, use, testInfo) => {
    expect(userCache).toBeDefined()
    testInfo.setTimeout(testInfo.timeout + 40_000)
    const hakujenHallintaPage = new HakujenHallintaPage(page)
    const avustushakuID = await hakujenHallintaPage.createMuutoshakemusEnabledHaku(hakuProps)
    await use(avustushakuID)
  },
  submittedHakemus: async ({avustushakuID, answers, page}, use, testInfo) => {
    testInfo.setTimeout(testInfo.timeout + 15_000)

    const hakijaAvustusHakuPage = new HakijaAvustusHakuPage(page)
    await hakijaAvustusHakuPage.navigate(avustushakuID, answers.lang)
    const {userKey} = await hakijaAvustusHakuPage.fillAndSendMuutoshakemusEnabledHakemus(avustushakuID, answers)
    use({userKey})
  },
  closedAvustushaku: async({ page, avustushakuID, submittedHakemus, finalAvustushakuEndDate }, use) => {
    expect(submittedHakemus).toBeDefined()
    const hakujenHallintaPage = new HakujenHallintaPage(page)
    await hakujenHallintaPage.navigate(avustushakuID)
    await hakujenHallintaPage.setEndDate(finalAvustushakuEndDate.format("D.M.YYYY H.mm"))
    await use({ id: avustushakuID })
  },
  acceptedHakemus: async ({closedAvustushaku, page, submittedHakemus: {userKey}}, use, testInfo) => {
    const avustushakuID = closedAvustushaku.id
    testInfo.setTimeout(testInfo.timeout + 25_000)

    const hakemustenArviointiPage = new HakemustenArviointiPage(page)
    await hakemustenArviointiPage.navigate(avustushakuID)
    const hakemusID = await hakemustenArviointiPage.acceptAvustushaku(avustushakuID, "100000", "Ammatillinen koulutus")

    const hakujenHallintaPage = new HakujenHallintaPage(page)
    await hakujenHallintaPage.navigate(avustushakuID)
    await hakujenHallintaPage.resolveAvustushaku()

    await hakemustenArviointiPage.navigate(avustushakuID)
    await hakemustenArviointiPage.selectValmistelijaForHakemus(avustushakuID, hakemusID, "_ valtionavustus")

    await hakujenHallintaPage.navigateToPaatos(avustushakuID)
    await hakujenHallintaPage.sendPaatos(avustushakuID)

    await use({hakemusID, userKey})
  }
})
