import React from 'react'
import _ from 'lodash'

import JsUtil from 'soresu-form/web/JsUtil'
import FormPreview from 'soresu-form/web/form/FormPreview'
import {
  Answer,
  AnswersDelta,
  Avustushaku,
  Field,
  HakemusFormState,
  LegacyTranslations,
  NormalizedHakemusData,
} from 'soresu-form/web/va/types'
import { Muutoshakemus } from 'soresu-form/web/va/types/muutoshakemus'
import { getProjectEndDate } from 'soresu-form/web/va/Muutoshakemus'

function addOrUpdateAnswer(answers: Answer[], key: string, newValue: any): Answer[] {
  const answerIndex = answers.findIndex((a) => a.key === key)
  if (answerIndex > -1) {
    return [...answers.slice(0, answerIndex), newValue, ...answers.slice(answerIndex + 1)]
  } else {
    return [...answers, { key, value: newValue }]
  }
}

function mutateAnswersDeltaWithKey(
  answersDelta: AnswersDelta,
  answers: Answer[],
  key: string,
  newValue: any
) {
  const oldValue = answers.find((a) => a.key === key)?.value
  if (oldValue !== newValue) {
    answersDelta.changedAnswers = addOrUpdateAnswer(answersDelta.changedAnswers, key, oldValue)
    answersDelta.newAnswers = addOrUpdateAnswer(answersDelta.newAnswers, key, newValue)
  }
}

function mutateDeltaFromNormalizedData(
  answersDelta: AnswersDelta,
  answers: Answer[],
  normalizedData: NormalizedHakemusData
) {
  mutateAnswersDeltaWithKey(
    answersDelta,
    answers,
    'applicant-name',
    normalizedData['contact-person']
  )
  mutateAnswersDeltaWithKey(answersDelta, answers, 'primary-email', normalizedData['contact-email'])
  mutateAnswersDeltaWithKey(answersDelta, answers, 'textField-0', normalizedData['contact-phone'])
}

function mutateDeltaFromMuutoshakemukset(
  avustushaku: Avustushaku,
  answersDelta: AnswersDelta,
  answers: Answer[],
  muutoshakemukset: Muutoshakemus[]
) {
  const projectEnd = getProjectEndDate(avustushaku, muutoshakemukset)
  if (projectEnd) {
    mutateAnswersDeltaWithKey(answersDelta, answers, 'project-end', projectEnd)
  }
}

interface EditsDisplayingFormViewProps {
  controller: any
  state: any
  infoElementValues: any
}

export default class EditsDisplayingFormView extends React.Component<EditsDisplayingFormViewProps> {
  static renderField(
    controller: any,
    formEditController: any,
    state: HakemusFormState,
    infoElementValues: any,
    field: Field
  ) {
    const fields = state.form.content
    const translations = state.configuration.translations
    const htmlId = controller.constructHtmlId(fields, field.id)
    const fieldProperties = {
      fieldType: field.fieldType,
      lang: state.configuration.lang,
      key: htmlId,
      htmlId: htmlId,
      field: field,
      controller: controller,
      translations: translations,
    }
    if (field.fieldClass === 'formField') {
      const oldAnswer = _.find(state.answersDelta.changedAnswers, (a) => {
        return a.key === field.id
      })
      if (oldAnswer) {
        return (
          <DiffDisplayingField
            key={'diff-display-' + field.id}
            field={field}
            oldAnswer={oldAnswer}
            state={state}
            infoElementValues={infoElementValues}
            controller={controller}
            translations={translations}
          />
        )
      }
      const previouslyInExistentAnswer = _.find(state.answersDelta.newAnswers, (a) => {
        return a.key === field.id
      })
      if (previouslyInExistentAnswer) {
        const dummyOldAnswer = { value: ' ' }
        return (
          <DiffDisplayingField
            key={'diff-display-' + field.id}
            field={field}
            oldAnswer={dummyOldAnswer}
            state={state}
            infoElementValues={infoElementValues}
            controller={controller}
            translations={translations}
          />
        )
      }
      return FormPreview.createFormPreviewComponent(controller, state, field, fieldProperties)
    } else if (field.fieldClass === 'infoElement') {
      return FormPreview.createInfoComponent(state, infoElementValues, field, fieldProperties, true)
    } else if (field.fieldClass === 'wrapperElement') {
      return FormPreview.createWrapperComponent(
        EditsDisplayingFormView.renderField,
        controller,
        formEditController,
        state,
        infoElementValues,
        field,
        fieldProperties
      )
    }
    return undefined
  }

  render() {
    const controller = this.props.controller
    const infoElementValues = this.props.infoElementValues.content
    const state = this.props.state
    const fields = state.form.content

    const renderField = (field: Field) => {
      return EditsDisplayingFormView.renderField(controller, null, state, infoElementValues, field)
    }

    return <div className="soresu-preview">{fields.map(renderField)}</div>
  }

  static resolveChangedFields(
    avustushaku: Avustushaku,
    currentAnswers: Answer[],
    changeRequests: any,
    attachmentVersions: any,
    muutoshakemukset?: Muutoshakemus[],
    normalizedData?: NormalizedHakemusData
  ): AnswersDelta {
    const answersDelta =
      !changeRequests || changeRequests.length === 0
        ? { changedAnswers: [] as Answer[], newAnswers: [] as Answer[] }
        : createDelta(changeRequests, attachmentVersions, currentAnswers)
    if (normalizedData) {
      mutateDeltaFromNormalizedData(answersDelta, currentAnswers, normalizedData)
    }
    if (muutoshakemukset?.length) {
      mutateDeltaFromMuutoshakemukset(avustushaku, answersDelta, currentAnswers, muutoshakemukset)
    }

    return answersDelta

    function createDelta(
      changeRequests: any,
      attachmentVersions: any,
      currentAnswers: Answer[]
    ): AnswersDelta {
      const oldestAnswers = changeRequests[0].answers
      const answersDelta = createDeltaFromUpdatedAttachments(
        attachmentVersions,
        changeRequests[0].version
      )
      addDeltaFromChangedAnswers(answersDelta, oldestAnswers, currentAnswers)
      addDeltaFromNewAnswers(currentAnswers, oldestAnswers, answersDelta)
      return answersDelta
    }

    function createDeltaFromUpdatedAttachments(
      attachmentVersions: any,
      oldestHakemusVersion: any
    ): AnswersDelta {
      const versionsByFieldId = _.groupBy(attachmentVersions, (v) => {
        return v['field-id']
      })
      _.forEach(_.keys(versionsByFieldId), (fieldId) => {
        versionsByFieldId[fieldId] = stripNonSubmittedVersions(versionsByFieldId[fieldId])
      })
      const fieldIdsOfUpdatedAttachments = _.filter(_.keys(versionsByFieldId), (fieldId) => {
        return versionsByFieldId[fieldId].length > 1
      })
      return {
        changedAnswers: _.map(fieldIdsOfUpdatedAttachments, (fieldId) => {
          const oldestRelevantAttachmentVersion = _.head(versionsByFieldId[fieldId])
          return {
            fieldType: 'namedAttachment',
            key: fieldId,
            value: oldestRelevantAttachmentVersion.filename,
            attachmentVersion: oldestRelevantAttachmentVersion,
          }
        }),
        newAnswers: [],
        attachmentVersionsByFieldId: versionsByFieldId,
      }

      function stripNonSubmittedVersions(versionsOfAttachment: any) {
        const beforeAndAfterSubmission = _.partition(versionsOfAttachment, (v) => {
          return v['hakemus-version'] <= oldestHakemusVersion
        })
        const originalSubmittedAttachmentVersion = _.head(
          _.orderBy(beforeAndAfterSubmission[0], 'version', 'desc')
        )
        const attachmentVersionsAfterSubmissions = beforeAndAfterSubmission[1]
        const result = [] as any[]
        if (originalSubmittedAttachmentVersion) {
          result.push(originalSubmittedAttachmentVersion)
        }
        return result.concat(attachmentVersionsAfterSubmissions)
      }
    }

    function addDeltaFromChangedAnswers(
      answersDelta: AnswersDelta,
      oldestAnswers: Answer[],
      currentAnswers: Answer[]
    ) {
      const originalValuesOfChangedOldFields = JsUtil.flatFilter(
        oldestAnswers,
        (oldAnswer: Answer) => {
          const newAnswerArray = JsUtil.flatFilter(
            currentAnswers,
            (newAnswer: Answer) => newAnswer.key === oldAnswer.key
          )
          return newAnswerArray.length === 0 || valuesDiffer(newAnswerArray[0], oldAnswer)
        }
      )
      _.forEach(originalValuesOfChangedOldFields, (originalValue) => {
        answersDelta.changedAnswers.push(originalValue)
      })
    }

    function addDeltaFromNewAnswers(
      currentAnswers: Answer[],
      oldestAnswers: Answer[],
      answersDelta: AnswersDelta
    ) {
      const newValuesOfNewFields = JsUtil.flatFilter(currentAnswers, (currentAnswer: Answer) => {
        const oldAnswerArray = JsUtil.flatFilter(
          oldestAnswers,
          (oldAnswer: Answer) => oldAnswer.key === currentAnswer.key
        )
        return oldAnswerArray.length === 0 || valuesDiffer(oldAnswerArray[0], currentAnswer)
      })
      _.forEach(newValuesOfNewFields, (newValue) => {
        answersDelta.newAnswers.push(newValue)
      })
    }

    function valuesDiffer(firstAnswer: Answer, secondAnswer: Answer) {
      const firstValue = firstAnswer.value
      const secondValue = secondAnswer.value
      if (firstValue === secondValue) {
        return false
      }
      if (_.isArray(firstValue) && _.isArray(secondValue)) {
        return !_.isEqual(firstAnswer, secondAnswer)
      }
      return true
    }
  }
}

class DiffDisplayingField extends React.Component<any> {
  render() {
    const field = this.props.field
    const oldAnswer = this.props.oldAnswer
    const state = this.props.state
    const controller = this.props.controller
    const translations = this.props.translations
    const infoElementValues = this.props.infoElementValues
    const oldValueDisplay = renderFieldWithOldValue()
    return (
      <div>
        <div key="answer-old-value" className="answer-old-value">
          {oldValueDisplay}
        </div>
        <div key="answer-new-value" className="answer-new-value">
          {FormPreview.renderField(controller, null, state, infoElementValues, field)}
        </div>
      </div>
    )

    function renderFieldWithOldValue() {
      if (field.fieldType === 'namedAttachment') {
        return createOldAttachmentVersionDisplay(controller, translations)
      }
      return FormPreview.renderField(controller, null, state, infoElementValues, field, {
        overridingInputValue: oldAnswer.value,
      })
    }

    function createOldAttachmentVersionDisplay(controller: any, translations: LegacyTranslations) {
      const attachmentVersion = findOriginalAttachmentVersion()
      const fields = state.form.content
      const htmlId = controller.constructHtmlId(fields, field.id)
      const fieldProperties = {
        fieldType: field.fieldType,
        lang: state.configuration.lang,
        key: htmlId,
        htmlId,
        field,
        controller,
        translations,
      }
      const renderingParameters = { overridingInputValue: oldAnswer.value }
      const downloadUrl = attachmentVersion
        ? controller.createAttachmentVersionDownloadUrl(field, attachmentVersion.version)
        : null
      return FormPreview._createFormPreviewComponent(
        controller,
        state,
        field,
        fieldProperties,
        renderingParameters,
        attachmentVersion,
        downloadUrl
      )

      function findOriginalAttachmentVersion() {
        if (oldAnswer.attachmentVersion) {
          return oldAnswer.attachmentVersion
        }
        const allAttachmentVersionsOfRemovedAttachment =
          state.answersDelta.attachmentVersionsByFieldId[oldAnswer.key]
        if (allAttachmentVersionsOfRemovedAttachment) {
          return allAttachmentVersionsOfRemovedAttachment[0]
        }
        return null
      }
    }
  }
}
