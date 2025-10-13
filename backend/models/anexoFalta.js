
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AnexoFalta = sequelize.define('AnexoFalta', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    pedido_falta_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID do pedido de falta/férias'
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
    tableName: 'anexos_faltas',
    timestamps: true,
    createdAt: 'data_upload',
    updatedAt: 'data_atualizacao'
});

module.exports = AnexoFalta;
