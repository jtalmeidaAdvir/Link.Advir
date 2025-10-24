
const Configuracao = require('../models/configuracao');

// Obter configuração por chave
const obterConfiguracao = async (req, res) => {
  try {
    const { chave } = req.params;
    
    let config = await Configuracao.findOne({ where: { chave } });
    
    // Se não existir, criar valor padrão
    if (!config) {
      const valorPadrao = chave === 'email_visitantes' ? 'jtalmeida@advir.pt' : '';
      config = await Configuracao.create({
        chave,
        valor: valorPadrao,
        descricao: chave === 'email_visitantes' ? 'Email para notificações de visitantes' : ''
      });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Erro ao obter configuração:', error);
    res.status(500).json({ message: 'Erro ao obter configuração', error: error.message });
  }
};

// Atualizar configuração
const atualizarConfiguracao = async (req, res) => {
  try {
    const { chave } = req.params;
    const { valor } = req.body;
    
    let config = await Configuracao.findOne({ where: { chave } });
    
    if (config) {
      config.valor = valor;
      await config.save();
    } else {
      config = await Configuracao.create({
        chave,
        valor,
        descricao: chave === 'email_visitantes' ? 'Email para notificações de visitantes' : ''
      });
    }
    
    res.json({ message: 'Configuração atualizada com sucesso', config });
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json({ message: 'Erro ao atualizar configuração', error: error.message });
  }
};

// Listar todas as configurações
const listarConfiguracoes = async (req, res) => {
  try {
    const configs = await Configuracao.findAll();
    res.json(configs);
  } catch (error) {
    console.error('Erro ao listar configurações:', error);
    res.status(500).json({ message: 'Erro ao listar configurações', error: error.message });
  }
};

module.exports = {
  obterConfiguracao,
  atualizarConfiguracao,
listarConfiguracoes
};
