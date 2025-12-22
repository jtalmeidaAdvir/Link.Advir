import { secureStorage } from './secureStorage';

/**
 * Sincroniza registos offline com o servidor
 * Suporta tanto registoPonto quanto registoPontoObra
 * @returns {Promise<{success: boolean, syncedCount: number, errors: Array}>}
 */
export const sincronizarDadosOffline = async () => {
  const filaSincronizacao = secureStorage.getItem("filaSincronizacao");

  if (!filaSincronizacao) {
    console.log("Nenhum dado offline para sincronizar");
    return { success: true, syncedCount: 0, errors: [] };
  }

  const fila = JSON.parse(filaSincronizacao);
  const registosNaoSincronizados = fila.filter(item => !item.sincronizado);

  if (registosNaoSincronizados.length === 0) {
    console.log("Todos os dados já foram sincronizados");
    return { success: true, syncedCount: 0, errors: [] };
  }

  const loginToken = secureStorage.getItem('loginToken');
  const errors = [];
  let syncedCount = 0;

  console.log(`🔄 Iniciando sincronização de ${registosNaoSincronizados.length} registos...`);

  for (const registo of registosNaoSincronizados) {
    try {
      // Detectar tipo de registo (obra ou normal)
      const isRegistoObra = registo.obra_id !== undefined && registo.tipo !== undefined;

      let endpoint, body;

      if (isRegistoObra) {
        // Registo de ponto em OBRA
        endpoint = 'https://backend.advir.pt/api/registo-ponto-obra';
        body = {
          tipo: registo.tipo, // 'entrada' ou 'saida'
          obra_id: registo.obra_id,
          latitude: registo.latitude,
          longitude: registo.longitude
        };
        console.log(`📍 Sincronizando registo OBRA: ${registo.tipo} na obra ${registo.obra_id}`);
      } else {
        // Registo de ponto NORMAL
        endpoint = 'https://backend.advir.pt/api/registoPonto/registar-ponto';
        body = {
          hora: registo.hora,
          latitude: registo.latitude,
          longitude: registo.longitude,
          endereco: registo.endereco,
          totalHorasTrabalhadas: registo.totalHorasTrabalhadas,
          totalTempoIntervalo: registo.totalTempoIntervalo,
          empresa: registo.empresa
        };
        console.log(`📝 Sincronizando registo NORMAL: ${registo.data} ${registo.hora}`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${loginToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        // Marcar como sincronizado
        registo.sincronizado = true;
        syncedCount++;
        console.log(`✓ Registo sincronizado: ${registo.id}`);
      } else {
        const errorData = await response.json();
        errors.push({
          registo: registo.id,
          error: errorData.message || 'Erro desconhecido'
        });
        console.error(`✗ Erro ao sincronizar registo ${registo.id}:`, errorData.message);
      }
    } catch (error) {
      errors.push({
        registo: registo.id,
        error: error.message
      });
      console.error(`✗ Erro de rede ao sincronizar registo ${registo.id}:`, error);
    }
  }

  // Atualizar fila com status de sincronização
  secureStorage.setItem("filaSincronizacao", JSON.stringify(fila));

  // Se todos foram sincronizados com sucesso, limpar dados offline
  if (errors.length === 0) {
    secureStorage.removeItem("registosOffline");
    secureStorage.removeItem("registosObraOffline");
    secureStorage.removeItem("filaSincronizacao");
    secureStorage.setItem("modoOffline", "false");
    console.log("✓ Sincronização completa! Modo online restaurado.");
  }

  return {
    success: errors.length === 0,
    syncedCount,
    errors
  };
};

/**
 * Verifica se há conexão com a WebAPI Primavera
 * IMPORTANTE: Verifica a WebAPI, NÃO o backend (que sempre funciona)
 * @returns {Promise<boolean>}
 */
export const verificarConexao = async () => {
  try {
    const loginToken = secureStorage.getItem('loginToken');
    const empresaStr = secureStorage.getItem('empresaSelecionada');

    if (!empresaStr) {
      console.log("Nenhuma empresa selecionada");
      return false;
    }

    // 1. Buscar credenciais do backend (para obter dados da empresa)
    const credenciaisResponse = await fetch(
      `https://backend.advir.pt/api/empresas/nome/${encodeURIComponent(empresaStr)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${loginToken}` },
      }
    );

    if (!credenciaisResponse.ok) {
      console.log("Erro ao buscar credenciais da empresa");
      return false;
    }

    const credenciais = await credenciaisResponse.json();

    // 2. Tentar conectar à WebAPI Primavera (o que falhou antes)
    const webapiResponse = await fetch(
      "https://webapiprimavera.advir.pt/connect-database/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginToken}`,
        },
        body: JSON.stringify({
          username: credenciais.username,
          password: credenciais.password,
          company: credenciais.empresa,
          line: credenciais.linha,
          instance: "DEFAULT",
          urlempresa: credenciais.urlempresa,
          forceRefresh: true,
        }),
      }
    );

    if (webapiResponse.ok) {
      // WebAPI voltou! Salvar o token
      const data = await webapiResponse.json();
      secureStorage.setItem("painelAdminToken", data.token);
      secureStorage.setItem("urlempresa", credenciais.urlempresa);
      console.log("✓ WebAPI Primavera reconectada com sucesso!");
      return true;
    }

    console.log("✗ WebAPI Primavera ainda indisponível");
    return false;
  } catch (error) {
    console.log("✗ Erro ao verificar conexão com WebAPI:", error.message);
    return false;
  }
};

/**
 * Tenta reconectar à WebAPI Primavera e sincronizar automaticamente
 * @returns {Promise<{reconnected: boolean, synced: boolean, result: object}>}
 */
export const tentarReconectar = async () => {
  console.log("🔌 Verificando conexão com WebAPI Primavera...");

  const temConexao = await verificarConexao();

  if (!temConexao) {
    console.log("✗ WebAPI Primavera ainda indisponível");
    return { reconnected: false, synced: false };
  }

  console.log("✓ WebAPI Primavera restaurada!");

  // Tentar sincronizar dados offline
  const result = await sincronizarDadosOffline();

  return {
    reconnected: true,
    synced: result.success,
    result
  };
};
