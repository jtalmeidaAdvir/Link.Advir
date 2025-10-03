
# Email Processor Backend - Criação Automática de Pedidos

Sistema automatizado que lê emails com anexos PDF (Ordens de Trabalho) e cria pedidos de assistência técnica automaticamente.

## Funcionalidades

- ✅ Conexão IMAP com servidor de email (Gmail, Outlook, etc.)
- ✅ Leitura automática de emails não lidos a cada 5 minutos
- ✅ Extração de dados de anexos PDF
- ✅ Parsing inteligente de Ordens de Trabalho
- ✅ Criação automática de pedidos no sistema
- ✅ Marcação de emails como lidos após processamento
- ✅ API REST para monitoramento e controle

## Configuração

### 1. Instalar dependências

```bash
cd email-processor-backend
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e configure:

```env
# Para Gmail
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_USER=support@advir.pt
EMAIL_PASSWORD=sua_app_password
EMAIL_TLS=true

# URL do backend principal
BACKEND_API_URL=http://localhost:3000

PORT=3005
```

**⚠️ IMPORTANTE para Gmail:**
- Ative a autenticação de 2 fatores
- Gere uma "App Password" em: https://myaccount.google.com/apppasswords
- Use essa senha no campo EMAIL_PASSWORD

### 3. Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## API Endpoints

### GET /status
Retorna status do processamento

```json
{
  "isRunning": false,
  "lastRun": "2024-01-15T10:30:00Z",
  "emailsProcessed": 5,
  "errors": []
}
```

### POST /process-now
Força processamento imediato

### GET /test-connection
Testa conexão com servidor de email

## Formato de PDF Esperado

O sistema está otimizado para processar PDFs de "Ordem de Trabalho" com os seguintes campos:

- Número da Ordem
- Data e Data Limite
- Título e Categoria
- Dados do Fornecedor (nome, email, telefone)
- Dados do Cliente/Loja
- Descrição do problema
- Lista de equipamentos

## Personalização

Para adaptar a outros formatos de PDF, edite o método `parseOrdemTrabalho()` em `services/pdfProcessor.js`.

## Agendamento

Por padrão, o sistema verifica emails novos a cada 5 minutos. Para alterar, edite a linha:

```javascript
cron.schedule('*/5 * * * *', () => { ... });
```

Exemplos:
- `*/1 * * * *` - A cada 1 minuto
- `0 * * * *` - A cada hora
- `0 9-17 * * *` - A cada hora das 9h às 17h
