const RegistoPontoObra = require('../models/registoPontoObra');
const Obra = require('../models/obra');
const User = require('../models/user');
const { Op } = require('sequelize');


const registarPonto = async (req, res) => {
  try {
    const { tipo, obra_id, latitude, longitude } = req.body;
    const user_id = req.user.id;

    const novoRegisto = await RegistoPontoObra.create({
      user_id,
      obra_id,
      tipo,
      timestamp: new Date(), 
      latitude,
      longitude
    });

    res.status(201).json(novoRegisto);
  } catch (error) {
    console.error('Erro ao registar ponto:', error);
    res.status(500).json({ message: 'Erro interno ao registar ponto.' });
  }
};

const listarRegistosPorDia = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { data } = req.query;

if (!data || isNaN(Date.parse(data))) {
  return res.status(400).json({ message: 'Data inválida.' });
}

const dataInicio = new Date(`${data}T00:00:00.000Z`);
const dataFim = new Date(`${data}T23:59:59.999Z`);

    dataFim.setHours(23, 59, 59, 999);

    const registos = await RegistoPontoObra.findAll({
      where: {
        user_id,
        timestamp: {
        [Op.between]: [dataInicio, dataFim]
        }

      },
      include: [
        { model: Obra, attributes: ['id', 'nome', 'localizacao'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    res.status(200).json(registos);
  } catch (error) {
    console.error('Erro ao listar registos:', error);
    res.status(500).json({ message: 'Erro interno ao listar registos.' });
  }
};


const resumoMensalPorUser = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { ano, mes } = req.query;

    if (!ano || !mes) {
      return res.status(400).json({ message: 'Ano e mês são obrigatórios.' });
    }

    const dataInicio = new Date(`${ano}-${mes}-01T00:00:00Z`);
    const dataFim = new Date(dataInicio);
    dataFim.setMonth(dataFim.getMonth() + 1);

    const registos = await RegistoPontoObra.findAll({
      where: {
        user_id,
        timestamp: {
          [Op.between]: [dataInicio, dataFim]
        }
      },
      order: [['timestamp', 'ASC']],
    });

    const dias = {};

    for (const registo of registos) {
      const dataDia = new Date(registo.timestamp).toISOString().split('T')[0];

      if (!dias[dataDia]) dias[dataDia] = [];

      dias[dataDia].push(registo);
    }

    const resultado = Object.entries(dias).map(([dia, registosDia]) => {
      let totalMs = 0;
      let ultimaEntrada = null;

      for (const reg of registosDia) {
        if (reg.tipo === 'entrada') {
          ultimaEntrada = new Date(reg.timestamp);
        } else if (reg.tipo === 'saida' && ultimaEntrada) {
          const saida = new Date(reg.timestamp);
          totalMs += saida - ultimaEntrada;
          ultimaEntrada = null;
        }
      }

      const horas = Math.floor(totalMs / 3600000);
      const minutos = Math.floor((totalMs % 3600000) / 60000);

      return { dia, horas, minutos };
    });

    res.json(resultado);
  } catch (error) {
    console.error('Erro no resumo mensal:', error);
    res.status(500).json({ message: 'Erro interno ao obter resumo mensal.' });
  }
};


const registarPontoEsquecido = async (req, res) => {
  try {
    const { tipo, obra_id, timestamp, justificacao } = req.body;
    const user_id = req.user.id;

    const novoRegisto = await RegistoPontoObra.create({
      user_id,
      obra_id,
      tipo,
      timestamp: new Date(timestamp),
      is_confirmed: false,
      justificacao
    });

    res.status(201).json(novoRegisto);
  } catch (err) {
    console.error('Erro ao registar ponto esquecido:', err);
    res.status(500).json({ message: 'Erro interno ao registar ponto esquecido.' });
  }
};


const listarPorObraEDia = async (req, res) => {
  try {
    const { data, obra_id } = req.query;

    if (!data || !obra_id) {
      return res.status(400).json({ message: 'Data e obra_id são obrigatórios.' });
    }

    const dataInicio = new Date(`${data}T00:00:00.000Z`);
    const dataFim = new Date(`${data}T23:59:59.999Z`);

    const registos = await RegistoPontoObra.findAll({
      where: {
        obra_id,
        timestamp: {
          [Op.between]: [dataInicio, dataFim]
        }
      },
      include: [
        { model: User, attributes: ['id', 'nome', 'email'] },
        { model: Obra, attributes: ['id', 'nome'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    res.status(200).json(registos);
  } catch (err) {
    console.error('Erro ao listar registos por obra e dia:', err);
    res.status(500).json({ message: 'Erro interno ao listar registos.' });
  }
};


const registarPontoEquipa = async (req, res) => {
  try {
    const { tipo, obra_id, latitude, longitude, membros } = req.body;

    if (!['entrada', 'saida'].includes(tipo) || !obra_id || !latitude || !longitude || !Array.isArray(membros)) {
      return res.status(400).json({ message: 'Dados inválidos.' });
    }

    const registosCriados = await Promise.all(membros.map(user_id =>
      RegistoPontoObra.create({
        tipo,
        obra_id,
        latitude,
        longitude,
        user_id,
        timestamp: new Date()
      })
    ));

    res.status(201).json(registosCriados);
  } catch (error) {
    console.error('Erro no registo por equipa:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

const listarRegistosHojeEquipa = async (req, res) => {
  try {
    const { membros } = req.query;

    if (!membros) return res.status(400).json({ message: 'IDs de membros em falta.' });

    const ids = membros.split(',').map(id => parseInt(id));
    const hoje = new Date();
    const dataInicio = new Date(hoje.setHours(0, 0, 0, 0));
    const dataFim = new Date(hoje.setHours(23, 59, 59, 999));

    const registos = await RegistoPontoObra.findAll({
      where: {
        user_id: { [Op.in]: ids },
        timestamp: { [Op.between]: [dataInicio, dataFim] }
      },
      include: [
        { model: User, attributes: ['id', 'nome', 'email'] },
        { model: Obra, attributes: ['id', 'nome'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    res.status(200).json(registos);
  } catch (err) {
    console.error('Erro ao listar registos da equipa:', err);
    res.status(500).json({ message: 'Erro ao listar registos da equipa.' });
  }
};

const confirmarPonto = async (req, res) => {
  try {
    const { id } = req.params;

    const registo = await RegistoPontoObra.findByPk(id);

    if (!registo) {
      return res.status(404).json({ message: 'Registo não encontrado.' });
    }

    if (registo.is_confirmed) {
      return res.status(400).json({ message: 'Este registo já está confirmado.' });
    }

    registo.is_confirmed = true;
    await registo.save();

    res.status(200).json({ message: 'Registo confirmado com sucesso.', registo });
  } catch (err) {
    console.error('Erro ao confirmar registo:', err);
    res.status(500).json({ message: 'Erro interno ao confirmar registo.' });
  }
};

const cancelarPonto = async (req, res) => {
  try {
    const { id } = req.params;

    const registo = await RegistoPontoObra.findByPk(id);

    if (!registo) {
      return res.status(404).json({ message: 'Registo não encontrado.' });
    }

    if (registo.is_confirmed) {
      return res.status(400).json({ message: 'Não é possível cancelar um registo já confirmado.' });
    }

    await registo.destroy();

    res.status(200).json({ message: 'Registo cancelado (eliminado) com sucesso.' });
  } catch (err) {
    console.error('Erro ao cancelar registo:', err);
    res.status(500).json({ message: 'Erro interno ao cancelar registo.' });
  }
};

const listarPendentes = async (req, res) => {
  try {
    const pendentes = await RegistoPontoObra.findAll({
      where: { is_confirmed: false },
      include: [
        { model: User, attributes: ['id', 'nome', 'email'] },
        { model: Obra, attributes: ['id', 'nome', 'localizacao'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    res.status(200).json(pendentes);
  } catch (err) {
    console.error('Erro ao listar registos pendentes:', err);
    res.status(500).json({ message: 'Erro interno ao listar pendentes.' });
  }
};

const listarPorUserEDia = async (req, res) => {
  try {
    const { user_id, data } = req.query;

    if (!user_id || !data || isNaN(Date.parse(data))) {
      return res.status(400).json({ message: 'Parâmetros user_id e data são obrigatórios e válidos.' });
    }

    const dataInicio = new Date(`${data}T00:00:00.000Z`);
    const dataFim = new Date(`${data}T23:59:59.999Z`);

    const registos = await RegistoPontoObra.findAll({
      where: {
        user_id,
        timestamp: {
          [Op.between]: [dataInicio, dataFim]
        }
      },
      include: [
        { model: User, attributes: ['id', 'nome', 'email'] },
        { model: Obra, attributes: ['id', 'nome', 'localizacao'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    res.status(200).json(registos);
  } catch (err) {
    console.error('Erro ao listar registos por user e dia:', err);
    res.status(500).json({ message: 'Erro interno ao listar registos por user e dia.' });
  }
};


const listarPorUserPeriodo = async (req, res) => {
  try {
    const { user_id, data, ano, mes, obra_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ message: 'Parâmetro user_id é obrigatório.' });
    }

    let dataInicio, dataFim;

    // Se vier data → busca do dia
    if (data) {
      if (isNaN(Date.parse(data))) {
        return res.status(400).json({ message: 'Data inválida.' });
      }
      dataInicio = new Date(`${data}T00:00:00.000Z`);
      dataFim = new Date(`${data}T23:59:59.999Z`);
    }

    // Se vier ano + mês → busca do mês
    else if (ano && mes) {
      dataInicio = new Date(`${ano}-${mes}-01T00:00:00.000Z`);
      dataFim = new Date(dataInicio);
      dataFim.setMonth(dataFim.getMonth() + 1);
    }

    // Se vier só ano → busca do ano
    else if (ano) {
      dataInicio = new Date(`${ano}-01-01T00:00:00.000Z`);
      dataFim = new Date(`${parseInt(ano) + 1}-01-01T00:00:00.000Z`);
    }

    // Where base
    const whereClause = {
      user_id,
      ...(dataInicio && dataFim && {
        timestamp: { [Op.between]: [dataInicio, dataFim] }
      }),
      ...(obra_id && { obra_id }) // filtro por obra, se existir
    };

    const registos = await RegistoPontoObra.findAll({
      where: whereClause,
      include: [
        { model: User, attributes: ['id', 'nome', 'email'] },
        { model: Obra, attributes: ['id', 'nome', 'localizacao'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    res.status(200).json(registos);
  } catch (err) {
    console.error('Erro ao listar registos por período:', err);
    res.status(500).json({ message: 'Erro interno ao listar registos.' });
  }
};


module.exports = {
  registarPonto,
  listarRegistosPorDia,
  resumoMensalPorUser,
  registarPontoEsquecido,
  listarPorObraEDia, 
  registarPontoEquipa,
  listarRegistosHojeEquipa,
  confirmarPonto,
  cancelarPonto,
  listarPendentes,
  listarPorUserEDia,
  listarPorUserPeriodo
};



