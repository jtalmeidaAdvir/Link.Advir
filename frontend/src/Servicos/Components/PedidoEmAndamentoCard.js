// ./Components/PedidoEmAndamentoCard.js

import React from 'react';
import { View, Text } from 'react-native';
import styles from '../Styles/DashboardAnalyticsStyles';

const PedidoEmAndamentoCard = ({ pedido }) => {
  return (
    <View style={styles.pedidoCard}>
      <View style={styles.pedidoHeader}>
        <Text style={styles.pedidoNumero}>
          {pedido.Processo || `#${pedido.NumProcesso}`}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: '#ffc107' }]}>
          <Text style={styles.statusText}>Em Andamento</Text>
        </View>
      </View>

      <Text style={styles.pedidoCliente}>
        Cliente: {pedido.NomeCliente || pedido.Cliente}
      </Text>

      <Text style={styles.pedidoTecnico}>
        Técnico: {pedido.NomeTecnico || 'Não atribuído'}
      </Text>

      <Text style={styles.pedidoTipo}>
        Tipo: {pedido.TipoInterv || 'Não especificado'}
      </Text>

      <Text style={styles.pedidoData}>
        Abertura: {new Date(pedido.DataHoraAbertura || pedido.DataHoraInicio).toLocaleDateString('pt-PT')}
      </Text>

      {pedido.DescricaoProb && (
        <Text style={styles.pedidoDescricao}>
          {pedido.DescricaoProb}
        </Text>
      )}
    </View>
  );
};

export default PedidoEmAndamentoCard;
