import React from "react";
import { View, Text } from "react-native";
import styles from "./Styles/PandIByTecnicoStyles";

const DashboardCards = ({ processos, tecnicoID, filterProcessosByPeriodo, getTotalProcessosDoTecnico }) => {
  const totalIntervencoes = filterProcessosByPeriodo().length;
  const pedidosTecnico = getTotalProcessosDoTecnico();
  const horasTotais = (
    filterProcessosByPeriodo().reduce((total, p) => total + (p.Duracao || 0), 0) / 60
  ).toFixed(1);

  return (
    <View style={styles.dashboardContainer}>
      <Text style={styles.dashboardTitle}> </Text>
      <View style={styles.dashboardRow}>
        <View style={styles.dashboardCard}>
          <Text style={styles.cardTitle}>Total de Intervenções</Text>
          <Text style={styles.cardValue}>{totalIntervencoes}</Text>
        </View>

        <View style={styles.dashboardCard}>
          <Text style={styles.cardTitle}>Pedidos do Técnico</Text>
          <Text style={styles.cardValue}>{pedidosTecnico}</Text>
        </View>

        <View style={styles.dashboardCard}>
          <Text style={styles.cardTitle}>Horas Totais</Text>
          <Text style={styles.cardValue}>{horasTotais}h</Text>
        </View>
      </View>
    </View>
  );
};

export default DashboardCards;
