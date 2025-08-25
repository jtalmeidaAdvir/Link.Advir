const express = require('express');
const { associarUtilizadorModulo, listarTodosModulos, removerUtilizadorModulo, listarTodosModulosComSubModulos, addModuloToEmpresa,
    removeModuloFromEmpresa,
} = require('../controllers/moduloController');
const { associarModulo, removerModulo } = require('../controllers/userController');
const router = express.Router();

// Rota para associar um utilizador a um módulo
router.post('/associar', associarModulo);
// Rota para listar módulos do utilizador (recebe userid via query)
router.get('/listar', listarTodosModulos);
// Rota para remover módulo do utilizador
router.post('/remover', removerModulo);

router.get('/listar-com-submodulos', listarTodosModulosComSubModulos);

// Exportar as rotas
router.get('/', async (req, res) => {
    try {
        const modulos = await Modulo.findAll(); // Modifique para retornar também submódulos, se necessário
        res.json({ modulos });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao obter todos os módulos.' });
    }
});



router.post('/addModuloToEmpresa', addModuloToEmpresa);

router.post('/removeModuloFromEmpresa', removeModuloFromEmpresa);

module.exports = router;