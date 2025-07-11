import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';

const PessoalObra = ({ route }) => {
  const { obraId, nomeObra } = route.params;
  const [registos, setRegistos] = useState([]);
  const [loading, setLoading] = useState(true);

  const hoje = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchData = async () => {
      const token = await AsyncStorage.getItem('loginToken');
      try {
        const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-obra-e-dia?obra_id=${obraId}&data=${hoje}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setRegistos(data);
      } catch (err) {
        console.error('Erro ao carregar registos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.nome}>{item.User?.nome || 'Desconhecido'}</Text>
      <Text style={styles.tipo}>{item.tipo} - {new Date(item.timestamp).toLocaleTimeString('pt-PT')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}><FontAwesome name="building" /> {nomeObra}</Text>
      <Text style={styles.subtitulo}>Registos de hoje</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#1792FE" />
      ) : (
        <FlatList
          data={registos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  subtitulo: { color: '#555', marginBottom: 20 },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd'
  },
  nome: { fontWeight: 'bold', fontSize: 16 },
  tipo: { color: '#666' }
});

export default PessoalObra;
