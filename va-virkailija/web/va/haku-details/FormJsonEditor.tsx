import React, { Component } from 'react'
import _ from 'lodash'

import { FormikHook } from 'va-common/web/va/standardized-form-fields/types'

interface FormJsonEditorProps {
  controller: any
  avustushaku: any
  formDraft: any
  f: FormikHook
}

export default class FormJsonEditor extends Component<FormJsonEditorProps> {
  render() {
    const f = this.props.f
    const controller = this.props.controller
    const avustushaku = this.props.avustushaku
    const formDraft = this.props.formDraft
    const userHasEditPrivilege = avustushaku.privileges && avustushaku.privileges["edit-haku"]
    const onChange = e => {
      controller.formOnChangeListener(avustushaku, e.target.value)
    }
    const onClick = async () => {
      await f.handleSubmit()
      controller.saveForm(avustushaku, formDraft)
    }
    const scrollToTop = () => {
      window.scrollTo(0, 0)
    }

    let parsedForm = formDraft
    let parseError = false
    try {
      parsedForm = JSON.parse(formDraft)
    } catch (error) {
      parseError = error.toString()
    }
    const submitDisabled = f.isSubmitting || f.isValidating || !(f.isValid && f.dirty)
    const disableSave = (!allowSave() || !formHasBeenEdited()) && submitDisabled

    return formDraft ?
      <div className="form-json-editor">
        <h3>Hakulomakkeen sisältö</h3>
        <div className="btn-fixed-container">
          <button className="btn-fixed" type="button" onClick={scrollToTop}>Takaisin ylös</button>
          <button id="saveForm" className="btn-fixed" type="button" disabled={disableSave} onClick={onClick}>Tallenna</button>
        </div>
        <span className="error">{parseError}</span>
        <textarea onChange={onChange} disabled={!userHasEditPrivilege || avustushaku.status === "published"} value={formDraft}/>
      </div>
      : <span/>

    function allowSave() {
      return userHasEditPrivilege && parseError === false && avustushaku.status === "draft"
    }

    function formHasBeenEdited() {
      return (formDraft && avustushaku.formContent) && !_.isEqual(parsedForm, avustushaku.formContent)
    }
  }
}
