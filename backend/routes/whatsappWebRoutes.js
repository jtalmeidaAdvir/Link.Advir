const express = require("express");
const router = express.Router();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fetch = require("node-fetch");
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
const initializeWhatsAppWeb = async (retryCount = 0) => {
    const maxRetries = 3;

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

            // Handle specific Puppeteer errors including ExecutionContext errors
            if (
                error.message.includes("Target closed") ||
                error.message.includes("Protocol error") ||
                error.message.includes("Execution context was destroyed") ||
                error.name === "ProtocolError"
            ) {
                console.log(
                    "🎯 Erro de protocolo/contexto detectado - fazendo limpeza silenciosa",
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

    try {
        // Configuração específica para produção/servidor
        const isProduction =
            process.env.NODE_ENV === "production" ||
            process.env.REPLIT_DEV_DOMAIN;

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
                    "--disable-blink-features=AutomationControlled",
                    "--disable-component-update",
                    "--disable-ipc-flooding-protection",
                    ...(isProduction
                        ? [
                            "--disable-software-rasterizer",
                            "--disable-background-networking",
                            "--disable-sync",
                            "--metrics-recording-only",
                            "--safebrowsing-disable-auto-update",
                            "--disable-crash-reporter",
                        ]
                        : []),
                ],
                timeout: 60000, // Aumentar timeout
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

                // Se for erro de ExecutionContext, tentar reinicializar
                if (error.message.includes("Execution context was destroyed")) {
                    console.log(
                        "🔄 Erro de ExecutionContext detectado, reinicializando cliente...",
                    );
                    setTimeout(() => initializeWhatsAppWeb(), 3000);
                }
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
            setTimeout(() => initializeWhatsAppWeb(), 5000);
        });

        // Adicionar handler para erros não capturados
        client.on("auth_failure", (msg) => {
            console.error("Falha na autenticação:", msg);
            clientStatus = "auth_failure";
        });

        await client.initialize();
    } catch (error) {
        console.error("❌ Erro ao inicializar cliente WhatsApp:", error);

        // Se for erro de ExecutionContext e ainda temos tentativas, retry
        if (
            error.message.includes("Execution context was destroyed") &&
            retryCount < maxRetries
        ) {
            console.log(
                `🔄 Tentativa ${retryCount + 1}/${maxRetries} - Tentando novamente em 5 segundos...`,
            );
            setTimeout(() => initializeWhatsAppWeb(retryCount + 1), 5000);
            return;
        }

        // Reset do estado em caso de erro
        client = null;
        isClientReady = false;
        clientStatus = "error";
        qrCodeData = null;

        // Tentar novamente após um tempo maior se esgotar as tentativas
        if (retryCount >= maxRetries) {
            console.log(
                "❌ Máximo de tentativas atingido. Tentando novamente em 30 segundos...",
            );
            setTimeout(() => initializeWhatsAppWeb(0), 30000);
        }
    }
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

            // Always reset state
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

        // Verificar se o número é válido com retry em caso de erro de contexto
        let isValidNumber;
        try {
            isValidNumber = await client.isRegisteredUser(phoneNumber);
        } catch (validationError) {
            if (
                validationError.message.includes(
                    "Execution context was destroyed",
                )
            ) {
                console.log(
                    "🔄 Erro de ExecutionContext na validação, tentando reinicializar...",
                );
                setTimeout(() => initializeWhatsAppWeb(), 1000);
                return res.status(503).json({
                    error: "Serviço temporariamente indisponível. Cliente WhatsApp sendo reinicializado.",
                });
            }
            throw validationError;
        }

        if (!isValidNumber) {
            return res.status(400).json({
                error: "Número não está registrado no WhatsApp",
            });
        }

        // Enviar mensagem com retry em caso de erro de contexto
        let response;
        try {
            response = await client.sendMessage(phoneNumber, formattedMessage);
        } catch (sendError) {
            if (sendError.message.includes("Execution context was destroyed")) {
                console.log(
                    "🔄 Erro de ExecutionContext no envio, tentando reinicializar...",
                );
                setTimeout(() => initializeWhatsAppWeb(), 1000);
                return res.status(503).json({
                    error: "Serviço temporariamente indisponível. Cliente WhatsApp sendo reinicializado.",
                });
            }
            throw sendError;
        }

        res.json({
            message: "Mensagem enviada com sucesso!",
            messageId: response.id._serialized,
            to: phoneNumber,
        });
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);

        // Verificar se é erro de ExecutionContext
        if (error.message.includes("Execution context was destroyed")) {
            console.log(
                "🔄 Reinicializando cliente devido a erro de ExecutionContext...",
            );
            setTimeout(() => initializeWhatsAppWeb(), 1000);
            return res.status(503).json({
                error: "Serviço temporariamente indisponível. Cliente sendo reinicializado.",
            });
        }

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
        const {
            name,
            contacts,
            canCreateTickets = false,
            canRegisterPonto = false,
            numeroTecnico,
            numeroCliente,
            individualContacts,
            user_id, // Added user_id
        } = req.body;

        if (!name || !contacts || contacts.length === 0) {
            return res.status(400).json({
                error: "Nome e lista de contactos são obrigatórios",
            });
        }

        // Se individualContacts está presente, usar esse formato (novo sistema)
        let contactsToStore;
        if (individualContacts && Array.isArray(individualContacts)) {
            contactsToStore = individualContacts.map((contact) => {
                return {
                    ...contact,
                    user_id:
                        contact.user_id || contact.userID || user_id || null, // Support both user_id and userID fields
                };
            });
        } else {
            // Formato antigo - converter strings para objetos
            contactsToStore = contacts.map((contact) => {
                if (typeof contact === "string") {
                    return {
                        phone: contact,
                        numeroTecnico: numeroTecnico || "",
                        numeroCliente: numeroCliente || "",
                        canCreateTickets: canCreateTickets || false,
                        canRegisterPonto: canRegisterPonto || false,
                        user_id: user_id || null,
                    };
                }
                return {
                    ...contact,
                    user_id:
                        contact.user_id || contact.userID || user_id || null, // Support both field names
                };
            });
        }

        const newContactList = await Contact.create({
            name,
            contacts: JSON.stringify(contactsToStore),
            can_create_tickets: canCreateTickets,
            can_register_ponto: canRegisterPonto,
            numero_tecnico: numeroTecnico || null,
            numero_cliente: numeroCliente || null,
            user_id: user_id || null,
        });

        res.json({
            message: "Lista de contactos criada com sucesso",
            contactList: {
                id: newContactList.id,
                name: newContactList.name,
                contacts: JSON.parse(newContactList.contacts),
                canCreateTickets: newContactList.can_create_tickets,
                canRegisterPonto: newContactList.can_register_ponto,
                numeroTecnico: newContactList.numero_tecnico,
                numeroCliente: newContactList.numero_cliente,
                createdAt: newContactList.created_at,
                user_id: newContactList.user_id,
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
            canCreateTickets: contact.can_create_tickets,
            canRegisterPonto: contact.can_register_ponto,
            numeroTecnico: contact.numero_tecnico,
            numeroCliente: contact.numero_cliente,
            createdAt: contact.created_at,
            user_id: contact.user_id,
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
        const {
            name,
            contacts,
            canCreateTickets,
            canRegisterPonto,
            numeroTecnico,
            numeroCliente,
            individualContacts,
            user_id, // Added user_id
        } = req.body;

        if (!name || !contacts || contacts.length === 0) {
            return res.status(400).json({
                error: "Nome e lista de contactos são obrigatórios",
            });
        }

        // Se individualContacts está presente, usar esse formato (novo sistema)
        let contactsToStore;
        if (individualContacts && Array.isArray(individualContacts)) {
            contactsToStore = individualContacts.map((contact) => {
                return {
                    ...contact,
                    user_id:
                        contact.user_id || contact.userID || user_id || null, // Support both field names and preserve existing
                };
            });
        } else {
            // Formato antigo - converter strings para objetos
            contactsToStore = contacts.map((contact) => {
                if (typeof contact === "string") {
                    return {
                        phone: contact,
                        numeroTecnico: numeroTecnico || "",
                        numeroCliente: numeroCliente || "",
                        canCreateTickets: canCreateTickets,
                        canRegisterPonto: canRegisterPonto,
                        user_id: user_id || null,
                    };
                }
                return {
                    ...contact,
                    user_id:
                        contact.user_id || contact.userID || user_id || null, // Support both field names
                };
            });
        }

        const [updated] = await Contact.update(
            {
                name,
                contacts: JSON.stringify(contactsToStore),
                can_create_tickets:
                    canCreateTickets !== undefined ? canCreateTickets : false,
                can_register_ponto:
                    canRegisterPonto !== undefined ? canRegisterPonto : false,
                numero_tecnico: numeroTecnico || null,
                numero_cliente: numeroCliente || null,
                user_id: user_id || null, // Ensure user_id is updated at contact list level too
            },
            { where: { id } },
        );

        if (updated) {
            const updatedContactList = await Contact.findByPk(id);
            res.json({
                message: "Lista de contactos atualizada com sucesso",
                contactList: {
                    id: updatedContactList.id,
                    name: updatedContactList.name,
                    contacts: JSON.parse(updatedContactList.contacts),
                    canCreateTickets: updatedContactList.can_create_tickets,
                    canRegisterPonto: updatedContactList.can_register_ponto,
                    numeroTecnico: updatedContactList.numero_tecnico,
                    numeroCliente: updatedContactList.numero_cliente,
                    createdAt: updatedContactList.created_at,
                    user_id: updatedContactList.user_id,
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
    WAITING_CONTRACT: "waiting_contract",
    WAITING_PROBLEM: "waiting_problem",
    WAITING_REPRODUCE: "waiting_reproduce",
    WAITING_PRIORITY: "waiting_priority",
    WAITING_STATE: "waiting_state",
    WAITING_CONFIRMATION: "waiting_confirmation",
    // Estados para registo de ponto
    PONTO_WAITING_OBRA: "ponto_waiting_obra",
    PONTO_WAITING_CONFIRMATION: "ponto_waiting_confirmation",
    PONTO_WAITING_LOCATION: "ponto_waiting_location",
};

// Função para verificar se o contacto tem autorização para criar pedidos e obter dados do contacto
async function checkContactAuthorization(phoneNumber) {
    try {
        // Remover formatação do número
        const cleanPhoneNumber = phoneNumber
            .replace("@c.us", "")
            .replace(/\D/g, "");

        // Buscar em todas as listas de contactos que permitem criação de tickets
        const contactLists = await Contact.findAll();

        for (const list of contactLists) {
            const contacts = JSON.parse(list.contacts);

            // Verificar se é formato novo (objetos) ou antigo (strings)
            for (const contact of contacts) {
                let contactPhone, contactData;

                if (typeof contact === "object") {
                    // Formato novo - cada contacto tem dados individuais
                    contactPhone = contact.phone?.replace(/\D/g, "");
                    contactData = {
                        numeroCliente:
                            contact.numeroCliente || list.numero_cliente,
                        numeroTecnico:
                            contact.numeroTecnico || list.numero_tecnico,
                        listName: list.name,
                        canCreateTickets: contact.canCreateTickets,
                        userId: contact.user_id || list.user_id,
                    };
                } else {
                    // Formato antigo - dados globais da lista
                    contactPhone = contact.replace(/\D/g, "");
                    contactData = {
                        numeroCliente: list.numero_cliente,
                        numeroTecnico: list.numero_tecnico,
                        listName: list.name,
                        canCreateTickets: list.can_create_tickets,
                        userId: list.user_id,
                    };
                }

                // Verificar se o número coincide e se tem autorização
                if (
                    (contactPhone?.includes(cleanPhoneNumber) ||
                        cleanPhoneNumber.includes(contactPhone)) &&
                    contactData.canCreateTickets
                ) {
                    return {
                        authorized: true,
                        contactData: contactData,
                    };
                }
            }
        }

        return { authorized: false, contactData: null };
    } catch (error) {
        console.error("Erro ao verificar autorização do contacto:", error);
        return { authorized: false, contactData: null };
    }
}

// Função para verificar se o contacto tem autorização para registo de ponto
async function checkPontoAuthorization(phoneNumber) {
    try {
        // Remover formatação do número
        const cleanPhoneNumber = phoneNumber
            .replace("@c.us", "")
            .replace(/\D/g, "");

        console.log(
            `🔍 Verificando autorização para número: ${cleanPhoneNumber}`,
        );

        // Buscar em todas as listas de contactos
        const contactLists = await Contact.findAll();

        for (const list of contactLists) {
            console.log(`📋 Verificando lista: ${list.name}`);
            const contacts = JSON.parse(list.contacts);

            // Verificar se é formato novo (objetos) ou antigo (strings)
            for (const contact of contacts) {
                let contactPhone, contactData;

                if (typeof contact === "object") {
                    // Formato novo - cada contacto tem dados individuais
                    contactPhone = contact.phone?.replace(/\D/g, "");
                    contactData = {
                        listName: list.name,
                        canRegisterPonto: contact.canRegisterPonto,
                        userId: contact.user_id, // Importante: extrair user_id
                    };
                    console.log(
                        `🔍 Contacto objeto - Phone: ${contactPhone}, UserID: ${contact.user_id}, CanRegisterPonto: ${contact.canRegisterPonto}`,
                    );
                } else {
                    // Formato antigo - dados globais da lista
                    contactPhone = contact.replace(/\D/g, "");
                    contactData = {
                        listName: list.name,
                        canRegisterPonto: list.can_register_ponto,
                        userId: list.user_id, // Usar user_id da lista como fallback
                    };
                    console.log(
                        `🔍 Contacto string - Phone: ${contactPhone}, ListUserID: ${list.user_id}, CanRegisterPonto: ${list.can_register_ponto}`,
                    );
                }

                // Verificar se o número coincide (comparação mais flexível)
                const phoneMatch =
                    contactPhone &&
                    (contactPhone === cleanPhoneNumber ||
                        contactPhone.includes(cleanPhoneNumber) ||
                        cleanPhoneNumber.includes(contactPhone) ||
                        contactPhone.endsWith(cleanPhoneNumber.slice(-9)) || // Últimos 9 dígitos
                        cleanPhoneNumber.endsWith(contactPhone.slice(-9)));

                console.log(
                    `📞 Comparando phones: ${contactPhone} vs ${cleanPhoneNumber} = ${phoneMatch}`,
                );

                if (phoneMatch && contactData.canRegisterPonto) {
                    console.log(
                        `✅ Autorização encontrada! UserID: ${contactData.userId}`,
                    );

                    // Verificar se tem user_id válido
                    if (!contactData.userId) {
                        console.error(
                            `❌ Contacto encontrado mas sem user_id válido`,
                        );
                        return {
                            authorized: false,
                            contactData: null,
                            error: "Contacto não tem user_id configurado",
                        };
                    }

                    return {
                        authorized: true,
                        contactData: contactData,
                    };
                }
            }
        }

        console.log(
            `❌ Nenhuma autorização encontrada para ${cleanPhoneNumber}`,
        );
        return {
            authorized: false,
            contactData: null,
            error: "Número não encontrado nas listas de contactos ou sem autorização",
        };
    } catch (error) {
        console.error(
            "Erro ao verificar autorização de ponto do contacto:",
            error,
        );
        return {
            authorized: false,
            contactData: null,
            error: error.message,
        };
    }
}

// Função para lidar com mensagens recebidas
async function handleIncomingMessage(message) {
    // Ignorar mensagens de grupos e mensagens enviadas por nós
    if (message.from.includes("@g.us") || message.fromMe) {
        return;
    }

    const phoneNumber = message.from;
    const messageText = message.body.trim();

    console.log(`📥 Mensagem recebida de ${phoneNumber}: ${messageText}`);

    // Verificar se é uma mensagem de localização
    if (message.hasLocation) {
        console.log(
            `📍 Localização recebida de ${phoneNumber}: ${message.location.latitude}, ${message.location.longitude}`,
        );
        // A localização será tratada pelo listener específico em processarRegistoPonto
        return;
    }

    // Verificar se existe uma conversa ativa
    let conversation = activeConversations.get(phoneNumber);

    // Se a mensagem contém palavras-chave para iniciar pedido (mesmo com conversa ativa)
    if (isRequestKeyword(messageText)) {
        // Se já existe uma conversa, cancela-la primeiro
        if (conversation) {
            activeConversations.delete(phoneNumber);
            console.log(
                `🔄 Conversa anterior cancelada para ${phoneNumber} - iniciando novo pedido`,
            );
        }

        // Verificar autorização antes de iniciar o pedido
        const authResult = await checkContactAuthorization(phoneNumber);

        if (!authResult.authorized) {
            await client.sendMessage(
                phoneNumber,
                "❌ *Acesso Restrito*\n\nLamentamos, mas o seu contacto não tem autorização para criar pedidos de assistência técnica através deste sistema.\n\nPara obter acesso, entre em contacto com a nossa equipa através dos canais habituais.\n\n📞 Obrigado pela compreensão.",
            );
            return;
        }

        await startNewRequest(phoneNumber, messageText, authResult.contactData);
        return;
    }

    // Se a mensagem contém palavras-chave para registo de ponto
    if (isPontoKeyword(messageText)) {
        // Se já existe uma conversa, cancela-la primeiro
        if (conversation) {
            activeConversations.delete(phoneNumber);
            console.log(
                `🔄 Conversa anterior cancelada para ${phoneNumber} - iniciando registo de ponto`,
            );
        }

        // Verificar autorização antes de iniciar o registo de ponto
        const pontoAuthResult = await checkPontoAuthorization(phoneNumber);

        if (!pontoAuthResult.authorized) {
            let errorMessage = "❌ *Erro de Configuração*\n\n";

            if (
                pontoAuthResult.error === "Contacto não tem user_id configurado"
            ) {
                errorMessage +=
                    "O seu contacto foi encontrado mas não tem um utilizador (user_id) configurado.\n\n";
                errorMessage += "📋 **Detalhes do problema:**\n";
                errorMessage += "• O contacto existe nas listas\n";
                errorMessage += "• Tem autorização para registo de ponto\n";
                errorMessage += "• **MAS** não tem user_id associado\n\n";
                errorMessage +=
                    "👨‍💻 **Solução:** Contacte o administrador para configurar o user_id no seu contacto.";
            } else if (
                pontoAuthResult.error ===
                "Número não encontrado nas listas de contactos ou sem autorização"
            ) {
                errorMessage +=
                    "O seu número não foi encontrado nas listas de contactos ou não tem autorização para registo de ponto.\n\n";
                errorMessage += "📋 **Verifique se:**\n";
                errorMessage +=
                    "• O número está registado nas listas de contactos\n";
                errorMessage +=
                    "• Tem a opção 'Autorizar registo de ponto' ativada\n\n";
                errorMessage +=
                    "👨‍💻 **Solução:** Contacte o administrador para verificar as suas permissões.";
            } else {
                errorMessage +=
                    "Não foi possível identificar o utilizador associado a este contacto.\n\n";
                errorMessage += `**Erro técnico:** ${pontoAuthResult.error || "Erro desconhecido"}\n\n`;
                errorMessage +=
                    "👨‍💻 **Solução:** Contacte o administrador para verificar a configuração do seu contacto.";
            }

            await client.sendMessage(phoneNumber, errorMessage);
            return;
        }

        await startPontoRegistration(
            phoneNumber,
            messageText,
            pontoAuthResult.contactData,
        );
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
    const keywords = ["pedido"];

    const lowerMessage = message.toLowerCase();
    return keywords.some((keyword) => lowerMessage.includes(keyword));
}

// Verificar se a mensagem contém palavras-chave para registo de ponto
function isPontoKeyword(message) {
    const keywords = ["ponto", "entrada", "saida", "picar"];

    const lowerMessage = message.toLowerCase();
    return keywords.some((keyword) => lowerMessage.includes(keyword));
}

// Iniciar novo pedido de assistência
async function startNewRequest(
    phoneNumber,
    initialMessage,
    contactData = null,
) {
    let conversationState = CONVERSATION_STATES.WAITING_CLIENT;
    let conversationData = {
        initialProblem: initialMessage,
        datahoraabertura: new Date()
            .toISOString()
            .replace("T", " ")
            .slice(0, 19),
    };

    // Pré-preencher dados do contacto se disponível
    if (contactData && contactData.numeroTecnico) {
        conversationData.tecnico = contactData.numeroTecnico;
    }
    if (contactData && contactData.userId) {
        conversationData.userId = contactData.userId;
    }

    let welcomeMessage = `🤖 *Sistema de Pedidos de Assistência Técnica*

Bem-vindo ao sistema automático de criação de pedidos de assistência técnica da Advir.`;

    // Verificar se havia uma conversa anterior (para informar que foi cancelada)
    const hadPreviousConversation = activeConversations.has(phoneNumber);
    if (hadPreviousConversation) {
        welcomeMessage += `\n\n🔄 *Conversa anterior cancelada* - Iniciando novo pedido.`;
    }

    if (contactData && contactData.numeroCliente) {
        // Cliente já está definido - buscar contratos
        conversationData.cliente = contactData.numeroCliente;
        conversationData.nomeCliente = contactData.numeroCliente;

        // Buscar contratos do cliente
        const resultadoContratos = await buscarContratosCliente(
            contactData.numeroCliente,
        );

        if (resultadoContratos.contratosAtivos.length === 0) {
            // Sem contratos ativos - ir direto para o problema
            conversationState = CONVERSATION_STATES.WAITING_PROBLEM;
            welcomeMessage += `\n\n✅ Cliente identificado: *${contactData.numeroCliente}*
⚠️ *Atenção:* Não foram encontrados contratos ativos para este cliente.

*1. Descrição do Problema*
Por favor, descreva detalhadamente o problema ou situação que necessita de assistência técnica:`;
        } else if (resultadoContratos.contratosAtivos.length === 1) {
            // Apenas um contrato ativo - selecionar automaticamente
            const contrato = resultadoContratos.contratosAtivos[0];
            conversationData.contratoID = contrato.ID;
            conversationState = CONVERSATION_STATES.WAITING_PROBLEM;

            const horasDisponiveis = (
                contrato.HorasTotais - contrato.HorasGastas
            ).toFixed(2);
            welcomeMessage += `\n\n✅ Cliente identificado: *${contactData.numeroCliente}*
✅ Contrato selecionado automaticamente: *${contrato.Descricao}*
📊 Horas disponíveis: *${horasDisponiveis}h*

*1. Descrição do Problema*
Por favor, descreva detalhadamente o problema ou situação que necessita de assistência técnica:`;
        } else {
            // Múltiplos contratos ativos - pedir para escolher
            conversationData.contratosDisponiveis =
                resultadoContratos.contratosAtivos;
            conversationState = CONVERSATION_STATES.WAITING_CONTRACT;

            welcomeMessage += `\n\n✅ Cliente identificado: *${contactData.numeroCliente}*

e Foram encontrados múltiplos contratos ativos. Por favor, escolha um dos contratos abaixo digitando o número correspondente:

`;

            resultadoContratos.contratosAtivos.forEach((contrato, index) => {
                const horasDisponiveis = (
                    contrato.HorasTotais - contrato.HorasGastas
                ).toFixed(2);
                welcomeMessage += `*${index + 1}.* ${contrato.Descricao}\n`;
                welcomeMessage += `   📊 Horas disponíveis: ${horasDisponiveis}h\n`;
                welcomeMessage += `   📅 Válido até: ${new Date(contrato.PeriodoFim).toLocaleDateString("pt-PT")}\n\n`;
            });

            welcomeMessage += `Digite o número do contrato pretendido (1-${resultadoContratos.contratosAtivos.length}):`;
        }
    } else {
        // Se não tem cliente definido, pedir código do cliente
        welcomeMessage += `\n\nPara iniciarmos o processo de registo do seu pedido, necessitamos das seguintes informações:

*1. Código do Cliente*
Indique o código do cliente para podermos proceder com o registo.`;
    }

    welcomeMessage += `\n\n💡 _Pode digitar "cancelar" a qualquer momento para interromper o processo_`;

    const conversation = {
        state: conversationState,
        data: conversationData,
        lastActivity: Date.now(),
    };

    activeConversations.set(phoneNumber, conversation);
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
        case CONVERSATION_STATES.WAITING_CONTRACT:
            await handleContractInput(phoneNumber, message, conversation);
            break;
        case CONVERSATION_STATES.WAITING_PROBLEM:
            await handleProblemInput(phoneNumber, message, conversation);
            break;
        case CONVERSATION_STATES.WAITING_PRIORITY:
            await handlePriorityInput(phoneNumber, message, conversation);
            break;
        case CONVERSATION_STATES.WAITING_CONFIRMATION:
            await handleConfirmationInput(phoneNumber, message, conversation);
            break;
        // Estados para registo de ponto
        case CONVERSATION_STATES.PONTO_WAITING_OBRA:
            await handlePontoObraInput(phoneNumber, message, conversation);
            break;
        case CONVERSATION_STATES.PONTO_WAITING_CONFIRMATION:
            await handlePontoConfirmationInput(
                phoneNumber,
                message,
                conversation,
            );
            break;
        case CONVERSATION_STATES.PONTO_WAITING_LOCATION:
            await handlePontoLocationInput(phoneNumber, message, conversation);
            break;
    }

    conversation.lastActivity = Date.now();
    activeConversations.set(phoneNumber, conversation);
}

// Função para validar se o cliente existe no sistema Primavera
const validarCliente = async (nomeCliente) => {
    try {
        const token = await getAuthToken(
            {
                username: "AdvirWeb",
                password: "Advir2506##",
                company: "Advir",
                instance: "DEFAULT",
                line: "Evolution",
            },
            "151.80.149.159:2018",
        );

        const response = await fetch(
            "http://151.80.149.159:2018/WebApi/Base/LstClientes",
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            },
        );

        const responseData = await response.json();
        console.log("📡 Resposta da API:", responseData);

        const clientes = responseData.DataSet ? responseData.DataSet.Table : [];

        if (!Array.isArray(clientes) || clientes.length === 0) {
            console.error(
                "❌ Não foram encontrados clientes na resposta da API",
            );
            return { existe: false, cliente: null, sugestoes: [] };
        }

        // Procurar cliente pelo nome ou código
        const clienteEncontrado = clientes.find(
            (cliente) =>
                cliente &&
                (cliente.Nome.toLowerCase().includes(
                    nomeCliente.toLowerCase(),
                ) ||
                    cliente.Cliente === nomeCliente),
        );

        if (clienteEncontrado) {
            console.log("✅ Cliente encontrado:", clienteEncontrado);
            return { existe: true, cliente: clienteEncontrado, sugestoes: [] };
        }

        // Sugestões
        const sugestoes = clientes
            .filter((cliente) => cliente && cliente.Nome)
            .filter(
                (cliente) =>
                    cliente.Nome.toLowerCase().includes(
                        nomeCliente.toLowerCase().substring(0, 3),
                    ) || cliente.Cliente === nomeCliente,
            )
            .slice(0, 5)
            .map(
                (cliente) =>
                    `${cliente.Cliente || "N/A"} - ${cliente.Nome || "N/A"}`,
            );

        console.log("⚠️ Cliente não encontrado. Sugestões:", sugestoes);
        return {
            existe: false,
            cliente: null,
            sugestoes: sugestoes,
        };
    } catch (error) {
        console.error("❌ Erro ao validar cliente:", error);
        return { existe: false, cliente: null, sugestoes: [] };
    }
};

// Função para buscar contratos do cliente
const buscarContratosCliente = async (clienteId) => {
    try {
        const token = await getAuthToken(
            {
                username: "AdvirWeb",
                password: "Advir2506##",
                company: "Advir",
                instance: "DEFAULT",
                line: "Evolution",
            },
            "151.80.149.159:2018",
        );

        const response = await fetch(
            `http://151.80.149.159:2018/WebApi/ServicosTecnicos/ObterInfoContrato/${clienteId}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            },
        );

        const responseData = await response.json();
        console.log("📡 Resposta contratos da API:", responseData);

        const contratos = responseData.DataSet
            ? responseData.DataSet.Table
            : [];

        if (!Array.isArray(contratos) || contratos.length === 0) {
            console.log(
                "⚠️ Nenhum contrato encontrado para o cliente:",
                clienteId,
            );
            return { contratos: [], contratosAtivos: [] };
        }

        // Filtrar apenas contratos ativos (Estado === 3 e Cancelado === false)
        const contratosAtivos = contratos.filter(
            (contrato) => contrato.Estado === 3 && contrato.Cancelado === false,
        );

        console.log(
            `✅ Encontrados ${contratos.length} contratos, ${contratosAtivos.length} ativos para cliente ${clienteId}`,
        );

        return {
            contratos: contratos,
            contratosAtivos: contratosAtivos,
        };
    } catch (error) {
        console.error("❌ Erro ao buscar contratos:", error);
        return { contratos: [], contratosAtivos: [] };
    }
};
async function startPontoRegistration(
    phoneNumber,
    initialMessage,
    contactData = null,
) {
    let conversationData = {
        initialMessage: initialMessage,
        timestamp: new Date().toISOString(),
        userId: contactData?.userId, // Predefinir com o user_id do contacto
        userName: null,
        obrasDisponiveis: [],
        obraId: null,
        obraNome: null,
    };

    let welcomeMessage = `🕐 *Sistema de Registo de Ponto*

Bem-vindo ao sistema automático de registo de ponto da Advir.`;

    // Verificar se havia uma conversa anterior
    const hadPreviousConversation = activeConversations.has(phoneNumber);
    if (hadPreviousConversation) {
        welcomeMessage += `\n\n🔄 *Conversa anterior cancelada* - Iniciando registo de ponto.`;
    }

    welcomeMessage += `\n\n💡 _Pode digitar "cancelar" a qualquer momento para interromper o processo_`;

    // Se temos o user_id do contacto, buscar as obras diretamente
    if (contactData?.userId) {
        try {
            // Buscar utilizador na base de dados
            const User = require("../models/user");
            const user = await User.findByPk(contactData.userId);

            if (user) {
                conversationData.userName = user.nome;
                console.log(
                    `✅ Utilizador encontrado: ${user.nome} (ID: ${contactData.userId})`,
                );

                // Buscar obras disponíveis do backend local
                try {
                    const Obra = require("../models/obra");

                    console.log(
                        `🔍 Buscando obras do backend local para utilizador: ${user.nome}`,
                    );

                    // Buscar obras ativas da base de dados local
                    const obras = await Obra.findAll({
                        where: {
                            estado: 'Ativo'
                        },
                        attributes: ['id', 'codigo', 'nome', 'localizacao'],
                        order: [['nome', 'ASC']]
                    });

                    console.log(`📋 Encontradas ${obras.length} obras ativas no backend local`);

                    if (!obras || obras.length === 0) {
                        console.log(
                            `⚠️ Nenhuma obra ativa encontrada para utilizador ${user.nome}`,
                        );

                        // Continuar sem obra específica
                        let response = `✅ *Utilizador identificado:* ${user.nome}\n\n`;
                        response += `⚠️ *Nota:* Não foram encontradas obras ativas no sistema.\n`;
                        response += `O registo será efetuado sem obra específica.\n\n`;
                        response += `Escolha o tipo de registo:\n`;
                        response += `• Digite "1" para ENTRADA\n`;
                        response += `• Digite "2" para SAÍDA\n\n`;
                        response += `Digite sua escolha (1 ou 2):`;

                        conversationData.obraId = null;
                        conversationData.obraNome = "Sem obra específica";

                        const conversation = {
                            state: CONVERSATION_STATES.PONTO_WAITING_CONFIRMATION,
                            data: conversationData,
                            lastActivity: Date.now(),
                        };
                        activeConversations.set(phoneNumber, conversation);
                        await client.sendMessage(phoneNumber, response);
                        return;
                    }

                    let response = `✅ *Utilizador identificado:* ${user.nome}\n\n`;

                    if (obras.length === 1) {
                        // Uma única obra - selecionar automaticamente
                        conversationData.obraId = obras[0].id; // Usar id (inteiro) da base de dados local
                        conversationData.obraNome = obras[0].nome;

                        response += `🏗️ *Obra:* ${obras[0].codigo} - ${obras[0].nome}\n\n`;
                        response += `Escolha o tipo de registo:\n`;
                        response += `• Digite "1" para ENTRADA\n`;
                        response += `• Digite "2" para SAÍDA\n\n`;
                        response += `Digite sua escolha (1 ou 2):`;

                        const conversation = {
                            state: CONVERSATION_STATES.PONTO_WAITING_CONFIRMATION,
                            data: conversationData,
                            lastActivity: Date.now(),
                        };
                        activeConversations.set(phoneNumber, conversation);
                    } else {
                        // Múltiplas obras - pedir para escolher
                        conversationData.obrasDisponiveis = obras;

                        response += `🏗️ Foram encontradas múltiplas obras. Por favor, escolha digitando o número correspondente:\n\n`;

                        obras.forEach((obra, index) => {
                            response += `*${index + 1}.* ${obra.codigo} - ${obra.nome}\n`;
                            if (obra.localizacao) {
                                response += `   📍 ${obra.localizacao}\n`;
                            }
                            response += `\n`;
                        });

                        response += `Digite o número da obra pretendida (1-${obras.length}):`;

                        const conversation = {
                            state: CONVERSATION_STATES.PONTO_WAITING_OBRA,
                            data: conversationData,
                            lastActivity: Date.now(),
                        };
                        activeConversations.set(phoneNumber, conversation);
                    }

                    await client.sendMessage(phoneNumber, response);
                    return;
                } catch (obrasError) {
                    console.error("❌ Erro ao buscar obras do backend local:", obrasError);

                    // Continuar sem obra específica em caso de erro
                    let response = `✅ *Utilizador identificado:* ${user.nome}\n\n`;
                    response += `⚠️ *Nota:* Erro ao obter lista de obras do sistema.\n`;
                    response += `O registo será efetuado sem obra específica.\n\n`;
                    response += `Escolha o tipo de registo:\n`;
                    response += `• Digite "1" para ENTRADA\n`;
                    response += `• Digite "2" para SAÍDA\n\n`;
                    response += `Digite sua escolha (1 ou 2):`;

                    conversationData.obraId = null;
                    conversationData.obraNome = "Sem obra específica";

                    const conversation = {
                        state: CONVERSATION_STATES.PONTO_WAITING_CONFIRMATION,
                        data: conversationData,
                        lastActivity: Date.now(),
                    };
                    activeConversations.set(phoneNumber, conversation);
                    await client.sendMessage(phoneNumber, response);
                    return;
                }
            }
        } catch (error) {
            console.error("Erro ao buscar dados do utilizador:", error);
        }
    }

    // Se não conseguiu obter o user_id do contacto, mostrar erro
    await client.sendMessage(
        phoneNumber,
        `❌ *Erro de Configuração*\n\nNão foi possível identificar o utilizador associado a este contacto.\n\nContacte o administrador para verificar se o seu contacto tem um user_id configurado.`,
    );
}
// Função removida - já não é necessária pois o user_id vem do contacto

async function handlePontoConfirmationInput(
    phoneNumber,
    message,
    conversation,
) {
    const escolha = message.trim();
    let tipo;

    if (escolha === "1" || escolha.toLowerCase() === "entrada") {
        tipo = "entrada";
    } else if (
        escolha === "2" ||
        escolha.toLowerCase() === "saida" ||
        escolha.toLowerCase() === "saída"
    ) {
        tipo = "saida";
    } else {
        await client.sendMessage(
            phoneNumber,
            `❌ Escolha inválida. Digite "1" para ENTRADA ou "2" para SAÍDA:`,
        );
        return;
    }

    // Armazenar tipo de registo na conversa
    conversation.data.tipoRegisto = tipo;

    const tipoTexto = tipo === "entrada" ? "ENTRADA" : "SAÍDA";

    await client.sendMessage(
        phoneNumber,
        `✅ Tipo de registo selecionado: **${tipoTexto}**\n\n📍 Agora vou solicitar a sua localização para registar o ponto com precisão.\n\n⏰ Por favor aguarde...`,
    );

    // Registar o ponto (que agora solicita localização real)
    await processarRegistoPonto(phoneNumber, conversation, tipo);

    // Limpar conversa
    activeConversations.delete(phoneNumber);
}

// Nota: Handlers de localização removidos - localização é agora automática

async function processarRegistoPonto(phoneNumber, conversation, tipo) {
    try {
        // Verificar se temos o user_id necessário
        if (!conversation.data.userId) {
            throw new Error("ID do utilizador não encontrado");
        }

        // Obter localização automaticamente com múltiplos métodos
        let latitude = 38.736946; // Fallback para Lisboa
        let longitude = -9.142685;
        let endereco = "Localização automática";
        let localizacaoObtida = false;

        console.log(
            `🔍 Tentando obter localização automática para ${phoneNumber}`,
        );

        // Método 1: Tentar obter localização do perfil do WhatsApp
        try {
            const contact = await client.getContactById(phoneNumber);
            if (contact && contact.profilePicUrl) {
                // Se tem foto de perfil, verificar se tem dados de localização
                const chat = await client.getChatById(phoneNumber);
                if (chat && chat.lastMessage && chat.lastMessage.location) {
                    latitude = chat.lastMessage.location.latitude;
                    longitude = chat.lastMessage.location.longitude;
                    endereco = "Localização da última mensagem";
                    localizacaoObtida = true;
                    console.log(
                        `✅ Localização obtida da última mensagem: ${latitude}, ${longitude}`,
                    );
                }
            }
        } catch (profileError) {
            console.log("📱 Não foi possível obter localização do perfil/chat");
        }

        // Método 2: Se não conseguiu pelo método 1, tentar IP geolocation
        if (!localizacaoObtida) {
            try {
                // Simular obtenção de localização via IP (em ambiente real, usaria a API do WhatsApp Business)
                const response = await fetch("http://ip-api.com/json/", {
                    timeout: 5000,
                });

                if (response.ok) {
                    const geoData = await response.json();
                    if (geoData.status === "success") {
                        latitude = geoData.lat;
                        longitude = geoData.lon;
                        endereco = `${geoData.city}, ${geoData.country}`;
                        localizacaoObtida = true;
                        console.log(
                            `🌍 Localização obtida por IP: ${endereco} (${latitude}, ${longitude})`,
                        );
                    }
                }
            } catch (ipError) {
                console.log(
                    "🌐 Erro ao obter localização por IP:",
                    ipError.message,
                );
            }
        }

        // Método 3: Se ainda não conseguiu, solicitar localização manual (mais rápido)
        if (!localizacaoObtida) {
            try {
                await client.sendMessage(
                    phoneNumber,
                    "📍 A solicitar localização atual...",
                );

                // Aguardar pela localização (timeout reduzido para 15 segundos)
                const locationPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(
                            new Error("Timeout - usando localização padrão"),
                        );
                    }, 15000);

                    // Listener temporário para localização
                    const locationHandler = (message) => {
                        if (
                            message.from === phoneNumber &&
                            message.hasLocation
                        ) {
                            clearTimeout(timeout);
                            client.removeListener("message", locationHandler);
                            resolve({
                                latitude: message.location.latitude,
                                longitude: message.location.longitude,
                                description:
                                    message.location.description ||
                                    "Localização partilhada",
                            });
                        }
                    };

                    client.on("message", locationHandler);

                    // Auto-request location if WhatsApp Web supports it
                    setTimeout(async () => {
                        try {
                            await client.sendMessage(
                                phoneNumber,
                                "📲 Por favor, partilhe a sua localização atual para registar o ponto com precisão.",
                            );
                        } catch (e) { }
                    }, 2000);
                });

                const location = await locationPromise;
                latitude = location.latitude;
                longitude = location.longitude;
                endereco = location.description;
                localizacaoObtida = true;
                console.log(
                    `📍 Localização obtida manualmente: ${latitude}, ${longitude} - ${endereco}`,
                );
            } catch (locationError) {
                console.log(
                    `⚠️ Falhou obtenção manual: ${locationError.message}`,
                );
            }
        }

        // Se ainda não conseguiu obter localização, usar coordenadas da empresa/obra se disponível
        if (!localizacaoObtida && conversation.data.obraId) {
            try {
                // Buscar coordenadas da obra se disponível
                const token = await getAuthToken(
                    {
                        username: "AdvirWeb",
                        password: "Advir2506##",
                        company: "Advir",
                        instance: "DEFAULT",
                        line: "Evolution",
                    },
                    "151.80.149.159:2018",
                );

                const obraResponse = await fetch(
                    `http://151.80.149.159:2018/WebApi/Obras/ObterObra/${conversation.data.obraId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    },
                );

                if (obraResponse.ok) {
                    const obraData = await obraResponse.json();
                    if (obraData && obraData.Latitude && obraData.Longitude) {
                        latitude = obraData.Latitude;
                        longitude = obraData.Longitude;
                        endereco = `Localização da obra: ${conversation.data.obraNome}`;
                        localizacaoObtida = true;
                        console.log(
                            `🏗️ Localização obtida da obra: ${endereco}`,
                        );
                    }
                }
            } catch (obraError) {
                console.log(
                    "🏗️ Erro ao obter localização da obra:",
                    obraError.message,
                );
            }
        }

        // Método final: Usar coordenadas padrão se nada funcionou
        if (!localizacaoObtida) {
            endereco = "Localização padrão (Lisboa)";
            console.log("📍 Usando localização padrão de Lisboa");
        }

        console.log(
            `📍 Localização final: ${endereco} (${latitude}, ${longitude})`,
        );

        // Informar o utilizador sobre a localização usada
        const tipoLocalizacao = localizacaoObtida
            ? "obtida automaticamente"
            : "padrão";
        await client.sendMessage(
            phoneNumber,
            `📍 Localização ${tipoLocalizacao}: ${endereco}`,
        );

        // Aguardar um pouco para o utilizador ver a mensagem
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Usar o controller de registo de ponto obra existente
        const registoPontoObraController = require("../controllers/registoPontoObraControllers");

        // Buscar dados do utilizador
        const User = require("../models/user");
        const user = await User.findByPk(conversation.data.userId);

        if (!user) {
            throw new Error("Utilizador não encontrado");
        }

        // Simular um request object para o controller
        const mockReq = {
            user: { id: conversation.data.userId },
            body: {
                tipo: tipo,
                obra_id: conversation.data.obraId,
                latitude: latitude.toString(),
                longitude: longitude.toString(),
            },
        };

        // Simular response object que captura o resultado
        let controllerResult = null;
        let controllerError = null;
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    controllerResult = { status: code, data: data };
                    console.log(`Controller response - Status: ${code}`, data);
                    return data;
                },
            }),
            json: (data) => {
                controllerResult = { status: 200, data: data };
                console.log("Controller response:", data);
                return data;
            },
        };

        // Chamar o controller de registo de ponto obra
        try {
            await registoPontoObraController.registarPonto(mockReq, mockRes);

            // Verificar se o registo foi bem-sucedido
            if (!controllerResult || (controllerResult.status !== 200 && controllerResult.status !== 201)) {
                throw new Error('Controller não retornou sucesso');
            }

            console.log('✅ Ponto registado com sucesso na base de dados:', controllerResult);
        } catch (controllerErr) {
            console.error('❌ Erro no controller de registo de ponto:', controllerErr);
            controllerError = controllerErr;
            throw new Error(`Erro ao registar na base de dados: ${controllerErr.message}`);
        }

        // Mensagem de sucesso
        const tipoTexto = tipo === "entrada" ? "ENTRADA" : "SAÍDA";
        const emoji = tipo === "entrada" ? "🟢" : "🔴";

        const successMessage = `${emoji} *PONTO REGISTADO COM SUCESSO*

**Utilizador:** ${conversation.data.userName} (ID: ${conversation.data.userId})
**Empresa:** ${user.empresaPredefinida || "Advir"}
**Obra:** ${conversation.data.obraNome || "N/A"}
**Tipo:** ${tipoTexto}
**Data/Hora:** ${new Date().toLocaleString("pt-PT")}
**Localização:** ${endereco}

O seu registo foi efetuado com sucesso no sistema AdvirLink.

Obrigado por utilizar o sistema.`;

        await client.sendMessage(phoneNumber, successMessage);

        // Log para debug
        console.log(
            `✅ Ponto registado via WhatsApp: ${conversation.data.userName} (ID: ${conversation.data.userId}) - ${tipoTexto} - Obra: ${conversation.data.obraNome || "N/A"} - Localização: ${latitude}, ${longitude}`,
        );

        return { success: true };
    } catch (error) {
        console.error("Erro ao registar ponto:", error);

        await client.sendMessage(
            phoneNumber,
            `❌ *Erro ao Registar Ponto*

Ocorreu um erro ao registar o seu ponto. Por favor, tente novamente mais tarde ou contacte o suporte técnico.

Detalhes do erro: ${error.message}

ID do utilizador: ${conversation.data.userId || "Não encontrado"}`,
        );

        return { success: false, error: error.message };
    } finally {
        // Limpar conversa
        activeConversations.delete(phoneNumber);
    }
}
async function handlePontoObraInput(phoneNumber, message, conversation) {
    const escolha = parseInt(message.trim());
    const obras = conversation.data.obrasDisponiveis;

    if (isNaN(escolha) || escolha < 1 || escolha > obras.length) {
        await client.sendMessage(
            phoneNumber,
            `❌ Escolha inválida. Por favor, digite um número entre 1 e ${obras.length}:`,
        );
        return;
    }

    // Obra selecionada
    const obraSelecionada = obras[escolha - 1];
    conversation.data.obraId = obraSelecionada.id; // Usar id (inteiro) em vez de ID
    conversation.data.obraNome = obraSelecionada.nome; // Usar nome em vez de Descricao
    conversation.state = CONVERSATION_STATES.PONTO_WAITING_CONFIRMATION;

    const response = `✅ Obra selecionada: *${obraSelecionada.codigo} - ${obraSelecionada.nome}*\n\n*Confirmar Registo de Ponto*\nEscolha o tipo de registo:\n• Digite "1" para ENTRADA\n• Digite "2" para SAÍDA\n\nDigite sua escolha (1 ou 2):`;

    await client.sendMessage(phoneNumber, response);

    // Limpar lista de obras para economizar memória
    delete conversation.data.obrasDisponiveis;
}
async function handleClientInput(phoneNumber, message, conversation) {
    const nomeCliente = message.trim();

    // Validar se o cliente existe
    const validacao = await validarCliente(nomeCliente);
    if (validacao.existe) {
        // Cliente encontrado - buscar contratos
        conversation.data.cliente = validacao.cliente.Cliente;
        conversation.data.nomeCliente = validacao.cliente.Nome;
        conversation.data.contacto = null; // por defeito
        conversation.data.userId = validacao.cliente.userId; // Tenta obter userId do cliente

        // Buscar contratos do cliente
        const resultadoContratos = await buscarContratosCliente(
            validacao.cliente.Cliente,
        );

        if (resultadoContratos.contratosAtivos.length === 0) {
            // Sem contratos ativos - continuar sem contrato
            conversation.state = CONVERSATION_STATES.WAITING_PROBLEM;
            const response = `✅ Cliente encontrado: *${validacao.cliente.Cliente} - ${validacao.cliente.Nome}*

⚠️ *Atenção:* Não foram encontrados contratos ativos para este cliente.

*2. Descrição do Problema*
Por favor, descreva detalhadamente o problema ou situação que necessita de assistência técnica:`;

            await client.sendMessage(phoneNumber, response);
        } else if (resultadoContratos.contratosAtivos.length === 1) {
            // Apenas um contrato ativo - selecionar automaticamente
            const contrato = resultadoContratos.contratosAtivos[0];
            conversation.data.contratoID = contrato.ID;
            conversation.state = CONVERSATION_STATES.WAITING_PROBLEM;

            const horasDisponiveis = (
                contrato.HorasTotais - contrato.HorasGastas
            ).toFixed(2);

            const response = `✅ Cliente encontrado: *${validacao.cliente.Cliente} - ${validacao.cliente.Nome}*
✅ Contrato selecionado automaticamente: *${contrato.Descricao}*
📊 Horas disponíveis: *${horasDisponiveis}h*

*2. Descrição do Problema*
Por favor, descreva detalhadamente o problema ou situação que necessita de assistência técnica:`;

            await client.sendMessage(phoneNumber, response);
        } else {
            // Múltiplos contratos ativos - pedir para escolher
            conversation.data.contratosDisponiveis =
                resultadoContratos.contratosAtivos;
            conversation.state = CONVERSATION_STATES.WAITING_CONTRACT;

            let response = `✅ Cliente encontrado: *${validacao.cliente.Cliente} - ${validacao.cliente.Nome}*

🔍 Foram encontrados múltiplos contratos ativos. Por favor, escolha um dos contratos abaixo digitando o número correspondente:

`;

            resultadoContratos.contratosAtivos.forEach((contrato, index) => {
                const horasDisponiveis = (
                    contrato.HorasTotais - contrato.HorasGastas
                ).toFixed(2);
                response += `*${index + 1}.* ${contrato.Descricao}\n`;
                response += `   📊 Horas disponíveis: ${horasDisponiveis}h\n`;
                response += `   📅 Válido até: ${new Date(contrato.PeriodoFim).toLocaleDateString("pt-PT")}\n\n`;
            });

            response += `Digite o número do contrato pretendido (1-${resultadoContratos.contratosAtivos.length}):`;

            await client.sendMessage(phoneNumber, response);
        }
    } else {
        // Cliente não encontrado - pedir para tentar novamente
        let response = `❌ Cliente "${nomeCliente}" não foi encontrado no sistema.

Por favor, verifique o nome do cliente e tente novamente.`;

        if (validacao.sugestoes.length > 0) {
            response += `\n\n💡 *Sugestões de clientes disponíveis:*\n`;
            validacao.sugestoes.forEach((sugestao) => {
                response += `• ${sugestao}\n`;
            });
        }

        response += `\n🔄 Digite novamente o nome ou código do cliente:`;

        await client.sendMessage(phoneNumber, response);
        // Manter o estado atual para tentar novamente
    }
}

// Handler para seleção de contrato
async function handleContractInput(phoneNumber, message, conversation) {
    const escolha = parseInt(message.trim());
    const contratos = conversation.data.contratosDisponiveis;

    if (isNaN(escolha) || escolha < 1 || escolha > contratos.length) {
        await client.sendMessage(
            phoneNumber,
            `❌ Escolha inválida. Por favor, digite um número entre 1 e ${contratos.length}:`,
        );
        return;
    }

    // Contrato selecionado
    const contratoSelecionado = contratos[escolha - 1];
    conversation.data.contratoID = contratoSelecionado.ID;
    conversation.state = CONVERSATION_STATES.WAITING_PROBLEM;

    const horasDisponiveis = (
        contratoSelecionado.HorasTotais - contratoSelecionado.HorasGastas
    ).toFixed(2);

    const response = `✅ Contrato selecionado: *${contratoSelecionado.Descricao}*
📊 Horas disponíveis: *${horasDisponiveis}h*

*2. Descrição do Problema*
Por favor, descreva detalhadamente o problema ou situação que necessita de assistência técnica:`;

    await client.sendMessage(phoneNumber, response);

    // Limpar lista de contratos para economizar memória
    delete conversation.data.contratosDisponiveis;
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

    // Definir valores por defeito (usar técnico pré-definido se disponível)
    if (!conversation.data.tecnico) {
        conversation.data.tecnico = "000";
    }
    conversation.data.origem = "TEL";
    conversation.data.objeto = "ASS\\SUP";
    conversation.data.secao = "SD";
    conversation.data.tipoProcesso = "PASI";

    conversation.state = CONVERSATION_STATES.WAITING_PRIORITY;

    let response = `✅ Descrição do problema registada com sucesso.`;

    if (conversation.data.tecnico && conversation.data.tecnico !== "000") {
        response += `\n✅ Técnico atribuído: *${conversation.data.tecnico}*`;
    }

    response += `\n\n*2. Prioridade do Pedido*
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
        case "BAIXA":
        case "BAIXO":
        case "1":
            prioridadeNumero = "1";
            break;
        case "MÉDIA":
        case "MEDIA":
        case "NORMAL":
        case "2":
            prioridadeNumero = "2";
            break;
        case "ALTA":
        case "ALTO":
        case "URGENTE":
        case "3":
            prioridadeNumero = "3";
            break;
        default:
            prioridadeNumero = "2"; // Padrão: Média
            break;
    }

    conversation.data.prioridade = prioridadeNumero;

    // Definir valores predefinidos
    conversation.data.estado = 2; // Predefinido como "Em curso equipa Advir"
    conversation.data.comoReproduzir = ""; // Predefinido como vazio

    conversation.state = CONVERSATION_STATES.WAITING_CONFIRMATION;

    const prioridadeDescricao =
        prioridadeNumero === "1"
            ? "Baixa"
            : prioridadeNumero === "2"
                ? "Média"
                : "Alta";

    let summary = `📋 *RESUMO DO PEDIDO DE ASSISTÊNCIA TÉCNICA*

**Cliente:** ${conversation.data.cliente}
${conversation.data.contacto ? `**Contacto:** ${conversation.data.contacto}\n` : ""}**Técnico:** ${conversation.data.tecnico}
**Prioridade:** ${prioridadeDescricao}
${conversation.data.contratoID ? `**Contrato:** Associado\n` : "**Contrato:** Não associado\n"}

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
        await createAssistenceRequest(phoneNumber, conversation);
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
    let pedidoID = "N/A";
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
            urlempresa,
        );

        console.log("✅ Token obtido com sucesso");

        // Datas default (iguais ao teu RegistoAssistencia.js)
        const dataAtual = new Date();
        const dataFimPrevista = new Date();
        dataFimPrevista.setDate(dataAtual.getDate() + 30);

        const dadosConversacao = conversation?.data || {};
        payload = {
            cliente: dadosConversacao.cliente || "VD",
            descricaoObjecto:
                dadosConversacao.objeto || "Pedido criado via WhatsApp",
            descricaoProblema:
                dadosConversacao.problema || "Problema reportado via WhatsApp",
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
            datahoraabertura:
                dadosConversacao.datahoraabertura ||
                dataAtual.toISOString().replace("T", " ").slice(0, 19),
            datahorafimprevista:
                dadosConversacao.datahorafimprevista ||
                dataFimPrevista.toISOString().replace("T", " ").slice(0, 19),
        };

        console.log(
            "🛠 Payload para criação do pedido:",
            JSON.stringify(payload, null, 2),
        );

        const resp = await fetch(
            "http://151.80.149.159:2018/WebApi/ServicosTecnicos/CriarPedido",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            },
        );

        // tenta ler o corpo SEMPRE (mesmo quando não é ok)
        const raw = await resp.text().catch(() => "");
        let data = null;
        try {
            data = raw ? JSON.parse(raw) : null;
        } catch {
            data = null;
        }

        if (resp.ok) {
            pedidoID =
                data && (data.PedidoID || data.Id)
                    ? data.PedidoID || data.Id
                    : "N/A";
            console.log("✅ Pedido criado com sucesso:", data);
        } else {
            console.error("❌ Erro da API:", resp.status, raw);

            // muitos endpoints dão 500/409 mas já criaram; tenta sacar o ID do JSON ou do texto
            if (data && (data.PedidoID || data.Id)) {
                pedidoID = data.PedidoID || data.Id;
                console.log(
                    "ℹ️ API respondeu erro mas conseguimos extrair PedidoID:",
                    pedidoID,
                );
            } else {
                // tentativa tosca: procurar GUID/número no texto
                const guidMatch =
                    raw &&
                    raw.match(
                        /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/,
                    );
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
            console.log(
                "✅ Notificação criada para o técnico:",
                payload.tecnico,
            );
        } catch (notifError) {
            console.warn("⚠️ Erro ao criar notificação:", notifError.message);
        }

        // envia SEMPRE a mensagem de sucesso aqui
        const prioridadeTxt =
            payload.prioridade === "1"
                ? "Baixa"
                : payload.prioridade === "2"
                    ? "Média"
                    : "Alta";
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
            const prioridadeTxt =
                payload &&
                (payload.prioridade === "1"
                    ? "Baixa"
                    : payload?.prioridade === "2"
                        ? "Média"
                        : "Alta");
            const successMessage = `✅ *PEDIDO DE ASSISTÊNCIA CRIADO COM SUCESSO*

**Número do Pedido:** ${pedidoID}
**Cliente:** ${payload?.cliente ?? "N/A"}
**Prioridade:** ${prioridadeTxt ?? "Média"}
**Estado:** Em curso

**Problema Reportado:**
${payload?.descricaoProblema ?? "N/A"}

**Data de Abertura:** ${payload?.datahoraabertura ? new Date(payload.datahoraabertura).toLocaleString("pt-PT") : new Date().toLocaleString("pt-PT")}

O seu pedido foi registado no nosso sistema e será processado pela nossa equipa técnica.

Obrigado por contactar a Advir.`;
            try {
                await client.sendMessage(phoneNumber, successMessage);
            } catch (_) { }
        }

        return { success: true, pedidoId: pedidoID, data: null }; // força sucesso
    } finally {
        try {
            activeConversations.delete(phoneNumber);
        } catch (_) { }
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

Este é o assistente automático da Advir Plan Consultoria.

Serviços disponíveis:
• Para criar um *pedido de assistência*, envie: "pedido"
• Para registar *ponto*, envie: "ponto"

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
            message: schedule.message,
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
            message: schedule.message,
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
