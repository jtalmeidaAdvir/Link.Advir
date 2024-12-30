import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Picker, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import EditarModal from './EditarModal';


const RegistoItem = ({ item, onEdit }) => {
    const [endereco, setEndereco] = useState("Carregando...");
    const totalHorasTrabalhadas = item.totalHorasTrabalhadas || 0;
    const totalTempoIntervalo = item.totalTempoIntervalo || 0;
    const latitude = item.latitude || 'N/A';
    const longitude = item.longitude || 'N/A';
    const totalHorasDia = !isNaN(totalHorasTrabalhadas) && !isNaN(totalTempoIntervalo)
        ? (totalHorasTrabalhadas - totalTempoIntervalo).toFixed(2)
        : '0.00';

        const horaEntrada = item.horaEntrada
        ? new Date(item.horaEntrada).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '';
    
    const horaSaida = item.horaSaida
        ? new Date(item.horaSaida).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '';
    
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

    return (
        <View style={styles.card}>
            <Text style={styles.cardDate}>Dia: {new Date(item.data).toLocaleDateString('pt-PT')}</Text>
            <View style={styles.cardContent}>
                <View style={styles.cardRow}>
                    <FontAwesome name="sign-in" size={16} color="#0022FF" style={styles.icon} />
                    <Text style={styles.registoText}>Entrada: {item.horaEntrada ? new Date(item.horaEntrada).toLocaleTimeString('pt-PT') : "N/A"}</Text>
                </View>
                <View style={styles.cardRow}>
                    <FontAwesome name="sign-out" size={16} color="#0022FF" style={styles.icon} />
                    <Text style={styles.registoText}>Saída: {item.horaSaida ? new Date(item.horaSaida).toLocaleTimeString('pt-PT') : "N/A"}</Text>
                </View>
                <View style={styles.cardRow}>
                    <FontAwesome name="clock-o" size={16} color="#0022FF" style={styles.icon} />
                    <Text style={styles.registoText}>Horas Trabalhadas: {totalHorasDia} horas</Text>
                </View>
                <View style={styles.cardRow}>
                    <FontAwesome name="pause-circle" size={16} color="#0022FF" style={styles.icon} />
                    <Text style={styles.registoText}>Horas de Pausa: {parseFloat(totalTempoIntervalo).toFixed(2)} horas</Text>
                </View>
                <View style={styles.cardRow}>
                    <FontAwesome name="map-marker" size={16} color="#0022FF" style={styles.icon} />
                    <Text style={styles.registoText}>Latitude: {item.latitude || "N/A"}</Text>
                </View>
                <View style={styles.cardRow}>
                    <FontAwesome name="map-marker" size={16} color="#0022FF" style={styles.icon} />
                    <Text style={styles.registoText}>Longitude: {item.longitude || "N/A"}</Text>
                </View>
                <View style={styles.cardRow}>
                    <FontAwesome name="map-marker" size={16} color="#0022FF" style={styles.icon} />
                    <Text style={styles.registoText}>Endereço: {endereco}</Text>
                </View>
                <TouchableOpacity onPress={() => onEdit(item)} style={styles.editButton}>
                    <FontAwesome name="edit" size={16} color="#0022FF" />
                    <Text>Editar</Text>
                </TouchableOpacity>
            </View>
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

    const windowWidth = Dimensions.get('window').width;

    const openEditModal = (registo) => {
        setRegistoSelecionado(registo);
        setModalVisible(true);
    };

    useEffect(() => {
        fetchHistoricoPontos();
    }, [mesSelecionado, anoSelecionado]);

    const fetchHistoricoPontos = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://192.168.1.4/api/registoPonto/listar?mes=${mesSelecionado}&ano=${anoSelecionado}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('loginToken')}` },
            });
    
            if (response.ok) {
                const data = await response.json();
                // Ordenar os registos em ordem decrescente pela data
                const registosOrdenados = (data || []).sort((a, b) => new Date(b.data) - new Date(a.data));
                setHistoricoPontos(registosOrdenados);
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
    

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={[styles.container, { paddingHorizontal: windowWidth * 0.05 }]}>
                <Text style={styles.title}>Histórico de Registos</Text>
                {errorMessage ? (
                    <Text style={styles.errorText}>{errorMessage}</Text>
                ) : loading ? (
                    <ActivityIndicator size="large" color="#0022FF" />
                ) : (
                    <>
                        <View style={styles.filterContainer}>
                            <Text style={styles.filterLabel}>Mês:</Text>
                            <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={mesSelecionado}
                                style={styles.picker}
                                onValueChange={(itemValue) => setMesSelecionado(itemValue)}
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                                    <Picker.Item key={mes} label={String(mes)} value={mes} />
                                ))}
                            </Picker>
                            </View>
                            <Text style={styles.filterLabel}>Ano:</Text>
                            <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={anoSelecionado}
                                style={styles.picker}
                                onValueChange={(itemValue) => setAnoSelecionado(itemValue)}
                            >
                                {[2023, 2024, 2025].map((ano) => (
                                    <Picker.Item key={ano} label={String(ano)} value={ano} />
                                ))}
                            </Picker>
                            </View>
                        </View>
                        <FlatList
                            data={historicoPontos}
                            keyExtractor={(item) => `${item.id}`}
                            renderItem={({ item }) => <RegistoItem item={item} onEdit={openEditModal} />}
                            ListEmptyComponent={<Text>Sem registos para o período selecionado.</Text>}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    </>
                )}
            </View>
            <EditarModal
                visible={modalVisible}
                registo={registoSelecionado}
                onClose={() => setModalVisible(false)}
                onSave={() => fetchHistoricoPontos()}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#d4e4ff',
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#0022FF',
        marginVertical: 20,
    },
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    filterLabel: {
        fontSize: 16,
        color: '#333',
        marginHorizontal: 10,
    },
    pickerContainer: {
        backgroundColor: '#e3ebff',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#0022FF',
        width: 100,
        marginRight: 10,
    },
    picker: {
        height: 40,
        width: '100%',
    },
    card: {
        padding: 15,
        marginVertical: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        width: '90%',
        alignSelf: 'center',
        borderLeftWidth: 5,
        borderLeftColor: '#0022FF',
    },
    cardDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0022FF',
        marginBottom: 5,
    },
    cardContent: {
        marginTop: 8,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 2,
    },
    registoText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 8,
    },
    icon: {
        marginRight: 5,
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
});

export default ListarRegistos;
