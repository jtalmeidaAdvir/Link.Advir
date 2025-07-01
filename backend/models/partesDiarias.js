
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./user');
const Obra = require('./obra');

const PartesDiarias = sequelize.define('PartesDiarias', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    categoria: {
        type: DataTypes.ENUM('MaoObra', 'Materiais', 'Equipamentos'),
        allowNull: false,
    },
    quantidade: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    especialidade: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    unidade: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    designacao: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    data: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    horas: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    obra_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Obra,
            key: 'id',
        },
    },
}, {
    timestamps: true,
    tableName: 'partes_diarias',
});

module.exports = PartesDiarias;
