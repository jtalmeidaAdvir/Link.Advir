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






module.exports = {
  registarPonto,
  listarRegistosPorDia,
  resumoMensalPorUser
};
