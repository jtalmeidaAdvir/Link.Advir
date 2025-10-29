
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

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
        },
        usuario_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        usuario_nome: {
            type: DataTypes.STRING,
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
        tableName: "comunicados_leitura",
        timestamps: true,
    }
);

module.exports = ComunicadoLeitura;
