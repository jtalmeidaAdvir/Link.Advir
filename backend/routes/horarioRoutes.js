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
router.get('/empresa/:empresaId',  listarHorarios); //authMiddleware,
router.post('/empresa/:empresaId',  criarHorario); // authMiddleware,

// Rotas de planos de horário (atribuição a users)
router.post('/atribuir',  atribuirHorarioUser); //authMiddleware,

// Rota correta para obter horário de user
router.get('/user/:userId', (req, res, next) => {
    console.log(`\n🔵 [ROUTE] GET /api/horario/user/${req.params.userId} - Requisição recebida!`);
    next();
}, obterHorarioUser); //authMiddleware,

router.get('/user/:userId/historico', historicoHorariosUser);//authMiddleware,

// ROTAS DINÂMICAS — SEMPRE NO FIM
router.put('/:horarioId',  atualizarHorario); //authMiddleware,
router.delete('/:horarioId',  eliminarHorario); //authMiddleware,



module.exports = router;