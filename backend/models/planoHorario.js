
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
    tipoPeriodo: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'permanente',
        comment: 'Tipo de período: dia, mes, ano ou permanente'
    },
    diaEspecifico: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Data específica quando tipoPeriodo = dia (formato: YYYY-MM-DD)'
    },
    mesEspecifico: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Mês específico (1-12) quando tipoPeriodo = mes'
    },
    anoEspecifico: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Ano específico quando tipoPeriodo = ano'
    },
    prioridade: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Prioridade (maior = mais importante). dia=3, mes=2, ano=1, permanente=0'
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
        },
        {
            fields: ['user_id', 'tipoPeriodo', 'ativo']
        },
        {
            fields: ['diaEspecifico']
        }
    ]
});

module.exports = PlanoHorario;
