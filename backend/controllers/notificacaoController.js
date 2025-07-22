
const Notificacao = require('../models/notificacao');


const criarNotificacao = async (req, res) => {
    try {
        console.log('Request body recebido:', req.body);
        
        const {
            usuario_destinatario,
            titulo,
            mensagem,
            tipo,
            pedido_id,
            data_criacao // este campo pode vir ou não
        } = req.body;

        const notificacaoData = {
            usuario_destinatario,
            titulo,
            mensagem,
            tipo,
            pedido_id
        };

        console.log('Data inicial do objeto:', notificacaoData);
        console.log('data_criacao recebida:', data_criacao, 'tipo:', typeof data_criacao);

        // Só adiciona data_criacao se foi fornecida e é válida
        if (data_criacao) {
            const dataObj = new Date(data_criacao);
            
            if (isNaN(dataObj.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de data inválido',
                    details: 'Formato esperado: YYYY-MM-DDTHH:mm:ss ou YYYY-MM-DD HH:mm:ss'
                });
            }
            
            notificacaoData.data_criacao = dataObj;
        }

        console.log('Objeto final antes de criar:', notificacaoData);
        const notificacao = await Notificacao.create(notificacaoData);

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
