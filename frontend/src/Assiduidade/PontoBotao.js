import React, { useEffect, useState, useCallback } from 'react';
import { View, Linking, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Picker } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';


const PontoBotao = () => {
    const [registosDiarios, setRegistosDiarios] = useState([]);
    const [filteredRegistos, setFilteredRegistos] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [intervaloAberto, setIntervaloAberto] = useState(false);
    const [horaInicioIntervalo, setHoraInicioIntervalo] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Mês atual
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Ano atual
    const [tempoDecorrido, setTempoDecorrido] = useState('00:00:00');
    const [temporizadorAtivo, setTemporizadorAtivo] = useState(false);
    const [inicioTemporizador, setInicioTemporizador] = useState(null);
    const [tempoPausado, setTempoPausado] = useState(0);
    const [saídaRegistrada, setSaidaRegistrada] = useState(false);

    const navigation = useNavigation(); // Hook de navegação

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
                            localStorage.setItem('horaEntrada', horaEntradaSalva); // Atualiza o localStorage
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
        if (temporizadorAtivo && inicioTemporizador && !saídaRegistrada) { // Verifica se não há saída registrada
            interval = setInterval(() => {
                const agora = new Date();
                const diferenca = agora - inicioTemporizador + tempoPausado;
                const horas = String(Math.floor(diferenca / (1000 * 60 * 60))).padStart(2, '0');
                const minutos = String(Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
                const segundos = String(Math.floor((diferenca % (1000 * 60)) / 1000)).padStart(2, '0');
                setTempoDecorrido(`${horas}:${minutos}:${segundos}`);
            }, 1000);
        }
    
        // Limpar intervalo quando necessário
        return () => clearInterval(interval);
    }, [temporizadorAtivo, inicioTemporizador, tempoPausado, saídaRegistrada]);
    
    // Atualize o estado de `saídaRegistrada` ao verificar os registos
    useEffect(() => {
        if (ultimoRegisto?.horaSaida) {
            setSaidaRegistrada(true);
            setTemporizadorAtivo(false); // Para o temporizador
        } else {
            setSaidaRegistrada(false);
        }
    }, [ultimoRegisto]);
    



    // Atualiza o tempo decorrido a cada segundo quando o intervalo está aberto
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
    

    // Carrega os registos ao montar o componente
    useEffect(() => {
        fetchRegistosDiarios();
    }, []);

    // Função de filtragem que reage a mudanças em selectedMonth, selectedYear ou registosDiarios
    // Função de filtragem para exibir apenas o registo de hoje
const filtrarRegistos = useCallback(() => {
    const hoje = new Date().toISOString().split('T')[0];
    return registosDiarios.filter((registo) => registo.data === hoje);
}, [registosDiarios]);


    // Chamamos filtrarRegistos sempre que o selectedMonth, selectedYear ou registosDiarios mudarem
    useEffect(() => {
        const registosFiltrados = filtrarRegistos();
        console.log("Registos Filtrados: ", registosFiltrados);
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
                console.log("Resposta completa do backend:", data);
                
                const hoje = new Date().toISOString().split('T')[0];
                console.log("Data de hoje:", hoje); // Verifique a data de hoje
                
                // Filtra apenas o registo do dia atual
                const registoHoje = data.filter((registo) => registo.data === hoje);
                console.log("Registos filtrados para hoje:", registoHoje);
        
                setRegistosDiarios(data || []);
                setFilteredRegistos(registoHoje); // Define apenas o registo de hoje em filteredRegistos
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
    
    
    

// Função para obter a localização atual
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

const [endereco, setEndereco] = useState('');

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
    mostrarEndereco(); // Chamar a função para obter e exibir o endereço
}, []);


useEffect(() => {
    const carregarEstadoInicial = async () => {
        const estadoLocal = JSON.parse(localStorage.getItem('intervaloAberto'));

        if (estadoLocal && estadoLocal.intervaloAberto) {
            // Restaurar estado do localStorage
            setHoraInicioIntervalo(new Date(estadoLocal.horaInicioIntervalo));
            setIntervaloAberto(true);
            setTemporizadorAtivo(false);
        } else {
            try {
                // Recuperar estado do backend
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

                        // Atualiza o localStorage com os dados recuperados
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
        // Suponho que as coordenadas estejam no primeiro registo do dia, ajuste conforme necessário
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
        // Inicia o temporizador
        setInicioTemporizador(new Date());
        setTemporizadorAtivo(true);
        setTempoPausado(0); // Reseta o tempo pausado
        console.log("Endereço obtido:", endereco);

        const horaAtual = new Date().toISOString();
         // Guarda a hora de entrada no localStorage
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
                endereco, // Resolve o endereço com base na localização
                totalHorasTrabalhadas: "8.00",
                totalTempoIntervalo: "1.00",
            }),
        });

        if (response.ok) {
            const result = await response.json();
            alert(`Registo bem-sucedido! Endereço: ${endereco}`);
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

        // Salvar estado no localStorage
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

            // Remover estado do intervalo do localStorage
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


    const renderItem = ({ item }) => {
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
        
    
            const abrirMaps = () => {
                if (latitude && longitude) {
                    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                    console.log('URL do Maps:', mapsUrl);
                    Linking.openURL(mapsUrl)
                        .then(() => console.log('Maps aberto com sucesso!'))
                        .catch((err) => console.error('Erro ao abrir o Maps:', err));
                } else {
                    alert('Coordenadas não disponíveis.');
                }
            };
            
    
        return (
            <View style={styles.card}>
                <Text style={styles.cardDate}>Dia: {new Date(item.data).toLocaleDateString('pt-PT')}</Text>
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
                    <TouchableOpacity onPress={abrirMaps}>
                        <View style={styles.cardRow}>
                            <FontAwesome name="map-marker" size={16} color="#1792FE" style={styles.icon} />
                            <Text style={[styles.registoText, styles.linkText]}>Ver Localização {item.endereco}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };
    

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                <Text style={styles.title}></Text>
                <View style={styles.clockContainer}>
                    <Text style={styles.clock}>{tempoDecorrido}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary]}
                    onPress={registarPonto}
                >
                    <FontAwesome name="circle" size={20} color="#d4e4ff" style={styles.icon} />
                    
                </TouchableOpacity>

                    <TouchableOpacity
                            style={[
                                styles.button,
                                intervaloAberto || existeSaida ? styles.buttonDisabled : styles.buttonWarning,
                            ]}
                            onPress={iniciarIntervalo}
                            disabled={intervaloAberto || existeSaida}
                    >
                    <FontAwesome name="pause" size={20} color="#1792FE" style={styles.icon} />
                    
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.button,
                        !intervaloAberto || existeSaida ? styles.buttonDisabled : styles.buttonSuccess,
                    ]}
                    onPress={finalizarIntervalo}
                    disabled={!intervaloAberto || existeSaida}
                >
                    <FontAwesome name="play" size={20} color="#1792FE" style={styles.icon} />
                    
                </TouchableOpacity>

                {intervaloAberto && (
                    <Text style={styles.tempoDecorrido}>Tempo em Intervalo: {tempoDecorrido}</Text>
                )}

                {filteredRegistos.length > 0 ? (
                    renderItem({ item: filteredRegistos[0] })
                ) : (
                    <Text>Sem registo para o dia de hoje.</Text>
                )}



                <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary, styles.buttonText]}
                    onPress={irParaListarRegistos} // Chama a função de navegação
                >
                    Ver Pontos
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};


const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
    },
    linkText: {
        textDecorationLine: 'underline',
        color: '#0066cc',
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
        color: '#1792FE',
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
    picker: {
        height: 40,
        width: 100,
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
    buttonPrimary: {
        backgroundColor: '#1792FE',
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
        color: '#fff',
        marginLeft: 8, // Espaço entre o texto e o ícone
    },
    icon: {
        marginRight: 5,
    },
    error: {
        color: 'red',
        marginTop: 10,
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
});

export default PontoBotao;