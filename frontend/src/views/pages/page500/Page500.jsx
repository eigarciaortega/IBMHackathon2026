import React from 'react'
import { Link } from 'react-router-dom'
import { CButton, CContainer } from '@coreui/react'
import { IbmLogo } from '../../../components/IbmLogo'

const Page500 = () => {
  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer className="text-center">
        <IbmLogo lg to="/" ariaLabel="Ir a la página principal" />
        <div className="display-3 fw-bold text-danger mt-4">500</div>
        <h4 className="pt-2">Error del servidor</h4>
        <p className="text-body-secondary">Ocurrió un problema. Inténtalo de nuevo más tarde.</p>
        <Link to="/">
          <CButton color="primary" className="mt-2">Volver al inicio</CButton>
        </Link>
      </CContainer>
    </div>
  )
}

export default Page500
