import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather as Icon } from '@expo/vector-icons';



// Componente ConfirmModal
const ConfirmModal = ({ visible, onCancel, onConfirm, codigo }) => (
    <Modal visible={visible} transparent={true} animationType="slide">
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
            <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 8, width: "80%" }}>
                <Text style={{ fontSize: 16, marginBottom: 10, textAlign:"center" }}>
                    Tem a certeza que deseja eliminar o ofício com o código {codigo}?
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                    <TouchableOpacity onPress={onCancel}>
                        <Text style={{ color: "#007bff" }}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onConfirm}>
                        <Text style={{ color: "#ff0000" }}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);



const OficiosList = () => {
    const navigation = useNavigation();

    const [oficios, setOficios] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
     // Estado para o modal
     const [modalVisible, setModalVisible] = useState(false);
     const [selectedOficio, setSelectedOficio] = useState(null);

    useFocusEffect(
        useCallback(() => {
            // Limpa os estados quando a página é focada
            setSearchQuery("");
            setOficios([]);
            setError(null);
            setLoading(true);

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
                        // Ordenar com base no número dentro do código
                        const sortedOficios = data.DataSet.Table.sort((a, b) => {
                            // Extrai os números do código
                            const numA = parseInt(a.CDU_codigo.match(/\d+/g)[0], 10);
                            const numB = parseInt(b.CDU_codigo.match(/\d+/g)[0], 10);
            
                            // Ordenação decrescente (mais recente primeiro)
                            return numB - numA;
                        });
            
                        setOficios(sortedOficios);
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
            
            
            

            fetchOficios();
        }, []) // Assegure-se de passar um array vazio para evitar redefinir em loops desnecessários
    );


    const filteredOficios = oficios.filter((oficio) => {
        const codigo = oficio.CDU_codigo ? oficio.CDU_codigo.toLowerCase() : '';
        const assunto = oficio.cdu_assunto ? oficio.cdu_assunto.toLowerCase() : '';
        const remetente = oficio.cdu_remetente ? oficio.cdu_remetente.toLowerCase() : '';
        const query = searchQuery.toLowerCase();

        return (
            codigo.includes(query) ||
            assunto.includes(query) ||
            remetente.includes(query)
        );
    });

    const renderOficio = ({ item }) => {
        const isInactive = item.CDU_isactive === false;
    
        return (
            <View style={[styles.itemContainer, isInactive && styles.inactiveContainer]}>
                <View style={styles.textContainer}>
                    {/* Ícone e código do ofício */}
                    <View style={styles.row}>
                        <Icon name="hash" size={16} color="#007bff" style={styles.icon} />
                        <Text style={[styles.title, isInactive && styles.inactiveText]}>{item.CDU_codigo}</Text>
                    </View>
    
                    {/* Ícone e assunto do ofício */}
                    <View style={styles.row}>
                        <Icon name="file-text" size={16} color="#007bff" style={styles.icon} />
                        <Text style={[styles.description, isInactive && styles.inactiveText]}>{item.CDU_assunto}</Text>
                    </View>
    
                    {/* Ícone e remetente do ofício */}
                    <View style={styles.row}>
                        <Icon name="user" size={16} color="#007bff" style={styles.icon} />
                        <Text style={[styles.description, isInactive && styles.inactiveText]}>{item.CDU_remetente}</Text>
                    </View>
                </View>
    
                {/* Botões apenas se ativo */}
                {!isInactive && (
                    <>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => navigation.navigate("EditOficio", { oficioId: item.CDU_codigo, oficioData: item })}
                        >
                            <Icon name="edit" size={20} color="#fff" style={styles.editIcon} />
                        </TouchableOpacity>
    
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => {
                                setSelectedOficio(item.CDU_codigo); // Armazena o código do ofício
                                setModalVisible(true); // Mostra o modal
                            }}
                        >
                            <Icon name="trash" size={20} color="#fff" />
                        </TouchableOpacity>
                    </>
                )}
            </View>
        );
    };
    
    
    // Usando o useFocusEffect para recarregar os dados quando a tela for focada
    useFocusEffect(
        useCallback(() => {
            fetchOficios();
        }, []) // Recarrega os dados sempre que a tela for trazida de volta
    );
    // Função para buscar os dados
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
                // Ordenar com base no número dentro do código
                const sortedOficios = data.DataSet.Table.sort((a, b) => {
                    // Extrai os números do código
                    const numA = parseInt(a.CDU_codigo.match(/\d+/g)[0], 10);
                    const numB = parseInt(b.CDU_codigo.match(/\d+/g)[0], 10);
    
                    // Ordenação decrescente (mais recente primeiro)
                    return numB - numA;
                });
    
                setOficios(sortedOficios);
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
    
    return (
        <View style={styles.container}>
            <TextInput
                style={styles.searchBar}
                placeholder="Pesquisar Ofício"
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            

            {loading ? (
                <Text>A carregar...</Text>
            ) : error ? (
                <Text>{error}</Text>
            ) : (
                <FlatList
                    data={filteredOficios}
                    renderItem={renderOficio}
                    keyExtractor={(item) => item.CDU_codigo.toString()}
                    getItemLayout={(data, index) => (
                        { length: 80, offset: 80 * index, index } // Define uma altura fixa de 80px por item
                    )}
                />

            )}

            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate("OficiosPage")}
            >
                <Text style={styles.buttonText}>Criar Novo Ofício</Text>
            </TouchableOpacity>
            {/* Modal de confirmação */}
            <ConfirmModal
                visible={modalVisible}
                codigo={selectedOficio}
                onCancel={() => setModalVisible(false)} // Fecha o modal
                onConfirm={async () => {
                    console.log('Código do ofício a eliminar:', selectedOficio);
                    const token = localStorage.getItem('painelAdminToken');
                    const urlempresa = localStorage.getItem('urlempresa');
                
                    if (!urlempresa) {
                        alert('URL da empresa não encontrada.');
                        return;
                    }
                
                    try {
                        const response = await fetch(`https://webapiprimavera.advir.pt/oficio/Eliminar/${selectedOficio}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'urlempresa': urlempresa,
                                'Content-Type': 'application/json',
                            },
                        });
                    
                        const responseText = await response.text(); // Obtém a resposta como texto
                        console.log('Resposta do servidor:', responseText);
                    
                        if (!response.ok) {
                            throw new Error(`Erro ao eliminar o ofício: ${response.statusText}`);
                        }
                    
                        const responseData = JSON.parse(responseText); // Converte em JSON, se possível
                        alert(`Ofício ${selectedOficio} eliminado com sucesso.`);
                        setModalVisible(false);
                        fetchOficios(); // Atualiza a lista
                    } catch (error) {
                        console.error('Erro na requisição:', error.message);
                        alert(`Erro ao eliminar o ofício: ${error.message}`);
                    }
                    
                }}
                
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#d4e4ff",
    },
    searchBar: {
        backgroundColor: "#fff",
        padding: 12,
        
        borderRadius: 8,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    itemContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: "#fff",
        padding: 16,
        marginBottom: 8,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        height: 100, // Ajuste a altura se necessário
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: "bold",
        marginLeft: 8, // Espaço entre o ícone e o texto
    },
    description: {
        fontSize: 14,
        color: "#666",
        marginLeft: 8, // Espaço entre o ícone e o texto
    },
    icon: {
        marginRight: 8, // Espaço entre os ícones para separação visual
    },
    button: {
        backgroundColor: "#007bff",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 16,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    editButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: "#007bff",
        borderRadius: 8,
    },
    deleteButton: {
        width: 40,
        height: 40,
        marginLeft:10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: "#007bff",
        borderRadius: 8,
    },
    editIcon: {
        margin: 0,
    },
    inactiveContainer: {
        backgroundColor: "#f0f0f0", // Cor mais clara para indicar inatividade
        opacity: 0.9, // Efeito de "sombreado"
    },
    inactiveText: {
        color: "#aaa", // Texto acinzentado para indicar inatividade
    },
});

export default OficiosList;
