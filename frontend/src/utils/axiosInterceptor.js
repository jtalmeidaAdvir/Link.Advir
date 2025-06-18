
import axios from 'axios';

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

// Interceptor de requisição para adicionar token automaticamente
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('loginToken');
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
        // Verificar se a resposta contém dados sobre token expirado
        if (response.data && isWebApiTokenExpired(response.data)) {
            handleTokenExpired('O token da WebApi expirou. Será deslogado e terá que fazer login novamente.');
            return Promise.reject(new Error('Token expirado'));
        }
        return response;
    },
    (error) => {
        // Verificar se é erro 401
        if (error.response && error.response.status === 401) {
            handleTokenExpired();
            return Promise.reject(error);
        }

        // Verificar se o erro contém informação sobre token expirado
        if (error.response && error.response.data && isWebApiTokenExpired(error.response.data)) {
            handleTokenExpired('O token da WebApi expirou. Será deslogado e terá que fazer login novamente.');
            return Promise.reject(error);
        }

        return Promise.reject(error);
    }
);

export default axios;
