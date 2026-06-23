import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  CCloseButton,
  CSidebar,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
  CNavItem,
  CNavTitle,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilSearch,
  cilCalendar,
  cilCalendarCheck,
  cilMicrophone,
  cilRoom,
  cilChartPie,
} from '@coreui/icons'

import { AppSidebarNav } from './AppSidebarNav'
import { IbmLogo } from './IbmLogo'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const sidebarNarrow = useSelector((state) => state.sidebarNarrow)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { isAdmin } = useAuth()
  const { t } = useTranslation()

  const toggleSidebarNarrow = (event) => {
    event.preventDefault()
    dispatch({ type: 'set', sidebarNarrow: !sidebarNarrow })
  }

  const icon = (i) => <CIcon icon={i} customClassName="nav-icon" />
  const nav = [
    { component: CNavTitle, name: t('nav.main') },
    isAdmin && {
      component: CNavItem,
      name: t('nav.dashboard'),
      to: '/dashboard',
      icon: icon(cilSpeedometer),
    },
    { component: CNavItem, name: t('nav.search'), to: '/buscar', icon: icon(cilSearch) },
    {
      component: CNavItem,
      name: t('nav.myBookings'),
      to: '/mis-reservas',
      icon: icon(cilCalendarCheck),
    },
    { component: CNavItem, name: t('nav.calendar'), to: '/calendario', icon: icon(cilCalendar) },
    { component: CNavItem, name: t('nav.assistant'), to: '/asistente', icon: icon(cilMicrophone) },
    isAdmin && { component: CNavTitle, name: t('nav.administration') },
    isAdmin && {
      component: CNavItem,
      name: t('nav.spaces'),
      to: '/admin/espacios',
      icon: icon(cilRoom),
    },
    isAdmin && {
      component: CNavItem,
      name: t('nav.analytics'),
      to: '/analiticas',
      icon: icon(cilChartPie),
    },
  ].filter(Boolean)

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      narrow={sidebarNarrow}
      visible={sidebarShow}
      onVisibleChange={(visible) => dispatch({ type: 'set', sidebarShow: visible })}
    >
      <CSidebarHeader className="border-bottom">
        {/* La marca IBM regresa a la página de inicio (landing pública) */}
        <Link
          to="/"
          className="sidebar-brand d-flex align-items-center text-decoration-none"
          aria-label="Volver a la página de inicio de IBM OfficeSpace"
        >
          <span className="sidebar-brand-full">
            <IbmLogo light />
          </span>
          <span
            className="sidebar-brand-narrow ibm-mark__logo ibm-mark__logo--light"
            style={{ fontSize: '1.3rem' }}
          >
            IBM
          </span>
        </Link>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={nav} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          aria-expanded={!sidebarNarrow}
          aria-label={sidebarNarrow ? 'Expandir sidebar' : 'Contraer sidebar'}
          onClick={toggleSidebarNarrow}
          type="button"
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
