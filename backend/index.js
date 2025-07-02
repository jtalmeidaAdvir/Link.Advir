const express = require('express');
const cors = require('cors');
const { Empresa, Obra, Modulo, Submodulo, RegistoPonto, Intervalo, PedidoAlteracao, EquipaObra, PartesDiarias } = require('./models'); // Sem User

const { sequelize, initializeSequelize } = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const empresaRoutes = require('./routes/empresaRoutes');
const moduloRoutes = require('./routes/moduloRoutes');
const submoduloRoutes = require('./routes/submoduloRoutes');
const registoPontoRoutes = require('./routes/registoPontoRoutes');
const intervaloRoutes = require('./routes/intervaloRoutes');
const pedidoAlteracaoRoutes = require('./routes/pedidoAlteracaoRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const obraRoutes = require('./routes/obraRoutes');
const equipaObraRoutes = require('./routes/equipaObraRoutes');
const partesDiariasRoutes = require('./routes/partesDiariasRoutes');

const fileUpload = require('express-fileupload');
const { getDatabases } = require('./config/db');


// Importar associações
require('./associations');  // Importa o ficheiro onde as associações estão definidas



const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

async function startApp() {
    await initializeSequelize();

    try {
        await Obra.sync({ alter: true });

        // ❌ User não é sincronizado, evitando o erro com DEFAULT e UNIQUE
        console.log('Modelos sincronizados com sucesso (User excluído).');
    } catch (err) {
        console.error('Erro ao sincronizar os modelos:', err);
    }
}

// Rotas
app.use('/api/users', userRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/modulos', moduloRoutes);
app.use('/api/submodulos', submoduloRoutes);
app.use('/api/intervalo', intervaloRoutes);
app.use('/api/pedidoAlteracao', pedidoAlteracaoRoutes);
app.use('/api/registoPonto', registoPontoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/obra', obraRoutes);
app.use('/api/equipa-obra', equipaObraRoutes);
app.use('/api/partes-diarias', partesDiariasRoutes);

app.use(fileUpload());


app.get('/databases', async (req, res) => {
    try {
        const databases = await getDatabases();
        res.json(databases);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter as bases de dados' });
    }
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
});

startApp();