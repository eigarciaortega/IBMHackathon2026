# NeoWallet Frontend - Plan de Implementación Detallado

## 📋 Resumen Ejecutivo

Este documento proporciona un plan paso a paso para implementar el frontend de NeoWallet, incluyendo especificaciones técnicas, código de ejemplo y mejores prácticas.

---

## 🎯 Fase 1: Configuración Inicial del Proyecto

### 1.1 Crear Proyecto con Vite

```bash
# Crear proyecto en carpeta frontend
npm create vite@latest frontend -- --template react-ts

cd frontend
npm install
```

### 1.2 Instalar Dependencias

```bash
# Dependencias principales
npm install axios framer-motion recharts react-hot-toast lucide-react

# Dependencias de desarrollo
npm install -D tailwindcss postcss autoprefixer
npm install -D @types/node

# Inicializar TailwindCSS
npx tailwindcss init -p
```

### 1.3 Configurar TailwindCSS

**`tailwind.config.js`**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### 1.4 Configurar Vite

**`vite.config.ts`**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

---

## 🎯 Fase 2: Componentes Base Reutilizables

### 2.1 Button Component

**`src/components/common/Button.tsx`**
```typescript
import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Procesando...
        </span>
      ) : children}
    </motion.button>
  );
};
```

### 2.2 Card Component

**`src/components/common/Card.tsx`**
```typescript
import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false }) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' } : {}}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
};
```

### 2.3 Input Component

**`src/components/common/Input.tsx`**
```typescript
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  icon, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full px-4 py-2 rounded-lg border
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
```

---

## 🎯 Fase 3: Componentes de Features

### 3.1 User Selector

**`src/components/features/UserSelector.tsx`**
```typescript
import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { accountsService } from '@/services/accountsService';
import { useApp } from '@/contexts/AppContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Users } from 'lucide-react';

const MOCK_USERS = [
  { id: 1, name: 'Usuario A (Rico)' },
  { id: 2, name: 'Usuario B (Pobre)' },
  { id: 3, name: 'Usuario C (Nuevo)' },
];

export const UserSelector: React.FC = () => {
  const { currentUser, setCurrentUser } = useApp();
  const { error } = useNotification();
  const [loading, setLoading] = useState(false);

  const handleUserChange = async (userId: number) => {
    setLoading(true);
    try {
      const user = await accountsService.getAccount(userId);
      setCurrentUser(user);
    } catch (err: any) {
      error('Error al cargar usuario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar usuario por defecto
    if (!currentUser) {
      handleUserChange(1);
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      <select
        value={currentUser?.id || ''}
        onChange={(e) => handleUserChange(Number(e.target.value))}
        disabled={loading}
        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
      >
        {MOCK_USERS.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </div>
  );
};
```

### 3.2 Balance Card

**`src/components/features/BalanceCard.tsx`**
```typescript
import React from 'react';
import { Card } from '@/components/common/Card';
import { useApp } from '@/contexts/AppContext';
import { Wallet, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export const BalanceCard: React.FC = () => {
  const { currentUser, refreshBalance, loading } = useApp();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card className="bg-gradient-to-br from-primary-500 to-primary-700 text-white">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5" />
            <p className="text-sm opacity-90">Saldo Disponible</p>
          </div>
          <motion.h2 
            key={currentUser?.balance}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold mb-1"
          >
            {currentUser ? formatCurrency(currentUser.balance) : '$0.00'}
          </motion.h2>
          <p className="text-sm opacity-75">{currentUser?.name}</p>
        </div>
        <button
          onClick={refreshBalance}
          disabled={loading}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </Card>
  );
};
```

### 3.3 Recharge Form

**`src/components/features/RechargeForm.tsx`**
```typescript
import React, { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useAccount } from '@/hooks/useAccount';
import { useApp } from '@/contexts/AppContext';
import { DollarSign } from 'lucide-react';

interface RechargeFormProps {
  onSuccess?: () => void;
}

export const RechargeForm: React.FC<RechargeFormProps> = ({ onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { recharge, loading } = useAccount();
  const { currentUser } = useApp();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const numAmount = parseFloat(amount);

    if (!amount) {
      newErrors.amount = 'El monto es requerido';
    } else if (isNaN(numAmount)) {
      newErrors.amount = 'Ingresa un monto válido';
    } else if (numAmount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    } else if (numAmount > 10000) {
      newErrors.amount = 'El monto máximo es $10,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate() || !currentUser) return;

    try {
      await recharge({
        user_id: currentUser.id,
        amount: parseFloat(amount),
        payment_method: 'credit_card',
      });
      setAmount('');
      onSuccess?.();
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="number"
        step="0.01"
        label="Monto a recargar"
        placeholder="100.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
        icon={<DollarSign className="w-5 h-5" />}
      />
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💳 Recarga simulada - No se procesará ningún pago real
        </p>
      </div>

      <Button type="submit" loading={loading} className="w-full">
        Recargar Saldo
      </Button>
    </form>
  );
};
```

### 3.4 Transfer Form

**`src/components/features/TransferForm.tsx`**
```typescript
import React, { useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useTransfer } from '@/hooks/useTransfer';
import { useApp } from '@/contexts/AppContext';
import { DollarSign, User } from 'lucide-react';

interface TransferFormProps {
  onSuccess?: () => void;
}

const AVAILABLE_RECEIVERS = [
  { id: 1, name: 'Usuario A (Rico)' },
  { id: 2, name: 'Usuario B (Pobre)' },
  { id: 3, name: 'Usuario C (Nuevo)' },
];

export const TransferForm: React.FC<TransferFormProps> = ({ onSuccess }) => {
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { transfer, loading } = useTransfer();
  const { currentUser } = useApp();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const numAmount = parseFloat(amount);
    const numReceiverId = parseInt(receiverId);

    if (!receiverId) {
      newErrors.receiverId = 'Selecciona un destinatario';
    } else if (numReceiverId === currentUser?.id) {
      newErrors.receiverId = 'No puedes transferirte a ti mismo';
    }

    if (!amount) {
      newErrors.amount = 'El monto es requerido';
    } else if (isNaN(numAmount)) {
      newErrors.amount = 'Ingresa un monto válido';
    } else if (numAmount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    } else if (currentUser && numAmount > currentUser.balance) {
      newErrors.amount = 'Fondos insuficientes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate() || !currentUser) return;

    try {
      await transfer({
        sender_id: currentUser.id,
        receiver_id: parseInt(receiverId),
        amount: parseFloat(amount),
      });
      setReceiverId('');
      setAmount('');
      onSuccess?.();
    } catch (err) {
      // Error handled by hook
    }
  };

  const availableReceivers = AVAILABLE_RECEIVERS.filter(
    (user) => user.id !== currentUser?.id
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Destinatario
        </label>
        <select
          value={receiverId}
          onChange={(e) => setReceiverId(e.target.value)}
          className={`
            w-full px-4 py-2 rounded-lg border
            ${errors.receiverId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            focus:ring-2 focus:ring-primary-500
          `}
        >
          <option value="">Selecciona un usuario</option>
          {availableReceivers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        {errors.receiverId && (
          <p className="mt-1 text-sm text-red-600">{errors.receiverId}</p>
        )}
      </div>

      <Input
        type="number"
        step="0.01"
        label="Monto a transferir"
        placeholder="50.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
        icon={<DollarSign className="w-5 h-5" />}
      />

      {currentUser && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Saldo disponible: <span className="font-semibold">${currentUser.balance.toFixed(2)}</span>
          </p>
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Transferir
      </Button>
    </form>
  );
};
```

---

## 🎯 Fase 4: Docker y Despliegue

### 4.1 Dockerfile

**`frontend/Dockerfile`**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 4.2 Nginx Configuration

**`frontend/nginx.conf`**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to accounts service
    location /api/ {
        proxy_pass http://accounts-service:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API proxy to processor service
    location /processor/ {
        proxy_pass http://processor-service:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4.3 Actualizar Docker Compose

**Agregar al `docker-compose.yml` existente:**
```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: neowallet_frontend
    ports:
      - '80:80'
    environment:
      - NODE_ENV=production
    depends_on:
      - accounts-service
      - processor-service
    restart: unless-stopped
    networks:
      - neowallet-network

networks:
  neowallet-network:
    driver: bridge
```

---

## 🎯 Checklist de Implementación

### Setup Inicial
- [ ] Crear proyecto Vite con template React + TypeScript
- [ ] Instalar todas las dependencias necesarias
- [ ] Configurar TailwindCSS con tema personalizado
- [ ] Configurar alias de rutas en Vite
- [ ] Crear variables de entorno

### Tipos y Servicios
- [ ] Definir todos los tipos TypeScript
- [ ] Implementar cliente API con Axios
- [ ] Crear servicio de cuentas
- [ ] Crear servicio de procesador
- [ ] Implementar manejo de errores

### Estado Global
- [ ] Implementar ThemeContext
- [ ] Implementar NotificationContext
- [ ] Implementar AppContext
- [ ] Crear custom hooks

### Componentes Base
- [ ] Componente Button
- [ ] Componente Card
- [ ] Componente Input
- [ ] Componente Modal
- [ ] Componente Spinner

### Features
- [ ] UserSelector
- [ ] BalanceCard
- [ ] RechargeForm
- [ ] TransferForm
- [ ] TransactionHistory
- [ ] TransactionChart
- [ ] HealthStatus

### Integración
- [ ] Conectar todos los componentes
- [ ] Implementar Dashboard principal
- [ ] Agregar animaciones
- [ ] Implementar modo oscuro
- [ ] Testing manual

### Docker
- [ ] Crear Dockerfile
- [ ] Crear nginx.conf
- [ ] Actualizar docker-compose.yml
- [ ] Probar build de Docker
- [ ] Verificar integración completa

---

**Plan de Implementación v1.0**  
**Fecha:** Junio 2026  
**Estado:** ✅ Listo para Ejecución