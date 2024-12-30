import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const PartesDiarias = ({ route, navigation }) => {
    const [partesDiarias, setPartesDiarias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { obraId,obraCodigo } = route.params;

    const fetchPartesDiarias = async () => {
        try {
            const token = await AsyncStorage.getItem('painelAdminToken');
            const urlempresa = await AsyncStorage.getItem('urlempresa');
    
            if (!token || !urlempresa) {
                setError('Token ou URL da empresa não encontrados.');
                setLoading(false);
                return;
            }
    
            const response = await fetch(
                `https://webapiprimavera.advir.pt/detalhesObra/GetFichasPessoal/${obraId}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'urlempresa': urlempresa,
                        'Content-Type': 'application/json',
                    },
                }
            );
    
            if (!response.ok) {
                setError('Erro ao buscar os Partes Diárias.');
                setLoading(false);
            } else {
                const result = await response.json();
                setPartesDiarias(result.DataSet?.Table || []);
            }
        } catch (err) {
            console.error('Erro ao buscar dados:', err.message);
            setError('Erro ao carregar os dados.');
        } finally {
            setLoading(false);
        }
    };
    

    useEffect(() => {
        fetchPartesDiarias();
    }, []);

    const renderItem = ({ item }) => (
        <View style={styles.itemContainer}>
            <Text style={styles.obraText}>Obra: {item.Obra}</Text>
            <Text style={styles.dataText}>Data: {item.Data}</Text>
            <Text style={styles.notasText}>Notas: {item.Notas}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <TouchableOpacity
            style={styles.obraContainer}
            onPress={() => navigation.navigate('DetalhesObra', { obraId: obraId,obraCodigo: obraCodigo })}
        > <Text >Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.header}>Partes Diárias {obraCodigo}</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#0022FF" />
            ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : (
                <FlatList
                    data={partesDiarias}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    style={styles.list}
                />
            )}
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('AddPartesDiarias')}
            >
                <Text style={styles.buttonText}>Adicionar Partes Diárias</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#d4e4ff',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#0022FF',
    },
    list: {
        marginTop: 10,
    },
    itemContainer: {
        backgroundColor: '#ffffff',
        padding: 15,
        marginBottom: 10,
        borderRadius: 10,
        elevation: 3,
    },
    obraText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    dataText: {
        fontSize: 16,
        color: '#555',
    },
    notasText: {
        fontSize: 14,
        marginTop: 5,
        color: '#777',
    },
    button: {
        backgroundColor: '#0022FF',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
    },
});

export default PartesDiarias;
