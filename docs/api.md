
# API Documentation - AdvirLink

## Base URL
```
Desenvolvimento: http://0.0.0.0:5000/api
Produção: https://seu-dominio.com/api
```

## Autenticação

Todas as rotas protegidas requerem um token JWT no header:
```
Authorization: Bearer <token>
```

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

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@example.com",
    "tipoUser": "admin"
  }
}
```

#### POST `/api/auth/register`
Registar novo utilizador.

**Request Body:**
```json
{
  "nome": "João Silva",
  "email": "joao@example.com",
  "password": "password123",
  "empresaId": 1
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

### 🏢 Empresas (`/api/empresas`)

#### GET `/api/empresas`
Listar todas as empresas disponíveis.

**Response:**
```json
{
  "success": true,
  "empresas": [
    {
      "id": 1,
      "nome": "Empresa A",
      "codigo": "EMP001",
      "ativa": true
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
  "endereco": "Rua da Empresa, 123"
}
```

### ⏰ Registo de Ponto (`/api/ponto`)

#### POST `/api/ponto/registo`
Registar entrada/saída de ponto.

**Request Body:**
```json
{
  "tipo": "entrada", // ou "saida"
  "localizacao": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "obraId": 1 // opcional, para ponto de obra
}
```

#### GET `/api/ponto/historico`
Obter histórico de registos do utilizador.

**Query Parameters:**
- `dataInicio`: Data início (YYYY-MM-DD)
- `dataFim`: Data fim (YYYY-MM-DD)
- `page`: Página (default: 1)
- `limit`: Registos por página (default: 20)

**Response:**
```json
{
  "success": true,
  "registos": [
    {
      "id": 1,
      "tipo": "entrada",
      "dataHora": "2024-01-15T08:00:00.000Z",
      "obra": {
        "nome": "Obra ABC"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

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
      "dataFim": "2024-12-31"
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
  "endereco": "Local da Obra",
  "dataInicio": "2024-01-01",
  "dataFim": "2024-12-31"
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

### 📝 Partes Diárias (`/api/partes-diarias`)

#### POST `/api/partes-diarias`
Criar parte diária de obra.

**Request Body:**
```json
{
  "obraId": 1,
  "data": "2024-01-15",
  "condicoes_tempo": "Bom",
  "trabalhos_executados": "Betonagem estrutural",
  "materiais_utilizados": "Betão C25/30",
  "observacoes": "Trabalhos concluídos conforme planeado"
}
```

### 🔧 Serviços (`/api/servicos`)

#### GET `/api/pedidos-assistencia`
Listar pedidos de assistência técnica.

**Query Parameters:**
- `status`: Filtrar por status
- `tecnicoId`: Filtrar por técnico
- `dataInicio`: Data início
- `dataFim`: Data fim

#### POST `/api/pedidos-assistencia`
Criar novo pedido de assistência.

**Request Body:**
```json
{
  "cliente": "Cliente ABC",
  "equipamento": "Máquina XYZ",
  "descricao": "Problema na máquina",
  "prioridade": "alta"
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
    "pedidos_mes": 150,
    "intervencoes_concluidas": 120,
    "tempo_medio_resposta": "2.5 horas",
    "satisfacao_cliente": 4.2
  }
}
```

## Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Erro na requisição
- `401` - Não autorizado
- `403` - Proibido
- `404` - Não encontrado
- `422` - Erro de validação
- `500` - Erro interno do servidor

## Tratamento de Erros

Formato padrão de resposta de erro:
```json
{
  "success": false,
  "error": "Mensagem do erro",
  "details": {
    "field": "Campo específico com erro",
    "code": "ERROR_CODE"
  }
}
```

## Rate Limiting

- Máximo 100 requests por minuto por IP
- Máximo 1000 requests por hora por utilizador autenticado

## Versionamento

A API usa versionamento por URL:
- Versão atual: `/api/v1/`
- Versões anteriores mantidas por compatibilidade

## Webhooks

Para eventos em tempo real, a API suporta webhooks:

### Eventos Disponíveis
- `ponto.registado` - Novo registo de ponto
- `pedido.criado` - Novo pedido de assistência
- `intervencao.concluida` - Intervenção finalizada

### Configuração
```json
{
  "url": "https://seu-endpoint.com/webhook",
  "events": ["ponto.registado", "pedido.criado"],
  "secret": "webhook_secret"
}
```
