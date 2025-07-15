// src/utils/authUtils.js
 
// Função para fazer logout imediato sem alerta
const handleTokenExpired = (message = 'A sua sessão expirou. Será redirecionado para a página de login.') => {
    console.log('Token expirado:', message);
    localStorage.clear();
    window.location.href = '/';
};
 
// Intervalo para verificação automática
let tokenCheckInterval = null;
 
// Função para verificar se é erro de token expirado da WebApi
const isWebApiTokenExpired = (data) => {
    return data && (
        data.message === 'Token expirado' ||
        data.error === 'Token expirado' ||
        data.message === 'painelAdminToken expirado' ||
        data.error === 'painelAdminToken expirado' ||
        (typeof data === 'string' && data.includes('Token expirado'))
    );
};
 
export const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('loginToken');
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
                handleTokenExpired();
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
        const token = localStorage.getItem('loginToken');
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
            handleTokenExpired();
            return false;
        }
 
        return true;
    } catch (error) {
        console.error('Erro ao verificar token no servidor:', error);
        // Em caso de erro de rede, não fazer logout automático
        return true;
    }
};
 
// Função para iniciar verificação automática de token
export const startTokenValidation = () => {
    // Limpar intervalo existente se houver
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
    }
 
    // Verificar imediatamente
    checkTokenOnServer();
 
    // Configurar verificação a cada 30 segundos
    tokenCheckInterval = setInterval(() => {
        checkTokenOnServer();
    }, 30000); // 30 segundos
 
    console.log('Verificação automática de token iniciada (30s)');
};
 
// Função para parar verificação automática de token
export const stopTokenValidation = () => {
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
        tokenCheckInterval = null;
        console.log('Verificação automática de token parada');
    }
};