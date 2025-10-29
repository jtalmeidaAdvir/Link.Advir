
const express = require('express');
const router = express.Router();
const predicaoController = require('../controllers/predicaoObraController');

// Obter predição para uma obra
// GET /api/predicao-obra/:obraId?diasPrevistos=30
router.get('/:obraId', predicaoController.obterPredicaoObra);

// Obter métricas históricas
// GET /api/predicao-obra/:obraId/metricas
router.get('/:obraId/metricas', predicaoController.obterMetricasHistoricas);

module.exports = router;
