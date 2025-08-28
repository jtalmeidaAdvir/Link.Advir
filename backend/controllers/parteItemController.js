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
  const body = { ...req.body };
  if (body.categoria && !body.Categoria) body.Categoria = body.categoria;

  // validação mínima - apenas campos realmente essenciais
  if (!body.DocumentoID || !body.ObraID || !body.Data) {
    return res.status(400).json({ 
      erro: 'Campos obrigatórios em falta (DocumentoID, ObraID, Data).', 
      recebido: body 
    });
  }

  // Defaults para campos opcionais
  if (!body.Numero) body.Numero = 1;
  if (!body.Funcionario) body.Funcionario = body.ColaboradorID || 'N/A';
  if (!body.ClasseID) body.ClasseID = 1;
  if (!body.NumHoras) body.NumHoras = 0;
  if (!body.PrecoUnit) body.PrecoUnit = 0;
  if (!body.TipoEntidade) body.TipoEntidade = 'O';
  if (!body.Categoria) body.Categoria = 'MaoObra';

  console.log(`📝 Criando item ${body.Categoria} para obra ${body.ObraID}`);

  try {
    const novo = await ParteDiariaItem.create(body, {
      fields: [
        'DocumentoID','Funcionario','ClasseID','SubEmpID','NumHoras','PrecoUnit',
        'TipoEntidade','ColaboradorID','Data','ObraID','TipoHoraID','Categoria','Numero'
      ],
      returning: true
    });
    console.log(`✅ Item ${body.Categoria} criado com sucesso: ${novo.ComponenteID}`);
    return res.status(201).json(novo);
  } catch (err) {
    console.error('🔥 Erro ao criar item:', err.message);
    return res.status(400).json({ erro: err.message || 'Erro inesperado', detalhe: err.errors || err });
  }
};





exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const body = { ...req.body };
  if (body.categoria && !body.Categoria) body.Categoria = body.categoria;

  try {
    const item = await ParteDiariaItem.findByPk(id); // respeita a PK do modelo (ID/id)
    if (!item) return res.status(404).json({ erro: 'Não encontrado' });

    await item.update(body); // só atualiza colunas definidas no modelo
    return res.json(item);   // melhor DX para o front
  } catch (err) {
    console.error('Erro ao atualizar item:', err);
    return res.status(400).json({ erro: err.message || 'Erro inesperado' });
  }
};

exports.remover = async (req, res) => {
  const { id } = req.params;
  try {
    const item = await ParteDiariaItem.findByPk(id);
    if (!item) return res.status(404).json({ erro: 'Não encontrado' });
    await item.destroy();
    return res.sendStatus(204);
  } catch (err) {
    console.error('Erro ao remover item:', err);
    return res.status(400).json({ erro: err.message || 'Erro inesperado' });
  }
};