import React from 'react'
import _ from 'lodash'

import FormUtil from 'soresu-form/web/form/FormUtil'
import FormContainer from 'soresu-form/web/form/FormContainer.jsx'
import Form from 'soresu-form/web/form/Form.jsx'
import FormStateLoop from 'soresu-form/web/form/FormStateLoop'
import InputValueStorage from 'soresu-form/web/form/InputValueStorage'
import SyntaxValidator from 'soresu-form/web/form/SyntaxValidator'

import FakeFormState from '../form/FakeFormState'
import BudgetBusinessRules from '../budgetedit/BudgetBusinessRules'
import SeurantaBudgetEditFormController from './SeurantaBudgetEditFormController'
import SeurantaBudgetEditComponentFactory from './SeurantaBudgetEditComponentFactory.jsx'

import style from '../style/budgetedit.less'

export default class SeurantaBudgetEditing extends React.Component {
  static validateFields(form, answers) {
    const budgetItems = FormUtil.findFieldsByFieldType(form.content, 'vaBudgetItemElement')
    budgetItems.map(budgetItem => {
      const amountField = budgetItem.children[1]
      const overriddenValue = InputValueStorage.readValue(form.content, answers, amountField.id)
      const validationErrors = SyntaxValidator.validateSyntax(amountField, overriddenValue)
      form.validationErrors = form.validationErrors.merge({[amountField.id]: validationErrors})
    })
  }

  render() {
    const {controller, hakemus, hakuData, avustushaku, translations} = this.props

    const vaBudget = FormUtil.findFieldByFieldType(hakuData.form.content, "vaBudget")

    if (!vaBudget) {
      return null
    }

    const budgetSpec = FormUtil.mergeDeepFieldTrees(
      vaBudget,
      FormUtil.findFieldByFieldType(_.get(hakemus, "selvitys.valiselvitysForm.content", []), "vaBudget") || {},
      FormUtil.findFieldByFieldType(_.get(hakemus, "selvitys.loppuselvitysForm.content", []), "vaBudget") || {})
    const fakeHakemus = {answers: hakemus.arvio["seuranta-answers"]}
    const formOperations = {
      chooseInitialLanguage: () => "fi",
      containsExistingEntityId: undefined,
      isFieldEnabled: (saved, fieldId) => true,
      onFieldUpdate: undefined,
      isSaveDraftAllowed: () => true,
      isNotFirstEdit: () => true,
      createUiStateIdentifier: undefined,
      urlCreator: undefined,
      responseParser: undefined,
      printEntityId: undefined
    }
    const budgetEditFormState = FakeFormState.createHakemusFormState({
      translations,
      avustushaku,
      formContent: [budgetSpec],
      formOperations,
      hakemus: fakeHakemus,
      savedHakemus: hakemus
    })
    SeurantaBudgetEditing.validateFields(budgetEditFormState.form, fakeHakemus.answers)
    const formElementProps = {
      state: budgetEditFormState,
      formContainerClass: Form,
      infoElementValues: avustushaku,
      controller: new SeurantaBudgetEditFormController(controller, new SeurantaBudgetEditComponentFactory(), avustushaku, budgetEditFormState.form, hakemus),
      containerId: "budget-edit-container",
      headerElements: []
    }
    return (
      <div className="budget-edit">
        <h2>Budjetti</h2>
        <FormContainer {...formElementProps} />
      </div>
    )
  }
}

