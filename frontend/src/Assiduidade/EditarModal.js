import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EditarModal = ({ registo, visible, onClose, onSave }) => {
  const [horaEntrada, setHoraEntrada] = useState('');
  const [horaSaida, setHoraSaida] = useState('');
  const [motivo, setMotivo] = useState('');
  const [dataOriginal, setDataOriginal] = useState('');

  useEffect(() => {
    if (registo) {
      setHoraEntrada('');
      setHoraSaida('');
      setMotivo('');
      setDataOriginal(registo.data); // Guarda a data do registo original
    }
  }, [registo]);

const toFullDateTime = (timeStr) => {
  if (!timeStr || !dataOriginal) return null;

  const data = new Date(dataOriginal);
  const [hours, minutes] = timeStr.split(':');
  data.setHours(parseInt(hours, 10));
  data.setMinutes(parseInt(minutes, 10));
  data.setSeconds(0);

  // Formato: YYYY-MM-DD HH:mm (sem "T", sem Z)
  const yyyy = data.getFullYear();
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  const dd = String(data.getDate()).padStart(2, '0');
  const hh = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};


  const handleSave = async () => {
    if (!horaEntrada && !horaSaida) {
      Alert.alert('Erro', 'Preencha pelo menos a nova hora de entrada ou de saída.');
      return;
    }

    if (motivo.length < 10) {
      Alert.alert('Erro', 'O motivo deve ter pelo menos 10 caracteres.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('loginToken');

      const body = {
        user_id: registo.userId,
        registo_ponto_id: registo.id,
        motivo,
      };

      if (horaEntrada) body.novaHoraEntrada = toFullDateTime(horaEntrada);
      if (horaSaida) body.novaHoraSaida = toFullDateTime(horaSaida);

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

          <Text>Nova Hora Entrada (opcional):</Text>
          <TextInput
            style={styles.input}
            value={horaEntrada}
            onChangeText={setHoraEntrada}
            placeholder="HH:MM"
          />

          <Text>Nova Hora Saída (opcional):</Text>
          <TextInput
            style={styles.input}
            value={horaSaida}
            onChangeText={setHoraSaida}
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
