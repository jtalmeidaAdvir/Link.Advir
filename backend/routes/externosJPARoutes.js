
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/externosJPAController');

// GET - Listar todos (opcional)
router.get('/', ctrl.listar);

// GET - Resumo de externos por obra (DEVE VIR ANTES de rotas com parâmetros)
router.get('/resumo-obra', ctrl.resumoObra);

// GET - Buscar externo por QR code
router.get('/buscar/:qrcode', ctrl.buscar);

// POST - Criar novo registo
router.post('/', ctrl.criar);

// POST - Registar ponto
router.post('/registar-ponto', ctrl.registarPonto);

module.exports = router;
