const express = require("express");
const router = express.Router();
const axios = require("axios");
const cors = require("cors");
const nodemailer = require("nodemailer");

// Função para obter o `urlempresa` usando o `painelAdminToken`
async function getEmpresaUrl(req) {
    try {
        console.log("Cabeçalhos recebidos:", req.headers); // Verificando os cabeçalhos
        const urlempresa = req.headers["urlempresa"]; // Obtendo o urlempresa do cabeçalho
        if (!urlempresa) {
            throw new Error("URL da empresa não fornecido.");
        }
        return urlempresa; // Retorna o urlempresa diretamente
    } catch (error) {
        console.error("Erro ao obter o URL da empresa:", error.message);
        throw new Error("Erro ao obter o URL da empresa");
    }
}


router.get("/GetListaFaltasFuncionario/:codFuncionario", async (req, res) => {
    try {
        const painelAdminToken = req.headers["authorization"]?.split(" ")[1]; // Obtendo o token do cabeçalho
        if (!painelAdminToken) {
            return res
                .status(401)
                .json({
                    error: "Token de administrador não encontrado. Faça login novamente.",
                });
        }

        const urlempresa = await getEmpresaUrl(req); // Usando a função para obter o urlempresa
        if (!urlempresa) {
            return res
                .status(400)
                .json({ error: "URL da empresa não fornecida." });
        }
        const { codFuncionario } = req.params;
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetListaFaltasFuncionario/${codFuncionario}`; // A URL completa da API
        console.log("Enviando solicitação para a URL:", apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`, // Envia o token para a autenticação
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        if (response.status === 200) {
            const pedidos = response.data; // Obter os pedidos da resposta
            if (!pedidos || pedidos.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Nenhuma falta encontrada." });
            }

            return res.status(200).json(pedidos); // Retorna os pedidos encontrados
        } else {
            return res
                .status(400)
                .json({
                    error: "Falha ao listar faltas.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar faltas:", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao listar faltas",
                details: error.message,
            });
    }
});


router.get("/GetListaTipoFaltas", async (req, res) => {
    try {
        const painelAdminToken = req.headers["authorization"]?.split(" ")[1]; // Obtendo o token do cabeçalho
        if (!painelAdminToken) {
            return res
                .status(401)
                .json({
                    error: "Token de administrador não encontrado. Faça login novamente.",
                });
        }

        const urlempresa = await getEmpresaUrl(req); // Usando a função para obter o urlempresa
        if (!urlempresa) {
            return res
                .status(400)
                .json({ error: "URL da empresa não fornecida." });
        }
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetListaTipoFaltas/`; // A URL completa da API
        console.log("Enviando solicitação para a URL:", apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`, // Envia o token para a autenticação
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        if (response.status === 200) {
            const pedidos = response.data; // Obter os pedidos da resposta
            if (!pedidos || pedidos.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Nenhum tipo de falta encontrada." });
            }

            return res.status(200).json(pedidos); // Retorna os pedidos encontrados
        } else {
            return res
                .status(400)
                .json({
                    error: "Falha ao listar tipos de faltas.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar faltas:", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao listar faltas",
                details: error.message,
            });
    }
});


router.get("/GetHorariosTrabalho", async (req, res) => {
    try {
        const painelAdminToken = req.headers["authorization"]?.split(" ")[1]; // Obtendo o token do cabeçalho
        if (!painelAdminToken) {
            return res
                .status(401)
                .json({
                    error: "Token de administrador não encontrado. Faça login novamente.",
                });
        }

        const urlempresa = await getEmpresaUrl(req); // Usando a função para obter o urlempresa
        if (!urlempresa) {
            return res
                .status(400)
                .json({ error: "URL da empresa não fornecida." });
        }
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetHorariosTrabalho/`; // A URL completa da API
        console.log("Enviando solicitação para a URL:", apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`, // Envia o token para a autenticação
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        if (response.status === 200) {
            const pedidos = response.data; // Obter os pedidos da resposta
            if (!pedidos || pedidos.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Nenhum tipo de horario encontrado." });
            }

            return res.status(200).json(pedidos); // Retorna os pedidos encontrados
        } else {
            return res
                .status(400)
                .json({
                    error: "Falha ao listar tipos de horarios.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar horarios:", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao listar horarios",
                details: error.message,
            });
    }
});

router.get("/GetHorarioFuncionario/:codFuncionario", async (req, res) => {
    try {
        const painelAdminToken = req.headers["authorization"]?.split(" ")[1]; // Obtendo o token do cabeçalho
        if (!painelAdminToken) {
            return res
                .status(401)
                .json({
                    error: "Token de administrador não encontrado. Faça login novamente.",
                });
        }

        const urlempresa = await getEmpresaUrl(req); // Usando a função para obter o urlempresa
        if (!urlempresa) {
            return res
                .status(400)
                .json({ error: "URL da empresa não fornecida." });
        }
        const { codFuncionario } = req.params;
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetHorarioFuncionario/${codFuncionario}`; // A URL completa da API
        console.log("Enviando solicitação para a URL:", apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`, // Envia o token para a autenticação
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        if (response.status === 200) {
            const pedidos = response.data; // Obter os pedidos da resposta
            if (!pedidos || pedidos.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Nenhum horário encontrado." });
            }

            return res.status(200).json(pedidos); // Retorna os pedidos encontrados
        } else {
            return res
                .status(400)
                .json({
                    error: "Falha ao listar horários.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar horários:", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao listar horários",
                details: error.message,
            });
    }
});

router.post("/InserirFalta", async (req, res) => {
    try {
        const dados = req.body;
        // Obter o token de autenticação do cabeçalho
        const painelAdminToken = req.headers["authorization"]?.split(" ")[1];
        if (!painelAdminToken) {
            return res
                .status(401)
                .json({ error: "Token não encontrado. Faça login novamente." });
        }

        // Obter a URL da empresa do cabeçalho usando a função getEmpresaUrl
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res
                .status(400)
                .json({ error: "URL da empresa não fornecida." });
        }

        // Extraindo os parâmetros do corpo da requisição
        const { Id, Responsavel, Titulo } = req.body;

        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/InserirFalta`;

        console.log("Enviando solicitação para a URL:", apiUrl);

        const requestData = {
           Funcionario, Data, Falta, Horas, Tempo, DescontaVenc, DescontaRem,
ExcluiProc, ExcluiEstat, Observacoes, CalculoFalta, DescontaSubsAlim,
DataProc, NumPeriodoProcessado, JaProcessado, InseridoBloco,
ValorDescontado, AnoProcessado, NumProc, Origem, PlanoCurso,
IdGDOC, CambioMBase, CambioMAlt, CotizaPeloMinimo, Acerto,
MotivoAcerto, NumLinhaDespesa, NumRelatorioDespesa,
FuncComplementosBaixaId, DescontaSubsTurno, SubTurnoProporcional, SubAlimProporcional
        };

        console.log("Dados a serem enviados:", requestData);

        const response = await axios.post(apiUrl, requestData, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
        if (response.status === 200) {
            return res.status(200).json({
                mensagem: "Falta inserida com sucesso.",
                detalhes: response.data,
            });
        } else {
            return res.status(response.status).json({
                error: "Falha ao inserir falta.",
                details: response.data,
            });
        }
    } catch (error) {
        console.error(
            "Erro ao Inserir Falta:",
            error.response ? error.response.data : error.message,
        );
        return res.status(500).json({
            error: "Erro inesperado ao Inserir Falta.",
            details: error.message,
        });
    }
});


module.exports = router;