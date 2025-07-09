// models/registoPontoObra.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./user');
const Obra = require('./obra');

const RegistoPontoObra = sequelize.define('RegistoPontoObra', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' },
  },
  obra_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Obra, key: 'id' },
  },
  tipo: {
  type: DataTypes.ENUM('entrada', 'saida', 'pausa_inicio', 'pausa_fim'),
  allowNull: false,
},

  timestamp: { // <-- corrigido aqui
    type: DataTypes.DATE,
    allowNull: false,
  },
  latitude: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  longitude: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'registo_ponto_obra',
  timestamps: true
});
RegistoPontoObra.belongsTo(User, { foreignKey: 'user_id' });
RegistoPontoObra.belongsTo(Obra, { foreignKey: 'obra_id' });

module.exports = RegistoPontoObra;