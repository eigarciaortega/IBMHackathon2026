import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CButton,
  CCard,
  CCardBody,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CAlert,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'

import { useAuth } from '../../../context/AuthContext'
import { useTranslation } from '../../../i18n'
import { IbmLogo } from '../../../components/IbmLogo'
import { LanguageSwitcher } from '../../../components/LanguageSwitcher'
import { ApiError } from '../../../api'

// Palabras rotativas (animated-hero) por idioma.
const WORDS = {
  es: ['híbrido', 'inteligente', 'sin fricción', 'colaborativo'],
  en: ['hybrid', 'intelligent', 'frictionless', 'collaborative'],
  pt: ['híbrido', 'inteligente', 'sem atrito', 'colaborativo'],
  fr: ['hybride', 'intelligent', 'sans friction', 'collaboratif'],
  de: ['hybrid', 'intelligent', 'reibungslos', 'kollaborativ'],
}

export default function Login() {
  const { login, isAuthenticated, isAdmin } = useAuth()
  const { t, lang } = useTranslation()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [wordIdx, setWordIdx] = useState(0)

  const words = useMemo(() => WORDS[lang] || WORDS.es, [lang])

  useEffect(() => {
    if (isAuthenticated) navigate(isAdmin ? '/dashboard' : '/buscar', { replace: true })
  }, [isAuthenticated, isAdmin, navigate])

  useEffect(() => {
    const id = setInterval(() => setWordIdx((i) => (i + 1) % words.length), 2200)
    return () => clearInterval(id)
  }, [words])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email.trim().toLowerCase(), password)
      navigate(user.role === 'ADMINISTRADOR' ? '/dashboard' : '/buscar', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) setError(t('login.connectionError'))
      else setError(t('login.invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#161616',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 60 }}>
        <LanguageSwitcher />
      </div>

      {/* Lámpara IBM (haz de luz animado) */}
      <div
        style={{
          position: 'relative',
          height: 120,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ width: '8rem', opacity: 0.4 }}
          animate={{ width: '32rem', opacity: 0.55 }}
          transition={{ delay: 0.2, duration: 0.9, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 28,
            height: 150,
            borderRadius: 9999,
            background: '#0f62fe',
            filter: 'blur(70px)',
          }}
        />
        <motion.div
          initial={{ width: '7rem' }}
          animate={{ width: '30rem' }}
          transition={{ delay: 0.2, duration: 0.9, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 64,
            height: 3,
            background: '#4589ff',
            boxShadow: '0 0 30px 6px rgba(15,98,254,.7)',
          }}
        />
      </div>

      {/* Contenido */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
        style={{ marginTop: -10, textAlign: 'center', zIndex: 2, width: '100%', maxWidth: 460 }}
      >
        <IbmLogo light lg to="/" ariaLabel="Ir a la página principal" />

        <h1
          className="ibm-gradient-text"
          style={{
            marginTop: 22,
            fontSize: '1.9rem',
            fontWeight: 600,
            whiteSpace: 'pre-line',
            lineHeight: 1.2,
          }}
        >
          {t('login.heroTitle')}
        </h1>

        {/* Palabra rotativa */}
        <div style={{ height: '2rem', position: 'relative', overflow: 'hidden', marginBottom: 18 }}>
          {words.map((w, i) => (
            <motion.span
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                fontWeight: 600,
                fontSize: '1.25rem',
                color: '#78a9ff',
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={
                wordIdx === i ? { opacity: 1, y: 0 } : { opacity: 0, y: wordIdx > i ? -30 : 30 }
              }
              transition={{ type: 'spring', stiffness: 80, damping: 14 }}
            >
              {w}
            </motion.span>
          ))}
        </div>

        <CCard className="text-start shadow-lg border-0">
          <CCardBody className="p-4">
            <h2 className="h5 mb-1">{t('login.title')}</h2>
            <p className="text-body-secondary small mb-3">{t('login.subtitle')}</p>

            {error && (
              <CAlert color="danger" className="py-2 small">
                {error}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmit}>
              <CInputGroup className="mb-3">
                <CInputGroupText>
                  <CIcon icon={cilUser} />
                </CInputGroupText>
                <CFormInput
                  type="email"
                  placeholder={t('login.email')}
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </CInputGroup>
              <CInputGroup className="mb-3">
                <CInputGroupText>
                  <CIcon icon={cilLockLocked} />
                </CInputGroupText>
                <CFormInput
                  type="password"
                  placeholder={t('login.password')}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </CInputGroup>
              <CButton type="submit" color="primary" className="w-100" disabled={loading}>
                {loading ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    {t('login.signingIn')}
                  </>
                ) : (
                  t('login.signIn')
                )}
              </CButton>
            </CForm>
          </CCardBody>
        </CCard>
      </motion.div>
    </div>
  )
}
