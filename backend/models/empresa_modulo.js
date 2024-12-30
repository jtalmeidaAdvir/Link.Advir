const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Empresa_Modulo = sequelize.define('empresa_modulo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'empresa',
            key: 'id',
        },
    },
    modulo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'modulo',
            key: 'id',
        },
    },
}, {
    timestamps: false,
    tableName: 'empresa_modulo',
});

module.exports = Empresa_Modulo;
