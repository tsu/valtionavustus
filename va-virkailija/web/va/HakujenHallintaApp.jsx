import PolyfillBind from 'va-common/web/polyfill-bind'
import ConsolePolyfill from 'console-polyfill'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'

import TopBar from './TopBar.jsx'
import HakujenHallintaController from './HakujenHallintaController.jsx'
import HakuListing from './haku-list/HakuListing.jsx'
import EditorSelector from './haku-details/EditorSelector.jsx'
import HakuEdit from './haku-details/HakuEdit.jsx'

import virkailija from './style/virkailija.less'
import topbar from './style/topbar.less'
import admin from './style/admin.less'

export default class AdminApp extends Component {
  render() {
    const state = this.props.state
    const controller = this.props.controller
    const environment =  state.environment
    const selectedHaku = state.selectedHaku ? state.selectedHaku : {}
    const translations = state.translations
    return (
      <section>
        <TopBar activeTab="admin" environment={environment} state={state}/>
        <section id="container">
          <HakuListing hakuList={state.hakuList}
                       selectedHaku={state.selectedHaku}
                       controller={controller}
          />
          <EditorSelector subTab={state.subTab}
                          avustushaku={selectedHaku}
                          formDraft={state.formDrafts[selectedHaku.id]}
                          environment={environment}
                          ldapSearch={state.ldapSearch}
                          controller={controller}
                          translations={translations} />
        </section>
      </section>
    )
  }
}

const controller = new HakujenHallintaController()

const stateP = controller.initializeState()

stateP.onValue(function(state) {
  try {
    if (state.hakuList) {
      ReactDOM.render(<AdminApp state={state} controller={controller}/>, document.getElementById('app'))
    } else {
      console.log('Not rendering yet, because state.hakuList not yet loaded.')
    }
  } catch (e) {
    console.log('Error from ReactDOM.render with state', state, e)
  }
})
