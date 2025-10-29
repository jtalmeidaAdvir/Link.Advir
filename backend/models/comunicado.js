
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Comunicado = sequelize.define(
    "Comunicado",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        titulo: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        mensagem: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        remetente_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        remetente_nome: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        destinatarios_tipo: {
            type: DataTypes.ENUM("todos", "especificos"),
            allowNull: false,
            defaultValue: "todos",
        },
        destinatarios_ids: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('destinatarios_ids');
                return rawValue ? JSON.parse(rawValue) : [];
            },
            set(value) {
                this.setDataValue('destinatarios_ids', JSON.stringify(value));
            }
        },
        prioridade: {
            type: DataTypes.ENUM("baixa", "normal", "alta", "urgente"),
            allowNull: false,
            defaultValue: "normal",
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        data_criacao: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        data_expiracao: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "comunicados",
        timestamps: true,
    }
);

module.exports = Comunicado;
