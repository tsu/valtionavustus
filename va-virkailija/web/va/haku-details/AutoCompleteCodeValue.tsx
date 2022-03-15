import React, {Component, CSSProperties} from 'react'
import Select from 'react-select'
import HakujenHallintaController, {Avustushaku} from '../HakujenHallintaController'
import {VaCodeValue} from '../types'

type CodeType = 'operational-unit-id' | 'project-id' | 'operation-id'

interface AutoCompleteCodeValueProps {
  id: CodeType
  codeType: CodeType
  controller: HakujenHallintaController
  avustushaku: Avustushaku
  codeOptions: VaCodeValue[]
  selectedValue: VaCodeValue | ''
}

export default class AutocompleteCodeValue extends Component<AutoCompleteCodeValueProps> {
  constructor(props: AutoCompleteCodeValueProps) {
    super(props)
    this.updateValue = this.updateValue.bind(this)
  }

  updateValue (option: VaCodeValue | null) {
    if (option == null) {
      this.props.controller.onChangeListener(this.props.avustushaku, {id: this.props.id}, null)
      this.props.avustushaku[this.props.codeType] = null
    } else {
      this.props.controller.onChangeListener(this.props.avustushaku, {id: this.props.id}, option.id)
      this.props.avustushaku[this.props.codeType] = option.id
    }
  }

  getOptionValue(option: VaCodeValue) {
    return `${option.code} ${option["code-value"]}`
  }

  render() {
    return (
      <Select
        getOptionLabel={() => 'code'}
        placeholder="Valitse listasta"
        options={this.props.codeOptions}
        onChange={this.updateValue}
        getOptionValue={this.getOptionValue}
        value={this.props.selectedValue as VaCodeValue}
        backspaceRemovesValue={true}
        components={{ Option, SingleValue, NoOptionsMessage }}
      />
    )
  }
}

interface OptionProps extends SingleValueProps {
  selectOption: (data: VaCodeValue) => void
  style?: CSSProperties
}

function Option({data, selectOption, style}: OptionProps) {
  const onChange = () => selectOption(data)

  return (
    <div
      className="Select-input name-option-renderer code-value-renderer"
      style={style}
      onClick={onChange}
      data-test-id={data.code}>
      <span>{data.code}</span>
      <span>{data["code-value"]}</span>
    </div>
  )
}

interface SingleValueProps {
  data: VaCodeValue
}

function SingleValue({ data }: SingleValueProps) {
  return (
    <div className="code-value-renderer">
      <span>{data.code}</span>
      <span>{data["code-value"]}</span>
    </div>
  )
}

function NoOptionsMessage(_props: any) {
  return (
    <span data-test-id="code-value-dropdown__no-options">
      Ei hakutuloksia
    </span>
  )
}
