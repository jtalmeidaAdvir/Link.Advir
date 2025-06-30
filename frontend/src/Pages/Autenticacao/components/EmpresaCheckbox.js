import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { styles } from '../styles/SelecaoEmpresaStyles';

const EmpresaCheckbox = ({ empresaPredefinida, onToggle }) => (
  <TouchableOpacity style={styles.checkboxWrapper} onPress={onToggle}>
    <View style={[styles.checkbox, empresaPredefinida && styles.checkboxChecked]}>
      {empresaPredefinida && <Text style={styles.checkboxCheck}>✓</Text>}
    </View>
    <Text style={styles.checkboxLabel}>Predefinir esta empresa como padrão</Text>
  </TouchableOpacity>
);

export default EmpresaCheckbox;
