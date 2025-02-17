import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { View, Text, ScrollView, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';


const LeitorQRCode = () => {
    const [horaAtual, setHoraAtual] = useState(new Date());
    const [registosDiarios, setRegistosDiarios] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [intervaloAberto, setIntervaloAberto] = useState(false);
    const [horaInicioIntervalo, setHoraInicioIntervalo] = useState(null);
    const [tempoDecorrido, setTempoDecorrido] = useState('00:00:00');

    const navigation = useNavigation(); // Hook de navegação

    const irParaListarRegistos = () => {
        navigation.navigate('ListarRegistos');
    };

    const qrData = "registo-ponto";

    const ultimoRegisto = registosDiarios[registosDiarios.length - 1];
    const existeSaida = ultimoRegisto?.horaSaida !== null;

    useEffect(() => {
        const interval = setInterval(() => setHoraAtual(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

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

    useEffect(() => {
        const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        scanner.render(
            async (text) => {
                if (text === qrData) {
                    try {
                        const response = await fetch('https://backend.advir.pt/api/registoPonto/ler-qr', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('loginToken')}`,
                                'Content-Type': 'application/json',
                            },
                        });

                        if (response.ok) {
                            const result = await response.json();
                            alert(result.message);
                            await fetchRegistosDiarios();
                        } else {
                            const errorData = await response.json();
                            alert(errorData.message || 'Erro ao registar ponto.');
                        }
                    } catch (error) {
                        console.error('Erro ao registar ponto:', error);
                        alert('Erro de comunicação com o servidor.');
                    }
                } else {
                    alert('Código QR inválido para registo de ponto.');
                }
            },
            (error) => {
                console.error(error);
                alert('Erro ao ler o QR code.');
            }
        );

        return () => {
            scanner.clear().catch((error) => console.error("Erro ao limpar scanner:", error));
        };
    }, []);

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
                console.log("Dados recebidos do backend:", data);

                const hoje = new Date().toISOString().split('T')[0];
                const registoHoje = data.find((registo) => registo.data === hoje);

                setRegistosDiarios(registoHoje ? [registoHoje] : []);
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

    const iniciarIntervalo = async () => {
        try {
            const token = localStorage.getItem('loginToken');
            const agora = new Date();
            setHoraInicioIntervalo(agora);
            setIntervaloAberto(true);

            const response = await fetch('https://backend.advir.pt/api/intervalo/iniciarIntervalo', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                alert("Intervalo iniciado com sucesso.");
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

    const renderItem = ({ item }) => {
        const totalHorasTrabalhadas = item.totalHorasTrabalhadas || 0;
        const totalTempoIntervalo = item.totalTempoIntervalo || 0;

        const totalHorasDia = !isNaN(totalHorasTrabalhadas) && !isNaN(totalTempoIntervalo)
            ? (totalHorasTrabalhadas - totalTempoIntervalo).toFixed(2)
            : '0.00';

        const horaEntrada = item.horaEntrada
            ? new Date(new Date(item.horaEntrada).getTime() - 60 * 60 * 1000).toLocaleTimeString()
            : 'N/A';
        
        const horaSaida = item.horaSaida
            ? new Date(new Date(item.horaSaida).getTime() - 60 * 60 * 1000).toLocaleTimeString()
            : 'N/A';

        return (
            <View style={styles.card}>
                <Text style={styles.cardDate}>Dia: {item.data}</Text>
                <View style={styles.cardContent}>
                    <View style={styles.cardRow}>
                        <FontAwesome name="sign-in" size={16} color="#1792FE" style={styles.icon} />
                        <Text style={styles.registoText}>Entrada: {horaEntrada}</Text>
                    </View>
                    <View style={styles.cardRow}>
                        <FontAwesome name="sign-out" size={16} color="#1792FE" style={styles.icon} />
                        <Text style={styles.registoText}>Saída: {horaSaida}</Text>
                    </View>
                    <View style={styles.cardRow}>
                        <FontAwesome name="clock-o" size={16} color="#1792FE" style={styles.icon} />
                        <Text style={styles.registoText}>Total Horas: {totalHorasDia} horas</Text>
                    </View>
                    <View style={styles.cardRow}>
                        <FontAwesome name="pause-circle" size={16} color="#1792FE" style={styles.icon} />
                        <Text style={styles.registoText}>Total Pausa: {parseFloat(totalTempoIntervalo).toFixed(2)} horas</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                <Text style={styles.title}>Registo Ponto</Text>
                <View style={styles.clockContainer}>
                    <Text style={styles.clock}>{horaAtual.toLocaleTimeString()}</Text>
                </View>

                <View style={styles.qrContainer}>
                    <QRCode value={qrData} size={Dimensions.get('window').width * 0.3} />
                    <Text style={styles.instructions}>Use o telemóvel para ler o QR code e registar o ponto.</Text>
                </View>

                <View id="reader" style={styles.qrScanner}></View>

                <TouchableOpacity
                    style={[styles.button, styles.buttonWarning]}
                    onPress={iniciarIntervalo}
                    disabled={intervaloAberto || existeSaida}
                >
                    <FontAwesome name="pause" size={20} color="#1792FE" style={styles.icon} />
                    <Text style={styles.buttonText}></Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.buttonSuccess]}
                    onPress={finalizarIntervalo}
                    disabled={!intervaloAberto || existeSaida}
                >
                    <FontAwesome name="play" size={20} color="#1792FE" style={styles.icon} />
                    <Text style={styles.buttonText}></Text>
                </TouchableOpacity>

                {intervaloAberto && (
                    <Text style={styles.tempoDecorrido}>Tempo em Intervalo: {tempoDecorrido}</Text>
                )}
                
                {registosDiarios.length > 0 ? (
                    renderItem({ item: registosDiarios[0] })
                ) : (
                    <Text>Sem registo para o dia de hoje.</Text>
                )}
                <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary, styles.buttonText]}
                    onPress={irParaListarRegistos} // Chama a função de navegação
                >Ver Registos</TouchableOpacity>
            </View>
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
        color: '#1792FE',
        marginVertical: 20,
    },
    clockContainer: {
        padding: 15,
        backgroundColor: '#e3ebff',
        borderRadius: 10,
        marginBottom: 20,
    },
    clock: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#333',
    },
    qrContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    qrScanner: {
        width: 300,
        height: 300,
        marginBottom: 20,
    },
    instructions: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginTop: 10,
    },
    button: {
        width: '80%',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    buttonWarning: {
        backgroundColor: '#e3ebff',
        borderWidth: 2,
        borderColor: '#1792FE',
    },
    buttonSuccess: {
        backgroundColor: '#e3ebff',
        borderWidth: 2,
        borderColor: '#1792FE',
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1792FE',
        marginLeft: 8,
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
        borderLeftColor: '#1792FE',
    },
    cardDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1792FE',
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
    tempoDecorrido: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ff9800',
        marginTop: 20,
    },
    error: {
        color: 'red',
        marginTop: 10,
    },
});

export default LeitorQRCode;