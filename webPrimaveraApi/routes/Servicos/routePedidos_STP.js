const express = require('express');
const router = express.Router();
const axios = require('axios');
const cors = require('cors');
const sendEmail = require('../../servives/emailServicos'); // Substitua pelo caminho correto


// Middleware CORS para toda a aplicação ou rota específica
router.use(cors());

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

// Rota para obter informações de e-mail
router.get('/ObterInfoEmail/:PedidoId/:UltimaNumIntervencao', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token de administrador não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecido.' });
        }

        // Agora os parâmetros são extraídos diretamente da URL
        const { PedidoId, UltimaNumIntervencao } = req.params;  // Use req.params para obter os parâmetros na URL

        if (!PedidoId || !UltimaNumIntervencao) {
            return res.status(400).json({ error: 'Parâmetros não fornecidos na URL.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ObterInfoEmail/${PedidoId}/${UltimaNumIntervencao}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        // Fazendo a requisição para o backend .NET
        const response = await axios.get(apiUrl, {
            params: {
                PedidoId,
                UltimaNumIntervencao,
            },
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Accept': 'application/json',
            },
        });

        if (response.status === 201 || response.status === 200) {
            return res.status(200).json(response.data);
        } else {
            return res.status(response.status).json({
                error: 'Falha ao obter informações de e-mail.',
                details: response.data.ErrorMessage || 'Erro desconhecido',
            });
        }
    } catch (error) {
        console.error('Erro ao obter informações de e-mail:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao obter informações de e-mail',
            details: error.message,
        });
    }
});


// Rota para listar todos os pedidos de clientes
router.get('/LstClientes', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token de administrador não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/Base/LstClientes`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        console.log('Resposta da API:', response.status, response.data);

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhum cliente encontrado.' });
        } else {
            return res.status(response.status).json({
                error: 'Falha ao listar clientes.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar clientes:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar clientes',
            details: error.message
        });
    }
});

router.get('/LstUltimoPedido', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token de administrador não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/LstUltimoPedido`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        console.log('Resposta da API:', response.status, response.data);

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Nenhum UltimoPedido encontrado.' });
        } else {
            return res.status(response.status).json({
                error: 'Falha ao UltimoPedido UltimoPedido.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar UltimoPedido:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar UltimoPedido',
            details: error.message
        });
    }
});

// Rota para listar contactos
router.get('/ListarContactos/:IDCliente', async (req, res) => {
    try {
        const { IDCliente } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Usa a função getEmpresaUrl para obter o urlempresa
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ListarContactos/${IDCliente}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhum cliente encontrado.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar clientes.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar contactos:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar contactos',
            details: error.message
        });
    }
});

// Rota para obter email cliente
router.get('/GetEmailGeral/:IDCliente', async (req, res) => {
    try {
        const { IDCliente } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Usa a função getEmpresaUrl para obter o urlempresa
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/GetEmailGeral/${IDCliente}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhum cliente encontrado.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar clientes.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar contactos:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar contactos',
            details: error.message
        });
    }
});

// Rota para obter email tecnico
router.get('/GetEmailTecnico/:IDTecnico', async (req, res) => {
    try {
        const { IDTecnico } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Usa a função getEmpresaUrl para obter o urlempresa
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/GetEmailTecnico/${IDTecnico}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhum tecnico encontrado.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar email tecnico.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar tecnico:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar tecnico',
            details: error.message
        });
    }
});


// Rota para obter email do técnico
router.get('/GetEmailTecnico/:tecnicoId', async (req, res) => {
    try {
        const { tecnicoId } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Usa a função getEmpresaUrl para obter o urlempresa
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/GetEmailTecnico/${tecnicoId}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'urlempresa': urlempresa,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Email do técnico não encontrado.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao obter email do técnico.',
                details: response.data.ErrorMessage || 'Erro desconhecido'
            });
        }
    } catch (error) {
        console.error('Erro ao obter email do técnico:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao obter email do técnico',
            details: error.message
        });
    }
});

// Rota para listar contactos da intervencao
router.get('/ObterContactoIntervencao/:IDIntervencao', async (req, res) => {
    try {
        const { IDIntervencao } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Usa a função getEmpresaUrl para obter o urlempresa
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ObterContactoIntervencao/${IDIntervencao}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'urlempresa': urlempresa,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhum cliente encontrado.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar contactos.',
                details: response.data.ErrorMessage || 'Erro desconhecido'
            });
        }
    } catch (error) {
        console.error('Erro ao listar contactos:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar contactos',
            details: error.message
        });
    }
});

// Rota para listar estados
router.get('/LstEstadosTodos', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Usa a função getEmpresaUrl para obter o urlempresa
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/LstEstadosTodos`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            console.log('Conteúdo da Tabela:', response.data.DataSet.Table);
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhum cliente encontrado.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar clientes.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar estados:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar estados',
            details: error.message
        });
    }
});

// Rota para listar seções
router.get('/GetTempoDeslocacao/:processoID', async (req, res) => {
    try {
        const { processoID } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/GetTempoDeslocacao/${processoID}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);

        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhuma tempo encontrada.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar tempos.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar tempos:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar tempos',
            details: error.message
        });
    }
});
// Rota para listar tipos de intervenção
router.get('/LstTiposIntervencao', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Usa a função getEmpresaUrl para obter o urlempresa
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/LstTiposIntervencao`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhum cliente encontrado.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar clientes.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar tipos de intervenção:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar tipos de intervenção',
            details: error.message
        });
    }
});

// Rota para listar objetos
router.get('/LstObjectos', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/LstObjectos`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhum objeto encontrado.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar objetos.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar objetos:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar objetos',
            details: error.message
        });
    }
});

// Rota para listar origens de processos
router.get('/LstOrigensProcessos', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/LstOrigensProcessos`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhuma origem de processo encontrada.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar origens de processos.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar origens de processos:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar origens de processos',
            details: error.message
        });
    }
});

// Rota para listar tipos de prioridades
router.get('/ListarTiposPrioridades', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ListarTiposPrioridades`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhuma prioridade encontrada.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar prioridades.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar prioridades:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar prioridades',
            details: error.message
        });
    }
});

// Rota para listar seções
router.get('/ListarSeccoes', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ListarSeccoes`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhuma seção encontrada.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar seções.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar seções:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar seções',
            details: error.message
        });
    }
});



// Rota para listar seções
router.get('/ListarContratos/:IDCliente', async (req, res) => {
    try {
        const { IDCliente } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ListarContratos/${IDCliente}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);

        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhuma seção encontrada.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar seções.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar seções:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar seções',
            details: error.message
        });
    }
});

// Rota para listar tipos de processos
router.get('/ListarTiposProcesso', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ListarTiposProcesso`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhum tipo de processo encontrado.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar tipos de processos.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar tipos de processos:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar tipos de processos',
            details: error.message
        });
    }
});


// Rota para listar todos os técnicos
router.get('/LstTecnicosTodos', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/LstTecnicosTodos`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhum técnico encontrado.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar técnicos.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar técnicos:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar técnicos',
            details: error.message
        });
    }
});

// Rota para listar artigos
router.get('/LstArtigos', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Usa a função getEmpresaUrl para obter o urlempresa
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/Artigo/LstArtigos`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhum artigo encontrado.'
            });
        } else {
            return res.status(400).json({
                error: 'Falha ao listar artigos.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao listar artigos:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao listar artigos',
            details: error.message
        });
    }
});

// Rota para obter Intervenção
router.get('/GetIntervencao/:IntervencaoID', async (req, res) => {
    try {
        const { IntervencaoID } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/GetIntervencao/${IntervencaoID}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao obter o estado do pedido.',
                details: response.data.ErrorMessage || 'Erro desconhecido.',
            });
        }
    } catch (error) {
        console.error('Erro ao obter o estado do pedido:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao obter o estado do pedido.',
            details: error.response?.data || error.message,
        });
    }
});

// Rota para eliminar Intervenção
router.get('/EliminarIntervencao/:IntervencaoID', async (req, res) => {
    try {
        const { IntervencaoID } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/EliminarIntervencao/${IntervencaoID}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao obter o estado do pedido.',
                details: response.data.ErrorMessage || 'Erro desconhecido.',
            });
        }
    } catch (error) {
        console.error('Erro ao eliminar intervenção:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao eliminar intervenção.',
            details: error.message,
        });
    }
});

// Rota para eliminar pedido
router.get('/EliminarPedido/:PedidoID', async (req, res) => {
    try {
        const { PedidoID } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/EliminarPedido/${PedidoID}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao obter o estado do pedido.',
                details: response.data.ErrorMessage || 'Erro desconhecido.',
            });
        }
    } catch (error) {
        console.error('Erro ao eliminar pedido:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao eliminar pedido.',
            details: error.message,
        });
    }
});

// Rota para obter o último estado do pedido
router.get('/DaUltimoEstadoPedido/:PedidoID', async (req, res) => {
    try {
        const { PedidoID } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/DaUltimoEstadoPedido/${PedidoID}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao obter o estado do pedido.',
                details: response.data.ErrorMessage || 'Erro desconhecido.',
            });
        }
    } catch (error) {
        console.error('Erro ao obter o estado do pedido:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao obter o estado do pedido.',
            details: error.response?.data || error.message,
        });
    }
});

router.get('/ListarSeccaoUtilizador/:PedidoID', async (req, res) => {
    try {
        const { PedidoID } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ListarSeccaoUtilizador/${PedidoID}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao obter o estado do pedido.',
                details: response.data.ErrorMessage || 'Erro desconhecido.',
            });
        }
    } catch (error) {
        console.error('Erro ao obter o estado do pedido:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao obter o estado do pedido.',
            details: error.response?.data || error.message,
        });
    }
});


router.get('/ObterInfoContratoProcesso/:idProcesso', async (req, res) => {
    try {
        const { idProcesso } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        // Primeiro, obter dados do processo para extrair o ID do cliente
        console.log('🔍 Buscando dados do processo:', idProcesso);
        const processoApiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ListarPedidosTecnico/${idProcesso}`;
        
        let clienteId = null;
        try {
            const processoResponse = await axios.get(processoApiUrl, {
                headers: {
                    Authorization: `Bearer ${painelAdminToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });
            
            if (processoResponse.status === 200 && processoResponse.data?.DataSet?.Table?.[0]) {
                const processo = processoResponse.data.DataSet.Table[0];
                clienteId = processo.Cliente || processo.Entidade || processo.ClienteID || processo.EntidadeID;
                console.log('🔍 Cliente ID extraído do processo:', clienteId);
            }
        } catch (processoError) {
            console.warn('⚠️ Erro ao buscar dados do processo:', processoError.message);
        }

        if (!clienteId) {
            return res.status(404).json({ error: 'Cliente não encontrado no processo.' });
        }

        // Agora usar o endpoint ObterInfoContrato com o ID do cliente
        const contratoApiUrl = `http://${urlempresa}/WebApi/ClientArea/ObterInfoContrato/${clienteId}`;
        console.log('Enviando solicitação para a URL:', contratoApiUrl);

        const response = await axios.get(contratoApiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Contrato não encontrado.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao obter informações do contrato.',
                details: response.data.ErrorMessage || 'Erro desconhecido.',
            });
        }
    } catch (error) {
        console.error('Erro ao obter informações do contrato:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao obter informações do contrato.',
            details: error.response?.data || error.message,
        });
    }
});

// Rota para criar um pedido
router.post('/CriarPedido', async (req, res) => {
    try {
        // Obter o token de autenticação do cabeçalho
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Obter a URL da empresa do cabeçalho usando a função getEmpresaUrl
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        // Extraindo os parâmetros do corpo da requisição
        const {
            cliente,
            descricaoObjecto,
            descricaoProblema,
            origem,
            tipoProcesso,
            prioridade,
            tecnico,
            objectoID,
            tipoDoc,
            serie,
            estado,
            seccao,
            comoReproduzir, // Este pode ser nulo
            contacto, // Este pode ser nulo
            contratoID,
            datahoraabertura,
            datahorafimprevista

        } = req.body;

        // Construindo a URL da API
        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/CriarPedido`;

        // Cria um objeto com todos os dados a serem enviados
        const requestData = {
            cliente,
            descricaoObjecto,
            descricaoProblema,
            origem,
            tipoProcesso,
            prioridade,
            tecnico,
            objectoID,
            tipoDoc: "PA", //TODO
            serie,
            estado: Number(estado),
            seccao,
            comoReproduzir: comoReproduzir || null,
            contacto: contacto || null,
            contratoID,
            datahoraabertura,
            datahorafimprevista
        };

        console.log('Enviando solicitação para a URL:', apiUrl);
        console.log('Dados a serem enviados:', requestData);

        // Chamada para a API para criar o pedido
        const response = await axios.post(apiUrl, requestData, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({
                error: 'Nenhum cliente encontrado.'
            });
        } else {
            return res.status(response.status).json({
                error: 'Falha ao criar pedido.',
                details: response.data.ErrorMessage
            });
        }
    } catch (error) {
        console.error('Erro ao criar pedido:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao criar pedido',
            details: error.message
        });
    }
});


router.post('/CriarIntervencoes', async (req, res) => {
    try {
        const dadosIntervencao = req.body;


        // Obter o token de autenticação do cabeçalho
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        // Obter a URL da empresa do cabeçalho usando a função getEmpresaUrl
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        // Extraindo os parâmetros do corpo da requisição
        const {
            processoID,
            tipoIntervencao,
            duracao,
            duracaoReal,
            DataHoraInicio,
            DataHoraFim,
            tecnico,
            estadoAnt,
            estado,
            seccaoAnt,
            seccao,
            utilizador,
            descricaoResposta,
            artigos,
            emailDestinatario // Certifique-se de que o frontend envia este campo
        } = req.body;

        // Construindo a URL da API
        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/CriarIntervencoes`;

        console.log('Enviando solicitação para a URL:', apiUrl);

        // Cria um objeto com todos os dados a serem enviados
        const requestData = {
            processoID,
            tipoIntervencao,
            duracao,
            duracaoReal,
            DataHoraInicio,
            DataHoraFim,
            tecnico,
            estadoAnt,
            estado: Number(estado),
            seccaoAnt,
            seccao,
            utilizador,
            descricaoResposta,
            artigos,
            emailDestinatario // Verifique se este campo é extraído
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

        if (response.status === 200) {
            // Enviar o email após a intervenção ser criada com sucesso

            return res.status(200).json({
                mensagem: 'Intervenção criada e email enviado com sucesso!',
                detalhes: response.data
            });

        } else {
            return res.status(response.status).json({
                error: 'Falha ao criar intervenção.',
                details: response.data
            });
        }
    } catch (error) {
        console.error('Erro ao criar intervenção:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao criar intervenção.',
            details: error.message
        });
    }
});






router.get('/ListaProcessosTecnico/:TecnicoID', async (req, res) => {
    try {
        const { TecnicoID } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ListaProcessosTecnico/${TecnicoID}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao obter o estado do pedido.',
                details: response.data.ErrorMessage || 'Erro desconhecido.',
            });
        }
    } catch (error) {
        console.error('Erro ao obter o estado do pedido:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao obter o estado do pedido.',
            details: error.response?.data || error.message,
        });
    }
});


router.get('/ListaIntervencoesTecnico/:TecnicoID', async (req, res) => {
    try {
        const { TecnicoID } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ListaIntervencoesTecnico/${TecnicoID}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao obter o estado do pedido.',
                details: response.data.ErrorMessage || 'Erro desconhecido.',
            });
        }
    } catch (error) {
        console.error('Erro ao obter o estado do pedido:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao obter o estado do pedido.',
            details: error.response?.data || error.message,
        });
    }
});



router.get('/MudarEstadoPedido/:EstadoID', async (req, res) => {
    try {
        const { EstadoID } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/MudarEstadoPedido/${EstadoID}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao obter o estado do pedido.',
                details: response.data.ErrorMessage || 'Erro desconhecido.',
            });
        }
    } catch (error) {
        console.error('Erro ao obter o estado do pedido:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao obter o estado do pedido.',
            details: error.response?.data || error.message,
        });
    }
});


// Rota para listar todas as intervenções de um tecnico
router.get('/pedidostecnico/:pedidoId', async (req, res) => {
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
        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ListarPedidosTecnico/${pedidoId}`;
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





//Rota para fechar processos
router.post('/FechaProcessoID/:ProcessoID', async (req, res) => {
    try {
        const { ProcessoID } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/FechaProcessoID/${ProcessoID}`;
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.post(apiUrl, {}, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });


        if (response.status === 200) {
            return res.status(200).json(response.data);
        } else if (response.status === 404) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        } else {
            return res.status(400).json({
                error: 'Falha ao obter o id do pedido.',
                details: response.data.ErrorMessage || 'Erro desconhecido.',
            });
        }
    } catch (error) {
        console.error('Erro ao obter o id do pedido:', error.response ? error.response.data : error.message);
        return res.status(500).json({
            error: 'Erro inesperado ao obter o id do pedido.',
            details: error.response?.data || error.message,
        });
    }
});





module.exports = router;