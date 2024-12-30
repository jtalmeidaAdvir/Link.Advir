const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./user');
const RegistoPonto = require('./registoPonto');

const PedidoAlteracao = sequelize.define('PedidoAlteracao', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { 
        type: DataTypes.INTEGER, 
        allowNull: true, // Permitir valores NULL para corresponder ao SET NULL
        references: { model: User, key: 'id' },
        onDelete: 'SET NULL', // Ação de exclusão
    },
    registo_ponto_id: { 
        type: DataTypes.INTEGER, 
        allowNull: false,
        references: { model: RegistoPonto, key: 'id' },
        onDelete: 'NO ACTION', // Ação de exclusão
    },
    novaHoraEntrada: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    novaHoraSaida: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    motivo: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            len: [10, 255], // Motivo deve ter entre 10 e 255 caracteres
        },
    },
    status: {
        type: DataTypes.ENUM('pendente', 'aprovado', 'rejeitado'),
        defaultValue: 'pendente',
        allowNull: false,
    },
}, {
    timestamps: true,
    tableName: 'pedido_alteracao',
});

User.hasMany(PedidoAlteracao, { foreignKey: 'user_id' });
PedidoAlteracao.belongsTo(User, { foreignKey: 'user_id' });

RegistoPonto.hasMany(PedidoAlteracao, { foreignKey: 'registo_ponto_id' });
PedidoAlteracao.belongsTo(RegistoPonto, { foreignKey: 'registo_ponto_id' });

module.exports = PedidoAlteracao;
