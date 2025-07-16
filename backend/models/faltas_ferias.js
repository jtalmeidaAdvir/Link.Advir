const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');


  const AprovacaoFaltaFerias = sequelize.define('AprovacaoFaltaFerias', {
    tipoPedido: {
      type: DataTypes.STRING,
      allowNull: false
    },
    funcionario: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dataPedido: {
      type: DataTypes.DATE,
      allowNull: false
    },
    dataInicio: {
    type: DataTypes.DATEONLY,
    allowNull: true
    },
    dataFim: {
    type: DataTypes.DATEONLY,
    allowNull: true
    },

    estadoGozo: DataTypes.INTEGER,
    falta: DataTypes.STRING,
    horas: DataTypes.INTEGER,
    tempo: DataTypes.INTEGER,
    justificacao: DataTypes.TEXT,
    observacoes: DataTypes.TEXT,
    duracao: DataTypes.DECIMAL(5, 2),
    estadoAprovacao: {
      type: DataTypes.STRING,
      defaultValue: 'Pendente' // Pendente | Confirmado1 | Confirmado2 | Aprovado | Rejeitado
    },
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
 

