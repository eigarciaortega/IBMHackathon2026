import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
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
import { todayISO, fmtTime, fmtDate, resourceChips, isPast } from '../../utils'

function toDateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function toTimeInputValue(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function defaultSearchWindow() {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)

  const end = new Date(start)
  end.setHours(end.getHours() + 1)

  return {
    date: toDateInputValue(start),
    start: toTimeInputValue(start),
    end: toTimeInputValue(end),
    type: '',
    minCapacity: '',
  }
}

export default function Buscar() {
  const { t, lang } = useTranslation()
  const navigate = useNavigate()

  const [form, setForm] = useState(defaultSearchWindow)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const validate = () => {
    if (!form.date || !form.start || !form.end) return t('search.requiredFields')
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

  const scheduleText =
    form.start && form.end ? `${fmtTime(form.start)} - ${fmtTime(form.end)}` : t('common.none')
  const selectedType = form.type ? t(`spaceTypes.${form.type}`) : t('search.anyType')
  const capacityText = form.minCapacity
    ? `${form.minCapacity}+ ${t('common.people')}`
    : t('search.anyType')
  const criteria = [
    { label: t('search.date'), value: fmtDate(form.date, lang) },
    { label: t('common.time'), value: scheduleText },
    { label: t('search.type'), value: selectedType },
    { label: t('search.minCapacity'), value: capacityText },
  ]

  return (
    <div className="search-page">
      <header className="search-page__header">
        <div className="search-page__intro">
          <h1 className="search-page__title">{t('search.title')}</h1>
          <p className="search-page__subtitle">{t('search.subtitle')}</p>
        </div>

        <div className="search-criteria" aria-label={t('search.subtitle')}>
          {criteria.map((item) => (
            <div className="search-criteria__item" key={item.label}>
              <span className="search-criteria__label">{item.label}</span>
              <span className="search-criteria__value">{item.value}</span>
            </div>
          ))}
        </div>
      </header>

      <CCard className="search-panel mb-4">
        <CCardBody className="search-panel__body">
          <CForm className="search-form" onSubmit={handleSearch}>
            <div className="search-form__grid">
              <div className="search-field">
                <CFormLabel>{t('search.date')}</CFormLabel>
                <CFormInput
                  type="date"
                  value={form.date}
                  min={todayISO()}
                  onChange={update('date')}
                />
              </div>
              <div className="search-field">
                <CFormLabel>{t('search.startTime')}</CFormLabel>
                <CFormInput type="time" value={form.start} onChange={update('start')} />
              </div>
              <div className="search-field">
                <CFormLabel>{t('search.endTime')}</CFormLabel>
                <CFormInput type="time" value={form.end} onChange={update('end')} />
              </div>
              <div className="search-field">
                <CFormLabel>{t('search.type')}</CFormLabel>
                <CFormSelect value={form.type} onChange={update('type')}>
                  <option value="">{t('search.anyType')}</option>
                  <option value="SALA">{t('spaceTypes.SALA')}</option>
                  <option value="ESCRITORIO">{t('spaceTypes.ESCRITORIO')}</option>
                </CFormSelect>
              </div>
              <div className="search-field">
                <CFormLabel>{t('search.minCapacity')}</CFormLabel>
                <CFormInput
                  type="number"
                  min={1}
                  placeholder="1"
                  value={form.minCapacity}
                  onChange={update('minCapacity')}
                />
              </div>
              <div className="search-form__action">
                <CButton
                  type="submit"
                  color="primary"
                  className="search-form__submit"
                  disabled={loading}
                  title={t('search.searchBtn')}
                >
                  {loading ? <CSpinner size="sm" /> : <CIcon icon={cilSearch} />}
                  <span>{loading ? t('search.searching') : t('search.searchBtn')}</span>
                </CButton>
              </div>
            </div>
          </CForm>
        </CCardBody>
      </CCard>

      {error && (
        <CAlert color="warning" className="search-alert">
          {error}
        </CAlert>
      )}

      {!results && !error && (
        <section className="search-empty-state" aria-live="polite">
          <div className="search-empty-state__icon">
            <CIcon icon={cilSearch} />
          </div>
          <div className="search-empty-state__copy">
            <h2>{t('search.hintTitle')}</h2>
            <p>{t('search.hintBody')}</p>
          </div>
        </section>
      )}

      {results && (
        <section className="search-results">
          <div className="search-results__header">
            <div>
              <h2>{t('search.results')}</h2>
              <p>
                {fmtDate(form.date, lang)} · {scheduleText} · {selectedType}
              </p>
            </div>
            <CBadge color="primary" className="search-results__badge">
              {t('search.resultsCount', { count: results.length })}
            </CBadge>
          </div>

          {results.length === 0 ? (
            <CAlert color="info" className="search-alert">
              {t('search.noResults')}
            </CAlert>
          ) : (
            <div className="space-grid">
              {results.map((s) => {
                const chips = resourceChips(s, t)
                return (
                  <CCard className="space-card" key={s.id}>
                    <CCardBody className="space-card__body">
                      <div className="space-card__top">
                        <div>
                          <h3>{s.name}</h3>
                          <p>
                            {s.floor}
                            {s.location ? ` · ${s.location}` : ''}
                          </p>
                        </div>
                        <CBadge
                          color={s.type === 'SALA' ? 'info' : 'secondary'}
                          className="space-card__badge"
                        >
                          {t(`spaceTypes.${s.type}`)}
                        </CBadge>
                      </div>

                      <div className="space-card__meta">
                        <span>
                          <CIcon icon={cilPeople} className="me-1 text-body-secondary" />
                          <strong>{s.capacity}</strong> {t('common.people')}
                        </span>
                        <span className="estado-pill estado-pill--libre">
                          <CIcon icon={cilCheckCircle} size="sm" />
                          {scheduleText}
                        </span>
                      </div>

                      {chips.length > 0 && (
                        <div className="space-card__resources">
                          {chips.map((c) => (
                            <CBadge
                              key={c}
                              color="light"
                              textColor="dark"
                              className="space-card__chip"
                            >
                              {c}
                            </CBadge>
                          ))}
                        </div>
                      )}

                      <div className="space-card__footer">
                        <CButton
                          color="primary"
                          size="sm"
                          className="space-card__button"
                          onClick={() => reserve(s)}
                          aria-label={`${t('search.reserve')} ${s.name}`}
                        >
                          {t('search.reserve')}
                          <CIcon icon={cilArrowRight} className="ms-2" />
                        </CButton>
                      </div>
                    </CCardBody>
                  </CCard>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
