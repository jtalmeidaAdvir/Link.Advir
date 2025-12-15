# 📧 Relatórios de Pontos por Email - Documentação Completa

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes Criados](#componentes-criados)
4. [Fluxo de Funcionamento](#fluxo-de-funcionamento)
5. [Endpoints API](#endpoints-api)
6. [Configuração e Uso](#configuração-e-uso)
7. [Exemplos](#exemplos)

---

## 🎯 Visão Geral

Sistema automático de envio de relatórios de assiduidade por email para responsáveis de obras. Os emails são enviados automaticamente em horários configuráveis, apenas para obras que tenham pontos registados no dia.

### **Funcionalidades Principais:**
- ✅ Envio automático de emails com relatório de pontos agrupado por obra
- ✅ Configuração de horários e dias da semana para envio
- ✅ Email enviado apenas para obras com pontos registados
- ✅ Informações incluídas: colaborador, hora de entrada, tempo trabalhado até o momento
- ✅ Email enviado ao responsável da obra cadastrado no Primavera
- ✅ Interface de configuração no componente WhatsApp
- ✅ Testes manuais antes de agendar

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  [WhatsAppWebConfig.js] → [RelatoriosPontosTab.js]             │
│         ↓ Configuração de horários e empresas                   │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    WHATSAPP-BACKEND                              │
│  • [relatorioPontosRoutes.js] - API de configuração            │
│  • [relatorioPontosScheduler.js] - Scheduler automático        │
│  • [Schedule Model] - Armazenamento de configurações           │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    WEBPRIMAVERA API                              │
│  • [enviarRelatoriosPontosObras.js] - Orquestrador             │
│  • [emailRelatorioPontos.js] - Template de email               │
│      ↓ Busca email do responsável                              │
│  • [detalhesObra/GetEmailResponsabelObra/:codigo]              │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  • [registoPontoObraRoutes.js]                                  │
│  • [registoPontoObraControllers.js]                             │
│      → obterRelatorioObrasPontos() - Dados agrupados           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Componentes Criados

### **1. Backend - Endpoint de Relatórios**

#### Arquivo: `backend/controllers/registoPontoObraControllers.js`

**Função Nova:** `obterRelatorioObrasPontos()`

**Endpoint:** `GET /api/registro-ponto-obra/relatorio-pontos`

**Parâmetros Query:**
- `data` (opcional): Data específica (formato: YYYY-MM-DD)
- `empresa_id` (opcional): Filtrar por empresa

**Resposta:**
```json
{
  "data": "2025-12-15",
  "totalObras": 3,
  "obras": [
    {
      "obraId": 123,
      "obraNome": "Obra ABC",
      "obraCodigo": "OB123",
      "obraLocalizacao": "Porto",
      "totalColaboradores": 5,
      "colaboradores": [
        {
          "nome": "João Silva",
          "email": "joao@example.com",
          "horaEntrada": "2025-12-15T08:00:00Z",
          "tempoTrabalhadoHoras": 4.5,
          "estaAtivo": true
        }
      ]
    }
  ]
}
```

---

### **2. webPrimaveraApi - Serviço de Email**

#### Arquivo: `webPrimaveraApi/servives/emailRelatorioPontos.js`

**Função:** `sendEmailRelatorioPontos()`

**Endpoint:** `POST /send-email-relatorio-pontos`

**Body:**
```json
{
  "emailDestinatario": "responsavel@example.com",
  "nomeResponsavel": "Maria Silva",
  "obraNome": "Obra ABC",
  "obraCodigo": "OB123",
  "obraLocalizacao": "Porto",
  "colaboradores": [...],
  "data": "2025-12-15",
  "totalColaboradores": 5
}
```

**Template de Email:**
- Header com gradiente azul
- Informações da obra (nome, código, localização)
- Tabela de colaboradores com:
  - Nome
  - Hora de entrada
  - Tempo trabalhado
  - Estado (ATIVO/SAIU)
- Nota informativa
- Contactos de suporte

---

### **3. webPrimaveraApi - Orquestrador de Envios**

#### Arquivo: `webPrimaveraApi/servives/enviarRelatoriosPontosObras.js`

**Funções:**
1. `enviarRelatoriosPontosObras()` - Enviar para todas as obras
2. `enviarRelatorioPontoObra()` - Enviar para uma obra específica

**Endpoint Principal:** `POST /enviar-relatorios-pontos-obras`

**Body:**
```json
{
  "empresa_id": 1,
  "token": "Bearer xxxxx",
  "data": "2025-12-15" // opcional
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Relatórios processados com sucesso",
  "totalObras": 3,
  "emailsEnviados": 2,
  "erros": 1,
  "resultados": [
    {
      "obraId": 123,
      "obraNome": "Obra ABC",
      "emailEnviado": "responsavel@example.com",
      "status": "success"
    },
    {
      "obraId": 124,
      "obraNome": "Obra XYZ",
      "status": "skipped",
      "motivo": "Email do responsável não encontrado"
    }
  ]
}
```

---

### **4. whatsapp-backend - Rotas de Configuração**

#### Arquivo: `whatsapp-backend/routes/relatorioPontosRoutes.js`

**Endpoints:**

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/relatorio-pontos/criar-configuracao` | Criar nova configuração |
| GET | `/api/relatorio-pontos/listar-configuracoes` | Listar todas as configurações |
| PATCH | `/api/relatorio-pontos/toggle-configuracao/:id` | Ativar/desativar |
| DELETE | `/api/relatorio-pontos/eliminar-configuracao/:id` | Eliminar configuração |
| GET | `/api/relatorio-pontos/status-agendamentos` | Status dos agendamentos |
| POST | `/api/relatorio-pontos/atualizar-estatisticas/:empresa_id` | Atualizar stats |

**Exemplo - Criar Configuração:**
```json
{
  "empresa_id": 1,
  "horario": "17:00",
  "ativo": true,
  "diasSemana": [1, 2, 3, 4, 5]  // Segunda a Sexta
}
```

---

### **5. whatsapp-backend - Scheduler Automático**

#### Arquivo: `whatsapp-backend/services/relatorioPontosScheduler.js`

**Classe:** `RelatoriosPontosScheduler`

**Métodos Principais:**
- `start()` - Inicia o scheduler (verifica a cada 60 segundos)
- `stop()` - Para o scheduler
- `checkAndExecute()` - Verifica e executa agendamentos
- `executarEnvioRelatorios(agendamento)` - Executa envio para uma empresa
- `forceExecution(empresaId, token)` - Força execução manual
- `getStatus()` - Retorna status do scheduler

**Comportamento:**
1. Verifica a cada minuto se há agendamentos para executar
2. Compara hora atual com horário configurado
3. Verifica se é um dia da semana válido
4. Verifica se já executou hoje (evita duplicações)
5. Chama webAPI para enviar relatórios
6. Atualiza estatísticas do agendamento

---

### **6. Frontend - Componente de Configuração**

#### Arquivo: `frontend/src/Pages/WhatsApp/components/RelatoriosPontosTab.js`

**Funcionalidades:**
- ✅ Formulário de criação de configuração
- ✅ Seleção de empresa
- ✅ Seleção de horário
- ✅ Seleção de dias da semana (checkboxes interativos)
- ✅ Lista de configurações existentes
- ✅ Botões de ação:
  - 🧪 Testar Agora (envio manual)
  - ⏸️ Desativar / ▶️ Ativar
  - 🗑️ Eliminar
  - 📊 Verificar Status

**Estados:**
- Verde: Configuração ativa
- Vermelho: Configuração desativada

---

## 🔄 Fluxo de Funcionamento

### **Fluxo Automático (Agendado):**

```
1. Scheduler verifica a cada minuto
   ↓
2. Identifica agendamentos ativos que devem executar agora
   ↓
3. Chama webAPI: /enviar-relatorios-pontos-obras
   ↓
4. webAPI busca relatório de pontos do backend
   ↓
5. Para cada obra com pontos:
   a. Busca email do responsável no Primavera
   b. Monta template de email
   c. Envia email via nodemailer
   ↓
6. Atualiza estatísticas do agendamento
   ↓
7. Marca como executado hoje (evita duplicação)
```

### **Fluxo Manual (Teste):**

```
1. Usuário clica "Testar Agora" na interface
   ↓
2. Frontend chama: /enviar-relatorios-pontos-obras
   ↓
3. Mesmo fluxo do automático, mas sem verificação de horário
   ↓
4. Retorna resultados detalhados para o usuário
```

---

## 🚀 Endpoints API - Resumo Completo

### **Backend (porta 3000)**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/registro-ponto-obra/relatorio-pontos` | GET | Obter relatório de pontos agrupado |
| `/api/empresas/listar` | GET | Listar todas as empresas |

### **webPrimaveraApi (porta 3001)**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/send-email-relatorio-pontos` | POST | Enviar email de relatório |
| `/enviar-relatorios-pontos-obras` | POST | Enviar para todas as obras de uma empresa |
| `/enviar-relatorio-ponto-obra` | POST | Enviar para uma obra específica |
| `/detalhesObra/GetEmailResponsabelObra/:codigo` | GET | Buscar email do responsável |

### **whatsapp-backend (porta 7001)**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/relatorio-pontos/criar-configuracao` | POST | Criar configuração |
| `/api/relatorio-pontos/listar-configuracoes` | GET | Listar configurações |
| `/api/relatorio-pontos/toggle-configuracao/:id` | PATCH | Ativar/desativar |
| `/api/relatorio-pontos/eliminar-configuracao/:id` | DELETE | Eliminar |
| `/api/relatorio-pontos/status-agendamentos` | GET | Status detalhado |
| `/api/relatorio-pontos/atualizar-estatisticas/:id` | POST | Atualizar estatísticas |

---

## ⚙️ Configuração e Uso

### **1. Configuração Inicial**

1. Aceder ao frontend em **WhatsApp → Relatórios Pontos**
2. Selecionar a empresa
3. Definir horário de envio (ex: 17:00)
4. Selecionar dias da semana
5. Clicar em "Criar Configuração"

### **2. Teste Manual**

1. Na lista de configurações, clicar em "🧪 Testar Agora"
2. Confirmar o envio
3. Aguardar resultado com detalhes:
   - Total de obras processadas
   - Emails enviados com sucesso
   - Erros ocorridos
   - Detalhes por obra

### **3. Monitorização**

1. Clicar em "📊 Verificar Status"
2. Ver informações:
   - Hora atual
   - Total de agendamentos ativos
   - Próximas execuções
   - Última execução
   - Total de execuções

### **4. Gestão**

- **Desativar temporariamente:** Botão "⏸️ Desativar"
- **Reativar:** Botão "▶️ Ativar"
- **Eliminar:** Botão "🗑️ Eliminar" (solicita confirmação)

---

## 📝 Exemplos

### **Exemplo 1: Criar Configuração para Envio às 17h (Dias Úteis)**

```javascript
// Request
POST https://backend.advir.pt/whatsapi/api/relatorio-pontos/criar-configuracao

{
  "empresa_id": 1,
  "horario": "17:00",
  "ativo": true,
  "diasSemana": [1, 2, 3, 4, 5]
}

// Response
{
  "success": true,
  "message": "Configuração de relatórios criada com sucesso",
  "configuracao": {
    "id": 15,
    "empresa_id": 1,
    "horario": "17:00",
    "diasSemana": [1, 2, 3, 4, 5],
    "ativo": true
  }
}
```

### **Exemplo 2: Teste Manual de Envio**

```javascript
// Request
POST https://webapiprimavera.advir.pt/enviar-relatorios-pontos-obras

{
  "empresa_id": 1,
  "token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response
{
  "success": true,
  "message": "Relatórios processados com sucesso",
  "totalObras": 3,
  "emailsEnviados": 2,
  "erros": 1,
  "resultados": [
    {
      "obraId": 45,
      "obraNome": "Construção Edifício Central",
      "emailEnviado": "maria.silva@jpaconstrutora.com",
      "status": "success"
    },
    {
      "obraId": 67,
      "obraNome": "Reabilitação Fachada Norte",
      "emailEnviado": "joao.santos@jpaconstrutora.com",
      "status": "success"
    },
    {
      "obraId": 89,
      "obraNome": "Ampliação Armazém",
      "status": "skipped",
      "motivo": "Email do responsável não encontrado"
    }
  ]
}
```

### **Exemplo 3: Email Recebido pelo Responsável**

**Assunto:** Relatório de Assiduidade - Construção Edifício Central (15/12/2025)

**Corpo:**
- Header azul com título "Relatório de Assiduidade"
- Informações da obra (nome, código, localização)
- Tabela com colaboradores:
  - João Silva | 08:00 | 8.5h | ATIVO
  - Maria Costa | 08:15 | 8.25h | SAIU
  - Pedro Santos | 09:00 | 7.5h | ATIVO
- Nota: "Este relatório inclui apenas os colaboradores que registaram ponto..."
- Contactos de suporte

---

## 🔒 Segurança e Considerações

### **Autenticação:**
- Endpoints do backend requerem token JWT via `authMiddleware`
- webPrimaveraApi valida token antes de enviar emails
- Scheduler usa token de sistema (configurável via `SYSTEM_TOKEN`)

### **Validações:**
- Verifica se obra tem pontos antes de enviar email
- Verifica se responsável tem email cadastrado
- Evita envios duplicados no mesmo dia
- Valida horários e dias da semana configurados

### **Performance:**
- Scheduler roda a cada 60 segundos (leve)
- Processamento assíncrono de emails
- Timeout de 60 segundos para requests
- Cache de execuções do dia em memória

### **Tratamento de Erros:**
- Erros individuais não bloqueiam outros envios
- Logs detalhados em cada etapa
- Retorno de status por obra (success/error/skipped)
- Estatísticas atualizadas mesmo com falhas parciais

---

## 📊 Modelo de Dados

### **Schedule (whatsapp-backend)**

```sql
{
  id: INTEGER (PK),
  message: STRING,
  contact_list: JSON,
  frequency: STRING ('custom'),
  time: DATE (horário configurado),
  days: JSON ([1,2,3,4,5]),  -- Array de dias da semana
  start_date: DATE,
  enabled: BOOLEAN,
  priority: STRING,
  tipo: STRING ('relatorio_pontos_email'),
  empresa_id: INTEGER,
  last_sent: DATE,
  total_sent: INTEGER
}
```

---

## 🎨 Interface do Usuário

### **Tab "Relatórios Pontos" no WhatsApp**

1. **Seção Superior:**
   - Título e descrição
   - Botão "Verificar Status"

2. **Formulário de Nova Configuração:**
   - Dropdown de empresas
   - Input de horário (time picker)
   - Botões de dias da semana (interativos)
   - Botão "Criar Configuração"

3. **Lista de Configurações:**
   - Cards coloridos (verde=ativo, vermelho=inativo)
   - Informações: empresa, horário, dias, execuções
   - Botões de ação: Testar, Ativar/Desativar, Eliminar

4. **Seção Informativa:**
   - Caixa amarela com informações importantes
   - Lista de pontos-chave do funcionamento

---

## ✅ Checklist de Implementação

- [x] Endpoint de relatório de pontos agrupado no backend
- [x] Serviço de envio de emails com template
- [x] Orquestrador de envios na webPrimaveraApi
- [x] Rotas de configuração no whatsapp-backend
- [x] Scheduler automático
- [x] Componente de interface no frontend
- [x] Integração com endpoint de responsável de obra
- [x] Endpoint de listagem de empresas
- [x] Documentação completa

---

## 🚀 Próximos Passos (Opcionais)

1. **Notificações:**
   - Enviar notificação push quando relatório é enviado
   - WhatsApp notification ao responsável

2. **Relatórios Avançados:**
   - PDF anexado ao email
   - Gráficos de assiduidade
   - Comparativo com dias anteriores

3. **Configurações Extras:**
   - Múltiplos horários por empresa
   - Filtro por obra específica
   - Template de email customizável

4. **Dashboard:**
   - Estatísticas de envios
   - Taxa de abertura de emails
   - Histórico de relatórios enviados

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
- **Email:** support@advir.pt
- **Tel.:** +351 253 176 493

---

**Documento criado em:** 15/12/2025
**Versão:** 1.0
**Autor:** Sistema Link.Advir - Claude Code
