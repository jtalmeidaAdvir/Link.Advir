
const express = require('express');
const OneSignal = require('onesignal-node');
const axios = require('axios');
const router = express.Router();

// Configurar OneSignal
const oneSignalClient = new OneSignal.Client(
    'a9bc6538-62e7-4f65-a1bf-b502d74bd0f9', 
    'os_v2_app_vg6gkodc45hwlin7wubnos6q7fsczwr5d7penrvnassg2xbymxtt3wwfo2jxwlei32l73f4zg6mxdmqswtzerotypgqt6wq2lakq73q'
);

// Endpoint para testar notificação para todos os dispositivos
router.post('/test-broadcast', async (req, res) => {
    try {
        const notification = {
            contents: {
                'pt': 'Teste de notificação broadcast - Registo de Ponto!',
                'en': 'Test broadcast notification - Point Registration!'
            },
            headings: {
                'pt': 'Teste OneSignal',
                'en': 'OneSignal Test'
            },
            included_segments: ['All'],
            data: {
                type: 'test_broadcast',
                message: 'Teste de notificação para todos os utilizadores'
            }
        };

        const response = await oneSignalClient.createNotification(notification);
        
        res.status(200).json({
            success: true,
            message: 'Notificação broadcast enviada com sucesso',
            oneSignalResponse: response.body
        });
    } catch (error) {
        console.error('Erro ao enviar notificação broadcast:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao enviar notificação',
            details: error.message
        });
    }
});

// Endpoint para testar notificação para um Player ID específico
router.post('/test-player', async (req, res) => {
    try {
        const { playerId } = req.body;
        
        if (!playerId) {
            return res.status(400).json({
                success: false,
                error: 'Player ID é obrigatório'
            });
        }

        const notification = {
            contents: {
                'pt': 'Lembrete personalizado: Não se esqueça de registar o seu ponto de entrada!',
                'en': 'Personal reminder: Don\'t forget to register your entry point!'
            },
            headings: {
                'pt': 'Registo de Ponto',
                'en': 'Point Registration'
            },
            include_player_ids: [playerId],
            data: {
                type: 'registo_ponto_lembrete',
                playerId: playerId
            }
        };

        const response = await oneSignalClient.createNotification(notification);
        
        res.status(200).json({
            success: true,
            message: `Notificação enviada para Player ID: ${playerId}`,
            oneSignalResponse: response.body
        });
    } catch (error) {
        console.error('Erro ao enviar notificação para player:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao enviar notificação',
            details: error.message
        });
    }
});

// Endpoint para obter informações da app OneSignal
router.get('/app-info', async (req, res) => {
    try {
        // Usar a API REST diretamente para obter info da app
        const axios = require('axios');
        
        const response = await axios.get('https://onesignal.com/api/v1/apps/a9bc6538-62e7-4f65-a1bf-b502d74bd0f9', {
            headers: {
                'Authorization': 'Basic ' + Buffer.from('os_v2_app_vg6gkodc45hwlin7wubnos6q7fsczwr5d7penrvnassg2xbymxtt3wwfo2jxwlei32l73f4zg6mxdmqswtzerotypgqt6wq2lakq73q:').toString('base64'),
                'Content-Type': 'application/json'
            }
        });
        
        res.status(200).json({
            success: true,
            data: {
                appId: response.data.id,
                name: response.data.name,
                players: response.data.players,
                messageable_players: response.data.messageable_players
            }
        });
    } catch (error) {
        console.error('Erro ao obter info da app:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter informações da app',
            details: error.message
        });
    }
});

// Endpoint para criar um player de teste
router.post('/create-test-player', async (req, res) => {
    try {
        const testPlayerData = {
            app_id: 'a9bc6538-62e7-4f65-a1bf-b502d74bd0f9',
            device_type: 5, // Web Push
            identifier: 'test-device-' + Date.now(),
            language: 'pt',
            timezone: 0,
            game_version: '1.0',
            device_model: 'Test Device',
            device_os: 'Web',
            tags: {
                'test_user': 'true',
                'created_at': new Date().toISOString()
            }
        };

        const response = await axios.post('https://onesignal.com/api/v1/players', testPlayerData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        res.status(200).json({
            success: true,
            message: 'Player de teste criado com sucesso',
            playerId: response.data.id,
            data: response.data
        });
    } catch (error) {
        console.error('Erro ao criar player de teste:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar player de teste',
            details: error.response?.data || error.message
        });
    }
});

module.exports = router;
