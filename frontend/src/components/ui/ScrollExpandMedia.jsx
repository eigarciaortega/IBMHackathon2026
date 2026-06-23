/**
 * ScrollExpandMedia — Héroe con transición de "expansión por scroll".
 *
 * Al hacer scroll, una imagen central crece hasta llenar la pantalla; al
 * completarse, se revela el contenido (`children`) y el scroll vuelve a la
 * normalidad. Es la transición que da la bienvenida en la página de inicio.
 *
 * Adaptado al stack real del proyecto (NO Next.js / NO Tailwind):
 *   - <img> nativo en lugar de next/image.
 *   - Estilos inline + CSS propio (landing.css) en lugar de clases Tailwind.
 *   - framer-motion (ya instalado) para los fundidos.
 *
 * Rendimiento (sin lag):
 *   - Los listeners se registran UNA sola vez (no se re-suscriben en cada
 *     evento de rueda).
 *   - El progreso vive en refs y el estado de React se actualiza como mucho
 *     una vez por frame con requestAnimationFrame.
 *   - Respeta `prefers-reduced-motion`: si está activo, se muestra todo
 *     expandido de inmediato y no se "secuestra" el scroll.
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export default function ScrollExpandMedia({
  mediaSrc,
  bgImageSrc,
  title = '',
  date,
  scrollToExpand,
  textBlend = false,
  children,
}) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showContent, setShowContent] = useState(false)
  const [mediaFullyExpanded, setMediaFullyExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Refs: permiten leer/actualizar sin re-crear los listeners (clave del rendimiento).
  const progressRef = useRef(0)
  const expandedRef = useRef(false)
  const touchStartRef = useRef(0)
  const rafRef = useRef(0)

  // --- Lógica de scroll (se registra una sola vez) ---
  useEffect(() => {
    // Accesibilidad/rendimiento: si el usuario prefiere menos movimiento,
    // saltamos la animación y mostramos todo expandido.
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      progressRef.current = 1
      expandedRef.current = true
      setScrollProgress(1)
      setMediaFullyExpanded(true)
      setShowContent(true)
      return
    }

    // Vuelca el progreso al estado de React, como mucho una vez por frame.
    const flush = () => {
      rafRef.current = 0
      setScrollProgress(progressRef.current)
    }
    const schedule = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(flush)
    }

    const apply = (delta) => {
      const next = Math.min(Math.max(progressRef.current + delta, 0), 1)
      progressRef.current = next
      schedule()
      if (next >= 1 && !expandedRef.current) {
        expandedRef.current = true
        setMediaFullyExpanded(true)
        setShowContent(true)
      } else if (next < 0.75) {
        setShowContent(false)
      }
    }

    const onWheel = (e) => {
      // Ya expandido y volviendo arriba del todo -> contraer.
      if (expandedRef.current && e.deltaY < 0 && window.scrollY <= 5) {
        expandedRef.current = false
        setMediaFullyExpanded(false)
        e.preventDefault()
      } else if (!expandedRef.current) {
        e.preventDefault()
        apply(e.deltaY * 0.0009)
      }
    }

    const onTouchStart = (e) => {
      touchStartRef.current = e.touches[0].clientY
    }
    const onTouchMove = (e) => {
      if (!touchStartRef.current) return
      const y = e.touches[0].clientY
      const dy = touchStartRef.current - y
      if (expandedRef.current && dy < -20 && window.scrollY <= 5) {
        expandedRef.current = false
        setMediaFullyExpanded(false)
        e.preventDefault()
      } else if (!expandedRef.current) {
        e.preventDefault()
        // Mayor sensibilidad al volver hacia atrás en móvil.
        apply(dy * (dy < 0 ? 0.008 : 0.005))
        touchStartRef.current = y
      }
    }
    const onTouchEnd = () => {
      touchStartRef.current = 0
    }
    // Mientras no esté expandido, mantenemos la página fija arriba.
    const onScroll = () => {
      if (!expandedRef.current) window.scrollTo(0, 0)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: false })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('scroll', onScroll)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // --- Detección de móvil (ajusta cuánto crece la imagen) ---
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const mediaWidth = 300 + scrollProgress * (isMobile ? 650 : 1250)
  const mediaHeight = 400 + scrollProgress * (isMobile ? 200 : 400)
  const textTranslateX = scrollProgress * (isMobile ? 180 : 150)

  const firstWord = title ? title.split(' ')[0] : ''
  const restOfTitle = title ? title.split(' ').slice(1).join(' ') : ''

  return (
    <div className="sem-root">
      <section className="sem-section">
        <div className="sem-stage">
          {/* Fondo: se desvanece a medida que la imagen central crece */}
          <motion.div
            className="sem-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 - scrollProgress }}
            transition={{ duration: 0.1 }}
          >
            <img src={bgImageSrc} alt="" className="sem-bg-img" loading="eager" />
            <div className="sem-bg-tint" />
          </motion.div>

          <div className="sem-content">
            <div className="sem-hero">
              {/* Imagen central que se expande con el scroll */}
              <div
                className="sem-media"
                style={{
                  width: `${mediaWidth}px`,
                  height: `${mediaHeight}px`,
                }}
              >
                <img src={mediaSrc} alt={title || 'IBM OfficeSpace'} className="sem-media-img" />
                <motion.div
                  className="sem-media-overlay"
                  initial={{ opacity: 0.32 }}
                  animate={{ opacity: 0.22 - scrollProgress * 0.12 }}
                  transition={{ duration: 0.2 }}
                />

                <div className="sem-media-caption">
                  {date && (
                    <p
                      className="sem-date"
                      style={{ transform: `translateX(-${textTranslateX}vw)` }}
                    >
                      {date}
                    </p>
                  )}
                  {scrollToExpand && (
                    <p
                      className="sem-hint"
                      style={{ transform: `translateX(${textTranslateX}vw)` }}
                    >
                      {scrollToExpand}
                    </p>
                  )}
                </div>
              </div>

              {/* Título dividido: las dos mitades se separan al hacer scroll */}
              <div
                className="sem-title"
                style={{ mixBlendMode: textBlend ? 'difference' : 'normal' }}
              >
                {firstWord && (
                  <h1
                    className="sem-title-word"
                    style={{ transform: `translateX(-${textTranslateX}vw)` }}
                  >
                    {firstWord}
                  </h1>
                )}
                {restOfTitle && (
                  <h1
                    className="sem-title-word"
                    style={{ transform: `translateX(${textTranslateX}vw)` }}
                  >
                    {restOfTitle}
                  </h1>
                )}
              </div>
            </div>

            {/* Contenido revelado tras expandir la imagen */}
            <motion.section
              className="sem-reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.7 }}
              style={{ pointerEvents: mediaFullyExpanded ? 'auto' : 'none' }}
            >
              {children}
            </motion.section>
          </div>
        </div>
      </section>
    </div>
  )
}
