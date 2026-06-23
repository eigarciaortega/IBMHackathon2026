import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'

import { routes } from '../routes'
import { useAuth } from '../context/AuthContext'

const AppContent = () => {
  const { isAdmin } = useAuth()
  const home = isAdmin ? '/dashboard' : '/buscar'

  return (
    <CContainer className="px-4" lg>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) =>
            route.element ? (
              <Route
                key={idx}
                path={route.path}
                element={
                  route.adminOnly && !isAdmin ? (
                    <Navigate to="/buscar" replace />
                  ) : (
                    <route.element />
                  )
                }
              />
            ) : null,
          )}
          <Route path="/" element={<Navigate to={home} replace />} />
          <Route path="*" element={<Navigate to={home} replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
