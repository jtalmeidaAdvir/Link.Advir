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
// Rota para obter o horário de um utilizador específico
router.get('/user/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`[HORARIO] Buscando horário para user_id: ${userId}`);

        const horario = await Horario.findOne({
            where: {
                user_id: userId,
                ativo: true
            }
        });

        console.log(`[HORARIO] Resultado para user_id ${userId}:`, horario ? 'Encontrado' : 'Não encontrado');
    } catch (error) {
        console.error(`[HORARIO] Erro ao buscar horário para user_id ${userId}:`, error);
        res.status(500).json({ message: 'Erro ao buscar horário' });
    }
});
router.get('/user/:userId/historico', authMiddleware, historicoHorariosUser);

module.exports = router;