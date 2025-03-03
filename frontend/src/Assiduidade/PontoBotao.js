
import React, { useEffect, useState, useCallback } from 'react';
import { View, Linking, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const PontoBotao = () => {
    const [registosDiarios, setRegistosDiarios] = useState([]);
    const [filteredRegistos, setFilteredRegistos] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [intervaloAberto, setIntervaloAberto] = useState(false);
    const [horaInicioIntervalo, setHoraInicioIntervalo] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [tempoDecorrido, setTempoDecorrido] = useState('00:00:00');
    const [temporizadorAtivo, setTemporizadorAtivo] = useState(false);
    const [inicioTemporizador, setInicioTemporizador] = useState(null);
    const [tempoPausado, setTempoPausado] = useState(0);
    const [saídaRegistrada, setSaidaRegistrada] = useState(false);
    const [endereco, setEndereco] = useState('');
    const [animatedValue] = useState(new Animated.Value(0));
    const [expandCard, setExpandCard] = useState(false);

    const navigation = useNavigation();

    // Animação para o contador de tempo
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true
                })
            ])
        ).start();
    }, []);

    const pulseAnimation = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.05]
    });

    // Função para redirecionar para ListarRegistos
    const irParaListarRegistos = () => {
        navigation.navigate('ListarRegistos');
    };

    // Obter o último registo diário para verificar se já existe uma saída registrada
    const ultimoRegisto = registosDiarios[registosDiarios.length - 1];
    const existeSaida = ultimoRegisto?.horaSaida !== null;

    // Atualiza o relógio a cada segundo
    useEffect(() => {
        const carregarHoraEntrada = async () => {
            let horaEntradaSalva = localStorage.getItem('horaEntrada');
    
            if (!horaEntradaSalva) {
                console.log("LocalStorage está vazio. A tentar buscar do backend...");
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
                        const registoHoje = data.find((registo) => registo.data === new Date().toISOString().split('T')[0]);
    
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

    useEffect(() => {
        let interval;
        if (temporizadorAtivo && inicioTemporizador && !saídaRegistrada) {
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
    }, [temporizadorAtivo, inicioTemporizador, tempoPausado, saídaRegistrada]);
    
    useEffect(() => {
        if (ultimoRegisto?.horaSaida) {
            setSaidaRegistrada(true);
            setTemporizadorAtivo(false);
        } else {
            setSaidaRegistrada(false);
        }
    }, [ultimoRegisto]);
    
    useEffect(() => {
        let intervaloCronometro;
        if (intervaloAberto && horaInicioIntervalo) {
            intervaloCronometro = setInterval(() => {
                const agora = new Date();
                const diferenca = agora - new Date(horaInicioIntervalo);
                const horas = String(Math.floor(diferenca / (1000 * 60 * 60))).padStart(2, '0');
                const minutos = String(Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
                const segundos = String(Math.floor((diferenca % (1000 * 60)) / 1000)).padStart(2, '0');
                setTempoDecorrido(`${horas}:${minutos}:${segundos}`);
            }, 1000);
        } else {
            setTempoDecorrido('00:00:00');
        }
    
        return () => clearInterval(intervaloCronometro);
    }, [intervaloAberto, horaInicioIntervalo]);
    
    useEffect(() => {
        fetchRegistosDiarios();
    }, []);

    const filtrarRegistos = useCallback(() => {
        const hoje = new Date().toISOString().split('T')[0];
        return registosDiarios.filter((registo) => registo.data === hoje);
    }, [registosDiarios]);

    useEffect(() => {
        const registosFiltrados = filtrarRegistos();
        setFilteredRegistos(registosFiltrados);
    }, [filtrarRegistos]);
    
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

    const obterLocalizacao = () => {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                console.log("Tentando obter localização...");
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const coords = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                        };
                        console.log("Localização obtida com sucesso:", coords);
                        resolve(coords);
                    },
                    (error) => {
                        console.error("Erro ao obter localização:", error.message);
                        console.log("Usando localização padrão.");
                        // Fallback para Lisboa
                        resolve({ latitude: 38.736946, longitude: -9.142685 });
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } else {
                console.warn("Geolocalização não suportada.");
                // Fallback manual
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

    const mostrarEndereco = async () => {
        const coordenadas = await obterCoordenadasDoBackend();
        if (coordenadas) {
            const enderecoObtido = await getEnderecoPorCoordenadas(coordenadas.latitude, coordenadas.longitude);
            setEndereco(enderecoObtido);
        } else {
            setEndereco("Coordenadas não disponíveis");
        }
    };

    useEffect(() => {
        mostrarEndereco();
    }, []);

    useEffect(() => {
        const carregarEstadoInicial = async () => {
            const estadoLocal = JSON.parse(localStorage.getItem('intervaloAberto'));

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

    const obterCoordenadasDoBackend = async () => {
        const token = localStorage.getItem('loginToken');
        const response = await fetch('https://backend.advir.pt/api/registoPonto/diario', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            const ultimoRegisto = data[0];
            return {
                latitude: ultimoRegisto.latitude,
                longitude: ultimoRegisto.longitude,
            };
        } else {
            console.error("Erro ao obter coordenadas do backend");
            return null;
        }
    };

    const registarPonto = async () => {
        try {
            console.log("A carregar localização...");
            
            const localizacao = await obterLocalizacao(); 
            const endereco = await getEnderecoPorCoordenadas(localizacao.latitude, localizacao.longitude);
            setInicioTemporizador(new Date());
            setTemporizadorAtivo(true);
            setTempoPausado(0);
            console.log("Endereço obtido:", endereco);

            const horaAtual = new Date().toISOString();
            localStorage.setItem('horaEntrada', horaAtual);
            setInicioTemporizador(new Date(horaAtual));
            setTemporizadorAtivo(true);

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
                }),
            });

            if (response.ok) {
                await response.json();
                alert(`Registo realizado com sucesso!`);
                await fetchRegistosDiarios();
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Erro ao registar ponto.');
            }
        } catch (error) {
            console.error("Erro ao registar ponto:", error);
            alert('Erro de comunicação com o servidor.');
        }
    };

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

            const response = await fetch('https://backend.advir.pt/api/intervalo/iniciarIntervalo', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                alert("Intervalo iniciado com sucesso.");
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
                setTemporizadorAtivo(true);
                setIntervaloAberto(false);
                setHoraInicioIntervalo(null);
                localStorage.removeItem('intervaloAberto');
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

    // Determinar o status atual para exibir texto apropriado
    const getStatusText = () => {
        if (saídaRegistrada) {
            return "Dia finalizado";
        } else if (intervaloAberto) {
            return "Em pausa";
        } else if (temporizadorAtivo) {
            return "Trabalhando";
        } else {
            return "Não iniciado";
        }
    };

    // Obter a cor adequada para o estado atual
    const getStatusColor = () => {
        if (saídaRegistrada) {
            return ['#4F7942', '#2E8B57'];
        } else if (intervaloAberto) {
            return ['#FF8C00', '#FFA500']; 
        } else if (temporizadorAtivo) {
            return ['#4481EB', '#04BEFE'];
        } else {
            return ['#7F8C8D', '#95A5A6'];
        }
    };

    // Obter o ícone para o status atual
    const getStatusIcon = () => {
        if (saídaRegistrada) {
            return <MaterialCommunityIcons name="check-circle-outline" size={28} color="#ffffff" />;
        } else if (intervaloAberto) {
            return <MaterialCommunityIcons name="pause-circle-outline" size={28} color="#ffffff" />;
        } else if (temporizadorAtivo) {
            return <MaterialCommunityIcons name="clock-outline" size={28} color="#ffffff" />;
        } else {
            return <MaterialCommunityIcons name="timer-sand-empty" size={28} color="#ffffff" />;
        }
    };

    const toggleCardExpand = () => {
        setExpandCard(!expandCard);
    };

    // Função para exibir o histórico do dia atual se existir
    const renderHistoricoDia = () => {
        if (filteredRegistos.length === 0) return null;
        
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
        
        const abrirMaps = () => {
            if (item.latitude && item.longitude) {
                const mapsUrl = `https://www.google.com/maps?q=${item.latitude},${item.longitude}`;
                Linking.openURL(mapsUrl);
            } else {
                alert('Coordenadas não disponíveis.');
            }
        };

        return (
            <View style={styles.todaySummary}>
                <View style={styles.todayHeader}>
                    <Text style={styles.todayTitle}>Resumo de Hoje</Text>
                    <TouchableOpacity onPress={toggleCardExpand}>
                        <Ionicons 
                            name={expandCard ? "chevron-up" : "chevron-down"} 
                            size={24} 
                            color="#555" 
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.timeRow}>
                    <View style={styles.timeItem}>
                        <Text style={styles.timeLabel}>Entrada</Text>
                        <Text style={styles.timeValue}>{horaEntrada}</Text>
                    </View>
                    
                    <View style={styles.timeArrow}>
                        <Ionicons name="arrow-forward" size={20} color="#ccc" />
                    </View>
                    
                    <View style={styles.timeItem}>
                        <Text style={styles.timeLabel}>Saída</Text>
                        <Text style={styles.timeValue}>{horaSaida}</Text>
                    </View>
                </View>

                {expandCard && (
                    <>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <MaterialCommunityIcons name="clock-time-four-outline" size={22} color="#4481EB" />
                                <View>
                                    <Text style={styles.statLabel}>Horas</Text>
                                    <Text style={styles.statValue}>{totalHorasDia}h</Text>
                                </View>
                            </View>
                            
                            <View style={styles.statBox}>
                                <MaterialCommunityIcons name="coffee-outline" size={22} color="#4481EB" />
                                <View>
                                    <Text style={styles.statLabel}>Pausas</Text>
                                    <Text style={styles.statValue}>{parseFloat(totalTempoIntervalo).toFixed(2)}h</Text>
                                </View>
                            </View>
                        </View>
                        
                        <TouchableOpacity style={styles.locationButton} onPress={abrirMaps}>
                            <MaterialCommunityIcons name="map-marker-outline" size={18} color="#fff" />
                            <Text style={styles.locationButtonText}>Ver Local de Registo</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        );
    };

    // Renderização principal
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Cabeçalho */}
            <View style={styles.header}>
                <LinearGradient
                    colors={['#4481EB', '#04BEFE']}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.dateText}>
                                {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </Text>
                            <Text style={styles.headerTitle}>Registo de Ponto</Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.historyButton}
                            onPress={irParaListarRegistos}
                        >
                            <MaterialCommunityIcons name="history" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </View>

            <View style={styles.content}>
                {/* Timer Card */}
                <View style={styles.timerCard}>
                    <LinearGradient
                        colors={getStatusColor()}
                        style={styles.statusBadge}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {getStatusIcon()}
                        <Text style={styles.statusText}>{getStatusText()}</Text>
                    </LinearGradient>

                    <Animated.View 
                        style={[
                            styles.timerDisplay, 
                            temporizadorAtivo || intervaloAberto ? 
                            { transform: [{ scale: pulseAnimation }] } : null
                        ]}
                    >
                        <Text style={styles.timerText}>{tempoDecorrido}</Text>
                    </Animated.View>

                    {/* Ações principais */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity 
                            style={[
                                styles.actionButton, 
                                styles.startButton,

                            ]}
                            onPress={registarPonto}
                        >
                            <MaterialCommunityIcons name="play-circle-outline" size={24} color="#fff" />
                            <Text style={styles.actionButtonText}>Ponto</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[
                                styles.actionButton, 
                                styles.pauseButton,
                                (!temporizadorAtivo || intervaloAberto || saídaRegistrada) && styles.disabledButton
                            ]}
                            onPress={iniciarIntervalo}
                            disabled={!temporizadorAtivo || intervaloAberto || saídaRegistrada}
                        >
                            <MaterialCommunityIcons name="pause-circle-outline" size={24} color="#fff" />
                            <Text style={styles.actionButtonText}>Pausar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[
                                styles.actionButton, 
                                styles.resumeButton,
                                (!intervaloAberto || saídaRegistrada) && styles.disabledButton
                            ]}
                            onPress={finalizarIntervalo}
                            disabled={!intervaloAberto || saídaRegistrada}
                        >
                            <MaterialCommunityIcons name="restart" size={24} color="#fff" />
                            <Text style={styles.actionButtonText}>Retomar</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Histórico do dia atual */}
                {renderHistoricoDia()}

                {/* Estado vazio */}
                {filteredRegistos.length === 0 && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="calendar-clock" size={80} color="#e0e0e0" />
                        <Text style={styles.emptyStateTitle}>Sem registo hoje</Text>
                        <Text style={styles.emptyStateText}>
                            Clique em "Iniciar" para registar seu ponto de entrada
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#d4e4ff',
    },
    header: {
        width: '100%',
    },
    headerGradient: {
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        paddingTop: 40,
        paddingBottom: 30,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#ffffff',
        marginTop: 4,
    },
    dateText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    historyButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    timerCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        marginTop: -20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginBottom: 20,
    },
    statusText: {
        color: '#ffffff',
        fontWeight: '600',
        marginLeft: 6,
        fontSize: 15,
    },
    timerDisplay: {
        backgroundColor: '#f6f8fa',
        width: '100%',
        paddingVertical: 30,
        borderRadius: 14,
        marginBottom: 25,
        alignItems: 'center',
    },
    timerText: {
        fontSize: 40,
        fontWeight: '700',
        color: '#333',
        fontFamily: 'monospace',
        letterSpacing: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        marginHorizontal: 6,
    },
    startButton: {
        backgroundColor: '#4CAF50',
    },
    pauseButton: {
        backgroundColor: '#FF9800',
    },
    resumeButton: {
        backgroundColor: '#2196F3',
    },
    disabledButton: {
        backgroundColor: '#E0E0E0',
        opacity: 0.7,
    },
    actionButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        marginTop: 6,
        fontSize: 14,
    },
    todaySummary: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        marginTop: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    todayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    todayTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    timeItem: {
        flex: 1,
        backgroundColor: '#f5f7fa',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    timeArrow: {
        paddingHorizontal: 10,
    },
    timeLabel: {
        fontSize: 13,
        color: '#777',
        marginBottom: 5,
    },
    timeValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f7fa',
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#777',
        marginLeft: 10,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 10,
    },
    locationButton: {
        backgroundColor: '#4481EB',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    locationButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 15,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 20,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginTop: 20,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 15,
        color: '#777',
        textAlign: 'center',
        maxWidth: '80%',
    },
});

export default PontoBotao;
