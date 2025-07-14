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


router.get("/GetListaFaltasFuncionario", async (req, res) => {
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

        const apiUrl = `http://${urlempresa}/WebApi/Faltas/GetListaFaltasFuncionario`; // A URL completa da API
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


module.exports = router;