
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/externosJPAController');

// POST - Criar novo registo
router.post('/', ctrl.criar);

// GET - Listar todos (opcional)
router.get('/', ctrl.listar);

// GET - Buscar externo por QR code
router.get('/buscar/:qrcode', ctrl.buscar);

// POST - Registar ponto
router.post('/registar-ponto', ctrl.registarPonto);

module.exports = router;
