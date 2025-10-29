
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import securestorage from '@react-native-async-storage/async-storage';

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
      setDataOriginal(registo.data);
    }
  }, [registo]);

const toFullDateTime = (timeStr) => {
  if (!timeStr || !dataOriginal) return null;

  const data = new Date(dataOriginal);
  const [hours, minutes] = timeStr.split(':');
  data.setHours(parseInt(hours, 10));
  data.setMinutes(parseInt(minutes, 10));
  data.setSeconds(0);

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
      const token = await securestorage.getItem('loginToken');

      const body = {
        user_id: registo.user_id,
        registo_ponto_id: registo.id,
        motivo,
      };

      if (horaEntrada) body.novaHoraEntrada = toFullDateTime(horaEntrada);
      if (horaSaida) body.novaHoraSaida = toFullDateTime(horaSaida);
      console.log("Body a enviar para o pedido de alteração:", body);

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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Criar Pedido de Alteração</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <View style={styles.inputHeader}>
                  <MaterialCommunityIcons name="clock-in" size={20} color="#1792FE" />
                  <Text style={styles.inputLabel}>Nova Hora de Entrada</Text>
                  <Text style={styles.optionalText}>(opcional)</Text>
                </View>
                <View style={styles.timePickerContainer}>
                  <View style={styles.timePickerGroup}>
                    <Text style={styles.timePickerLabel}>Hora</Text>
                    <View style={styles.pickerWrapper}>
                      <TextInput
                        style={styles.timePicker}
                        value={horaEntrada.split(':')[0] || ''}
                        onChangeText={(text) => {
                          const minutos = horaEntrada.split(':')[1] || '00';
                          // Permitir entrada vazia ou números válidos (0-23)
                          if (text === '' || (/^\d{1,2}$/.test(text) && parseInt(text) >= 0 && parseInt(text) <= 23)) {
                            setHoraEntrada(text ? `${text}:${minutos}` : '');
                          }
                        }}
                        placeholder="00"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={styles.timeSeparator}>:</Text>
                  <View style={styles.timePickerGroup}>
                    <Text style={styles.timePickerLabel}>Min</Text>
                    <View style={styles.pickerWrapper}>
                      <TextInput
                        style={styles.timePicker}
                        value={horaEntrada.split(':')[1] || ''}
                        onChangeText={(text) => {
                          const horas = horaEntrada.split(':')[0] || '00';
                          // Permitir entrada vazia ou números válidos (0-59)
                          if (text === '' || (/^\d{1,2}$/.test(text) && parseInt(text) >= 0 && parseInt(text) <= 59)) {
                            setHoraEntrada(horas ? `${horas}:${text}` : '');
                          }
                        }}
                        placeholder="00"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputHeader}>
                  <MaterialCommunityIcons name="clock-out" size={20} color="#1792FE" />
                  <Text style={styles.inputLabel}>Nova Hora de Saída</Text>
                  <Text style={styles.optionalText}>(opcional)</Text>
                </View>
                <View style={styles.timePickerContainer}>
                  <View style={styles.timePickerGroup}>
                    <Text style={styles.timePickerLabel}>Hora</Text>
                    <View style={styles.pickerWrapper}>
                      <TextInput
                        style={styles.timePicker}
                        value={horaSaida.split(':')[0] || ''}
                        onChangeText={(text) => {
                          const minutos = horaSaida.split(':')[1] || '00';
                          // Permitir entrada vazia ou números válidos (0-23)
                          if (text === '' || (/^\d{1,2}$/.test(text) && parseInt(text) >= 0 && parseInt(text) <= 23)) {
                            setHoraSaida(text ? `${text}:${minutos}` : '');
                          }
                        }}
                        placeholder="00"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={styles.timeSeparator}>:</Text>
                  <View style={styles.timePickerGroup}>
                    <Text style={styles.timePickerLabel}>Min</Text>
                    <View style={styles.pickerWrapper}>
                      <TextInput
                        style={styles.timePicker}
                        value={horaSaida.split(':')[1] || ''}
                        onChangeText={(text) => {
                          const horas = horaSaida.split(':')[0] || '00';
                          // Permitir entrada vazia ou números válidos (0-59)
                          if (text === '' || (/^\d{1,2}$/.test(text) && parseInt(text) >= 0 && parseInt(text) <= 59)) {
                            setHoraSaida(horas ? `${horas}:${text}` : '');
                          }
                        }}
                        placeholder="00"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputHeader}>
                  <MaterialCommunityIcons name="text-box" size={20} color="#1792FE" />
                  <Text style={styles.inputLabel}>Motivo da Alteração</Text>
                  <Text style={styles.requiredText}>*</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={motivo}
                  onChangeText={setMotivo}
                  placeholder="Descreva o motivo da alteração (mínimo 10 caracteres)"
                  placeholderTextColor="#999"
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{motivo.length}/255 caracteres</Text>
              </View>

              <View style={styles.infoCard}>
                <MaterialCommunityIcons name="information" size={20} color="#1792FE" />
                <Text style={styles.infoText}>
                  O pedido será enviado para aprovação. Você receberá uma notificação quando for processado.
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={18} color="#dc3545" />
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <MaterialCommunityIcons name="check" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Criar Pedido</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  optionalText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  requiredText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    maxHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 15,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#dc3545',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1792FE',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 5,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
  },
  timePickerGroup: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timePicker: {
    width: 60,
    height: 45,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    paddingVertical: 10,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1792FE',
    marginHorizontal: 15,
  },
});

export default EditarModal;
