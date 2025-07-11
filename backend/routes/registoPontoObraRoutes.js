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
    listarRegistosHojeEquipa
} = require('../controllers/registoPontoObraControllers');

router.post('/', authMiddleware, registarPonto);
router.get('/listar-dia', authMiddleware, listarRegistosPorDia);
router.get('/resumo-mensal', authMiddleware, resumoMensalPorUser);

router.post('/registar-esquecido', authMiddleware, registarPontoEsquecido);

router.get('/listar-por-obra-e-dia', authMiddleware, listarPorObraEDia);

router.post('/registar-ponto-equipa', authMiddleware, registarPontoEquipa);

router.get('/listar-dia-equipa', authMiddleware, listarRegistosHojeEquipa);


module.exports = router;
