const RegistoPontoObra = require('../models/registoPontoObra');
const User = require('../models/user');
const Obra = require('../models/obra');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

const EMPRESA_JPA_ID = 5;

exports.listarJPA = async (req, res) => {
  try {
    const { integrado, mes, ano } = req.query;
    const where = {};

    if (integrado === 'true') where.IntegradoERP = true;
    else if (integrado === 'false') where.IntegradoERP = false;

    // Filtrar por mês/ano se fornecido
    if (mes && ano) {
      const inicioMes = new Date(ano, mes - 1, 1);
      const fimMes = new Date(ano, mes, 0);
      where.Data = {
        [Op.between]: [inicioMes, fimMes]
      };
    }

    const cabecalhos = await ParteDiariaCabecalho.findAll({
      where,
      include: {
        model: ParteDiariaItem,
        required: false
      },
      order: [['Data', 'DESC']]
    });

    // Filtrar apenas obras da empresa JPA (assumindo que empresa_id está na tabela obras)
    // Vamos buscar as obras da empresa JPA primeiro
    const Obra = require('../models/obra');
    const obrasJPA = await Obra.findAll({
      where: { empresa_id: EMPRESA_JPA_ID },
      attributes: ['id']
    });

    const obrasJPAIds = obrasJPA.map(o => o.id);

    // Filtrar cabeçalhos que pertencem a obras da JPA
    const cabecalhosJPA = cabecalhos.filter(cab => 
      obrasJPAIds.includes(Number(cab.ObraID))
    );

    res.json(cabecalhosJPA);
  } catch (error) {
    console.error('Erro ao listar partes diárias JPA:', error);
    res.status(500).json({ erro: 'Erro ao listar partes diárias', detalhe: error.message });
  }
};

exports.estatisticasJPA = async (req, res) => {
  try {
    const { mes, ano } = req.query;

    // Buscar obras da JPA
    const Obra = require('../models/obra');
    const obrasJPA = await Obra.findAll({
      where: { empresa_id: EMPRESA_JPA_ID },
      attributes: ['id', 'nome', 'codigo']
    });

    const obrasJPAIds = obrasJPA.map(o => o.id);

    const where = {
      ObraID: { [Op.in]: obrasJPAIds }
    };

    // Filtrar por mês/ano se fornecido
    if (mes && ano) {
      const inicioMes = new Date(ano, mes - 1, 1);
      const fimMes = new Date(ano, mes, 0);
      where.Data = {
        [Op.between]: [inicioMes, fimMes]
      };
    }

    const totalPartes = await ParteDiariaCabecalho.count({ where });
    const partesIntegradas = await ParteDiariaCabecalho.count({
      where: { ...where, IntegradoERP: true }
    });
    const partesPendentes = await ParteDiariaCabecalho.count({
      where: { ...where, IntegradoERP: false }
    });

    // Total de itens
    const itens = await ParteDiariaItem.findAll({
      include: {
        model: ParteDiariaCabecalho,
        where,
        attributes: []
      }
    });

    const totalHoras = itens.reduce((sum, item) => sum + Number(item.NumHoras || 0), 0);

    res.json({
      totalPartes,
      partesIntegradas,
      partesPendentes,
      totalItens: itens.length,
      totalHoras: Math.round(totalHoras),
      obras: obrasJPA
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas JPA:', error);
    res.status(500).json({ erro: 'Erro ao obter estatísticas', detalhe: error.message });
  }
};

const obterCabecalhos = async (req, res) => {
  try {
    const { mes, ano } = req.query;

    if (!mes || !ano) {
      return res.status(400).json({ message: 'Mês e ano são obrigatórios' });
    }

    const dataInicio = new Date(`${ano}-${mes}-01T00:00:00Z`);
    const dataFim = new Date(dataInicio);
    dataFim.setMonth(dataFim.getMonth() + 1);

    // Query SQL customizada para filtrar por empresa JPA (id: 5)
    const query = `
      SELECT rpo.*
      FROM registo_ponto_obra rpo
      JOIN user_empresa ue ON rpo.user_id = ue.user_id
      WHERE ue.empresa_id = 5
        AND rpo.timestamp BETWEEN :dataInicio AND :dataFim
      ORDER BY rpo.timestamp ASC
    `;

    const registosRaw = await sequelize.query(query, {
      replacements: { dataInicio, dataFim },
      type: sequelize.QueryTypes.SELECT
    });

    // Buscar detalhes dos users e obras
    const registos = await Promise.all(
      registosRaw.map(async (registo) => {
        const user = await User.findByPk(registo.user_id, {
          attributes: ['id', 'nome', 'email']
        });
        const obra = await Obra.findByPk(registo.obra_id, {
          attributes: ['id', 'nome', 'localizacao']
        });
        return {
          ...registo,
          User: user,
          Obra: obra
        };
      })
    );

    res.json(registos);
  } catch (error) {
    console.error('Erro ao listar cabeçalhos de registo de ponto JPA:', error);
    res.status(500).json({ erro: 'Erro ao listar registos de ponto', detalhe: error.message });
  }
};

const obterEstatisticas = async (req, res) => {
  try {
    const { mes, ano } = req.query;

    if (!mes || !ano) {
      return res.status(400).json({ message: 'Mês e ano são obrigatórios' });
    }

    const dataInicio = new Date(`${ano}-${mes}-01T00:00:00Z`);
    const dataFim = new Date(dataInicio);
    dataFim.setMonth(dataFim.getMonth() + 1);

    // Query SQL customizada para filtrar por empresa JPA (id: 5)
    const query = `
      SELECT rpo.*
      FROM registo_ponto_obra rpo
      JOIN user_empresa ue ON rpo.user_id = ue.user_id
      WHERE ue.empresa_id = 5
        AND rpo.timestamp BETWEEN :dataInicio AND :dataFim
    `;

    const registosRaw = await sequelize.query(query, {
      replacements: { dataInicio, dataFim },
      type: sequelize.QueryTypes.SELECT
    });

    // Buscar detalhes dos users e obras
    const registos = await Promise.all(
      registosRaw.map(async (registo) => {
        const user = await User.findByPk(registo.user_id, {
          attributes: ['id', 'nome']
        });
        const obra = await Obra.findByPk(registo.obra_id, {
          attributes: ['id', 'nome']
        });
        return {
          ...registo,
          User: user,
          Obra: obra
        };
      })
    );

    const totalHoras = registos.reduce((sum, registo) => sum + (registo.horas_trabalhadas || 0), 0);
    const totalRegistos = registos.length;

    res.json({
      totalRegistos,
      totalHoras: Math.round(totalHoras * 100) / 100, // Arredonda para 2 casas decimais
      registos
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas JPA:', error);
    res.status(500).json({ erro: 'Erro ao obter estatísticas', detalhe: error.message });
  }
};

module.exports = {
  listarJPA: exports.listarJPA,
  estatisticasJPA: exports.estatisticasJPA,
  obterCabecalhos,
  obterEstatisticas
};