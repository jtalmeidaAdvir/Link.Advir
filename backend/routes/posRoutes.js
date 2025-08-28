
const express = require('express');
const router = express.Router();
const { criarPOS, loginPOS, listarPOS, atualizarPOS, eliminarPOS } = require('../controllers/posController');
const  authMiddleware  = require('../middleware/authMiddleware');

// Login do POS (sem autenticação)
router.post('/login', loginPOS);

// Rotas protegidas com authMiddleware (igual às outras rotas)
router.post('/', authMiddleware, criarPOS);
router.get('/', authMiddleware, listarPOS);
router.put('/:id', authMiddleware, atualizarPOS);
router.delete('/:id', authMiddleware, eliminarPOS);

module.exports = router;
