import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity,
  Modal, ScrollView, SafeAreaView, RefreshControl, Alert, TextInput, Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';

const API_BASE = 'https://backend.advir.pt/api/trabalhadores-externos';
const API_PARTE_DIARIA = 'https://backend.advir.pt/api/parte-diaria/cabecalhos';
const API_OBRAS = 'https://backend.advir.pt/api/obra';

const statusBadge = (ativo, anulado) => {
  if (anulado) return { label: 'Anulado', color: '#dc3545', icon: 'close-circle' };
  if (ativo) return { label: 'Ativo', color: '#28a745', icon: 'checkmark-circle' };
  return { label: 'Inativo', color: '#6c757d', icon: 'pause-circle' };
};

const emptyForm = {
  id: null,
  empresa: '',
  funcionario: '',
  categoria: '',
  valor: '',
  moeda: 'EUR',
  data_inicio: '',
  data_fim: '',
  observacoes: '',
  ativo: true,
  anulado: false,
};

// ===== Helpers comuns
const formatarHoras = (minutos = 0) => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h > 0 ? `${h}h ` : ''}${m}m`;
};

// considera “trabalhador externo” apenas nos itens de PESSOAL (ignora equipamentos)
// considera “trabalhador externo” apenas nos itens de PESSOAL (ignora equipamentos)
const isExternoItem = (it) => {
  const isEquip = String(it.Categoria || '').toLowerCase() === 'equipamentos';
  if (isEquip) return false;

  const semColab =
    it.ColaboradorID === null ||
    it.ColaboradorID === undefined ||
    String(it.ColaboradorID).trim() === '';

  // aceita qualquer “externo” no texto, com/sem parênteses
  const marca = /\bexterno\b/i.test(String(it.Funcionario || ''));

  return semColab || marca;
};

// normaliza nomes: remove acentos, "(...)", a palavra "externo", pontuação e espaços extra
const normalizeName = (s = '') =>
  s.toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, ' ')         // remove qualquer "(...)"
    .replace(/\bexterno\b/gi, ' ')    // remove a palavra externo
    .replace(/[^a-z0-9\s]/gi, ' ')    // remove pontuação
    .replace(/\s+/g, ' ')             // espaços múltiplos
    .trim()
    .toLowerCase();


// devolve a especialidade a partir do item da Parte Diária (vários nomes possíveis)
const getEspecialidade = (it = {}) =>
  it.Especialidade ||
  it.EspecialidadeNome ||
  it.Funcao ||
  it.FuncaoNome ||
  it.SubCategoria ||
  it.Subcategoria ||
  (String(it.Categoria || '').toLowerCase() !== 'equipamentos' ? it.Categoria : '') ||
  '—';

const formatarValor = (n = 0) =>
  Number(n).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });


// tem ALGUM item externo de pessoal?
const hasAnyExternosPessoal = (cab) => {
  const itens = cab?.ParteDiariaItems || [];
  return itens.some(it => String(it.Categoria || '').toLowerCase() !== 'equipamentos' && isExternoItem(it));
};

const GestaoTrabalhadoresExternos = () => {
  // Estado base
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState('');
  const [registos, setRegistos] = useState([]);

  // Filtros
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos'); // todos | ativos | inativos | anulados
  const [empresaFiltro, setEmpresaFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [empresasCombo, setEmpresasCombo] = useState([]);
  const [categoriasCombo, setCategoriasCombo] = useState([]);

  // Form / modal
  const [modalFormVisible, setModalFormVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [aGuardar, setAGuardar] = useState(false);

  // Detalhe
  const [modalDetalheVisible, setModalDetalheVisible] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

  // === RESUMO EXTERNOS (NOVO) ===
  const [modalResumoVisible, setModalResumoVisible] = useState(false);
  const [resumoLoading, setResumoLoading] = useState(false);
  const [resumoDocs, setResumoDocs] = useState([]);
  const [obrasMap, setObrasMap] = useState({});

  // Controlo do resumo
  const [granularidade, setGranularidade] = useState('diario'); // 'diario' | 'mensal' | 'anual'
const [agruparPor, setAgruparPor] = useState('geral');        // 'geral' | 'obra' | 'empresa' | 'externo'
const [dataInicio, setDataInicio] = useState('');
const [dataFim, setDataFim] = useState('');


// Mostrar € e filtros de resumo
const [mostrarValores, setMostrarValores] = useState(true);

const [empresaResumoFiltro, setEmpresaResumoFiltro] = useState('');
const [externoResumoFiltro, setExternoResumoFiltro] = useState('');
const [especialidadeResumoFiltro, setEspecialidadeResumoFiltro] = useState('');



  const carregarCombos = useCallback(async () => {
    try {
      const loginToken = await AsyncStorage.getItem('loginToken');
      const headers = { Authorization: `Bearer ${loginToken}` };

      const [emp, cat] = await Promise.all([
        fetch(`${API_BASE}/distintos/empresas`, { headers }),
        fetch(`${API_BASE}/distintos/categorias`, { headers }),
      ]);

      const empData = emp.ok ? await emp.json() : [];
      const catData = cat.ok ? await cat.json() : [];

      setEmpresasCombo(['', ...empData]);      // '' = Todos
      setCategoriasCombo(['', ...catData]);    // '' = Todos
    } catch { /* silencioso */ }
  }, []);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search.trim());
    if (empresaFiltro) params.append('empresa', empresaFiltro);
    if (categoriaFiltro) params.append('categoria', categoriaFiltro);
    if (filtroStatus === 'ativos') params.append('ativo', 'true');
    if (filtroStatus === 'inativos') params.append('ativo', 'false');
    if (filtroStatus === 'anulados') params.append('anulado', 'true');
    params.append('pageSize', '200');
    return params.toString();
  };

  const fetchRegistos = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const loginToken = await AsyncStorage.getItem('loginToken');
      const res = await fetch(`${API_BASE}?${buildQuery()}`, {
        headers: { Authorization: `Bearer ${loginToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Falha a obter trabalhadores externos.');
      setRegistos(data?.data || data || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, filtroStatus, empresaFiltro, categoriaFiltro]);

  useEffect(() => { (async () => {
    await carregarCombos();
    await fetchRegistos();
  })(); }, [carregarCombos, fetchRegistos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRegistos();
    setRefreshing(false);
  }, [fetchRegistos]);

  // Helpers form
  const openCreate = () => { setForm(emptyForm); setModalFormVisible(true); };
  const openEdit = (item) => {
    setForm({
      id: item.id,
      empresa: item.empresa ?? '',
      funcionario: item.funcionario ?? '',
      categoria: item.categoria ?? '',
      valor: String(item.valor ?? ''),
      moeda: item.moeda ?? 'EUR',
      data_inicio: item.data_inicio ?? '',
      data_fim: item.data_fim ?? '',
      observacoes: item.observacoes ?? '',
      ativo: !!item.ativo,
      anulado: !!item.anulado,
    });
    setModalFormVisible(true);
  };

  const closeForm = () => { setModalFormVisible(false); setForm(emptyForm); };
  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const validarForm = () => {
    if (!form.empresa.trim()) return 'Empresa é obrigatória.';
    if (!form.funcionario.trim()) return 'Funcionário é obrigatório.';
    const v = Number(form.valor);
    if (Number.isNaN(v) || v < 0) return 'Valor inválido.';
    if (form.data_inicio && form.data_fim && new Date(form.data_fim) < new Date(form.data_inicio))
      return 'Data fim não pode ser anterior à data início.';
    return '';
  };

  const guardar = async () => {
    const msg = validarForm();
    if (msg) { Alert.alert('Validação', msg); return; }

    try {
      setAGuardar(true);
      const loginToken = await AsyncStorage.getItem('loginToken');
      const headers = {
        Authorization: `Bearer ${loginToken}`,
        'Content-Type': 'application/json'
      };

      const payload = {
        empresa: form.empresa.trim(),
        funcionario: form.funcionario.trim(),
        categoria: form.categoria.trim() || null,
        valor: Number(form.valor),
        moeda: (form.moeda || 'EUR').toUpperCase(),
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        observacoes: form.observacoes || null,
        ativo: !!form.ativo,
        anulado: !!form.anulado
      };

      let res;
      if (form.id) {
        res = await fetch(`${API_BASE}/${form.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      } else {
        res = await fetch(API_BASE, { method: 'POST', headers, body: JSON.stringify(payload) });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Falha ao guardar.');

      closeForm();
      await fetchRegistos();
      Alert.alert('Sucesso', 'Registo guardado com sucesso.');
    } catch (e) {
      Alert.alert('Erro', e.message || 'Erro ao guardar.');
    } finally {
      setAGuardar(false);
    }
  };

  // Ações rápidas
  const confirmar = (title, msg, onOk) => {
    Alert.alert(title, msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: onOk }
    ]);
  };

  const callPost = async (urlSuffix) => {
    const loginToken = await AsyncStorage.getItem('loginToken');
    const res = await fetch(`${API_BASE}/${urlSuffix}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginToken}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Falha na operação.');
  };

  const eliminar = (id) => confirmar('Eliminar', 'Tem a certeza que pretende eliminar?', async () => {
    try {
      const loginToken = await AsyncStorage.getItem('loginToken');
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${loginToken}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Falha ao eliminar.');
      await fetchRegistos();
      Alert.alert('Sucesso', 'Registo eliminado.');
    } catch (e) {
      Alert.alert('Erro', e.message || 'Erro ao eliminar.');
    }
  });

  const anular = (id) => confirmar('Anular', 'Marcar como anulado?', async () => {
    try { await callPost(`${id}/anular`); await fetchRegistos(); } catch (e) { Alert.alert('Erro', e.message); }
  });

  const restaurar = (id) => confirmar('Restaurar', 'Restaurar registo?', async () => {
    try { await callPost(`${id}/restaurar`); await fetchRegistos(); } catch (e) { Alert.alert('Erro', e.message); }
  });

  const ativar = (id) => confirmar('Ativar', 'Marcar como ativo?', async () => {
    try { await callPost(`${id}/ativar`); await fetchRegistos(); } catch (e) { Alert.alert('Erro', e.message); }
  });

  const desativar = (id) => confirmar('Desativar', 'Marcar como inativo?', async () => {
    try { await callPost(`${id}/desativar`); await fetchRegistos(); } catch (e) { Alert.alert('Erro', e.message); }
  });

  const abrirDetalhe = (item) => { setDetalhe(item); setModalDetalheVisible(true); };
  const fecharDetalhe = () => { setDetalhe(null); setModalDetalheVisible(false); };

  const listaFiltrada = useMemo(() => registos, [registos]);

  // === RESUMO EXTERNOS: data sources
  const fetchObrasResumo = useCallback(async () => {
    try {
      const loginToken = await AsyncStorage.getItem('loginToken');
      const res = await fetch(API_OBRAS, { headers: { Authorization: `Bearer ${loginToken}` } });
      if (!res.ok) return;
      const obras = await res.json();
      const map = {};
      obras.forEach(o => {
        const key = String(o.id || o.ID);
        map[key] = { codigo: o.codigo, nome: o.nome };
      });
      setObrasMap(map);
    } catch { /* silencioso */ }
  }, []);

  const fetchResumoExternos = useCallback(async () => {
    setResumoLoading(true);
    try {
      const painelToken = await AsyncStorage.getItem('painelAdminToken');
      const res = await fetch(API_PARTE_DIARIA, { headers: { Authorization: `Bearer ${painelToken}` } });
      const all = await res.json();
      // integrados + com algum externo de pessoal
      const aprovados = (all || [])
        .filter(c => c.IntegradoERP)
        .filter(c => hasAnyExternosPessoal(c))
        .sort((a, b) => new Date(b.Data) - new Date(a.Data));
      setResumoDocs(aprovados);
    } catch (e) {
      Alert.alert('Erro', e.message || 'Falha a carregar resumo dos externos.');
    } finally {
      setResumoLoading(false);
    }
  }, []);

  const openResumoExternos = async () => {
    setModalResumoVisible(true);
    await Promise.all([fetchObrasResumo(), fetchResumoExternos()]);
  };
  const closeResumoExternos = () => { setModalResumoVisible(false); setResumoDocs([]); };

 // Mapa (NOME NORMALIZADO) -> empresa do externo
 const nomeToEmpresa = useMemo(() => {
   const m = {};
   (registos || []).forEach(r => {
     const key = normalizeName(r?.funcionario || '');
     if (key) m[key] = r?.empresa || '—';
   });
   return m;
 }, [registos]);

 // Info por externo (valor hora / moeda / empresa), indexado por nome normalizado
const nomeToInfo = useMemo(() => {
  const m = {};
  (registos || []).forEach(r => {
    const key = normalizeName(r?.funcionario || '');
    if (!key) return;
    m[key] = {
      empresa: r?.empresa || '—',
      valorHora: Number(r?.valor) || 0,
      moeda: (r?.moeda || 'EUR').toUpperCase(),
    };
  });
  return m;
}, [registos]);


  // Helpers resumo
  const getPeriodParts = (iso) => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = d.getMonth() + 1; // 1..12
    const dd = d.getDate();
    return { y, m, dd, ts: d.getTime() };
  };


  // Opções dos pickers no Resumo, geradas a partir dos docs carregados
const resumoOptions = useMemo(() => {
  const empresas = new Set(['']);
  const externos = new Set(['']);
  const especialidades = new Set(['']);

  (resumoDocs || []).forEach(cab => {
    (cab.ParteDiariaItems || []).forEach(it => {
      if (String(it.Categoria || '').toLowerCase() === 'equipamentos') return;
      if (!isExternoItem(it)) return;

      const key = normalizeName(it.Funcionario || '');
      const emp = nomeToInfo[key]?.empresa || '—';
      if (emp) empresas.add(emp);
      if (it.Funcionario) externos.add(it.Funcionario);
      const esp = getEspecialidade(it);
      if (esp) especialidades.add(esp);
    });
  });

  return {
    empresas: Array.from(empresas),
    externos: Array.from(externos),
    especialidades: Array.from(especialidades),
  };
}, [resumoDocs, nomeToInfo]);

const passaFiltrosResumo = (it) => {
  const nome = it.Funcionario || '';
  const esp = getEspecialidade(it);
  const emp = nomeToInfo[normalizeName(nome)]?.empresa || '—';

  if (empresaResumoFiltro && emp !== empresaResumoFiltro) return false;
  if (externoResumoFiltro && nome !== externoResumoFiltro) return false;
  if (especialidadeResumoFiltro && esp !== especialidadeResumoFiltro) return false;

  return true;
};







  const periodKeyAndLabel = (iso, gran) => {
    const { y, m, ts } = getPeriodParts(iso);
    if (gran === 'anual') return { key: String(y), label: String(y), sort: y * 10000 };
    if (gran === 'mensal') {
      const k = `${y}-${String(m).padStart(2, '0')}`;
      return { key: k, label: k, sort: y * 100 + m };
    }
    // diário
    const d = new Date(iso);
    const key = iso.slice(0, 10);
    return { key, label: d.toLocaleDateString('pt-PT'), sort: ts };
  };

  const dentroIntervalo = (iso) => {
    if (!dataInicio && !dataFim) return true;
    const d = iso.slice(0, 10);
    if (dataInicio && d < dataInicio) return false;
    if (dataFim && d > dataFim) return false;
    return true;
  };

  const resumoAgrupado = useMemo(() => {
  // árvore: Map(periodKey => { label, sort, groups: Map(label => {minutos, valores{EUR: n, CHF: n}}), totalMin, totalVals{...} })
  const tree = new Map();

  (resumoDocs || []).forEach(cab => {
    if (!dentroIntervalo(cab.Data)) return;

    const itensExternos = (cab.ParteDiariaItems || [])
      .filter(it => String(it.Categoria || '').toLowerCase() !== 'equipamentos')
      .filter(isExternoItem)
      .filter(passaFiltrosResumo);

    if (itensExternos.length === 0) return;

    const { key: pKey, label: pLabel, sort } = periodKeyAndLabel(cab.Data, granularidade);
    if (!tree.has(pKey)) tree.set(pKey, { label: pLabel, sort, groups: new Map(), totalMin: 0, totalVals: {} });

    itensExternos.forEach(it => {
      // label do grupo
      const nome = it.Funcionario || 'Externo';
      const nomeKey = normalizeName(nome);
      const emp = nomeToEmpresa[nomeKey] || nomeToInfo[nomeKey]?.empresa || '—';
      const esp = getEspecialidade(it);

      let gLabel = 'Total';
      switch (agruparPor) {
        case 'obra': {
          const ob = obrasMap[String(cab.ObraID)];
          gLabel = ob ? `${ob.codigo} — ${ob.nome}` : `Obra ${cab.ObraID}`;
          break;
        }
        case 'empresa': gLabel = emp; break;
        case 'externo': gLabel = nome; break;
        case 'especialidade': gLabel = esp; break;
        case 'empresa_externo': gLabel = `${emp} — ${nome}`; break;
        case 'especialidade_externo': gLabel = `${esp} — ${nome}`; break;
        case 'especialidade_empresa': gLabel = `${esp} — ${emp}`; break;
        // 'geral' fica 'Total'
      }

      // minutos + € do item
      const minutos = Number(it.NumHoras || 0);
      const info = nomeToInfo[nomeKey]; // pode não existir
      const moeda = info?.moeda || 'EUR';
      const valorMin = info ? (info.valorHora * (minutos / 60)) : 0;

      const node = tree.get(pKey);
      const bucket = node.groups;

      const current = bucket.get(gLabel) || { minutos: 0, valores: {} };
      current.minutos += minutos;
      current.valores[moeda] = (current.valores[moeda] || 0) + valorMin;
      bucket.set(gLabel, current);

      node.totalMin += minutos;
      node.totalVals[moeda] = (node.totalVals[moeda] || 0) + valorMin;
    });
  });

  // para array ordenado
  const arr = Array.from(tree.entries())
    .map(([k, v]) => ({
      periodKey: k,
      label: v.label,
      sort: v.sort,
      groups: Array.from(v.groups.entries())
        .map(([g, { minutos, valores }]) => ({ label: g, minutos, valores }))
        .sort((a, b) => b.minutos - a.minutos),
      total: v.totalMin,
      totais: v.totalVals,
    }))
    .sort((a, b) => b.sort - a.sort);

  return arr;
}, [resumoDocs, granularidade, agruparPor, obrasMap, nomeToEmpresa, nomeToInfo, dataInicio, dataFim, empresaResumoFiltro, externoResumoFiltro, especialidadeResumoFiltro]);


  // Render cards
  const renderItem = ({ item }) => {
    const s = statusBadge(item.ativo, item.anulado);
    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => abrirDetalhe(item)} style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Ionicons name="briefcase" size={20} color="#1792FE" />
              <Text style={styles.cardTitle}>{item.funcionario}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: s.color }]}>
              <Ionicons name={s.icon} size={12} color="#fff" style={styles.statusIcon} />
              <Text style={styles.statusText}>{s.label}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Ionicons name="business" size={16} color="#666" />
              <Text style={styles.cardText}>{item.empresa}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="pricetag" size={16} color="#666" />
              <Text style={styles.cardText}>{item.categoria || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="cash" size={16} color="#666" />
              <Text style={styles.cardText}>
                {Number(item.valor).toFixed(2)} {item.moeda || 'EUR'}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(item)}>
              <Ionicons name="create" size={16} color="#1792FE" />
              <Text style={styles.smallBtnText}>Editar</Text>
            </TouchableOpacity>

            {!item.anulado ? (
              <TouchableOpacity style={styles.smallBtn} onPress={() => anular(item.id)}>
                <Ionicons name="close-circle" size={16} color="#dc3545" />
                <Text style={[styles.smallBtnText, { color: '#dc3545' }]}>Anular</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.smallBtn} onPress={() => restaurar(item.id)}>
                <Ionicons name="refresh" size={16} color="#17a2b8" />
                <Text style={[styles.smallBtnText, { color: '#17a2b8' }]}>Restaurar</Text>
              </TouchableOpacity>
            )}

            {item.ativo ? (
              <TouchableOpacity style={styles.smallBtn} onPress={() => desativar(item.id)}>
                <Ionicons name="pause-circle" size={16} color="#6c757d" />
                <Text style={[styles.smallBtnText, { color: '#6c757d' }]}>Desativar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.smallBtn} onPress={() => ativar(item.id)}>
                <Ionicons name="play-circle" size={16} color="#28a745" />
                <Text style={[styles.smallBtnText, { color: '#28a745' }]}>Ativar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.smallBtn} onPress={() => eliminar(item.id)}>
              <Ionicons name="trash" size={16} color="#000" />
              <Text style={[styles.smallBtnText, { color: '#000' }]}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#1792FE" />
      <Text style={styles.loadingText}>A carregar trabalhadores externos...</Text>
    </View>
  );

  if (erro) return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={64} color="#dc3545" />
      <Text style={styles.errorText}>{erro}</Text>
      <TouchableOpacity onPress={fetchRegistos} style={styles.retryButton}>
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
          <Text style={styles.headerTitle}>Trabalhadores Externos</Text>
          <Text style={styles.headerSubtitle}>
            {listaFiltrada.length} {listaFiltrada.length === 1 ? 'registo' : 'registos'}
          </Text>
        </LinearGradient>

        {/* Filtros */}
        <View style={styles.filtersCard}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color="#1792FE" />
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar (empresa, funcionário, categoria)"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onSubmitEditing={fetchRegistos}
            />
            <TouchableOpacity onPress={fetchRegistos}>
              <Ionicons name="arrow-forward-circle" size={24} color="#1792FE" />
            </TouchableOpacity>
          </View>

          <View style={styles.pickersRow}>
            <View style={styles.pickerWrap}>
              <Text style={styles.pickerLabel}>Empresa</Text>
              <Picker
                selectedValue={empresaFiltro}
                onValueChange={(v) => setEmpresaFiltro(v)}
                style={styles.picker}
              >
                {empresasCombo.map((e, idx) => (
                  <Picker.Item key={String(idx)} label={e || 'Todas'} value={e} />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerWrap}>
              <Text style={styles.pickerLabel}>Categoria</Text>
              <Picker
                selectedValue={categoriaFiltro}
                onValueChange={(v) => setCategoriaFiltro(v)}
                style={styles.picker}
              >
                {categoriasCombo.map((c, idx) => (
                  <Picker.Item key={String(idx)} label={c || 'Todas'} value={c} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.statusRow}>
            {['todos', 'ativos', 'inativos', 'anulados'].map(opcao => (
              <TouchableOpacity
                key={opcao}
                style={[styles.statusBtn, filtroStatus === opcao && styles.statusBtnActive]}
                onPress={() => setFiltroStatus(opcao)}
              >
                <Text style={filtroStatus === opcao ? styles.statusBtnTextActive : styles.statusBtnText}>
                  {opcao.charAt(0).toUpperCase() + opcao.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.bottomFilterRow}>
            <TouchableOpacity onPress={fetchRegistos} style={styles.applyFiltersBtn}>
              <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.applyFiltersGrad}>
                <Ionicons name="funnel" size={16} color="#fff" />
                <Text style={styles.applyFiltersText}>Aplicar Filtros</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={openCreate} style={styles.newBtn}>
              <LinearGradient colors={['#34c759', '#2aa94f']} style={styles.applyFiltersGrad}>
                <Ionicons name="add-circle" size={16} color="#fff" />
                <Text style={styles.applyFiltersText}>Novo</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Botão Resumo */}
            <TouchableOpacity onPress={openResumoExternos} style={styles.resumoBtn}>
              <LinearGradient colors={['#fd7e14', '#f39c12']} style={styles.applyFiltersGrad}>
                <Ionicons name="analytics" size={16} color="#fff" />
                <Text style={styles.applyFiltersText}>Resumo Externos</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista */}
        <FlatList
          data={listaFiltrada}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1792FE']} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-circle" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>Sem trabalhadores externos</Text>
              <Text style={styles.emptyText}>Clique em "Novo" para criar o primeiro registo.</Text>
            </View>
          )}
        />

        {/* Modal Form */}
        <Modal visible={modalFormVisible} animationType="slide" onRequestClose={closeForm}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{form.id ? 'Editar' : 'Novo'} Trabalhador Externo</Text>
              <TouchableOpacity onPress={closeForm} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formBody}>
              <View style={styles.formRow}>
                <Text style={styles.label}>Empresa *</Text>
                <TextInput
                  style={styles.input}
                  value={form.empresa}
                  onChangeText={(t) => handleChange('empresa', t)}
                  placeholder="Ex.: Rubinova"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.label}>Funcionário *</Text>
                <TextInput
                  style={styles.input}
                  value={form.funcionario}
                  onChangeText={(t) => handleChange('funcionario', t)}
                  placeholder="Ex.: Joaquim Ribeiro"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.label}>Categoria</Text>
                <TextInput
                  style={styles.input}
                  value={form.categoria}
                  onChangeText={(t) => handleChange('categoria', t)}
                  placeholder="Ex.: Servente / Oficial 1ª"
                />
              </View>

              <View style={styles.twoCols}>
                <View style={[styles.formRow, { flex: 1, marginRight: 6 }]}>
                  <Text style={styles.label}>Valor *</Text>
                  <TextInput
                    style={styles.input}
                    value={String(form.valor)}
                    onChangeText={(t) => handleChange('valor', t.replace(',', '.'))}
                    keyboardType="numeric"
                    placeholder="Ex.: 9.50"
                  />
                </View>
                <View style={[styles.formRow, { width: 110, marginLeft: 6 }]}>
                  <Text style={styles.label}>Moeda</Text>
                  <Picker
                    selectedValue={form.moeda}
                    onValueChange={(v) => handleChange('moeda', v)}
                    style={styles.picker}
                  >
                    <Picker.Item label="EUR" value="EUR" />
                    <Picker.Item label="CHF" value="CHF" />
                  </Picker>
                </View>
              </View>

              <View style={styles.twoCols}>
                <View style={[styles.formRow, { flex: 1, marginRight: 6 }]}>
                  <Text style={styles.label}>Data Início</Text>
                  <TextInput
                    style={styles.input}
                    value={form.data_inicio}
                    onChangeText={(t) => handleChange('data_inicio', t)}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={[styles.formRow, { flex: 1, marginLeft: 6 }]}>
                  <Text style={styles.label}>Data Fim</Text>
                  <TextInput
                    style={styles.input}
                    value={form.data_fim}
                    onChangeText={(t) => handleChange('data_fim', t)}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.label}>Observações</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={form.observacoes}
                  onChangeText={(t) => handleChange('observacoes', t)}
                  placeholder="Notas adicionais…"
                  multiline
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchItem}>
                  <Text style={styles.switchLabel}>Ativo</Text>
                  <Switch value={form.ativo} onValueChange={(v) => handleChange('ativo', v)} />
                </View>
                <View style={styles.switchItem}>
                  <Text style={styles.switchLabel}>Anulado</Text>
                  <Switch value={form.anulado} onValueChange={(v) => handleChange('anulado', v)} />
                </View>
              </View>

              <TouchableOpacity onPress={guardar} disabled={aGuardar} style={{ marginTop: 10 }}>
                <LinearGradient
                  colors={aGuardar ? ['#999', '#777'] : ['#1792FE', '#0B5ED7']}
                  style={styles.saveBtn}
                >
                  {aGuardar ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save" size={16} color="#fff" />
                      <Text style={styles.saveBtnText}>Guardar</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Modal Detalhe */}
        <Modal visible={modalDetalheVisible} animationType="slide" onRequestClose={fecharDetalhe}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes</Text>
              <TouchableOpacity onPress={fecharDetalhe} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {detalhe && (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Empresa</Text>
                    <Text style={styles.modalValue}>{detalhe.empresa}</Text>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Funcionário</Text>
                    <Text style={styles.modalValue}>{detalhe.funcionario}</Text>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Categoria</Text>
                    <Text style={styles.modalValue}>{detalhe.categoria || '—'}</Text>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Valor</Text>
                    <Text style={styles.modalValue}>
                      {Number(detalhe.valor).toFixed(2)} {detalhe.moeda || 'EUR'}
                    </Text>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Vigência</Text>
                    <Text style={styles.modalValue}>
                      {detalhe.data_inicio || '—'} {detalhe.data_fim ? `→ ${detalhe.data_fim}` : ''}
                    </Text>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Observações</Text>
                    <Text style={styles.modalValue}>{detalhe.observacoes || '—'}</Text>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Estado</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBadge(detalhe.ativo, detalhe.anulado).color }]}>
                      <Ionicons name={statusBadge(detalhe.ativo, detalhe.anulado).icon} size={12} color="#fff" style={styles.statusIcon} />
                      <Text style={styles.statusText}>{statusBadge(detalhe.ativo, detalhe.anulado).label}</Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* === MODAL RESUMO EXTERNOS (NOVO) === */}
        <Modal visible={modalResumoVisible} animationType="slide" onRequestClose={closeResumoExternos}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resumo — Externos Aprovados</Text>
              <TouchableOpacity onPress={closeResumoExternos} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Controlo de resumo */}
            <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
              <View style={styles.segmentRow}>
                {[
                  { k: 'diario', label: 'Diário' },
                  { k: 'mensal', label: 'Mensal' },
                  { k: 'anual', label: 'Anual' },
                ].map(op => (
                  <TouchableOpacity
                    key={op.k}
                    onPress={() => setGranularidade(op.k)}
                    style={[styles.segmentBtn, granularidade === op.k && styles.segmentBtnActive]}
                  >
                    <Text style={granularidade === op.k ? styles.segmentTextActive : styles.segmentText}>
                      {op.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 1ª linha: básicos */}
<View style={[styles.segmentRow, { marginTop: 8 }]}>
  {[
    { k: 'geral', label: 'Geral' },
    { k: 'obra', label: 'Obra' },
    { k: 'empresa', label: 'Empresa' },
    { k: 'externo', label: 'Externo' },
    { k: 'especialidade', label: 'Especialidade' },
  ].map(op => (
    <TouchableOpacity
      key={op.k}
      onPress={() => setAgruparPor(op.k)}
      style={[styles.segmentBtn, agruparPor === op.k && styles.segmentBtnActive]}
    >
      <Text style={agruparPor === op.k ? styles.segmentTextActive : styles.segmentText}>
        {op.label}
      </Text>
    </TouchableOpacity>
  ))}
</View>

{/* 2ª linha: combos */}
<View style={[styles.segmentRow, { marginTop: 8 }]}>
  {[
    { k: 'empresa_externo', label: 'Empresa/Colaborador' },
    { k: 'especialidade_externo', label: 'Especialidade/Colaborador' },
    { k: 'especialidade_empresa', label: 'Especialidade/Empresa' },
  ].map(op => (
    <TouchableOpacity
      key={op.k}
      onPress={() => setAgruparPor(op.k)}
      style={[styles.segmentBtn, agruparPor === op.k && styles.segmentBtnActive]}
    >
      <Text style={agruparPor === op.k ? styles.segmentTextActive : styles.segmentText}>
        {op.label}
      </Text>
    </TouchableOpacity>
  ))}
</View>
<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
  <Text style={{ color: '#333', fontWeight: '600' }}>Mostrar valores (€)</Text>
  <Switch value={mostrarValores} onValueChange={setMostrarValores} />
</View>




              <View style={styles.rangeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rangeLabel}>Data início</Text>
                  <TextInput
                    placeholder="YYYY-MM-DD"
                    value={dataInicio}
                    onChangeText={setDataInicio}
                    style={styles.rangeInput}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rangeLabel}>Data fim</Text>
                  <TextInput
                    placeholder="YYYY-MM-DD"
                    value={dataFim}
                    onChangeText={setDataFim}
                    style={styles.rangeInput}
                  />
                </View>
                {/* Filtros do resumo */}
<View style={{ marginTop: 10 }}>
  <View style={styles.pickersRow}>
    <View style={styles.pickerWrap}>
      <Text style={styles.pickerLabel}>Empresa</Text>
      <Picker
        selectedValue={empresaResumoFiltro}
        onValueChange={setEmpresaResumoFiltro}
        style={styles.picker}
      >
        {resumoOptions.empresas.map((e, idx) => (
          <Picker.Item key={`emp-${idx}`} label={e || 'Todas'} value={e} />
        ))}
      </Picker>
    </View>

    <View style={styles.pickerWrap}>
      <Text style={styles.pickerLabel}>Externo</Text>
      <Picker
        selectedValue={externoResumoFiltro}
        onValueChange={setExternoResumoFiltro}
        style={styles.picker}
      >
        {resumoOptions.externos.map((e, idx) => (
          <Picker.Item key={`ext-${idx}`} label={e || 'Todos'} value={e} />
        ))}
      </Picker>
    </View>
  </View>

  <View style={[styles.pickersRow, { marginTop: 10 }]}>
    <View style={[styles.pickerWrap, { flex: 1 }]}>
      <Text style={styles.pickerLabel}>Especialidade</Text>
      <Picker
        selectedValue={especialidadeResumoFiltro}
        onValueChange={setEspecialidadeResumoFiltro}
        style={styles.picker}
      >
        {resumoOptions.especialidades.map((e, idx) => (
          <Picker.Item key={`esp-${idx}`} label={e || 'Todas'} value={e} />
        ))}
      </Picker>
    </View>
  </View>
</View>

              </View>
            </View>

            {resumoLoading ? (
              <View style={[styles.loadingContainer, { backgroundColor: '#fff' }]}>
                <ActivityIndicator size="large" color="#1792FE" />
                <Text style={styles.loadingText}>A carregar resumo…</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.modalBody}>
                {resumoAgrupado.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="document-text" size={64} color="#ccc" />
                    <Text style={styles.emptyTitle}>Sem dados para o filtro</Text>
                    <Text style={styles.emptyText}>Ajuste a granularidade, agrupamento ou intervalo.</Text>
                  </View>
                ) : (
                  resumoAgrupado.map(period => (
                    <View key={period.periodKey} style={styles.resumoCard}>
                      <View style={styles.resumoHeader}>
                        <Ionicons name="calendar" size={16} color="#1792FE" />
                        <Text style={styles.resumoTitle}>{period.label}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: '#17a2b8', marginLeft: 'auto' }]}>
                          <Ionicons name="timer" size={12} color="#fff" style={styles.statusIcon} />
                          <Text style={styles.statusText}>{formatarHoras(period.total)}</Text>
                        </View>
                      </View>

                    {period.groups.map(g => (
  <View key={`${period.periodKey}-${g.label}`} style={{ marginBottom: 4 }}>
    <View style={styles.resumoRow}>
      <Ionicons
        name={
          agruparPor === 'obra' ? 'business'
          : agruparPor === 'externo' ? 'person'
          : agruparPor.includes('empresa') ? 'storefront'
          : agruparPor.includes('especialidade') ? 'construct'
          : 'analytics'
        }
        size={14}
        color="#666"
      />
      <Text style={styles.resumoText}>{g.label}</Text>

      <Ionicons name="time" size={14} color="#666" />
      <Text style={[styles.resumoText, { fontWeight: '700', flexGrow: 0 }]}>
        {formatarHoras(g.minutos)}
      </Text>

      {mostrarValores && (
        <Text style={[styles.resumoText, { flexGrow: 0, fontWeight: '700', marginLeft: 8 }]}>
          {Object.entries(g.valores || {})
            .map(([moeda, v]) => `${formatarValor(v)} ${moeda}`)
            .join('  •  ')}
        </Text>
      )}
    </View>
  </View>
))}

                    </View>
                  ))
                )}
              </ScrollView>
            )}
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

  filtersCard: {
    margin: 16, padding: 12, backgroundColor: '#fff', borderRadius: 16,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  searchInput: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f2f6fb' },

  pickersRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  pickerWrap: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 10, paddingHorizontal: 6 },
  pickerLabel: { fontSize: 12, color: '#666', paddingTop: 6, paddingLeft: 4 },
  picker: { width: '100%' },

  statusRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  statusBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#e9f3ff' },
  statusBtnActive: { backgroundColor: '#1792FE' },
  statusBtnText: { color: '#1792FE', fontWeight: '600' },
  statusBtnTextActive: { color: '#fff', fontWeight: '700' },

  bottomFilterRow: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  applyFiltersBtn: { flex: 1, borderRadius: 25, overflow: 'hidden' },
  newBtn: { width: 140, borderRadius: 25, overflow: 'hidden' },
  resumoBtn: { width: 200, borderRadius: 25, overflow: 'hidden' },

  applyFiltersGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, gap: 6 },
  applyFiltersText: { color: '#fff', fontWeight: '700' },

  listContent: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, overflow: 'hidden'
  },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 10 },
  statusIcon: { marginRight: 4 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardBody: { marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#555', marginLeft: 8, flex: 1, lineHeight: 20 },

  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#f6f9ff', borderRadius: 10 },
  smallBtnText: { color: '#1792FE', fontWeight: '700' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa' },
  loadingText: { marginTop: 15, fontSize: 16, color: '#1792FE', fontWeight: '500' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#f8f9fa' },
  errorText: { fontSize: 16, color: '#dc3545', textAlign: 'center', marginVertical: 20, lineHeight: 22 },
  retryButton: { borderRadius: 25, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  modalContainer: { flex: 1, backgroundColor: '#f8f9fa' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef', elevation: 2 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  closeButton: { padding: 8, borderRadius: 20, backgroundColor: '#f8f9fa' },

  formBody: { padding: 16 },
  formRow: { marginBottom: 12 },
  label: { fontSize: 14, color: '#333', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  twoCols: { flexDirection: 'row' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  switchItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 14, color: '#333', fontWeight: '600' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700' },

  modalBody: { padding: 16, paddingBottom: 24 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#666', marginTop: 20, marginBottom: 10, textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center', lineHeight: 22 },

  // RESUMO
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: '#e9f3ff', alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#1792FE' },
  segmentText: { color: '#1792FE', fontWeight: '700' },
  segmentTextActive: { color: '#fff', fontWeight: '800' },

  rangeRow: { flexDirection: 'row', marginTop: 10 },
  rangeLabel: { fontSize: 12, color: '#666', marginBottom: 4, marginLeft: 2 },
  rangeInput: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb' },

  resumoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2
  },
  resumoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  resumoTitle: { fontWeight: '800', color: '#333', flexShrink: 1 },
  resumoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  resumoText: { color: '#555', flex: 1 },
});

export default GestaoTrabalhadoresExternos;
