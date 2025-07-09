
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./user');
const Obra = require('./obra');

const EquipaObra = sequelize.define('EquipaObra', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    encarregado_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
}, {
    timestamps: true,
    tableName: 'equipa_obra',
});

// 👇 Aqui defines os relacionamentos explicitamente
EquipaObra.belongsTo(User, { foreignKey: 'user_id', as: 'membro' });
EquipaObra.belongsTo(User, { foreignKey: 'encarregado_id', as: 'encarregado' });


module.exports = EquipaObra;
