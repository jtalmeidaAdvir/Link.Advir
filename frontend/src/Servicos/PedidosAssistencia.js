import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity, StyleSheet, FlatList, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClose, faExpand, faTrash } from '@fortawesome/free-solid-svg-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const PedidosAssistencia = ({ navigation }) => {
    // State variables
    const [searchTerm, setSearchTerm] = useState('');
    const [pedidos, setPedidos] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [pedidoToDelete, setPedidoToDelete] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});
    const [loading, setLoading] = useState(true);
    const [filterPrioridade, setFilterPrioridade] = useState(''); 
    const [filterEstado, setFilterEstado] = useState('1'); 

    const [filteredData, setFilteredData] = useState([]);


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
    }, [pedidos, searchTerm, filterPrioridade, filterEstado]);


    // Fetch pedidos when the component mounts or the screen is focused
    useFocusEffect(
        React.useCallback(() => {
            const fetchPedidos = async () => {
                const token = localStorage.getItem('painelAdminToken');  // Usando localStorage para obter o token
                const empresaSelecionada = localStorage.getItem('empresaSelecionada'); // Recuperando empresa
                const urlempresa = localStorage.getItem('urlempresa'); // Recuperando urlempresa
            
                if (!urlempresa) {
                    setErrorMessage('URL da empresa não encontrada.');
                    setLoading(false);
                    return;
                }
            
                try {
                    const response = await fetch('https://webapiprimavera.advir.pt/listarPedidos/listarPedidos', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`, // Passando o token no cabeçalho
                            'urlempresa': urlempresa, // Passando o urlempresa no cabeçalho
                            'Content-Type': 'application/json',
                        },
                    });
            
                    if (!response.ok) {
                        throw new Error(`Error: ${response.statusText}`);
                    }
            
                    const data = await response.json();
                    console.log(data.DataSet);
                    setPedidos(data.DataSet.Table); // Ajuste conforme a estrutura do seu retorno
                } catch (error) {
                    console.error('Error fetching pedidos:', error);
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
        console.log('Eliminando pedido com ID:', id);
        try {
            const token = await AsyncStorage.getItem('painelAdminToken');
            const urlempresa = await AsyncStorage.getItem('urlempresa');  // Agora usando AsyncStorage também
    
            if (!token || !urlempresa) {
                throw new Error('Token ou URL da empresa não encontrados.');
            }
    
            const response = await fetch(`https://webapiprimavera.advir.pt/routePedidos_STP/EliminarPedido/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'urlempresa': urlempresa,  // Passa urlempresa como cabeçalho
                    'Content-Type': 'application/json',
                },
            });
    
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }
    
            // Remove o pedido eliminado do estado local
            setPedidos((prevPedidos) => prevPedidos.filter(pedido => pedido.ID !== id));
        } catch (error) {
            console.error('Erro ao eliminar pedido:', error);
        }
    };

    const filteredAndGroupedPedidos = Object.values(
        applyFilters().reduce((acc, pedido) => {
            const numProcesso = pedido.NumProcesso;
            if (!acc[numProcesso]) {
                acc[numProcesso] = [];
            }
            acc[numProcesso].push(pedido);
            return acc;
        }, {})
    );
    
   
    
    

    // Handle delete confirmation
    const handleDeleteConfirmation = () => {
        if (pedidoToDelete) {
            deletePedido(pedidoToDelete);
            setPedidoToDelete(null);
        }
        setModalVisible(false); // Close the modal after confirmation
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
    

    // Get prioridade based on the input
    const getPrioridade = (prioridade) => {
        switch (prioridade) {
            case 'AL':
                return 'Alta';
            case 'MD':
                return 'Média';
            case 'BX':
                return 'Baixa';
            case '3':
                return 'Alta';
            case '2':
                return 'Média';
            case '1':
                return 'Baixa';
            default:
                return 'Desconhecida';
        }
    };

    // Toggle section expansion
    const toggleSection = (numProcesso) => {
        setExpandedSections(prevState => ({
            ...prevState,
            [numProcesso]: !prevState[numProcesso]
        }));
    };

    // Group pedidos by NumProcesso
    const groupedPedidos = pedidos.reduce((acc, pedido) => {
        const numProcesso = pedido.NumProcesso;
        if (!acc[numProcesso]) {
            acc[numProcesso] = [];
        }
        acc[numProcesso].push(pedido);
        return acc;
    }, {});

    // Render individual pedido item
    const renderPedidoDetails = (pedido) => (
        <View style={styles.pedidoDetailContainer}>
            <Text style={styles.pedidoDetailLabel}>Cliente:</Text>
            <Text style={styles.pedidoDetailValue}>{pedido.Cliente} - {pedido.Nome}</Text>

            <Text style={styles.pedidoDetailLabel}>Data de Abertura:</Text>
            <Text style={styles.pedidoDetailValue}>{new Date(pedido.DataHoraAbertura).toLocaleString()}</Text>
            <Text style={styles.pedidoDetailLabel}>Prioridade:</Text>
            <Text style={styles.pedidoDetailValue}>{getPrioridade(pedido.Prioridade)}</Text>
            <Text style={styles.pedidoDetailLabel}>Estado:</Text>
            <Text style={styles.pedidoDetailValue}>{getEstado(pedido.Estado)}</Text>
            <Text style={styles.pedidoDetailLabel}>Descrição:</Text>
            <Text style={styles.pedidoDetailValue}>{pedido.DescricaoProb}</Text>
        </View>
    );

    const prioridades = [
        { label: 'Baixa', value: '1' },
        { label: 'Média', value: '2' },
        { label: 'Alta', value: '3' },
    ];

    const estados = [
        { label: 'Novos', value: '1', descricao: 'Aguardar intervenção equipa Advir' },
        { label: 'Pendentes', value: 'pendentes', descricao: 'Inclui: Em curso Equipa Advir, Reportado para Parceiro, Aguarda resposta Cliente' },
        { label: 'Terminados', value: '0', descricao: 'Terminado' },
    ];
    
    
    

    const renderFilterMenu = () => (
        <View style={styles.filterMenu}>
            <Text style={styles.filterLabel}>Prioridade:</Text>
            <View style={styles.filterGroup}>
    {prioridades.map(({ label, value }) => (
        <TouchableOpacity
            key={value}
            style={[
                styles.filterButton,
                filterPrioridade === value && styles.filterButtonSelected,
            ]}
            onPress={() =>
                setFilterPrioridade((prev) => (prev === value ? '' : value)) // Define o valor interno
            }
        >
            <Text
                style={[
                    styles.filterButtonText,
                    filterPrioridade === value && styles.filterButtonTextSelected,
                ]}
            >
                {label} {/* Exibe o valor visual */}
            </Text>
        </TouchableOpacity>
    ))}
</View>
    
            <Text style={styles.filterLabel}>Estado:</Text>
            <View style={styles.filterGroup}>
            {estados.map(({ label, value }) => (
                    <TouchableOpacity
                    key={value}
                    style={[
                        styles.filterButton,
                        filterEstado === value && styles.filterButtonSelected,
                    ]}
                    onPress={() =>
                        setFilterEstado((prev) => (prev === value ? '' : value)) // Define o valor interno
                    }
                >
                    <Text
                        style={[
                            styles.filterButtonText,
                            filterEstado === value && styles.filterButtonTextSelected,
                        ]}
                    >
                        {label} {/* Exibe o valor visual */}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    
          
        </View>
    );
    



    // Render section for each NumProcesso
    const renderSection = ({ item }) => {
        

        if (!item || !item[0]) return null; // Evita erros com grupos inválidos
    
        const numProcesso = item[0].NumProcesso || 'Desconhecido'; // Fallback para NumProcesso
        const cliente = item[0].Nome || 'Cliente Desconhecido'; // Fallback para Nome
        const isExpanded = expandedSections[numProcesso];
    
        return (
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderContainer}>
                    <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(numProcesso)}>
                        <Text style={styles.sectionHeaderText}>{`${numProcesso} - ${cliente}`}<TouchableOpacity onPress={async () => {
                            try {
                                await AsyncStorage.setItem('intervencaoId', item[0].ID.toString());
                                navigation.navigate('Intervencoes', { reload: true });
                            } catch (error) {
                                console.error('Erro ao armazenar o ID:', error);
                            }
                        }}>
                            <FontAwesomeIcon icon={faExpand} style={styles.icon} />
                        </TouchableOpacity></Text>
                        
                    </TouchableOpacity>
                    
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity onPress={() => { /* Implement close logic */ }}>
                            <FontAwesomeIcon icon={faClose} style={styles.icon} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => {
                            setPedidoToDelete(item[0].ID); // Assume the first item is the representative ID
                            setModalVisible(true); // Show the modal for delete confirmation
                        }}>
                            <FontAwesomeIcon icon={faTrash} style={styles.iconDelete} />
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
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Pedidos de Assistência</Text>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="🔍 Procurar..."
                    value={searchTerm}
                    onChangeText={handleSearch}
                />
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('RegistarPedido')}
                >
                    <Text style={styles.addButtonText}>+ Pedido</Text>
                </TouchableOpacity>
                

            </View>

            <View style={styles.tableContainer}>
            {renderFilterMenu()}
                {loading ? (
                    <ActivityIndicator size="large" color="#0022FF" style={styles.loadingIndicator} />
                ) : (
                    <FlatList
                        data={filteredAndGroupedPedidos}
                        renderItem={renderSection}
                        keyExtractor={(group) => group[0]?.NumProcesso?.toString() || Math.random().toString()}
                        ListEmptyComponent={
                            <Text style={{ textAlign: 'center', marginTop: 20 }}>Nenhum pedido encontrado.</Text>
                        }
                      
                    />






                )}
            </View>

            {/* Confirmation Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalText}>Tem certeza que deseja eliminar este pedido?</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.button} onPress={() => setModalVisible(false)}>
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.button} onPress={handleDeleteConfirmation}>
                                <Text style={styles.buttonText}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

// Define styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#d4e4ff',
    },
    title: {
        fontSize: 24,
        color: '#0022FF',
        fontWeight: '600',
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        padding: 10,
        borderColor: '#0022FF',
        borderWidth: 1,
        borderRadius: 30,
        marginRight: 10,
    },
    addButton: {
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    tableContainer: {
        flex: 1,
    },
    loadingIndicator: {
        marginTop: 20,
    },
    sectionContainer: {
        marginBottom: 15,
        backgroundColor: '#fff',
        borderRadius: 5,
        elevation: 1,
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'white',
        borderTopLeftRadius: 5,
        borderTopRightRadius: 5,
    },
    sectionHeader: {
        flex: 1,
    },
    sectionHeaderText: {
        fontWeight: 'bold',
    },
    pedidosContainer: {
        padding: 10,
    },
    pedidoContainer: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    pedidoDetailContainer: {
        marginVertical: 5,
    },
    pedidoDetailLabel: {
        fontWeight: 'bold',
    },
    pedidoDetailValue: {
        marginBottom: 5,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
    },
    icon: {
        marginHorizontal: 5,
        color: '#007bff',
    },
    iconDelete: {
        marginHorizontal: 5,
        color: 'red',
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        backgroundColor: '#007bff',
        borderRadius: 5,
        padding: 10,
        margin: 5,
        flex: 1,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    flatListContent: {
        paddingBottom: 20,
    },
    filterMenu: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 5,
    },
    filterLabel: {
        fontWeight: 'bold',
        marginVertical: 5,
    },
    filterInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
    },
    orderButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    orderButton: {
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 5,
        marginHorizontal: 5,
    },
    orderButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    filterGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    filterButton: {
        flex: 1,
        marginHorizontal: 5,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    filterButtonSelected: {
        backgroundColor: '#007bff',
        borderColor: '#007bff',
    },
    filterButtonText: {
        color: '#000',
    },
    filterButtonTextSelected: {
        color: '#fff',
    },
    orderButtonSelected: {
        backgroundColor: '#0056b3',
    },
    
});

export default PedidosAssistencia;
