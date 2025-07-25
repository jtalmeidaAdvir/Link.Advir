
const express = require('express');
const NotificacaoAgendadaController = require('../controllers/notificacaoAgendadaController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Iniciar serviço de notificações agendadas
router.post('/iniciar', authMiddleware, NotificacaoAgendadaController.iniciarServico);

// Parar serviço de notificações agendadas
router.post('/parar', authMiddleware, NotificacaoAgendadaController.pararServico);

// Testar notificação para um usuário específico
router.post('/testar', authMiddleware, NotificacaoAgendadaController.testarNotificacao);

// Verificar status do serviço
router.get('/status', authMiddleware, NotificacaoAgendadaController.verificarStatus);

module.exports = router;
