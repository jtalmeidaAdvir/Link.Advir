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

module.exports = router;