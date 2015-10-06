import React from 'react'

import ComponentFactory from 'soresu-form/web/form/ComponentFactory.js'
import {VaBudgetElement, SummingBudgetElement, BudgetItemElement, BudgetSummaryElement} from 'va-common/web/va/VaBudgetComponents.jsx'
import VaProjectDescription from './VaProjectDescription.jsx'

export default class VaComponentFactory extends ComponentFactory {
  constructor() {
    const fieldTypeMapping = {
      "vaBudget": VaBudgetElement,
      "vaSummingBudgetElement": SummingBudgetElement,
      "vaBudgetItemElement": BudgetItemElement,
      "vaBudgetSummaryElement": BudgetSummaryElement,
      "vaProjectDescription": VaProjectDescription
    }
    super(fieldTypeMapping)
  }

  getCustomComponentProperties(state) {
    return { "avustushaku": state.avustushaku }
  }
}
