
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions, Animated } from 'react-native';
import { FontAwesome, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import EditarModal from './EditarModal';
import ModalPedidosAlteracao from './ModalPedidosAlteracao';
import { secureStorage } from '../../utils/secureStorage';

const RegistoItem = ({ item, onEdit }) => {
    const [endereco, setEndereco] = useState("Carregando...");
    const [expandedCard, setExpandedCard] = useState(false);
    const slideAnimation = useState(new Animated.Value(0))[0];

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

    const toggleExpand = () => {
        const toValue = expandedCard ? 0 : 1;
        Animated.timing(slideAnimation, {
            toValue,
            duration: 300,
            useNativeDriver: false
        }).start();
        setExpandedCard(!expandedCard);
    };




    const dataAtual = new Date(); // agora
    const dataDoRegisto = new Date(item.data);

    // verifica se o dia não tem entrada nem saída
    const registoIncompleto = !item.horaEntrada && !item.horaSaida;

    // verifica se é anterior a hoje
    const diaAnteriorAHoje = dataDoRegisto < new Date(dataAtual.toDateString()); // remove a hora

    const mostrarAlerta = registoIncompleto && diaAnteriorAHoje;


    const getEnderecoPorCoordenadas = async (latitude, longitude) => {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data?.display_name || "Endereço não encontrado";
        } catch (error) {
            console.error("Erro ao obter o endereço:", error);
            return "Erro ao obter endereço";
        }
    };

    useEffect(() => {
        const obterEndereco = async () => {
            if (item.latitude && item.longitude) {
                const enderecoObtido = await getEnderecoPorCoordenadas(item.latitude, item.longitude);
                setEndereco(enderecoObtido);
            } else {
                setEndereco("Coordenadas não disponíveis");
            }
        };
        obterEndereco();
    }, [item.latitude, item.longitude]);

    const locationHeight = slideAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 80]
    });

    const formatDate = (dateString) => {
        const options = { weekday: 'short', day: 'numeric', month: 'long' };
        return new Date(dateString).toLocaleDateString('pt-PT', options);
    };

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
                        {mostrarAlerta && (
                            <MaterialCommunityIcons
                                name="alert-circle"
                                size={20}
                                color="#FFA500"
                                style={{ marginLeft: 6 }}
                            />
                        )}
                    </View>


                    <TouchableOpacity onPress={toggleExpand} style={styles.expandButton}>
                        <Ionicons
                            name={expandedCard ? "chevron-up-circle" : "chevron-down-circle"}
                            size={22}
                            color="#4481EB"
                        />
                    </TouchableOpacity>
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

                <Animated.View style={[styles.locationContainer, { height: locationHeight, opacity: slideAnimation }]}>
                    <View style={styles.locationContent}>
                        <MaterialCommunityIcons name="map-marker" size={16} color="#4481EB" />
                        <Text numberOfLines={2} style={styles.locationText}>{endereco}</Text>
                    </View>
                </Animated.View>

                {expandedCard && (
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => onEdit(item)}
                    >
                        <LinearGradient
                            colors={['#4481EB', '#04BEFE']}
                            style={styles.editButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
                            <Text style={styles.editButtonText}>Editar Registo</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </LinearGradient>
        </View>
    );
};

// Componente principal
const ListarRegistos = () => {
    const [historicoPontos, setHistoricoPontos] = useState([]);
    const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [registoSelecionado, setRegistoSelecionado] = useState(null);
    const [modalPedidosVisible, setModalPedidosVisible] = useState(false);

    const [fadeAnimation] = useState(new Animated.Value(0));

    const windowWidth = Dimensions.get('window').width;
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    useEffect(() => {
        Animated.timing(fadeAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
        }).start();
    }, []);

    const openEditModal = (registo) => {
        setRegistoSelecionado(registo);
        setModalVisible(true);
    };

    useEffect(() => {
        fetchHistoricoPontos();
    }, [mesSelecionado, anoSelecionado]);


    const gerarDiasDoMes = (mes, ano) => {
        const dias = [];
        const totalDias = new Date(ano, mes, 0).getDate(); // último dia do mês atual

        for (let dia = 1; dia <= totalDias; dia++) {
            dias.push({ data: new Date(ano, mes - 1, dia) }); // atenção: mês é zero-based
        }

        return dias;
    };



    const fetchHistoricoPontos = async () => {
        setLoading(true);
        try {
            const empresaSelecionada = secureStorage.getItem("empresaSelecionada");
            const response = await fetch(`https://backend.advir.pt/api/registoPonto/listar?mes=${mesSelecionado}&ano=${anoSelecionado}&empresa=${empresaSelecionada}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${secureStorage.getItem('loginToken')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                const registos = data || [];

                // Gerar todos os dias do mês atual
                const diasDoMes = gerarDiasDoMes(mesSelecionado, anoSelecionado);

                // Mapear cada dia com o registo se existir
                const diasComRegistos = diasDoMes.map(({ data }) => {
                    const dataISO = new Date(data).toLocaleDateString('pt-PT', {
                        timeZone: 'Europe/Lisbon',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }).split('/').reverse().join('-');


                    const registoDoDia = registos.find(reg => {
                        const dataReg = new Date(reg.data).toLocaleDateString('pt-PT', {
                            timeZone: 'Europe/Lisbon',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        }).split('/').reverse().join('-'); // formato YYYY-MM-DD

                        return dataReg === dataISO;
                    });


                    return registoDoDia || { data: dataISO }; // se não houver registo, mantém só a data
                });

                setHistoricoPontos(diasComRegistos);
            } else {
                setErrorMessage('Erro ao obter histórico de pontos.');
                setHistoricoPontos([]);
            }
        } catch (error) {
            console.error('Erro ao obter histórico de pontos:', error);
            setHistoricoPontos([]);
        } finally {
            setLoading(false);
        }
    };


    const nextMonth = () => {
        if (mesSelecionado === 12) {
            setMesSelecionado(1);
            setAnoSelecionado(anoSelecionado + 1);
        } else {
            setMesSelecionado(mesSelecionado + 1);
        }
    };

    const prevMonth = () => {
        if (mesSelecionado === 1) {
            setMesSelecionado(12);
            setAnoSelecionado(anoSelecionado - 1);
        } else {
            setMesSelecionado(mesSelecionado - 1);
        }
    };

    // Calcular o sumário do mês
    const calcularSumarioMes = () => {
        if (historicoPontos.length === 0) return { dias: 0, horasTotais: 0 };

        const dias = historicoPontos.length;
        let horasTotais = 0;

        historicoPontos.forEach(item => {
            const horasTrabalhadas = parseFloat(item.totalHorasTrabalhadas || 0);
            const tempoIntervalo = parseFloat(item.totalTempoIntervalo || 0);

            if (!isNaN(horasTrabalhadas) && !isNaN(tempoIntervalo)) {
                horasTotais += horasTrabalhadas - tempoIntervalo;
            }
        });

        return {
            dias,
            horasTotais: horasTotais.toFixed(2)
        };
    };

    const sumario = calcularSumarioMes();

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <LinearGradient
                colors={['#4481EB', '#04BEFE']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Histórico de Registos</Text>
                    <Text style={styles.headerSubtitle}>Consulte seus registos de ponto</Text>
                </View>
                <TouchableOpacity
                    style={{ marginTop: 10, backgroundColor: '#fff', padding: 10, borderRadius: 10 }}
                    onPress={() => setModalPedidosVisible(true)}
                >
                    <Text style={{ textAlign: 'center', color: '#4481EB', fontWeight: 'bold' }}>
                        Ver Pedidos de Alteração
                    </Text>
                </TouchableOpacity>

            </LinearGradient>

            <Animated.View
                style={[
                    styles.contentContainer,
                    {
                        opacity: fadeAnimation, transform: [{
                            translateY: fadeAnimation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [50, 0],
                            })
                        }]
                    }
                ]}
            >
                <View style={styles.filterCard}>


                    <View style={styles.monthSelector}>
                        <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
                            <Ionicons name="chevron-back" size={22} color="#4481EB" />
                        </TouchableOpacity>

                        <View style={styles.monthDisplay}>
                            <Text style={styles.monthText}>{months[mesSelecionado - 1]}</Text>
                            <Text style={styles.yearText}>{anoSelecionado}</Text>
                        </View>

                        <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
                            <Ionicons name="chevron-forward" size={22} color="#4481EB" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryItem}>
                            <MaterialCommunityIcons name="calendar-check" size={20} color="#4481EB" />
                            <View style={styles.summaryTextContainer}>
                                <Text style={styles.summaryValue}>{sumario.dias}</Text>
                                <Text style={styles.summaryLabel}>Dias</Text>
                            </View>
                        </View>

                        <View style={styles.summaryDivider}></View>

                        <View style={styles.summaryItem}>
                            <MaterialCommunityIcons name="clock-time-five" size={20} color="#4481EB" />
                            <View style={styles.summaryTextContainer}>
                                <Text style={styles.summaryValue}>{sumario.horasTotais}</Text>
                                <Text style={styles.summaryLabel}>Horas</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <MaterialCommunityIcons name="alert-circle" size={40} color="#ff6b6b" />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4481EB" />
                        <Text style={styles.loadingText}>Carregando registos...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={historicoPontos}
                        keyExtractor={(item) => `${item.id}`}
                        renderItem={({ item }) => <RegistoItem item={item} onEdit={openEditModal} />}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="calendar-blank" size={60} color="#d1dbed" />
                                <Text style={styles.emptyTitle}>Sem registos para o período</Text>
                                <Text style={styles.emptyText}>Não foram encontrados registos de ponto para o mês e ano selecionados.</Text>
                            </View>
                        }
                    />
                )}
            </Animated.View>

            <EditarModal
                visible={modalVisible}
                registo={registoSelecionado}
                onClose={() => setModalVisible(false)}
                onSave={() => fetchHistoricoPontos()}
            />
            <ModalPedidosAlteracao
                visible={modalPedidosVisible}
                onClose={() => setModalPedidosVisible(false)}
            />

        </ScrollView>

    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#d4e4ff',
    },
    scrollContent: {
        flexGrow: 1,
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
    },
    contentContainer: {
        flex: 1,
        marginTop: -20,
        paddingHorizontal: 16,
    },
    filterCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 15,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 5,
        marginBottom: 15,
    },
    monthArrow: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: '#f5f7fa',
    },
    monthDisplay: {
        alignItems: 'center',
    },
    monthText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    yearText: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    summaryContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 15,
    },
    summaryItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#f0f0f0',
    },
    summaryTextContainer: {
        marginLeft: 10,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#777',
    },
    listContainer: {
        paddingBottom: 20,
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
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
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
    expandButton: {
        padding: 5,
    },
    timeRowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
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
        paddingHorizontal: 15,
        backgroundColor: '#f8f9ff',
        borderRadius: 8,
        marginHorizontal: 15,
        marginBottom: 12,
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
    locationContainer: {
        paddingHorizontal: 15,
        overflow: 'hidden',
    },
    locationContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#f0f4ff',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    locationText: {
        fontSize: 12,
        color: '#555',
        marginLeft: 8,
        flex: 1,
    },
    editButton: {
        paddingHorizontal: 15,
        paddingBottom: 15,
    },
    editButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        paddingVertical: 10,
    },
    editButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 6,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    errorText: {
        marginTop: 10,
        fontSize: 16,
        color: '#ff6b6b',
        textAlign: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 20,
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
        maxWidth: '80%',
    },
});

export default ListarRegistos;
