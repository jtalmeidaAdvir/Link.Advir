const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./user');

const RegistoPonto = sequelize.define('RegistoPonto', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
    data: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    horaEntrada: {
        type: DataTypes.DATE,
        allowNull: true, // Permite null até a hora ser definida corretamente
    },
    horaSaida: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    totalHorasTrabalhadas: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    totalTempoIntervalo: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    latitude: { type: DataTypes.FLOAT, allowNull: true },  // Novo campo para latitude
    longitude: { type: DataTypes.FLOAT, allowNull: true },  // Novo campo para longitude
    empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Empresa,
      key: 'id',
    }
}
}, {
    timestamps: false,
    tableName: 'registo_ponto',
});

// Relacionamentos
User.hasMany(RegistoPonto, { foreignKey: 'user_id' });
RegistoPonto.belongsTo(User, { foreignKey: 'user_id' });

Empresa.hasMany(RegistoPonto, { foreignKey: 'empresa_id' });
RegistoPonto.belongsTo(Empresa, { foreignKey: 'empresa_id' });

module.exports = RegistoPonto;
