const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const RegistoPonto = require('./registoPonto'); // Certifica-te de que estás a importar o modelo correto


const Intervalo = sequelize.define('Intervalo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    horaPausa: { 
        type: DataTypes.STRING,  // Armazena como string
        allowNull: false,
        // Temporariamente comentado para testes
        // get() {
        //     const rawValue = this.getDataValue('horaPausa');
        //     return rawValue ? rawValue.split('T')[1]?.split('.')[0] : null;
        // },
        set(value) {
            this.setDataValue('horaPausa', value);
        }
    },
    horaRetorno: { type: DataTypes.STRING, allowNull: true },
    duracaoIntervalo: { type: DataTypes.FLOAT, allowNull: true },
    registoPontoId: {
        type: DataTypes.INTEGER,
        references: { model: 'registo_ponto', key: 'id' }
    }
}, { 
    timestamps: false,
    tableName: 'intervalos'
});

RegistoPonto.hasMany(Intervalo, { foreignKey: 'registoPontoId' });
Intervalo.belongsTo(RegistoPonto, { foreignKey: 'registoPontoId' });

module.exports = Intervalo;
