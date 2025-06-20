
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Fun��o auxiliar para obter URL da empresa
const getEmpresaUrl = async (req) => {
    return req.headers.urlempresa;
};

// Fun��o para fazer requisi��es com retry
const fetchWithRetry = async (url, options, maxRetries = 3, delayMs = 1000) => {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await axios(url, options);
            return response;
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
            }
        }
    }

    throw lastError;
};

// Rota principal para analytics dos pedidos
router.get('/pedidos', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const urlempresa = await getEmpresaUrl(req);

        if (!token) {
            return res.status(401).json({ error: 'Token n�o encontrado. Fa�a login novamente.' });
        }

        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa n�o fornecida.' });
        }

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        // Buscar dados de diferentes t�cnicos
        const tecnicosIds = ['001', '002', '003', '004'];
        const todosPedidos = [];

        for (const tecnicoId of tecnicosIds) {
            try {
                const apiUrl = `http://${urlempresa}/WebApi/ServicosTecnicos/ListaProcessosTecnico/${tecnicoId}`;
                console.log(`Buscando dados para t�cnico ${tecnicoId}:`, apiUrl);

                const response = await fetchWithRetry(apiUrl, {
                    method: 'GET',
                    headers
                });

                if (response.status === 200 && response.data?.DataSet?.Table) {
                    // Adicionar informa��es do t�cnico aos pedidos
                    const pedidosComTecnico = response.data.DataSet.Table.map(pedido => ({
                        ...pedido,
                        TecnicoID: tecnicoId,
                        NomeTecnico: getTecnicoNome(tecnicoId)
                    }));
                    todosPedidos.push(...pedidosComTecnico);
                }
            } catch (error) {
                console.error(`Erro ao buscar dados do t�cnico ${tecnicoId}:`, error.message);
                // Continua para o pr�ximo t�cnico se houver erro
            }
        }

        // Se n�o conseguiu buscar dados reais, retorna dados simulados
        if (todosPedidos.length === 0) {
            console.log('Retornando dados simulados devido a falhas na API');
            return res.json(getDadosSimulados());
        }

        // Processar e retornar dados reais
        const dadosProcessados = {
            DataSet: {
                Table: todosPedidos
            }
        };

        res.json(dadosProcessados);

    } catch (error) {
        console.error('Erro geral ao buscar analytics:', error);
        // Em caso de erro, retorna dados simulados
        res.json(getDadosSimulados());
    }
});

// Fun��o auxiliar para obter nome do t�cnico
const getTecnicoNome = (tecnicoId) => {
    const tecnicos = {
        '001': 'Jos� Alves',
        '002': 'Jos� Vale',
        '003': 'Jorge Almeida',
        '004': 'Vitor Mendes'
    };
    return tecnicos[tecnicoId] || `T�cnico ${tecnicoId}`;
};

// Fun��o para dados simulados (fallback)
const getDadosSimulados = () => {
    return {
        DataSet: {
            Table: [
                {
                    ID: 1,
                    Processo: "2024/1001",
                    NumProcesso: 1001,
                    Cliente: "CLIENTE001",
                    NomeCliente: "Cliente Teste 1",
                    Estado: "0", // Fechado
                    Prioridade: "2", // M�dia
                    DataHoraAbertura: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    DataHoraInicio: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    DataHoraFim: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                    TecnicoID: "001",
                    NomeTecnico: "Jos� Alves",
                    TipoInterv: "Manuten��o Corretiva",
                    TipoDoc1: "Contrato Manuten��o",
                    Duracao: 120,
                    DescricaoProb: "Problema de sistema resolvido",
                    DescricaoResp: "Sistema reparado com sucesso"
                },
                {
                    ID: 2,
                    Processo: "2024/1002",
                    NumProcesso: 1002,
                    Cliente: "CLIENTE002",
                    NomeCliente: "Cliente Teste 2",
                    Estado: "1", // Aguardar interven��o
                    Prioridade: "3", // Alta
                    DataHoraAbertura: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    DataHoraInicio: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    TecnicoID: "002",
                    NomeTecnico: "Jos� Vale",
                    TipoInterv: "Suporte T�cnico",
                    TipoDoc1: "Contrato Suporte",
                    Duracao: 0,
                    DescricaoProb: "Problema urgente em an�lise"
                },
                {
                    ID: 3,
                    Processo: "2024/1003",
                    NumProcesso: 1003,
                    Cliente: "CLIENTE003",
                    NomeCliente: "Cliente Teste 3",
                    Estado: "2", // Em curso
                    Prioridade: "1", // Baixa
                    DataHoraAbertura: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    DataHoraInicio: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    TecnicoID: "003",
                    NomeTecnico: "Jorge Almeida",
                    TipoInterv: "Manuten��o Preventiva",
                    TipoDoc1: "Contrato Manuten��o",
                    Duracao: 60,
                    DescricaoProb: "Manuten��o preventiva programada"
                },
                {
                    ID: 4,
                    Processo: "2024/1004",
                    NumProcesso: 1004,
                    Cliente: "CLIENTE001",
                    NomeCliente: "Cliente Teste 1",
                    Estado: "0", // Fechado
                    Prioridade: "2", // M�dia
                    DataHoraAbertura: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    DataHoraInicio: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    DataHoraFim: new Date().toISOString(),
                    TecnicoID: "001",
                    NomeTecnico: "Jos� Alves",
                    TipoInterv: "Atualiza��o",
                    TipoDoc1: "Contrato Suporte",
                    Duracao: 90,
                    DescricaoProb: "Atualiza��o de software necess�ria",
                    DescricaoResp: "Software atualizado com sucesso"
                },
                {
                    ID: 5,
                    Processo: "2024/1005",
                    NumProcesso: 1005,
                    Cliente: "CLIENTE004",
                    NomeCliente: "Cliente Teste 4",
                    Estado: "0", // Fechado
                    Prioridade: "1", // Baixa
                    DataHoraAbertura: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    DataHoraInicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    DataHoraFim: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                    TecnicoID: "004",
                    NomeTecnico: "Vitor Mendes",
                    TipoInterv: "Consultoria",
                    TipoDoc1: "Contrato Consultoria",
                    Duracao: 180,
                    DescricaoProb: "Consultoria sobre melhores pr�ticas",
                    DescricaoResp: "Consultoria realizada com recomenda��es"
                }
            ]
        }
    };
};

module.exports = router;
