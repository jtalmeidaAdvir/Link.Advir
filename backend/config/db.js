const { Sequelize } = require('sequelize');
const sql = require('mssql');
require('dotenv').config(); // Carrega o dotenv para usar as variáveis de ambiente

// Detalhes da conexão através das variáveis de ambiente
const dbName = process.env.DB_NAME;
const dbUsername = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbPort = parseInt(process.env.DB_PORT, 10) || 1433; // Converte para número

// Função para verificar se a base de dados existe
async function checkDatabaseExists() {
    try {
        const pool = await sql.connect({
            user: dbUsername,
            password: dbPassword,
            server: dbHost,
            port: dbPort,  // Certifica-te de que a porta é um número
            options: {
                encrypt: false,
                trustServerCertificate: true,
            }
        });

        // Verifica se a base de dados existe
        const result = await pool.request().query(`SELECT name FROM sys.databases WHERE name = '${dbName}'`);
        await pool.close();
        
        return result.recordset.length > 0; // Retorna true se a base de dados existir
    } catch (error) {
        console.error('Erro ao verificar se a base de dados existe:', error);
        throw error;
    }
}

// Função para criar a base de dados se não existir
async function createDatabase() {
    try {
        const pool = await sql.connect({
            user: dbUsername,
            password: dbPassword,
            server: dbHost,
            port: dbPort,  // Certifica-te de que a porta é um número
            options: {
                encrypt: false,
                trustServerCertificate: true,
            }
        });

        // Cria a base de dados
        await pool.request().query(`CREATE DATABASE ${dbName}`);
        console.log(`Base de dados '${dbName}' criada com sucesso!`);
        await pool.close();
    } catch (error) {
        console.error('Erro ao criar a base de dados:', error);
        throw error;
    }
}

// Função para verificar e criar a base de dados, se necessário
async function createDatabaseIfNotExists() {
    const exists = await checkDatabaseExists();
    if (!exists) {
        console.log(`Base de dados '${dbName}' não existe. A criar...`);
        await createDatabase();
    } else {
        console.log(`Base de dados '${dbName}' já existe. Nenhuma ação necessária.`);
    }
}

// Função para obter as bases de dados que começam com 'PRI'
async function getDatabases() {
    try {
        const pool = await sql.connect({
            user: dbUsername,
            password: dbPassword,
            server: dbHost,
            port: dbPort,
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
        });

        // Executa o comando SQL para obter as bases de dados
        const result = await pool.request().query(`
            SELECT SUBSTRING(name, 4, LEN(name)-3) AS name 
            FROM sys.databases
            WHERE name LIKE 'PRI%'
            `);

        await pool.close();
        return result.recordset.map(db => db.name); // Retorna apenas os nomes das bases de dados
    } catch (error) {
        console.error('Erro ao obter as bases de dados:', error);
        throw error;
    }
}

// Inicializar Sequelize diretamente
const sequelize = new Sequelize(dbName, dbUsername, dbPassword, {
    host: dbHost,
    dialect: 'mssql',
    port: dbPort,  // Certifica-te de que a porta é um número
    logging: false,  // Desabilitado para reduzir spam no console
});

// Verifica e cria a base de dados antes de usar o Sequelize
async function initializeSequelize() {
    await createDatabaseIfNotExists();
    try {
        await sequelize.authenticate();
        console.log('Conexão ao Sequelize bem-sucedida!');
    } catch (error) {
        console.error('Erro ao conectar ao Sequelize:', error);
    }
}

module.exports = { sequelize, initializeSequelize, getDatabases };
