/** Estructura de la app autenticada: barra lateral navy + barra superior. */
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Avatar } from './ui'
import Icon from './icons'
import { maskAccount } from '../lib/format'
import { getHealth } from '../api/client'

const NAV = [
  { key: 'dashboard', icon: 'home', label: 'Resumen' },
  { key: 'transfer', icon: 'send', label: 'Enviar dinero' },
  { key: 'recharge', icon: 'plus', label: 'Agregar fondos' },
  { key: 'activity', icon: 'activity', label: 'Actividad' },
  { key: 'notifications', icon: 'bell', label: 'Notificaciones' },
  { key: 'statements', icon: 'file', label: 'Estados de cuenta' },
]

function HealthDots() {
  const [health, setHealth] = useState([])
  useEffect(() => {
    let alive = true
    const load = () => getHealth().then((h) => alive && setHealth(h)).catch(() => {})
    load()
    const t = setInterval(load, 15000)
    return () => { alive = false; clearInterval(t) }
  }, [])
  if (!health.length) return null
  return (
    <div className="health" style={{ padding: '12px 8px 0' }}>
      <div style={{ marginBottom: 6, fontWeight: 600, color: '#9fadc0' }}>Servicios</div>
      {health.map((h) => (
        <div key={h.name} style={{ marginBottom: 3 }}>
          <span className={`dot ${h.reachable && h.status !== 'down' ? 'ok' : 'down'}`} />{h.name}
        </div>
      ))}
    </div>
  )
}

export default function Layout({ view, setView, children }) {
  const { user, logout } = useAuth()
  return (
    <div className="app">
      <aside className="side">
        <div className="brandrow">
          <span className="mark"><Icon name="shield" /></span>
          <span className="wm">NeoWallet<small>BANCA DIGITAL</small></span>
        </div>

        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.key} className={view === n.key ? 'active' : ''} onClick={() => setView(n.key)}>
              <Icon name={n.icon} /> {n.label}
            </button>
          ))}
        </nav>

        <div className="foot">
          <div className="uchip">
            <Avatar user={user} size={36} />
            <div style={{ minWidth: 0 }}>
              <div className="nm">{user?.name}</div>
              <small className="num">{maskAccount(user)}</small>
            </div>
          </div>
          <nav className="nav"><button onClick={logout}><Icon name="logout" /> Cerrar sesión</button></nav>
          <HealthDots />
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="searchbar"><Icon name="search" size="sm" /> <input placeholder="Buscar movimiento o beneficiario" /></div>
          <button className="tb-icon" title="Notificaciones" onClick={() => setView('notifications')}>
            <Icon name="bell" size="sm" /><span className="dot" />
          </button>
          <div className="tb-user">
            <Avatar user={user} size={26} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.name?.split(' ')[0]}</span>
          </div>
        </header>
        <main className="main"><div className="main-narrow">{children}</div></main>
      </div>
    </div>
  )
}
