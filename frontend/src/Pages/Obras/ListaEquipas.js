import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ListaEquipas = () => {
  const [equipas, setEquipas] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [novoNome, setNovoNome] = useState('');

  useEffect(() => {
    fetchEquipas();
  }, []);

  const obterIdDaEmpresa = async () => {
    const empresaNome = localStorage.getItem("empresaSelecionada");
    const loginToken = localStorage.getItem("loginToken");
    try {
      const res = await fetch(`https://backend.advir.pt/api/empresas/nome/${empresaNome}`, {
        headers: { Authorization: `Bearer ${loginToken}` },
      });
      const data = await res.json();
      return data.id;
    } catch (error) {
      console.error('Erro ao obter ID da empresa:', error);
      return null;
    }
  };

  const fetchEquipas = async () => {
    try {
      const token = await AsyncStorage.getItem('loginToken');
      const empresaId = await obterIdDaEmpresa();
      const res = await fetch(`https://backend.advir.pt/api/equipa-obra/por-empresa?empresa_id=${empresaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setEquipas(data);
    } catch (err) {
      console.error('Erro ao carregar equipas:', err);
    }
  };

  const atualizarNome = async (equipaId) => {
    try {
      const token = await AsyncStorage.getItem('loginToken');
      const res = await fetch(`https://backend.advir.pt/api/equipa-obra/${equipaId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ novoNome }),
      });
      if (res.ok) {
        Alert.alert('Sucesso', 'Nome da equipa atualizado!');
        setEditandoId(null);
        fetchEquipas();
      } else {
        Alert.alert('Erro', 'Erro ao atualizar nome.');
      }
    } catch (err) {
      console.error('Erro ao atualizar nome:', err);
    }
  };

  const removerMembro = async (equipaId) => {
    try {
      const token = await AsyncStorage.getItem('loginToken');
      const res = await fetch(`https://backend.advir.pt/api/equipa-obra/${equipaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert('Removido', 'Membro removido com sucesso.');
        fetchEquipas();
      }
    } catch (err) {
      console.error('Erro ao remover membro:', err);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {editandoId === item.id ? (
        <TextInput
          value={novoNome}
          onChangeText={setNovoNome}
          style={styles.input}
        />
      ) : (
        <Text style={styles.nomeEquipa}>{item.nome}</Text>
      )}
      <Text>Membro: {item.membro?.nome}</Text>
      <Text>Tipo: {item.membro?.tipoUser}</Text>
      <Text>Obra: {item.Obra?.codigo} - {item.Obra?.nome}</Text>
      <View style={styles.botoesContainer}>
        {editandoId === item.id ? (
          <TouchableOpacity onPress={() => atualizarNome(item.id)} style={styles.btnSalvar}>
            <Text style={styles.btnText}>Salvar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => { setEditandoId(item.id); setNovoNome(item.nome); }} style={styles.btnEditar}>
            <Text style={styles.btnText}>Editar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => removerMembro(item.id)} style={styles.btnRemover}>
          <Text style={styles.btnText}>Remover</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FlatList
      data={equipas}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16 }}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#f9f9f9'
  },
  nomeEquipa: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5
  },
  input: {
    borderColor: '#999',
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginBottom: 5
  },
  botoesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  btnEditar: {
    backgroundColor: '#FFA500',
    padding: 10,
    borderRadius: 6
  },
  btnSalvar: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 6
  },
  btnRemover: {
    backgroundColor: '#E53935',
    padding: 10,
    borderRadius: 6
  },
  btnText: {
    color: 'white'
  }
});

export default ListaEquipas;
