// Ruta no encontrada (404 de cliente).

import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="page page--not-found">
      <h1>Página no encontrada</h1>
      <p>La ruta solicitada no existe.</p>
      <Link to="/">Volver al inicio</Link>
    </main>
  );
}
