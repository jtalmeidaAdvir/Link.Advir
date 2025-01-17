import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";


const OficiosList = () => {
    const navigation = useNavigation();

    // Dados estáticos para a FlatList
    const [oficios, setOficios] = useState([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true); // Estado de carregamento
    const [error, setError] = useState(null); // Estado de erro



    // Função para buscar os dados da API
    useFocusEffect(
        React.useCallback(() => {
            // Função assíncrona dentro do efeito
            const fetchOficios = async () => {
                const token = localStorage.getItem('painelAdminToken');
                const urlempresa = localStorage.getItem('urlempresa');

                if (!urlempresa) {
                    setError('URL da empresa não encontrada.');
                    setLoading(false);
                    return;
                }

                try {
                    const response = await fetch('http://localhost:3001/oficio/Listar', {
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
                    console.log(data); // Verifique a estrutura da resposta

                    // Verificando se os dados existem e se a estrutura está correta
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

            fetchOficios(); // Chame a função assíncrona aqui
        }, [])
    );



    // Filtrando os ofícios com base na pesquisa
    const filteredOficios = oficios.filter((oficio) => {
        // Garantir que o 'title' (ou CDU_assunto) seja uma string
        const title = oficio.CDU_assunto ? oficio.CDU_assunto.toLowerCase() : '';
        return title.includes(searchQuery.toLowerCase());
    });

  // Renderiza cada item da lista
  const renderOficio = ({ item }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

    return (
        <View style={styles.container}>
            {/* Barra de Pesquisa */}
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
                    renderItem={({ item }) => (
                        <View style={styles.itemContainer}>
                            <Text style={styles.title}>{item.CDU_codigo}</Text>
                            <Text style={styles.description}>{item.CDU_assunto} {item.CDU_remetente}</Text>
                            <Text style={styles.description}>{item.CDU_remetente}</Text>
                        </View>
                    )}
                    keyExtractor={(item) => item.CDU_codigo}
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
});

export default OficiosList;