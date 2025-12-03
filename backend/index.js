// --- Polyfills para Node 16 (Undici / Cheerio) ---
if (typeof ReadableStream === 'undefined') {
    global.ReadableStream = require('stream/web').ReadableStream;
}
if (typeof TransformStream === 'undefined') {
    global.TransformStream = require('stream/web').TransformStream;
}
if (typeof Blob === 'undefined') {
    global.Blob = require('buffer').Blob;
}
if (typeof File === 'undefined') {
    global.File = class File extends Blob {
        constructor(chunks, filename, options = {}) {
            super(chunks, options);
            this.name = filename;
            this.lastModified = options.lastModified || Date.now();
        }
    };
}
if (typeof fetch === 'undefined') {
    global.fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
}
if (typeof DOMException === 'undefined') {
    global.DOMException = class DOMException extends Error {
        constructor(message, name = 'DOMException') {
            super(message);
            this.name = name;
        }
    };
}



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
const comunicadoRoutes = require('./routes/comunicadoRoutes');
const parteDiariaRoutes = require('./routes/parteDiariaRoutes');
const parteDiariaRascunhoRoutes = require('./routes/parteDiariaRascunhoRoutes');
const parteDiariaJPARoutes = require('./routes/parteDiariaJPARoutes');
const newsRoutes = require('./routes/newsRoutes');
const anexoPedidoRoutes = require('./routes/anexoPedidoRoutes');
const anexoFaltaRoutes = require('./routes/anexoFaltaRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const trabalhadoresExternosRoutes = require('./routes/trabalhadoresExternosRoutes');
const mapaRegistosRoutes = require('./routes/mapaRegistosRoutes');
const contactRoutes = require('./routes/contactRoutes');
const posRoutes = require('./routes/posRoutes');
const verificacaoAutomaticaRoutes = require('./routes/verificacaoAutomaticaPontosRoutes');
const gdprRoutes = require('./routes/gdprRoutes');
const visitanteRoutes = require('./routes/visitanteRoutes');
const externosJPARoutes = require('./routes/externosJPARoutes');
const configuracaoRoutes = require('./routes/configuracaoRoutes');
const predicaoObraRoutes = require('./routes/predicaoObraRoutes');
const horarioRoutes = require('./routes/horarioRoutes');
const dividirHorasObraRoutes = require('./routes/dividirHorasObraRoutes');
const verificarRegistoPontoRoutes = require('./routes/verificarRegistoPontoRoutes')


// Importar associações
require('./associations');

const app = express();

// Middlewares
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
//app.use(fileUpload());

// Configuração CORS para o frontend (produção + desenvolvimento)
const REPLIT_DOMAIN = process.env.REPLIT_DEV_DOMAIN || 'ba8aed94-d238-4c85-ab08-af124aedc800-00-1zbkxl1goyz9l.spock.replit.dev';
const allowedOrigins = [
    'https://link.advir.pt',
    'http://localhost:19006',
    'http://0.0.0.0:19006',
    'http://localhost:5000',
    'http://0.0.0.0:5000',
    `https://${REPLIT_DOMAIN}`,
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || origin.includes('replit.dev')) {
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
app.use('/api', comunicadoRoutes);
app.use('/api/parte-diaria', parteDiariaRoutes);
app.use('/api/parte-diaria-rascunho', parteDiariaRascunhoRoutes);
app.use('/api/parte-diaria-jpa', parteDiariaJPARoutes);
app.use('/api/news', newsRoutes);
app.use('/api/trabalhadores-externos', trabalhadoresExternosRoutes);
app.use('/api/anexo-pedido', anexoPedidoRoutes);
app.use('/api/anexo-falta', anexoFaltaRoutes);
app.use('/api/mapa-registos', mapaRegistosRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/verificacao-automatica', verificacaoAutomaticaRoutes);
app.use('/api/visitantes', visitanteRoutes);
app.use('/api/externos-jpa', externosJPARoutes);
app.use('/api/configuracoes', configuracaoRoutes);
app.use('/api/predicao-obra', predicaoObraRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/dividir-horas-obra', dividirHorasObraRoutes);
app.use('/api/registo-ponto-obra', verificarRegistoPontoRoutes);
app.use('/api/gdpr', gdprRoutes);




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
        server: `https://backend.advir.pt`,
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
    console.log(`Acesso disponível em: http://localhost:${PORT}`);
});

startApp();