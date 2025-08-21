
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  obterRegistosParaMapa,
  obterEstatisticasMapa
} = require('../controllers/mapaRegistosController');

// Rota para obter registos com coordenadas para o mapa
router.get('/registos', authMiddleware, obterRegistosParaMapa);

// Rota para obter estatísticas do mapa
router.get('/estatisticas', authMiddleware, obterEstatisticasMapa);

module.exports = router;
