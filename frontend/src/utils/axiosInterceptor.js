import { secureStorage } from '../utils/secureStorage';
import axios from 'axios';

// Fun��o para mostrar alerta e fazer logout
const handleTokenExpired = (message = 'A sua sess�o expirou. Ser� redirecionado para a p�gina de login.') => {
    alert(message);
    secureStorage.clear();
    window.location.href = '/';
};

// Fun��o para verificar se � erro de token expirado da WebApi
const isWebApiTokenExpired = (data) => {
    return data && (
        data.message === 'Token expirado' ||
        data.error === 'Token expirado' ||
        data.message === 'painelAdminToken expirado' ||
        data.error === 'painelAdminToken expirado' ||
        (typeof data === 'string' && data.includes('Token expirado'))
    );
};

// Interceptor de requisi��o para adicionar token automaticamente
axios.interceptors.request.use(
    (config) => {
        const token = secureStorage.getItem('loginToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor de resposta para lidar com tokens expirados
axios.interceptors.response.use(
    (response) => {
        // Verificar se a resposta cont�m dados sobre token expirado
        if (response.data && isWebApiTokenExpired(response.data)) {
            handleTokenExpired('O token da WebApi expirou. Ser� deslogado e ter� que fazer login novamente.');
            return Promise.reject(new Error('Token expirado'));
        }
        return response;
    },
    (error) => {
        // Verificar se � erro 401
        if (error.response && error.response.status === 401) {
            handleTokenExpired();
            return Promise.reject(error);
        }

        // Verificar se o erro cont�m informa��o sobre token expirado
        if (error.response && error.response.data && isWebApiTokenExpired(error.response.data)) {
            handleTokenExpired('O token da WebApi expirou. Ser� deslogado e ter� que fazer login novamente.');
            return Promise.reject(error);
        }

        return Promise.reject(error);
    }
);

export default axios;
