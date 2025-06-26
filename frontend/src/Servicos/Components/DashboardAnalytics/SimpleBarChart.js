import React from 'react';
import { View, Text } from 'react-native';
import styles from '../../Styles/DashboardAnalyticsStyles';

const COLORS = ['#1792FE', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#20c997'];

const SimpleBarChart = ({ data }) => (
  <View style={styles.simpleBarContainer}>
    {data.map((item, index) => (
      <View key={index} style={styles.barItem}>
        <Text style={styles.barLabel}>{item.name}</Text>
        <View style={styles.barBackground}>
          <View
            style={[
              styles.barFill,
              {
                width: `${(item.value / Math.max(...data.map(d => d.value))) * 100}%`,
                backgroundColor: COLORS[index % COLORS.length]
              }
            ]}
          />
        </View>
        <Text style={styles.barValue}>{item.value}</Text>
      </View>
    ))}
  </View>
);

export default SimpleBarChart;
