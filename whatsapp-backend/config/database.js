
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'Advir',
    process.env.DB_USERNAME || 'sa',
    process.env.DB_PASSWORD || '1234',
    {
        host: process.env.DB_HOST || '0.0.0.0',
        port: process.env.DB_PORT || 1433,
        dialect: 'mssql',
        logging: false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        dialectOptions: {
            options: {
                encrypt: false,
                trustServerCertificate: true
            }
        }
    }
);

module.exports = { sequelize };
