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

const groupByObra = (oficios) => {
    const grouped = oficios.reduce((acc, oficio) => {
        const obra = oficio.CDU_DonoObra || "Sem Obra";
        if (!acc[obra]) {
            acc[obra] = [];
        }
        acc[obra].push(oficio);
        return acc;
    }, {});

    // Retorna a lista agrupada por 'Dono da Obra'
    return Object.keys(grouped).map((obra) => ({
        title: obra,
        data: grouped[obra],
        expanded: false // Definir o estado expandido para falso inicialmente
    }));
};



const OficiosList = () => {
    const navigation = useNavigation();

    const [oficios, setOficios] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOficio, setSelectedOficio] = useState(null);
    const [groupedOficios, setGroupedOficios] = useState([]);

    useFocusEffect(
        useCallback(() => {
            // Limpa os estados quando a página é focada
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


                const grouped = groupByObra(sortedOficios);  // Agrupa os ofícios por 'CDU_DonoObra'
                setGroupedOficios(grouped); // Atualiza a lista agrupada
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

        // Aplica o filtro de pesquisa pelo "CDU_DonoObra"
        if (searchQuery) {
            filteredOficios = oficios.filter((oficio) =>
                oficio.CDU_DonoObra.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Agrupar os ofícios por "CDU_DonoObra"
        const grouped = groupByObra(filteredOficios);
        setGroupedOficios(grouped);  // Atualiza a lista agrupada
    };

    useEffect(() => {
        // Quando a pesquisa for alterada, chama a função para filtrar e agrupar os ofícios
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
        <View>
            <TouchableOpacity
                onPress={() => toggleGroupExpand(index)}
                style={styles.groupHeader}
            >
                <Text style={styles.groupTitle}>{item.title}</Text>
            
            </TouchableOpacity>

            {item.expanded && (
                <FlatList
                    data={item.data}
                    renderItem={renderOficio}
                    keyExtractor={(oficio) => oficio.CDU_codigo.toString()}
                />
            )}
        </View>
    );



    const renderOficio = ({ item }) => {
        const isInactive = item.CDU_isactive === false;
        const isEmailSent = item.CDU_estado === "Enviado Por Email";
        const isPrinted = item.CDU_estado === "Imprimido";

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

                    {/* Estado do ofício */}
                    <View style={styles.row}>
                        <Icon name="check-circle" size={16} color={isEmailSent ? "green" : isPrinted ? "red" : "gray"} style={styles.icon} />
                        <Text style={[styles.statusText, isEmailSent && styles.emailSentText, isPrinted && styles.printedText]}>
                            {item.CDU_estado}
                        </Text>
                    </View>
                </View>

                {/* Botões apenas se ativo */}
                {!isInactive && !isEmailSent && (
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
                    data={groupedOficios}
                    renderItem={renderGroup}
                    keyExtractor={(item, index) => index.toString()}
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
                onCancel={() => setModalVisible(false)}
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

                        const responseText = await response.text();
                        console.log('Resposta do servidor:', responseText);

                        if (!response.ok) {
                            throw new Error(`Erro ao eliminar o ofício: ${response.statusText}`);
                        }

                        const responseData = JSON.parse(responseText);
                        alert(`Ofício ${selectedOficio} eliminado com sucesso.`);
                        setModalVisible(false);
                        fetchOficios();
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
    groupContainer: {
        marginBottom: 20,
    },
    groupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        backgroundColor: '#f1f1f1',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    // ... outros estilos
    emailSentContainer: {
        backgroundColor: "#d4f8d4", // Verde claro para ofícios enviados por email
    },
    emailSentText: {
        color: "green", // Verde escuro para destacar
        fontWeight: "bold",
    },
    printedText: {
        color: "red", // Vermelho para indicar que foi impresso
        fontWeight: "bold",
    },
    statusText: {
        fontSize: 14,
        marginLeft: 8,
    },
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
