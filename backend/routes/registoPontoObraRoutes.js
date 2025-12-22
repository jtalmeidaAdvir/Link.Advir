const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  registarPonto,
  listarRegistosPorDia,
  resumoMensalPorUser,
  registarPontoEsquecido,
  listarPorObraEDia,
  registarPontoEquipa,
  listarRegistosHojeEquipa,
  confirmarPonto,
  cancelarPonto,
  listarPendentes,
  listarPorUserEDia,
  listarPorUserPeriodo,
  registarPontoEsquecidoPorOutro,
  eliminarRegisto,
  obterRegistosObraPorDia,
  obterResumoObra,
  obterRelatorioObrasPontos,
} = require('../controllers/registoPontoObraControllers');

router.post('/', authMiddleware, registarPonto);
router.get('/listar-dia', authMiddleware, listarRegistosPorDia);
router.get('/resumo-mensal', authMiddleware, resumoMensalPorUser);

router.post('/registar-esquecido', authMiddleware, registarPontoEsquecido);

router.get('/listar-por-obra-e-dia', authMiddleware, listarPorObraEDia);

router.post('/registar-ponto-equipa', authMiddleware, registarPontoEquipa);

router.post('/registar-esquecido-por-outro', authMiddleware, registarPontoEsquecidoPorOutro);

router.get('/listar-dia-equipa', authMiddleware, listarRegistosHojeEquipa);

router.patch('/confirmar/:id', authMiddleware, confirmarPonto);
router.delete('/cancelar/:id', authMiddleware, cancelarPonto);

router.get('/pendentes', authMiddleware, listarPendentes);

router.get('/listar-por-user-e-dia', authMiddleware, listarPorUserEDia);

router.get('/listar-por-user-periodo', authMiddleware, listarPorUserPeriodo);

// Eliminar registo de ponto (apenas admin)
router.delete('/eliminar/:id', authMiddleware, eliminarRegisto);

// Adiciona rota para obter registos de entrada/saída de uma obra por dia
router.get('/obra/:obraId/registos-dia', authMiddleware, obterRegistosObraPorDia);

// Adiciona rota para obter resumo da obra (pessoas a trabalhar + últimos registos)
router.get('/resumo-obra/:obraId', authMiddleware, obterResumoObra);

// Rota para obter relatório de pontos agrupado por obra (para envio de emails)
router.get('/relatorio-pontos', obterRelatorioObrasPontos);

// Rota para verificar horário do utilizador
router.get('/verificar-horario', async (req, res) => {
    try {
        const { user_id, data } = req.query;

        if (!user_id || !data) {
            return res.status(400).json({
                error: "user_id e data são obrigatórios"
            });
        }

        const PlanoHorario = require('../models/planoHorario');
        const Horario = require('../models/horario');
        const { Op } = require('sequelize');

        // Buscar plano de horário ativo para o utilizador na data especificada
        // Considerar prioridade: dia específico > mês > ano > permanente
        const planoHorario = await PlanoHorario.findOne({
            where: {
                user_id: user_id,
                ativo: true,
                dataInicio: {
                    [Op.lte]: data + ' 23:59:59'
                },
                [Op.or]: [
                    { dataFim: null },
                    { dataFim: { [Op.gte]: data + ' 00:00:00' } }
                ]
            },
            order: [['prioridade', 'DESC'], ['dataInicio', 'DESC']]
        });

        if (!planoHorario) {
            return res.json({
                temHorario: false,
                horario: null
            });
        }

        // Buscar o horário associado
        const horario = await Horario.findOne({
            where: {
                id: planoHorario.horario_id,
                ativo: true
            }
        });

        if (!horario) {
            return res.json({
                temHorario: false,
                horario: null
            });
        }

        res.json({
            temHorario: true,
            horario: {
                id: horario.id,
                descricao: horario.descricao,
                horaEntrada: horario.horaEntrada,
                horaSaida: horario.horaSaida,
                diasSemana: horario.diasSemana,
                dataInicio: planoHorario.dataInicio,
                dataFim: planoHorario.dataFim,
                horasPorDia: horario.horasPorDia,
                horasSemanais: horario.horasSemanais
            }
        });

    } catch (error) {
        console.error("Erro ao verificar horário:", error);
        res.status(500).json({
            error: "Erro ao verificar horário do utilizador",
            details: error.message
        });
    }
});

module.exports = router;