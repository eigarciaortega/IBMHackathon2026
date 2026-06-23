import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCol,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilArrowRight, cilCalendar, cilExternalLink } from '@coreui/icons'

import { fetchCalendarBookings, fetchCalendarEmbed } from '../../api'
import { fmtDate, fmtTime, todayISO } from '../../utils'
import { useTranslation } from '../../i18n'

const ROLE_META = {
  ADMINISTRADOR: { badge: 'danger', dot: '#da1e28' },
  COLABORADOR: { badge: 'primary', dot: '#0f62fe' },
}

const LOCALES = { es: 'es-MX', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' }

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function parseISODate(value) {
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function mondayStart(date) {
  const next = new Date(date)
  const offset = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - offset)
  return next
}

function monthGridRange(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  const start = mondayStart(first)
  const end = addDays(mondayStart(last), 6)
  return { start, end }
}

function monthLabel(date, lang) {
  return date.toLocaleDateString(LOCALES[lang] || 'es-MX', { month: 'long', year: 'numeric' })
}

function weekLabels(lang) {
  const base = new Date(2026, 0, 5)
  return Array.from({ length: 7 }, (_, index) =>
    addDays(base, index).toLocaleDateString(LOCALES[lang] || 'es-MX', { weekday: 'short' }),
  )
}

function groupBookings(bookings) {
  return bookings.reduce((acc, booking) => {
    const key = String(booking.booking_date).slice(0, 10)
    acc[key] = acc[key] || []
    acc[key].push(booking)
    return acc
  }, {})
}

function bookingRole(booking) {
  return booking.user_role === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'COLABORADOR'
}

function BookingMini({ booking }) {
  const role = bookingRole(booking)
  return (
    <div className="calendar-event">
      <span className="calendar-event__time">{fmtTime(booking.start_time)}</span>
      <span className="calendar-event__name">{booking.space_name}</span>
      <span className="calendar-event__dot" style={{ background: ROLE_META[role].dot }} />
    </div>
  )
}

function BookingDetail({ booking, lang, t }) {
  const role = bookingRole(booking)
  const roleLabel = t(`roles.${role}`)
  const typeLabel = t(`spaceTypes.${booking.space_type}`)
  const meta = [booking.floor, booking.location, typeLabel].filter(Boolean).join(' · ')

  return (
    <CListGroupItem className="calendar-detail-item">
      <div className="d-flex justify-content-between gap-3">
        <div className="min-w-0">
          <div className="fw-semibold text-truncate">{booking.space_name}</div>
          <div className="small text-body-secondary">
            {fmtTime(booking.start_time)} - {fmtTime(booking.end_time)}
          </div>
          <div className="small text-body-secondary">{meta}</div>
          <div className="small text-body-secondary">
            {booking.user_name ? `${booking.user_name} · ` : ''}
            {fmtDate(booking.booking_date, lang)}
          </div>
        </div>
        <CBadge color={ROLE_META[role].badge} className="calendar-role-badge">
          {roleLabel}
        </CBadge>
      </div>
    </CListGroupItem>
  )
}

export default function CalendarioOcupacion() {
  const { lang, t } = useTranslation()
  const today = todayISO()
  const [month, setMonth] = useState(() => parseISODate(today))
  const [selectedDate, setSelectedDate] = useState(today)
  const [config, setConfig] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const range = useMemo(() => monthGridRange(month), [month])
  const rangeStart = toISODate(range.start)
  const rangeEnd = toISODate(range.end)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [calendarResult, configResult] = await Promise.allSettled([
        fetchCalendarBookings({ start: rangeStart, end: rangeEnd }),
        fetchCalendarEmbed(),
      ])

      if (calendarResult.status === 'rejected') throw calendarResult.reason

      setBookings(calendarResult.value.bookings || [])
      setConfig(configResult.status === 'fulfilled' ? configResult.value : null)
    } catch (err) {
      setError(t('errors.network'))
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [rangeEnd, rangeStart, t])

  useEffect(() => {
    load()
  }, [load])

  const byDate = useMemo(() => groupBookings(bookings), [bookings])
  const days = useMemo(
    () => Array.from({ length: 42 }, (_, index) => addDays(range.start, index)),
    [range.start],
  )
  const selectedBookings = (byDate[selectedDate] || []).sort((a, b) =>
    String(a.start_time).localeCompare(String(b.start_time)),
  )
  const monthBookings = bookings.length
  const selectedRooms = new Set(selectedBookings.map((booking) => booking.space_id)).size
  const adminBookings = selectedBookings.filter((booking) => bookingRole(booking) === 'ADMINISTRADOR').length
  const collaboratorBookings = selectedBookings.length - adminBookings

  const goToday = () => {
    const parsedToday = parseISODate(today)
    setMonth(new Date(parsedToday.getFullYear(), parsedToday.getMonth(), 1))
    setSelectedDate(today)
  }

  return (
    <div className="calendar-page">
      <div className="calendar-page__header">
        <div>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <CBadge color="info">{t('calendar.allBookingsNote')}</CBadge>
            <CBadge color={config?.configured ? 'success' : 'secondary'}>
              {config?.configured ? t('calendar.googleConnected') : t('calendar.internalMode')}
            </CBadge>
          </div>
          <h1 className="h3 mb-2">{t('calendar.title')}</h1>
          <p className="text-body-secondary mb-0">{t('calendar.subtitle')}</p>
        </div>
        <div className="calendar-page__actions">
          {config?.configured && (
            <CButton color="secondary" variant="outline" href={config.embedUrl} target="_blank" rel="noreferrer">
              <CIcon icon={cilExternalLink} className="me-2" />
              {t('calendar.openInGoogle')}
            </CButton>
          )}
          <CButton color="primary" variant="outline" onClick={load} disabled={loading}>
            {t('calendar.refresh')}
          </CButton>
        </div>
      </div>

      {error && (
        <CAlert color="danger" className="calendar-alert d-flex justify-content-between align-items-center gap-3">
          <span>{error}</span>
          <CButton size="sm" color="danger" variant="outline" onClick={load}>
            {t('common.retry')}
          </CButton>
        </CAlert>
      )}

      <CRow className="g-4 align-items-start">
        <CCol xl={8}>
          <CCard className="calendar-panel">
            <CCardBody>
              <div className="calendar-toolbar">
                <CButtonGroup role="group" aria-label={t('calendar.monthNavigation')}>
                  <CButton color="secondary" variant="outline" onClick={() => setMonth((value) => addMonths(value, -1))}>
                    <CIcon icon={cilArrowLeft} />
                  </CButton>
                  <CButton color="secondary" variant="outline" onClick={goToday}>
                    {t('common.today')}
                  </CButton>
                  <CButton color="secondary" variant="outline" onClick={() => setMonth((value) => addMonths(value, 1))}>
                    <CIcon icon={cilArrowRight} />
                  </CButton>
                </CButtonGroup>
                <div className="calendar-toolbar__month">{monthLabel(month, lang)}</div>
                <div className="text-body-secondary small">
                  {t('calendar.monthBookings', { count: monthBookings })}
                </div>
              </div>

              <div className="calendar-grid" aria-label={t('calendar.title')}>
                {weekLabels(lang).map((label) => (
                  <div key={label} className="calendar-grid__weekday">
                    {label}
                  </div>
                ))}

                {days.map((day) => {
                  const key = toISODate(day)
                  const dayBookings = byDate[key] || []
                  const inMonth = day.getMonth() === month.getMonth()
                  const isSelected = key === selectedDate
                  const isToday = key === today

                  return (
                    <button
                      key={key}
                      type="button"
                      className={[
                        'calendar-day',
                        inMonth ? '' : 'calendar-day--muted',
                        isSelected ? 'calendar-day--selected' : '',
                        isToday ? 'calendar-day--today' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => setSelectedDate(key)}
                    >
                      <span className="calendar-day__number">{day.getDate()}</span>
                      <span className="calendar-day__events">
                        {dayBookings.slice(0, 3).map((booking) => (
                          <BookingMini key={booking.id} booking={booking} />
                        ))}
                        {dayBookings.length > 3 && (
                          <span className="calendar-day__more">
                            {t('calendar.moreBookings', { count: dayBookings.length - 3 })}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xl={4}>
          <CCard className="calendar-panel">
            <CCardBody className="calendar-side">
              <div className="calendar-side__header">
                <div>
                  <h2 className="h5 mb-1">{fmtDate(selectedDate, lang)}</h2>
                  <p className="text-body-secondary small mb-0">{t('calendar.dayHint')}</p>
                </div>
                {loading && <CSpinner color="primary" size="sm" />}
              </div>

              <div className="calendar-stats">
                <div>
                  <span>{t('calendar.dayBookings')}</span>
                  <strong>{selectedBookings.length}</strong>
                </div>
                <div>
                  <span>{t('calendar.occupiedCount')}</span>
                  <strong>{selectedRooms}</strong>
                </div>
                <div>
                  <span>{t('calendar.legendAdmin')}</span>
                  <strong>{adminBookings}</strong>
                </div>
                <div>
                  <span>{t('calendar.legendCollaborator')}</span>
                  <strong>{collaboratorBookings}</strong>
                </div>
              </div>

              <div className="calendar-legend">
                <span>
                  <i style={{ background: ROLE_META.ADMINISTRADOR.dot }} />
                  {t('calendar.legendAdmin')}
                </span>
                <span>
                  <i style={{ background: ROLE_META.COLABORADOR.dot }} />
                  {t('calendar.legendCollaborator')}
                </span>
              </div>

              <CListGroup flush className="calendar-detail-list">
                {!loading && selectedBookings.length === 0 ? (
                  <div className="calendar-empty">
                    <CIcon icon={cilCalendar} size="xl" />
                    <div>{t('calendar.todayEmpty')}</div>
                  </div>
                ) : (
                  selectedBookings.map((booking) => (
                    <BookingDetail key={booking.id} booking={booking} lang={lang} t={t} />
                  ))
                )}
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}
