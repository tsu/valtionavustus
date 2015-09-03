import React from 'react'
import _ from 'lodash'

import FormSaveStatus from '../form/component/FormSaveStatus.jsx'
import ToggleLanguageButton from '../form/component/ToggleLanguageButton.jsx'
import LocalizedString from '../form/component/LocalizedString.jsx'
import FormErrorSummary from '../form/component/FormErrorSummary.jsx'
import ServerError from '../form/component/ServerError.jsx'
import TextButton from '../form/component/TextButton.jsx'
import Translator from '../form/Translator.js'

import EnvironmentInfo from './EnvironmentInfo.jsx'

export default class VaFormTopbar extends React.Component {
  render() {
    const controller = this.props.controller
    const state = this.props.state
    const saveStatus = state.saveStatus
    const configuration = state.configuration
    const avustushaku = state.avustushaku
    const form = state.form
    const validationErrors = state.form.validationErrors
    const lang = configuration.lang
    const translations = configuration.translations
    const preview = configuration.preview
    const formIsValidOnClientSide = _.reduce(state.form.validationErrors, function (allValid, fieldErrors) {
      return allValid === true && fieldErrors.length === 0
    }, true)
    const formIsValidOnServerSide = state.saveStatus.savedObject && _.reduce(state.saveStatus.savedObject.validation_errors, function (allValid, fieldErrors) {
      return allValid === true && fieldErrors.length === 0
    }, true)
    const formOperations = state.extensionApi.formOperations
    const openPreview = function() {
      window.open(formOperations.urlCreator.existingSubmissionPreviewUrl(state), "preview")
    }
    const isSubmitted = function() {
      return saveStatus.savedObject && saveStatus.savedObject.status === "submitted"
    }
    const isSubmitDisabled = function() {
      return !(formIsValidOnClientSide && formIsValidOnServerSide && controller.isSaveDraftAllowed(state)) || controller.hasPendingChanges(state) || isSubmitted()
    }
    const submitTextKey = isSubmitted() ? "submitted" : "submit"
    const helpText = new Translator(translations.form).translate("savehelp", lang)

    return(
      <section id="topbar">
        <div id="top-container">
          <img id="logo" src="img/logo.png"/>
          <h1 id="topic"><LocalizedString translations={translations.form} translationKey="heading" lang={lang}/></h1>
          <div id="form-controls" hidden={preview}>
            <FormSaveStatus saveStatus={saveStatus} translations={translations} lang={lang}/>
            <a className="soresu-tooltip soresu-tooltip-down">
              <TextButton htmlId="submit" onClick={controller.submit} disabled={isSubmitDisabled()} translations={translations.form} translationKey={submitTextKey} lang={lang} />
              <span>{helpText}</span>
            </a>
            <span id="form-controls-devel" hidden={!configuration.develMode}>
              <ToggleLanguageButton id="toggle-language" controller={controller} languages={translations.languages} lang={lang}/>
              <TextButton htmlId="preview-button" onClick={openPreview} disabled={!controller.isSaveDraftAllowed(state)} translations={translations.form} translationKey="preview" lang={lang} />
            </span>
            <FormErrorSummary formContent={form.content} controller={controller} validationErrors={validationErrors} translations={translations.errors} lang={lang} />
          </div>
          <div id="server-info">
            <EnvironmentInfo avustushaku={avustushaku}/>
            <ServerError serverError={saveStatus.serverError} translations={translations.errors} lang={lang}/>
          </div>
        </div>
        <span hidden={true} id="entity-id">{formOperations.printEntityId(state)}</span>
        <span hidden={true} id="entity-version">{formOperations.responseParser.getSavedVersion(state.saveStatus.savedObject)}</span>
        <span hidden={true} id="pending-changes">{ controller.hasPendingChanges(state) ? "true" : "false"}</span>
      </section>
    )
  }
}