# NeoWallet Frontend - Diagramas de Arquitectura

## 📐 Arquitectura General del Sistema

```mermaid
graph TB
    subgraph "Frontend - React App"
        UI[User Interface]
        Components[React Components]
        Hooks[Custom Hooks]
        Context[Context API]
        Services[API Services]
    end
    
    subgraph "Backend Services"
        AS[Accounts Service<br/>Port 3000]
        PS[Processor Service<br/>Port 3001]
    end
    
    subgraph "Databases"
        ADB[(accounts_db<br/>PostgreSQL)]
        PDB[(processor_db<br/>PostgreSQL)]
    end
    
    UI --> Components
    Components --> Hooks
    Hooks --> Context
    Context --> Services
    Services -->|HTTP/REST| AS
    Services -->|HTTP/REST| PS
    AS --> ADB
    PS --> PDB
    PS -.->|Internal API| AS
```

## 🔄 Flujo de Datos - Transferencia P2P

```mermaid
sequenceDiagram
    participant User
    participant TransferForm
    participant useTransfer
    participant processorService
    participant ProcessorAPI
    participant AccountsAPI
    participant Toast
    
    User->>TransferForm: Ingresa datos de transferencia
    TransferForm->>TransferForm: Valida formulario
    TransferForm->>useTransfer: handleTransfer()
    useTransfer->>processorService: transfer(dto)
    processorService->>ProcessorAPI: POST /api/transfer
    
    ProcessorAPI->>ProcessorAPI: Crea transacción PENDING
    ProcessorAPI->>AccountsAPI: POST /accounts/update-balance (debit)
    AccountsAPI-->>ProcessorAPI: Débito exitoso
    ProcessorAPI->>ProcessorAPI: Actualiza a DEBITED
    ProcessorAPI->>AccountsAPI: POST /accounts/update-balance (credit)
    AccountsAPI-->>ProcessorAPI: Crédito exitoso
    ProcessorAPI->>ProcessorAPI: Actualiza a COMPLETED
    
    ProcessorAPI-->>processorService: 200 OK
    processorService-->>useTransfer: Success
    useTransfer->>Toast: Muestra notificación éxito
    useTransfer->>TransferForm: Actualiza UI
    TransferForm-->>User: Transferencia completada
```

## 🎨 Arquitectura de Componentes

```mermaid
graph TD
    App[App.tsx]
    
    App --> ThemeProvider[ThemeProvider]
    App --> NotificationProvider[NotificationProvider]
    App --> AppProvider[AppProvider]
    
    AppProvider --> Dashboard[Dashboard]
    
    Dashboard --> Header[Header]
    Dashboard --> MainContent[Main Content]
    Dashboard --> Footer[Footer]
    
    Header --> UserSelector[UserSelector]
    Header --> ThemeToggle[ThemeToggle]
    Header --> HealthStatus[HealthStatus]
    
    MainContent --> BalanceCard[BalanceCard]
    MainContent --> QuickActions[QuickActions]
    MainContent --> TransactionChart[TransactionChart]
    MainContent --> TransactionHistory[TransactionHistory]
    
    QuickActions --> RechargeModal[RechargeModal]
    QuickActions --> TransferModal[TransferModal]
    
    RechargeModal --> RechargeForm[RechargeForm]
    TransferModal --> TransferForm[TransferForm]
    
    TransactionHistory --> TransactionList[TransactionList]
    TransactionHistory --> Pagination[Pagination]
```

## 🔌 Estructura de Servicios API

```mermaid
graph LR
    subgraph "API Layer"
        API[api.ts<br/>Axios Instance]
        AS[accountsService.ts]
        PS[processorService.ts]
    end
    
    subgraph "Backend Endpoints"
        ACC[Accounts Service<br/>localhost:3000]
        PROC[Processor Service<br/>localhost:3001]
    end
    
    AS --> API
    PS --> API
    
    API -->|GET /accounts/:id| ACC
    API -->|POST /api/recharge| ACC
    API -->|GET /health| ACC
    
    API -->|POST /api/transfer| PROC
    API -->|GET /api/transactions/:id| PROC
    API -->|GET /health| PROC
```

## 🎭 Flujo de Estado - Context API

```mermaid
graph TB
    subgraph "Global State"
        AppContext[AppContext]
        ThemeContext[ThemeContext]
        NotificationContext[NotificationContext]
    end
    
    subgraph "State Management"
        AppContext --> CurrentUser[currentUser]
        AppContext --> Balance[balance]
        AppContext --> Loading[loading]
        
        ThemeContext --> Theme[theme: light/dark]
        ThemeContext --> ToggleTheme[toggleTheme]
        
        NotificationContext --> Notifications[notifications array]
        NotificationContext --> AddNotification[addNotification]
        NotificationContext --> RemoveNotification[removeNotification]
    end
    
    subgraph "Components"
        Dashboard
        Forms
        Charts
    end
    
    CurrentUser --> Dashboard
    Balance --> Dashboard
    Theme --> Dashboard
    Theme --> Forms
    Notifications --> Charts
```

## 📱 Responsive Design Breakpoints

```mermaid
graph LR
    Mobile[Mobile<br/>< 640px] --> Tablet[Tablet<br/>640px - 1024px]
    Tablet --> Desktop[Desktop<br/>> 1024px]
    
    Mobile -.->|Stack vertically| Layout1[Single Column]
    Tablet -.->|2 columns| Layout2[Grid 2x2]
    Desktop -.->|3 columns| Layout3[Grid 3x3]
```

## 🔄 Ciclo de Vida de una Transacción

```mermaid
stateDiagram-v2
    [*] --> FormInput: Usuario ingresa datos
    FormInput --> Validating: Submit
    Validating --> Sending: Validación OK
    Validating --> FormInput: Error de validación
    
    Sending --> Processing: Request enviado
    Processing --> Success: 200 OK
    Processing --> Error: 4xx/5xx
    
    Success --> UpdateUI: Actualizar balance
    UpdateUI --> ShowToast: Notificación éxito
    ShowToast --> [*]
    
    Error --> ShowError: Notificación error
    ShowError --> FormInput: Reintentar
```

## 🎨 Sistema de Temas

```mermaid
graph TB
    ThemeToggle[Theme Toggle Button]
    
    ThemeToggle -->|Click| CheckCurrent{Current Theme?}
    
    CheckCurrent -->|Light| SetDark[Set Dark Mode]
    CheckCurrent -->|Dark| SetLight[Set Light Mode]
    
    SetDark --> UpdateDOM[Update DOM Classes]
    SetLight --> UpdateDOM
    
    UpdateDOM --> SaveLocal[Save to localStorage]
    SaveLocal --> UpdateContext[Update ThemeContext]
    UpdateContext --> ReRender[Re-render Components]
```

## 🔔 Sistema de Notificaciones

```mermaid
graph LR
    Event[Event Trigger]
    
    Event --> Success{Event Type}
    
    Success -->|Success| GreenToast[Green Toast<br/>✓ Success]
    Success -->|Error| RedToast[Red Toast<br/>✗ Error]
    Success -->|Warning| YellowToast[Yellow Toast<br/>⚠ Warning]
    Success -->|Info| BlueToast[Blue Toast<br/>ℹ Info]
    
    GreenToast --> AutoDismiss[Auto-dismiss 5s]
    RedToast --> AutoDismiss
    YellowToast --> AutoDismiss
    BlueToast --> AutoDismiss
    
    AutoDismiss --> Remove[Remove from Queue]
```

## 🐳 Arquitectura Docker

```mermaid
graph TB
    subgraph "Docker Compose Network"
        Frontend[Frontend Container<br/>nginx:alpine<br/>Port 80]
        Accounts[Accounts Service<br/>NestJS<br/>Port 3000]
        Processor[Processor Service<br/>NestJS<br/>Port 3001]
        AccDB[(accounts_db<br/>PostgreSQL<br/>Port 5432)]
        ProcDB[(processor_db<br/>PostgreSQL<br/>Port 5433)]
    end
    
    Frontend -->|Proxy| Accounts
    Frontend -->|Proxy| Processor
    Accounts --> AccDB
    Processor --> ProcDB
    Processor -.->|Internal| Accounts
```

## 📊 Flujo de Datos - Dashboard

```mermaid
graph TD
    Mount[Component Mount]
    
    Mount --> LoadUser[Load User Data]
    LoadUser --> FetchBalance[Fetch Balance]
    FetchBalance --> FetchTransactions[Fetch Transactions]
    
    FetchTransactions --> ProcessData[Process Data]
    ProcessData --> GenerateChart[Generate Chart Data]
    ProcessData --> FormatHistory[Format History]
    
    GenerateChart --> RenderChart[Render Chart]
    FormatHistory --> RenderList[Render List]
    
    RenderChart --> Display[Display Dashboard]
    RenderList --> Display
    
    Display --> Poll{Auto-refresh?}
    Poll -->|Every 30s| FetchBalance
```

## 🔐 Manejo de Errores

```mermaid
graph TB
    APICall[API Call]
    
    APICall --> Response{Response Status}
    
    Response -->|200-299| Success[Success Handler]
    Response -->|400| BadRequest[Bad Request<br/>Show validation errors]
    Response -->|404| NotFound[Not Found<br/>User doesn't exist]
    Response -->|409| Conflict[Conflict<br/>Insufficient funds]
    Response -->|422| Unprocessable[Unprocessable<br/>Transaction rolled back]
    Response -->|503| ServiceDown[Service Unavailable<br/>Backend down]
    Response -->|Other| GenericError[Generic Error<br/>Unexpected error]
    
    BadRequest --> ShowToast[Show Error Toast]
    NotFound --> ShowToast
    Conflict --> ShowToast
    Unprocessable --> ShowToast
    ServiceDown --> ShowToast
    GenericError --> ShowToast
    
    ShowToast --> LogError[Log to Console]
```

## 🎯 Performance Optimization

```mermaid
graph LR
    subgraph "Build Time"
        CodeSplit[Code Splitting]
        TreeShake[Tree Shaking]
        Minify[Minification]
    end
    
    subgraph "Runtime"
        LazyLoad[Lazy Loading]
        Memoization[React.memo]
        Debounce[Debouncing]
        Virtual[Virtualization]
    end
    
    subgraph "Network"
        Cache[HTTP Caching]
        Compress[Gzip/Brotli]
        CDN[CDN Assets]
    end
    
    CodeSplit --> Bundle[Optimized Bundle]
    TreeShake --> Bundle
    Minify --> Bundle
    
    LazyLoad --> FastRender[Fast Rendering]
    Memoization --> FastRender
    Debounce --> FastRender
    Virtual --> FastRender
    
    Cache --> FastLoad[Fast Loading]
    Compress --> FastLoad
    CDN --> FastLoad
```

---

**Diagramas de Arquitectura v1.0**  
**Fecha:** Junio 2026  
**Herramienta:** Mermaid.js