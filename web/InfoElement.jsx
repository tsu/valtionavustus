import React from 'react'
import LocalizedString from './LocalizedString.jsx'

class H1InfoElement extends React.Component {
  render() {
    const values = this.props.values
    const key = this.props.field.id
    const field = this.props.field
    const lang = this.props.lang
    return <h1><LocalizedString translations={values} translationKey={key} lang={lang}/></h1>
  }
}

class AccordionInfoElement extends React.Component {
  render() {
    const values = this.props.values
    const key = this.props.field.id
    const field = this.props.field
    const lang = this.props.lang
    const items = []
    var infoObject = values[key];
      for (var i=0; i < infoObject.items.length; i++) {
      const textContent = infoObject.items[i][this.props.lang]
      items.push((<li key={key + "." + i}>{textContent}</li>))
    }
    return (<div><LocalizedString className="accordion-title open" translations={infoObject} translationKey="label" lang={lang}/><ul id={field.id}>
              {items}
            </ul></div>)
  }
}

class DateRangeInfoElement extends React.Component {
  render() {
    const values = this.props.values
    const lang = this.props.lang
    const key = this.props.field.id
    const field = this.props.field
    const value = values[key]
    const start = new Date(value.start)
    const startDate = start.toLocaleDateString("fi-FI")
    const startTime = start.toLocaleTimeString("fi-FI")
    const end = new Date(value.end)
    const endDate = end.toLocaleDateString("fi-FI")
    const endTime = end.toLocaleTimeString("fi-FI")

    return (
      <div>
      <label><LocalizedString translations={value} translationKey="label" lang={lang}/></label>
      <span>{startDate} {startTime} - {endDate} {endTime}</span>
      </div>
    )
  }
}

class EndOfDateRangeInfoElement extends React.Component {
  render() {
    const values = this.props.values
    const lang = this.props.lang
    const key = this.props.field.id
    const value = values[key]
    const end = new Date(value.end)
    const endDate = end.toLocaleDateString("fi-FI")
    var options = {hour: "numeric", minute: "numeric"}
    const endTime = end.toLocaleTimeString("fi-FI", options)
    return (
      <div>
        <span><LocalizedString translations={value} translationKey="label" lang={lang}/> </span>
        <span>{endDate} <LocalizedString translations={this.props.translations.misc} translationKey="time" lang={lang}/> {endTime}</span>
      </div>
    )
  }
}

export default class InfoElement extends React.Component {

  constructor(props) {
    super(props)
    this.fieldTypeMapping = {
      "h1": H1InfoElement,
      "bulletList": AccordionInfoElement,
      "dateRange": DateRangeInfoElement,
      "endOfDateRange": EndOfDateRangeInfoElement
    }
  }

  render() {
    const field = this.props.field;
    const displayAs = field.displayAs
    const values = this.props.values
    const lang = this.props.lang

    var element = <span>Unsupported field type {displayAs}</span>

    if (displayAs in this.fieldTypeMapping) {
      element = React.createElement(this.fieldTypeMapping[displayAs], this.props)
    }
    return element
  }
}
