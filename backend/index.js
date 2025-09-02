const express = require('express');
const cors = require('cors');
const { sequelize, initializeSequelize } = require('./config/db');
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
const whatsappWebRoutes = require('./routes/whatsappWebRoutes');
const whatsappIntervencoes = require('./routes/whatsappIntervencoes');
const newsRoutes = require('./routes/newsRoutes');
const anexoPedidoRoutes = require('./routes/anexoPedidoRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const trabalhadoresExternosRoutes = require('./routes/trabalhadoresExternosRoutes');
const mapaRegistosRoutes = require('./routes/mapaRegistosRoutes');
const contactRoutes = require('./routes/contactRoutes');
const posRoutes = require('./routes/posRoutes');


const fileUpload = require('express-fileupload');
const { getDatabases } = require('./config/db');


// Importar associações
require('./associations');  // Importa o ficheiro onde as associações estão definidas



const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use('/api/anexo-pedido', anexoPedidoRoutes);

app.use(fileUpload());

async function startApp() {
    await initializeSequelize();

    try {
        console.log('Iniciando sincronização das tabelas...');

        // Primeiro, tentar criar tabelas que não existem
        await sequelize.sync({ force: false });
        console.log('Tabelas sincronizadas com sucesso.');

        // Tentar criar especificamente as tabelas do WhatsApp Web
        try {
            const Contact = require('./models/contact');
            const Schedule = require('./models/schedule');

            await Contact.sync({ force: false });
            await Schedule.sync({ force: false });
            console.log('Tabelas do WhatsApp Web verificadas/criadas.');

            // Verificar se o campo can_create_tickets existe na tabela contacts
            try {
                const [results] = await sequelize.query(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'contacts' 
                    AND COLUMN_NAME = 'can_create_tickets'
                    AND TABLE_SCHEMA = DATABASE()
                `);

                if (results.length === 0) {
                    console.log('Campo can_create_tickets não encontrado. Adicionando...');
                    await sequelize.query(`
                        ALTER TABLE contacts 
                        ADD COLUMN can_create_tickets BOOLEAN DEFAULT FALSE NOT NULL
                    `);
                    console.log('Campo can_create_tickets adicionado com sucesso à tabela contacts.');
                } else {
                    console.log('Campo can_create_tickets já existe na tabela contacts.');
                }
            } catch (columnErr) {
                console.error('Erro ao verificar/criar campo can_create_tickets:', columnErr);

                // Tentar com sintaxe alternativa se a primeira falhar
                try {
                    console.log('Tentando sintaxe alternativa para adicionar a coluna...');
                    await sequelize.query(`
                        ALTER TABLE contacts 
                        ADD COLUMN can_create_tickets TINYINT(1) DEFAULT 0 NOT NULL
                    `);
                    console.log('Campo can_create_tickets adicionado com sucesso (sintaxe alternativa).');
                } catch (altErr) {
                    console.error('Erro com sintaxe alternativa também:', altErr);
                }
            }

        } catch (whatsappErr) {
            console.error('Erro ao criar tabelas WhatsApp:', whatsappErr);
            console.log('Use o endpoint /api/init-whatsapp-tables para criar manualmente');
        }

    } catch (err) {
        console.error('Erro na sincronização:', err);

        try {
            console.log('Tentando sincronização com alterações...');
            // Fallback: tentar com alter para tabelas existentes
            await sequelize.sync({ alter: true });
            console.log('Sincronização com alterações concluída.');

        } catch (alterErr) {
            console.error('Erro na sincronização com alterações:', alterErr);
            console.log('A aplicação continuará mesmo com erros de sincronização...');
        }
    }
}

// Rotas
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
//
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
app.use('/api/whatsapp-web', whatsappWebRoutes);
app.use('/api/whatsapp-intervencoes', whatsappIntervencoes);
app.use('/api/news', newsRoutes);

app.use('/api/trabalhadores-externos', trabalhadoresExternosRoutes);

// Verificar se biometricRoutes está a ser carregado corretamente
try {
    app.use('/api/auth/biometric', biometricRoutes);
    console.log('✅ Rotas biométricas registadas com sucesso');
} catch (error) {
    console.error('❌ Erro ao registar rotas biométricas:', error);
}

// Endpoint de teste para listar todas as rotas disponíveis
app.get('/api/routes', (req, res) => {
    const routes = {
        biometric: {
            base: '/api/auth/biometric',
            endpoints: [
                'POST /api/auth/biometric/register-challenge - Gerar challenge para registo biométrico',
                'POST /api/auth/biometric/register - Registar credencial biométrica',
                'POST /api/auth/biometric/login-challenge - Gerar challenge para login biométrico',
                'POST /api/auth/biometric/login - Autenticar com biometria',
                'POST /api/auth/biometric/check - Verificar se utilizador tem biometria registada'
            ]
        },
        other: {
            endpoints: [
                'GET /api/routes - Listar todas as rotas disponíveis',
                'POST /api/users/* - Rotas de utilizadores',
                'POST /api/auth/* - Rotas de autenticação',
                'GET /api/empresas/* - Rotas de empresas',
                'GET /api/modulos/* - Rotas de módulos',
                'GET /api/registoPonto/* - Rotas de registo de ponto',
                'GET /api/analytics/* - Rotas de analytics',
                'GET /api/obra/* - Rotas de obras',
                'GET /api/whatsapp-web/* - Rotas WhatsApp Web'
            ]
        }
    };

    res.json({
        message: 'Rotas disponíveis no AdvirLink Backend',
        server: `http://localhost:3000`,
        routes: routes
    });
});



app.get('/databases', async (req, res) => {
    try {
        const databases = await getDatabases();
        res.json(databases);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter as bases de dados' });
    }
});

// Endpoint para inicializar tabelas do WhatsApp Web
app.post('/api/init-whatsapp-tables', async (req, res) => {
    try {
        const Contact = require('./models/contact');
        const Schedule = require('./models/schedule');

        console.log('Criando tabelas do WhatsApp Web...');

        // Forçar criação das tabelas
        await Contact.sync({ force: true });
        console.log('Tabela contacts criada com sucesso');

        await Schedule.sync({ force: true });
        console.log('Tabela schedules criada com sucesso');

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

// Endpoint para verificar e corrigir estrutura das tabelas WhatsApp
app.post('/api/fix-whatsapp-tables', async (req, res) => {
    try {
        console.log('Verificando e corrigindo estrutura das tabelas WhatsApp...');

        // Verificar se a tabela contacts existe
        const [tablesResult] = await sequelize.query(`
            SHOW TABLES LIKE 'contacts'
        `);

        if (tablesResult.length === 0) {
            console.log('Tabela contacts não existe. Criando...');
            const Contact = require('./models/contact');
            await Contact.sync({ force: true });
            console.log('Tabela contacts criada com sucesso');
        } else {
            // Verificar se a coluna can_create_tickets existe
            const [columnsResult] = await sequelize.query(`
                SHOW COLUMNS FROM contacts LIKE 'can_create_tickets'
            `);

            if (columnsResult.length === 0) {
                console.log('Coluna can_create_tickets não encontrada. Adicionando...');
                await sequelize.query(`
                    ALTER TABLE contacts 
                    ADD COLUMN can_create_tickets BOOLEAN DEFAULT FALSE NOT NULL
                `);
                console.log('Coluna can_create_tickets adicionada com sucesso');
            } else {
                console.log('Coluna can_create_tickets já existe');
            }
        }

        // Verificar tabela schedules
        const [schedulesResult] = await sequelize.query(`
            SHOW TABLES LIKE 'schedules'
        `);

        if (schedulesResult.length === 0) {
            console.log('Tabela schedules não existe. Criando...');
            const Schedule = require('./models/schedule');
            await Schedule.sync({ force: true });
            console.log('Tabela schedules criada com sucesso');
        }

        res.json({
            message: 'Estrutura das tabelas WhatsApp verificada e corrigida com sucesso',
            details: {
                contactsTable: 'OK',
                schedulesTable: 'OK',
                canCreateTicketsColumn: 'OK'
            }
        });

    } catch (error) {
        console.error('Erro ao corrigir tabelas WhatsApp:', error);
        res.status(500).json({
            message: 'Erro ao corrigir estrutura das tabelas',
            error: error.message
        });
    }
});




app.use('/api/mapa-registos', mapaRegistosRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/pos', posRoutes);
app.use('/api', newsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
    console.log(`Acesso disponível em: http://localhost:${PORT}`);
    console.log('\n--- Rotas Biométricas Disponíveis ---');
    console.log('POST /api/auth/biometric/register-challenge - Gerar challenge para registo');
    console.log('POST /api/auth/biometric/register - Registar credencial biométrica');
    console.log('POST /api/auth/biometric/login-challenge - Gerar challenge para login');
    console.log('POST /api/auth/biometric/login - Autenticar com biometria');
    console.log('POST /api/auth/biometric/check - Verificar se utilizador tem biometria');
    console.log('-----------------------------------\n');
});

startApp();