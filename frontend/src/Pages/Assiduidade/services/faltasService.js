/**
 * Serviço para gestão de faltas no Primavera ERP
 */
import * as API from './apiService';

/**
 * Resultado de uma operação no Primavera
 * @typedef {Object} PrimaveraResult
 * @property {boolean} success - Se a operação foi bem-sucedida
 * @property {string} errorType - Tipo de erro ('network', 'server', 'conflict', 'validation', 'unknown')
 * @property {string} errorMessage - Mensagem de erro amigável
 * @property {Error} originalError - Erro original (para logging)
 */

/**
 * Analisa um erro do Primavera e retorna informações estruturadas
 * @param {Error} error - Erro capturado
 * @returns {Object} Informações sobre o erro
 */
const analisarErroPrimavera = (error) => {
    const errorMsg = error?.message || '';

    // 500 - Erro interno do Primavera
    if (errorMsg.includes('500')) {
        return {
            tipo: 'server',
            mensagem: 'O sistema Primavera ERP está temporariamente indisponível ou retornou um erro interno.',
            sugestao: 'Verifique se o Primavera está acessível e tente novamente em alguns instantes.'
        };
    }

    // 409 - Conflito (registo duplicado)
    if (errorMsg.includes('409')) {
        return {
            tipo: 'conflict',
            mensagem: 'Esta falta já existe no Primavera para esta data.',
            sugestao: 'Verifique os registos existentes no ERP antes de criar novos.'
        };
    }

    // 404 - Recurso não encontrado
    if (errorMsg.includes('404')) {
        return {
            tipo: 'notfound',
            mensagem: 'O funcionário não foi encontrado no Primavera ERP.',
            sugestao: 'Verifique se o código do funcionário está correto no sistema.'
        };
    }

    // 401/403 - Autenticação/Autorização
    if (errorMsg.includes('401') || errorMsg.includes('403')) {
        return {
            tipo: 'auth',
            mensagem: 'Sem permissões para aceder ao Primavera ERP.',
            sugestao: 'Verifique as credenciais do painel de administração.'
        };
    }

    // Erro de rede
    if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        return {
            tipo: 'network',
            mensagem: 'Não foi possível conectar ao Primavera ERP.',
            sugestao: 'Verifique a sua ligação à internet e se o servidor está acessível.'
        };
    }

    // Erro desconhecido
    return {
        tipo: 'unknown',
        mensagem: 'Ocorreu um erro inesperado ao comunicar com o Primavera.',
        sugestao: 'Consulte o console do browser para mais detalhes.'
    };
};

/**
 * Insere uma falta no Primavera com tratamento de erros melhorado
 * @param {string} painelToken - Token de autenticação
 * @param {string} urlempresa - URL da empresa
 * @param {Object} dadosFalta - Dados da falta a inserir
 * @returns {Promise<PrimaveraResult>} Resultado da operação
 */
export const inserirFaltaComTratamentoErros = async (painelToken, urlempresa, dadosFalta) => {
    try {
        await API.inserirFaltaPrimavera(painelToken, urlempresa, dadosFalta);
        return {
            success: true,
            errorType: null,
            errorMessage: null,
            originalError: null
        };
    } catch (error) {
        const erroAnalisado = analisarErroPrimavera(error);
        console.error(`❌ Erro Primavera [${erroAnalisado.tipo}]:`, erroAnalisado.mensagem);

        return {
            success: false,
            errorType: erroAnalisado.tipo,
            errorMessage: erroAnalisado.mensagem,
            errorSuggestion: erroAnalisado.sugestao,
            originalError: error
        };
    }
};

/**
 * Cria automaticamente uma falta F40 (desconto de subsídio de alimentação)
 * quando uma falta desconta alimentação e não é fim de semana
 *
 * @param {string} painelToken - Token de autenticação do painel
 * @param {string} urlempresa - URL da empresa no Primavera
 * @param {string} funcionarioId - ID do funcionário
 * @param {string} data - Data no formato ISO ou string de data
 * @param {boolean} descontaAlimentacao - Se a falta desconta alimentação
 * @param {boolean} isFimDeSemana - Se a data é fim de semana
 * @returns {Promise<PrimaveraResult>} Resultado da operação
 */
export const criarF40SeNecessario = async (
    painelToken,
    urlempresa,
    funcionarioId,
    data,
    descontaAlimentacao,
    isFimDeSemana
) => {
    // Não cria F40 se não desconta alimentação ou é fim de semana
    if (!descontaAlimentacao || isFimDeSemana) {
        return { success: false, skipped: true };
    }

    const dadosF40 = {
        Funcionario: funcionarioId,
        Data: new Date(data).toISOString(),
        Falta: 'F40',
        Horas: 0,
        Tempo: 1,
        DescontaVenc: 0,
        DescontaRem: 0,
        ExcluiProc: 0,
        ExcluiEstat: 0,
        Observacoes: 'Gerada automaticamente (desconto alimentação)',
        CalculoFalta: 1,
        DescontaSubsAlim: 0,
        DataProc: null,
        NumPeriodoProcessado: 0,
        JaProcessado: 0,
        InseridoBloco: 0,
        ValorDescontado: 0,
        AnoProcessado: 0,
        NumProc: 0,
        Origem: "2",
        PlanoCurso: null,
        IdGDOC: null,
        CambioMBase: 0,
        CambioMAlt: 0,
        CotizaPeloMinimo: 0,
        Acerto: 0,
        MotivoAcerto: null,
        NumLinhaDespesa: null,
        NumRelatorioDespesa: null,
        FuncComplementosBaixaId: null,
        DescontaSubsTurno: 0,
        SubTurnoProporcional: 0,
        SubAlimProporcional: 0
    };

    return await inserirFaltaComTratamentoErros(painelToken, urlempresa, dadosF40);
};
