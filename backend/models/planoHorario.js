
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PlanoHorario = sequelize.define('PlanoHorario', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'user',
            key: 'id'
        }
    },
    horario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'horarios',
            key: 'id'
        }
    },
    dataInicio: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Data de início deste horário para o utilizador'
    },
    dataFim: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data de fim (null = horário atual)'
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Indica se este plano está ativo'
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
}, {
    timestamps: true,
    tableName: 'plano_horarios',
    indexes: [
        {
            fields: ['user_id', 'ativo']
        }
    ]
});

module.exports = PlanoHorario;
