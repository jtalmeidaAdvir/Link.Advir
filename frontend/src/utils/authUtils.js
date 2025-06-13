// src/utils/authUtils.js
export const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('loginToken');
    const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
    };

    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/'; // Ou navegação manual
        }
        return response;
    } catch (error) {
        console.error('Erro de rede:', error);
        throw error;
    }
};
