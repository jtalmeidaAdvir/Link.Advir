const axios = require('axios');

let cachedToken = null;
let lastCredentials = null;

// Função para obter o token de autenticação dinamicamente
async function getAuthToken({ username, password, company, instance, line }, urlempresa) {
    console.log('Parâmetros recebidos no getAuthToken:', { username, password, company, instance, line, urlempresa });

    if (!username || !password || !company || !instance || !line || !urlempresa) {
        throw new Error('Faltam parâmetros de autenticação');
    }

    // Atualiza sempre o token, ignorando o cache
    try {
        const tokenResponse = await axios.post(`http://${urlempresa}/WebApi/token`, new URLSearchParams({
            username,
            password,
            company,
            instance,
            line,
            grant_type: 'password'
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Atualizar o cache do token e as credenciais
        cachedToken = tokenResponse.data.access_token;
        lastCredentials = { username, password, company, instance, line };

        console.log('Novo token obtido e armazenado');

        return cachedToken;
    } catch (error) {
        console.error('Erro ao obter o token:', error.response ? error.response.data : error.message);
        throw new Error('Não foi possível obter o token de autenticação');
    }
}

module.exports = { getAuthToken };