// models/user_submodulo.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./user');
const Submodulo = require('./submodulo');

const User_Submodulo = sequelize.define('User_Submodulo', {
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    submodulo_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Submodulo,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'empresa',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
}, {
    timestamps: true,
    tableName: 'user_submodulo',
});




module.exports = User_Submodulo;
