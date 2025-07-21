
# Guia de Configuração - AdvirLink

## 🚀 Configuração Rápida (Quick Start)

### 1. Pré-requisitos
```bash
# Verificar versões
node --version  # >= 16.0.0
npm --version   # >= 8.0.0
```

### 2. Instalação Express
```bash
# Clonar e instalar
git clone <repo-url>
cd AdvirLink

# Backend
cd backend && npm install

# Frontend  
cd ../frontend && npm install

# API Primavera
cd ../webPrimaveraApi && npm install
```

### 3. Configuração Mínima
```bash
# Backend - criar .env
cp backend/.env.example backend/.env
# Editar com suas credenciais

# Iniciar serviços
npm run dev:all
```

## 🔧 Configuração Detalhada

### Base de Dados SQL Server

#### Opção 1: SQL Server Local
```sql
-- Criar database
CREATE DATABASE AdvirLink;

-- Criar utilizador
CREATE LOGIN advirlink_user WITH PASSWORD = 'sua_password_segura';
CREATE USER advirlink_user FOR LOGIN advirlink_user;
ALTER ROLE db_owner ADD MEMBER advirlink_user;
```

#### Opção 2: SQL Server Docker
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=Sua_Password_123" \
  -p 1433:1433 --name sqlserver \
  -d mcr.microsoft.com/mssql/server:2019-latest
```

### Configuração do Backend

#### Ficheiro .env Completo
```env
# Database
DB_NAME=AdvirLink
DB_USERNAME=advirlink_user
DB_PASSWORD=sua_password_segura
DB_HOST=localhost
DB_PORT=1433
DB_DIALECT=mssql

# JWT
JWT_SECRET=seu_jwt_secret_super_seguro_aqui
JWT_EXPIRES_IN=7d

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_app_password

# Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# API Externa
PRIMAVERA_API_URL=http://0.0.0.0:3001
PRIMAVERA_API_KEY=sua_chave_api

# Outros
NODE_ENV=development
PORT=5000
LOG_LEVEL=debug
```

#### Inicialização da Base de Dados
```bash
cd backend

# Executar migrações
npx sequelize-cli db:migrate

# Executar seeds (dados iniciais)
npx sequelize-cli db:seed:all

# Verificar conexão
npm run test:db
```

### Configuração do Frontend

#### config.js
```javascript
const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
  API_BASE_URL: isDevelopment 
    ? 'http://0.0.0.0:5000/api' 
    : 'https://seu-dominio.com/api',
  
  PRIMAVERA_API_URL: isDevelopment
    ? 'http://0.0.0.0:3001'
    : 'https://primavera-api.seu-dominio.com',

  // Configurações Expo
  EXPO_CONFIG: {
    name: 'AdvirLink',
    slug: 'advirlink',
    version: '1.2.0',
  },

  // Timeouts
  API_TIMEOUT: 30000,
  
  // Cache
  CACHE_DURATION: 300000, // 5 minutos
  
  // Features flags
  FEATURES: {
    QR_CODE_SCANNER: true,
    OFFLINE_MODE: false,
    ANALYTICS: true,
  }
};

export default config;
```

### Configuração da API Primavera

#### app.js
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Configurações
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rotas
app.use('/api/obras', require('./routes/Obras/listarObras'));
app.use('/api/servicos', require('./routes/Servicos/listarPedidos'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Primavera running on port ${PORT}`);
});
```

## 🔐 Configuração de Segurança

### JWT Configuration
```javascript
// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      tipoUser: user.tipoUser 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'advirlink-api',
      audience: 'advirlink-app'
    }
  );
};
```

### CORS Configuration
```javascript
// backend/index.js
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://0.0.0.0:19006', // Expo
      'https://seu-dominio.com'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

## 📱 Configuração Mobile

### Android
```bash
# Android SDK (via Android Studio)
# Ou via linha de comando:
brew install --cask android-studio

# Configurar PATH
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### iOS (apenas macOS)
```bash
# Xcode via App Store
# Expo CLI
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

## 🔧 Scripts Úteis

### package.json (root)
```json
{
  "scripts": {
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && expo start",
    "dev:primavera": "cd webPrimaveraApi && npm run dev",
    "dev:all": "concurrently \"npm run dev:backend\" \"npm run dev:primavera\" \"npm run dev:frontend\"",
    "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install && cd ../webPrimaveraApi && npm install",
    "build:frontend": "cd frontend && expo build:web",
    "test:all": "npm run test:backend && npm run test:frontend",
    "lint:all": "npm run lint:backend && npm run lint:frontend"
  }
}
```

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão SQL Server
```bash
# Verificar se SQL Server está a correr
netstat -an | grep 1433

# Testar conexão
telnet localhost 1433
```

#### 2. Expo Metro Bundle Error
```bash
# Limpar cache
expo start -c

# Reset completo
rm -rf node_modules
rm package-lock.json
npm install
```

#### 3. Erro JWT Token
```bash
# Verificar se JWT_SECRET está definido
echo $JWT_SECRET

# Regenerar secret
node -p "require('crypto').randomBytes(64).toString('hex')"
```

### Logs e Debug

#### Backend Logs
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
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

## 🚀 Deploy em Produção

### Preparação
```bash
# Build frontend
cd frontend && expo build:web

# Otimizar backend
cd backend && npm run build

# Configurar variáveis de ambiente
cp .env.example .env.production
```

Para deploy detalhado, consulte `/docs/DEPLOYMENT.md`
