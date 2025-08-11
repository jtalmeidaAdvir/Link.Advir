// models/Schedule.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Schedule = sequelize.define(
  "Schedule",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    contact_list: { type: DataTypes.TEXT, allowNull: false },
    frequency: { type: DataTypes.STRING(50), allowNull: false },
    time: { type: DataTypes.DATE, allowNull: false }, // armazenamos 1970-01-01 HH:MM:SS UTC
    days: { type: DataTypes.TEXT, allowNull: true }, // JSON de [0..6]
    start_date: { type: DataTypes.DATE, allowNull: true },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    priority: { type: DataTypes.STRING(50), allowNull: true },
    time_zone: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "Europe/Lisbon" },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    last_sent: { type: DataTypes.DATE, allowNull: true },
    total_sent: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { tableName: "schedules", timestamps: false }
);

module.exports = Schedule;
