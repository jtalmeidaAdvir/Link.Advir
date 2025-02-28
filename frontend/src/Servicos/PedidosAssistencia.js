
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Modal,
    ScrollView,
    ActivityIndicator,
    Image,
    Dimensions
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
    faClose, 
    faExpand, 
    faTrash, 
    faSearch, 
    faPlus, 
    faChevronDown, 
    faChevronUp,
    faFilter
} from '@fortawesome/free-solid-svg-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const PedidosAssistencia = ({ navigation }) => {
    // State variables
    const [searchTerm, setSearchTerm] = useState('');
    const [pedidos, setPedidos] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [pedidoToDelete, setPedidoToDelete] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});
    const [loading, setLoading] = useState(true);
    const [filterPrioridade, setFilterPrioridade] = useState('');
    const [filterSerie, setFilterSerie] = useState('');
    const [filterEstado, setFilterEstado] = useState('1');
    const [showFilters, setShowFilters] = useState(false);
    const { t } = useTranslation();
    const [filteredData, setFilteredData] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const updatedData = Object.values(
            applyFilters().reduce((acc, pedido) => {
                const numProcesso = pedido.NumProcesso;
                if (!acc[numProcesso]) {
                    acc[numProcesso] = [];
                }
                acc[numProcesso].push(pedido);
                return acc;
            }, {})
        );
        setFilteredData(updatedData);
    }, [pedidos, searchTerm, filterPrioridade, filterEstado, filterSerie]);

    // Fetch pedidos quando o componente monta ou a tela recebe foco
    useFocusEffect(
        React.useCallback(() => {
            const fetchPedidos = async () => {
                const token = localStorage.getItem('painelAdminToken');
                const urlempresa = localStorage.getItem('urlempresa');
            
                if (!urlempresa) {
                    setErrorMessage('URL da empresa não encontrada.');
                    setLoading(false);
                    return;
                }
            
                try {
                    const response = await fetch('https://webapiprimavera.advir.pt/listarPedidos/listarPedidos', {
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
                    setPedidos(data.DataSet.Table);
                } catch (error) {
                    console.error('Error fetching pedidos:', error);
                    setErrorMessage('Não foi possível carregar os pedidos. Tente novamente.');
                } finally {
                    setLoading(false);
                }
            };
            
            fetchPedidos();
        }, [])
    );
    
    const applyFilters = () => {
        let filteredPedidos = [...pedidos];
    
        // Filtrar pedidos válidos
        filteredPedidos = filteredPedidos.filter((pedido) => pedido && pedido.Cliente);
    
        // Filtrar por Termo de Pesquisa
        if (searchTerm && searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredPedidos = filteredPedidos.filter((pedido) =>
                pedido.Cliente?.toLowerCase().includes(lowerSearchTerm) ||
                pedido.Nome?.toLowerCase().includes(lowerSearchTerm) ||
                pedido.NumProcesso?.toString().toLowerCase().includes(lowerSearchTerm) ||
                pedido.DescricaoProb?.toString().toLowerCase().includes(lowerSearchTerm) 
            );
        }
    
        // Filtrar por Prioridade
        if (filterPrioridade && filterPrioridade.trim()) {
            filteredPedidos = filteredPedidos.filter((pedido) =>
                pedido.Prioridade?.toString().toLowerCase() === filterPrioridade.toLowerCase()
            );
        }
    
        // Filtrar por Serie
        if (filterSerie && filterSerie.trim()) {
            filteredPedidos = filteredPedidos.filter((pedido) =>
                pedido.serie?.toString().toLowerCase() === filterSerie.toLowerCase()
            );
        }

        // Filtrar por Estado
        if (filterEstado) {
            if (filterEstado === 'pendentes') {
                // Agrupar os estados "pendentes"
                const estadosPendentes = ['2', '3', '4']; // Valores que correspondem a pendentes
                filteredPedidos = filteredPedidos.filter((pedido) =>
                    estadosPendentes.includes(pedido.Estado?.toString())
                );
            } else {
                filteredPedidos = filteredPedidos.filter((pedido) =>
                    pedido.Estado?.toString() === filterEstado
                );
            }
        }
    
        return filteredPedidos;
    };

    // Delete pedido
    const deletePedido = async (id) => {
        try {
            const token = localStorage.getItem('painelAdminToken');
            const urlempresa = localStorage.getItem('urlempresa');
    
            if (!token || !urlempresa) {
                throw new Error('Token ou URL da empresa não encontrados.');
            }
    
            const response = await fetch(`https://webapiprimavera.advir.pt/routePedidos_STP/EliminarPedido/${id}`, {
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
    
            // Remove o pedido eliminado do estado local
            setPedidos((prevPedidos) => prevPedidos.filter(pedido => pedido.ID !== id));
            setModalVisible(false);
        } catch (error) {
            console.error('Erro ao eliminar pedido:', error);
            setErrorMessage('Não foi possível eliminar o pedido. Tente novamente.');
        }
    };

    // Handle delete confirmation
    const handleDeleteConfirmation = () => {
        if (pedidoToDelete) {
            deletePedido(pedidoToDelete);
        }
    };

    // Handle search input change
    const handleSearch = (Nome) => {
        setSearchTerm(Nome);
    };

    // Get estado based on the input
    const getEstado = (estado) => {
        switch (estado) {
            case '3':
                return 'Reportado para Parceiro';
            case '2':
                return 'Em curso Equipa Advir';
            case '4':
                return 'Aguarda resposta Cliente';
            case '1':
                return 'Aguardar intervenção equipa Advir';
            case '0':
                return 'Terminado';
            default:
                return 'Desconhecido';
        }
    };
    
    // Get estado color baseado no input
    const getEstadoColor = (estado) => {
        switch (estado) {
            case '3':
                return '#ff9800'; // Laranja
            case '2':
                return '#2196F3'; // Azul
            case '4':
                return '#9C27B0'; // Roxo
            case '1':
                return '#f44336'; // Vermelho
            case '0':
                return '#4CAF50'; // Verde
            default:
                return '#757575'; // Cinza
        }
    };

    // Get prioridade based on the input
    const getPrioridade = (prioridade) => {
        switch (prioridade) {
            case 'AL':
            case '3':
                return 'Alta';
            case 'MD':
            case '2':
                return 'Média';
            case 'BX':
            case '1':
                return 'Baixa';
            default:
                return 'Desconhecida';
        }
    };

    // Get prioridade color
    const getPrioridadeColor = (prioridade) => {
        switch (prioridade) {
            case 'AL':
            case '3':
                return '#f44336'; // Vermelho
            case 'MD':
            case '2':
                return '#ff9800'; // Laranja
            case 'BX':
            case '1':
                return '#4CAF50'; // Verde
            default:
                return '#757575'; // Cinza
        }
    };

    // Get serie based on the input
    const getSerie = (serie) => {
        switch (serie) {
            case '2024':
                return '2024';
            case '2025':
                return '2025';
            default:
                return serie || 'Desconhecida';
        }
    };

    // Toggle section expansion
    const toggleSection = (numProcesso) => {
        setExpandedSections(prevState => ({
            ...prevState,
            [numProcesso]: !prevState[numProcesso]
        }));
    };

    // Render individual pedido item
    const renderPedidoDetails = (pedido) => (
        <View style={styles.pedidoDetailContainer}>
            <View style={styles.pedidoInfoRow}>
                <View style={styles.pedidoInfoColumn}>
                    <View style={styles.infoGroup}>
                        <Text style={styles.pedidoDetailLabel}>Cliente</Text>
                        <Text style={styles.pedidoDetailValue}>{pedido.Cliente} - {pedido.Nome}</Text>
                    </View>
                    
                    <View style={styles.infoGroup}>
                        <Text style={styles.pedidoDetailLabel}>Data de Abertura</Text>
                        <Text style={styles.pedidoDetailValue}>
                            {new Date(pedido.DataHoraAbertura).toLocaleDateString()} {new Date(pedido.DataHoraAbertura).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Text>
                    </View>
                </View>
                
                <View style={styles.pedidoInfoColumn}>
                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, {backgroundColor: getPrioridadeColor(pedido.Prioridade) + '20', borderColor: getPrioridadeColor(pedido.Prioridade)}]}>
                            <Text style={[styles.badgeText, {color: getPrioridadeColor(pedido.Prioridade)}]}>
                                {getPrioridade(pedido.Prioridade)}
                            </Text>
                        </View>
                        
                        <View style={[styles.badge, {backgroundColor: getEstadoColor(pedido.Estado) + '20', borderColor: getEstadoColor(pedido.Estado)}]}>
                            <Text style={[styles.badgeText, {color: getEstadoColor(pedido.Estado)}]}>
                                {getEstado(pedido.Estado)}
                            </Text>
                        </View>
                        
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {getSerie(pedido.Serie)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
            
            <View style={styles.descriptionContainer}>
                <Text style={styles.pedidoDetailLabel}>Descrição</Text>
                <Text style={styles.descriptionText}>{pedido.DescricaoProb}</Text>
            </View>
        </View>
    );

    const prioridades = [
        { label: "Baixa", value: '1' },
        { label: "Média", value: '2' },
        { label: "Alta", value: '3' },
    ];

    const estados = [
        { label: "Em Espera", value: '1', descricao: 'Aguardar intervenção equipa Advir' },
        { label: "Pendentes", value: 'pendentes', descricao: 'Inclui: Em curso Equipa Advir, Reportado para Parceiro, Aguarda resposta Cliente' },
        { label: "Finalizados", value: '0', descricao: 'Terminado' },
    ];

    const series = [
        { label: "2024", value: '2024', descricao: '2024' },
        { label: "2025", value: '2025', descricao: '2025' },
    ];
    
    const renderFilterMenu = () => (
        <View style={[styles.filterMenu, !showFilters && styles.filterMenuClosed]}>
            <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Filtros</Text>
                <TouchableOpacity 
                    style={styles.toggleFiltersButton} 
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <FontAwesomeIcon 
                        icon={showFilters ? faChevronUp : faChevronDown} 
                        style={styles.filterIcon} 
                        size={16} 
                    />
                </TouchableOpacity>
            </View>
            
            {showFilters && (
                <View style={styles.filterContent}>
                    <Text style={styles.filterLabel}>Prioridade</Text>
                    <View style={styles.filterGroup}>
                        {prioridades.map(({ label, value }) => (
                            <TouchableOpacity
                                key={value}
                                style={[
                                    styles.filterButton,
                                    filterPrioridade === value && styles.filterButtonSelected,
                                ]}
                                onPress={() =>
                                    setFilterPrioridade((prev) => (prev === value ? '' : value))
                                }
                            >
                                <Text
                                    style={[
                                        styles.filterButtonText,
                                        filterPrioridade === value && styles.filterButtonTextSelected,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
            
                    <Text style={styles.filterLabel}>Estado</Text>
                    <View style={styles.filterGroup}>
                        {estados.map(({ label, value }) => (
                            <TouchableOpacity
                                key={value}
                                style={[
                                    styles.filterButton,
                                    filterEstado === value && styles.filterButtonSelected,
                                ]}
                                onPress={() =>
                                    setFilterEstado((prev) => (prev === value ? '' : value))
                                }
                            >
                                <Text
                                    style={[
                                        styles.filterButtonText,
                                        filterEstado === value && styles.filterButtonTextSelected,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    
                    <Text style={styles.filterLabel}>Série</Text>
                    <View style={styles.filterGroup}>
                        {series.map(({ label, value }) => (
                            <TouchableOpacity
                                key={value}
                                style={[
                                    styles.filterButton,
                                    filterSerie === value && styles.filterButtonSelected,
                                ]}
                                onPress={() =>
                                    setFilterSerie((prev) => (prev === value ? '' : value))
                                }
                            >
                                <Text
                                    style={[
                                        styles.filterButtonText,
                                        filterSerie === value && styles.filterButtonTextSelected,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );

    // Render section for each NumProcesso
    const renderSection = ({ item }) => {
        if (!item || !item[0]) return null; // Evita erros com grupos inválidos
    
        const numProcesso = item[0].NumProcesso || 'Desconhecido';
        const cliente = item[0].Nome || 'Cliente Desconhecido';
        const isExpanded = expandedSections[numProcesso];
        const estado = item[0].Estado || '0';
    
        return (
            <View style={[styles.sectionContainer, { borderLeftColor: getEstadoColor(estado) }]}>
                <View style={styles.sectionHeaderContainer}>
                    <TouchableOpacity 
                        style={styles.sectionHeader} 
                        onPress={() => toggleSection(numProcesso)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.headerTitleContainer}>
                            <FontAwesomeIcon
                                icon={isExpanded ? faChevronUp : faChevronDown}
                                style={styles.expandIcon}
                                size={14}
                            />
                            <Text style={styles.sectionHeaderText}>
                                {`${numProcesso} - ${cliente}`}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={async () => {
                                try {
                                    await AsyncStorage.setItem('intervencaoId', item[0].ID.toString());
                                    navigation.navigate('Intervencoes', { reload: true });
                                } catch (error) {
                                    console.error('Erro ao armazenar o ID:', error);
                                }
                            }}
                        >
                            <FontAwesomeIcon icon={faExpand} style={styles.icon} size={16} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => {
                                setPedidoToDelete(item[0].ID);
                                setModalVisible(true);
                            }}
                        >
                            <FontAwesomeIcon icon={faTrash} style={styles.iconDelete} size={16} />
                        </TouchableOpacity>
                    </View>
                </View>
                
                {isExpanded && (
                    <View style={styles.pedidosContainer}>
                        {item.map((pedido) => (
                            <View key={pedido.ID} style={styles.pedidoContainer}>
                                {renderPedidoDetails(pedido)}
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Pedidos de Assistência</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <FontAwesomeIcon icon={faSearch} style={styles.searchIcon} size={18} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Procurar..."
                        value={searchTerm}
                        onChangeText={handleSearch}
                    />
                </View>
                
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('RegistarPedido')}
                >
                    <FontAwesomeIcon icon={faPlus} style={styles.addButtonIcon} size={16} />
                    <Text style={styles.addButtonText}>Criar Pedido</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                style={styles.filterToggleButton}
                onPress={() => setShowFilters(!showFilters)}
            >
                <FontAwesomeIcon icon={faFilter} style={styles.filterToggleIcon} size={14} />
                <Text style={styles.filterToggleText}>
                    {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
                </Text>
            </TouchableOpacity>

            {renderFilterMenu()}

            {errorMessage ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
            ) : null}

            <View style={styles.tableContainer}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#1792FE" style={styles.loadingIndicator} />
                        <Text style={styles.loadingText}>Carregando pedidos...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredData}
                        renderItem={renderSection}
                        keyExtractor={(group) => group[0]?.NumProcesso?.toString() || Math.random().toString()}
                        ListEmptyComponent={
                            <View style={styles.emptyListContainer}>
                                <Text style={styles.emptyListText}>Nenhum pedido de assistência encontrado.</Text>
                                <TouchableOpacity
                                    style={styles.emptyListButton}
                                    onPress={() => navigation.navigate('RegistarPedido')}
                                >
                                    <Text style={styles.emptyListButtonText}>Criar Primeiro Pedido</Text>
                                </TouchableOpacity>
                            </View>
                        }
                        contentContainerStyle={styles.flatListContent}
                    />
                )}
            </View>

            {/* Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalView}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Confirmar Eliminação</Text>
                        </View>
                        
                        <Text style={styles.modalText}>Tem certeza que deseja eliminar este pedido? Esta ação não pode ser desfeita.</Text>
                        
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]} 
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.deleteConfirmButton]} 
                                onPress={handleDeleteConfirmation}
                            >
                                <Text style={styles.deleteConfirmButtonText}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// Define styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#d4e4ff',
    },
    header: {
        backgroundColor: '#1792FE',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 22,
        color: '#fff',
        fontWeight: '700',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginRight: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    searchIcon: {
        color: '#1792FE',
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 16,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1792FE',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        shadowColor: '#1792FE',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    addButtonIcon: {
        color: '#fff',
        marginRight: 6,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    filterToggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 8,
    },
    filterToggleIcon: {
        color: '#1792FE',
        marginRight: 6,
    },
    filterToggleText: {
        color: '#1792FE',
        fontWeight: '500',
        fontSize: 14,
    },
    filterMenu: {
        marginHorizontal: 20,
        marginBottom: 15,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        overflow: 'hidden',
    },
    filterMenuClosed: {
        marginBottom: 10,
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: showFilters => showFilters ? '#eee' : 'transparent',
    },
    filterTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#444',
    },
    toggleFiltersButton: {
        padding: 5,
    },
    filterIcon: {
        color: '#666',
    },
    filterContent: {
        padding: 15,
        paddingTop: 5,
    },
    filterLabel: {
        fontWeight: '600',
        marginVertical: 8,
        color: '#555',
        fontSize: 14,
    },
    filterGroup: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    filterButton: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
    },
    filterButtonSelected: {
        backgroundColor: '#1792FE',
        borderColor: '#1792FE',
    },
    filterButtonText: {
        color: '#555',
        fontWeight: '500',
        fontSize: 13,
    },
    filterButtonTextSelected: {
        color: '#fff',
    },
    errorContainer: {
        margin: 20,
        padding: 12,
        backgroundColor: '#ffebee',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#f44336',
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 14,
    },
    tableContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingIndicator: {
        marginBottom: 15,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    flatListContent: {
        paddingBottom: 20,
    },
    sectionContainer: {
        marginBottom: 15,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        borderLeftWidth: 4,
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
    },
    sectionHeader: {
        flex: 1,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    expandIcon: {
        color: '#666',
        marginRight: 8,
    },
    sectionHeaderText: {
        fontWeight: '600',
        fontSize: 15,
        color: '#333',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        borderRadius: 6,
        marginLeft: 5,
        backgroundColor: '#f0f7ff',
    },
    deleteButton: {
        backgroundColor: '#ffebee',
    },
    icon: {
        color: '#1792FE',
    },
    iconDelete: {
        color: '#f44336',
    },
    pedidosContainer: {
        padding: 15,
        paddingTop: 0,
    },
    pedidoContainer: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 15,
    },
    pedidoDetailContainer: {
        marginVertical: 5,
    },
    pedidoInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    pedidoInfoColumn: {
        flex: 1,
    },
    infoGroup: {
        marginBottom: 8,
    },
    pedidoDetailLabel: {
        fontWeight: '600',
        fontSize: 13,
        color: '#666',
        marginBottom: 3,
    },
    pedidoDetailValue: {
        fontSize: 14,
        color: '#333',
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#f0f0f0',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginLeft: 6,
        marginBottom: 6,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#555',
    },
    descriptionContainer: {
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 8,
        marginTop: 5,
    },
    descriptionText: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
    },
    emptyListContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyListText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    emptyListButton: {
        backgroundColor: '#1792FE',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    emptyListButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        width: '85%',
        maxWidth: 400,
        backgroundColor: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    modalHeader: {
        backgroundColor: '#f44336',
        padding: 16,
    },
    modalTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalText: {
        marginVertical: 25,
        textAlign: 'center',
        fontSize: 15,
        paddingHorizontal: 20,
        color: '#444',
    },
    modalButtons: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    modalButton: {
        flex: 1,
        padding: 15,
        alignItems: 'center',
    },
    cancelButton: {
        borderRightWidth: 1,
        borderRightColor: '#eee',
    },
    deleteConfirmButton: {
        backgroundColor: '#f44336',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 15,
    },
    deleteConfirmButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 15,
    },
});

export default PedidosAssistencia;
