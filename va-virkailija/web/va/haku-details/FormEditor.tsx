import React, { useCallback } from 'react'

import 'soresu-form/web/va/style/soresu-va.less'
import 'soresu-form/web/form/style/formedit.less'

import FormEdit from 'soresu-form/web/form/edit/FormEdit.jsx'
import FormEditorController from 'soresu-form/web/form/edit/FormEditController'
import VaComponentFactory from 'soresu-form/web/va/VaComponentFactory'
import VaPreviewComponentFactory from 'soresu-form/web/va/VaPreviewComponentFactory'

import FakeFormController from '../form/FakeFormController'
import FakeFormState from '../form/FakeFormState'
import { Avustushaku, Field, Form, Koodistos } from 'soresu-form/web/va/types'
import _ from 'lodash'
import { useHakujenHallintaDispatch } from '../hakujenHallinta/hakujenHallintaStore'
import { ensureKoodistoLoaded } from '../hakujenHallinta/hakuReducer'

interface FormEditorProps {
  avustushaku: Avustushaku
  koodistos: Koodistos
  formDraft: Form
  onFormChange: (avustushaku: Avustushaku, newDraft: Form) => void
}

const cloneDeeplyBecauseYouCannotMutateStateDirectlyWithRedux = (
  avustushaku: Avustushaku,
  formDraft: Form
) => ({
  avustushaku: _.cloneDeep(avustushaku),
  formDraft: _.cloneDeep(formDraft),
})

const FormEditor = ({
  avustushaku: originalAvustushaku,
  koodistos,
  formDraft: originalFormDraft,
  onFormChange,
}: FormEditorProps) => {
  const { avustushaku, formDraft } = cloneDeeplyBecauseYouCannotMutateStateDirectlyWithRedux(
    originalAvustushaku,
    originalFormDraft
  )
  const dispatch = useHakujenHallintaDispatch()
  const allowEditing = avustushaku.privileges && avustushaku.privileges['edit-haku']
  const ensureLoaded = useCallback(() => {
    dispatch(ensureKoodistoLoaded())
  }, [])
  const onFormEdited = (newDraft: Form, operationResult: Field | void) => {
    if (operationResult && operationResult.fieldType === 'koodistoField') {
      ensureLoaded()
    }
    onFormChange(avustushaku, newDraft)
  }
  const formEditorController = new FormEditorController({
    formDraft,
    onFormEdited,
    allowEditing,
  })
  const formState = formDraft
    ? FakeFormState.createEditFormState(avustushaku, formDraft.content)
    : undefined
  if (formState) {
    formState.koodistos = koodistos
    formState.koodistosLoader = ensureLoaded
  }
  const formElementProps = {
    state: formState,
    infoElementValues: avustushaku,
    controller: new FakeFormController(
      new VaComponentFactory(),
      new VaPreviewComponentFactory(),
      avustushaku,
      {}
    ),
    formEditorController,
  }

  return formState ? (
    <div id="form-editor">
      <FormEdit {...formElementProps} />
    </div>
  ) : (
    <span />
  )
}

export default FormEditor
