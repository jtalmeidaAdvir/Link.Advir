
const Notificacao = require('../models/notificacao');
const axios = require('axios');

class NotificacaoService {
    static async criarNotificacaoPedido(tecnico, pedidoId, clienteNome, problemaDescricao) {
        try {
            const notificacao = await Notificacao.create({
                usuario_destinatario: tecnico,
                titulo: `Novo Pedido de Assistência`,
                mensagem: `Foi-lhe atribuído um novo pedido de assistência do cliente ${clienteNome}. Problema: ${problemaDescricao.substring(0, 100)}...`,
                tipo: 'pedido_atribuido',
                pedido_id: pedidoId,
            });

            return notificacao;
        } catch (error) {
            console.error('Erro ao criar notificação:', error);
            throw error;
        }
    }

    static async buscarTecnicoInfo(tecnicoId, token, urlempresa) {
        try {
            const response = await axios.get(
                `https://webapiprimavera.advir.pt/routePedidos_STP/LstTecnicosTodos`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'urlempresa': urlempresa,
                    },
                }
            );

            if (response.data && response.data.DataSet && response.data.DataSet.Table) {
                const tecnico = response.data.DataSet.Table.find(t => t.Tecnico === tecnicoId);
                return tecnico;
            }

            return null;
        } catch (error) {
            console.error('Erro ao buscar informações do técnico:', error);
            return null;
        }
    }
}

module.exports = NotificacaoService;
