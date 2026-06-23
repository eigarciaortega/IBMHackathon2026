/**
 * App raíz: provee sesión (Auth) y toasts (App). Sin sesión → pantalla de
 * acceso; con sesión → app bancaria con navegación lateral.
 */
import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Toaster from './components/Toaster'
import Layout from './components/Layout'
import { Loading } from './components/ui'
import Auth from './views/Auth'
import Dashboard from './views/Dashboard'
import Transfer from './views/Transfer'
import Recharge from './views/Recharge'
import Activity from './views/Activity'
import Notifications from './views/Notifications'
import Statements from './views/Statements'

function Shell() {
  const { user, ready } = useAuth()
  const [view, setView] = useState('dashboard')

  if (!ready) return <Loading />
  if (!user) return <Auth />

  const views = {
    dashboard: <Dashboard setView={setView} />,
    transfer: <Transfer />,
    recharge: <Recharge />,
    activity: <Activity />,
    notifications: <Notifications />,
    statements: <Statements />,
  }

  return (
    <Layout view={view} setView={setView}>
      <div key={view} className="fade">{views[view] || views.dashboard}</div>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Shell />
        <Toaster />
      </AppProvider>
    </AuthProvider>
  )
}
