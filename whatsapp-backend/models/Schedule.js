const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Schedule = sequelize.define('Schedule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    contact_list: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    frequency: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    days: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    priority: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    last_sent: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    total_sent: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    last_contact_index: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Índice do último contacto enviado para continuar em múltiplas execuções',
    },
    tipo: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'mensagem'
    },
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    horario_inicio: {
        type: DataTypes.STRING(5),
        allowNull: true,
        comment: 'Hora de início do período de verificação contínua (formato HH:MM)'
    },
    horario_fim: {
        type: DataTypes.STRING(5),
        allowNull: true,
        comment: 'Hora de fim do período de verificação contínua (formato HH:MM)'
    },
    intervalo_minutos: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
        comment: 'Intervalo em minutos entre cada verificação durante o período'
    },
    lista_contactos_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID da lista de contactos associada'
    },
    nome_configuracao: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nome da configuração de verificação'
    },
    notificados_hoje: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON com user_ids já notificados hoje para evitar duplicados'
    }
}, {
    tableName: 'schedules',
    timestamps: false
});


module.exports = Schedule;