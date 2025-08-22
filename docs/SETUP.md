
# Guia de Configuração - AdvirLink

## 🚀 Configuração Rápida (Quick Start)

### 1. Pré-requisitos

#### Software Necessário
```bash
# Verificar versões mínimas
node --version  # >= 16.0.0
npm --version   # >= 8.0.0
git --version   # Qualquer versão recente
```

#### Opcional para desenvolvimento móvel
- **Android Studio** (para desenvolvimento Android)
- **Xcode** (para desenvolvimento iOS - apenas macOS)

### 2. Instalação Express

#### Opção A: Desenvolvimento no Replit
1. Fork este repositório no Replit
2. O Replit instalará automaticamente as dependências
3. Configurar variáveis de ambiente (ver seção [Configuração](#configuração))
4. Executar com o botão Run

#### Opção B: Desenvolvimento Local
```bash
# Clonar repositório
git clone <repo-url>
cd AdvirLink

# Instalar Expo CLI globalmente
npm install -g expo-cli @expo/cli

# Instalar dependências do Backend
cd backend && npm install

# Instalar dependências do Frontend  
cd ../frontend && npm install

# Instalar dependências da API Primavera
cd ../webPrimaveraApi && npm install

# Voltar ao diretório root
cd ..
```

### 3. Configuração Mínima

```bash
# Backend - criar ficheiro de ambiente
cd backend
cp .env.example .env
# Editar .env com suas credenciais (ver seção detalhada)

# Iniciar todos os serviços
npm run dev:all
```

## 🔧 Configuração Detalhada

### Base de Dados SQL Server

#### Opção 1: SQL Server Local (Windows/Linux)

**Windows:**
1. Baixar SQL Server Express do site oficial da Microsoft
2. Instalar com configuração padrão
3. Ativar autenticação mista (Windows + SQL Server)

**Linux/macOS:**
```bash
# Usando Docker (recomendado)
docker run -e "ACCEPT_EULA=Y" \
  -e "SA_PASSWORD=AdvirLink123!" \
  -p 1433:1433 \
  --name advirlink-sqlserver \
  --restart unless-stopped \
  -d mcr.microsoft.com/mssql/server:2019-latest
```

#### Opção 2: SQL Server na Cloud

**Azure SQL Database:**
1. Criar conta Azure (teste gratuito disponível)
2. Criar SQL Database
3. Configurar firewall para permitir conexões
4. Copiar string de conexão

**AWS RDS:**
1. Criar instância RDS SQL Server
2. Configurar security groups
3. Obter endpoint de conexão

#### Configuração da Base de Dados

```sql
-- Conectar como administrador e executar:
CREATE DATABASE AdvirLink;
GO

-- Criar utilizador específico para a aplicação
CREATE LOGIN advirlink_user WITH PASSWORD = 'AdvirLink_User123!';
GO

USE AdvirLink;
GO

CREATE USER advirlink_user FOR LOGIN advirlink_user;
GO

-- Conceder permissões necessárias
ALTER ROLE db_datareader ADD MEMBER advirlink_user;
ALTER ROLE db_datawriter ADD MEMBER advirlink_user;
ALTER ROLE db_ddladmin ADD MEMBER advirlink_user;
GO
```

### Configuração do Backend

#### Ficheiro .env Completo

```env
# ===========================================
# CONFIGURAÇÃO DA BASE DE DADOS
# ===========================================
DB_NAME=AdvirLink
DB_USERNAME=advirlink_user
DB_PASSWORD=AdvirLink_User123!
DB_HOST=localhost
# Para Replit, usar 0.0.0.0 se a DB estiver na mesma instância
DB_PORT=1433
DB_DIALECT=mssql

# Configurações avançadas da DB
DB_POOL_MAX=5
DB_POOL_MIN=0
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# ===========================================
# CONFIGURAÇÃO JWT
# ===========================================
JWT_SECRET=SeuJWTSecretMuitoSeguroComPeloMenos64Caracteres123456789
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ===========================================
# CONFIGURAÇÃO DE EMAIL
# ===========================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seuemail@gmail.com
# Para Gmail, usar App Password (não a password normal)
EMAIL_PASS=sua_app_password_gmail

# Nome que aparece como remetente
EMAIL_FROM_NAME=AdvirLink System
EMAIL_FROM_ADDRESS=noreply@advirlink.com

# ===========================================
# CONFIGURAÇÃO DE UPLOAD
# ===========================================
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx,xls,xlsx

# ===========================================
# APIS EXTERNAS
# ===========================================
# URL da API Primavera (mesmo servidor)
PRIMAVERA_API_URL=http://0.0.0.0:3001
PRIMAVERA_API_KEY=sua_chave_api_primavera

# ===========================================
# CONFIGURAÇÃO DO AMBIENTE
# ===========================================
NODE_ENV=development
# Para Replit, usar porta 3000 (mapeada para 80/443)
PORT=3000
LOG_LEVEL=debug

# ===========================================
# CONFIGURAÇÕES DE SEGURANÇA
# ===========================================
# Origins permitidas para CORS (separar por vírgula)
ALLOWED_ORIGINS=http://localhost:19006,http://0.0.0.0:19006,https://seu-projeto.replit.app

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# WHATSAPP WEB
# ===========================================
WHATSAPP_ENABLED=false
WHATSAPP_SESSION_PATH=./whatsapp-session

# ===========================================
# FEATURES FLAGS
# ===========================================
FEATURE_BIOMETRIC_AUTH=true
FEATURE_QR_SCANNER=true
FEATURE_WHATSAPP=false
FEATURE_ANALYTICS=true
```

#### Gerar JWT Secret Seguro

```bash
# Opção 1: Usando Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Opção 2: Usando OpenSSL
openssl rand -hex 64

# Opção 3: Online (usar apenas em desenvolvimento)
# https://generate-secret.vercel.app/64
```

#### Inicialização da Base de Dados

```bash
cd backend

# Verificar conexão com a base de dados
npm run db:test

# Sincronizar modelos (criar tabelas)
npm run db:sync

# Executar seeds (dados iniciais) - se disponível
npm run db:seed

# Verificar tabelas criadas
npm run db:validate
```

### Configuração do Frontend

#### config.js Completo

```javascript
// frontend/config.js
const isDevelopment = process.env.NODE_ENV === 'development';
const isReplit = process.env.REPL_SLUG !== undefined;

const config = {
  // URLs da API
  API_BASE_URL: isDevelopment 
    ? (isReplit ? 'http://0.0.0.0:3000/api' : 'http://localhost:3000/api')
    : 'https://seu-projeto.replit.app/api',
  
  PRIMAVERA_API_URL: isDevelopment
    ? (isReplit ? 'http://0.0.0.0:3001' : 'http://localhost:3001')
    : 'https://primavera-api.replit.app',

  // Configurações do Expo
  EXPO_CONFIG: {
    name: 'AdvirLink',
    slug: 'advirlink',
    version: '1.2.0',
    scheme: 'advirlink',
    platforms: ['ios', 'android', 'web'],
  },

  // Timeouts e Cache
  API_TIMEOUT: 30000,
  CACHE_DURATION: 300000, // 5 minutos
  
  // Geolocalização
  LOCATION_CONFIG: {
    accuracy: 6, // Alta precisão
    timeout: 15000,
    maximumAge: 60000,
  },

  // QR Code Scanner
  QR_CONFIG: {
    fps: 10,
    qrbox: 250,
    aspectRatio: 1.0,
  },

  // Features Flags
  FEATURES: {
    QR_CODE_SCANNER: true,
    BIOMETRIC_AUTH: true,
    OFFLINE_MODE: false,
    ANALYTICS: true,
    WHATSAPP_INTEGRATION: false,
    PUSH_NOTIFICATIONS: true,
  },

  // Configurações de Upload
  UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  },

  // Cores do tema
  THEME: {
    PRIMARY: '#1792FE',
    SECONDARY: '#6C757D',
    SUCCESS: '#28A745',
    DANGER: '#DC3545',
    WARNING: '#FFC107',
    INFO: '#17A2B8',
  },
};

export default config;
```

#### app.json (Expo)

```json
{
  "expo": {
    "name": "AdvirLink",
    "slug": "advirlink",
    "version": "1.2.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.advirlink.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.advirlink.app",
      "permissions": [
        "CAMERA",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-location",
      "expo-camera",
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Permitir que a aplicação use Face ID para autenticação."
        }
      ]
    ]
  }
}
```

### Configuração da API Primavera

#### app.js Completo

```javascript
// webPrimaveraApi/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// ===========================================
// MIDDLEWARE DE SEGURANÇA
// ===========================================
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:19006',
      'http://0.0.0.0:3000',
      'http://0.0.0.0:19006',
      'https://seu-projeto.replit.app',
      ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
    ];
    
    // Permitir requests sem origin (mobile apps)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origin ${origin} não permitida`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ===========================================
// MIDDLEWARE GERAL
// ===========================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir ficheiros estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===========================================
// MIDDLEWARE DE LOGGING
// ===========================================
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===========================================
// ROTAS DA API
// ===========================================
app.use('/api/obras', require('./routes/Obras/listarObras'));
app.use('/api/obras', require('./routes/Obras/detalhesObra'));
app.use('/api/servicos', require('./routes/Servicos/listarPedidos'));
app.use('/api/servicos', require('./routes/Servicos/listarIntervencoes'));
app.use('/api/servicos', require('./routes/Servicos/routePedidos_STP'));
app.use('/api/oficios', require('./routes/Oficios/oficios'));
app.use('/api/oficios', require('./routes/Oficios/sendEmailOficios'));
app.use('/api/concursos', require('./routes/Concursos/routesConcursos'));
app.use('/api/faltas', require('./routes/Faltas/routesFaltas'));
app.use('/api/client-area', require('./routes/ClientArea/clientArea'));

// ===========================================
// ROTA DE HEALTH CHECK
// ===========================================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'AdvirLink Primavera API',
    version: '1.2.0'
  });
});

// ===========================================
// ROTA RAIZ
// ===========================================
app.get('/', (req, res) => {
  res.json({
    message: 'AdvirLink Primavera API',
    version: '1.2.0',
    status: 'Operational',
    endpoints: [
      '/api/obras',
      '/api/servicos',
      '/api/oficios',
      '/api/concursos',
      '/health'
    ]
  });
});

// ===========================================
// MIDDLEWARE DE ERROR HANDLING
// ===========================================
app.use((err, req, res, next) => {
  console.error('Erro na API Primavera:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
  });
});

// ===========================================
// MIDDLEWARE 404
// ===========================================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    availableEndpoints: [
      '/api/obras',
      '/api/servicos',
      '/api/oficios',
      '/health'
    ]
  });
});

// ===========================================
// CRIAR DIRETÓRIO DE UPLOADS
// ===========================================
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Diretório uploads criado');
}

// ===========================================
// INICIAR SERVIDOR
# ===========================================
const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 API Primavera AdvirLink rodando em http://${HOST}:${PORT}`);
  console.log(`📊 Health check disponível em http://${HOST}:${PORT}/health`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
```

## 🔐 Configuração de Segurança

### JWT Configuration Avançada

```javascript
// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const generateTokens = (user) => {
  // Access Token (curta duração)
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      tipoUser: user.tipoUser,
      empresas: user.empresas?.map(e => e.id) || []
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      issuer: 'advirlink-api',
      audience: 'advirlink-app',
      subject: user.id.toString()
    }
  );

  // Refresh Token (longa duração)
  const refreshToken = jwt.sign(
    { 
      id: user.id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      issuer: 'advirlink-api',
      audience: 'advirlink-app'
    }
  );

  return { accessToken, refreshToken };
};

const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret, {
      issuer: 'advirlink-api',
      audience: 'advirlink-app'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    } else {
      throw error;
    }
  }
};

module.exports = { generateTokens, verifyToken };
```

### CORS Configuration Detalhada

```javascript
// backend/middleware/corsMiddleware.js
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    // Lista de origens permitidas
    const allowedOrigins = [
      // Desenvolvimento local
      'http://localhost:3000',
      'http://localhost:19006',
      'http://0.0.0.0:3000',
      'http://0.0.0.0:19006',
      
      // Replit
      'https://seu-projeto.replit.app',
      'https://advirlink.replit.app',
      
      // Expo Development
      /^https?:\/\/.*\.exp\.direct$/,
      /^https?:\/\/localhost:\d+$/,
      
      // Variáveis de ambiente
      ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
    ];

    // Permitir requests sem origin (mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    // Verificar se a origin é permitida
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origin ${origin} não permitida`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Forwarded-For',
    'X-Real-IP'
  ],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 horas
};

module.exports = cors(corsOptions);
```

## 📱 Configuração Mobile

### Android Development

#### Android Studio Setup
```bash
# macOS
brew install --cask android-studio

# Ubuntu/Debian
sudo snap install android-studio --classic

# Configurar SDK paths
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### Configurar Emulador
1. Abrir Android Studio
2. Tools > AVD Manager
3. Create Virtual Device
4. Escolher Pixel 4 com API 30+
5. Iniciar emulador

#### Build Android
```bash
cd frontend

# Build de desenvolvimento
expo build:android

# Build com EAS (recomendado)
eas build --platform android
```

### iOS Development (macOS apenas)

#### Xcode Setup
```bash
# Instalar Xcode via App Store
# Configurar command line tools
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# Instalar simulador
xcode-select --install
```

#### CocoaPods Setup
```bash
# Instalar CocoaPods
sudo gem install cocoapods

# No diretório ios (se existir)
cd ios && pod install
```

## 🔧 Scripts Úteis

### package.json (root)

```json
{
  "name": "advirlink",
  "version": "1.2.0",
  "description": "Sistema de Gestão Empresarial",
  "scripts": {
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && expo start",
    "dev:primavera": "cd webPrimaveraApi && npm run dev",
    "dev:all": "concurrently \"npm run dev:backend\" \"npm run dev:primavera\" \"npm run dev:frontend\"",
    
    "start:backend": "cd backend && npm start",
    "start:frontend": "cd frontend && expo start --no-dev",
    "start:primavera": "cd webPrimaveraApi && npm start",
    "start:all": "concurrently \"npm run start:backend\" \"npm run start:primavera\" \"npm run start:frontend\"",
    
    "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install && cd ../webPrimaveraApi && npm install",
    "clean:all": "rm -rf node_modules backend/node_modules frontend/node_modules webPrimaveraApi/node_modules",
    "fresh:install": "npm run clean:all && npm run install:all",
    
    "build:frontend": "cd frontend && expo build:web",
    "build:android": "cd frontend && eas build --platform android",
    "build:ios": "cd frontend && eas build --platform ios",
    
    "test:backend": "cd backend && npm test",
    "test:frontend": "cd frontend && npm test",
    "test:all": "npm run test:backend && npm run test:frontend",
    
    "lint:backend": "cd backend && npm run lint",
    "lint:frontend": "cd frontend && npm run lint",
    "lint:all": "npm run lint:backend && npm run lint:frontend",
    
    "db:migrate": "cd backend && npx sequelize-cli db:migrate",
    "db:seed": "cd backend && npx sequelize-cli db:seed:all",
    "db:reset": "cd backend && npx sequelize-cli db:migrate:undo:all && npm run db:migrate && npm run db:seed"
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  }
}
```

## 🐛 Troubleshooting

### Problemas Comuns de Base de Dados

#### 1. Erro de Conexão SQL Server
```bash
# Verificar se SQL Server está a correr
# Windows
services.msc # Procurar SQL Server

# Linux (Docker)
docker ps | grep sqlserver

# Testar conexão
telnet localhost 1433
```

**Soluções:**
- Verificar se o serviço está ativo
- Confirmar porta 1433 está aberta
- Validar credenciais no .env
- Verificar firewall

#### 2. Erro "Login failed for user"
```sql
-- Verificar se utilizador existe
SELECT name FROM sys.sql_logins WHERE name = 'advirlink_user';

-- Recriar utilizador se necessário
DROP LOGIN advirlink_user;
CREATE LOGIN advirlink_user WITH PASSWORD = 'NovaPassword123!';
```

### Problemas do Expo/Frontend

#### 1. Metro Bundle Error
```bash
# Limpar cache completo
expo start -c
rm -rf node_modules
rm package-lock.json
npm install

# Reset do Expo
expo r -c
```

#### 2. Dependências Incompatíveis
```bash
# Verificar versões do Expo
expo doctor

# Atualizar Expo SDK
expo upgrade

# Instalar dependências compatíveis
expo install react-native-screens react-native-safe-area-context
```

#### 3. Problemas de Navegação
```javascript
// Verificar se NavigationContainer está configurado
import { NavigationContainer } from '@react-navigation/native';

export default function App() {
  return (
    <NavigationContainer>
      {/* Suas rotas aqui */}
    </NavigationContainer>
  );
}
```

### Problemas de JWT/Autenticação

#### 1. Token Expirado
```javascript
// Implementar refresh automático
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado, tentar refresh
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post('/api/auth/refresh', { refreshToken });
          const { accessToken } = response.data;
          localStorage.setItem('authToken', accessToken);
          // Repetir request original
          return axios(error.config);
        } catch (refreshError) {
          // Redirect to login
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

#### 2. JWT Secret Inválido
```bash
# Gerar novo secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Atualizar .env
JWT_SECRET=novo_secret_gerado
```

### Problemas de CORS

#### 1. Blocked by CORS Policy
```javascript
// Verificar configuração CORS no backend
const allowedOrigins = [
  'http://localhost:19006', // Expo web
  'http://0.0.0.0:19006',   // Replit
  // Adicionar sua origin aqui
];
```

#### 2. Preflight Request Failed
```javascript
// Adicionar headers OPTIONS
app.options('*', cors(corsOptions));
```

### Performance e Otimização

#### 1. Memory Leaks no Frontend
```javascript
// Limpar timeouts e intervals
useEffect(() => {
  const interval = setInterval(() => {
    // código
  }, 1000);

  return () => clearInterval(interval);
}, []);

// Cancelar requests pendentes
useEffect(() => {
  const source = axios.CancelToken.source();

  fetchData(source.token);

  return () => source.cancel('Component unmounted');
}, []);
```

#### 2. Base de Dados Lenta
```sql
-- Criar índices necessários
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_registo_data ON registoPonto(dataHora);
CREATE INDEX idx_obra_status ON obras(status);
```

## 🚀 Deploy em Produção

### Deploy no Replit

#### 1. Preparação
```bash
# Otimizar package.json
npm prune --production

# Configurar variáveis de ambiente
# No Replit: Secrets tab
```

#### 2. Configuração .replit
```toml
[env]
PATH = "/home/runner/${REPL_SLUG}/node_modules/.bin"
XDG_CONFIG_HOME = "/home/runner/${REPL_SLUG}/.config"

[nix]
channel = "stable-22_11"

[packager]
language = "nodejs"

[packager.features]
packageSearch = true
guessImports = true
enabledForHosting = false

[languages.javascript]
pattern = "**/{*.js,*.jsx,*.ts,*.tsx}"
syntax = "javascript"

[languages.javascript.languageServer]
start = [ "typescript-language-server", "--stdio" ]

[deployment]
build = ["npm", "run", "build:all"]
run = ["npm", "run", "start:all"]

[ports]
3000 = { externalPort = 80 }
```

#### 3. Scripts de Deploy
```json
{
  "scripts": {
    "build:prod": "NODE_ENV=production npm run build:all",
    "start:prod": "NODE_ENV=production npm run start:all",
    "deploy": "npm run build:prod && npm run start:prod"
  }
}
```

### Variáveis de Ambiente de Produção

```env
# PRODUÇÃO - usar no Replit Secrets
NODE_ENV=production
PORT=3000

# Database (usar serviço em cloud)
DB_HOST=seu-servidor-sql.database.windows.net
DB_NAME=advirlink_prod
DB_USERNAME=admin
DB_PASSWORD=senha_super_segura

# URLs de produção
ALLOWED_ORIGINS=https://seu-projeto.replit.app,https://app.advirlink.com

# Logs em produção
LOG_LEVEL=warn
```

## 📊 Monitorização

### Health Checks
```javascript
// backend/routes/healthRoutes.js
app.get('/health', async (req, res) => {
  try {
    // Verificar conexão DB
    await sequelize.authenticate();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      database: 'Connected',
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      error: error.message
    });
  }
});
```

### Logging
```javascript
// backend/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 10
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;
```

---

Para mais informações sobre deployment específico, consulte a documentação oficial do [Replit](https://docs.replit.com/hosting/deployments/about-deployments).

**Nota**: Este guia é para a versão 1.2.0 do AdvirLink. Para versões anteriores, consulte o CHANGELOG.md.
