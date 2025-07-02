const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Modulo = require('./modulo');
const Submodulo = require('../models/submodulo');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        //unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    profileImage: {
        type: DataTypes.BLOB('long'), // Armazena a imagem diretamente como binário
        allowNull: true,
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    superAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    empresaPredefinida: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    verificationToken: {
        type: DataTypes.STRING,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isFirstLogin: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    createdon: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    recoveryToken: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    recoveryTokenExpiry: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    empresa_areacliente: {
        type: DataTypes.STRING, // Corrigido para DataTypes.STRING
        allowNull: false, // Ou true se opcional
    },
    id_tecnico: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tipoUser: {
        type: DataTypes.ENUM('Trabalhador', 'Diretor', 'Encarregado'),
        allowNull: false,
        defaultValue: 'Trabalhador'
    }

}, {
    timestamps: false,
    tableName: 'user',
    indexes: [
        {
            unique: true,
            fields: ['username'],
        }
    ]
});

module.exports = User;