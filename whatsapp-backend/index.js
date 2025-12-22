
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 7001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Importar rotas
const whatsappRoutes = require("./routes/whatsappRoutes");
const { router: intervencaoRoutes } = require("./routes/whatsappIntervencoes");
const { router: relatoriosRoutes } = require("./routes/relatoriosRoutes");
const verificacaoPontoRoutes = require('./routes/verificacaoPontoRoutes');

// Configurar o WhatsApp service no app para acesso em outras rotas
const { whatsappService } = require("./routes/whatsappRoutes");
app.set("whatsappService", whatsappService);

// Registar rotas na ordem correta
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/whatsapp", relatoriosRoutes);
app.use("/api/whatsapp/verificacao-ponto", verificacaoPontoRoutes);
app.use("/api/intervencoes", intervencaoRoutes);
app.use("/api/configuracao-automatica", require("./routes/configuracaoAutomaticaRoutes"));
app.use("/api/relatorio-pontos", require("./routes/relatorioPontosRoutes"));

// Rota de saúde
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "WhatsApp Backend is running",
        timestamp: new Date().toISOString(),
    });
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error("Erro:", err);
    res.status(500).json({
        error: "Erro interno do servidor",
        message: err.message,
    });
});

// Middleware para log de todas as requisições
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});

// Iniciar servidor
const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 WhatsApp Backend running on port ${PORT}`);
    console.log(`📱 WhatsApp Web available at http://0.0.0.0:${PORT}`);
    console.log(`✅ Rotas registadas:`);

    // Listar todas as rotas registadas
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    const path = middleware.regexp.toString()
                        .replace('\\/?', '')
                        .replace(/\\\//g, '/')
                        .replace(/\^|\$/g, '')
                        .replace(/\?\(\?=\\\/\|\$\)/g, '');
                    routes.push({
                        path: path + handler.route.path,
                        methods: Object.keys(handler.route.methods)
                    });
                }
            });
        }
    });

    routes.forEach(route => {
        console.log(`   ${route.methods.join(', ').toUpperCase()} ${route.path}`);
    });

    // Iniciar scheduler de relatórios de pontos
    console.log('');
    console.log('📊 Iniciando scheduler de relatórios de pontos...');
    const relatoriosPontosScheduler = require('./services/relatorioPontosScheduler');
    relatoriosPontosScheduler.start();

    // Iniciar scheduler de verificação de ponto
    console.log('');
    console.log('⚠️ Iniciando scheduler de verificação de ponto...');
    const verificacaoPontoScheduler = require('./services/verificacaoPontoScheduler');
    verificacaoPontoScheduler.start(whatsappService);
    console.log('✅ Scheduler de verificação de ponto iniciado - executa continuamente durante períodos configurados');
});

// Tratamento de erros de porta ocupada
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${PORT} já está em uso!`);
        process.exit(1);
    } else {
        console.error('❌ Erro ao iniciar servidor:', error);
    }
});
