
const sequelize = require('../config/database');
const Contact = require('../models/Contact');
const Schedule = require('../models/Schedule');

async function initDatabase() {
    try {
        console.log('🔄 Conectando à base de dados...');
        await sequelize.authenticate();
        console.log('✅ Conexão à base de dados estabelecida com sucesso.');

        console.log('🔄 Sincronizando modelos...');
        await Contact.sync({ force: false });
        await Schedule.sync({ force: false });
        console.log('✅ Modelos sincronizados com sucesso.');

        console.log('🎉 Base de dados inicializada com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao inicializar base de dados:', error);
        process.exit(1);
    }
}

initDatabase();
