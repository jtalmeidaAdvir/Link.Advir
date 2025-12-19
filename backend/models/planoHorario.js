
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
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Data de início deste horário para o utilizador (formato: YYYY-MM-DD HH:MM:SS)'
    },
    dataFim: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Data de fim (null = horário atual) (formato: YYYY-MM-DD HH:MM:SS)'
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica se este plano está ativo'
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Observações sobre o plano de horário'
    }
}, {
    timestamps: false,
    tableName: 'plano_horarios',
    indexes: [
        {
            fields: ['user_id', 'ativo']
        }
    ]
});

module.exports = PlanoHorario;
