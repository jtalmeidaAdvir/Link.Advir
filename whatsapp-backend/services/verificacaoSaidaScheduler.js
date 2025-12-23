const axios = require('axios');
const Schedule = require('../models/Schedule');

const BACKEND_URL = process.env.BACKEND_URL || 'https://backend.advir.pt';
const WHATSAPP_BACKEND_URL = process.env.WHATSAPP_BACKEND_URL || 'http://localhost:7001';

class VerificacaoSaidaScheduler {
    constructor() {
        this.checkInterval = null;
        this.isRunning = false;
        this.lastExecutionMinute = null; // Controla para não executar múltiplas vezes no mesmo minuto
    }

    /**
     * Inicia o scheduler
     */
    start(whatsappService) {
        if (this.isRunning) {
            console.log('⚠️ [VERIFICAÇÃO SAÍDA] Scheduler já está em execução');
            return;
        }

        console.log('🚀 [VERIFICAÇÃO SAÍDA] Iniciando scheduler...');
        this.isRunning = true;
        this.whatsappService = whatsappService;

        // Verificar a cada minuto
        this.checkInterval = setInterval(() => {
            this.checkAndExecute();
        }, 60000); // 60 segundos

        // Executar imediatamente ao iniciar
        setTimeout(() => this.checkAndExecute(), 5000); // Aguardar 5 segundos para WhatsApp conectar

        console.log('✅ [VERIFICAÇÃO SAÍDA] Scheduler iniciado - verificando a cada 1 minuto');
    }

    /**
     * Para o scheduler
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        console.log('⏹️ [VERIFICAÇÃO SAÍDA] Scheduler parado');
    }

    /**
     * Verifica e executa as verificações que devem ser disparadas
     */
    async checkAndExecute() {
        try {
            const agora = new Date();
            // Usar timezone de Portugal para comparação correcta de horários
            const portugalTime = new Date(agora.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }));
            const horaAtual = portugalTime.getHours().toString().padStart(2, '0');
            const minutoAtual = portugalTime.getMinutes().toString().padStart(2, '0');
            const horarioAtual = `${horaAtual}:${minutoAtual}`;
            const diaSemanaAtual = portugalTime.getDay(); // 0 = Domingo, 1 = Segunda, etc.

            // Evitar executar múltiplas vezes no mesmo minuto
            const currentMinuteKey = `${horaAtual}:${minutoAtual}`;
            if (this.lastExecutionMinute === currentMinuteKey) {
                return;
            }
            this.lastExecutionMinute = currentMinuteKey;

            // Buscar todas as verificações ativas do tipo verificacao_saida
            const verificacoes = await Schedule.findAll({
                where: {
                    tipo: 'verificacao_saida',
                    enabled: true
                }
            });

            if (verificacoes.length === 0) {
                return;
            }

            console.log(`🔍 [VERIFICAÇÃO SAÍDA] ${horarioAtual} - Verificando ${verificacoes.length} configuração(ões)`);

            for (const verificacao of verificacoes) {
                try {
                    // Parse dos dias da semana
                    const diasSemana = JSON.parse(verificacao.days || '[1,2,3,4,5]');

                    // Verificar se hoje é um dia válido
                    if (!diasSemana.includes(diaSemanaAtual)) {
                        continue;
                    }

                    // Verificar se está dentro do período configurado
                    const horarioInicio = verificacao.horario_inicio;
                    const horarioFim = verificacao.horario_fim;

                    if (!horarioInicio || !horarioFim) {
                        console.log(`⚠️ [VERIFICAÇÃO SAÍDA] Verificação ${verificacao.id} sem período configurado, pulando...`);
                        continue;
                    }

                    // Verificar se está dentro do período
                    if (horarioAtual < horarioInicio || horarioAtual > horarioFim) {
                        continue;
                    }

                    // Verificar se chegou o intervalo de execução
                    const intervaloMinutos = verificacao.intervalo_minutos || 1;
                    const minutos = parseInt(minutoAtual);

                    if (minutos % intervaloMinutos !== 0) {
                        continue;
                    }

                    console.log(`✅ [VERIFICAÇÃO SAÍDA] Executando verificação: ${verificacao.nome_configuracao || verificacao.id}`);
                    console.log(`   ⏰ Horário: ${horarioAtual} (Período: ${horarioInicio}-${horarioFim}, Intervalo: ${intervaloMinutos}min)`);

                    // Executar a verificação
                    await this.executarVerificacao(verificacao);

                } catch (error) {
                    console.error(`❌ [VERIFICAÇÃO SAÍDA] Erro ao processar verificação ${verificacao.id}:`, error.message);
                }
            }

        } catch (error) {
            console.error('❌ [VERIFICAÇÃO SAÍDA] Erro ao verificar agendamentos:', error.message);
        }
    }

    /**
     * Executa uma verificação de saída
     */
    async executarVerificacao(verificacao) {
        try {
            // Processar contactos direto do Schedule
            let contactos = [];
            try {
                let rawContacts = JSON.parse(verificacao.contact_list);

                // Se ainda for string, parse novamente
                if (typeof rawContacts === "string") {
                    rawContacts = JSON.parse(rawContacts);
                }

                if (!Array.isArray(rawContacts)) {
                    throw new Error("contact_list não é array");
                }

                contactos = rawContacts.map(c => ({
                    phone: c.phone || c.numeroTecnico || c.numero || c.telefone,
                    user_id: c.user_id || c.userID || null,
                }));

            } catch (e) {
                console.error(`❌ [VERIFICAÇÃO SAÍDA] Erro ao processar contactos da verificação ${verificacao.id}:`, e.message);
                return;
            }

            const hoje = new Date().toISOString().split("T")[0];
            const agora = new Date();
            const horaAtual = `${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}`;

            // Carregar lista de já notificados hoje
            let notificadosHoje = [];
            try {
                if (verificacao.notificados_hoje) {
                    const dados = JSON.parse(verificacao.notificados_hoje);
                    // Verificar se é do mesmo dia
                    if (dados.data === hoje) {
                        notificadosHoje = dados.user_ids || [];
                    }
                }
            } catch (e) {
                // Iniciar vazio se erro
            }

            let mensagensEnviadas = 0;
            let semSaida = 0;
            let erros = 0;
            let comSaida = 0;
            let semHorario = 0;
            let foraDoPeriodo = 0;
            let jaNotificado = 0;
            let semEntrada = 0;

            for (const contacto of contactos) {
                const phone = contacto.phone;
                const user_id = contacto.user_id;

                try {
                    // 1. Verificar se tem user_id
                    if (!user_id) {
                        semHorario++;
                        continue;
                    }

                    // 2. Verificar se já foi notificado hoje
                    if (notificadosHoje.includes(user_id.toString())) {
                        jaNotificado++;
                        continue;
                    }

                    // 3. Verificar se tem horário associado
                    const horarioCheck = await axios.get(
                        `${BACKEND_URL}/api/registo-ponto-obra/verificar-horario?user_id=${user_id}&data=${hoje}`,
                        { timeout: 5000 }
                    );

                    if (!horarioCheck.data.temHorario) {
                        semHorario++;
                        continue;
                    }

                    const horarioInfo = horarioCheck.data.horario;

                    // 4. Verificar se a data atual está dentro do período do horário
                    const dataInicio = new Date(horarioInfo.dataInicio);
                    const dataFim = horarioInfo.dataFim ? new Date(horarioInfo.dataFim) : null;
                    const dataHoje = new Date(hoje);

                    if (dataHoje < dataInicio) {
                        foraDoPeriodo++;
                        continue;
                    }

                    if (dataFim && dataHoje > dataFim) {
                        foraDoPeriodo++;
                        continue;
                    }

                    // 5. Verificar se hoje é um dia de trabalho
                    const diaSemana = agora.getDay();
                    if (horarioInfo.diasSemana && !horarioInfo.diasSemana.includes(diaSemana)) {
                        continue;
                    }

                    // 6. Verificar se já passou a hora de saída + margem de tolerância
                    if (horarioInfo.horaSaida) {
                        let horaSaida = horarioInfo.horaSaida;

                        // Se vier como timestamp ISO, extrair apenas a hora
                        if (horaSaida.includes('T')) {
                            const date = new Date(horaSaida);
                            horaSaida = `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
                        }

                        const [horaSaidaH, horaSaidaM] = horaSaida.split(':').map(Number);
                        const [horaAtualH, horaAtualM] = horaAtual.split(':').map(Number);

                        const minutosSaida = horaSaidaH * 60 + horaSaidaM;
                        const minutosAtual = horaAtualH * 60 + horaAtualM;
                        const diferencaMinutos = minutosAtual - minutosSaida;

                        console.log(`   ⏰ Verificação tempo: Saída ${horaSaida}, Atual ${horaAtual}, Diferença ${diferencaMinutos}min`);

                        // Só notificar se já passou 30 minutos da hora de saída
                        if (diferencaMinutos < 30) {
                            console.log(`   ⏭️ Ainda não passaram 30min da saída esperada`);
                            continue;
                        }
                    } else {
                        // Se não tem hora de saída definida, pular
                        semHorario++;
                        continue;
                    }

                    // 7. Verificar se já registou saída hoje
                    const saidaCheck = await axios.get(
                        `${BACKEND_URL}/api/registo-ponto-obra/verificar-saida?user_id=${user_id}&data=${hoje}`,
                        { timeout: 5000 }
                    );

                    // Se não tem entrada, não faz sentido cobrar saída
                    if (!saidaCheck.data.temEntrada) {
                        semEntrada++;
                        continue;
                    }

                    // Se já tem saída, pular
                    if (saidaCheck.data.temSaida) {
                        comSaida++;
                        continue;
                    }

                    semSaida++;

                    // 8. Enviar mensagem via WhatsApp
                    if (!this.whatsappService?.isClientReady) {
                        console.error("❌ [VERIFICAÇÃO SAÍDA] WhatsApp não está pronto");
                        erros++;
                        continue;
                    }

                    await this.whatsappService.sendMessage(phone + "@c.us", verificacao.message);
                    console.log(`   ✅ Mensagem enviada para ${phone} (user_id: ${user_id})`);
                    mensagensEnviadas++;

                    // Adicionar à lista de notificados
                    notificadosHoje.push(user_id.toString());

                    // Delay entre mensagens
                    await new Promise(r => setTimeout(r, 2000));

                } catch (e) {
                    console.error(`   ❌ Erro ao processar ${phone}:`, e.message);
                    erros++;
                }
            }

            // Atualizar estatísticas e lista de notificados
            await verificacao.update({
                last_sent: new Date(),
                total_sent: (verificacao.total_sent || 0) + 1,
                notificados_hoje: JSON.stringify({
                    data: hoje,
                    user_ids: notificadosHoje
                })
            });

            console.log(`   📊 Resultado: ${mensagensEnviadas} enviadas | ${comSaida} com saída | ${semSaida} sem saída | ${semEntrada} sem entrada | ${jaNotificado} já notificados | ${semHorario} sem horário | ${erros} erros`);

        } catch (error) {
            console.error(`❌ [VERIFICAÇÃO SAÍDA] Erro ao executar verificação ${verificacao.id}:`, error.message);
        }
    }

    /**
     * Retorna status do scheduler
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            checkIntervalActive: this.checkInterval !== null,
            lastExecutionMinute: this.lastExecutionMinute
        };
    }
}

// Singleton
const verificacaoSaidaScheduler = new VerificacaoSaidaScheduler();

module.exports = verificacaoSaidaScheduler;
