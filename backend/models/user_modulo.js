const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./user');
const Modulo = require('./modulo');

const User_Modulo = sequelize.define('User_Modulo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'CASCADE', // Se o user for eliminado, elimina também a relação
    },
    modulo_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Modulo,
            key: 'id',
        },
        onDelete: 'CASCADE', // Se o modulo for eliminado, elimina também a relação
    },
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'empresa',
            key: 'id',
        },
        onDelete: 'CASCADE', // Se a empresa for eliminada, elimina também a relação
    }
}, {
    timestamps: false,
    tableName: 'user_modulo',
});


module.exports = User_Modulo;
