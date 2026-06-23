/**
 * Pantalla de acceso: iniciar sesión o crear cuenta (login real con JWT).
 */
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { Button, Field } from '../components/ui'
import Icon from '../components/icons'

export default function Auth() {
  const { login, register } = useAuth()
  const { toast } = useApp()
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(form.email.trim(), form.password)
      } else {
        await register({
          name: form.name.trim(), email: form.email.trim(),
          phone: form.phone.trim() || undefined, password: form.password,
        })
        toast({ type: 'success', title: 'Cuenta creada', message: 'Bienvenido a NeoWallet' })
      }
      // El cambio de sesión re-renderiza hacia la app.
    } catch (err) {
      const map = {
        invalid_credentials: 'Correo o contraseña incorrectos',
        email_taken: 'Ya existe una cuenta con ese correo',
      }
      toast({ type: 'error', title: 'No se pudo continuar', message: map[err.data?.error] || err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="brandside">
        <div className="mark"><Icon name="shield" size="lg" /></div>
        <h2>Banca digital, con la confianza de siempre.</h2>
        <p>Gestiona tus fondos y transferencias con seguridad de nivel institucional y disponibilidad permanente.</p>
        <div className="trust"><Icon name="shield" size="sm" /> Cifrado de extremo a extremo · Fondos protegidos</div>
      </div>

      <div className="formside">
        <div className="formbox fade">
          <div className="eyebrow">NeoWallet · FastPay</div>
          <h3>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h3>
          <p className="muted">{mode === 'login' ? 'Bienvenido de nuevo.' : 'Abre tu cuenta en un minuto.'}</p>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <Field label="Nombre completo">
                <input className="inp" value={form.name} onChange={set('name')} placeholder="Ana López" required />
              </Field>
            )}
            <Field label="Correo electrónico">
              <input className="inp" type="email" value={form.email} onChange={set('email')} placeholder="tucorreo@neowallet.com" required />
            </Field>
            {mode === 'register' && (
              <Field label="Teléfono (opcional)" hint="Para confirmaciones por SMS">
                <input className="inp" value={form.phone} onChange={set('phone')} placeholder="+52 1 55 5555 0099" />
              </Field>
            )}
            <Field label="Contraseña" hint={mode === 'register' ? 'Mínimo 8 caracteres, con letras y números' : ''}>
              <input className="inp" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
            </Field>
            <Button block size="lg" disabled={busy}>
              {busy ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>
          </form>

          <div className="swap">
            {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
