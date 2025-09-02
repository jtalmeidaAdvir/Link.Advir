
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Obra = sequelize.define('Obra', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    estado: {
        type: DataTypes.ENUM('Ativo', 'Inativo', 'Concluido', 'Suspenso'),
        allowNull: false,
        defaultValue: 'Ativo',
    },
    localizacao: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    qrCode: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'empresas',
            key: 'id',
        },
    },
}, {
    timestamps: true,
    tableName: 'obra',
});

module.exports = Obra;
