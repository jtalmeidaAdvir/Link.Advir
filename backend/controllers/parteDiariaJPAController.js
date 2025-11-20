
const ParteDiariaCabecalho = require('../models/parteDiariaCabecalho');
const ParteDiariaItem = require('../models/parteDiariaItem');
const { Op } = require('sequelize');

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
