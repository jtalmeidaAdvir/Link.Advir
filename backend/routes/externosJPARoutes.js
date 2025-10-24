
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/externosJPAController');

console.log('✅ Rotas de ExternosJPA a serem definidas...');

// GET - Listar todos (opcional)
router.get('/', ctrl.listar);

// GET - Resumo de externos por obra (DEVE VIR ANTES de rotas com parâmetros)
router.get('/resumo-obra', ctrl.resumoObra);
console.log('✅ Rota /resumo-obra definida');

// GET - Listar QR codes dos externos
router.get('/qrcodes', ctrl.listarQRCodes);
console.log('✅ Rota /qrcodes definida');

// GET - Buscar externo por QR code
router.get('/buscar/:qrcode', ctrl.buscar);

// POST - Criar novo registo
router.post('/', ctrl.criar);

// POST - Registar ponto
router.post('/registar-ponto', ctrl.registarPonto);

module.exports = router;
