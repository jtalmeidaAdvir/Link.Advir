
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DataProcessingLog = sequelize.define('DataProcessingLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    action_type: {
        type: DataTypes.ENUM(
            'data_access',
            'data_export',
            'data_modification',
            'data_deletion',
            'consent_given',
            'consent_withdrawn',
            'biometric_capture',
            'gps_tracking'
        ),
        allowNull: false,
    },
    data_category: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    action_description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ip_address: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    user_agent: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    performed_by: {
        type: DataTypes.INTEGER, // ID do utilizador que executou (pode ser diferente do user_id)
        allowNull: true,
    },
    legal_basis: {
        type: DataTypes.STRING, // Art. 6(1) RGPD basis
        allowNull: true,
    }
}, {
    timestamps: true,
    tableName: 'data_processing_logs',
});

module.exports = DataProcessingLog;
