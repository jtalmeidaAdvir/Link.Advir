// empresa.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Empresa = sequelize.define('Empresa', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    empresa: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    urlempresa: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    linha: {
        type: DataTypes.STRING,
    },
    createdon: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    maxUsers: {
        type: DataTypes.INTEGER,
        defaultValue: 10,  // Define o valor padrão do número máximo de utilizadores
    }
}, {
    timestamps: false,
    tableName: 'empresa',
    indexes: [
        {
            unique: true,
            fields: ['username', 'empresa']
        }
    ]
});

module.exports = Empresa;
