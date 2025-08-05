import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const GestaoPartesDiarias = () => {
  const [loading, setLoading] = useState(true);
  const [cabecalhos, setCabecalhos] = useState([]);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCabecalho, setSelectedCabecalho] = useState(null);
  const [especialidadesMap, setEspecialidadesMap] = useState({});
  const [obrasMap, setObrasMap] = useState({});
  const [cacheNomes, setCacheNomes] = useState({});
  const [cacheColaboradorID, setCacheColaboradorID] = useState({});


  useEffect(() => {
    (async () => {
      await fetchEspecialidades();
      await fetchObras();
      await fetchCabecalhos();
    })();
  }, []);

  const fetchEspecialidades = async () => {
    try {
      const token = await AsyncStorage.getItem('painelAdminToken');
      const urlempresa = await AsyncStorage.getItem('urlempresa');
      const res = await fetch(
        'https://webapiprimavera.advir.pt/routesFaltas/GetListaEspecialidades',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            urlempresa,
            'Content-Type': 'application/json'
          }
        }
      );
      if (!res.ok) throw new Error('Falha ao obter especialidades');
      const data = await res.json();
      const table = data?.DataSet?.Table || [];
      const map = {};
      table.forEach(item => {
        map[String(item.SubEmpId)] = item.Descricao;
      });
      setEspecialidadesMap(map);
    } catch (err) {
      console.warn('Erro especialidades:', err.message);
    }
  };

  const obterNomeFuncionario = useCallback(async (codFuncionario) => {
    if (cacheNomes[codFuncionario]) return cacheNomes[codFuncionario];

    try {
      const painelToken = await AsyncStorage.getItem('painelAdminToken');
      const urlempresa = await AsyncStorage.getItem('urlempresa');
      const res = await fetch(
        `https://webapiprimavera.advir.pt/routesFaltas/GetNomeFuncionario/${codFuncionario}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${painelToken}`,
            urlempresa,
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        const nome = data?.DataSet?.Table?.[0]?.Nome || codFuncionario;
        setCacheNomes(prev => ({ ...prev, [codFuncionario]: nome }));
        return nome;
      }

      console.warn(`Erro ao obter nome do funcionário ${codFuncionario}`);
      setCacheNomes(prev => ({ ...prev, [codFuncionario]: codFuncionario }));
      return codFuncionario;
    } catch (err) {
      console.error('Erro ao obter nome do funcionário:', err);
      setCacheNomes(prev => ({ ...prev, [codFuncionario]: codFuncionario }));
      return codFuncionario;
    }
  }, [cacheNomes]);

const obterColaboradorID = useCallback(async (codFuncionario) => {
  if (cacheColaboradorID[codFuncionario]) return cacheColaboradorID[codFuncionario];

  try {
    const painelToken = await AsyncStorage.getItem('painelAdminToken');
    const urlempresa = await AsyncStorage.getItem('urlempresa');

    const res = await fetch(
      `https://webapiprimavera.advir.pt/routesFaltas/GetColaboradorId/${codFuncionario}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${painelToken}`,
          urlempresa,
        },
      }
    );

    const data = await res.json();
    console.log("🔎 Resposta GetColaboradorId:", data);

    const colaboradorID = data?.DataSet?.Table?.[0]?.IDOperador || null;

    if (colaboradorID !== null) {
      setCacheColaboradorID(prev => ({ ...prev, [codFuncionario]: colaboradorID }));
      return colaboradorID;
    }

    console.warn(`ColaboradorID não encontrado para ${codFuncionario}`);
    setCacheColaboradorID(prev => ({ ...prev, [codFuncionario]: null }));
    return null;

  } catch (err) {
    console.error(`Erro ao obter ColaboradorID para ${codFuncionario}:`, err);
    setCacheColaboradorID(prev => ({ ...prev, [codFuncionario]: null }));
    return null;
  }
}, [cacheColaboradorID]);

  const obterCodObra = useCallback(async (obraID) => {
  try {
    const token = await AsyncStorage.getItem('loginToken');
    const empresaId = await AsyncStorage.getItem('empresa_id');

    const response = await fetch(`https://backend.advir.pt/api/obra/getcodigo/${obraID}`, {
      method: 'GET', // Se o endpoint é para obter, usa GET
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('🧱 Obra encontrada:', data);
      return data; // ou return data.codigo se for o valor que queres
    } else {
      alert(`Erro ao obter obra: ${data.message}`);
    }
  } catch (error) {
    console.error('Erro ao obter obra:', error);
    alert('Erro ao obter obra');
  }
}, []);


const obterIDObra = useCallback(async (codigoObra) => {
  try {
    const token = await AsyncStorage.getItem('painelAdminToken');
    const urlempresa = await AsyncStorage.getItem('urlempresa');

    const response = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetObraId/${codigoObra}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'urlempresa': urlempresa
      }
    });

    const data = await response.json();

    if (response.ok) {
      const id = data?.DataSet?.Table?.[0]?.Id;
      if (!id) {
        return null;
      }

      return id;
    } else {
      alert(`Erro ao obter ID da obra: ${data.message}`);
      return null;
    }
  } catch (error) {
    console.error('Erro ao obter ID da obra:', error);
    alert('Erro ao obter ID da obra');
    return null;
  }
}, []);


  const fetchObras = async () => {
    try {
      const logintoken = await AsyncStorage.getItem('loginToken');
      const res = await fetch('https://backend.advir.pt/api/obra', {
        headers: {
          Authorization: `Bearer ${logintoken}`,
          'Content-Type': 'application/json',
        }
      });
      if (!res.ok) throw new Error('Falha ao obter obras');
      const obras = await res.json();
      const map = {};
      obras.forEach(obra => {
        const key = String(obra.id || obra.ID);
        map[key] = { codigo: obra.codigo, descricao: obra.nome };
      });
      setObrasMap(map);
    } catch (err) {
      console.warn('Erro obras:', err.message);
    }
  };

  const fetchCabecalhos = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('painelAdminToken');
      if (!token) throw new Error('Token de autenticação não encontrado.');
      const res = await fetch('https://backend.advir.pt/api/parte-diaria/cabecalhos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao obter partes diárias.');
      const data = await res.json();
      setCabecalhos(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatarHoras = (minutos) => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h > 0 ? `${h}h ` : ''}${m}m`;
};


  // Funções para os novos botões
const handleIntegrar = async (item) => {
  try {
    const token = await AsyncStorage.getItem('painelAdminToken');
    const urlempresa = await AsyncStorage.getItem('urlempresa');

    

    if (!token || !urlempresa) {
      alert('Erro: token ou empresa em falta.');
      return;
    }

    const apiUrl = 'https://webapiprimavera.advir.pt/routesFaltas/InsertParteDiariaItem';
    console.log(item.ColaboradorID);
const colaboradorID = await obterColaboradorID(item.ColaboradorID);
console.log(colaboradorID);
const dadosObra = await obterCodObra(item.ObraID);
const codigoObra = dadosObra?.codigo;
const IdObra = await obterIDObra(codigoObra);


const cod = localStorage.getItem("codFuncionario");
const CodFuncionario = await obterColaboradorID(cod);





const payload = {
      Cabecalho: {
        DocumentoID: "1747FEA9-5D2F-45B4-A89B-9EA30B1E0DCB",
        ObraID: IdObra,//item.ObraID,
        Data: item.Data,
        Notas: item.Notas || '',
        CriadoPor: "",
        Utilizador: "",
        TipoEntidade: "O",
        ColaboradorID: CodFuncionario  //Buscar colaboradorId de quem registou.
      },
      Itens: item.ParteDiariaItems.map(it => ({
        ComponenteID: it.ComponenteID,
        Funcionario: "",
        ClasseID: it.ClasseID,
        SubEmpID: it.SubEmpID,
        NumHoras: (it.NumHoras / 60).toFixed(2), // convertido em horas
        TotalHoras: (it.NumHoras / 60).toFixed(2), 
        TipoEntidade: "O",
        ColaboradorID: colaboradorID, // vai buscar pelo cod funcionario
        Data: it.Data,
        ObraID: it.ObraID
      }))
    };

    console.log("📤 A enviar para API InsertParteDiariaItem:", payload);

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'urlempresa': urlempresa
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      alert('Parte integrada com sucesso!');
      // Opcional: podes remover da lista ou atualizar o estado
    } else {
      console.error("❌ Erro:", result);
      alert(`Erro ao integrar: ${result.error || 'Erro desconhecido.'}`);
    }
  } catch (err) {
    console.error('Erro na integração:', err);
    alert('Erro inesperado ao integrar parte.');
  }
};


  const handleRejeitar = async (item) => {
    // TODO: implementar rejeição de parte
    console.log('Rejeitar parte:', item.DocumentoID);
  };

  const abrirDetalhes = async (cab) => {
    if (cab?.ParteDiariaItems?.length > 0) {
      for (const item of cab.ParteDiariaItems) await obterNomeFuncionario(item.ColaboradorID);
    }
    setSelectedCabecalho(cab);
    setModalVisible(true);
  };

  const fecharModal = () => {
    setModalVisible(false);
    setSelectedCabecalho(null);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => abrirDetalhes(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Parte Diária</Text>

  <Text style={{ fontSize: 14, color: '#666', fontWeight: '500' }}>Ver Detalhes</Text>


        </View>
        <Text style={styles.cardText}>Registado por: {item.CriadoPor || item.Utilizador}</Text>
        <Text style={styles.cardText}>
          {obrasMap[String(item.ObraID)] ?
            `${obrasMap[String(item.ObraID)].codigo} — ${obrasMap[String(item.ObraID)].descricao}` :
            item.ObraID || 'Obra não definida'}
        </Text>
        <Text style={styles.cardText}>Data do Registo: {new Date(item.Data).toLocaleDateString('pt-PT')}</Text>
        <Text style={styles.cardText}>Itens: {item.ParteDiariaItems?.length || 0}</Text>
      </TouchableOpacity>

      {/* Botões Integrar ERP e Rejeitar Parte */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.integrarButton} onPress={() => handleIntegrar(item)}>
          <Text style={styles.buttonText}>Integrar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejeitarButton} onPress={() => handleRejeitar(item)}>
          <Text style={styles.buttonText}>Rejeitar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#1792FE" />
      <Text style={styles.loadingText}>A carregar partes diárias...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.loadingContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity onPress={fetchCabecalhos} style={styles.retryButton}>
        <Text style={styles.retryText}>Tentar Novamente</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={cabecalhos}
        keyExtractor={itm => String(itm.DocumentoID)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-clear" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhum parte diária registado.</Text>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={fecharModal}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalhes do Parte</Text>
            <TouchableOpacity onPress={fecharModal}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {selectedCabecalho && (
              <>
                <Text style={styles.modalLabel}>Registado por</Text>
                <Text style={styles.modalValue}>{selectedCabecalho.CriadoPor || selectedCabecalho.Utilizador}</Text>

                <Text style={styles.modalLabel}>Data do registo</Text>
                <Text style={styles.modalValue}>{new Date(selectedCabecalho.Data).toLocaleDateString('pt-PT')}</Text>

                <Text style={styles.modalLabel}>Itens</Text>
                {selectedCabecalho.ParteDiariaItems?.length > 0 ? (
                  selectedCabecalho.ParteDiariaItems.map(itm => (
                    <View key={String(itm.ComponenteID)} style={styles.itemRow}>
                      <Text style={styles.itemText}>
                        Data: {itm.Data}{"\n"}
                        Colaborador: {cacheNomes[itm.ColaboradorID] || itm.ColaboradorID}{"\n"}
                        Obra: {obrasMap[String(itm.ObraID)]
                          ? `${obrasMap[String(itm.ObraID)].codigo} — ${obrasMap[String(itm.ObraID)].descricao}`
                          : itm.ObraID}{"\n"}
                        Especialidade: {especialidadesMap[itm.SubEmpID] || itm.SubEmpID}{"\n"}
                        Horas: {formatarHoras(itm.NumHoras)}

                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.modalValue}>Sem itens registados.</Text>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  listContent: { padding: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#1792FE' },
  errorText: { fontSize: 16, color: '#dc3545', textAlign: 'center' },
  retryButton: { marginTop: 15, padding: 10, backgroundColor: '#1792FE', borderRadius: 5 },
  retryText: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardText: { fontSize: 14, color: '#555', marginTop: 4 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  integrarButton: { flex: 1, padding: 10, backgroundColor: '#28a745', borderRadius: 5, marginRight: 5, alignItems: 'center' },
  rejeitarButton: { flex: 1, padding: 10, backgroundColor: '#dc3545', borderRadius: 5, marginLeft: 5, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 10 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalBody: { padding: 15 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginTop: 10 },
  modalValue: { fontSize: 14, color: '#333', marginTop: 4 },
  itemRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemText: { fontSize: 13, color: '#555', lineHeight: 18 }
});

export default GestaoPartesDiarias;
