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
        // Se já existe um cliente, destruir primeiro para forçar nova autenticação
        if (client) {
            console.log("🔄 Cliente existente detectado, destruindo para nova autenticação...");
            try {
                await client.destroy();
            } catch (destroyError) {
                console.log("⚠️ Erro ao destruir cliente anterior:", destroyError.message);
            }
            client = null;
            isClientReady = false;
            clientStatus = "disconnected";
            qrCodeData = null;
        }

        // Limpar sessão existente para forçar QR Code novo
        const fs = require("fs");
        const path = require("path");
        const sessionPath = path.join(process.cwd(), "whatsapp-session");

        if (fs.existsSync(sessionPath)) {
            try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log("🧹 Sessão anterior removida para nova autenticação");
            } catch (error) {
                console.log("⚠️ Erro ao remover sessão anterior:", error.message);
            }
        }

        // Inicializar novo cliente
        await initializeWhatsAppWeb();

        res.json({
            message: "Iniciando nova conexão WhatsApp Web... Aguarde o QR Code aparecer!",
            status: clientStatus,
        });
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
        console.log("🔌 Iniciando desconexão completa do WhatsApp Web...");

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
                console.log("✅ Cliente WhatsApp destruído com sucesso");
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
        }

        // Always reset state
        client = null;
        isClientReady = false;
        clientStatus = "disconnected";
        qrCodeData = null;

        // Limpar sessão guardada para evitar reconexão automática
        const fs = require("fs");
        const path = require("path");
        const sessionPath = path.join(process.cwd(), "whatsapp-session");

        if (fs.existsSync(sessionPath)) {
            try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log("🧹 Sessão WhatsApp removida completamente");
            } catch (sessionError) {
                console.log("⚠️ Erro ao remover sessão:", sessionError.message);
            }
        }

        console.log("✅ Desconexão completa finalizada");
        res.json({
            message: "WhatsApp Web desconectado com sucesso",
            sessionCleared: true
        });
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

// Endpoint para trocar de conta WhatsApp
router.post("/change-account", async (req, res) => {
    try {
        console.log("🔄 Iniciando processo de troca de conta WhatsApp...");

        // Primeiro limpar sessão atual
        if (client) {
            try {
                await client.destroy();
                console.log("✅ Cliente anterior desconectado");
            } catch (error) {
                console.log("⚠️ Erro ao desconectar cliente anterior (normal):", error.message);
            }
        }

        // Reset completo do estado
        client = null;
        isClientReady = false;
        clientStatus = "disconnected";
        qrCodeData = null;

        // Limpar arquivos de sessão
        const fs = require("fs");
        const path = require("path");
        const sessionPath = path.join(process.cwd(), "whatsapp-session");

        if (fs.existsSync(sessionPath)) {
            try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log("✅ Arquivos de sessão removidos");
            } catch (error) {
                console.log("⚠️ Erro ao remover arquivos de sessão:", error.message);
            }
        }

        // Aguardar um momento antes de tentar reconectar
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Iniciar nova conexão
        await initializeWhatsAppWeb();

        res.json({
            message: "Troca de conta iniciada. Aguarde o novo QR Code aparecer.",
            success: true,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error("❌ Erro ao trocar conta WhatsApp:", error);
        res.status(500).json({
            error: "Erro ao trocar conta WhatsApp",
            details: error.message,
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

// Função para verificar autorização de ponto do contacto
async function checkPontoAuthorization(phoneNumber) {
    try {
        const cleanPhoneNumber = phoneNumber
            .replace("@c.us", "")
            .replace(/\D/g, "");
        console.log(`🔍 Verificando autorização para ${cleanPhoneNumber}`);

        const contacts = await Contact.findAll();

        for (const contact of contacts) {
            let contactsData;
            try {
                contactsData =
                    typeof contact.contacts === "string"
                        ? JSON.parse(contact.contacts)
                        : contact.contacts;
            } catch (parseError) {
                console.error("Erro ao parsear contactos:", parseError);
                continue;
            }

            if (Array.isArray(contactsData)) {
                for (const contactData of contactsData) {
                    const contactPhone = contactData.phone?.replace(/\D/g, "");
                    console.log(
                        `📱 Verificando contacto: ${contactPhone} vs ${cleanPhoneNumber}`,
                    );

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
                            `✅ Contacto encontrado! Verificando autorização...`,
                        );

                        // Verificar se tem user_id válido
                        const userId =
                            contactData.userID ||
                            contactData.user_id ||
                            contact.user_id;
                        if (!userId) {
                            console.error(
                                `❌ Contacto encontrado mas sem user_id configurado`,
                            );
                            return {
                                authorized: false,
                                contactData: null,
                                error: "Contacto não tem user_id configurado",
                            };
                        }

                        // Verificar datas de autorização se existirem
                        const dataInicio =
                            contactData.dataInicioAutorizacao ||
                            contact.dataInicioAutorizacao;
                        const dataFim =
                            contactData.dataFimAutorizacao ||
                            contact.dataFimAutorizacao;
                        const hoje = new Date().toISOString().split("T")[0];

                        // Se tem data de início e ainda não chegou, não está autorizado
                        if (dataInicio && hoje < dataInicio) {
                            return {
                                authorized: false,
                                contactData: null,
                                error: `Autorização só é válida a partir de ${new Date(dataInicio).toLocaleDateString("pt-PT")}`,
                            };
                        }

                        // Se tem data de fim e já passou, não está autorizado
                        if (dataFim && hoje > dataFim) {
                            return {
                                authorized: false,
                                contactData: null,
                                error: `Autorização expirou em ${new Date(dataFim).toLocaleDateString("pt-PT")}`,
                            };
                        }

                        // Se não tem nenhuma das datas ou está dentro do período válido, tem autorização

                        // Obter obras autorizadas
                        let obrasAutorizadas =
                            contactData.obrasAutorizadas ||
                            contact.obrasAutorizadas;
                        if (typeof obrasAutorizadas === "string") {
                            try {
                                obrasAutorizadas = JSON.parse(obrasAutorizadas);
                            } catch (e) {
                                obrasAutorizadas = [];
                            }
                        }

                        return {
                            authorized: true,
                            contactData: {
                                userId: userId,
                                obrasAutorizadas: obrasAutorizadas || [],
                                dataInicio: dataInicio,
                                dataFim: dataFim,
                            },
                        };
                    }
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

// Função para obter detalhes das obras autorizadas da base de dados local
async function getObrasAutorizadas(obrasIds) {
    if (!obrasIds || !Array.isArray(obrasIds) || obrasIds.length === 0) {
        console.log("❌ Nenhuma obra autorizada fornecida ou array vazio");
        return [];
    }

    try {
        console.log(
            `🔍 Buscando obras autorizadas pelos IDs: [${obrasIds.join(", ")}]`,
        );

        // Importar o modelo Obra
        const Obra = require("../models/obra");
        const { Op } = require("sequelize");

        // Buscar obras na base de dados local que estão na lista de autorizadas e são ativas
        const obras = await Obra.findAll({
            where: {
                id: {
                    [Op.in]: obrasIds.map((id) => parseInt(id)), // Converter para números
                },
                estado: "Ativo",
            },
            attributes: ["id", "codigo", "nome", "localizacao"],
            order: [["nome", "ASC"]],
        });

        console.log(
            `✅ Encontradas ${obras.length} obras autorizadas e ativas`,
        );

        // Converter para formato esperado
        const obrasDetails = obras.map((obra) => ({
            id: obra.id,
            nome: obra.nome,
            codigo: obra.codigo,
            localizacao: obra.localizacao,
        }));

        console.log(
            "📋 Obras autorizadas:",
            obrasDetails.map((o) => `${o.codigo} - ${o.nome}`).join(", "),
        );

        return obrasDetails;
    } catch (error) {
        console.error(
            "❌ Erro ao obter obras autorizadas da base de dados local:",
            error,
        );
        return [];
    }
}

// Função para lidar com mensagens recebidas
async function handleIncomingMessage(message) {
    // Ignorar mensagens de grupos e mensagens enviadas por nós
    if (message.from.includes("@g.us") || message.fromMe) {
        return;
    }

    const phoneNumber = message.from;
    const messageText = message.body ? message.body.trim() : "";

    console.log(
        `📥 Mensagem recebida de ${phoneNumber}: "${messageText}" (Tipo: ${typeof messageText}, Length: ${messageText.length})`,
    );
    console.log(`📱 Tipo da mensagem:`, message.type);
    console.log(`📱 Propriedades da mensagem:`, Object.keys(message));

    // **MÉTODO 1: Verificar se é uma mensagem de localização**
    if (message.hasLocation && message.location) {
        console.log(
            `📍 Localização GPS recebida de ${phoneNumber}: ${message.location.latitude}, ${message.location.longitude}`,
        );
        const userState = getUserState(phoneNumber);
        if (userState && userState.type === "awaiting_location") {
            await processarRegistoPontoComLocalizacao(message, userState);
            return;
        }
        await client.sendMessage(
            phoneNumber,
            "📍 Localização GPS recebida, mas não estava a ser esperada. Se pretende registar ponto, envie 'ponto' primeiro.",
        );
        return;
    }

    // **MÉTODO 2: Verificar se é mensagem do tipo location**
    if (message.type === "location") {
        console.log(`📍 Mensagem tipo location detectada`);

        // Tentar extrair coordenadas de diferentes formas
        let latitude, longitude;

        if (message.location) {
            latitude = message.location.latitude;
            longitude = message.location.longitude;
        } else if (message.body && message.body.includes("geo:")) {
            // Formato geo:lat,lng
            const geoMatch = message.body.match(
                /geo:(-?\d+\.?\d*),(-?\d+\.?\d*)/,
            );
            if (geoMatch) {
                latitude = parseFloat(geoMatch[1]);
                longitude = parseFloat(geoMatch[2]);
            }
        }

        if (latitude && longitude) {
            console.log(`📍 Coordenadas extraídas: ${latitude}, ${longitude}`);
            const userState = getUserState(phoneNumber);
            const conversation = activeConversations.get(phoneNumber);

            if ((userState && userState.type === "awaiting_location") ||
                (conversation && conversation.data && conversation.data.userId)) {

                console.log(`📍 Processando registo de ponto com localização...`);

                // Usar dados do estado ou da conversa
                const registoData = userState || conversation.data;

                const simulatedMessage = {
                    from: phoneNumber,
                    location: {
                        latitude: latitude,
                        longitude: longitude,
                        description: "Localização partilhada via WhatsApp",
                    },
                    body: message.body,
                };

                await processarRegistoPontoComLocalizacao(
                    simulatedMessage,
                    registoData,
                );
                return;
            } else {
                console.log(`❌ Nenhum estado válido encontrado para processar localização`);
                await client.sendMessage(
                    phoneNumber,
                    "📍 Localização recebida, mas não foi encontrado um registo de ponto em andamento. Envie 'ponto' primeiro para iniciar o registo.",
                );
                return;
            }
        }
    }

    // **MÉTODO 3: Analisar texto para coordenadas ou links do Google Maps**
    const parsedLocation = tryParseLocationData(messageText);
    if (parsedLocation) {
        console.log(
            `📍 Dados de localização analisados de ${phoneNumber}: ${parsedLocation.latitude}, ${parsedLocation.longitude}`,
        );
        const userState = getUserState(phoneNumber);
        if (userState && userState.type === "awaiting_location") {
            const simulatedMessage = {
                from: phoneNumber,
                location: {
                    latitude: parsedLocation.latitude,
                    longitude: parsedLocation.longitude,
                    description: "Localização extraída do texto/link",
                },
                body: messageText,
            };
            await processarRegistoPontoComLocalizacao(
                simulatedMessage,
                userState,
            );
            return;
        } else {
            await client.sendMessage(
                phoneNumber,
                "📍 Localização recebida via texto/link, mas não estava a ser esperada. Se pretende registar ponto, envie 'ponto' primeiro.",
            );
            return;
        }
    }

    // **MÉTODO 4: Verificar mensagens multimédia que podem conter localização**
    if (message.hasMedia) {
        console.log(`📎 Mensagem com média recebida`);

        try {
            const media = await message.downloadMedia();
            if (media) {
                console.log(`📎 Tipo de média: ${media.mimetype}`);

                // Se for imagem, verificar metadados EXIF para GPS
                if (media.mimetype && media.mimetype.startsWith("image/")) {
                    const locationFromExif = await extractLocationFromImage(
                        media.data,
                    );
                    if (locationFromExif) {
                        console.log(
                            `📍 Localização extraída de EXIF: ${locationFromExif.latitude}, ${locationFromExif.longitude}`,
                        );
                        const userState = getUserState(phoneNumber);
                        if (
                            userState &&
                            userState.type === "awaiting_location"
                        ) {
                            const simulatedMessage = {
                                from: phoneNumber,
                                location: {
                                    latitude: locationFromExif.latitude,
                                    longitude: locationFromExif.longitude,
                                    description:
                                        "Localização extraída de imagem EXIF",
                                },
                                body: "Imagem com localização",
                            };
                            await processarRegistoPontoComLocalizacao(
                                simulatedMessage,
                                userState,
                            );
                            return;
                        }
                    }
                }
            }
        } catch (error) {
            console.log(`⚠️ Erro ao processar média:`, error.message);
        }
    }

    // **MÉTODO 5: Verificar se a mensagem parece ser dados de localização em base64**
    if (
        messageText.length > 1000 &&
        (messageText.startsWith("/9j/") || messageText.startsWith("data:image"))
    ) {
        console.log(
            `📷 Dados de imagem/localização base64 recebidos (Length: ${messageText.length})`,
        );

        const userState = getUserState(phoneNumber);
        if (userState && userState.type === "awaiting_location") {
            await client.sendMessage(
                phoneNumber,
                "❌ *Localização GPS Necessária*\n\n" +
                "📍 Clique em anexo (📎) → 'Localização' → 'Localização atual'\n" +
                "🌐 Ou envie um link do Google Maps\n" +
                "📱 Ou digite coordenadas (ex: 41.1234, -8.5678)",
            );
        }
        return;
    }

    // Verificar se existe uma conversa ativa ou um estado de utilizador
    let conversation = activeConversations.get(phoneNumber);
    let userState = getUserState(phoneNumber);

    // PRIMEIRO: Verificar se é uma palavra-chave para novo pedido
    // MAS APENAS se não há conversa ativa OU se a conversa está em estado inicial/confirmação
    const canInterruptForRequest = !conversation ||
        conversation.state === CONVERSATION_STATES.INITIAL ||
        conversation.state === CONVERSATION_STATES.WAITING_CONFIRMATION;

    if (isRequestKeyword(messageText) && canInterruptForRequest) {
        // Se há conversa ativa, cancela-la para iniciar nova
        if (conversation) {
            console.log(`🔄 Cancelando conversa anterior de ${phoneNumber} (estado: ${conversation.state}) para iniciar novo pedido`);
            activeConversations.delete(phoneNumber);
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

    // SEGUNDO: Verificar se é uma palavra-chave para registo de ponto
    // APENAS se não há conversa ativa OU se a conversa está em estado inicial/confirmação
    const canInterruptForPonto = !conversation ||
        conversation.state === CONVERSATION_STATES.INITIAL ||
        conversation.state === CONVERSATION_STATES.WAITING_CONFIRMATION;

    if (isPontoKeyword(messageText) && canInterruptForPonto) {
        // Se há conversa ativa, cancela-la para iniciar registo de ponto
        if (conversation) {
            console.log(`🔄 Cancelando conversa anterior de ${phoneNumber} (estado: ${conversation.state}) para iniciar registo de ponto`);
            activeConversations.delete(phoneNumber);
        }

        // Verificar autorização antes de iniciar o registo de ponto
        const pontoAuthResult = await checkPontoAuthorization(phoneNumber);

        if (!pontoAuthResult.authorized) {
            let errorMessage = "❌ *Erro de Autorização*\n\n";

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
                pontoAuthResult.error.includes("Autorização só é válida") ||
                pontoAuthResult.error.includes("Autorização expirou")
            ) {
                errorMessage += pontoAuthResult.error + "\n\n";
                errorMessage += "📅 **Período de autorização:**\n";
                errorMessage +=
                    "• Contacte o administrador para verificar/atualizar as suas datas de autorização.";
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

    // TERCEIRO: Verificar se é cancelamento de processo
    if (messageText.toLowerCase().includes('cancelar') || messageText.toLowerCase().includes('sair')) {
        console.log(`❌ Cancelamento solicitado por ${phoneNumber}`);

        // Limpar estado do utilizador
        clearUserState(phoneNumber);

        // Limpar conversa ativa se existir
        if (conversation) {
            activeConversations.delete(phoneNumber);
        }

        await client.sendMessage(
            phoneNumber,
            "❌ *Processo Cancelado*\n\nO registo de ponto foi cancelado.\n\nPara iniciar um novo registo, envie 'ponto'."
        );
        return;
    }

    // QUARTO: Verificar se é uma palavra-chave para iniciar nova conversa
    if (isRequestKeyword(messageText) && !conversation) {
        console.log(`🎯 Palavra-chave de início detectada: "${messageText}"`);

        // Verificar autorização
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

    // Se existe conversa ativa e não é palavra-chave, continuar o fluxo normal
    if (conversation) {
        await continueConversation(phoneNumber, messageText, conversation);
        return;
    }

    // Se existe estado de utilizador (ex: a selecionar obra), continuar
    if (userState) {
        if (userState.type === "selecting_obra") {
            await handleObraSelection(phoneNumber, message, { data: userState }); // Passa o estado como data da conversa
        } else if (userState.type === "awaiting_location") {
            // Se está à espera de localização mas recebeu texto, dar instruções
            await client.sendMessage(
                phoneNumber,
                "📍 *Aguardando Localização GPS*\n\n" +
                "Por favor, envie a sua localização através de:\n" +
                "• Anexo (📎) → 'Localização' → 'Localização atual'\n" +
                "• Link do Google Maps\n" +
                "• Coordenadas GPS\n\n" +
                "💡 Se pretende cancelar o registo, digite 'cancelar'"
            );
        } else {
            // Se o estado não é reconhecido, limpar e enviar mensagem padrão
            clearUserState(phoneNumber);
            await sendWelcomeMessage(phoneNumber);
        }
        return;
    }


    // Verificar se o contacto tem alguma autorização antes de mostrar mensagem
    const pedidoAuth = await checkContactAuthorization(phoneNumber);
    const pontoAuth = await checkPontoAuthorization(phoneNumber);

    // Se não tem nenhuma autorização, não mostrar nada (ignorar mensagem)
    if (!pedidoAuth.authorized && !pontoAuth.authorized) {
        console.log(`📵 Contacto ${phoneNumber} sem autorizações - ignorando mensagem: "${messageText}"`);
        return;
    }

    // Se tem apenas uma autorização, dar dica específica
    if (!pedidoAuth.authorized && pontoAuth.authorized) {
        // Só pode registar ponto
        await client.sendMessage(
            phoneNumber,
            `📍 **Registo de Ponto**\n\nPara registar o seu ponto, envie a palavra "ponto".\n\nObrigado!`
        );
        return;
    }

    if (pedidoAuth.authorized && !pontoAuth.authorized) {
        // Só pode criar pedidos
        await client.sendMessage(
            phoneNumber,
            `🛠️ **Pedidos de Assistência**\n\nPara criar um pedido de assistência, envie a palavra "pedido".\n\nObrigado!`
        );
        return;
    }

    // Se tem ambas as autorizações, mostrar mensagem completa
    await sendWelcomeMessage(phoneNumber);
}

// Verificar se a mensagem contém palavras-chave para iniciar um pedido
function isRequestKeyword(message) {
    const keywords = ["pedido", "assistência", "suporte", "problema"];

    const lowerMessage = message.toLowerCase();
    return keywords.some((keyword) => lowerMessage.includes(keyword));
}

// Verificar se a mensagem contém palavras-chave para registo de ponto
function isPontoKeyword(message) {
    const keywords = ["ponto", "entrada", "saida", "saída", "picar", "horas"];

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
        conversationData.contacto = null; // por defeito
        conversationData.userId = contactData.userId; // Tenta obter userId do cliente

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
    console.log(
        `🔄 continueConversation - Estado: ${conversation.state}, Mensagem: "${message}"`,
    );

    // Se for uma mensagem de localização, não processar como texto
    if (message.hasLocation || message.type === "location") {
        console.log(
            "⚠️ Localização recebida durante conversa, será processada em handleIncomingMessage",
        );
        // Chamar handleIncomingMessage para processar a localização corretamente
        await handleIncomingMessage({ from: phoneNumber, ...message });
        return;
    }

    // Obter o texto da mensagem
    const messageText = typeof message === 'string' ? message : (message.body || message);

    // TERCEIRO: Verificar se é cancelamento de processo
    if (messageText.toLowerCase().includes('cancelar') || messageText.toLowerCase().includes('sair')) {
        console.log(`❌ Cancelamento solicitado por ${phoneNumber}`);

        // Limpar estado do utilizador
        clearUserState(phoneNumber);

        // Limpar conversa ativa se existir
        if (conversation) {
            activeConversations.delete(phoneNumber);
        }

        await client.sendMessage(
            phoneNumber,
            "❌ *Processo Cancelado*\n\nO registo de ponto foi cancelado.\n\nPara iniciar um novo registo, envie 'ponto'."
        );
        return;
    }

    // QUARTO: Processar baseado no estado da conversa
    switch (conversation.state) {
        case CONVERSATION_STATES.WAITING_CLIENT:
            await handleClientInput(phoneNumber, messageText, conversation);
            break;
        case CONVERSATION_STATES.WAITING_CONTRACT:
            await handleContractInput(phoneNumber, messageText, conversation);
            break;
        case CONVERSATION_STATES.WAITING_PROBLEM:
            await handleProblemInput(phoneNumber, messageText, conversation);
            break;
        case CONVERSATION_STATES.WAITING_PRIORITY:
            await handlePriorityInput(phoneNumber, messageText, conversation);
            break;
        case CONVERSATION_STATES.WAITING_CONFIRMATION:
            await handleConfirmationInput(phoneNumber, messageText, conversation);
            break;
        case CONVERSATION_STATES.PONTO_WAITING_OBRA:
            await handleObraSelection(phoneNumber, messageText, conversation);
            break;
        case CONVERSATION_STATES.PONTO_WAITING_CONFIRMATION:
            await handlePontoConfirmationInput(phoneNumber, messageText, conversation);
            break;
        default:
            console.log(`⚠️ Estado de conversa não reconhecido: ${conversation.state}`);
            await client.sendMessage(
                phoneNumber,
                "❌ Ocorreu um erro no processamento da conversa. Por favor, inicie novamente enviando 'pedido' ou 'ponto'."
            );
            activeConversations.delete(phoneNumber);
            break;
    }

    // Atualizar última atividade
    conversation.lastActivity = Date.now();
    activeConversations.set(phoneNumber, conversation);

    // Se existe estado de utilizador (ex: a selecionar obra), continuar
    if (userState) {
        if (userState.type === "selecting_obra") {
            await handleObraSelection(phoneNumber, message, { data: userState }); // Passa o estado como data da conversa
        } else if (userState.type === "awaiting_location") {
            // Se está à espera de localização mas recebeu texto, dar instruções
            await client.sendMessage(
                phoneNumber,
                "📍 *Aguardando Localização GPS*\n\n" +
                "Por favor, envie a sua localização através de:\n" +
                "• Anexo (📎) → 'Localização' → 'Localização atual'\n" +
                "• Link do Google Maps\n" +
                "• Coordenadas GPS\n\n" +
                "💡 Se pretende cancelar o registo, digite 'cancelar'"
            );
        } else {
            // Se o estado não é reconhecido, limpar e enviar mensagem padrão
            clearUserState(phoneNumber);
            await sendWelcomeMessage(phoneNumber);
        }
        return;
    }

    // Se chegou aqui, e não há conversa nem estado, e a mensagem não é de cancelamento,
    // envia a mensagem de boas-vindas
    await sendWelcomeMessage(phoneNumber);
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

                // Buscar obras autorizadas do contacto
                const obrasAutorizadasIds = contactData.obrasAutorizadas;
                const obrasInfo =
                    await getObrasAutorizadas(obrasAutorizadasIds);

                if (obrasInfo.length === 0) {
                    console.log(
                        `⚠️ Nenhuma obra ativa encontrada para utilizador ${user.nome}`,
                    );

                    // Determinar tipo automaticamente mesmo sem obra específica
                    const registoInfo = await determinarTipoRegisto(
                        contactData.userId,
                        null // sem obra específica
                    );

                    conversationData.obraId = null;
                    conversationData.obraNome = "Sem obra específica";
                    conversationData.tipoRegisto = registoInfo.tipo;
                    conversationData.precisaSaidaAutomatica = registoInfo.precisaSaidaAutomatica;
                    conversationData.obraAnterior = registoInfo.obraAnterior;

                    const tipoTexto = registoInfo.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA';
                    const emoji = registoInfo.tipo === 'entrada' ? '🟢' : '🔴';

                    // Definir estado para aguardar localização
                    setUserState(phoneNumber, {
                        type: "awaiting_location",
                        userId: conversationData.userId,
                        obraId: null,
                        obraNome: "Sem obra específica",
                        tipoRegisto: registoInfo.tipo,
                        precisaSaidaAutomatica: registoInfo.precisaSaidaAutomatica,
                        obraAnterior: registoInfo.obraAnterior,
                    });

                    let response = `✅ *Utilizador:* ${user.nome}\n`;
                    response += `⚠️ *Nota:* Sem obra específica autorizada\n`;
                    response += `${emoji} *Registo:* ${tipoTexto}\n\n`;
                    response += `📍 *Envie a sua localização:*\n`;
                    response += `• Anexo (📎) → "Localização"\n`;
                    response += `• Link do Google Maps\n`;
                    response += `• Coordenadas GPS`;

                    await client.sendMessage(phoneNumber, response);
                    return;
                } else if (obrasInfo.length === 1) {
                    // Uma única obra - selecionar automaticamente e determinar tipo
                    const obra = obrasInfo[0];
                    conversationData.obraId = obra.id;
                    conversationData.obraNome = obra.nome;

                    // Determinar automaticamente o tipo de registo (agora retorna objeto)
                    const registoInfo = await determinarTipoRegisto(
                        contactData.userId,
                        obra.id
                    );

                    conversationData.tipoRegisto = registoInfo.tipo;
                    conversationData.precisaSaidaAutomatica = registoInfo.precisaSaidaAutomatica;
                    conversationData.obraAnterior = registoInfo.obraAnterior;

                    const tipoTexto = registoInfo.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA';
                    const emoji = registoInfo.tipo === 'entrada' ? '🟢' : '🔴';

                    // Definir estado para aguardar localização
                    setUserState(phoneNumber, {
                        type: "awaiting_location",
                        userId: conversationData.userId,
                        obraId: obra.id,
                        obraNome: obra.nome,
                        tipoRegisto: registoInfo.tipo,
                        precisaSaidaAutomatica: registoInfo.precisaSaidaAutomatica,
                        obraAnterior: registoInfo.obraAnterior,
                    });

                    let response = `✅ *Utilizador:* ${user.nome}\n`;
                    response += `🏗️ *Obra:* ${obra.codigo} - ${obra.nome}\n`;

                    // Se precisa de saída automática, informar
                    if (registoInfo.precisaSaidaAutomatica) {
                        response += `🔄 *Mudança de obra detectada*\n`;
                        response += `📤 Será dada saída automática da obra anterior\n`;
                        response += `📥 Seguida de entrada nesta obra\n\n`;
                    }

                    response += `${emoji} *Registo:* ${tipoTexto}\n\n`;
                    response += `📍 *Envie a sua localização:*\n`;
                    response += `• Anexo (📎) → "Localização"\n`;
                    response += `• Link do Google Maps\n`;
                    response += `• Coordenadas GPS`;

                    await client.sendMessage(phoneNumber, response);
                    return;
                } else {
                    // Múltiplas obras - pedir para escolher
                    conversationData.obrasDisponiveis = obrasInfo;
                    conversationData.userName = user.nome;

                    let response = `✅ *Utilizador:* ${user.nome}\n\n`;
                    response += `🏗️ *Selecione uma obra:*\n\n`;

                    obrasInfo.forEach((obra, index) => {
                        response += `*${index + 1}.* ${obra.codigo} - ${obra.nome}\n`;
                    });

                    response += `\n📝 Digite o número da obra (1-${obrasInfo.length}) ou "cancelar"`;

                    const conversation = {
                        state: CONVERSATION_STATES.PONTO_WAITING_OBRA,
                        data: conversationData,
                        lastActivity: Date.now(),
                    };
                    activeConversations.set(phoneNumber, conversation);
                    await client.sendMessage(phoneNumber, response);
                    return;
                }
            }
        } catch (error) {
            console.error(
                "Erro ao buscar dados do utilizador ou obras:",
                error,
            );
        }
    }

    // Se não conseguiu obter o user_id do contacto ou obras, mostrar erro
    await client.sendMessage(
        phoneNumber,
        `❌ *Erro de Configuração*\n\nNão foi possível identificar o utilizador ou as suas autorizações de obra.\n\n` +
        `Por favor, contacte o administrador para verificar a sua configuração.`,
    );
}

// Função para definir o estado do utilizador
function setUserState(phoneNumber, state) {
    // Armazena o estado do utilizador, substituindo qualquer estado anterior
    // Pode ser usado para lembrar o contexto da conversa, como a obra selecionada
    // ou o tipo de registo em andamento.
    if (!userStates[phoneNumber]) {
        userStates[phoneNumber] = {};
    }
    userStates[phoneNumber] = { ...state, timestamp: Date.now() };
}

// Função para obter o estado do utilizador
function getUserState(phoneNumber) {
    // Retorna o estado atual do utilizador ou null se não houver estado definido.
    // Pode incluir expiração de estado após um certo tempo de inatividade.
    const state = userStates[phoneNumber];
    if (!state) {
        return null;
    }

    // Exemplo: Expiração de estado após 30 minutos
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
    if (Date.now() - state.timestamp > INACTIVITY_TIMEOUT) {
        delete userStates[phoneNumber]; // Limpa estado expirado
        return null;
    }

    return state;
}

// Função para limpar o estado do utilizador
function clearUserState(phoneNumber) {
    // Remove o estado do utilizador, indicando que a conversa ou fluxo atual terminou.
    delete userStates[phoneNumber];
}

// Estrutura para armazenar estados temporários dos utilizadores
// Poderia ser um Map para melhor performance com muitos utilizadores
const userStates = {};

// Função para selecionar obra
async function handleObraSelection(phoneNumber, message, conversation) {
    // Alterado para aceitar phoneNumber e message
    const selection = typeof message === 'string' ? message.trim() : message.body.trim(); // Handle both string and object
    const obrasInfo = conversation.data.obrasDisponiveis; // Get from conversation data
    const userId = conversation.data.userId;

    // Verificar se o utilizador quer cancelar
    if (
        selection.toLowerCase() === "cancelar" ||
        selection.toLowerCase() === "cancel"
    ) {
        clearUserState(phoneNumber);
        await client.sendMessage(
            phoneNumber,
            "❌ *Registo Cancelado*\n\nO registo de ponto foi cancelado. Envie 'ponto' novamente quando quiser registar.",
        );
        return;
    }

    // Verificar se é um número válido
    const selectedIndex = parseInt(selection) - 1;

    if (
        isNaN(selectedIndex) ||
        selectedIndex < 0 ||
        selectedIndex >= obrasInfo.length
    ) {
        const errorMessage =
            `❌ *Seleção Inválida*\n\n` +
            `Por favor, responda com um número entre 1 e ${obrasInfo.length}.\n\n` +
            `Ou envie "cancelar" para cancelar o registo.`;
        await client.sendMessage(phoneNumber, errorMessage);
        return;
    }

    // Limpar estado do utilizador após a seleção
    clearUserState(phoneNumber);

    const obraSelecionada = obrasInfo[selectedIndex];

    // Armazenar a obra selecionada no estado da conversa
    conversation.data.obraId = obraSelecionada.id;
    conversation.data.obraNome = obraSelecionada.nome;
    conversation.state = CONVERSATION_STATES.PONTO_WAITING_CONFIRMATION;
    activeConversations.set(phoneNumber, conversation);

    // Determinar automaticamente o tipo de registo (agora retorna objeto)
    const registoInfo = await determinarTipoRegisto(
        conversation.data.userId,
        obraSelecionada.id
    );

    const tipoTexto = registoInfo.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA';
    const emoji = registoInfo.tipo === 'entrada' ? '🟢' : '🔴';

    // Armazenar o tipo e informações de saída automática
    conversation.data.tipoRegisto = registoInfo.tipo;
    conversation.data.precisaSaidaAutomatica = registoInfo.precisaSaidaAutomatica;
    conversation.data.obraAnterior = registoInfo.obraAnterior;

    // Definir estado para aguardar localização
    setUserState(phoneNumber, {
        type: "awaiting_location",
        userId: conversation.data.userId,
        obraId: obraSelecionada.id,
        obraNome: obraSelecionada.nome,
        tipoRegisto: registoInfo.tipo,
        precisaSaidaAutomatica: registoInfo.precisaSaidaAutomatica,
        obraAnterior: registoInfo.obraAnterior,
    });

    let response = `✅ *Obra:* ${obraSelecionada.codigo} - ${obraSelecionada.nome}\n`;

    // Se precisa de saída automática, informar o utilizador
    if (registoInfo.precisaSaidaAutomatica) {
        response += `🔄 *Mudança de obra detectada*\n`;
        response += `📤 Será dada saída automática da obra anterior\n`;
        response += `📥 Seguida de entrada nesta obra\n\n`;
    }

    response += `${emoji} *Registo:* ${tipoTexto}\n\n`;
    response += `📍 *Envie a sua localização:*\n`;
    response += `• Anexo (📎) → "Localização"\n`;
    response += `• Link do Google Maps\n`;
    response += `• Coordenadas GPS`;

    await client.sendMessage(phoneNumber, response);
}

// Função para determinar automaticamente o tipo de registo baseado no estado atual
async function determinarTipoRegisto(userId, obraId) {
    try {
        const { Op } = require('sequelize');
        const RegistoPontoObra = require('../models/registoPontoObra');

        // Buscar registos do utilizador na data atual
        const dataAtual = new Date();
        const inicioHoje = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate());
        const fimHoje = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate(), 23, 59, 59);

        // 1. Buscar o último registo geral do utilizador hoje (qualquer obra)
        const ultimoRegistoGeral = await RegistoPontoObra.findOne({
            where: {
                user_id: userId,
                createdAt: {
                    [Op.between]: [inicioHoje, fimHoje]
                }
            },
            order: [['createdAt', 'DESC']]
        });

        console.log(`🔍 Último registo geral encontrado:`, ultimoRegistoGeral ?
            `${ultimoRegistoGeral.tipo} na obra ${ultimoRegistoGeral.obra_id} às ${ultimoRegistoGeral.createdAt}` : 'Nenhum');

        // 2. Se não há registos hoje, é entrada
        if (!ultimoRegistoGeral) {
            console.log(`✅ Nenhum registo hoje -> ENTRADA`);
            return { tipo: 'entrada', precisaSaidaAutomatica: false };
        }

        // 3. Verificar se o último registo foi numa obra diferente
        const obraAnterior = ultimoRegistoGeral.obra_id;
        const mudouDeObra = obraId !== null && obraAnterior !== null && obraId !== obraAnterior;

        console.log(`🏗️ Obra anterior: ${obraAnterior}, Obra atual: ${obraId}, Mudou de obra: ${mudouDeObra}`);

        // 4. Se mudou de obra e o último registo foi entrada, precisa dar saída automática
        if (mudouDeObra && ultimoRegistoGeral.tipo === 'entrada') {
            console.log(`🔄 Mudança de obra detectada - vai dar saída da obra ${obraAnterior} e entrada na obra ${obraId}`);
            return {
                tipo: 'entrada',
                precisaSaidaAutomatica: true,
                obraAnterior: obraAnterior,
                ultimoRegistoId: ultimoRegistoGeral.id
            };
        }

        // 5. Se é na mesma obra, verificar o tipo normal
        if (obraId === null || obraId === undefined || obraId === obraAnterior) {
            if (ultimoRegistoGeral.tipo === 'entrada') {
                console.log(`✅ Último foi entrada na mesma obra -> próximo será SAÍDA`);
                return { tipo: 'saida', precisaSaidaAutomatica: false };
            } else {
                console.log(`✅ Último foi saída -> próximo será ENTRADA`);
                return { tipo: 'entrada', precisaSaidaAutomatica: false };
            }
        }

        // 6. Se mudou de obra mas o último registo foi saída, pode dar entrada diretamente
        if (mudouDeObra && ultimoRegistoGeral.tipo === 'saida') {
            console.log(`✅ Mudança de obra mas último registo foi saída -> ENTRADA direta`);
            return { tipo: 'entrada', precisaSaidaAutomatica: false };
        }

        // Default
        return { tipo: 'entrada', precisaSaidaAutomatica: false };
    } catch (error) {
        console.error('Erro ao determinar tipo de registo:', error);
        return { tipo: 'entrada', precisaSaidaAutomatica: false };
    }
}

// Função para lidar com confirmação automática de ponto
async function handlePontoConfirmationInput(
    phoneNumber,
    message,
    conversation,
) {
    // Determinar automaticamente o tipo de registo
    const tipoRegisto = await determinarTipoRegisto(
        conversation.data.userId,
        conversation.data.obraId
    );

    // Armazenar o tipo de registo na conversa
    conversation.data.tipoRegisto = tipoRegisto;

    // Atualizar o estado do utilizador para aguardar localização
    setUserState(phoneNumber, {
        type: "awaiting_location",
        userId: conversation.data.userId,
        obraId: conversation.data.obraId,
        obraNome: conversation.data.obraNome,
        tipoRegisto: tipoRegisto,
    });

    const tipoTexto = tipoRegisto === 'entrada' ? 'ENTRADA' : 'SAÍDA';
    const emoji = tipoRegisto === 'entrada' ? '🟢' : '🔴';

    // Solicitar localização ao utilizador
    const locationInstructions =
        `${emoji} *Registo:* ${tipoTexto}\n\n` +
        `📍 *Envie a sua localização:*\n` +
        `• Anexo (📎) → "Localização"\n` +
        `• Link do Google Maps\n` +
        `• Coordenadas GPS`;

    await client.sendMessage(phoneNumber, locationInstructions);
}

// Função para processar o registo de ponto com localização
async function processarRegistoPontoComLocalizacao(message, userState) {
    const phoneNumber = message.from;
    const latitude = message.location.latitude;
    const longitude = message.location.longitude;
    const endereco = message.location.description || "Localização partilhada";

    console.log(`🔄 Processando registo de ponto com localização para ${phoneNumber}`);
    console.log(`📍 Coordenadas: ${latitude}, ${longitude}`);
    console.log(`📊 Estado do utilizador:`, userState);

    // Limpar estado do utilizador após a obtenção da localização
    clearUserState(phoneNumber);

    // Obter dados da conversa anterior
    const conversation = activeConversations.get(phoneNumber);
    console.log(`💬 Conversa ativa:`, conversation ? "Sim" : "Não");

    // Obter user_id e obra_id do estado ou da conversa
    const userId = userState.userId || (conversation && conversation.data && conversation.data.userId);
    const obraId = userState.obraId || (conversation && conversation.data && conversation.data.obraId);
    const obraNome = userState.obraNome || (conversation && conversation.data && conversation.data.obraNome);
    const tipoRegisto = userState.tipoRegisto || (conversation && conversation.data && conversation.data.tipoRegisto);

    console.log(`👤 User ID: ${userId}`);
    console.log(`🏗️ Obra ID: ${obraId}`);
    console.log(`📝 Tipo de registo: ${tipoRegisto}`);

    if (!userId) {
        console.log(`❌ User ID não encontrado`);
        await client.sendMessage(
            phoneNumber,
            "❌ Erro: Não foi possível identificar o utilizador para o registo.",
        );
        return;
    }

    // Se não temos tipo de registo, determinar automaticamente
    let finalTipoRegisto = tipoRegisto;
    if (!finalTipoRegisto) {
        console.log(`🔍 Determinando tipo de registo automaticamente...`);
        finalTipoRegisto = await determinarTipoRegisto(userId, obraId);
        console.log(`📋 Tipo determinado: ${finalTipoRegisto}`);
    }

    try {
        // Verificar se precisa dar saída automática primeiro
        const precisaSaidaAutomatica = userState.precisaSaidaAutomatica ||
            (conversation && conversation.data && conversation.data.precisaSaidaAutomatica);
        const obraAnterior = userState.obraAnterior ||
            (conversation && conversation.data && conversation.data.obraAnterior);

        let mensagensRegisto = [];

        // 1. Se precisa de saída automática, fazer primeiro
        if (precisaSaidaAutomatica && obraAnterior) {
            console.log(`🔄 Executando saída automática da obra ${obraAnterior}`);

            const RegistoPontoObra = require("../models/registoPontoObra");

            // Criar registo de saída da obra anterior
            const registoSaida = await RegistoPontoObra.create({
                user_id: userId,
                obra_id: obraAnterior,
                tipo: 'saida',
                timestamp: new Date(),
                latitude: latitude.toString(),
                longitude: longitude.toString()
            });

            console.log(`✅ Saída automática registada:`, registoSaida.toJSON());

            // Buscar informações da obra anterior para a mensagem
            const Obra = require("../models/obra");
            const obraAnteriorInfo = await Obra.findByPk(obraAnterior);
            const obraAnteriorNome = obraAnteriorInfo ?
                `${obraAnteriorInfo.codigo} - ${obraAnteriorInfo.nome}` :
                `Obra ${obraAnterior}`;

            mensagensRegisto.push(`🔴 **SAÍDA AUTOMÁTICA**\n🏗️ **Obra:** ${obraAnteriorNome}\n⏰ **Data/Hora:** ${new Date().toLocaleString("pt-PT")}\n`);
        }

        // 2. Agora registar entrada/saída na obra atual
        const registoPontoObraController = require("../controllers/registoPontoObraControllers");

        console.log(`🎯 Criando registo principal com dados:`);
        console.log(`   - User ID: ${userId}`);
        console.log(`   - Obra ID: ${obraId}`);
        console.log(`   - Tipo: ${finalTipoRegisto}`);
        console.log(`   - Coordenadas: ${latitude}, ${longitude}`);

        // Simular um request object para o controller
        const mockReq = {
            user: { id: userId },
            body: {
                tipo: finalTipoRegisto,
                obra_id: obraId,
                latitude: latitude.toString(),
                longitude: longitude.toString(),
            },
        };

        // Simular response object que captura o resultado
        let controllerResult = null;
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    controllerResult = { status: code, data: data };
                    console.log("Controller response - Status:", code, data);
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
        await registoPontoObraController.registarPonto(mockReq, mockRes);

        // Verificar se o registo foi bem-sucedido
        if (
            !controllerResult ||
            (controllerResult.status !== 200 && controllerResult.status !== 201)
        ) {
            throw new Error("Controller não retornou sucesso");
        }

        console.log(
            "✅ Ponto principal registado com sucesso na base de dados:",
            controllerResult,
        );

        // Mensagem de sucesso
        const tipoTexto = finalTipoRegisto === "entrada" ? "ENTRADA" : "SAÍDA";
        const emoji = finalTipoRegisto === "entrada" ? "🟢" : "🔴";

        // Montar mensagem simplificada
        let successMessage = `✅ *Registo Efetuado*\n\n`;

        // Se houve saída automática, mostrar apenas que foi processada
        if (mensagensRegisto.length > 0) {
            successMessage += `🔄 Saída automática da obra anterior\n`;
        }

        // Registo principal (apenas o último)
        successMessage += `${emoji} *${tipoTexto}*\n`;
        successMessage += `⏰ ${new Date().toLocaleString("pt-PT")}\n`;
        if (obraNome && obraNome !== "Sem obra específica") {
            successMessage += `🏗️ ${obraNome}\n`;
        }
        successMessage += `\nRegisto confirmado no sistema.`;

        console.log(`✅ Enviando mensagem de sucesso para ${phoneNumber}`);
        await client.sendMessage(phoneNumber, successMessage);
    } catch (error) {
        console.error("Erro ao registar ponto:", error);

        // Limpar estados em caso de erro
        clearUserState(phoneNumber);
        activeConversations.delete(phoneNumber);

        await client.sendMessage(
            phoneNumber,
            `❌ *Erro no Registo*\n\nOcorreu um erro ao processar o seu registo de ponto.\n\n` +
            `Para tentar novamente, envie: *ponto*`
        );
    } finally {
        // Limpar conversa após o processamento
        activeConversations.delete(phoneNumber);
    }
}

// Função para tentar extrair coordenadas de dados de localização
function tryParseLocationData(messageText) {
    try {
        console.log(
            `🔍 Tentando extrair localização do texto: ${messageText.substring(0, 100)}...`,
        );

        // **Método 1: URLs do Google Maps (vários formatos)**
        const googleMapsPatterns = [
            // https://maps.google.com/?q=lat,lng
            /maps\.google\.com\/?\?q=(-?\d+\.?\d*),(-?\d+\.?\d*)/i,
            // https://maps.google.com/maps?q=lat,lng
            /maps\.google\.com\/maps\?q=(-?\d+\.?\d*),(-?\d+\.?\d*)/i,
            // https://www.google.com/maps/@lat,lng
            /google\.com\/maps\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/i,
            // https://goo.gl/maps/... (encurtado)
            /goo\.gl\/maps/i,
            // https://maps.app.goo.gl/...
            /maps\.app\.goo\.gl/i,
        ];

        for (const pattern of googleMapsPatterns) {
            const match = messageText.match(pattern);
            if (match && match[1] && match[2]) {
                const lat = parseFloat(match[1]);
                const lng = parseFloat(match[2]);
                if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
                    console.log(
                        `✅ Coordenadas extraídas do Google Maps: ${lat}, ${lng}`,
                    );
                    return { latitude: lat, longitude: lng };
                }
            }
        }

        // **Método 2: Formato geo: URI**
        const geoPattern = /geo:(-?\d+\.?\d*),(-?\d+\.?\d*)/i;
        const geoMatch = messageText.match(geoPattern);
        if (geoMatch) {
            const lat = parseFloat(geoMatch[1]);
            const lng = parseFloat(geoMatch[2]);
            if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
                console.log(
                    `✅ Coordenadas extraídas do formato geo: ${lat}, ${lng}`,
                );
                return { latitude: lat, longitude: lng };
            }
        }

        // **Método 3: Coordenadas simples separadas por vírgula**
        const latLongPattern = /(-?\d+\.?\d{4,})\s*,\s*(-?\d+\.?\d{4,})/g;
        const matches = messageText.match(latLongPattern);

        if (matches) {
            for (const match of matches) {
                const coordMatch = match.match(
                    /(-?\d+\.?\d+)\s*,\s*(-?\d+\.?\d+)/,
                );
                if (coordMatch) {
                    const lat = parseFloat(coordMatch[1]);
                    const lng = parseFloat(coordMatch[2]);
                    if (
                        !isNaN(lat) &&
                        !isNaN(lng) &&
                        isValidCoordinate(lat, lng)
                    ) {
                        console.log(
                            `✅ Coordenadas extraídas do texto: ${lat}, ${lng}`,
                        );
                        return { latitude: lat, longitude: lng };
                    }
                }
            }
        }

        // **Método 4: Formato nomeado (lat: X, lng: Y)**
        const namedPatterns = [
            /lat(?:itude)?[:\s]*(-?\d+\.?\d*)[,\s]+lng|lon(?:gitude)?[:\s]*(-?\d+\.?\d*)/i,
            /latitude[:\s]*(-?\d+\.?\d*)[,\s]+longitude[:\s]*(-?\d+\.?\d*)/i,
            /lat[:\s]*(-?\d+\.?\d*)[,\s]+lon[:\s]*(-?\d+\.?\d*)/i,
        ];

        for (const pattern of namedPatterns) {
            const namedMatch = messageText.match(pattern);
            if (namedMatch && namedMatch[1] && namedMatch[2]) {
                const lat = parseFloat(namedMatch[1]);
                const lng = parseFloat(namedMatch[2]);
                if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
                    console.log(
                        `✅ Coordenadas extraídas do formato nomeado: ${lat}, ${lng}`,
                    );
                    return { latitude: lat, longitude: lng };
                }
            }
        }

        // **Método 5: Links do WhatsApp Web (quando partilhado)**
        const whatsappPattern =
            /wa\.me.*text=.*?(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/i;
        const whatsappMatch = messageText.match(whatsappPattern);
        if (whatsappMatch) {
            const lat = parseFloat(whatsappMatch[1]);
            const lng = parseFloat(whatsappMatch[2]);
            if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
                console.log(
                    `✅ Coordenadas extraídas do link WhatsApp: ${lat}, ${lng}`,
                );
                return { latitude: lat, longitude: lng };
            }
        }

        console.log(`❌ Nenhuma coordenada válida encontrada no texto`);
        return null;
    } catch (error) {
        console.error("Erro ao analisar dados de localização:", error);
        return null;
    }
}

// Função auxiliar para validar coordenadas
function isValidCoordinate(lat, lng) {
    return (
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        (Math.abs(lat) > 0.001 || Math.abs(lng) > 0.001) // Evitar coordenadas 0,0
    );
}

// Função para extrair localização de imagens (EXIF)
async function extractLocationFromImage(imageData) {
    try {
        // Esta é uma implementação básica - pode precisar de uma biblioteca específica para EXIF
        // Por agora, retornar null
        console.log(
            `📷 Tentativa de extrair localização EXIF (não implementado completamente)`,
        );
        return null;
    } catch (error) {
        console.error("Erro ao extrair localização de imagem:", error);
        return null;
    }
}

// Função para lidar com entrada do cliente
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

// Handler para input do contacto - removido pois já é tratado na autorização
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

// Handler para confirmação
async function handleConfirmationInput(phoneNumber, message, conversation) {
    const response = message.trim().toLowerCase();

    if (response === "sim" || response === "s" || response === "yes" || response === "1") {
        try {
            console.log(`✅ Confirmação recebida de ${phoneNumber} - criando pedido...`);
            const result = await createAssistenceRequest(phoneNumber, conversation);

            // Garantir que a conversa é limpa após criação do pedido
            if (activeConversations.has(phoneNumber)) {
                activeConversations.delete(phoneNumber);
            }

            console.log(`✅ Pedido criado e conversa limpa para ${phoneNumber}`);
            return result;
        } catch (error) {
            console.error(`❌ Erro ao criar pedido para ${phoneNumber}:`, error);

            // Mesmo em erro, limpar conversa e informar utilizador
            activeConversations.delete(phoneNumber);

            await client.sendMessage(
                phoneNumber,
                "❌ Ocorreu um erro ao processar o seu pedido. Por favor, tente novamente enviando 'pedido'."
            );

            return { success: false, error: error.message };
        }
    } else if (response === "não" || response === "nao" || response === "n" || response === "no" || response === "0") {
        activeConversations.delete(phoneNumber);
        await client.sendMessage(
            phoneNumber,
            "❌ Pedido cancelado com sucesso.\n\n💡 Para iniciar um novo pedido de assistência, envie 'pedido' ou 'assistência'.",
        );
        return { success: false, cancelled: true };
    } else {
        await client.sendMessage(
            phoneNumber,
            "❌ Resposta não reconhecida.\n\nPor favor, responda:\n• 'SIM' ou 'S' para confirmar\n• 'NÃO' ou 'N' para cancelar",
        );
        return { success: false, invalidResponse: true };
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
            payload &&
            (payload.prioridade === "1"
                ? "Baixa"
                : payload?.prioridade === "2"
                    ? "Média"
                    : "Alta");
        const successMessage = `✅ *PEDIDO DE ASSISTÊNCIA CRIADO COM SUCESSO*

**Número:** ${pedidoID !== "N/A" ? pedidoID : "Sistema"}
**Cliente:** ${payload.cliente}
**Prioridade:** ${prioridadeTxt}
**Estado:** Em curso

**Problema Reportado:**
${payload.descricaoProblema}

**Data de Abertura:** ${new Date(payload.datahoraabertura).toLocaleString("pt-PT")}

O seu pedido foi registado no nosso sistema e será processado pela nossa equipa técnica.

💡 *Para criar um novo pedido*, envie novamente "pedido" ou "assistência".

Obrigado por contactar a Advir.`;

        await client.sendMessage(phoneNumber, successMessage);
        sent = true;

        return {
            success: true,
            pedidoId: pedidoID,
            data: data || null,
            message: "Pedido criado com sucesso"
        };
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

**Número:** ${pedidoID !== "N/A" ? pedidoID : "Sistema"}
**Cliente:** ${payload?.cliente ?? "N/A"}
**Prioridade:** ${prioridadeTxt ?? "Média"}
**Estado:** Em curso

**Problema Reportado:**
${payload?.descricaoProblema ?? "N/A"}

**Data de Abertura:** ${payload?.datahoraabertura ? new Date(payload.datahoraabertura).toLocaleString("pt-PT") : new Date().toLocaleString("pt-PT")}

O seu pedido foi registado no nosso sistema e será processado pela nossa equipa técnica.

💡 *Para criar um novo pedido*, envie novamente "pedido" ou "assistência".

Obrigado por contactar a Advir.`;
            try {
                await client.sendMessage(phoneNumber, successMessage);
            } catch (msgError) {
                console.error("Erro ao enviar mensagem de sucesso:", msgError);
            }
        }

        return {
            success: true,
            pedidoId: pedidoID,
            data: null,
            message: "Pedido processado"
        }; // força sucesso
    } finally {
        // Sempre limpar a conversa para permitir novos pedidos
        try {
            activeConversations.delete(phoneNumber);
            console.log(`🧹 Conversa limpa para ${phoneNumber} - pronto para novos pedidos`);
        } catch (cleanupError) {
            console.warn("Erro ao limpar conversa:", cleanupError);
        }
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
    try {
        // Verificar autorizações do contacto
        const pedidoAuth = await checkContactAuthorization(phoneNumber);
        const pontoAuth = await checkPontoAuthorization(phoneNumber);

        let welcomeMessage = `👋 Bem-vindo!\n\nEste é o assistente automático da Advir Plan Consultoria.\n\n`;

        // Verificar que serviços estão disponíveis
        const canCreateRequests = pedidoAuth.authorized;
        const canRegisterPonto = pontoAuth.authorized;

        if (canCreateRequests && canRegisterPonto) {
            // Tem ambas as autorizações
            welcomeMessage += `**Serviços disponíveis:**\n`;
            welcomeMessage += `• Para criar um *pedido de assistência*, envie: "pedido"\n`;
            welcomeMessage += `• Para registar *ponto*, envie: "ponto"\n\n`;
            welcomeMessage += `Como posso ajudá-lo hoje?`;
        } else if (canCreateRequests && !canRegisterPonto) {
            // Só pode criar pedidos
            welcomeMessage += `**Serviço disponível:**\n`;
            welcomeMessage += `• Para criar um *pedido de assistência*, envie: "pedido"\n\n`;
            welcomeMessage += `Como posso ajudá-lo hoje?`;
        } else if (!canCreateRequests && canRegisterPonto) {
            // Só pode registar ponto
            welcomeMessage += `**Serviço disponível:**\n`;
            welcomeMessage += `• Para registar *ponto*, envie: "ponto"\n\n`;
            welcomeMessage += `Como posso ajudá-lo hoje?`;
        } else {
            // Não tem nenhuma autorização
            welcomeMessage = `👋 Olá!\n\n`;
            welcomeMessage += `❌ **Acesso Restrito**\n\n`;
            welcomeMessage += `Lamentamos, mas o seu contacto não tem autorização para utilizar os serviços automáticos deste sistema.\n\n`;
            welcomeMessage += `📞 Para obter assistência, entre em contacto com a nossa equipa através dos canais habituais.\n\n`;
            welcomeMessage += `Obrigado pela compreensão.`;
        }

        await client.sendMessage(phoneNumber, welcomeMessage);
    } catch (error) {
        console.error("Erro ao enviar mensagem de boas-vindas:", error);
        // Fallback para mensagem genérica em caso de erro
        const fallbackMessage = `👋 Bem-vindo!\n\nEste é o assistente automático da Advir Plan Consultoria.\n\nPara assistência, contacte a nossa equipa.`;
        try {
            await client.sendMessage(phoneNumber, fallbackMessage);
        } catch (fallbackError) {
            console.error("Erro ao enviar mensagem de fallback:", fallbackError);
        }
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
    if (
        schedule.lastSent &&
        typeof schedule.lastSent === "string" &&
        schedule.lastSent.startsWith(todayDate)
    ) {
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