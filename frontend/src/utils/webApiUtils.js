
// Função para mostrar alerta e fazer logout
const handleTokenExpired = (message = 'A sua sessão expirou. Será redirecionado para a página de login.') => {
    alert(message);
    localStorage.clear();
    window.location.href = '/';
};

// Função para verificar se é erro de token expirado da WebApi
export const isWebApiTokenExpired = (data) => {
    return data && (
        data.message === 'Token expirado' ||
        data.error === 'Token expirado' ||
        data.message === 'painelAdminToken expirado' ||
        data.error === 'painelAdminToken expirado' ||
        data.message === 'Unauthorized' ||
        data.error === 'Unauthorized' ||
        (typeof data === 'string' && (
            data.includes('Token expirado') ||
            data.includes('painelAdminToken expirado') ||
            data.includes('Unauthorized')
        ))
    );
};

// Função para processar respostas da WebApi e verificar tokens expirados
export const processWebApiResponse = async (response) => {
    try {
        const data = await response.json();

        if (isWebApiTokenExpired(data)) {
            handleTokenExpired('O token da WebApi expirou. Será deslogado e terá que fazer login novamente.');
            throw new Error('Token expirado');
        }

        return data;
    } catch (error) {
        if (error.message === 'Token expirado') {
            throw error;
        }

        // Se não conseguir parsear como JSON, verificar se é erro 401
        if (response.status === 401) {
            handleTokenExpired('O token da WebApi expirou. Será deslogado e terá que fazer login novamente.');
            throw new Error('Token expirado');
        }

        throw error;
    }
};

// Wrapper para fetch com verificação de token da WebApi
export const fetchWebApi = async (url, options = {}) => {
    try {
        const response = await fetch(url, options);

        // Se a resposta não for ok, processar mesmo assim para verificar token
        if (!response.ok && response.status === 401) {
            handleTokenExpired('O token da WebApi expirou. Será deslogado e terá que fazer login novamente.');
            throw new Error('Token expirado');
        }

        return response;
    } catch (error) {
        throw error;
    }
};
