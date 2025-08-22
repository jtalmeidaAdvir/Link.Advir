
# API Documentation - AdvirLink

## Base URL
```
Desenvolvimento: http://0.0.0.0:3000/api
Produção: https://seu-dominio.replit.app/api
```

## Autenticação

Todas as rotas protegidas requerem um token JWT no header:
```
Authorization: Bearer <token>
```

O token é retornado no login e tem validade configurável (padrão: 7 dias).

## Endpoints

### 🔐 Autenticação (`/api/auth`)

#### POST `/api/auth/login`
Autenticar utilizador no sistema.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@example.com",
    "tipoUser": "Administrador",
    "codFuncionario": "F001",
    "empresas": [
      {
        "id": 1,
        "nome": "Empresa Principal",
        "codigo": "EMP001"
      }
    ]
  }
}
```

#### POST `/api/auth/register`
Registar novo utilizador (apenas admin).

**Request Body:**
```json
{
  "nome": "João Silva",
  "email": "joao@example.com",
  "password": "password123",
  "tipoUser": "Trabalhador",
  "codFuncionario": "F002",
  "empresaIds": [1, 2]
}
```

#### POST `/api/auth/recuperar-password`
Enviar email de recuperação de password.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### POST `/api/auth/redefinir-password/:token`
Redefinir password com token recebido por email.

**Request Body:**
```json
{
  "newPassword": "newPassword123"
}
```

#### POST `/api/auth/verificar-conta/:token`
Verificar conta de utilizador.

### 🏢 Empresas (`/api/empresas`)

#### GET `/api/empresas`
Listar todas as empresas disponíveis para o utilizador.

**Response:**
```json
{
  "success": true,
  "empresas": [
    {
      "id": 1,
      "nome": "Empresa Principal",
      "codigo": "EMP001",
      "ativa": true,
      "endereco": "Rua Principal, 123",
      "telefone": "123456789",
      "email": "geral@empresa.com"
    }
  ]
}
```

#### POST `/api/empresas`
Criar nova empresa (apenas admin).

**Request Body:**
```json
{
  "nome": "Nova Empresa",
  "codigo": "EMP002",
  "endereco": "Rua da Empresa, 123",
  "telefone": "987654321",
  "email": "geral@novaempresa.com"
}
```

### 👥 Utilizadores (`/api/users`)

#### GET `/api/users`
Listar utilizadores (com filtros opcionais).

**Query Parameters:**
- `empresaId`: Filtrar por empresa
- `tipoUser`: Filtrar por tipo de utilizador
- `ativo`: Filtrar por estado (true/false)

#### GET `/api/users/:id`
Obter detalhes de um utilizador específico.

#### PUT `/api/users/:id`
Atualizar utilizador.

**Request Body:**
```json
{
  "nome": "João Silva Atualizado",
  "email": "joao.novo@example.com",
  "tipoUser": "Encarregado"
}
```

#### GET `/api/users/empresa/:empresaId`
Listar utilizadores de uma empresa específica.

### ⏰ Registo de Ponto (`/api/ponto`)

#### POST `/api/ponto/registo`
Registar entrada/saída de ponto.

**Request Body:**
```json
{
  "tipo": "entrada",
  "localizacao": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "endereco": "Rua Principal, 123"
  },
  "obraId": 1,
  "observacoes": "Registo normal"
}
```

**Response:**
```json
{
  "success": true,
  "registo": {
    "id": 123,
    "tipo": "entrada",
    "dataHora": "2024-01-15T08:00:00.000Z",
    "localizacao": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "obra": {
      "nome": "Construção Edifício A"
    }
  }
}
```

#### GET `/api/ponto/historico`
Obter histórico de registos do utilizador.

**Query Parameters:**
- `dataInicio`: Data início (YYYY-MM-DD)
- `dataFim`: Data fim (YYYY-MM-DD)
- `page`: Página (default: 1)
- `limit`: Registos por página (default: 20)
- `userId`: ID do utilizador (apenas admin)

#### GET `/api/ponto/admin/registos`
Listar todos os registos para admin.

#### PUT `/api/ponto/:id`
Editar registo de ponto (admin).

### 🏗️ Obras (`/api/obras`)

#### GET `/api/obras`
Listar obras disponíveis para o utilizador.

**Response:**
```json
{
  "success": true,
  "obras": [
    {
      "id": 1,
      "nome": "Construção Edifício A",
      "codigo": "OBR001",
      "status": "ativa",
      "dataInicio": "2024-01-01",
      "dataFim": "2024-12-31",
      "endereco": "Local da Obra",
      "responsavel": {
        "nome": "João Silva"
      }
    }
  ]
}
```

#### POST `/api/obras`
Criar nova obra (apenas admin).

**Request Body:**
```json
{
  "nome": "Nova Obra",
  "codigo": "OBR002",
  "endereco": "Local da Nova Obra",
  "dataInicio": "2024-01-01",
  "dataFim": "2024-12-31",
  "responsavelId": 1
}
```

#### GET `/api/obras/:id/equipas`
Listar equipas de uma obra.

#### POST `/api/obras/:id/equipas`
Criar equipa para obra.

**Request Body:**
```json
{
  "nome": "Equipa A",
  "responsavelId": 1,
  "membros": [2, 3, 4]
}
```

#### GET `/api/obras/:id/mapa-registos`
Obter mapa de registos de uma obra.

**Query Parameters:**
- `dataInicio`: Data início
- `dataFim`: Data fim

### 📝 Partes Diárias (`/api/partes-diarias`)

#### POST `/api/partes-diarias`
Criar parte diária de obra.

**Request Body:**
```json
{
  "obraId": 1,
  "data": "2024-01-15",
  "condicoesTempo": "Bom",
  "trabalhosExecutados": "Betonagem estrutural",
  "materiaisUtilizados": "Betão C25/30",
  "observacoes": "Trabalhos concluídos conforme planeado",
  "fotografias": ["url1.jpg", "url2.jpg"]
}
```

#### GET `/api/partes-diarias`
Listar partes diárias.

**Query Parameters:**
- `obraId`: Filtrar por obra
- `dataInicio`: Data início
- `dataFim`: Data fim

### 🔧 Serviços (`/api/servicos` - API Primavera)

#### GET `/api/pedidos-assistencia`
Listar pedidos de assistência técnica.

**Query Parameters:**
- `status`: Filtrar por status
- `tecnicoId`: Filtrar por técnico
- `dataInicio`: Data início
- `dataFim`: Data fim

**Response:**
```json
{
  "success": true,
  "pedidos": [
    {
      "id": 1,
      "numero": "PED001",
      "cliente": "Cliente ABC",
      "equipamento": "Máquina XYZ",
      "descricao": "Problema na máquina",
      "prioridade": "alta",
      "status": "aberto",
      "tecnico": {
        "nome": "Técnico A"
      },
      "dataAbertura": "2024-01-15T09:00:00.000Z"
    }
  ]
}
```

#### POST `/api/pedidos-assistencia`
Criar novo pedido de assistência.

**Request Body:**
```json
{
  "cliente": "Cliente ABC",
  "equipamento": "Máquina XYZ",
  "descricao": "Problema detalhado na máquina",
  "prioridade": "alta",
  "tecnicoId": 1
}
```

#### GET `/api/intervencoes`
Listar intervenções técnicas.

#### POST `/api/intervencoes`
Registar nova intervenção.

**Request Body:**
```json
{
  "pedidoId": 1,
  "descricao": "Substituição de peça X",
  "tempoGasto": 120,
  "materiais": "Peça X, Óleo Y",
  "observacoes": "Intervenção concluída com sucesso"
}
```

### 📊 Analytics (`/api/analytics`)

#### GET `/api/analytics/dashboard`
Obter dados para dashboard principal.

**Response:**
```json
{
  "success": true,
  "data": {
    "pedidosMes": 150,
    "intervencoesConcluidas": 120,
    "tempoMedioResposta": "2.5 horas",
    "satisfacaoCliente": 4.2,
    "tecnicosAtivos": 8,
    "equipamentosManutencao": 25
  }
}
```

#### GET `/api/analytics/por-tecnico/:tecnicoId`
Analytics específicas por técnico.

**Query Parameters:**
- `dataInicio`: Data início
- `dataFim`: Data fim

### 📄 Oficios (`/api/oficios` - API Primavera)

#### GET `/api/oficios`
Listar ofícios criados.

#### POST `/api/oficios`
Criar novo ofício.

**Request Body:**
```json
{
  "destinatario": "Cliente XYZ",
  "assunto": "Proposta de Serviços",
  "conteudo": "Conteúdo do ofício...",
  "template": "template1",
  "anexos": ["documento1.pdf"]
}
```

#### POST `/api/oficios/:id/enviar`
Enviar ofício por email.

### 🏆 Concursos (`/api/concursos`)

#### GET `/api/concursos`
Listar concursos.

**Query Parameters:**
- `status`: Filtrar por status
- `ano`: Filtrar por ano

#### POST `/api/concursos`
Criar novo concurso.

#### PUT `/api/concursos/:id/aprovar`
Aprovar concurso (apenas admin).

### 🔕 Faltas e Férias (`/api/faltas-ferias`)

#### POST `/api/faltas-ferias`
Criar pedido de falta/férias.

**Request Body:**
```json
{
  "tipo": "ferias",
  "dataInicio": "2024-07-01",
  "dataFim": "2024-07-15",
  "observacoes": "Férias de verão"
}
```

#### GET `/api/faltas-ferias/pendentes`
Listar pedidos pendentes de aprovação.

#### PUT `/api/faltas-ferias/:id/aprovar`
Aprovar/rejeitar pedido.

### 📱 WhatsApp (`/api/whatsapp`)

#### GET `/api/whatsapp/status`
Verificar status da conexão WhatsApp.

#### POST `/api/whatsapp/send`
Enviar mensagem via WhatsApp.

**Request Body:**
```json
{
  "numero": "351912345678",
  "mensagem": "Olá! Esta é uma mensagem automática.",
  "anexos": ["documento.pdf"]
}
```

#### GET `/api/whatsapp/schedules`
Listar mensagens agendadas.

#### POST `/api/whatsapp/schedules`
Criar novo agendamento.

### 🔔 Notificações (`/api/notificacoes`)

#### GET `/api/notificacoes`
Listar notificações do utilizador.

#### PUT `/api/notificacoes/:id/lida`
Marcar notificação como lida.

#### POST `/api/notificacoes/enviar`
Enviar notificação (admin).

### 🔧 Módulos e Submódulos (`/api/modulos`)

#### GET `/api/modulos`
Listar módulos disponíveis.

#### GET `/api/modulos/:id/submodulos`
Listar submódulos de um módulo.

#### PUT `/api/users/:userId/modulos`
Atualizar módulos de um utilizador.

**Request Body:**
```json
{
  "modulos": [
    {
      "moduloId": 1,
      "ativo": true,
      "submodulos": [1, 2, 3]
    }
  ]
}
```

## Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Erro na requisição (dados inválidos)
- `401` - Não autorizado (token inválido/expirado)
- `403` - Proibido (sem permissões)
- `404` - Não encontrado
- `409` - Conflito (recurso já existe)
- `422` - Erro de validação
- `429` - Muitas requisições (rate limiting)
- `500` - Erro interno do servidor

## Tratamento de Erros

Formato padrão de resposta de erro:
```json
{
  "success": false,
  "error": "Mensagem descritiva do erro",
  "details": {
    "field": "Campo específico com erro",
    "code": "ERROR_CODE",
    "timestamp": "2024-01-15T10:00:00.000Z"
  }
}
```

### Códigos de Erro Comuns

- `AUTH_INVALID_CREDENTIALS` - Credenciais inválidas
- `AUTH_TOKEN_EXPIRED` - Token expirado
- `AUTH_TOKEN_INVALID` - Token inválido
- `VALIDATION_ERROR` - Erro de validação de dados
- `RESOURCE_NOT_FOUND` - Recurso não encontrado
- `PERMISSION_DENIED` - Sem permissões
- `DUPLICATE_ENTRY` - Entrada duplicada
- `DATABASE_ERROR` - Erro na base de dados

## Rate Limiting

- **Geral**: Máximo 100 requests por minuto por IP
- **Autenticação**: Máximo 5 tentativas de login por minuto
- **Upload de ficheiros**: Máximo 10 uploads por minuto
- **WhatsApp**: Máximo 50 mensagens por hora

## Paginação

Endpoints que retornam listas suportam paginação:

**Query Parameters:**
- `page`: Número da página (default: 1)
- `limit`: Itens por página (default: 20, max: 100)
- `sort`: Campo para ordenação
- `order`: Direção da ordenação (asc/desc)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtros e Pesquisa

Muitos endpoints suportam filtros avançados:

**Query Parameters:**
- `search`: Pesquisa por texto
- `dateFrom`: Data início (YYYY-MM-DD)
- `dateTo`: Data fim (YYYY-MM-DD)
- `status`: Filtrar por status
- `type`: Filtrar por tipo

## Upload de Ficheiros

### POST `/api/upload`
Upload de ficheiros (imagens, documentos).

**Request:** `multipart/form-data`
- Campo: `file`
- Tipos suportados: JPG, PNG, PDF, DOC, DOCX
- Tamanho máximo: 10MB

**Response:**
```json
{
  "success": true,
  "file": {
    "filename": "documento_123456.pdf",
    "originalName": "documento.pdf",
    "size": 1024000,
    "url": "/uploads/documento_123456.pdf"
  }
}
```

## Webhooks

Para eventos em tempo real, a API suporta webhooks:

### Eventos Disponíveis
- `ponto.registado` - Novo registo de ponto
- `pedido.criado` - Novo pedido de assistência
- `intervencao.concluida` - Intervenção finalizada
- `user.criado` - Novo utilizador registado
- `falta.pendente` - Nova falta pendente de aprovação

### Configuração de Webhook
```json
{
  "url": "https://seu-endpoint.com/webhook",
  "events": ["ponto.registado", "pedido.criado"],
  "secret": "webhook_secret_key",
  "active": true
}
```

### Payload de Exemplo
```json
{
  "event": "ponto.registado",
  "data": {
    "id": 123,
    "userId": 1,
    "tipo": "entrada",
    "dataHora": "2024-01-15T08:00:00.000Z"
  },
  "timestamp": "2024-01-15T08:00:05.000Z"
}
```

## Versionamento

A API usa versionamento por URL:
- **Versão atual**: `/api/v1/`
- **Versões anteriores**: Mantidas por compatibilidade
- **Headers**: `Accept: application/vnd.advirlink.v1+json`

## Autenticação Biométrica

### POST `/api/auth/biometric/register`
Registar credenciais biométricas.

### POST `/api/auth/biometric/verify`
Verificar autenticação biométrica.

## Configuração CORS

A API está configurada para aceitar requests de:
- `http://localhost:*` (desenvolvimento)
- `http://0.0.0.0:*` (desenvolvimento)
- `https://*.replit.app` (produção)
- Origens configuradas em `ALLOWED_ORIGINS`

## Exemplo de Integração

```javascript
// Configuração do cliente
const API_BASE = 'http://0.0.0.0:3000/api';
const token = localStorage.getItem('authToken');

// Headers padrão
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// Exemplo de uso
async function registarPonto(dados) {
  const response = await fetch(`${API_BASE}/ponto/registo`, {
    method: 'POST',
    headers,
    body: JSON.stringify(dados)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return result.registo;
}
```

## Monitorização e Logs

- **Health Check**: `GET /api/health`
- **Logs**: Winston logger configurado
- **Métricas**: Disponíveis em `/api/metrics` (admin)

---

**Nota**: Esta documentação refere-se à versão 1.2.0 da API. Para versões anteriores, consulte o histórico no CHANGELOG.md.
