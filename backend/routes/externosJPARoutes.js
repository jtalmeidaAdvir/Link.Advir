
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/externosJPAController');

// POST - Criar novo registo
router.post('/', ctrl.criar);

// GET - Listar todos (opcional)
router.get('/', ctrl.listar);

module.exports = router;
