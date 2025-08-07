const express = require("express");
const router = express.Router();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

let client = null;
let isClientReady = false;
let qrCodeData = null;
let clientStatus = "disconnected";

// Inicializar cliente WhatsApp Web
const initializeWhatsAppWeb = () => {
    if (client) {
        return;
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
        console.log("QR Code recebido! Escaneie com seu WhatsApp");
        qrcode.generate(qr, { small: true });
    });

    client.on("ready", () => {
        console.log("WhatsApp Web Cliente conectado!");
        isClientReady = true;
        clientStatus = "ready";
        qrCodeData = null;
    });

    client.on("authenticated", () => {
        console.log("WhatsApp Web autenticado!");
        clientStatus = "authenticated";
    });

    client.on("auth_failure", (msg) => {
        console.error("Falha na autenticação:", msg);
        clientStatus = "auth_failure";
    });

    client.on("disconnected", (reason) => {
        console.log("WhatsApp Web desconectado:", reason);
        isClientReady = false;
        clientStatus = "disconnected";
        client = null;
    });

    client.initialize();
};

// Endpoint para inicializar/obter status
router.get("/status", (req, res) => {
    res.json({
        status: clientStatus,
        isReady: isClientReady,
        qrCode: qrCodeData,
        hasQrCode: !!qrCodeData,
    });
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
        res.json({
            wid: info.wid._serialized,
            pushname: info.pushname,
            me: info.me._serialized,
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

// Sistema de armazenamento simples em memória para agendamentos
let scheduledMessages = [];
let activeSchedules = new Map();
let scheduleLogs = [];

// Endpoint para criar agendamento de mensagens
router.post("/schedule", async (req, res) => {
    try {
        if (!isClientReady || !client) {
            return res.status(400).json({
                error: "WhatsApp Web não está conectado",
            });
        }

        const { message, contactList, frequency, time, days, startDate, enabled, priority } = req.body;

        if (!message || !contactList || contactList.length === 0) {
            return res.status(400).json({
                error: "Mensagem e lista de contactos são obrigatórios",
            });
        }

        const scheduleId = Date.now().toString();
        const schedule = {
            id: scheduleId,
            message,
            contactList,
            frequency: frequency || 'daily',
            time: time || '09:00',
            days: days || [],
            startDate: startDate || new Date().toISOString().split('T')[0],
            enabled: enabled !== false,
            priority: priority || 'normal',
            createdAt: new Date().toISOString(),
            lastSent: null,
            totalSent: 0
        };

        scheduledMessages.push(schedule);

        if (schedule.enabled) {
            startSchedule(schedule);
        }

        res.json({
            message: "Agendamento criado com sucesso",
            schedule
        });
    } catch (error) {
        console.error("Erro ao criar agendamento:", error);
        res.status(500).json({ error: "Erro ao criar agendamento" });
    }
});

// Endpoint para listar agendamentos
router.get("/schedules", (req, res) => {
    res.json({ schedules: scheduledMessages });
});

// Endpoint para atualizar agendamento
router.put("/schedule/:id", (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const scheduleIndex = scheduledMessages.findIndex(s => s.id === id);
        if (scheduleIndex === -1) {
            return res.status(404).json({ error: "Agendamento não encontrado" });
        }

        // Parar agendamento atual se ativo
        if (activeSchedules.has(id)) {
            clearInterval(activeSchedules.get(id));
            activeSchedules.delete(id);
        }

        // Atualizar dados
        scheduledMessages[scheduleIndex] = { 
            ...scheduledMessages[scheduleIndex], 
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Reiniciar se habilitado
        if (scheduledMessages[scheduleIndex].enabled) {
            startSchedule(scheduledMessages[scheduleIndex]);
        }

        res.json({
            message: "Agendamento atualizado com sucesso",
            schedule: scheduledMessages[scheduleIndex]
        });
    } catch (error) {
        console.error("Erro ao atualizar agendamento:", error);
        res.status(500).json({ error: "Erro ao atualizar agendamento" });
    }
});

// Endpoint para deletar agendamento
router.delete("/schedule/:id", (req, res) => {
    try {
        const { id } = req.params;

        // Parar agendamento se ativo
        if (activeSchedules.has(id)) {
            clearInterval(activeSchedules.get(id));
            activeSchedules.delete(id);
        }

        // Remover da lista
        scheduledMessages = scheduledMessages.filter(s => s.id !== id);

        res.json({ message: "Agendamento removido com sucesso" });
    } catch (error) {
        console.error("Erro ao remover agendamento:", error);
        res.status(500).json({ error: "Erro ao remover agendamento" });
    }
});

// Endpoint para executar agendamento manualmente
router.post("/schedule/:id/execute", async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = scheduledMessages.find(s => s.id === id);

        if (!schedule) {
            return res.status(404).json({ error: "Agendamento não encontrado" });
        }

        if (!isClientReady || !client) {
            return res.status(400).json({
                error: "WhatsApp Web não está conectado",
            });
        }

        addLog(id, 'info', 'Execução manual iniciada pelo utilizador');
        const result = await executeScheduledMessage(schedule);
        res.json(result);
    } catch (error) {
        console.error("Erro ao executar agendamento:", error);
        res.status(500).json({ error: "Erro ao executar agendamento" });
    }
});

// Endpoint para testar sistema de logs
router.post("/test-logs", (req, res) => {
    const testId = "TEST_" + Date.now();
    
    addLog(testId, 'info', 'Log de teste criado');
    addLog(testId, 'success', 'Sistema de logs funcionando perfeitamente');
    addLog(testId, 'warning', 'Este é um aviso de teste');
    addLog(testId, 'error', 'Este é um erro de teste (simulado)');
    
    res.json({ 
        message: "Logs de teste criados com sucesso",
        testId: testId
    });
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
        const scheduleTime = schedule.time.split(':');
        const scheduleHour = parseInt(scheduleTime[0]);
        const scheduleMinute = parseInt(scheduleTime[1]);

        // Log de verificação a cada hora (não a cada minuto para não poluir)
        if (now.getMinutes() === 0) {
            addLog(schedule.id, 'info', `Verificação automática - Próxima execução prevista: ${schedule.time}`);
        }

        // Verificar se é a hora correta (com margem de 1 minuto)
        if (now.getHours() === scheduleHour && now.getMinutes() === scheduleMinute) {
            addLog(schedule.id, 'info', 'Hora de execução atingida, verificando condições...');
            
            // Verificar se deve executar baseado na frequência
            if (shouldExecuteToday(schedule, now)) {
                addLog(schedule.id, 'info', 'Condições atendidas, iniciando execução...');
                executeScheduledMessage(schedule);
            } else {
                addLog(schedule.id, 'warning', 'Condições não atendidas para execução hoje');
            }
        }
    };

    // Verificar a cada minuto
    const intervalId = setInterval(checkAndExecute, 60000);
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

        // Atualizar estatísticas do agendamento
        const scheduleIndex = scheduledMessages.findIndex(s => s.id === schedule.id);
        if (scheduleIndex !== -1) {
            scheduledMessages[scheduleIndex].lastSent = new Date().toISOString();
            scheduledMessages[scheduleIndex].totalSent += successCount;
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

// Chamar inicialização quando o cliente estiver pronto
const originalReady = client?.on;
if (client) {
    client.on('ready', () => {
        initializeSchedules();
    });
}

module.exports = router;
