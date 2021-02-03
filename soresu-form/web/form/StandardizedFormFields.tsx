import React from 'react'
import { Language, StandardizedFormValues } from 'va-common/web/va/standardized-form-fields/types'

interface StandardizedFormFieldsProps {
  environment: any
  lang: Language
  standardizedFormValues: StandardizedFormValues
}

function validateLanguage(s: unknown): Language {
  if (s !== 'fi' && s !== 'sv') {
    throw new Error(`Unrecognized language: ${s}`)
  }
  return s
}

export const StandardizedFormFields = ({standardizedFormValues, environment, lang}: StandardizedFormFieldsProps) => {
  const validatedLang = validateLanguage(lang) || 'fi'
  const muutospaatosprosessiEnabled =
    (environment["muutospaatosprosessi"] &&
      environment["muutospaatosprosessi"]["enabled?"]) || false
  return (
    muutospaatosprosessiEnabled
    ? <p className="soresu-info-element">{standardizedFormValues["help-text-" + validatedLang]}</p>
    : <span/>
  )
}
