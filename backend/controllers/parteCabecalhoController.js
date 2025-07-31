// controllers/parteCabecalhoController.js
const ParteDiariaCabecalho = require('../models/parteDiariaCabecalho');
const ParteDiariaItem = require('../models/parteDiariaItem');

exports.listar = async (req, res) => {
  const cabecalhos = await ParteDiariaCabecalho.findAll({ include: ParteDiariaItem });
  res.json(cabecalhos);
};

exports.obter = async (req, res) => {
  const { id } = req.params;
  const cab = await ParteDiariaCabecalho.findByPk(id, { include: ParteDiariaItem });
  if (!cab) return res.status(404).json({ erro: 'Não encontrado' });
  res.json(cab);
};

exports.criar = async (req, res) => {
  const { ObraID, Data, Numero } = req.body;

  if (!ObraID || !Data || !Numero) {
    return res.status(400).json({ erro: 'Campos obrigatórios em falta.' });
  }

  try {
    const novo = await ParteDiariaCabecalho.create(req.body);
    res.status(201).json(novo);
  } catch (err) {
    console.error('Erro ao criar parte diária:', err); // log mais útil
    res.status(400).json({ erro: err.message || 'Erro desconhecido ao criar cabeçalho.' });
  }
};


exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const [updated] = await ParteDiariaCabecalho.update(req.body, { where: { DocumentoID: id } });
  if (!updated) return res.status(404).json({ erro: 'Não encontrado' });
  res.sendStatus(204);
};

exports.remover = async (req, res) => {
  const { id } = req.params;
  const deleted = await ParteDiariaCabecalho.destroy({ where: { DocumentoID: id } });
  if (!deleted) return res.status(404).json({ erro: 'Não encontrado' });
  res.sendStatus(204);
};

