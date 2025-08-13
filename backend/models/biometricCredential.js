const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const BiometricCredential = sequelize.define(
    "BiometricCredential",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "user",
                key: "id",
            },
            onDelete: "CASCADE",
        },
        credentialId: {
            type: DataTypes.STRING(500),
            allowNull: false,
            unique: true,
        },
        publicKey: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        counter: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
        },
    },
    {
        tableName: "biometric_credentials",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['credentialId']
            },
            {
                fields: ['userId']
            }
        ]
    },
);

module.exports = BiometricCredential;