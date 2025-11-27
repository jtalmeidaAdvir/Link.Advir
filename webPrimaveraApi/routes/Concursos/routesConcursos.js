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

async function enviarEmailAprovacao({ id, titulo, responsavel }) {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: "no.reply.advirplan@gmail.com",
            pass: "jkma hfwy bkxp dfzk",
        },
    });

    const dataAtual = new Date().toLocaleDateString('pt-PT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const info = await transporter.sendMail({
        from: "no.reply.advirplan@gmail.com",
        to: "pl@jpaconstrutora.com",
        subject: `✅ Concurso Aprovado - ${id}`,
        html: `
            <!DOCTYPE html>
            <html lang="pt">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Concurso Aprovado</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Concurso Aprovado</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Sistema de Gestão de Concursos - Advir</p>
                </div>

                <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
                    <div style="background: #f8f9ff; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 25px; border-radius: 0 5px 5px 0;">
                        <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 20px;">
                            🎉 Concurso aprovado com sucesso!
                        </h2>
                        <p style="margin: 0; color: #64748b;">
                            O concurso foi analisado e aprovado pela equipa responsável.
                        </p>
                    </div>

                    <h3 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">
                        📋 Detalhes do Concurso
                    </h3>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #374151; width: 30%;">
                                🏢 Código:
                            </td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1f2937;">
                                ${id}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #374151;">
                                📝 Título:
                            </td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1f2937;">
                                ${titulo}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #374151;">
                                👤 Aprovado por:
                            </td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1f2937;">
                                ${responsavel}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; font-weight: 600; color: #374151;">
                                📅 Data de Aprovação:
                            </td>
                            <td style="padding: 12px 0; color: #1f2937;">
                                ${dataAtual}
                            </td>
                        </tr>
                    </table>

                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
                        <p style="margin: 0; color: #92400e; font-weight: 500;">
                            ⚡ <strong>Próximos Passos:</strong> O concurso aprovado será agora processado pela equipa de propostas. 
                            Verifique o sistema para acompanhar o progresso.
                        </p>
                    </div>

                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; font-size: 14px; margin: 0;">
                            Este é um email automático do sistema de gestão de concursos da Advir.<br>
                            Para mais informações, contacte a administração.
                        </p>
                    </div>
                </div>

                <div style="background: #f8fafc; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
                    <p style="margin: 0; color: #64748b; font-size: 12px;">
                        © ${new Date().getFullYear()} Advir - Todos os direitos reservados
                    </p>
                </div>
            </body>
            </html>
        `,
    });

    console.log("E-mail enviado:", info.messageId);
}

// Rota para listar todos os pedidos de clientes

router.get("/testeEmail", async (req, res) => {
    try {
        await enviarEmailAprovacao({
            id: 123,
            titulo: "Concurso de Teste",
            responsavel: "Admin Teste",
        });
        res.send("Email enviado!");
    } catch (e) {
        res.status(500).send("Erro ao enviar email: " + e.message);
    }
});

router.get("/listarConcursos", async (req, res) => {
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

        const apiUrl = `http://${urlempresa}/WebApi/Concursos/GetListaConcursos`; // A URL completa da API
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
                    .json({ error: "Nenhum pedido encontrado." });
            }

            return res.status(200).json(pedidos); // Retorna os pedidos encontrados
        } else {
            return res
                .status(400)
                .json({
                    error: "Falha ao listar concursos.",
                    details: response.data.ErrorMessage,
                });
        }
    } catch (error) {
        console.error("Erro ao listar pedidos:", error.message);
        return res
            .status(500)
            .json({
                error: "Erro inesperado ao listar concursos",
                details: error.message,
            });
    }
});

router.post("/Aprovar", async (req, res) => {
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

        const apiUrl = `http://${urlempresa}/WebApi/Concursos/AtualizaEstadoAprovado`;

        console.log("Enviando solicitação para a URL:", apiUrl);

        const requestData = {
            Id,
            Responsavel
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
            // Enviar e-mail
            await enviarEmailAprovacao({
                id: Id,
                titulo: Titulo || "Sem Título",
                responsavel: Responsavel,
            });

            return res.status(200).json({
                mensagem: "Aprovado",
                detalhes: response.data,
            });
        } else {
            return res.status(response.status).json({
                error: "Falha ao Aprovar",
                details: response.data,
            });
        }
    } catch (error) {
        console.error(
            "Erro ao Aprovar:",
            error.response ? error.response.data : error.message,
        );
        return res.status(500).json({
            error: "Erro inesperado ao Aprovar.",
            details: error.message,
        });
    }
});

router.post("/Recusar", async (req, res) => {
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
        const { Id, Responsavel } = req.body;

        const apiUrl = `http://${urlempresa}/WebApi/Concursos/AtualizaEstadoRescusado`;

        console.log("Enviando solicitação para a URL:", apiUrl);

        const requestData = {
            Id,
            Responsavel,
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
            // Enviar o email após a intervenção ser criada com sucesso

            return res.status(200).json({
                mensagem: "Recusado",
                detalhes: response.data,
            });
        } else {
            return res.status(response.status).json({
                error: "Falha ao Recusar",
                details: response.data,
            });
        }
    } catch (error) {
        console.error(
            "Erro ao Recusar:",
            error.response ? error.response.data : error.message,
        );
        return res.status(500).json({
            error: "Erro inesperado ao Recusar.",
            details: error.message,
        });
    }
});

module.exports = router;