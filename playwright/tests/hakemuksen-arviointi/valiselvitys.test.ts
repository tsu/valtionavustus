import { expect, test } from '@playwright/test'
import { ValiselvitysPage } from '../../pages/valiselvitysPage'
import { expectToBeDefined } from '../../utils/util'
import { HakemustenArviointiPage } from '../../pages/hakemustenArviointiPage'
import { väliselvitysTest } from '../../fixtures/väliselvitysTest'
import { getValiselvitysEmails } from '../../../test/test-util'
import { getHakemusTokenAndRegisterNumber, getValiselvitysSubmittedNotificationEmails, lastOrFail } from '../../utils/emails'

test.describe('Väliselvitys', () => {
  väliselvitysTest('väliselvitys submitted notification is sent', async ({ page, acceptedHakemus: { hakemusID }, väliselvitysSubmitted }) => {
    expectToBeDefined(väliselvitysSubmitted)
    const email = lastOrFail(await getValiselvitysSubmittedNotificationEmails(hakemusID))
    expect(email["to-address"]).toHaveLength(1)
    expect(email["to-address"]).toEqual(["erkki.esimerkki@example.com"])
    expect(email.subject).toEqual("Väliselvityksenne on vastaanotettu")
    const { 'register-number': registerNumber } = await getHakemusTokenAndRegisterNumber(hakemusID)
    expect(email.formatted).toContain(`Hyvä vastaanottaja,

olemme vastaanottaneet väliselvityksenne.

Rahassa kylpijät Ky Ay Oy
${registerNumber}
`)
    expect(email.formatted).toContain(`
Hakija voi muokata jo lähetettyä väliselvitystä oheisen linkin kautta selvityksen määräaikaan saakka. Tällöin selvitystä ei kuitenkaan enää lähetetä uudelleen käsiteltäväksi, vaan muokkausten tallentuminen varmistetaan hakulomakkeen yläreunan lokitietokentästä.

Lisätietoja saatte tarvittaessa avustuspäätöksessä mainitulta lisätietojen antajalta. Teknisissä ongelmissa auttaa: valtionavustukset@oph.fi

Kun selvitys on käsitelty, ilmoitetaan siitä sähköpostitse avustuksen saajan viralliseen sähköpostiosoitteeseen sekä yhteyshenkilölle.`)

    const previewUrl = email.formatted.match(/(https?:\/\/\S+)/gi)?.[0]
    if (!previewUrl) {
      throw new Error('No preview url found')
    }

    await page.goto(previewUrl)
    await expect(page.locator('div.soresu-preview > h1')).toContainText('väliselvitys submitted notification is sent')
    await expect(page.locator('#organization > div')).toContainText('Avustuksen saajan nimi')
  })

  väliselvitysTest(
    'väliselvitys can be accepted',
    async ({ page, avustushakuID , acceptedHakemus, väliselvitysSubmitted}) => {
      expectToBeDefined(väliselvitysSubmitted)
      const arviointi = new HakemustenArviointiPage(page)

      await test.step('väliselvitys is tarkastamatta', async () => {
        await arviointi.navigate(avustushakuID)
        expect(await arviointi.väliselvitysStatus(acceptedHakemus.hakemusID)).toEqual("Tarkastamatta")
      })

      await test.step('tarkasta väliselvitys', async () => {
        const valiselvitysPage = new ValiselvitysPage(page)
        valiselvitysPage.navigateToValiselvitysTab(avustushakuID, acceptedHakemus.hakemusID)
        await page.waitForSelector('[data-test-id="selvitys-email"]')
        await valiselvitysPage.acceptVäliselvitys()
      })

      await test.step('väliselvitys accepted email is sent to primary and organization emails', async () => {
        const emails = await getValiselvitysEmails(acceptedHakemus.hakemusID)
        const expected = ["erkki.esimerkki@example.com", "akaan.kaupunki@akaa.fi"]
        expect(emails[0]["to-address"].every(addr => expected.includes(addr))).toBeTruthy()
      })

      await test.step('väliselvitys is hyväksytty', async () => {
        await arviointi.navigate(avustushakuID)
        expect(await arviointi.väliselvitysStatus(acceptedHakemus.hakemusID)).toEqual("Hyväksytty")
      })
    }
  )
})
