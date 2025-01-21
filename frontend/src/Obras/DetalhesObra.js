import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart } from 'react-native-chart-kit';

const DetalhesObra = ({ route, navigation }) => {
    const { obraId, obraCodigo } = route.params;

    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await AsyncStorage.getItem('painelAdminToken');
                const urlempresa = await AsyncStorage.getItem('urlempresa');

                if (!token || !urlempresa) {
                    setErrorMessage('Token ou URL da empresa não encontrados.');
                    setLoading(false);
                    return;
                }

                const results = {};
                const response = await fetch(`https://webapiprimavera.advir.pt/detalhesObra/GetControlo/${obraId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'urlempresa': urlempresa,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    setErrorMessage(`Erro: ${response.statusText}`);
                    setLoading(false);
                    return;
                }

                const result = await response.json();
                results['GetControlo'] = result.DataSet?.Table || [];
                setData(results);
            } catch (error) {
                setErrorMessage(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [obraId]);

    // Dados para o Dashboard
    const chartData = () => {
        const p1 = data.GetControlo?.find((item) => item.Tipo === 'P1')?.Valor || 0;
        const c1 = data.GetControlo?.find((item) => item.Tipo === 'C1')?.Valor || 0;

        return [
            { name: 'Adjudicação', value: p1, color: '#ff6384' },
            { name: 'Custo Estimado', value: c1, color: '#36a2eb' },
        ];
    };

    const renderLegend = () => {
        const data = chartData();
        return (
            <View style={styles.legendContainer}>
                {data.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText}>
                            {item.value.toFixed(2)} {item.name}
                        </Text>
                    </View>
                ))}
            </View>
        );
    };

    const renderSection = (title, key) => (
        <View key={key} style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <FlatList
                data={data[key] || []}
                renderItem={({ item }) => (
                    <View style={styles.cube}>
                        {Object.entries(item).map(([field, value]) => (
                            <Text key={field} style={styles.cubeText}>
                                {field}: {value}
                            </Text>
                        ))}
                    </View>
                )}
                keyExtractor={(item, index) => (item?.ID ? item.ID.toString() : index.toString())}
                ListEmptyComponent={<Text style={styles.emptyMessage}>Sem valores.</Text>}
            />
        </View>
    );

    return (
        <ScrollView style={styles.scrollContainer}>
            <View style={styles.container}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Obras')}>
                    <Text style={styles.backButtonText}>Voltar</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Detalhes da Obra {obraCodigo}</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#1792FE" style={styles.loadingIndicator} />
                ) : errorMessage ? (
                    <Text style={styles.errorText}>{errorMessage}</Text>
                ) : (
                    <>
                        {/* Dashboard */}
                        <Text style={styles.chartTitle}>Dashboard</Text>
                        <View style={styles.chartWrapper}>
                            <PieChart
                                data={chartData()}
                                width={Dimensions.get('window').width * 0.9}
                                height={220}
                                chartConfig={{
                                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                }}
                                accessor="value"
                                backgroundColor="transparent"
                                paddingLeft="60"
                                absolute
                                hasLegend={false} // Remove a legenda padrão
                            />
                            
                        </View>
                        <View style={styles.container}>
                        {renderLegend()}
                        </View>

                        {/* Botões de Navegação */}
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => navigation.navigate('AutosMedicaoExecucao', { obraId, obraCodigo })}
                        >
                            <Text style={styles.buttonText}>Ver Autos de Medição Execução</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => navigation.navigate('PartesDiarias', { obraId, obraCodigo })}
                        >
                            <Text style={styles.buttonText}>Partes Diárias</Text>
                        </TouchableOpacity>

                        {/* Secções Extras */}
                        {Object.keys(data).map((key) => renderSection('Controlo', key))}
                    </>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        padding: 10,
        borderRadius: 30,
        borderColor: '#1792FE',
        borderWidth: 1,
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#d4e4ff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1792FE',
        textAlign: 'center',
        marginBottom: 10,
    },
    chartWrapper: {
        alignItems: 'center', // Centraliza horizontalmente
        justifyContent: 'center', // Garante centralização no eixo vertical
        marginVertical: 20,
    },
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        marginBottom: 5,
    },
    legendColor: {
        width: 15,
        height: 15,
        borderRadius: 15 / 2,
        marginRight: 5,
    },
    legendText: {
        fontSize: 14,
        color: '#333',
    },
    button: {
        backgroundColor: '#1792FE',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1792FE',
        marginBottom: 10,
    },
    cube: {
        flex: 1,
        backgroundColor: '#fff',
        margin: 10,
        padding: 15,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cubeText: {
        fontSize: 14,
        color: '#333',
    },
    loadingIndicator: {
        marginTop: 20,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
    },
    emptyMessage: {
        textAlign: 'center',
        marginTop: 10,
        fontSize: 14,
        color: '#666',
    },
});


export default DetalhesObra;
