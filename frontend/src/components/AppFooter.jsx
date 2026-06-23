import React from 'react'
import { CFooter } from '@coreui/react'
import { useTranslation } from '../i18n'

const AppFooter = () => {
  const { t } = useTranslation()
  return (
    <CFooter className="px-4">
      <div>
        <span className="fw-semibold">IBM OfficeSpace</span>
        <span className="ms-1 text-body-secondary">— {t('common.tagline')}</span>
      </div>
      <div className="ms-auto text-body-secondary">
        <span className="me-1">© {new Date().getFullYear()} IBM Corporation</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
