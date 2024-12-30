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


router.get('/GetCAdicionaisEstimado/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetCAdicionais_Estimado/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter dados adicionais estimados', details: error.message });
    }
});


router.get('/GetSubempreitadasReal/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetSubempreitadas_Real/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter subempreitadas reais', details: error.message });
    }
});



router.get('/GetOutrosCustosReal/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetOutrosCustos_Real/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter outros custos reais', details: error.message });
    }
});



router.get('/GetFichasPessoal_Real/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetFichasPessoal_Real/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter outros custos reais', details: error.message });
    }
});


router.get('/GetFichasEquipamento_Real/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetFichasEquipamento_Real/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter outros custos reais', details: error.message });
    }
});


router.get('/GetCustosManuais_Real/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetCustosManuais_Real/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter outros custos reais', details: error.message });
    }
});


router.get('/GetTrabalhosMenos_Real/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetTrabalhosMenos_Real/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter outros custos reais', details: error.message });
    }
});


router.get('/GetSubempreitadas_Pendentes/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetSubempreitadas_Pendentes/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter outros custos reais', details: error.message });
    }
});

router.get('/GetCAdicionais_Proveitos/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetCAdicionais_Proveitos/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter outros custos reais', details: error.message });
    }
});


router.get('/GetNaoAutorizados_Faturacao/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetNaoAutorizados_Faturacao/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter outros custos reais', details: error.message });
    }
});


router.get('/GetAutorizados_Faturacao/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetAutorizados_Faturacao/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter outros custos reais', details: error.message });
    }
});



router.get('/GetTrabalhosMenos_Faturacao/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetTrabalhosMenos_Faturacao/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter outros custos reais', details: error.message });
    }
});

router.get('/GetFaturada_RevisaoPrecos/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetFaturada_RevisaoPrecos/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter outros custos reais', details: error.message });
    }
});


router.get('/GetAutosMedicao_Execucao/:IdObra', async (req, res) => {
    try {
        const { IdObra } = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!painelAdminToken) return res.status(401).json({ error: 'Token ausente. Faça login novamente.' });
        if (!urlempresa) return res.status(400).json({ error: 'URL da empresa não fornecida.' });

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetAutosMedicao_Execucao/${IdObra}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao obter outros custos reais', details: error.message });
    }
});



router.get('/GetFaturados_Faturacao/:IdObra', async (req, res) => {
    try {
        const {IdObra} = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabeçalho
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token de administrador não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);  // Usando a função para obter o urlempresa
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetFaturados_Faturacao/${IdObra}`;  // A URL completa da API
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,  // Envia o token para a autenticação
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            const obras = response.data;  // Obter os obras da resposta
            if (!obras || obras.length === 0) {
                return res.status(404).json({ error: 'Nenhuma obra encontrado.' });
            }

            return res.status(200).json(obras);  // Retorna os obras encontrados
        } else {
            return res.status(400).json({ error: 'Falha ao listar obras.', details: response.data.ErrorMessage });
        }
    } catch (error) {
        console.error('Erro ao listar obras:', error.message);
        return res.status(500).json({ error: 'Erro inesperado ao listar obras', details: error.message });
    }
});


router.get('/GetFichasPessoal/:IdObra', async (req, res) => {
    try {
        const {IdObra} = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabeçalho
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token de administrador não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);  // Usando a função para obter o urlempresa
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetFichasPessoal/${IdObra}`;  // A URL completa da API
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,  // Envia o token para a autenticação
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            const obras = response.data;  // Obter os obras da resposta
            if (!obras || obras.length === 0) {
                return res.status(404).json({ error: 'Nenhuma obra encontrado.' });
            }

            return res.status(200).json(obras);  // Retorna os obras encontrados
        } else {
            return res.status(400).json({ error: 'Falha ao listar obras.', details: response.data.ErrorMessage });
        }
    } catch (error) {
        console.error('Erro ao listar obras:', error.message);
        return res.status(500).json({ error: 'Erro inesperado ao listar obras', details: error.message });
    }
});


router.get('/GetControlo/:IdObra', async (req, res) => {
    try {
        const {IdObra} = req.params;
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabeçalho
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token de administrador não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);  // Usando a função para obter o urlempresa
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/Obras/GetControlo/${IdObra}`;  // A URL completa da API
        console.log('Enviando solicitação para a URL:', apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,  // Envia o token para a autenticação
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        if (response.status === 200) {
            const obras = response.data;  // Obter os obras da resposta
            if (!obras || obras.length === 0) {
                return res.status(404).json({ error: 'Nenhuma obra encontrado.' });
            }

            return res.status(200).json(obras);  // Retorna os obras encontrados
        } else {
            return res.status(400).json({ error: 'Falha ao listar obras.', details: response.data.ErrorMessage });
        }
    } catch (error) {
        console.error('Erro ao listar obras:', error.message);
        return res.status(500).json({ error: 'Erro inesperado ao listar obras', details: error.message });
    }
});

router.post('/InsertPartesDiarias', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1]; // Obtendo o token do cabeçalho
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token de administrador não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req); // Usando a função para obter o urlempresa
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/Obras/InsertPartesDiarias`; // URL da API externa

        // Validar dados no corpo da requisição
        const dados = req.body;
        if (!dados || !dados.Utilizador || !dados.Numero || dados.Numero <= 0) {
            return res.status(400).json({ error: 'Dados inválidos fornecidos.' });
        }

        console.log('Enviando solicitação POST para a URL:', apiUrl);

        // Fazer a chamada POST à API externa
        const response = await axios.post(apiUrl, dados, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.status === 200) {
            return res.status(200).json({ message: 'Registos inseridos com sucesso.' });
        } else {
            return res.status(response.status).json({ error: 'Erro ao inserir registos.', details: response.data });
        }
    } catch (error) {
        console.error('Erro ao inserir registos:', error.message);
        return res.status(500).json({ error: 'Erro inesperado ao inserir registos', details: error.message });
    }
});



module.exports = router;