import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather as Icon } from '@expo/vector-icons';


const OficiosList = () => {
    const navigation = useNavigation();

    const [oficios, setOficios] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useFocusEffect(
        useCallback(() => {
            // Limpa os estados quando a página é focada
            setSearchQuery("");
            setOficios([]);
            setError(null);
            setLoading(true);

            const fetchOficios = async () => {
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
                        setOficios(data.DataSet.Table);
                    } else {
                        setOficios([]);
                        setError('Dados não encontrados ou estrutura inesperada');
                    }
                } catch (error) {
                    console.error('Error fetching oficios:', error);
                    setOficios([]);
                    setError('Erro ao carregar os dados');
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

    const renderOficio = ({ item }) => (
        <View style={styles.itemContainer}>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.CDU_codigo}</Text>
                <Text style={styles.description}>{item.CDU_assunto}</Text>
                <Text style={styles.description}>{item.CDU_remetente}</Text>
            </View>

            {/* Botão de editar com ícone */}
            <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate("EditOficio", { oficioId: item.CDU_codigo, oficioData: item })}
            >
                {/* Substitui pelo ícone que preferires */}
                <Icon name="edit" size={20} color="#fff" style={styles.editIcon} />

            </TouchableOpacity>
        </View>
    );
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
                setOficios(data.DataSet.Table);
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
                <Text>Carregando...</Text>
            ) : error ? (
                <Text>{error}</Text>
            ) : (
                <FlatList
                    data={filteredOficios}
                    renderItem={renderOficio}
                    keyExtractor={(item) => item.CDU_codigo.toString()}
                />
            )}

            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate("OficiosPage")}
            >
                <Text style={styles.buttonText}>Criar Novo Ofício</Text>
            </TouchableOpacity>
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
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: "bold",
    },
    description: {
        fontSize: 14,
        color: "#666",
        marginTop: 4,
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#007bff",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        justifyContent: 'center',
    },
    editIcon: {
        marginRight: 6,
    },
    editButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },
});

export default OficiosList;
