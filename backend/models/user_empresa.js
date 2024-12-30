const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User_Empresa = sequelize.define('user_empresa', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
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
    timestamps: false,
    tableName: 'user_empresa',
});

module.exports = User_Empresa;
