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

// Endpoint para verificar se o utilizador tem falta aprovada no dia
router.get('/verificar-falta', async (req, res) => {
    try {
        const { user_id, data } = req.query;

        if (!user_id || !data) {
            return res.status(400).json({
                error: "user_id e data são obrigatórios"
            });
        }

        const AprovacaoFaltaFerias = require('../models/faltas_ferias');
        const User = require('../models/user');
        const { Op } = require('sequelize');

        // Buscar o utilizador para obter o codFuncionario
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.json({
                temFalta: false,
                motivo: 'Utilizador não encontrado'
            });
        }

        const codFuncionario = user.codFuncionario;
        if (!codFuncionario) {
            return res.json({
                temFalta: false,
                motivo: 'Utilizador sem código de funcionário'
            });
        }

        const dataFormatada = data; // Formato: YYYY-MM-DD

        // Verificar faltas aprovadas (data única via dataPedido)
        // Excluir faltas canceladas (operacao = 'CANCELAR')
        const faltaUnica = await AprovacaoFaltaFerias.findOne({
            where: {
                funcionario: codFuncionario,
                tipoPedido: 'FALTA',
                estadoAprovacao: 'Aprovado',
                operacao: {
                    [Op.ne]: 'CANCELAR'
                },
                dataPedido: {
                    [Op.between]: [
                        new Date(dataFormatada + ' 00:00:00'),
                        new Date(dataFormatada + ' 23:59:59')
                    ]
                }
            }
        });

        if (faltaUnica) {
            return res.json({
                temFalta: true,
                tipoFalta: faltaUnica.falta || 'FALTA',
                justificacao: faltaUnica.justificacao,
                observacoes: faltaUnica.observacoes
            });
        }

        // Verificar férias aprovadas (intervalo de datas)
        // Excluir férias canceladas (operacao = 'CANCELAR')
        const ferias = await AprovacaoFaltaFerias.findOne({
            where: {
                funcionario: codFuncionario,
                tipoPedido: 'FERIAS',
                estadoAprovacao: 'Aprovado',
                operacao: {
                    [Op.ne]: 'CANCELAR'
                },
                dataInicio: { [Op.lte]: dataFormatada },
                dataFim: { [Op.gte]: dataFormatada }
            }
        });

        if (ferias) {
            return res.json({
                temFalta: true,
                tipoFalta: 'FERIAS',
                dataInicio: ferias.dataInicio,
                dataFim: ferias.dataFim
            });
        }

        // Verificar faltas com intervalo (caso existam faltas com dataInicio/dataFim)
        // Excluir faltas canceladas (operacao = 'CANCELAR')
        const faltaIntervalo = await AprovacaoFaltaFerias.findOne({
            where: {
                funcionario: codFuncionario,
                tipoPedido: 'FALTA',
                estadoAprovacao: 'Aprovado',
                operacao: {
                    [Op.ne]: 'CANCELAR'
                },
                dataInicio: {
                    [Op.not]: null,
                    [Op.lte]: dataFormatada
                },
                dataFim: {
                    [Op.not]: null,
                    [Op.gte]: dataFormatada
                }
            }
        });

        if (faltaIntervalo) {
            return res.json({
                temFalta: true,
                tipoFalta: faltaIntervalo.falta || 'FALTA',
                justificacao: faltaIntervalo.justificacao,
                observacoes: faltaIntervalo.observacoes
            });
        }

        res.json({
            temFalta: false
        });

    } catch (error) {
        console.error("❌ [VERIFICAR-FALTA] Erro:", error.message);
        console.error("   user_id:", req.query.user_id);
        console.error("   data:", req.query.data);
        res.status(500).json({
            error: "Erro ao verificar falta do utilizador",
            details: error.message
        });
    }
});

module.exports = router;