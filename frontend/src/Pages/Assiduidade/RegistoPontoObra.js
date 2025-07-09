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

    const obraId = qrData.obraId;
    const nomeObra = qrData.nome;

    // Filtra registos dessa obra (de hoje)
    const registosObraHoje = registos
      .filter(r => r.obra_id === obraId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // garantir ordem

    let proximoTipo = 'entrada'; // default

    if (registosObraHoje.length > 0) {
      const ultimoTipo = registosObraHoje[registosObraHoje.length - 1].tipo;
      proximoTipo = ultimoTipo === 'entrada' ? 'saida' : 'entrada';
    }

    Alert.alert(`Registando ${proximoTipo}`, `Obra: ${nomeObra}`);

    await registarPonto(proximoTipo, obraId, nomeObra);
  } catch (err) {
    console.error('Erro ao processar o QR Code:', err);
    Alert.alert('Erro ao processar o QR Code');
  }
};


useEffect(() => {
  const carregarRegistosHoje = async () => {
    try {
      const token = localStorage.getItem('loginToken');
      const hoje = new Date().toISOString().split('T')[0];

      const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-dia?data=${hoje}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const dados = await res.json();

        // Para cada registo, adiciona "morada" com base em lat/lon
        const registosComMorada = await Promise.all(
          dados.map(async r => {
            const morada = await obterMoradaPorCoordenadas(r.latitude, r.longitude);
            return { ...r, morada };
          })
        );

        setRegistos(registosComMorada);
      }
    } catch (err) {
      console.error('Erro ao carregar registos de hoje:', err);
    }
  };

  carregarRegistosHoje();
}, []);

const obterMoradaPorCoordenadas = async (lat, lon) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    const data = await res.json();
    return data.display_name || `${lat}, ${lon}`;
  } catch (err) {
    console.error('Erro ao obter morada:', err);
    return `${lat}, ${lon}`;
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

  const registarPonto = async (tipo, obraId, nomeObra) => {
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
        obra_id: obraId,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      })
    });

    if (res.ok) {
      const data = await res.json();
      const morada = await obterMoradaPorCoordenadas(data.latitude, data.longitude);

      setRegistos(prev => [...prev, { ...data, Obra: { nome: nomeObra }, morada }]);
      Alert.alert('Registo efetuado', `${tipo} na obra ${nomeObra}`);
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
      <Text style={styles.title}>Ponto QR Code</Text>

      <TouchableOpacity style={styles.button} onPress={toggleScanner}>
        <LinearGradient colors={['#04BEFE', '#4481EB']} style={styles.buttonGradient}>
          <MaterialCommunityIcons name="qrcode-scan" size={20} color="#fff" />
          <Text style={styles.buttonText}>{scannerVisible ? 'Fechar Scanner' : 'Abrir Scanner'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {scannerVisible && <View id="reader" style={styles.scanner} />}

      

      <View style={styles.registosContainer}>
  <Text style={styles.subtitle}>Registos de Hoje</Text>
  {registos.length === 0 ? (
    <Text style={{ fontStyle: 'italic' }}>Nenhum registo encontrado para hoje.</Text>
  ) : (
    registos.map((r, i) => (
      <View key={i} style={{ marginBottom: 10 }}>
        <Text>{r.tipo} - {new Date(r.timestamp || r.createdAt).toLocaleString()}</Text>
        <Text style={{ fontSize: 13, color: '#555' }}>
          {r.Obra?.nome} ({r.morada})
        </Text>
      </View>
    ))
  )}
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