// models/modulo.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Modulo = sequelize.define('Modulo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    descricao: {
        type: DataTypes.STRING,
    },
    createdon: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
}, {
    timestamps: false,
    tableName: 'modulo',
});

module.exports = Modulo;
