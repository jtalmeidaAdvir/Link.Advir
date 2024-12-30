const express = require('express');
const {getSubmodulosByModulo,associarSubmodulo,removerSubmodulo  } = require('../controllers/submoduloController');
const router = express.Router();

// Rota para listar módulos do utilizador (recebe userid via query)
router.get('/:moduloId', getSubmodulosByModulo);

// Rota para associar um submódulo a um utilizador
router.post('/associar', associarSubmodulo);

// Rota para remover um submódulo de um utilizador
router.post('/remover', removerSubmodulo);

module.exports = router;
