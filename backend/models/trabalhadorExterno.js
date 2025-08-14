const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TrabalhadorExterno = sequelize.define('TrabalhadorExterno', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  // Empresa externa/fornecedor (ex.: Rubinova, Gesto Decisivo)
  empresa: { type: DataTypes.STRING, allowNull: false },

  // Nome da pessoa
  funcionario: { type: DataTypes.STRING, allowNull: false },

  // Ex.: 'Servente', 'Oficial 1ª', 'Oficial 2ª', 'Ladrilhador'
  categoria: { type: DataTypes.STRING, allowNull: true },

  // Preço/hora ou dia (fica ao teu critério de negócio)
  valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

  moeda: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'EUR' },

  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  anulado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

  // Vigência (opcional)
  data_inicio: { type: DataTypes.DATEONLY, allowNull: true },
  data_fim: { type: DataTypes.DATEONLY, allowNull: true },

  observacoes: { type: DataTypes.TEXT, allowNull: true },
}, {
  timestamps: true,
  tableName: 'trabalhador_externo',
  indexes: [
    { fields: ['empresa'] },
    { fields: ['funcionario'] },
    { fields: ['categoria'] },
    { fields: ['ativo'] },
    { fields: ['anulado'] },
  ],
});

module.exports = TrabalhadorExterno;
