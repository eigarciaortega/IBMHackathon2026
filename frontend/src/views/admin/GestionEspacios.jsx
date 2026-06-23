import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  CCard,
  CCardBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CBadge,
  CSpinner,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormCheck,
  CFormText,
  CRow,
  CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilCloudUpload, cilPlus, cilPencil, cilTrash } from '@coreui/icons'

import {
  listSpaces,
  createSpace,
  updateSpace,
  deleteSpace,
  exportOfficeData,
  importOfficeData,
  ApiError,
} from '../../api'
import { useTranslation } from '../../i18n'
import { exportOfficeDataFile, parseOfficeDataFile } from '../../utils/dataExchange'

const EMPTY = {
  name: '',
  type: 'SALA',
  capacity: 4,
  floor: '',
  location: '',
  has_projector: false,
  has_ac: false,
  has_videoconference: false,
  active: true,
}

export default function GestionEspacios() {
  const { t } = useTranslation()
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [exchangeBusy, setExchangeBusy] = useState('')
  const [exchangeError, setExchangeError] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [importSummary, setImportSummary] = useState(null)
  const fileInputRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSpaces(await listSpaces({ all: true }))
    } catch (e) {
      setError(t('errors.network'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY)
    setFormError('')
    setModal(true)
  }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ ...s })
    setFormError('')
    setModal(true)
  }

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const save = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      type: form.type,
      capacity: Number(form.capacity),
      floor: form.floor.trim(),
      location: form.location?.trim() || null,
      has_projector: !!form.has_projector,
      has_ac: !!form.has_ac,
      has_videoconference: !!form.has_videoconference,
      active: !!form.active,
    }
    try {
      if (editing) {
        await updateSpace(editing.id, payload)
        setNotice(t('admin.updatedOk'))
      } else {
        await createSpace(payload)
        setNotice(t('admin.createdOk'))
      }
      setModal(false)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (s) => {
    if (!window.confirm(t('admin.deleteConfirm', { name: s.name }))) return
    setError('')
    try {
      await deleteSpace(s.id)
      setNotice(t('admin.deletedOk'))
      await load()
    } catch (err) {
      setError(err.message || t('errors.network'))
    }
  }

  const downloadData = async (format) => {
    setExchangeBusy(`export-${format}`)
    setExchangeError('')
    setImportSummary(null)
    try {
      const data = await exportOfficeData()
      await exportOfficeDataFile(data, format)
      setNotice(t('admin.exchange.exportOk', { format: format.toUpperCase() }))
    } catch (err) {
      setExchangeError(err.message || t('admin.exchange.exportError'))
    } finally {
      setExchangeBusy('')
    }
  }

  const uploadData = async () => {
    if (!importFile) {
      setExchangeError(t('admin.exchange.fileRequired'))
      return
    }

    setExchangeBusy('import')
    setExchangeError('')
    setImportSummary(null)
    try {
      const parsed = await parseOfficeDataFile(importFile)
      if (!parsed.spaces.length && !parsed.bookings.length) {
        setExchangeError(t('admin.exchange.emptyFile'))
        return
      }
      const summary = await importOfficeData(parsed)
      setImportSummary(summary)
      setNotice(t('admin.exchange.importOk'))
      setImportFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await load()
    } catch (err) {
      setExchangeError(err.message || t('admin.exchange.importError'))
    } finally {
      setExchangeBusy('')
    }
  }

  const importErrors = importSummary?.errors || []

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-end mb-4 gap-2">
        <div>
          <h1 className="h3 mb-1">{t('admin.title')}</h1>
          <p className="text-body-secondary mb-0">{t('admin.subtitle')}</p>
        </div>
        <CButton color="primary" onClick={openNew}>
          <CIcon icon={cilPlus} className="me-2" />
          {t('admin.newSpace')}
        </CButton>
      </div>

      {notice && (
        <CAlert color="success" dismissible onClose={() => setNotice('')}>
          {notice}
        </CAlert>
      )}
      {error && <CAlert color="danger">{error}</CAlert>}

      <CCard className="mb-4">
        <CCardBody>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div>
              <h2 className="h5 mb-1">{t('admin.exchange.title')}</h2>
              <p className="text-body-secondary mb-0">{t('admin.exchange.subtitle')}</p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <CButton
                color="secondary"
                variant="outline"
                disabled={!!exchangeBusy}
                onClick={() => downloadData('xlsx')}
              >
                {exchangeBusy === 'export-xlsx' ? (
                  <CSpinner size="sm" className="me-2" />
                ) : (
                  <CIcon icon={cilCloudDownload} className="me-2" />
                )}
                {t('admin.exchange.exportExcel')}
              </CButton>
              <CButton
                color="secondary"
                variant="outline"
                disabled={!!exchangeBusy}
                onClick={() => downloadData('csv')}
              >
                {exchangeBusy === 'export-csv' ? (
                  <CSpinner size="sm" className="me-2" />
                ) : (
                  <CIcon icon={cilCloudDownload} className="me-2" />
                )}
                {t('admin.exchange.exportCsv')}
              </CButton>
            </div>
          </div>

          <CRow className="g-3 align-items-end mt-1">
            <CCol lg={7}>
              <CFormLabel>{t('admin.exchange.fileLabel')}</CFormLabel>
              <CFormInput
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={!!exchangeBusy}
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <CFormText>{t('admin.exchange.fileHelp')}</CFormText>
            </CCol>
            <CCol lg={5} className="d-flex justify-content-lg-end">
              <CButton
                color="primary"
                disabled={!!exchangeBusy || !importFile}
                onClick={uploadData}
              >
                {exchangeBusy === 'import' ? (
                  <CSpinner size="sm" className="me-2" />
                ) : (
                  <CIcon icon={cilCloudUpload} className="me-2" />
                )}
                {t('admin.exchange.import')}
              </CButton>
            </CCol>
          </CRow>

          {exchangeError && (
            <CAlert color="danger" className="mt-3 mb-0">
              {exchangeError}
            </CAlert>
          )}

          {importSummary && (
            <CAlert color="info" className="mt-3 mb-0">
              <div className="fw-semibold mb-1">{t('admin.exchange.summaryTitle')}</div>
              <div className="small">
                {t('admin.exchange.summarySpaces', importSummary.spaces)} ·{' '}
                {t('admin.exchange.summaryBookings', importSummary.bookings)}
              </div>
              {importErrors.length > 0 && (
                <div className="small mt-2">
                  <div className="fw-semibold">
                    {t('admin.exchange.errorsTitle', { count: importErrors.length })}
                  </div>
                  <ul className="mb-0 ps-3">
                    {importErrors.slice(0, 5).map((item, index) => (
                      <li key={`${item.section}-${item.row}-${index}`}>
                        {item.section} #{item.row}: {item.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CAlert>
          )}
        </CCardBody>
      </CCard>

      <CCard>
        <CCardBody>
          {loading ? (
            <div className="text-center py-4">
              <CSpinner color="primary" />
            </div>
          ) : spaces.length === 0 ? (
            <p className="text-body-secondary mb-0">{t('admin.empty')}</p>
          ) : (
            <CTable hover responsive align="middle" className="mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>{t('admin.fields.name')}</CTableHeaderCell>
                  <CTableHeaderCell>{t('admin.fields.type')}</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">
                    {t('admin.fields.capacity')}
                  </CTableHeaderCell>
                  <CTableHeaderCell>{t('admin.fields.floor')}</CTableHeaderCell>
                  <CTableHeaderCell>{t('common.resources')}</CTableHeaderCell>
                  <CTableHeaderCell>{t('common.status')}</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">{t('common.actions')}</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {spaces.map((s) => (
                  <CTableRow key={s.id}>
                    <CTableDataCell className="fw-semibold">{s.name}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={s.type === 'SALA' ? 'info' : 'secondary'}>
                        {t(`spaceTypes.${s.type}`)}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-center">{s.capacity}</CTableDataCell>
                    <CTableDataCell>
                      {s.floor}
                      {s.location ? (
                        <div className="small text-body-secondary">{s.location}</div>
                      ) : null}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex flex-wrap gap-1">
                        {s.has_projector && (
                          <CBadge color="light" textColor="dark" className="border">
                            {t('resources.projector')}
                          </CBadge>
                        )}
                        {s.has_ac && (
                          <CBadge color="light" textColor="dark" className="border">
                            {t('resources.ac')}
                          </CBadge>
                        )}
                        {s.has_videoconference && (
                          <CBadge color="light" textColor="dark" className="border">
                            {t('resources.videoconference')}
                          </CBadge>
                        )}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={s.active ? 'success' : 'secondary'}>
                        {s.active ? t('admin.active') : t('admin.inactive')}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButton
                        color="secondary"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(s)}
                        title={t('common.edit')}
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(s)}
                        title={t('common.delete')}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      <CModal visible={modal} onClose={() => setModal(false)} alignment="center">
        <CForm onSubmit={save}>
          <CModalHeader>
            <CModalTitle>{editing ? t('admin.editSpace') : t('admin.newSpace')}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {formError && (
              <CAlert color="danger" className="py-2">
                {formError}
              </CAlert>
            )}
            <div className="mb-3">
              <CFormLabel>{t('admin.fields.name')}</CFormLabel>
              <CFormInput value={form.name} onChange={set('name')} required minLength={2} />
            </div>
            <CRow className="g-3">
              <CCol sm={6}>
                <CFormLabel>{t('admin.fields.type')}</CFormLabel>
                <CFormSelect value={form.type} onChange={set('type')}>
                  <option value="SALA">{t('spaceTypes.SALA')}</option>
                  <option value="ESCRITORIO">{t('spaceTypes.ESCRITORIO')}</option>
                </CFormSelect>
              </CCol>
              <CCol sm={6}>
                <CFormLabel>{t('admin.fields.capacity')}</CFormLabel>
                <CFormInput
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={set('capacity')}
                  required
                />
              </CCol>
              <CCol sm={6}>
                <CFormLabel>{t('admin.fields.floor')}</CFormLabel>
                <CFormInput value={form.floor} onChange={set('floor')} required />
              </CCol>
              <CCol sm={6}>
                <CFormLabel>{t('admin.fields.location')}</CFormLabel>
                <CFormInput value={form.location || ''} onChange={set('location')} />
              </CCol>
            </CRow>
            <div className="mt-3 d-flex flex-column gap-2">
              <CFormCheck
                label={t('resources.projector')}
                checked={!!form.has_projector}
                onChange={set('has_projector')}
              />
              <CFormCheck
                label={t('resources.ac')}
                checked={!!form.has_ac}
                onChange={set('has_ac')}
              />
              <CFormCheck
                label={t('resources.videoconference')}
                checked={!!form.has_videoconference}
                onChange={set('has_videoconference')}
              />
              {editing && (
                <CFormCheck
                  label={t('admin.active')}
                  checked={!!form.active}
                  onChange={set('active')}
                />
              )}
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => setModal(false)}
              type="button"
            >
              {t('common.cancel')}
            </CButton>
            <CButton color="primary" type="submit" disabled={saving}>
              {saving ? <CSpinner size="sm" className="me-2" /> : null}
              {editing ? t('common.save') : t('admin.createSpace')}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </div>
  )
}
