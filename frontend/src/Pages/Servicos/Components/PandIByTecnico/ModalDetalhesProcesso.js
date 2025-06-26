import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import styles from '../../Styles/PandIByTecnicoStyles';

const ModalDetalhesProcesso = ({
  processoSelecionado,
  modalVisible,
  setModalVisible,
}) => {
  if (!processoSelecionado) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            Processo {processoSelecionado.detalhesProcesso?.Processo}
          </Text>
          <Text style={styles.modalInfo}>
            <Text style={{ fontWeight: 'bold' }}>Cliente: </Text>
            {processoSelecionado.detalhesProcesso?.NomeCliente || 'N/A'}
          </Text>
          <Text style={styles.modalInfo}>
            <Text style={{ fontWeight: 'bold' }}>Contacto: </Text>
            {processoSelecionado.detalhesProcesso?.NomeContacto || 'N/A'}
          </Text>
          <Text style={styles.modalInfo}>
            <Text style={{ fontWeight: 'bold' }}>Estado: </Text>
            {processoSelecionado.intervencoes.length > 0 ? 'Concluído' : 'Pendente'}
          </Text>
          <Text style={styles.modalInfo}>
            <Text style={{ fontWeight: 'bold' }}>Duração: </Text>
            {processoSelecionado.detalhesProcesso?.Duracao || 0} minutos
          </Text>
          <Text style={styles.modalDesc}>
            {processoSelecionado.detalhesProcesso?.DescricaoProb || 'Sem descrição.'}
          </Text>

          {processoSelecionado.intervencoes.length > 0 ? (
            <ScrollView style={{ maxHeight: 200, marginTop: 10 }}>
              {processoSelecionado.intervencoes.map((intv, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: '#f0f4ff',
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontWeight: 'bold', color: '#0056b3' }}>
                    {intv.TipoInterv || 'Tipo não definido'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#444' }}>
                    Duração: {intv.Duracao || 0} min
                  </Text>
                  {intv.Observacoes && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#666',
                        fontStyle: 'italic',
                        marginTop: 4,
                      }}
                    >
                      {intv.Observacoes}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.intervPendente}>
              Sem intervenções registadas.
            </Text>
          )}

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ModalDetalhesProcesso;
