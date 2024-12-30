const Submodulo = require('../models/submodulo');
const user_submodulo = require('../models/user_submodulo');



const getSubmodulosByModulo = async (req, res) => {
    const { moduloId } = req.params;
    try {
      const submodulos = await Submodulo.findAll({ where: { moduloId } });
      if (!submodulos.length) {
        return res.status(404).json({ message: 'Nenhum submódulo encontrado para o módulo especificado.' });
      }
      res.status(200).json({ moduloId, submodulos });
    } catch (error) {
      console.error('Erro ao obter submódulos:', error);
      res.status(500).json({ error: 'Erro ao obter submódulos' });
    }
  };



  
// Associar submódulo
const associarSubmodulo = async (req, res) => {
    const { userid, submoduloid } = req.body;

    try {
        // Verifica se a associação já existe
        const existeAssociacao = await user_submodulo.findOne({
            where: { user_id: userid, submodulo_id: submoduloid },
        });

        if (existeAssociacao) {
            // Se a associação já existe, retorna uma resposta adequada e permite ao frontend mostrar o visto
            return res.status(200).json({ message: 'Submódulo já está associado ao utilizador.' });
        }

        // Caso não exista, cria a associação
        await user_submodulo.create({ user_id: userid, submodulo_id: submoduloid });
        res.status(200).json({ message: 'Submódulo associado com sucesso.' });
    } catch (error) {
        console.error('Erro ao associar submódulo ao utilizador:', error);
        res.status(500).json({ error: 'Erro ao associar submódulo ao utilizador.' });
    }
};


// Remover submódulo
const removerSubmodulo = async (req, res) => {
    const { userid, submoduloid } = req.body;

    try {
        await user_submodulo.destroy({
            where: { user_id: userid, submodulo_id: submoduloid },
        });
        res.status(200).json({ message: 'Submódulo removido com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover submódulo do utilizador:', error);
        res.status(500).json({ error: 'Erro ao remover submódulo do utilizador.' });
    }
};

// Implementar também funções de update e delete conforme necessário
module.exports = {

    getSubmodulosByModulo,
    associarSubmodulo,
    removerSubmodulo,

  };
  