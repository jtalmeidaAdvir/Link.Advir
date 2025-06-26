import React from 'react';
import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';
import styles from '../../Styles/DashboardAnalyticsStyles';

const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];

const TecnicoRankingCard = ({ tecnico, index }) => {
  const corTroféu = medalColors[index] || null;

  return (
    <View style={styles.tecnicoCard}>
      <View style={styles.tecnicoHeader}>
        <View style={styles.tecnicoRank}>
          <Text style={styles.rankNumber}>{index + 1}</Text>
          {index < 3 && (
            <FontAwesomeIcon icon={faTrophy} color={corTroféu} size="sm" />
          )}
        </View>
        <Text style={styles.tecnicoNome}>{tecnico.nome}</Text>
      </View>

      <View style={styles.tecnicoStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{tecnico.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{tecnico.resolvidos}</Text>
          <Text style={styles.statLabel}>Resolvidos</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(tecnico.eficiencia)}%</Text>
          <Text style={styles.statLabel}>Eficiência</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(tecnico.tempoMedio)}h</Text>
          <Text style={styles.statLabel}>Tempo Médio</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(tecnico.eficiencia, 100)}%` }
          ]}
        />
      </View>
    </View>
  );
};

export default TecnicoRankingCard;
