// Layout de las vistas protegidas: cabecera con navegación/cierre de sesión
// más el contenido de la página. Se usa solo en las rutas protegidas de App,
// por lo que las pruebas que montan pantallas de forma aislada no se ven
// afectadas por la cabecera.

import AppHeader from './AppHeader';

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <AppHeader />
      {children}
    </div>
  );
}
