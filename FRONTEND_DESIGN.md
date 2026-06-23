# NeoWallet Frontend - Diseño Técnico

## 📋 Resumen Ejecutivo

Frontend avanzado para NeoWallet construido con **React 18 + Vite + TypeScript + TailwindCSS**, diseñado para proporcionar una experiencia de usuario moderna y fluida para gestionar billeteras digitales y transferencias P2P.

---

## 🎯 Objetivos del Frontend

### Funcionales
- ✅ Visualización en tiempo real del saldo de usuario
- ✅ Recarga de saldo con validaciones
- ✅ Transferencias P2P entre usuarios
- ✅ Historial completo de transacciones
- ✅ Gráficos visuales de actividad financiera
- ✅ Selector de usuario para simular múltiples cuentas
- ✅ Sistema de notificaciones en tiempo real

### No Funcionales
- ✅ Interfaz responsive (mobile-first)
- ✅ Modo oscuro con persistencia
- ✅ Tiempo de carga < 2 segundos
- ✅ Animaciones suaves y profesionales
- ✅ Manejo robusto de errores
- ✅ Accesibilidad (WCAG 2.1 AA)

---

## 🏗️ Arquitectura del Frontend

### Stack Tecnológico

```
┌─────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                  │
│                                                          │
│  React 18 + TypeScript + TailwindCSS + Framer Motion   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  CAPA DE ESTADO                          │
│                                                          │
│  Context API + Custom Hooks + Local Storage             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  CAPA DE SERVICIOS                       │
│                                                          │
│  Axios + API Client + Error Handling                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    BACKEND APIs                          │
│                                                          │
│  Accounts Service (3000) + Processor Service (3001)     │
└─────────────────────────────────────────────────────────┘
```

### Estructura de Carpetas

```
frontend/
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── assets/              # Imágenes, iconos, fuentes
│   │   └── icons/
│   ├── components/          # Componentes reutilizables
│   │   ├── common/          # Componentes base
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Toast.tsx
│   │   ├── layout/          # Componentes de layout
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── features/        # Componentes específicos
│   │       ├── BalanceCard.tsx
│   │       ├── RechargeForm.tsx
│   │       ├── TransferForm.tsx
│   │       ├── TransactionHistory.tsx
│   │       ├── TransactionChart.tsx
│   │       ├── UserSelector.tsx
│   │       └── HealthStatus.tsx
│   ├── contexts/            # Context API
│   │   ├── AppContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── NotificationContext.tsx
│   ├── hooks/               # Custom hooks
│   │   ├── useAccount.ts
│   │   ├── useTransfer.ts
│   │   ├── useTransactions.ts
│   │   ├── useTheme.ts
│   │   └── useNotification.ts
│   ├── services/            # API services
│   │   ├── api.ts           # Axios instance
│   │   ├── accountsService.ts
│   │   └── processorService.ts
│   ├── types/               # TypeScript types
│   │   ├── user.types.ts
│   │   ├── transaction.types.ts
│   │   └── api.types.ts
│   ├── utils/               # Utilidades
│   │   ├── formatters.ts    # Formateo de moneda, fechas
│   │   ├── validators.ts    # Validaciones
│   │   └── constants.ts     # Constantes
│   ├── styles/              # Estilos globales
│   │   └── globals.css
│   ├── App.tsx              # Componente principal
│   ├── main.tsx             # Entry point
│   └── vite-env.d.ts
├── .env.development         # Variables de entorno
├── .env.production
├── Dockerfile
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 🎨 Sistema de Diseño

### Paleta de Colores

#### Modo Claro
```css
--primary: #3B82F6      /* Blue 500 - Acciones principales */
--primary-dark: #2563EB /* Blue 600 - Hover */
--secondary: #10B981    /* Green 500 - Éxito/Crédito */
--danger: #EF4444       /* Red 500 - Error/Débito */
--warning: #F59E0B      /* Amber 500 - Advertencias */
--background: #F9FAFB   /* Gray 50 - Fondo */
--surface: #FFFFFF      /* White - Cards */
--text-primary: #111827 /* Gray 900 - Texto principal */
--text-secondary: #6B7280 /* Gray 500 - Texto secundario */
```

#### Modo Oscuro
```css
--primary: #60A5FA      /* Blue 400 */
--primary-dark: #3B82F6 /* Blue 500 */
--secondary: #34D399    /* Green 400 */
--danger: #F87171       /* Red 400 */
--warning: #FBBF24      /* Amber 400 */
--background: #111827   /* Gray 900 */
--surface: #1F2937      /* Gray 800 */
--text-primary: #F9FAFB /* Gray 50 */
--text-secondary: #9CA3AF /* Gray 400 */
```

### Tipografía

```css
--font-family: 'Inter', system-ui, sans-serif
--font-size-xs: 0.75rem    /* 12px */
--font-size-sm: 0.875rem   /* 14px */
--font-size-base: 1rem     /* 16px */
--font-size-lg: 1.125rem   /* 18px */
--font-size-xl: 1.25rem    /* 20px */
--font-size-2xl: 1.5rem    /* 24px */
--font-size-3xl: 1.875rem  /* 30px */
--font-size-4xl: 2.25rem   /* 36px */
```

### Espaciado

```css
--spacing-1: 0.25rem   /* 4px */
--spacing-2: 0.5rem    /* 8px */
--spacing-3: 0.75rem   /* 12px */
--spacing-4: 1rem      /* 16px */
--spacing-6: 1.5rem    /* 24px */
--spacing-8: 2rem      /* 32px */
--spacing-12: 3rem     /* 48px */
```

---

## 🔌 Integración con Backend

### Endpoints Utilizados

#### Accounts Service (http://localhost:3000)

| Método | Endpoint | Uso en Frontend |
|--------|----------|-----------------|
| `GET` | `/accounts/:id` | Obtener saldo actual del usuario |
| `POST` | `/api/recharge` | Formulario de recarga |
| `GET` | `/health` | Indicador de estado del servicio |

#### Processor Service (http://localhost:3001)

| Método | Endpoint | Uso en Frontend |
|--------|----------|-----------------|
| `POST` | `/api/transfer` | Formulario de transferencia P2P |
| `GET` | `/api/transactions/:user_id` | Historial y gráficos |
| `GET` | `/health` | Indicador de estado del servicio |

### Manejo de Errores

```typescript
// Mapeo de códigos HTTP a mensajes de usuario
const ERROR_MESSAGES = {
  400: 'Datos inválidos. Por favor verifica la información.',
  404: 'Usuario no encontrado.',
  409: 'Fondos insuficientes para completar la operación.',
  422: 'La transferencia fue revertida. Intenta nuevamente.',
  503: 'Servicio temporalmente no disponible.',
  default: 'Ocurrió un error inesperado. Intenta nuevamente.'
};
```

---

## 📱 Componentes Principales

### 1. Dashboard Principal

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] NeoWallet              [UserSelector] [Theme]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  Balance Card    │  │  Quick Actions   │            │
│  │  $1,000.00       │  │  [Recharge]      │            │
│  │  Usuario A       │  │  [Transfer]      │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Transaction Chart (últimos 7 días)             │   │
│  │  [Gráfico de barras: Enviado vs Recibido]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Recent Transactions                             │   │
│  │  ↓ Recibido de Usuario B    +$50.00  [Hoy]     │   │
│  │  ↑ Enviado a Usuario C      -$25.00  [Ayer]    │   │
│  │  ↓ Recarga                  +$100.00 [2d ago]   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  [Health Status: ● Accounts ● Processor]                │
└─────────────────────────────────────────────────────────┘
```

### 2. Formulario de Recarga

```typescript
interface RechargeFormProps {
  userId: number;
  onSuccess: (newBalance: number) => void;
}

// Validaciones:
// - Monto > 0
// - Monto <= 10,000 (límite simulado)
// - Formato decimal válido (2 decimales)
```

### 3. Formulario de Transferencia

```typescript
interface TransferFormProps {
  senderId: number;
  onSuccess: (transactionId: number) => void;
}

// Validaciones:
// - Receptor diferente al emisor
// - Monto > 0
// - Monto <= saldo disponible
// - Receptor existe en el sistema
```

### 4. Historial de Transacciones

```typescript
interface Transaction {
  id: number;
  type: 'sent' | 'received' | 'recharge';
  amount: number;
  counterparty?: string;
  status: 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  timestamp: string;
}

// Features:
// - Filtrado por tipo
// - Búsqueda por monto o usuario
// - Paginación (10 items por página)
// - Exportar a CSV
```

### 5. Gráfico de Transacciones

```typescript
// Librería: Recharts
// Tipo: Bar Chart
// Datos: Últimos 7 días
// Métricas:
// - Total enviado (rojo)
// - Total recibido (verde)
// - Balance neto (azul)
```

---

## 🎭 Animaciones y Transiciones

### Framer Motion

```typescript
// Transiciones de página
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

// Animación de cards
const cardVariants = {
  hover: { scale: 1.02, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  tap: { scale: 0.98 }
};

// Loading spinner
const spinnerVariants = {
  animate: { rotate: 360, transition: { duration: 1, repeat: Infinity } }
};
```

---

## 🔔 Sistema de Notificaciones

### Toast Notifications

```typescript
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // ms, default 5000
}

// Ejemplos:
// ✅ "Recarga exitosa: +$100.00"
// ❌ "Error: Fondos insuficientes"
// ⚠️ "Advertencia: Servicio lento"
// ℹ️ "Transferencia procesándose..."
```

---

## 🌓 Modo Oscuro

### Implementación

```typescript
// ThemeContext.tsx
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {}
});

// Persistencia en localStorage
useEffect(() => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
  document.documentElement.classList.toggle('dark', savedTheme === 'dark');
}, []);
```

---

## 🐳 Dockerización

### Dockerfile Multi-stage

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose Integration

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  container_name: neowallet_frontend
  ports:
    - '80:80'
  environment:
    - VITE_ACCOUNTS_SERVICE_URL=http://accounts-service:3000
    - VITE_PROCESSOR_SERVICE_URL=http://processor-service:3001
  depends_on:
    - accounts-service
    - processor-service
  restart: unless-stopped
```

---

## 📊 Métricas de Rendimiento

### Objetivos

| Métrica | Objetivo |
|---------|----------|
| First Contentful Paint (FCP) | < 1.5s |
| Largest Contentful Paint (LCP) | < 2.5s |
| Time to Interactive (TTI) | < 3.0s |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Bundle Size (gzipped) | < 200KB |

### Optimizaciones

- ✅ Code splitting por rutas
- ✅ Lazy loading de componentes pesados
- ✅ Memoización con React.memo
- ✅ Debouncing en búsquedas
- ✅ Virtualización de listas largas
- ✅ Compresión de assets

---

## 🧪 Testing (Futuro)

### Estrategia de Testing

```typescript
// Unit Tests (Jest + React Testing Library)
- Componentes individuales
- Custom hooks
- Utilidades y formatters

// Integration Tests
- Flujos completos (recarga, transferencia)
- Interacción entre componentes

// E2E Tests (Playwright)
- User journeys completos
- Casos de error
```

---

## 🚀 Plan de Implementación

### Fase 1: Setup (Día 1)
- [x] Analizar requerimientos
- [ ] Crear proyecto Vite
- [ ] Configurar TailwindCSS
- [ ] Configurar TypeScript
- [ ] Estructura de carpetas

### Fase 2: Servicios y Tipos (Día 1-2)
- [ ] API client con Axios
- [ ] Tipos TypeScript
- [ ] Servicios de accounts y processor
- [ ] Context API

### Fase 3: Componentes Base (Día 2)
- [ ] Button, Card, Input
- [ ] Modal, Spinner, Toast
- [ ] Layout components

### Fase 4: Features (Día 2-3)
- [ ] User selector
- [ ] Balance card
- [ ] Recharge form
- [ ] Transfer form
- [ ] Transaction history
- [ ] Transaction chart

### Fase 5: Polish (Día 3)
- [ ] Modo oscuro
- [ ] Animaciones
- [ ] Notificaciones
- [ ] Health checks
- [ ] Error handling

### Fase 6: Docker (Día 3)
- [ ] Dockerfile
- [ ] Docker Compose integration
- [ ] Nginx config
- [ ] Testing en contenedor

---

## 📚 Dependencias Principales

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "framer-motion": "^10.16.0",
    "recharts": "^2.10.0",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 🎯 Criterios de Éxito

### Funcionales
- ✅ Todas las operaciones CRUD funcionan correctamente
- ✅ Validaciones previenen errores de usuario
- ✅ Historial muestra todas las transacciones
- ✅ Gráficos visualizan datos correctamente

### No Funcionales
- ✅ Interfaz responsive en mobile, tablet y desktop
- ✅ Modo oscuro funciona sin bugs
- ✅ Animaciones son suaves (60fps)
- ✅ Manejo de errores es claro y útil
- ✅ Tiempo de carga < 2 segundos

### Técnicos
- ✅ Código TypeScript sin errores
- ✅ Componentes reutilizables y mantenibles
- ✅ Separación clara de responsabilidades
- ✅ Docker build exitoso
- ✅ Integración con backend sin CORS issues

---

**Documento de Diseño v1.0**  
**Fecha:** Junio 2026  
**Estado:** ✅ Aprobado para Implementación