
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { secureStorage } from '../../utils/secureStorage';
const ModalPedidosAlteracao = ({ visible, onClose }) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPedidos = async () => {
      if (!visible) return;
      
      setLoading(true);
      try {
        const userId = secureStorage.getItem("userId");
        const response = await fetch(`https://backend.advir.pt/api/pedidoAlteracao/pedidos-alteracao/${userId}`);
        const data = await response.json();
        setPedidos(data);
      } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, [visible]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Pedido #{item.id}</Text>
        <View style={[styles.statusBadge, styles[item.status]]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="calendar" size={16} color="#1792FE" />
          <Text style={styles.infoLabel}>Data:</Text>
          <Text style={styles.infoValue}>
            {new Date(item.RegistoPonto?.data).toLocaleDateString('pt-PT')}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="clock-in" size={16} color="#1792FE" />
          <Text style={styles.infoLabel}>Entrada Original:</Text>
          <Text style={styles.infoValue}>
            {item.RegistoPonto?.horaEntrada?.slice(11, 16) || '—'}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="clock-plus" size={16} color="#28a745" />
          <Text style={styles.infoLabel}>Nova Entrada:</Text>
          <Text style={styles.infoValue}>
            {item.novaHoraEntrada?.slice(11, 16) || '—'}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="clock-out" size={16} color="#dc3545" />
          <Text style={styles.infoLabel}>Nova Saída:</Text>
          <Text style={styles.infoValue}>
            {item.novaHoraSaida?.slice(11, 16) || '—'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>Pedidos de Alteração</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1792FE" />
                <Text style={styles.loadingText}>Carregando pedidos...</Text>
              </View>
            ) : pedidos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="file-document-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Nenhum pedido encontrado</Text>
              </View>
            ) : (
              <FlatList
                data={pedidos}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 600,
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1792FE',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  pendente: {
    backgroundColor: '#FFA500',
  },
  aprovado: {
    backgroundColor: '#28a745',
  },
  rejeitado: {
    backgroundColor: '#dc3545',
  },
  cardContent: {
    padding: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 120,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default ModalPedidosAlteracao;
