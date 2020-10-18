import React, {useEffect, useState} from 'react'
import {
  AvustuksenKayttoaikaInput,
  UserInputs
} from './AvustuksenKayttoaikaInput'
import './jatkoaika.less'
import {useTranslations} from '../../TranslationContext'

type AvustuksenKayttoajanPidennysProps = {
  nykyinenPaattymisaika: Date
  onChange: (inputs: AvustuksenKayttoajanPidennysInput) => void
}

export type AvustuksenKayttoajanPidennysInput = UserInputs & {
  haenKayttoajanPidennysta: boolean
}

export const AvustuksenKayttoajanPidennys = (props: AvustuksenKayttoajanPidennysProps) => {
  const { t } = useTranslations()

  const [ haenKayttoajanPidennysta, setHaenKayttoajanPidennysta ] = useState(false)
  const [ userInputs, setUserInputs ] = useState<UserInputs>()

  useEffect(() => {
    props.onChange({
      haenKayttoajanPidennysta: haenKayttoajanPidennysta,
      ...userInputs
    })
  }, [haenKayttoajanPidennysta, userInputs])


  function toggleHaenKayttoajanPidennysta() {
    setHaenKayttoajanPidennysta(!haenKayttoajanPidennysta)
  }

  function onKayttoaikaInputChange(inputs: UserInputs) {
    setUserInputs(inputs)
  }

  // FIXME: Hukkaa kentät kun suljetaan ja avataan taas

  return (
    <section className="section" id="section-muutosten-hakeminen-checkbox">
      <h2>{t.applicationEdit.title}</h2>
      <div className="content muutoksenhaku">
        <form>

          <div className="checkbox-jatkoaika-container">
            <input type="checkbox" value="Submit" id="checkbox-jatkoaika" onClick={toggleHaenKayttoajanPidennysta} />
            <label htmlFor="checkbox-jatkoaika">
              {t.kayttoajanPidennys.checkboxTitle}
            </label>
          </div>

          <AvustuksenKayttoaikaInput
            open={haenKayttoajanPidennysta}
            onChange={onKayttoaikaInputChange}
            nykyinenPaattymisaika={props.nykyinenPaattymisaika} />

        </form>
      </div>
    </section>
  )
}
