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
    } catch {
      // combos não críticos; silencioso
    }
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

  // Render
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

  bottomFilterRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  applyFiltersBtn: { flex: 1, borderRadius: 25, overflow: 'hidden' },
  newBtn: { width: 140, borderRadius: 25, overflow: 'hidden' },
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

  modalBody: { padding: 20 },
  modalSection: { marginBottom: 18 },
  modalLabel: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  modalValue: { fontSize: 15, color: '#555', lineHeight: 22 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#666', marginTop: 20, marginBottom: 10, textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center', lineHeight: 22 },
});

export default GestaoTrabalhadoresExternos;
