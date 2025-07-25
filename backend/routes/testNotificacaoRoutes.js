const express = require('express');
const NotificacaoService = require('../services/notificacaoService');
const User = require('../models/user');
const RegistoPonto = require('../models/registoPonto');
 
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
 
// Endpoint para testar notificação imediatamente
router.post('/teste-lembrete', async (req, res) => {
    try {
        const { userId } = req.body;
 
        const mensagem = {
            titulo: 'Registo de Ponto - TESTE',
            mensagem: 'Lembrete: Não se esqueça de registar o seu ponto!',
            timestamp: new Date().toISOString(),
            usuario: userId
        };
 
        console.log('=== NOTIFICAÇÃO DE TESTE ===');
        console.log('Título:', mensagem.titulo);
        console.log('Mensagem:', mensagem.mensagem);
        console.log('Usuário ID:', mensagem.usuario);
        console.log('Timestamp:', mensagem.timestamp);
        console.log('============================');
 
        res.status(200).json({
            success: true,
            message: 'Notificação de teste enviada (verificar console)',
            data: mensagem
        });
    } catch (error) {
        console.error('Erro no teste:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao enviar notificação de teste'
        });
    }
});
 
// Endpoint para simular verificação diária
router.get('/simular-verificacao', async (req, res) => {
    try {
        const hoje = new Date().toISOString().split('T')[0];
 
        const usuarios = await User.findAll({
            where: { ativo: true },
            attributes: ['id', 'nome', 'email']
        });
 
        const usuariosSemPonto = [];
 
        for (const usuario of usuarios) {
            const pontoHoje = await RegistoPonto.findOne({
                where: {
                    user_id: usuario.id,
                    data: hoje
                }
            });
 
            if (!pontoHoje) {
                usuariosSemPonto.push({
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email
                });
            }
        }
 
        console.log('=== SIMULAÇÃO VERIFICAÇÃO DIÁRIA ===');
        console.log(`Data: ${hoje}`);
        console.log(`Usuários sem ponto: ${usuariosSemPonto.length}`);
        usuariosSemPonto.forEach(user => {
            console.log(`- ${user.nome} (ID: ${user.id}) - ${user.email}`);
        });
        console.log('====================================');
 
        res.status(200).json({
            success: true,
            data: {
                data: hoje,
                totalUsuarios: usuarios.length,
                usuariosSemPonto: usuariosSemPonto
            }
        });
    } catch (error) {
        console.error('Erro na simulação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao simular verificação'
        });
    }
});
 
module.exports = router;