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


router.get("/GetListaFaltasFuncionariosMensal", async (req, res) => {
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
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetListaFaltasFuncionariosMensal`; // A URL completa da API
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

router.get("/GetListaTipoHorasExtras", async (req, res) => {
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
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetListaTipoHorasExtras/`; // A URL completa da API
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
                    .json({ error: "Nenhum tipo de horas extras encontrada." });
            }

            return res.status(200).json(pedidos); // Retorna os pedidos encontrados
        } else {
            return res
                .status(400)
                .json({
                    error: "Falha ao listar tipos de horas extras.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar horas extras:", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao listar horas extras",
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

router.get("/GetNomeFuncionario/:codFuncionario", async (req, res) => {
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
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetNomeFuncionario/${codFuncionario}`; // A URL completa da API
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
                    .json({ error: "Nome funcionário encontrado." });
            }

            return res.status(200).json(pedidos); // Retorna os pedidos encontrados
        } else {
            return res
                .status(400)
                .json({
                    error: "Falha ao listar Nome funcionário.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar Nome funcionário", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao Nome funcionário",
                details: error.message,
            });
    }
});


router.get("/GetTotalizadorFeriasFuncionario/:codFuncionario", async (req, res) => {
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
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetTotalizadorFeriasFuncionario/${codFuncionario}`; // A URL completa da API
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
                    .json({ error: "Não foram encontrados os totalizadores das ferias do funcionario." });
            }

            return res.status(200).json(pedidos); // Retorna os pedidos encontrados
        } else {
            return res
                .status(400)
                .json({
                    error: "Falha ao listar os totalizadores das ferias do funcionario.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar os totalizadores das ferias do funcionario.:", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao listar os totalizadores das ferias do funcionario.",
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
        const {
            Funcionario, Data, Falta, Horas, Tempo,
            DescontaVenc, DescontaRem, ExcluiProc, ExcluiEstat,
            Observacoes, CalculoFalta, DescontaSubsAlim, DataProc,
            NumPeriodoProcessado, JaProcessado, InseridoBloco,
            ValorDescontado, AnoProcessado, NumProc, Origem,
            PlanoCurso, IdGDOC, CambioMBase, CambioMAlt, CotizaPeloMinimo,
            Acerto, MotivoAcerto, NumLinhaDespesa, NumRelatorioDespesa,
            FuncComplementosBaixaId, DescontaSubsTurno, SubTurnoProporcional,
            SubAlimProporcional
        } = req.body;


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

router.post("/InserirHoraExtra", async (req, res) => {
    try {
        // Token do painel
        const painelAdminToken = req.headers["authorization"]?.split(" ")[1];
        if (!painelAdminToken) {
            return res
                .status(401)
                .json({ error: "Token não encontrado. Faça login novamente." });
        }

        // URL da empresa
        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res
                .status(400)
                .json({ error: "URL da empresa não fornecida." });
        }

        // Extrair campos do corpo (hora extra)
        const {
            Funcionario,
            Data,            // aceita ISO string ou 'yyyy-MM-dd HH:mm:ss'
            HoraExtra,       // pode ser código/tipo ou numérico, consoante a tua BD
            Tempo,           // decimal (horas/minutos)
            Observacoes      // opcional
        } = req.body;

        if (!Funcionario || !Tempo || HoraExtra === undefined) {
            return res.status(400).json({
                error: "Campos obrigatórios em falta: Funcionario, HoraExtra, Tempo."
            });
        }

        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/InserirHoraExtra`;
        console.log("Enviando solicitação para a URL:", apiUrl);

        // Enviar apenas os necessários (o C# preenche 0/NULL nos restantes)
        const requestData = {
            Funcionario,
            Data,         // se vier null/undefined, o C# usa GETDATE()
            HoraExtra,
            Tempo,
            Observacoes
        };

        /*  // Se preferires enviar tudo “à la InserirFalta”, descomenta e ajusta:
        const requestData = {
            Funcionario, Data, HoraExtra, Tempo,
            ExcluiProc: 0,
            Observacoes,
            DataProc: null,
            NumPeriodoProcessado: 0,
            JaProcessado: 0,
            InseridoBloco: 0,
            AnoProcessado: 0,
            NumProc: 0,
            IdLinhaProc: 0,
            Origem: 0,
            MotivoAcerto: null,
            Fim: null,
            Inicio: null
        };
        */

        console.log("Dados a serem enviados:", requestData);

        const response = await axios.post(apiUrl, requestData, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                "Content-Type": "application/json",
                Accept: "application/json"
            }
        });

        if (response.status === 200) {
            return res.status(200).json({
                mensagem: "Hora extra inserida com sucesso.",
                detalhes: response.data
            });
        } else {
            return res.status(response.status).json({
                error: "Falha ao inserir hora extra.",
                details: response.data
            });
        }
    } catch (error) {
        console.error(
            "Erro ao Inserir Hora Extra:",
            error.response ? error.response.data : error.message
        );
        return res.status(500).json({
            error: "Erro inesperado ao Inserir Hora Extra.",
            details: error.message
        });
    }
});


router.post("/InserirFeriasFuncionario", async (req, res) => {
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

        // Construir o endpoint da WebAPI
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/InserirFeriasFuncionario`;
        console.log("Enviando solicitação para a URL:", apiUrl);

        const {
            Funcionario,
            DataFeria,
            EstadoGozo,
            OriginouFalta,
            TipoMarcacao,
            OriginouFaltaSubAlim,
            Duracao,
            Acerto,
            NumProc,
            Origem
        } = dados;

        const requestData = {
            Funcionario,
            DataFeria,
            EstadoGozo,
            OriginouFalta,
            TipoMarcacao,
            OriginouFaltaSubAlim,
            Duracao,
            Acerto,
            NumProc,
            Origem
        };

        console.log("Dados a serem enviados:", requestData);

        // Enviar para a WebAPI Primavera
        const response = await axios.post(apiUrl, requestData, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        if (response.status === 200) {
            return res.status(200).json({
                mensagem: "Férias inseridas com sucesso.",
                detalhes: response.data,
            });
        } else {
            return res.status(response.status).json({
                error: "Falha ao inserir férias.",
                details: response.data,
            });
        }
    } catch (error) {
        console.error(
            "Erro ao Inserir Férias:",
            error.response ? error.response.data : error.message
        );
        return res.status(500).json({
            error: "Erro inesperado ao Inserir Férias.",
            details: error.message,
        });
    }
});

// Novo editar Ferias Funcionario.
router.put("/EditarFeriasFuncionario", async (req, res) => {
    try {
        const dados = req.body;

        const painelAdminToken = req.headers["authorization"]?.split(" ")[1];
        if (!painelAdminToken) {
            return res.status(401).json({
                error: "Token não encontrado. Faça login novamente.",
            });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: "URL da empresa não fornecida." });
        }

        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/EditarFeriasFuncionario`;
        console.log("Enviando solicitação para a URL:", apiUrl);

        const {
            Funcionario,
            DataFeria,
            EstadoGozo,
            OriginouFalta,
            TipoMarcacao,
            OriginouFaltaSubAlim,
            Duracao,
            Acerto,
            NumProc,
            Origem
        } = dados;

        const requestData = {
            Funcionario,
            DataFeria,
            EstadoGozo,
            OriginouFalta,
            TipoMarcacao,
            OriginouFaltaSubAlim,
            Duracao,
            Acerto,
            NumProc,
            Origem
        };

        console.log("Dados a serem enviados (edição):", requestData);

        const response = await axios.put(apiUrl, requestData, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        if (response.status === 200) {
            return res.status(200).json({
                mensagem: "Férias atualizadas com sucesso.",
                detalhes: response.data,
            });
        } else {
            return res.status(response.status).json({
                error: "Falha ao editar férias.",
                details: response.data,
            });
        }
    } catch (error) {
        console.error(
            "Erro ao editar férias:",
            error.response ? error.response.data : error.message
        );
        return res.status(500).json({
            error: "Erro inesperado ao editar férias.",
            details: error.message,
        });
    }
});


router.delete("/EliminarFeriasFuncionario/:codFuncionario/:dataFeria", async (req, res) => {
    try {
        const painelAdminToken = req.headers["authorization"]?.split(" ")[1];
        if (!painelAdminToken) {
            return res.status(401).json({
                error: "Token não encontrado. Faça login novamente.",
            });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: "URL da empresa não fornecida." });
        }

        const { codFuncionario, dataFeria } = req.params;

        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/EliminarFeriasFuncionario/${codFuncionario}/${dataFeria}`;
        console.log("Enviando solicitação DELETE para:", apiUrl);

        const response = await axios.delete(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        return res.status(200).json({
            mensagem: "Férias eliminadas com sucesso.",
            detalhes: response.data,
        });

    } catch (error) {
        const status = error.response?.status;

        if (status === 404) {
            // Férias já estavam eliminadas
            console.warn("Férias já não existiam:", error.response?.data);
            return res.status(200).json({
                mensagem: "Férias já não existiam para esse dia.",
                detalhes: error.response.data,
            });
        }

        console.error(
            "Erro ao eliminar férias:",
            error.response ? error.response.data : error.message
        );
        return res.status(500).json({
            error: "Erro inesperado ao eliminar férias.",
            details: error.message,
        });
    }
});



router.delete("/EliminarFalta/:codFuncionario/:dataFalta/:tipoFalta", async (req, res) => {
    try {
        const painelAdminToken = req.headers["authorization"]?.split(" ")[1];
        if (!painelAdminToken) {
            return res.status(401).json({
                error: "Token não encontrado. Faça login novamente.",
            });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: "URL da empresa não fornecida." });
        }

        const { codFuncionario, dataFalta, tipoFalta } = req.params;

        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/EliminarFalta/${codFuncionario}/${dataFalta}/${tipoFalta}`;
        console.log("Enviando solicitação DELETE para:", apiUrl);

        const response = await axios.delete(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        return res.status(200).json({
            mensagem: "Falta eliminada com sucesso.",
            detalhes: response.data,
        });

    } catch (error) {
        const status = error.response?.status;

        if (status === 404) {
            return res.status(200).json({
                mensagem: "Falta já não existia, considerada eliminada.",
                detalhes: error.response.data,
            });
        }

        return res.status(500).json({
            error: "Erro inesperado ao eliminar falta.",
            details: error.message,
        });
    }
});




router.put("/EditarFalta", async (req, res) => {
    try {
        const dados = req.body;

        const painelAdminToken = req.headers["authorization"]?.split(" ")[1];
        if (!painelAdminToken) {
            return res
                .status(401)
                .json({ error: "Token não encontrado. Faça login novamente." });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res
                .status(400)
                .json({ error: "URL da empresa não fornecida." });
        }

        const {
            Funcionario, Data, Falta, Horas, Tempo,
            DescontaVenc, DescontaRem, ExcluiProc, ExcluiEstat,
            Observacoes, CalculoFalta, DescontaSubsAlim, DataProc,
            NumPeriodoProcessado, JaProcessado, InseridoBloco,
            ValorDescontado, AnoProcessado, NumProc, Origem,
            PlanoCurso, IdGDOC, CambioMBase, CambioMAlt, CotizaPeloMinimo,
            Acerto, MotivoAcerto, NumLinhaDespesa, NumRelatorioDespesa,
            FuncComplementosBaixaId, DescontaSubsTurno, SubTurnoProporcional,
            SubAlimProporcional
        } = req.body;

        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/EditarFalta`;

        const requestData = {
            Funcionario, Data, Falta, Horas, Tempo, DescontaVenc, DescontaRem,
            ExcluiProc, ExcluiEstat, Observacoes, CalculoFalta, DescontaSubsAlim,
            DataProc, NumPeriodoProcessado, JaProcessado, InseridoBloco,
            ValorDescontado, AnoProcessado, NumProc, Origem, PlanoCurso,
            IdGDOC, CambioMBase, CambioMAlt, CotizaPeloMinimo, Acerto,
            MotivoAcerto, NumLinhaDespesa, NumRelatorioDespesa,
            FuncComplementosBaixaId, DescontaSubsTurno, SubTurnoProporcional, SubAlimProporcional
        };

        console.log("Editando falta via:", apiUrl);
        console.log("Dados enviados:", requestData);

        const response = await axios.put(apiUrl, requestData, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        if (response.status === 200) {
            return res.status(200).json({
                mensagem: "Falta editada com sucesso.",
                detalhes: response.data,
            });
        } else {
            return res.status(response.status).json({
                error: "Falha ao editar falta.",
                details: response.data,
            });
        }
    } catch (error) {
        console.error(
            "Erro ao Editar Falta:",
            error.response ? error.response.data : error.message
        );
        return res.status(500).json({
            error: "Erro inesperado ao Editar Falta.",
            details: error.message,
        });
    }
});



router.get("/GetListaClasses", async (req, res) => {
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
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetListaClasses/`; // A URL completa da API
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
                    .json({ error: "Nenhum tipo de classe encontrada." });
            }

            return res.status(200).json(pedidos); // Retorna os pedidos encontrados
        } else {
            return res
                .status(400)
                .json({
                    error: "Falha ao listar tipos de classes.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar classes:", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao listar classes",
                details: error.message,
            });
    }
});


router.get("/GetListaEspecialidades", async (req, res) => {
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
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetListaEspecialidades/`; // A URL completa da API
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
                    error: "Falha ao listar tipos de especialidades.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar especialidades:", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao listar faltas",
                details: error.message,
            });
    }
});


router.get("/GetListaEquipamentos", async (req, res) => {
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
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetListaEquipamentos/`; // A URL completa da API
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
                    .json({ error: "Nenhum tipo de equipamento encontrada." });
            }

            return res.status(200).json(pedidos); // Retorna os pedidos encontrados
        } else {
            return res
                .status(400)
                .json({
                    error: "Falha ao listar tipos de equipamento.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar equipamento:", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao listar equipamento",
                details: error.message,
            });
    }
});


router.put('/InsertParteDiariaItem', async (req, res) => {
    try {
        const painelAdminToken = req.headers["authorization"]?.split(" ")[1]; // Obtendo o token do cabeçalho
        if (!painelAdminToken) {
            return res.status(401).json({
                error: "Token de administrador não encontrado. Faça login novamente.",
            });
        }

        const urlempresa = await getEmpresaUrl(req); // Usando a função para obter o urlempresa
        if (!urlempresa) {
            return res.status(400).json({ error: "URL da empresa não fornecida." });
        }

        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/InsertParteDiariaItem`;

        // DEBUG LOGS DETALHADOS
        console.log("🔁 Enviando PUT para Primavera:");
        console.log("🌐 URL:", apiUrl);
        console.log("📦 Body:", JSON.stringify(req.body, null, 2));
        console.log("🔎 Valor de HorasExtra:", req.body?.HorasExtra);

        console.log("🧾 Headers:", {
            Authorization: `Bearer ${painelAdminToken}`,
            "Content-Type": "application/json",
            Accept: "application/json"
        });

        const response = await axios.put(apiUrl, req.body, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        if (response.status === 200) {
            return res.status(200).json({
                mensagem: "Parte diária inserida com sucesso.",
                detalhes: response.data
            });
        } else {
            return res.status(response.status).json({
                error: "Falha ao inserir parte diária.",
                detalhes: response.data
            });
        }
    } catch (error) {
        console.log("📦 Body:", JSON.stringify(req.body, null, 2));
        console.error("❌ Erro ao inserir parte diária:", error.response?.data || error.message);
        return res.status(500).json({
            error: "Erro inesperado ao inserir parte diária.",
            detalhes: error.response?.data || error.message
        });
    }
});


router.get("/GetColaboradorId/:codFuncionario", async (req, res) => {
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
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetColaboradorId/${codFuncionario}`; // A URL completa da API
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
                    .json({ error: "Nenhum colaborador encontrado." });
            }

            return res.status(200).json(pedidos); // Retorna os pedidos encontrados
        } else {
            return res
                .status(400)
                .json({
                    error: "Falha ao listar colaborador.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar colaborador:", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao listar colaborador",
                details: error.message,
            });
    }
});

router.get("/GetObraId/:codObra", async (req, res) => {
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
        const { codObra } = req.params;
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/GetObraId/${codObra}`; // A URL completa da API
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
                    .json({ error: "Nenhum Obra encontrado." });
            }

            return res.status(200).json(pedidos); // Retorna os pedidos encontrados
        } else {
            return res
                .status(400)
                .json({
                    error: "Falha ao listar Obra.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar Obra:", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao listar Obra",
                details: error.message,
            });
    }
});



router.put("/InsertParteDiariaEquipamento", async (req, res) => {
    try {
        const painelAdminToken = req.headers["authorization"]?.split(" ")[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: "Token não encontrado. Faça login novamente." });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: "URL da empresa não fornecida." });
        }

        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/InsertParteDiariaEquipamento`;

        console.log("🔁 PUT Primavera (Equipamentos):", apiUrl);
        console.log("📦 Body:", JSON.stringify(req.body, null, 2));

        const response = await axios.put(apiUrl, req.body, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        if (response.status === 200) {
            return res.status(200).json({
                mensagem: "Parte diária de equipamentos inserida com sucesso.",
                detalhes: response.data,
            });
        } else {
            return res.status(response.status).json({
                error: "Falha ao inserir parte diária de equipamentos.",
                detalhes: response.data,
            });
        }
    } catch (error) {
        console.error("❌ Erro ao inserir parte diária de equipamentos:",
            error.response?.data || error.message
        );
        return res.status(500).json({
            error: "Erro inesperado ao inserir parte diária de equipamentos.",
            detalhes: error.response?.data || error.message,
        });
    }
});


router.get("/ValidaSubEmpId/:subEmpId", async (req, res) => {
    try {
        const painelAdminToken = req.headers["authorization"]?.split(" ")[1];
        if (!painelAdminToken) {
            return res.status(401).json({ error: "Token não encontrado. Faça login novamente." });
        }

        const urlempresa = await getEmpresaUrl(req);
        if (!urlempresa) {
            return res.status(400).json({ error: "URL da empresa não fornecida." });
        }

        const { subEmpId } = req.params;
        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/ValidaSubEmpId/${subEmpId}`;

        console.log("🔎 GET Primavera (ValidaSubEmpId):", apiUrl);

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${painelAdminToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        // Se a tua WebAPI não tiver este endpoint, podes trocar por um SELECT direto no teu backend.
        // Aqui devolvemos `exists: true/false`.
        return res.status(200).json(response.data);
    } catch (error) {
        // Se a tua WebAPI não expuser ValidaSubEmpId, devolve 501 para não confundir o frontend
        if (!error.response) {
            return res.status(501).json({
                error: "Validação remota de SubEmpId não suportada nesta instância.",
            });
        }
        return res.status(error.response.status || 500).json({
            error: "Erro ao validar SubEmpId.",
            detalhes: error.response?.data || error.message,
        });
    }
});

router.get('/feriados', async (req, res) => {
    try {
        const painelAdminToken = req.headers['authorization']?.split(' ')[1];  // Obtendo o token do cabeçalho
        if (!painelAdminToken) {
            return res.status(401).json({ error: 'Token de administrador não encontrado. Faça login novamente.' });
        }

        const urlempresa = await getEmpresaUrl(req);  // Usando a função para obter o urlempresa
        if (!urlempresa) {
            return res.status(400).json({ error: 'URL da empresa não fornecida.' });
        }

        const apiUrl = `http://${urlempresa}/WebApi/AlteracoesMensais/feriados`;  // A URL completa da API
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
                return res.status(404).json({ error: 'Nenhuma feriados encontrado.' });
            }

            return res.status(200).json(obras);  // Retorna os obras encontrados
        } else {
            return res.status(400).json({ error: 'Falha ao listar feriados.', details: response.data.ErrorMessage });
        }
    } catch (error) {
        console.error('Erro ao listar obras:', error.message);
        return res.status(500).json({ error: 'Erro inesperado ao listar feriados', details: error.message });
    }
});



module.exports = router;