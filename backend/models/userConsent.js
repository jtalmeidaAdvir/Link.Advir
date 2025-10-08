
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserConsent = sequelize.define('UserConsent', {
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
    consent_type: {
        type: DataTypes.ENUM(
            'biometric_facial',
            'biometric_fingerprint', 
            'gps_tracking',
            'data_processing',
            'marketing',
            'third_party_sharing'
        ),
        allowNull: false,
    },
    consent_given: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    consent_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    consent_method: {
        type: DataTypes.STRING, // 'web', 'mobile', 'email', etc.
        allowNull: true,
    },
    ip_address: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    consent_text: {
        type: DataTypes.TEXT,
        allowNull: true, // Texto exato do consentimento dado
    },
    withdrawal_date: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    }
}, {
    timestamps: true,
    tableName: 'user_consents',
});

module.exports = UserConsent;
