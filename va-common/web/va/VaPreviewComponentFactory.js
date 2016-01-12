import React from 'react'
import _ from 'lodash'
import ClassNames from 'classnames'

import InputValueStorage from 'soresu-form/web/form/InputValueStorage'
import Translator from 'soresu-form/web/form/Translator'
import ComponentFactory from 'soresu-form/web/form/ComponentFactory.js'
import LocalizedString from 'soresu-form/web/form/component/LocalizedString.jsx'
import BasicFieldComponent from 'soresu-form/web/form/component/BasicFieldComponent.jsx'
import BasicValue from 'soresu-form/web/form/preview/BasicValue.jsx'
import MultipleOptionValue from 'soresu-form/web/form/preview/MultipleOptionValue.jsx'
import {FieldOnChangePropertyMapper} from 'soresu-form/web/form/component/PropertyMapper'

import VaBudgetElement, {SummingBudgetElement, BudgetItemElement, BudgetSummaryElement} from './VaBudgetComponents.jsx'
import {VaFocusAreasPropertyMapper} from 'va-common/web/va/VaPropertyMapper'
import VaTraineeDayCalculator from './VaTraineeDayCalculator.jsx'

export default class VaPreviewComponentFactory extends ComponentFactory {
  constructor() {
    const fieldTypeMapping = {
      "vaBudget": VaPreviewBudgetElement,
      "vaSummingBudgetElement": SummingBudgetElement,
      "vaBudgetItemElement": VaPreviewBudgetItemElement,
      "vaBudgetSummaryElement": BudgetSummaryElement,
      "vaProjectDescription": VaProjectDescriptionPreview,
      "vaFocusAreas": MultipleOptionValue,
      "vaEmailNotification": BasicValue,
      "vaTraineeDayCalculator": VaPreviewTraineeDayCalculator
    }
    super({ fieldTypeMapping,
            fieldPropertyMapperMapping: {
              "vaFocusAreas": VaFocusAreasPropertyMapper,
              "vaTraineeDayCalculator": FieldOnChangePropertyMapper}})
  }
}

class VaPreviewBudgetItemElement extends React.Component {
  render() {
    const field = this.props.field
    const children = this.props.children
    const htmlId = this.props.htmlId
    const descriptionComponent = children[0]
    const amountComponent = children[1]
    return (
      <tr id={htmlId} className="budget-item">
        <td className="label-column">
          <LocalizedString translations={field} translationKey="label" lang={this.props.lang} />
        </td>
        <td>{descriptionComponent}</td>
        <td className="amount-column">{amountComponent}</td>
      </tr>
    )
  }
}


class VaPreviewBudgetElement extends VaBudgetElement {
  html(htmlId, children) {
    return (<div className="va-budget" id={htmlId}>
             {children}
            </div>)
  }}

class VaProjectDescriptionPreview extends React.Component {
  render() {
    const children = this.props.children
    const htmlId = this.props.htmlId
    const classNames = ClassNames("va-big-fieldset", {hidden: this.isHidden()})
    return (
      <li className={classNames} id={htmlId}>
        <div className="fieldset-elements">
          {children}
        </div>
      </li>
    )
  }

  isHidden() {
    return this.props.renderingParameters && this.props.renderingParameters.valueIsEmpty === true;
  }
}

class VaPreviewTraineeDayCalculator extends BasicFieldComponent {

  constructor(props) {
    super(props)
    this.translator = new Translator(props.translations.form["trainee-day-calculator"])
  }

  render() {
    const props = this.props
    const htmlId = props.htmlId
    const valueHolder = {value: this.props.value ? this.props.value : [
      {key:"scope-type", value: "kp", fieldType: "radioButton"},
      {key:"scope", value: "0", fieldType: "textField"},
      {key:"person-count", value: "0", fieldType: "textField"},
      {key:"total", value: "0", fieldType: "textField"}]}
    return (
        <div id={htmlId} className="va-trainee-day-calculator">
          <table>
            <thead><tr>
              <th>{this.translator.translate("scope-type", this.props.lang)}</th>
              <th>{this.translator.translate("scope", this.props.lang)}</th>
              <th>{this.translator.translate("person-count", this.props.lang)}</th>
            </tr></thead>
            <tbody><tr>
              <td>{this.translator.translate(InputValueStorage.readValue({}, valueHolder, "scope-type"), "fi")}</td>
              <td>{InputValueStorage.readValue({}, valueHolder, "scope")}</td>
              <td>{InputValueStorage.readValue({}, valueHolder, "person-count")}</td>
            </tr></tbody>
            <tfoot>
            <tr><td colSpan="3">{this.label("total")}: {InputValueStorage.readValue({}, valueHolder, "total")}</td></tr>
            </tfoot>
          </table>
        </div>
    )
  }
}
