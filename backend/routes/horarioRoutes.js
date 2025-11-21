const express = require('express');
const router = express.Router();
const {
    listarHorarios,
    criarHorario,
    atualizarHorario,
    eliminarHorario,
    atribuirHorarioUser,
    obterHorarioUser,
    historicoHorariosUser
} = require('../controllers/horarioController');
const { protect } = require('../middleware/authMiddleware');

// Rotas para horários de empresa
router.get('/empresa/:empresaId', protect, listarHorarios);
router.post('/empresa/:empresaId', protect, criarHorario);
router.put('/:horarioId', protect, atualizarHorario);
router.delete('/:horarioId', protect, eliminarHorario);

// Rotas para gestão de horários de utilizadores
router.post('/atribuir', protect, atribuirHorarioUser);

// Log para debug da rota
router.get('/user/:userId', protect, (req, res, next) => {
    console.log(`[ROUTE] 🌐 Rota /user/:userId chamada`);
    console.log(`[ROUTE] Params:`, req.params);
    console.log(`[ROUTE] userId:`, req.params.userId);
    next();
}, obterHorarioUser);

router.get('/user/:userId/historico', protect, historicoHorariosUser);

module.exports = router;