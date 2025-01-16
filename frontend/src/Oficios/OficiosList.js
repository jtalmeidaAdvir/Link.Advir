import React, { useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

const OficiosList = () => {
  const navigation = useNavigation();

  // Dados estáticos para a FlatList
  const [oficios, setOficios] = useState([
    { id: "1", title: "Ofício 1", description: "Descrição do Ofício 1" },
    { id: "2", title: "Ofício 2", description: "Descrição do Ofício 2" },
    { id: "3", title: "Ofício 3", description: "Descrição do Ofício 3" },
  ]);

  const [searchQuery, setSearchQuery] = useState("");

  // Filtra os ofícios com base na pesquisa
  const filteredOficios = oficios.filter((oficio) =>
    oficio.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        onChangeText={(text) => setSearchQuery(text)}
      />

      <FlatList
        data={filteredOficios}
        renderItem={renderOficio}
        keyExtractor={(item) => item.id}
      />

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
    backgroundColor: "#f9f9f9",
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