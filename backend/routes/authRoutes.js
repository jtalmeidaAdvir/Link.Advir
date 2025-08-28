const express = require("express");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();
const userController = require("../controllers/userController");
const biometricController = require("../controllers/biometricController");

// Rota para verificar se o token é válido
router.post("/verify-token", authenticateToken, (req, res) => {
    try {
        // Se chegou até aqui, o token é válido (passou pelo middleware)
        res.json({
            valid: true,
            userId: req.user.id,
            message: "Token válido",
        });
    } catch (error) {
        console.error("Erro na verificação do token:", error);
        res.status(500).json({
            valid: false,
            message: "Erro interno do servidor",
        });
    }
});

// Rotas de autenticação biométrica
// Rotas de autenticação biométrica
router.post(
    "/biometric/register-challenge",
    biometricController.generateRegisterChallenge,
);
router.post("/biometric/register", biometricController.registerBiometric);
router.post(
    "/biometric/login-challenge",
    biometricController.generateLoginChallenge,
);
router.post(
    "/biometric/authenticate",
    biometricController.authenticateWithBiometric,
);
router.post("/biometric/check", biometricController.checkBiometric);
router.delete("/biometric/remove", biometricController.removeBiometric);

// Rota de autenticação facial
router.post("/biometric/facial/authenticate", biometricController.authenticateWithFacialData);
router.post("/facial-login", biometricController.authenticateWithFacialData);

module.exports = router;