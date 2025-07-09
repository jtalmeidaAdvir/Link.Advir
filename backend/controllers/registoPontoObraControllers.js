const RegistoPontoObra = require('../models/registoPontoObra');
const Obra = require('../models/obra');
const User = require('../models/user');

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

    const dataInicio = new Date(data);
    const dataFim = new Date(data);
    dataFim.setHours(23, 59, 59, 999);

    const registos = await RegistoPontoObra.findAll({
      where: {
        user_id,
        dataHora: {
          [require('sequelize').Op.between]: [dataInicio, dataFim]
        }
      },
      include: [
        { model: Obra, attributes: ['id', 'nome', 'localizacao'] }
      ],
      order: [['dataHora', 'ASC']]
    });

    res.status(200).json(registos);
  } catch (error) {
    console.error('Erro ao listar registos:', error);
    res.status(500).json({ message: 'Erro interno ao listar registos.' });
  }
};

module.exports = {
  registarPonto,
  listarRegistosPorDia
};
