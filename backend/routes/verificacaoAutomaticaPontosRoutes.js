
const express = require('express');
const {
    verificarEAdicionarPontosAlmoco,
    verificacaoManual,
    listarUtilizadoresComTratamento
} = require('../controllers/verificacaoAutomaticaPontosController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Rota para verificação automática (usada pelo agendamento)
router.post('/verificar-pontos-almoco', authMiddleware, verificarEAdicionarPontosAlmoco);

// Rota para verificação manual (para testes)
router.post('/verificacao-manual',  verificacaoManual);

// Rota para listar utilizadores com/sem tratamento automático
router.get('/utilizadores-tratamento', authMiddleware, listarUtilizadoresComTratamento);

module.exports = router;
