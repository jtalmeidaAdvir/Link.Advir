const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Notificacao = sequelize.define(
    "Notificacao",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        usuario_destinatario: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        titulo: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        mensagem: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        tipo: {
            type: DataTypes.ENUM("pedido_criado", "pedido_atribuido", "info"),
            allowNull: false,
            defaultValue: "info",
        },
        lida: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        pedido_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        data_criacao: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: () => new Date(),
        },
    },
    {
        tableName: "notificacoes",
        timestamps: true,
        hooks: {
            beforeCreate: (notificacao, options) => {
                console.log(
                    "Before create hook - dados recebidos:",
                    notificacao.dataValues,
                );
            },
        },
    },
);

module.exports = Notificacao;
