
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Importar rotas
const whatsappRoutes = require('./routes/whatsappRoutes');
const intervencaoRoutes = require('./routes/intervencaoRoutes');

// Usar rotas
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/intervencoes', intervencaoRoutes);

// Rota de saúde
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'WhatsApp Backend is running',
        timestamp: new Date().toISOString()
    });
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 WhatsApp Backend running on port ${PORT}`);
    console.log(`📱 WhatsApp Web will be available at http://0.0.0.0:${PORT}`);
});
