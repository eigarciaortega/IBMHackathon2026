import React from 'react'
import {
  CAvatar,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilAccountLogout, cilUser } from '@coreui/icons'

import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n'

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

const AppHeaderDropdown = () => {
  const { user, logout } = useAuth()
  const { t } = useTranslation()

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0 d-flex align-items-center gap-2" caret={false}>
        <CAvatar color="primary" textColor="white" size="md">
          {initials(user?.full_name) || <CIcon icon={cilUser} />}
        </CAvatar>
        <span className="d-none d-md-inline text-body small fw-semibold">{user?.full_name}</span>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary">
          <div className="fw-semibold">{user?.full_name}</div>
          <div className="small text-body-secondary">{user?.email}</div>
          <CBadge color={user?.role === 'ADMINISTRADOR' ? 'primary' : 'secondary'} className="mt-1">
            {t(`roles.${user?.role}`)}
          </CBadge>
        </CDropdownHeader>
        <CDropdownDivider />
        <CDropdownItem as="button" type="button" onClick={logout}>
          <CIcon icon={cilAccountLogout} className="me-2" />
          {t('common.logout')}
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
