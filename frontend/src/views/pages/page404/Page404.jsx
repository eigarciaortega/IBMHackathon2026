import React from 'react'
import { Link } from 'react-router-dom'
import { CButton, CContainer } from '@coreui/react'
import { IbmLogo } from '../../../components/IbmLogo'

const Page404 = () => {
  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer className="text-center">
        <IbmLogo lg to="/" ariaLabel="Ir a la página principal" />
        <div className="display-3 fw-bold text-primary mt-4">404</div>
        <h4 className="pt-2">Página no encontrada</h4>
        <p className="text-body-secondary">La página que buscas no existe o fue movida.</p>
        <Link to="/">
          <CButton color="primary" className="mt-2">Volver al inicio</CButton>
        </Link>
      </CContainer>
    </div>
  )
}

export default Page404
