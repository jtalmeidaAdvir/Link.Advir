
const express = require('express');
const NotificacaoController = require('../controllers/notificacaoController');

const router = express.Router();

// Criar nova notificação
router.post('/notificacoes', NotificacaoController.criarNotificacao);

// Listar notificações de um usuário
router.get('/notificacoes/:usuario', NotificacaoController.listarNotificacoes);

// Marcar notificação como lida
router.put('/notificacoes/:id/lida', NotificacaoController.marcarComoLida);

// Contar notificações não lidas
router.get('/notificacoes/:usuario/nao-lidas', NotificacaoController.contarNaoLidas);

// Limpar notificações lidas
router.delete('/notificacoes/:usuario/lidas', NotificacaoController.limparNotificacoesLidas);

module.exports = router;
