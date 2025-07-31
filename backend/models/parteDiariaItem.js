// models/ParteDiariaItem.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const ParteDiariaCabecalho = require('./parteDiariaCabecalho');

const ParteDiariaItem = sequelize.define('ParteDiariaItem', {
  ComponenteID: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  DocumentoID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  Funcionario: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  ClasseID: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  SubEmpID: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  NumHoras: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false,
  },
  PrecoUnit: {
    type: DataTypes.DECIMAL(18,4),
    allowNull: false,
  },
  TipoEntidade: {
    type: DataTypes.CHAR(1),
    allowNull: false,
    defaultValue: 'O'
  },
  ColaboradorID: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  Data: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  ObraID: {
  type: DataTypes.INTEGER,
  allowNull: false,
}


}, {
  tableName: 'ParteDiariaItem',
});

module.exports = ParteDiariaItem;