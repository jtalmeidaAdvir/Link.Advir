import { secureStorage } from '../utils/secureStorage';
import axios from 'axios';

// Função para fazer logout sem alert (alert duplicado é confuso)
const handleTokenExpired = (message = 'A sua sessão expirou. Será redirecionado para a página de login.') => {
    console.log('Sessão expirada:', message);
    secureStorage.clear();
    window.location.href = '/login';
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
        // Verificar se a resposta contém dados sobre token expirado
        if (response.data && isWebApiTokenExpired(response.data)) {
            handleTokenExpired('O token da WebApi expirou.');
            return Promise.reject(new Error('Token expirado'));
        }
        return response;
    },
    (error) => {
        // Apenas tratar 401 e 403 como token expirado
        // Não tratar 500 como token expirado
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Verificar se realmente é erro de token
            if (error.response.data && isWebApiTokenExpired(error.response.data)) {
                handleTokenExpired('O token da WebApi expirou.');
            } else {
                handleTokenExpired();
            }
            return Promise.reject(error);
        }

        // Para erro 500, apenas propagar sem fazer logout
        if (error.response && error.response.status === 500) {
            console.log('Erro 500 do servidor - mantendo sessão ativa');
        }

        return Promise.reject(error);
    }
);

export default axios;