import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { View, Text, StyleSheet } from 'react-native-web';

const CalendarioHorasTrabalho = () => {
  const [mesAtual, setMesAtual] = useState(new Date());
  const [resumo, setResumo] = useState({});
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [detalhes, setDetalhes] = useState([]);

  const formatarData = (date) => {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};


  const carregarResumo = async () => {
    const token = localStorage.getItem('loginToken');
    const ano = mesAtual.getFullYear();
    const mes = String(mesAtual.getMonth() + 1).padStart(2, '0');

    try {
      const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/resumo-mensal?ano=${ano}&mes=${mes}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const dados = await res.json();
      const mapeado = {};
      dados.forEach(dia => {
        mapeado[dia.dia] = `${dia.horas}h${dia.minutos > 0 ? ` ${dia.minutos}min` : ''}`;
      });

      setResumo(mapeado);
    } catch (err) {
      console.error('Erro ao carregar resumo mensal:', err);
    }
  };

 const carregarDetalhes = async (data) => {
  setDiaSelecionado(data);
  const token = localStorage.getItem('loginToken');
  try {
    const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-dia?data=${data}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const dados = await res.json();

      // Ordenar por timestamp
      const ordenado = dados.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const temposPorObra = {};
      const estadoAtualPorObra = {};

      for (const registo of ordenado) {
        const obraId = registo.obra_id;
        const nomeObra = registo.Obra?.nome || 'Sem nome';
        const ts = new Date(registo.timestamp);

        if (!temposPorObra[obraId]) {
          temposPorObra[obraId] = { nome: nomeObra, totalMinutos: 0 };
        }

        if (registo.tipo === 'entrada') {
          estadoAtualPorObra[obraId] = ts;
        }

        if (registo.tipo === 'saida' && estadoAtualPorObra[obraId]) {
          const entradaTS = estadoAtualPorObra[obraId];
          const minutos = Math.max(0, (ts - entradaTS) / 60000);
          temposPorObra[obraId].totalMinutos += minutos;
          estadoAtualPorObra[obraId] = null;
        }
      }

      const detalhesPorObra = Object.values(temposPorObra).map(o => ({
        nome: o.nome,
        horas: Math.floor(o.totalMinutos / 60),
        minutos: Math.round(o.totalMinutos % 60)
      }));

      setDetalhes(detalhesPorObra);
    }
  } catch (err) {
    console.error('Erro ao carregar detalhes do dia:', err);
  }
};



  

  useEffect(() => {
    carregarResumo();
  }, [mesAtual]);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Calendário de Horas Trabalhadas</Text>
<style>
  {`
    .react-calendar .diasemregisto {
      background-color: orange !important;
      color: white !important;
      border-radius: 50%;
    }
  `}
</style>

      <Calendar
        onActiveStartDateChange={({ activeStartDate }) => setMesAtual(activeStartDate)}
        value={mesAtual}
        onClickDay={(value) => carregarDetalhes(formatarData(value))}
        tileClassName={({ date, view }) => {
            if (view === 'month') {
                const hoje = new Date();
                const dataFormatada = formatarData(date);

                const isPassado = date < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
                const temRegisto = resumo[dataFormatada];
                const diaSemana = date.getDay(); // 0 = domingo, 6 = sábado

                const isDiaUtil = diaSemana !== 0 && diaSemana !== 6;

                if (isPassado && !temRegisto && isDiaUtil) {
                return 'diasemregisto';
                }
            }
            return null;
            }}


        tileContent={({ date }) => {
          const dia = formatarData(date);
          return resumo[dia] ? (
            <div className="hora-dia">
              <small>{resumo[dia]}</small>
            </div>
          ) : null;
        }
    }
        locale="pt-PT"
      />

      {diaSelecionado && (
        <View style={styles.detalhesContainer}>
          <Text style={styles.subtitulo}>Detalhes do dia {diaSelecionado}</Text>
          {detalhes.length === 0 ? (
  <Text style={styles.semDados}>Sem registos nesse dia.</Text>
) : (
  detalhes.map((r, i) => (
    <View key={i} style={styles.registo}>
      <Text style={styles.tipo}>🛠 {r.nome}</Text>
      <Text style={styles.info}>{r.horas}h {r.minutos > 0 ? `${r.minutos}min` : ''}</Text>
    </View>
  ))
)}

        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    maxWidth: 600,
    alignSelf: 'center',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitulo: {
    marginTop: 30,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detalhesContainer: {
    marginTop: 10,
  },
  semDados: {
    fontStyle: 'italic',
  },
  registo: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 5,
  },
  tipo: {
    fontWeight: 'bold',
  },
  info: {
    fontSize: 13,
    color: '#666',
  },


});

export default CalendarioHorasTrabalho;
