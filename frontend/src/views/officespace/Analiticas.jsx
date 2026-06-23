import React, { useEffect, useState, useCallback } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { CChart } from '@coreui/react-chartjs'
import { useNavigate } from 'react-router-dom'

import { fetchAnalytics } from '../../api'
import { useTranslation } from '../../i18n'

function Kpi({ value, label, detail, color }) {
  return (
    <CCard className="h-100 analytics-metric-card">
      <CCardBody>
        <div className="analytics-metric-value" style={{ color }}>
          {value}
        </div>
        <div className="analytics-metric-label mt-1">{label}</div>
        {detail ? <div className="analytics-metric-detail mt-2">{detail}</div> : null}
      </CCardBody>
    </CCard>
  )
}

export default function Analiticas() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchAnalytics())
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

  const totalBookings = data?.totals?.total || 0
  const confirmedBookings = data?.totals?.confirmadas || 0
  const cancelledBookings = data?.totals?.canceladas || 0
  const cancelRate = data?.cancelRate || 0
  const confirmationRate = totalBookings ? Math.round((confirmedBookings / totalBookings) * 100) : 0
  const hasData = totalBookings > 0
  const topSpaces = data?.topSpaces || []
  const peakHours = data?.peakHours || []
  const byType = data?.byType || []
  const byUser = data?.byUser || []
  const topSpace = topSpaces[0] || null
  const topSpaceShare = confirmedBookings && topSpace ? Math.round((topSpace.reservas / confirmedBookings) * 100) : 0
  const spacesWithDemand = topSpaces.filter((space) => space.reservas > 0).length
  const peakHour = peakHours.reduce((best, current) => {
    if (!best) return current
    return current.reservas > best.reservas ? current : best
  }, null)
  const dominantType = byType.reduce((best, current) => {
    if (!best) return current
    return current.reservas > best.reservas ? current : best
  }, null)
  const topBooker = byUser[0] || null
  const topBookerLabel = topBooker?.full_name || t('common.none')
  const topBookerCount = topBooker?.reservas || 0

  const topLabels = topSpaces.map((s) => s.name)
  const topValues = topSpaces.map((s) => s.reservas)
  const peakLabels = peakHours.map((h) => `${String(h.hora).padStart(2, '0')}:00`)
  const peakValues = peakHours.map((h) => h.reservas)
  const typeLabels = byType.map((r) => t(`spaceTypes.${r.type}`))
  const typeValues = byType.map((r) => r.reservas)
  const peakHourLabel = peakHour ? `${String(peakHour.hora).padStart(2, '0')}:00` : t('common.none')
  const dominantTypeLabel = dominantType ? t(`spaceTypes.${dominantType.type}`) : t('common.none')
  const formatter = new Intl.NumberFormat()
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { intersect: false, mode: 'index' },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(22, 22, 22, 0.08)' } },
    },
    elements: {
      bar: { borderRadius: 6 },
      line: { borderWidth: 2 },
    },
  }

  return (
    <div className="analytics-page">
      <div className="analytics-hero">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div className="analytics-hero__copy">
            <h1 className="h3 mb-1">{t('analytics.title')}</h1>
            <p className="text-body-secondary mb-0">{t('analytics.subtitle')}</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <CButton color="secondary" variant="outline" onClick={() => navigate('/dashboard')}>
              {t('analytics.backToDashboard')}
            </CButton>
            <CButton color="primary" onClick={load}>
              {t('analytics.refresh')}
            </CButton>
          </div>
        </div>
        <div className="analytics-hero__meta mt-3">
          <CBadge color="primary" shape="rounded-pill" className="me-2">
            {t('analytics.overviewTitle')}
          </CBadge>
          <span className="text-body-secondary">{t('analytics.overviewSubtitle')}</span>
        </div>
      </div>

      <CRow className="g-3">
        <CCol xs={6} lg={3}>
          <Kpi value={formatter.format(totalBookings)} label={t('analytics.totalBookings')} detail={t('analytics.overviewSubtitle')} color="#0f62fe" />
        </CCol>
        <CCol xs={6} lg={3}>
          <Kpi value={formatter.format(confirmedBookings)} label={t('analytics.confirmed')} detail={topSpace ? t('analytics.topSpaceShare', { share: `${topSpaceShare}%` }) : ''} color="#24a148" />
        </CCol>
        <CCol xs={6} lg={3}>
          <Kpi value={formatter.format(cancelledBookings)} label={t('analytics.cancelled')} detail={t('analytics.cancellationTrend')} color="#da1e28" />
        </CCol>
        <CCol xs={6} lg={3}>
          <Kpi value={`${cancelRate}%`} label={t('analytics.cancelRate')} detail={t('analytics.trendBasedOnAllBookings')} color="#161616" />
        </CCol>
      </CRow>

      <CRow className="g-3 mt-0">
        <CCol md={4}>
          <Kpi value={`${confirmationRate}%`} label={t('analytics.confirmationRate')} detail={t('analytics.confirmationRateHint')} color="#0f62fe" />
        </CCol>
        <CCol md={4}>
          <Kpi
            value={peakHourLabel}
            label={t('analytics.peakHour')}
            detail={peakHour ? formatter.format(peakHour.reservas) : t('analytics.noData')}
            color="#8a3ffc"
          />
        </CCol>
        <CCol md={4}>
          <Kpi
            value={topBookerLabel}
            label={t('analytics.topOrganizer')}
            detail={t('analytics.topOrganizerDetail', { count: formatter.format(topBookerCount) })}
            color="#24a148"
          />
        </CCol>
      </CRow>

      {!hasData ? (
        <CAlert color="info" className="analytics-empty-state mt-3 mb-0">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
            <div>
              <h2 className="h6 mb-1">{t('analytics.noDataTitle')}</h2>
              <p className="mb-0">{t('analytics.noData')}</p>
            </div>
            <CButton size="sm" color="info" variant="outline" onClick={load}>
              {t('analytics.refresh')}
            </CButton>
          </div>
        </CAlert>
      ) : (
        <CRow className="g-4 mt-0">
          <CCol xl={7}>
            <CCard className="analytics-panel h-100">
              <CCardBody>
                <div className="analytics-panel__header">
                  <div>
                    <h2 className="h5 mb-1">{t('analytics.topSpaces')}</h2>
                    <p className="text-body-secondary mb-0">{t('analytics.topSpacesHint')}</p>
                  </div>
                  <CBadge color="secondary" shape="rounded-pill">
                    {t('analytics.spacesWithDemand', { count: formatter.format(spacesWithDemand) })}
                  </CBadge>
                </div>
                <div className="analytics-chart analytics-chart--bar">
                  <CChart
                    type="bar"
                    data={{
                      labels: topLabels,
                      datasets: [
                        {
                          label: t('analytics.reservations'),
                          backgroundColor: '#0f62fe',
                          data: topValues,
                        },
                      ],
                    }}
                    options={chartOptions}
                  />
                </div>
                <div className="mt-4">
                  <CTable hover responsive align="middle" className="mb-0 analytics-ranking">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>{t('analytics.rankingSpace')}</CTableHeaderCell>
                        <CTableHeaderCell>{t('analytics.rankingType')}</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">{t('analytics.rankingBookings')}</CTableHeaderCell>
                        <CTableHeaderCell>{t('analytics.rankingShare')}</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {topSpaces.slice(0, 5).map((space, index) => {
                        const share = topSpaces[0]?.reservas ? Math.round((space.reservas / topSpaces[0].reservas) * 100) : 0
                        return (
                          <CTableRow key={space.id}>
                            <CTableDataCell>
                              <div className="analytics-rank">
                                <span className="analytics-rank__index">{index + 1}</span>
                                <div>
                                  <div className="fw-semibold">{space.name}</div>
                                  <div className="small text-body-secondary">{t(`spaceTypes.${space.type}`)}</div>
                                </div>
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color="light" textColor="dark">
                                {t(`spaceTypes.${space.type}`)}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell className="text-end fw-semibold">
                              {formatter.format(space.reservas)}
                            </CTableDataCell>
                            <CTableDataCell>
                              <div className="analytics-share">
                                <div className="d-flex justify-content-between small mb-1">
                                  <span>{share}%</span>
                                  <span className="text-body-secondary">{t('analytics.relativeToLeader')}</span>
                                </div>
                                <div className="progress analytics-share__bar" role="progressbar">
                                  <div
                                    className="progress-bar"
                                    style={{ width: `${share}%` }}
                                    aria-valuenow={share}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                  />
                                </div>
                              </div>
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>
                </div>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol xl={5} className="d-flex flex-column gap-4">
            <CCard className="analytics-panel flex-fill">
              <CCardBody>
                <div className="analytics-panel__header">
                  <div>
                    <h2 className="h5 mb-1">{t('analytics.byType')}</h2>
                    <p className="text-body-secondary mb-0">{t('analytics.byTypeHint')}</p>
                  </div>
                  <CBadge color="secondary" shape="rounded-pill">
                    {dominantType ? dominantTypeLabel : t('analytics.noData')}
                  </CBadge>
                </div>
                <div className="analytics-chart analytics-chart--doughnut">
                  <CChart
                    type="doughnut"
                    data={{
                      labels: typeLabels,
                      datasets: [
                        {
                          backgroundColor: ['#0f62fe', '#24a148', '#8a3ffc', '#f1c21b'],
                          data: typeValues,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '68%',
                      plugins: {
                        legend: { position: 'bottom' },
                        tooltip: { intersect: false, mode: 'index' },
                      },
                    }}
                  />
                </div>
              </CCardBody>
            </CCard>

            <CCard className="analytics-panel flex-fill">
              <CCardBody>
                <div className="analytics-panel__header">
                  <div>
                    <h2 className="h5 mb-1">{t('analytics.peakHours')}</h2>
                    <p className="text-body-secondary mb-0">{t('analytics.peakHoursHint')}</p>
                  </div>
                  <CBadge color="secondary" shape="rounded-pill">
                    {peakHour ? `${peakHourLabel} · ${formatter.format(peakHour.reservas)}` : t('analytics.noData')}
                  </CBadge>
                </div>
                <div className="analytics-chart analytics-chart--line">
                  <CChart
                    type="line"
                    data={{
                      labels: peakLabels,
                      datasets: [
                        {
                          label: t('analytics.reservations'),
                          borderColor: '#0f62fe',
                          backgroundColor: 'rgba(15, 98, 254, 0.14)',
                          fill: true,
                          tension: 0.3,
                          pointBackgroundColor: '#0f62fe',
                          pointRadius: 3,
                          pointHoverRadius: 4,
                          data: peakValues,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: { intersect: false, mode: 'index' },
                      },
                      scales: {
                        x: { grid: { display: false } },
                        y: {
                          beginAtZero: true,
                          ticks: { precision: 0 },
                          grid: { color: 'rgba(22, 22, 22, 0.08)' },
                        },
                      },
                    }}
                  />
                </div>
              </CCardBody>
            </CCard>

            <CCard className="analytics-panel flex-fill">
              <CCardBody>
                <div className="analytics-panel__header">
                  <div>
                    <h2 className="h5 mb-1">{t('analytics.bookersTitle')}</h2>
                    <p className="text-body-secondary mb-0">{t('analytics.bookersSubtitle')}</p>
                  </div>
                </div>
                <CListGroup flush className="analytics-insights">
                  {byUser.length === 0 ? (
                    <CListGroupItem className="px-0">{t('analytics.bookersNone')}</CListGroupItem>
                  ) : (
                    byUser.map((user, index) => (
                      <CListGroupItem
                        key={user.user_id}
                        className="px-0 d-flex justify-content-between align-items-start gap-3"
                      >
                        <div>
                          <div className="fw-semibold">
                            <span className="analytics-rank__index me-2">{index + 1}</span>
                            {user.full_name}
                          </div>
                          <div className="small text-body-secondary">
                            {index === 0 ? t('analytics.topOrganizerLead') : t('analytics.topOrganizerFollower')}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-semibold">{formatter.format(user.reservas)}</div>
                          <div className="small text-body-secondary">{t('analytics.bookingsMade')}</div>
                        </div>
                      </CListGroupItem>
                    ))
                  )}
                </CListGroup>
              </CCardBody>
            </CCard>

            <CCard className="analytics-panel flex-fill">
              <CCardBody>
                <div className="analytics-panel__header">
                  <div>
                    <h2 className="h5 mb-1">{t('analytics.insightsTitle')}</h2>
                    <p className="text-body-secondary mb-0">{t('analytics.insightsSubtitle')}</p>
                  </div>
                </div>
                <CListGroup flush className="analytics-insights">
                  <CListGroupItem className="px-0 d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <div className="fw-semibold">{t('analytics.topSpace')}</div>
                      <div className="text-body-secondary">{topSpace?.name || t('common.none')}</div>
                    </div>
                    <div className="text-end">
                      <div className="fw-semibold">{formatter.format(topSpace?.reservas || 0)}</div>
                      <div className="small text-body-secondary">
                        {t('analytics.topSpaceShare', { share: `${topSpaceShare}%` })}
                      </div>
                    </div>
                  </CListGroupItem>
                  <CListGroupItem className="px-0 d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <div className="fw-semibold">{t('analytics.dominantType')}</div>
                      <div className="text-body-secondary">{dominantTypeLabel}</div>
                    </div>
                    <div className="text-end">
                      <div className="fw-semibold">{dominantType ? formatter.format(dominantType.reservas) : '0'}</div>
                      <div className="small text-body-secondary">
                        {t('analytics.typeShare', {
                          share:
                            dominantType && confirmedBookings
                              ? Math.round((dominantType.reservas / confirmedBookings) * 100)
                              : 0,
                        })}
                      </div>
                    </div>
                  </CListGroupItem>
                  <CListGroupItem className="px-0 d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <div className="fw-semibold">{t('analytics.peakSlot')}</div>
                      <div className="text-body-secondary">{peakHourLabel}</div>
                    </div>
                    <div className="text-end">
                      <div className="fw-semibold">{formatter.format(peakHour?.reservas || 0)}</div>
                      <div className="small text-body-secondary">{t('analytics.peakSlotHint')}</div>
                    </div>
                  </CListGroupItem>
                  <CListGroupItem className="px-0 d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <div className="fw-semibold">{t('analytics.spacesWithDemandTitle')}</div>
                      <div className="text-body-secondary">{t('analytics.spacesWithDemandHint')}</div>
                    </div>
                    <div className="text-end">
                      <div className="fw-semibold">{formatter.format(spacesWithDemand)}</div>
                      <div className="small text-body-secondary">{t('analytics.spacesWithDemandLabel')}</div>
                    </div>
                  </CListGroupItem>
                </CListGroup>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}
    </div>
  )
}
