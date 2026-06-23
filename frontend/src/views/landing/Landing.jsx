/**
 * Página de inicio PÚBLICA de IBM OfficeSpace (antes del login).
 *
 * Objetivos (según el requerimiento):
 *   - Explicar TODAS las funcionalidades de la plataforma.
 *   - Usar la transición "scroll-expand" como héroe de bienvenida.
 *   - Estilo 100% IBM (Carbon): azul #0f62fe, IBM Plex, esquinas rectas.
 *   - Un botón superior que lleva al sitio de IBM (ibm.com/mx-es).
 *   - CTAs que redirigen al login y, tras autenticarse, a la página de
 *     reserva de espacios (/buscar).
 *
 * Es una página real lista para producción (no demo): i18n, accesible,
 * responsive y sin dependencias nuevas (framer-motion ya estaba instalado).
 */
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import {
  cilShieldAlt,
  cilSearch,
  cilCalendarCheck,
  cilList,
  cilSpeedometer,
  cilBuilding,
  cilChartLine,
  cilMicrophone,
  cilArrowRight,
  cilExternalLink,
} from '@coreui/icons'

import ScrollExpandMedia from '../../components/ui/ScrollExpandMedia'
import { IbmLogo } from '../../components/IbmLogo'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n'
import './landing.css'
import buildingImage from '../../assets/landing/ibm-building.png'
import officeInteriorImage from '../../assets/landing/office-interior.png'

// Enlace oficial solicitado en el requerimiento.
const IBM_URL = 'https://www.ibm.com/mx-es'

// Iconos de cada funcionalidad (el texto vive en i18n, en el mismo orden).
const FEATURE_ICONS = [
  cilShieldAlt, // Autenticación y roles
  cilSearch, // Buscador de disponibilidad
  cilCalendarCheck, // Motor de reservas
  cilList, // Mis reservas
  cilSpeedometer, // Dashboard de ocupación
  cilBuilding, // Gestión de espacios
  cilChartLine, // Analíticas
  cilMicrophone, // Asistente
]

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated, isAdmin } = useAuth()
  const { t } = useTranslation()

  // El héroe necesita arrancar con la página arriba del todo.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Destino "entrar a la app": si ya hay sesión va directo; si no, al login.
  const appPath = isAuthenticated ? (isAdmin ? '/dashboard' : '/buscar') : '/login'

  const features = t('landing.features') // array de { title, text, tag? }
  const steps = t('landing.steps') // array de { title, text }
  const stats = t('landing.stats') // array de { num, label }

  return (
    <div className="lp">
      {/* ---------- Barra superior ---------- */}
      <header className="lp-nav">
        <IbmLogo light to="/" ariaLabel="Ir a la página principal" />
        <div className="lp-nav__right">
          <LanguageSwitcher />
          <span className="lp-nav__divider" />
          {/* Botón superior hacia el sitio oficial de IBM */}
          <a
            className="lp-nav__link lp-nav__link--hide-sm"
            href={IBM_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('landing.navIbm')}
            <CIcon icon={cilExternalLink} size="sm" />
          </a>
          <button className="lp-btn lp-btn--sm" type="button" onClick={() => navigate(appPath)}>
            {isAuthenticated ? t('landing.goToApp') : t('landing.signIn')}
            <CIcon icon={cilArrowRight} size="sm" />
          </button>
        </div>
      </header>

      {/* ---------- Héroe con transición scroll-expand ---------- */}
      <ScrollExpandMedia
        mediaSrc={officeInteriorImage}
        bgImageSrc={buildingImage}
        title=""
      >
        {/* ===== Contenido revelado tras expandir el héroe ===== */}

        {/* Intro */}
        <section className="lp-section lp-section--dark">
          <span className="lp-eyebrow">{t('landing.introEyebrow')}</span>
          <h2 className="lp-h2">{t('landing.introTitle')}</h2>
          <p className="lp-lead">{t('landing.introLead')}</p>
        </section>

        {/* Funcionalidades */}
        <section className="lp-section" style={{ paddingTop: 0 }}>
          <span className="lp-eyebrow">{t('landing.featuresEyebrow')}</span>
          <h2 className="lp-h2">{t('landing.featuresTitle')}</h2>
          <div className="lp-grid">
            {Array.isArray(features) &&
              features.map((f, i) => (
                <article className="lp-feature" key={i}>
                  <CIcon className="lp-feature__icon" icon={FEATURE_ICONS[i]} size="xxl" />
                  {f.tag && <span className="lp-feature__tag">{f.tag}</span>}
                  <h3 className="lp-feature__title">{f.title}</h3>
                  <p className="lp-feature__text">{f.text}</p>
                </article>
              ))}
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="lp-section" style={{ paddingTop: 0 }}>
          <span className="lp-eyebrow">{t('landing.howEyebrow')}</span>
          <h2 className="lp-h2">{t('landing.howTitle')}</h2>
          <div className="lp-steps">
            {Array.isArray(steps) &&
              steps.map((s, i) => (
                <div className="lp-step" key={i}>
                  <span className="lp-step__num">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="lp-step__title">{s.title}</h3>
                  <p className="lp-step__text">{s.text}</p>
                </div>
              ))}
          </div>
        </section>

        {/* Métricas */}
        <section className="lp-stats">
          <div className="lp-stats__grid">
            {Array.isArray(stats) &&
              stats.map((s, i) => (
                <div className="lp-stat" key={i}>
                  <div className="lp-stat__num">{s.num}</div>
                  <div className="lp-stat__label">{s.label}</div>
                </div>
              ))}
          </div>
        </section>

        {/* CTA final -> reserva de espacios / login */}
        <section className="lp-cta">
          <div className="lp-cta__inner">
            <h2 className="lp-cta__title">{t('landing.ctaTitle')}</h2>
            <div className="lp-cta__actions">
              <button className="lp-btn lp-btn--lg" type="button" onClick={() => navigate('/buscar')}>
                {t('landing.ctaPrimary')}
                <CIcon className="lp-btn__icon" icon={cilArrowRight} />
              </button>
              <button
                className="lp-btn lp-btn--lg lp-btn--ghost"
                type="button"
                onClick={() => navigate('/login')}
              >
                {t('landing.ctaSecondary')}
              </button>
            </div>
          </div>
        </section>

        {/* Pie */}
        <footer className="lp-footer">
          <div className="lp-footer__inner">
            <IbmLogo light to="/" ariaLabel="Ir a la página principal" />
            <nav className="lp-footer__links">
              <a href={IBM_URL} target="_blank" rel="noopener noreferrer">
                {t('landing.navIbm')}
              </a>
              <a
                href="#/login"
                onClick={(e) => {
                  e.preventDefault()
                  navigate('/login')
                }}
              >
                {t('landing.signIn')}
              </a>
            </nav>
            <span className="lp-footer__copy">{t('landing.footerRights')}</span>
          </div>
        </footer>
      </ScrollExpandMedia>
    </div>
  )
}
