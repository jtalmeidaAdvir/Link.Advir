
const axios = require('axios');

class PrimaveraAuth {
    constructor() {
        this.webApiUrl = 'https://webapiprimavera.advir.pt';
        this.credentials = {
            username: 'ADVIRWEB',
            password: 'Advir2506##',
            company: 'DEMOCN',
            instance: 'DEFAULT',
            line: 'Evolution',
            urlempresa: process.env.PRIMAVERA_URL_EMPRESA || 'localhost:2018'
        };
        this.cachedToken = null;
        this.tokenExpiry = null;
    }

    async getToken() {
        // Verificar se temos um token válido em cache
        if (this.cachedToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            console.log('✅ Usando token em cache');
            return this.cachedToken;
        }

        console.log('🔄 Obtendo novo token do Primavera...');

        try {
            const response = await axios.post(
                `${this.webApiUrl}/connect-database/token`,
                {
                    username: this.credentials.username,
                    password: this.credentials.password,
                    company: this.credentials.company,
                    instance: this.credentials.instance,
                    line: this.credentials.line,
                    urlempresa: this.credentials.urlempresa
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.data && response.data.token) {
                this.cachedToken = response.data.token;
                // Token válido por 50 minutos (ajuste conforme necessário)
                this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);
                console.log('✅ Token Primavera obtido com sucesso');
                return this.cachedToken;
            } else {
                throw new Error('Token não retornado pela API');
            }
        } catch (error) {
            console.error('❌ Erro ao obter token Primavera:', error.message);
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Data:', error.response.data);
            }
            throw new Error('Não foi possível obter token do Primavera');
        }
    }

    getUrlEmpresa() {
        return this.credentials.urlempresa;
    }

    // Forçar renovação do token
    async refreshToken() {
        this.cachedToken = null;
        this.tokenExpiry = null;
        return await this.getToken();
    }
}

module.exports = new PrimaveraAuth();
