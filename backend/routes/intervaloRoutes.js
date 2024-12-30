const express = require('express');
const { iniciarIntervalo, finalizarIntervalo } = require('../controllers/intervaloController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Corrige para usar router.post
router.post('/iniciarIntervalo', authMiddleware, iniciarIntervalo);
router.post('/finalizarIntervalo', authMiddleware, finalizarIntervalo);


module.exports = router;
