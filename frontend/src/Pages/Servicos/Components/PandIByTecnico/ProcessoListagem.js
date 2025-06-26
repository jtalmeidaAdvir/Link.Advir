import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import styles from "../../Styles/PandIByTecnicoStyles";

const ProcessoListagem = ({ dadosPorDia, abrirModalProcesso, loading }) => {
  if (!dadosPorDia.length) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>
          {loading
            ? "A carregar dados..."
            : "Nenhum processo encontrado para o período selecionado. Selecione um técnico e clique em 'Obter Dados'."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.gridContainer}>
      {dadosPorDia.map((dia, diaIndex) => (
        <View key={diaIndex}>
          {dia.processos.map((processo, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => abrirModalProcesso(processo)}
              style={styles.processCard}
            >
              <Text style={styles.cardDate}>
                {dia.data.toLocaleDateString("pt-PT", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>

              <Text style={styles.cardLine}>
                <Text style={styles.cardLabel}>Processo: </Text>
                {processo.detalhesProcesso?.Processo}
              </Text>

              <Text style={styles.cardLine}>
                <Text style={styles.cardLabel}>Cliente: </Text>
                {processo.detalhesProcesso?.NomeCliente || "N/A"}
              </Text>

              <Text style={styles.cardLine}>
                <Text style={styles.cardLabel}>Contacto: </Text>
                {processo.detalhesProcesso?.NomeContacto || "Sem contacto"}
              </Text>

              <Text style={styles.cardLine}>
                <Text style={styles.cardLabel}>Estado: </Text>
                {processo.intervencoes.length > 0 ? "Concluído ✅" : "Pendente ⏳"}
              </Text>

              <Text style={styles.cardLine}>
                <Text style={styles.cardLabel}>Duração: </Text>
                {processo.detalhesProcesso?.Duracao || 0} minutos
              </Text>

              <Text style={styles.cardDesc}>
                {processo.detalhesProcesso?.DescricaoResp || "Sem descrição."}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
};

export default ProcessoListagem;
