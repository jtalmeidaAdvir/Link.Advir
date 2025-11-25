const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { getAuthToken } = require('./servives/tokenService');
const listarPedidos = require('./routes/Servicos/listarPedidos');
const routesConcursos = require('./routes/Concursos/routesConcursos');
const routesFaltas = require('./routes/Faltas/routesFaltas');
const listarObras = require('./routes/Obras/listarObras');
const detalhesObra = require('./routes/Obras/detalhesObra');
const parteDiariaJPA = require('./routes/Obras/parteDiariaJPA');
const routePedidos_STP = require('./routes/Servicos/routePedidos_STP');
const listarIntervencoes = require('./routes/Servicos/listarIntervencoes');
const clientArea = require('./routes/ClientArea/clientArea');
const sendEmail = require('./servives/emailServicos');
const sendEmailContactForm = require('./servives/emailcontactos');
const sendmailoficios = require('./routes/Oficios/sendEmailOficios');
const sendEmailExternos = require('./routes/Externos/sendEmailExternos');
const oficio = require('./routes/Oficios/oficios');
 
const app = express();
 
// Ajusta os limites de payload
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
 
// Middleware CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
 
// Debug do tamanho do payload
app.use((req, res, next) => {
    console.log(`Recebendo payload com tamanho: ${req.headers['content-length']} bytes`);
    next();
});
 
// Configuração de sessão
app.use(session({
    secret: 'chave-secreta',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
}));
 
// Rotas
app.post('/sendmailoficios', sendmailoficios);
app.use('/listarPedidos', listarPedidos);
app.use('/routesConcursos', routesConcursos);
app.use('/routesFaltas', routesFaltas);
app.use('/clientArea', clientArea);
app.use('/listarObras', listarObras);
app.use('/detalhesObra', detalhesObra);
app.use('/parteDiariaJPA', parteDiariaJPA);
app.use('/routePedidos_STP', routePedidos_STP);
app.use('/listarIntervencoes', listarIntervencoes);
app.use('/oficio', oficio);
app.post('/send-email', sendEmail);
app.post('/send-email-contact', sendEmailContactForm);
app.post('/send-email-externos', sendEmailExternos);
 
app.post('/connect-database/token', async (req, res) => {
    const { username, password, company, instance, line, urlempresa } = req.body;
 
    console.log('Dados recebidos no req.body:', { username, password, company, instance, line, urlempresa });
 
    if (!username || !password || !company || !instance || !line || !urlempresa) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
 
    try {
        const token = await getAuthToken({ username, password, company, instance, line }, urlempresa);
        console.log('Token obtido:', token);
 
        req.session.credentials = { username, password, company, instance, line };
        req.session.token = token;
 
        res.json({ token });
    } catch (error) {
        console.error('Erro ao obter token:', error.message);
        req.session.destroy((err) => {
            if (err) {
                console.error('Erro ao destruir sessão:', err);
            }
        });
 
        res.status(500).json({ error: 'Erro ao obter token de autenticação' });
    }
});
 
app.listen(3001, () => {
    console.log('Servidor a correr...');
});