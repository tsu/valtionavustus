import React from 'react'

import ComponentFactory from 'va-common/web/form/ComponentFactory'

import BasicTextField from './BasicTextField.jsx'
import BasicTextArea from './BasicTextArea.jsx'
import EmailTextField from './EmailTextField.jsx'
import MoneyTextField from './MoneyTextField.jsx'
import FinnishBusinessIdTextField from './FinnishBusinessIdTextField.jsx'
import IbanTextField from './IbanTextField.jsx'
import BicTextField from './BicTextField.jsx'
import Dropdown from './Dropdown.jsx'
import TextButton from './TextButton.jsx'
import RadioButton from './RadioButton.jsx'
import AttachmentField from './AttachmentField.jsx'
import { TextFieldPropertyMapper,
         OptionFieldPropertyMapper,
         ButtonPropertyMapper,
         AttachmentFieldPropertyMapper} from 'va-common/web/form/component/PropertyMapper'

export default class FormComponent extends React.Component {
  constructor(props) {
    super(props)
    const fieldTypeMapping = {
      "textField": BasicTextField,
      "textArea": BasicTextArea,
      "emailField": EmailTextField,
      "moneyField": MoneyTextField,
      "finnishBusinessIdField": FinnishBusinessIdTextField,
      "iban": IbanTextField,
      "bic": BicTextField,
      "dropdown": Dropdown,
      "radioButton": RadioButton,
      "textButton": TextButton,
      "namedAttachment": AttachmentField
    }
    this.fieldPropertyMapping = {
      "textField": TextFieldPropertyMapper,
      "textArea": TextFieldPropertyMapper,
      "emailField": TextFieldPropertyMapper,
      "moneyField": TextFieldPropertyMapper,
      "finnishBusinessIdField": TextFieldPropertyMapper,
      "iban": TextFieldPropertyMapper,
      "bic": TextFieldPropertyMapper,
      "dropdown": OptionFieldPropertyMapper,
      "radioButton": OptionFieldPropertyMapper,
      "textButton": ButtonPropertyMapper,
      "namedAttachment": AttachmentFieldPropertyMapper
    }
    this.componentFactory = new ComponentFactory(fieldTypeMapping)
  }

  render() {
    const controller = this.props.controller
    const fieldType = this.props.fieldType

    if (fieldType in controller.getCustomComponentTypeMapping()) {
      return controller.createCustomComponent(this.props)
    } else {
      if (fieldType in this.fieldPropertyMapping) {
        return this.componentFactory.createComponent(this.fieldPropertyMapping[fieldType].map(this.props))
      }
      return this.componentFactory.createComponent(this.props)
    }
  }
}
