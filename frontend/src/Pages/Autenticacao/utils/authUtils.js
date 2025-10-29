// src/utils/authUtils.js
 import { secureStorage } from '../../../utils/secureStorage';
// Função para fazer logout imediato sem alerta

const handleTokenExpired = (message = 'A sua sessão expirou. Será redirecionado para a página de login.', tokenType = 'loginToken') => {

    console.log('Token expirado:', message, 'Tipo:', tokenType);

    // Fazer logout completo para qualquer tipo de token expirado

    secureStorage.clear();

    // Redirecionar para login em vez da home

    window.location.href = '/login';

};

// Intervalo para verificação automática
let tokenCheckInterval = null;

// Contador de falhas consecutivas (para evitar logout por erro temporário)
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

// Função para verificar se é erro de token expirado da WebApi

const isWebApiTokenExpired = (data) => {

    if (!data) return false;

    const isExpired = data.message === 'Token expirado' ||

        data.error === 'Token expirado' ||

        data.message === 'painelAdminToken expirado' ||

        data.error === 'painelAdminToken expirado' ||

        (typeof data === 'string' && data.includes('Token expirado')) ||

        (typeof data === 'string' && data.includes('painelAdminToken expirado'));

    return isExpired;

};

export const fetchWithAuth = async (url, options = {}) => {

    const token = secureStorage.getItem('loginToken');

    const headers = {

        ...options.headers,

        Authorization: `Bearer ${token}`,

    };

    try {

        const response = await fetch(url, { ...options, headers });

        // Verificar se é 401 (não autorizado) ou 403 (token expirado)

        if (response.status === 401 || response.status === 403) {

            try {

                const errorData = await response.json();

                if (errorData.expired || errorData.message === 'Token expirado') {

                    handleTokenExpired();

                } else {

                    handleTokenExpired();

                }

            } catch {

                handleTokenExpired();

            }

            return response;

        }

        // Verificar se a resposta contém dados sobre token expirado

        if (response.ok) {

            const data = await response.json();

            // Verificar se é erro de token da WebApi

            if (isWebApiTokenExpired(data)) {

                // Determinar o tipo de token baseado na mensagem

                const tokenType = (data.message === 'painelAdminToken expirado' ||

                    data.error === 'painelAdminToken expirado') ?

                    'painelAdminToken' : 'loginToken';

                handleTokenExpired(

                    tokenType === 'painelAdminToken'

                        ? 'Token de administração expirado'

                        : 'Sessão expirada',

                    tokenType

                );

                return response;

            }

            // Retornar nova response com os dados já parseados

            return {

                ...response,

                json: () => Promise.resolve(data)

            };

        }

        // Para respostas não OK, verificar se contém erro de token

        try {

            const errorData = await response.json();

            if (isWebApiTokenExpired(errorData)) {

                handleTokenExpired();

            }

            // Retornar nova response com os dados de erro já parseados

            return {

                ...response,

                json: () => Promise.resolve(errorData)

            };

        } catch (parseError) {

            // Se não conseguir parsear como JSON, retornar resposta original

            return response;

        }

    } catch (error) {

        console.error('Erro de rede:', error);

        throw error;

    }

};

// Função auxiliar para verificar token expirado em respostas diretas

export const checkTokenExpired = (data) => {

    if (isWebApiTokenExpired(data)) {

        handleTokenExpired();

        return true;

    }

    return false;

};

// Função para verificar se o token JWT está expirado

const isTokenExpired = (token) => {

    if (!token) return true;

    try {

        const payload = JSON.parse(atob(token.split('.')[1]));

        const currentTime = Date.now() / 1000;

        return payload.exp < currentTime;

    } catch (error) {

        console.error('Erro ao verificar token:', error);

        return true;

    }

};

// Função para verificar token no servidor

const checkTokenOnServer = async () => {

    try {

        const token = secureStorage.getItem('loginToken');

        if (!token) {

            handleTokenExpired();

            return false;

        }

        // Verificar expiração local primeiro

        if (isTokenExpired(token)) {

            handleTokenExpired();

            return false;

        }

        // Verificar no servidor

        const response = await fetch('https://backend.advir.pt/api/auth/verify-token', {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json',

                'Authorization': `Bearer ${token}`

            }

        });

        if (!response.ok) {

            if (response.status === 401 || response.status === 403) {

                handleTokenExpired();

                return false;

            }

            throw new Error('Erro na verificação do token');

        }

        const data = await response.json();

        if (!data.valid) {

            consecutiveFailures++;

            console.log(`Token inválido (falha ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);

            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {

                console.log('Múltiplas falhas consecutivas, fazendo logout');

                handleTokenExpired();

                return false;

            }

            return true; // Dar mais uma chance

        }

        // Reset contador em caso de sucesso

        consecutiveFailures = 0;

        console.log('Token válido, verificação bem-sucedida');

        return true;

    } catch (error) {

        console.error('Erro durante a verificação do token no servidor:', error);

        consecutiveFailures = 0; // Reset em erro de rede

        return true; // Manter a sessão ativa em caso de erro de rede

    }

};

// Função para verificar painelAdminToken

const checkPainelAdminToken = async () => {

    try {

        const painelAdminToken = secureStorage.getItem('painelAdminToken');

        if (!painelAdminToken) {

            console.log('Nenhum painelAdminToken encontrado, não fazendo logout.');

            return true; // Nenhum token encontrado

        }

        /*

        // Verificar se o token está expirado localmente

        if (isTokenExpired(painelAdminToken)) {

            console.log('painelAdminToken expirado localmente.');

            handleTokenExpired('Token de administração expirado', 'painelAdminToken');

            return false;

        }

        */

        // Fazer uma chamada à Web API para validar o token

        const urlempresa = secureStorage.getItem('urlempresa');

        if (!urlempresa) {

            console.log('URL da empresa não encontrada');

            return true; // Se não há URL da empresa, não verificar

        }

        const response = await fetch('https://webapiprimavera.advir.pt/listarPedidos/listarPedidos', {

            method: 'GET',

            headers: {

                'Authorization': `Bearer ${painelAdminToken}`,

                'urlempresa': urlempresa,

                'Content-Type': 'application/json',

            },

        });

        // Se o token está expirado (401 ou 403), tentar renovar automaticamente
        // Não tratar 500 como token expirado - é erro de servidor
        if (response.status === 401 || response.status === 403) {
            console.log(`painelAdminToken inválido - Status: ${response.status}, tentando renovar...`);

            const renovado = await refreshPainelAdminToken();
            if (renovado) {
                return true;
            } else {
                console.log('Falha ao renovar token, fazendo logout');
                handleTokenExpired('Token de administração expirado', 'painelAdminToken');
                return false;
            }
        }

        // Para erro 500, apenas registrar mas não fazer logout
        if (response.status === 500) {
            console.log('Erro 500 do servidor - mantendo sessão ativa');
            return true;
        }

        if (response.ok) {

            console.log(`Verificação do painelAdminToken - Status: ${response.status} (considerado válido)`);

            return true;

        }


        // Para outros status, você pode registrar o erro, mas não fazer logout

        const errorData = await response.json();

        console.log(`Erro na verificação do painelAdminToken - Status: ${response.status}`, errorData);

        return true;

    } catch (error) {

        console.error('Erro ao verificar painelAdminToken:', error);

        return true; // Em caso de erro de rede, não fazer logout automático

    }

};

// Função para iniciar verificação automática de token
export const startTokenValidation = () => {
    // Verificar se estamos na página de login
    if (window.location.pathname === '/login' || window.location.pathname.includes('login')) {
        return;
    }

    // Limpar intervalo existente se houver
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
    }

    // Verificar apenas a cada 5 minutos para reduzir agressividade
    tokenCheckInterval = setInterval(() => {
        // Verificar novamente se ainda não estamos na página de login
        if (window.location.pathname === '/login' || window.location.pathname.includes('login')) {
            stopTokenValidation();
            return;
        }
        checkTokenOnServer();
        checkPainelAdminToken();
    }, 300000); // 5 minutos (300000ms)

    console.log('Verificação automática de tokens iniciada (5min)');
};

// Função para parar verificação automática de token

export const stopTokenValidation = () => {

    if (tokenCheckInterval) {

        clearInterval(tokenCheckInterval);

        tokenCheckInterval = null;

        console.log('Verificação automática de token parada');

    }

};

// Placeholder para refreshPainelAdminToken - esta função precisa ser implementada
const refreshPainelAdminToken = async () => {
    console.log("Tentando renovar painelAdminToken...");
    // Implementar lógica de renovação do token aqui
    // Por enquanto, retorna false para simular falha na renovação
    return false;
};