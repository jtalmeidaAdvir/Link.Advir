import React, { useEffect, useState } from 'react';
import { Modal, View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ModalPedidosAlteracao = ({ visible, onClose }) => {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const userId = localStorage.getItem("user_id");
        const response = await fetch(`https://backend.advir.pt/api/pedidoAlteracao/pedidos-alteracao/${userId}`);
        const data = await response.json();
        setPedidos(data);
      } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
      }
    };

    if (visible) fetchPedidos();
  }, [visible]);

  const renderItem = ({ item }) => (
    <View style={styles.pedidoItem}>
      <Text style={styles.data}>Data: {new Date(item.RegistoPonto?.data).toLocaleDateString()}</Text>
      <Text>Entrada Original: {item.RegistoPonto?.horaEntrada?.slice(11, 16) || '—'}</Text>
      <Text>Nova Entrada: {item.novaHoraEntrada?.slice(11, 16) || '—'}</Text>
      <Text>Nova Saída: {item.novaHoraSaida?.slice(11, 16) || '—'}</Text>
      <Text>Status: <Text style={[styles.status, styles[item.status]]}>{item.status}</Text></Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Pedidos de Alteração</Text>
        <FlatList
          data={pedidos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, padding: 20, backgroundColor: '#fff' },
  closeButton: { alignSelf: 'flex-end' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  pedidoItem: { marginBottom: 15, padding: 10, backgroundColor: '#f2f2f2', borderRadius: 8 },
  status: { fontWeight: 'bold' },
  pendente: { color: '#FFA500' },
  aprovado: { color: '#28a745' },
  rejeitado: { color: '#dc3545' },
  data: { fontWeight: 'bold' },
});

export default ModalPedidosAlteracao;
