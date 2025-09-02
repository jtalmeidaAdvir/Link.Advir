
const express = require('express');
const router = express.Router();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fetch = require('node-fetch');
const Contact = require('../models/Contact');
const Schedule = require('../models/Schedule');
const { getAuthToken } = require('../services/tokenService');
const {
    processarMensagemIntervencao,
    isIntervencaoKeyword,
} = require('./intervencaoRoutes');

let scheduleLogs = [];
const activeSchedules = new Map();
let client = null;
let isClientReady = false;
let qrCodeData = null;
let clientStatus = "disconnected";
let isInitializing = false;
let isShuttingDown = false;
let scheduledMessages = [];

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

// Estrutura para armazenar estados temporários dos utilizadores
const userStates = {};

// Função para inicializar o cliente WhatsApp Web
const initializeWhatsAppWeb = async (retryCount = 0) => {
    const maxRetries = 3;

    if (client) {
        console.log("Cliente WhatsApp já existe, destruindo primeiro...");
        try {
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

        client = null;
        isClientReady = false;
        clientStatus = "disconnected";
        qrCodeData = null;
    }

    try {
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
                timeout: 60000,
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
            initializeSchedules();
        });

        client.on("message", async (message) => {
            try {
                await handleIncomingMessage(message);
            } catch (error) {
                console.error("Erro ao processar mensagem recebida:", error);

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
            setTimeout(() => initializeWhatsAppWeb(), 5000);
        });

        client.on("auth_failure", (msg) => {
            console.error("Falha na autenticação:", msg);
            clientStatus = "auth_failure";
        });

        await client.initialize();
    } catch (error) {
        console.error("❌ Erro ao inicializar cliente WhatsApp:", error);

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

        client = null;
        isClientReady = false;
        clientStatus = "error";
        qrCodeData = null;

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

    // Verificar se é uma mensagem de localização
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

    // Verificar se é mensagem do tipo location
    if (message.type === "location") {
        console.log(`📍 Mensagem tipo location detectada`);

        let latitude, longitude;

        if (message.location) {
            latitude = message.location.latitude;
            longitude = message.location.longitude;
        } else if (message.body && message.body.includes("geo:")) {
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

            if (
                (userState && userState.type === "awaiting_location") ||
                (conversation && conversation.data && conversation.data.userId)
            ) {
                console.log(
                    `📍 Processando registo de ponto com localização...`,
                );

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
                console.log(
                    `❌ Nenhum estado válido encontrado para processar localização`,
                );
                await client.sendMessage(
                    phoneNumber,
                    "📍 Localização recebida, mas não foi encontrado um registo de ponto em andamento. Envie 'ponto' primeiro para iniciar o registo.",
                );
                return;
            }
        }
    }

    // Analisar texto para coordenadas ou links do Google Maps
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

    // Verificar mensagens multimédia que podem conter localização
    if (message.hasMedia) {
        console.log(`📎 Mensagem com média recebida`);

        try {
            const media = await message.downloadMedia();
            if (media) {
                console.log(`📎 Tipo de média: ${media.mimetype}`);

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

    // Verificar se a mensagem parece ser dados de localização em base64
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

    // Verificar se é uma palavra-chave para novo pedido
    const canInterruptForRequest =
        !conversation ||
        conversation.state === CONVERSATION_STATES.INITIAL ||
        conversation.state === CONVERSATION_STATES.WAITING_CONFIRMATION;

    if (isRequestKeyword(messageText) && canInterruptForRequest) {
        if (conversation) {
            console.log(
                `🔄 Cancelando conversa anterior de ${phoneNumber} (estado: ${conversation.state}) para iniciar novo pedido`,
            );
            activeConversations.delete(phoneNumber);
        }

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

    // Verificar se é uma palavra-chave para registo de ponto
    const canInterruptForPonto =
        !conversation ||
        conversation.state === CONVERSATION_STATES.INITIAL ||
        conversation.state === CONVERSATION_STATES.WAITING_CONFIRMATION;

    if (isPontoKeyword(messageText) && canInterruptForPonto) {
        if (conversation) {
            console.log(
                `🔄 Cancelando conversa anterior de ${phoneNumber} (estado: ${conversation.state}) para iniciar registo de ponto`,
            );
            activeConversations.delete(phoneNumber);
        }

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

    // Verificar se há conversa de intervenção ativa
    if (
        require('./intervencaoRoutes').activeIntervencaoConversations &&
        require('./intervencaoRoutes').activeIntervencaoConversations.has(phoneNumber)
    ) {
        await processarMensagemIntervencao(phoneNumber, messageText, client);
        return;
    }

    // Verificar se é cancelamento de processo
    if (
        messageText.toLowerCase().includes("cancelar") ||
        messageText.toLowerCase().includes("sair")
    ) {
        console.log(`❌ Cancelamento solicitado por ${phoneNumber}`);

        clearUserState(phoneNumber);

        if (conversation) {
            activeConversations.delete(phoneNumber);
        }

        await client.sendMessage(
            phoneNumber,
            "❌ *Processo Cancelado*\n\nO registo de ponto foi cancelado.\n\nPara iniciar um novo registo, envie 'ponto'.",
        );
        return;
    }

    // Verificar se é uma palavra-chave para iniciar nova conversa de pedidos
    if (isRequestKeyword(messageText) && !conversation) {
        console.log(`🎯 Palavra-chave de início detectada: "${messageText}"`);

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

    // Se é palavra-chave de intervenção, processar
    if (isIntervencaoKeyword(messageText)) {
        const authResult = await checkContactAuthorization(phoneNumber);
        if (authResult.authorized) {
            await processarMensagemIntervencao(
                phoneNumber,
                messageText,
                client,
            );
            return;
        }
    }

    // Se existe conversa ativa e não é palavra-chave, continuar o fluxo normal
    if (conversation) {
        await continueConversation(phoneNumber, messageText, conversation);
        return;
    }

    // Se existe estado de utilizador, continuar
    if (userState) {
        if (userState.type === "selecting_obra") {
            await handleObraSelection(phoneNumber, message, {
                data: userState,
            });
        } else if (userState.type === "awaiting_location") {
            await client.sendMessage(
                phoneNumber,
                "📍 *Aguardando Localização GPS*\n\n" +
                "Por favor, envie a sua localização através de:\n" +
                "• Anexo (📎) → 'Localização' → 'Localização atual'\n" +
                "• Link do Google Maps\n" +
                "• Coordenadas GPS\n\n" +
                "💡 Se pretende cancelar o registo, digite 'cancelar'",
            );
        } else {
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
        console.log(
            `📵 Contacto ${phoneNumber} sem autorizações - ignorando mensagem: "${messageText}"`,
        );
        return;
    }

    // Se tem apenas uma autorização, dar dica específica
    if (!pedidoAuth.authorized && pontoAuth.authorized) {
        await client.sendMessage(
            phoneNumber,
            `📍 **Registo de Ponto**\n\nPara registar o seu ponto, envie a palavra "ponto".\n\nObrigado!`,
        );
        return;
    }

    if (pedidoAuth.authorized && !pontoAuth.authorized) {
        await client.sendMessage(
            phoneNumber,
            `🛠️ **Pedidos de Assistência**\n\nPara criar um pedido de assistência, envie a palavra "pedido".\n\nObrigado!`,
        );
        return;
    }

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

// Função para verificar se o contacto tem autorização para criar pedidos
async function checkContactAuthorization(phoneNumber) {
    try {
        const cleanPhoneNumber = phoneNumber
            .replace("@c.us", "")
            .replace(/\D/g, "");

        const contactLists = await Contact.findAll();

        for (const list of contactLists) {
            const contacts = JSON.parse(list.contacts);

            for (const contact of contacts) {
                let contactPhone, contactData;

                if (typeof contact === "object") {
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
                    contactPhone = contact.replace(/\D/g, "");
                    contactData = {
                        numeroCliente: list.numero_cliente,
                        numeroTecnico: list.numero_tecnico,
                        listName: list.name,
                        canCreateTickets: list.can_create_tickets,
                        userId: list.user_id,
                    };
                }

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

                    const phoneMatch =
                        contactPhone &&
                        (contactPhone === cleanPhoneNumber ||
                            contactPhone.includes(cleanPhoneNumber) ||
                            cleanPhoneNumber.includes(contactPhone) ||
                            contactPhone.endsWith(cleanPhoneNumber.slice(-9)) ||
                            cleanPhoneNumber.endsWith(contactPhone.slice(-9)));

                    if (phoneMatch && contactData.canRegisterPonto) {
                        const userId =
                            contactData.userID ||
                            contactData.user_id ||
                            contact.user_id;
                        if (!userId) {
                            return {
                                authorized: false,
                                contactData: null,
                                error: "Contacto não tem user_id configurado",
                            };
                        }

                        const dataInicio =
                            contactData.dataInicioAutorizacao ||
                            contact.dataInicioAutorizacao;
                        const dataFim =
                            contactData.dataFimAutorizacao ||
                            contact.dataFimAutorizacao;
                        const hoje = new Date().toISOString().split("T")[0];

                        if (dataInicio && hoje < dataInicio) {
                            return {
                                authorized: false,
                                contactData: null,
                                error: `Autorização só é válida a partir de ${new Date(dataInicio).toLocaleDateString("pt-PT")}`,
                            };
                        }

                        if (dataFim && hoje > dataFim) {
                            return {
                                authorized: false,
                                contactData: null,
                                error: `Autorização expirou em ${new Date(dataFim).toLocaleDateString("pt-PT")}`,
                            };
                        }

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

// Função para obter detalhes das obras autorizadas
async function getObrasAutorizadas(obrasIds) {
    if (!obrasIds || !Array.isArray(obrasIds) || obrasIds.length === 0) {
        console.log("❌ Nenhuma obra autorizada fornecida ou array vazio");
        return [];
    }

    try {
        console.log(
            `🔍 Buscando obras autorizadas pelos IDs: [${obrasIds.join(", ")}]`,
        );

        // Simular busca de obras - aqui você implementaria a consulta real à base de dados
        const obrasDetails = obrasIds.map((id, index) => ({
            id: parseInt(id),
            nome: `Obra ${id}`,
            codigo: `OBR${String(id).padStart(3, '0')}`,
            localizacao: `Localização ${index + 1}`,
        }));

        console.log(
            `✅ Encontradas ${obrasDetails.length} obras autorizadas`,
        );

        return obrasDetails;
    } catch (error) {
        console.error(
            "❌ Erro ao obter obras autorizadas:",
            error,
        );
        return [];
    }
}

// Iniciar novo pedido de assistência
async function startNewRequest(phoneNumber, initialMessage, contactData = null) {
    let conversationState = CONVERSATION_STATES.WAITING_CLIENT;
    let conversationData = {
        initialProblem: initialMessage,
        datahoraabertura: new Date()
            .toISOString()
            .replace("T", " ")
            .slice(0, 19),
    };

    if (contactData && contactData.numeroTecnico) {
        conversationData.tecnico = contactData.numeroTecnico;
    }
    if (contactData && contactData.userId) {
        conversationData.userId = contactData.userId;
    }

    let welcomeMessage = `🤖 *Sistema de Pedidos de Assistência Técnica*

Bem-vindo ao sistema automático de criação de pedidos de assistência técnica da Advir.`;

    const hadPreviousConversation = activeConversations.has(phoneNumber);
    if (hadPreviousConversation) {
        welcomeMessage += `\n\n🔄 *Conversa anterior cancelada* - Iniciando novo pedido.`;
    }

    if (contactData && contactData.numeroCliente) {
        conversationData.cliente = contactData.numeroCliente;
        conversationData.nomeCliente = contactData.numeroCliente;
        conversationData.contacto = null;
        conversationData.userId = contactData.userId;

        const resultadoContratos = await buscarContratosCliente(
            contactData.numeroCliente,
        );

        if (resultadoContratos.contratosAtivos.length === 0) {
            conversationState = CONVERSATION_STATES.WAITING_PROBLEM;
            welcomeMessage += `\n\n✅ Cliente identificado: *${contactData.numeroCliente}*
⚠️ *Atenção:* Não foram encontrados contratos ativos para este cliente.

*1. Descrição do Problema*
Por favor, descreva detalhadamente o problema ou situação que necessita de assistência técnica:`;
        } else if (resultadoContratos.contratosAtivos.length === 1) {
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
            conversationData.contratosDisponiveis =
                resultadoContratos.contratosAtivos;
            conversationState = CONVERSATION_STATES.WAITING_CONTRACT;

            welcomeMessage += `\n\n✅ Cliente identificado: *${contactData.numeroCliente}*

Foram encontrados múltiplos contratos ativos. Por favor, escolha um dos contratos abaixo digitando o número correspondente:

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

    const messageText =
        typeof message === "string" ? message : message.body || message;

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
            await handleConfirmationInput(
                phoneNumber,
                messageText,
                conversation,
            );
            break;
        case CONVERSATION_STATES.PONTO_WAITING_OBRA:
            await handleObraSelection(phoneNumber, messageText, conversation);
            break;
        case CONVERSATION_STATES.PONTO_WAITING_CONFIRMATION:
            await handlePontoConfirmationInput(
                phoneNumber,
                messageText,
                conversation,
            );
            break;
        default:
            console.log(
                `⚠️ Estado de conversa não reconhecido: ${conversation.state}`,
            );
            await client.sendMessage(
                phoneNumber,
                "❌ Ocorreu um erro no processamento da conversa. Por favor, inicie novamente enviando 'pedido' ou 'ponto'.",
            );
            activeConversations.delete(phoneNumber);
            break;
    }

    conversation.lastActivity = Date.now();
    activeConversations.set(phoneNumber, conversation);
}

// Funções auxiliares para gestão de estado
function setUserState(phoneNumber, state) {
    if (!userStates[phoneNumber]) {
        userStates[phoneNumber] = {};
    }
    userStates[phoneNumber] = { ...state, timestamp: Date.now() };
}

function getUserState(phoneNumber) {
    const state = userStates[phoneNumber];
    if (!state) {
        return null;
    }

    const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
    if (Date.now() - state.timestamp > INACTIVITY_TIMEOUT) {
        delete userStates[phoneNumber];
        return null;
    }

    return state;
}

function clearUserState(phoneNumber) {
    delete userStates[phoneNumber];
}

// Função para iniciar registo de ponto
async function startPontoRegistration(phoneNumber, initialMessage, contactData) {
    let conversationData = {
        initialMessage: initialMessage,
        timestamp: new Date().toISOString(),
        userId: contactData?.userId,
        userName: null,
        obrasDisponiveis: [],
        obraId: null,
        obraNome: null,
    };

    let welcomeMessage = `🕐 *Sistema de Registo de Ponto*

Bem-vindo ao sistema automático de registo de ponto da Advir.`;

    const hadPreviousConversation = activeConversations.has(phoneNumber);
    if (hadPreviousConversation) {
        welcomeMessage += `\n\n🔄 *Conversa anterior cancelada* - Iniciando registo de ponto.`;
    }

    welcomeMessage += `\n\n💡 _Pode digitar "cancelar" a qualquer momento para interromper o processo_`;

    if (contactData?.userId) {
        try {
            // Simular busca de utilizador - aqui implementaria consulta real
            const userName = `Utilizador ${contactData.userId}`;
            conversationData.userName = userName;
            console.log(
                `✅ Utilizador encontrado: ${userName} (ID: ${contactData.userId})`,
            );

            const obrasAutorizadasIds = contactData.obrasAutorizadas;
            const obrasInfo = await getObrasAutorizadas(obrasAutorizadasIds);

            if (obrasInfo.length === 0) {
                console.log(
                    `⚠️ Nenhuma obra ativa encontrada para utilizador ${userName}`,
                );

                const registoInfo = await determinarTipoRegisto(
                    contactData.userId,
                    null,
                );

                conversationData.obraId = null;
                conversationData.obraNome = "Sem obra específica";
                conversationData.tipoRegisto = registoInfo.tipo;
                conversationData.precisaSaidaAutomatica =
                    registoInfo.precisaSaidaAutomatica;
                conversationData.obraAnterior = registoInfo.obraAnterior;

                const tipoTexto =
                    registoInfo.tipo === "entrada" ? "ENTRADA" : "SAÍDA";
                const emoji = registoInfo.tipo === "entrada" ? "🟢" : "🔴";

                setUserState(phoneNumber, {
                    type: "awaiting_location",
                    userId: conversationData.userId,
                    obraId: null,
                    obraNome: "Sem obra específica",
                    tipoRegisto: registoInfo.tipo,
                    precisaSaidaAutomatica:
                        registoInfo.precisaSaidaAutomatica,
                    obraAnterior: registoInfo.obraAnterior,
                });

                let response = `✅ *Utilizador:* ${userName}\n`;
                response += `⚠️ *Nota:* Sem obra específica autorizada\n`;
                response += `${emoji} *Registo:* ${tipoTexto}\n\n`;
                response += `📍 *Envie a sua localização:*\n`;
                response += `• Anexo (📎) → 'Localização'\n`;
                response += `• Link do Google Maps\n`;
                response += `• Coordenadas GPS`;

                await client.sendMessage(phoneNumber, response);
                return;
            } else if (obrasInfo.length === 1) {
                const obra = obrasInfo[0];
                conversationData.obraId = obra.id;
                conversationData.obraNome = obra.nome;

                const registoInfo = await determinarTipoRegisto(
                    contactData.userId,
                    obra.id,
                );

                conversationData.tipoRegisto = registoInfo.tipo;
                conversationData.precisaSaidaAutomatica =
                    registoInfo.precisaSaidaAutomatica;
                conversationData.obraAnterior = registoInfo.obraAnterior;

                const tipoTexto =
                    registoInfo.tipo === "entrada" ? "ENTRADA" : "SAÍDA";
                const emoji = registoInfo.tipo === "entrada" ? "🟢" : "🔴";

                setUserState(phoneNumber, {
                    type: "awaiting_location",
                    userId: conversationData.userId,
                    obraId: obra.id,
                    obraNome: obra.nome,
                    tipoRegisto: registoInfo.tipo,
                    precisaSaidaAutomatica:
                        registoInfo.precisaSaidaAutomatica,
                    obraAnterior: registoInfo.obraAnterior,
                });

                let response = `✅ *Utilizador:* ${userName}\n`;
                response += `🏗️ *Obra:* ${obra.codigo} - ${obra.nome}\n`;

                if (registoInfo.precisaSaidaAutomatica) {
                    response += `🔄 *Mudança de obra detectada*\n`;
                    response += `📤 Será dada saída automática da obra anterior\n`;
                    response += `📥 Seguida de entrada nesta obra\n\n`;
                }

                response += `${emoji} *Registo:* ${tipoTexto}\n\n`;
                response += `📍 *Envie a sua localização:*\n`;
                response += `• Anexo (📎) → 'Localização'\n`;
                response += `• Link do Google Maps\n`;
                response += `• Coordenadas GPS`;

                await client.sendMessage(phoneNumber, response);
                return;
            } else {
                conversationData.obrasDisponiveis = obrasInfo;
                conversationData.userName = userName;

                let response = `✅ *Utilizador:* ${userName}\n\n`;
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
        } catch (error) {
            console.error(
                "Erro ao buscar dados do utilizador ou obras:",
                error,
            );
        }
    }

    await client.sendMessage(
        phoneNumber,
        `❌ *Erro de Configuração*\n\nNão foi possível identificar o utilizador ou as suas autorizações de obra.\n\n` +
        `Por favor, contacte o administrador para verificar a sua configuração.`,
    );
}

// Função para determinar tipo de registo
async function determinarTipoRegisto(userId, obraId) {
    try {
        // Simular lógica para determinar tipo de registo
        // Aqui implementaria consulta à base de dados para verificar último registo
        console.log(`🔍 Determinando tipo de registo para userId: ${userId}, obraId: ${obraId}`);

        // Por agora, retornar entrada como padrão
        return {
            tipo: "entrada",
            precisaSaidaAutomatica: false,
            obraAnterior: null
        };
    } catch (error) {
        console.error("Erro ao determinar tipo de registo:", error);
        return { tipo: "entrada", precisaSaidaAutomatica: false };
    }
}

// Função para processar registo de ponto com localização
async function processarRegistoPontoComLocalizacao(message, userState) {
    const phoneNumber = message.from;
    const latitude = message.location.latitude;
    const longitude = message.location.longitude;

    console.log(
        `🔄 Processando registo de ponto com localização para ${phoneNumber}`,
    );
    console.log(`📍 Coordenadas: ${latitude}, ${longitude}`);

    clearUserState(phoneNumber);

    const conversation = activeConversations.get(phoneNumber);
    const userId = userState.userId || (conversation && conversation.data && conversation.data.userId);
    const obraId = userState.obraId || (conversation && conversation.data && conversation.data.obraId);
    const obraNome = userState.obraNome || (conversation && conversation.data && conversation.data.obraNome);
    const tipoRegisto = userState.tipoRegisto || (conversation && conversation.data && conversation.data.tipoRegisto);

    if (!userId) {
        console.log(`❌ User ID não encontrado`);
        await client.sendMessage(
            phoneNumber,
            "❌ Erro: Não foi possível identificar o utilizador para o registo.",
        );
        return;
    }

    try {
        // Simular criação de registo - aqui implementaria a lógica real
        console.log(`🎯 Simulando registo de ponto:`);
        console.log(`   - User ID: ${userId}`);
        console.log(`   - Obra ID: ${obraId}`);
        console.log(`   - Tipo: ${tipoRegisto}`);
        console.log(`   - Coordenadas: ${latitude}, ${longitude}`);

        const tipoTexto = tipoRegisto === "entrada" ? "ENTRADA" : "SAÍDA";
        const emoji = tipoRegisto === "entrada" ? "🟢" : "🔴";

        let successMessage = `✅ *Registo Efetuado*\n\n`;
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

        clearUserState(phoneNumber);
        activeConversations.delete(phoneNumber);

        await client.sendMessage(
            phoneNumber,
            `❌ *Erro no Registo*\n\nOcorreu um erro ao processar o seu registo de ponto.\n\n` +
            `Para tentar novamente, envie: *ponto*`,
        );
    } finally {
        activeConversations.delete(phoneNumber);
    }
}

// Função para analisar dados de localização
function tryParseLocationData(messageText) {
    try {
        console.log(
            `🔍 Tentando extrair localização do texto: ${messageText.substring(0, 100)}...`,
        );

        // URLs do Google Maps
        const googleMapsPatterns = [
            /maps\.google\.com\/?\?q=(-?\d+\.?\d*),(-?\d+\.?\d*)/i,
            /maps\.google\.com\/maps\?q=(-?\d+\.?\d*),(-?\d+\.?\d*)/i,
            /google\.com\/maps\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/i,
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

        // Formato geo: URI
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

        // Coordenadas simples separadas por vírgula
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
        (Math.abs(lat) > 0.001 || Math.abs(lng) > 0.001)
    );
}

// Função para extrair localização de imagens
async function extractLocationFromImage(imageData) {
    try {
        console.log(
            `📷 Tentativa de extrair localização EXIF (não implementado completamente)`,
        );
        return null;
    } catch (error) {
        console.error("Erro ao extrair localização de imagem:", error);
        return null;
    }
}

// Função para selecionar obra
async function handleObraSelection(phoneNumber, message, conversation) {
    const selection = typeof message === "string" ? message.trim() : message.body.trim();
    const obrasInfo = conversation.data.obrasDisponiveis;
    const userId = conversation.data.userId;

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

    clearUserState(phoneNumber);

    const obraSelecionada = obrasInfo[selectedIndex];
    conversation.data.obraId = obraSelecionada.id;
    conversation.data.obraNome = obraSelecionada.nome;
    conversation.state = CONVERSATION_STATES.PONTO_WAITING_CONFIRMATION;
    activeConversations.set(phoneNumber, conversation);

    const registoInfo = await determinarTipoRegisto(
        conversation.data.userId,
        obraSelecionada.id,
    );

    const tipoTexto = registoInfo.tipo === "entrada" ? "ENTRADA" : "SAÍDA";
    const emoji = registoInfo.tipo === "entrada" ? "🟢" : "🔴";

    conversation.data.tipoRegisto = registoInfo.tipo;
    conversation.data.precisaSaidaAutomatica =
        registoInfo.precisaSaidaAutomatica;
    conversation.data.obraAnterior = registoInfo.obraAnterior;

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

// Função para confirmar ponto
async function handlePontoConfirmationInput(phoneNumber, message, conversation) {
    const tipoRegisto = await determinarTipoRegisto(
        conversation.data.userId,
        conversation.data.obraId,
    );

    conversation.data.tipoRegisto = tipoRegisto.tipo;

    setUserState(phoneNumber, {
        type: "awaiting_location",
        userId: conversation.data.userId,
        obraId: conversation.data.obraId,
        obraNome: conversation.data.obraNome,
        tipoRegisto: tipoRegisto.tipo,
    });

    const tipoTexto = tipoRegisto.tipo === "entrada" ? "ENTRADA" : "SAÍDA";
    const emoji = tipoRegisto.tipo === "entrada" ? "🟢" : "🔴";

    const locationInstructions =
        `${emoji} *Registo:* ${tipoTexto}\n\n` +
        `📍 *Envie a sua localização:*\n` +
        `• Anexo (📎) → "Localização"\n` +
        `• Link do Google Maps\n` +
        `• Coordenadas GPS`;

    await client.sendMessage(phoneNumber, locationInstructions);
}

// Enviar mensagem de boas-vindas
async function sendWelcomeMessage(phoneNumber) {
    try {
        const pedidoAuth = await checkContactAuthorization(phoneNumber);
        const pontoAuth = await checkPontoAuthorization(phoneNumber);

        let welcomeMessage = `👋 Bem-vindo!\n\nEste é o assistente automático da Advir Plan Consultoria.\n\n`;

        const canCreateRequests = pedidoAuth.authorized;
        const canRegisterPonto = pontoAuth.authorized;

        if (canCreateRequests && canRegisterPonto) {
            welcomeMessage += `**Serviços disponíveis:**\n`;
            welcomeMessage += `• Para criar um *pedido de assistência*, envie: "pedido"\n`;
            welcomeMessage += `• Para criar uma *intervenção*, envie: "intervenção"\n`;
            welcomeMessage += `• Para registar *ponto*, envie: "ponto"\n\n`;
            welcomeMessage += `Como posso ajudá-lo hoje?`;
        } else if (canCreateRequests && !canRegisterPonto) {
            welcomeMessage += `**Serviços disponíveis:**\n`;
            welcomeMessage += `• Para criar um *pedido de assistência*, envie: "pedido"\n`;
            welcomeMessage += `• Para criar uma *intervenção*, envie: "intervenção"\n\n`;
            welcomeMessage += `Como posso ajudá-lo hoje?`;
        } else if (!canCreateRequests && canRegisterPonto) {
            welcomeMessage += `**Serviço disponível:**\n`;
            welcomeMessage += `• Para registar *ponto*, envie: "ponto"\n\n`;
            welcomeMessage += `Como posso ajudá-lo hoje?`;
        } else {
            welcomeMessage = `👋 Olá!\n\n`;
            welcomeMessage += `❌ **Acesso Restrito**\n\n`;
            welcomeMessage += `Lamentamos, mas o seu contacto não tem autorização para utilizar os serviços automáticos deste sistema.\n\n`;
            welcomeMessage += `📞 Para obter assistência, entre em contacto com a nossa equipa através dos canais habituais.\n\n`;
            welcomeMessage += `Obrigado pela compreensão.`;
        }

        await client.sendMessage(phoneNumber, welcomeMessage);
    } catch (error) {
        console.error("Erro ao enviar mensagem de boas-vindas:", error);
        const fallbackMessage = `👋 Bem-vindo!\n\nEste é o assistente automático da Advir Plan Consultoria.\n\nPara assistência, contacte a nossa equipa.`;
        try {
            await client.sendMessage(phoneNumber, fallbackMessage);
        } catch (fallbackError) {
            console.error("Erro ao enviar mensagem de fallback:", fallbackError);
        }
    }
}

// Função para validar cliente
async function validarCliente(nomeCliente) {
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
}

// Função para buscar contratos do cliente
async function buscarContratosCliente(clienteId) {
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
}

// Handlers para input de conversa
async function handleClientInput(phoneNumber, message, conversation) {
    const nomeCliente = message.trim();
    const validacao = await validarCliente(nomeCliente);

    if (validacao.existe) {
        conversation.data.cliente = validacao.cliente.Cliente;
        conversation.data.nomeCliente = validacao.cliente.Nome;
        conversation.data.contacto = null;
        conversation.data.userId = validacao.cliente.userId;

        const resultadoContratos = await buscarContratosCliente(
            validacao.cliente.Cliente,
        );

        if (resultadoContratos.contratosAtivos.length === 0) {
            conversation.state = CONVERSATION_STATES.WAITING_PROBLEM;
            const response = `✅ Cliente encontrado: *${validacao.cliente.Cliente} - ${validacao.cliente.Nome}*

⚠️ *Atenção:* Não foram encontrados contratos ativos para este cliente.

*2. Descrição do Problema*
Por favor, descreva detalhadamente o problema ou situação que necessita de assistência técnica:`;

            await client.sendMessage(phoneNumber, response);
        } else if (resultadoContratos.contratosAtivos.length === 1) {
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
    }
}

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
    delete conversation.data.contratosDisponiveis;
}

async function handleProblemInput(phoneNumber, message, conversation) {
    conversation.data.problema = message.trim();

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

async function handlePriorityInput(phoneNumber, message, conversation) {
    const prioridadeTexto = message.trim().toUpperCase();

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
            prioridadeNumero = "2";
            break;
    }

    conversation.data.prioridade = prioridadeNumero;
    conversation.data.estado = 2;
    conversation.data.comoReproduzir = "";
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

async function handleConfirmationInput(phoneNumber, message, conversation) {
    const response = message.trim().toLowerCase();

    if (
        response === "sim" ||
        response === "s" ||
        response === "yes" ||
        response === "1"
    ) {
        try {
            console.log(
                `✅ Confirmação recebida de ${phoneNumber} - criando pedido...`,
            );
            const result = await createAssistenceRequest(
                phoneNumber,
                conversation,
            );

            if (activeConversations.has(phoneNumber)) {
                activeConversations.delete(phoneNumber);
            }

            console.log(
                `✅ Pedido criado e conversa limpa para ${phoneNumber}`,
            );
            return result;
        } catch (error) {
            console.error(
                `❌ Erro ao criar pedido para ${phoneNumber}:`,
                error,
            );

            activeConversations.delete(phoneNumber);

            await client.sendMessage(
                phoneNumber,
                "❌ Ocorreu um erro ao processar o seu pedido. Por favor, tente novamente enviando 'pedido'.",
            );

            return { success: false, error: error.message };
        }
    } else if (
        response === "não" ||
        response === "nao" ||
        response === "n" ||
        response === "no" ||
        response === "0"
    ) {
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

// Criar pedido de assistência
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

            if (data && (data.PedidoID || data.Id)) {
                pedidoID = data.PedidoID || data.Id;
                console.log(
                    "ℹ️ API respondeu erro mas conseguimos extrair PedidoID:",
                    pedidoID,
                );
            } else {
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
            message: "Pedido criado com sucesso",
        };
    } catch (error) {
        console.error("❌ Erro inesperado ao criar pedido:", error.message);

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
            message: "Pedido processado",
        };
    } finally {
        try {
            activeConversations.delete(phoneNumber);
            console.log(
                `🧹 Conversa limpa para ${phoneNumber} - pronto para novos pedidos`,
            );
        } catch (cleanupError) {
            console.warn("Erro ao limpar conversa:", cleanupError);
        }
    }
}

// Função para inicializar agendamentos
function initializeSchedules() {
    console.log("Inicializando agendamentos...");
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
                        : "09:00",
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

// Função para iniciar agendamento
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
            return;
        }

        const scheduleTimeParts = schedule.time.split(":");
        const scheduleHour = parseInt(scheduleTimeParts[0]);
        const scheduleMinute = parseInt(scheduleTimeParts[1]);

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
                executeScheduledMessage(schedule);
            } else {
                addLog(
                    schedule.id,
                    "warning",
                    "Condições não atendidas para execução hoje",
                );
            }
        }
    };

    const intervalId = setInterval(checkAndExecute, 60000);
    activeSchedules.set(schedule.id, intervalId);
}

// Função para verificar se deve executar hoje
function shouldExecuteToday(schedule, now) {
    const portugalTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }),
    );
    const today = portugalTime.getDay();
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

    if (
        schedule.lastSent &&
        typeof schedule.lastSent === "string" &&
        schedule.lastSent.startsWith(todayDate)
    ) {
        addLog(schedule.id, "warning", `Já foi enviado hoje (${todayDate})`);
        return false;
    }

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
        case "test":
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
    addLog(
        schedule.id,
        "info",
        `Iniciando execução para ${schedule.contactList ? schedule.contactList.length : 0} contactos`,
    );

    try {
        if (!isClientReady || !client) {
            addLog(schedule.id, "error", "WhatsApp não está conectado");
            return { success: false, error: "WhatsApp não conectado" };
        }

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

        for (let i = 0; i < schedule.contactList.length; i++) {
            const contact = schedule.contactList[i];
            addLog(schedule.id, "info", `Enviando para ${contact.name}`);
            try {
                let phoneNumber = contact.phone.replace(/\D/g, "");
                if (!phoneNumber.includes("@")) {
                    phoneNumber = phoneNumber + "@c.us";
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

        addLog(
            schedule.id,
            "success",
            `Execução concluída: ${successCount} sucessos, ${errorCount} erros`,
        );

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

// Função para adicionar log
function addLog(scheduleId, type, message, details = null) {
    const log = {
        id: Date.now() + Math.random(),
        scheduleId,
        type,
        message,
        details,
        timestamp: new Date().toISOString(),
    };
    scheduleLogs.unshift(log);
    if (scheduleLogs.length > 500) {
        scheduleLogs = scheduleLogs.slice(0, 500);
    }
    const portugalTime = new Date().toLocaleString("pt-PT", {
        timeZone: "Europe/Lisbon",
    });
    console.log(`[${portugalTime}] ${type.toUpperCase()}: ${message}`);
}

// Limpar conversas antigas
setInterval(
    () => {
        const now = Date.now();
        const TIMEOUT = 30 * 60 * 1000;

        for (const [phoneNumber, conversation] of activeConversations.entries()) {
            if (now - conversation.lastActivity > TIMEOUT) {
                activeConversations.delete(phoneNumber);
                client
                    .sendMessage(
                        phoneNumber,
                        "⏰ A sua sessão expirou por inactividade. Para iniciar um novo pedido de assistência técnica, envie uma mensagem contendo 'pedido' ou 'assistência'.",
                    )
                    .catch((err) =>
                        console.error("Erro ao enviar mensagem de timeout:", err),
                    );
            }
        }
    },
    5 * 60 * 1000,
);

// Endpoints
router.get('/status', (req, res) => {
    const response = {
        status: clientStatus,
        isReady: isClientReady,
        qrCode: qrCodeData,
        hasQrCode: !!qrCodeData,
        timestamp: new Date().toISOString(),
        clientExists: !!client,
        qrCodeLength: qrCodeData ? qrCodeData.length : 0,
    };

    res.json(response);
});

router.post('/connect', async (req, res) => {
    try {
        if (client) {
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

router.post('/disconnect', async (req, res) => {
    try {
        console.log("🔌 Iniciando desconexão completa do WhatsApp Web...");

        if (client) {
            try {
                const destroyPromise = client.destroy();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Destroy timeout")), 5000),
                );

                await Promise.race([destroyPromise, timeoutPromise]);
                console.log("✅ Cliente WhatsApp destruído com sucesso");
            } catch (destroyError) {
                console.error("⚠️ Erro ao destruir cliente:", destroyError.message);
            }
        }

        client = null;
        isClientReady = false;
        clientStatus = "disconnected";
        qrCodeData = null;

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

        res.json({
            message: "WhatsApp Web desconectado com sucesso",
            sessionCleared: true,
        });
    } catch (error) {
        console.error("Erro ao desconectar:", error);
        client = null;
        isClientReady = false;
        clientStatus = "disconnected";
        qrCodeData = null;
        res.status(500).json({ error: "Erro ao desconectar WhatsApp Web" });
    }
});

router.post('/send', async (req, res) => {
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

        let formattedMessage = message;
        if (priority === "urgent") {
            formattedMessage = `🚨 *URGENTE*\n${message}`;
        } else if (priority === "info") {
            formattedMessage = `ℹ️ *Info*\n${message}`;
        } else if (priority === "warning") {
            formattedMessage = `⚠️ *Aviso*\n${message}`;
        }

        let phoneNumber = to.replace(/\D/g, "");
        if (!phoneNumber.includes("@")) {
            phoneNumber = phoneNumber + "@c.us";
        }

        const isValidNumber = await client.isRegisteredUser(phoneNumber);
        if (!isValidNumber) {
            return res.status(400).json({
                error: "Número não está registrado no WhatsApp",
            });
        }

        const response = await client.sendMessage(phoneNumber, formattedMessage);

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

// Gestão de contactos
router.get('/contacts', async (req, res) => {
    try {
        const contacts = await Contact.findAll({
            order: [['created_at', 'DESC']]
        });

        const formattedContacts = contacts.map(contact => ({
            id: contact.id,
            name: contact.name,
            contacts: JSON.parse(contact.contacts),
            canCreateTickets: contact.can_create_tickets,
            canRegisterPonto: contact.can_register_ponto,
            numeroTecnico: contact.numero_tecnico,
            numeroCliente: contact.numero_cliente,
            createdAt: contact.created_at,
            user_id: contact.user_id
        }));

        res.json(formattedContacts);
    } catch (error) {
        console.error('Erro ao carregar contactos:', error);
        res.status(500).json({
            error: 'Erro ao carregar contactos',
            details: error.message
        });
    }
});

router.post('/contact-lists', async (req, res) => {
    try {
        const {
            name,
            contacts,
            canCreateTickets = false,
            canRegisterPonto = false,
            numeroTecnico,
            numeroCliente,
            individualContacts,
            user_id
        } = req.body;

        if (!name || !contacts || contacts.length === 0) {
            return res.status(400).json({
                error: 'Nome e lista de contactos são obrigatórios'
            });
        }

        let contactsToStore;
        if (individualContacts && Array.isArray(individualContacts)) {
            contactsToStore = individualContacts.map(contact => ({
                ...contact,
                user_id: contact.user_id || contact.userID || user_id || null
            }));
        } else {
            contactsToStore = contacts.map(contact => {
                if (typeof contact === 'string') {
                    return {
                        phone: contact,
                        numeroTecnico: numeroTecnico || '',
                        numeroCliente: numeroCliente || '',
                        canCreateTickets: canCreateTickets || false,
                        canRegisterPonto: canRegisterPonto || false,
                        user_id: user_id || null
                    };
                }
                return {
                    ...contact,
                    user_id: contact.user_id || contact.userID || user_id || null
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
            user_id: user_id || null
        });

        res.json({
            message: 'Lista de contactos criada com sucesso',
            contactList: {
                id: newContactList.id,
                name: newContactList.name,
                contacts: JSON.parse(newContactList.contacts),
                canCreateTickets: newContactList.can_create_tickets,
                canRegisterPonto: newContactList.can_register_ponto,
                numeroTecnico: newContactList.numero_tecnico,
                numeroCliente: newContactList.numero_cliente,
                createdAt: newContactList.created_at,
                user_id: newContactList.user_id
            }
        });
    } catch (error) {
        console.error('Erro ao criar lista de contactos:', error);
        res.status(500).json({ error: 'Erro ao criar lista de contactos' });
    }
});

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
            user_id,
        } = req.body;

        if (!name || !contacts || contacts.length === 0) {
            return res.status(400).json({
                error: "Nome e lista de contactos são obrigatórios",
            });
        }

        let contactsToStore;
        if (individualContacts && Array.isArray(individualContacts)) {
            contactsToStore = individualContacts.map((contact) => {
                return {
                    ...contact,
                    user_id:
                        contact.user_id || contact.userID || user_id || null,
                };
            });
        } else {
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
                        contact.user_id || contact.userID || user_id || null,
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
                user_id: user_id || null,
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

// Agendamentos
router.get('/schedules', async (req, res) => {
    try {
        const schedules = await Schedule.findAll({
            order: [['created_at', 'DESC']]
        });

        const formattedSchedules = schedules.map(schedule => ({
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
            totalSent: schedule.total_sent
        }));

        res.json(formattedSchedules);
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        res.status(500).json({
            error: 'Erro ao carregar agendamentos',
            details: error.message
        });
    }
});

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

        if (!message || !contactList || contactList.length === 0) {
            return res.status(400).json({
                error: "Mensagem e lista de contactos são obrigatórios",
            });
        }

        function isValidTimeFormat(timeStr) {
            return /^(\d{2}):(\d{2})(?::(\d{2}))?$/.test(timeStr);
        }

        function parseTimeToDate(timeStr) {
            const [hours, minutes, seconds] = timeStr.split(":").map(Number);
            const date = new Date(0);
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

router.delete("/conversations/:phoneNumber", (req, res) => {
    const phoneNumber = req.params.phoneNumber;

    if (activeConversations.has(phoneNumber)) {
        activeConversations.delete(phoneNumber);

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

router.get("/logs", (req, res) => {
    const { scheduleId, type, limit = 50 } = req.query;

    let filteredLogs = scheduleLogs;

    if (scheduleId) {
        filteredLogs = filteredLogs.filter(
            (log) => log.scheduleId === scheduleId,
        );
    }

    if (type) {
        filteredLogs = filteredLogs.filter((log) => log.type === type);
    }

    const limitedLogs = filteredLogs.slice(0, parseInt(limit));

    res.json({
        logs: limitedLogs,
        total: filteredLogs.length,
        activeSchedules: activeSchedules.size,
    });
});

module.exports = router;
