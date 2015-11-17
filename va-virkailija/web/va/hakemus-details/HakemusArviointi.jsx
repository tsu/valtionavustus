import React, { Component } from 'react'

import FormUtil from 'soresu-form/web/form/FormUtil'

import HakemusScoring from './HakemusScoring.jsx'
import HakemusComments from './HakemusComments.jsx'
import HakemusStatuses from "./HakemusStatuses.js"

export default class HakemusArviointi extends Component {
  render() {
    const controller = this.props.controller
    const hakemus = this.props.hakemus
    const avustushaku = this.props.avustushaku
    const privileges = this.props.privileges
    const allowHakemusStateChanges = privileges["change-hakemus-state"]
    const allowHakemusScoring = privileges["score-hakemus"]
    const userInfo = this.props.userInfo
    const comments = hakemus.comments
    const loadingComments = this.props.loadingComments
    const showOthersScores = this.props.showOthersScores
    return (
     <div id="hakemus-arviointi">
       <HakemusScoring controller={controller} hakemus={hakemus} avustushaku={avustushaku}
                       allowHakemusScoring={allowHakemusScoring} userInfo={userInfo} showOthersScores={showOthersScores}/>
       <HakemusComments controller={controller} hakemus={hakemus} comments={comments} loadingComments={loadingComments}/>
       <SetStatus controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges} />
       <BudgetGranted controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges} />
       <SummaryComment controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges} />
     </div>
    )
  }
}

class SetStatus extends React.Component {
  render() {
    const hakemus = this.props.hakemus
    const allowEditing = this.props.allowEditing
    const arvio = hakemus.arvio
    const status = arvio ? arvio.status : undefined
    const controller = this.props.controller
    const statuses = []
    const statusValues = ['unhandled', 'processing', 'plausible', 'rejected', 'accepted'];
    for (var i=0; i < statusValues.length; i++) {
      const htmlId = "set-status-" + statusValues[i]
      const statusFI = HakemusStatuses.statusToFI(statusValues[i])
      const onChange = allowEditing ? controller.setHakemusArvioStatus(hakemus, statusValues[i]) : null
      statuses.push(
          <input id={htmlId}
                 type="radio"
                 key={htmlId}
                 name="status"
                 value={statusValues[i]}
                 disabled={!allowEditing}
                 onChange={onChange}
                 checked={statusValues[i] === status ? true: null}
              />
      )
      statuses.push(
          <label key={htmlId + "-label"} htmlFor={htmlId}>{statusFI}</label>
      )
    }

    return (
      <div>
        {statuses}
      </div>
    )
  }
}

class BudgetGranted extends React.Component {
  render() {
    const hakemus = this.props.hakemus
    const arvio = hakemus.arvio
    const allowEditing = this.props.allowEditing
    const budgetGranted = _.get(arvio, "budget-granted", 0)
    const controller = this.props.controller
    const onChange = e => {
      const inputValue = e.target.value
      const inputValueWithNumericInput = inputValue ? inputValue.replace(/\D/g,'') : "0"
      const number = FormUtil.isNumeric(inputValueWithNumericInput) ? parseInt(inputValueWithNumericInput) : 0
      controller.setHakemusArvioBudgetGranted(hakemus, number)
    }

    return <div className="budget-granted">
      <label htmlFor="budget-granted">Myönnetty avustus</label>
      <input id="budget-granted" disabled={!allowEditing} type="text" value={budgetGranted} onChange={onChange} maxLength="9" /> €
    </div>
  }
}

class SummaryComment extends React.Component {
  render() {
    const hakemus = this.props.hakemus
    const allowEditing = this.props.allowEditing
    const arvio = hakemus.arvio
    const summaryComment = arvio ? arvio["summary-comment"] : undefined
    const controller = this.props.controller
    return <div className="summary-comment">
      <label htmlFor="summary-comment">Huomautus ratkaisuyhteenvetoon</label>
      <input id="summary-comment" type="text" disabled={!allowEditing} value={summaryComment} title={summaryComment}
             onChange={e => { controller.setHakemusSummaryComment(hakemus, e.target.value) }} maxLength="128" />
    </div>
  }
}
