import { APIRequestContext, expect, Page } from '@playwright/test'

import { muutoshakemusTest as test } from '../../fixtures/muutoshakemusTest'
import { KoodienhallintaPage } from '../../pages/koodienHallintaPage'
import { getHakemusTokenAndRegisterNumber } from '../../utils/emails'
import { VIRKAILIJA_URL } from '../../utils/constants'
import { MaksatuksetPage } from '../../pages/hakujen-hallinta/maksatuksetPage'
import { HakujenHallintaPage, Installment } from '../../pages/hakujenHallintaPage'
import { NoProjectCodeProvided } from '../../utils/types'
import { VirkailijaValiselvitysPage } from '../../pages/virkailijaValiselvitysPage'
import moment from 'moment'
import { randomString } from '../../utils/random'
import { expectToBeDefined } from '../../utils/util'
import { HakemustenArviointiPage } from '../../pages/hakemustenArviointiPage'
import { twoAcceptedHakemusTest } from '../../fixtures/twoHakemusTest'

const correctOVTTest = test.extend({
  codes: async ({ page }, use) => {
    const codes = {
      operationalUnit: '6600105300',
      operation: '3425324634',
      project: [NoProjectCodeProvided.code, '523452346'],
    }
    const koodienHallintaPage = KoodienhallintaPage(page)
    await koodienHallintaPage.createCodeValues(codes)
    await use(codes)
  },
})

const showProjectCodeTest = test.extend({
  codes: async ({ page }, use) => {
    const codes = {
      operationalUnit: '6600105300',
      operation: '3425324634',
      project: [
        NoProjectCodeProvided.code,
        randomString().substring(0, 13),
        randomString().substring(0, 13),
        randomString().substring(0, 13),
      ],
    }
    const koodienHallintaPage = KoodienhallintaPage(page)
    await koodienHallintaPage.createCodeValues(codes)
    await use(codes)
  },
  projektikoodi: async ({ codes }, use) => {
    await use(codes.project[2])
  },
})

test.setTimeout(400000)
correctOVTTest.setTimeout(400000)
showProjectCodeTest.setTimeout(400000)

function getUniqueFileName(): string {
  return `va_${new Date().getTime()}.xml`
}

export async function putMaksupalauteToMaksatuspalveluAndProcessIt(
  request: APIRequestContext,
  xml: string
): Promise<void> {
  const data = {
    // The XML parser fails if the input doesn't start with "<?xml " hence the trimLeft
    xml: xml.trimStart(),
    filename: getUniqueFileName(),
  }
  await request.post(`${VIRKAILIJA_URL}/api/test/process-maksupalaute`, {
    data,
    timeout: 30000,
    failOnStatusCode: true,
  })
}

export async function getAllMaksatuksetFromMaksatuspalvelu(
  request: APIRequestContext
): Promise<string[]> {
  const res = await request.get(`${VIRKAILIJA_URL}/api/test/get-sent-maksatukset`, {
    timeout: 60000,
    failOnStatusCode: true,
  })
  const { maksatukset } = await res.json()
  return maksatukset
}

export async function getSentInvoiceFromDB(
  request: APIRequestContext,
  pitkaviite: string
): Promise<string> {
  const res = await request.post(`${VIRKAILIJA_URL}/api/test/get-sent-invoice-from-db`, {
    data: { pitkaviite },
    failOnStatusCode: true,
  })
  return await res.text()
}

export async function removeStoredPitkäviiteFromAllAvustushakuPayments(
  request: APIRequestContext,
  avustushakuId: number
): Promise<void> {
  await request.post(
    `${VIRKAILIJA_URL}/api/test/remove-stored-pitkaviite-from-all-avustushaku-payments`,
    { data: { avustushakuId }, failOnStatusCode: true }
  )
}

const multipleInstallmentTest = test.extend({
  hakuProps: async ({ hakuProps }, use) => {
    await use({ ...hakuProps, installment: Installment.MultipleInstallments })
  },
})

const presenter = 'essi.esittelija@example.com'
const acceptor = 'hygge.hyvaksyja@example.com'
const today = (): string => {
  return moment().format('D.M.YYYY')
}
const oneWeekFromNow = (): string => {
  return moment().add(7, 'day').format('D.M.YYYY')
}

async function testPaymentBatchesTable(page: Page) {
  const maksatuksetPage = MaksatuksetPage(page)
  const sentPayments = await maksatuksetPage.clickLahetetytMaksatuksetTab()

  await expect(sentPayments(3).phaseTitle).toHaveText('3. erä')
  await expect(sentPayments(2).totalSum).toHaveText('30000')
  await expect(sentPayments(3).totalSum).toHaveText('10000')
  await expect(sentPayments(1).amountOfPayments).toHaveText('1')
  await expect(sentPayments(3).laskuPaivamaara).toHaveText(today())
  await expect(sentPayments(2).eraPaivamaara).toHaveText(oneWeekFromNow())
  await expect(sentPayments(1).allekirjoitettuYhteenveto).toHaveText('asha pasha')
  await expect(sentPayments(2).presenterEmail).toHaveText(presenter)
  await expect(sentPayments(3).acceptorEmail).toHaveText(acceptor)
}

const withoutDots = (tatili: string) => tatili.replaceAll('.', '')

async function testSentPaymentsTable(
  page: Page,
  { registerNumber, talousarviotili }: { registerNumber: string; talousarviotili: string }
) {
  const maksatuksetPage = MaksatuksetPage(page)
  const sentPayments = await maksatuksetPage.clickLahetetytMaksatuksetTab()

  await expect(sentPayments(1).pitkaviite).toHaveText(`${registerNumber}_1 Erkki Esimerkki`)
  await expect(sentPayments(2).pitkaviite).toHaveText(`${registerNumber}_2 Erkki Esimerkki`)
  await expect(sentPayments(3).pitkaviite).toHaveText(`${registerNumber}_3 Erkki Esimerkki`)
  await expect(sentPayments(1).paymentStatus).toHaveText('Lähetetty')
  await expect(sentPayments(2).toimittaja).toHaveText('Akaan kaupunki')
  await expect(sentPayments(3).hanke).toHaveText('Rahassa kylpijät Ky Ay Oy')
  await expect(sentPayments(3).hanke).toHaveText('Rahassa kylpijät Ky Ay Oy')
  await expect(sentPayments(1).maksuun).toHaveText('59999 €')
  await expect(sentPayments(2).maksuun).toHaveText('30000 €')
  await expect(sentPayments(3).maksuun).toHaveText('10000 €')
  await expect(sentPayments(1).iban).toHaveText('FI95 6682 9530 0087 65')
  await expect(sentPayments(2).lkpTili).toHaveText('82010000')
  await expect(sentPayments(3).takpTili).toHaveText(withoutDots(talousarviotili))
  await expect(sentPayments(1).tiliointi).toHaveText('59999 €')
  await expect(sentPayments(2).tiliointi).toHaveText('30000 €')
  await expect(sentPayments(3).tiliointi).toHaveText('10000 €')
}

test.describe('Maksatukset', () => {
  multipleInstallmentTest(
    'Hakemus voidaan maksaa monessa erässä',
    async ({
      page,
      avustushakuID,
      avustushakuName,
      acceptedHakemus: { hakemusID },
      talousarviotili,
    }) => {
      const valiselvitysPage = VirkailijaValiselvitysPage(page)

      async function acceptValiselvitysWithInstallment(installmentSum: number) {
        const valiselvitysTab = await valiselvitysPage.navigateToValiselvitysTab(
          avustushakuID,
          hakemusID
        )

        await valiselvitysTab.acceptInstallment(`${installmentSum}`)
      }

      async function acceptLoppuselvitysWithInstallment(installmentSum: number) {
        const loppuselvitysTab = await valiselvitysPage.navigateToLoppuselvitysTab(
          avustushakuID,
          hakemusID
        )
        await loppuselvitysTab.acceptInstallment(`${installmentSum}`)
      }

      await acceptValiselvitysWithInstallment(30000)
      await acceptLoppuselvitysWithInstallment(10000)

      const { 'register-number': registerNumber } = await getHakemusTokenAndRegisterNumber(
        hakemusID
      )

      const maksatuksetPage = MaksatuksetPage(page)
      await maksatuksetPage.goto(avustushakuName)
      await maksatuksetPage.fillMaksueranTiedotAndSendMaksatukset()

      await testPaymentBatchesTable(page)
      await testSentPaymentsTable(page, {
        registerNumber,
        talousarviotili: talousarviotili.code,
      })
    }
  )

  correctOVTTest(
    'uses correct OVT when the operational unit is Palvelukeskus',
    async ({
      page,
      avustushakuName,
      acceptedHakemus: { hakemusID },
      codes: codeValues,
      talousarviotili,
    }) => {
      const maksatuksetPage = MaksatuksetPage(page)
      await maksatuksetPage.goto(avustushakuName)
      const dueDate = await maksatuksetPage.fillMaksueranTiedotAndSendMaksatukset()
      await maksatuksetPage.reloadPaymentPage()

      const paymentBatches = await maksatuksetPage.clickLahetetytMaksatuksetTab()
      const { 'register-number': registerNumber } = await getHakemusTokenAndRegisterNumber(
        hakemusID
      )
      const pitkaviite = `${registerNumber}_1 Erkki Esimerkki`

      await expect(paymentBatches(1).pitkaviite).toHaveText(pitkaviite)
      await expect(paymentBatches(1).paymentStatus).toHaveText('Lähetetty')
      await expect(paymentBatches(1).toimittaja).toHaveText('Akaan kaupunki')
      await expect(paymentBatches(1).hanke).toHaveText('Rahassa kylpijät Ky Ay Oy')

      const maksuun = '99999 €'
      await expect(paymentBatches(1).maksuun).toHaveText(maksuun)
      await expect(paymentBatches(1).iban).toHaveText('FI95 6682 9530 0087 65')
      await expect(paymentBatches(1).lkpTili).toHaveText('82010000')
      const tatili = withoutDots(talousarviotili.code)
      await expect(paymentBatches(1).takpTili).toHaveText(tatili)
      await expect(paymentBatches(1).tiliointi).toHaveText(maksuun)

      await putMaksupalauteToMaksatuspalveluAndProcessIt(
        page.request,
        `
      <?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <VA-invoice>
        <Header>
          <Pitkaviite>${pitkaviite}</Pitkaviite>
          <Maksupvm>2018-06-08</Maksupvm>
        </Header>
      </VA-invoice>
    `
      )

      await maksatuksetPage.reloadPaymentPage()
      await maksatuksetPage.clickLahetetytMaksatuksetTab()
      await expect(paymentBatches(1).paymentStatus).toHaveText('Maksettu')

      const maksatukset = await getAllMaksatuksetFromMaksatuspalvelu(page.request)

      expect(maksatukset).toContainEqual(
        maksatuksetPage.getExpectedPaymentXML({
          projekti: codeValues.project[1],
          toiminto: codeValues.operation,
          toimintayksikko: codeValues.operationalUnit,
          pitkaviite,
          invoiceNumber: `${registerNumber}_1`,
          dueDate,
          ovt: '00372769790122',
          talousarviotili: tatili,
        })
      )
    }
  )

  test('work with pitkaviite without contact person name', async ({
    page,
    avustushakuID,
    avustushakuName,
    acceptedHakemus: { hakemusID },
    talousarviotili,
  }) => {
    const maksatuksetPage = MaksatuksetPage(page)
    await maksatuksetPage.goto(avustushakuName)

    await maksatuksetPage.fillInMaksueranTiedot(
      'asha pasha',
      'essi.esittelija@example.com',
      'hygge.hyvaksyja@example.com'
    )

    await maksatuksetPage.sendMaksatukset()

    await removeStoredPitkäviiteFromAllAvustushakuPayments(page.request, avustushakuID)
    await maksatuksetPage.reloadPaymentPage()

    const sentPayments = await maksatuksetPage.clickLahetetytMaksatuksetTab()
    const { 'register-number': registerNumber } = await getHakemusTokenAndRegisterNumber(hakemusID)
    const pitkaviite = registerNumber

    await expect(sentPayments(1).pitkaviite).toHaveText(pitkaviite)
    await expect(sentPayments(1).paymentStatus).toHaveText('Lähetetty')
    await expect(sentPayments(1).toimittaja).toHaveText('Akaan kaupunki')
    await expect(sentPayments(1).hanke).toHaveText('Rahassa kylpijät Ky Ay Oy')

    const maksuun = '99999 €'
    await expect(sentPayments(1).maksuun).toHaveText(maksuun)
    await expect(sentPayments(1).iban).toHaveText('FI95 6682 9530 0087 65')
    await expect(sentPayments(1).lkpTili).toHaveText('82010000')
    await expect(sentPayments(1).takpTili).toHaveText(withoutDots(talousarviotili.code))
    await expect(sentPayments(1).tiliointi).toHaveText(maksuun)

    await putMaksupalauteToMaksatuspalveluAndProcessIt(
      page.request,
      `
      <?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <VA-invoice>
        <Header>
          <Pitkaviite>${pitkaviite}</Pitkaviite>
          <Maksupvm>2018-06-08</Maksupvm>
        </Header>
      </VA-invoice>
    `
    )

    await maksatuksetPage.reloadPaymentPage()
    await maksatuksetPage.clickLahetetytMaksatuksetTab()
    await expect(sentPayments(1).paymentStatus).toHaveText('Maksettu')
  })

  twoAcceptedHakemusTest(
    'does not create maksatukset if should-pay is set to false',
    async ({
      page,
      avustushakuID,
      avustushakuName,
      acceptedHakemukset: { hakemusID },
      answers,
      secondAnswers,
    }) => {
      expectToBeDefined(hakemusID)
      const hakemustenArviointiPage = new HakemustenArviointiPage(page)
      await hakemustenArviointiPage.navigate(avustushakuID)
      await test.step('set should pay to false for first hakemus', async () => {
        await hakemustenArviointiPage.selectHakemusFromList(answers.projectName)
        await hakemustenArviointiPage.tabs().seuranta.click()
        const seuranta = hakemustenArviointiPage.seurantaTabLocators()
        await expect(seuranta.shouldPay.truthy).toBeChecked()
        await expect(seuranta.shouldPay.falsy).not.toBeChecked()
        await expect(seuranta.shouldPay.comment).toBeDisabled()
        await seuranta.shouldPay.falsy.click()
        await hakemustenArviointiPage.waitForSave()
        await expect(seuranta.shouldPay.comment).toBeEnabled()
        await seuranta.shouldPay.comment.fill('Pyörrän päätökseni')
      })
      await test.step(
        'only second hakemus maksatukset are created as first was marked should not pay',
        async () => {
          await hakemustenArviointiPage.waitForSave()
          const maksatuksetPage = MaksatuksetPage(page)
          await maksatuksetPage.goto(avustushakuName)
          const firstRowHanke = maksatuksetPage.maksatuksetTableRow(0).hanke
          await expect(firstRowHanke).toBeHidden()
          await maksatuksetPage.luoMaksatukset.click()
          await expect(firstRowHanke).toHaveText(secondAnswers.projectName)
          await expect(maksatuksetPage.maksatuksetTableRow(1).hanke).toBeHidden()
        }
      )
    }
  )

  test('work with pitkaviite with contact person name', async ({
    page,
    avustushakuName,
    acceptedHakemus: { hakemusID },
    codes: { operation, operationalUnit },
    projektikoodi,
    talousarviotili,
  }) => {
    const maksatuksetPage = MaksatuksetPage(page)
    await maksatuksetPage.goto(avustushakuName)
    const dueDate = await maksatuksetPage.fillMaksueranTiedotAndSendMaksatukset()
    await maksatuksetPage.reloadPaymentPage()

    const sentPayments = await maksatuksetPage.clickLahetetytMaksatuksetTab()
    const { 'register-number': registerNumber } = await getHakemusTokenAndRegisterNumber(hakemusID)
    const pitkaviite = `${registerNumber}_1 Erkki Esimerkki`

    await expect(sentPayments(1).pitkaviite).toHaveText(pitkaviite)
    await expect(sentPayments(1).paymentStatus).toHaveText('Lähetetty')
    await expect(sentPayments(1).toimittaja).toHaveText('Akaan kaupunki')
    await expect(sentPayments(1).hanke).toHaveText('Rahassa kylpijät Ky Ay Oy')
    const maksuun = '99999 €'
    await expect(sentPayments(1).maksuun).toHaveText(maksuun)
    await expect(sentPayments(1).iban).toHaveText('FI95 6682 9530 0087 65')
    await expect(sentPayments(1).lkpTili).toHaveText('82010000')
    const tatili = withoutDots(talousarviotili.code)
    await expect(sentPayments(1).takpTili).toHaveText(tatili)
    await expect(sentPayments(1).tiliointi).toHaveText(maksuun)

    await putMaksupalauteToMaksatuspalveluAndProcessIt(
      page.request,
      `
      <?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <VA-invoice>
        <Header>
          <Pitkaviite>${pitkaviite}</Pitkaviite>
          <Maksupvm>2018-06-08</Maksupvm>
        </Header>
      </VA-invoice>
    `
    )

    await maksatuksetPage.reloadPaymentPage()
    const sentPaymentsAfterMaksupalaute = await maksatuksetPage.clickLahetetytMaksatuksetTab()
    const statuses = sentPaymentsAfterMaksupalaute(1)
    await expect(statuses.paymentStatus).toHaveText('Maksettu')

    const maksatukset = await getAllMaksatuksetFromMaksatuspalvelu(page.request)
    expect(maksatukset).toContainEqual(
      maksatuksetPage.getExpectedPaymentXML({
        projekti: projektikoodi,
        toiminto: operation,
        toimintayksikko: operationalUnit,
        pitkaviite,
        invoiceNumber: `${registerNumber}_1`,
        dueDate,
        talousarviotili: tatili,
      })
    )
  })

  showProjectCodeTest(
    'sends correct project code to maksatukset when there are multiple project codes for avustushaku',
    async ({
      page,
      acceptedHakemus,
      avustushakuName,
      talousarviotili,
      codes: { operation, operationalUnit },
      projektikoodi,
    }) => {
      expectToBeDefined(acceptedHakemus)
      const maksatusPage = MaksatuksetPage(page)
      const lahtevatMaksatukset = await maksatusPage.goto(avustushakuName)
      const projectCode = `Projekti ${projektikoodi}`
      await expect(lahtevatMaksatukset.projektikoodi).toHaveText(projectCode)
      const dueDate = await maksatusPage.fillMaksueranTiedotAndSendMaksatukset()
      await maksatusPage.reloadPaymentPage()
      const lahetetytMaksatukset = await maksatusPage.clickLahetetytMaksatuksetTab()
      await expect(lahetetytMaksatukset(1).projektikoodi).toHaveText(projectCode)

      const { 'register-number': registerNumber } = await getHakemusTokenAndRegisterNumber(
        acceptedHakemus.hakemusID
      )
      const pitkaviite = `${registerNumber}_1 Erkki Esimerkki`
      await putMaksupalauteToMaksatuspalveluAndProcessIt(
        page.request,
        `
      <?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <VA-invoice>
        <Header>
          <Pitkaviite>${pitkaviite}</Pitkaviite>
          <Maksupvm>2018-06-08</Maksupvm>
        </Header>
      </VA-invoice>
    `
      )
      const maksatukset = await getAllMaksatuksetFromMaksatuspalvelu(page.request)
      const invoiceXML = await getSentInvoiceFromDB(page.request, pitkaviite)

      const expectedXML = maksatusPage.getExpectedPaymentXML({
        projekti: projektikoodi,
        toiminto: operation,
        toimintayksikko: operationalUnit,
        pitkaviite,
        invoiceNumber: `${registerNumber}_1`,
        dueDate,
        ovt: '00372769790122',
        talousarviotili: withoutDots(talousarviotili.code),
      })

      expect(maksatukset).toContainEqual(expectedXML)
      expect(invoiceXML).toBe(expectedXML)
    }
  )

  test('sending maksatukset disables changing code values for haku', async ({
    page,
    avustushakuID,
    avustushakuName,
    acceptedHakemus: { hakemusID },
  }) => {
    const maksatuksetPage = MaksatuksetPage(page)

    await maksatuksetPage.goto(avustushakuName)
    await maksatuksetPage.fillMaksueranTiedotAndSendMaksatukset()
    await maksatuksetPage.reloadPaymentPage()

    const { 'register-number': registerNumber } = await getHakemusTokenAndRegisterNumber(hakemusID)
    const pitkaviite = `${registerNumber}_1 Erkki Esimerkki`
    await putMaksupalauteToMaksatuspalveluAndProcessIt(
      page.request,
      `
      <?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <VA-invoice>
        <Header>
          <Pitkaviite>${pitkaviite}</Pitkaviite>
          <Maksupvm>2018-06-08</Maksupvm>
        </Header>
      </VA-invoice>
    `
    )

    const hakujenHallintaPage = new HakujenHallintaPage(page)
    await hakujenHallintaPage.navigate(avustushakuID)
    await expect(
      hakujenHallintaPage.page.locator('.code-value-dropdown-operational-unit-id--is-disabled')
    ).toBeVisible()
    await expect(
      hakujenHallintaPage.page.locator('.code-value-dropdown-operation-id--is-disabled')
    ).toBeVisible()

    const projects = await hakujenHallintaPage.page.locator(
      '.code-value-dropdown-project-id--is-disabled'
    )
    for (let i = 0; i < (await projects.count()); i++) {
      await expect(projects.nth(i)).toBeVisible()
    }
  })
})
