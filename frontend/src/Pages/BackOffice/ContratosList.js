import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView
} from 'react-native';

const ContratosList = () => {
  const [clienteId, setClienteId] = useState('');
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [clientes, setClientes] = useState([]);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('ativo'); // ativo, caducado, cancelado

  const fetchClientes = async (force = false) => {
    if ((clientes.length > 0 && !force) || carregandoClientes) return;
    setErro('');
    setCarregandoClientes(true);
    try {
      const [token, urlempresa] = await Promise.all([
        localStorage.getItem('painelAdminToken'),
        localStorage.getItem('urlempresa'),
      ]);
      if (!token || !urlempresa) {
        throw new Error('Token/empresa em falta no storage.');
      }

      const url = 'https://webapiprimavera.advir.pt/routePedidos_STP/LstClientes';
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          urlempresa,
          Accept: 'application/json',
        },
      });

      const raw = await resp.text(); // lê SEMPRE o corpo
      if (!resp.ok) {
        throw new Error(`Falha ${resp.status} em LstClientes: ${raw || 'sem detalhes'}`);
      }
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (e) {
        throw new Error(`Resposta inválida do backend: ${raw?.slice(0, 500)}`);
      }
      const tabela = Array.isArray(data?.DataSet?.Table) ? data.DataSet.Table : [];
      setClientes(tabela);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      setErro(error.message);
    } finally {
      setCarregandoClientes(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchContratos = async () => {
    setErro('');
    setContratos([]);
    setLoading(true);

    try {
      const token = await localStorage.getItem('painelAdminToken');
      const urlempresa = await localStorage.getItem('urlempresa');

      if (!token || !urlempresa) {
        throw new Error('Credenciais em falta.');
      }

      const response = await fetch(`https://webapiprimavera.advir.pt/clientArea/ObterInfoContrato/${clienteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          urlempresa,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao obter contratos. Código ' + response.status);
      }

      const data = await response.json();

      const listaContratos = data?.DataSet?.Table;
      if (!listaContratos || listaContratos.length === 0) {
        throw new Error('Nenhum contrato encontrado para este cliente.');
      }

      const contratosComHoras = listaContratos.map(c => ({
        ...c,
        horasDisponiveis: ((c.HorasTotais ?? 0) - (c.HorasGastas ?? 0)).toFixed(2)
      }));

      setContratos(contratosComHoras);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  const contratosFiltrados = contratos.filter((contrato) => {
    if (filtroEstado === 'cancelado') return contrato.Cancelado === true;
    if (filtroEstado === 'caducado') return contrato.Estado === 6 && contrato.Cancelado === false;
    if (filtroEstado === 'ativo') return contrato.Estado === 3 && contrato.Cancelado === false;
    return true;
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Consultar Contratos do Cliente</Text>

      <View style={styles.input}>
        <Text style={{ marginBottom: 6, fontWeight: '600' }}>Seleciona o Cliente</Text>
        <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6 }}>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            style={{ padding: 12, width: '100%' }}
          >
            <option value="">-- Escolha um cliente --</option>
            {clientes.map((cliente) => (
              <option key={cliente.Cliente} value={cliente.Cliente}>
                {cliente.Cliente} - {cliente.Nome}
              </option>
            ))}
          </select>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={fetchContratos}>
        <Text style={styles.buttonText}>Consultar</Text>
      </TouchableOpacity>

      <View style={styles.filtroContainer}>
        <TouchableOpacity
          style={[styles.filtroBotao, filtroEstado === 'ativo' && styles.filtroAtivo]}
          onPress={() => setFiltroEstado('ativo')}
        >
          <Text style={styles.filtroTexto}>Ativos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroBotao, filtroEstado === 'caducado' && styles.filtroAtivo]}
          onPress={() => setFiltroEstado('caducado')}
        >
          <Text style={styles.filtroTexto}>Caducados</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroBotao, filtroEstado === 'cancelado' && styles.filtroAtivo]}
          onPress={() => setFiltroEstado('cancelado')}
        >
          <Text style={styles.filtroTexto}>Cancelados</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#1792FE" style={{ marginVertical: 20 }} />}
      {erro !== '' && <Text style={styles.errorText}>{erro}</Text>}

      {contratosFiltrados.map((contrato, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.label}>Código: <Text style={styles.value}>{contrato.Codigo}</Text></Text>
          <Text style={styles.label}>Descrição: <Text style={styles.value}>{contrato.Descricao}</Text></Text>
          <Text style={styles.label}>Data: <Text style={styles.value}>{new Date(contrato.Data).toLocaleDateString()}</Text></Text>
          <Text style={styles.label}>Horas Totais: <Text style={styles.value}>{contrato.HorasTotais} h</Text></Text>
          <Text style={styles.label}>Horas Gastas: <Text style={styles.value}>{contrato.HorasGastas} h</Text></Text>
          <Text style={styles.label}>Horas Disponíveis: <Text style={styles.value}>{contrato.horasDisponiveis} h</Text></Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#d4e4ff',
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    color: '#1792FE',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#1792FE',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 5,
    marginBottom: 15,
  },
  label: {
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 6,
  },
  value: {
    fontWeight: 'normal',
    color: '#34495E',
  },
  errorText: {
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 10,
  },
  filtroContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  filtroBotao: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  filtroAtivo: {
    backgroundColor: '#1792FE',
  },
  filtroTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ContratosList;
