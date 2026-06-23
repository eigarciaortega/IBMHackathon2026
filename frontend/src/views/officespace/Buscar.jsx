import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CRow,
  CCol,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CButton,
  CSpinner,
  CAlert,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPeople, cilArrowRight, cilCheckCircle } from '@coreui/icons'

import { searchAvailability } from '../../api'
import { useTranslation } from '../../i18n'
import { todayISO, fmtTime, resourceChips, isPast } from '../../utils'

export default function Buscar() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    date: todayISO(),
    start: '09:00',
    end: '10:00',
    type: '',
    minCapacity: '',
  })
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const validate = () => {
    if (form.end <= form.start) return t('search.invalidRange')
    if (isPast(form.date, form.start)) return t('search.pastDate')
    return ''
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    const v = validate()
    if (v) {
      setError(v)
      setResults(null)
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await searchAvailability({
        date: form.date,
        start: form.start,
        end: form.end,
        type: form.type || undefined,
        minCapacity: form.minCapacity || undefined,
      })
      setResults(data)
    } catch (err) {
      setError(err.message || t('errors.network'))
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const reserve = (space) => {
    navigate('/reservar', {
      state: { space, date: form.date, start: form.start, end: form.end },
    })
  }

  return (
    <div>
      <h1 className="h3 mb-1">{t('search.title')}</h1>
      <p className="text-body-secondary mb-4">{t('search.subtitle')}</p>

      <CCard className="mb-4">
        <CCardBody>
          <CForm onSubmit={handleSearch}>
            <CRow className="g-3 align-items-end">
              <CCol md={3}>
                <CFormLabel>{t('search.date')}</CFormLabel>
                <CFormInput type="date" value={form.date} min={todayISO()} onChange={update('date')} />
              </CCol>
              <CCol md={2}>
                <CFormLabel>{t('search.startTime')}</CFormLabel>
                <CFormInput type="time" value={form.start} onChange={update('start')} />
              </CCol>
              <CCol md={2}>
                <CFormLabel>{t('search.endTime')}</CFormLabel>
                <CFormInput type="time" value={form.end} onChange={update('end')} />
              </CCol>
              <CCol md={2}>
                <CFormLabel>{t('search.type')}</CFormLabel>
                <CFormSelect value={form.type} onChange={update('type')}>
                  <option value="">{t('search.anyType')}</option>
                  <option value="SALA">{t('spaceTypes.SALA')}</option>
                  <option value="ESCRITORIO">{t('spaceTypes.ESCRITORIO')}</option>
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormLabel>{t('search.minCapacity')}</CFormLabel>
                <CFormInput
                  type="number"
                  min={1}
                  placeholder="1"
                  value={form.minCapacity}
                  onChange={update('minCapacity')}
                />
              </CCol>
              <CCol md={1}>
                <CButton type="submit" color="primary" className="w-100" disabled={loading} title={t('search.searchBtn')}>
                  {loading ? <CSpinner size="sm" /> : <CIcon icon={cilSearch} />}
                </CButton>
              </CCol>
            </CRow>
          </CForm>
        </CCardBody>
      </CCard>

      {error && <CAlert color="warning">{error}</CAlert>}

      {!results && !error && (
        <CCard className="border-0 bg-body-tertiary">
          <CCardBody className="text-center py-5">
            <CIcon icon={cilSearch} size="3xl" className="text-body-secondary mb-3" />
            <h2 className="h5">{t('search.hintTitle')}</h2>
            <p className="text-body-secondary mb-0">{t('search.hintBody')}</p>
          </CCardBody>
        </CCard>
      )}

      {results && (
        <>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="h5 mb-0">{t('search.results')}</h2>
            <CBadge color="primary" shape="rounded-pill">
              {t('search.resultsCount', { count: results.length })}
            </CBadge>
          </div>

          {results.length === 0 ? (
            <CAlert color="info">{t('search.noResults')}</CAlert>
          ) : (
            <CRow className="g-3">
              {results.map((s) => {
                const chips = resourceChips(s, t)
                return (
                  <CCol md={6} xl={4} key={s.id}>
                    <CCard className="h-100">
                      <CCardBody className="d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h3 className="h6 mb-0">{s.name}</h3>
                          <CBadge color={s.type === 'SALA' ? 'info' : 'secondary'}>
                            {t(`spaceTypes.${s.type}`)}
                          </CBadge>
                        </div>
                        <div className="small text-body-secondary mb-2">
                          {s.floor}
                          {s.location ? ` · ${s.location}` : ''}
                        </div>
                        <div className="mb-2">
                          <CIcon icon={cilPeople} className="me-1 text-body-secondary" />
                          <span className="fw-semibold">{s.capacity}</span>{' '}
                          <span className="text-body-secondary small">{t('common.people')}</span>
                        </div>
                        {chips.length > 0 && (
                          <div className="d-flex flex-wrap gap-1 mb-3">
                            {chips.map((c) => (
                              <CBadge key={c} color="light" textColor="dark" className="border">
                                {c}
                              </CBadge>
                            ))}
                          </div>
                        )}
                        <div className="mt-auto d-flex align-items-center justify-content-between">
                          <span className="estado-pill estado-pill--libre">
                            <CIcon icon={cilCheckCircle} size="sm" />
                            {fmtTime(form.start)}–{fmtTime(form.end)}
                          </span>
                          <CButton color="primary" size="sm" onClick={() => reserve(s)}>
                            {t('search.reserve')}
                            <CIcon icon={cilArrowRight} className="ms-2" />
                          </CButton>
                        </div>
                      </CCardBody>
                    </CCard>
                  </CCol>
                )
              })}
            </CRow>
          )}
        </>
      )}
    </div>
  )
}
