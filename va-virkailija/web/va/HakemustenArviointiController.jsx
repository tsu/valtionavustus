import Bacon from 'baconjs'
import _ from 'lodash'
import Immutable from 'seamless-immutable'

import queryString from 'query-string'
import RouteParser from 'route-parser'

import HttpUtil from 'va-common/web/HttpUtil.js'
import Dispatcher from 'soresu-form/web/Dispatcher'

import HakemusArviointiStatuses from './hakemus-details/HakemusArviointiStatuses.js'

const dispatcher = new Dispatcher()

const events = {
  initialState: 'initialState',
  setFilter: 'setFilter',
  setSorter: 'setSorter',
  selectHakemus: 'selectHakemus',
  updateHakemusArvio: 'updateHakemusArvio',
  updateHakemusStatus: 'updateHakemusStatus',
  saveCompleted: 'saveCompleted',
  loadComments: 'loadcomments',
  commentsLoaded: 'commentsLoaded',
  addComment: 'addComment',
  scoresLoaded: 'scoresLoaded',
  setScore: 'setScore',
  toggleOthersScoresDisplay: 'toggleOthersScoresDisplay',
  gotoSavedSearch: 'gotoSavedSearch'
}

export default class HakemustenArviointiController {

  initializeState(avustushakuId) {
    this._bind('onInitialState', 'onHakemusSelection')

    const initialStateTemplate = {
      hakuData: Bacon.fromPromise(HttpUtil.get("/api/avustushaku/" + avustushakuId)),
      hakemusFilter: {
        organization: "",
        name: "",
        status: HakemusArviointiStatuses.allStatuses()
      },
      hakemusSorter: [
        {field: "score", order: "desc"}
      ],
      userInfo: Bacon.fromPromise(HttpUtil.get("/api/userinfo")),
      translations: Bacon.fromPromise(HttpUtil.get("/translations.json")),
      avustushakuList: Bacon.fromPromise(HttpUtil.get("/api/avustushaku/status/published")),
      selectedHakemus: undefined,
      showOthersScores: false,
      saveStatus: {
        saveInProgress: false,
        saveTime: null,
        serverError: ""
      }
    }

    const initialState = Bacon.combineTemplate(initialStateTemplate)

    initialState.onValue(state => {
      dispatcher.push(events.initialState, state)
    })

    return Bacon.update(
      {},
      [dispatcher.stream(events.initialState)], this.onInitialState,
      [dispatcher.stream(events.selectHakemus)], this.onHakemusSelection,
      [dispatcher.stream(events.updateHakemusArvio)], this.onUpdateHakemusArvio,
      [dispatcher.stream(events.updateHakemusStatus)], this.onUpdateHakemusStatus,
      [dispatcher.stream(events.saveCompleted)], this.onSaveCompleted,
      [dispatcher.stream(events.loadComments)], this.onLoadComments,
      [dispatcher.stream(events.commentsLoaded)], this.onCommentsLoaded,
      [dispatcher.stream(events.addComment)], this.onAddComment,
      [dispatcher.stream(events.scoresLoaded)], this.onScoresLoaded,
      [dispatcher.stream(events.setScore)], this.onSetScore,
      [dispatcher.stream(events.toggleOthersScoresDisplay)], this.onToggleOthersScoresDisplay,
      [dispatcher.stream(events.setFilter)], this.onFilterSet,
      [dispatcher.stream(events.setSorter)], this.onSorterSet,
      [dispatcher.stream(events.gotoSavedSearch)], this.onGotoSavedSearch
    )
  }

  _bind(...methods) {
    methods.forEach((method) => this[method] = this[method].bind(this))
  }

  static commentsUrl(state) {
    return "/api/avustushaku/" + state.hakuData.avustushaku.id + "/hakemus/" + state.selectedHakemus.id + "/comments"
  }

  static scoresUrl(state, hakemus) {
    return "/api/avustushaku/" + state.hakuData.avustushaku.id + "/hakemus/" + hakemus.id + "/scores"
  }

  static savedSearchUrl(state) {
    return "/api/avustushaku/" + state.hakuData.avustushaku.id + "/searches"
  }

  onInitialState(emptyState, realInitialState) {
    const query = queryString.parse(location.search)
    if (query.showAll != "true") {
      realInitialState.hakuData.hakemukset = _.filter(realInitialState.hakuData.hakemukset, (hakemus) => {
        return hakemus.status === "submitted" || hakemus.status === "pending_change_request"
      })
    }
    const parsedHakemusIdObject = new RouteParser('/*ignore/hakemus/:hakemus_id/*ignore').match(location.pathname)
    if (parsedHakemusIdObject && parsedHakemusIdObject["hakemus_id"]) {
      const hakemusIdFromUrl = parsedHakemusIdObject["hakemus_id"]
      const initialHakemus = _.find(realInitialState.hakuData.hakemukset, h => { return h.id.toString() === hakemusIdFromUrl })
      if (initialHakemus) {
        this.onHakemusSelection(realInitialState, initialHakemus)
      }
    }
    realInitialState.hakuData.form = Immutable(realInitialState.hakuData.form)
    return realInitialState
  }

  onHakemusSelection(state, hakemusToSelect) {
    state.selectedHakemus = hakemusToSelect
    const pathname = location.pathname
    const parsedUrl = new RouteParser('/avustushaku/:avustushaku_id/(hakemus/:hakemus_id/)*ignore').match(pathname)
    if (!_.isUndefined(history.pushState) && parsedUrl["hakemus_id"] != hakemusToSelect.id.toString()) {
      const newUrl = "/avustushaku/" + parsedUrl["avustushaku_id"] + "/hakemus/" + hakemusToSelect.id + "/" + location.search
      history.pushState({}, window.title, newUrl)
    }
    this.loadScores(state, hakemusToSelect)
    this.loadComments()
    return state
  }

  onUpdateHakemusArvio(state, updatedHakemus) {
    const updateUrl = "/api/avustushaku/" + state.hakuData.avustushaku.id + "/hakemus/" + updatedHakemus.id + "/arvio"
    state.saveStatus.saveInProgress = true
    if (_.isUndefined(updatedHakemus.arvio.scoring)) {
      _.delete(updatedHakemus.arvio.scoring)
    }
    HttpUtil.post(updateUrl, updatedHakemus.arvio)
      .then(function(response) {
        if(response instanceof Object) {
          dispatcher.push(events.saveCompleted)
        }
        else {
          dispatcher.push(events.saveCompleted, "unexpected-save-error")
        }
      })
      .catch(function(response) {
        dispatcher.push(events.saveCompleted, "unexpected-save-error")
      })
    return state
  }

  onUpdateHakemusStatus(state, updatedHakemus) {
    const updateUrl = "/api/avustushaku/" + state.hakuData.avustushaku.id + "/hakemus/" + updatedHakemus.id + "/status"
    state.saveStatus.saveInProgress = true
    const request = {"status": updatedHakemus.status}
    HttpUtil.post(updateUrl, request)
        .then(function(response) {
          if(response instanceof Object) {
            dispatcher.push(events.saveCompleted)
          }
          else {
            dispatcher.push(events.saveCompleted, "unexpected-save-error")
          }
        })
        .catch(function(response) {
          dispatcher.push(events.saveCompleted, "unexpected-save-error")
        })
    return state
  }

  onSaveCompleted(state, error) {
    state.saveStatus.saveInProgress = false
    if(error) {
      state.saveStatus.serverError = error
    }
    else {
      state.saveStatus.saveTime = new Date()
      state.saveStatus.serverError = ""
    }
    return state
  }

  onLoadComments(state) {
    if (!state.loadingComments) {
      state.loadingComments = true
      HttpUtil.get(HakemustenArviointiController.commentsUrl(state)).then(comments => {
        dispatcher.push(events.commentsLoaded, comments)
      })
    }
    return state
  }

  onCommentsLoaded(state, comments) {
    if (state.selectedHakemus) {
      state.selectedHakemus.comments = comments
    }
    state.loadingComments = false
    return state
  }

  onAddComment(state, newComment) {
    state.saveStatus.saveInProgress = true
    HttpUtil.post(HakemustenArviointiController.commentsUrl(state), { comment: newComment })
      .then(comments => {
        if(comments instanceof Object) {
          dispatcher.push(events.commentsLoaded, comments)
          dispatcher.push(events.saveCompleted)
        }
        else {
          dispatcher.push(events.saveCompleted, "unexpected-save-error")
        }
      })
      .catch(function(response) {
        dispatcher.push(events.saveCompleted, "unexpected-save-error")
      })
    return state
  }

  onFilterSet(state, newFilter) {
    state.hakemusFilter[newFilter.filterId] = newFilter.filter
    return state
  }

  onSorterSet(state, newSorter) {
    state.hakemusSorter = newSorter
    return state
  }

  onGotoSavedSearch(state, hakemusList) {
    const idsToList = _.map(hakemusList, h => { return h.id })
    HttpUtil.put(HakemustenArviointiController.savedSearchUrl(state), { "hakemus-ids": idsToList })
      .then(savedSearchResponse => {
        if (savedSearchResponse instanceof Object) {
          window.localStorage.setItem("va.arviointi.admin.summary.url", savedSearchResponse["search-url"])
        }
        else {
          dispatcher.push(events.saveCompleted, "unexpected-save-error")
        }
      })
      .catch(function(response) {
        console.log('Got error on saved search initialization', response)
        dispatcher.push(events.saveCompleted, "unexpected-save-error")
      })
    return state
  }

  loadScores(state, hakemus) {
    HttpUtil.get(HakemustenArviointiController.scoresUrl(state, hakemus)).then(response => {
      dispatcher.push(events.scoresLoaded, {hakemusId: hakemus.id,
                                            scoring: response.scoring,
                                            scores: response.scores})
    })
    return state
  }

  onScoresLoaded(state, hakemusIdWithScoring) {
    const hakemusId = hakemusIdWithScoring.hakemusId
    const relevantHakemus = _.find(state.hakuData.hakemukset, h => { return h.id === hakemusId })
    if (relevantHakemus) {
      relevantHakemus.scores = hakemusIdWithScoring.scores
      relevantHakemus.arvio.scoring = hakemusIdWithScoring.scoring
    }
    return state
  }

  onSetScore(state, indexAndScore) {
    const { selectionCriteriaIndex, newScore } = indexAndScore
    const hakemus = state.selectedHakemus;
    const updateUrl = HakemustenArviointiController.scoresUrl(state, hakemus)
    state.saveStatus.saveInProgress = true
    HttpUtil.post(updateUrl, { "selection-criteria-index": selectionCriteriaIndex, "score": newScore })
      .then(function(response) {
        if(response instanceof Object) {
          dispatcher.push(events.scoresLoaded, {hakemusId: hakemus.id,
                                                scoring: response.scoring,
                                                scores: response.scores})
          dispatcher.push(events.saveCompleted)
        }
        else {
          dispatcher.push(events.saveCompleted, "unexpected-save-error")
        }
      })
      .catch(function(response) {
        dispatcher.push(events.saveCompleted, "unexpected-save-error")
      })
    return state
  }

  onToggleOthersScoresDisplay(state) {
    state.showOthersScores = !state.showOthersScores
    return state
  }

  // Public API
  selectHakemus(hakemus) {
    return function() {
      dispatcher.push(events.selectHakemus, hakemus)
    }
  }

  setFilter(filterId, newFilter) {
    dispatcher.push(events.setFilter, {filterId: filterId,
                                       filter: newFilter})
  }

  setSorter(newSorter) {
    dispatcher.push(events.setSorter, newSorter)
  }

  setHakemusArvioStatus(hakemus, newStatus) {
    return function() {
      hakemus.arvio.status = newStatus
      dispatcher.push(events.updateHakemusArvio, hakemus)
    }
  }

  setHakemusStatus(hakemus, newStatus) {
    return function() {
      hakemus.status = newStatus
      dispatcher.push(events.updateHakemusStatus, hakemus)
    }
  }

  setHakemusArvioBudgetGranted(hakemus, newBudgetGranted) {
    hakemus.arvio["budget-granted"] = newBudgetGranted
    dispatcher.push(events.updateHakemusArvio, hakemus)
  }

  setHakemusSummaryComment(hakemus, newSummaryComment) {
    hakemus.arvio["summary-comment"] = newSummaryComment
    dispatcher.push(events.updateHakemusArvio, hakemus)
  }

  loadComments() {
    dispatcher.push(events.loadComments)
  }

  addComment(newComment) {
    dispatcher.push(events.addComment, newComment)
  }

  setScore(selectionCriteriaIndex, newScore) {
    dispatcher.push(events.setScore, { selectionCriteriaIndex: selectionCriteriaIndex, newScore: newScore })
  }

  toggleOthersScoresDisplay() {
    dispatcher.push(events.toggleOthersScoresDisplay)
  }

  gotoSavedSearch(hakemusList) {
    dispatcher.push(events.gotoSavedSearch, hakemusList)
  }
}
