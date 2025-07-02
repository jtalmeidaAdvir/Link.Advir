import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ListaEquipas = () => {
  const [equipas, setEquipas] = useState([]);
  const [editandoNome, setEditandoNome] = useState({});

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
      const res = await fetch(`https://backend.advir.pt/api/equipa-obra/listar-todas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const filtradas = data.filter(e => e.obra?.empresa_id == empresaId);
        setEquipas(filtradas);
      }
    } catch (err) {
      console.error('Erro ao carregar equipas:', err);
    }
  };

  const atualizarNome = async (nomeAtual, novoNome) => {
    try {
      const token = await AsyncStorage.getItem('loginToken');
      const equipaId = equipas.find(eq => eq.nome === nomeAtual)?.id;
      if (!equipaId) return;

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
        setEditandoNome({});
        fetchEquipas();
      } else {
        Alert.alert('Erro', 'Erro ao atualizar nome.');
      }
    } catch (err) {
      console.error('Erro ao atualizar nome:', err);
    }
  };

  const removerMembro = async (equipaObraId) => {
    try {
      const token = await AsyncStorage.getItem('loginToken');
      const res = await fetch(`https://backend.advir.pt/api/equipa-obra/${equipaObraId}`, {
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
      {editandoNome[item.nome] ? (
        <TextInput
          value={editandoNome[item.nome]}
          onChangeText={(text) => setEditandoNome({ ...editandoNome, [item.nome]: text })}
          style={styles.input}
        />
      ) : (
        <Text style={styles.nomeEquipa}>{item.nome}</Text>
      )}
      <Text>Encarregado: {item.encarregado?.nome}</Text>
      <Text>Obra: {item.obra?.codigo} - {item.obra?.nome}</Text>
      <Text style={{ fontWeight: 'bold', marginTop: 5 }}>Membros:</Text>
      {item.membros.map((membro, index) => (
        <View key={index} style={styles.membroContainer}>
          <Text>- {membro.nome} ({membro.tipoUser})</Text>
          <TouchableOpacity onPress={() => removerMembro(membro.equipaObraId)} style={styles.btnRemover}>
            <Text style={styles.btnText}>Remover</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.botoesContainer}>
        {editandoNome[item.nome] ? (
          <TouchableOpacity onPress={() => atualizarNome(item.nome, editandoNome[item.nome])} style={styles.btnSalvar}>
            <Text style={styles.btnText}>Salvar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setEditandoNome({ [item.nome]: item.nome })} style={styles.btnEditar}>
            <Text style={styles.btnText}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <FlatList
      data={equipas}
      keyExtractor={(item) => item.nome}
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
  membroContainer: {
    marginLeft: 10,
    marginTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  botoesContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    backgroundColor: '#DC3545',
    padding: 6,
    borderRadius: 6,
    marginLeft: 10
  },
  btnText: {
    color: 'white'
  }
});

export default ListaEquipas;
