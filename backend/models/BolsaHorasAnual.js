const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');


const BolsaHorasAnual = sequelize.define('BolsaHorasAnual', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    ano: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Ano a que se refere a bolsa de horas (ex: 2025)'
    },
    horas_iniciais: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Horas que transitam do ano anterior'
    },
    horas_calculadas: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Saldo atual calculado da bolsa de horas'
    },
    total_horas_extras: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Total de horas extras acumuladas'
    },
    total_horas_esperadas: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Total de horas esperadas (contratuais)'
    },
    total_horas_descontadas_fbh: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Total de horas descontadas por faltas FBH'
    },
    dias_trabalhados: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Número de dias trabalhados'
    },
    ultima_atualizacao: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data/hora do último recalculo'
    },
    criado_por: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Utilizador que criou/atualizou o registo'
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'bolsa_horas_anual',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'ano'],
            name: 'unique_user_ano'
        },
        {
            fields: ['ano'],
            name: 'idx_ano'
        }
    ]
});

module.exports = BolsaHorasAnual;
