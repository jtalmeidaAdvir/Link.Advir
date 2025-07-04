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

const parseParaDateValida = (valor) => {
  const data = valor ? new Date(valor) : null;
  return data && !isNaN(data.getTime()) ? data : null;
};


    const novoPedido = await PedidoAlteracao.create({
      user_id,
      registo_ponto_id,
      novaHoraEntrada: parseParaDateValida(novaHoraEntrada),
      novaHoraSaida: parseParaDateValida(novaHoraSaida),
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


const aprovarPedido = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await PedidoAlteracao.findByPk(id);
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

    const registo = await RegistoPonto.findByPk(pedido.registo_ponto_id);
    if (!registo) return res.status(404).json({ error: 'Registo de ponto não encontrado.' });

    const aplicarNovaHora = (dataOriginal, novaHora) => {
      if (!novaHora) return dataOriginal;

      const nova = new Date(novaHora);
      const dataFinal = new Date(dataOriginal);

      dataFinal.setHours(nova.getHours());
      dataFinal.setMinutes(nova.getMinutes());
      dataFinal.setSeconds(0);
      dataFinal.setMilliseconds(0);

      return dataFinal;
    };

    // Aplica alterações corretamente
    if (pedido.novaHoraEntrada) {
      registo.horaEntrada = aplicarNovaHora(registo.data, pedido.novaHoraEntrada);
    }

    if (pedido.novaHoraSaida) {
      registo.horaSaida = aplicarNovaHora(registo.data, pedido.novaHoraSaida);
    }

    // Recalcular totalHorasTrabalhadas
    if (registo.horaEntrada && registo.horaSaida) {
      const horas = (new Date(registo.horaSaida) - new Date(registo.horaEntrada)) / (1000 * 60 * 60);
      registo.totalHorasTrabalhadas = horas.toFixed(2);
    }

    await registo.save();
    await pedido.update({ status: 'aprovado' });

    return res.status(200).json({ message: 'Pedido aprovado e registo atualizado.' });
  } catch (error) {
    console.error('Erro ao aprovar pedido:', error);
    return res.status(500).json({ error: 'Erro ao aprovar pedido.' });
  }
};




const rejeitarPedido = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await PedidoAlteracao.findByPk(id);
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

    // Atualiza apenas o status
    await pedido.update({ status: 'rejeitado' });

    return res.status(200).json({ message: 'Pedido rejeitado com sucesso.' });
  } catch (error) {
    console.error('Erro ao rejeitar pedido:', error);
    return res.status(500).json({ error: 'Erro ao rejeitar pedido.' });
  }
};

const listarPedidosDoUtilizador = async (req, res) => {
  try {
    const { user_id } = req.params;

    const pedidos = await PedidoAlteracao.findAll({
      where: { user_id },
      include: [
        { model: RegistoPonto, attributes: ['data', 'horaEntrada', 'horaSaida'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json(pedidos);
  } catch (error) {
    console.error('Erro ao listar pedidos do utilizador:', error);
    return res.status(500).json({ error: 'Erro ao obter pedidos.', details: error.message });
  }
};



// Exportar os controladores
module.exports = {
    criarPedido,
    listarPedidos,
    atualizarPedido,
    eliminarPedido,
    aprovarPedido, 
    rejeitarPedido,
    listarPedidosDoUtilizador
  };