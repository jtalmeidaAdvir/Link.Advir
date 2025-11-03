
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
router.post('/empresa/:empresaId', authMiddleware, criarHorario);
router.put('/:horarioId', authMiddleware, atualizarHorario);
router.delete('/:horarioId', authMiddleware, eliminarHorario);

// Rotas de planos de horário (atribuição a users)
router.post('/atribuir', authMiddleware, atribuirHorarioUser);
router.get('/user/:userId', authMiddleware, obterHorarioUser);
router.get('/user/:userId/historico', authMiddleware, historicoHorariosUser);

module.exports = router;
