/**
 * Sistema de internacionalización ligero (sin dependencias externas).
 * Español por defecto + inglés, portugués, francés y alemán.
 * Soporta interpolación: t('clave', { variable: valor }) -> reemplaza {variable}.
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import es from './locales/es'
import en from './locales/en'
import pt from './locales/pt'
import fr from './locales/fr'
import de from './locales/de'

const DICTS = { es, en, pt, fr, de }

export const LANGUAGES = [
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'pt', label: 'Português', short: 'PT' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
]

const STORAGE_KEY = 'officespace_lang'
const I18nContext = createContext(null)

function resolve(dict, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), dict)
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'es')

  const setLang = useCallback((l) => {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
    document.documentElement.lang = l
  }, [])

  const t = useCallback(
    (key, vars) => {
      let str = resolve(DICTS[lang], key)
      if (str === undefined) str = resolve(DICTS.es, key) // fallback a español
      if (str === undefined) return key
      if (vars && typeof str === 'string') {
        str = str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`))
      }
      return str
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t, languages: LANGUAGES }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation debe usarse dentro de I18nProvider')
  return ctx
}
