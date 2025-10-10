
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Visitante = require('./visitante');
const Obra = require('./obra');
const Empresa = require('./empresa');

const RegistoPontoVisitante = sequelize.define('RegistoPontoVisitante', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  visitante_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Visitante,
      key: 'id'
    }
  },
  obra_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Obra,
      key: 'id'
    }
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Empresa,
      key: 'id'
    }
  },
  tipo: {
    type: DataTypes.ENUM('entrada', 'saida'),
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'registo_ponto_visitantes'
});

Visitante.hasMany(RegistoPontoVisitante, { foreignKey: 'visitante_id' });
RegistoPontoVisitante.belongsTo(Visitante, { foreignKey: 'visitante_id' });

Obra.hasMany(RegistoPontoVisitante, { foreignKey: 'obra_id' });
RegistoPontoVisitante.belongsTo(Obra, { foreignKey: 'obra_id' });

Empresa.hasMany(RegistoPontoVisitante, { foreignKey: 'empresa_id' });
RegistoPontoVisitante.belongsTo(Empresa, { foreignKey: 'empresa_id' });

module.exports = RegistoPontoVisitante;
