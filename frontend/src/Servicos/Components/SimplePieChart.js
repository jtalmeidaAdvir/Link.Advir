import React from 'react';
import { View, Text } from 'react-native';
import styles from '../Styles/DashboardAnalyticsStyles';

const SimplePieChart = ({ data }) => (
  <View style={styles.simplePieContainer}>
    {data.map((item, index) => (
      <View key={index} style={styles.pieItem}>
        <View style={[styles.pieColor, { backgroundColor: item.color }]} />
        <Text style={styles.pieLabel}>{item.name}: {item.value}</Text>
      </View>
    ))}
  </View>
);

export default SimplePieChart;
