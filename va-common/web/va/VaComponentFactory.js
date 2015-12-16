import React from 'react'

import ComponentFactory from 'soresu-form/web/form/ComponentFactory.js'
import CheckboxButton from 'soresu-form/web/form/component/CheckboxButton.jsx'
import EmailTextField from 'soresu-form/web/form/component/EmailTextField.jsx'
import {TrimmingTextFieldPropertyMapper} from 'soresu-form/web/form/component/PropertyMapper'

import VaBudgetElement, {SummingBudgetElement, BudgetItemElement, BudgetSummaryElement} from './VaBudgetComponents.jsx'
import {VaFocusAreasPropertyMapper} from './VaPropertyMapper.js'
import VaProjectDescription from './VaProjectDescription.jsx'
import VaTraineeDayCalculator from './VaTraineeDayCalculator.jsx'

export default class VaComponentFactory extends ComponentFactory {
  constructor() {
    const fieldTypeMapping = {
      "vaBudget": VaBudgetElement,
      "vaSummingBudgetElement": SummingBudgetElement,
      "vaBudgetItemElement": BudgetItemElement,
      "vaBudgetSummaryElement": BudgetSummaryElement,
      "vaProjectDescription": VaProjectDescription,
      "vaFocusAreas": CheckboxButton,
      "vaEmailNotification": EmailTextField,
      "vaTraineeDayCalculator": VaTraineeDayCalculator
    }
    super({fieldTypeMapping: fieldTypeMapping,
           fieldPropertyMapperMapping: {
             "vaFocusAreas": VaFocusAreasPropertyMapper,
             "vaEmailNotification": TrimmingTextFieldPropertyMapper }})
  }

  getCustomComponentProperties(state) {
    return { "avustushaku": state.avustushaku }
  }
}
