const express = require('express');
const router = express.Router();
const axios = require('axios');
const cors = require('cors');




// Função para obter o `urlempresa` usando o `painelAdminToken`
async function getEmpresaUrl(req) {
    try {
        console.log('Cabeçalhos recebidos:', req.headers);  // Verificando os cabeçalhos
        const urlempresa = req.headers['urlempresa'];  // Obtendo o urlempresa do cabeçalho
        if (!urlempresa) {
            throw new Error('URL da empresa não fornecido.');
        }
        return urlempresa;  // Retorna o urlempresa diretamente
    } catch (error) {
        console.error('Erro ao obter o URL da empresa:', error.message);
        throw new Error('Erro ao obter o URL da empresa');
    }
}



router.get('/ObterInfoContrato/:Id', async (req, res) => {
    try {

        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ObterInfoContrato/${req.params.Id}`;

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }

        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro :', error.message);
        res.status(500).json({ error: 'Erro ao obter dados adicionais estimados', details: error.message });
    }
});

module.exports = router;