import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AutosMedicaoExecucao = ({ route,navigation }) => {
    const { obraId,obraCodigo } = route.params;

    const [data, setData] = useState([]);
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

                const response = await fetch(`https://webapiprimavera.advir.pt/detalhesObra/GetAutosMedicao_Execucao/${obraId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'urlempresa': urlempresa,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    setErrorMessage('Erro ao buscar os Autos de Medição Execução.');
                    setLoading(false);
                } else {
                    const result = await response.json();
                    setData(result.DataSet?.Table || []);
                }
            } catch (error) {
                setErrorMessage(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [obraId]);

    return (
        <View style={styles.container}>

            <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('DetalhesObra', { obraId: obraId,obraCodigo: obraCodigo })}
        > <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Autos de Medição Execução - Obra {obraCodigo}</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#0022FF" style={styles.loadingIndicator} />
            ) : errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
            ) : (
                <FlatList
                    data={data}
                    renderItem={({ item }) => (
                        <View style={styles.itemContainer}>
                            {Object.entries(item).map(([field, value]) => (
                                <Text key={field} style={styles.itemText}>
                                    {field}: {value}
                                </Text>
                            ))}
                        </View>
                    )}
                    keyExtractor={(item, index) => (item?.ID ? item.ID.toString() : index.toString())}
                    ListEmptyComponent={<Text style={styles.emptyMessage}>Sem Autos.</Text>}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#d4e4ff',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        padding: 10,
        borderRadius: 30,
        borderColor: '#0022FF',
        borderWidth: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    itemContainer: {
        backgroundColor: '#fff',
        padding: 10,
        marginBottom: 10,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    itemText: {
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

export default AutosMedicaoExecucao;
