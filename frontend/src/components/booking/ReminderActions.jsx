import React from 'react'
import { CButton, CButtonGroup } from '@coreui/react'

import { buildReminderLinks, fmtDate, fmtTime } from '../../utils'

export default function ReminderActions({ title, date, start, end, location, t, lang, linksOverride }) {
  const fallbackLinks = buildReminderLinks({
    title,
    date,
    start,
    end,
    location,
    details: t('booking.reminderDetails', {
      title: title || t('booking.title'),
      date: fmtDate(date, lang),
      start: fmtTime(start),
      end: fmtTime(end),
      location,
    }),
  })
  const links = { ...fallbackLinks, ...(linksOverride || {}) }

  return (
    <div>
      <div className="small text-body-secondary mb-2">{t('booking.reminderHint')}</div>
      <CButtonGroup className="flex-wrap gap-2">
        <CButton color="success" variant="outline" href={links.whatsapp} target="_blank" rel="noreferrer">
          {t('booking.whatsappReminder')}
        </CButton>
        <CButton color="primary" variant="outline" href={links.google} target="_blank" rel="noreferrer">
          {t('booking.googleCalendar')}
        </CButton>
        <CButton color="secondary" variant="outline" href={links.outlook} target="_blank" rel="noreferrer">
          {t('booking.outlookCalendar')}
        </CButton>
      </CButtonGroup>
    </div>
  )
}
