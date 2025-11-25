const express = require('express');
const router = express.Router();
const axios = require('axios');
 
// Função para obter o urlempresa usando o painelAdminToken
async function getEmpresaUrl(req) {
    try {
        const urlempresa = req.headers['urlempresa'];
        if (!urlempresa) {
            throw new Error('URL da empresa não fornecido.');
        }
        return urlempresa;
    } catch (error) {
        console.error('Erro ao obter o URL da empresa:', error.message);
        throw new Error('Erro ao obter o URL da empresa');
    }
}
 
// Rota para inserir parte diária JPA
router.post('/InsertParteDiariaItemJPA', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token de administrador não encontrado. Faça login novamente.' });
        }
 
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }
 
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/InsertParteDiariaItemJPA`;
       
        console.log('📤 Enviando parte diária JPA para:', apiUrl);
        console.log('📦 Payload:', JSON.stringify(req.body, null, 2));
 
        const response = await axios.post(apiUrl, req.body, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 30000 // 30 segundos
        });
 
        console.log('✅ Resposta do Primavera:', response.status, response.data);
        return res.status(response.status).json(response.data);
 
    } catch (error) {
        console.error('❌ Erro ao inserir parte diária JPA:', error.message);
       
        if (error.response) {
            // Erro da API Primavera
            return res.status(error.response.status).json({
                error: 'Erro ao inserir parte diária',
                details: error.response.data,
                status: error.response.status
            });
        } else if (error.request) {
            // Sem resposta do servidor
            return res.status(503).json({
                error: 'Servidor Primavera não respondeu',
                details: error.message
            });
        } else {
            // Erro na configuração do pedido
            return res.status(500).json({
                error: 'Erro inesperado ao processar pedido',
                details: error.message
            });
        }
    }
});
 
module.exports = router;
 