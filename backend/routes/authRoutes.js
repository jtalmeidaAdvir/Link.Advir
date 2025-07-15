const express = require('express');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();
 
// Rota para verificar se o token é válido
router.post('/verify-token', authMiddleware, (req, res) => {
    try {
        // Se chegou até aqui, o token é válido (passou pelo middleware)
        res.json({
            valid: true,
            userId: req.user.id,
            message: 'Token válido'
        });
    } catch (error) {
        console.error('Erro na verificação do token:', error);
        res.status(500).json({
            valid: false,
            message: 'Erro interno do servidor'
        });
    }
});
 
module.exports = router;