import _ from 'lodash'
import React, { Component } from 'react'

import HakemusArviointiStatuses from '../hakemus-details/HakemusArviointiStatuses.js'
import ScoreResolver from '../ScoreResolver.js'

export default class HakemusListing extends Component {

  static _fieldGetter(fieldName, userInfo) {
    switch(fieldName) {
      case "name":
        return hakemus => hakemus["project-name"] + " (" + hakemus["register-number"] + ")"
      case "organization":
        return hakemus => hakemus["organization-name"]
      case "status":
        return hakemus => hakemus.arvio.status
      case "applied-sum":
        return hakemus => hakemus["budget-oph-share"]
      case "granted-sum":
        return hakemus => hakemus.arvio["budget-granted"]
      case "score":
        return hakemus => {
          const score = ScoreResolver.effectiveAverage(hakemus.arvio.scoring, userInfo)
          return score ? score : 0
        }
    }
    throw Error("No field getter for " + fieldName)
  }

  static _filterWithArrayPredicate(fieldGetter, filter) {
    return function(hakemus) {
      return _.contains(filter, fieldGetter(hakemus))
    }
  }

  static _filterWithStrPredicate(fieldGetter, filter) {
    if(_.isEmpty(filter)) {
      return function() {return true}
    }
    return function(hakemus) {
      if(_.isEmpty(fieldGetter(hakemus))) {
        return false
      }
      return fieldGetter(hakemus).toUpperCase().indexOf(filter.toUpperCase()) >= 0
    }
  }

  static _filter(list, filter) {
    return _.filter(list, HakemusListing._filterWithStrPredicate(HakemusListing._fieldGetter("name"), filter.name))
            .filter(HakemusListing._filterWithStrPredicate(HakemusListing._fieldGetter("organization"), filter.organization))
            .filter(HakemusListing._filterWithArrayPredicate(HakemusListing._fieldGetter("status"), filter.status))

  }

  static _sortByArray(fieldGetter, array, order, userInfo) {
    return function(hakemus) {
      const sortValue = array.indexOf(fieldGetter(hakemus, userInfo))
      return order === 'asc' ? sortValue: -sortValue
    }
  }

  static _sortBy(userInfo) {
    return function(list, sorter) {
      switch (sorter.field) {
        case "status":
          return _.sortBy(list, HakemusListing._sortByArray(hakemus => hakemus.arvio.status, HakemusArviointiStatuses.allStatuses(), sorter.order, userInfo))
      }
      return _.sortByOrder(list, HakemusListing._fieldGetter(sorter.field, userInfo), sorter.order)
    }
  }

  static _sort(list, sorterList, userInfo) {
    return _.reduce(sorterList, HakemusListing._sortBy(userInfo), list)

  }

  render() {
    const controller = this.props.controller
    const userInfo = this.props.userInfo
    const allowHakemusScoring = this.props.privileges["score-hakemus"]
    const hasSelected = this.props.hasSelected
    const selectedHakemus = this.props.selectedHakemus
    const filter = this.props.hakemusFilter
    const sorter = this.props.hakemusSorter
    const hakemusList = this.props.hakemusList
    const filteredHakemusList = HakemusListing._sort(HakemusListing._filter(hakemusList, filter), sorter, userInfo)
    const ophShareSum = HakemusListing.formatNumber(_.reduce(filteredHakemusList, (total, hakemus) => { return total + hakemus["budget-oph-share"] }, 0))
    const hakemusElements = _.map(filteredHakemusList, hakemus => {
      return <HakemusRow key={hakemus.id} hakemus={hakemus} selectedHakemus={selectedHakemus} userInfo={userInfo} allowHakemusScoring={allowHakemusScoring} controller={controller}/> })
    const budgetGrantedSum = HakemusListing.formatNumber(_.reduce(filteredHakemusList, (total, hakemus) => { return total + hakemus.arvio["budget-granted"] }, 0))

    const onFilterChange = function(filterId) {
      return function(e) {
        controller.setFilter(filterId, e.target.value)
      }
    }

    return (
      <table key="hakemusListing" className="hakemus-list overview-list">
        <thead><tr>
          <th className="organization-column">
            <input className="text-filter" placeholder="Hakijaorganisaatio" onChange={onFilterChange("organization")} value={filter.organization}></input>
            <HakemusSorter field="organization" sorter={sorter} controller={controller}/>
          </th>
          <th className="project-name-column">
            <input className="text-filter" placeholder="Hanke tai diaarinumero" onChange={onFilterChange("name")} value={filter.name}></input>
            <HakemusSorter field="name" sorter={sorter} controller={controller}/>
          </th>
          <th className="score-column">Arvio <HakemusSorter field="score" sorter={sorter} controller={controller}/></th>
          <th className="status-column">
            <StatusFilter controller={controller} hakemusList={hakemusList} filter={filter}/>
            <HakemusSorter field="status" sorter={sorter} controller={controller}/>
          </th>
          <th className="applied-sum-column">Haettu <HakemusSorter field="applied-sum" sorter={sorter} controller={controller}/></th>
          <th className="granted-sum-column">Myönnetty <HakemusSorter field="granted-sum" sorter={sorter} controller={controller}/></th>
        </tr></thead>
        <tbody className={hasSelected ? "has-selected" : ""}>
          {hakemusElements}
        </tbody>
        <tfoot><tr>
          <td className="total-applications-column">
            <ApplicationSummaryLink filteredHakemusList={filteredHakemusList} hakemusList={hakemusList} controller={controller} />
          </td>
          <td className="applied-sum-column"><span className="money sum">{ophShareSum}</span></td>
          <td className="granted-sum-column"><span className="money sum">{budgetGrantedSum}</span></td>
        </tr></tfoot>
      </table>
    )
  }

  static formatNumber (num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ")
  }
}

class ApplicationSummaryLink extends Component {
  render() {
    const filteredHakemusList = this.props.filteredHakemusList
    const hakemusList = this.props.hakemusList
    const controller = this.props.controller
    const disabled = _.isEmpty(filteredHakemusList)
    const linkText = filteredHakemusList.length + "/" + hakemusList.length + " hakemusta"
    return disabled ? <span>{linkText}</span> : <a className="summary-link" href="/yhteenveto/" target="_blank" onClick={onClick}>{linkText}</a>

    function onClick(e) {
      controller.gotoSavedSearch(filteredHakemusList)
    }
  }
}

class HakemusSorter extends Component {

  constructor(props) {
    super(props)
    this.isSortedByField = this.isSortedByField.bind(this)
    this.onSorterClick = this.onSorterClick.bind(this)
    this.render = this.render.bind(this)
  }

  isSortedByField() {
    return !_.isEmpty(_.find(this.props.sorter, sorter => sorter.field === this.props.field))
  }

  onSorterClick() {
    const field = this.props.field
    const sorter = _.find(this.props.sorter, sorter => sorter.field === field)
    var currentOrder = _.get(sorter, "order", "");
    const controller = this.props.controller

    if (this.props.sorter.length > 1) {
      currentOrder = "desc"
    } else if (currentOrder == "desc") {
      currentOrder = "asc"
    } else {
      currentOrder = "desc"
    }
    controller.setSorter([{field: field, order: currentOrder}])
  }

  render() {
    const field = this.props.field
    const sorter = _.find(this.props.sorter, sorter => sorter.field === field)
    const sort = _.get(sorter, "order", "");
    var sortedClass = "sort sort-none"
    if (this.isSortedByField()) {
      if (sort == "") {
        sortedClass = "sort sort-desc"
      } else {
        sortedClass = sort == "asc" ? "sort sort-asc" : "sort sort-desc"
      }
    }

    return (
      <div className="sorter">
        <a onClick={this.onSorterClick} className={sortedClass}/>
      </div>
    )
  }
}

class StatusFilter extends Component {
  constructor(props) {
    super(props)
    this.handleClick = this.handleClick.bind(this)
    this.render = this.render.bind(this)
    this.state = { open: false }
  }

  handleClick() {
    this.setState({
      open: !this.state.open
    })
  }

  render() {
    const controller = this.props.controller
    const statusFilter = this.props.filter.status
    const statuses = []
    const hakemusList = this.props.hakemusList
    const onCheckboxChange = function(status) {
      return function(e) {
        if(_.contains(statusFilter, status)) {
          controller.setFilter("status",  _.without(statusFilter, status))
        }
        else {
          controller.setFilter("status", _.union(statusFilter, [status]))
        }
      }
    }

    const statusValues = HakemusArviointiStatuses.allStatuses()
    const self = this
    const onDelete = function(e) {
      self.setState({
        open: false
      })
      controller.setFilter("status", statusValues)
    }
    const hasFilters = statusFilter.length !== statusValues.length

    for (var i=0; i < statusValues.length; i++) {
      const status = statusValues[i]
      const checked = _.contains(statusFilter, status)
      const htmlId = "filter-by-status-" + status
      const kpl = _.filter(hakemusList, HakemusListing._filterWithArrayPredicate(hakemus => hakemus.arvio.status, [status])).length
      statuses.push(
        <div key={status}>
          <input id={htmlId} type="checkbox" checked={checked} onChange={onCheckboxChange(status)} value={statusValues[status]}/>
          <label htmlFor={htmlId}>{HakemusArviointiStatuses.statusToFI(status)} ({kpl})</label>
        </div>
      )
    }
    return (
      <div className="status-filter">
        <a onClick={this.handleClick}>Tila</a>
        <button hidden={!hasFilters} onClick={onDelete} className="filter-remove" alt="Poista tila rajaukset" title="Poista tila rajaukset" tabIndex="-1" />
        <div className="status-filter-popup popup-box-shadow" hidden={!this.state.open}>
          {statuses}
        </div>
      </div>
    )
  }
}

class HakemusRow extends Component {
  render() {
    const hakemus = this.props.hakemus
    const userInfo = this.props.userInfo
    const allowHakemusScoring = this.props.allowHakemusScoring
    const htmlId = "hakemus-" + hakemus.id
    const thisIsSelected = hakemus === this.props.selectedHakemus
    const rowClass = thisIsSelected ? "selected overview-row" : "unselected overview-row"
    const controller = this.props.controller
    const statusFI = HakemusArviointiStatuses.statusToFI(hakemus.arvio.status)
    var hakemusName = ""
    if (_.isEmpty(hakemus["project-name"])) {
      hakemusName = hakemus["register-number"]
    } else {
      hakemusName = hakemus["project-name"] + " (" + hakemus["register-number"] + ")"
    }
    return <tr id={htmlId} className={rowClass} onClick={controller.selectHakemus(hakemus)}>
      <td className="organization-column" title={hakemus["organization-name"]}>{hakemus["organization-name"]}</td>
      <td className="project-name-column" title={hakemusName}>{hakemusName}</td>
      <td className="score-column"><Scoring scoring={hakemus.arvio.scoring} userInfo={userInfo} allowHakemusScoring={allowHakemusScoring}/></td>
      <td className="status-column">{statusFI}</td>
      <td className="applied-sum-column"><span className="money">{HakemusListing.formatNumber(hakemus["budget-oph-share"])}</span></td>
      <td className="granted-sum-column"><span className="money">{HakemusListing.formatNumber(hakemus.arvio["budget-granted"])}</span></td>
    </tr>
  }
}


class Scoring extends Component {
  render() {
    const userInfo = this.props.userInfo
    const allowHakemusScoring = this.props.allowHakemusScoring
    const scoring = this.props.scoring
    const meanScore = ScoreResolver.effectiveAverage(scoring, userInfo)
    const normalizedMeanScore = meanScore + 1
    const starElements = _.map(_.range(4), indexOfStar => {
      const isVisible = Math.ceil(meanScore) >= indexOfStar
      const starImage = isVisible ? "/img/star_on.png" : "/img/star_off.png"

      var className = "single-score"

      const needsScaling = normalizedMeanScore > indexOfStar && normalizedMeanScore < indexOfStar + 1
      if (needsScaling) {
        const delta = normalizedMeanScore - indexOfStar;
        if (delta <= 0.25) className = "single-score-0"
        else if (delta <= 0.5) className = "single-score-25"
        else if (delta <= 0.75) className = "single-score-50"
        else className = "single-score-75"
      }
      return (<img key={indexOfStar} className={className} src={starImage} />)
    })

    const titleText = _.isUndefined(meanScore) ?
      (allowHakemusScoring ? "Pisteytä hakemus jokaisen valintaperusteen mukaan nähdäksesi kaikkien arvioiden keskiarvon" : null ) :
      ScoreResolver.createAverageSummaryText(scoring, userInfo)

    return (
      <div className="score-row" title={titleText}>
        {starElements}
      </div>
    )
  }
}
