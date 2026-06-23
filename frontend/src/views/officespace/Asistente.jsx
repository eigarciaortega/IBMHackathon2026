import React from 'react'
import { CCard, CCardBody, CRow, CCol, CListGroup, CListGroupItem } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMicrophone, cilVolumeHigh, cilLanguage, cilChartPie } from '@coreui/icons'

import { AssistantChat } from '../../components/assistant/AssistantChat'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n'

export default function Asistente() {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const presets = t('assistant.presets')
  const examples = Array.isArray(presets)
    ? presets.filter((preset) => isAdmin || preset.key !== 'analytics')
    : t('assistant.examples')

  return (
    <div>
      <h1 className="h3 mb-1">{t('assistant.title')}</h1>
      <p className="text-body-secondary mb-4">{t('assistant.subtitle')}</p>

      <CRow className="g-4">
        <CCol lg={7}>
          <CCard>
            <CCardBody className="p-0">
              <AssistantChat logMaxHeight={380} showExamples={false} />
            </CCardBody>
          </CCard>
        </CCol>
        <CCol lg={5}>
          <CCard className="h-100">
            <CCardBody>
              <div className="d-flex gap-3 mb-3">
                <CIcon icon={cilMicrophone} size="xl" className="text-primary" />
                <CIcon icon={cilVolumeHigh} size="xl" className="text-primary" />
                <CIcon icon={cilLanguage} size="xl" className="text-primary" />
              </div>
              <h2 className="h6">{t('assistant.examplesTitle')}</h2>
              <CListGroup flush className="mb-3">
                {Array.isArray(examples) &&
                  examples.map((ex, i) => (
                    <CListGroupItem key={i} className="px-0 border-0 py-1 text-body-secondary">
                      <strong className="text-body">{ex.label || ex}</strong>
                      {ex.prompt && <div className="small">"{ex.prompt}"</div>}
                    </CListGroupItem>
                  ))}
              </CListGroup>
              <p className="small text-body-secondary mb-0">
                <CIcon icon={cilChartPie} className="me-1" />
                {t('assistant.greeting')}
              </p>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}
