// models/faltas_ferias.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AprovacaoFaltaFerias = sequelize.define('AprovacaoFaltaFerias', {
  tipoPedido: { type: DataTypes.STRING, allowNull: false }, // 'FALTA' | 'FERIAS'
  operacao:   { type: DataTypes.STRING, allowNull: false, defaultValue: 'CRIAR' }, // 'CRIAR' | 'CANCELAR' | 'EDITAR'

  funcionario: { type: DataTypes.STRING, allowNull: false },

  // para FALTA: usa dataPedido (1 dia). Para FÉRIAS: usa intervalo [dataInicio..dataFim]
  dataPedido: { type: DataTypes.DATE, allowNull: false },
  dataInicio: { type: DataTypes.DATEONLY, allowNull: true },
  dataFim:    { type: DataTypes.DATEONLY, allowNull: true },

  // para edição de férias: intervalo original a substituir
  dataInicioOriginal: { type: DataTypes.DATEONLY, allowNull: true },
  dataFimOriginal:    { type: DataTypes.DATEONLY, allowNull: true },

  estadoGozo: DataTypes.INTEGER,
  falta: DataTypes.STRING,
  horas: DataTypes.INTEGER,
  tempo: DataTypes.INTEGER,
  justificacao: DataTypes.TEXT,
  observacoes: DataTypes.TEXT,
  duracao: DataTypes.DECIMAL(5, 2),

  estadoAprovacao: { type: DataTypes.STRING, defaultValue: 'Pendente' },
  usuarioCriador: DataTypes.STRING,
  origem: DataTypes.STRING,
  observacoesResposta: DataTypes.TEXT,
  dataResposta: DataTypes.DATE,
  aprovadoPor: DataTypes.STRING,
  confirmadoPor1: DataTypes.STRING,
  confirmadoPor2: DataTypes.STRING
}, {
  tableName: 'AprovacaoFaltasFerias',
  timestamps: true,
  createdAt: 'dataCriacao',
  updatedAt: false
});

module.exports = AprovacaoFaltaFerias;
