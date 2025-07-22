
const Notificacao = require('../models/notificacao');


const criarNotificacao = async (req, res) => {
    try {
        const {
            usuario_destinatario,
            titulo,
            mensagem,
            tipo,
            pedido_id,
            data_criacao // este campo pode vir ou não
        } = req.body;

        let dataValida = undefined;

        if (data_criacao) {
            // Substitui o T por espaço e verifica se é uma data válida
            const formatada = data_criacao.replace('T', ' ');
            const dataMoment = moment(formatada, 'YYYY-MM-DD HH:mm:ss', true);

            if (!dataMoment.isValid()) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de data inválido',
                    details: 'O campo data_criacao deve estar no formato YYYY-MM-DD HH:mm:ss'
                });
            }

            dataValida = dataMoment.toDate();
        }

        const notificacao = await Notificacao.create({
            usuario_destinatario,
            titulo,
            mensagem,
            tipo,
            pedido_id,
            data_criacao: dataValida // só é enviado se estiver correto
        });

        return res.status(201).json({
            success: true,
            data: notificacao,
            message: 'Notificação criada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const listarNotificacoes = async (req, res) => {
    try {
        const { usuario } = req.params;
        
        const notificacoes = await Notificacao.findAll({
            where: { usuario_destinatario: usuario },
            order: [['data_criacao', 'DESC']],
            limit: 50,
        });

        return res.status(200).json({
            success: true,
            data: notificacoes
        });
    } catch (error) {
        console.error('Erro ao listar notificações:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const marcarComoLida = async (req, res) => {
    try {
        const { id } = req.params;

        const notificacao = await Notificacao.findByPk(id);
        if (!notificacao) {
            return res.status(404).json({
                success: false,
                error: 'Notificação não encontrada'
            });
        }

        await notificacao.update({ lida: true });

        return res.status(200).json({
            success: true,
            message: 'Notificação marcada como lida'
        });
    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

const contarNaoLidas = async (req, res) => {
    try {
        const { usuario } = req.params;
        
        const count = await Notificacao.count({
            where: { 
                usuario_destinatario: usuario,
                lida: false
            }
        });

        return res.status(200).json({
            success: true,
            data: { count }
        });
    } catch (error) {
        console.error('Erro ao contar notificações não lidas:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

module.exports = {
    criarNotificacao,
    listarNotificacoes,
    marcarComoLida,
    contarNaoLidas,
};
