/**
 * UI de conversación del asistente (compartida por el widget flotante y la
 * página completa). Integra micrófono (STT) y bocina (TTS) vía useSpeech.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { CButton, CFormInput, CInputGroup, CSpinner, CBadge } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMicrophone, cilSend, cilVolumeHigh } from '@coreui/icons'

import { useTranslation } from '../../i18n'
import { useAuth } from '../../context/AuthContext'
import { useSpeech } from './useSpeech'
import { handleQuery } from './assistantEngine'

export function AssistantChat({ logMaxHeight = 280, showExamples = true, presetRequest }) {
  const { t, lang } = useTranslation()
  const { isAdmin } = useAuth()
  const { listening, supported, listen, stop, speak } = useSpeech(lang)
  const [messages, setMessages] = useState([
    { role: 'bot', text: t(isAdmin ? 'assistant.greeting' : 'assistant.greetingRestricted') },
  ])
  const [input, setInput] = useState('')
  const [voice, setVoice] = useState(true)
  const [thinking, setThinking] = useState(false)
  const logRef = useRef(null)
  const lastPresetRef = useRef(null)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [messages, thinking])

  const send = useCallback(
    async (text) => {
      const q = (text ?? input).trim()
      if (!q || thinking) return
      setMessages((m) => [...m, { role: 'user', text: q }])
      setInput('')
      setThinking(true)
      const ans = await handleQuery(q, { t, lang, isAdmin })
      setThinking(false)
      setMessages((m) => [...m, { role: 'bot', text: ans }])
      if (voice && supported) speak(ans)
    },
    [input, isAdmin, lang, speak, supported, t, thinking, voice],
  )

  useEffect(() => {
    if (!presetRequest?.id || lastPresetRef.current === presetRequest.id) return
    lastPresetRef.current = presetRequest.id
    send(presetRequest.prompt || presetRequest.text || '')
  }, [presetRequest, send])

  const onMic = () => {
    if (listening) stop()
    else listen((txt) => send(txt))
  }

  const presets = t('assistant.presets')
  const examples = Array.isArray(presets)
    ? presets.filter((preset) => isAdmin || preset.key !== 'analytics')
    : t('assistant.examples')
  const getPresetLabel = (item) => item?.label || item
  const getPresetPrompt = (item) => item?.prompt || item

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
        <div className="d-flex align-items-center gap-2">
          <strong>{t('assistant.title')}</strong>
          {listening && <CBadge color="danger">{t('assistant.listening')}</CBadge>}
        </div>
        <CButton
          size="sm"
          color={voice ? 'primary' : 'secondary'}
          variant={voice ? undefined : 'outline'}
          onClick={() => setVoice((v) => !v)}
          title={voice ? t('assistant.voiceOn') : t('assistant.voiceOff')}
        >
          <CIcon icon={cilVolumeHigh} />
        </CButton>
      </div>

      <div className="asistente-log" ref={logRef} style={{ maxHeight: logMaxHeight }}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`asistente-msg ${m.role === 'user' ? 'asistente-msg--user' : ''}`}
          >
            <div
              className={`asistente-bubble ${
                m.role === 'user' ? 'asistente-bubble--user' : 'asistente-bubble--bot'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="asistente-msg">
            <div className="asistente-bubble asistente-bubble--bot">
              <CSpinner size="sm" />
            </div>
          </div>
        )}
      </div>

      {showExamples && Array.isArray(examples) && (
        <div className="px-3 pb-2 d-flex flex-wrap gap-1">
          {examples.map((ex, i) => (
            <CBadge
              key={i}
              color="light"
              textColor="primary"
              className="border asistente-preset-chip"
              role="button"
              onClick={() => send(getPresetPrompt(ex))}
            >
              {getPresetLabel(ex)}
            </CBadge>
          ))}
        </div>
      )}

      <div className="px-3 pb-3">
        <CInputGroup>
          <CButton
            color={listening ? 'danger' : 'secondary'}
            variant={listening ? undefined : 'outline'}
            onClick={onMic}
            disabled={!supported}
            title={supported ? t('assistant.speakNow') : t('assistant.notSupported')}
          >
            <CIcon icon={cilMicrophone} />
          </CButton>
          <CFormInput
            placeholder={t('assistant.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <CButton color="primary" onClick={() => send()}>
            <CIcon icon={cilSend} />
          </CButton>
        </CInputGroup>
        {!supported && <div className="form-text small mt-1">{t('assistant.notSupported')}</div>}
      </div>
    </div>
  )
}

export default AssistantChat
