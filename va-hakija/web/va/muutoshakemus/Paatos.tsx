import React, { useEffect, useState } from 'react'
import * as queryString from 'query-string'

import HttpUtil from 'soresu-form/web/HttpUtil'
import { MuutoshakemusPaatos } from 'va-common/web/va/MuutoshakemusPaatos'
import { PaatosState } from 'va-common/web/va/types/muutoshakemus'
import { getTranslationContextFromQuery, TranslationContext } from '../../../../va-common/web/va/i18n/TranslationContext'

import '../style/paatos.less'

const initialState: PaatosState = {} as PaatosState

export const Paatos = () => {
  const query = queryString.parse(location.search)
  const [loading, setLoading] = useState(true)
  const [paatosState, setPaatosState] = useState<PaatosState>(initialState)
  const translationContext = getTranslationContextFromQuery(query)

  useEffect(() => {
    const fetchData = async () => {
      const response = await HttpUtil.get(`/api/muutoshakemus/paatos/${query['user-key']}`) as PaatosState
      setPaatosState(response)
      setLoading(false)
    }

    fetchData()
  }, [])

  return (
    <div className="paatos__wrapper">
      {loading ? <div>Ladataan päätöstä...</div> :
        <TranslationContext.Provider value={translationContext}>
          <MuutoshakemusPaatos {...paatosState} />
        </TranslationContext.Provider>
      }
    </div>
  )
}
