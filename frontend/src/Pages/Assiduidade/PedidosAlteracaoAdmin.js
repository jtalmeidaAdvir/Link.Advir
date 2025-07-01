
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BASE_URL from '../../../config';

const PedidosAlteracaoAdmin = () => {
    const [pedidos, setPedidos] = useState([]);
    const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [filtroEstado, setFiltroEstado] = useState('');

    // Função para formatar horários
    const formatarHorario = (horario) => {
        if (!horario) return "N/A";
        
        try {
            // Se for uma data completa (YYYY-MM-DD HH:mm:ss)
            if (horario.includes('-') && horario.includes(' ')) {
                const date = new Date(horario);
                if (isNaN(date.getTime())) return "N/A";
                return date.toLocaleTimeString('pt-PT', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                });
            }
            
            // Se for apenas horário (HH:mm ou HH:mm:ss)
            if (horario.includes(':')) {
                const parts = horario.split(':');
                if (parts.length >= 2) {
                    const hours = parts[0].padStart(2, '0');
                    const minutes = parts[1].padStart(2, '0');
                    return `${hours}:${minutes}`;
                }
            }
            
            return "N/A";
        } catch (error) {
            console.error('Erro ao formatar horário:', error);
            return "N/A";
        }
    };

    useEffect(() => {
        fetchPedidos();
    }, []);

    useEffect(() => {
        if (filtroEstado === '') {
            setPedidosFiltrados(pedidos);
        } else {
            const filtrados = pedidos.filter(pedido => pedido.status === filtroEstado);
            setPedidosFiltrados(filtrados);
        }
    }, [filtroEstado, pedidos]);

    const fetchPedidos = async () => {
        setLoading(true);
        try {
            const response = await fetch(`https://backend.advir.pt/api/pedidoAlteracao/pedidos-alteracao`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setPedidos(data);
                setPedidosFiltrados(data);
                setErrorMessage("");
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

    const aprovar = async (id) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/pedidoAlteracao/aprovar/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`,
                },
            });

            if (response.ok) {
                alert("Pedido aprovado com sucesso!");
                fetchPedidos();
            } else {
                alert("Erro ao aprovar pedido.");
            }
        } catch (error) {
            console.error('Erro ao aprovar pedido:', error);
            alert("Erro de rede.");
        }
    };

    const rejeitar = async (id) => {
        try {
            const response = await fetch(`https://backend.advir.pt/api/pedidoAlteracao/rejeitar/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`,
                },
            });

            if (response.ok) {
                alert("Pedido rejeitado com sucesso!");
                fetchPedidos();
            } else {
                alert("Erro ao rejeitar pedido.");
            }
        } catch (error) {
            console.error('Erro ao rejeitar pedido:', error);
            alert("Erro de rede.");
        }
    };

    const renderPedido = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.cardTitle}>Pedido #{item.id}</Text>
                    <View style={[styles.statusBadge, styles[item.status]]}>
                        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>
            </View>
            
            <View style={styles.cardContent}>
                <View style={styles.infoGrid}>
                    <View style={styles.infoColumn}>
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="account" size={16} color="#1792FE" />
                            <Text style={styles.infoLabel}>Funcionário:</Text>
                            <Text style={styles.infoValue}>{item.User?.nome || "N/A"}</Text>
                        </View>
                        
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="calendar" size={16} color="#1792FE" />
                            <Text style={styles.infoLabel}>Data:</Text>
                            <Text style={styles.infoValue}>
                                {new Date(item.RegistoPonto.data).toLocaleDateString('pt-PT')}
                            </Text>
                        </View>
                        
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="clock-in" size={16} color="#666" />
                            <Text style={styles.infoLabel}>Entrada Original:</Text>
                            <Text style={styles.infoValue}>{formatarHorario(item.RegistoPonto.horaEntrada)}</Text>
                        </View>
                        
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="clock-out" size={16} color="#666" />
                            <Text style={styles.infoLabel}>Saída Original:</Text>
                            <Text style={styles.infoValue}>{formatarHorario(item.RegistoPonto.horaSaida)}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.infoColumn}>
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="clock-plus" size={16} color="#28a745" />
                            <Text style={styles.infoLabel}>Nova Entrada:</Text>
                            <Text style={[styles.infoValue, styles.newTime]}>
                                {item.novaHoraEntrada ? formatarHorario(item.novaHoraEntrada) : "N/A"}
                            </Text>
                        </View>
                        
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="clock-minus" size={16} color="#dc3545" />
                            <Text style={styles.infoLabel}>Nova Saída:</Text>
                            <Text style={[styles.infoValue, styles.newTime]}>
                                {item.novaHoraSaida ? formatarHorario(item.novaHoraSaida) : "N/A"}
                            </Text>
                        </View>
                    </View>
                </View>
                
                <View style={styles.motivoSection}>
                    <Text style={styles.motivoLabel}>Motivo:</Text>
                    <Text style={styles.motivoText}>{item.motivo}</Text>
                </View>
                
                {item.status === 'pendente' && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={() => aprovar(item.id)}
                        >
                            <MaterialCommunityIcons name="check" size={18} color="#fff" />
                            <Text style={styles.buttonText}>Aprovar</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => rejeitar(item.id)}
                        >
                            <MaterialCommunityIcons name="close" size={18} color="#fff" />
                            <Text style={styles.buttonText}>Rejeitar</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Pedidos de Alteração</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={fetchPedidos}>
                    <MaterialCommunityIcons name="refresh" size={20} color="#1792FE" />
                </TouchableOpacity>
            </View>

            <View style={styles.filtroContainer}>
                <Text style={styles.filtroLabel}>Filtrar por Estado:</Text>
                <View style={styles.filtroGroup}>
                    <TouchableOpacity
                        style={[
                            styles.filtroBotao,
                            filtroEstado === '' && styles.filtroAtivo,
                        ]}
                        onPress={() => setFiltroEstado('')}
                    >
                        <Text
                            style={[
                                styles.filtroTexto,
                                filtroEstado === '' && styles.filtroTextoAtivo,
                            ]}
                        >
                            Todos
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filtroBotao,
                            filtroEstado === 'pendente' && styles.filtroAtivo,
                        ]}
                        onPress={() => setFiltroEstado('pendente')}
                    >
                        <Text
                            style={[
                                styles.filtroTexto,
                                filtroEstado === 'pendente' && styles.filtroTextoAtivo,
                            ]}
                        >
                            Pendentes
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filtroBotao,
                            filtroEstado === 'aprovado' && styles.filtroAtivo,
                        ]}
                        onPress={() => setFiltroEstado('aprovado')}
                    >
                        <Text
                            style={[
                                styles.filtroTexto,
                                filtroEstado === 'aprovado' && styles.filtroTextoAtivo,
                            ]}
                        >
                            Aprovados
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filtroBotao,
                            filtroEstado === 'rejeitado' && styles.filtroAtivo,
                        ]}
                        onPress={() => setFiltroEstado('rejeitado')}
                    >
                        <Text
                            style={[
                                styles.filtroTexto,
                                filtroEstado === 'rejeitado' && styles.filtroTextoAtivo,
                            ]}
                        >
                            Rejeitados
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
            
            {errorMessage ? (
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={24} color="#dc3545" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
            ) : null}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1792FE" />
                    <Text style={styles.loadingText}>Carregando pedidos...</Text>
                </View>
            ) : pedidosFiltrados.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="file-document-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>Nenhum pedido encontrado</Text>
                </View>
            ) : (
                <FlatList
                    data={pedidosFiltrados}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderPedido}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#d4e4ff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1792FE',
    },
    refreshButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    listContainer: {
        padding: 20,
        paddingTop: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffe6e6',
        padding: 15,
        margin: 20,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#dc3545',
    },
    errorText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#dc3545',
        flex: 1,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    cardHeader: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerLeft: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
    },
    pendente: {
        backgroundColor: '#FFA500',
    },
    aprovado: {
        backgroundColor: '#28a745',
    },
    rejeitado: {
        backgroundColor: '#dc3545',
    },
    cardContent: {
        padding: 15,
    },
    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    infoColumn: {
        flex: 1,
        marginRight: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#666',
        marginLeft: 6,
        marginRight: 6,
        minWidth: 100,
    },
    infoValue: {
        fontSize: 13,
        color: '#333',
        fontWeight: '500',
        flex: 1,
    },
    newTime: {
        color: '#1792FE',
        fontWeight: 'bold',
    },
    motivoSection: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
    },
    motivoLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    motivoText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 120,
        justifyContent: 'center',
    },
    approveButton: {
        backgroundColor: '#28a745',
    },
    rejectButton: {
        backgroundColor: '#dc3545',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 5,
    },
    filtroContainer: {
        backgroundColor: '#fff',
        padding: 15,
        margin: 20,
        marginTop: 10,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    filtroLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    filtroGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filtroBotao: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    filtroAtivo: {
        backgroundColor: '#1792FE',
        borderColor: '#1792FE',
    },
    filtroTexto: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    filtroTextoAtivo: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default PedidosAlteracaoAdmin;
