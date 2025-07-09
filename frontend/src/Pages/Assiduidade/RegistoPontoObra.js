import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RegistoPontoObra = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [registos, setRegistos] = useState([]);
  const [userId, setUserId] = useState(null);


  const getCurrentPosition = () =>
  new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject)
  );

  useEffect(() => {
    (async () => {
      let location;
try {
  location = await getCurrentPosition();
} catch (err) {
  Alert.alert('Erro ao obter localização');
  return;
}

      const id = await AsyncStorage.getItem('userId');
      setUserId(id);
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    setScanned(true);
    try {
      const parsed = JSON.parse(data);

      if (parsed.tipo !== 'obra') {
        Alert.alert('QR inválido', 'O QR Code não é de uma obra.');
        setScanned(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      const token = await AsyncStorage.getItem('loginToken');

      const res = await axios.post(
        'https://backend.advir.pt/api/registo-ponto-obra',
        {
          obra_id: parsed.obraId,
          tipo: 'entrada', // pode vir de um picker mais tarde
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setRegistos((prev) => [res.data, ...prev]);
      Alert.alert('Sucesso', `Entrada registada para obra: ${parsed.nome}`);
    } catch (err) {
      console.error('Erro ao registar ponto:', err);
      Alert.alert('Erro', 'Não foi possível registar o ponto.');
    }
    setTimeout(() => setScanned(false), 2000);
  };

  if (hasPermission === null) return <Text>A solicitar permissões de câmara...</Text>;
  if (hasPermission === false) return <Text>Sem acesso à câmara.</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Leitor QR Code - Registo de Ponto em Obra</Text>
      <View style={styles.scannerContainer}>
        {!scanned && (
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={styles.scanner}
          />
        )}
      </View>

      <Text style={styles.subtitulo}>Últimos registos:</Text>
      {registos.map((r, idx) => (
        <View key={idx} style={styles.registoItem}>
          <Text>Obra: {r.obra_id}</Text>
          <Text>Tipo: {r.tipo}</Text>
          <Text>Latitude: {r.latitude}</Text>
          <Text>Longitude: {r.longitude}</Text>
          <Text>Data: {new Date(r.createdAt).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  },
  scannerContainer: {
    width: '100%',
    height: 300,
    overflow: 'hidden',
    borderRadius: 10,
    marginBottom: 20,
  },
  scanner: {
    width: '100%',
    height: '100%'
  },
  subtitulo: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 5,
  },
  registoItem: {
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
    width: '100%'
  }
});

export default RegistoPontoObra;