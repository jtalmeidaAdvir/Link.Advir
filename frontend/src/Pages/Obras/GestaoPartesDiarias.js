import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const GestaoPartesDiarias = () => {
// === NO TOPO DO FICHEIRO (fora do componente) ===
const DOC_ID_DEFAULT = '1747FEA9-5D2F-45B4-A89B-9EA30B1E0DCB'; // mão-de-obra/outros
const DOC_ID_EQUIP   = '11C77189-1046-4CDE-96F9-503B8EB25B08'; // equipamentos

// Pessoal / mão-de-obra (usa InsertParteDiariaItem)
const buildPayloadPessoal = ({ docId, cab, itens, idObra, colaboradorIdCab, colaboradorIdItens }) => ({
  Cabecalho: {
    DocumentoID: docId,
    ObraID: idObra,
    Data: cab.Data,
    Notas: cab.Notas || '',
    CriadoPor: cab.CriadoPor || '',
    Utilizador: cab.Utilizador || '',
    TipoEntidade: 'O',
    ColaboradorID: colaboradorIdCab ?? colaboradorIdItens ?? null,
  },
  Itens: itens.map(it => ({
    ComponenteID: it.ComponenteID,
    Funcionario: '',
    ClasseID: it.ClasseID,
    SubEmpID: it.SubEmpID,
    NumHoras: Number((it.NumHoras / 60).toFixed(2)), // horas decimais
    TotalHoras: Number((it.NumHoras / 60).toFixed(2)),
    TipoEntidade: 'O',
    ColaboradorID: colaboradorIdItens ?? null,
    Data: it.Data,
    ObraID: idObra,
    TipoHoraID: (it.TipoHoraID ?? null),
  })),
});

// Equipamentos (usa InsertParteDiariaEquipamento)
const buildPayloadEquip = ({ docId, cab, itens, idObra }) => ({
  Cabecalho: {
    DocumentoID: docId,
    ObraID: idObra,
    Data: cab.Data,
    Notas: cab.Notas || '',
    CriadoPor: cab.CriadoPor || '',
    Utilizador: cab.Utilizador || '',
    Encarregado: null,
  },
  Itens: itens.map(it => ({
    ComponenteID: it.SubEmpID ?? 0, // aqui o ComponenteID recebe o que vinha no SubEmpID
    Funcionario: '',
    ClasseID: it.ClasseID ?? -1,
    Fornecedor: null,
    SubEmpID: null, // força vazio
    NumHorasTrabalho: Number((it.NumHoras / 60).toFixed(2)),
    NumHorasOrdem: 0,
    NumHorasAvariada: 0,
    PrecoUnit: it.PrecoUnit ?? 0,
    ItemId: null,
  })),
});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cabecalhos, setCabecalhos] = useState([]);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCabecalho, setSelectedCabecalho] = useState(null);
  const [especialidadesMap, setEspecialidadesMap] = useState({});
  const [obrasMap, setObrasMap] = useState({});
  const [cacheNomes, setCacheNomes] = useState({});
  const [cacheColaboradorID, setCacheColaboradorID] = useState({});
  const [filtroEstado, setFiltroEstado] = useState('pendentes');
  const [integrandoIds, setIntegrandoIds] = useState(new Set());
  const [equipamentosMap, setEquipamentosMap] = useState({});

  const cabecalhosFiltrados = useMemo(() => {
    if (filtroEstado === 'pendentes') return cabecalhos.filter(c => !c.IntegradoERP);
    if (filtroEstado === 'integrados') return cabecalhos.filter(c => c.IntegradoERP);
    return cabecalhos;
  }, [cabecalhos, filtroEstado]);

  useEffect(() => {
    (async () => {
      await fetchEspecialidades();
      await fetchEquipamentos();
      await fetchObras();
      await fetchCabecalhos();
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCabecalhos();
    setRefreshing(false);
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

  const fetchEquipamentos = async () => {
    try {
      const token = await AsyncStorage.getItem('painelAdminToken');
      const urlempresa = await AsyncStorage.getItem('urlempresa');

      const res = await fetch(
        'https://webapiprimavera.advir.pt/routesFaltas/GetListaEquipamentos',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            urlempresa,
            'Content-Type': 'application/json',
          }
        }
      );
      if (!res.ok) throw new Error('Falha ao obter equipamentos');
      const data = await res.json();

      const table = data?.DataSet?.Table || [];
      const map = {};
      table.forEach(item => {
        const id = String(item.ComponenteID ?? '');
        const nome = item.Desig ?? '';
        if (id) map[id] = nome || id;
      });
      setEquipamentosMap(map);
    } catch (err) {
      console.warn('Erro equipamentos:', err.message);
    }
  };

  const getCategoriaChip = (categoria) => {
    const cat = String(categoria || '').toLowerCase();
    if (cat === 'equipamentos') {
      return { label: 'Equipamento', bg: '#6f42c1', icon: 'construct' };
    }
    return { label: 'Pessoal', bg: '#17a2b8', icon: 'people' };
  };

  // === EXTERNOS: helpers ===
  const isExternoItem = (it) => {
    const semColab =
      it.ColaboradorID === null ||
      it.ColaboradorID === undefined ||
      String(it.ColaboradorID).trim() === '';
    const marca = String(it.Funcionario || '').toLowerCase().includes('(externo)');
    return semColab || marca;
  };

  const hasOnlyExternos = (cab) => {
    const itens = cab?.ParteDiariaItems || [];
    return itens.length > 0 && itens.every(isExternoItem);
  };

  const contarPorCategoria = (itens = []) => {
    let pes = 0, eq = 0, ext = 0;
    itens.forEach(it => {
      if (isExternoItem(it)) { ext++; return; }
      if (String(it.Categoria || '').toLowerCase() === 'equipamentos') eq++;
      else pes++;
    });
    return { pes, eq, ext };
  };

  const obterNomeFuncionario = useCallback(async (codFuncionario) => {
    if (!codFuncionario) return ''; // externos não têm ColaboradorID
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
    if (!codFuncionario) return null;
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

      const response = await fetch(`https://backend.advir.pt/api/obra/getcodigo/${obraID}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        Alert.alert('Erro', `Erro ao obter obra: ${data.message}`);
      }
    } catch (error) {
      console.error('Erro ao obter obra:', error);
      Alert.alert('Erro', 'Erro ao obter obra');
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
        return id || null;
      } else {
        Alert.alert('Erro', `Erro ao obter ID da obra: ${data.message}`);
        return null;
      }
    } catch (error) {
      console.error('Erro ao obter ID da obra:', error);
      Alert.alert('Erro', 'Erro ao obter ID da obra');
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
      setError(null);
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

  // === INTEGRAR: exclui EXTERNOS (envia só internos)
  const handleIntegrar = async (cab) => {
    setIntegrandoIds(prev => new Set(prev).add(cab.DocumentoID));

    try {
      const token = await AsyncStorage.getItem('painelAdminToken');
      const urlempresa = await AsyncStorage.getItem('urlempresa');
      const loginToken = await AsyncStorage.getItem('loginToken');
      if (!token || !urlempresa) {
        Alert.alert('Erro', 'Token ou empresa em falta.');
        return;
      }

      const apiUrlPessoal = 'https://webapiprimavera.advir.pt/routesFaltas/InsertParteDiariaItem';
      const apiUrlEquip   = 'https://webapiprimavera.advir.pt/routesFaltas/InsertParteDiariaEquipamento';

      // Obra (converter para ID do ERP)
      const dadosObra = await obterCodObra(cab.ObraID);
      const codigoObra = dadosObra?.codigo;
      const idObra = await obterIDObra(codigoObra);

      // Colaborador no cabeçalho (se existir em storage)
      const codFuncLocal = await AsyncStorage.getItem('codFuncionario');
      const colaboradorIdCab = codFuncLocal ? (await obterColaboradorID(codFuncLocal)) : null;

      // Colaborador para os itens (primeiro NÃO externo)
      const primeiroItemColab = cab?.ParteDiariaItems?.find(i => !isExternoItem(i))?.ColaboradorID;
      const colaboradorIdItens = primeiroItemColab ? (await obterColaboradorID(primeiroItemColab)) : null;

      // === FILTRAR EXTERNOS (não enviar) ===
      const itens = cab.ParteDiariaItems || [];
      const itensNaoExterno = itens.filter(it => !isExternoItem(it));

      if (itensNaoExterno.length === 0) {
        Alert.alert('Informação', 'Este documento só contém EXTERNOS. Usa o botão "Aceitar".');
        return;
      }

      // dividir itens não externos por categoria
      const itensEquip   = itensNaoExterno.filter(it => String(it.Categoria || '').toLowerCase() === 'equipamentos');
      const itensOutros  = itensNaoExterno.filter(it => String(it.Categoria || '').toLowerCase() !== 'equipamentos');

      // construir pedidos com URL por tipo
      const pedidos = [];
      if (itensEquip.length > 0) {
        pedidos.push({
          nome: 'equipamentos',
          url: apiUrlEquip,
          payload: buildPayloadEquip({ docId: DOC_ID_EQUIP, cab, itens: itensEquip, idObra }),
        });
      }
      if (itensOutros.length > 0) {
        pedidos.push({
          nome: 'pessoal',
          url: apiUrlPessoal,
          payload: buildPayloadPessoal({
            docId: DOC_ID_DEFAULT,
            cab,
            itens: itensOutros,
            idObra,
            colaboradorIdCab,
            colaboradorIdItens,
          }),
        });
      }

      // enviar em sequência
      for (const p of pedidos) {
        const resp = await fetch(p.url, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            urlempresa,
          },
          body: JSON.stringify(p.payload),
        });
        const result = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          console.error(`❌ Falha ao integrar (${p.nome}):`, result);
          Alert.alert('Erro', `Falha ao integrar (${p.nome}): ${result?.detalhes || result?.error || 'erro desconhecido'}`);
          return;
        }
      }

      // marcar como integrado no teu backend
      const marcarRes = await fetch(`https://backend.advir.pt/api/parte-diaria/cabecalhos/${cab.DocumentoID}/integrar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${loginToken}`, 'Content-Type': 'application/json' },
      });

      if (marcarRes.ok) {
        Alert.alert('Sucesso', 'Parte integrada com sucesso (apenas não externos).');
        fetchCabecalhos();
      } else {
        Alert.alert('Aviso', 'Parte enviada mas falhou ao marcar como integrada.');
      }

    } catch (err) {
      console.error('Erro na integração:', err);
      Alert.alert('Erro', 'Erro inesperado ao integrar parte.');
    } finally {
      setIntegrandoIds(prev => {
        const s = new Set(prev);
        s.delete(cab.DocumentoID);
        return s;
      });
    }
  };

  // === ACEITAR (só externos): marca como integrado sem enviar ao Primavera ===
  const handleAceitarSomenteExternos = async (cab) => {
    setIntegrandoIds(prev => new Set(prev).add(cab.DocumentoID));
    try {
      if (!hasOnlyExternos(cab)) {
        Alert.alert('Aviso', 'Este documento não é exclusivo de externos.');
        return;
      }
      const loginToken = await AsyncStorage.getItem('loginToken');
      const marcarRes = await fetch(`https://backend.advir.pt/api/parte-diaria/cabecalhos/${cab.DocumentoID}/integrar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${loginToken}`, 'Content-Type': 'application/json' },
      });
      if (marcarRes.ok) {
        Alert.alert('Sucesso', 'Parte aceite (só externos) — marcado como integrado.');
        fetchCabecalhos();
      } else {
        Alert.alert('Erro', 'Não foi possível marcar como integrado.');
      }
    } catch (err) {
      console.error('Erro ao aceitar só externos:', err);
      Alert.alert('Erro', 'Erro inesperado ao aceitar (só externos).');
    } finally {
      setIntegrandoIds(prev => {
        const s = new Set(prev);
        s.delete(cab.DocumentoID);
        return s;
      });
    }
  };

  const handleRejeitar = async (item) => {
    Alert.alert(
      'Rejeitar Parte',
      'Tem certeza que deseja rejeitar esta parte diária?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Rejeitar', style: 'destructive', onPress: () => {
          console.log('Rejeitar parte:', item.DocumentoID);
          // TODO: implementar rejeição de parte
        }}
      ]
    );
  };

  const abrirDetalhes = async (cab) => {
    if (cab?.ParteDiariaItems?.length > 0) {
      for (const item of cab.ParteDiariaItems) {
        if (!isExternoItem(item) && item.ColaboradorID) {
          await obterNomeFuncionario(item.ColaboradorID);
        }
      }
    }
    setSelectedCabecalho(cab);
    setModalVisible(true);
  };

  const fecharModal = () => {
    setModalVisible(false);
    setSelectedCabecalho(null);
  };

  const getStatusColor = (integrado) => (integrado ? '#28a745' : '#ffc107');
  const getStatusIcon  = (integrado) => (integrado ? 'checkmark-circle' : 'time');

  const renderItem = ({ item }) => {
    const isIntegrando = integrandoIds.has(item.DocumentoID);
    const { pes, eq, ext } = contarPorCategoria(item?.ParteDiariaItems);
    const onlyExternos = hasOnlyExternos(item);

    return (
      <View style={styles.card} >
        <TouchableOpacity onPress={() => abrirDetalhes(item)} style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Ionicons name="document-text" size={20} color="#1792FE" />
              <Text style={styles.cardTitle}>Parte Diária</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.IntegradoERP) }]}>
              <Ionicons name={getStatusIcon(item.IntegradoERP)} size={12} color="#fff" style={styles.statusIcon}/>
              <Text style={styles.statusText}>
                {item.IntegradoERP ? 'Integrado' : 'Pendente'}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={16} color="#666" />
              <Text style={styles.cardText}>
                Registado por: {item.CriadoPor || item.Utilizador}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="business" size={16} color="#666" />
              <Text style={styles.cardText}>
                {obrasMap[String(item.ObraID)]
                  ? `${obrasMap[String(item.ObraID)].codigo} — ${obrasMap[String(item.ObraID)].descricao}`
                  : item.ObraID || 'Obra não definida'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={16} color="#666" />
              <Text style={styles.cardText}>
                Data do Registo: {new Date(item.Data).toLocaleDateString('pt-PT')}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="list" size={16} color="#666" />
              <Text style={styles.cardText}>
                Itens: {item.ParteDiariaItems?.length || 0}
              </Text>
              <View style={[styles.infoRow, { flexWrap: 'wrap' }]}>
                {pes > 0 && (
                  <View style={[styles.categoriaChip, { backgroundColor: getCategoriaChip('pessoal').bg }]}>
                    <Ionicons name="people" size={12} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.categoriaChipText}>Pessoal: {pes}</Text>
                  </View>
                )}
                {eq > 0 && (
                  <View style={[styles.categoriaChip, { backgroundColor: getCategoriaChip('equipamentos').bg }]}>
                    <Ionicons name="construct" size={12} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.categoriaChipText}>Equipamentos: {eq}</Text>
                  </View>
                )}
                {ext > 0 && (
                  <View style={[styles.categoriaChip, { backgroundColor: '#fd7e14' }]}>
                    <Ionicons name="warning" size={12} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.categoriaChipText}>Externos: {ext}</Text>
                  </View>
                )}
              </View>
            </View>

            {onlyExternos && (
              <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="information-circle" size={16} color="#fd7e14" style={{ marginRight: 6 }} />
                <Text style={{ color: '#fd7e14', fontWeight: '600' }}>
                  Apenas EXTERNOS — não será enviado para o Primavera.
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.viewDetailsButton} onPress={() => abrirDetalhes(item)}>
            <Text style={styles.viewDetailsText}>Ver Detalhes</Text>
            <Ionicons name="chevron-forward" size={16} color="#1792FE" />
          </TouchableOpacity>
        </TouchableOpacity>

        {!item.IntegradoERP && (
          <View style={styles.buttonContainer}>
            {onlyExternos ? (
              // BOTÃO ACEITAR (só externos)
              <TouchableOpacity
                style={[styles.integrarButton, isIntegrando && styles.buttonDisabled]}
                onPress={() => handleAceitarSomenteExternos(item)}
                disabled={isIntegrando}
              >
                <LinearGradient colors={['#28a745', '#20c997']} style={styles.buttonGradient}>
                  {isIntegrando ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark-done" size={16} color="#fff" />
                  )}
                  <Text style={styles.buttonText}>
                    {isIntegrando ? 'A aceitar...' : 'Aceitar'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              // BOTÃO INTEGRAR (envia internos, ignora externos)
              <TouchableOpacity
                style={[styles.integrarButton, isIntegrando && styles.buttonDisabled]}
                onPress={() => handleIntegrar(item)}
                disabled={isIntegrando}
              >
                <LinearGradient
                  colors={isIntegrando ? ['#ccc', '#999'] : ['#1792FE', '#0B5ED7']}
                  style={styles.buttonGradient}
                >
                  {isIntegrando ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  )}
                  <Text style={styles.buttonText}>
                    {isIntegrando ? 'Integrando...' : 'Integrar'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.rejeitarButton} onPress={() => handleRejeitar(item)}>
              <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.buttonGradient}>
                <Ionicons name="close-circle" size={16} color="#fff" />
                <Text style={styles.buttonText}>Rejeitar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#1792FE" />
      <Text style={styles.loadingText}>A carregar partes diárias...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={64} color="#dc3545" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity onPress={fetchCabecalhos} style={styles.retryButton}>
        <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.buttonGradient}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.retryText}>Tentar Novamente</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={['#e3f2fd', '#bbdefb', '#90caf9']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.header}>
          <Text style={styles.headerTitle}>Gestão de Partes Diárias</Text>
          <Text style={styles.headerSubtitle}>
            {cabecalhosFiltrados.length} {cabecalhosFiltrados.length === 1 ? 'parte' : 'partes'}
          </Text>
        </LinearGradient>

        <View style={styles.filtroContainer}>
          {['todos', 'pendentes', 'integrados'].map(opcao => (
            <TouchableOpacity
              key={opcao}
              style={[styles.filtroBotao, filtroEstado === opcao && styles.filtroBotaoAtivo]}
              onPress={() => setFiltroEstado(opcao)}
            >
              <Text style={filtroEstado === opcao ? styles.filtroTextoAtivo : styles.filtroTexto}>
                {opcao === 'todos' ? 'Todos' : opcao === 'pendentes' ? 'Pendentes' : 'Integrados'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={cabecalhosFiltrados}
          keyExtractor={item => String(item.DocumentoID)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1792FE']} />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-clear" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>Nenhuma parte diária encontrada</Text>
              <Text style={styles.emptyText}>
                {filtroEstado === 'pendentes'
                  ? 'Não há partes pendentes no momento.'
                  : filtroEstado === 'integrados'
                  ? 'Não há partes integradas ainda.'
                  : 'Não há partes diárias registadas.'}
              </Text>
            </View>
          )}
        />

        <Modal visible={modalVisible} animationType="slide" onRequestClose={fecharModal}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes da Parte Diária</Text>
              <TouchableOpacity onPress={fecharModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {selectedCabecalho && (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Registado por</Text>
                    <Text style={styles.modalValue}>
                      {selectedCabecalho.CriadoPor || selectedCabecalho.Utilizador}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Data do registo</Text>
                    <Text style={styles.modalValue}>
                      {new Date(selectedCabecalho.Data).toLocaleDateString('pt-PT')}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Estado</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedCabecalho.IntegradoERP) }]}>
                      <Ionicons name={getStatusIcon(selectedCabecalho.IntegradoERP)} size={12} color="#fff" style={styles.statusIcon}/>
                      <Text style={styles.statusText}>
                        {selectedCabecalho.IntegradoERP ? 'Integrado' : 'Pendente'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Itens da Parte Diária</Text>
                    {selectedCabecalho.ParteDiariaItems?.length > 0 ? (
                      selectedCabecalho.ParteDiariaItems.map((item, index) => {
                        const externo = isExternoItem(item);
                        return (
                          <View key={`${String(item.ComponenteID)}-${index}`} style={styles.itemCard}>
                            <View style={styles.itemHeader}>
                              <Text style={styles.itemNumber}>Item {index + 1}</Text>
                            </View>
                            <View style={styles.itemContent}>
                              <View style={styles.itemRow}>
                                <Ionicons name="calendar" size={14} color="#666" />
                                <Text style={styles.itemText}>Data: {item.Data}</Text>
                              </View>
                              <View style={styles.itemRow}>
                                <Ionicons name="person" size={14} color="#666" />
                                <Text style={styles.itemText}>
                                  {externo
                                    ? 'Colaborador: (Externo)'
                                    : `Colaborador: ${cacheNomes[item.ColaboradorID] || item.ColaboradorID}`}
                                </Text>
                              </View>
                              <View style={styles.itemRow}>
                                <Ionicons name="business" size={14} color="#666" />
                                <Text style={styles.itemText}>
                                  Obra: {obrasMap[String(item.ObraID)]
                                    ? `${obrasMap[String(item.ObraID)].codigo} — ${obrasMap[String(item.ObraID)].descricao}`
                                    : item.ObraID}
                                </Text>
                              </View>
                              <View style={styles.itemRow}>
                                <Ionicons name="pricetag" size={14} color="#666" />
                                {String(item.Categoria || '').toLowerCase() === 'equipamentos' ? (
                                  <Text style={styles.itemText}>
                                    Equipamento: {equipamentosMap[String(item.ComponenteID)] || equipamentosMap[String(item.SubEmpID)] || item.ComponenteID || item.SubEmpID}
                                  </Text>
                                ) : (
                                  <Text style={styles.itemText}>
                                    Especialidade: {especialidadesMap[String(item.SubEmpID)] || item.SubEmpID}
                                  </Text>
                                )}
                              </View>

                              <View style={styles.itemRow}>
                                <Ionicons name="time" size={14} color="#666" />
                                <Text style={styles.itemText}>Horas: {formatarHoras(item.NumHoras)}</Text>
                              </View>

                              <View style={styles.itemRow}>
                                <Ionicons name={externo ? 'warning' : 'checkmark'} size={14} color={externo ? '#fd7e14' : '#28a745'} />
                                <Text style={[styles.itemText, { color: externo ? '#fd7e14' : '#28a745' }]}>
                                  {externo ? 'Externo' : 'Interno'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.emptyItemsText}>Sem itens registados.</Text>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 25, paddingTop: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  headerSubtitle: { fontSize: 16, color: '#e3f2fd', opacity: 0.9 },
  listContent: { padding: 16, paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa' },
  loadingText: { marginTop: 15, fontSize: 16, color: '#1792FE', fontWeight: '500' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#f8f9fa' },
  errorText: { fontSize: 16, color: '#dc3545', textAlign: 'center', marginVertical: 20, lineHeight: 22 },
  retryButton: { borderRadius: 25, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, overflow: 'hidden' },
  cardContent: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginLeft: 10 },
  statusIcon: { marginRight: 4 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardBody: { marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardText: { fontSize: 14, color: '#555', marginLeft: 8, flex: 1, lineHeight: 20 },
  viewDetailsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 8 },
  viewDetailsText: { color: '#1792FE', fontSize: 14, fontWeight: '600', marginRight: 4 },
  buttonContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  integrarButton: { flex: 1, borderRadius: 25, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  rejeitarButton: { flex: 1, borderRadius: 25, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  buttonDisabled: { opacity: 0.7 },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#666', marginTop: 20, marginBottom: 10, textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center', lineHeight: 22 },
  filtroContainer: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 16, marginTop: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 25, padding: 6, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  filtroBotao: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center' },
  filtroBotaoAtivo: { backgroundColor: '#1792FE', elevation: 2, shadowColor: '#1792FE', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  filtroTexto: { color: '#1792FE', fontWeight: '500', fontSize: 14 },
  filtroTextoAtivo: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalContainer: { flex: 1, backgroundColor: '#f8f9fa' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef', elevation: 2 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  closeButton: { padding: 8, borderRadius: 20, backgroundColor: '#f8f9fa' },
  modalBody: { padding: 20 },
  modalSection: { marginBottom: 24 },
  modalLabel: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  modalValue: { fontSize: 15, color: '#555', lineHeight: 22 },
  itemCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, overflow: 'hidden' },
  itemHeader: { backgroundColor: '#f8f9fa', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  itemNumber: { fontSize: 14, fontWeight: '600', color: '#1792FE' },
  itemContent: { padding: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemText: { fontSize: 14, color: '#555', marginLeft: 8, flex: 1, lineHeight: 20 },
  emptyItemsText: { fontSize: 15, color: '#999', textAlign: 'center', fontStyle: 'italic', paddingVertical: 20 },
  categoriaChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8, marginTop: 6 },
  categoriaChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

export default GestaoPartesDiarias;
