const express = require('express');
const router = express.Router();
const bolsaHorasController = require('../controllers/bolsaHorasController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// IMPORTANTE: Rotas específicas devem vir ANTES das genéricas

// Obter todas as bolsas de horas para um ano (todos os utilizadores de uma empresa)
// GET /bolsa-horas/empresa/:empresaId/:ano
router.get('/empresa/:empresaId/:ano', bolsaHorasController.obterBolsasHorasPorAno);

// Obter histórico de bolsas de horas de um utilizador
// GET /bolsa-horas/historico/:userId
router.get('/historico/:userId', bolsaHorasController.obterHistoricoBolsas);

// Obter bolsa de horas de um utilizador para um ano específico
// GET /bolsa-horas/:userId/:ano
router.get('/:userId/:ano', bolsaHorasController.obterBolsaHorasAnual);

// Definir horas iniciais para um utilizador em um ano
// POST /bolsa-horas/:userId/:ano/iniciais
// Body: { horas_iniciais: number, observacoes?: string }
router.post('/:userId/:ano/iniciais', bolsaHorasController.definirHorasIniciais);

// Atualizar horas calculadas (chamado após recálculo)
// PUT /bolsa-horas/:userId/:ano/calculadas
// Body: { horas_calculadas: number }
router.put('/:userId/:ano/calculadas', bolsaHorasController.atualizarHorasCalculadas);

// Atualizar múltiplas bolsas de horas (batch update)
// PUT /bolsa-horas/batch
// Body: { bolsas: [{ userId, ano, horas_calculadas }] }
router.put('/batch', bolsaHorasController.atualizarMultiplasBolsas);

// Eliminar registo de bolsa de horas
// DELETE /bolsa-horas/:userId/:ano
router.delete('/:userId/:ano', bolsaHorasController.eliminarBolsaHoras);

module.exports = router;
