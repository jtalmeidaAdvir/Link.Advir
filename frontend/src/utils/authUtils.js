// src/utils/authUtils.js

// Função para mostrar alerta e fazer logout
const handleTokenExpired = (message = 'A sua sessão expirou. Será redirecionado para a página de login.') => {
    alert(message);
    localStorage.clear();
    window.location.href = '/';
};

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

        // Verificar se é 401 (não autorizado)
        if (response.status === 401) {
            handleTokenExpired();
            return response;
        }

        // Verificar se a resposta contém dados sobre token expirado
        if (response.ok) {
            const data = await response.json();

            // Verificar se é erro de token da WebApi
            if (isWebApiTokenExpired(data)) {
                handleTokenExpired('O token da WebApi expirou. Será deslogado e terá que fazer login novamente.');
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
                handleTokenExpired('O token da WebApi expirou. Será deslogado e terá que fazer login novamente.');
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
        handleTokenExpired('O token da WebApi expirou. Será deslogado e terá que fazer login novamente.');
        return true;
    }
    return false;
};
