import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Layout } from './components/Layout'
import { RutaProtegida } from './components/RutaProtegida'
import { Toaster } from './components/Toaster'
import { LoginPage } from './pages/LoginPage'
import { BuscarPage } from './pages/BuscarPage'
import { MisReservasPage } from './pages/MisReservasPage'
import { AdminPage } from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RutaProtegida>
                <Layout />
              </RutaProtegida>
            }
          >
            <Route path="/buscar" element={<BuscarPage />} />
            <Route path="/mis-reservas" element={<MisReservasPage />} />
            <Route
              path="/admin"
              element={
                <RutaProtegida rol="ADMINISTRADOR">
                  <AdminPage />
                </RutaProtegida>
              }
            />
          </Route>

          <Route path="/" element={<Navigate to="/buscar" replace />} />
          <Route path="*" element={<Navigate to="/buscar" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
