const express = require('express');
const { registarLeituraQRCode, getRegistoDiario, editarRegisto, registarPontoComBotao, listarHistoricoPontoAdmin, obterEstadoPonto, registarPontoParaOutro, editarRegistoDireto } = require('../controllers/registoPontoController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Corrige para usar router.post
router.post('/ler-qr', authMiddleware, registarLeituraQRCode);
router.post('/registar-ponto', authMiddleware, registarPontoComBotao);

router.get('/diario', authMiddleware, getRegistoDiario);
router.get('/listaradmin', authMiddleware, listarHistoricoPontoAdmin);
router.get('/listar', authMiddleware, getRegistoDiario);
router.put('/editar/:registoId', authMiddleware, editarRegisto);
router.get('/estado-ponto', authMiddleware, obterEstadoPonto);
router.put('/editar-direto/:registoId', authMiddleware, editarRegistoDireto);

router.post('/registar-para-outro', authMiddleware, registarPontoParaOutro);



module.exports = router;