/**
 * Hook que envuelve la Web Speech API del navegador:
 *  - Reconocimiento de voz (micrófono → texto): SpeechRecognition
 *  - Síntesis de voz (texto → bocina): speechSynthesis
 * Es 100% local (en el dispositivo), sin servicios externos.
 */
import { useEffect, useRef, useState, useCallback } from 'react'

const LOCALE = { es: 'es-ES', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' }

export function useSpeech(lang = 'es') {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recogRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    setSupported(!!SR && !!window.speechSynthesis)
  }, [])

  const listen = useCallback(
    (onResult) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) return
      try {
        const r = new SR()
        r.lang = LOCALE[lang] || 'es-ES'
        r.interimResults = false
        r.maxAlternatives = 1
        r.onresult = (e) => {
          const txt = e.results[0][0].transcript
          onResult(txt)
        }
        r.onend = () => setListening(false)
        r.onerror = () => setListening(false)
        recogRef.current = r
        setListening(true)
        r.start()
      } catch {
        setListening(false)
      }
    },
    [lang],
  )

  const stop = useCallback(() => {
    try {
      recogRef.current?.stop()
    } catch {
      /* noop */
    }
    setListening(false)
  }, [])

  const speak = useCallback(
    (text) => {
      if (!window.speechSynthesis) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = LOCALE[lang] || 'es-ES'
      window.speechSynthesis.speak(u)
    },
    [lang],
  )

  return { listening, supported, listen, stop, speak }
}
