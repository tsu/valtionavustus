import _ from 'lodash'
import React, { Component } from 'react'
import Bacon from 'baconjs'

import HttpUtil from 'soresu-form/web/HttpUtil'
import DateUtil from 'soresu-form/web/DateUtil'

import HakemusBudgetEditing from '../budgetedit/HakemusBudgetEditing.jsx'

import HakemusScoring from './HakemusScoring.jsx'
import HakemusComments from './HakemusComments.jsx'
import HakemusArviointiStatuses from "./HakemusArviointiStatuses"
import TraineeDayEditing from '../traineeday/TraineeDayEditing.jsx'
import ChooseRahoitusalueAndTalousarviotili from './ChooseRahoitusalueAndTalousarviotili.jsx'
import SpecifyOppilaitos from './SpecifyOppilaitos.jsx'
import AcademySize from './AcademySize.jsx'
import Perustelut from './Perustelut.jsx'
import PresenterComment from './PresenterComment.jsx'
import EditStatus from './EditStatus.jsx'

import '../style/admin.less'

export default class HakemusArviointi extends Component {
  render() {
    const controller = this.props.controller
    const hakemus = this.props.hakemus
    const avustushaku = this.props.avustushaku
    const hakuData = this.props.hakuData
    const translations = this.props.translations
    const {
      allowHakemusCommenting,
      allowHakemusStateChanges,
      allowHakemusScoring,
      allowHakemusOfficerEditing,
      allowHakemusCancellation
    } = this.props.selectedHakemusAccessControl
    const userInfo = this.props.userInfo
    const comments = hakemus.comments
    const loadingComments = this.props.loadingComments
    const showOthersScores = this.props.showOthersScores
    const showShouldPayComments = true

    return (
     <div id="arviointi-tab">
       <PresenterComment controller={controller} hakemus={hakemus}/>
       <ChooseRahoitusalueAndTalousarviotili controller={controller} hakemus={hakemus} avustushaku={avustushaku} allowEditing={allowHakemusStateChanges}/>
       <SpecifyOppilaitos controller={controller} hakemus={hakemus} avustushaku={avustushaku} allowEditing={allowHakemusStateChanges}/>
       <AcademySize controller={controller} hakemus={hakemus} avustushaku={avustushaku} allowEditing={allowHakemusStateChanges}/>
       <HakemusScoring controller={controller} hakemus={hakemus} avustushaku={avustushaku}
                       allowHakemusScoring={allowHakemusScoring} userInfo={userInfo} showOthersScores={showOthersScores}/>
       <HakemusComments controller={controller} hakemus={hakemus} comments={comments} loadingComments={loadingComments} allowHakemusCommenting={allowHakemusCommenting}/>
       <SetArviointiStatus controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges} />
       <Perustelut controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges} />
       <ShouldPay controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges}/>      
       <ShouldPayComments showField={showShouldPayComments} controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges}/>
       <ChangeRequest controller={controller} hakemus={hakemus} avustushaku={avustushaku} allowEditing={allowHakemusStateChanges} />
       <SummaryComment controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges} />
       <HakemusBudgetEditing avustushaku={avustushaku} hakuData={hakuData} translations={translations} controller={controller} hakemus={hakemus} allowEditing={allowHakemusStateChanges} />
       <TraineeDayEditing avustushaku={avustushaku} hakuData={hakuData} translations={translations} controller={controller} hakemus={hakemus}  allowEditing={allowHakemusStateChanges} />
       <EditStatus avustushaku={avustushaku} hakemus={hakemus} allowEditing={allowHakemusOfficerEditing} status="officer_edit"/>
       <EditStatus avustushaku={avustushaku} hakemus={hakemus} allowEditing={allowHakemusCancellation} status="cancelled"/>
       <ChangeLog hakemus={hakemus}/>
     </div>
    )
  }
}

class ChangeLog extends React.Component{
  render(){
    const hakemus = this.props.hakemus
    const changelogs = _.get(this.props.hakemus, "arvio.changelog")
    if (!changelogs) {
      return null
    }
    return (
      <div className="changelog">
        <h2 className="changelog__heading">Muutoshistoria</h2>
        {changelogs.length ? (
          <table className="changelog__table">
            {changelogs.map((changelog, index) => <ChangeLogRow key={index} changelog={changelog} hakemus={hakemus}/>)}
          </table>
        ) : (
          <div>Ei muutoksia</div>
        )}
      </div>
    )
  }
}

class ChangeLogRow extends React.Component{
  constructor(props){
    super(props)
    this.state = {open:false}
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.hakemus.id !== nextProps.hakemus.id) {
      this.setState({open:false})
    }
  }

  render(){
    const changelog = this.props.changelog
    const types = {
      "budget-change": "Budjetti päivitetty",
      "oppilaitokset-change": "Oppilaitokset päivitetty",
      "summary-comment": "Perustelut hakijalle",
      "overridden-answers-change": "Sisältöä päivitetty",
      "presenter-comment": "Valmistelijan huomiot päivitetty",
      "status-change": "Tila päivitetty"
    }
    const typeTranslated = types[changelog.type] || changelog.type
    const dateStr = DateUtil.asDateString(changelog.timestamp) + " " + DateUtil.asTimeString(changelog.timestamp)

    const toggleOpen = ()=> {
      this.setState({open:!this.state.open})
    }

    return (
      <tbody>
        <tr className="changelog__row">
          <td className="changelog__date">{dateStr}</td>
          <td className="changelog__name">{changelog["first-name"]} {changelog["last-name"]}</td>
          <td className="changelog__type"><a onClick={toggleOpen}>{typeTranslated}</a></td>
        </tr>
        <tr>
          {this.state.open && (
           <td colSpan="3">
             <pre className="changelog__data">{JSON.stringify(changelog.data)}</pre>
           </td>
          )}
        </tr>
      </tbody>
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
    const statusValues = HakemusArviointiStatuses.allStatuses()
    for (let i = 0; i < statusValues.length; i++) {
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
               checked={statusValues[i] === status}
            />
      )
      statuses.push(
        <label key={htmlId + "-label"} htmlFor={htmlId}>{statusFI}</label>
      )
    }

    return (
      <fieldset className="soresu-radiobutton-group arvio-status-group">
        {statuses}
      </fieldset>
    )
  }
}

class ShouldPayComments extends React.Component {
  constructor(props){
    super(props)
    this.state={shouldPayComments: getShouldPayComments(this.props.hakemus)}
  }

 componentWillReceiveProps(nextProps) {
    if (this.props.hakemus.id !== nextProps.hakemus.id) {
      this.setState({shouldPayComments: getShouldPayComments(nextProps.hakemus)})
    }
  }

  commentsUpdated(newComment){
    this.setState({shouldPayComments: newComment})
    console.log("uusi kommentti: " + this.state.shouldPayComments)
    this.props.controller.setHakemusShouldPayComments(this.props.hakemus, newComment)
}
  
  render() { 
    const allowEditing = this.props.allowEditing

 return(
   <div className="value-edit should-pay-comment">
      <label htmlFor="should-pay-comment">Perustelut, miksi ei makseta: </label>
      <textarea id="should-pay-comment" rows="5" disabled={false} value={this.state.shouldPayComments}
             onChange={evt => this.commentsUpdated(evt.target.value) } maxLength="128" />
    </div>  
)
}

}

function getShouldPayComments(hakemus) {
  const arvio = hakemus.arvio ? hakemus.arvio : {}
  return arvio["should-pay-comments"]
}


class ShouldPay extends React.Component {
  render() {
    const hakemus = this.props.hakemus
    const allowEditing = true
//this.props.allowEditing
    const controller = this.props.controller
    const arvio = hakemus.arvio
    const selectedShouldPay = arvio["should-pay"]
    const isDisabled = this.props.disabled
    const onChange = function(event) {
      controller.setHakemusShouldPay(hakemus, event.target.value)()
    }

    const options = _.flatten([
      {htmlId: "set-should-pay-true", value: true, label: "Kyllä"},
      {htmlId: "set-should-pay-false", value: false, label: "Ei"}
    ].map(spec =>
      [
        <input id={spec.htmlId}
               key={spec.htmlId}
               type="radio"
               name="should-pay"
               value={spec.value}
               onChange={onChange}
               checked={spec.value === selectedShouldPay}
               disabled={!allowEditing} />,
        <label key={spec.htmlId + "-label"}
               htmlFor={spec.htmlId}>{spec.label}</label>
      ]
    ))
        
    return (
      <div id="set-should-pay-grant">
        <h3>Maksuun:</h3>
        <fieldset className="soresu-radiobutton-group">
          {options}
        </fieldset>
        
      </div>
    )
  }
}



class ChangeRequest extends React.Component {

  constructor(props){
    super(props)
    this.state = {preview: false}
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.hakemus.id !== nextProps.hakemus.id) {
      this.setState({preview: false})
    }
  }

  render() {
    const hakemus = this.props.hakemus
    const avustushaku = this.props.avustushaku
    const status = hakemus.status
    const hasChangeRequired = status === 'pending_change_request' || status === 'officer_edit'
    const changeRequestTitle = status === 'pending_change_request' ? "Täydennyspyyntö lähetetty" : "Virkailijan muokkaus avattu"
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
    const sendChangeRequest = allowEditing ? controller.setHakemusStatus(hakemus, "pending_change_request", () => hakemus.changeRequest) : null
    const newChangeRequest = typeof hakemus.changeRequest !== 'undefined' && !hasChangeRequired

    const onPreview = () =>{
      const sendS = Bacon.fromPromise(HttpUtil.post(`/api/avustushaku/${avustushaku.id}/change-request-email`,{text:hakemus.changeRequest}))
      sendS.onValue((res)=>{
        this.setState({preview:true,mail:res.mail})
      })
    }

    const closePreview = () => this.setState({preview:false})
    const mail = this.state.mail
    return (
      <div className="value-edit">
        <button type="button"
                hidden={newChangeRequest || hasChangeRequired}
                onClick={openEdit}
                disabled={!allowEditing}>Pyydä täydennystä</button>
        <div hidden={!newChangeRequest}>
          <label>Lähetä täydennyspyyntö</label>
          <span onClick={closeEdit} className="close"></span>
          <textarea placeholder="Täydennyspyyntö hakijalle" onChange={onTextChange} rows="4" disabled={!allowEditing} value={hakemus.changeRequest}/>
          <button type="button" disabled={_.isEmpty(hakemus.changeRequest)} onClick={sendChangeRequest}>Lähetä</button>
          <a onClick={onPreview} style={{position:'relative'}}>Esikatsele</a>
          {this.state.preview && <div className="panel email-preview-panel">
            <span className="close" onClick={closePreview}></span>
            <strong>Otsikko:</strong> {mail.subject}<br/>
            <strong>Lähettäjä:</strong> {mail.sender}<br/><br/>
            <div style={{whiteSpace:'pre-line'}}>
            {mail.content}
            </div>
          </div>}
        </div>
        <div hidden={!hasChangeRequired}>
          <div className="change-request-title">* {changeRequestTitle} {lastChangeRequestTime}</div>
          <pre className="change-request-text">{lastChangeRequestText}</pre>
        </div>
      </div>
    )
  }
}

class SummaryComment extends React.Component {
  constructor(props) {
    super(props)
    this.state = {summaryComment: getSummaryComment(this.props.hakemus)}
    this.summaryCommentBus = new Bacon.Bus()
    this.summaryCommentBus.debounce(1000).onValue(([hakemus, newSummaryComment]) => this.props.controller.setHakemusSummaryComment(hakemus, newSummaryComment))
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.hakemus.id !== nextProps.hakemus.id) {
      this.setState({summaryComment: getSummaryComment(nextProps.hakemus)})
    }
  }

  summaryCommentUpdated(newSummaryComment) {
    this.setState({summaryComment: newSummaryComment})
    this.summaryCommentBus.push([this.props.hakemus, newSummaryComment])
  }

  render() {
    const allowEditing = this.props.allowEditing
    return <div className="value-edit summary-comment">
      <label htmlFor="summary-comment">Huomautus päätöslistaan</label>
      <textarea id="summary-comment" rows="1" disabled={!allowEditing} value={this.state.summaryComment}
             onChange={evt => this.summaryCommentUpdated(evt.target.value) } maxLength="128" />
    </div> 
  }
}

function getSummaryComment(hakemus) {
  const arvio = hakemus.arvio ? hakemus.arvio : {}
  return arvio["summary-comment"] ||  ""
}
