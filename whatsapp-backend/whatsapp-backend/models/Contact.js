
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Contact = sequelize.define('Contact', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    contacts: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    can_create_tickets: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    can_register_ponto: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    numero_tecnico: {
        type: DataTypes.STRING,
        allowNull: true
    },
    numero_cliente: {
        type: DataTypes.STRING,
        allowNull: true
    },
    obrasAutorizadas: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    dataInicioAutorizacao: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    dataFimAutorizacao: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' }
    }
}, {
    tableName: 'contacts',
    timestamps: false
});

module.exports = Contact;
