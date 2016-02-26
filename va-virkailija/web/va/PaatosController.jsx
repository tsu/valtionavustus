import Bacon from 'baconjs'
import _ from 'lodash'
import Immutable from 'seamless-immutable'

import queryString from 'query-string'
import RouteParser from 'route-parser'

import HttpUtil from 'va-common/web/HttpUtil.js'
import Dispatcher from 'soresu-form/web/Dispatcher'

const dispatcher = new Dispatcher()

const events = {
  initialState: 'initialState'
}

export default class PaatosController {
  initializeState(parsedRoute) {
    const avustushakuId = parsedRoute["avustushaku_id"]
    const hakemusId = parsedRoute["hakemus_id"]
    this._bind('onInitialState')
    const initialStateTemplate = {
      paatosData: Bacon.fromPromise(HttpUtil.get(`/api/avustushaku/${avustushakuId}/paatos/${hakemusId}`))
    }

    const initialState = Bacon.combineTemplate(initialStateTemplate)

    initialState.onValue(state => {
      dispatcher.push(events.initialState, state)
    })

    return Bacon.update(
        {},
        [dispatcher.stream(events.initialState)], this.onInitialState
    )
  }

  _bind(...methods) {
    methods.forEach((method) => this[method] = this[method].bind(this))
  }

  onInitialState(emptyState, realInitialState) {
    return realInitialState
  }
}
