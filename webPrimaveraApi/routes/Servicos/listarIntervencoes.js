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

// Rota para listar todas as intervenções de um pedido
router.get('/:pedidoId', async (req, res) => {
    try {
        const { pedidoId } = req.params;
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabeçalho
        if (!token) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Usando a função para obter o urlempresa dos cabeçalhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        // Monta a URL completa para listar intervenções
        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ListarIntervencoes/${pedidoId}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        // Realiza a chamada para listar as intervenções
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,  // Envia o token para a autenticação
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as intervenções encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhuma intervenção encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar intervenções.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar intervenções:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar intervenções',
            details: error.message
        });
    }
});

module.exports = router;
