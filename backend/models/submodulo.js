// models/submodulo.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Submodulo = sequelize.define('Submodulo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descricao: {
    type: DataTypes.STRING,
  },
  moduloId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'modulo', // Nome da tabela, não do modelo diretamente
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
}, {
  timestamps: false,
  tableName: 'submodulo',
});



module.exports = Submodulo;
