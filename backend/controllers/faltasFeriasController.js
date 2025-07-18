const  AprovacaoFaltaFerias  = require('../models/faltas_ferias');

const criarPedido = async (req, res) => {
  try {
    const novoPedido = await AprovacaoFaltaFerias.create(req.body);
    res.status(201).json(novoPedido);
  } catch (err) {
  console.error('Erro ao criar pedido:', err);
  res.status(500).json({ erro: 'Erro ao criar pedido', detalhe: err.message });
}

};

const listarPendentes = async (req, res) => {
  try {
    const pedidos = await AprovacaoFaltaFerias.findAll({
      where: { estadoAprovacao: 'Pendente' }
    });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar pedidos pendentes' });
  }
};

const listarAprovados = async (req, res) => {
  try {
    const pedidos = await AprovacaoFaltaFerias.findAll({
      where: { estadoAprovacao: 'Aprovado' }
    });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar pedidos aprovados' });
  }
};

const listarRejeitados = async (req, res) => {
  try {
    const pedidos = await AprovacaoFaltaFerias.findAll({
      where: { estadoAprovacao: 'Rejeitado' }
    });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar pedidos rejeitados' });
  }
};


const confirmarNivel1 = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmadoPor1 } = req.body;

    const pedido = await AprovacaoFaltaFerias.findByPk(id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });

    pedido.estadoAprovacao = 'Pendente';
    pedido.confirmadoPor1 = confirmadoPor1;
    await pedido.save();

    res.json({ mensagem: 'Pedido confirmado por nível 1.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao confirmar nível 1' });
  }
};

const confirmarNivel2 = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmadoPor2 } = req.body;

    const pedido = await AprovacaoFaltaFerias.findByPk(id);


    pedido.estadoAprovacao = 'Aprovado';
    pedido.confirmadoPor2 = confirmadoPor2;
    await pedido.save();

    res.json({ mensagem: 'Pedido confirmado por nível 2.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao confirmar nível 2' });
  }
};

const aprovarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { aprovadoPor, observacoesResposta } = req.body;

    const pedido = await AprovacaoFaltaFerias.findByPk(id);


    pedido.estadoAprovacao = 'Aprovado';
    pedido.aprovadoPor = aprovadoPor;
    pedido.observacoesResposta = observacoesResposta;
    pedido.dataResposta = new Date();

    await pedido.save();
    res.json({ mensagem: 'Pedido aprovado com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao aprovar pedido' });
  }
};

const rejeitarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { observacoesResposta } = req.body;

    const pedido = await AprovacaoFaltaFerias.findByPk(id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });

    pedido.estadoAprovacao = 'Rejeitado';
    pedido.observacoesResposta = observacoesResposta;
    pedido.dataResposta = new Date();

    await pedido.save();
    res.json({ mensagem: 'Pedido rejeitado com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao rejeitar pedido' });
  }
};

const eliminarPedido = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await AprovacaoFaltaFerias.findByPk(id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });

    await pedido.destroy();
    res.json({ mensagem: 'Pedido eliminado com sucesso.' });
  } catch (err) {
    console.error('Erro ao eliminar pedido:', err);
    res.status(500).json({ erro: 'Erro ao eliminar pedido' });
  }
};



module.exports = {
  criarPedido,
  listarPendentes,
  confirmarNivel1,
  confirmarNivel2,
  aprovarPedido,
  rejeitarPedido,
    listarAprovados,
    listarRejeitados,
    eliminarPedido
};
