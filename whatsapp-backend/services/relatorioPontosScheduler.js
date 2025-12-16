const axios = require('axios');
const Schedule = require('../models/Schedule');

const WEBAPI_URL = process.env.WEBAPI_URL || 'https://webapiprimavera.advir.pt';
const BACKEND_URL = process.env.BACKEND_URL || 'https://backend.advir.pt';

// Mapeamento de credenciais por empresa_id
const EMPRESA_CREDENTIALS = {
    5: { // JPA
        username: 'Advir',
        password: 'Code495@',
        company: 'JPA',
        instance: 'DEFAULT',
        line: 'Evolution'
    }
};

/**
 * Normaliza URL da empresa (adiciona protocolo se não tiver)
 */
function normalizeUrl(urlEmpresa) {
    if (!urlEmpresa) return '';
    
    // Se já tem protocolo, retornar como está
    if (urlEmpresa.startsWith('http://') || urlEmpresa.startsWith('https://')) {
        return urlEmpresa;
    }
    
    // Adicionar http:// por defeito
    return `http://${urlEmpresa}`;
}

/**
 * Obtém token de autenticação do Primavera WebAPI
 */
async function getAuthToken(credentials, urlEmpresa) {
    try {
        const baseUrl = normalizeUrl(urlEmpresa);
        const tokenUrl = `${baseUrl}/WebApi/token`;
        
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('username', credentials.username);
        params.append('password', credentials.password);
        params.append('company', credentials.company);
        params.append('instance', credentials.instance);
        params.append('line', credentials.line);

        console.log(`🔑 Obtendo token de: ${tokenUrl}`);

        const response = await axios.post(tokenUrl, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 10000
        });
        // 👉 MOSTRAR RESPOSTA COMPLETA
        console.log('📦 Resposta completa da API:', response.data);

        // 👉 MOSTRAR APENAS O TOKEN
        console.log('🔐 Access Token:', response.data.access_token);
        console.log(`✅ Token obtido com sucesso para empresa ${credentials.company}`);
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Erro ao obter token:', error.message);
        throw error;
    }
}

class RelatorioPontosScheduler {
    constructor() {
        this.checkInterval = null;
        this.isRunning = false;
        this.executedToday = new Set(); // Track executions per day per empresa
    }

    /**
     * Inicia o scheduler
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Scheduler de relatórios de pontos já está em execução');
            return;
        }

        console.log('🚀 Iniciando scheduler de relatórios de pontos...');
        this.isRunning = true;

        // Verificar a cada minuto
        this.checkInterval = setInterval(() => {
            this.checkAndExecute();
        }, 60000); // 60 segundos

        // Executar imediatamente ao iniciar
        this.checkAndExecute();

        console.log('✅ Scheduler de relatórios de pontos iniciado');
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
        console.log('⏹️ Scheduler de relatórios de pontos parado');
    }

    /**
     * Verifica e executa os agendamentos que devem ser disparados
     */
    async checkAndExecute() {
        try {
            const agora = new Date();
            // Usar timezone de Portugal para comparação correcta de horários
            const portugalTime = new Date(agora.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }));
            const horaAtual = portugalTime.getHours();
            const minutoAtual = portugalTime.getMinutes();
            const diaAtual = portugalTime.toDateString();
            const diaSemanaAtual = portugalTime.getDay(); // 0 = Domingo, 1 = Segunda, etc.

            // Buscar todos os agendamentos ativos
            const agendamentos = await Schedule.findAll({
                where: {
                    tipo: 'relatorio_pontos_email',
                    enabled: true
                }
            });

            if (agendamentos.length === 0) {
                return;
            }

            console.log(`🔍 Verificando ${agendamentos.length} agendamento(s) de relatórios`);

            for (const agendamento of agendamentos) {
                try {
                    // Parse do horário configurado
                    const horarioConfig = new Date(agendamento.time);
                    const horaConfig = horarioConfig.getHours();
                    const minutoConfig = horarioConfig.getMinutes();

                    // Parse dos dias da semana
                    const diasSemana = JSON.parse(agendamento.days || '[1,2,3,4,5]');

                    // Verificar se hoje é um dia válido
                    if (!diasSemana.includes(diaSemanaAtual)) {
                        continue;
                    }

                    // Verificar se é a hora certa (com tolerância de 1 minuto)
                    if (horaAtual !== horaConfig || minutoAtual !== minutoConfig) {
                        continue;
                    }

                    // Criar chave única para este agendamento hoje
                    const executionKey = `${agendamento.empresa_id}_${diaAtual}`;

                    // Verificar se já executou hoje
                    if (this.executedToday.has(executionKey)) {
                        console.log(`⏭️ Relatório para empresa ${agendamento.empresa_id} já foi enviado hoje`);
                        continue;
                    }

                    // Executar envio
                    console.log(`📧 Executando envio de relatórios para empresa ${agendamento.empresa_id}`);
                    await this.executarEnvioRelatorios(agendamento);

                    // Marcar como executado
                    this.executedToday.add(executionKey);

                    // Atualizar estatísticas
                    await agendamento.update({
                        last_sent: new Date(),
                        total_sent: (agendamento.total_sent || 0) + 1
                    });

                } catch (error) {
                    console.error(`❌ Erro ao processar agendamento ${agendamento.id}:`, error.message);
                }
            }

            // Limpar cache de execuções antigas (manter apenas do dia atual)
            this.executedToday.forEach(key => {
                if (!key.endsWith(diaAtual)) {
                    this.executedToday.delete(key);
                }
            });

        } catch (error) {
            console.error('❌ Erro ao verificar agendamentos de relatórios:', error);
        }
    }

    /**
     * Executa o envio de relatórios para uma empresa
     */
    async executarEnvioRelatorios(agendamento) {
        try {
            console.log(`🔄 Chamando webAPI para enviar relatórios da empresa ${agendamento.empresa_id}`);

            // Buscar urlempresa do backend
            let urlempresa = '';
            try {
                const empresaResponse = await axios.get(
                    `${BACKEND_URL}/api/empresas/${agendamento.empresa_id}`,
                    {
                        timeout: 5000
                    }
                );
                urlempresa = empresaResponse.data.urlempresa || '';
                console.log(`🌐 URL da empresa obtido: ${urlempresa}`);
            } catch (error) {
                console.warn(`⚠️ Erro ao buscar URL da empresa: ${error.message}`);
            }

            // Obter token automaticamente baseado no empresa_id
            let token = null;
            const credentials = EMPRESA_CREDENTIALS[agendamento.empresa_id];
            
            if (credentials && urlempresa) {
                try {
                    console.log(`🔐 Obtendo token para empresa ${agendamento.empresa_id}...`);
                    token = await getAuthToken(credentials, urlempresa);
                } catch (tokenError) {
                    console.error(`⚠️ Erro ao obter token: ${tokenError.message}`);
                    // Continuar sem token se falhar
                }
            } else if (!credentials) {
                console.warn(`⚠️ Credenciais não configuradas para empresa ${agendamento.empresa_id}`);
            }

            const response = await axios.post(
                `${WEBAPI_URL}/enviar-relatorios-pontos-obras`,
                {
                    empresa_id: agendamento.empresa_id,
                    token: token,
                    urlempresa: urlempresa
                },
                {
                    timeout: 60000 // 60 segundos de timeout
                }
            );

            if (response.data.success) {
                console.log(`✅ Relatórios enviados com sucesso para empresa ${agendamento.empresa_id}`);
                console.log(`   📊 Total obras: ${response.data.totalObras}`);
                console.log(`   📧 Emails enviados: ${response.data.emailsEnviados}`);
                console.log(`   ❌ Erros: ${response.data.erros}`);

                return {
                    success: true,
                    ...response.data
                };
            } else {
                throw new Error(response.data.error || 'Erro desconhecido');
            }

        } catch (error) {
            console.error(`❌ Erro ao enviar relatórios da empresa ${agendamento.empresa_id}:`, error.message);
            throw error;
        }
    }

    /**
     * Força execução imediata de um agendamento específico
     */
    async forceExecution(empresaId, token, urlempresa) {
        try {
            console.log(`🚀 Forçando execução de relatórios para empresa ${empresaId}`);

            // Se urlempresa não foi fornecido, buscar do backend
            if (!urlempresa) {
                try {
                    const empresaResponse = await axios.get(
                        `${BACKEND_URL}/api/empresas/${empresaId}`,
                        {
                            timeout: 5000
                        }
                    );
                    urlempresa = empresaResponse.data.urlempresa || '';
                    console.log(`🌐 URL da empresa obtido: ${urlempresa}`);
                } catch (error) {
                    console.warn(`⚠️ Erro ao buscar URL da empresa: ${error.message}`);
                }
            }

            // Se token não foi fornecido, tentar obter automaticamente
            if (!token && urlempresa) {
                const credentials = EMPRESA_CREDENTIALS[empresaId];
                if (credentials) {
                    try {
                        console.log(`🔐 Obtendo token automaticamente para empresa ${empresaId}...`);
                        token = await getAuthToken(credentials, urlempresa);
                    } catch (tokenError) {
                        console.error(`⚠️ Erro ao obter token: ${tokenError.message}`);
                    }
                }
            }

            const response = await axios.post(
                `${WEBAPI_URL}/enviar-relatorios-pontos-obras`,
                {
                    empresa_id: empresaId,
                    token: token,
                    urlempresa: urlempresa || ''
                },
                {
                    timeout: 60000
                }
            );

            return response.data;
        } catch (error) {
            console.error(`❌ Erro ao forçar execução:`, error.message);
            throw error;
        }
    }

    /**
     * Retorna status do scheduler
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            executedTodayCount: this.executedToday.size,
            checkIntervalActive: this.checkInterval !== null
        };
    }
}

// Singleton
const relatoriosPontosScheduler = new RelatorioPontosScheduler();

module.exports = relatoriosPontosScheduler;
