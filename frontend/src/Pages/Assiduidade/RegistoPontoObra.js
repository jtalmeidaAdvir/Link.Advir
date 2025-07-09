// LeitorQRCodeObra.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RegistoPontoObra = () => {
  const scannerRef = useRef(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannedObra, setScannedObra] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [registos, setRegistos] = useState([]);

  const toggleScanner = () => setScannerVisible(!scannerVisible);

  const onScanSuccess = async (data) => {
    try {
      const qrData = JSON.parse(data);
      if (qrData.tipo !== 'obra' || !qrData.obraId) {
        Alert.alert('QR Code inválido');
        return;
      }
      setScannedObra(qrData);
      Alert.alert('QR Code lido com sucesso', `Obra: ${qrData.nome}`);
    } catch (err) {
      Alert.alert('Erro ao processar o QR Code');
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'web') {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } }),
          err => reject(err)
        );
      } else {
        import('expo-location').then(async (Location) => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') reject('Permissão negada');
          else {
            const loc = await Location.getCurrentPositionAsync({});
            resolve(loc);
          }
        }).catch(reject);
      }
    });
  };

  const registarPonto = async (tipo) => {
    if (!scannedObra) return Alert.alert('Nenhuma obra lida');
    try {
      const loc = await getCurrentLocation();
      const token = localStorage.getItem('loginToken');

      const res = await fetch('https://backend.advir.pt/api/registo-ponto-obra', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipo,
          obra_id: scannedObra.obraId,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        })
      });

      if (res.ok) {
        const data = await res.json();
        setRegistos(prev => [...prev, data]);
        Alert.alert('Registo efetuado');
      } else {
        Alert.alert('Erro ao registar');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro ao registar ponto');
    }
  };

  useEffect(() => {
    if (!scannerVisible) return;
    scannerRef.current = new Html5Qrcode("reader");

    Html5Qrcode.getCameras()
      .then(cams => {
        const back = cams.find(c => /back/i.test(c.label)) || cams[0];
        return scannerRef.current.start(
          back.id,
          { fps: 10, qrbox: 250, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] },
          async decodedText => {
            if (isProcessing) return;
            setIsProcessing(true);
            try { await scannerRef.current.stop(); } catch (_) {}
            scannerRef.current = null;
            setScannerVisible(false);
            await onScanSuccess(decodedText);
            setIsProcessing(false);
          }
        );
      })
      .catch(err => console.error("Erro ao iniciar scanner:", err));

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scannerVisible]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Registo por QR Code de Obra</Text>

      <TouchableOpacity style={styles.button} onPress={toggleScanner}>
        <LinearGradient colors={['#04BEFE', '#4481EB']} style={styles.buttonGradient}>
          <MaterialCommunityIcons name="qrcode-scan" size={20} color="#fff" />
          <Text style={styles.buttonText}>{scannerVisible ? 'Fechar Scanner' : 'Abrir Scanner'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {scannerVisible && <View id="reader" style={styles.scanner} />}

      {scannedObra && (
        <View style={styles.actions}>
          <Text style={styles.obraLabel}>Obra: {scannedObra.nome}</Text>
          {['entrada', 'saida', 'pausa_inicio', 'pausa_fim', 'fechar_dia'].map(tipo => (
            <TouchableOpacity key={tipo} style={styles.actionButton} onPress={() => registarPonto(tipo)}>
              <Text style={styles.actionButtonText}>{tipo}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.registosContainer}>
        <Text style={styles.subtitle}>Registos de Hoje</Text>
        {registos.map((r, i) => (
          <Text key={i}>{r.tipo} - {new Date(r.dataHora || r.createdAt).toLocaleString()}</Text>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20
  },
  button: {
    width: '100%',
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden'
  },
  buttonGradient: {
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 10
  },
  scanner: {
    width: '100%',
    height: 300,
    backgroundColor: '#eee'
  },
  actions: {
    marginTop: 20,
    alignItems: 'center'
  },
  actionButton: {
    backgroundColor: '#4481EB',
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
    width: 200,
    alignItems: 'center'
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  obraLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10
  },
  registosContainer: {
    marginTop: 30,
    width: '100%'
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  }
});

export default RegistoPontoObra;