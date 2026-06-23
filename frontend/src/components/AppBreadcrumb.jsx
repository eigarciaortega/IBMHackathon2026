import React from 'react'
import { useLocation } from 'react-router-dom'
import { CBreadcrumb, CBreadcrumbItem } from '@coreui/react'

import { routes } from '../routes'
import { useTranslation } from '../i18n'

const AppBreadcrumb = () => {
  const currentLocation = useLocation().pathname
  const { t } = useTranslation()

  const current = routes.find((r) => r.path === currentLocation)
  const title = current ? t(current.nameKey) : ''

  return (
    <CBreadcrumb className="my-0">
      <CBreadcrumbItem>{t('common.appName')}</CBreadcrumbItem>
      {title && <CBreadcrumbItem active>{title}</CBreadcrumbItem>}
    </CBreadcrumb>
  )
}

export default React.memo(AppBreadcrumb)
