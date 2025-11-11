// controllers/parteCabecalhoController.js
const ParteDiariaCabecalho = require('../models/parteDiariaCabecalho');
const ParteDiariaItem = require('../models/parteDiariaItem');

exports.listar = async (req, res) => {
  const { integrado, tipoUser } = req.query;
  const where = {};

  if (integrado === 'true') where.IntegradoERP = true;
  else if (integrado === 'false') where.IntegradoERP = false;

  const cabecalhos = await ParteDiariaCabecalho.findAll({
    where,
    include: ParteDiariaItem
  });

  res.json(cabecalhos);
};


exports.marcarIntegrado = async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await ParteDiariaCabecalho.update(
      { IntegradoERP: true },
      { where: { DocumentoID: id } }
    );

    if (!updated) return res.status(404).json({ erro: 'Parte não encontrado.' });

    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao marcar como integrado:', err);
    res.status(500).json({ erro: 'Erro ao atualizar.' });
  }
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
      Data: new Date(req.body.Data).toISOString().split('T')[0],
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
  
  try {
    const cab = await ParteDiariaCabecalho.findByPk(id);
    if (!cab) return res.status(404).json({ erro: 'Cabeçalho não encontrado' });

    // Permitir atualização de campos específicos
    const camposPermitidos = ['ObraID', 'Data', 'Notas', 'CriadoPor', 'Utilizador', 'TipoEntidade', 'ColaboradorID'];
    const updates = {};
    
    camposPermitidos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        updates[campo] = req.body[campo];
      }
    });

    // Garantir que Data está no formato correto
    if (updates.Data) {
      updates.Data = new Date(updates.Data).toISOString().split('T')[0];
    }

    // Garantir que ObraID é número
    if (updates.ObraID) {
      updates.ObraID = Number(updates.ObraID);
    }

    await cab.update(updates);
    
    // Retornar o cabeçalho atualizado
    const cabecalhoAtualizado = await ParteDiariaCabecalho.findByPk(id, { 
      include: require('../models/parteDiariaItem')
    });
    
    res.json(cabecalhoAtualizado);
  } catch (err) {
    console.error('Erro ao atualizar cabeçalho:', err);
    res.status(500).json({ erro: 'Erro ao atualizar cabeçalho', detalhe: err.message });
  }
};



exports.remover = async (req, res) => {
  const { id } = req.params;
  try {
    const cab = await ParteDiariaCabecalho.findOne({ where: { DocumentoID: id } });
    if (!cab) return res.status(404).json({ erro: 'Não encontrado' });
    if (cab.IntegradoERP) {
      return res.status(409).json({ erro: 'Já integrado — não pode ser rejeitado.' });
    }

    await ParteDiariaItem.destroy({ where: { DocumentoID: id } });
    await ParteDiariaCabecalho.destroy({ where: { DocumentoID: id } });
    return res.sendStatus(204);
  } catch (err) {
    console.error('Erro ao remover parte:', err);
    return res.status(500).json({ erro: 'Erro ao remover.' });
  }
};
