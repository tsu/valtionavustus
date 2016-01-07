import React, { Component } from 'react'

import DateUtil from 'soresu-form/web/form/DateUtil'
import FormUtil from 'soresu-form/web/form/FormUtil'

import HakemusBudgetEditing, { BudgetGranted } from '../budgetedit/HakemusBudgetEditing.jsx'

import HakemusScoring from './HakemusScoring.jsx'
import HakemusComments from './HakemusComments.jsx'
import HakemusArviointiStatuses from "./HakemusArviointiStatuses.js"
import HakemusStatuses from './HakemusStatuses.js'
import HakemusSearchTextEdit from './HakemusSearchTextEdit.jsx'

export default class HakemusArviointi extends Component {
  render() {
    const controller = this.props.controller
    const hakemus = this.props.hakemus
    const avustushaku = this.props.avustushaku
    const hakuData = this.props.hakuData
    const translations = this.props.translations
    const privileges = this.props.privileges
    const hakuIsPublishedAndEnded = avustushaku.status === "published" && avustushaku.phase === "ended"
    const allowHakemusCommenting = hakuIsPublishedAndEnded
    const allowHakemusStateChanges = privileges["change-hakemus-state"] && hakuIsPublishedAndEnded
    const allowHakemusScoring = privileges["score-hakemus"] && hakuIsPublishedAndEnded
    const userInfo = this.props.userInfo
    const comments = hakemus.comments
    const loadingComments = this.props.loadingComments
    const showOthersScores = this.props.showOthersScores
    return (
     <div id="hakemus-arviointi">
       <HakemusSearchTextEdit controller={controller} hakemus={hakemus} avustushaku={avustushaku}
                              allowEditing={allowHakemusScoring} />
       <HakemusScoring controller={controller} hakemus={hakemus} avustushaku={avustushaku}
                       allowHakemusScoring={allowHakemusScoring} userInfo={userInfo} showOthersScores={showOthersScores}/>
       <HakemusComments controller={controller} hakemus={hakemus} comments={comments} loadingComments={loadingComments} allowHakemusCommenting={allowHakemusCommenting}/>
       <SetArviointiStatus controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges} />
       <BudgetGranted hakemus={hakemus}/>
       <ChangeRequest controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges} />
       <SummaryComment controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges} />
       <HakemusBudgetEditing avustushaku={avustushaku} hakuData={hakuData} translations={translations} controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges} />
     </div>
    )
  }
}

class SetArviointiStatus extends React.Component {
  render() {
    const hakemus = this.props.hakemus
    const allowEditing = this.props.allowEditing
    const arvio = hakemus.arvio
    const status = arvio ? arvio.status : undefined
    const controller = this.props.controller
    const statuses = []
    const statusValues = HakemusArviointiStatuses.allStatuses();
    for (var i=0; i < statusValues.length; i++) {
      const htmlId = "set-arvio-status-" + statusValues[i]
      const statusFI = HakemusArviointiStatuses.statusToFI(statusValues[i])
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
      <div className="value-edit">
        {statuses}
      </div>
    )
  }
}

class ChangeRequest extends React.Component {

  render() {
    const hakemus = this.props.hakemus
    const status = hakemus.status
    const hasChangeRequired = status === 'pending_change_request'
    const allowEditing = this.props.allowEditing
    const lastChangeRequest = _.last(hakemus.changeRequests)
    const lastChangeRequestText = lastChangeRequest ? lastChangeRequest["status-comment"] : ""
    const lastChangeRequestTime = lastChangeRequest ? DateUtil.asDateString(lastChangeRequest["version-date"]) + " " + DateUtil.asTimeString(lastChangeRequest["version-date"]) : ""
    const controller = this.props.controller
    const openEdit = allowEditing ? controller.setChangeRequestText(hakemus, "") : null
    const closeEdit = allowEditing ? controller.setChangeRequestText(hakemus, undefined) : null
    const onTextChange = function(event) {
      controller.setChangeRequestText(hakemus, event.target.value)()
    }
    const sendChangeRequest = allowEditing ? controller.setHakemusStatus(hakemus, "pending_change_request", _ => hakemus.changeRequest) : null
    const newChangeRequest = typeof hakemus.changeRequest !== 'undefined' && !hasChangeRequired
    return (
      <div className="value-edit">
        <button hidden={newChangeRequest || hasChangeRequired}
                onClick={openEdit}
                disabled={!allowEditing}>Pyydä täydennystä</button>
        <div hidden={!newChangeRequest}>
          <label>Lähetä täydennyspyyntö</label>
          <span onClick={closeEdit} className="close"></span>
          <textarea placeholder="Täydennyspyyntö hakijalle" onChange={onTextChange} rows="4" disabled={!allowEditing} value={hakemus.changeRequest}/>
          <button disabled={_.isEmpty(hakemus.changeRequest)} onClick={sendChangeRequest}>Lähetä</button>
        </div>
        <div hidden={!hasChangeRequired}>
          <div className="change-request-title">* Täydennyspyyntö lähetetty {lastChangeRequestTime}</div>
          <pre className="change-request-text">{lastChangeRequestText}</pre>
        </div>
      </div>
    )
  }
}

class SummaryComment extends React.Component {
  render() {
    const hakemus = this.props.hakemus
    const allowEditing = this.props.allowEditing
    const arvio = hakemus.arvio ? hakemus.arvio : {}
    const summaryComment = arvio["summary-comment"] ? arvio["summary-comment"] : ""
    const controller = this.props.controller
    return <div className="value-edit summary-comment">
      <label htmlFor="summary-comment">Huomautus ratkaisuyhteenvetoon</label>
      <textarea id="summary-comment" rows="1" disabled={!allowEditing} value={summaryComment} title={summaryComment}
             onChange={e => { controller.setHakemusSummaryComment(hakemus, e.target.value) }} maxLength="128" />
    </div>
  }
}
