
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./user');
const Obra = require('./obra');

const EquipaObra = sequelize.define('EquipaObra', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    encarregado_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: User,
            key: 'id',
        },
    },
    trabalhador_externo_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    tipo_membro: {
        type: DataTypes.ENUM('interno', 'externo'),
        allowNull: false,
        defaultValue: 'interno',
    },
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    timestamps: true,
    tableName: 'equipa_obra',
});


module.exports = EquipaObra;
