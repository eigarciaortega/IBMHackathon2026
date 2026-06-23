import React, { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CCard,
  CCardBody,
  CRow,
  CCol,
  CForm,
  CFormLabel,
  CFormInput,
  CFormCheck,
  CButton,
  CAlert,
  CSpinner,
  CBadge,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilArrowLeft, cilCalendarCheck, cilPeople } from '@coreui/icons'

import { createBooking, ApiError } from '../../api'
import { useTranslation } from '../../i18n'
import { fmtTime, fmtDate, resourceChips } from '../../utils'
import ReminderActions from '../../components/booking/ReminderActions'

export default function ConfirmarReserva() {
  const { t, lang } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const ctx = location.state

  const [attendees, setAttendees] = useState(1)
  const [title, setTitle] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [sendWhatsApp, setSendWhatsApp] = useState(false)
  const [sendGoogleCalendar, setSendGoogleCalendar] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [createdBooking, setCreatedBooking] = useState(null)

  // Sin contexto de búsqueda -> volver al buscador.
  if (!ctx || !ctx.space) return <Navigate to="/buscar" replace />
  const { space, date, start, end } = ctx

  const mapError = (err) => {
    if (err instanceof ApiError) {
      if (err.status === 409) return t('booking.errors.overlap')
      const codes = (err.data?.detalles || []).map((d) => d.code)
      if (codes.includes('CAPACIDAD_EXCEDIDA')) return t('booking.errors.capacity')
      if (codes.includes('FECHA_PASADA')) return t('booking.errors.past')
      if (codes.includes('ORDEN_HORARIO')) return t('booking.errors.order')
    }
    return t('booking.errors.generic')
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    setError('')
    if (attendees > space.capacity) {
      setError(t('booking.errors.capacity'))
      return
    }
    setLoading(true)
    try {
      if (sendWhatsApp && !whatsappNumber.trim()) {
        setError(t('booking.errors.whatsappPhone'))
        return
      }
      const reminderChannels = []
      if (sendEmail) reminderChannels.push('EMAIL')
      if (sendWhatsApp) reminderChannels.push('WHATSAPP')
      if (sendGoogleCalendar) reminderChannels.push('GOOGLE_CALENDAR')

      const booking = await createBooking({
        space_id: space.id,
        booking_date: date,
        start_time: start,
        end_time: end,
        attendees: Number(attendees),
        title: title.trim() || undefined,
        reminder_phone: whatsappNumber.trim() || undefined,
        reminder_channels: reminderChannels,
      })
      setCreatedBooking(booking)
      setDone(true)
    } catch (err) {
      setError(mapError(err))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    const bookingLocation = [space.floor, space.location].filter(Boolean).join(' · ')
    const reminder = createdBooking?.reminder || {}
    const reminderState = reminder.status || 'PENDING'
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="d-flex justify-content-center"
      >
        <CCard className="text-center" style={{ maxWidth: 520 }}>
          <CCardBody className="p-5">
            <CIcon icon={cilCheckCircle} size="4xl" className="text-success mb-3" />
            <h1 className="h4 mb-2">{t('booking.successTitle')}</h1>
            <p className="text-body-secondary">
              {t('booking.successMsg', {
                space: space.name,
                date: fmtDate(date, lang),
                start: fmtTime(start),
                end: fmtTime(end),
              })}
            </p>
            <div className="d-flex gap-2 justify-content-center mt-4">
              <CButton color="primary" onClick={() => navigate('/mis-reservas')}>
                {t('booking.viewMyBookings')}
              </CButton>
              <CButton color="secondary" variant="outline" onClick={() => navigate('/buscar')}>
                {t('booking.makeAnother')}
              </CButton>
            </div>
            <hr className="my-4" />
            {createdBooking?.reminder && (
              <div className="mb-4 text-start">
                <h2 className="h6 text-uppercase text-body-secondary mb-3">
                  {t('booking.reminderScheduled')}
                </h2>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <CBadge color="primary">{t(`booking.reminderState.${reminderState}`)}</CBadge>
                  {reminder.email_status && (
                    <CBadge color={reminder.email_status === 'SENT' ? 'success' : reminder.email_status === 'PENDING' ? 'warning' : 'secondary'}>
                      {t(`booking.deliveryState.email.${reminder.email_status}`)}
                    </CBadge>
                  )}
                  {reminder.whatsapp_status && (
                    <CBadge color={reminder.whatsapp_status === 'SENT' ? 'success' : reminder.whatsapp_status === 'PENDING' ? 'warning' : 'secondary'}>
                      {t(`booking.deliveryState.whatsapp.${reminder.whatsapp_status}`)}
                    </CBadge>
                  )}
                  {reminder.google_calendar_url && (
                    <CBadge color="info">{t('booking.googleCalendarScheduled')}</CBadge>
                  )}
                </div>
                <p className="small text-body-secondary mb-0">
                  {t('booking.reminderQueued', { when: fmtDate(date, lang) })}
                </p>
              </div>
            )}
            <ReminderActions
              title={title.trim() || space.name}
              date={date}
              start={start}
              end={end}
              location={bookingLocation}
              t={t}
              lang={lang}
              linksOverride={{
                whatsapp: reminder.whatsapp_link,
                google: reminder.google_calendar_url,
                outlook: reminder.outlook_calendar_url,
              }}
            />
          </CCardBody>
        </CCard>
      </motion.div>
    )
  }

  const chips = resourceChips(space, t)

  return (
    <div>
      <CButton color="link" className="px-0 mb-2" onClick={() => navigate('/buscar')}>
        <CIcon icon={cilArrowLeft} className="me-1" />
        {t('common.back')}
      </CButton>
      <h1 className="h3 mb-4">{t('booking.title')}</h1>

      <CRow className="g-4">
        <CCol md={6}>
          <CCard className="h-100">
            <CCardBody>
              <h2 className="h6 text-body-secondary text-uppercase mb-3">{t('booking.summary')}</h2>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between px-0">
                  <span className="text-body-secondary">{t('booking.space')}</span>
                  <span className="fw-semibold text-end">
                    {space.name}{' '}
                    <CBadge color={space.type === 'SALA' ? 'info' : 'secondary'}>
                      {t(`spaceTypes.${space.type}`)}
                    </CBadge>
                  </span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between px-0">
                  <span className="text-body-secondary">{t('common.location')}</span>
                  <span>{space.floor}{space.location ? ` · ${space.location}` : ''}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between px-0">
                  <span className="text-body-secondary">{t('booking.date')}</span>
                  <span>{fmtDate(date, lang)}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between px-0">
                  <span className="text-body-secondary">{t('booking.schedule')}</span>
                  <span className="fw-semibold">
                    {fmtTime(start)} – {fmtTime(end)}
                  </span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between px-0">
                  <span className="text-body-secondary">{t('common.capacity')}</span>
                  <span>
                    <CIcon icon={cilPeople} className="me-1 text-body-secondary" />
                    {space.capacity}
                  </span>
                </CListGroupItem>
              </CListGroup>
              {chips.length > 0 && (
                <div className="d-flex flex-wrap gap-1 mt-3">
                  {chips.map((c) => (
                    <CBadge key={c} color="light" textColor="dark" className="border">
                      {c}
                    </CBadge>
                  ))}
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={6}>
          <CCard className="h-100">
            <CCardBody>
              <CForm onSubmit={handleConfirm}>
                <div className="mb-3">
                  <CFormLabel>{t('booking.attendeesLabel')}</CFormLabel>
                  <CFormInput
                    type="number"
                    min={1}
                    max={space.capacity}
                    value={attendees}
                    onChange={(e) => setAttendees(e.target.value)}
                    required
                  />
                  <div className="form-text">{t('booking.attendeesHelp', { capacity: space.capacity })}</div>
                </div>
                <div className="mb-3">
                  <CFormLabel>{t('booking.motive')}</CFormLabel>
                  <CFormInput
                    type="text"
                    maxLength={160}
                    placeholder={t('booking.motivePlaceholder')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <CFormLabel>{t('booking.reminderTitle')}</CFormLabel>
                  <div className="d-grid gap-2">
                    <CFormCheck
                      id="rem-email"
                      checked={sendEmail}
                      label={t('booking.sendByEmail')}
                      onChange={(e) => setSendEmail(e.target.checked)}
                    />
                    <CFormCheck
                      id="rem-whatsapp"
                      checked={sendWhatsApp}
                      label={t('booking.sendByWhatsApp')}
                      onChange={(e) => setSendWhatsApp(e.target.checked)}
                    />
                    <CFormInput
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder={t('booking.whatsappPlaceholder')}
                      disabled={!sendWhatsApp}
                    />
                    <CFormCheck
                      id="rem-google"
                      checked={sendGoogleCalendar}
                      label={t('booking.addGoogleCalendar')}
                      onChange={(e) => setSendGoogleCalendar(e.target.checked)}
                    />
                  </div>
                  <div className="form-text">{t('booking.reminderHint')}</div>
                </div>

                {error && <CAlert color="danger" className="py-2">{error}</CAlert>}

                <CButton type="submit" color="primary" className="w-100" disabled={loading}>
                  {loading ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      {t('booking.reserving')}
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilCalendarCheck} className="me-2" />
                      {t('booking.confirmReserve')}
                    </>
                  )}
                </CButton>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}
