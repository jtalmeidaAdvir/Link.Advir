
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Configuracao = sequelize.define('Configuracao', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chave: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  valor: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  descricao: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'configuracoes'
});

module.exports = Configuracao;
