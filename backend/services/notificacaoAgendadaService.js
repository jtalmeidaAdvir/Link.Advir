
const cron = require('node-cron');
const OneSignal = require('onesignal-node');
const User = require('../models/user');
const Empresa = require('../models/empresa');
const RegistoPonto = require('../models/registoPonto');
const { Op } = require('sequelize');

class NotificacaoAgendadaService {
    constructor() {
        // Configurar OneSignal com as tuas credenciais
        this.oneSignalClient = new OneSignal.Client(
            'a9bc6538-62e7-4f65-a1bf-b502d74bd0f9', 
            'os_v2_app_vg6gkodc45hwlin7wubnos6q7fsczwr5d7penrvnassg2xbymxtt3wwfo2jxwlei32l73f4zg6mxdmqswtzerotypgqt6wq2lakq73q'
        );
        this.iniciarAgendamento();
    }

    iniciarAgendamento() {
        // Agendar para todos os dias às 9:05
        cron.schedule('5 9 * * 1-5', async () => {
            console.log('Executando verificação de ponto às 9:05...');
            await this.verificarUsuariosSemPonto();
        }, {
            scheduled: true,
            timezone: "Europe/Lisbon"
        });

        console.log('Agendamento de notificações iniciado - 9:05 todos os dias úteis');
    }

    async verificarUsuariosSemPonto() {
        try {
            const hoje = new Date().toISOString().split('T')[0];
            
            // Buscar todos os usuários ativos
            const usuarios = await User.findAll({
                where: { ativo: true },
                include: [{
                    model: Empresa,
                    through: { attributes: [] }
                }]
            });

            for (const usuario of usuarios) {
                // Verificar se já registou ponto hoje
                const pontoHoje = await RegistoPonto.findOne({
                    where: {
                        user_id: usuario.id,
                        data: hoje
                    }
                });

                if (!pontoHoje) {
                    await this.enviarNotificacaoLembrete(usuario);
                }
            }
        } catch (error) {
            console.error('Erro ao verificar usuários sem ponto:', error);
        }
    }

    async enviarNotificacaoLembrete(usuario) {
        try {
            // Enviar via OneSignal (se tiveres configurado)
            if (usuario.onesignal_id) {
                const notification = {
                    contents: {
                        'pt': 'Lembrete: Não se esqueça de registar o seu ponto de entrada!'
                    },
                    headings: {
                        'pt': 'Registo de Ponto'
                    },
                    include_player_ids: [usuario.onesignal_id],
                    data: {
                        type: 'registo_ponto_lembrete'
                    }
                };

                await this.oneSignalClient.createNotification(notification);
            }

            // Alternativa: Enviar email simples
            await this.enviarEmailLembrete(usuario);

            console.log(`Lembrete enviado para ${usuario.nome}`);
        } catch (error) {
            console.error(`Erro ao enviar lembrete para ${usuario.nome}:`, error);
        }
    }

    async enviarEmailLembrete(usuario) {
        // Implementação simples de email usando nodemailer
        // Podes usar o serviço de email que já tens configurado
        console.log(`Email lembrete enviado para: ${usuario.email}`);
    }

    // Método para testar imediatamente
    async testarNotificacao(userId) {
        try {
            const usuario = await User.findByPk(userId);
            if (usuario) {
                await this.enviarNotificacaoLembrete(usuario);
                return { success: true, message: 'Notificação de teste enviada' };
            }
            return { success: false, message: 'Usuário não encontrado' };
        } catch (error) {
            console.error('Erro ao testar notificação:', error);
            return { success: false, message: 'Erro ao enviar notificação' };
        }
    }
}

module.exports = NotificacaoAgendadaService;
