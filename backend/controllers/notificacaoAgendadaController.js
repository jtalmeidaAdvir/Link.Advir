
const NotificacaoAgendadaService = require('../services/notificacaoAgendadaService');

let notificacaoService = null;

const iniciarServico = async (req, res) => {
    try {
        if (!notificacaoService) {
            notificacaoService = new NotificacaoAgendadaService();
        }
        
        res.status(200).json({
            success: true,
            message: 'Serviço de notificações agendadas iniciado'
        });
    } catch (error) {
        console.error('Erro ao iniciar serviço:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao iniciar serviço de notificações'
        });
    }
};

const pararServico = async (req, res) => {
    try {
        notificacaoService = null;
        
        res.status(200).json({
            success: true,
            message: 'Serviço de notificações agendadas parado'
        });
    } catch (error) {
        console.error('Erro ao parar serviço:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao parar serviço de notificações'
        });
    }
};

const testarNotificacao = async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!notificacaoService) {
            notificacaoService = new NotificacaoAgendadaService();
        }
        
        const resultado = await notificacaoService.testarNotificacao(userId);
        
        res.status(resultado.success ? 200 : 400).json(resultado);
    } catch (error) {
        console.error('Erro ao testar notificação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao testar notificação'
        });
    }
};

const verificarStatus = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            ativo: !!notificacaoService,
            message: notificacaoService ? 'Serviço ativo' : 'Serviço inativo'
        });
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar status'
        });
    }
};

module.exports = {
    iniciarServico,
    pararServico,
    testarNotificacao,
    verificarStatus
};
