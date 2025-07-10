// CalendarioHorasTrabalho.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const CalendarioHorasTrabalho = () => {
  const [resumo, setResumo] = useState([]);
  const [mesAtual, setMesAtual] = useState(new Date());

  const formatarData = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const carregarResumo = async () => {
    const token = localStorage.getItem('loginToken');
    const ano = mesAtual.getFullYear();
    const mes = String(mesAtual.getMonth() + 1).padStart(2, '0');

    try {
      const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/resumo-mensal?ano=${ano}&mes=${mes}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResumo(data);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
  };

  useEffect(() => {
    carregarResumo();
  }, [mesAtual]);

  const alterarMes = (incremento) => {
    const novoMes = new Date(mesAtual);
    novoMes.setMonth(novoMes.getMonth() + incremento);
    setMesAtual(novoMes);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Horas Trabalhadas</Text>
      <View style={styles.controlesMes}>
        <TouchableOpacity onPress={() => alterarMes(-1)}><Text style={styles.seta}>{'<'}</Text></TouchableOpacity>
        <Text style={styles.mes}>{formatarData(mesAtual)}</Text>
        <TouchableOpacity onPress={() => alterarMes(1)}><Text style={styles.seta}>{'>'}</Text></TouchableOpacity>
      </View>

      {resumo.length === 0 ? (
        <Text style={styles.semDados}>Sem registos para este mês.</Text>
      ) : (
        resumo.map((dia, i) => (
          <View key={i} style={styles.itemDia}>
            <Text style={styles.dia}>{dia.dia}</Text>
            <Text style={styles.horas}>{dia.horas}h {dia.minutos}min</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center'
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20
  },
  controlesMes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  seta: {
    fontSize: 22,
    marginHorizontal: 20
  },
  mes: {
    fontSize: 18,
    fontWeight: '600'
  },
  itemDia: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#ddd'
  },
  dia: {
    fontSize: 16
  },
  horas: {
    fontWeight: 'bold'
  },
  semDados: {
    fontStyle: 'italic',
    marginTop: 20
  }
});

export default CalendarioHorasTrabalho;
