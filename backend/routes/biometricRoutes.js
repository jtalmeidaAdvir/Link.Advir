
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    generateRegisterChallenge,
    registerBiometric,
    generateLoginChallenge,
    authenticateWithBiometric,
    checkBiometric,
    removeBiometric,
    authenticateWithFacialData
} = require('../controllers/biometricController');

// Rotas públicas
router.post('/login-challenge', generateLoginChallenge);
router.post('/login', authenticateWithBiometric);
router.post('/authenticate-facial', authenticateWithFacialData);
router.post('/check', checkBiometric);
router.delete('/remove', removeBiometric);

// Rotas protegidas
router.post('/register-challenge', authMiddleware, generateRegisterChallenge);
router.post('/register', authMiddleware, registerBiometric);

module.exports = router;
