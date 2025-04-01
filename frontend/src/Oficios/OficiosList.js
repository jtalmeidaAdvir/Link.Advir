
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Modal, Image, Animated, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather as Icon } from '@expo/vector-icons';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Componente ConfirmModal melhorado
const ConfirmModal = ({ visible, onCancel, onConfirm, codigo }) => (
    <Modal visible={visible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#FF6B6B" />
                    <Text style={styles.modalTitle}>Confirmação</Text>
                </View>

                <Text style={styles.modalMessage}>
                    Tem certeza que deseja eliminar o ofício com o código <Text style={styles.modalHighlight}>{codigo}</Text>?
                </Text>

                <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.modalCancelButton} onPress={onCancel}>
                        <Text style={styles.modalCancelText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.modalConfirmButton} onPress={onConfirm}>
                        <MaterialCommunityIcons name="delete-outline" size={18} color="#fff" />
                        <Text style={styles.modalConfirmText}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

const OficiosList = () => {
    const navigation = useNavigation();
    const [fadeAnim] = useState(new Animated.Value(0));

    const [oficios, setOficios] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOficio, setSelectedOficio] = useState(null);
    const [groupedOficios, setGroupedOficios] = useState([]);

    // Animação de fade-in
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
        }).start();
    }, []);

    // Agrupar ofícios por obra
    const groupByObra = (oficios) => {
        const grouped = oficios.reduce((acc, oficio) => {
            const obra = oficio.CDU_DonoObra || "Sem Obra";
            if (!acc[obra]) {
                acc[obra] = [];
            }
            acc[obra].push(oficio);
            return acc;
        }, {});

        return Object.keys(grouped).map((obra) => ({
            title: obra,
            data: grouped[obra],
            expanded: false
        }));
    };

    useFocusEffect(
        useCallback(() => {
            setSearchQuery("");
            setOficios([]);
            setError(null);
            setLoading(true);
            fetchOficios();
        }, [])
    );

    const fetchOficios = async () => {
        setLoading(true);
        setOficios([]);
        setError(null);

        const token = localStorage.getItem('painelAdminToken');
        const urlempresa = localStorage.getItem('urlempresa');

        if (!urlempresa) {
            setError('URL da empresa não encontrada.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('https://webapiprimavera.advir.pt/oficio/Listar', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'urlempresa': urlempresa,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            if (data && data.DataSet && Array.isArray(data.DataSet.Table)) {
                const sortedOficios = data.DataSet.Table.sort((a, b) => {
                    const numA = parseInt(a.CDU_codigo.match(/\d+/g)[0], 10);
                    const numB = parseInt(b.CDU_codigo.match(/\d+/g)[0], 10);
                    return numB - numA;
                });

                setOficios(sortedOficios);
                const grouped = groupByObra(sortedOficios);
                setGroupedOficios(grouped);
            } else {
                setOficios([]);
                setError('Dados não encontrados ou estrutura inesperada');
            }
        } catch (error) {
            setError('Erro ao carregar os dados');
            setOficios([]);
        } finally {
            setLoading(false);
        }
    };

    const groupAndFilterOficios = () => {
        let filteredOficios = oficios;

        if (searchQuery) {
            filteredOficios = oficios.filter((oficio) =>
                oficio.CDU_DonoObra.toLowerCase().includes(searchQuery.toLowerCase()) ||
                oficio.CDU_assunto.toLowerCase().includes(searchQuery.toLowerCase()) ||
                oficio.CDU_codigo.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        const grouped = groupByObra(filteredOficios);
        setGroupedOficios(grouped);
    };

    useEffect(() => {
        groupAndFilterOficios();
    }, [searchQuery, oficios]);

    const toggleGroupExpand = (index) => {
        setGroupedOficios(prevState => {
            const newState = [...prevState];
            newState[index].expanded = !newState[index].expanded;
            return newState;
        });
    };

    const renderGroup = ({ item, index }) => (
        <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.groupContainer}>
                <TouchableOpacity
                    onPress={() => toggleGroupExpand(index)}
                    style={styles.groupHeader}
                >
                    <LinearGradient
                        colors={['#4481EB', '#04BEFE']}
                        style={styles.groupHeaderGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <View style={styles.groupTitleContainer}>
                            <MaterialCommunityIcons
                                name="office-building"
                                size={22}
                                color="#fff"
                            />
                            <Text style={styles.groupTitle}>{item.title}</Text>
                        </View>

                        <View style={styles.groupCounter}>
                            <Text style={styles.groupCountText}>{item.data.length}</Text>
                            <Ionicons
                                name={item.expanded ? "chevron-up" : "chevron-down"}
                                size={24}
                                color="#fff"
                            />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {item.expanded && (
                    <FlatList
                        data={item.data}
                        renderItem={renderOficio}
                        keyExtractor={(oficio) => oficio.CDU_codigo.toString()}
                        contentContainerStyle={styles.oficiosList}
                    />
                )}
            </View>
        </Animated.View>
    );

    const renderOficio = ({ item }) => {
        const isInactive = item.CDU_isactive === false;
        const isEmailSent = item.CDU_estado === "Enviado Por Email";
        const isPrinted = item.CDU_estado === "Impresso";

        return (
            <View style={[
                styles.oficioCard,
                isInactive && styles.inactiveCard,
                isEmailSent && styles.emailSentCard,
                isPrinted && styles.printedCard
            ]}>
                <View style={styles.oficioHeader}>
                    <View style={styles.codeContainer}>
                        <MaterialCommunityIcons name="file-document-outline" size={22} color="#4481EB" />
                        <Text style={styles.oficioCode}>{item.CDU_codigo}</Text>
                    </View>

                    <View style={[
                        styles.statusBadge,
                        isEmailSent && styles.emailSentBadge,
                        isPrinted && styles.printedBadge,
                        isInactive && styles.inactiveBadge
                    ]}>
                        <MaterialCommunityIcons
                            name={
                                isEmailSent ? "email-check-outline" :
                                    isPrinted ? "printer-check" :
                                        isInactive ? "cancel" : "progress-check"
                            }
                            size={16}
                            color="#fff"
                        />
                        <Text style={styles.statusBadgeText}>
                            {item.CDU_estado || "Pendente"}
                        </Text>
                    </View>
                </View>

                <View style={styles.oficioBody}>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="text-subject" size={18} color="#555" style={styles.infoIcon} />
                        <Text style={[styles.oficioSubject, isInactive && styles.inactiveText]} numberOfLines={2}>
                            {item.CDU_assunto}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="account" size={18} color="#555" style={styles.infoIcon} />
                        <Text style={[styles.oficioSender, isInactive && styles.inactiveText]}>
                            {item.CDU_remetente}
                        </Text>
                    </View>
                </View>

                {!isInactive && !isEmailSent && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => navigation.navigate("EditOficio", {
                                oficioId: item.CDU_codigo,
                                oficioData: {
                                    CDU_codigo: item.CDU_codigo,
                                    CDU_Datadoc: item.CDU_Datadoc,
                                    CDU_remetente: item.CDU_remetente,
                                    CDU_email: item.CDU_email,
                                    CDU_assunto: item.CDU_assunto,
                                    CDU_texto1: item.CDU_texto1,
                                    CDU_texto2: item.CDU_texto2,
                                    CDU_texto3: item.CDU_texto3,
                                    CDU_DonoObra: item.CDU_DonoObra,
                                    CDU_obra: item.CDU_obra,
                                    CDU_Morada: item.CDU_Morada,
                                    CDU_Localidade: item.CDU_Localidade,
                                    CDU_CodPostal: item.CDU_CodPostal,
                                    CDU_CodPostalLocal: item.CDU_CodPostalLocal,
                                    CDU_Anexos: item.CDU_Anexos,
                                    CDU_template: item.CDU_template,
                                    CDU_estado: item.CDU_estado,
                                    CDU_atencao: item.CDU_atencao,
                                    CDU_createdby: item.CDU_createdby
                                }
                            })}
                        >
                            <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => {
                                setSelectedOficio(item.CDU_codigo);
                                setModalVisible(true);
                            }}
                        >
                            <MaterialCommunityIcons name="delete" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#4481EB', '#04BEFE']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Gestão de Ofícios</Text>
                    <Text style={styles.headerSubtitle}>Visualize todos os ofícios</Text>
                </View>
            </LinearGradient>

            <Animated.View
                style={[
                    styles.contentContainer,
                    {
                        opacity: fadeAnim, transform: [{
                            translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [50, 0],
                            })
                        }]
                    }
                ]}
            >
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <MaterialCommunityIcons name="magnify" size={22} color="#666" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Pesquisar por código, assunto ou destinatário"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4481EB" />
                        <Text style={styles.loadingText}>A carregar ofícios...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#FF6B6B" />
                        <Text style={styles.errorTitle}>Erro ao carregar dados</Text>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : groupedOficios.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="file-document-outline" size={70} color="#d1dbed" />
                        <Text style={styles.emptyTitle}>Nenhum ofício encontrado</Text>
                        <Text style={styles.emptyText}>
                            Não foram encontrados ofícios. Clique no botão abaixo para criar um novo.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={groupedOficios}
                        renderItem={renderGroup}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                <TouchableOpacity
                    style={styles.fabButton}
                    onPress={() => navigation.navigate("OficiosPage")}
                >
                    <LinearGradient
                        colors={['#4481EB', '#04BEFE']}
                        style={styles.fabGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <MaterialCommunityIcons name="plus" size={26} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            {/* Modal de confirmação */}
            <ConfirmModal
                visible={modalVisible}
                codigo={selectedOficio}
                onCancel={() => setModalVisible(false)}
                onConfirm={async () => {
                    const token = localStorage.getItem('painelAdminToken');
                    const urlempresa = localStorage.getItem('urlempresa');

                    if (!urlempresa) {
                        alert('URL da empresa não encontrada.');
                        return;
                    }

                    try {
                        setModalVisible(false);
                        setLoading(true);

                        const response = await fetch(`https://webapiprimavera.advir.pt/oficio/Eliminar/${selectedOficio}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'urlempresa': urlempresa,
                                'Content-Type': 'application/json',
                            },
                        });

                        const responseText = await response.text();

                        if (!response.ok) {
                            throw new Error(`Erro ao eliminar o ofício: ${response.statusText}`);
                        }

                        const responseData = JSON.parse(responseText);
                        await fetchOficios();

                        // Mostrar notificação de sucesso
                        alert(`Ofício ${selectedOficio} eliminado com sucesso.`);
                    } catch (error) {
                        console.error('Erro na requisição:', error.message);
                        alert(`Erro ao eliminar o ofício: ${error.message}`);
                    } finally {
                        setLoading(false);
                    }
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#d4e4ff',
    },
    header: {
        width: '100%',
        paddingTop: 40,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    headerContent: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    contentContainer: {
        flex: 1,
        marginTop: -20,
        paddingHorizontal: 16,
        paddingBottom: 80, // Espaço para o FAB
    },
    searchContainer: {
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        marginLeft: 10,
        color: '#333',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 15,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 15,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        maxWidth: '80%',
        marginBottom: 20,
    },
    listContainer: {
        paddingBottom: 20,
    },
    groupContainer: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    groupHeader: {
        overflow: 'hidden',
        borderRadius: 16,
    },
    groupHeaderGradient: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 16,
    },
    groupTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginLeft: 8,
    },
    groupCounter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupCountText: {
        color: '#ffffff',
        fontWeight: '600',
        marginRight: 5,
        fontSize: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    oficiosList: {
        paddingTop: 10,
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
    oficioCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 10,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
        borderLeftWidth: 4,
        borderLeftColor: '#4481EB',
    },
    inactiveCard: {
        borderLeftColor: '#aaa',
        backgroundColor: '#f8f8f8',
    },
    emailSentCard: {
        borderLeftColor: '#28a745',
    },
    printedCard: {
        borderLeftColor: '#dc3545',
    },
    oficioHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    oficioCode: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6c757d',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    emailSentBadge: {
        backgroundColor: '#28a745',
    },
    printedBadge: {
        backgroundColor: '#dc3545',
    },
    inactiveBadge: {
        backgroundColor: '#aaa',
    },
    statusBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    oficioBody: {
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoIcon: {
        marginRight: 8,
    },
    oficioSubject: {
        fontSize: 15,
        color: '#333',
        flex: 1,
    },
    oficioSender: {
        fontSize: 14,
        color: '#666',
    },
    inactiveText: {
        color: '#999',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    editButton: {
        backgroundColor: '#4481EB',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    deleteButton: {
        backgroundColor: '#ff6b6b',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        borderRadius: 30,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    fabGradient: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Estilos do Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '90%',
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginTop: 10,
    },
    modalMessage: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    modalHighlight: {
        fontWeight: '700',
        color: '#4481EB',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        marginRight: 8,
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#666',
        fontWeight: '600',
    },
    modalConfirmButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ff6b6b',
        paddingVertical: 14,
        borderRadius: 12,
        marginLeft: 8,
    },
    modalConfirmText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 5,
    },
});

export default OficiosList;
