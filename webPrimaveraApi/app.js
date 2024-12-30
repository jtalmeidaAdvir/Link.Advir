const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { getAuthToken } = require('./servives/tokenService');
const listarPedidos = require('./routes/Servicos/listarPedidos');
const listarObras = require('./routes/Obras/listarObras');
const detalhesObra = require('./routes/Obras/detalhesObra');
const routePedidos_STP = require('./routes/Servicos/routePedidos_STP');
const listarIntervencoes = require('./routes/Servicos/listarIntervencoes');
const clientArea = require('./routes/ClientArea/clientArea')
const sendEmail = require('./servives/emailServicos');

const app = express();
app.use(express.json());



app.use(cors({
    origin: '*', // permite o acesso de qualquer origem
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // ou outros métodos necessários

}));
  

// Configuração de sessão
app.use(session({
    secret: 'chave-secreta',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Para produção, usa secure: true com HTTPS
}));


app.use('/listarPedidos', listarPedidos);
app.use('/clientArea', clientArea);
app.use('/listarObras', listarObras);
app.use('/detalhesObra', detalhesObra);
app.use('/routePedidos_STP', routePedidos_STP);
app.use('/listarIntervencoes', listarIntervencoes);
app.post('/send-email', sendEmail);  // Ensure it's a POST route

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
