import { secureStorage } from '../utils/secureStorage';
// Fun��o para mostrar alerta e fazer logout
const handleTokenExpired = (message = 'A sua sess�o expirou. Ser� redirecionado para a p�gina de login.') => {
    alert(message);
    secureStorage.clear();
    window.location.href = '/';
};

// Fun��o para verificar se � erro de token expirado da WebApi
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

// Fun��o para processar respostas da WebApi e verificar tokens expirados
export const processWebApiResponse = async (response) => {
    try {
        const data = await response.json();

        if (isWebApiTokenExpired(data)) {
            handleTokenExpired('O token da WebApi expirou. Ser� deslogado e ter� que fazer login novamente.');
            throw new Error('Token expirado');
        }

        return data;
    } catch (error) {
        if (error.message === 'Token expirado') {
            throw error;
        }

        // Se n�o conseguir parsear como JSON, verificar se � erro 401
        if (response.status === 401) {
            handleTokenExpired('O token da WebApi expirou. Ser� deslogado e ter� que fazer login novamente.');
            throw new Error('Token expirado');
        }

        throw error;
    }
};

// Wrapper para fetch com verifica��o de token da WebApi
export const fetchWebApi = async (url, options = {}) => {
    try {
        const response = await fetch(url, options);

        // Se a resposta n�o for ok, processar mesmo assim para verificar token
        if (!response.ok && response.status === 401) {
            handleTokenExpired('O token da WebApi expirou. Ser� deslogado e ter� que fazer login novamente.');
            throw new Error('Token expirado');
        }

        return response;
    } catch (error) {
        throw error;
    }
};
