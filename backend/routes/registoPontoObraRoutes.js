const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  registarPonto,
  listarRegistosPorDia
} = require('../controllers/registoPontoObraController');

router.post('/', authMiddleware, registarPonto);
router.get('/listar-dia', authMiddleware, listarRegistosPorDia);

module.exports = router;
