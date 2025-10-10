
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Empresa = require('./empresa');

const Visitante = sequelize.define('Visitante', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  primeiroNome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ultimoNome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  numeroContribuinte: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Empresa,
      key: 'id'
    }
  }
}, {
  timestamps: true,
  tableName: 'visitantes'
});

Empresa.hasMany(Visitante, { foreignKey: 'empresa_id' });
Visitante.belongsTo(Empresa, { foreignKey: 'empresa_id' });

module.exports = Visitante;
