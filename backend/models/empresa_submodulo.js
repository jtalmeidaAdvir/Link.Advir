
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Empresa_Submodulo = sequelize.define('empresa_submodulo', {
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
    submodulo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'submodulo',
            key: 'id',
        },
    },
}, {
    timestamps: false,
    tableName: 'empresa_submodulo',
});

module.exports = Empresa_Submodulo;
