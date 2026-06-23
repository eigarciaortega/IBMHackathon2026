/**
 * Tema visual "dark fintech" para Swagger UI (decoración épica de la API).
 */
const customCss = `
  .swagger-ui .topbar { background: linear-gradient(90deg,#0b1437,#1b2a6b); border-bottom: 2px solid #ffb84f; }
  .swagger-ui .topbar .download-url-wrapper { display:none; }
  .swagger-ui .topbar-wrapper::after {
    content: '🔔 NeoWallet · Notifications'; color:#eaf0ff; font-weight:800; font-size:18px; margin-left:12px; letter-spacing:.5px;
  }
  .swagger-ui .topbar-wrapper img { display:none; }
  body { background: #0a1020; }
  .swagger-ui, .swagger-ui .info .title, .swagger-ui .opblock-tag, .swagger-ui table thead tr th,
  .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .parameter__name, .swagger-ui label,
  .swagger-ui .response-col_status, .swagger-ui .opblock .opblock-summary-description { color:#dbe4ff; }
  .swagger-ui .scheme-container, .swagger-ui section.models, .swagger-ui .opblock .opblock-section-header { background:#111a33; }
  .swagger-ui .info { background:#111a33; padding:18px 22px; border-radius:14px; border:1px solid #25356b; }
  .swagger-ui .opblock { border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,.35); border:1px solid #1f2b54; }
  .swagger-ui .opblock.opblock-get { background:rgba(79,140,255,.08); border-color:#4f8cff; }
  .swagger-ui .opblock.opblock-post { background:rgba(255,184,79,.08); border-color:#ffb84f; }
  .swagger-ui .btn.execute { background:#ffb84f; border-color:#ffb84f; color:#1b1300; }
`

const options = {
  customCss,
  customSiteTitle: 'NeoWallet Notifications · Docs',
  customfavIcon: 'https://fav.farm/🔔',
  swaggerOptions: { docExpansion: 'list', filter: true, displayRequestDuration: true },
}

module.exports = options
