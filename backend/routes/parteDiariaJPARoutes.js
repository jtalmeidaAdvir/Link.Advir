
const express = require('express');
const router = express.Router();
const jpaController = require('../controllers/parteDiariaJPAController');
const auth = require('../middleware/authMiddleware');

// Listar partes diárias da empresa JPA
router.get('/cabecalhos', auth, jpaController.listarJPA);

// Estatísticas das partes diárias JPA
router.get('/estatisticas', auth, jpaController.estatisticasJPA);

module.exports = router;
