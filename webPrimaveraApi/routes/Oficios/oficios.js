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

router.get('/Listar', async (req, res) => {
    try {
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
        const apiUrl = `http://${urlempresa}/WebApi/Word/Listar`;
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

router.post('/Criar', async (req, res) => {
    try {
        const dadosOficio = req.body;
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabeçalho

        // Verifica se o token foi enviado
        if (!token) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Usando a função para obter o urlempresa dos cabeçalhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        // Extraindo os parâmetros do corpo da requisição
        const {
            codigo,
            assunto,
            data,
            remetente,
            email,
            texto,
        } = req.body;

        // Monta a URL completa para a API externa
        const apiUrl = `http://${urlempresa}/WebApi/Word/Criar`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        // Cria um objeto com todos os dados a serem enviados
        const requestData = {
            codigo,
            assunto,
            data,
            remetente,
            email,
            texto: texto || 'Texto padrão'  // Se texto estiver vazio, use 'Texto padrão'
        };
        console.log('Dados a serem enviados:', requestData);

        // Chamada para a API externa para criar o ofício
        const response = await axios.post(apiUrl, requestData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        // Verifica o status da resposta da API de destino
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna os dados da resposta
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhum Ofício encontrado.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar Ofício.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }

    } catch (error) {
        console.error('Erro ao chamar a API externa:', error.message);

        // Se a resposta da API de destino contiver dados de erro, os captura
        if (error.response) {
            console.error('Detalhes do erro da resposta:', error.response.data);
            return res.status(error.response.status).json({
                error: 'Erro inesperado ao criar Ofício',
                details: error.response.data
            });
        }

        // Caso contrário, captura o erro genérico
        return res.status(500).json({
            error: 'Erro inesperado ao criar Ofício',
            details: error.message
        });
    }
});


router.get('/atualizar', async (req, res) => {
    try {
        const dadosOficio = req.body;
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabeçalho
        if (!token) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Usando a função para obter o urlempresa dos cabeçalhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }


        // Extraindo os parâmetros do corpo da requisição
        const {
            codigo,
            assunto,
            data,
            remetente,
            email,
            texto,
        } = req.body;


        // Monta a URL completa para listar intervenções


        const apiUrl = `http://${urlempresa}/WebApi/Word/Atualizar`;
        console.log('Enviando solicitação para a URL:', apiUrl);
        // Cria um objeto com todos os dados a serem enviados
        const requestData = {
                     codigo,
            assunto,
            data,
            remetente,
            email,
            texto,
        };
        console.log('Dados a serem enviados:', requestData);


        // Chamada para a API para criar a intervenção
        const response = await axios.post(apiUrl, requestData, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as intervenções encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhum Oficio encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar Oficio.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar Oficio:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar Oficio',
            details: error.message
        });
    }
});

router.get('/Eliminar/:Codigo', async (req, res) => {
    try {
        const { Codigo } = req.params;
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
        const apiUrl = `http://${urlempresa}/WebApi/Word/Eliminar/${Codigo}`;
        console.log('Enviando solicitação para a URL:', apiUrl);


        // Chamada para a API para criar a intervenção
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as intervenções encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhum Oficio encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar Oficio.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar Oficio:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar Oficio',
            details: error.message
        });
    }
});

router.get('/Detalhes/:Codigo', async (req, res) => {
    try {
        const { Codigo } = req.params;
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
        const apiUrl = `http://${urlempresa}/WebApi/Word/Detalhes/${Codigo}`;
        console.log('Enviando solicitação para a URL:', apiUrl);


        // Chamada para a API para criar a intervenção
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as intervenções encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhum Oficio encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar Oficio.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar Oficio:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar Oficio',
            details: error.message
        });
    }
});

module.exports = router;