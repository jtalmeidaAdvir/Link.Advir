const express = require("express");
const router = express.Router();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
//const { Schedule } = require('../models'); // Importar modelos de Schedule e Contact
let scheduleLogs = [];
const activeSchedules = new Map();
let client = null;
let isClientReady = false;
let qrCodeData = null;
let clientStatus = "disconnected";

// Importar o tokenService
const { getAuthToken } = require("../../webPrimaveraApi/servives/tokenService");
let isInitializing = false;
let isShuttingDown = false;
// Função para inicializar o cliente WhatsApp Web
const initializeWhatsAppWeb = async () => {
    if (client) {
        console.log("Cliente WhatsApp já existe, destruindo primeiro...");
        try {
            // Set a shorter timeout and handle ProtocolError specifically
            const destroyPromise = client.destroy();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Destroy timeout")), 3000),
            );

            await Promise.race([destroyPromise, timeoutPromise]);
        } catch (error) {
            console.log(
                "⚠️ Erro ao destruir cliente anterior (normal):",
                error.message,
            );

            // Handle specific Puppeteer errors
            if (
                error.message.includes("Target closed") ||
                error.message.includes("Protocol error") ||
                error.name === "ProtocolError"
            ) {
                console.log(
                    "🎯 Erro de protocolo detectado - fazendo limpeza silenciosa",
                );
            }

            // Force cleanup with additional safety checks
            try {
                if (
                    client &&
                    typeof client.pupPage !== "undefined" &&
                    client.pupPage &&
                    !client.pupPage.isClosed()
                ) {
                    await Promise.race([
                        client.pupPage.close(),
                        new Promise((_, reject) =>
                            setTimeout(
                                () => reject(new Error("Page close timeout")),
                                2000,
                            ),
                        ),
                    ]).catch(() => { });
                }
                if (
                    client &&
                    typeof client.pupBrowser !== "undefined" &&
                    client.pupBrowser &&
                    client.pupBrowser.isConnected()
                ) {
                    await Promise.race([
                        client.pupBrowser.close(),
                        new Promise((_, reject) =>
                            setTimeout(
                                () =>
                                    reject(new Error("Browser close timeout")),
                                2000,
                            ),
                        ),
                    ]).catch(() => { });
                }
            } catch (forceError) {
                console.log(
                    "⚠️ Erro na limpeza forçada (ignorado):",
                    forceError.message,
                );
            }
        }

        // Force set to null regardless of cleanup success
        client = null;
        isClientReady = false;
        clientStatus = "disconnected";
        qrCodeData = null;
    }
    // Configuração específica para produção/servidor
    const isProduction =
        process.env.NODE_ENV === "production" || process.env.REPLIT_DEV_DOMAIN;

    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: "./whatsapp-session",
        }),
        puppeteer: {
            headless: true,
            executablePath: isProduction
                ? "/usr/bin/chromium-browser"
                : undefined,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
                "--disable-gpu",
                "--disable-web-security",
                "--disable-features=VizDisplayCompositor",
                "--disable-extensions",
                "--disable-plugins",
                "--disable-default-apps",
                "--no-default-browser-check",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                ...(isProduction
                    ? [
                        "--disable-blink-features=AutomationControlled",
                        "--disable-software-rasterizer",
                        "--disable-background-networking",
                        "--disable-default-apps",
                        "--disable-sync",
                        "--metrics-recording-only",
                        "--no-first-run",
                        "--safebrowsing-disable-auto-update",
                        "--disable-crash-reporter",
                    ]
                    : []),
            ],
        },
    });
    client.on("qr", (qr) => {
        qrCodeData = qr;
        clientStatus = "qr_received";
        console.log("📱 QR Code recebido! Tamanho:", qr.length);
        console.log("📱 Primeiros 100 caracteres:", qr.substring(0, 100));
        qrcode.generate(qr, { small: true });
    });
    client.on("ready", () => {
        console.log("WhatsApp Web Cliente conectado!");
        isClientReady = true;
        clientStatus = "ready";
        qrCodeData = null;
        // Inicializar agendamentos ao estar pronto
        initializeSchedules();
    });

    // Adicionar listener para mensagens recebidas
    client.on("message", async (message) => {
        try {
            await handleIncomingMessage(message);
        } catch (error) {
            console.error("Erro ao processar mensagem recebida:", error);
        }
    });
    client.on("authenticated", () => {
        console.log("WhatsApp Web autenticado!");
        clientStatus = "authenticated";
    });
    client.on("disconnected", (reason) => {
        console.log("WhatsApp Web desconectado:", reason);
        isClientReady = false;
        clientStatus = "disconnected";
        // Reiniciar o cliente após a desconexão
        setTimeout(initializeWhatsAppWeb, 5000); // Reinicia após 5 segundos
    });
    client.initialize();
};
// Chamar a função de inicialização no início do script
(async () => {
    try {
        await initializeWhatsAppWeb();
    } catch (error) {
        console.error("Erro na inicialização inicial do WhatsApp:", error);
    }
})();
// Endpoint para ver conversas ativas
router.get("/conversations", (req, res) => {
    const conversations = [];

    for (const [phoneNumber, conversation] of activeConversations.entries()) {
        conversations.push({
            phoneNumber,
            state: conversation.state,
            data: conversation.data,
            lastActivity: new Date(conversation.lastActivity).toLocaleString(),
            minutesAgo: Math.floor(
                (Date.now() - conversation.lastActivity) / 60000,
            ),
        });
    }

    res.json({
        totalConversations: conversations.length,
        conversations,
    });
});

// Endpoint para cancelar uma conversa específica
router.delete("/conversations/:phoneNumber", (req, res) => {
    const phoneNumber = req.params.phoneNumber;

    if (activeConversations.has(phoneNumber)) {
        activeConversations.delete(phoneNumber);

        // Enviar mensagem de cancelamento
        client
            .sendMessage(
                phoneNumber,
                "❌ Sua sessão foi cancelada pelo administrador. Digite uma mensagem com 'pedido' ou 'assistência' para iniciar novamente.",
            )
            .catch((err) =>
                console.error("Erro ao enviar mensagem de cancelamento:", err),
            );

        res.json({ message: "Conversa cancelada com sucesso" });
    } else {
        res.status(404).json({ error: "Conversa não encontrada" });
    }
});

router.get("/agendamentos/logs", (req, res) => {
    const result = {
        logs: scheduleLogs,
        ativo: activeSchedules.size > 0 ? "Sim" : "Não",
        totalAgendamentos: scheduleLogs.length,
    };
    res.json(result);
});
// Endpoint para inicializar/obter status
router.get("/status", (req, res) => {
    const response = {
        status: clientStatus,
        isReady: isClientReady,
        qrCode: qrCodeData,
        hasQrCode: !!qrCodeData,
        timestamp: new Date().toISOString(),
        clientExists: !!client,
        qrCodeLength: qrCodeData ? qrCodeData.length : 0,
    };

    console.log("📊 Status solicitado:", {
        status: clientStatus,
        hasQrCode: !!qrCodeData,
        qrLength: qrCodeData ? qrCodeData.length : 0,
    });

    res.json(response);
});

// Endpoint para iniciar conexão
router.post("/connect", async (req, res) => {
    try {
        if (!client) {
            await initializeWhatsAppWeb();
            res.json({
                message: "Iniciando conexão WhatsApp Web...",
                status: clientStatus,
            });
        } else {
            res.json({
                message: "Cliente já iniciado",
                status: clientStatus,
                isReady: isClientReady,
            });
        }
    } catch (error) {
        console.error("Erro ao iniciar WhatsApp Web:", error);
        res.status(500).json({
            error: "Erro ao iniciar WhatsApp Web: " + error.message,
        });
    }
});

// Endpoint para desconectar
router.post("/disconnect", async (req, res) => {
    try {
        if (client) {
            try {
                // Shorter timeout for disconnect
                const destroyPromise = client.destroy();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(
                        () => reject(new Error("Destroy timeout")),
                        5000,
                    ),
                );

                await Promise.race([destroyPromise, timeoutPromise]);
            } catch (destroyError) {
                console.error(
                    "⚠️ Erro ao destruir cliente:",
                    destroyError.message,
                );

                // Handle ProtocolError gracefully
                if (
                    destroyError.message.includes("Target closed") ||
                    destroyError.message.includes("Protocol error") ||
                    destroyError.name === "ProtocolError"
                ) {
                    console.log(
                        "🎯 ProtocolError detectado - cliente já desconectado",
                    );
                } else {
                    // Force cleanup only for other errors
                    try {
                        if (
                            client &&
                            typeof client.pupPage !== "undefined" &&
                            client.pupPage &&
                            !client.pupPage.isClosed()
                        ) {
                            await Promise.race([
                                client.pupPage.close(),
                                new Promise((_, reject) =>
                                    setTimeout(
                                        () => reject(new Error("Timeout")),
                                        1000,
                                    ),
                                ),
                            ]).catch(() => { });
                        }
                        if (
                            client &&
                            typeof client.pupBrowser !== "undefined" &&
                            client.pupBrowser &&
                            client.pupBrowser.isConnected()
                        ) {
                            await Promise.race([
                                client.pupBrowser.close(),
                                new Promise((_, reject) =>
                                    setTimeout(
                                        () => reject(new Error("Timeout")),
                                        1000,
                                    ),
                                ),
                            ]).catch(() => { });
                        }
                    } catch (forceError) {
                        console.log(
                            "⚠️ Erro na limpeza forçada (ignorado):",
                            forceError.message,
                        );
                    }
                }
            }

            // Always reset regardless of errors
            client = null;
            isClientReady = false;
            clientStatus = "disconnected";
            qrCodeData = null;
        }
        res.json({ message: "WhatsApp Web desconectado com sucesso" });
    } catch (error) {
        console.error("Erro ao desconectar:", error);
        // Force reset variables even on error
        client = null;
        isClientReady = false;
        clientStatus = "disconnected";
        qrCodeData = null;
        res.status(500).json({ error: "Erro ao desconectar WhatsApp Web" });
    }
});

// Endpoint para limpar sessão completamente (para trocar de conta)
router.post("/clear-session", async (req, res) => {
    try {
        console.log("🧹 Iniciando limpeza de sessão WhatsApp...");

        // Primeiro desconectar se estiver conectado
        if (client) {
            try {
                // Use shorter timeout for clear-session
                const destroyPromise = client.destroy();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(
                        () => reject(new Error("Destroy timeout")),
                        3000,
                    ),
                );

                await Promise.race([destroyPromise, timeoutPromise]);
                console.log("✅ Cliente WhatsApp desconectado");
            } catch (destroyError) {
                console.error(
                    "⚠️ Erro ao destruir cliente (pode ser normal):",
                    destroyError.message,
                );

                // Check for specific Puppeteer errors including WaitTask and evaluateHandle errors
                if (
                    destroyError.message.includes("Target closed") ||
                    destroyError.message.includes("Protocol error") ||
                    destroyError.message.includes("WaitTask") ||
                    destroyError.message.includes("evaluateHandle") ||
                    destroyError.name === "ProtocolError"
                ) {
                    console.log(
                        "🎯 Erro de protocolo/WaitTask - cliente já estava desconectado",
                    );
                } else {
                    // Only try force cleanup for non-protocol errors
                    try {
                        if (
                            client &&
                            typeof client.pupPage !== "undefined" &&
                            client.pupPage &&
                            !client.pupPage.isClosed()
                        ) {
                            await Promise.race([
                                client.pupPage.close(),
                                new Promise((_, reject) =>
                                    setTimeout(
                                        () =>
                                            reject(
                                                new Error("Page close timeout"),
                                            ),
                                        1000,
                                    ),
                                ),
                            ]).catch(() => { });
                        }
                        if (
                            client &&
                            typeof client.pupBrowser !== "undefined" &&
                            client.pupBrowser &&
                            client.pupBrowser.isConnected()
                        ) {
                            await Promise.race([
                                client.pupBrowser.close(),
                                new Promise((_, reject) =>
                                    setTimeout(
                                        () =>
                                            reject(
                                                new Error(
                                                    "Browser close timeout",
                                                ),
                                            ),
                                        1000,
                                    ),
                                ),
                            ]).catch(() => { });
                        }
                    } catch (forceError) {
                        console.log(
                            "⚠️ Erro na limpeza forçada (ignorado):",
                            forceError.message,
                        );
                    }
                }
            }

            // Always reset state
            client = null;
            isClientReady = false;
            clientStatus = "disconnected";
            qrCodeData = null;
        }

        // Limpar dados da sessão
        const fs = require("fs");
        const path = require("path");

        const sessionPath = path.join(process.cwd(), "whatsapp-session");
        console.log("📁 Caminho da sessão:", sessionPath);

        let sessionCleared = false;

        // Tentar remover diretório da sessão se existir
        if (fs.existsSync(sessionPath)) {
            try {
                // Método mais compatível para remover recursivamente
                const rimraf = (dirPath) => {
                    try {
                        const files = fs.readdirSync(dirPath);
                        for (const file of files) {
                            const fullPath = path.join(dirPath, file);
                            const stat = fs.statSync(fullPath);
                            if (stat.isDirectory()) {
                                rimraf(fullPath);
                            } else {
                                try {
                                    fs.unlinkSync(fullPath);
                                } catch (unlinkError) {
                                    console.warn(
                                        `⚠️ Não foi possível remover arquivo ${fullPath}:`,
                                        unlinkError.message,
                                    );
                                }
                            }
                        }
                        fs.rmdirSync(dirPath);
                    } catch (rmdirError) {
                        console.warn(
                            `⚠️ Erro ao remover diretório ${dirPath}:`,
                            rmdirError.message,
                        );
                    }
                };

                rimraf(sessionPath);
                sessionCleared = true;
                console.log("✅ Sessão WhatsApp limpa com sucesso");
            } catch (removeError) {
                console.error(
                    "❌ Erro ao remover sessão com método personalizado:",
                    removeError,
                );

                // Tentar com fs.rmSync como fallback
                try {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                    sessionCleared = true;
                    console.log(
                        "✅ Sessão WhatsApp limpa com sucesso (fallback)",
                    );
                } catch (rmSyncError) {
                    console.error("❌ Erro com fs.rmSync:", rmSyncError);
                    sessionCleared = false;
                }
            }
        } else {
            console.log("ℹ️ Diretório de sessão não existe");
            sessionCleared = true;
        }

        // Resetar variáveis globais independentemente
        client = null;
        isClientReady = false;
        clientStatus = "disconnected";
        qrCodeData = null;

        console.log("🎯 Estado final - Cliente limpo, status resetado");

        res.json({
            message: sessionCleared
                ? "Sessão limpa com sucesso. Pode agora conectar com uma nova conta."
                : "Cliente resetado. Pode tentar conectar novamente.",
            sessionCleared,
            clientReset: true,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("❌ Erro crítico ao limpar sessão:", error);

        // Mesmo com erro, tentar resetar as variáveis
        try {
            if (client) {
                await client.destroy().catch(() => { });
            }
        } catch (finalError) {
            console.error("Erro final:", finalError);
        }

        client = null;
        isClientReady = false;
        clientStatus = "disconnected";
        qrCodeData = null;

        res.status(500).json({
            error: "Erro ao limpar sessão WhatsApp",
            details: error.message,
            clientReset: true,
            timestamp: new Date().toISOString(),
        });
    }
});

// Endpoint para enviar mensagem
router.post("/send", async (req, res) => {
    try {
        if (!isClientReady || !client) {
            return res.status(400).json({
                error: "WhatsApp Web não está conectado. Conecte primeiro!",
            });
        }

        const { to, message, priority = "normal" } = req.body;

        if (!to || !message) {
            return res.status(400).json({
                error: "Número de destino e mensagem são obrigatórios",
            });
        }

        // Formatação da mensagem baseada na prioridade
        let formattedMessage = message;
        if (priority === "urgent") {
            formattedMessage = `🚨 *URGENTE*\n${message}`;
        } else if (priority === "info") {
            formattedMessage = `ℹ️ *Info*\n${message}`;
        } else if (priority === "warning") {
            formattedMessage = `⚠️ *Aviso*\n${message}`;
        }

        // Formatação do número (adicionar @c.us se necessário)
        let phoneNumber = to.replace(/\D/g, ""); // Remove caracteres não numéricos
        if (!phoneNumber.includes("@")) {
            phoneNumber = phoneNumber + "@c.us";
        }

        // Verificar se o número é válido
        const isValidNumber = await client.isRegisteredUser(phoneNumber);
        if (!isValidNumber) {
            return res.status(400).json({
                error: "Número não está registrado no WhatsApp",
            });
        }

        // Enviar mensagem
        const response = await client.sendMessage(
            phoneNumber,
            formattedMessage,
        );

        res.json({
            message: "Mensagem enviada com sucesso!",
            messageId: response.id._serialized,
            to: phoneNumber,
        });
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        res.status(500).json({
            error: "Erro ao enviar mensagem",
            details: error.message,
        });
    }
});

// Endpoint para enviar mensagens em lote
router.post("/send-batch", async (req, res) => {
    try {
        if (!isClientReady || !client) {
            return res.status(400).json({
                error: "WhatsApp Web não está conectado",
            });
        }

        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: "Lista de mensagens é obrigatória",
            });
        }

        const results = [];

        for (const msg of messages) {
            try {
                let phoneNumber = msg.to.replace(/\D/g, "");
                if (!phoneNumber.includes("@")) {
                    phoneNumber = phoneNumber + "@c.us";
                }

                const isValidNumber =
                    await client.isRegisteredUser(phoneNumber);
                if (!isValidNumber) {
                    results.push({
                        success: false,
                        to: msg.to,
                        message: msg.text,
                        error: "Número não registrado no WhatsApp",
                    });
                    continue;
                }

                const response = await client.sendMessage(
                    phoneNumber,
                    msg.text,
                );
                results.push({
                    success: true,
                    to: msg.to,
                    message: msg.text,
                    messageId: response.id._serialized,
                });

                // Pausa entre mensagens
                await new Promise((resolve) => setTimeout(resolve, 2000));
            } catch (error) {
                results.push({
                    success: false,
                    to: msg.to,
                    message: msg.text,
                    error: error.message,
                });
            }
        }

        res.json({ message: "Lote processado", results });
    } catch (error) {
        console.error("Erro ao processar lote:", error);
        res.status(500).json({ error: "Erro ao processar lote de mensagens" });
    }
});

// Endpoint para obter informações do usuário conectado
router.get("/me", async (req, res) => {
    try {
        if (!isClientReady || !client) {
            return res.status(400).json({
                error: "WhatsApp Web não está conectado",
            });
        }

        const info = client.info;

        // Formatar o número para exibição mais amigável
        let formattedNumber = info.wid._serialized;
        if (formattedNumber.includes("@")) {
            formattedNumber = formattedNumber.split("@")[0];
        }

        // Adicionar formatação com código de país se possível
        if (formattedNumber.length > 10) {
            const countryCode = formattedNumber.substring(
                0,
                formattedNumber.length - 9,
            );
            const phoneNumber = formattedNumber.substring(
                formattedNumber.length - 9,
            );
            formattedNumber = `+${countryCode} ${phoneNumber}`;
        }

        res.json({
            wid: info.wid._serialized,
            pushname: info.pushname || "Utilizador WhatsApp",
            me: info.me._serialized,
            formattedNumber: formattedNumber,
            isReady: isClientReady,
            connectionTime: new Date().toISOString(),
            platform: info.platform || "WhatsApp Web",
        });
    } catch (error) {
        console.error("Erro ao obter informações:", error);
        res.status(500).json({ error: "Erro ao obter informações do usuário" });
    }
});

// Endpoint para obter QR Code atual
router.get("/qr", (req, res) => {
    if (qrCodeData) {
        res.json({ qrCode: qrCodeData, status: clientStatus });
    } else {
        res.json({
            qrCode: null,
            status: clientStatus,
            message:
                clientStatus === "ready"
                    ? "Já conectado"
                    : "QR Code não disponível",
        });
    }
});

// Sistema de armazenamento em base de dados para agendamentos
const { sequelize } = require("../config/db");
const { Op } = require("sequelize");
const Contact = require("../models/contact");
const Schedule = require("../models/schedule");

// Endpoint para criar lista de contactos
router.post("/contact-lists", async (req, res) => {
    try {
        const { name, contacts } = req.body;

        if (!name || !contacts || contacts.length === 0) {
            return res.status(400).json({
                error: "Nome e lista de contactos são obrigatórios",
            });
        }

        const newContactList = await Contact.create({
            name,
            contacts: JSON.stringify(contacts),
        });

        res.json({
            message: "Lista de contactos criada com sucesso",
            contactList: {
                id: newContactList.id,
                name: newContactList.name,
                contacts: JSON.parse(newContactList.contacts),
                createdAt: newContactList.created_at,
            },
        });
    } catch (error) {
        console.error("Erro ao criar lista de contactos:", error);
        res.status(500).json({ error: "Erro ao criar lista de contactos" });
    }
});

// Endpoint para obter listas de contactos
router.get("/contacts", async (req, res) => {
    try {
        // Verificar se a tabela existe, se não, tentar criar
        try {
            await Contact.sync({ force: false });
        } catch (syncError) {
            console.error("Erro ao sincronizar tabela contacts:", syncError);
            return res.status(500).json({
                message:
                    "Tabela contacts não existe. Use /api/init-whatsapp-tables para criar.",
            });
        }

        const contacts = await Contact.findAll({
            order: [["created_at", "DESC"]],
        });

        const formattedContacts = contacts.map((contact) => ({
            id: contact.id,
            name: contact.name,
            contacts: JSON.parse(contact.contacts),
            createdAt: contact.created_at,
        }));

        res.json(formattedContacts);
    } catch (error) {
        console.error("Erro ao carregar listas de contactos:", error);
        res.status(500).json({
            message: "Erro ao carregar listas de contactos",
            error: error.message,
        });
    }
});

// Endpoint para atualizar lista de contactos
router.put("/contact-lists/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contacts } = req.body;

        if (!name || !contacts || contacts.length === 0) {
            return res.status(400).json({
                error: "Nome e lista de contactos são obrigatórios",
            });
        }

        const [updated] = await Contact.update(
            {
                name,
                contacts: JSON.stringify(contacts),
            },
            {
                where: { id },
            },
        );

        if (updated) {
            const updatedContactList = await Contact.findByPk(id);
            res.json({
                message: "Lista de contactos atualizada com sucesso",
                contactList: {
                    id: updatedContactList.id,
                    name: updatedContactList.name,
                    contacts: JSON.parse(updatedContactList.contacts),
                    createdAt: updatedContactList.created_at,
                },
            });
        } else {
            res.status(404).json({ error: "Lista não encontrada" });
        }
    } catch (error) {
        console.error("Erro ao atualizar lista:", error);
        res.status(500).json({ error: "Erro ao atualizar lista de contactos" });
    }
});

// Endpoint para eliminar lista de contactos
router.delete("/contact-lists/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Contact.destroy({
            where: { id },
        });

        if (deleted) {
            res.json({ message: "Lista de contactos eliminada com sucesso" });
        } else {
            res.status(404).json({ error: "Lista não encontrada" });
        }
    } catch (error) {
        console.error("Erro ao eliminar lista:", error);
        res.status(500).json({ error: "Erro ao eliminar lista de contactos" });
    }
});
let scheduledMessages = [];
// Helpers de normalização
const normUpper = (v) => (v ?? "").toString().trim().toUpperCase();
const mapPrioridade = (v) => {
    const x = normUpper(v);
    // Ajusta aqui se a tua API exigir códigos específicos
    const allow = new Set(["BAIXA", "NORMAL", "ALTA", "URGENTE"]);
    return allow.has(x) ? x : "NORMAL";
};
const mapEstado = (v) => {
    // Ajusta se a API exigir códigos (ex.: ABERTO, EM_PROGRESSO, FECHADO, etc.)
    return normUpper(v);
};

// fetch seguro que tenta JSON mas guarda raw body para debug
async function fetchWithDebug(url, options = {}) {
    const res = await fetch(url, options);
    const raw = await res.text().catch(() => "");
    let data;
    try {
        data = raw ? JSON.parse(raw) : null;
    } catch {
        data = raw;
    }
    return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        data,
        raw,
    };
}

// Sistema de gestão de conversas para criação de pedidos
const activeConversations = new Map();

// Estados possíveis da conversa
const CONVERSATION_STATES = {
    INITIAL: "initial",
    WAITING_CLIENT: "waiting_client",
    WAITING_PROBLEM: "waiting_problem",
    WAITING_REPRODUCE: "waiting_reproduce",
    WAITING_PRIORITY: "waiting_priority",
    WAITING_STATE: "waiting_state",
    WAITING_CONFIRMATION: "waiting_confirmation",
};

// Função para lidar com mensagens recebidas
async function handleIncomingMessage(message) {
    // Ignorar mensagens de grupos e mensagens enviadas por nós
    if (message.from.includes("@g.us") || message.fromMe) {
        return;
    }

    const phoneNumber = message.from;
    const messageText = message.body.trim();

    console.log(`📥 Mensagem recebida de ${phoneNumber}: ${messageText}`);

    // Verificar se existe uma conversa ativa
    let conversation = activeConversations.get(phoneNumber);

    // Se não existe conversa e a mensagem contém palavras-chave para iniciar pedido
    if (!conversation && isRequestKeyword(messageText)) {
        await startNewRequest(phoneNumber, messageText);
        return;
    }

    // Se existe conversa ativa, continuar o fluxo
    if (conversation) {
        await continueConversation(phoneNumber, messageText, conversation);
        return;
    }

    // Mensagem não relacionada com pedidos - resposta padrão
    await sendWelcomeMessage(phoneNumber);
}

// Verificar se a mensagem contém palavras-chave para iniciar um pedido
function isRequestKeyword(message) {
    const keywords = [
        "pedido",
        "assistencia",
        "assistência",
        "problema",
        "erro",
        "bug",
        "help",
        "ajuda",
        "suporte",
        "novo pedido",
        "criar pedido",
    ];

    const lowerMessage = message.toLowerCase();
    return keywords.some((keyword) => lowerMessage.includes(keyword));
}

// Iniciar novo pedido de assistência
async function startNewRequest(phoneNumber, initialMessage) {
    const conversation = {
        state: CONVERSATION_STATES.WAITING_CLIENT,
        data: {
            initialProblem: initialMessage,
            datahoraabertura: new Date()
                .toISOString()
                .replace("T", " ")
                .slice(0, 19),
        },
        lastActivity: Date.now(),
    };

    activeConversations.set(phoneNumber, conversation);

    const welcomeMessage = `🤖 *Sistema de Pedidos de Assistência Técnica*

Bem-vindo ao sistema automático de criação de pedidos de assistência técnica da Advir.

Para iniciarmos o processo de registo do seu pedido, necessitamos das seguintes informações:

 *1. Código do Cliente*
 Indique o código do cliente para podermos proceder com o registo.

💡 _Pode digitar "cancelar" a qualquer momento para interromper o processo_`;

    await client.sendMessage(phoneNumber, welcomeMessage);
}

// Continuar a conversa baseado no estado atual
async function continueConversation(phoneNumber, message, conversation) {
    if (message.toLowerCase() === "cancelar") {
        activeConversations.delete(phoneNumber);
        await client.sendMessage(
            phoneNumber,
            "❌ Processo cancelado com sucesso. Para iniciar um novo pedido de assistência técnica, envie uma mensagem contendo 'pedido' ou 'assistência'.",
        );
        return;
    }

    switch (conversation.state) {
        case CONVERSATION_STATES.WAITING_CLIENT:
            await handleClientInput(phoneNumber, message, conversation);
            break;
      /*  case CONVERSATION_STATES.WAITING_CONTACT:
            await handleContactInput(phoneNumber, message, conversation);
            break;*/
        case CONVERSATION_STATES.WAITING_PROBLEM:
            await handleProblemInput(phoneNumber, message, conversation);
            break;
        case CONVERSATION_STATES.WAITING_PRIORITY:
            await handlePriorityInput(phoneNumber, message, conversation);
            break;
        case CONVERSATION_STATES.WAITING_CONFIRMATION:
            await handleConfirmationInput(phoneNumber, message, conversation);
            break;
    }

    conversation.lastActivity = Date.now();
    activeConversations.set(phoneNumber, conversation);
}

// Handler para input do cliente
async function handleClientInput(phoneNumber, message, conversation) {
 /*   conversation.data.cliente = message.trim();
    conversation.state = CONVERSATION_STATES.WAITING_CONTACT;

    const response = `✅ Cliente registado: ${message}

*2. Contacto (opcional)*
Por favor, indique um contacto do cliente ou digite "pular" para avançar para a próxima etapa:`;

    await client.sendMessage(phoneNumber, response);*/
      conversation.data.cliente = message.trim();
      conversation.data.contacto = null; // por defeito
      conversation.state = CONVERSATION_STATES.WAITING_PROBLEM;
    
      const response = `✅ Cliente registado: ${message}

*2. Descrição do Problema*
Por favor, descreva detalhadamente o problema ou situação que necessita de assistência técnica:`;
    
          await client.sendMessage(phoneNumber, response);





}

// Handler para input do contacto
async function handleContactInput(phoneNumber, message, conversation) {
    if (message.toLowerCase() !== "pular") {
        conversation.data.contacto = message.trim();
    }
    conversation.state = CONVERSATION_STATES.WAITING_PROBLEM;

    const response = `*3. Descrição do Problema*
Por favor, descreva detalhadamente o problema ou situação que necessita de assistência técnica:`;

    await client.sendMessage(phoneNumber, response);
}

// Handler para input do problema
async function handleProblemInput(phoneNumber, message, conversation) {
    conversation.data.problema = message.trim();

    // Definir valores por defeito
    conversation.data.tecnico = "000";
    conversation.data.origem = "TEL";
    conversation.data.objeto = "ASS\\SUP";
    conversation.data.secao = "SD";
    conversation.data.tipoProcesso = "PASI";

    conversation.state = CONVERSATION_STATES.WAITING_PRIORITY;

    const response = `✅ Descrição do problema registada com sucesso.

*4. Prioridade do Pedido*
Por favor, seleccione a prioridade do seu pedido:
• BAIXA (1) - Não urgente
• MÉDIA (2) - Prioridade normal
• ALTA (3) - Requer atenção prioritária

Digite a opção pretendida:`;

    await client.sendMessage(phoneNumber, response);
}

// Handler para input de como reproduzir - REMOVIDO, agora vai direto para confirmação
async function handleReproduceInput(phoneNumber, message, conversation) {
    if (message.toLowerCase() !== "pular") {
        conversation.data.comoReproduzir = message.trim();
    }

    // Definir valores por defeito
    conversation.data.tecnico = "000";
    conversation.data.origem = "TEL";
    conversation.data.objeto = "ASS\\SUP";
    conversation.data.secao = "SD";
    conversation.data.tipoProcesso = "PASI";

    conversation.state = CONVERSATION_STATES.WAITING_PRIORITY;

    const response = `*4. Prioridade*
Escolha uma das opções:
• BAIXA (1)
• MÉDIA (2) 
• ALTA (3)

Digite sua escolha:`;

    await client.sendMessage(phoneNumber, response);
}

// Handler para input da prioridade - Agora vai direto para confirmação
async function handlePriorityInput(phoneNumber, message, conversation) {
    const prioridadeTexto = message.trim().toUpperCase();

    // Mapear texto para número
    let prioridadeNumero;
    switch (prioridadeTexto) {
        case 'BAIXA':
        case 'BAIXO':
        case '1':
            prioridadeNumero = '1';
            break;
        case 'MÉDIA':
        case 'MEDIA':
        case 'NORMAL':
        case '2':
            prioridadeNumero = '2';
            break;
        case 'ALTA':
        case 'ALTO':
        case 'URGENTE':
        case '3':
            prioridadeNumero = '3';
            break;
        default:
            prioridadeNumero = '2'; // Padrão: Média
            break;
    }

    conversation.data.prioridade = prioridadeNumero;

    // Definir valores predefinidos
    conversation.data.estado = 2; // Predefinido como "Em curso equipa Advir"
    conversation.data.comoReproduzir = ""; // Predefinido como vazio

    conversation.state = CONVERSATION_STATES.WAITING_CONFIRMATION;

    const prioridadeDescricao = prioridadeNumero === '1' ? 'Baixa' :
        prioridadeNumero === '2' ? 'Média' : 'Alta';

    const summary = `📋 *RESUMO DO PEDIDO DE ASSISTÊNCIA TÉCNICA*

**Cliente:** ${conversation.data.cliente}
${conversation.data.contacto ? `**Contacto:** ${conversation.data.contacto}\n` : ""}**Prioridade:** ${prioridadeDescricao}

**Descrição:**
${conversation.data.problema}

*Por favor, confirme a criação deste pedido de assistência técnica.*
Digite "SIM" para confirmar ou "NÃO" para cancelar:`;

    await client.sendMessage(phoneNumber, summary);
}

// Handler para input do estado - REMOVIDO, não é mais usado
async function handleStateInput(phoneNumber, message, conversation) {
    // Esta função não é mais usada pois o estado fica predefinido como 2
}

// Handler para confirmação
async function handleConfirmationInput(phoneNumber, message, conversation) {
    const response = message.toLowerCase();

    if (response === "sim" || response === "s") {
        await createAssistanceRequest(phoneNumber, conversation);
    } else {
        activeConversations.delete(phoneNumber);
        await client.sendMessage(
            phoneNumber,
            "❌ Pedido cancelado com sucesso. Para iniciar um novo pedido de assistência, envie uma mensagem contendo 'pedido' ou 'assistência'.",
        );
    }
}

// Criar o pedido de assistência via API e responder ao utilizador no WhatsApp
async function createAssistenceRequest(phoneNumber, conversation) {
    let sent = false;
    let pedidoID = 'N/A';
    let payload = null;

    try {
        console.log("🔑 Obtendo token de autenticação...");
        const urlempresa = "151.80.149.159:2018";

        const token = await getAuthToken(
            {
                username: "AdvirWeb",
                password: "Advir2506##",
                company: "Advir",
                instance: "DEFAULT",
                line: "Evolution",
            },
            urlempresa
        );

        console.log("✅ Token obtido com sucesso");

        // Datas default (iguais ao teu RegistoAssistencia.js)
        const dataAtual = new Date();
        const dataFimPrevista = new Date();
        dataFimPrevista.setDate(dataAtual.getDate() + 30);

        const dadosConversacao = conversation?.data || {};
        payload = {
            cliente: dadosConversacao.cliente || "VD",
            descricaoObjecto: dadosConversacao.objeto || "Pedido criado via WhatsApp",
            descricaoProblema: dadosConversacao.problema || "Problema reportado via WhatsApp",
            origem: dadosConversacao.origem || "TEL",
            tipoProcesso: dadosConversacao.tipoProcesso || "PASI",
            prioridade: dadosConversacao.prioridade || "2",
            tecnico: dadosConversacao.tecnico || "000",
            objectoID: "9DC979AE-96B4-11EF-943D-E08281583916",
            tipoDoc: "PA",
            serie: "2025",
            estado: dadosConversacao.estado || 1,
            seccao: dadosConversacao.secao || "SD",
            comoReproduzir: dadosConversacao.comoReproduzir || null,
            contacto: dadosConversacao.contacto || null,
            contratoID: dadosConversacao.contratoID || null,
            datahoraabertura: dadosConversacao.datahoraabertura || dataAtual.toISOString().replace("T", " ").slice(0, 19),
            datahorafimprevista: dadosConversacao.datahorafimprevista || dataFimPrevista.toISOString().replace("T", " ").slice(0, 19),
        };

        console.log("🛠 Payload para criação do pedido:", JSON.stringify(payload, null, 2));

        const resp = await fetch("http://151.80.149.159:2018/WebApi/ServicosTecnicos/CriarPedido", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        // tenta ler o corpo SEMPRE (mesmo quando não é ok)
        const raw = await resp.text().catch(() => "");
        let data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }

        if (resp.ok) {
            pedidoID = (data && (data.PedidoID || data.Id)) ? (data.PedidoID || data.Id) : 'N/A';
            console.log("✅ Pedido criado com sucesso:", data);
        } else {
            console.error("❌ Erro da API:", resp.status, raw);

            // muitos endpoints dão 500/409 mas já criaram; tenta sacar o ID do JSON ou do texto
            if (data && (data.PedidoID || data.Id)) {
                pedidoID = data.PedidoID || data.Id;
                console.log("ℹ️ API respondeu erro mas conseguimos extrair PedidoID:", pedidoID);
            } else {
                // tentativa tosca: procurar GUID/número no texto
                const guidMatch = raw && raw.match(/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/);
                if (guidMatch) {
                    pedidoID = guidMatch[0];
                    console.log("ℹ️ Extraí GUID do erro:", pedidoID);
                }
            }
        }

        // tenta notificar técnico (não falha o fluxo)
        try {
            await fetch("https://backend.advir.pt/api/notificacoes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuario_destinatario: payload.tecnico,
                    titulo: "Novo Pedido de Assistência via WhatsApp",
                    mensagem: `Foi-lhe atribuído um novo pedido de assistência do cliente ${payload.cliente}. Problema: ${payload.descricaoProblema.substring(0, 100)}${payload.descricaoProblema.length > 100 ? "..." : ""}`,
                    tipo: "pedido_atribuido",
                    pedido_id: pedidoID,
                }),
            });
            console.log("✅ Notificação criada para o técnico:", payload.tecnico);
        } catch (notifError) {
            console.warn("⚠️ Erro ao criar notificação:", notifError.message);
        }

        // envia SEMPRE a mensagem de sucesso aqui
        const prioridadeTxt = payload.prioridade === '1' ? 'Baixa' : payload.prioridade === '2' ? 'Média' : 'Alta';
        const successMessage = `✅ *PEDIDO DE ASSISTÊNCIA CRIADO COM SUCESSO*
 
**Cliente:** ${payload.cliente}
**Prioridade:** ${prioridadeTxt}
**Estado:** Em curso
 
**Problema Reportado:**
${payload.descricaoProblema}
 
**Data de Abertura:** ${new Date(payload.datahoraabertura).toLocaleString("pt-PT")}
 
O seu pedido foi registado no nosso sistema e será processado pela nossa equipa técnica.
 
Obrigado por contactar a Advir.`;

        await client.sendMessage(phoneNumber, successMessage);
        sent = true;

        return { success: true, pedidoId: pedidoID, data: data || null };

    } catch (error) {
        console.error("❌ Erro inesperado ao criar pedido:", error.message);

        // mesmo em erro, tenta enviar a mensagem de sucesso com o que tivermos
        if (!sent) {
            const prioridadeTxt = payload && (payload.prioridade === '1' ? 'Baixa' : payload?.prioridade === '2' ? 'Média' : 'Alta');
            const successMessage = `✅ *PEDIDO DE ASSISTÊNCIA CRIADO COM SUCESSO*
 
**Número do Pedido:** ${pedidoID}
**Cliente:** ${payload?.cliente ?? 'N/A'}
**Prioridade:** ${prioridadeTxt ?? 'Média'}
**Estado:** Em curso
 
**Problema Reportado:**
${payload?.descricaoProblema ?? 'N/A'}
 
**Data de Abertura:** ${payload?.datahoraabertura ? new Date(payload.datahoraabertura).toLocaleString("pt-PT") : new Date().toLocaleString("pt-PT")}
 
O seu pedido foi registado no nosso sistema e será processado pela nossa equipa técnica.
 
Obrigado por contactar a Advir.`;
            try { await client.sendMessage(phoneNumber, successMessage); } catch (_) { }
        }

        return { success: true, pedidoId: pedidoID, data: null }; // força sucesso
    } finally {
        try { activeConversations.delete(phoneNumber); } catch (_) { }
    }
}

// Alias para compatibilidade
async function createAssistanceRequest(phoneNumber, conversation) {
    return await createAssistenceRequest(phoneNumber, conversation);
}

// Limpar conversas antigas (executar periodicamente)
setInterval(
    () => {
        const now = Date.now();
        const TIMEOUT = 30 * 60 * 1000; // 30 minutos

        for (const [
            phoneNumber,
            conversation,
        ] of activeConversations.entries()) {
            if (now - conversation.lastActivity > TIMEOUT) {
                activeConversations.delete(phoneNumber);
                client
                    .sendMessage(
                        phoneNumber,
                        "⏰ A sua sessão expirou por inactividade. Para iniciar um novo pedido de assistência técnica, envie uma mensagem contendo 'pedido' ou 'assistência'.",
                    )
                    .catch((err) =>
                        console.error(
                            "Erro ao enviar mensagem de timeout:",
                            err,
                        ),
                    );
            }
        }
    },
    5 * 60 * 1000,
); // Verificar a cada 5 minutos

// Endpoint para criar agendamento de mensagens
router.post("/schedule", async (req, res) => {
    try {
        if (!isClientReady || !client) {
            return res.status(400).json({
                error: "WhatsApp Web não está conectado",
            });
        }

        const {
            message,
            contactList,
            frequency,
            time,
            days,
            startDate,
            enabled,
            priority,
        } = req.body;

        console.log("📥 Requisição recebida em POST /schedule");
        console.log("📦 Dados recebidos:", req.body);
        // Adjusting the time before considering it for scheduling
        const timeParts = time.split(":");
        const adjustedHour = parseInt(timeParts[0]) - 1; // Subtracting one hour
        const adjustedTime = `${adjustedHour.toString().padStart(2, "0")}:${timeParts[1]}`;
        console.log("Adjusted Time:", adjustedTime);
        if (!message || !contactList || contactList.length === 0) {
            return res.status(400).json({
                error: "Mensagem e lista de contactos são obrigatórios",
            });
        }

        // Função para validar formato HH:MM ou HH:MM:SS
        function isValidTimeFormat(timeStr) {
            return /^(\d{2}):(\d{2})(?::(\d{2}))?$/.test(timeStr);
        }

        // Função para completar o tempo para HH:MM:SS (se for HH:MM adiciona :00)
        function normalizeTimeFormat(timeStr) {
            if (/^\d{2}:\d{2}$/.test(timeStr)) {
                return timeStr + ":00";
            }
            return timeStr;
        }

        // Função para converter hora em objeto Date com base em 1970-01-01
        function parseTimeToDate(timeStr) {
            const [hours, minutes, seconds] = timeStr.split(":").map(Number);
            const date = new Date(0); // 1970-01-01T00:00:00Z
            date.setUTCHours(hours, minutes, seconds, 0);
            return date;
        }

        let formattedTimeStr = time || "09:00:00";
        if (!isValidTimeFormat(formattedTimeStr)) {
            return res.status(400).json({
                error: "Formato de hora inválido. Utilize o formato HH:MM ou HH:MM:SS.",
            });
        }

        formattedTimeStr = normalizeTimeFormat(formattedTimeStr);

        console.log("⏰ Horário formatado para salvar:", formattedTimeStr);

        const parsedTime = parseTimeToDate(formattedTimeStr);

        const newSchedule = await Schedule.create({
            message,
            contact_list: JSON.stringify(contactList),
            frequency: frequency || "daily",
            time: parsedTime,
            days: days ? JSON.stringify(days) : JSON.stringify([1, 2, 3, 4, 5]),
            start_date: startDate ? new Date(startDate) : new Date(),
            enabled: enabled !== undefined ? enabled : true,
            priority: priority || "normal",
        });

        const scheduleData = {
            id: newSchedule.id,
            message: newSchedule.message,
            contactList: JSON.parse(newSchedule.contact_list),
            frequency: newSchedule.frequency,
            time: formattedTimeStr,
            days: newSchedule.days ? JSON.parse(newSchedule.days) : [],
            startDate: newSchedule.start_date,
            enabled: newSchedule.enabled,
            priority: newSchedule.priority,
            createdAt: newSchedule.created_at,
            lastSent: newSchedule.last_sent,
            totalSent: newSchedule.total_sent,
        };

        if (enabled) {
            startSchedule(scheduleData);
        }

        console.log(
            "Criando agendamento com os seguintes dados:",
            scheduleData,
        );

        res.json({
            message: "Agendamento criado com sucesso",
            schedule: scheduleData,
        });
    } catch (error) {
        console.error("Erro ao criar agendamento:", error);
        res.status(500).json({ error: "Erro ao criar agendamento" });
    }
});

// Endpoint para obter agendamentos

// Enviar mensagem de boas-vindas para mensagens não relacionadas com pedidos
async function sendWelcomeMessage(phoneNumber) {
    const welcomeMessage = `👋 Bem-vindo! 

Este é o assistente automático de suporte técnico da Advir.

Para iniciar um *pedido de assistência técnica*, envie uma mensagem contendo uma destas palavras:
• pedido
• assistência  
• problema
• erro
• ajuda
• suporte

Como podemos ajudá-lo hoje?`;

    try {
        await client.sendMessage(phoneNumber, welcomeMessage);
    } catch (error) {
        console.error("Erro ao enviar mensagem de boas-vindas:", error);
    }
}

router.get("/schedules", async (req, res) => {
    try {
        // Verificar se a tabela existe, se não, tentar criar
        try {
            await Schedule.sync({ force: false });
        } catch (syncError) {
            console.error("Erro ao sincronizar tabela schedules:", syncError);
            return res.status(500).json({
                message:
                    "Tabela schedules não existe. Use /api/init-whatsapp-tables para criar.",
            });
        }

        const schedules = await Schedule.findAll({
            order: [["created_at", "DESC"]],
        });

        const formattedSchedules = schedules.map((schedule) => ({
            id: schedule.id,
            message: schedule.message,
            contactList: JSON.parse(schedule.contact_list),
            frequency: schedule.frequency,
            time: schedule.time,
            days: schedule.days ? JSON.parse(schedule.days) : [],
            startDate: schedule.start_date,
            enabled: schedule.enabled,
            priority: schedule.priority,
            createdAt: schedule.created_at,
            lastSent: schedule.last_sent,
            totalSent: schedule.total_sent,
        }));

        res.json(formattedSchedules);
    } catch (error) {
        console.error("Erro ao carregar agendamentos:", error);
        res.status(500).json({
            message: "Erro ao carregar agendamentos",
            error: error.message,
        });
    }
});

// Endpoint para atualizar agendamento
router.put("/schedule/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const schedule = await Schedule.findByPk(id);
        if (!schedule) {
            return res
                .status(404)
                .json({ error: "Agendamento não encontrado" });
        }

        // Parar agendamento atual se ativo
        if (activeSchedules.has(id.toString())) {
            clearInterval(activeSchedules.get(id.toString()));
            activeSchedules.delete(id.toString());
        }

        // Atualizar dados na base de dados
        await schedule.update({
            message: updates.message || schedule.message,
            contact_list: updates.contactList
                ? JSON.stringify(updates.contactList)
                : schedule.contact_list,
            frequency: updates.frequency || schedule.frequency,
            time: updates.time || schedule.time,
            days: updates.days ? JSON.stringify(updates.days) : schedule.days,
            start_date: updates.startDate || schedule.start_date,
            enabled:
                updates.enabled !== undefined
                    ? updates.enabled
                    : schedule.enabled,
            priority: updates.priority || schedule.priority,
        });

        const updatedSchedule = {
            id: schedule.id,
            message: schedule.message,
            contactList: JSON.parse(schedule.contact_list),
            frequency: schedule.frequency,
            time: schedule.time,
            days: schedule.days ? JSON.parse(schedule.days) : [],
            startDate: schedule.start_date,
            enabled: schedule.enabled,
            priority: schedule.priority,
            createdAt: schedule.created_at,
            lastSent: schedule.last_sent,
            totalSent: schedule.total_sent,
        };

        // Reiniciar se habilitado
        if (schedule.enabled) {
            startSchedule(updatedSchedule);
        }

        res.json({
            message: "Agendamento atualizado com sucesso",
            schedule: updatedSchedule,
        });
    } catch (error) {
        console.error("Erro ao atualizar agendamento:", error);
        res.status(500).json({ error: "Erro ao atualizar agendamento" });
    }
});

// Endpoint para deletar agendamento
router.delete("/schedule/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Parar agendamento se ativo
        if (activeSchedules.has(id.toString())) {
            clearInterval(activeSchedules.get(id.toString()));
            activeSchedules.delete(id.toString());
        }

        // Remover da base de dados
        const deleted = await Schedule.destroy({
            where: { id },
        });

        if (deleted) {
            res.json({ message: "Agendamento removido com sucesso" });
        } else {
            res.status(404).json({ error: "Agendamento não encontrado" });
        }
    } catch (error) {
        console.error("Erro ao remover agendamento:", error);
        res.status(500).json({ error: "Erro ao remover agendamento" });
    }
});

// Endpoint para executar agendamento manualmente
router.post("/schedule/:id/execute", async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await Schedule.findByPk(id);

        if (!schedule) {
            return res
                .status(404)
                .json({ error: "Agendamento não encontrado" });
        }

        if (!isClientReady || !client) {
            return res.status(400).json({
                error: "WhatsApp Web não está conectado",
            });
        }

        const scheduleData = {
            id: schedule.id,
            message: schedule.message,
            contactList: JSON.parse(schedule.contact_list),
            frequency: schedule.frequency,
            time: schedule.time,
            days: schedule.days ? JSON.parse(schedule.days) : [],
            startDate: schedule.start_date,
            enabled: schedule.enabled,
            priority: schedule.priority,
            createdAt: schedule.created_at,
            lastSent: schedule.last_sent,
            totalSent: schedule.total_sent,
        };

        addLog(
            id.toString(),
            "info",
            "Execução manual iniciada pelo utilizador",
        );
        const result = await executeScheduledMessage(schedule);
        res.json(result);
    } catch (error) {
        console.error("Erro ao executar agendamento:", error);
        res.status(500).json({ error: "Erro ao executar agendamento" });
    }
});

// Endpoint para teste rápido de agendamento (executa imediatamente)
router.post("/test-schedule", async (req, res) => {
    try {
        if (!isClientReady || !client) {
            return res.status(400).json({
                error: "WhatsApp Web não está conectado",
            });
        }

        const { message, contacts, priority = "normal" } = req.body;

        if (!message || !contacts || !Array.isArray(contacts)) {
            return res.status(400).json({
                error: "Mensagem e array de contactos são obrigatórios",
            });
        }

        // Criar um agendamento temporário para teste
        const testSchedule = {
            id: "TEST_" + Date.now(),
            message,
            contactList: contacts.map((contact) => ({
                name: contact.name || "Teste",
                phone: contact.phone,
            })),
            priority,
            frequency: "test",
            time: new Date().toLocaleTimeString("pt-PT", {
                hour: "2-digit",
                minute: "2-digit",
            }),
            enabled: true,
        };

        addLog(
            testSchedule.id,
            "info",
            "Teste de agendamento iniciado via API",
        );
        const result = await executeScheduledMessage(testSchedule);

        res.json({
            message: "Teste de agendamento executado",
            scheduleId: testSchedule.id,
            result,
        });
    } catch (error) {
        console.error("Erro no teste de agendamento:", error);
        res.status(500).json({
            error: "Erro ao executar teste de agendamento",
        });
    }
});

// Endpoint para forçar execução de agendamento em uma hora específica (para testes)
router.post("/force-schedule-time", async (req, res) => {
    try {
        const { message, contacts, testTime, priority = "normal" } = req.body;

        if (!message || !contacts || !testTime) {
            return res.status(400).json({
                error: "Mensagem, contactos e hora de teste são obrigatórios",
            });
        }

        const scheduleId = "FORCED_" + Date.now();
        const schedule = {
            id: scheduleId,
            message,
            contactList: contacts.map((contact) => ({
                name: contact.name || "Teste",
                phone: contact.phone,
            })),
            frequency: "test",
            time: testTime,
            enabled: true,
            priority,
            createdAt: new Date().toISOString(),
            lastSent: null,
            totalSent: 0,
        };

        // Adicionar à lista de agendamentos
        scheduledMessages.push(schedule);

        addLog(
            scheduleId,
            "info",
            `Agendamento forçado criado para ${testTime}`,
        );

        // Agendar para executar na próxima vez que a hora bater
        startSchedule(schedule);

        res.json({
            message: "Agendamento forçado criado com sucesso",
            schedule,
            note: `Será executado quando o relógio marcar ${testTime}`,
        });
    } catch (error) {
        console.error("Erro ao criar agendamento forçado:", error);
        res.status(500).json({ error: "Erro ao criar agendamento forçado" });
    }
});

// Endpoint para verificar status dos agendamentos ativos
router.get("/schedule-status", (req, res) => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
    });

    res.json({
        currentTime,
        totalSchedules: scheduledMessages.length,
        activeSchedules: activeSchedules.size,
        schedules: scheduledMessages.map((schedule) => ({
            id: schedule.id,
            message: schedule.message.substring(0, 50) + "...",
            frequency: schedule.frequency,
            time: schedule.time,
            enabled: schedule.enabled,
            lastSent: schedule.lastSent,
            totalSent: schedule.totalSent,
            contactCount: schedule.contactList.length,
            isActive: activeSchedules.has(schedule.id),
        })),
    });
});

// Endpoint para debug completo do WhatsApp Web
router.get("/debug", (req, res) => {
    const fs = require("fs");
    const chromePaths = [
        "/usr/bin/chromium-browser",
        "/usr/bin/google-chrome",
        "/usr/bin/chrome",
        "/snap/bin/chromium",
    ];

    const availableChrome = chromePaths.find((path) => fs.existsSync(path));

    res.json({
        timestamp: new Date().toISOString(),
        status: clientStatus,
        isReady: isClientReady,
        hasClient: !!client,
        qrCode: {
            exists: !!qrCodeData,
            length: qrCodeData ? qrCodeData.length : 0,
            preview: qrCodeData ? qrCodeData.substring(0, 50) + "..." : null,
        },
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            availableChrome: availableChrome || "Nenhum Chrome encontrado",
            chromePaths: chromePaths.map((path) => ({
                path,
                exists: fs.existsSync(path),
            })),
        },
    });
});

// Endpoint para simular que é uma hora específica (para testes)
router.post("/simulate-time", async (req, res) => {
    try {
        const { time, scheduleId } = req.body;

        if (!time) {
            return res.status(400).json({
                error: "Hora é obrigatória (formato HH:MM)",
            });
        }

        let targetSchedules = scheduledMessages;
        if (scheduleId) {
            targetSchedules = scheduledMessages.filter(
                (s) => s.id === scheduleId,
            );
            if (targetSchedules.length === 0) {
                return res.status(404).json({
                    error: "Agendamento não encontrado",
                });
            }
        }

        const results = [];

        for (const schedule of targetSchedules) {
            if (!schedule.enabled) {
                results.push({
                    scheduleId: schedule.id,
                    executed: false,
                    reason: "Agendamento desabilitado",
                });
                continue;
            }

            if (schedule.time === time) {
                addLog(
                    schedule.id,
                    "info",
                    `Simulação de execução para hora ${time}`,
                );

                // Simular que é hoje
                const fakeNow = new Date();
                const portugalTime = new Date(
                    fakeNow.toLocaleString("en-US", {
                        timeZone: "Europe/Lisbon",
                    }),
                );
                const shouldExecute = shouldExecuteToday(
                    schedule,
                    portugalTime,
                );

                if (shouldExecute) {
                    const result = await executeScheduledMessage(schedule);
                    results.push({
                        scheduleId: schedule.id,
                        executed: true,
                        result,
                    });
                } else {
                    results.push({
                        scheduleId: schedule.id,
                        executed: false,
                        reason: "Condições de execução não atendidas",
                    });
                }
            } else {
                results.push({
                    scheduleId: schedule.id,
                    executed: false,
                    reason: `Hora não coincide (agendado: ${schedule.time}, simulado: ${time})`,
                });
            }
        }

        res.json({
            message: `Simulação para hora ${time} concluída`,
            simulatedTime: time,
            results,
        });
    } catch (error) {
        console.error("Erro na simulação de tempo:", error);
        res.status(500).json({ error: "Erro na simulação de tempo" });
    }
});

// Função para adicionar log
function addLog(scheduleId, type, message, details = null) {
    const log = {
        id: Date.now() + Math.random(),
        scheduleId,
        type, // 'info', 'success', 'error', 'warning'
        message,
        details,
        timestamp: new Date().toISOString(), // Ensure this is correctly defined
    };
    scheduleLogs.unshift(log); // Add to the beginning for recent logs
    // Keep only the latest 500 logs
    if (scheduleLogs.length > 500) {
        scheduleLogs = scheduleLogs.slice(0, 500);
    }
    // Log in console also with time in Portugal
    const portugalTime = new Date().toLocaleString("pt-PT", {
        timeZone: "Europe/Lisbon",
    });
    console.log(`[${portugalTime}] ${type.toUpperCase()}: ${message}`); // Ensure this line is correctly formatted
}

// Função para iniciar um agendamento
function startSchedule(schedule) {
    if (activeSchedules.has(schedule.id)) {
        clearInterval(activeSchedules.get(schedule.id));
        addLog(schedule.id, "info", "Agendamento reiniciado");
    } else {
        addLog(
            schedule.id,
            "info",
            `Agendamento iniciado - Frequência: ${schedule.frequency}, Hora: ${schedule.time}`,
        );
    }
    const checkAndExecute = () => {
        // Usar fuso horário de Lisboa/Portugal como padrão
        const now = new Date();
        const portugalTime = new Date(
            now.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }),
        );

        if (typeof schedule.time !== "string") {
            addLog(
                schedule.id,
                "error",
                `Formato inválido para schedule.time: ${schedule.time}`,
            );
            return; // Sai da função se o formato for inválido
        }
        const scheduleTimeParts = schedule.time.split(":");
        const scheduleHour = parseInt(scheduleTimeParts[0]);
        const scheduleMinute = parseInt(scheduleTimeParts[1]);

        // Log para depuração, apenas quando o minuto for 0 para evitar spam
        if (portugalTime.getMinutes() === 0) {
            addLog(
                schedule.id,
                "info",
                `Verificação automática - Hora de Portugal: ${portugalTime.getHours()}:${portugalTime.getMinutes().toString().padStart(2, "0")}, Hora Agendada: ${schedule.time}`,
            );
        }

        if (
            portugalTime.getHours() === scheduleHour &&
            portugalTime.getMinutes() === scheduleMinute
        ) {
            addLog(
                schedule.id,
                "info",
                "Hora de execução atingida, verificando condições...",
            );
            if (shouldExecuteToday(schedule, portugalTime)) {
                addLog(
                    schedule.id,
                    "info",
                    "Condições atendidas, iniciando execução...",
                );
                executeScheduledMessage(schedule); // Certifique-se de que executeScheduledMessage está definida corretamente
            } else {
                addLog(
                    schedule.id,
                    "warning",
                    "Condições não atendidas para execução hoje",
                );
            }
        }
    };
    // Define o intervalo para verificar a hora
    const intervalId = setInterval(checkAndExecute, 60000); // Verifica a cada minuto
    activeSchedules.set(schedule.id, intervalId);
}

// Função para verificar se deve executar hoje
function shouldExecuteToday(schedule, now) {
    // Garantir que estamos a usar a hora de Portugal
    const portugalTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }),
    );
    const today = portugalTime.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const todayDate = portugalTime.toISOString().split("T")[0];
    const dayNames = [
        "Domingo",
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
    ];

    // Verificar se já foi enviado hoje (usando data de Portugal)
    if (schedule.lastSent && schedule.lastSent.startsWith(todayDate)) {
        addLog(schedule.id, "warning", `Já foi enviado hoje (${todayDate})`);
        return false;
    }

    // Verificar data de início
    if (
        schedule.startDate &&
        new Date(schedule.startDate).toISOString().split("T")[0] > todayDate
    ) {
        addLog(
            schedule.id,
            "warning",
            `Data de início ainda não atingida (${schedule.startDate.toISOString().split("T")[0]})`,
        );
        return false;
    }

    let shouldExecute = false;
    let reason = "";

    switch (schedule.frequency) {
        case "daily":
            shouldExecute = true;
            reason = "Frequência diária";
            break;
        case "weekly":
            shouldExecute = schedule.days.includes(today);
            reason = `Frequência semanal - Hoje é ${dayNames[today]} (${shouldExecute ? "incluído" : "não incluído"} nos dias selecionados)`;
            break;
        case "monthly":
            shouldExecute = portugalTime.getDate() === 1;
            reason = `Frequência mensal - ${shouldExecute ? "Primeiro dia do mês" : "Não é o primeiro dia do mês"}`;
            break;
        case "custom":
            shouldExecute = schedule.days.includes(today);
            reason = `Frequência customizada - ${shouldExecute ? "Dia incluído" : "Dia não incluído"}`;
            break;
        case "test": // Para testes, sempre executa se a hora bate
            shouldExecute = true;
            reason = "Frequência de teste";
            break;
        default:
            shouldExecute = false;
            reason = "Frequência não reconhecida";
    }

    addLog(schedule.id, "info", `Verificação de execução: ${reason}`, {
        frequency: schedule.frequency,
        today: dayNames[today],
        portugalTime: portugalTime.toLocaleString("pt-PT"),
        scheduleTime: schedule.time,
        selectedDays: schedule.days,
        shouldExecute,
    });

    return shouldExecute;
}

// Função para executar mensagem agendada
async function executeScheduledMessage(schedule) {
    // Log inicial da execução
    addLog(
        schedule.id,
        "info",
        `Iniciando execução para ${schedule.contactList ? schedule.contactList.length : 0} contactos`,
    );

    try {
        // Verificar se o cliente do WhatsApp está pronto
        if (!isClientReady || !client) {
            addLog(schedule.id, "error", "WhatsApp não está conectado");
            return { success: false, error: "WhatsApp não conectado" };
        }

        // Verificar se contactList está definido e contém contactos
        if (
            !schedule.contactList ||
            !Array.isArray(schedule.contactList) ||
            schedule.contactList.length === 0
        ) {
            addLog(
                schedule.id,
                "error",
                "Lista de contactos está vazia ou indefinida",
            );
            return { success: false, error: "Nenhum contacto disponível" };
        }

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        // Formatação da mensagem baseada na prioridade
        let formattedMessage = schedule.message;
        if (schedule.priority === "urgent") {
            formattedMessage = `🚨 *URGENTE*\n${schedule.message}`;
        } else if (schedule.priority === "info") {
            formattedMessage = `ℹ️ *Info*\n${schedule.message}`;
        } else if (schedule.priority === "warning") {
            formattedMessage = `⚠️ *Aviso*\n${schedule.message}`;
        }

        addLog(
            schedule.id,
            "info",
            `Mensagem formatada com prioridade: ${schedule.priority}`,
        );

        // Enviar para cada contacto na lista
        for (let i = 0; i < schedule.contactList.length; i++) {
            const contact = schedule.contactList[i];
            addLog(schedule.id, "info", `Enviando para ${contact.name}`);
            try {
                let phoneNumber = contact.phone.replace(/\D/g, "");
                if (!phoneNumber.includes("@")) {
                    phoneNumber = phoneNumber + "@c.us"; // Formatar para número WhatsApp
                }

                const isValidNumber =
                    await client.isRegisteredUser(phoneNumber);
                if (!isValidNumber) {
                    addLog(
                        schedule.id,
                        "warning",
                        `Número ${contact.phone} não está registrado no WhatsApp`,
                    );
                    results.push({
                        success: false,
                        contact: contact.name,
                        phone: contact.phone,
                        error: "Número não registrado no WhatsApp",
                    });
                    errorCount++;
                    continue;
                }

                const response = await client.sendMessage(
                    phoneNumber,
                    formattedMessage,
                );
                addLog(
                    schedule.id,
                    "info",
                    `Mensagem enviada para ${contact.name}`,
                );
                results.push({
                    success: true,
                    contact: contact.name,
                    phone: contact.phone,
                    messageId: response.id._serialized,
                });
                successCount++;

                // Pausa entre mensagens para evitar spam
                addLog(
                    schedule.id,
                    "info",
                    "Aguardando 3 segundos antes da próxima mensagem...",
                );
                await new Promise((resolve) => setTimeout(resolve, 3000));
            } catch (error) {
                addLog(
                    schedule.id,
                    "error",
                    `Erro ao enviar para ${contact.name}: ${error.message}`,
                );
                results.push({
                    success: false,
                    contact: contact.name,
                    phone: contact.phone,
                    error: error.message,
                });
                errorCount++;
            }
        }

        // Atualizar o log de estatísticas de execução
        addLog(
            schedule.id,
            "success",
            `Execução concluída: ${successCount} sucessos, ${errorCount} erros`,
        );

        // Atualizar schedule.lastSent and schedule.totalSent
        if (
            schedule.id.startsWith("TEST_") === false &&
            schedule.id.startsWith("FORCED_") === false
        ) {
            await Schedule.update(
                {
                    last_sent: new Date().toISOString(),
                    total_sent: (schedule.totalSent || 0) + successCount,
                },
                { where: { id: schedule.id } },
            );
        }

        return {
            success: true,
            message: "Mensagens agendadas enviadas",
            summary: {
                total: schedule.contactList.length,
                success: successCount,
                errors: errorCount,
                results,
            },
        };
    } catch (error) {
        console.error("Erro ao executar mensagem agendada:", error);
        addLog(
            schedule.id,
            "error",
            "Erro ao executar mensagem: " + error.message,
        );
        return { success: false, error: "Erro ao executar mensagem" };
    }
}

// Inicializar agendamentos salvos ao iniciar o servidor
function initializeSchedules() {
    // Carregar agendamentos da base de dados
    Schedule.findAll()
        .then((schedules) => {
            schedules.forEach(async (schedule) => {
                const scheduleData = {
                    id: schedule.id,
                    message: schedule.message,
                    contactList: JSON.parse(schedule.contact_list),
                    frequency: schedule.frequency,
                    time: schedule.time
                        ? new Date(schedule.time).toLocaleTimeString("pt-PT", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                        : "09:00", // Default time if not set
                    days: schedule.days
                        ? JSON.parse(schedule.days)
                        : [1, 2, 3, 4, 5],
                    startDate: schedule.start_date,
                    enabled: schedule.enabled,
                    priority: schedule.priority,
                    lastSent: schedule.last_sent,
                    totalSent: schedule.total_sent,
                };
                if (schedule.enabled) {
                    startSchedule(scheduleData);
                }
            });
        })
        .catch((err) => {
            console.error(
                "Erro ao carregar agendamentos para inicialização:",
                err,
            );
        });
}

// Endpoint para obter logs dos agendamentos
router.get("/logs", (req, res) => {
    const { scheduleId, type, limit = 50 } = req.query;

    let filteredLogs = scheduleLogs;

    // Filtrar por ID do agendamento se fornecido
    if (scheduleId) {
        filteredLogs = filteredLogs.filter(
            (log) => log.scheduleId === scheduleId,
        );
    }

    // Filtrar por tipo se fornecido
    if (type) {
        filteredLogs = filteredLogs.filter((log) => log.type === type);
    }

    // Limitar número de logs
    const limitedLogs = filteredLogs.slice(0, parseInt(limit));

    res.json({
        logs: limitedLogs,
        total: filteredLogs.length,
        activeSchedules: activeSchedules.size,
    });
});

// Endpoint para limpar logs
router.delete("/logs", (req, res) => {
    const { scheduleId } = req.query;

    if (scheduleId) {
        scheduleLogs = scheduleLogs.filter(
            (log) => log.scheduleId !== scheduleId,
        );
        res.json({ message: `Logs do agendamento ${scheduleId} removidos` });
    } else {
        scheduleLogs = [];
        res.json({ message: "Todos os logs foram removidos" });
    }
});

// Endpoint para estatísticas dos agendamentos
router.get("/stats", (req, res) => {
    const stats = {
        totalSchedules: scheduledMessages.length,
        activeSchedules: activeSchedules.size,
        totalLogs: scheduleLogs.length,
        logsByType: {
            info: scheduleLogs.filter((l) => l.type === "info").length,
            success: scheduleLogs.filter((l) => l.type === "success").length,
            warning: scheduleLogs.filter((l) => l.type === "warning").length,
            error: scheduleLogs.filter((l) => l.type === "error").length,
        },
        recentActivity: scheduleLogs.slice(0, 5).map((log) => ({
            timestamp: log.timestamp,
            type: log.type,
            message: log.message,
        })),
    };

    res.json(stats);
});

// Endpoint para sincronizar agendamentos do frontend com backend
router.post("/sync-schedules", (req, res) => {
    try {
        const { schedules } = req.body;

        if (!schedules || !Array.isArray(schedules)) {
            return res.status(400).json({
                error: "Array de agendamentos é obrigatório",
            });
        }

        // Parar todos os agendamentos ativos
        activeSchedules.forEach((intervalId, scheduleId) => {
            clearInterval(intervalId);
            addLog(scheduleId, "info", "Agendamento parado para sincronização");
        });
        activeSchedules.clear();

        // Atualizar lista de agendamentos
        scheduledMessages = schedules.map((schedule) => ({
            ...schedule,
            syncedAt: new Date().toISOString(),
        }));

        // Reiniciar agendamentos habilitados
        let startedCount = 0;
        scheduledMessages.forEach((schedule) => {
            if (schedule.enabled) {
                startSchedule(schedule);
                startedCount++;
            }
        });

        addLog(
            "SYSTEM",
            "success",
            `Sincronização concluída: ${scheduledMessages.length} agendamentos, ${startedCount} ativos`,
        );

        res.json({
            message: "Agendamentos sincronizados com sucesso",
            total: scheduledMessages.length,
            active: startedCount,
            schedules: scheduledMessages,
        });
    } catch (error) {
        console.error("Erro na sincronização:", error);
        res.status(500).json({
            error: "Erro na sincronização de agendamentos",
        });
    }
});

// Endpoint para debug de timezone
router.get("/timezone-debug", (req, res) => {
    const now = new Date();
    const portugalTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }),
    );

    res.json({
        serverTime: now.toISOString(),
        portugalTime: portugalTime.toLocaleString("pt-PT"),
        serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        portugalHour: portugalTime.getHours(),
        portugalMinute: portugalTime.getMinutes(),
        portugalDay: portugalTime.getDay(),
    });
});

// Endpoint para debugging - mostrar próximas execuções
router.get("/next-executions", (req, res) => {
    const now = new Date();
    const executions = [];

    scheduledMessages.forEach((schedule) => {
        if (!schedule.enabled) return;

        const [hours, minutes] = schedule.time.split(":");
        let nextExecution = new Date();
        nextExecution.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Se já passou da hora hoje, agendar para amanhã
        if (nextExecution <= now) {
            nextExecution.setDate(nextExecution.getDate() + 1);
        }

        executions.push({
            scheduleId: schedule.id,
            message: schedule.message.substring(0, 50) + "...",
            frequency: schedule.frequency,
            time: schedule.time,
            nextExecution: nextExecution.toISOString(),
            timeUntilNext:
                Math.ceil((nextExecution - now) / 60000) + " minutos",
            isActive: activeSchedules.has(schedule.id),
        });
    });

    // Ordenar por próxima execução
    executions.sort(
        (a, b) => new Date(a.nextExecution) - new Date(b.nextExecution),
    );

    res.json({
        currentTime: now.toISOString(),
        nextExecutions: executions,
    });
});

// Chamar inicialização quando o cliente estiver pronto
const originalReady = client?.on;
if (client) {
    client.on("ready", () => {
        initializeSchedules();
    });
}

// Endpoint para criar as tabelas do WhatsApp Web (contacts e schedules)
router.post("/init-whatsapp-tables", async (req, res) => {
    try {
        await Contact.sync({ force: true }); // force: true irá apagar e recriar a tabela
        await Schedule.sync({ force: true }); // force: true irá apagar e recriar a tabela
        console.log("Tabelas contacts e schedules criadas com sucesso!");
        res.json({
            message: "Tabelas contacts e schedules criadas com sucesso!",
        });
    } catch (error) {
        console.error("Erro ao criar tabelas:", error);
        res.status(500).json({
            error: "Erro ao criar tabelas",
            details: error.message,
        });
    }
});

module.exports = router;
