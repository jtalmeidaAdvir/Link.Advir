import React from "react";
import { View, Text } from "react-native";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer
} from "recharts";
import styles from "../../Styles/PandIByTecnicoStyles";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#6B66FF'];

const ChartsSection = ({ getInterventionTypeData, getAssistanceTypeData, getHoursPerDayData }) => {
  return (
    <View style={styles.chartsContainer}>
      {/* Tipos de Intervenção */}
      <View style={styles.chartBox}>
        <Text style={styles.chartTitle}>Tipos de Intervenção</Text>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={getInterventionTypeData()}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {getInterventionTypeData().map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </View>

      {/* Tipos de Contratos */}
      <View style={styles.chartBox}>
        <Text style={styles.chartTitle}>Tipos de Contratos</Text>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={getAssistanceTypeData()}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#82ca9d"
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {getAssistanceTypeData().map((entry, index) => (
                <Cell key={`cell-assist-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </View>

      {/* Horas por Dia */}
      <View style={styles.chartBox}>
        <Text style={styles.chartTitle}>Horas por Dia</Text>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={getHoursPerDayData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="hours" fill="#1792FE" name="Horas" />
          </BarChart>
        </ResponsiveContainer>
      </View>
    </View>
  );
};

export default ChartsSection;
