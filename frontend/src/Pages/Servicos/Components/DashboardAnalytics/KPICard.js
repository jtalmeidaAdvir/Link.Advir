import React from 'react';
import { View, Text } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import styles from '../../Styles/DashboardAnalyticsStyles';

const KPICard = ({ title, value, icon, color, trend = null }) => (
  <View style={[styles.kpiCard, { borderLeftColor: color }]}>
    <View style={styles.kpiHeader}>
      <FontAwesomeIcon icon={icon} color={color} size="lg" />
      {trend !== null && (
        <FontAwesomeIcon
          icon={trend > 0 ? faArrowUp : faArrowDown}
          color={trend > 0 ? '#28a745' : '#dc3545'}
          size="sm"
        />
      )}
    </View>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiTitle}>{title}</Text>
  </View>
);

export default KPICard;
