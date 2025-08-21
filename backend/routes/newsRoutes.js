
const express = require('express');
const router = express.Router();
const newsCrawlerService = require('../services/newsCrawlerService');
const authMiddleware = require('../middleware/authMiddleware');

// Rota para obter notícias relevantes
router.get('/noticias', authMiddleware, async (req, res) => {
    try {
        const news = await newsCrawlerService.getCachedNews();
        res.json({
            success: true,
            data: news,
            count: news.length
        });
    } catch (error) {
        console.error('Erro ao obter notícias:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Rota para forçar atualização das notícias
router.post('/noticias/refresh', authMiddleware, async (req, res) => {
    try {
        // Limpar cache
        newsCrawlerService.cache = {};
        
        const news = await newsCrawlerService.crawlNews();
        res.json({
            success: true,
            data: news,
            count: news.length,
            message: 'Notícias atualizadas com sucesso'
        });
    } catch (error) {
        console.error('Erro ao atualizar notícias:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar notícias',
            error: error.message
        });
    }
});

module.exports = router;
