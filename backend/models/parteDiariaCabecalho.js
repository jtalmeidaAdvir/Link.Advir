// models/ParteDiariaCabecalho.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ParteDiariaCabecalho = sequelize.define('ParteDiariaCabecalho', {
  DocumentoID: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  Numero: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  ObraID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  Data: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  Notas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  CriadoPor: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  Utilizador: {
    type: DataTypes.STRING(100),
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
}

}, {
  tableName: 'ParteDiariaCabecalho',
});

module.exports = ParteDiariaCabecalho;
