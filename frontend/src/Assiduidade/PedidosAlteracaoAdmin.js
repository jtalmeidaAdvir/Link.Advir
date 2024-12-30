import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import BASE_URL from '../../config';

const PedidosAlteracaoAdmin = () => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        fetchPedidos();
    }, []);

    const fetchPedidos = async () => {
        try {
            const response = await fetch(`https://192.168.1.4/api/pedidoAlteracao/pedidos-alteracao`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setPedidos(data);
            } else {
                setErrorMessage('Erro ao carregar pedidos de alteração.');
            }
        } catch (error) {
            console.error('Erro ao carregar pedidos de alteração:', error);
            setErrorMessage('Erro de rede ao carregar pedidos.');
        } finally {
            setLoading(false);
        }
    };

    const renderPedido = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.textBold}>Pedido #{item.id}</Text>
            <Text><Text style={styles.textBold}>Funcionário:</Text> {item.User?.nome || "N/A"}</Text>
            <Text><Text style={styles.textBold}>Data do Registo:</Text> {new Date(item.RegistoPonto.data).toLocaleDateString('pt-PT')}</Text>
            <Text><Text style={styles.textBold}>Hora Entrada:</Text> {item.RegistoPonto.horaEntrada || "N/A"}</Text>
            <Text><Text style={styles.textBold}>Nova Hora Entrada:</Text> {item.novaHoraEntrada || "N/A"}</Text>
            <Text><Text style={styles.textBold}>Hora Saída:</Text> {item.RegistoPonto.horaSaida || "N/A"}</Text>
            <Text><Text style={styles.textBold}>Nova Hora Saída:</Text> {item.novaHoraSaida || "N/A"}</Text>
            <Text><Text style={styles.textBold}>Motivo:</Text> {item.motivo}</Text>
            <Text><Text style={styles.textBold}>Status:</Text> {item.status}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Pedidos de Alteração</Text>
            {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

            {loading ? (
                <ActivityIndicator size="large" color="#0022FF" />
            ) : (
                <FlatList
                    data={pedidos}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderPedido}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    textBold: {
        fontWeight: 'bold',
    },
    error: {
        color: 'red',
        marginBottom: 10,
    },
});

export default PedidosAlteracaoAdmin;
