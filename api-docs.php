<?php
// /frontend/api-docs.php
// Swagger UI servido via CDN — sin instalación de dependencias
header("Access-Control-Allow-Origin: *");
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OfficeSpace API — Documentación</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #f8fafc; }
    .swagger-ui .topbar { background: #1f48db; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .topbar-wrapper img { display: none; }
    .swagger-ui .topbar-wrapper::before {
      content: '🏢 OfficeSpace API';
      color: white;
      font-size: 1.2rem;
      font-weight: 700;
      font-family: Inter, system-ui, sans-serif;
      padding-left: 1rem;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "openapi.yaml", // Al mover ambos archivos a /frontend, se lee de forma directa
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
    });
  </script>
</body>
</html>