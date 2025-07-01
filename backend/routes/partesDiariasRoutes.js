
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    criarParteDiaria,
    listarMinhasPartesDiarias,
    listarPartesDiariasEquipa,
    atualizarParteDiaria
} = require('../controllers/partesDiariasController');

router.post('/', authMiddleware, criarParteDiaria);
router.get('/minhas', authMiddleware, listarMinhasPartesDiarias);
router.get('/equipa/:obra_id', authMiddleware, listarPartesDiariasEquipa);
router.put('/:id', authMiddleware, atualizarParteDiaria);

module.exports = router;
