/**
 * Botón flotante global del asistente de voz. Fácil de activar desde
 * cualquier pantalla; abre un panel con la conversación.
 */
import React, { useRef, useState } from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilCalendarCheck,
  cilChartPie,
  cilMicrophone,
  cilRoom,
  cilSearch,
  cilSpeedometer,
  cilXCircle,
} from '@coreui/icons'

import { AssistantChat } from './AssistantChat'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n'

export function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [presetRequest, setPresetRequest] = useState(null)
  const presetSeq = useRef(0)
  const { isAdmin } = useAuth()
  const { t } = useTranslation()
  const presets = t('assistant.presets')
  const quickPresets = Array.isArray(presets)
    ? presets.filter((preset) => isAdmin || preset.key !== 'analytics').slice(0, 6)
    : []
  const orbitIcons = {
    occupancy: cilSpeedometer,
    bookings: cilCalendarCheck,
    suggestion: cilRoom,
    availability: cilSearch,
    spaces: cilRoom,
    analytics: cilChartPie,
    api: cilMicrophone,
  }

  const onPreset = (preset, index) => {
    presetSeq.current += 1
    setOpen(true)
    setPresetRequest({
      id: `${presetSeq.current}-${index}`,
      prompt: preset.prompt || preset,
    })
  }

  return (
    <div className={`asistente-widget ${open ? 'asistente-widget--open' : ''}`}>
      {open && (
        <div className="asistente-panel">
          <AssistantChat logMaxHeight={260} presetRequest={presetRequest} />
        </div>
      )}
      {open && quickPresets.length > 0 && (
        <div className="asistente-orbit" aria-label={t('assistant.presetsTitle')}>
          <div className="asistente-orbit__ring" aria-hidden="true" />
          {quickPresets.map((preset, index) => {
            const count = Math.max(quickPresets.length - 1, 1)
            const angle = 145 + (index * 180) / count
            const radius = 78
            const x = Math.cos((angle * Math.PI) / 180) * radius
            const y = Math.sin((angle * Math.PI) / 180) * radius
            const label = preset.label || preset

            return (
              <button
                key={`${label}-${index}`}
                type="button"
                className="asistente-orbit__action"
                data-preset={preset.key || index}
                style={{ left: `${x}px`, top: `${y}px`, '--orbit-index': index }}
                onClick={() => onPreset(preset, index)}
                title={label}
                aria-label={label}
              >
                <CIcon icon={orbitIcons[preset.key] || cilMicrophone} />
              </button>
            )
          })}
        </div>
      )}
      <button
        type="button"
        className={`asistente-fab ${open ? 'asistente-fab--activo' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title={t('assistant.title')}
        aria-label={t('assistant.title')}
      >
        <CIcon icon={open ? cilXCircle : cilMicrophone} size="xl" />
      </button>
    </div>
  )
}

export default AssistantWidget
