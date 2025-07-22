
const express = require('express');
const NotificacaoService = require('../services/notificacaoService');

const router = express.Router();

// Rota de teste para criar notificação
router.post('/test/notificacao', async (req, res) => {
    try {
        const { tecnico, clienteNome, problemaDescricao } = req.body;
        
        const notificacao = await NotificacaoService.criarNotificacaoPedido(
            tecnico || 'TESTE001',
            'PEDIDO_' + Date.now(),
            clienteNome || 'Cliente Teste',
            problemaDescricao || 'Problema de teste para verificar o sistema de notificações.'
        );

        return res.status(201).json({
            success: true,
            data: notificacao,
            message: 'Notificação de teste criada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar notificação de teste:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao criar notificação de teste',
            details: error.message
        });
    }
});

module.exports = router;
