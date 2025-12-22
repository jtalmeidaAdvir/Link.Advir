# 📱 Modo Offline - Sistema de Picagem de Ponto

## 🎯 Visão Geral

O sistema agora suporta **modo offline**, permitindo que os utilizadores registem o ponto mesmo quando a **WebAPI Primavera** estiver indisponível. Os dados são salvos localmente e sincronizados automaticamente quando a conexão à WebAPI for restaurada.

### 🏗️ Arquitetura do Sistema

O aplicativo utiliza **dois servidores diferentes**:

1. **Backend Principal** (`https://backend.advir.pt`)
   - Sempre disponível
   - Gerencia autenticação, utilizadores, empresas, obras
   - Armazena registos de ponto
   - **Funciona mesmo em "modo offline"**

2. **WebAPI Primavera** (`https://webapiprimavera.advir.pt`)
   - Conexão com o sistema Primavera da empresa
   - Fornece o `painelAdminToken` necessário para certos recursos
   - **Pode falhar** → sistema entra em "modo offline"

**"Modo Offline"** = WebAPI Primavera indisponível, mas backend funcional e utilizador tem internet.

**Suporte para dois sistemas de registo:**
- ✅ **RegistoPonto** - Registo normal (horaEntrada + horaSaida)
- ✅ **RegistoPontoObra** - Registo em obras (entrada/saída por obra)

---

## ✨ Funcionalidades Implementadas

### 1. **Seleção de Empresa Offline**
- Ao selecionar uma empresa, se não houver conexão, o sistema **não bloqueia** mais
- Exibe aviso: "⚠️ Modo Offline: Não foi possível conectar à empresa"
- Permite avançar para a tela Home mesmo sem token do servidor
- Armazena `modoOffline: true` no `secureStorage`

**Arquivo:** [handleEntrarEmpresa.js](frontend/src/Pages/Autenticacao/handlers/handleEntrarEmpresa.js:68-87)

```javascript
// Se falhar conexão
catch (err) {
  console.warn("⚠️ Sem conexão - Entrando em MODO OFFLINE");
  secureStorage.setItem("empresaSelecionada", empresaStr);
  secureStorage.setItem("modoOffline", "true");
  navigation.navigate("Home"); // Avança mesmo assim!
}
```

---

### 2. **Banner Visual de Modo Offline**
- Banner laranja no topo da tela quando sem conexão à WebAPI
- Ícone de alerta
- Mensagem clara: "Sem conexão à WebAPI - Registos serão guardados localmente"

**Arquivo:** [OfflineBanner.js](frontend/src/components/OfflineBanner.js)

```javascript
<OfflineBanner isOffline={modoOffline} />
// Exibe: "Sem conexão à WebAPI - Registos serão guardados localmente"
```

---

### 3. **Registro de Ponto Offline**
O botão de ponto funciona normalmente em modo offline:

**Fluxo Offline:**
1. Usuário clica em "Ponto"
2. Sistema obtém localização GPS
3. Converte coordenadas em endereço (OpenStreetMap)
4. **Salva dados localmente** em `secureStorage`
5. Adiciona à **fila de sincronização**
6. Exibe: "✓ Registo salvo offline! Será sincronizado quando houver conexão"

**Arquivo:** [PontoBotao.js](frontend/src/Pages/Assiduidade/PontoBotao.js:426-445)

```javascript
if (modoOffline) {
  const novoRegisto = {
    id: `offline-${Date.now()}`,
    data: hoje,
    hora: horaAtual,
    latitude: localizacao.latitude,
    longitude: localizacao.longitude,
    endereco,
    // ... outros dados
  };

  salvarRegistoOffline(novoRegisto);
  alert(`✓ Registo salvo offline!`);
}
```

---

### 4. **Armazenamento Local**
Três chaves principais no `secureStorage`:

| Chave | Descrição | Exemplo |
|-------|-----------|---------|
| `modoOffline` | Indica se está em modo offline | `"true"` ou `"false"` |
| `registosOffline` | Array de registos salvos localmente | `[{id, data, hora, lat, lng...}]` |
| `filaSincronizacao` | Fila de registos pendentes para enviar ao servidor | `[{...registo, sincronizado: false}]` |

**Funções:**
- `salvarRegistoOffline()` - Salva registro localmente
- `carregarRegistosOffline()` - Carrega registos do localStorage
- `adicionarFilaSincronizacao()` - Adiciona à fila de sincronização

---

### 5. **Sincronização Automática**
O sistema tenta reconectar automaticamente a cada **30 segundos**:

**Arquivo:** [syncOfflineData.js](frontend/src/utils/syncOfflineData.js)

```javascript
// A cada 30 segundos
setInterval(async () => {
  const resultado = await tentarReconectar();

  if (resultado.reconnected && resultado.synced) {
    alert("✓ Conexão restaurada! Seus dados foram sincronizados.");
    setModoOffline(false);
  }
}, 30000);
```

**Fluxo de Sincronização:**
1. Verifica conexão com servidor
2. Se conectado, busca fila de sincronização
3. Envia cada registo pendente para o backend
4. Marca como `sincronizado: true`
5. Remove dados offline após sucesso
6. Restaura modo online

---

## 📋 Funções Utilitárias

### `sincronizarDadosOffline()`
Sincroniza todos os registos offline com o servidor.

**Retorno:**
```javascript
{
  success: true,        // Se todos sincronizaram
  syncedCount: 3,       // Quantidade sincronizada
  errors: []            // Lista de erros (se houver)
}
```

### `verificarConexao()`
Verifica se há conexão com a **WebAPI Primavera** (NÃO o backend).

**Processo:**
1. Busca credenciais da empresa no backend
2. Tenta obter token da WebAPI Primavera
3. Se sucesso, salva `painelAdminToken` e `urlempresa`

**Retorno:** `true` (WebAPI disponível) ou `false` (WebAPI indisponível)

### `tentarReconectar()`
Tenta reconectar à **WebAPI Primavera** e sincronizar automaticamente.

**Processo:**
1. Chama `verificarConexao()` para verificar WebAPI Primavera
2. Se WebAPI disponível, chama `sincronizarDadosOffline()`
3. Sincroniza todos os registos pendentes

**Retorno:**
```javascript
{
  reconnected: true,    // Se conseguiu reconectar à WebAPI
  synced: true,         // Se sincronizou os dados
  result: {...}         // Resultado da sincronização
}
```

**IMPORTANTE**: Só reconecta quando a **WebAPI Primavera** volta a funcionar, não apenas quando há internet.

---

## 🔄 Fluxo Completo

### **Cenário: Utilizador sem Conexão à WebAPI Primavera**

**IMPORTANTE**: "Modo Offline" significa que a WebAPI Primavera está indisponível, mas o backend (https://backend.advir.pt) continua funcional. O utilizador tem internet, apenas não consegue conectar à WebAPI da empresa.

```
1. LOGIN
   ├─ Usuário faz login (com internet)
   ├─ Token salvo em secureStorage
   └─ Navega para Seleção de Empresa

2. SELEÇÃO DE EMPRESA (WEBAPI FALHA)
   ├─ Tenta buscar credenciais da WebAPI → FALHA
   ├─ Busca empresa_id do backend → SUCESSO (backend funciona!)
   ├─ Entra em MODO OFFLINE (sem token da WebAPI)
   ├─ Salva empresa selecionada localmente
   ├─ Exibe aviso: "Sem conexão à WebAPI"
   └─ Navega para Home

3. REGISTRO DE PONTO (SEM WEBAPI)
   ├─ Clica em "Ponto"
   ├─ Carrega obras do backend (funciona normalmente!)
   ├─ Obtém localização GPS
   ├─ Salva registro em secureStorage
   ├─ Adiciona à fila de sincronização
   └─ Exibe: "Registo salvo offline!"

4. SINCRONIZAÇÃO AUTOMÁTICA
   ├─ A cada 30s tenta reconectar à WebAPI Primavera
   ├─ Busca credenciais do backend (funciona)
   ├─ Tenta obter token da WebAPI → Se falhar, espera mais 30s
   ├─ Quando WebAPI responder com sucesso:
   │  ├─ Salva painelAdminToken
   │  ├─ Envia todos registos pendentes ao backend
   │  ├─ Marca como sincronizado
   │  └─ Remove dados offline
   └─ Exibe: "Conexão restaurada!"

5. MODO ONLINE RESTAURADO
   ├─ Banner offline desaparece
   ├─ Dados sincronizados com servidor
   └─ WebAPI e backend funcionam normalmente
```

---

## 🛠️ Arquivos Modificados/Criados

### Modificados:
1. **[handleEntrarEmpresa.js](frontend/src/Pages/Autenticacao/handlers/handleEntrarEmpresa.js)**
   - Adicionado fallback para modo offline (linha 68-87)

2. **[PontoBotao.js](frontend/src/Pages/Assiduidade/PontoBotao.js)**
   - Adicionado estado `modoOffline` (linha 26)
   - Adicionado import `OfflineBanner` (linha 8)
   - Adicionado import `tentarReconectar` (linha 9)
   - Funções offline: `carregarRegistosOffline`, `salvarRegistoOffline` (linhas 213-276)
   - Modificado `registarPonto` para funcionar offline (linhas 405-486)
   - Adicionado banner no render (linha 686)
   - Sincronização automática (linhas 171-184)

### Criados:
1. **[OfflineBanner.js](frontend/src/components/OfflineBanner.js)**
   - Componente visual de banner offline

2. **[syncOfflineData.js](frontend/src/utils/syncOfflineData.js)**
   - Utilitários de sincronização
   - Funções: `sincronizarDadosOffline`, `verificarConexao`, `tentarReconectar`

3. **[MODO_OFFLINE_DOCUMENTACAO.md](MODO_OFFLINE_DOCUMENTACAO.md)**
   - Este documento

---

## 🧪 Como Testar

### Teste 1: Simular Falha da WebAPI
1. **Método 1**: Desligar/bloquear temporariamente a WebAPI Primavera
2. **Método 2**: Modificar temporariamente o endpoint da WebAPI no código para causar erro
3. Fazer login normalmente (backend funciona)
4. Selecionar empresa → WebAPI falha mas backend obtém empresa_id
5. ✅ **Deve avançar** com aviso "Sem conexão à WebAPI"
6. Banner laranja aparece no topo

### Teste 2: Registar Ponto sem WebAPI
1. Em modo offline (WebAPI indisponível, backend funcional)
2. Abrir RegistoPontoObra
3. ✅ **Obras devem carregar normalmente** (vem do backend!)
4. Selecionar obra e clicar em "Entrada" ou scan QR code
5. ✅ **Deve salvar** com mensagem "ENTRADA registada offline na obra..."
6. Verificar `secureStorage` → deve ter `registosObraOffline` e `filaSincronizacao`

### Teste 3: Sincronização Automática
1. Com registos offline salvos
2. Restaurar conexão à WebAPI Primavera
3. Aguardar até 30 segundos
4. ✅ **Deve exibir** "Conexão restaurada! Seus dados foram sincronizados"
5. Banner offline desaparece
6. Dados enviados ao backend (que sempre funcionou)

### Teste 4: Backend Sempre Funcional
1. Em modo offline (sem WebAPI)
2. ✅ **Verificar que funciona**:
   - Carregar lista de obras
   - Buscar informações da empresa
   - Autenticação (loginToken)
3. ✅ **Não funciona** (salvará offline):
   - Conexão direta com Primavera
   - Recursos que dependem de painelAdminToken

---

## 📊 Dados Armazenados (Exemplo)

### `registosOffline`
```json
[
  {
    "id": "offline-1703001234567",
    "data": "2024-12-22",
    "hora": "2024-12-22T09:30:00.000Z",
    "latitude": 38.736946,
    "longitude": -9.142685,
    "endereco": "Rua Exemplo, Lisboa",
    "totalHorasTrabalhadas": "8.00",
    "totalTempoIntervalo": "1.00",
    "empresa": "Advir Lda",
    "userId": "12345",
    "horaEntrada": "2024-12-22T09:30:00.000Z",
    "horaSaida": null
  }
]
```

### `filaSincronizacao`
```json
[
  {
    "id": "offline-1703001234567",
    "data": "2024-12-22",
    "timestamp": "2024-12-22T09:30:15.000Z",
    "sincronizado": false,
    // ... resto dos dados
  }
]
```

---

## ⚠️ Limitações Conhecidas

1. **Login inicial requer conexão**
   - O primeiro login precisa conectar ao backend para obter token
   - Não funciona completamente sem internet

2. **Modo offline = Sem WebAPI, mas com backend**
   - "Offline" significa apenas que a WebAPI Primavera falhou
   - O backend (https://backend.advir.pt) continua funcional
   - Obras, empresas e sincronização funcionam via backend

3. **Geolocalização**
   - GPS funciona sempre
   - Conversão para endereço (Nominatim) requer internet
   - Fallback: usa coordenadas se conversão falhar

4. **Sincronização manual**
   - Não há botão para forçar sincronização
   - Apenas automática a cada 30 segundos

---

## 🚀 Melhorias Futuras

- [ ] Botão manual de sincronização
- [ ] Suporte a intervalos (pausas) offline
- [ ] Service Worker para PWA
- [ ] Notificação visual quando sincronizar
- [ ] Contador de registos pendentes
- [ ] Retry automático com backoff exponencial
- [ ] Compressão de dados offline
- [ ] IndexedDB para grandes volumes

---

## 🔐 Segurança

- Todos os dados offline são encriptados via `secureStorage` (AES)
- Token de autenticação permanece encriptado
- Dados sincronizados são enviados via HTTPS
- Fila de sincronização limpa após envio bem-sucedido

---

## 📞 Suporte

Se encontrar problemas:
1. Verificar console do navegador (F12)
2. Verificar `localStorage` → `registosOffline` e `filaSincronizacao`
3. Logs no console: procurar por "⚠️", "✓", "🔄"

**Desenvolvido por:** João Talmadge
**Data:** 22 de Dezembro de 2024
**Versão:** 1.0
