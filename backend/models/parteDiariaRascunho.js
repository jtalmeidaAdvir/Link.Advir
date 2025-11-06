
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ParteDiariaRascunho = sequelize.define('ParteDiariaRascunho', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    mes: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    ano: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    dadosProcessados: {
        type: DataTypes.JSON,
        allowNull: true
    },
    linhasExternos: {
        type: DataTypes.JSON,
        allowNull: true
    },
    linhasPessoalEquip: {
        type: DataTypes.JSON,
        allowNull: true
    },
    diasEditadosManualmente: {
        type: DataTypes.JSON,
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'partes_diarias_rascunhos',
    timestamps: true
});

module.exports = ParteDiariaRascunho;
