const Modulo = require('../models/modulo');
const User = require('../models/user');
const Submodulo = require('../models/submodulo'); 



const listarTodosModulos = async (req, res) => {
  try {
      const modulos = await Modulo.findAll();
      res.json({ modulos });
  } catch (error) {
      console.error('Erro ao listar módulos:', error);
      res.status(500).json({ error: 'Erro ao listar módulos.' });
  }
};



const listarTodosModulosComSubModulos = async (req, res) => {
  try {
    const modulos = await Modulo.findAll({
      include: [{ model: Submodulo, as: 'submodulos' }],
    });

    // Verifica se cada modulo tem o array submodulos; se não, inicializa com []
    const modulosComSubmodulos = modulos.map(modulo => ({
      ...modulo.toJSON(),
      submodulos: modulo.submodulos || [],
    }));
    
    res.status(200).json({ modulos: modulosComSubmodulos });
  } catch (error) {
    console.error('Erro ao listar módulos com submódulos:', error);
    res.status(500).json({ error: 'Erro ao listar módulos com submódulos.' });
  }
};







const associarUtilizadorModulo = async (req, res) => {
  try {
      const { userid, moduloid } = req.body;
      const utilizador = await User.findByPk(userid);
      const modulo = await Modulo.findByPk(moduloid);

      if (utilizador && modulo) {
          await utilizador.addModulo(modulo);
          res.status(200).json({ message: `Utilizador associado ao módulo ${modulo.nome}` });
      } else {
          res.status(404).json({ error: 'Utilizador ou módulo não encontrado.' });
      }
  } catch (error) {
      console.error('Erro ao associar o utilizador ao módulo:', error);
      res.status(500).json({ error: 'Erro ao associar o utilizador ao módulo.' });
  }
};




// removerUtilizadorModulo
const removerUtilizadorModulo = async (req, res) => {
  const { userid, moduloid } = req.body;
  try {
      const user = await User.findByPk(userid);
      const modulo = await Modulo.findByPk(moduloid);

      if (user && modulo) {
          await user.removeModulo(modulo); // Remove a associação
          res.status(200).json({ message: 'Módulo removido com sucesso.' });
      } else {
          res.status(404).json({ error: 'Utilizador ou módulo não encontrado.' });
      }
  } catch (error) {
      console.error('Erro ao remover módulo:', error);
      res.status(500).json({ error: 'Erro ao remover o módulo do utilizador.' });
  }
};



const addModuloToEmpresa = async (req, res) => {
  const { empresaId, moduloId } = req.body;

  try {
      const empresa = await Empresa.findByPk(empresaId);
      const modulo = await Modulo.findByPk(moduloId);

      if (!empresa || !modulo) {
          return res.status(404).json({ message: 'Empresa ou Módulo não encontrado.' });
      }

      await empresa.addModulo(modulo); // Associa o módulo à empresa

      res.status(200).json({ message: 'Módulo associado à empresa com sucesso.' });
  } catch (error) {
      console.error('Erro ao associar módulo à empresa:', error);
      res.status(500).json({ message: 'Erro ao associar módulo à empresa.' });
  }
};


const removeModuloFromEmpresa = async (req, res) => {
  const { empresaId, moduloId } = req.body;

  try {
      const empresa = await Empresa.findByPk(empresaId);
      const modulo = await Modulo.findByPk(moduloId);

      if (!empresa || !modulo) {
          return res.status(404).json({ message: 'Empresa ou Módulo não encontrado.' });
      }

      await empresa.removeModulo(modulo); // Remove a associação entre o módulo e a empresa

      res.status(200).json({ message: 'Módulo removido da empresa com sucesso.' });
  } catch (error) {
      console.error('Erro ao remover módulo da empresa:', error);
      res.status(500).json({ message: 'Erro ao remover módulo da empresa.' });
  }
};


// Exportar os controladores
module.exports = {
  associarUtilizadorModulo,
  removerUtilizadorModulo,
  listarTodosModulos,
  listarTodosModulosComSubModulos,
  addModuloToEmpresa,
  removeModuloFromEmpresa,
};
