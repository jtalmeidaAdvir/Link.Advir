const { Op, fn, col } = require('sequelize');
const TrabalhadorExterno = require('../models/trabalhadorExterno');

// GET /api/trabalhadores-externos
const listar = async (req, res) => {
  try {
    const {
      empresa,
      categoria,
      ativo,
      anulado,
      moeda,
      search,          // procura em empresa/funcionario/categoria
      minValor,
      maxValor,
      page = 1,
      pageSize = 50,
      orderBy = 'empresa',
      order = 'ASC',
    } = req.query;

    const where = {};

    // Filtrar sempre pela empresa do usuário logado
    if (req.user && req.user.empresa_id) {
      where.empresa_id = req.user.empresa_id;
    }

    if (empresa) where.empresa = { [Op.like]: `%${empresa}%` };
    if (categoria) where.categoria = { [Op.like]: `%${categoria}%` };
    if (moeda) where.moeda = moeda.toUpperCase();
    if (ativo === 'true' || ativo === 'false') where.ativo = ativo === 'true';
    if (anulado === 'true' || anulado === 'false') where.anulado = anulado === 'true';
    if (search) {
      where[Op.or] = [
        { empresa: { [Op.like]: `%${search}%` } },
        { funcionario: { [Op.like]: `%${search}%` } },
        { categoria: { [Op.like]: `%${search}%` } },
      ];
    }
    if (minValor || maxValor) {
      where.valor = {};
      if (minValor) where.valor[Op.gte] = Number(minValor);
      if (maxValor) where.valor[Op.lte] = Number(maxValor);
    }

    const allowOrder = ['empresa','funcionario','categoria','valor','moeda','ativo','anulado','createdAt','updatedAt'];
    const ob = allowOrder.includes(orderBy) ? orderBy : 'empresa';
    const ord = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const limit = Math.max(parseInt(pageSize, 10) || 50, 1);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

    const { rows, count } = await TrabalhadorExterno.findAndCountAll({
      where,
      limit,
      offset,
      order: [[ob, ord], ['funcionario', 'ASC']],
    });

    res.status(200).json({
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total: count },
    });
  } catch (error) {
    console.error('Erro ao listar trabalhadores externos:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// GET /api/trabalhadores-externos/distintos/empresas
const listarEmpresasDistintas = async (req, res) => {
  try {
    const where = {};
    const empresaId = req.user?.empresa_id || req.headers['x-empresa-id'];
    if (empresaId) {
      where.empresa_id = parseInt(empresaId, 10);
    }

    const empresas = await TrabalhadorExterno.findAll({
      attributes: [[fn('DISTINCT', col('empresa')), 'empresa']],
      where,
      order: [['empresa', 'ASC']],
    });
    res.status(200).json(empresas.map(e => e.get('empresa')).filter(Boolean));
  } catch (error) {
    console.error('Erro ao listar empresas distintas:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// GET /api/trabalhadores-externos/distintos/categorias
const listarCategoriasDistintas = async (req, res) => {
  try {
    const where = {};
    const empresaId = req.user?.empresa_id || req.headers['x-empresa-id'];
    if (empresaId) {
      where.empresa_id = parseInt(empresaId, 10);
    }

    const categorias = await TrabalhadorExterno.findAll({
      attributes: [[fn('DISTINCT', col('categoria')), 'categoria']],
      where,
      order: [['categoria', 'ASC']],
    });
    res.status(200).json(categorias.map(c => c.get('categoria')).filter(Boolean));
  } catch (error) {
    console.error('Erro ao listar categorias distintas:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// POST /api/trabalhadores-externos
const criar = async (req, res) => {
  try {
    const {
      empresa_id,
      empresa,
      funcionario,
      categoria,
      valor,
      moeda = 'EUR',
      data_inicio,
      data_fim,
      observacoes,
    } = req.body;

    if (!empresa || !funcionario || valor === undefined) {
      return res.status(400).json({ message: 'empresa, funcionario e valor são obrigatórios.' });
    }

    const v = Number(valor);
    if (Number.isNaN(v) || v < 0) return res.status(400).json({ message: 'valor inválido.' });

    if (data_inicio && data_fim && new Date(data_fim) < new Date(data_inicio)) {
      return res.status(400).json({ message: 'data_fim não pode ser anterior a data_inicio.' });
    }

    // Regra simples para evitar duplicados óbvios não anulados na mesma empresa
    const existente = await TrabalhadorExterno.findOne({
      where: { 
        empresa_id: empresa_id || req.user.empresa_id,
        empresa, 
        funcionario, 
        categoria, 
        anulado: false 
      },
    });
    if (existente) {
      return res.status(409).json({ message: 'Já existe um registo ativo/anulado=false com a mesma empresa/funcionário/categoria.' });
    }

    const novo = await TrabalhadorExterno.create({
      empresa_id: empresa_id || req.user.empresa_id,
      empresa,
      funcionario,
      categoria: categoria || null,
      valor: v,
      moeda: moeda.toUpperCase(),
      data_inicio: data_inicio || null,
      data_fim: data_fim || null,
      observacoes: observacoes || null,
    });

    res.status(201).json(novo);
  } catch (error) {
    console.error('Erro ao criar trabalhador externo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// GET /api/trabalhadores-externos/:id
const obter = async (req, res) => {
  try {
    const reg = await TrabalhadorExterno.findByPk(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registo não encontrado.' });
    res.status(200).json(reg);
  } catch (error) {
    console.error('Erro ao obter trabalhador externo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// PUT /api/trabalhadores-externos/:id
const atualizar = async (req, res) => {
  try {
    const reg = await TrabalhadorExterno.findByPk(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registo não encontrado.' });

    const {
      empresa_id, empresa, funcionario, categoria, valor, moeda,
      ativo, anulado, data_inicio, data_fim, observacoes,
    } = req.body;

    if (valor !== undefined) {
      const v = Number(valor);
      if (Number.isNaN(v) || v < 0) return res.status(400).json({ message: 'valor inválido.' });
    }
    if (data_inicio && data_fim && new Date(data_fim) < new Date(data_inicio)) {
      return res.status(400).json({ message: 'data_fim não pode ser anterior a data_inicio.' });
    }

    await reg.update({
      empresa_id: empresa_id ?? reg.empresa_id,
      empresa: empresa ?? reg.empresa,
      funcionario: funcionario ?? reg.funcionario,
      categoria: categoria ?? reg.categoria,
      valor: valor ?? reg.valor,
      moeda: moeda ? moeda.toUpperCase() : reg.moeda,
      ativo: typeof ativo === 'boolean' ? ativo : reg.ativo,
      anulado: typeof anulado === 'boolean' ? anulado : reg.anulado,
      data_inicio: data_inicio ?? reg.data_inicio,
      data_fim: data_fim ?? reg.data_fim,
      observacoes: observacoes ?? reg.observacoes,
    });

    res.status(200).json(reg);
  } catch (error) {
    console.error('Erro ao atualizar trabalhador externo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// DELETE /api/trabalhadores-externos/:id
const eliminar = async (req, res) => {
  try {
    const reg = await TrabalhadorExterno.findByPk(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registo não encontrado.' });

    await reg.destroy();
    res.status(200).json({ message: 'Registo eliminado com sucesso.' });
  } catch (error) {
    console.error('Erro ao eliminar trabalhador externo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// POST /api/trabalhadores-externos/:id/anular
const anular = async (req, res) => {
  try {
    const reg = await TrabalhadorExterno.findByPk(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registo não encontrado.' });
    await reg.update({ anulado: true, ativo: false });
    res.status(200).json(reg);
  } catch (error) {
    console.error('Erro ao anular registo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// POST /api/trabalhadores-externos/:id/restaurar
const restaurar = async (req, res) => {
  try {
    const reg = await TrabalhadorExterno.findByPk(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registo não encontrado.' });
    await reg.update({ anulado: false, ativo: true });
    res.status(200).json(reg);
  } catch (error) {
    console.error('Erro ao restaurar registo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// POST /api/trabalhadores-externos/:id/ativar
const ativar = async (req, res) => {
  try {
    const reg = await TrabalhadorExterno.findByPk(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registo não encontrado.' });
    await reg.update({ ativo: true, anulado: false });
    res.status(200).json(reg);
  } catch (error) {
    console.error('Erro ao ativar registo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// POST /api/trabalhadores-externos/:id/desativar
const desativar = async (req, res) => {
  try {
    const reg = await TrabalhadorExterno.findByPk(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registo não encontrado.' });
    await reg.update({ ativo: false });
    res.status(200).json(reg);
  } catch (error) {
    console.error('Erro ao desativar registo:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

module.exports = {
  listar,
  listarEmpresasDistintas,
  listarCategoriasDistintas,
  criar,
  obter,
  atualizar,
  eliminar,
  anular,
  restaurar,
  ativar,
  desativar,
};