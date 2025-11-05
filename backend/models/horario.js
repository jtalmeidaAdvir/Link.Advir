
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Horario = sequelize.define('Horario', {
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
            key: 'id'
        }
    },
    descricao: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nome do horário (ex: Horário 40h, Turno Noite)'
    },
    horasPorDia: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 8.00,
        comment: 'Horas de trabalho por dia'
    },
    horasSemanais: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 40.00,
        comment: 'Total de horas semanais'
    },
    diasSemana: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Array com dias da semana trabalhados [1,2,3,4,5] = Seg-Sex',
        get() {
            const rawValue = this.getDataValue('diasSemana');
            if (!rawValue) return null;
            try {
                return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
            } catch (e) {
                return rawValue;
            }
        },
        set(value) {
            if (value === null || value === undefined) {
                this.setDataValue('diasSemana', null);
            } else if (typeof value === 'string') {
                this.setDataValue('diasSemana', value);
            } else {
                this.setDataValue('diasSemana', JSON.stringify(value));
            }
        }
    },
    horaEntrada: {
        type: DataTypes.STRING(5),
        allowNull: true,
        comment: 'Hora padrão de entrada (ex: 09:00)',
        validate: {
            is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        }
    },
    horaSaida: {
        type: DataTypes.STRING(5),
        allowNull: true,
        comment: 'Hora padrão de saída (ex: 18:00)',
        validate: {
            is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        }
    },
    intervaloAlmoco: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 1.00,
        comment: 'Duração do intervalo de almoço em horas'
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Indica se o horário está ativo'
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
    }
}, {
    timestamps: true,
    tableName: 'horarios',
});

module.exports = Horario;
