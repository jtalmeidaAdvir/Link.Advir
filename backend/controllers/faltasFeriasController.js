const  AprovacaoFaltaFerias  = require('../models/faltas_ferias');

const criarPedido = async (req, res) => {
  try {
    const empresaId = req.headers.urlempresa;
    if (!empresaId) {
      return res.status(400).json({ erro: 'ID da empresa é obrigatório' });
    }

    const dadosPedido = {
      ...req.body,
      empresaId: empresaId
    };

    const novoPedido = await AprovacaoFaltaFerias.create(dadosPedido);
    res.status(201).json(novoPedido);
  } catch (err) {
    console.error('Erro ao criar pedido:', err);
    res.status(500).json({ erro: 'Erro ao criar pedido', detalhe: err.message });
  }
};

const listarPendentes = async (req, res) => {
  try {
    const empresaId = req.headers.urlempresa;
    if (!empresaId) {
      return res.status(400).json({ erro: 'ID da empresa é obrigatório' });
    }

    const pedidos = await AprovacaoFaltaFerias.findAll({
      where: { 
        estadoAprovacao: 'Pendente',
        empresaId: empresaId
      }
    });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar pedidos pendentes' });
  }
};

const listarAprovados = async (req, res) => {
  try {
    const empresaId = req.headers.urlempresa;
    if (!empresaId) {
      return res.status(400).json({ erro: 'ID da empresa é obrigatório' });
    }

    const pedidos = await AprovacaoFaltaFerias.findAll({
      where: { 
        estadoAprovacao: 'Aprovado',
        empresaId: empresaId
      }
    });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar pedidos aprovados' });
  }
};

const listarRejeitados = async (req, res) => {
  try {
    const empresaId = req.headers.urlempresa;
    if (!empresaId) {
      return res.status(400).json({ erro: 'ID da empresa é obrigatório' });
    }

    const pedidos = await AprovacaoFaltaFerias.findAll({
      where: { 
        estadoAprovacao: 'Rejeitado',
        empresaId: empresaId
      }
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
    const empresaId = req.headers.urlempresa;

    if (!empresaId) {
      return res.status(400).json({ erro: 'ID da empresa é obrigatório' });
    }

    const pedido = await AprovacaoFaltaFerias.findOne({
      where: { 
        id: id,
        empresaId: empresaId
      }
    });

    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado ou não pertence à sua empresa' });
    }

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
    const empresaId = req.headers.urlempresa;

    if (!empresaId) {
      return res.status(400).json({ erro: 'ID da empresa é obrigatório' });
    }

    const pedido = await AprovacaoFaltaFerias.findOne({
      where: { 
        id: id,
        empresaId: empresaId
      }
    });

    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado ou não pertence à sua empresa' });
    }

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
    const empresaId = req.headers.urlempresa;

    if (!empresaId) {
      return res.status(400).json({ erro: 'ID da empresa é obrigatório' });
    }

    const pedido = await AprovacaoFaltaFerias.findOne({
      where: { 
        id: id,
        empresaId: empresaId
      }
    });

    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado ou não pertence à sua empresa' });
    }

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
    const empresaId = req.headers.urlempresa;

    if (!empresaId) {
      return res.status(400).json({ erro: 'ID da empresa é obrigatório' });
    }

    const pedido = await AprovacaoFaltaFerias.findOne({
      where: { 
        id: id,
        empresaId: empresaId
      }
    });

    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado ou não pertence à sua empresa' });
    }

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

const listarMinhaLista = async (req, res) => {
  try {
    const empresaId = req.headers.urlempresa;
    if (!empresaId) {
      return res.status(400).json({ erro: 'ID da empresa é obrigatório' });
    }

    const pedidos = await AprovacaoFaltaFerias.findAll({
      where: { 
        empresaId: empresaId
      },
      order: [['dataCriacao', 'DESC']]
    });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar ausências' });
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
  eliminarPedido,
  listarMinhaLista
};
