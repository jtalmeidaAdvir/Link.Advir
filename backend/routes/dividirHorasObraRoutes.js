
const express = require('express');
const { dividirHorasObra } = require('../controllers/dividirHorasObraController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/dividir', authMiddleware, dividirHorasObra);

module.exports = router;
