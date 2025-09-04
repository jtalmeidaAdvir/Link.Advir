
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

const isExternoItem = (it) => {
  const isEquip = String(it.Categoria || '').toLowerCase() === 'equipamentos';
  if (isEquip) return false;

  const semColab =
    it.ColaboradorID === null ||
    it.ColaboradorID === undefined ||
    String(it.ColaboradorID).trim() === '';

  const marca = /\bexterno\b/i.test(String(it.Funcionario || ''));

  return semColab || marca;
};

const normalizeName = (s = '') =>
  s.toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bexterno\b/gi, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

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
  const [filtroStatus, setFiltroStatus] = useState('todos');
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

  // === RESUMO EXTERNOS ===
  const [modalResumoVisible, setModalResumoVisible] = useState(false);
  const [resumoLoading, setResumoLoading] = useState(false);
  const [resumoDocs, setResumoDocs] = useState([]);
  const [obrasMap, setObrasMap] = useState({});

  // Controlo do resumo
  const [granularidade, setGranularidade] = useState('diario');
  const [agruparPor, setAgruparPor] = useState('geral');
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
      const empresaId = await AsyncStorage.getItem('empresa_id');
      
      const headers = { 
        Authorization: `Bearer ${loginToken}`,
        'X-Empresa-ID': empresaId
      };

      const [emp, cat] = await Promise.all([
        fetch(`${API_BASE}/distintos/empresas`, { headers }),
        fetch(`${API_BASE}/distintos/categorias`, { headers }),
      ]);

      const empData = emp.ok ? await emp.json() : [];
      const catData = cat.ok ? await cat.json() : [];

      setEmpresasCombo(['', ...empData]);
      setCategoriasCombo(['', ...catData]);
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
      const empresaId = await AsyncStorage.getItem('empresa_id');
      
      const headers = { 
        Authorization: `Bearer ${loginToken}`,
        'X-Empresa-ID': empresaId // Enviar empresa_id no header
      };
      
      const res = await fetch(`${API_BASE}?${buildQuery()}`, { headers });
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

      // Obter empresa_id do localStorage
      const empresaId = await AsyncStorage.getItem('empresa_id');
      
      const payload = {
        empresa_id: empresaId ? Number(empresaId) : null,
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

  // Modal de confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState({
    visible: false,
    titulo: '',
    mensagem: '',
    onConfirm: null,
    confirmText: 'Confirmar',
    confirmColor: '#dc3545'
  });

  const mostrarConfirmacao = (titulo, mensagem, onConfirm, confirmText = 'Confirmar', confirmColor = '#dc3545') => {
    setModalConfirmacao({
      visible: true,
      titulo,
      mensagem,
      onConfirm,
      confirmText,
      confirmColor
    });
  };

  const fecharConfirmacao = () => {
    setModalConfirmacao({
      visible: false,
      titulo: '',
      mensagem: '',
      onConfirm: null,
      confirmText: 'Confirmar',
      confirmColor: '#dc3545'
    });
  };

  const executarConfirmacao = () => {
    if (modalConfirmacao.onConfirm) {
      modalConfirmacao.onConfirm();
    }
    fecharConfirmacao();
  };

  const callPost = async (urlSuffix) => {
    const loginToken = await AsyncStorage.getItem('loginToken');
    const empresaId = await AsyncStorage.getItem('empresa_id');
    
    const headers = { 
      Authorization: `Bearer ${loginToken}`,
      'X-Empresa-ID': empresaId
    };
    
    const res = await fetch(`${API_BASE}/${urlSuffix}`, {
      method: 'POST',
      headers
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Falha na operação.');
  };

  const eliminar = (id) => mostrarConfirmacao(
    'Eliminar Trabalhador Externo', 
    'Tem a certeza que pretende eliminar este registo permanentemente? Esta ação não pode ser desfeita.', 
    async () => {
      try {
        const loginToken = await AsyncStorage.getItem('loginToken');
        const empresaId = await AsyncStorage.getItem('empresa_id');
        
        const headers = { 
          Authorization: `Bearer ${loginToken}`,
          'X-Empresa-ID': empresaId
        };
        
        const res = await fetch(`${API_BASE}/${id}`, {
          method: 'DELETE',
          headers
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || 'Falha ao eliminar.');
        await fetchRegistos();
        Alert.alert('Sucesso', 'Registo eliminado.');
      } catch (e) {
        Alert.alert('Erro', e.message || 'Erro ao eliminar.');
      }
    },
    'Eliminar',
    '#dc3545'
  );

  const anular = (id) => mostrarConfirmacao(
    'Anular Trabalhador Externo', 
    'Marcar este trabalhador como anulado? O registo ficará inativo mas pode ser restaurado posteriormente.', 
    async () => {
      try { 
        await callPost(`${id}/anular`); 
        await fetchRegistos(); 
        Alert.alert('Sucesso', 'Registo anulado.');
      } catch (e) { 
        Alert.alert('Erro', e.message); 
      }
    },
    'Anular',
    '#ffc107'
  );

  const restaurar = (id) => mostrarConfirmacao(
    'Restaurar Trabalhador Externo', 
    'Restaurar este registo e voltar a ativá-lo?', 
    async () => {
      try { 
        await callPost(`${id}/restaurar`); 
        await fetchRegistos(); 
        Alert.alert('Sucesso', 'Registo restaurado.');
      } catch (e) { 
        Alert.alert('Erro', e.message); 
      }
    },
    'Restaurar',
    '#17a2b8'
  );

  const ativar = (id) => mostrarConfirmacao(
    'Ativar Trabalhador Externo', 
    'Marcar este trabalhador como ativo?', 
    async () => {
      try { 
        await callPost(`${id}/ativar`); 
        await fetchRegistos(); 
        Alert.alert('Sucesso', 'Registo ativado.');
      } catch (e) { 
        Alert.alert('Erro', e.message); 
      }
    },
    'Ativar',
    '#28a745'
  );

  const desativar = (id) => mostrarConfirmacao(
    'Desativar Trabalhador Externo', 
    'Marcar este trabalhador como inativo?', 
    async () => {
      try { 
        await callPost(`${id}/desativar`); 
        await fetchRegistos(); 
        Alert.alert('Sucesso', 'Registo desativado.');
      } catch (e) { 
        Alert.alert('Erro', e.message); 
      }
    },
    'Desativar',
    '#6c757d'
  );

  const abrirDetalhe = (item) => { setDetalhe(item); setModalDetalheVisible(true); };
  const fecharDetalhe = () => { setDetalhe(null); setModalDetalheVisible(false); };

  const listaFiltrada = useMemo(() => registos, [registos]);

  // === RESUMO EXTERNOS: data sources
  const fetchObrasResumo = useCallback(async () => {
    try {
      const loginToken = await AsyncStorage.getItem('loginToken');
      const empresaId = await AsyncStorage.getItem('empresa_id');
      
      const headers = { 
        Authorization: `Bearer ${loginToken}`,
        'X-Empresa-ID': empresaId
      };
      
      const res = await fetch(API_OBRAS, { headers });
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
    const m = d.getMonth() + 1;
    const dd = d.getDate();
    return { y, m, dd, ts: d.getTime() };
  };

  // Opções dos pickers no Resumo
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
        }

        const minutos = Number(it.NumHoras || 0);
        const info = nomeToInfo[nomeKey];
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
              <View style={styles.iconBadge}>
                <Ionicons name="person" size={20} color="#1792FE" />
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.funcionario}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: s.color }]}>
              <Ionicons name={s.icon} size={12} color="#fff" style={styles.statusIcon} />
              <Text style={styles.statusText}>{s.label}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="business" size={16} color="#666" />
              </View>
              <Text style={styles.infoLabel}>Empresa:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{item.empresa}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="construct" size={16} color="#666" />
              </View>
              <Text style={styles.infoLabel}>Categoria:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{item.categoria || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="cash" size={16} color="#28a745" />
              </View>
              <Text style={styles.infoLabel}>Valor:</Text>
              <Text style={[styles.infoValue, styles.valueText]}>
                {formatarValor(item.valor)} {item.moeda || 'EUR'}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => openEdit(item)}>
              <Ionicons name="create-outline" size={18} color="#1792FE" />
              <Text style={[styles.actionBtnText, { color: '#1792FE' }]}>Editar</Text>
            </TouchableOpacity>

            {!item.anulado ? (
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => anular(item.id)}>
                <Ionicons name="close-circle-outline" size={18} color="#dc3545" />
                <Text style={[styles.actionBtnText, { color: '#dc3545' }]}>Anular</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.actionBtn, styles.restoreBtn]} onPress={() => restaurar(item.id)}>
                <Ionicons name="refresh-outline" size={18} color="#17a2b8" />
                <Text style={[styles.actionBtnText, { color: '#17a2b8' }]}>Restaurar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => eliminar(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#6c757d" />
              <Text style={[styles.actionBtnText, { color: '#6c757d' }]}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) return (
    <View style={styles.centerContainer}>
      <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>A carregar trabalhadores externos...</Text>
      </LinearGradient>
    </View>
  );

  if (erro) return (
    <View style={styles.centerContainer}>
      <View style={styles.errorCard}>
        <Ionicons name="alert-circle" size={64} color="#dc3545" />
        <Text style={styles.errorTitle}>Oops! Algo correu mal</Text>
        <Text style={styles.errorText}>{erro}</Text>
        <TouchableOpacity onPress={fetchRegistos} style={styles.retryButton}>
          <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.buttonGradient}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.buttonText}>Tentar Novamente</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.mainContainer}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Header Melhorado */}
          <View style={styles.header}>
            <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.headerContent}>
              <View style={styles.headerTop}>
                <View style={styles.headerIcon}>
                  <Ionicons name="people" size={28} color="#fff" />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerTitle}>Trabalhadores Externos</Text>
                  <Text style={styles.headerSubtitle}>
                    {listaFiltrada.length} {listaFiltrada.length === 1 ? 'registo encontrado' : 'registos encontrados'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Filtros Melhorados */}
          <View style={styles.filtersContainer}>
            <View style={styles.filtersCard}>
              {/* Pesquisa */}
              <View style={styles.searchContainer}>
                <View style={styles.searchIcon}>
                  <Ionicons name="search" size={20} color="#1792FE" />
                </View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Pesquisar por empresa, funcionário ou categoria..."
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                  onSubmitEditing={fetchRegistos}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity style={styles.searchBtn} onPress={fetchRegistos}>
                  <Ionicons name="arrow-forward" size={20} color="#1792FE" />
                </TouchableOpacity>
              </View>

              {/* Dropdowns Melhorados */}
              <View style={styles.dropdownsContainer}>
                <View style={styles.dropdownWrapper}>
                  <Text style={styles.dropdownLabel}>
                    <Ionicons name="business-outline" size={14} color="#666" /> Empresa
                  </Text>
                  <View style={styles.modernPicker}>
                    <Picker
                      selectedValue={empresaFiltro}
                      onValueChange={(v) => setEmpresaFiltro(v)}
                      style={styles.pickerStyle}
                      dropdownIconColor="#1792FE"
                    >
                      <Picker.Item label="Todas as empresas" value="" />
                      {empresasCombo.slice(1).map((e, idx) => (
                        <Picker.Item key={`emp-${idx}`} label={`🏢 ${e}`} value={e} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.dropdownWrapper}>
                  <Text style={styles.dropdownLabel}>
                    <Ionicons name="construct-outline" size={14} color="#666" /> Categoria
                  </Text>
                  <View style={styles.modernPicker}>
                    <Picker
                      selectedValue={categoriaFiltro}
                      onValueChange={(v) => setCategoriaFiltro(v)}
                      style={styles.pickerStyle}
                      dropdownIconColor="#1792FE"
                    >
                      <Picker.Item label="Todas as categorias" value="" />
                      {categoriasCombo.slice(1).map((c, idx) => (
                        <Picker.Item key={`cat-${idx}`} label={`⚒️ ${c}`} value={c} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Status Chips */}
              <View style={styles.statusContainer}>
                {[
                  { key: 'todos', label: 'Todos', icon: 'list' },
                  { key: 'ativos', label: 'Ativos', icon: 'checkmark-circle' },
                  { key: 'inativos', label: 'Inativos', icon: 'pause-circle' },
                  { key: 'anulados', label: 'Anulados', icon: 'close-circle' }
                ].map(opcao => (
                  <TouchableOpacity
                    key={opcao.key}
                    style={[styles.statusChip, filtroStatus === opcao.key && styles.statusChipActive]}
                    onPress={() => setFiltroStatus(opcao.key)}
                  >
                    <Ionicons 
                      name={opcao.icon} 
                      size={16} 
                      color={filtroStatus === opcao.key ? '#fff' : '#666'} 
                    />
                    <Text style={filtroStatus === opcao.key ? styles.statusChipTextActive : styles.statusChipText}>
                      {opcao.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity onPress={fetchRegistos} style={[styles.modernButton, styles.primaryButton]}>
                  <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.modernButtonGradient}>
                    <Ionicons name="funnel" size={18} color="#fff" />
                    <Text style={styles.modernButtonText}>Aplicar Filtros</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={openCreate} style={[styles.modernButton, styles.successButton]}>
                  <LinearGradient colors={['#28a745', '#20c997']} style={styles.modernButtonGradient}>
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.modernButtonText}>Novo Registo</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={openResumoExternos} style={[styles.modernButton, styles.warningButton]}>
                  <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.modernButtonGradient}>
                    <Ionicons name="analytics" size={18} color="#fff" />
                    <Text style={styles.modernButtonText}>Resumo Analytics</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Lista Melhorada */}
          <FlatList
            data={listaFiltrada}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            scrollEnabled={listaFiltrada.length > 2}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={['#1792FE']}
                tintColor="#1792FE"
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateCard}>
                  <LinearGradient 
                    colors={['rgba(23, 146, 254, 0.1)', 'rgba(23, 146, 254, 0.05)']} 
                    style={styles.emptyStateIcon}
                  >
                    <Ionicons name="people-outline" size={80} color="#1792FE" />
                  </LinearGradient>
                  <Text style={styles.emptyStateTitle}>Nenhum trabalhador externo encontrado</Text>
                  <Text style={styles.emptyStateText}>
                    {search || empresaFiltro || categoriaFiltro || filtroStatus !== 'todos' 
                      ? 'Tente ajustar os filtros de pesquisa ou limpar os critérios.' 
                      : 'Comece por criar o primeiro registo de trabalhador externo.'}
                  </Text>
                  <TouchableOpacity onPress={openCreate} style={styles.emptyStateButton}>
                    <LinearGradient colors={['#28a745', '#20c997']} style={styles.emptyStateButtonGradient}>
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={styles.emptyStateButtonText}>Criar Primeiro Registo</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </ScrollView>

        {/* Modal Form Melhorado */}
        <Modal visible={modalFormVisible} animationType="slide" onRequestClose={closeForm} presentationStyle="pageSheet">
          <SafeAreaView style={styles.modalContainer}>
            <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalTitleContainer}>
                  <View style={styles.modalIcon}>
                    <Ionicons name={form.id ? "create" : "add-circle"} size={24} color="#fff" />
                  </View>
                  <Text style={styles.modalTitle}>
                    {form.id ? 'Editar Trabalhador Externo' : 'Novo Trabalhador Externo'}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeForm} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="information-circle" size={16} color="#1792FE" /> Informações Básicas
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="business" size={14} color="#666" /> Empresa *
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.modernInput}
                      value={form.empresa}
                      onChangeText={(t) => handleChange('empresa', t)}
                      placeholder="Ex.: Rubinova, Construtora ABC..."
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="person" size={14} color="#666" /> Nome do Funcionário *
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.modernInput}
                      value={form.funcionario}
                      onChangeText={(t) => handleChange('funcionario', t)}
                      placeholder="Ex.: João Silva, Maria Santos..."
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="construct" size={14} color="#666" /> Categoria / Função
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.modernInput}
                      value={form.categoria}
                      onChangeText={(t) => handleChange('categoria', t)}
                      placeholder="Ex.: Servente, Oficial 1ª, Pedreiro..."
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="card" size={16} color="#28a745" /> Informações Financeiras
                </Text>

                <View style={styles.rowContainer}>
                  <View style={[styles.inputGroup, { flex: 2, marginRight: 10 }]}>
                    <Text style={styles.inputLabel}>
                      <Ionicons name="cash" size={14} color="#666" /> Valor por Hora *
                    </Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.modernInput}
                        value={String(form.valor)}
                        onChangeText={(t) => handleChange('valor', t.replace(',', '.'))}
                        keyboardType="numeric"
                        placeholder="Ex.: 9.50"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>
                      <Ionicons name="globe" size={14} color="#666" /> Moeda
                    </Text>
                    <View style={styles.modernPicker}>
                      <Picker
                        selectedValue={form.moeda}
                        onValueChange={(v) => handleChange('moeda', v)}
                        style={styles.pickerStyle}
                      >
                        <Picker.Item label="💶 EUR" value="EUR" />
                        <Picker.Item label="🇨🇭 CHF" value="CHF" />
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="calendar" size={16} color="#fd7e14" /> Período de Vigência
                </Text>

                <View style={styles.rowContainer}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.inputLabel}>
                      <Ionicons name="play" size={14} color="#666" /> Data de Início
                    </Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.modernInput}
                        value={form.data_inicio}
                        onChangeText={(t) => handleChange('data_inicio', t)}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>
                      <Ionicons name="stop" size={14} color="#666" /> Data de Fim
                    </Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.modernInput}
                        value={form.data_fim}
                        onChangeText={(t) => handleChange('data_fim', t)}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="document-text" size={16} color="#17a2b8" /> Observações
                </Text>

                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.modernInput, styles.textArea]}
                      value={form.observacoes}
                      onChangeText={(t) => handleChange('observacoes', t)}
                      placeholder="Adicione notas, comentários ou informações adicionais..."
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="settings" size={16} color="#6c757d" /> Estado do Registo
                </Text>

                <View style={styles.switchContainer}>
                  <View style={styles.switchItem}>
                    <View style={styles.switchLabelContainer}>
                      <Ionicons name="checkmark-circle" size={18} color="#28a745" />
                      <Text style={styles.switchLabel}>Trabalhador Ativo</Text>
                    </View>
                    <Switch 
                      value={form.ativo} 
                      onValueChange={(v) => handleChange('ativo', v)}
                      trackColor={{ false: '#e9ecef', true: '#28a745' }}
                      thumbColor={form.ativo ? '#fff' : '#6c757d'}
                    />
                  </View>

                  <View style={styles.switchItem}>
                    <View style={styles.switchLabelContainer}>
                      <Ionicons name="close-circle" size={18} color="#dc3545" />
                      <Text style={styles.switchLabel}>Registo Anulado</Text>
                    </View>
                    <Switch 
                      value={form.anulado} 
                      onValueChange={(v) => handleChange('anulado', v)}
                      trackColor={{ false: '#e9ecef', true: '#dc3545' }}
                      thumbColor={form.anulado ? '#fff' : '#6c757d'}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity onPress={guardar} disabled={aGuardar} style={styles.saveButtonContainer}>
                <LinearGradient
                  colors={aGuardar ? ['#999', '#777'] : ['#28a745', '#20c997']}
                  style={styles.saveButton}
                >
                  {aGuardar ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.saveButtonText}>A guardar...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="save" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>Guardar Registo</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Modal Detalhe Melhorado */}
        <Modal visible={modalDetalheVisible} animationType="slide" onRequestClose={fecharDetalhe} presentationStyle="pageSheet">
          <SafeAreaView style={styles.modalContainer}>
            <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalTitleContainer}>
                  <View style={styles.modalIcon}>
                    <Ionicons name="eye" size={24} color="#fff" />
                  </View>
                  <Text style={styles.modalTitle}>Detalhes do Trabalhador</Text>
                </View>
                <TouchableOpacity onPress={fecharDetalhe} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.detailsContainer} showsVerticalScrollIndicator={false}>
              {detalhe && (
                <>
                  <View style={styles.detailCard}>
                    <View style={styles.detailHeader}>
                      <View style={styles.detailIconBadge}>
                        <Ionicons name="person" size={24} color="#1792FE" />
                      </View>
                      <Text style={styles.detailMainTitle}>{detalhe.funcionario}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusBadge(detalhe.ativo, detalhe.anulado).color }]}>
                        <Ionicons name={statusBadge(detalhe.ativo, detalhe.anulado).icon} size={12} color="#fff" />
                        <Text style={styles.statusText}>{statusBadge(detalhe.ativo, detalhe.anulado).label}</Text>
                      </View>
                    </View>

                    <View style={styles.detailsGrid}>
                      <View style={styles.detailItem}>
                        <View style={styles.detailItemIcon}>
                          <Ionicons name="business" size={20} color="#1792FE" />
                        </View>
                        <View style={styles.detailItemContent}>
                          <Text style={styles.detailItemLabel}>Empresa</Text>
                          <Text style={styles.detailItemValue}>{detalhe.empresa}</Text>
                        </View>
                      </View>

                      <View style={styles.detailItem}>
                        <View style={styles.detailItemIcon}>
                          <Ionicons name="construct" size={20} color="#fd7e14" />
                        </View>
                        <View style={styles.detailItemContent}>
                          <Text style={styles.detailItemLabel}>Categoria</Text>
                          <Text style={styles.detailItemValue}>{detalhe.categoria || 'Não especificada'}</Text>
                        </View>
                      </View>

                      <View style={styles.detailItem}>
                        <View style={styles.detailItemIcon}>
                          <Ionicons name="cash" size={20} color="#28a745" />
                        </View>
                        <View style={styles.detailItemContent}>
                          <Text style={styles.detailItemLabel}>Valor por Hora</Text>
                          <Text style={[styles.detailItemValue, styles.priceText]}>
                            {formatarValor(detalhe.valor)} {detalhe.moeda || 'EUR'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.detailItem}>
                        <View style={styles.detailItemIcon}>
                          <Ionicons name="calendar" size={20} color="#17a2b8" />
                        </View>
                        <View style={styles.detailItemContent}>
                          <Text style={styles.detailItemLabel}>Período de Vigência</Text>
                          <Text style={styles.detailItemValue}>
                            {detalhe.data_inicio && detalhe.data_fim 
                              ? `${detalhe.data_inicio} até ${detalhe.data_fim}`
                              : detalhe.data_inicio 
                                ? `Desde ${detalhe.data_inicio}`
                                : 'Período não definido'
                            }
                          </Text>
                        </View>
                      </View>

                      {detalhe.observacoes && (
                        <View style={[styles.detailItem, styles.fullWidth]}>
                          <View style={styles.detailItemIcon}>
                            <Ionicons name="document-text" size={20} color="#6c757d" />
                          </View>
                          <View style={styles.detailItemContent}>
                            <Text style={styles.detailItemLabel}>Observações</Text>
                            <Text style={styles.detailItemValue}>{detalhe.observacoes}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.detailActions}>
                    <TouchableOpacity onPress={() => { fecharDetalhe(); openEdit(detalhe); }} style={styles.detailActionBtn}>
                      <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.detailActionBtnGradient}>
                        <Ionicons name="create" size={20} color="#fff" />
                        <Text style={styles.detailActionBtnText}>Editar Registo</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Modal Resumo com melhorias visuais */}
        <Modal visible={modalResumoVisible} animationType="slide" onRequestClose={closeResumoExternos}>
          <SafeAreaView style={styles.modalContainer}>
            <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalTitleContainer}>
                  <View style={styles.modalIcon}>
                    <Ionicons name="analytics" size={24} color="#fff" />
                  </View>
                  <Text style={styles.modalTitle}>Analytics - Externos Aprovados</Text>
                </View>
                <TouchableOpacity onPress={closeResumoExternos} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView 
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <View style={styles.resumoControls}>
                <View style={styles.controlSection}>
                  <Text style={styles.controlSectionTitle}>Granularidade Temporal</Text>
                  <View style={styles.segmentControl}>
                    {[
                      { k: 'diario', label: 'Diário', icon: 'calendar-outline' },
                      { k: 'mensal', label: 'Mensal', icon: 'calendar' },
                      { k: 'anual', label: 'Anual', icon: 'calendar-sharp' },
                    ].map(op => (
                      <TouchableOpacity
                        key={op.k}
                        onPress={() => setGranularidade(op.k)}
                        style={[styles.segmentBtn, granularidade === op.k && styles.segmentBtnActive]}
                      >
                        <Ionicons name={op.icon} size={16} color={granularidade === op.k ? '#fff' : '#666'} />
                        <Text style={granularidade === op.k ? styles.segmentTextActive : styles.segmentText}>
                          {op.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.controlSection}>
                  <Text style={styles.controlSectionTitle}>Agrupamento de Dados</Text>
                  <View style={styles.chipContainer}>
                    {[
                      { k: 'geral', label: 'Geral', icon: 'grid-outline' },
                      { k: 'obra', label: 'Por Obra', icon: 'business-outline' },
                      { k: 'empresa', label: 'Por Empresa', icon: 'storefront-outline' },
                      { k: 'externo', label: 'Por Colaborador', icon: 'person-outline' },
                      { k: 'especialidade', label: 'Por Especialidade', icon: 'construct-outline' },
                    ].map(op => (
                      <TouchableOpacity
                        key={op.k}
                        onPress={() => setAgruparPor(op.k)}
                        style={[styles.chip, agruparPor === op.k && styles.chipActive]}
                      >
                        <Ionicons name={op.icon} size={14} color={agruparPor === op.k ? '#fff' : '#666'} />
                        <Text style={agruparPor === op.k ? styles.chipTextActive : styles.chipText}>
                          {op.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.switchSection}>
                  <View style={styles.switchOptionContainer}>
                    <Ionicons name="cash" size={18} color="#28a745" />
                    <Text style={styles.switchOptionLabel}>Mostrar valores financeiros (€)</Text>
                    <Switch 
                      value={mostrarValores} 
                      onValueChange={setMostrarValores}
                      trackColor={{ false: '#e9ecef', true: '#28a745' }}
                      thumbColor={mostrarValores ? '#fff' : '#6c757d'}
                    />
                  </View>
                </View>

                <View style={styles.controlSection}>
                  <Text style={styles.controlSectionTitle}>Filtros de Data</Text>
                  <View style={styles.dateRangeContainer}>
                    <View style={styles.dateInput}>
                      <Text style={styles.dateInputLabel}>Data Início</Text>
                      <TextInput
                        placeholder="YYYY-MM-DD"
                        value={dataInicio}
                        onChangeText={setDataInicio}
                        style={styles.modernInput}
                        placeholderTextColor="#999"
                      />
                    </View>
                    <View style={styles.dateInput}>
                      <Text style={styles.dateInputLabel}>Data Fim</Text>
                      <TextInput
                        placeholder="YYYY-MM-DD"
                        value={dataFim}
                        onChangeText={setDataFim}
                        style={styles.modernInput}
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.controlSection}>
                  <Text style={styles.controlSectionTitle}>Filtros Avançados</Text>
                  <View style={styles.advancedFilters}>
                    <View style={styles.filterDropdown}>
                      <Text style={styles.filterLabel}>Empresa</Text>
                      <View style={styles.modernPicker}>
                        <Picker
                          selectedValue={empresaResumoFiltro}
                          onValueChange={setEmpresaResumoFiltro}
                          style={styles.pickerStyle}
                        >
                          <Picker.Item label="Todas" value="" />
                          {resumoOptions.empresas.slice(1).map((e, idx) => (
                            <Picker.Item key={`emp-res-${idx}`} label={e} value={e} />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    <View style={styles.filterDropdown}>
                      <Text style={styles.filterLabel}>Colaborador</Text>
                      <View style={styles.modernPicker}>
                        <Picker
                          selectedValue={externoResumoFiltro}
                          onValueChange={setExternoResumoFiltro}
                          style={styles.pickerStyle}
                        >
                          <Picker.Item label="Todos" value="" />
                          {resumoOptions.externos.slice(1).map((e, idx) => (
                            <Picker.Item key={`ext-res-${idx}`} label={e} value={e} />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    <View style={styles.filterDropdown}>
                      <Text style={styles.filterLabel}>Especialidade</Text>
                      <View style={styles.modernPicker}>
                        <Picker
                          selectedValue={especialidadeResumoFiltro}
                          onValueChange={setEspecialidadeResumoFiltro}
                          style={styles.pickerStyle}
                        >
                          <Picker.Item label="Todas" value="" />
                          {resumoOptions.especialidades.slice(1).map((e, idx) => (
                            <Picker.Item key={`esp-res-${idx}`} label={e} value={e} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {resumoLoading ? (
                <View style={styles.centerContainer}>
                  <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.loadingCard}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>A processar dados analytics...</Text>
                  </LinearGradient>
                </View>
              ) : (
                <View style={styles.resumoContent}>
                  {resumoAgrupado.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <View style={styles.emptyStateCard}>
                        <LinearGradient 
                          colors={['rgba(253, 126, 20, 0.1)', 'rgba(243, 156, 18, 0.05)']} 
                          style={styles.emptyStateIcon}
                        >
                          <Ionicons name="analytics-outline" size={80} color="#fd7e14" />
                        </LinearGradient>
                        <Text style={styles.emptyStateTitle}>Sem dados para análise</Text>
                        <Text style={styles.emptyStateText}>
                          Ajuste os filtros, granularidade ou período para visualizar os dados.
                        </Text>
                      </View>
                    </View>
                  ) : (
                    resumoAgrupado.map(period => (
                      <View key={period.periodKey} style={styles.analyticsCard}>
                        <View style={styles.analyticsCardHeader}>
                          <View style={styles.analyticsIconContainer}>
                            <Ionicons name="calendar" size={20} color="#1792FE" />
                          </View>
                          <Text style={styles.analyticsCardTitle}>{period.label}</Text>
                          <View style={styles.analyticsCardBadge}>
                            <Ionicons name="time" size={14} color="#fff" />
                            <Text style={styles.analyticsCardBadgeText}>{formatarHoras(period.total)}</Text>
                          </View>
                        </View>

                        <View style={styles.analyticsCardContent}>
                          {period.groups.map(g => (
                            <View key={`${period.periodKey}-${g.label}`} style={styles.analyticsItem}>
                              <View style={styles.analyticsItemIcon}>
                                <Ionicons
                                  name={
                                    agruparPor === 'obra' ? 'business' :
                                    agruparPor === 'externo' ? 'person' :
                                    agruparPor.includes('empresa') ? 'storefront' :
                                    agruparPor.includes('especialidade') ? 'construct' :
                                    'analytics'
                                  }
                                  size={16}
                                  color="#666"
                                />
                              </View>
                              <View style={styles.analyticsItemContent}>
                                <Text style={styles.analyticsItemLabel} numberOfLines={1}>{g.label}</Text>
                                <View style={styles.analyticsItemValues}>
                                  <View style={styles.analyticsValueItem}>
                                    <Ionicons name="time" size={12} color="#17a2b8" />
                                    <Text style={styles.analyticsValueText}>{formatarHoras(g.minutos)}</Text>
                                  </View>
                                  {mostrarValores && Object.entries(g.valores || {}).map(([moeda, v]) => (
                                    <View key={moeda} style={styles.analyticsValueItem}>
                                      <Ionicons name="cash" size={12} color="#28a745" />
                                      <Text style={[styles.analyticsValueText, styles.moneyText]}>
                                        {formatarValor(v)} {moeda}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Modal de Confirmação */}
        <Modal visible={modalConfirmacao.visible} animationType="fade" transparent onRequestClose={fecharConfirmacao}>
          <View style={styles.modalOverlay}>
            <View style={styles.confirmationModal}>
              <View style={styles.confirmationHeader}>
                <View style={styles.confirmationIconContainer}>
                  <Ionicons name="warning" size={32} color="#1792FE'" />
                </View>
                <Text style={styles.confirmationTitle}>{modalConfirmacao.titulo}</Text>
              </View>

              <View style={styles.confirmationContent}>
                <Text style={styles.confirmationMessage}>{modalConfirmacao.mensagem}</Text>
              </View>

              <View style={styles.confirmationActions}>
                <TouchableOpacity onPress={fecharConfirmacao} style={styles.confirmationCancelBtn}>
                  <Text style={styles.confirmationCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={executarConfirmacao} style={styles.confirmationConfirmBtn}>
                  <LinearGradient 
                    colors={[modalConfirmacao.confirmColor, modalConfirmacao.confirmColor + '99']} 
                    style={styles.confirmationConfirmBtnGradient}
                  >
                    <Ionicons 
                      name={
                        modalConfirmacao.confirmText === 'Eliminar' ? 'trash' :
                        modalConfirmacao.confirmText === 'Anular' ? 'close-circle' :
                        modalConfirmacao.confirmText === 'Restaurar' ? 'refresh' :
                        modalConfirmacao.confirmText === 'Ativar' ? 'checkmark-circle' :
                        'pause-circle'
                      } 
                      size={18} 
                      color="#fff" 
                    />
                    <Text style={styles.confirmationConfirmText}>{modalConfirmacao.confirmText}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  // Containers Principais
  mainContainer: { flex: 1 },
  container: { flex: 1 },
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },

  // Header Melhorado
  header: { 
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerContent: {
    borderRadius: 20,
    padding: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: '#fff', 
    marginBottom: 5 
  },
  headerSubtitle: { 
    fontSize: 16, 
    color: 'rgba(255,255,255,0.8)', 
    fontWeight: '500' 
  },

  // Filtros Melhorados
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filtersCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },

  // Pesquisa
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  searchBtn: {
    padding: 5,
  },

  // Dropdowns
  dropdownsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  dropdownWrapper: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modernPicker: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  pickerStyle: {
    color: '#333',
  },

  // Status Chips
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    gap: 6,
  },
  statusChipActive: {
    backgroundColor: '#1792FE',
    borderColor: '#1792FE',
  },
  statusChipText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  statusChipTextActive: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  modernButton: {
    flex: 1,
    minWidth: 120,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modernButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    gap: 8,
  },
  modernButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Lista
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },

  // Cards Melhorados
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(23, 146, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  statusIcon: {
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Card Body
  cardBody: {
    gap: 12,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  valueText: {
    color: '#28a745',
    fontWeight: '700',
  },

  // Actions Row
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    gap: 6,
    flex: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  actionBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },

  // Loading States
  loadingCard: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    gap: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Error States
  errorCard: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc3545',
    marginTop: 15,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // Empty States
  emptyStateContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateCard: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  emptyStateButton: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
  },
  emptyStateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Form Styles
  formContainer: {
    padding: 20,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#f1f3f4',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  modernInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
  },

  // Switch Styles
  switchContainer: {
    gap: 15,
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  // Save Button
  saveButtonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 15,
    gap: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // Details Modal
  detailsContainer: {
    padding: 20,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20,
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  detailIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(23, 146, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailMainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  detailsGrid: {
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1792FE',
  },
  fullWidth: {
    marginTop: 10,
  },
  detailItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  detailItemContent: {
    flex: 1,
  },
  detailItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  detailItemValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    lineHeight: 22,
  },
  priceText: {
    color: '#28a745',
    fontWeight: '700',
  },
  detailActions: {
    gap: 10,
  },
  detailActionBtn: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
  },
  detailActionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 10,
  },
  detailActionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // Resumo/Analytics Modal
  resumoControls: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  controlSection: {
    marginBottom: 20,
  },
  controlSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#1792FE',
  },
  segmentText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 20,
    gap: 6,
  },
  chipActive: {
    backgroundColor: '#1792FE',
  },
  chipText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  switchSection: {
    marginBottom: 20,
  },
  switchOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    gap: 12,
  },
  switchOptionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  dateInput: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  advancedFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  filterDropdown: {
    flex: 1,
    minWidth: 150,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  // Analytics Content
  resumoContent: {
    padding: 20,
  },
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  analyticsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  analyticsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(253, 126, 20, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  analyticsCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  analyticsCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17a2b8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  analyticsCardBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  analyticsCardContent: {
    gap: 12,
  },
  analyticsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  analyticsItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  analyticsItemContent: {
    flex: 1,
  },
  analyticsItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  analyticsItemValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsValueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analyticsValueText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  moneyText: {
    color: '#28a745',
    fontWeight: '700',
  },

  // Confirmation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmationModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 0,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  confirmationHeader: {
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 25,
    paddingBottom: 20,
  },
  confirmationIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  confirmationContent: {
    paddingHorizontal: 25,
    paddingBottom: 25,
  },
  confirmationMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmationActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  confirmationCancelBtn: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f1f3f4',
  },
  confirmationCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmationConfirmBtn: {
    flex: 1,
    overflow: 'hidden',
  },
  confirmationConfirmBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  confirmationConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default GestaoTrabalhadoresExternos;
