// src/utils/authUtils.js
import { secureStorage } from '../utils/secureStorage';
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

        // Verificar se é 401, 403 ou 500 (possível token expirado)
        if (response.status === 401 || response.status === 403 || response.status === 500) {
            try {
                const errorData = await response.json();
                if (errorData.expired || errorData.message === 'Token expirado' ||
                    errorData.message === 'painelAdminToken expirado' ||
                    isWebApiTokenExpired(errorData)) {
                    handleTokenExpired();
                    return response;
                } else if (response.status === 401 || response.status === 403) {
                    // Para 401/403 sem mensagem específica, assumir token expirado
                    handleTokenExpired();
                    return response;
                } else if (response.status === 500) {
                    // Para erro 500, verificar se parece ser erro de autenticação
                    // Muitas vezes a WebApi retorna 500 quando o token está inválido
                    console.log('Erro 500 detectado, verificando se é token expirado:', errorData);

                    // Se o erro 500 não tem dados específicos ou tem mensagens que indicam problema de auth
                    if (!errorData ||
                        (typeof errorData === 'string' && errorData.includes('error')) ||
                        errorData.message?.includes('error') ||
                        errorData.error) {
                        console.log('Erro 500 interpretado como token expirado');
                        handleTokenExpired();
                        return response;
                    }
                }
                // Para 500 com dados específicos que não parecem ser de auth, não fazer logout
            } catch (parseError) {
                console.log('Erro ao parsear resposta:', parseError);
                if (response.status === 401 || response.status === 403) {
                    handleTokenExpired();
                } else if (response.status === 500) {
                    // Se não conseguimos parsear a resposta de um erro 500,
                    // é provável que seja um erro de token inválido
                    console.log('Erro 500 sem resposta válida - assumindo token expirado');
                    handleTokenExpired();
                }
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
            console.log('Nenhum token encontrado - fazendo logout');
            handleTokenExpired();
            return false;
        }

        // Verificar expiração local primeiro
        if (isTokenExpired(token)) {
            console.log('Token encontrado, mas está expirado - fazendo logout');
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

      //  console.log('Resposta do servidor ao verificar token:', response.status);

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.log(`Token inválido - Status: ${response.status}`);
                handleTokenExpired();
                return false;
            }
            console.log('Erro ao verificar token:', response.statusText);
            throw new Error('Erro na verificação do token');
        }

        const data = await response.json();
        if (!data.valid) {
            console.log('Token considerado inválido pelo servidor');
            handleTokenExpired();
            return false;
        }

        console.log('Token válido, verificação bem-sucedida');
        return true;
    } catch (error) {
        console.error('Erro durante a verificação do token no servidor:', error);
        return true; // Manter a sessão ativa em caso de erro de rede
    }
};

// Função para renovar automaticamente o painelAdminToken
const refreshPainelAdminToken = async () => {
    try {
        const loginToken = secureStorage.getItem('loginToken');
        const empresaSelecionada = secureStorage.getItem('empresaSelecionada');
        const urlempresa = secureStorage.getItem('urlempresa');

        if (!loginToken || !empresaSelecionada || !urlempresa) {
            console.log('Informações necessárias para renovar token não encontradas');
            return false;
        }

        // Buscar credenciais da empresa
        const credenciaisResponse = await fetch(
            `https://backend.advir.pt/api/empresas/nome/${encodeURIComponent(empresaSelecionada)}`,
            {
                method: "GET",
                headers: { Authorization: `Bearer ${loginToken}` },
            }
        );

        if (!credenciaisResponse.ok) {
            console.log('Erro ao obter credenciais da empresa para renovar token');
            return false;
        }

        const credenciais = await credenciaisResponse.json();

        // Solicitar novo token
        const response = await fetch("https://webapiprimavera.advir.pt/connect-database/token", {
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
        });

        if (response.ok) {
            const data = await response.json();
            secureStorage.setItem("painelAdminToken", data.token);
            console.log('painelAdminToken renovado automaticamente');
            return true;
        } else {
            console.log('Erro ao renovar painelAdminToken:', response.status);
            return false;
        }

    } catch (error) {
        console.error('Erro ao renovar painelAdminToken:', error);
        return false;
    }
};

// Função para verificar painelAdminToken
const checkPainelAdminToken = async () => {
    try {
        const painelAdminToken = secureStorage.getItem('painelAdminToken');
        if (!painelAdminToken) {
            console.log('Nenhum painelAdminToken encontrado, tentando renovar automaticamente...');

            // Tentar renovar automaticamente
            const renovado = await refreshPainelAdminToken();
            if (renovado) {
                console.log('Token renovado automaticamente com sucesso');
                return true;
            } else {
                console.log('Não foi possível renovar o token automaticamente');
                return true; // Não fazer logout se não conseguir renovar
            }
        }

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

        if (response.ok) {
        //   console.log(`Verificação do painelAdminToken - Status: ${response.status} (considerado válido)`);
            return true;
        }

        // Se o token está expirado, tentar renovar automaticamente
        if (response.status === 401 || response.status === 403 || response.status === 500) {
            console.log(`painelAdminToken inválido - Status: ${response.status}, tentando renovar...`);

            const renovado = await refreshPainelAdminToken();
            if (renovado) {
           //     console.log('Token renovado automaticamente após expiração');
                return true;
            } else {
                console.log('Falha ao renovar token, fazendo logout');
                handleTokenExpired('Token de administração expirado', 'painelAdminToken');
                return false;
            }
        }

        // Para outros status, você pode registrar o erro, mas não fazer logout
        const errorData = await response.json();
     //   console.log(`Erro na verificação do painelAdminToken - Status: ${response.status}`, errorData);
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
     //   console.log('Página de login detectada - verificação automática de tokens desabilitada');
        return;
    }

    // Limpar intervalo existente se houver
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
    }

    // NÃO verificar imediatamente - só depois de 30 segundos
    // Configurar verificação a cada 30 segundos
    tokenCheckInterval = setInterval(() => {
        // Verificar novamente se ainda não estamos na página de login
        if (window.location.pathname === '/login' || window.location.pathname.includes('login')) {
       //     console.log('Navegou para login - parando verificação automática');
            stopTokenValidation();
            return;
        }
        checkTokenOnServer();
        checkPainelAdminToken();
    }, 30000); // 30 segundos

    console.log('Verificação automática de tokens iniciada (30s)');
};

// Função para parar verificação automática de token
export const stopTokenValidation = () => {
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
        tokenCheckInterval = null;
        console.log('Verificação automática de token parada');
    }
};

// Função para renovar o loginToken automaticamente
const refreshLoginToken = async () => {
    try {
        const currentToken = secureStorage.getItem('loginToken');
        const email = secureStorage.getItem('email');

        if (!currentToken || !email) {
            console.log('Informações de login não encontradas para renovar token');
            return false;
        }

        // Verificar se o token ainda está válido
        if (!isTokenExpired(currentToken)) {
            console.log('Token de login ainda válido, não precisa renovar');
            return true;
        }

      //  console.log('Token de login expirado, tentando renovar...');

        // Tentar renovar usando refresh token se disponível
        const response = await fetch('https://backend.advir.pt/api/auth/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            secureStorage.setItem('loginToken', data.token);
       //     console.log('Token de login renovado automaticamente');
            return true;
        } else {
            console.log('Falha ao renovar token de login:', response.status);
            return false;
        }

    } catch (error) {
        console.error('Erro ao renovar token de login:', error);
        return false;
    }
};

// Função principal para renovar todos os tokens quando o app ganha foco
export const refreshTokensOnAppFocus = async () => {
    try {
        const loginToken = secureStorage.getItem('loginToken');
        const painelAdminToken = secureStorage.getItem('painelAdminToken');
        const empresaSelecionada = secureStorage.getItem('empresaSelecionada');

        //console.log('Verificando estado dos tokens...');

        // Se não há loginToken, não fazer nada (usuário não está logado)
        if (!loginToken) {
            console.log('Usuário não está logado');
            return;
        }

        // 1. Verificar e renovar loginToken se necessário
        const loginTokenValid = await refreshLoginToken();

        if (!loginTokenValid) {
            console.log('Não foi possível renovar o token de login');
            return;
        }

        // 2. Se há empresa selecionada, verificar e renovar painelAdminToken
        if (empresaSelecionada && painelAdminToken) {
           // console.log('Verificando painelAdminToken...');

            // Verificar se o painelAdminToken precisa ser renovado
            const urlempresa = secureStorage.getItem('urlempresa');
            if (urlempresa) {
                try {
                    const testResponse = await fetch('https://webapiprimavera.advir.pt/listarPedidos/listarPedidos', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${painelAdminToken}`,
                            'urlempresa': urlempresa,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!testResponse.ok && (testResponse.status === 401 || testResponse.status === 403 || testResponse.status === 500)) {
                        console.log('painelAdminToken expirado, renovando...');
                        await refreshPainelAdminToken();
                    } else {
                      //  console.log('painelAdminToken ainda válido');
                    }
                } catch (error) {
                    console.log('Erro ao verificar painelAdminToken, tentando renovar...');
                    await refreshPainelAdminToken();
                }
            }
        } else if (empresaSelecionada && !painelAdminToken) {
            // Se há empresa selecionada mas não há painelAdminToken, tentar obter um novo
          //  console.log('Empresa selecionada encontrada, obtendo novo painelAdminToken...');
            await refreshPainelAdminToken();
        }

      //  console.log('Verificação e renovação de tokens concluída');

    } catch (error) {
        console.error('Erro durante a renovação automática de tokens:', error);
    }
};

// Exportar função de renovação para uso externo
export { refreshPainelAdminToken };