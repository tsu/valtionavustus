import React from 'react'

import ClassNames from 'classnames'

import HakuEdit from './HakuEdit.jsx'
import { FormEditorContainer } from './FormEditorContainer'
import DecisionEditor from './DecisionEditor.jsx'
import SelvitysFormEditor from './SelvitysFormEditor'
import HelpTooltip from '../HelpTooltip.jsx'

import { StandardizedFormValues } from 'va-common/web/va/standardized-form-fields/types'

function createRedirectTo(url) {
  return (e) => {
    e.preventDefault()
    window.location.href = url
  }
}

interface EditorSelectorProps {
  subTab: any
  controller: any
  avustushaku: any
  decisionLiitteet: any
  formDraft: any
  vaUserSearch: any
  koodistos: any
  userInfo: any
  environment: any
  translations: any
  valiselvitysFormDraft: any
  loppuselvitysFormDraft: any
  codeOptions: any
  helpTexts: any
  standardizedFormValues: StandardizedFormValues
}

export const EditorSelector = ({
      subTab,
      controller,
      avustushaku,
      decisionLiitteet,
      formDraft,
      vaUserSearch,
      koodistos,
      userInfo,
      environment,
      translations,
      valiselvitysFormDraft,
      loppuselvitysFormDraft,
      codeOptions,
      helpTexts,
      standardizedFormValues
    }: EditorSelectorProps) => {


    let subTabContent
    switch (subTab) {
      case "haku-editor":
        subTabContent = <HakuEdit avustushaku={avustushaku}
                                  vaUserSearch={vaUserSearch}
                                  userInfo={userInfo}
                                  controller={controller}
                                  codeOptions={codeOptions}
                                  helpTexts={helpTexts} />
        break
      case "form-editor":
        subTabContent = <FormEditorContainer avustushaku={avustushaku}
                                             environment={environment}
                                             translations={translations}
                                             koodistos={koodistos}
                                             formDraft={formDraft}
                                             controller={controller}
                                             helpTexts={helpTexts} 
                                             standardizedFormValues={standardizedFormValues}
                                             standardizedFormFieldsEnabled={true}
                                             />
        break
      case "decision":
        subTabContent = <DecisionEditor avustushaku={avustushaku}
                                        decisionLiitteet={decisionLiitteet}
                                        environment={environment}
                                        controller={controller}
                                        translations={translations}
                                        helpTexts={helpTexts} />
        break
      case "valiselvitys":
        subTabContent = <SelvitysFormEditor selvitysType="valiselvitys"
                                        environment={environment}
                                        avustushaku={avustushaku}
                                        controller={controller}
                                        koodistos={koodistos}
                                        valiselvitysFormDraft={valiselvitysFormDraft}
                                        loppuselvitysFormDraft={loppuselvitysFormDraft}
                                        translations={translations}
                                        helpTexts={helpTexts}
                                        standardizedFormValues={standardizedFormValues}

        />
        break
      case "loppuselvitys":
        subTabContent = <SelvitysFormEditor selvitysType="loppuselvitys"
                                            environment={environment}
                                            avustushaku={avustushaku}
                                            controller={controller}
                                            koodistos={koodistos}
                                            valiselvitysFormDraft={valiselvitysFormDraft}
                                            loppuselvitysFormDraft={loppuselvitysFormDraft}
                                            translations={translations}
                                            helpTexts={helpTexts}
                                            standardizedFormValues={standardizedFormValues}
        />
        break
      default:
        throw new Error("Bad subTab selection '" + subTab + "'")
    }

    function createSubTabSelector(subTabToSelect) {
      return e => {
        e.preventDefault()
        controller.selectEditorSubtab(subTabToSelect)
      }
    }

    return (
      <section id="editor-section">
        <div id="editor-subtab-selector" className="section-container">
          <span onClick={createSubTabSelector("haku-editor")}
                className={ClassNames({"selected": subTab === "haku-editor"})}>
            Haun tiedot <HelpTooltip content={helpTexts["hakujen_hallinta__haun_tiedot___valilehden_infopallo"]} direction="left" />
          </span>
          <span onClick={createSubTabSelector("form-editor")}
                className={ClassNames({"selected": subTab === "form-editor"})}>
            Hakulomake <HelpTooltip content={helpTexts["hakujen_hallinta__hakulomake___valilehden_infopallo"]} />
          </span>
          <span onClick={createSubTabSelector("decision")}
                className={ClassNames({"selected": subTab === "decision"})}
                data-test-id="päätös-välilehti">
            Päätös <HelpTooltip content={helpTexts["hakujen_hallinta__päätös___välilehden_infopallo_välilehtiriville"]} />
          </span>
          <span onClick={createSubTabSelector("valiselvitys")}
                className={ClassNames({"selected": subTab === "valiselvitys"})}
                data-test-id="väliselvitys-välilehti">
            Väliselvitys <HelpTooltip content={helpTexts["hakujen_hallinta__väliselvitys___välilehden_infopallo_välilehtiriville"]} />
          </span>
          <span onClick={createSubTabSelector("loppuselvitys")}
                className={ClassNames(
                  {"selected": subTab === "loppuselvitys"})}
                data-test-id="loppuselvitys-välilehti">
            Loppuselvitys <HelpTooltip content={helpTexts["hakujen_hallinta__loppuselvitys___välilehden_infopallo_välilehtiriville"]} />
          </span>
          <span
            onClick={createRedirectTo(
              "/admin-ui/payments/?grant-id=" + avustushaku.id)}
            className={avustushaku.status !== "published" &&
                         avustushaku.status !== "resolved" ? "disabled" : ""}>
            Maksatukset
            <HelpTooltip content={helpTexts["hakujen_hallinta__maksatus___välilehden_infopallo_välilehtiriville"]} direction="right" />
          </span>
        </div>
        <div className="section-container">{subTabContent}</div>
      </section>
    )
}
