# 📤 Guía para Subir a GitHub - OfficeSpace

## ✅ ¿Qué SUBIR?

### ✅ ARCHIVOS QUE SÍ DEBES SUBIR:

```
✅ README.md                          (Documentación principal)
✅ docker-compose.yml                 (Orquestación)
✅ .gitignore                         (Configuración Git)
✅ CHECKLIST_ENTREGA.md              (Checklist de entrega)

✅ docs/                              (Toda la documentación)
   ✅ ARQUITECTURA.md
   ✅ CASOS_DE_PRUEBA.md
   ✅ ESCENARIOS_GHERKIN.md

✅ auth-service/                      (Servicio de autenticación)
   ✅ src/                           (Todo el código fuente)
   ✅ Dockerfile
   ✅ .dockerignore
   ✅ package.json
   ✅ package-lock.json
   ✅ server.js
   ✅ README.md

✅ catalog-service/                   (Servicio de catálogo)
   ✅ src/                           (Todo el código fuente)
   ✅ Dockerfile
   ✅ package.json
   ✅ package-lock.json
   ✅ server.js

✅ booking-service/                   (Servicio de reservas)
   ✅ src/                           (Todo el código fuente)
   ✅ Dockerfile
   ✅ package.json
   ✅ package-lock.json
   ✅ server.js

✅ frontend/                          (Aplicación React)
   ✅ src/                           (Todo el código fuente)
   ✅ public/                        (Archivos públicos)
   ✅ Dockerfile
   ✅ .gitignore
   ✅ package.json
   ✅ package-lock.json
   ✅ index.html
   ✅ vite.config.js
   ✅ tailwind.config.js
   ✅ postcss.config.js
   ✅ eslint.config.js
   ✅ README.md
```

---

## ❌ ¿Qué NO SUBIR?

### ❌ ARCHIVOS QUE NO DEBES SUBIR (ya están en .gitignore):

```
❌ node_modules/                      (Dependencias - se instalan con npm install)
❌ */node_modules/
❌ **/node_modules/

❌ .env                               (Variables de entorno - CONTIENEN SECRETOS)
❌ */.env
❌ **/.env

❌ .vscode/                           (Configuración de VS Code)
❌ .idea/                             (Configuración de IDEs)

❌ dist/                              (Archivos compilados)
❌ build/
❌ coverage/

❌ *.log                              (Archivos de log)
❌ .DS_Store                          (Archivos del sistema)
❌ Thumbs.db
```

---

## 🚀 PASOS PARA SUBIR

### 1️⃣ Inicializar Git (si no está inicializado)

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
git init
```

### 2️⃣ Agregar todos los archivos

```bash
git add .
```

Esto agregará todos los archivos EXCEPTO los que están en `.gitignore`

### 3️⃣ Hacer el primer commit

```bash
git commit -m "feat: OfficeSpace MVP - Sistema completo de gestión de espacios

- Autenticación JWT con roles (Admin/Colaborador)
- CRUD de espacios con validaciones
- Motor de reservas con prevención de solapamientos
- 6 pantallas funcionales con diseño homologado
- Arquitectura de microservicios
- Documentación completa (README, casos de prueba, Gherkin, arquitectura)
- Docker Compose para despliegue"
```

### 4️⃣ Conectar con el repositorio de GitHub

```bash
git remote add origin https://github.com/eigarciaortega/IBMHackathon2026.git
```

### 5️⃣ Verificar la rama

```bash
git branch -M main
```

### 6️⃣ Subir al repositorio

```bash
git push -u origin main
```

Si te pide credenciales, usa tu usuario y token de GitHub (no la contraseña).

---

## 🔐 IMPORTANTE: Variables de Entorno

### ⚠️ Los archivos `.env` NO se suben a GitHub

Pero debes documentar qué variables se necesitan. Ya está en el README.md:

```env
# auth-service/.env
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/officespace
JWT_SECRET=tu_secreto_super_seguro_aqui

# catalog-service/.env
PORT=3002
MONGODB_URI=mongodb://mongodb:27017/officespace
JWT_SECRET=tu_secreto_super_seguro_aqui

# booking-service/.env
PORT=3003
MONGODB_URI=mongodb://mongodb:27017/officespace
JWT_SECRET=tu_secreto_super_seguro_aqui
```

---

## ✅ Verificación Post-Subida

Después de subir, verifica en GitHub que:

1. ✅ Todos los archivos de código están presentes
2. ✅ La carpeta `docs/` está completa
3. ✅ Los `Dockerfile` están presentes
4. ✅ El `docker-compose.yml` está presente
5. ✅ El `README.md` se ve correctamente
6. ❌ NO hay carpetas `node_modules/`
7. ❌ NO hay archivos `.env`
8. ❌ NO hay carpeta `.vscode/`

---

## 📊 Estructura Final en GitHub

```
IBMHackathon2026/
├── README.md                    ✅ 682 líneas
├── docker-compose.yml           ✅
├── .gitignore                   ✅
├── CHECKLIST_ENTREGA.md        ✅
│
├── docs/                        ✅
│   ├── ARQUITECTURA.md         ✅ 638 líneas
│   ├── CASOS_DE_PRUEBA.md      ✅ 398 líneas
│   └── ESCENARIOS_GHERKIN.md   ✅ 523 líneas
│
├── auth-service/                ✅
│   ├── src/                    ✅ (todo el código)
│   ├── Dockerfile              ✅
│   ├── package.json            ✅
│   └── server.js               ✅
│
├── catalog-service/             ✅
│   ├── src/                    ✅ (todo el código)
│   ├── Dockerfile              ✅
│   ├── package.json            ✅
│   └── server.js               ✅
│
├── booking-service/             ✅
│   ├── src/                    ✅ (todo el código)
│   ├── Dockerfile              ✅
│   ├── package.json            ✅
│   └── server.js               ✅
│
└── frontend/                    ✅
    ├── src/                    ✅ (todo el código)
    ├── public/                 ✅
    ├── Dockerfile              ✅
    ├── package.json            ✅
    └── index.html              ✅
```

---

## 🎯 Resumen Rápido

### Comandos en orden:

```bash
# 1. Inicializar (si no está inicializado)
git init

# 2. Agregar archivos
git add .

# 3. Commit
git commit -m "feat: OfficeSpace MVP - Sistema completo"

# 4. Conectar con GitHub
git remote add origin https://github.com/eigarciaortega/IBMHackathon2026.git

# 5. Cambiar a rama main
git branch -M main

# 6. Subir
git push -u origin main
```

---

## ✅ ¡Listo para Subir!

Tu proyecto tiene:
- ✅ 100% funcionalidad implementada
- ✅ Documentación profesional completa
- ✅ .gitignore configurado correctamente
- ✅ Estructura organizada
- ✅ Sin archivos sensibles (.env)

**Puedes subirlo con confianza. Todo está listo.** 🚀