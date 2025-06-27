import React, { useEffect, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScanner } from 'html5-qrcode';
import { 
  View, 
  Text, 
  ScrollView, 
  Dimensions, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Linking 
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// Exemplo de localStorage no web; no React Native puro usarias o AsyncStorage
// import AsyncStorage from '@react-native-async-storage/async-storage';

const LeitorQRCode = () => {
  // ---------------------------
  // Estados de lógica de ponto (copiados/adaptados do PontoBotao)
  // ---------------------------
  const [registosDiarios, setRegistosDiarios] = useState([]);
  const [filteredRegistos, setFilteredRegistos] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [intervaloAberto, setIntervaloAberto] = useState(false);
  const [horaInicioIntervalo, setHoraInicioIntervalo] = useState(null);
  const [tempoDecorrido, setTempoDecorrido] = useState('00:00:00');
  const [temporizadorAtivo, setTemporizadorAtivo] = useState(false);
  const [inicioTemporizador, setInicioTemporizador] = useState(null);
  const [tempoPausado, setTempoPausado] = useState(0);
  const [saidaRegistrada, setSaidaRegistrada] = useState(false);
  const [endereco, setEndereco] = useState('');
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  // Animações / UI específicas
  const [fadeAnimation] = useState(new Animated.Value(0));
  const [scannerVisible, setScannerVisible] = useState(false);

  // Data/hora local (se quiseres mostrar no topo)
  const [horaAtual, setHoraAtual] = useState(new Date());

  const [isProcessing, setIsProcessing] = useState(false); // no topo do componente, se ainda não existir


  // QR
  const qrData = "registo-ponto";

  const navigation = useNavigation();

  // ----------------------------------------------------------------
  // Animação de Fade-In para o container principal
  // ----------------------------------------------------------------
  useEffect(() => {
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true
    }).start();
  }, [fadeAnimation]);

  // ----------------------------------------------------------------
  // Relógio principal (hora atual no topo)
  // ----------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ----------------------------------------------------------------
  // Efeito para carregar a hora de entrada do localStorage ou do backend
  // (conforme no PontoBotao)
  // ----------------------------------------------------------------
  useEffect(() => {
    const carregarHoraEntrada = async () => {
      let horaEntradaSalva = localStorage.getItem('horaEntrada');
      // Em React Native puro, seria algo como:
      // let horaEntradaSalva = await AsyncStorage.getItem('horaEntrada');

      if (!horaEntradaSalva) {
        console.log("LocalStorage vazio. A tentar buscar do backend...");
        const token = localStorage.getItem('loginToken');
        try {
          const response = await fetch('https://backend.advir.pt/api/registoPonto/diario', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            const registoHoje = data.find(
              (registo) => registo.data === new Date().toISOString().split('T')[0]
            );

            if (registoHoje && registoHoje.horaEntrada) {
              horaEntradaSalva = registoHoje.horaEntrada;
              localStorage.setItem('horaEntrada', horaEntradaSalva);
              console.log("Hora de entrada recuperada do backend e salva no localStorage:", horaEntradaSalva);
            }
          }
        } catch (error) {
          console.error("Erro ao buscar hora de entrada do backend:", error);
        }
      }

      // Se encontrarmos a hora de entrada, iniciamos o temporizador
      if (horaEntradaSalva) {
        const entrada = new Date(horaEntradaSalva);
        const agora = new Date();
        const diferenca = agora - entrada;

        const horas = String(Math.floor(diferenca / (1000 * 60 * 60))).padStart(2, '0');
        const minutos = String(Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const segundos = String(Math.floor((diferenca % (1000 * 60)) / 1000)).padStart(2, '0');

        setTempoDecorrido(`${horas}:${minutos}:${segundos}`);
        setInicioTemporizador(entrada);
        setTemporizadorAtivo(true);
      } else {
        console.log("Nenhuma hora de entrada encontrada.");
      }
    };

    carregarHoraEntrada();
  }, []);

  // ----------------------------------------------------------------
  // Actualiza o cronómetro (tempoDecorrido) a cada segundo
  // ----------------------------------------------------------------
  useEffect(() => {
    let interval;
    if (temporizadorAtivo && inicioTemporizador && !saidaRegistrada) {
      interval = setInterval(() => {
        const agora = new Date();
        const diferenca = agora - inicioTemporizador + tempoPausado;
        const horas = String(Math.floor(diferenca / (1000 * 60 * 60))).padStart(2, '0');
        const minutos = String(Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const segundos = String(Math.floor((diferenca % (1000 * 60)) / 1000)).padStart(2, '0');
        setTempoDecorrido(`${horas}:${minutos}:${segundos}`);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [temporizadorAtivo, inicioTemporizador, tempoPausado, saidaRegistrada]);

  // ----------------------------------------------------------------
  // Verifica se já existe saída registada no último registo
  // ----------------------------------------------------------------
  useEffect(() => {
    if (registosDiarios.length > 0) {
      const ultimoRegisto = registosDiarios[registosDiarios.length - 1];
      if (ultimoRegisto?.horaSaida) {
        setSaidaRegistrada(true);
        setTemporizadorAtivo(false);
      } else {
        setSaidaRegistrada(false);
      }
    }
  }, [registosDiarios]);

  // ----------------------------------------------------------------
  // Verificar estado do intervalo (aberto ou fechado) no arranque
  // ----------------------------------------------------------------
  useEffect(() => {
    const carregarEstadoInicial = async () => {
      const estadoLocal = JSON.parse(localStorage.getItem('intervaloAberto'));
      // Em React Native puro:
      // const estadoLocal = JSON.parse(await AsyncStorage.getItem('intervaloAberto'));

      if (estadoLocal && estadoLocal.intervaloAberto) {
        setHoraInicioIntervalo(new Date(estadoLocal.horaInicioIntervalo));
        setIntervaloAberto(true);
        setTemporizadorAtivo(false);
      } else {
        try {
          const token = localStorage.getItem('loginToken');
          const response = await fetch('https://backend.advir.pt/api/registoPonto/estado-ponto', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.intervaloAberto && data.horaInicioIntervalo) {
              setHoraInicioIntervalo(new Date(data.horaInicioIntervalo));
              setIntervaloAberto(true);
              setTemporizadorAtivo(false);

              localStorage.setItem('intervaloAberto', JSON.stringify({
                horaInicioIntervalo: data.horaInicioIntervalo,
                intervaloAberto: true,
              }));
            }
          } else {
            console.error("Erro ao recuperar estado do backend:", await response.text());
          }
        } catch (error) {
          console.error("Erro ao carregar estado inicial:", error);
        }
      }
    };

    carregarEstadoInicial();
  }, []);

  // ----------------------------------------------------------------
  // Função para obter lista de registos diários
  // ----------------------------------------------------------------
  const fetchRegistosDiarios = async () => {
    try {
      const token = localStorage.getItem('loginToken');
      const response = await fetch('https://backend.advir.pt/api/registoPonto/diario', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Filtrar apenas o dia de hoje
        const hoje = new Date().toISOString().split('T')[0];
        const registoHoje = data.filter((registo) => registo.data === hoje);

        setRegistosDiarios(data || []);
        setFilteredRegistos(registoHoje);
        setErrorMessage('');
      } else if (response.status === 403) {
        setErrorMessage('Acesso negado: Token inválido ou expirado.');
      } else {
        setErrorMessage('Erro ao obter registos diários.');
      }
    } catch (error) {
      console.error("Erro ao obter registos diários:", error);
      setErrorMessage('Erro de rede ao obter registos diários.');
    }
  };

  useEffect(() => {
    fetchRegistosDiarios();
  }, []);

  // ----------------------------------------------------------------
  // Funções de geolocalização + geocodificação
  // ----------------------------------------------------------------
  const obterLocalizacao = () => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            resolve(coords);
          },
          (error) => {
            console.error("Erro ao obter localização:", error.message);
            // Fallback para Lisboa
            resolve({ latitude: 38.736946, longitude: -9.142685 });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        console.warn("Geolocalização não suportada. A usar valores de fallback (Lisboa).");
        resolve({ latitude: 38.736946, longitude: -9.142685 });
      }
    });
  };

  const getEnderecoPorCoordenadas = async (latitude, longitude) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      } else {
        console.error("Erro na geocodificação reversa:", data);
        return "Endereço não encontrado";
      }
    } catch (error) {
      console.error("Erro ao obter o endereço:", error);
      return "Erro ao obter endereço";
    }
  };

  // ----------------------------------------------------------------
  // Registar ponto (equivalente ao “registarPonto” do PontoBotao),
  // mas aqui será chamado quando se lê o QR code correcto
  // ----------------------------------------------------------------
const registarPonto = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permissão para aceder à localização negada');
      return;
    }

    const localizacao = await Location.getCurrentPositionAsync({});
    const endereco = await Location.reverseGeocodeAsync({
      latitude: localizacao.coords.latitude,
      longitude: localizacao.coords.longitude,
    });

    const enderecoObtido = endereco.length > 0
      ? `${endereco[0].name}, ${endereco[0].street}, ${endereco[0].city}`
      : 'Endereço não encontrado';

    const horaAtual = new Date().toISOString();

    // Guardar hora localmente
    localStorage.setItem('horaEntrada', horaAtual);

   

    const empresaSelecionada = localStorage.getItem('empresaSelecionada');

const response = await fetch('https://backend.advir.pt/api/registoPonto/registar-ponto', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('loginToken')}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        hora: horaAtual,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude,
        endereco,
        totalHorasTrabalhadas: "8.00",
        totalTempoIntervalo: "1.00",
        empresa: empresaSelecionada
    }),
});


    if (response.ok) {
      console.log('Ponto registado com sucesso!');
      setEstadoBotao("pausar");
      setMensagemEstado("Ponto registado com sucesso!");
    } else {
      const errorData = await response.json();
      console.error('Erro ao registar ponto:', errorData.error);
      setMensagemEstado("Erro ao registar ponto.");
    }
  } catch (error) {
    console.error('Erro ao registar ponto:', error.message);
    setMensagemEstado("Erro ao registar ponto.");
  }
};




  // ----------------------------------------------------------------
  // Funções de controlo de intervalo (início e fim)
  // ----------------------------------------------------------------
  const iniciarIntervalo = async () => {
    try {
      const token = localStorage.getItem('loginToken');
      const agora = new Date().toISOString();
      setHoraInicioIntervalo(agora);
      setIntervaloAberto(true);

      localStorage.setItem('intervaloAberto', JSON.stringify({
        horaInicioIntervalo: agora,
        intervaloAberto: true,
      }));
      // Em React Native: await AsyncStorage.setItem('intervaloAberto', ...)

      const response = await fetch('https://backend.advir.pt/api/intervalo/iniciarIntervalo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert("Intervalo iniciado com sucesso.");
        // Pausar temporizador de trabalho
        setTemporizadorAtivo(false);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Erro ao iniciar o intervalo.');
        if (errorData.message === "Já existe um intervalo aberto.") {
          setIntervaloAberto(true);
        }
      }
    } catch (error) {
      console.error('Erro ao iniciar intervalo:', error);
      alert('Erro de rede ao iniciar intervalo.');
    }
  };

  const finalizarIntervalo = async () => {
    try {
      const token = localStorage.getItem('loginToken');
      const response = await fetch('https://backend.advir.pt/api/intervalo/finalizarIntervalo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert("Intervalo finalizado com sucesso.");
        setIntervaloAberto(false);
        setHoraInicioIntervalo(null);
        localStorage.removeItem('intervaloAberto');
        // Em React Native: await AsyncStorage.removeItem('intervaloAberto');

        // Retomar temporizador de trabalho
        setTemporizadorAtivo(true);

        await fetchRegistosDiarios();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Erro ao finalizar o intervalo.');
      }
    } catch (error) {
      console.error('Erro ao finalizar intervalo:', error);
      alert('Erro de rede ao finalizar intervalo.');
    }
  };

  // ----------------------------------------------------------------
  // Lógica do Scanner de QR Code
  // ----------------------------------------------------------------
  const toggleScanner = () => {
    setScannerVisible(!scannerVisible);
  };

useEffect(() => {
  let html5QrCode;

  if (scannerVisible) {
    const html5QrCode = new Html5Qrcode("reader");

    Html5Qrcode.getCameras()
      .then((devices) => {
        // Tenta encontrar a câmara traseira
        const backCamera = devices.find((device) =>
          device.label.toLowerCase().includes('back')
        ) || devices[0]; // fallback: primeira câmara disponível

        if (backCamera) {
          html5QrCode.start(
            backCamera.id,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            },
            async (decodedText, decodedResult) => {
              if (isProcessing) return;
              if (decodedText === qrData) {
                setIsProcessing(true);
                try {
                  await html5QrCode.stop();
                  setScannerVisible(false);
                  await registarPonto();
                } catch (err) {
                  console.error("Erro ao parar o QRCode:", err);
                } finally {
                  setIsProcessing(false);
                }
              } else {
                alert("Código QR inválido.");
              }
            },
            (errorMessage) => {
              // erros de leitura
            }
          );
        }
      })
      .catch((err) => {
        console.error("Erro ao obter câmaras:", err);
      });
  }

  return () => {
    if (html5QrCode) {
      html5QrCode.stop().catch(err => console.warn("Erro ao parar scanner:", err));
    }
  };
}, [scannerVisible]);


  // ----------------------------------------------------------------
  // Helpers de formatação
  // ----------------------------------------------------------------
  const formatDate = (dateString) => {
    const options = { weekday: 'short', day: 'numeric', month: 'long' };
    return new Date(dateString).toLocaleDateString('pt-PT', options);
  };

  // ----------------------------------------------------------------
  // Renderizar registo de hoje
  // (equivalente ao "renderHistoricoDia" do PontoBotao, mas adaptado ao layout)
  // ----------------------------------------------------------------
  const renderRegistoDiario = () => {
    if (filteredRegistos.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="calendar-blank" size={60} color="#d1dbed" />
          <Text style={styles.emptyTitle}>Sem registos para hoje</Text>
          <Text style={styles.emptyText}>Use o QR code para registar o seu ponto.</Text>
        </View>
      );
    }

    const item = filteredRegistos[0];
    const totalHorasTrabalhadas = item.totalHorasTrabalhadas || 0;
    const totalTempoIntervalo = item.totalTempoIntervalo || 0;
    const totalHorasDia = !isNaN(totalHorasTrabalhadas) && !isNaN(totalTempoIntervalo)
      ? (totalHorasTrabalhadas - totalTempoIntervalo).toFixed(2)
      : '0.00';

    const horaEntrada = item.horaEntrada
      ? new Date(item.horaEntrada).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
      : '—';

    const horaSaida = item.horaSaida
      ? new Date(item.horaSaida).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
      : '—';

    return (
      <View style={styles.card}>
        <LinearGradient
          colors={['#f8f9ff', '#ffffff']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.cardHeader}>
            <View style={styles.dateContainer}>
              <MaterialCommunityIcons name="calendar" size={18} color="#4481EB" style={styles.icon} />
              <Text style={styles.cardDate}>{formatDate(item.data)}</Text>
            </View>
          </View>

          <View style={styles.timeRowContainer}>
            <View style={styles.timeItem}>
              <MaterialCommunityIcons name="login" size={18} color="#4481EB" />
              <Text style={styles.timeLabel}>Entrada</Text>
              <Text style={styles.timeValue}>{horaEntrada}</Text>
            </View>

            <View style={styles.timeSeparator}>
              <View style={styles.timeLine}></View>
            </View>

            <View style={styles.timeItem}>
              <MaterialCommunityIcons name="logout" size={18} color="#4481EB" />
              <Text style={styles.timeLabel}>Saída</Text>
              <Text style={styles.timeValue}>{horaSaida}</Text>
            </View>
          </View>

          <View style={styles.hoursContainer}>
            <View style={styles.hoursItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#4481EB" />
              <Text style={styles.hoursText}>{totalHorasDia} horas</Text>
            </View>
            <View style={styles.hoursSeparator}></View>
            <View style={styles.hoursItem}>
              <MaterialCommunityIcons name="coffee-outline" size={16} color="#4481EB" />
              <Text style={styles.hoursText}>{parseFloat(totalTempoIntervalo).toFixed(2)} pausa</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  // ----------------------------------------------------------------
  // Navegar para ListarRegistos
  // ----------------------------------------------------------------
  const irParaListarRegistos = () => {
    navigation.navigate('ListarRegistos');
  };

  // ----------------------------------------------------------------
  // Render principal
  // ----------------------------------------------------------------
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#4481EB', '#04BEFE']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Registo por QR Code</Text>
          <Text style={styles.headerSubtitle}>Scaneie o código para registar o seu ponto</Text>

          {/* Hora actual (opcional) */}
          <View style={styles.clockContainer}>
            <Text style={styles.clockText}>
              {horaAtual.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnimation,
            transform: [{
              translateY: fadeAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              })
            }]
          }
        ]}
      >
        <View style={styles.qrSection}>
          <View style={styles.qrContainer}>
            <LinearGradient
              colors={['#fff', '#f5f7fa']}
              style={styles.qrCard}
            >
              <QRCode
                value={qrData}
                size={Dimensions.get('window').width * 0.4}
                color="#333"
                backgroundColor="transparent"
              />
              <Text style={styles.qrInstructions}>
                Use este QR code para registar sua entrada/saída
              </Text>
            </LinearGradient>
          </View>

          <TouchableOpacity
            style={styles.scanButton}
            onPress={toggleScanner}
          >
            <LinearGradient
              colors={['#4481EB', '#04BEFE']}
              style={styles.scanButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={20} color="#fff" />
              <Text style={styles.scanButtonText}>
                {scannerVisible ? 'Ocultar Scanner' : 'Abrir Scanner'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {scannerVisible && (
            <View style={styles.scannerWrapper}>
              <View id="reader" style={styles.qrScanner}></View>
            </View>
          )}

          {/* Botões de intervalo */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                intervaloAberto ? styles.actionButtonActive : null
              ]}
              onPress={iniciarIntervalo}
              disabled={intervaloAberto || saidaRegistrada}
            >
              <MaterialCommunityIcons
                name="pause-circle"
                size={24}
                color={intervaloAberto ? "#fff" : "#4481EB"}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  intervaloAberto ? styles.actionButtonTextActive : null
                ]}
              >
                Iniciar Pausa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                !intervaloAberto ? styles.actionButtonDisabled : null
              ]}
              onPress={finalizarIntervalo}
              disabled={!intervaloAberto || saidaRegistrada}
            >
              <MaterialCommunityIcons
                name="play-circle"
                size={24}
                color={!intervaloAberto ? "#aaa" : "#4481EB"}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  !intervaloAberto ? styles.actionButtonTextDisabled : null
                ]}
              >
                Finalizar Pausa
              </Text>
            </TouchableOpacity>
          </View>

          {/* Se o intervalo estiver activo, mostrar cronómetro de pausa */}
          {intervaloAberto && (
            <View style={styles.pauseTimerContainer}>
              <MaterialCommunityIcons name="timer-sand" size={20} color="#FF9800" />
              <Text style={styles.pauseTimerText}>
                Tempo em pausa: {tempoDecorrido}
              </Text>
            </View>
          )}
        </View>

        {/* Resumo do dia */}
        <View style={styles.registoSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Registo de Hoje</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={irParaListarRegistos}
            >
              <Text style={styles.viewAllText}>Ver Histórico</Text>
              <Ionicons name="chevron-forward" size={16} color="#4481EB" />
            </TouchableOpacity>
          </View>

          {renderRegistoDiario()}

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={40} color="#ff6b6b" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </ScrollView>
  );
};

// ----------------------------------------------------------------
// Estilos
// ----------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    width: '100%',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 15,
  },
  clockContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 5,
  },
  clockText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    marginTop: -20,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  qrSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  qrCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  qrInstructions: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 14,
    color: '#555',
    maxWidth: '90%',
  },
  scanButton: {
    width: '100%',
    marginVertical: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scanButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  scannerWrapper: {
    width: '100%',
    marginVertical: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f7fa',
    padding: 10,
  },
  qrScanner: {
    width: '100%',
    height: 400,
  },
  actionsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fa',
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonActive: {
    backgroundColor: '#4481EB',
    borderColor: '#4481EB',
  },
  actionButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#e0e0e0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4481EB',
    marginLeft: 6,
  },
  actionButtonTextActive: {
    color: '#fff',
  },
  actionButtonTextDisabled: {
    color: '#aaa',
  },
  pauseTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginTop: 15,
  },
  pauseTimerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 8,
  },
  registoSection: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4481EB',
    fontWeight: '500',
  },
  card: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  timeRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeSeparator: {
    width: 40,
    alignItems: 'center',
  },
  timeLine: {
    height: 1,
    width: '100%',
    backgroundColor: '#e0e0e0',
  },
  timeLabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 6,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
  },
  hoursContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    backgroundColor: '#f8f9ff',
    borderRadius: 8,
    marginTop: 10,
  },
  hoursItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursSeparator: {
    width: 1,
    height: '80%',
    backgroundColor: '#e0e0e0',
  },
  hoursText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 10,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
  },
});

export default LeitorQRCode;
