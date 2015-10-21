import Bacon from 'baconjs'
import _ from 'lodash'
import Immutable from 'seamless-immutable'
import moment from 'moment-timezone'

import HttpUtil from 'va-common/web/HttpUtil.js'
import Dispatcher from 'soresu-form/web/Dispatcher'

const dispatcher = new Dispatcher()

const events = {
  initialState: 'initialState',
  selectHaku: 'selectHaku',
  createHaku: 'createHaku',
  hakuCreated: 'hakuCreated',
  updateField: 'updateField',
  saveHaku: 'saveHaku',
  saveCompleted: 'saveCompleted',
  rolesLoaded: 'rolesLoaded',
  roleCreated: 'roleCreated',
  roleDeleted: 'roleDeleted',
  formLoaded: 'formLoaded',
  updateForm: 'updateForm',
  saveForm: 'saveForm',
  formSaveCompleted: 'formSaveCompleted',
  reRender: 'reRender',
  addSelectionCriteria: 'addSelectionCriteria',
  deleteSelectionCriteria: 'deleteSelectionCriteria',
  addFocusArea: 'addFocusArea',
  deleteFocusArea: 'deleteFocusArea',
  beforeUnload: 'beforeUnload'
}

export default class HakujenHallintaController {

  static roleUrl(avustushaku) {
    return "/api/avustushaku/" + avustushaku.id + "/role"
  }

  static formUrl(avustushaku) {
    return "/api/avustushaku/" + avustushaku.id + "/form"
  }

  _bind(...methods) {
    methods.forEach((method) => this[method] = this[method].bind(this))
  }

  initializeState() {
    const initialStateTemplate = {
      hakuList: Bacon.fromPromise(HttpUtil.get("/api/avustushaku")),
      userInfo: Bacon.fromPromise(HttpUtil.get("/api/userinfo")),
      translations: Bacon.fromPromise(HttpUtil.get("/translations.json")),
      environment: Bacon.fromPromise(HttpUtil.get("/environment")),
      selectedHaku: undefined,
      saveStatus: {
        saveInProgress: false,
        saveTime: null,
        serverError: ""
      },
      formDrafts: {}
    }

    const initialState = Bacon.combineTemplate(initialStateTemplate)

    initialState.onValue(state => {
      dispatcher.push(events.initialState, state)
    })
    this.autoSave = _.debounce(function(){ dispatcher.push(events.saveHaku) }, 3000)
    this._bind('onInitialState','onUpdateField', 'onHakuCreated', 'startAutoSave', 'onSaveCompleted', 'onHakuSelection',
               'onHakuSave', 'onAddSelectionCriteria', 'onDeleteSelectionCriteria', 'onAddFocusArea', 'onDeleteFocusArea',
               'onBeforeUnload')

    Bacon.fromEvent(window, "beforeunload").onValue(function(event) {
      // For some odd reason Safari always displays a dialog here
      // But it's probably safer to always save the document anyway
      dispatcher.push(events.beforeUnload)
    })

    return Bacon.update(
      {},
      [dispatcher.stream(events.initialState)], this.onInitialState,
      [dispatcher.stream(events.selectHaku)], this.onHakuSelection,
      [dispatcher.stream(events.createHaku)], this.onHakuCreation,
      [dispatcher.stream(events.hakuCreated)], this.onHakuCreated,
      [dispatcher.stream(events.updateField)], this.onUpdateField,
      [dispatcher.stream(events.saveHaku)], this.onHakuSave,
      [dispatcher.stream(events.saveCompleted)], this.onSaveCompleted,
      [dispatcher.stream(events.rolesLoaded)], this.onRolesLoaded,
      [dispatcher.stream(events.roleCreated)], this.onRoleCreated,
      [dispatcher.stream(events.roleDeleted)], this.onRoleDeleted,
      [dispatcher.stream(events.formLoaded)], this.onFormLoaded,
      [dispatcher.stream(events.updateForm)], this.onFormUpdated,
      [dispatcher.stream(events.saveForm)], this.onFormSaved,
      [dispatcher.stream(events.formSaveCompleted)], this.onFormSaveCompleted,
      [dispatcher.stream(events.reRender)], this.onReRender,
      [dispatcher.stream(events.addSelectionCriteria)], this.onAddSelectionCriteria,
      [dispatcher.stream(events.deleteSelectionCriteria)], this.onDeleteSelectionCriteria,
      [dispatcher.stream(events.addFocusArea)], this.onAddFocusArea,
      [dispatcher.stream(events.deleteFocusArea)], this.onDeleteFocusArea,
      [dispatcher.stream(events.beforeUnload)], this.onBeforeUnload
    )
  }

  onInitialState(emptyState, realInitialState) {
    var hakuList = realInitialState.hakuList;
    if (hakuList && !_.isEmpty(hakuList)) {
      realInitialState = this.onHakuSelection(realInitialState, hakuList[0])
    }
    return realInitialState
  }

  onHakuCreation(state, baseHaku) {
    HttpUtil.put("/api/avustushaku", { baseHakuId: baseHaku.id })
      .then(function(response) {
        console.log("Created new haku. Response=", JSON.stringify(response))
        dispatcher.push(events.hakuCreated, response)
      })
      .catch(function(response) {
        console.error('Unexpected create error:', response.statusText)
        dispatcher.push(events.saveCompleted, {error: "unexpected-create-error"})
      })
    return state
  }

  onHakuCreated(state, newHaku) {
    state.hakuList.unshift(newHaku)
    state = this.onHakuSelection(state, newHaku)
    setTimeout(function() {
      document.getElementById("haku-" + newHaku.id).scrollIntoView({block: "start", behavior: "smooth"})
      document.getElementById("haku-name-fi").focus()
    }, 300)
    return state
  }

  onUpdateField(state, update) {
    const hakuname = /haku-name-(\w+)/.exec(update.field.id)
    const hakuaika = /hakuaika-(\w+)/.exec(update.field.id)
    const status = /set-status-(\w+)/.exec(update.field.id)
    const financingProcentage = /haku-self-financing-percentage/.exec(update.field.id)
    const selectionCriteria = /selection-criteria-(\d+)-(\w+)/.exec(update.field.id)
    const focusArea = /focus-area-(\d+)-(\w+)/.exec(update.field.id)
    const registerNumber = /register-number/.exec(update.field.id)
    var doSave = true
    if(hakuname) {
      const lang = hakuname[1]
      update.avustushaku.content.name[lang] = update.newValue
    }
    else if(hakuaika) {
      const startOrEnd = hakuaika[1]
      const newDate = moment(update.newValue, "DD.MM.YYYY HH.mm")
      if(newDate.isSame(update.avustushaku.content.duration[startOrEnd])) {
        doSave = false
      }
      else {
        update.avustushaku.content.duration[startOrEnd] = newDate.toDate()
      }
    }
    else if(financingProcentage) {
      update.avustushaku.content["self-financing-percentage"] = parseInt(update.newValue)
    }
    else if(status) {
      update.avustushaku.status = update.newValue
    }
    else if(selectionCriteria) {
      const index = selectionCriteria[1]
      const lang = selectionCriteria[2]
      update.avustushaku.content['selection-criteria'].items[index][lang] = update.newValue
    }
    else if (focusArea) {
      const index = focusArea[1]
      const lang = focusArea[2]
      update.avustushaku.content['focus-areas'].items[index][lang] = update.newValue
    }
    else if (registerNumber) {
      update.avustushaku["register-number"] = update.newValue
    }
    else {
      console.error("Unsupported update to field ", update.field.id, ":", update)
      doSave = false
    }
    if(doSave) {
      state = this.startAutoSave(state, update.avustushaku)
    }
    return state
  }

  onAddSelectionCriteria(state, avustushaku) {
    avustushaku.content['selection-criteria'].items.push({fi:"", sv:""})
    setTimeout(function() {
      document.getElementById("selection-criteria-" + (avustushaku.content['selection-criteria'].items.length -1) + "-fi").focus()
    }, 300)
    state = this.startAutoSave(state, avustushaku)
    return state
  }

  onDeleteSelectionCriteria(state, deletion) {
    deletion.avustushaku.content['selection-criteria'].items.splice(deletion.index, 1)
    state = this.startAutoSave(state, deletion.avustushaku)
    return state
  }

  onAddFocusArea(state, avustushaku) {
    avustushaku.content['focus-areas'].items.push({fi:"", sv:""})
    setTimeout(function() {
      document.getElementById("focus-area-" + (avustushaku.content['focus-area'].items.length -1) + "-fi").focus()
    }, 300)
    state = this.startAutoSave(state, avustushaku)
    return state
  }

  onDeleteFocusArea(state, deletion) {
    deletion.avustushaku.content['focus-areas'].items.splice(deletion.index, 1)
    state = this.startAutoSave(state, deletion.avustushaku)
    return state
  }

  startAutoSave(state) {
    state.saveStatus.saveInProgress = true
    this.autoSave()
    return state
  }

  onBeforeUnload(state) {
    if (state.saveStatus.saveInProgress) {
      this.autoSave.cancel()
      return this.onHakuSave(state)
    }
    return state
  }

  onHakuSave(state) {
    HttpUtil.post("/api/avustushaku/" + state.selectedHaku.id, _.omit(_.omit(state.selectedHaku, "roles"), "formContent"))
        .then(function(response) {
          console.log("Saved haku. Response=", JSON.stringify(response))
          dispatcher.push(events.saveCompleted, response)
        })
        .catch(function(response) {
          if(response.status === 400) {
            dispatcher.push(events.saveCompleted, {error: "validation-error"})
          }
          else {
            console.error('Unexpected save error:', response.statusText)
            dispatcher.push(events.saveCompleted, {error: "unexpected-save-error"})
          }
        })
    return state
  }

  onSaveCompleted(state, response) {
    state.saveStatus.saveInProgress = false
    if(response.error) {
      state.saveStatus.serverError = response.error
    }
    else {
      const oldHaku = _.find(state.hakuList, haku => haku.id ===  response.id)
      if(oldHaku) { 
        oldHaku.status = response.status
        oldHaku.phase = response.phase
      }
      state.saveStatus.saveTime = new Date()
      state.saveStatus.serverError = ""
    }
    return state
  }

  onHakuSelection(state, hakuToSelect) {
    if(state.saveStatus.saveInProgress) {
      this.autoSave.cancel()
      state = this.onHakuSave(state)
    }
    state.selectedHaku = hakuToSelect
    this.loadRoles(hakuToSelect)
    this.loadForm(hakuToSelect)
    return state
  }

  loadRoles(selectedHaku) {
    if (!_.isArray(selectedHaku.roles)) {
      HttpUtil.get(HakujenHallintaController.roleUrl(selectedHaku)).then(roles => {
        dispatcher.push(events.rolesLoaded, {haku: selectedHaku, roles: roles})
      })
    }
  }

  onRolesLoaded(state, loadedRoles) {
    loadedRoles.haku.roles = loadedRoles.roles
    return state
  }

  onRoleCreated(state, newRole) {
    newRole.haku.roles.push(newRole.role)
    return state
  }

  onRoleDeleted(state, roleDeletion) {
    const deleteIndex = _.findIndex(roleDeletion.haku.roles, role => role.id === roleDeletion.role.id)
    roleDeletion.haku.roles.splice(deleteIndex, 1)
    return state
  }

  loadForm(selectedHaku) {
    if (!_.isObject(selectedHaku.form) || !selectedHaku.form.id) {
      HttpUtil.get(HakujenHallintaController.formUrl(selectedHaku)).then(form => {
        dispatcher.push(events.formLoaded, {haku: selectedHaku, form: form})
      })
    }
  }

  onFormLoaded(state, loadFormResult) {
    const haku = loadFormResult.haku
    state.formDrafts[haku.id] = JSON.stringify(loadFormResult.form, null, 2)
    loadFormResult.haku.formContent = loadFormResult.form
    return state
  }

  onReRender(state) {
    return state
  }

  saveForm(avustushaku, form) {
    dispatcher.push(events.saveForm, {haku: avustushaku, form: JSON.parse(form)})
  }

  // Public API
  selectHaku(hakemus) {
    return function() {
      dispatcher.push(events.selectHaku, hakemus)
    }
  }

  createHaku(baseHaku) {
    dispatcher.push(events.createHaku, baseHaku)
  }

  onChangeListener(avustushaku, field, newValue) {
    dispatcher.push(events.updateField, {avustushaku: avustushaku, field: field, newValue: newValue})
  }

  formOnChangeListener(avustushaku, newFormJson) {
    dispatcher.push(events.updateForm, {avustushaku: avustushaku, newFormJson: newFormJson})
  }

  onFormUpdated(state, formContentUpdateObject) {
    const avustushaku = formContentUpdateObject.avustushaku
    state.formDrafts[avustushaku.id] = formContentUpdateObject.newFormJson
    return state
  }

  onFormSaved(state, formSaveObject) {
    const avustushaku = formSaveObject.haku
    const editedForm = formSaveObject.form

    HttpUtil.post("/api/avustushaku/" + avustushaku.id + "/form", editedForm)
        .then(function(response) {
          console.log("Saved form. Response=", response)
          dispatcher.push(events.formSaveCompleted, { avustusHakuId: avustushaku.id, fromFromServer: response })
        })
        .catch(function(response) {
          if(response.status === 400) {
            dispatcher.push(events.saveCompleted, {error: "validation-error"})
          }
          else {
            console.error('Unexpected save error:', response.statusText)
            dispatcher.push(events.saveCompleted, {error: "unexpected-save-error"})
          }
        })
    return state
  }

  onFormSaveCompleted(state, hakuIdAndForm) {
    const avustusHakuId = hakuIdAndForm.avustusHakuId
    const formFromServer = hakuIdAndForm.fromFromServer
    const haku = _.find(state.hakuList, haku => haku.id === avustusHakuId)
    haku.formContent = formFromServer
    return state
  }

  addSelectionCriteria(avustushaku) {
    return function() {
      dispatcher.push(events.addSelectionCriteria, avustushaku)
    }
  }

  deleteSelectionCriteria(avustushaku, index) {
    return function() {
      dispatcher.push(events.deleteSelectionCriteria, {avustushaku: avustushaku, index: index})
    }
  }

  addFocusArea(avustushaku) {
    return function() {
      dispatcher.push(events.addFocusArea, avustushaku)
    }
  }

  deleteFocusArea(avustushaku, index) {
    return function() {
      dispatcher.push(events.deleteFocusArea, {avustushaku: avustushaku, index: index})
    }
  }

  createRole(avustushaku) {
    return function() {
      HttpUtil.put(HakujenHallintaController.roleUrl(avustushaku), {})
        .then(function(response) {
          dispatcher.push(events.roleCreated, {haku: avustushaku, role: response})
        })
    }
  }

  deleteRole(avustushaku, role) {
    return function() {
      HttpUtil.delete(HakujenHallintaController.roleUrl(avustushaku) + "/" + role.id)
        .then(function(response) {
          dispatcher.push(events.roleDeleted, {haku: avustushaku, role: role})
        })
    }
  }

  onRemoveField(field) {
    console.log('I am HakujenHallintaController, now supposed to react to the removal of', field)
  }

  reRender() {
    dispatcher.push(events.reRender)
  }

  saveRole(avustushaku, role) {
    HttpUtil.post(HakujenHallintaController.roleUrl(avustushaku) + "/" + role.id, role)
  }
}
