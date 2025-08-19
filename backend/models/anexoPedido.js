
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AnexoPedido = sequelize.define('AnexoPedido', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    pedido_id: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'ID do pedido de assistência'
    },
    nome_arquivo: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nome original do arquivo'
    },
    nome_arquivo_sistema: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nome do arquivo no sistema'
    },
    tipo_arquivo: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Tipo MIME do arquivo'
    },
    tamanho: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Tamanho do arquivo em bytes'
    },
    caminho: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Caminho do arquivo no servidor'
    },
    usuario_upload: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Usuário que fez o upload'
    }
}, {
    tableName: 'anexos_pedidos',
    timestamps: true,
    createdAt: 'data_upload',
    updatedAt: 'data_atualizacao'
});

module.exports = AnexoPedido;
