
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    listarObras,
    criarObra,
    obterObra,
    atualizarObra,
    eliminarObra
} = require('../controllers/obraController');

router.get('/', authMiddleware, listarObras);
router.post('/', authMiddleware, criarObra);
router.get('/:id', authMiddleware, obterObra);
router.put('/:id', authMiddleware, atualizarObra);
router.delete('/:id', authMiddleware, eliminarObra);

module.exports = router;
