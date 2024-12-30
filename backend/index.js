const express = require('express');
const cors = require('cors');
const { sequelize, initializeSequelize } = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const moduloRoutes = require('./routes/moduloRoutes');
const empresaRoutes = require('./routes/empresaRoutes');
const registoPontoRoutes = require('./routes/registoPontoRoutes');
const intervaloRoutes = require('./routes/intervaloRoutes');
const submoduloRoutes = require('./routes/submoduloRoutes');
const pedidoAlteracaoRoutes = require('./routes/pedidoAlteracaoRoutes');

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
  await sequelize.sync({ force: false }) // Sincroniza sem perder dados
    .then(() => {
      console.log('Tabelas sincronizadas com sucesso.');
    })
    .catch((err) => {
      console.error('Erro ao sincronizar as tabelas:', err);
    });
}

// Definir rotas
app.use('/api/users', userRoutes);
app.use('/api/modulos', moduloRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/registoPonto', registoPontoRoutes);
app.use('/api/intervalo', intervaloRoutes);
app.use('/api/submodulos', submoduloRoutes);
app.use('/api/pedidoAlteracao', pedidoAlteracaoRoutes);

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
