import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Alert,
    StyleSheet,
    Picker,
} from 'react-native';

const PandIByTecnico = () => {
    const [tecnicoID, setTecnicoID] = useState('');
    const [intervencoes, setIntervencoes] = useState([]);
    const [processos, setProcessos] = useState([]);
    const [loading, setLoading] = useState(false);
    const currentMonth = new Date().getMonth() + 1; // Mês atual
    const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString().padStart(2, '0')); // Inicializar com o mês atual
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString()); // Ano atual como padrão




    const fetchData = async () => {
        if (!tecnicoID) {
            Alert.alert('Erro', 'Insira o ID do técnico.');
            return;
        }

        const token = localStorage.getItem('painelAdminToken');
        const urlempresa = localStorage.getItem('urlempresa');

        if (!token || !urlempresa) {
            Alert.alert('Erro', 'Token ou URL da empresa não encontrados.');
            return;
        }

        setLoading(true);

        try {
            // Fetch intervenções
            const intervencoesResponse = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/ListaIntervencoesTecnico/${tecnicoID}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'urlempresa': urlempresa,
                    },
                }
            );

            if (!intervencoesResponse.ok) {
                throw new Error(`Erro ao obter intervenções: ${intervencoesResponse.status}`);
            }

            const intervencoesData = await intervencoesResponse.json();
            setIntervencoes(intervencoesData?.DataSet?.Table || []);

            // Fetch processos
            const processosResponse = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/ListaProcessosTecnico/${tecnicoID}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'urlempresa': urlempresa,
                    },
                }
            );

            if (!processosResponse.ok) {
                throw new Error(`Erro ao obter processos: ${processosResponse.status}`);
            }

            const processosData = await processosResponse.json();
            setProcessos(processosData?.DataSet?.Table || []);
            console.log('Processos Data:', processosData);

        } catch (error) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    // Filtrar intervenções e processos com base no mês e ano selecionados
    const filteredIntervencoes = intervencoes.filter((item) => {
        const date = new Date(item.DataHoraInicio); // Ajuste conforme o nome do campo no backend
        return (
            date.getMonth() + 1 === parseInt(selectedMonth, 10) &&
            date.getFullYear() === parseInt(selectedYear, 10)
        );
    });

    const filteredProcessos = processos.filter((item) => {
        const date = new Date(item.DataHoraAbertura); // Ajuste conforme o nome do campo no backend
        return (
            date.getMonth() + 1 === parseInt(selectedMonth, 10) &&
            date.getFullYear() === parseInt(selectedYear, 10)
        );
    });

     // Gerar os meses, começando pelo mês atual
     const generateMonths = () => {
        const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
        const currentIndex = months.indexOf(selectedMonth);
        return [...months.slice(currentIndex), ...months.slice(0, currentIndex)];
    };



    return (
        <View style={styles.container}>
            <Text style={styles.title}>Intervenções e Processos</Text>
            <TextInput
                placeholder="Insira o ID do Técnico"
                value={tecnicoID}
                onChangeText={setTecnicoID}
                style={styles.input}
            />
            <View style={styles.filterContainer}>
            <Picker
                    selectedValue={selectedMonth}
                    onValueChange={(itemValue) => setSelectedMonth(itemValue)}
                    style={styles.picker}
                >
                    {generateMonths().map((month, index) => (
                        <Picker.Item key={index} label={`${month}`} value={month} />
                    ))}
                </Picker>
                <Picker
                    selectedValue={selectedYear}
                    onValueChange={(itemValue) => setSelectedYear(itemValue)}
                    style={styles.picker}
                >
                    {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return <Picker.Item key={year} label={year.toString()} value={year.toString()} />;
                    })}
                </Picker>
            </View>
            <TouchableOpacity
                style={styles.button}
                onPress={fetchData}
                disabled={loading}
            >
                <Text style={styles.buttonText}>
                    {loading ? 'A carregar...' : 'Obter Dados'}
                </Text>
            </TouchableOpacity>
    
            {/* Mostrar a quantidade total de intervenções */}
            <Text style={styles.sectionTitle}>
                Nº de Intervenções: ({filteredIntervencoes.length})
            </Text>
    
            {/* Mostrar a soma total das durações filtradas */}
            <Text style={styles.duracaoText}>
                Duração Total:{' '}
                {filteredIntervencoes.reduce((total, item) => total + (item.Duracao || 0), 0)} minutos
            </Text>
    
            {/*<FlatList
                data={filteredIntervencoes}
                keyExtractor={(item) => item.ID.toString()}
                renderItem={renderIntervencao}
                ListEmptyComponent={
                    !loading && <Text style={styles.emptyText}>Nenhuma intervenção encontrada</Text>
                }
            />*/}
    
            <Text style={styles.sectionTitle}>
                Nº de Processos: ({filteredProcessos.length})
            </Text>
            {/*<FlatList
                data={filteredProcessos}
                keyExtractor={(item) => item.ID.toString()}
                renderItem={renderProcesso}
                ListEmptyComponent={
                    !loading && <Text style={styles.emptyText}>Nenhum processo encontrado</Text>
                }
            />*/}

            
        </View>
    );
    
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#d4e4ff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    picker: {
        flex: 1,
        marginHorizontal: 5,
        height: 50,
        backgroundColor: '#fff',
        borderColor: '#ccc',
        borderWidth: 1,
    },
    button: {
        backgroundColor: '#007bff',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 20,
        marginBottom: 10,
    },
    listItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    listText: {
        fontSize: 16,
        color: '#333',
    },
    emptyText: {
        textAlign: 'center',
        color: '#888',
        marginTop: 20,
    },
});

export default PandIByTecnico;
