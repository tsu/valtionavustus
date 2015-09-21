import React from 'react'
import ClassNames from 'classnames'
import _ from 'lodash'
import Dropzone from 'react-dropzone-es6'

import RemoveButton from './RemoveButton.jsx'
import BasicSizedComponent from './BasicSizedComponent.jsx'
import LocalizedString from 'va-common/web/form/component/LocalizedString.jsx'
import HelpTooltip from 'va-common/web/form/component/HelpTooltip.jsx'
import Translator from 'va-common/web/form/Translator'

export default class FileUploadField extends BasicSizedComponent {
  render() {
    const props = this.props
    const translations = this.props.translations
    const lang = this.props.lang
    const classStr = ClassNames(this.resolveClassName("soresu-file-upload"), { disabled: this.props.disabled })
    const existingAttachment = this.props.attachments[this.props.field.id]

    const propertiesWithAttachment = _.extend(props, { attachment: existingAttachment })
    const attachmentElement = existingAttachment ? <ExistingAttachmentComponent {...propertiesWithAttachment}  /> :
      <Dropzone className={classStr} id={props.htmlId} name={props.htmlId} onDrop={props.onDrop}
                             disableClick={props.disabled} multiple={false}>
                     <LocalizedString className="soresu-upload-button" translations={translations.form.attachment} translationKey="uploadhere" lang={lang}/>
                   </Dropzone>

    return <div>
             {this.label(classStr)}
             {attachmentElement}
           </div>
  }
}

class ExistingAttachmentComponent {
  render() {
    const attachment = this.props.attachment
    const removeButton = React.createElement(RemoveButton, this.props)
    return <div>
             <a href="TODO">{attachment.filename}</a>
             <span> (liitetty TODO)</span>
             {removeButton}
           </div>
  }
}