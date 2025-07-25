
const webpush = require('web-push');
const cron = require('node-cron');
const User = require('../models/user');
const RegistoPonto = require('../models/registoPonto');

class WebPushService {
    constructor() {
        // Configurar Web Push - gera as chaves com: npx web-push generate-vapid-keys
        webpush.setVapidDetails(
            'mailto:teu-email@exemplo.com',
            'TUA_CHAVE_PUBLICA_VAPID',
            'TUA_CHAVE_PRIVADA_VAPID'
        );
        
        this.iniciarAgendamento();
    }

    iniciarAgendamento() {
        // Agendar para todos os dias às 9:05
        cron.schedule('5 9 * * 1-5', async () => {
            console.log('Verificando usuários sem ponto às 9:05...');
            await this.verificarESendNotificacoes();
        }, {
            scheduled: true,
            timezone: "Europe/Lisbon"
        });

        console.log('Web Push Service iniciado - notificações às 9:05');
    }

    async verificarESendNotificacoes() {
        try {
            const hoje = new Date().toISOString().split('T')[0];
            
            const usuarios = await User.findAll({
                where: { ativo: true },
                attributes: ['id', 'nome', 'email', 'push_subscription']
            });

            for (const usuario of usuarios) {
                const pontoHoje = await RegistoPonto.findOne({
                    where: {
                        user_id: usuario.id,
                        data: hoje
                    }
                });

                if (!pontoHoje && usuario.push_subscription) {
                    await this.enviarWebPush(usuario);
                }
            }
        } catch (error) {
            console.error('Erro ao verificar e enviar notificações:', error);
        }
    }

    async enviarWebPush(usuario) {
        try {
            const payload = JSON.stringify({
                title: 'Registo de Ponto',
                body: 'Lembrete: Não se esqueça de registar o seu ponto!',
                icon: '/assets/icon.png',
                badge: '/assets/badge.png',
                data: {
                    url: 'http://localhost:3000/assiduidade'
                }
            });

            const subscription = JSON.parse(usuario.push_subscription);
            
            await webpush.sendNotification(subscription, payload);
            console.log(`Web Push enviado para ${usuario.nome}`);
        } catch (error) {
            console.error(`Erro ao enviar Web Push para ${usuario.nome}:`, error);
        }
    }
}

module.exports = WebPushService;
