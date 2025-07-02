import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import CheckBox from '@react-native-community/checkbox';

const CriarEquipa = () => {
  const [nomeEquipa, setNomeEquipa] = useState('');
  const [obras, setObras] = useState([]);
  const [utilizadores, setUtilizadores] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState('');
  const [membrosSelecionados, setMembrosSelecionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [equipasCriadas, setEquipasCriadas] = useState([]);


useEffect(() => {
  fetchObras();
  fetchUtilizadores();
  fetchEquipasCriadas(); // 👈 aqui
}, []);


  const fetchObras = async () => {
    try {
      const token = await AsyncStorage.getItem('loginToken');
      const res = await fetch('https://backend.advir.pt/api/obra', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setObras(data);
    } catch (err) {
      console.error('Erro ao carregar obras:', err);
    }
  };

  const fetchEquipasCriadas = async () => {
  try {
    const token = await AsyncStorage.getItem('loginToken');
    const res = await fetch('https://backend.advir.pt/api/equipa-obra/listar-todas', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setEquipasCriadas(data);
  } catch (err) {
    console.error('Erro ao carregar equipas criadas:', err);
  }
};


  const obterIdDaEmpresa = async () => {
  const empresaNome = localStorage.getItem("empresaSelecionada"); // ex: "DEMOCN"
  const loginToken = localStorage.getItem("loginToken");

  try {
    const response = await fetch(`https://backend.advir.pt/api/empresas/nome/${empresaNome}`, {
      headers: {
        Authorization: `Bearer ${loginToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao obter ID da empresa");
    }

    const data = await response.json();
    return data.id; // <- ID da empresa
  } catch (error) {
    console.error("Erro ao obter o ID da empresa:", error);
    return null;
  }
};

const fetchUtilizadores = async () => {
  try {
    const loginToken = localStorage.getItem("loginToken");
    const empresaId = await obterIdDaEmpresa(); // ← aqui usas a função correta

    if (!empresaId) {
      throw new Error("ID da empresa não encontrado");
    }

    const response = await fetch(
      `https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${empresaId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${loginToken}` }
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao obter utilizadores");
    }

    const data = await response.json();
    setUtilizadores(data);
  } catch (error) {
    console.error("Erro ao carregar utilizadores:", error.message);
  }
};



  const toggleMembro = (id) => {
    if (membrosSelecionados.includes(id)) {
      setMembrosSelecionados(membrosSelecionados.filter(m => m !== id));
    } else {
      setMembrosSelecionados([...membrosSelecionados, id]);
    }
  };

  const criarEquipa = async () => {
    if (!nomeEquipa || !obraSelecionada || membrosSelecionados.length === 0) {
      Alert.alert('Erro', 'Preenche todos os campos.');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('loginToken');
      const res = await fetch('https://backend.advir.pt/api/equipa-obra', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: nomeEquipa,
          obra_id: obraSelecionada,
          membros: membrosSelecionados,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert('Sucesso', 'Equipa criada com sucesso!');
        setNomeEquipa('');
        setObraSelecionada('');
        setMembrosSelecionados([]);
      } else {
        Alert.alert('Erro', data.message || 'Erro ao criar equipa.');
      }
    } catch (err) {
      console.error('Erro ao criar equipa:', err);
      Alert.alert('Erro', 'Erro ao criar equipa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Nome da Equipa</Text>
      <TextInput
        style={styles.input}
        value={nomeEquipa}
        onChangeText={setNomeEquipa}
        placeholder="Insere o nome da equipa"
      />

      <Text style={styles.label}>Obra</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={obraSelecionada}
          onValueChange={(itemValue) => setObraSelecionada(itemValue)}
        >
          <Picker.Item label="Seleciona uma obra" value="" />
          {obras.map((obra) => (
            <Picker.Item key={obra.id} label={`${obra.codigo} - ${obra.nome}`} value={obra.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Membros</Text>
      {utilizadores.map((user) => (
  <TouchableOpacity
    key={`user-${user.id}`}
    style={styles.checkboxContainer}
    onPress={() => toggleMembro(user.id)}
  >
    <View style={[styles.checkbox, membrosSelecionados.includes(user.id) && styles.checkedBox]} />
    <Text>{user.email}</Text>
  </TouchableOpacity>
))}


      <TouchableOpacity style={styles.button} onPress={criarEquipa} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'A criar...' : 'Criar Equipa'}</Text>
      </TouchableOpacity>


      <Text style={[styles.label, { marginTop: 30 }]}>Equipas Criadas</Text>
{equipasCriadas.length === 0 ? (
  <Text style={{ color: '#666' }}>Nenhuma equipa criada ainda.</Text>
) : (
  equipasCriadas.map((equipa) => (
    <View key={`equipa-${equipa.nome}`} style={styles.equipaBox}>
      <Text style={styles.equipaTitulo}>👷 {equipa.nome}</Text>
      <Text style={styles.equipaObra}>🏗️ {equipa.obra?.codigo} - {equipa.obra?.nome}</Text>
      <Text style={{ fontWeight: 'bold' }}>Encarregado: {equipa.encarregado?.nome || '-'}</Text>
      <Text style={{ fontWeight: 'bold', marginTop: 5 }}>Membros:</Text>
      {equipa.membros.map((membro) => (
        <Text key={membro.id}>• {membro.nome || membro.username}</Text>
      ))}
    </View>
  ))
)}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { fontSize: 16, marginBottom: 5, fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 15,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#1792FE',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: 'white', fontWeight: 'bold' },
  checkbox: {
  width: 20,
  height: 20,
  borderWidth: 1,
  borderColor: '#333',
  marginRight: 10,
  borderRadius: 4,
},
checkedBox: {
  backgroundColor: '#1792FE',
},
equipaBox: {
  backgroundColor: '#f2f2f2',
  padding: 15,
  borderRadius: 10,
  marginTop: 15,
},
equipaTitulo: {
  fontSize: 16,
  fontWeight: 'bold',
  marginBottom: 5,
},
equipaObra: {
  fontSize: 14,
  marginBottom: 5,
  color: '#555',
},


});

export default CriarEquipa;
