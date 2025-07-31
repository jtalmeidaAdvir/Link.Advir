// routes/parteDiariaRoutes.js
const express = require('express');
const cab = require('../controllers/parteCabecalhoController');
const item = require('../controllers/parteItemController');

const router = express.Router();

// Cabeçalhos
router.get('/cabecalhos', cab.listar);
router.get('/cabecalhos/:id', cab.obter);
router.post('/cabecalhos', cab.criar);
router.put('/cabecalhos/:id', cab.atualizar);
router.delete('/cabecalhos/:id', cab.remover);

// Itens
router.get('/itens', item.listar);
router.get('/itens/:id', item.obter);
router.post('/itens', item.criar);
router.put('/itens/:id', item.atualizar);
router.delete('/itens/:id', item.remover);

module.exports = router;