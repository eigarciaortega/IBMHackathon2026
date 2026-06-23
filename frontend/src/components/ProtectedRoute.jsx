/**
 * Ruta protegida: exige sesión; opcionalmente exige rol ADMINISTRADOR.
 */
import React from 'react'
import { Navigate } from 'react-router-dom'
import { CSpinner } from '@coreui/react'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <CSpinner color="primary" />
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/buscar" replace />
  return children
}

export default ProtectedRoute
