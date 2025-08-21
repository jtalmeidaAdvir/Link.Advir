
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
- Sistema de login multi-empresa
- Gestão de perfis de utilizador
- Recuperação de password
- Controlo de acesso baseado em módulos

### Assiduidade e Ponto
- Registo de ponto com QR Code
- Gestão de horários de trabalho
- Aprovação de faltas e férias
- Relatórios de assiduidade

### Gestão de Obras
- Criação e gestão de equipas
- Partes diárias de obra
- Autos de medição
- Controlo de pessoal por obra

### Serviços e Assistência Técnica
- Dashboard de analytics
- Gestão de pedidos de assistência
- Registo de intervenções
- Análise por técnico

### Oficios e Documentação
- Criação e edição de ofícios
- Templates de documentos
- Sistema de aprovações

### Concursos
- Gestão de processos de concurso
- Sistema de aprovação
- Documentação automática

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React Native** com Expo
- **React Navigation** para navegação
- **Axios** para comunicação HTTP
- **React Native Paper** para UI
- **Framer Motion** para animações
- **Chart Kit** para gráficos

### Backend
- **Node.js** com Express
- **Sequelize** ORM
- **SQL Server** com driver Tedious
- **JWT** para autenticação
- **Bcrypt** para encriptação
- **Multer** para upload de ficheiros

### API Externa
- **Primavera ERP** integration
- **Nodemailer** para envio de emails
- **OpenAI** integration

## 📋 Pré-requisitos

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **SQL Server** (local ou remoto)
- **Expo CLI** instalado globalmente
- **Git** para controlo de versões

## ⚙️ Instalação

### 1. Clonar o repositório
```bash
git clone <repository-url>
cd AdvirLink
```

### 2. Instalar dependências do Backend
```bash
cd backend
npm install
```

### 3. Instalar dependências do Frontend
```bash
cd ../frontend
npm install
```

### 4. Instalar dependências da API Primavera
```bash
cd ../webPrimaveraApi
npm install
```

## 🔧 Configuração

### 1. Configurar Base de Dados (Backend)
Criar ficheiro `.env` na pasta `backend`:
```env
DB_NAME=seu_database
DB_USERNAME=seu_usuario
DB_PASSWORD=sua_password
DB_HOST=localhost
DB_PORT=1433
JWT_SECRET=seu_jwt_secret_muito_seguro
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_password_app
```

### 2. Configurar Frontend
Editar o ficheiro `frontend/config.js`:
```javascript
const config = {
  API_BASE_URL: 'http://localhost:3000',
  PRIMAVERA_API_URL: 'http://0.0.0.0:3001',
  // outras configurações...
};
```

### 3. Configurar SQL Server
- Assegurar que a porta 1433 está aberta
- Criar a base de dados
- Executar migrações se necessário

## 🚀 Execução

### 1. Iniciar Backend
```bash
cd backend
npm start
# Servidor disponível em http://localhost:3000
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
npm start
# ou
expo start
```

### 4. Executar em dispositivo/simulador
- **Web**: Pressionar 'w' no terminal do Expo
- **Android**: Pressionar 'a' (requer Android Studio/emulador)
- **iOS**: Pressionar 'i' (requer Xcode - apenas macOS)

## 📁 Estrutura do Projeto

```
AdvirLink/
├── backend/                 # API Principal
│   ├── config/             # Configurações (DB, Email)
│   ├── controllers/        # Controladores de negócio
│   ├── middleware/         # Middleware de autenticação
│   ├── models/            # Modelos Sequelize
│   ├── routes/            # Rotas da API
│   └── utils/             # Utilitários
├── frontend/               # Aplicação React Native
│   ├── assets/            # Recursos estáticos
│   ├── src/
│   │   ├── Pages/         # Páginas da aplicação
│   │   ├── styles/        # Estilos globais
│   │   ├── templates/     # Templates de documentos
│   │   └── utils/         # Utilitários frontend
├── webPrimaveraApi/        # API Integração Primavera
│   ├── routes/            # Rotas específicas Primavera
│   ├── services/          # Serviços auxiliares
│   └── uploads/           # Ficheiros enviados
└── docs/                   # Documentação (a criar)
```

## 📚 API Documentation

### Endpoints Principais

#### Autenticação
- `POST /api/auth/login` - Login de utilizador
- `POST /api/auth/register` - Registo de utilizador
- `POST /api/auth/recuperar-password` - Recuperar password

#### Empresas
- `GET /api/empresas` - Listar empresas
- `POST /api/empresas` - Criar empresa
- `PUT /api/empresas/:id` - Atualizar empresa

#### Assiduidade
- `POST /api/ponto/registo` - Registar ponto
- `GET /api/ponto/historico` - Histórico de registos
- `POST /api/faltas-ferias` - Pedido de faltas/férias

Para documentação completa da API, consulte `/docs/api.md`

## 🔧 Comandos Úteis

```bash
# Reinstalar dependências
npm install

# Limpar cache Expo
expo start -c

# Verificar estado da base de dados
npm run db:status

# Executar migrações
npm run db:migrate

# Executar seeds
npm run db:seed
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
- Confirmar URLs no frontend

## 🤝 Contribuição

1. Fork o projeto
2. Criar branch para feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit das alterações (`git commit -m 'Adicionar nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abrir Pull Request

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

## 👥 Equipa de Desenvolvimento

- **Backend**: Node.js/Express com Sequelize ORM
- **Frontend**: React Native/Expo
- **Integração**: API Primavera ERP
- **Base de Dados**: SQL Server

## 📞 Suporte

Para suporte técnico ou questões sobre o projeto:
- Criar issue no repositório
- Contactar a equipa de desenvolvimento

---

**Nota**: Este projeto está em desenvolvimento ativo. Consulte o CHANGELOG.md para ver as últimas alterações.
