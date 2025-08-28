const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const biometricController = require('../controllers/biometricController');

// Rotas públicas
router.post('/login-challenge', biometricController.generateLoginChallenge);
router.post('/login', biometricController.authenticateWithBiometric);
router.post('/authenticate-facial', biometricController.authenticateWithFacialData);
router.post('/check', biometricController.checkBiometric);
router.delete('/remove', biometricController.removeBiometric);

// Rotas protegidas
router.post('/register-challenge', authMiddleware, biometricController.generateRegisterChallenge);
router.post('/register', authMiddleware, biometricController.registerBiometric);

module.exports = router;