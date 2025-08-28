
const express = require('express');
const router = express.Router();
const { criarPOS, loginPOS, listarPOS, atualizarPOS, eliminarPOS } = require('../controllers/posController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Login do POS (sem autenticação)
router.post('/login', loginPOS);

// Rotas protegidas
router.post('/', authenticateToken, criarPOS);
router.get('/', authenticateToken, listarPOS);
router.put('/:id', authenticateToken, atualizarPOS);
router.delete('/:id', authenticateToken, eliminarPOS);

module.exports = router;
