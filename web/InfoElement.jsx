import React from 'react'
import LocalizedString from './LocalizedString.jsx'
import Translator from './Translator.js'

class BasicInfoComponent extends React.Component {
  asDateString(date) {
    return date.toLocaleDateString("fi-FI")
  }

  asTimeString(date) {
    var options = {hour: "numeric", minute: "numeric"}
    return date.toLocaleTimeString("fi-FI", options)
  }

  asDateTimeString(date) {
    const timeLimiter = new Translator(this.props.translations["misc"]).translate("time", this.props.lang, "KLO")
    return this.asDateString(date) + " " + timeLimiter + " " + this.asTimeString(date)
  }

  labelSourceObject() {
    const values = this.props.values
    const key = this.props.field.id
    const value = values[key]

    if (this.props.field.label != undefined) {
      return this.props.field
    } else {
      return value
    }
  }
}

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
  constructor(props) {
    super(props)
    this.handleClick = this.handleClick.bind(this)
    this.determineCssClass = this.determineCssClass.bind(this)
    const initiallyOpen = this.props.field.params.initiallyOpen
    const accordionStateClassName = this.determineCssClass(initiallyOpen)
    this.state = { open: initiallyOpen, accordionStateClassName: accordionStateClassName }
  }

  handleClick() {
    var newIsOpen = !this.state.open;
    this.setState({
      open: newIsOpen,
      accordionStateClassName: this.determineCssClass(newIsOpen)
    })
  }

  determineCssClass(isOpen) {
    return isOpen ? "open" : "closed"
  }

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
    return (
        <section onClick={this.handleClick}>
          <div className={"accordion "  + this.state.accordionStateClassName}>
            <LocalizedString onClick={this.handleClick} className={"accordion-title " + this.state.accordionStateClassName} translations={infoObject} translationKey="label" lang={lang}/>
            <ul id={field.id}>
                {items}
            </ul>
          </div>
        </section>)
  }
}

class DateRangeInfoElement extends BasicInfoComponent {
  render() {
    const values = this.props.values
    const lang = this.props.lang
    const key = this.props.field.id
    const field = this.props.field
    const value = values[key]
    const start = new Date(value.start)
    const startDateTime = this.asDateTimeString(start)
    const end = new Date(value.end)
    const endDateTime = this.asDateTimeString(end)

    return (
      <div>
      <label><LocalizedString translations={value} translationKey="label" lang={lang}/></label>
      <span>{startDateTime} - {endDateTime}</span>
      </div>
    )
  }
}

class EndOfDateRangeInfoElement extends BasicInfoComponent {
  render() {
    const values = this.props.values
    const lang = this.props.lang
    const key = this.props.field.id
    const value = values[key]
    const end = new Date(value.end)
    const endDateTime = this.asDateTimeString(end)
    const labelSource = this.labelSourceObject()
    return (
      <div>
        <span><LocalizedString translations={labelSource} translationKey="label" lang={lang}/> </span>
        <span>{endDateTime}</span>
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
