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
// Rotas de horários por empresa
router.get('/empresa/:empresaId', authMiddleware, listarHorarios);
router.post('/empresa/:empresaId', authMiddleware, criarHorario);

// Rotas de planos de horário (atribuição a users)
router.post('/atribuir', authMiddleware, atribuirHorarioUser);

// Rota correta para obter horário de user
router.get('/user/:userId', (req, res, next) => {
    console.log(`\n🔵 [ROUTE] GET /api/horario/user/${req.params.userId} - Requisição recebida!`);
    next();
}, authMiddleware, obterHorarioUser);

router.get('/user/:userId/historico', authMiddleware, historicoHorariosUser);

// ROTAS DINÂMICAS — SEMPRE NO FIM
router.put('/:horarioId', authMiddleware, atualizarHorario);
router.delete('/:horarioId', authMiddleware, eliminarHorario);



module.exports = router;