const RegistoPontoObra = require('../models/registoPontoObra');
const User = require('../models/user');
const Obra = require('../models/obra');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

const EMPRESA_JPA_ID = 5;

exports.listarJPA = async (req, res) => {
  try {
    const { integrado, mes, ano } = req.query;

    if (!mes || !ano) {
      return res.status(400).json({ message: 'Mês e ano são obrigatórios' });
    }

    const dataInicio = new Date(`${ano}-${mes.padStart(2, '0')}-01T00:00:00Z`);
    const dataFim = new Date(dataInicio);
    dataFim.setMonth(dataFim.getMonth() + 1);

    // Query SQL customizada para filtrar por empresa JPA (id: 5)
    const query = `
      SELECT rpo.*
      FROM registo_ponto_obra rpo
      JOIN user_empresa ue ON rpo.user_id = ue.user_id
      WHERE ue.empresa_id = :empresaId
        AND rpo.timestamp BETWEEN :dataInicio AND :dataFim
      ORDER BY rpo.timestamp DESC
    `;

    const registosRaw = await sequelize.query(query, {
      replacements: { empresaId: EMPRESA_JPA_ID, dataInicio, dataFim },
      type: sequelize.QueryTypes.SELECT
    });

    // Buscar detalhes dos users e obras
    const registos = await Promise.all(
      registosRaw.map(async (registo) => {
        const user = await User.findByPk(registo.user_id, {
          attributes: ['id', 'nome', 'email']
        });
        const obra = await Obra.findByPk(registo.obra_id, {
          attributes: ['id', 'codigo', 'nome', 'localizacao']
        });
        return {
          ...registo,
          User: user,
          Obra: obra
        };
      })
    );

    // Filtrar por integrado se fornecido
    let registosFiltrados = registos;
    if (integrado === 'true') {
      registosFiltrados = registos.filter(r => r.is_confirmed === true);
    } else if (integrado === 'false') {
      registosFiltrados = registos.filter(r => r.is_confirmed === false);
    }

    res.json(registosFiltrados);
  } catch (error) {
    console.error('Erro ao listar registos de ponto JPA:', error);
    res.status(500).json({ erro: 'Erro ao listar registos de ponto', detalhe: error.message });
  }
};

exports.estatisticasJPA = async (req, res) => {
  try {
    const { mes, ano } = req.query;

    if (!mes || !ano) {
      return res.status(400).json({ message: 'Mês e ano são obrigatórios' });
    }

    const dataInicio = new Date(`${ano}-${mes.padStart(2, '0')}-01T00:00:00Z`);
    const dataFim = new Date(dataInicio);
    dataFim.setMonth(dataFim.getMonth() + 1);

    // Query SQL customizada para filtrar por empresa JPA (id: 5)
    const query = `
      SELECT rpo.*, ue.empresa_id
      FROM registo_ponto_obra rpo
      JOIN user_empresa ue ON rpo.user_id = ue.user_id
      WHERE ue.empresa_id = :empresaId
        AND rpo.timestamp BETWEEN :dataInicio AND :dataFim
    `;

    const registosRaw = await sequelize.query(query, {
      replacements: { empresaId: EMPRESA_JPA_ID, dataInicio, dataFim },
      type: sequelize.QueryTypes.SELECT
    });

    // Calcular estatísticas
    const totalPartes = registosRaw.length;
    const partesIntegradas = registosRaw.filter(r => r.is_confirmed === true).length;
    const partesPendentes = registosRaw.filter(r => r.is_confirmed === false).length;

    // Calcular total de horas (assumindo que existe um campo de horas ou calculando pela diferença de entrada/saída)
    const registosPorDia = {};
    registosRaw.forEach(registo => {
      const dia = new Date(registo.timestamp).toISOString().split('T')[0];
      const key = `${registo.user_id}_${dia}`;

      if (!registosPorDia[key]) {
        registosPorDia[key] = { entrada: null, saida: null };
      }

      if (registo.tipo === 'entrada') {
        registosPorDia[key].entrada = new Date(registo.timestamp);
      } else if (registo.tipo === 'saida') {
        registosPorDia[key].saida = new Date(registo.timestamp);
      }
    });

    let totalHoras = 0;
    Object.values(registosPorDia).forEach(({ entrada, saida }) => {
      if (entrada && saida) {
        const diffMs = saida - entrada;
        const diffHoras = diffMs / (1000 * 60 * 60);
        totalHoras += diffHoras;
      }
    });

    res.json({
      totalPartes,
      partesIntegradas,
      partesPendentes,
      totalHoras: Math.round(totalHoras * 100) / 100
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas JPA:', error);
    res.status(500).json({ erro: 'Erro ao obter estatísticas', detalhe: error.message });
  }
};

module.exports = {
  listarJPA: exports.listarJPA,
  estatisticasJPA: exports.estatisticasJPA
};