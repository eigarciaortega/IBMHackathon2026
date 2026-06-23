# NeoWallet Frontend

Frontend moderno para el sistema de pagos P2P NeoWallet, desarrollado para el IBM Hackathon 2026 - Escenario 2.

## 🚀 Tecnologías

- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **TailwindCSS v3.4** - Framework de CSS utility-first
- **Framer Motion** - Animaciones fluidas
- **React Hot Toast** - Sistema de notificaciones
- **Axios** - Cliente HTTP
- **Lucide React** - Iconos modernos

## 📋 Características

### ✨ Interfaz de Usuario
- 🎨 Diseño moderno y profesional
- 🌓 Modo oscuro con persistencia en localStorage
- 📱 Responsive design (mobile-first)
- 🎭 Animaciones suaves con Framer Motion
- 🔔 Notificaciones toast en tiempo real

### 💼 Funcionalidades
- 👤 Selector de usuarios (Alice, Bob, Charlie)
- 💰 Visualización de saldo en tiempo real
- 🔄 Auto-refresh cada 30 segundos
- 💸 Recarga de saldo simulada
- 🔀 Transferencias P2P con validaciones
- 📜 Historial de transacciones completo
- 🏥 Monitoreo de estado de servicios backend
- ⚠️ Manejo robusto de errores

### 🛡️ Validaciones
- Montos positivos y dentro de límites ($0.01 - $10,000)
- Verificación de fondos suficientes
- Prevención de auto-transferencias
- Formato de moneda correcto (2 decimales)

## 🏗️ Arquitectura

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/          # Componentes reutilizables
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── QuickActions.tsx
│   │   │   └── HealthStatus.tsx
│   │   └── features/        # Componentes de negocio
│   │       ├── UserSelector.tsx
│   │       ├── BalanceCard.tsx
│   │       ├── RechargeForm.tsx
│   │       ├── TransferForm.tsx
│   │       └── TransactionHistory.tsx
│   ├── contexts/            # Context API
│   │   ├── ThemeContext.tsx
│   │   ├── NotificationContext.tsx
│   │   └── AppContext.tsx
│   ├── services/            # Servicios API
│   │   ├── api.ts
│   │   ├── accountsService.ts
│   │   └── processorService.ts
│   ├── types/               # Tipos TypeScript
│   │   ├── user.types.ts
│   │   ├── transaction.types.ts
│   │   └── api.types.ts
│   ├── utils/               # Utilidades
│   │   ├── formatters.ts
│   │   └── constants.ts
│   ├── App.tsx              # Dashboard principal
│   ├── main.tsx             # Entry point
│   └── index.css            # Estilos globales
├── Dockerfile               # Multi-stage build
├── nginx.conf               # Configuración Nginx
├── vite.config.ts           # Configuración Vite
├── tailwind.config.js       # Configuración Tailwind
└── tsconfig.app.json        # Configuración TypeScript
```

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 20+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

### Variables de Entorno

Crear archivo `.env.development`:

```env
VITE_ACCOUNTS_API_URL=http://localhost:3000
VITE_PROCESSOR_API_URL=http://localhost:3001
```

Para producción, crear `.env.production`:

```env
VITE_ACCOUNTS_API_URL=/api/accounts
VITE_PROCESSOR_API_URL=/api/processor
```

## 🐳 Docker

### Build de la imagen

```bash
docker build -t neowallet-frontend .
```

### Ejecutar contenedor

```bash
docker run -p 80:80 neowallet-frontend
```

### Docker Compose (Recomendado)

Desde la raíz del proyecto:

```bash
docker-compose up -d
```

Esto levantará:
- Frontend en `http://localhost`
- Accounts Service en `http://localhost:3000`
- Processor Service en `http://localhost:3001`
- 2 bases de datos PostgreSQL

## 📦 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor de desarrollo

# Build
npm run build        # Compila para producción
npm run preview      # Preview del build de producción

# Linting
npm run lint         # Ejecuta ESLint
```

## 🎨 Personalización

### Tema de Colores

Editar `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#eff6ff',
        // ... más colores
        900: '#1e3a8a',
      },
    },
  },
}
```

### Modo Oscuro

El modo oscuro se activa automáticamente según la preferencia del usuario y se persiste en localStorage. Se puede cambiar con el botón ThemeToggle en el header.

## 🔌 Integración con Backend

### Endpoints Utilizados

**Accounts Service (Puerto 3000):**
- `GET /users/:userId` - Obtener datos de usuario
- `POST /recharge` - Recargar saldo
- `GET /health` - Health check

**Processor Service (Puerto 3001):**
- `POST /transfer` - Ejecutar transferencia P2P
- `GET /transactions/:userId` - Historial de transacciones
- `GET /health` - Health check

### Proxy en Desarrollo

Vite está configurado para hacer proxy de las peticiones API:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api/accounts': 'http://localhost:3000',
    '/api/processor': 'http://localhost:3001',
  },
}
```

### Proxy en Producción

Nginx maneja el proxy reverso en producción:

```nginx
location /api/accounts/ {
  proxy_pass http://accounts-service:3000/;
}

location /api/processor/ {
  proxy_pass http://processor-service:3001/;
}
```

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén implementados)
npm run test

# Coverage
npm run test:coverage
```

## 📊 Performance

### Optimizaciones Implementadas

- ✅ Code splitting automático con Vite
- ✅ Lazy loading de componentes
- ✅ Memoización con React.memo
- ✅ Compresión Gzip en Nginx
- ✅ Cache de assets estáticos (1 año)
- ✅ Build optimizado para producción

### Métricas de Build

```
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-DcSYQnsx.css   19.18 kB │ gzip:   4.33 kB
dist/assets/index-DSw3OfXb.js   402.90 kB │ gzip: 130.31 kB
```

## 🔒 Seguridad

### Headers de Seguridad (Nginx)

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`

### Validaciones

- Sanitización de inputs
- Validación de montos
- Prevención de XSS
- CORS configurado correctamente

## 🐛 Troubleshooting

### El frontend no se conecta al backend

1. Verificar que los servicios backend estén corriendo
2. Revisar las variables de entorno
3. Verificar la configuración del proxy en Vite/Nginx

### Errores de compilación TypeScript

```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Problemas con TailwindCSS

```bash
# Regenerar configuración
npx tailwindcss init -p
```

## 📝 Convenciones de Código

- **Componentes**: PascalCase (ej: `UserSelector.tsx`)
- **Utilidades**: camelCase (ej: `formatCurrency`)
- **Constantes**: UPPER_SNAKE_CASE (ej: `API_BASE_URL`)
- **Tipos**: PascalCase con sufijo (ej: `UserType`, `ApiError`)

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto fue desarrollado para el IBM Hackathon 2026 - Escenario 2.

## 👥 Autores

- **Bob** - Desarrollo Frontend Completo

## 🙏 Agradecimientos

- IBM por organizar el Hackathon 2026
- Comunidad de React y TypeScript
- Tailwind Labs por TailwindCSS
- Todos los contribuidores de las librerías utilizadas

---

**Hecho con ❤️ para IBM Hackathon 2026**
