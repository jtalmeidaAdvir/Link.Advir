/**
 * Serviço especializado para carregamento de dados da grade de assiduidade
 */
import { secureStorage } from '../../../utils/secureStorage';
import * as API from './apiService';

/**
 * Valida se os tokens do Primavera estão disponíveis
 * @returns {{valid: boolean, painelToken: string, urlempresa: string}} Resultado da validação
 */
export const validarTokensPrimavera = () => {
    const painelToken = secureStorage.getItem('painelAdminToken');
    const urlempresa = secureStorage.getItem('urlempresa');

    return {
        valid: !!(painelToken && urlempresa),
        painelToken,
        urlempresa
    };
};

/**
 * Filtra utilizadores que têm registos numa obra específica
 * @param {string} token - Token de autenticação
 * @param {Array} utilizadores - Lista completa de utilizadores
 * @param {number} obraId - ID da obra
 * @param {number} ano - Ano
 * @param {number} mes - Mês
 * @returns {Promise<Array>} Utilizadores filtrados
 */
export const filtrarUtilizadoresPorObra = async (token, utilizadores, obraId, ano, mes) => {
    try {
        const query = `obra_id=${obraId}&ano=${ano}&mes=${String(mes).padStart(2, '0')}`;
        const registos = await API.listarRegistosPorObraPeriodo(token, query);
        const userIdsObra = [...new Set(registos.map(reg => reg.user_id).filter(Boolean))];
        return utilizadores.filter(u => userIdsObra.includes(u.id));
    } catch (error) {
        console.error('Erro ao filtrar utilizadores por obra:', error);
        return utilizadores; // Retorna todos em caso de erro
    }
};

/**
 * Carrega registos de ponto de um utilizador
 * @param {string} token - Token de autenticação
 * @param {number} userId - ID do utilizador
 * @param {number} ano - Ano
 * @param {number} mes - Mês
 * @param {number} obraId - ID da obra (opcional)
 * @returns {Promise<Array>} Registos de ponto
 */
export const carregarRegistosUtilizador = async (token, userId, ano, mes, obraId = null) => {
    try {
        let query = `user_id=${userId}&ano=${ano}&mes=${String(mes).padStart(2, '0')}`;
        if (obraId) query += `&obra_id=${obraId}`;

        const response = await fetch(
            `https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo?${query}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error(`Erro ao carregar registos do utilizador ${userId}:`, error);
        return [];
    }
};

/**
 * Carrega faltas de um funcionário do Primavera
 * @param {string} painelToken - Token do painel admin
 * @param {string} urlempresa - URL da empresa
 * @param {string} codFuncionario - Código do funcionário no Primavera
 * @param {number} ano - Ano
 * @param {number} mes - Mês
 * @returns {Promise<Array>} Lista de faltas
 */
export const carregarFaltasFuncionario = async (painelToken, urlempresa, codFuncionario, ano, mes) => {
    if (!codFuncionario) return [];

    try {
        return await API.buscarFaltasFuncionario(
            painelToken,
            urlempresa,
            codFuncionario,
            ano,
            mes,
            ano,
            mes
        );
    } catch (error) {
        console.error(`Erro ao buscar faltas do funcionário ${codFuncionario}:`, error);
        return [];
    }
};

/**
 * Mapeia faltas por dia do mês
 * @param {Array} faltas - Lista de faltas do Primavera
 * @param {number} ano - Ano
 * @param {number} mes - Mês
 * @returns {Object} Objeto com dia como chave e array de faltas como valor
 */
export const mapearFaltasPorDia = (faltas, ano, mes) => {
    const faltasPorDia = {};

    if (!Array.isArray(faltas)) return faltasPorDia;

    faltas.forEach(falta => {
        try {
            const dataFalta = new Date(falta.Data || falta.DataFalta);
            if (dataFalta.getFullYear() === ano && (dataFalta.getMonth() + 1) === mes) {
                const dia = dataFalta.getDate();
                if (!faltasPorDia[dia]) faltasPorDia[dia] = [];
                faltasPorDia[dia].push(falta);
            }
        } catch (error) {
            console.error('Erro ao processar falta:', error);
        }
    });

    return faltasPorDia;
};

/**
 * Mapeia horas extras por dia do mês
 * @param {Array} horasExtras - Lista de horas extras do Primavera
 * @param {number} ano - Ano
 * @param {number} mes - Mês
 * @returns {Object} Objeto com dia como chave e array de horas extras como valor
 */
export const mapearHorasExtrasPorDia = (horasExtras, ano, mes) => {
    const horasExtrasPorDia = {};

    if (!Array.isArray(horasExtras)) return horasExtrasPorDia;

    horasExtras.forEach(he => {
        try {
            const dataHE = new Date(he.Data || he.DataHoraExtra);
            if (dataHE.getFullYear() === ano && (dataHE.getMonth() + 1) === mes) {
                const dia = dataHE.getDate();
                if (!horasExtrasPorDia[dia]) horasExtrasPorDia[dia] = [];
                horasExtrasPorDia[dia].push(he);
            }
        } catch (error) {
            console.error('Erro ao processar hora extra:', error);
        }
    });

    return horasExtrasPorDia;
};

/**
 * Calcula estatísticas de um dia (horas trabalhadas, status, etc)
 * @param {Array} registosDia - Registos de ponto do dia
 * @param {Array} faltasDia - Faltas do dia
 * @param {Array} horasExtrasDia - Horas extras do dia
 * @returns {Object} Estatísticas do dia
 */
export const calcularEstatisticasDia = (registosDia = [], faltasDia = [], horasExtrasDia = []) => {
    const registosOrdenados = [...registosDia].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
    );

    let horasEstimadas = 0;
    let ultimaEntrada = null;

    registosOrdenados.forEach(reg => {
        if (reg.tipo === 'entrada') {
            ultimaEntrada = new Date(reg.timestamp);
        } else if (reg.tipo === 'saida' && ultimaEntrada) {
            const diff = (new Date(reg.timestamp) - ultimaEntrada) / 3600000;
            if (diff > 0 && diff < 24) {
                horasEstimadas += diff;
            }
            ultimaEntrada = null;
        }
    });

    return {
        horasEstimadas,
        temRegistos: registosDia.length > 0,
        temFaltas: faltasDia.length > 0,
        temHorasExtras: horasExtrasDia.length > 0,
        numeroRegistos: registosDia.length,
        timestamps: registosOrdenados.map(r => r.timestamp)
    };
};

/**
 * Gera os dias do mês
 * @param {number} ano - Ano
 * @param {number} mes - Mês (1-12)
 * @returns {Array<number>} Array com números dos dias do mês
 */
export const gerarDiasDoMes = (ano, mes) => {
    const ultimoDia = new Date(ano, mes, 0).getDate();
    return Array.from({ length: ultimoDia }, (_, i) => i + 1);
};
