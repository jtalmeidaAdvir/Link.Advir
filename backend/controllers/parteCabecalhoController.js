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
  const { ObraID, Data } = req.body;

  if (!ObraID || !Data) {
    return res.status(400).json({ erro: 'ObraID e Data são obrigatórios.' });
  }

  try {
    const payload = {
      ObraID: Number(ObraID),
      Data,                                   // YYYY-MM-DD
      Notas: req.body.Notas ?? '',
      CriadoPor: req.body.CriadoPor ?? req.user?.userNome ?? 'Sistema',
      Utilizador: req.body.Utilizador ?? req.user?.userNome ?? 'Sistema',
      TipoEntidade: (req.body.TipoEntidade ?? 'O').slice(0,1),
      ColaboradorID: req.body.ColaboradorID ?? null   // "022"
    };

    const novo = await ParteDiariaCabecalho.create(
      payload,
      { fields: ['ObraID','Data','Notas','CriadoPor','Utilizador','TipoEntidade','ColaboradorID'] }
    );

    return res.status(201).json(novo);
  } catch (err) {
    console.error('Erro ao criar parte diária:', err);
    return res.status(400).json({
      erro: 'Erro ao criar cabeçalho.',
      detalhe: err?.original?.message || err.message
    });
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

