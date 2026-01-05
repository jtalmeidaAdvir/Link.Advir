
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const POS = sequelize.define('POS', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    obra_predefinida_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'obra',
            key: 'id',
        },
    },
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'empresas',
            key: 'id',
        },
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true,
    },
    longitude: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    timestamps: true,
    tableName: 'pos',
});

// Definir associações
POS.associate = (models) => {
    POS.belongsTo(models.Obra, {
        foreignKey: 'obra_predefinida_id',
        as: 'ObraPredefinida'
    });
    POS.belongsTo(models.Empresa, {
        foreignKey: 'empresa_id',
        as: 'Empresa'
    });
};

module.exports = POS;
