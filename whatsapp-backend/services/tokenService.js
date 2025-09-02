
const fetch = require('node-fetch');

async function getAuthToken(credentials, urlEmpresa) {
    try {
        const tokenUrl = `http://${urlEmpresa}/WebApi/token`;
        
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('username', credentials.username);
        params.append('password', credentials.password);
        params.append('company', credentials.company);
        params.append('instance', credentials.instance);
        params.append('line', credentials.line);

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Erro ao obter token:', error);
        throw error;
    }
}

module.exports = { getAuthToken };
