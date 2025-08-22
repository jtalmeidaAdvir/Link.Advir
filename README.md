
# AdvirLink - Sistema de Gestão Empresarial

Sistema completo de gestão empresarial desenvolvido com React Native/Expo (frontend) e Node.js/Express (backend), integrado com API Primavera para funcionalidades avançadas de ERP.

## 📋 Índice

- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Execução](#execução)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Documentation](#api-documentation)
- [Contribuição](#contribuição)
- [Licença](#licença)

## 🚀 Funcionalidades

### Autenticação e Gestão de Utilizadores
- Sistema de login multi-empresa com JWT
- Gestão de perfis de utilizador (Trabalhador, Diretor, Encarregado, Orçamentista, Externo, Administrador)
- Recuperação e redefinição de password
- Controlo de acesso baseado em módulos e submódulos
- Autenticação biométrica para dispositivos móveis
- Verificação de conta por email

### Assiduidade e Ponto
- Registo de ponto com QR Code e localização GPS
- Gestão de horários de trabalho
- Aprovação de faltas e férias
- Relatórios e calendário de assiduidade
- Pedidos de alteração de registos
- Notificações de registos pendentes
- Mapa de registos por obra

### Gestão de Obras
- Criação e gestão de equipas de obra
- Partes diárias de obra com fotografias
- Gestão de trabalhadores externos
- Controlo de pessoal por obra
- Localização GPS de registos
- Intervalos de trabalho

### Serviços e Assistência Técnica
- Dashboard analytics com KPIs
- Gestão de pedidos de assistência
- Registo de intervenções técnicas
- Análise por técnico com gráficos
- Sistema de processos e acompanhamento
- Relatórios de satisfação de cliente

### Oficios e Documentação
- Criação e edição de ofícios com templates
- Sistema de aprovação de documentos
- Templates personalizáveis
- Geração automática de PDFs
- Envio por email integrado

### Concursos
- Gestão de processos de concurso
- Sistema de aprovação hierárquica
- Documentação automática
- Acompanhamento de estado

### WhatsApp Integration
- Integração com WhatsApp Web
- Envio automático de notificações
- Gestão de schedules de mensagens
- Conversas automatizadas com clientes

### Analytics e Dashboards
- Dashboard principal com métricas
- Análise de produtividade por técnico
- Gráficos de performance
- Relatórios personalizados

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React Native** com Expo SDK 51
- **React Navigation** v6 para navegação
- **Axios** para comunicação HTTP
- **React Native Paper** para componentes UI
- **Framer Motion** para animações
- **Chart Kit** para gráficos e analytics
- **Expo Location** para GPS
- **Expo Barcode Scanner** para QR codes
- **HTML5-QRCode** para scanner web
- **jsPDF** para geração de documentos

### Backend
- **Node.js** v16+ com Express
- **Sequelize** ORM para base de dados
- **SQL Server** com driver Tedious
- **JWT** para autenticação
- **Bcrypt** para encriptação de passwords
- **Multer** para upload de ficheiros
- **Nodemailer** para envio de emails
- **Winston** para logging
- **CORS** configurado para múltiplas origens

### API Externa (webPrimaveraApi)
- **Express** servidor independente
- **Integração Primavera ERP**
- **Google Auth Library**
- **PDFKit** para documentos
- **Multer** para gestão de uploads

### Base de Dados
- **SQL Server** (local ou remoto)
- **Sequelize** migrations e seeds
- **Associações** complexas entre entidades

## 📋 Pré-requisitos

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **SQL Server** (local ou remoto)
- **Expo CLI** instalado globalmente
- **Git** para controlo de versões
- **Android Studio** (para Android development)
- **Xcode** (para iOS development - apenas macOS)

## ⚙️ Instalação

### 1. Clonar o repositório
```bash
git clone <repository-url>
cd AdvirLink
```

### 2. Instalar dependências globais
```bash
npm install -g expo-cli
npm install -g @expo/cli
```

### 3. Instalar dependências do projeto
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# API Primavera
cd ../webPrimaveraApi
npm install

# Voltar ao root
cd ..
```

## 🔧 Configuração

### 1. Configurar Base de Dados (Backend)
Criar ficheiro `.env` na pasta `backend`:
```env
# Database Configuration
DB_NAME=AdvirLink
DB_USERNAME=advirlink_user
DB_PASSWORD=sua_password_segura
DB_HOST=localhost
DB_PORT=1433
DB_DIALECT=mssql

# JWT Configuration
JWT_SECRET=seu_jwt_secret_muito_seguro_aqui
JWT_EXPIRES_IN=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_app_password

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# External APIs
PRIMAVERA_API_URL=http://0.0.0.0:3001
PRIMAVERA_API_KEY=sua_chave_api

# Environment
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

### 2. Configurar Frontend
Editar o ficheiro `frontend/config.js`:
```javascript
const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
  API_BASE_URL: isDevelopment 
    ? 'http://0.0.0.0:3000/api' 
    : 'https://seu-dominio.replit.app/api',
  
  PRIMAVERA_API_URL: isDevelopment
    ? 'http://0.0.0.0:3001'
    : 'https://primavera-api.replit.app',

  // Expo Configuration
  EXPO_CONFIG: {
    name: 'AdvirLink',
    slug: 'advirlink',
    version: '1.2.0',
  },

  // API Settings
  API_TIMEOUT: 30000,
  CACHE_DURATION: 300000,
  
  // Feature Flags
  FEATURES: {
    QR_CODE_SCANNER: true,
    BIOMETRIC_AUTH: true,
    OFFLINE_MODE: false,
    ANALYTICS: true,
    WHATSAPP_INTEGRATION: true,
  }
};

export default config;
```

### 3. Configurar SQL Server
Executar as seguintes queries no SQL Server:
```sql
-- Criar database
CREATE DATABASE AdvirLink;

-- Criar utilizador
CREATE LOGIN advirlink_user WITH PASSWORD = 'sua_password_segura';
USE AdvirLink;
CREATE USER advirlink_user FOR LOGIN advirlink_user;
ALTER ROLE db_owner ADD MEMBER advirlink_user;
```

### 4. Inicializar Base de Dados
```bash
cd backend

# Executar migrações (se existirem)
npx sequelize-cli db:migrate

# Executar seeds (dados iniciais)
npx sequelize-cli db:seed:all
```

## 🚀 Execução

### 1. Iniciar Backend
```bash
cd backend
npm start
# Servidor disponível em http://0.0.0.0:3000
```

### 2. Iniciar API Primavera
```bash
cd webPrimaveraApi
node app.js
# API disponível em http://0.0.0.0:3001
```

### 3. Iniciar Frontend
```bash
cd frontend
expo start
# ou
npm start
```

### 4. Executar em dispositivo/simulador
- **Web**: Pressionar 'w' no terminal do Expo ou abrir `http://localhost:19006`
- **Android**: Pressionar 'a' (requer Android Studio/emulador)
- **iOS**: Pressionar 'i' (requer Xcode - apenas macOS)
- **Físico**: Instalar Expo Go e scanear QR code

## 📁 Estrutura do Projeto

```
AdvirLink/
├── backend/                    # API Principal (Node.js/Express)
│   ├── config/                # Configurações (DB, Email)
│   │   ├── db.js             # Configuração Sequelize
│   │   └── email.js          # Configuração Nodemailer
│   ├── controllers/          # Controladores de negócio
│   │   ├── userController.js
│   │   ├── registoPontoController.js
│   │   ├── obraController.js
│   │   └── ...
│   ├── middleware/           # Middleware de autenticação
│   │   └── authMiddleware.js
│   ├── models/              # Modelos Sequelize
│   │   ├── user.js
│   │   ├── registoPonto.js
│   │   ├── obra.js
│   │   └── ...
│   ├── routes/              # Rotas da API
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── registoPontoRoutes.js
│   │   └── ...
│   ├── services/            # Serviços auxiliares
│   ├── utils/               # Utilitários
│   ├── associations.js     # Associações entre modelos
│   └── index.js            # Ponto de entrada
├── frontend/                # Aplicação React Native/Expo
│   ├── assets/             # Recursos estáticos
│   ├── images/             # Imagens e logos
│   ├── src/
│   │   ├── Pages/          # Páginas da aplicação
│   │   │   ├── Autenticacao/
│   │   │   ├── Assiduidade/
│   │   │   ├── Obras/
│   │   │   ├── Servicos/
│   │   │   ├── Oficios/
│   │   │   └── Concursos/
│   │   ├── styles/         # Estilos globais
│   │   ├── templates/      # Templates de documentos
│   │   └── utils/          # Utilitários frontend
│   ├── config.js           # Configuração da aplicação
│   ├── App.js              # Componente principal
│   └── ...
├── webPrimaveraApi/         # API Integração Primavera
│   ├── routes/             # Rotas específicas Primavera
│   │   ├── Obras/
│   │   ├── Servicos/
│   │   ├── Oficios/
│   │   └── ...
│   ├── services/           # Serviços auxiliares
│   ├── uploads/            # Ficheiros enviados
│   └── app.js              # Servidor Express
└── docs/                   # Documentação
    ├── api.md             # Documentação da API
    └── SETUP.md           # Guia de configuração
```

## 📚 API Documentation

### Principais Endpoints

#### Autenticação
- `POST /api/auth/login` - Login de utilizador
- `POST /api/auth/register` - Registo de utilizador
- `POST /api/auth/recuperar-password` - Recuperar password

#### Utilizadores
- `GET /api/users` - Listar utilizadores
- `PUT /api/users/:id` - Atualizar utilizador
- `GET /api/users/empresa/:empresaId` - Utilizadores por empresa

#### Assiduidade
- `POST /api/ponto/registo` - Registar ponto
- `GET /api/ponto/historico` - Histórico de registos
- `POST /api/faltas-ferias` - Pedido de faltas/férias

#### Obras
- `GET /api/obras` - Listar obras
- `POST /api/obras` - Criar obra
- `GET /api/obras/:id/equipas` - Equipas de obra

Para documentação completa da API, consulte [`/docs/api.md`](./docs/api.md)

## 🔧 Scripts Úteis

```bash
# Instalar todas as dependências
npm run install:all

# Executar todos os serviços em desenvolvimento
npm run dev:all

# Limpar cache Expo
expo start -c

# Verificar estado da base de dados
npm run db:status

# Build para produção
npm run build:all

# Testes
npm run test:all
```

## 🐛 Resolução de Problemas

### Erro de conexão à base de dados
- Verificar se SQL Server está em execução
- Confirmar credenciais no ficheiro `.env`
- Verificar se a porta 1433 está acessível

### Erro no Expo
- Limpar cache: `expo start -c`
- Reinstalar dependências: `rm -rf node_modules && npm install`

### Problemas de CORS
- Verificar configuração CORS no backend
- Confirmar URLs no frontend config.js

### Problemas de autenticação
- Verificar se JWT_SECRET está definido
- Confirmar se o token não expirou
- Verificar middleware de autenticação

## 🚀 Deploy em Produção

### Replit Deployment
1. Fazer push do código para o repositório
2. Conectar com Replit
3. Configurar variáveis de ambiente
4. Usar porta 3000 para o backend
5. Configurar deployment automático

Para instruções detalhadas, consulte [`/docs/SETUP.md`](./docs/SETUP.md)

## 🤝 Contribuição

1. Fork o projeto
2. Criar branch para feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit das alterações (`git commit -m 'Adicionar nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abrir Pull Request

## 📊 Versioning

Este projeto segue [Semantic Versioning](https://semver.org/). Para ver as alterações:
- [`CHANGELOG.md`](./CHANGELOG.md) - Histórico de versões

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

## 👥 Equipa de Desenvolvimento

- **Backend**: Node.js/Express com Sequelize ORM
- **Frontend**: React Native/Expo com navegação avançada
- **Integração**: API Primavera ERP personalizada
- **Base de Dados**: SQL Server com associações complexas
- **DevOps**: Replit deployment com CI/CD

## 📞 Suporte

Para suporte técnico ou questões sobre o projeto:
- Criar issue no repositório
- Contactar a equipa de desenvolvimento
- Consultar documentação em `/docs/`

---

**Nota**: Este projeto está em desenvolvimento ativo. Versão atual: **1.2.0**
