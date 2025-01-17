const express = require('express');
const router = express.Router();
const axios = require('axios');
const cors = require('cors');

// Fun��o para obter o `urlempresa` usando o `painelAdminToken`
async function getEmpresaUrl(req) {
    try {
        console.log('Cabe�alhos recebidos:', req.headers);  // Verificando os cabe�alhos
        const urlempresa = req.headers['urlempresa'];  // Obtendo o urlempresa do cabe�alho
        if (!urlempresa) {
            throw new Error('URL da empresa n�o fornecido.');
        }
        return urlempresa;  // Retorna o urlempresa diretamente
    } catch (error) {
        console.error('Erro ao obter o URL da empresa:', error.message);
        throw new Error('Erro ao obter o URL da empresa');
    }
}

router.get('/Listar', async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }

        // Monta a URL completa para listar interven��es
        const apiUrl = `http://${urlempresa}/WebApi/Word/Listar`;
        console.log('Enviando solicita��o para a URL:', apiUrl);

        // Realiza a chamada para listar as interven��es
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,  // Envia o token para a autentica��o
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhuma interven��o encontrada.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar interven��es.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }
    } catch (error) {
        console.error('Erro ao listar interven��es:', error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar interven��es',
            details: error.message
        });
    }
});

router.post('/Criar', async (req, res) => {
    try {
        const dadosOficio = req.body;
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho

        // Verifica se o token foi enviado
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }

        // Extraindo os par�metros do corpo da requisi��o
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
        console.log('Enviando solicita��o para a URL:', apiUrl);

        // Cria um objeto com todos os dados a serem enviados
        const requestData = {
            codigo,
            assunto,
            data,
            remetente,
            email,
            texto: texto || 'Texto padr�o'  // Se texto estiver vazio, use 'Texto padr�o'
        };
        console.log('Dados a serem enviados:', requestData);

        // Chamada para a API externa para criar o of�cio
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
            return res.status(404).json({ error: 'Nenhum Of�cio encontrado.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar Of�cio.',
                details: response.data.ErrorMessage || 'Erro desconhecido.'
            });
        }

    } catch (error) {
        console.error('Erro ao chamar a API externa:', error.message);

        // Se a resposta da API de destino contiver dados de erro, os captura
        if (error.response) {
            console.error('Detalhes do erro da resposta:', error.response.data);
            return res.status(error.response.status).json({
                error: 'Erro inesperado ao criar Of�cio',
                details: error.response.data
            });
        }

        // Caso contr�rio, captura o erro gen�rico
        return res.status(500).json({
            error: 'Erro inesperado ao criar Of�cio',
            details: error.message
        });
    }
});


router.get('/atualizar', async (req, res) => {
    try {
        const dadosOficio = req.body;
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }


        // Extraindo os par�metros do corpo da requisi��o
        const {
            codigo,
            assunto,
            data,
            remetente,
            email,
            texto,
        } = req.body;


        // Monta a URL completa para listar interven��es


        const apiUrl = `http://${urlempresa}/WebApi/Word/Atualizar`;
        console.log('Enviando solicita��o para a URL:', apiUrl);
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


        // Chamada para a API para criar a interven��o
        const response = await axios.post(apiUrl, requestData, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
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
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }


        // Monta a URL completa para listar interven��es
        const apiUrl = `http://${urlempresa}/WebApi/Word/Eliminar/${Codigo}`;
        console.log('Enviando solicita��o para a URL:', apiUrl);


        // Chamada para a API para criar a interven��o
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
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
        const token = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabe�alho
        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        // Usando a fun��o para obter o urlempresa dos cabe�alhos
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }


        // Monta a URL completa para listar interven��es
        const apiUrl = `http://${urlempresa}/WebApi/Word/Detalhes/${Codigo}`;
        console.log('Enviando solicita��o para a URL:', apiUrl);


        // Chamada para a API para criar a interven��o
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Verifica o status da resposta
        if (response.status === 200) {
            return res.status(200).json(response.data);  // Retorna as interven��es encontradas
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