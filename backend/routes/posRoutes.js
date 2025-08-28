
const express = require('express');
const router = express.Router();
const { criarPOS, loginPOS, listarPOS, atualizarPOS, eliminarPOS } = require('../controllers/posController');
const { posMiddleware } = require('../middleware/posMiddleware');

// Login do POS (sem autenticação)
router.post('/login', loginPOS);

// Rotas protegidas
router.post('/', posMiddleware, criarPOS);
router.get('/', posMiddleware, listarPOS);
router.put('/:id', posMiddleware, atualizarPOS);
router.delete('/:id', posMiddleware, eliminarPOS);

module.exports = router;
