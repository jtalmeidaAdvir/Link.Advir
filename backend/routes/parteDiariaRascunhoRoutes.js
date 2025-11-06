
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const rascunhoController = require('../controllers/parteDiariaRascunhoController');

// Todas as rotas requerem autenticação
router.post('/guardar', auth, rascunhoController.guardarRascunho);
router.get('/obter', auth, rascunhoController.obterRascunho);
router.delete('/eliminar', auth, rascunhoController.eliminarRascunho);

module.exports = router;
