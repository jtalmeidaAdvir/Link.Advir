const express = require('express');
const cors = require('cors');
const { sequelize, initializeSequelize, getDatabases } = require('./config/db');
const fileUpload = require('express-fileupload');

// Rotas
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const empresaRoutes = require('./routes/empresaRoutes');
const moduloRoutes = require('./routes/moduloRoutes');
const submoduloRoutes = require('./routes/submoduloRoutes');
const registoPontoRoutes = require('./routes/registoPontoRoutes');
const intervaloRoutes = require('./routes/intervaloRoutes');
const pedidoAlteracaoRoutes = require('./routes/pedidoAlteracaoRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const obraRoutes = require('./routes/obraRoutes');
const equipaObraRoutes = require('./routes/equipaObraRoutes');
const registoPontoObraRoutes = require('./routes/registoPontoObraRoutes');
const faltasFeriasRoutes = require('./routes/faltasFeriasRoutes');
const notificacaoRoutes = require('./routes/notificacaoRoutes');
const parteRoutes = require('./routes/parteDiariaRoutes');
const newsRoutes = require('./routes/newsRoutes');
const anexoPedidoRoutes = require('./routes/anexoPedidoRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const trabalhadoresExternosRoutes = require('./routes/trabalhadoresExternosRoutes');
const mapaRegistosRoutes = require('./routes/mapaRegistosRoutes');
const contactRoutes = require('./routes/contactRoutes');
const posRoutes = require('./routes/posRoutes');
const verificacaoAutomaticaRoutes = require('./routes/verificacaoAutomaticaPontosRoutes');

// Importar associações
require('./associations');

const app = express();

// Middlewares
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Configuração CORS para o frontend
// Configuração CORS para o frontend (produção + desenvolvimento)
const allowedOrigins = [
    'https://link.advir.pt',   // produção
    'http://localhost:19006',  // desenvolvimento (Expo ou React Native Web)
];

app.use(cors({
    origin: function (origin, callback) {
        // Permite requisições sem "origin" (ex: ferramentas internas, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('🚫 Bloqueado por CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true
}));


// Rotas
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/modulos', moduloRoutes);
app.use('/api/submodulos', submoduloRoutes);
app.use('/api/intervalo', intervaloRoutes);
app.use('/api/pedidoAlteracao', pedidoAlteracaoRoutes);
app.use('/api/registoPonto', registoPontoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/obra', obraRoutes);
app.use('/api/equipa-obra', equipaObraRoutes);
app.use('/api/registo-ponto-obra', registoPontoObraRoutes);
app.use('/api/faltas-ferias', faltasFeriasRoutes);
app.use('/api', notificacaoRoutes);
app.use('/api/parte-diaria', parteRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/trabalhadores-externos', trabalhadoresExternosRoutes);
app.use('/api/anexo-pedido', anexoPedidoRoutes);
app.use('/api/mapa-registos', mapaRegistosRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/verificacao-automatica', verificacaoAutomaticaRoutes);

// Rotas biométricas com try/catch
try {
    app.use('/api/auth/biometric', biometricRoutes);
    console.log('✅ Rotas biométricas registadas com sucesso');
} catch (error) {
    console.error('❌ Erro ao registar rotas biométricas:', error);
}

// Endpoint de teste para listar rotas
app.get('/api/routes', (req, res) => {
    const routes = {
        biometric: {
            base: '/api/auth/biometric',
            endpoints: [
                'POST /api/auth/biometric/register-challenge',
                'POST /api/auth/biometric/register',
                'POST /api/auth/biometric/login-challenge',
                'POST /api/auth/biometric/login',
                'POST /api/auth/biometric/check'
            ]
        },
        other: {
            endpoints: [
                'GET /api/routes',
                'POST /api/users/*',
                'POST /api/auth/*',
                'GET /api/empresas/*',
                'GET /api/modulos/*',
                'GET /api/registoPonto/*',
                'GET /api/analytics/*',
                'GET /api/obra/*',
                'GET /api/whatsapp-web/*'
            ]
        }
    };
    res.json({
        message: 'Rotas disponíveis no AdvirLink Backend',
        server: `http://localhost:3010`,
        routes
    });
});

// Endpoint para listar bases de dados
app.get('/databases', async (req, res) => {
    try {
        const databases = await getDatabases();
        res.json(databases);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter as bases de dados', error: error.message });
    }
});

// Endpoint para inicializar tabelas WhatsApp
app.post('/api/init-whatsapp-tables', async (req, res) => {
    try {
        const Contact = require('./models/contact');
        const Schedule = require('./models/schedule');

        await Contact.sync({ force: true });
        await Schedule.sync({ force: true });

        res.json({
            message: 'Tabelas do WhatsApp Web criadas com sucesso',
            tables: ['contacts', 'schedules']
        });
    } catch (error) {
        console.error('Erro ao criar tabelas WhatsApp:', error);
        res.status(500).json({
            message: 'Erro ao criar tabelas do WhatsApp Web',
            error: error.message
        });
    }
});

// Endpoint para verificar/corrigir tabelas WhatsApp
app.post('/api/fix-whatsapp-tables', async (req, res) => {
    try {
        const [tablesResult] = await sequelize.query(`SHOW TABLES LIKE 'contacts'`);
        if (tablesResult.length === 0) {
            const Contact = require('./models/contact');
            await Contact.sync({ force: true });
        }

        const [schedulesResult] = await sequelize.query(`SHOW TABLES LIKE 'schedules'`);
        if (schedulesResult.length === 0) {
            const Schedule = require('./models/schedule');
            await Schedule.sync({ force: true });
        }

        res.json({
            message: 'Estrutura das tabelas WhatsApp verificada e corrigida com sucesso',
            details: { contactsTable: 'OK', schedulesTable: 'OK' }
        });
    } catch (error) {
        console.error('Erro ao corrigir tabelas WhatsApp:', error);
        res.status(500).json({ message: 'Erro ao corrigir estrutura das tabelas', error: error.message });
    }
});

// Função de inicialização do backend
async function startApp() {
    await initializeSequelize();

    try {
        console.log('Iniciando sincronização das tabelas...');
        await sequelize.sync({ force: false });
        console.log('Tabelas sincronizadas com sucesso.');

        try {
            const Contact = require('./models/contact');
            const Schedule = require('./models/schedule');

            await Contact.sync({ force: false });
            await Schedule.sync({ force: false });
            console.log('Tabelas do WhatsApp Web verificadas/criadas.');
        } catch (whatsappErr) {
            console.error('Erro ao criar tabelas WhatsApp:', whatsappErr);
            console.log('Use /api/init-whatsapp-tables para criar manualmente');
        }
    } catch (err) {
        console.error('Erro na sincronização:', err);

        try {
            console.log('Tentando sincronização com alterações...');
            await sequelize.sync({ alter: true });
            console.log('Sincronização com alterações concluída.');
        } catch (alterErr) {
            console.error('Erro na sincronização com alterações:', alterErr);
        }
    }
}

// Iniciar backend
const PORT = process.env.PORT || 3010;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
    console.log(`Acesso disponível em: http://localhost:${PORT}`);
});

startApp();
