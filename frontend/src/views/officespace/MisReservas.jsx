import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CSpinner,
  CAlert,
  CButton,
  CBadge,
  CRow,
  CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalendarCheck, cilClock, cilTrash, cilSearch } from '@coreui/icons'

import { myBookings, cancelBooking } from '../../api'
import { useTranslation } from '../../i18n'
import { fmtTime, fmtDate, isPast } from '../../utils'
import ReminderActions from '../../components/booking/ReminderActions'

function BookingCard({ b, lang, t, onCancel, cancelling }) {
  const past = isPast(b.booking_date, b.start_time)
  const cancelled = b.status === 'CANCELADA'
  const bookingLocation = [b.floor, b.location].filter(Boolean).join(' · ')
  const reminderLabel = b.reminder_status ? t(`booking.reminderState.${b.reminder_status}`) : ''
  return (
    <CCard className="mb-3">
      <CCardBody className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="fw-semibold">{b.space_name}</span>
            <CBadge color={b.space_type === 'SALA' ? 'info' : 'secondary'}>
              {t(`spaceTypes.${b.space_type}`)}
            </CBadge>
            {cancelled && <CBadge color="danger">{t('myBookings.cancelled')}</CBadge>}
          </div>
          <div className="small text-body-secondary">
            {b.title} · {b.floor}
          </div>
          <div className="mt-1">
            <CIcon icon={cilCalendarCheck} className="me-1 text-body-secondary" size="sm" />
            {fmtDate(b.booking_date, lang)}
            <CIcon icon={cilClock} className="ms-3 me-1 text-body-secondary" size="sm" />
            {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
          </div>
          {bookingLocation && <div className="small text-body-secondary mt-1">{bookingLocation}</div>}
          {(b.reminder_status || b.google_calendar_url) && (
            <div className="d-flex flex-wrap gap-2 mt-3">
              {reminderLabel && <CBadge color="primary">{reminderLabel}</CBadge>}
              {b.email_status && (
                <CBadge color={b.email_status === 'SENT' ? 'success' : b.email_status === 'PENDING' ? 'warning' : 'secondary'}>
                  {t(`booking.deliveryState.email.${b.email_status}`)}
                </CBadge>
              )}
              {b.whatsapp_status && (
                <CBadge color={b.whatsapp_status === 'SENT' ? 'success' : b.whatsapp_status === 'PENDING' ? 'warning' : 'secondary'}>
                  {t(`booking.deliveryState.whatsapp.${b.whatsapp_status}`)}
                </CBadge>
              )}
              {b.google_calendar_url && <CBadge color="info">{t('booking.googleCalendarScheduled')}</CBadge>}
            </div>
          )}
        </div>
        <div className="d-flex flex-column align-items-end gap-2">
          {!cancelled && !past && (
            <CButton
              color="danger"
              variant="outline"
              size="sm"
              disabled={cancelling}
              onClick={() => onCancel(b)}
            >
              {cancelling ? <CSpinner size="sm" /> : <CIcon icon={cilTrash} className="me-1" />}
              {t('myBookings.cancel')}
            </CButton>
          )}
          {!cancelled && !past && (
            <ReminderActions
              title={b.title || b.space_name}
              date={b.booking_date}
              start={b.start_time}
              end={b.end_time}
              location={bookingLocation}
              t={t}
              lang={lang}
              linksOverride={{
                google: b.google_calendar_url,
                outlook: b.outlook_calendar_url,
              }}
            />
          )}
        </div>
      </CCardBody>
    </CCard>
  )
}

export default function MisReservas() {
  const { t, lang } = useTranslation()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cancelId, setCancelId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setBookings(await myBookings())
    } catch (e) {
      setError(t('errors.network'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const handleCancel = async (b) => {
    if (!window.confirm(t('myBookings.cancelConfirm'))) return
    setCancelId(b.id)
    setNotice('')
    try {
      await cancelBooking(b.id)
      setNotice(t('myBookings.cancelSuccess'))
      await load()
    } catch (e) {
      setError(e.message || t('errors.network'))
    } finally {
      setCancelId(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  const upcoming = bookings.filter((b) => b.status === 'CONFIRMADA' && !isPast(b.booking_date, b.start_time))
  const past = bookings.filter((b) => b.status === 'CONFIRMADA' && isPast(b.booking_date, b.start_time))
  const cancelled = bookings.filter((b) => b.status === 'CANCELADA')

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-end mb-4 gap-2">
        <div>
          <h1 className="h3 mb-1">{t('myBookings.title')}</h1>
          <p className="text-body-secondary mb-0">{t('myBookings.subtitle')}</p>
        </div>
        <CButton color="primary" onClick={() => navigate('/buscar')}>
          <CIcon icon={cilSearch} className="me-2" />
          {t('myBookings.book')}
        </CButton>
      </div>

      {notice && (
        <CAlert color="success" dismissible onClose={() => setNotice('')}>
          {notice}
        </CAlert>
      )}
      {error && <CAlert color="danger">{error}</CAlert>}

      {bookings.length === 0 ? (
        <CCard className="border-0 bg-body-tertiary">
          <CCardBody className="text-center py-5">
            <CIcon icon={cilCalendarCheck} size="3xl" className="text-body-secondary mb-3" />
            <p className="text-body-secondary mb-3">{t('myBookings.none')}</p>
            <CButton color="primary" onClick={() => navigate('/buscar')}>
              {t('myBookings.book')}
            </CButton>
          </CCardBody>
        </CCard>
      ) : (
        <CRow>
          <CCol lg={7}>
            <h2 className="h6 text-uppercase text-body-secondary mb-3">
              {t('myBookings.upcoming')} <CBadge color="primary">{upcoming.length}</CBadge>
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-body-secondary">{t('myBookings.none')}</p>
            ) : (
              upcoming.map((b) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  lang={lang}
                  t={t}
                  onCancel={handleCancel}
                  cancelling={cancelId === b.id}
                />
              ))
            )}
          </CCol>
          <CCol lg={5}>
            {past.length > 0 && (
              <>
                <h2 className="h6 text-uppercase text-body-secondary mb-3">
                  {t('myBookings.past')} <CBadge color="secondary">{past.length}</CBadge>
                </h2>
                {past.map((b) => (
                  <BookingCard key={b.id} b={b} lang={lang} t={t} onCancel={handleCancel} />
                ))}
              </>
            )}
            {cancelled.length > 0 && (
              <>
                <h2 className="h6 text-uppercase text-body-secondary mb-3 mt-3">
                  {t('myBookings.cancelled')} <CBadge color="danger">{cancelled.length}</CBadge>
                </h2>
                {cancelled.map((b) => (
                  <BookingCard key={b.id} b={b} lang={lang} t={t} onCancel={handleCancel} />
                ))}
              </>
            )}
          </CCol>
        </CRow>
      )}
    </div>
  )
}
