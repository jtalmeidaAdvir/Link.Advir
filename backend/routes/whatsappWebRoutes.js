const express = require("express");
const router = express.Router();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
//const { Schedule } = require('../models'); // Importar modelos de Schedule e Contact
const scheduleLogs = [];
const activeSchedules = new Map();
let client = null;
let isClientReady = false;
let qrCodeData = null;
let clientStatus = "disconnected";

// Função para inicializar o cliente WhatsApp Web
const initializeWhatsAppWeb = () => {
    if (client) {
        return; // Cliente já inicializado
    }
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: "./whatsapp-session",
        }),
        puppeteer: {
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
                "--disable-gpu",
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
initializeWhatsAppWeb();
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
        qrCodeLength: qrCodeData ? qrCodeData.length : 0
    };

    console.log("📊 Status solicitado:", {
        status: clientStatus,
        hasQrCode: !!qrCodeData,
        qrLength: qrCodeData ? qrCodeData.length : 0
    });

    res.json(response);
});

// Endpoint para iniciar conexão
router.post("/connect", (req, res) => {
    try {
        if (!client) {
            initializeWhatsAppWeb();
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
        res.status(500).json({ error: "Erro ao iniciar WhatsApp Web" });
    }
});

// Endpoint para desconectar
router.post("/disconnect", async (req, res) => {
    try {
        if (client) {
            await client.destroy();
            client = null;
            isClientReady = false;
            clientStatus = "disconnected";
            qrCodeData = null;
        }
        res.json({ message: "WhatsApp Web desconectado com sucesso" });
    } catch (error) {
        console.error("Erro ao desconectar:", error);
        res.status(500).json({ error: "Erro ao desconectar WhatsApp Web" });
    }
});

// Endpoint para limpar sessão completamente (para trocar de conta)
router.post("/clear-session", async (req, res) => {
    try {
        // Primeiro desconectar se estiver conectado
        if (client) {
            await client.destroy();
            client = null;
            isClientReady = false;
            clientStatus = "disconnected";
            qrCodeData = null;
        }

        // Limpar dados da sessão usando shell command
        const fs = require('fs');
        const path = require('path');

        const sessionPath = path.join(process.cwd(), 'whatsapp-session');

        // Remover diretório da sessão se existir
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log('Sessão WhatsApp limpa com sucesso');
        }

        res.json({
            message: "Sessão limpa com sucesso. Pode agora conectar com uma nova conta.",
            sessionCleared: true
        });
    } catch (error) {
        console.error("Erro ao limpar sessão:", error);
        res.status(500).json({ error: "Erro ao limpar sessão WhatsApp" });
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
        if (formattedNumber.includes('@')) {
            formattedNumber = formattedNumber.split('@')[0];
        }

        // Adicionar formatação com código de país se possível
        if (formattedNumber.length > 10) {
            const countryCode = formattedNumber.substring(0, formattedNumber.length - 9);
            const phoneNumber = formattedNumber.substring(formattedNumber.length - 9);
            formattedNumber = `+${countryCode} ${phoneNumber}`;
        }

        res.json({
            wid: info.wid._serialized,
            pushname: info.pushname || "Utilizador WhatsApp",
            me: info.me._serialized,
            formattedNumber: formattedNumber,
            isReady: isClientReady,
            connectionTime: new Date().toISOString(),
            platform: info.platform || "WhatsApp Web"
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
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const Contact = require('../models/contact');
const Schedule = require('../models/schedule');

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
            contacts: JSON.stringify(contacts)
        });

        res.json({
            message: "Lista de contactos criada com sucesso",
            contactList: {
                id: newContactList.id,
                name: newContactList.name,
                contacts: JSON.parse(newContactList.contacts),
                createdAt: newContactList.created_at
            }
        });
    } catch (error) {
        console.error("Erro ao criar lista de contactos:", error);
        res.status(500).json({ error: "Erro ao criar lista de contactos" });
    }
});

// Endpoint para obter listas de contactos
router.get('/contacts', async (req, res) => {
    try {
        // Verificar se a tabela existe, se não, tentar criar
        try {
            await Contact.sync({ force: false });
        } catch (syncError) {
            console.error('Erro ao sincronizar tabela contacts:', syncError);
            return res.status(500).json({
                message: 'Tabela contacts não existe. Use /api/init-whatsapp-tables para criar.'
            });
        }

        const contacts = await Contact.findAll({
            order: [['created_at', 'DESC']]
        });

        const formattedContacts = contacts.map(contact => ({
            id: contact.id,
            name: contact.name,
            contacts: JSON.parse(contact.contacts),
            createdAt: contact.created_at
        }));

        res.json(formattedContacts);
    } catch (error) {
        console.error('Erro ao carregar listas de contactos:', error);
        res.status(500).json({
            message: 'Erro ao carregar listas de contactos',
            error: error.message
        });
    }
});

// Endpoint para eliminar lista de contactos
router.delete("/contact-lists/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Contact.destroy({
            where: { id }
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
const scheduledMessages = {};
// Endpoint para criar agendamento de mensagens
router.post("/schedule", async (req, res) => {
    try {
        if (!isClientReady || !client) {
            return res.status(400).json({
                error: "WhatsApp Web não está conectado",
            });
        }

        const { message, contactList, frequency, time, days, startDate, enabled, priority } = req.body;

        console.log("📥 Requisição recebida em POST /schedule");
        console.log("📦 Dados recebidos:", req.body);

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
                error: "Formato de hora inválido. Utilize o formato HH:MM ou HH:MM:SS."
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
            priority: priority || "normal"
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
            totalSent: newSchedule.total_sent
        };

        if (enabled) {
            startSchedule(scheduleData);
        }

        console.log("Criando agendamento com os seguintes dados:", scheduleData);

        res.json({
            message: "Agendamento criado com sucesso",
            schedule: scheduleData
        });
    } catch (error) {
        console.error("Erro ao criar agendamento:", error);
        res.status(500).json({ error: "Erro ao criar agendamento" });
    }
});





// Endpoint para obter agendamentos
router.get('/schedules', async (req, res) => {
    try {
        // Verificar se a tabela existe, se não, tentar criar
        try {
            await Schedule.sync({ force: false });
        } catch (syncError) {
            console.error('Erro ao sincronizar tabela schedules:', syncError);
            return res.status(500).json({
                message: 'Tabela schedules não existe. Use /api/init-whatsapp-tables para criar.'
            });
        }

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
            message: 'Erro ao carregar agendamentos',
            error: error.message
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
            return res.status(404).json({ error: "Agendamento não encontrado" });
        }

        // Parar agendamento atual se ativo
        if (activeSchedules.has(id.toString())) {
            clearInterval(activeSchedules.get(id.toString()));
            activeSchedules.delete(id.toString());
        }

        // Atualizar dados na base de dados
        await schedule.update({
            message: updates.message || schedule.message,
            contact_list: updates.contactList ? JSON.stringify(updates.contactList) : schedule.contact_list,
            frequency: updates.frequency || schedule.frequency,
            time: updates.time || schedule.time,
            days: updates.days ? JSON.stringify(updates.days) : schedule.days,
            start_date: updates.startDate || schedule.start_date,
            enabled: updates.enabled !== undefined ? updates.enabled : schedule.enabled,
            priority: updates.priority || schedule.priority
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
            totalSent: schedule.total_sent
        };

        // Reiniciar se habilitado
        if (schedule.enabled) {
            startSchedule(updatedSchedule);
        }

        res.json({
            message: "Agendamento atualizado com sucesso",
            schedule: updatedSchedule
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
            where: { id }
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
            return res.status(404).json({ error: "Agendamento não encontrado" });
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
            totalSent: schedule.total_sent
        };

        addLog(id.toString(), 'info', 'Execução manual iniciada pelo utilizador');
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
            contactList: contacts.map(contact => ({
                name: contact.name || 'Teste',
                phone: contact.phone
            })),
            priority,
            frequency: 'test',
            time: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            enabled: true
        };

        addLog(testSchedule.id, 'info', 'Teste de agendamento iniciado via API');
        const result = await executeScheduledMessage(testSchedule);

        res.json({
            message: "Teste de agendamento executado",
            scheduleId: testSchedule.id,
            result
        });
    } catch (error) {
        console.error("Erro no teste de agendamento:", error);
        res.status(500).json({ error: "Erro ao executar teste de agendamento" });
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
            contactList: contacts.map(contact => ({
                name: contact.name || 'Teste',
                phone: contact.phone
            })),
            frequency: 'test',
            time: testTime,
            enabled: true,
            priority,
            createdAt: new Date().toISOString(),
            lastSent: null,
            totalSent: 0
        };

        // Adicionar à lista de agendamentos
        scheduledMessages.push(schedule);

        addLog(scheduleId, 'info', `Agendamento forçado criado para ${testTime}`);

        // Agendar para executar na próxima vez que a hora bater
        startSchedule(schedule);

        res.json({
            message: "Agendamento forçado criado com sucesso",
            schedule,
            note: `Será executado quando o relógio marcar ${testTime}`
        });
    } catch (error) {
        console.error("Erro ao criar agendamento forçado:", error);
        res.status(500).json({ error: "Erro ao criar agendamento forçado" });
    }
});

// Endpoint para verificar status dos agendamentos ativos
router.get("/schedule-status", (req, res) => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    res.json({
        currentTime,
        totalSchedules: scheduledMessages.length,
        activeSchedules: activeSchedules.size,
        schedules: scheduledMessages.map(schedule => ({
            id: schedule.id,
            message: schedule.message.substring(0, 50) + "...",
            frequency: schedule.frequency,
            time: schedule.time,
            enabled: schedule.enabled,
            lastSent: schedule.lastSent,
            totalSent: schedule.totalSent,
            contactCount: schedule.contactList.length,
            isActive: activeSchedules.has(schedule.id)
        }))
    });
});

// Endpoint para debug completo do WhatsApp Web
router.get("/debug", (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        status: clientStatus,
        isReady: isClientReady,
        hasClient: !!client,
        qrCode: {
            exists: !!qrCodeData,
            length: qrCodeData ? qrCodeData.length : 0,
            preview: qrCodeData ? qrCodeData.substring(0, 50) + "..." : null
        },
        environment: {
            nodeVersion: process.version,
            platform: process.platform
        }
    });
});

// Endpoint para simular que é uma hora específica (para testes)
router.post("/simulate-time", async (req, res) => {
    try {
        const { time, scheduleId } = req.body;

        if (!time) {
            return res.status(400).json({
                error: "Hora é obrigatória (formato HH:MM)"
            });
        }

        let targetSchedules = scheduledMessages;
        if (scheduleId) {
            targetSchedules = scheduledMessages.filter(s => s.id === scheduleId);
            if (targetSchedules.length === 0) {
                return res.status(404).json({
                    error: "Agendamento não encontrado"
                });
            }
        }

        const results = [];

        for (const schedule of targetSchedules) {
            if (!schedule.enabled) {
                results.push({
                    scheduleId: schedule.id,
                    executed: false,
                    reason: "Agendamento desabilitado"
                });
                continue;
            }

            if (schedule.time === time) {
                addLog(schedule.id, 'info', `Simulação de execução para hora ${time}`);

                // Simular que deve executar hoje
                const fakeNow = new Date();
                const shouldExecute = shouldExecuteToday(schedule, fakeNow);

                if (shouldExecute) {
                    const result = await executeScheduledMessage(schedule);
                    results.push({
                        scheduleId: schedule.id,
                        executed: true,
                        result
                    });
                } else {
                    results.push({
                        scheduleId: schedule.id,
                        executed: false,
                        reason: "Condições de execução não atendidas"
                    });
                }
            } else {
                results.push({
                    scheduleId: schedule.id,
                    executed: false,
                    reason: `Hora não coincide (agendado: ${schedule.time}, simulado: ${time})`
                });
            }
        }

        res.json({
            message: `Simulação para hora ${time} concluída`,
            simulatedTime: time,
            results
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
        timestamp: new Date().toISOString()
    };

    scheduleLogs.unshift(log); // Adiciona no início para logs mais recentes primeiro

    // Manter apenas os últimos 500 logs
    if (scheduleLogs.length > 500) {
        scheduleLogs = scheduleLogs.slice(0, 500);
    }

    // Log no console também
    const timestamp = new Date().toLocaleString('pt-PT');
    console.log(`[${timestamp}] SCHEDULE ${scheduleId} - ${type.toUpperCase()}: ${message}`);
    if (details) {
        console.log(`[${timestamp}] DETAILS:`, details);
    }
}

// Função para iniciar um agendamento
function startSchedule(schedule) {
    if (activeSchedules.has(schedule.id)) {
        clearInterval(activeSchedules.get(schedule.id));
        addLog(schedule.id, 'info', 'Agendamento reiniciado');
    } else {
        addLog(schedule.id, 'info', `Agendamento iniciado - Frequência: ${schedule.frequency}, Hora: ${schedule.time}`);
    }
    const checkAndExecute = () => {
        const now = new Date();
        if (typeof schedule.time !== 'string') {
            addLog(schedule.id, 'error', `Formato inválido para schedule.time: ${schedule.time}`);
            return; // Sai da função se o formato for inválido
        }
        const scheduleTime = schedule.time.split(':');
        const scheduleHour = parseInt(scheduleTime[0]);
        const scheduleMinute = parseInt(scheduleTime[1]);
        if (now.getMinutes() === 0) {
            addLog(schedule.id, 'info', `Verificação automática - Próxima execução prevista: ${schedule.time}`);
        }
        if (now.getHours() === scheduleHour && now.getMinutes() === scheduleMinute) {
            addLog(schedule.id, 'info', 'Hora de execução atingida, verificando condições...');
            if (shouldExecuteToday(schedule, now)) {
                addLog(schedule.id, 'info', 'Condições atendidas, iniciando execução...');
                executeScheduledMessage(schedule); // Certifique-se de que executeScheduledMessage está definida corretamente
            } else {
                addLog(schedule.id, 'warning', 'Condições não atendidas para execução hoje');
            }
        }
    };
    // Define o intervalo para verificar a hora
    const intervalId = setInterval(checkAndExecute, 60000); // Verifica a cada minuto
    activeSchedules.set(schedule.id, intervalId);
}

// Função para verificar se deve executar hoje
function shouldExecuteToday(schedule, now) {
    const today = now.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const todayDate = now.toISOString().split('T')[0];
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Verificar se já foi enviado hoje
    if (schedule.lastSent && schedule.lastSent.startsWith(todayDate)) {
        addLog(schedule.id, 'warning', `Já foi enviado hoje (${todayDate})`);
        return false;
    }

    // Verificar data de início
    if (schedule.startDate && todayDate < schedule.startDate) {
        addLog(schedule.id, 'warning', `Data de início ainda não atingida (${schedule.startDate})`);
        return false;
    }

    let shouldExecute = false;
    let reason = '';

    switch (schedule.frequency) {
        case 'daily':
            shouldExecute = true;
            reason = 'Frequência diária';
            break;
        case 'weekly':
            shouldExecute = schedule.days.includes(today);
            reason = `Frequência semanal - Hoje é ${dayNames[today]} (${shouldExecute ? 'incluído' : 'não incluído'} nos dias selecionados)`;
            break;
        case 'monthly':
            shouldExecute = now.getDate() === 1;
            reason = `Frequência mensal - ${shouldExecute ? 'Primeiro dia do mês' : 'Não é o primeiro dia do mês'}`;
            break;
        case 'custom':
            shouldExecute = schedule.days.includes(today);
            reason = `Frequência customizada - ${shouldExecute ? 'Dia incluído' : 'Dia não incluído'}`;
            break;
        default:
            shouldExecute = false;
            reason = 'Frequência não reconhecida';
    }

    addLog(schedule.id, 'info', `Verificação de execução: ${reason}`, {
        frequency: schedule.frequency,
        today: dayNames[today],
        selectedDays: schedule.days,
        shouldExecute
    });

    return shouldExecute;
}

// Função para executar mensagem agendada
async function executeScheduledMessage(schedule) {
    addLog(schedule.id, 'info', `Iniciando execução para ${schedule.contactList.length} contactos`);

    try {
        if (!isClientReady || !client) {
            addLog(schedule.id, 'error', 'WhatsApp não está conectado');
            return { success: false, error: "WhatsApp não conectado" };
        }

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        // Formatação da mensagem baseada na prioridade
        let formattedMessage = schedule.message;
        if (schedule.priority === 'urgent') {
            formattedMessage = `🚨 *URGENTE*\n${schedule.message}`;
        } else if (schedule.priority === 'info') {
            formattedMessage = `ℹ️ *Info*\n${schedule.message}`;
        } else if (schedule.priority === 'warning') {
            formattedMessage = `⚠️ *Aviso*\n${schedule.message}`;
        }

        addLog(schedule.id, 'info', `Mensagem formatada com prioridade: ${schedule.priority}`);

        // Enviar para cada contacto
        for (let i = 0; i < schedule.contactList.length; i++) {
            const contact = schedule.contactList[i];
            addLog(schedule.id, 'info', `Enviando para contacto ${i + 1}/${schedule.contactList.length}: ${contact.name} (${contact.phone})`);

            try {
                let phoneNumber = contact.phone.replace(/\D/g, "");
                if (!phoneNumber.includes("@")) {
                    phoneNumber = phoneNumber + "@c.us";
                }

                const isValidNumber = await client.isRegisteredUser(phoneNumber);
                if (!isValidNumber) {
                    addLog(schedule.id, 'warning', `Número ${contact.phone} não está registrado no WhatsApp`);
                    results.push({
                        success: false,
                        contact: contact.name,
                        phone: contact.phone,
                        error: "Número não registrado no WhatsApp"
                    });
                    errorCount++;
                    continue;
                }

                const response = await client.sendMessage(phoneNumber, formattedMessage);
                addLog(schedule.id, 'success', `Mensagem enviada com sucesso para ${contact.name}`);
                results.push({
                    success: true,
                    contact: contact.name,
                    phone: contact.phone,
                    messageId: response.id._serialized
                });
                successCount++;

                // Pausa entre mensagens para evitar spam
                addLog(schedule.id, 'info', 'Aguardando 3 segundos antes da próxima mensagem...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                addLog(schedule.id, 'error', `Erro ao enviar para ${contact.name}: ${error.message}`);
                results.push({
                    success: false,
                    contact: contact.name,
                    phone: contact.phone,
                    error: error.message
                });
                errorCount++;
            }
        }

        // Atualizar estatísticas do agendamento na base de dados
        try {
            await Schedule.update({
                last_sent: new Date(),
                total_sent: sequelize.literal(`total_sent + ${successCount}`)
            }, {
                where: { id: schedule.id }
            });
        } catch (error) {
            console.error("Erro ao atualizar estatísticas:", error);
        }

        addLog(schedule.id, 'success', `Execução concluída: ${successCount} sucessos, ${errorCount} erros`, {
            total: schedule.contactList.length,
            success: successCount,
            errors: errorCount,
            results
        });

        return {
            success: true,
            message: "Mensagens agendadas enviadas",
            summary: {
                total: schedule.contactList.length,
                success: successCount,
                errors: errorCount
            },
            results
        };
    } catch (error) {
        addLog(schedule.id, 'error', `Erro crítico na execução: ${error.message}`, error);
        console.error("Erro ao executar mensagem agendada:", error);
        return { success: false, error: error.message };
    }
}

// Inicializar agendamentos salvos ao iniciar o servidor
function initializeSchedules() {
    scheduledMessages.forEach(schedule => {
        if (schedule.enabled) {
            startSchedule(schedule);
        }
    });
}

// Endpoint para obter logs dos agendamentos
router.get("/logs", (req, res) => {
    const { scheduleId, type, limit = 50 } = req.query;

    let filteredLogs = scheduleLogs;

    // Filtrar por ID do agendamento se fornecido
    if (scheduleId) {
        filteredLogs = filteredLogs.filter(log => log.scheduleId === scheduleId);
    }

    // Filtrar por tipo se fornecido
    if (type) {
        filteredLogs = filteredLogs.filter(log => log.type === type);
    }

    // Limitar número de logs
    const limitedLogs = filteredLogs.slice(0, parseInt(limit));

    res.json({
        logs: limitedLogs,
        total: filteredLogs.length,
        activeSchedules: activeSchedules.size
    });
});

// Endpoint para limpar logs
router.delete("/logs", (req, res) => {
    const { scheduleId } = req.query;

    if (scheduleId) {
        scheduleLogs = scheduleLogs.filter(log => log.scheduleId !== scheduleId);
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
            info: scheduleLogs.filter(l => l.type === 'info').length,
            success: scheduleLogs.filter(l => l.type === 'success').length,
            warning: scheduleLogs.filter(l => l.type === 'warning').length,
            error: scheduleLogs.filter(l => l.type === 'error').length
        },
        recentActivity: scheduleLogs.slice(0, 5).map(log => ({
            timestamp: log.timestamp,
            type: log.type,
            message: log.message
        }))
    };

    res.json(stats);
});

// Endpoint para sincronizar agendamentos do frontend com backend
router.post("/sync-schedules", (req, res) => {
    try {
        const { schedules } = req.body;

        if (!schedules || !Array.isArray(schedules)) {
            return res.status(400).json({
                error: "Array de agendamentos é obrigatório"
            });
        }

        // Parar todos os agendamentos ativos
        activeSchedules.forEach((intervalId, scheduleId) => {
            clearInterval(intervalId);
            addLog(scheduleId, 'info', 'Agendamento parado para sincronização');
        });
        activeSchedules.clear();

        // Atualizar lista de agendamentos
        scheduledMessages = schedules.map(schedule => ({
            ...schedule,
            syncedAt: new Date().toISOString()
        }));

        // Reiniciar agendamentos habilitados
        let startedCount = 0;
        scheduledMessages.forEach(schedule => {
            if (schedule.enabled) {
                startSchedule(schedule);
                startedCount++;
            }
        });

        addLog('SYSTEM', 'success', `Sincronização concluída: ${scheduledMessages.length} agendamentos, ${startedCount} ativos`);

        res.json({
            message: "Agendamentos sincronizados com sucesso",
            total: scheduledMessages.length,
            active: startedCount,
            schedules: scheduledMessages
        });
    } catch (error) {
        console.error("Erro na sincronização:", error);
        res.status(500).json({ error: "Erro na sincronização de agendamentos" });
    }
});

// Endpoint para debugging - mostrar próximas execuções
router.get("/next-executions", (req, res) => {
    const now = new Date();
    const executions = [];

    scheduledMessages.forEach(schedule => {
        if (!schedule.enabled) return;

        const [hours, minutes] = schedule.time.split(':');
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
            timeUntilNext: Math.ceil((nextExecution - now) / 60000) + " minutos",
            isActive: activeSchedules.has(schedule.id)
        });
    });

    // Ordenar por próxima execução
    executions.sort((a, b) => new Date(a.nextExecution) - new Date(b.nextExecution));

    res.json({
        currentTime: now.toISOString(),
        nextExecutions: executions
    });
});

// Chamar inicialização quando o cliente estiver pronto
const originalReady = client?.on;
if (client) {
    client.on('ready', () => {
        initializeSchedules();
    });
}

// Endpoint para criar as tabelas do WhatsApp Web (contacts e schedules)
router.post('/init-whatsapp-tables', async (req, res) => {
    try {
        await Contact.sync({ force: true }); // force: true irá apagar e recriar a tabela
        await Schedule.sync({ force: true }); // force: true irá apagar e recriar a tabela
        console.log('Tabelas contacts e schedules criadas com sucesso!');
        res.json({ message: 'Tabelas contacts e schedules criadas com sucesso!' });
    } catch (error) {
        console.error('Erro ao criar tabelas:', error);
        res.status(500).json({ error: 'Erro ao criar tabelas', details: error.message });
    }
});

module.exports = router;