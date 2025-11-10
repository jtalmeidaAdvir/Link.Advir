
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Comunicado = require("./comunicado");

const ComunicadoLeitura = sequelize.define(
    "ComunicadoLeitura",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        comunicado_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "comunicados",
                key: "id",
            },
        },
        usuario_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        usuario_nome: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        empresa_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        lido: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        data_leitura: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "comunicado_leituras",
        timestamps: true,
    }
);

// Relacionamento
ComunicadoLeitura.belongsTo(Comunicado, {
    foreignKey: "comunicado_id",
});

module.exports = ComunicadoLeitura;
