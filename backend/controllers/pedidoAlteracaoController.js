const PedidoAlteracao = require('../models/pedidoalteracao');
const RegistoPonto = require('../models/registoPonto');
const User = require('../models/user');


  const criarPedido = async (req, res) => {
  try {
    const { user_id, registo_ponto_id, novaHoraEntrada, novaHoraSaida, motivo } = req.body;

    if (!novaHoraEntrada && !novaHoraSaida) {
      return res.status(400).json({ error: 'Preencha pelo menos a nova hora de entrada ou de saída.' });
    }

    if (!motivo || motivo.length < 10) {
      return res.status(400).json({ error: 'O motivo deve ter pelo menos 10 caracteres.' });
    }

    const registoPonto = await RegistoPonto.findByPk(registo_ponto_id);
    if (!registoPonto) {
      return res.status(404).json({ error: 'Registo de ponto não encontrado.' });
    }

    // Função para converter "HH:MM" em Date com data de hoje
    const toFullDateTime = (timeStr) => {
      if (!timeStr) return null;
      const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
      return new Date(`${today}T${timeStr}:00`);
    };

    const novoPedido = await PedidoAlteracao.create({
      user_id,
      registo_ponto_id,
      novaHoraEntrada: toFullDateTime(novaHoraEntrada),
      novaHoraSaida: toFullDateTime(novaHoraSaida),
      motivo,
      status: 'pendente',
    });

    return res.status(201).json(novoPedido);
  } catch (error) {
    console.error('Erro ao criar pedido de alteração:', error);
    return res.status(500).json({ error: 'Erro ao criar pedido de alteração.', details: error.message });
  }
};

    const listarPedidos= async(req, res) => {
        try {
            const pedidos = await PedidoAlteracao.findAll({
                include: [
                    { model: User, attributes: ['id', 'nome'], required: false }, // Inclui mesmo que user_id seja NULL
                    { model: RegistoPonto, attributes: ['id', 'data', 'horaEntrada', 'horaSaida'] },
                ],
            });

            return res.status(200).json(pedidos);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao listar pedidos.', details: error.message });
        }
    };

    const atualizarPedido = async(req, res) => {
        try {
            const { id } = req.params;
            const { novaHoraEntrada, novaHoraSaida, motivo, status } = req.body;

            const pedido = await PedidoAlteracao.findByPk(id);
            if (!pedido) {
                return res.status(404).json({ error: 'Pedido não encontrado.' });
            }

            // Atualizar os campos do pedido
            await pedido.update({ novaHoraEntrada, novaHoraSaida, motivo, status });

            return res.status(200).json(pedido);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao atualizar pedido.', details: error.message });
        }
    };

    const eliminarPedido = async(req, res) => {
        try {
            const { id } = req.params;

            const pedido = await PedidoAlteracao.findByPk(id);
            if (!pedido) {
                return res.status(404).json({ error: 'Pedido não encontrado.' });
            }

            await pedido.destroy();

            return res.status(200).json({ message: 'Pedido eliminado com sucesso.' });
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao eliminar pedido.', details: error.message });
        }
    };



// Exportar os controladores
module.exports = {
    criarPedido,
    listarPedidos,
    atualizarPedido,
    eliminarPedido,
  };