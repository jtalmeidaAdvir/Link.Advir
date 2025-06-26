import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, Button, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // instala se não tiveres

const EditarModal = ({ registo, visible, onClose, onSave }) => {
  const [tipoHora, setTipoHora] = useState('entrada');
  const [horaSelecionada, setHoraSelecionada] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (registo) {
      setHoraSelecionada('');
      setMotivo('');
      setTipoHora('entrada');
    }
  }, [registo]);

  const handleSave = async () => {
    if (!horaSelecionada || motivo.length < 10) {
      Alert.alert('Erro', 'Preencha todos os campos corretamente. O motivo deve ter pelo menos 10 caracteres.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('loginToken'); // substitui se estiveres a usar outra forma

      const body = {
        user_id: registo.userId,
        registo_ponto_id: registo.id,
        motivo,
      };

      // Só inclui o campo correto
      if (tipoHora === 'entrada') body.novaHoraEntrada = horaSelecionada;
      else body.novaHoraSaida = horaSelecionada;

      const response = await fetch('https://backend.advir.pt/api/pedidoAlteracao/pedidos-alteracao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Sucesso', 'Pedido de alteração criado com sucesso!');
        onSave(data);
        onClose();
      } else {
        const errorData = await response.json();
        Alert.alert('Erro', errorData.error || 'Não foi possível criar o pedido.');
      }
    } catch (error) {
      console.error('Erro ao criar pedido de alteração:', error);
      Alert.alert('Erro', 'Erro de rede ao criar pedido de alteração.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Criar Pedido de Alteração</Text>

          <Text>Selecionar Hora a Alterar:</Text>
          <Picker
            selectedValue={tipoHora}
            onValueChange={(itemValue) => setTipoHora(itemValue)}
            style={styles.input}
          >
            <Picker.Item label="Hora de Entrada" value="entrada" />
            <Picker.Item label="Hora de Saída" value="saida" />
          </Picker>

          <Text>Nova Hora:</Text>
          <TextInput
            style={styles.input}
            value={horaSelecionada}
            onChangeText={setHoraSelecionada}
            placeholder="HH:MM"
          />

          <Text>Motivo:</Text>
          <TextInput
            style={styles.input}
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Motivo (min. 10 caracteres)"
          />

          <View style={styles.modalButtons}>
            <Button title="Cancelar" onPress={onClose} color="red" />
            <Button title="Guardar" onPress={handleSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default EditarModal;
