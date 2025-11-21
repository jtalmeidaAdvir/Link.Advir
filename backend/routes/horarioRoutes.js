const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    listarHorarios,
    criarHorario,
    atualizarHorario,
    eliminarHorario,
    atribuirHorarioUser,
    obterHorarioUser,
    historicoHorariosUser
} = require('../controllers/horarioController');

// Rotas de horários por empresa
router.get('/empresa/:empresaId', authMiddleware, listarHorarios);
router.get('/empresa/:empresaId/diagnostico', authMiddleware, require('../controllers/horarioController').diagnosticoHorarios);
router.post('/empresa/:empresaId', authMiddleware, criarHorario);
router.put('/:horarioId', authMiddleware, atualizarHorario);
router.delete('/:horarioId', authMiddleware, eliminarHorario);

// Rotas de planos de horário (atribuição a users)
router.post('/atribuir', authMiddleware, atribuirHorarioUser);

// LOG ANTES DO MIDDLEWARE para verificar se a requisição chega
router.get('/user/:userId', (req, res, next) => {
    console.log(`\n🔵 [ROUTE] GET /api/horario/user/${req.params.userId} - Requisição recebida!`);
    console.log(`🔵 [ROUTE] Headers:`, req.headers);
    console.log(`🔵 [ROUTE] Authorization header presente:`, !!req.headers.authorization);
    next();
}, authMiddleware, obterHorarioUser);

router.get('/user/:userId/historico', authMiddleware, historicoHorariosUser);

module.exports = router;