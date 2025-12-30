/**
 * Serviço centralizado de API para gestão de registos de assiduidade
 */

const BACKEND_URL = 'https://backend.advir.pt/api';
const PRIMAVERA_URL = 'https://webapiprimavera.advir.pt';

/**
 * Cria headers de autenticação padrão
 */
const createAuthHeaders = (token, extraHeaders = {}) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...extraHeaders
});

/**
 * Faz chamada genérica à API com tratamento de erros
 */
const apiCall = async (url, options = {}) => {
    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }

        // Retorna JSON se houver conteúdo, senão retorna a response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return response;
    } catch (error) {
        // Não loga erros 404 pois são esperados em alguns casos (ex: user sem horário)
        if (!error.message.includes('404')) {
            console.error('API Call Error:', error);
        }
        throw error;
    }
};

// ========================================
// REGISTO DE PONTOS
// ========================================

/**
 * Regista ponto esquecido por outro utilizador
 */
export const registarPontoEsquecido = async (token, data) => {
    const { tipo, obra_id, user_id, timestamp } = data;

    const response = await apiCall(
        `${BACKEND_URL}/registo-ponto-obra/registar-esquecido-por-outro`,
        {
            method: 'POST',
            headers: createAuthHeaders(token),
            body: JSON.stringify({ tipo, obra_id, user_id, timestamp })
        }
    );

    return response;
};

/**
 * Confirma um registo de ponto
 */
export const confirmarPonto = async (token, pontoId) => {
    return await apiCall(
        `${BACKEND_URL}/registo-ponto-obra/confirmar/${pontoId}`,
        {
            method: 'PATCH',
            headers: createAuthHeaders(token)
        }
    );
};

/**
 * Regista 4 pontos de um dia (entrada manhã, saída manhã, entrada tarde, saída tarde)
 */
export const registar4Pontos = async (token, userId, data, horas, obraId) => {
    const tipos = ['entrada', 'saida', 'entrada', 'saida'];
    const resultados = [];

    for (let i = 0; i < 4; i++) {
        const ponto = await registarPontoEsquecido(token, {
            tipo: tipos[i],
            obra_id: Number(obraId),
            user_id: Number(userId),
            timestamp: horas[i] // Já deve vir como timestamp UTC
        });

        await confirmarPonto(token, ponto.id);
        resultados.push(ponto);
    }

    return resultados;
};

/**
 * Busca registos de ponto de um utilizador por mês
 */
export const buscarRegistosPonto = async (token, userId, ano, mes) => {
    const mesStr = String(mes).padStart(2, '0');
    const query = `user_id=${userId}&ano=${ano}&mes=${mesStr}`;
    return await apiCall(
        `${BACKEND_URL}/registo-ponto-obra/listar-por-user-periodo?${query}`,
        {
            method: 'GET',
            headers: createAuthHeaders(token)
        }
    );
};

/**
 * Lista registos de ponto por utilizador e período
 */
export const listarRegistosPorUserPeriodo = async (token, query) => {
    return await apiCall(
        `${BACKEND_URL}/registo-ponto-obra/listar-por-user-periodo?${query}`,
        {
            method: 'GET',
            headers: createAuthHeaders(token)
        }
    );
};

/**
 * Lista registos de ponto por obra e período
 */
export const listarRegistosPorObraPeriodo = async (token, query) => {
    return await apiCall(
        `${BACKEND_URL}/registo-ponto-obra/listar-por-obra-periodo?${query}`,
        {
            method: 'GET',
            headers: createAuthHeaders(token)
        }
    );
};

/**
 * Lista registos de ponto por obra e dia
 */
export const listarRegistosPorObraEDia = async (token, obraId, data) => {
    return await apiCall(
        `${BACKEND_URL}/registo-ponto-obra/listar-por-obra-e-dia?obra_id=${obraId}&data=${data}`,
        {
            method: 'GET',
            headers: createAuthHeaders(token)
        }
    );
};

/**
 * Elimina um registo de ponto
 */
export const eliminarRegistoPonto = async (token, registoId) => {
    return await apiCall(
        `${BACKEND_URL}/registo-ponto-obra/eliminar/${registoId}`,
        {
            method: 'DELETE',
            headers: createAuthHeaders(token)
        }
    );
};

// ========================================
// UTILIZADORES
// ========================================

/**
 * Busca utilizadores por empresa
 */
export const buscarUtilizadoresPorEmpresa = async (token, empresaId) => {
    return await apiCall(
        `${BACKEND_URL}/users/empresa/${empresaId}`,
        {
            method: 'GET',
            headers: createAuthHeaders(token)
        }
    );
};

/**
 * Busca código de funcionário
 * Retorna null se não encontrado (404)
 */
export const buscarCodFuncionario = async (token, userId) => {
    try {
        const response = await apiCall(
            `${BACKEND_URL}/users/getCodFuncionario/${userId}`,
            {
                method: 'GET',
                headers: createAuthHeaders(token)
            }
        );
        return response.codFuncionario;
    } catch (error) {
        // Se for 404, retorna null em vez de lançar erro
        if (error.message.includes('404')) {
            return null;
        }
        throw error;
    }
};

/**
 * Busca horário de um utilizador
 * Retorna null se não encontrado (404)
 */
export const buscarHorarioUtilizador = async (token, userId) => {
    try {
        return await apiCall(
            `${BACKEND_URL}/horarios/user/${userId}`,
            {
                method: 'GET',
                headers: createAuthHeaders(token)
            }
        );
    } catch (error) {
        // Se for 404 (utilizador sem horário), retorna null em vez de lançar erro
        if (error.message.includes('404')) {
            return null;
        }
        throw error;
    }
};

// ========================================
// OBRAS
// ========================================

/**
 * Busca obras por empresa
 */
export const buscarObrasPorEmpresa = async (token, empresaId) => {
    return await apiCall(
        `${BACKEND_URL}/obra/por-empresa?empresa_id=${empresaId}`,
        {
            method: 'GET',
            headers: createAuthHeaders(token)
        }
    );
};

// ========================================
// PRIMAVERA ERP - FALTAS
// ========================================

/**
 * Busca lista de tipos de faltas do Primavera
 */
export const buscarTiposFaltas = async (painelToken, urlempresa) => {
    return await apiCall(
        `${PRIMAVERA_URL}/routesFaltas/GetListaTipoFaltas`,
        {
            method: 'GET',
            headers: createAuthHeaders(painelToken, { urlempresa })
        }
    );
};

/**
 * Insere falta no Primavera ERP
 */
export const inserirFaltaPrimavera = async (painelToken, urlempresa, dadosERP) => {
    return await apiCall(
        `${PRIMAVERA_URL}/routesFaltas/InserirFalta`,
        {
            method: 'POST',
            headers: createAuthHeaders(painelToken, { urlempresa }),
            body: JSON.stringify(dadosERP)
        }
    );
};

/**
 * Busca faltas de um funcionário no Primavera
 */
export const buscarFaltasFuncionario = async (painelToken, urlempresa, codFuncionario, ano, mesInicio, anoFim, mesFim) => {
    const url = `${PRIMAVERA_URL}/routesFaltas/GetListaFaltasFuncionario?CodFuncionario=${codFuncionario}&Ano=${ano}&MesInicio=${mesInicio}&AnoFim=${anoFim}&MesFim=${mesFim}`;
    return await apiCall(url, {
        method: 'GET',
        headers: createAuthHeaders(painelToken, { urlempresa })
    });
};

/**
 * Remove falta do Primavera (por LinhaId)
 */
export const removerFaltaPrimavera = async (painelToken, urlempresa, linhaId) => {
    return await apiCall(
        `${PRIMAVERA_URL}/routesFaltas/EliminarFalta`,
        {
            method: 'DELETE',
            headers: createAuthHeaders(painelToken, { urlempresa }),
            body: JSON.stringify({ LinhaId: linhaId })
        }
    );
};

/**
 * Remove falta do Primavera (por funcionário, data e código de falta)
 */
export const removerFaltaPorParametros = async (painelToken, urlempresa, funcionarioId, dataFormatada, codigoFalta) => {
    return await apiCall(
        `${PRIMAVERA_URL}/routesFaltas/EliminarFalta/${funcionarioId}/${dataFormatada}/${codigoFalta}`,
        {
            method: 'DELETE',
            headers: createAuthHeaders(painelToken, { urlempresa })
        }
    );
};

// ========================================
// PRIMAVERA ERP - HORAS EXTRAS
// ========================================

/**
 * Busca lista de tipos de horas extras do Primavera
 */
export const buscarTiposHorasExtras = async (painelToken, urlempresa) => {
    return await apiCall(
        `${PRIMAVERA_URL}/routesFaltas/GetListaTipoHorasExtras`,
        {
            method: 'GET',
            headers: createAuthHeaders(painelToken, { urlempresa })
        }
    );
};

/**
 * Busca horas extras de todos os funcionários
 */
export const buscarHorasExtrasTodosFuncionarios = async (painelToken, urlempresa) => {
    return await apiCall(
        `${PRIMAVERA_URL}/routesFaltas/GetListaHorasExtrasTodosFuncionarios`,
        {
            method: 'GET',
            headers: createAuthHeaders(painelToken, { urlempresa })
        }
    );
};

/**
 * Insere hora extra no Primavera ERP
 */
export const inserirHoraExtraPrimavera = async (painelToken, urlempresa, dadosERP) => {
    return await apiCall(
        `${PRIMAVERA_URL}/routesFaltas/InserirHoraExtra`,
        {
            method: 'POST',
            headers: createAuthHeaders(painelToken, { urlempresa }),
            body: JSON.stringify(dadosERP)
        }
    );
};

/**
 * Remove hora extra do Primavera (DELETE com LinhaId)
 */
export const removerHoraExtraPrimavera = async (painelToken, urlempresa, linhaId) => {
    return await apiCall(
        `${PRIMAVERA_URL}/routesFaltas/EliminarHoraExtra`,
        {
            method: 'DELETE',
            headers: createAuthHeaders(painelToken, { urlempresa }),
            body: JSON.stringify({ LinhaId: linhaId })
        }
    );
};

/**
 * Remove hora extra do Primavera (POST com IdFuncRemCBL)
 */
export const removerHoraExtraPorId = async (painelToken, urlempresa, idFuncRemCBL) => {
    return await apiCall(
        `${PRIMAVERA_URL}/routesFaltas/RemoverHoraExtra`,
        {
            method: 'POST',
            headers: createAuthHeaders(painelToken, { urlempresa }),
            body: JSON.stringify({ IdFuncRemCBL: idFuncRemCBL })
        }
    );
};

// ========================================
// GEOCODING (OpenStreetMap)
// ========================================

/**
 * Busca endereço a partir de coordenadas (reverse geocoding)
 */
export const buscarEnderecoPorCoordenadas = async (lat, lon) => {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    return await response.json();
};
