
// controllers/parteItemController.js
const ParteDiariaItem = require('../models/parteDiariaItem');

exports.listar = async (req, res) => {
  const itens = await ParteDiariaItem.findAll();
  res.json(itens);
};

exports.obter = async (req, res) => {
  const { id } = req.params;
  const item = await ParteDiariaItem.findByPk(id);
  if (!item) return res.status(404).json({ erro: 'Não encontrado' });
  res.json(item);
};

exports.criar = async (req, res) => {
  console.log('🔎 Dados recebidos:', req.body);

  if (!req.body.ObraID || !req.body.Data) {
    return res.status(400).json({ erro: 'Campos obrigatórios em falta.', recebido: req.body });
  }

  try {
    const novo = await ParteDiariaItem.create(req.body);
    return res.status(201).json(novo);
  } catch (err) {
  console.error('🔥 Erro Sequelize completo:', JSON.stringify(err, null, 2));
  return res.status(400).json({
    erro: err.message || 'Erro inesperado',
    detalhe: err.errors || err
  });
}

};





exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const [updated] = await ParteDiariaItem.update(req.body, { where: { ComponenteID: id } });
  if (!updated) return res.status(404).json({ erro: 'Não encontrado' });
  res.sendStatus(204);
};

exports.remover = async (req, res) => {
  const { id } = req.params;
  const deleted = await ParteDiariaItem.destroy({ where: { ComponenteID: id } });
  if (!deleted) return res.status(404).json({ erro: 'Não encontrado' });
  res.sendStatus(204);
};