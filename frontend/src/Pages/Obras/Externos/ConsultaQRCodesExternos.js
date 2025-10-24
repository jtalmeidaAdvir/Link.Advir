
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    Modal,
    ScrollView,
    RefreshControl,
    Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

const API_BASE = 'https://backend.advir.pt/api/externos-jpa';

const ConsultaQRCodesExternos = () => {
    const [externos, setExternos] = useState([]);
    const [externosFiltrados, setExternosFiltrados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [erro, setErro] = useState('');
    const [search, setSearch] = useState('');
    const [empresaFiltro, setEmpresaFiltro] = useState('');
    
    // Modal de detalhes
    const [modalVisible, setModalVisible] = useState(false);
    const [externoSelecionado, setExternoSelecionado] = useState(null);

    // Carregar externos
    const fetchExternos = useCallback(async () => {
        setLoading(true);
        setErro('');
        try {
            const loginToken = await AsyncStorage.getItem('loginToken');
            const empresaId = await AsyncStorage.getItem('empresa_id');

            const headers = {
                Authorization: `Bearer ${loginToken}`,
                'X-Empresa-ID': empresaId
            };

            const res = await fetch(`${API_BASE}/qrcodes`, { headers });
            
            if (!res.ok) {
                throw new Error('Erro ao carregar trabalhadores externos');
            }

            const data = await res.json();
            setExternos(data?.data || []);
            setExternosFiltrados(data?.data || []);
        } catch (e) {
            setErro(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExternos();
    }, [fetchExternos]);

    // Filtrar externos
    useEffect(() => {
        let filtered = externos;

        if (search.trim()) {
            filtered = filtered.filter(ext =>
                ext.nome?.toLowerCase().includes(search.toLowerCase()) ||
                ext.Qrcode?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (empresaFiltro) {
            filtered = filtered.filter(ext => ext.empresa === empresaFiltro);
        }

        setExternosFiltrados(filtered);
    }, [search, empresaFiltro, externos]);

    // Refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchExternos();
        setRefreshing(false);
    }, [fetchExternos]);

    // Abrir modal de detalhes
    const abrirDetalhes = (externo) => {
        setExternoSelecionado(externo);
        setModalVisible(true);
    };

    // Fechar modal
    const fecharModal = () => {
        setModalVisible(false);
        setExternoSelecionado(null);
    };

    // Empresas únicas para filtro
    const empresasUnicas = [...new Set(externos.map(e => e.empresa).filter(Boolean))];

    // Render de cada item
    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => abrirDetalhes(item)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <Ionicons name="person" size={24} color="#1792FE" />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardNome} numberOfLines={1}>
                        {item.nome}
                    </Text>
                    <Text style={styles.cardEmpresa} numberOfLines={1}>
                        {item.empresa || 'Sem empresa'}
                    </Text>
                </View>
                <Ionicons name="qr-code" size={32} color="#1792FE" />
            </View>
            <View style={styles.cardFooter}>
                <View style={styles.qrCodeBadge}>
                    <Ionicons name="barcode-outline" size={14} color="#666" />
                    <Text style={styles.qrCodeText} numberOfLines={1}>
                        {item.Qrcode}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.loadingCard}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>A carregar QR codes...</Text>
                </LinearGradient>
            </View>
        );
    }

    if (erro) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.errorCard}>
                    <Ionicons name="alert-circle" size={64} color="#dc3545" />
                    <Text style={styles.errorTitle}>Erro ao carregar</Text>
                    <Text style={styles.errorText}>{erro}</Text>
                    <TouchableOpacity onPress={fetchExternos} style={styles.retryButton}>
                        <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.buttonGradient}>
                            <Ionicons name="refresh" size={18} color="#fff" />
                            <Text style={styles.buttonText}>Tentar Novamente</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.mainContainer}>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                        style={styles.headerContent}
                    >
                        <View style={styles.headerTop}>
                            <View style={styles.headerIcon}>
                                <Ionicons name="qr-code" size={28} color="#fff" />
                            </View>
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.headerTitle}>QR Codes Externos</Text>
                                <Text style={styles.headerSubtitle}>
                                    {externosFiltrados.length} {externosFiltrados.length === 1 ? 'trabalhador' : 'trabalhadores'}
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Filtros */}
                <View style={styles.filtersContainer}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#1792FE" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Pesquisar por nome ou QR code..."
                            value={search}
                            onChangeText={setSearch}
                            placeholderTextColor="#999"
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {empresasUnicas.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.empresasScroll}
                            contentContainerStyle={styles.empresasContainer}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.empresaChip,
                                    !empresaFiltro && styles.empresaChipActive
                                ]}
                                onPress={() => setEmpresaFiltro('')}
                            >
                                <Text
                                    style={[
                                        styles.empresaChipText,
                                        !empresaFiltro && styles.empresaChipTextActive
                                    ]}
                                >
                                    Todas
                                </Text>
                            </TouchableOpacity>
                            {empresasUnicas.map((empresa, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.empresaChip,
                                        empresaFiltro === empresa && styles.empresaChipActive
                                    ]}
                                    onPress={() => setEmpresaFiltro(empresa)}
                                >
                                    <Text
                                        style={[
                                            styles.empresaChipText,
                                            empresaFiltro === empresa && styles.empresaChipTextActive
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {empresa}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Lista */}
                <FlatList
                    data={externosFiltrados}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#1792FE']}
                            tintColor="#1792FE"
                        />
                    }
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="qr-code-outline" size={80} color="#ccc" />
                            <Text style={styles.emptyTitle}>Nenhum trabalhador encontrado</Text>
                            <Text style={styles.emptyText}>
                                {search || empresaFiltro
                                    ? 'Tente ajustar os filtros de pesquisa'
                                    : 'Não há trabalhadores externos registados'}
                            </Text>
                        </View>
                    )}
                />

                {/* Modal de Detalhes */}
                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    onRequestClose={fecharModal}
                    presentationStyle="pageSheet"
                >
                    <SafeAreaView style={styles.modalContainer}>
                        <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <View style={styles.modalTitleContainer}>
                                    <Ionicons name="qr-code" size={24} color="#fff" />
                                    <Text style={styles.modalTitle}>QR Code do Trabalhador</Text>
                                </View>
                                <TouchableOpacity onPress={fecharModal} style={styles.modalCloseBtn}>
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>

                        {externoSelecionado && (
                            <ScrollView contentContainerStyle={styles.modalContent}>
                                {/* Informações */}
                                <View style={styles.infoCard}>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="person" size={20} color="#1792FE" />
                                        <View style={styles.infoTextContainer}>
                                            <Text style={styles.infoLabel}>Nome</Text>
                                            <Text style={styles.infoValue}>{externoSelecionado.nome}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="business" size={20} color="#1792FE" />
                                        <View style={styles.infoTextContainer}>
                                            <Text style={styles.infoLabel}>Empresa</Text>
                                            <Text style={styles.infoValue}>
                                                {externoSelecionado.empresa || 'Sem empresa'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="barcode" size={20} color="#1792FE" />
                                        <View style={styles.infoTextContainer}>
                                            <Text style={styles.infoLabel}>Código QR</Text>
                                            <Text style={styles.infoValue}>{externoSelecionado.Qrcode}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* QR Code */}
                                <View style={styles.qrCodeCard}>
                                    <Text style={styles.qrCodeTitle}>QR Code para Registo de Ponto</Text>
                                    <View style={styles.qrCodeContainer}>
                                        <QRCode
                                            value={externoSelecionado.Qrcode}
                                            size={250}
                                            color="#333"
                                            backgroundColor="#fff"
                                        />
                                    </View>
                                    <Text style={styles.qrCodeInstructions}>
                                        Use este QR code para registar entrada/saída do trabalhador
                                    </Text>
                                </View>
                            </ScrollView>
                        )}
                    </SafeAreaView>
                </Modal>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingCard: {
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        gap: 15,
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    errorCard: {
        backgroundColor: '#fff',
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#dc3545',
        marginTop: 15,
        marginBottom: 10,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        borderRadius: 15,
        overflow: 'hidden',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        gap: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    header: {
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    headerContent: {
        borderRadius: 20,
        padding: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    filtersContainer: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 15,
        paddingHorizontal: 15,
        marginBottom: 15,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 15,
        fontSize: 16,
        color: '#333',
    },
    empresasScroll: {
        marginBottom: 10,
    },
    empresasContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    empresaChip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#e9ecef',
    },
    empresaChipActive: {
        backgroundColor: '#1792FE',
        borderColor: '#1792FE',
    },
    empresaChipText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    empresaChipTextActive: {
        color: '#fff',
    },
    listContainer: {
        padding: 20,
        paddingTop: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(23, 146, 254, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardInfo: {
        flex: 1,
    },
    cardNome: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    cardEmpresa: {
        fontSize: 14,
        color: '#666',
    },
    cardFooter: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f3f4',
    },
    qrCodeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    qrCodeText: {
        fontSize: 13,
        color: '#666',
        fontFamily: 'monospace',
        flex: 1,
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginTop: 15,
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    modalHeader: {
        paddingTop: 10,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    modalCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        padding: 20,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        gap: 15,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    qrCodeCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
    },
    qrCodeTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 20,
    },
    qrCodeContainer: {
        padding: 20,
        backgroundColor: '#f8f9fa',
        borderRadius: 15,
        marginBottom: 15,
    },
    qrCodeInstructions: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default ConsultaQRCodesExternos;
