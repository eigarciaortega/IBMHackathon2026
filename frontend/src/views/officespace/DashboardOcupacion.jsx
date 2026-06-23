import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CRow,
  CCol,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CSpinner,
  CAlert,
  CButton,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilRoom, cilPeople, cilCheckCircle, cilSearch, cilChartPie } from '@coreui/icons'

import { fetchOccupancy } from '../../api'
import { useTranslation } from '../../i18n'
import { fmtTime, fmtDate } from '../../utils'

function Kpi({ value, label, color }) {
  return (
    <CCard className="h-100">
      <CCardBody>
        <div className="kpi-valor" style={{ color }}>
          {value}
        </div>
        <div className="kpi-label mt-1">{label}</div>
      </CCardBody>
    </CCard>
  )
}

export default function DashboardOcupacion() {
  const { t, lang } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchOccupancy())
    } catch (e) {
      setError(t('errors.network'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }
  if (error) {
    return (
      <CAlert color="danger" className="d-flex justify-content-between align-items-center">
        {error}
        <CButton size="sm" color="danger" variant="outline" onClick={load}>
          {t('common.retry')}
        </CButton>
      </CAlert>
    )
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-end mb-4 gap-2">
        <div>
          <h1 className="h3 mb-1">{t('dashboard.title')}</h1>
          <p className="text-body-secondary mb-0">
            {t('dashboard.subtitle')} · {fmtDate(data.date, lang)}
          </p>
        </div>
        <div className="d-flex gap-2">
          <CButton color="primary" onClick={() => navigate('/buscar')}>
            <CIcon icon={cilSearch} className="me-2" />
            {t('dashboard.goSearch')}
          </CButton>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/analiticas')}>
            <CIcon icon={cilChartPie} className="me-2" />
            {t('dashboard.goAnalytics')}
          </CButton>
        </div>
      </div>

      <CRow className="g-3 mb-4">
        <CCol xs={6} lg={3}>
          <Kpi value={data.totalSpaces} label={t('dashboard.totalSpaces')} color="#0f62fe" />
        </CCol>
        <CCol xs={6} lg={3}>
          <Kpi value={data.occupiedSpaces} label={t('dashboard.occupied')} color="#da1e28" />
        </CCol>
        <CCol xs={6} lg={3}>
          <Kpi value={data.freeSpaces} label={t('dashboard.free')} color="#24a148" />
        </CCol>
        <CCol xs={6} lg={3}>
          <Kpi value={`${data.occupancyRate}%`} label={t('dashboard.occupancyRate')} color="#161616" />
        </CCol>
      </CRow>

      <CCard>
        <CCardBody>
          <h2 className="h5 mb-3">{t('dashboard.todaysBookings')}</h2>
          {data.bookings.length === 0 ? (
            <p className="text-body-secondary mb-0">{t('dashboard.noBookings')}</p>
          ) : (
            <CTable hover responsive align="middle" className="mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>{t('dashboard.space')}</CTableHeaderCell>
                  <CTableHeaderCell>{t('common.type')}</CTableHeaderCell>
                  <CTableHeaderCell>{t('dashboard.organizer')}</CTableHeaderCell>
                  <CTableHeaderCell>{t('dashboard.schedule')}</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">{t('common.attendees')}</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.bookings.map((b) => (
                  <CTableRow key={b.id}>
                    <CTableDataCell>
                      <div className="fw-semibold">{b.space_name}</div>
                      <div className="small text-body-secondary">{b.floor}</div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={b.space_type === 'SALA' ? 'info' : 'secondary'}>
                        {t(`spaceTypes.${b.space_type}`)}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>{b.user_name}</CTableDataCell>
                    <CTableDataCell>
                      {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      <CIcon icon={cilPeople} className="me-1 text-body-secondary" />
                      {b.attendees}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}
