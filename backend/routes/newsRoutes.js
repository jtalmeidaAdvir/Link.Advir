
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


router.get('/news/img', /* opcional: authMiddleware, */ async (req, res) => {
  const u = req.query.u;
  if (!u) return res.status(400).send('Parâmetro "u" em falta');
  try {
    const r = await axios.get(u, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'image/*,*/*;q=0.8',
        // alguns CDNs exigem referer do próprio domínio
        'Referer': new URL(u).origin
      },
      timeout: 15000
    });
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', r.headers['content-type'] || 'image/jpeg');
    r.data.pipe(res);
  } catch (e) {
    res.status(502).send('Falha ao obter imagem');
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
