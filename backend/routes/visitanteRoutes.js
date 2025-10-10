
const express = require('express');
const {
  criarVisitante,
  buscarVisitantePorContribuinte,
  registarPontoVisitante,
  listarVisitantes,
  obterResumoObraVisitantes
} = require('../controllers/visitanteController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/criar', authMiddleware, criarVisitante);
router.get('/buscar/:numeroContribuinte', authMiddleware, buscarVisitantePorContribuinte);
router.post('/registar-ponto', authMiddleware, registarPontoVisitante);
router.get('/listar', authMiddleware, listarVisitantes);
router.get('/resumo-obra', authMiddleware, obterResumoObraVisitantes);

module.exports = router;
