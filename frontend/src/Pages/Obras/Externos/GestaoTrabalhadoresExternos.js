import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity,
    Modal, ScrollView, SafeAreaView, RefreshControl, Alert, TextInput, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import * as XLSX from 'xlsx-js-style';

import { styles } from "../Css/GestaoTrabalhadoresExternosStyles";
import { secureStorage } from '../../../utils/secureStorage';

const API_BASE = 'https://backend.advir.pt/api/trabalhadores-externos';
const API_PARTE_DIARIA = 'https://backend.advir.pt/api/parte-diaria/cabecalhos';
const API_OBRAS = 'https://backend.advir.pt/api/obra';





const getDiasNoMes = (ano, mes1a12) => new Date(ano, mes1a12, 0).getDate();

const nomeMesPT = (m1a12) =>
  new Date(2000, m1a12 - 1, 1).toLocaleString('pt-PT', { month: 'long' });


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


// fora do componente (ou no topo)
// fora do componente
const normalizeClasseCode = (v) => {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s === '-1') return '-1';           // manter "Indiferenciada"
  if (/^\d+$/.test(s)) return s.padStart(4, '0'); // "1"->"0001", "202"->"0202"
  return s;
};


// em carregarClasses()
// dentro de carregarClasses()



const getEspecialidade = (it = {}, especialidadesList = []) => {
    // Se temos SubEmpID, usar o mapa para obter a descrição
    if (it.SubEmpID != null) {
        const subEmpIdStr = String(it.SubEmpID);
        const descricao = especialidadesList.find(e => String(e.subEmpId) === subEmpIdStr)?.descricao;
        if (descricao) return descricao;
    }

    // Priorizar especialidades reais antes da categoria genérica
    const esp = it.Especialidade ||
        it.EspecialidadeNome ||
        it.Funcao ||
        it.FuncaoNome ||
        it.SubCategoria ||
        it.Subcategoria ||
        '';

    // Se não encontrou especialidade específica e categoria não é equipamentos
    if (!esp && String(it.Categoria || '').toLowerCase() !== 'equipamentos') {
        const cat = it.Categoria || '';
        // Não retornar "MaoObra" como especialidade
        if (cat.toLowerCase() === 'maoobra') {
            return '—';
        }
        return cat;
    }

    return esp || '—';
};


// depois
const getClasse = (it = {}, classes = []) => {
  if (!classes || !classes.length) return '—';

  const idCand   = it.ClasseId ?? it.ClasseID ?? it.IdClasse ?? null;
  const codeCand = it.Classe   ?? it.ClasseCodigo ?? it.CodigoClasse ?? null;

  const idStr      = idCand != null ? String(idCand).trim() : null;
  const codeRawStr = codeCand != null ? String(codeCand).trim() : null;
  const codeNorm   = normalizeClasseCode(codeRawStr);

  // 1) tentar por ID
  let c = null;
  if (idStr) {
    c = classes.find(x =>
      String(x.classeId).trim() === idStr ||
      (!Number.isNaN(Number(x.classeId)) && !Number.isNaN(Number(idStr)) && Number(x.classeId) === Number(idStr))
    );
  }

  // 2) tentar por código normalizado ("0001","0202","-1")
  if (!c && codeNorm) {
    c = classes.find(x =>
      x.classeNorm === codeNorm || String(x.classe).trim() === codeRawStr
    );
  }

  // 3) último recurso por descrição
  if (!c && it.ClasseDescricao) {
    const desc = String(it.ClasseDescricao).trim().toLowerCase();
    c = classes.find(x => String(x.descricao).trim().toLowerCase() === desc);
  }

  return c?.descricao || codeNorm || '—';
};





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


    // === NOVO: navegação de meses ===
    const hoje = new Date();
    const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth() + 1); // 1..12
    const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

      const prevMonth = () => {
    setMesSelecionado((m) => {
      if (m === 1) { setAnoSelecionado((a) => a - 1); return 12; }
      return m - 1;
    });
  };

  const nextMonth = () => {
    setMesSelecionado((m) => {
      if (m === 12) { setAnoSelecionado((a) => a + 1); return 1; }
      return m + 1;
    });
  };

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
    const [classeResumoFiltro, setClasseResumoFiltro] = useState('');

    // === GRADE MENSAL EXTERNOS ===
    const [modalGradeVisible, setModalGradeVisible] = useState(false);
    const [gradeLoading, setGradeLoading] = useState(false);
    const [gradesMensais, setGradesMensais] = useState({
        externos: [],
        mesAtual: new Date().getMonth() + 1,
        anoAtual: new Date().getFullYear(),
        diasNoMes: new Date().getDate(),
    });
    const [classesList, setClassesList] = useState([]);
    const [especialidadesList, setEspecialidadesList] = useState([]);

    // Filtros da grade mensal
    const [empresaGradeFiltro, setEmpresaGradeFiltro] = useState('');
    const [externoGradeFiltro, setExternoGradeFiltro] = useState('');
    const [especialidadeGradeFiltro, setEspecialidadeGradeFiltro] = useState('');
    const [classeGradeFiltro, setClasseGradeFiltro] = useState('');
    const [agruparGradePor, setAgruparGradePor] = useState('geral');
    const [obraGradeFiltro, setObraGradeFiltro] = useState(''); // Estado adicionado para filtro de obra
    const [modoVisualizacaoGrade, setModoVisualizacaoGrade] = useState('geral'); // 'geral' ou 'porColaborador'

    // === MODAL DE EXPORTAÇÃO EXCEL ===
    const [modalExportVisible, setModalExportVisible] = useState(false);
    const [exportDataInicio, setExportDataInicio] = useState('');
    const [exportDataFim, setExportDataFim] = useState('');
    const [exportEmpresaFiltro, setExportEmpresaFiltro] = useState('');
    const [exportando, setExportando] = useState(false);

    // Helper para requisições com retry
    const fetchComRetentativas = async (url, options, tentativas = 3, delay = 1000) => {
        for (let i = 0; i < tentativas; i++) {
            try {
                const res = await fetch(url, options);
                if (!res.ok) throw new Error(`Erro ${res.status}`);
                return await res.json();
            } catch (err) {
                if (i === tentativas - 1) throw err;
                await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    };

    const carregarCombos = useCallback(async () => {
        try {
            const loginToken = await secureStorage.getItem('loginToken');
            const empresaId = await secureStorage.getItem('empresa_id');

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
            const loginToken = await secureStorage.getItem('loginToken');
            const empresaId = await secureStorage.getItem('empresa_id');

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

    useEffect(() => {
        (async () => {
            await carregarCombos();
            await fetchRegistos();
        })();
    }, [carregarCombos, fetchRegistos]);

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
            const loginToken = await secureStorage.getItem('loginToken');
            const headers = {
                Authorization: `Bearer ${loginToken}`,
                'Content-Type': 'application/json'
            };

            // Obter empresa_id do secureStorage
            const empresaId = await secureStorage.getItem('empresa_id');

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
        const loginToken = await secureStorage.getItem('loginToken');
        const empresaId = await secureStorage.getItem('empresa_id');

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
                const loginToken = await secureStorage.getItem('loginToken');
                const empresaId = await secureStorage.getItem('empresa_id');

                const headers = {
                    Authorization: `Bearer ${loginToken}`,
                    'X-Empresa-ID': empresaId
                };

                const res = await fetch(`${API_BASE}/${id}`, {
                    method: 'DELETE',
                    headers
                });
                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    if (data?.code === 'HAS_PARTE_DIARIA') {
                        // Caso específico: trabalhador tem partes diárias
                        Alert.alert(
                            'Não é possível eliminar',
                            'Este trabalhador externo já tem partes diárias registadas no sistema. Para preservar a integridade dos dados históricos, não pode ser eliminado.\n\nSugestões:\n• Use a opção "Anular" para desativar o registo\n• Ou use "Desativar" para torná-lo inativo',
                            [
                                { text: 'OK', style: 'default' }
                            ]
                        );
                        return;
                    }
                    throw new Error(data?.message || 'Falha ao eliminar.');
                }

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

    // === EXPORTAÇÃO PARA EXCEL ===
    const abrirModalExport = () => {
        // Definir datas padrão (mês atual)
        const hoje = new Date();
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

        setExportDataInicio(primeiroDia.toISOString().split('T')[0]);
        setExportDataFim(ultimoDia.toISOString().split('T')[0]);
        setExportEmpresaFiltro('');
        setModalExportVisible(true);
    };

    const fecharModalExport = () => {
        setModalExportVisible(false);
        setExportDataInicio('');
        setExportDataFim('');
        setExportEmpresaFiltro('');
    };

    const exportarParaExcel = async () => {
        try {
            console.log('🚀 Iniciando exportação para Excel...', {
                exportDataInicio,
                exportDataFim,
                exportEmpresaFiltro
            });

            setExportando(true);

            // Validações
            if (!exportDataInicio || !exportDataFim) {
                console.error('❌ Validação falhou: datas não preenchidas');
                window.alert('Por favor, preencha as datas de início e fim.');
                setExportando(false);
                return;
            }

            if (new Date(exportDataFim) < new Date(exportDataInicio)) {
                console.error('❌ Validação falhou: data fim anterior à data início');
                window.alert('A data de fim não pode ser anterior à data de início.');
                setExportando(false);
                return;
            }

            console.log('✅ Validações OK, buscando partes diárias...');

            // Buscar partes diárias do período
            const painelToken = secureStorage.getItem('painelAdminToken');

            if (!painelToken) {
                console.error('❌ Token do painel admin não encontrado');
                throw new Error('Token de autenticação não encontrado');
            }

            console.log('📡 Fazendo requisição para:', API_PARTE_DIARIA);

            const resPartes = await fetch(API_PARTE_DIARIA, {
                headers: { Authorization: `Bearer ${painelToken}` }
            });

            console.log('📥 Resposta recebida, status:', resPartes.status);

            if (!resPartes.ok) throw new Error('Erro ao carregar partes diárias');

            const todasPartes = await resPartes.json();
            console.log('✅ Partes diárias carregadas:', todasPartes?.length || 0);

            // Filtrar partes do período selecionado
            const dataInicio = new Date(exportDataInicio);
            const dataFim = new Date(exportDataFim);

            console.log('📅 Filtrando partes do período:', {
                dataInicio: dataInicio.toISOString(),
                dataFim: dataFim.toISOString()
            });

            const partesDoPerido = (todasPartes || []).filter(cab => {
                const dataParte = new Date(cab.Data);
                return dataParte >= dataInicio && dataParte <= dataFim;
            });

            console.log('✅ Partes do período encontradas:', partesDoPerido.length);

            if (partesDoPerido.length === 0) {
                console.warn('⚠️ Nenhuma parte diária encontrada no período');
                window.alert('Não foram encontradas partes diárias no período selecionado.');
                setExportando(false);
                return;
            }

            // Criar mapa de dias do período
            const diasDoPeriodo = [];
            let dataAtual = new Date(dataInicio);
            while (dataAtual <= dataFim) {
                diasDoPeriodo.push(new Date(dataAtual).getDate());
                dataAtual.setDate(dataAtual.getDate() + 1);
            }

            console.log('📆 Dias do período:', diasDoPeriodo);

            // Buscar obras para ter codigo e nome corretos
            console.log('🏗️ Buscando informações das obras...');
            const loginToken = secureStorage.getItem('loginToken');
            const empresaId = secureStorage.getItem('empresa_id');

            let obrasMapLocal = {};
            try {
                const resObras = await fetch(API_OBRAS, {
                    headers: {
                        Authorization: `Bearer ${loginToken}`,
                        'X-Empresa-ID': empresaId
                    }
                });

                if (resObras.ok) {
                    const obras = await resObras.json();
                    obras.forEach(o => {
                        const key = String(o.id || o.ID);
                        obrasMapLocal[key] = { codigo: o.codigo, nome: o.nome };
                    });
                    console.log('✅ Obras carregadas:', Object.keys(obrasMapLocal).length);
                } else {
                    console.warn('⚠️ Não foi possível carregar obras, usando obrasMap do state');
                    obrasMapLocal = obrasMap;
                }
            } catch (err) {
                console.warn('⚠️ Erro ao buscar obras:', err.message);
                obrasMapLocal = obrasMap;
            }

            // Processar dados dos externos
            const mapaExternos = new Map();
            console.log('🔄 Processando trabalhadores externos...');

            partesDoPerido.forEach(cab => {
                const itensExternos = (cab.ParteDiariaItems || []).filter(it => {
                    const semColab = it.ColaboradorID == null || String(it.ColaboradorID).trim() === '';
                    const marca = /\bexterno\b/i.test(String(it.Funcionario || ''));
                    return semColab || marca;
                });

                console.log(`📄 Parte diária ${cab.Data}: ${itensExternos.length} externos encontrados`);

                itensExternos.forEach(item => {
                    const nome = String(item.Funcionario || 'Externo').replace(/\s*\(Externo\)\s*$/i, '').trim();

                    // Buscar informações do trabalhador externo cadastrado
                    const nomeKey = normalizeName(nome);
                    const info = nomeToInfo[nomeKey] || {};
                    const empresa = info.empresa || '—';
                    const valorHora = info.valorHora || 0;
                    const categoria = info.categoria || item.Categoria || '—'; // Prioriza categoria do cadastro

                    console.log(`👤 Processando: ${nome} | Empresa: ${empresa} | Categoria: ${categoria}`);

                    // Filtrar por empresa se selecionado
                    if (exportEmpresaFiltro && empresa !== exportEmpresaFiltro) {
                        console.log(`⏭️ Pulando ${nome} - empresa ${empresa} não corresponde a ${exportEmpresaFiltro}`);
                        return;
                    }

                    // Chave única: nome + categoria + empresa
                    const chave = `${nome}|${categoria}|${empresa}`;

                    if (!mapaExternos.has(chave)) {
                        mapaExternos.set(chave, {
                            nome,
                            categoria,
                            empresa,
                            valorHora,
                            horasPorDia: {},
                            totalHoras: 0,
                            totalValor: 0
                        });
                    }

                    const externo = mapaExternos.get(chave);
                    const dia = new Date(cab.Data).getDate();
                    const minutos = Number(item.NumHoras || 0);
                    const horas = minutos / 60;

                    externo.horasPorDia[dia] = (externo.horasPorDia[dia] || 0) + horas;
                    externo.totalHoras += horas;
                    externo.totalValor += horas * valorHora;
                });
            });

            console.log('✅ Trabalhadores externos processados:', mapaExternos.size);

            if (mapaExternos.size === 0) {
                console.warn('⚠️ Nenhum trabalhador externo encontrado');
                window.alert('Não foram encontrados trabalhadores externos no período selecionado.');
                setExportando(false);
                return;
            }

            console.log('📊 Criando estrutura Excel agrupada por obra...');

            // Buscar informações das obras
            const obrasIds = new Set();
            partesDoPerido.forEach(cab => {
                if (cab.ObraID) obrasIds.add(String(cab.ObraID));
            });

            console.log('🏗️ Obras encontradas:', obrasIds.size);

            // Reorganizar dados por obra
            const dadosPorObra = new Map();

            partesDoPerido.forEach(cab => {
                const obraId = String(cab.ObraID || 'SEM_OBRA');
                const obra = obrasMapLocal[obraId];
                const obraLabel = obra ? `${obra.codigo} - ${obra.nome}` : `Obra ${cab.ObraID || 'Desconhecida'}`;

                if (!dadosPorObra.has(obraId)) {
                    dadosPorObra.set(obraId, {
                        obraLabel,
                        externos: new Map()
                    });
                }

                const itensExternos = (cab.ParteDiariaItems || []).filter(it => {
                    const semColab = it.ColaboradorID == null || String(it.ColaboradorID).trim() === '';
                    const marca = /\bexterno\b/i.test(String(it.Funcionario || ''));
                    return semColab || marca;
                });

                itensExternos.forEach(item => {
                    const nome = String(item.Funcionario || 'Externo').replace(/\s*\(Externo\)\s*$/i, '').trim();
                    const nomeKey = normalizeName(nome);
                    const info = nomeToInfo[nomeKey] || {};
                    const empresa = info.empresa || '—';
                    const valorHora = info.valorHora || 0;
                    const categoria = info.categoria || item.Categoria || '—'; // Prioriza categoria do cadastro

                    if (exportEmpresaFiltro && empresa !== exportEmpresaFiltro) return;

                    const chave = `${nome}|${categoria}`;
                    const obraData = dadosPorObra.get(obraId);

                    if (!obraData.externos.has(chave)) {
                        obraData.externos.set(chave, {
                            nome,
                            categoria,
                            empresa,
                            valorHora,
                            horasPorDia: {},
                            totalHoras: 0,
                            totalValor: 0
                        });
                    }

                    const externo = obraData.externos.get(chave);
                    const dia = new Date(cab.Data).getDate();
                    const minutos = Number(item.NumHoras || 0);
                    const horas = minutos / 60;

                    externo.horasPorDia[dia] = (externo.horasPorDia[dia] || 0) + horas;
                    externo.totalHoras += horas;
                    externo.totalValor += horas * valorHora;
                });
            });

            // Criar planilha Excel
            const dadosExcel = [];

            // Título e período
            const mesInicio = dataInicio.toLocaleString('pt-PT', { month: 'long', year: 'numeric' });
            const mesFim = dataFim.toLocaleString('pt-PT', { month: 'long', year: 'numeric' });
            const periodoLabel = mesInicio === mesFim ?
                mesInicio.charAt(0).toUpperCase() + mesInicio.slice(1) :
                `${mesInicio.charAt(0).toUpperCase() + mesInicio.slice(1)}/${mesFim.charAt(0).toUpperCase() + mesFim.slice(1)}`;

            dadosExcel.push({ A: `GRAUM ${new Date().getFullYear()}` });
            dadosExcel.push({ A: '' });

            // Criar linha com Subempreiteiro e MÊS na mesma linha
            const nomeEmpresa = exportEmpresaFiltro || 'Todas as empresas';
            const linhaInfo = { A: `Subempreiteiro: ${nomeEmpresa}` };
            // Calcular a coluna do MÊS (última coluna visível)
            const colMes = 3 + diasDoPeriodo.length + 4; // Obra + Func + Cat + dias + colunas finais
            linhaInfo[String.fromCharCode(65 + colMes)] = `MÊS: ${periodoLabel}`;
            dadosExcel.push(linhaInfo);

            dadosExcel.push({ A: '' });

            // Cabeçalho de colunas
            const cabecalho = {
                A: 'Obra',
                B: 'Funcionário',
                C: 'Categoria'
            };

            let col = 3; // Começa depois de Obra, Funcionário, Categoria
            diasDoPeriodo.forEach(dia => {
                cabecalho[String.fromCharCode(65 + col)] = dia;
                col++;
            });

            cabecalho[String.fromCharCode(65 + col)] = 'TOTAL';
            cabecalho[String.fromCharCode(65 + col + 1)] = 'Valor hora';
            cabecalho[String.fromCharCode(65 + col + 2)] = 'Horas sábado';
            cabecalho[String.fromCharCode(65 + col + 3)] = 'TOTAL';

            dadosExcel.push(cabecalho);

            // Adicionar dados por obra
            let totalGeralHoras = 0;
            let totalGeralValor = 0;

            Array.from(dadosPorObra.entries())
                .filter(([, obraData]) => obraData.externos.size > 0) // Filtrar obras vazias
                .sort(([, a], [, b]) => a.obraLabel.localeCompare(b.obraLabel))
                .forEach(([obraId, obraData]) => {
                    let totalObraHoras = 0;
                    let totalObraValor = 0;

                    Array.from(obraData.externos.values())
                        .sort((a, b) => a.nome.localeCompare(b.nome))
                        .forEach(externo => {
                            const linha = {
                                A: obraData.obraLabel, // Mostrar em todas as linhas
                                B: externo.nome,
                                C: externo.categoria
                            };

                            let col = 3;
                            let horasSabado = 0;

                            diasDoPeriodo.forEach((dia, index) => {
                                const horas = externo.horasPorDia[dia] || 0;
                                linha[String.fromCharCode(65 + col)] = horas > 0 ? horas.toFixed(1) : '';

                                // Verificar se é sábado - usar o index correto
                                const dataTemp = new Date(dataInicio);
                                dataTemp.setDate(dataTemp.getDate() + index);
                                if (dataTemp.getDay() === 6) { // 6 = sábado
                                    horasSabado += horas;
                                }

                                col++;
                            });

                            linha[String.fromCharCode(65 + col)] = externo.totalHoras.toFixed(1);
                            linha[String.fromCharCode(65 + col + 1)] = externo.valorHora > 0 ? externo.valorHora.toFixed(2) + ' €' : '';
                            linha[String.fromCharCode(65 + col + 2)] = horasSabado.toFixed(2) + ' €';
                            linha[String.fromCharCode(65 + col + 3)] = externo.totalValor > 0 ? externo.totalValor.toFixed(2) + ' €' : '';

                            dadosExcel.push(linha);

                            totalObraHoras += externo.totalHoras;
                            totalObraValor += externo.totalValor;
                        });

                    // Linha de total da obra
                    const linhaTotalObra = { A: 'TOTAL OBRA', B: '', C: '' };
                    let col = 3;

                    diasDoPeriodo.forEach(dia => {
                        let totalDia = 0;
                        obraData.externos.forEach(ext => {
                            totalDia += ext.horasPorDia[dia] || 0;
                        });
                        linhaTotalObra[String.fromCharCode(65 + col)] = totalDia > 0 ? totalDia.toFixed(1) : '';
                        col++;
                    });

                    linhaTotalObra[String.fromCharCode(65 + col)] = totalObraHoras.toFixed(1);
                    linhaTotalObra[String.fromCharCode(65 + col + 3)] = totalObraValor.toFixed(2) + ' €';

                    dadosExcel.push(linhaTotalObra);
                    dadosExcel.push({ A: '' }); // Linha em branco entre obras

                    totalGeralHoras += totalObraHoras;
                    totalGeralValor += totalObraValor;
                });

            // Linha de total geral (todas as obras)
            const linhaTotalGeral = { A: 'TOTAL GERAL', B: '', C: '' };
            let colGeral = 3;

            // Calcular totais por dia de todas as obras
            diasDoPeriodo.forEach(dia => {
                let totalDiaGeral = 0;
                dadosPorObra.forEach(obraData => {
                    obraData.externos.forEach(ext => {
                        totalDiaGeral += ext.horasPorDia[dia] || 0;
                    });
                });
                linhaTotalGeral[String.fromCharCode(65 + colGeral)] = totalDiaGeral > 0 ? totalDiaGeral.toFixed(1) : '';
                colGeral++;
            });

            linhaTotalGeral[String.fromCharCode(65 + colGeral)] = totalGeralHoras.toFixed(1);
            linhaTotalGeral[String.fromCharCode(65 + colGeral + 3)] = totalGeralValor.toFixed(2) + ' €';

            dadosExcel.push(linhaTotalGeral);

            // Seção de validação de horas por funcionário
            dadosExcel.push({ A: '' });
            dadosExcel.push({ A: '' });
            dadosExcel.push({ A: 'Horas' });

            const cabecalhoValidacao = {
                A: 'Funcionário',
                B: 'Categoria'
            };

            col = 2;
            diasDoPeriodo.forEach(dia => {
                cabecalhoValidacao[String.fromCharCode(65 + col)] = dia;
                col++;
            });
            cabecalhoValidacao[String.fromCharCode(65 + col)] = 'Total';

            dadosExcel.push(cabecalhoValidacao);

            // Adicionar validação por funcionário (totalizando todas as obras)
            mapaExternos.forEach(externo => {
                const linha = {
                    A: externo.nome,
                    B: externo.categoria
                };

                let col = 2;
                diasDoPeriodo.forEach(dia => {
                    const horas = externo.horasPorDia[dia] || 0;
                    linha[String.fromCharCode(65 + col)] = horas > 0 ? horas.toFixed(1) : '0.0';
                    col++;
                });

                linha[String.fromCharCode(65 + col)] = externo.totalHoras.toFixed(1);
                dadosExcel.push(linha);
            });

            // Linha final de total
            const linhaTotalValidacao = { A: '', B: '' };
            let col2 = 2;
            diasDoPeriodo.forEach(dia => {
                let totalDia = 0;
                mapaExternos.forEach(ext => {
                    totalDia += ext.horasPorDia[dia] || 0;
                });
                linhaTotalValidacao[String.fromCharCode(65 + col2)] = totalDia.toFixed(1);
                col2++;
            });
            linhaTotalValidacao[String.fromCharCode(65 + col2)] = totalGeralHoras.toFixed(1);
            dadosExcel.push(linhaTotalValidacao);

            console.log('📝 Dados Excel preparados:', dadosExcel.length, 'linhas');
            console.log('💾 Criando arquivo Excel...');

            // Verificar se estamos usando xlsx-js-style
            console.log('📦 Biblioteca XLSX:', XLSX.version || 'versão desconhecida');

            // Criar workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(dadosExcel, { skipHeader: true });

            // Ajustar largura das colunas
            const colWidths = [
                { wch: 35 }, // Obra
                { wch: 30 }, // Funcionário
                { wch: 20 }, // Categoria
            ];

            // Adicionar largura para cada dia
            diasDoPeriodo.forEach(() => {
                colWidths.push({ wch: 7 });
            });

            colWidths.push({ wch: 10 }); // TOTAL
            colWidths.push({ wch: 12 }); // Valor hora
            colWidths.push({ wch: 12 }); // Horas sábado
            colWidths.push({ wch: 12 }); // TOTAL valor

            ws['!cols'] = colWidths;

            // Aplicar formatação: bordas e cores de fundo
            console.log('🎨 Aplicando formatação (bordas e cores)...');

            // Definir estilos de borda (formato correto para xlsx-js-style)
            const bordaFina = {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            };

            const bordaMedia = {
                top: { style: 'medium' },
                bottom: { style: 'medium' },
                left: { style: 'medium' },
                right: { style: 'medium' }
            };

            // Cores de fundo (formato correto para xlsx-js-style)
            const fundoVerde = { patternType: 'solid', fgColor: { rgb: '92D050' } }; // Verde para 8h
            const fundoAmarelo = { patternType: 'solid', fgColor: { rgb: 'FFFF00' } }; // Amarelo para < 8h
            const fundoCabecalho = { patternType: 'solid', fgColor: { rgb: '4472C4' } }; // Azul para cabeçalho
            const fonteBranca = { color: { rgb: 'FFFFFF' }, bold: true };

            // Aplicar formatação em todas as células
            const range = XLSX.utils.decode_range(ws['!ref']);
            let celulasComBorda = 0;
            let celulasVerdes = 0;
            let celulasAmarelas = 0;

            console.log('📊 Range de células:', range);
            console.log(`📏 Total de linhas: ${range.e.r + 1}, Total de colunas: ${range.e.c + 1}`);

            for (let R = range.s.r; R <= range.e.r; ++R) {
                // Verificar se a linha está completamente vazia (linha de separação)
                let linhaVazia = true;
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
                    if (ws[cellAddr] && ws[cellAddr].v !== undefined && ws[cellAddr].v !== null && ws[cellAddr].v !== '') {
                        linhaVazia = false;
                        break;
                    }
                }

                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });

                    // Criar célula se não existir (para células vazias)
                    if (!ws[cellAddress]) {
                        ws[cellAddress] = { t: 's', v: '' };
                    }

                    // Inicializar estilo da célula
                    if (!ws[cellAddress].s) ws[cellAddress].s = {};

                    // Aplicar bordas APENAS em linhas com conteúdo (não em linhas vazias de separação)
                    if (!linhaVazia) {
                        ws[cellAddress].s.border = bordaFina;
                        celulasComBorda++;
                    }

                    // Linha do cabeçalho principal (linha 5 no Excel, index 4)
                    if (R === 4) {
                        ws[cellAddress].s = {
                            fill: fundoCabecalho,
                            font: fonteBranca,
                            alignment: { horizontal: 'center', vertical: 'center' },
                            border: bordaMedia
                        };
                    }

                    // Identificar e formatar cabeçalho da seção de validação
                    const cellA = XLSX.utils.encode_cell({ r: R, c: 0 });
                    const isCabecalhoValidacao = R > 4 && ws[cellA] && ws[cellA].v === 'Funcionário';

                    if (isCabecalhoValidacao) {
                        ws[cellAddress].s = {
                            fill: fundoCabecalho,
                            font: fonteBranca,
                            alignment: { horizontal: 'center', vertical: 'center' },
                            border: bordaMedia
                        };
                    }

                    // Aplicar cores nas células de horas (colunas dos dias)
                    // Primeira tabela: colunas dos dias começam na coluna 3 (índice C=3)
                    // Segunda tabela (validação): colunas dos dias começam na coluna 1 (índice B=1)
                    const isPrimeiraTabelaDias = C >= 3 && C < 3 + diasDoPeriodo.length && R > 4 && !isCabecalhoValidacao;
                    const isSegundaTabelaDias = C >= 1 && C < 1 + diasDoPeriodo.length && R > 4 && !isCabecalhoValidacao;

                    if ((isPrimeiraTabelaDias || isSegundaTabelaDias) && !isCabecalhoValidacao) {
                        const cellValue = ws[cellAddress].v;
                        let horas = 0;

                        // Tentar converter o valor para horas
                        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
                            if (typeof cellValue === 'number') {
                                horas = cellValue;
                            } else if (typeof cellValue === 'string') {
                                horas = parseFloat(cellValue);
                            }
                        }

                        // Aplicar cor de fundo baseada nas horas (mantendo a borda)
                        if (!isNaN(horas) && horas > 0) {
                            if (horas >= 8.0) {
                                ws[cellAddress].s = {
                                    fill: fundoVerde,
                                    font: { bold: true },
                                    alignment: { horizontal: 'center', vertical: 'center' },
                                    border: bordaFina
                                };
                                celulasVerdes++;
                            } else {
                                ws[cellAddress].s = {
                                    fill: fundoAmarelo,
                                    alignment: { horizontal: 'center', vertical: 'center' },
                                    border: bordaFina
                                };
                                celulasAmarelas++;
                            }
                        } else {
                            ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
                        }
                    }

                    // Centralizar texto em colunas a partir da coluna 3 (se ainda não foi alinhado)
                    if (C >= 3 && !ws[cellAddress].s.alignment) {
                        ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
                    }

                    // Negrito para primeira coluna (Obra) - mantendo a borda
                    if (C === 0 && R > 4 && !isCabecalhoValidacao) {
                        if (!ws[cellAddress].s.font) {
                            ws[cellAddress].s.font = { bold: true };
                        } else {
                            ws[cellAddress].s.font.bold = true;
                        }
                    }
                }
            }

            console.log('✅ Formatação aplicada com sucesso!');
            console.log(`📋 Estatísticas: ${celulasComBorda} células com bordas, ${celulasVerdes} verdes, ${celulasAmarelas} amarelas`);

            // Debug: Verificar se os estilos estão sendo aplicados
            const testCell = ws['E5']; // Célula de exemplo no cabeçalho
            console.log('🔍 Debug célula E5:', testCell);
            if (testCell && testCell.s) {
                console.log('✅ Célula tem estilos:', JSON.stringify(testCell.s));
            } else {
                console.error('❌ Célula não tem estilos!');
            }

            XLSX.utils.book_append_sheet(wb, ws, 'Horas Trabalhadores Externos');

            // Gerar nome do arquivo
            const nomeArquivo = `Horas_Externos_${periodoLabel.replace(/\s|\//g, '_')}${exportEmpresaFiltro ? '_' + exportEmpresaFiltro.replace(/[^a-zA-Z0-9]/g, '_') : ''}.xlsx`;

            console.log('📁 Nome do arquivo:', nomeArquivo);
            console.log('⬇️ Iniciando download...');

            // Exportar usando xlsx-js-style com preservação de estilos
            // Método alternativo que garante que os estilos são preservados
            try {
                const wbout = XLSX.write(wb, {
                    bookType: 'xlsx',
                    type: 'array',
                    cellStyles: true
                });

                const blob = new Blob([wbout], { type: 'application/octet-stream' });

                // Criar link para download
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = nomeArquivo;
                link.click();
                window.URL.revokeObjectURL(url);

                console.log('✅ Download iniciado com estilos preservados');
            } catch (writeError) {
                console.error('❌ Erro ao escrever arquivo com estilos:', writeError);
                // Fallback para método simples
                XLSX.writeFile(wb, nomeArquivo);
            }

            console.log('✅ Exportação concluída com sucesso!');

            window.alert(`Exportados ${mapaExternos.size} trabalhadores externos com ${totalGeralHoras.toFixed(1)} horas.`);
            fecharModalExport();

        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            Alert.alert('Erro', error.message || 'Erro ao exportar dados para Excel.');
        } finally {
            setExportando(false);
        }
    };

    const listaFiltrada = useMemo(() => registos, [registos]);

    // === PARTES DIÁRIAS DOS EXTERNOS (GRADE MENSAL) ===

    // Info por externo (valor hora / moeda / empresa / categoria), indexado por nome normalizado
    const nomeToInfo = useMemo(() => {
        const m = {};
        (registos || []).forEach(r => {
            const key = normalizeName(r?.funcionario || '');
            if (!key) return;
            m[key] = {
                empresa: r?.empresa || '—',
                valorHora: Number(r?.valor) || 0,
                moeda: (r?.moeda || 'EUR').toUpperCase(),
                categoria: r?.categoria || '—',
            };
        });
        return m;
    }, [registos]);

const fetchPartesGrade = useCallback(async () => {
  setGradeLoading(true);

  const mes = mesSelecionado;
  const ano = anoSelecionado;
  const diasNoMes = getDiasNoMes(ano, mes);

  try {
    const painelToken = await secureStorage.getItem('painelAdminToken');
    const res = await fetch(API_PARTE_DIARIA, {
      headers: { Authorization: `Bearer ${painelToken}` }
    });
    if (!res.ok) throw new Error('Erro ao carregar partes diárias');

    const all = await res.json();

    const partesDoMes = (all || []).filter(cab => {
      const d = new Date(cab.Data);
      return d.getMonth() + 1 === mes && d.getFullYear() === ano;
    });

    const externosProcessados = [];
    const mapGrupoParaDados = new Map();

    partesDoMes.forEach(cab => {
      const itensExternos = (cab.ParteDiariaItems || []).filter(it => {
        const semColab = it.ColaboradorID == null || String(it.ColaboradorID).trim() === '';
        const marca = /\bexterno\b/i.test(String(it.Funcionario || ''));
        return semColab || marca;
      });

      itensExternos.forEach(item => {
        const nome = String(item.Funcionario || 'Externo').replace(/\s*\(Externo\)\s*$/i, '').trim();
        const nomeKey = normalizeName(nome);

        const info = nomeToInfo[nomeKey] || {};
        const valorHora = info.valorHora || 0;
        const moeda = info.moeda || 'EUR';
        const empresa = info.empresa || item.Empresa || '—';

        // Obter especialidade
        let especialidade = '—';
        if (item.SubEmpID != null) {
          const esp = especialidadesList.find(e => String(e.subEmpId) === String(item.SubEmpID));
          especialidade = esp?.descricao || '—';
        }
        if (especialidade === '—') especialidade = getEspecialidade(item, especialidadesList) || '—';

        // Obter classe
        const classe = getClasse(item, classesList);

        // Obter obra
        const obra = obrasMap[String(cab.ObraID)];
        const obraId = String(cab.ObraID);
        const obraLabel = obra ? `${obra.codigo} — ${obra.nome}` : `Obra ${cab.ObraID}`;

        // Determinar chave de agrupamento
        let grupoKey, grupoLabel, dadosGrupo;

        // 🔥 NOVA LÓGICA: Se modo visualização for 'porColaborador', agrupar por colaborador+obra
        if (modoVisualizacaoGrade === 'porColaborador') {
          grupoKey = `colaborador_obra_${nomeKey}_${obraId}`;
          grupoLabel = `${nome} → ${obraLabel}`;
          dadosGrupo = {
            nome: grupoLabel,
            colaborador: nome,
            empresa,
            especialidade,
            classe,
            obraId,
            obraLabel
          };
        } else {
          // Agrupamento normal
          switch (agruparGradePor) {
            case 'obra':
              grupoKey = `obra_${obraId}`;
              grupoLabel = obraLabel;
              dadosGrupo = { nome: obraLabel, empresa, especialidade, classe, obraId };
              break;
            case 'empresa':
              grupoKey = `empresa_${empresa}`;
              grupoLabel = empresa;
              dadosGrupo = { nome: grupoLabel, empresa, especialidade, classe, obraId };
              break;
            case 'externo':
              grupoKey = `externo_${nomeKey}`;
              grupoLabel = nome;
              dadosGrupo = { nome: grupoLabel, empresa, especialidade, classe, obraId };
              break;
            case 'especialidade':
              grupoKey = `especialidade_${especialidade}`;
              grupoLabel = especialidade;
              dadosGrupo = { nome: grupoLabel, empresa, especialidade, classe, obraId };
              break;
            case 'classe':
              grupoKey = `classe_${classe}`;
              grupoLabel = classe;
              dadosGrupo = { nome: grupoLabel, empresa, especialidade, classe, obraId };
              break;
            case 'geral':
            default:
              grupoKey = `externo_${nomeKey}`;
              grupoLabel = nome;
              dadosGrupo = { nome: grupoLabel, empresa, especialidade, classe, obraId };
              break;
          }
        }

        // Inicializar grupo se não existir
        if (!mapGrupoParaDados.has(grupoKey)) {
          mapGrupoParaDados.set(grupoKey, {
            ...dadosGrupo,
            moeda,
            diasHoras: {},
            diasValores: {},
            obras: new Set([obraId])
          });
        }

        const grupo = mapGrupoParaDados.get(grupoKey);
        grupo.obras.add(obraId);

        // Adicionar horas e valores do dia
        const dia = new Date(cab.Data).getDate();
        const minutos = Number(item.NumHoras || 0);
        const valorDia = (minutos / 60) * valorHora;

        grupo.diasHoras[dia] = (grupo.diasHoras[dia] || 0) + minutos;
        grupo.diasValores[dia] = (grupo.diasValores[dia] || 0) + valorDia;
      });
    });

    // Converter Map para array
    mapGrupoParaDados.forEach((grupo) => {
      externosProcessados.push({
        nome: grupo.nome,
        colaborador: grupo.colaborador,
        empresa: grupo.empresa,
        especialidade: grupo.especialidade,
        classe: grupo.classe,
        moeda: grupo.moeda,
        obraId: grupo.obraId,
        obraLabel: grupo.obraLabel,
        obras: Array.from(grupo.obras),
        diasHoras: grupo.diasHoras,
        diasValores: grupo.diasValores
      });
    });

    setGradesMensais({
      externos: externosProcessados,
      mesAtual: mes,
      anoAtual: ano,
      diasNoMes
    });

  } catch (err) {
    console.error('Erro ao carregar partes diárias:', err);
    Alert.alert('Erro', 'Não foi possível carregar as partes diárias dos externos.');
  } finally {
    setGradeLoading(false);
  }
}, [agruparGradePor, modoVisualizacaoGrade, obrasMap, nomeToInfo, especialidadesList, classesList, mesSelecionado, anoSelecionado]);


const abrirGradePartes = async () => {
  setModalGradeVisible(true);
  await carregarClassesEspecialidades();
  await fetchObrasResumo();
  await fetchPartesGrade();
};


useEffect(() => {
  if (modalGradeVisible) {
    fetchPartesGrade();
  }
}, [mesSelecionado, anoSelecionado, modoVisualizacaoGrade, modalGradeVisible, fetchPartesGrade]);

    // Limpar filtros quando muda o modo de visualização
    useEffect(() => {
        // Resetar todos os filtros quando muda entre Vista Geral e Por Colaborador
        setExternoGradeFiltro('');
        setEmpresaGradeFiltro('');
        setEspecialidadeGradeFiltro('');
        setClasseGradeFiltro('');
        setObraGradeFiltro('');
    }, [modoVisualizacaoGrade]);

    // Recarregar grade quando agrupamento muda (sem resetar filtros)
    useEffect(() => {
        if (modalGradeVisible) {
            fetchPartesGrade();
        }
    }, [agruparGradePor, modalGradeVisible, fetchPartesGrade]);

    const fecharGradePartes = () => {
        setModalGradeVisible(false);
        setGradesMensais({
            externos: [],
            mesAtual: new Date().getMonth() + 1,
            anoAtual: new Date().getFullYear(),
            diasNoMes: new Date().getDate(),
        });
        // Manter filtros para próxima abertura - não resetar
    };

    const getClasseDescricao = (classeId) => {
        const classe = classesList.find(c => c.classeId === classeId);
        return classe?.descricao || `Classe ${classeId}`;
    };

    const getEspecialidadeDescricao = (subEmpId) => {
        const esp = especialidadesList.find(e => e.subEmpId === subEmpId);
        return esp?.descricao || '—';
    };

    // Opções dos pickers na Grade Mensal - contextuais ao agrupamento
    const gradeOptions = useMemo(() => {
        // Coletar dados dos registos ORIGINAIS antes do agrupamento
        // Precisamos ir buscar diretamente às partes diárias para ter os dados corretos
        const empresas = new Set();
        const colaboradores = new Set();
        const especialidades = new Set();
        const classes = new Set();
        const obrasSet = new Set();

        // Se tivermos dados agrupados, extrair as obras únicas
        const allExternos = gradesMensais.externos || [];
        allExternos.forEach(ext => {
            // Adicionar obras (sempre relevante)
            if (ext.obras && Array.isArray(ext.obras)) {
                ext.obras.forEach(obraId => obrasSet.add(obraId));
            } else if (ext.obraId) {
                obrasSet.add(String(ext.obraId));
            }

            // No modo por colaborador, usar SEMPRE o campo colaborador (sem a seta da obra)
            if (modoVisualizacaoGrade === 'porColaborador') {
                // Garantir que usamos apenas o nome do colaborador, não o label completo com obra
                if (ext.colaborador) {
                    colaboradores.add(ext.colaborador);
                }
            } else if (agruparGradePor !== 'obra') {
                // Só adicionar empresa se NÃO estiver agrupado por obra
                // (pois quando agrupado por obra, ext.nome contém o nome da obra)
                if (ext.empresa && ext.empresa !== '—') empresas.add(ext.empresa);
                if (ext.nome) colaboradores.add(ext.nome);
                if (ext.especialidade && ext.especialidade !== '—' && ext.especialidade.toLowerCase() !== 'maoobra') {
                    especialidades.add(ext.especialidade);
                }
                if (ext.classe && ext.classe !== '—') {
                    classes.add(ext.classe);
                }
            }
        });

        // Para agrupamento por obra, precisamos obter colaboradores únicos de outra forma
        if (agruparGradePor === 'obra') {
            // Usar o mapa nomeToInfo que contém todos os colaboradores externos registados
            Object.keys(nomeToInfo).forEach(nomeKey => {
                const info = nomeToInfo[nomeKey];
                if (info.empresa) empresas.add(info.empresa);
            });

            // Usar os registos originais para obter nomes de colaboradores
            registos.forEach(r => {
                const nome = r?.funcionario || '';
                if (nome) colaboradores.add(nome);
            });

            // Para especialidades e classes quando agrupado por obra,
            // usar as listas carregadas
            especialidadesList.forEach(esp => {
                if (esp.descricao) especialidades.add(esp.descricao);
            });
            classesList.forEach(cls => {
                if (cls.descricao) classes.add(cls.descricao);
            });
        }

        // Converter obras em array com labels
        const obras = [];
        obrasSet.forEach(obraId => {
            const obra = obrasMap[obraId];
            if (obra && obra.nome) {
                obras.push({
                    id: obraId,
                    label: `${obra.codigo} - ${obra.nome}`
                });
            }
        });

        return {
            empresas: ['', ...Array.from(empresas).sort()],
            externos: ['', ...Array.from(colaboradores).sort()],
            especialidades: ['', ...Array.from(especialidades).sort()],
            classes: ['', ...Array.from(classes).sort()],
            obras: obras.sort((a, b) => a.label.localeCompare(b.label)),
        };
    }, [gradesMensais.externos, obrasMap, agruparGradePor, modoVisualizacaoGrade, nomeToInfo, registos, especialidadesList, classesList]);

    // Filtrar externos para a grade
    const externosFiltradosGrade = useMemo(() => {
        return gradesMensais.externos.filter(externo => {
            // 🔥 MODO POR COLABORADOR: filtrar APENAS por colaborador usando o campo correto
            if (modoVisualizacaoGrade === 'porColaborador') {
                if (externoGradeFiltro) {
                    // Usar SEMPRE o campo colaborador (sem a obra), nunca o nome completo
                    if (externo.colaborador !== externoGradeFiltro) {
                        return false;
                    }
                }
                return true;
            }

            // MODO GERAL: aplicar todos os filtros
            if (empresaGradeFiltro && externo.empresa !== empresaGradeFiltro) {
                return false;
            }

            if (externoGradeFiltro && externo.nome !== externoGradeFiltro) {
                return false;
            }

            if (especialidadeGradeFiltro && externo.especialidade !== especialidadeGradeFiltro) {
                return false;
            }

            if (classeGradeFiltro && externo.classe !== classeGradeFiltro) {
                return false;
            }

            if (obraGradeFiltro) {
                if (externo.obras && Array.isArray(externo.obras)) {
                    if (!externo.obras.includes(obraGradeFiltro)) {
                        return false;
                    }
                } else if (externo.obraId && String(externo.obraId) !== String(obraGradeFiltro)) {
                    return false;
                }
            }

            return true;
        });
    }, [gradesMensais.externos, modoVisualizacaoGrade, empresaGradeFiltro, externoGradeFiltro, especialidadeGradeFiltro, classeGradeFiltro, obraGradeFiltro]);


    // === RESUMO EXTERNOS: data sources
    const fetchObrasResumo = useCallback(async () => {
        try {
            const loginToken = await secureStorage.getItem('loginToken');
            const empresaId = await secureStorage.getItem('empresa_id');

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
                map[key] = {codigo: o.codigo, nome: o.nome };
            });
            setObrasMap(map);
        } catch { /* silencioso */ }
    }, []);

    const fetchResumoExternos = useCallback(async () => {
        setResumoLoading(true);
        try {
            const painelToken = await secureStorage.getItem('painelAdminToken');
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

    // Carregar especialidades (apenas com CDU_CCS preenchido)
    const carregarEspecialidades = useCallback(async () => {
        const painelToken = await secureStorage.getItem('painelAdminToken');
        const urlempresa = await secureStorage.getItem('urlempresa');
        try {
            const data = await fetchComRetentativas(
                'https://webapiprimavera.advir.pt/routesFaltas/GetListaEspecialidades',
                {
                    headers: { Authorization: `Bearer ${painelToken}`, urlempresa },
                }
            );
            const table = data?.DataSet?.Table;
            const items = Array.isArray(table)
                ? table
                    .filter((item) => item.CDU_CCS != null && item.CDU_CCS !== '')
                    .map((item) => ({
                        codigo: item.SubEmp,
                        descricao: item.Descricao,
                        subEmpId: item.SubEmpId,
                        cduCcs: item.CDU_CCS,
                    }))
                : [];
            setEspecialidadesList(items);
        } catch (err) {
            console.error('Erro ao obter especialidades:', err);
            Alert.alert('Erro', 'Não foi possível carregar as especialidades');
        }
    }, []);

    // Carregar classes
    const carregarClasses = useCallback(async () => {
        const painelToken = await secureStorage.getItem('painelAdminToken');
        const urlempresa = await secureStorage.getItem('urlempresa');
        try {
            const data = await fetchComRetentativas(
                'https://webapiprimavera.advir.pt/routesFaltas/GetListaClasses',
                {
                    headers: { Authorization: `Bearer ${painelToken}`, urlempresa },
                }
            );
            const table = data?.DataSet?.Table;
            const items = Array.isArray(table)
  ? table.map(item => ({
      classeId: String(item.ClasseId),   // "1", "2", "-1", ...
      classe: String(item.Classe).trim(),// "-1", "0001", "0002", ...
      descricao: item.Descricao,
      cduCcs: item.CDU_CCS || item.Classe,
    }))
  : [];
setClassesList(items);

        } catch (err) {
            console.error('Erro ao obter classes:', err);
            Alert.alert('Erro', 'Não foi possível carregar as classes');
        }
    }, []);

    // Função combinada para carregar classes e especialidades
    const carregarClassesEspecialidades = useCallback(async () => {
        await Promise.all([
            carregarEspecialidades(),
            carregarClasses()
        ]);
    }, [carregarEspecialidades, carregarClasses]);

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
        const classes = new Set(['']);

        (resumoDocs || []).forEach(cab => {
            (cab.ParteDiariaItems || []).forEach(it => {
                if (String(it.Categoria || '').toLowerCase() === 'equipamentos') return;
                if (!isExternoItem(it)) return;

                const key = normalizeName(it.Funcionario || '');
                const emp = nomeToInfo[key]?.empresa || '—';
                if (emp) empresas.add(emp);
                if (it.Funcionario) externos.add(it.Funcionario);

                // Obter especialidade usando SubEmpID
                let esp = '—';
                if (it.SubEmpID != null) {
                    const espObj = especialidadesList.find(e => String(e.subEmpId) === String(it.SubEmpID));
                    esp = espObj?.descricao || '—';
                }
                if (esp === '—') {
                    esp = getEspecialidade(it, especialidadesList);
                }

                // Obter classe
                const classe = getClasse(it, classesList);


                if (esp && esp !== '—' && esp.toLowerCase() !== 'maoobra') {
                    especialidades.add(esp);
                }

                if (classe && classe !== '—') {
                    classes.add(classe);
                }
            });
        });

        // Adicionar especialidades da lista carregada
        especialidadesList.forEach(esp => {
            if (esp.descricao) especialidades.add(esp.descricao);
        });

        // Adicionar classes da lista carregada
        classesList.forEach(cls => {
            if (cls.descricao) classes.add(cls.descricao);
        });

        return {
            empresas: Array.from(empresas).sort(),
            externos: Array.from(externos).sort(),
            especialidades: Array.from(especialidades).sort(),
            classes: Array.from(classes).sort(),
        };
    }, [resumoDocs, nomeToInfo, especialidadesList, classesList]);

    const passaFiltrosResumo = (it) => {
        const nome = it.Funcionario || '';
        const emp = nomeToInfo[normalizeName(nome)]?.empresa || '—';

        // Obter especialidade usando SubEmpID
        let esp = '—';
        if (it.SubEmpID != null) {
            const espObj = especialidadesList.find(e => String(e.subEmpId) === String(it.SubEmpID));
            esp = espObj?.descricao || '—';
        }
        if (esp === '—') {
            esp = getEspecialidade(it, especialidadesList);
        }

        // Obter classe
        const classe = getClasse(it, classesList);


        if (empresaResumoFiltro && emp !== empresaResumoFiltro) return false;
        if (externoResumoFiltro && nome !== externoResumoFiltro) return false;
        if (especialidadeResumoFiltro && esp !== especialidadeResumoFiltro) return false;
        if (classeResumoFiltro && classe !== classeResumoFiltro) return false;

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

                // Obter especialidade usando SubEmpID
                let esp = '—';
                if (it.SubEmpID != null) {
                    const espObj = especialidadesList.find(e => String(e.subEmpId) === String(it.SubEmpID));
                    esp = espObj?.descricao || '—';
                }
                if (esp === '—') {
                    esp = getEspecialidade(it, especialidadesList);
                }

                // Obter classe
                const classe = getClasse(it, classesList);


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
                    case 'classe': gLabel = classe; break;
                    case 'empresa_externo': gLabel = `${emp} — ${nome}`; break;
                    case 'especialidade_externo': gLabel = `${esp} — ${nome}`; break;
                    case 'especialidade_empresa': gLabel = `${esp} — ${emp}`; break;
                }

                const minutos = Number(it.NumHoras || 0);
                const info = nomeToInfo[nomeKey];
                const moeda = info ? (info.moeda || 'EUR') : 'EUR';
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
    }, [resumoDocs, granularidade, agruparPor, obrasMap, nomeToEmpresa, nomeToInfo, dataInicio, dataFim, empresaResumoFiltro, externoResumoFiltro, especialidadeResumoFiltro,classeResumoFiltro,
  classesList , especialidadesList]);

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

                                <TouchableOpacity onPress={abrirGradePartes} style={[styles.modernButton, styles.warningButton]}>
                                    <LinearGradient colors={['#17a2b8', '#138496']} style={styles.modernButtonGradient}>
                                        <Ionicons name="grid" size={18} color="#fff" />
                                        <Text style={styles.modernButtonText}>Grade Partes Diárias</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={abrirModalExport} style={[styles.modernButton, styles.successButton]}>
                                    <LinearGradient colors={['#28a745', '#20c997']} style={styles.modernButtonGradient}>
                                        <Ionicons name="download" size={18} color="#fff" />
                                        <Text style={styles.modernButtonText}>Exportar Excel</Text>
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
                                        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
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
                                            { k: 'classe', label: 'Por Classe', icon: 'library-outline' },
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
                                    <Text style={styles.controlSectionTitle}>Filtros de Avançados</Text>
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

                                        <View style={styles.filterDropdown}>
                                            <Text style={styles.filterLabel}>Classe</Text>
                                            <View style={styles.modernPicker}>
                                                <Picker
                                                    selectedValue={classeResumoFiltro}
                                                    onValueChange={setClasseResumoFiltro}
                                                    style={styles.pickerStyle}
                                                >
                                                    <Picker.Item label="Todas" value="" />
                                                    {resumoOptions.classes.slice(1).map((c, idx) => (
                                                        <Picker.Item key={`cls-res-${idx}`} label={c} value={c} />
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


                {/* Modal Grade Partes Diárias (Mensal) */}
                <Modal visible={modalGradeVisible} animationType="slide" onRequestClose={fecharGradePartes}>
                    <SafeAreaView style={styles.modalContainer}>
                        <LinearGradient colors={['#17a2b8', '#138496']} style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <View style={styles.modalTitleContainer}>
                                    <View style={styles.modalIcon}>
                                        <Ionicons name="grid" size={24} color="#fff" />
                                    </View>
                                    <Text style={styles.modalTitle}>Grade Mensal - Partes Diárias Externos</Text>
                                </View>
                                <TouchableOpacity onPress={fecharGradePartes} style={styles.modalCloseBtn}>
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>

<ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
  <View style={{ padding: 20 }}>

    {/* Cabeçalho SEMPRE visível */}
    <View style={styles.gradeMensalHeader}>
      <View style={styles.gradeMensalNav}>
        <TouchableOpacity
          onPress={prevMonth}
          disabled={gradeLoading}
          style={[styles.navBtn, gradeLoading && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={20} color="#0B5ED7" />
        </TouchableOpacity>

        <Text style={styles.gradeMensalTitulo}>
          {nomeMesPT(gradesMensais.mesAtual).charAt(0).toUpperCase() +
            nomeMesPT(gradesMensais.mesAtual).slice(1)}{" "}
          {gradesMensais.anoAtual}
        </Text>

        <TouchableOpacity
          onPress={nextMonth}
          disabled={gradeLoading}
          style={[styles.navBtn, gradeLoading && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-forward" size={20} color="#0B5ED7" />
        </TouchableOpacity>
      </View>

      <Text style={styles.gradeMensalSubtitulo}>
        {externosFiltradosGrade.length} de {gradesMensais.externos.length} externo
        {gradesMensais.externos.length !== 1 ? "s" : ""}
      </Text>
    </View>

    {/* 🔥 NOVO: Modo de Visualização */}
    <View style={styles.controlSection}>
      <Text style={styles.controlSectionTitle}>Modo de Visualização</Text>
      <View style={styles.chipContainer}>
        <TouchableOpacity
          onPress={() => setModoVisualizacaoGrade('geral')}
          style={[styles.chip, modoVisualizacaoGrade === 'geral' && styles.chipActive]}
        >
          <Ionicons name="apps" size={14} color={modoVisualizacaoGrade === 'geral' ? "#fff" : "#666"} />
          <Text style={modoVisualizacaoGrade === 'geral' ? styles.chipTextActive : styles.chipText}>
            Vista Geral
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setModoVisualizacaoGrade('porColaborador')}
          style={[styles.chip, modoVisualizacaoGrade === 'porColaborador' && styles.chipActive]}
        >
          <Ionicons name="person-circle" size={14} color={modoVisualizacaoGrade === 'porColaborador' ? "#fff" : "#666"} />
          <Text style={modoVisualizacaoGrade === 'porColaborador' ? styles.chipTextActive : styles.chipText}>
            Por Colaborador (Todas as Obras)
          </Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* Agrupamento da Grade - só mostrar se modo geral */}
    {modoVisualizacaoGrade === 'geral' && (
      <View style={styles.controlSection}>
        <Text style={styles.controlSectionTitle}>Agrupamento de Dados</Text>
        <View style={styles.chipContainer}>
          {[
            { k: "geral", label: "Geral", icon: "grid-outline" },
            { k: "obra", label: "Por Obra", icon: "business-outline" },
            { k: "empresa", label: "Por Empresa", icon: "storefront-outline" },
            { k: "externo", label: "Por Colaborador", icon: "person-outline" },
            { k: "especialidade", label: "Por Especialidade", icon: "construct-outline" },
            { k: "classe", label: "Por Classe", icon: "library-outline" },
          ].map((op) => (
            <TouchableOpacity
              key={op.k}
              onPress={() => setAgruparGradePor(op.k)}
              style={[styles.chip, agruparGradePor === op.k && styles.chipActive]}
            >
              <Ionicons name={op.icon} size={14} color={agruparGradePor === op.k ? "#fff" : "#666"} />
              <Text style={agruparGradePor === op.k ? styles.chipTextActive : styles.chipText}>
                {op.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )}

    {/* Filtros da Grade - Adaptar ao modo de visualização */}
    <View style={styles.controlSection}>
      <Text style={styles.controlSectionTitle}>Filtros de Pesquisa</Text>
      <View style={styles.advancedFilters}>
        {/* 🔥 MODO POR COLABORADOR: Mostrar apenas filtro de colaborador */}
        {modoVisualizacaoGrade === 'porColaborador' ? (
          <View style={styles.filterDropdown}>
            <Text style={styles.filterLabel}>👤 Selecionar Colaborador</Text>
            <View style={styles.modernPicker}>
              <Picker selectedValue={externoGradeFiltro} onValueChange={setExternoGradeFiltro} style={styles.pickerStyle}>
                <Picker.Item label="👤 Todos os colaboradores" value="" />
                {gradeOptions.externos.filter((e) => e !== "").map((e, idx) => (
                  <Picker.Item key={`ext-grade-${idx}`} label={`👤 ${e}`} value={e} />
                ))}
              </Picker>
            </View>
          </View>
        ) : (
          <>
            {/* MODO GERAL: Mostrar todos os filtros conforme agrupamento */}
            {agruparGradePor !== 'obra' && (
              <View style={styles.filterDropdown}>
                <Text style={styles.filterLabel}>Obra</Text>
                <View style={styles.modernPicker}>
                  <Picker selectedValue={obraGradeFiltro} onValueChange={setObraGradeFiltro} style={styles.pickerStyle}>
                    <Picker.Item label="🏗️ Todas as obras" value="" />
                    {gradeOptions.obras.map((obra, idx) => (
                      <Picker.Item key={`obra-grade-${idx}`} label={`🏗️ ${obra.label}`} value={obra.id} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            <View style={styles.filterDropdown}>
              <Text style={styles.filterLabel}>Colaborador</Text>
              <View style={styles.modernPicker}>
                <Picker selectedValue={externoGradeFiltro} onValueChange={setExternoGradeFiltro} style={styles.pickerStyle}>
                  <Picker.Item label="👤 Todos os colaboradores" value="" />
                  {gradeOptions.externos.filter((e) => e !== "").map((e, idx) => (
                    <Picker.Item key={`ext-grade-${idx}`} label={`👤 ${e}`} value={e} />
                  ))}
                </Picker>
              </View>
            </View>

            {agruparGradePor !== 'empresa' && (
              <View style={styles.filterDropdown}>
                <Text style={styles.filterLabel}>Empresa</Text>
                <View style={styles.modernPicker}>
                  <Picker selectedValue={empresaGradeFiltro} onValueChange={setEmpresaGradeFiltro} style={styles.pickerStyle}>
                    <Picker.Item label="🏢 Todas as empresas" value="" />
                    {gradeOptions.empresas.filter((e) => e !== "").map((e, idx) => (
                      <Picker.Item key={`emp-grade-${idx}`} label={`🏢 ${e}`} value={e} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {agruparGradePor !== 'especialidade' && (
              <View style={styles.filterDropdown}>
                <Text style={styles.filterLabel}>Especialidade</Text>
                <View style={styles.modernPicker}>
                  <Picker
                    selectedValue={especialidadeGradeFiltro}
                    onValueChange={setEspecialidadeGradeFiltro}
                    style={styles.pickerStyle}
                  >
                    <Picker.Item label="⚒️ Todas as especialidades" value="" />
                    {gradeOptions.especialidades.filter((e) => e !== "").map((e, idx) => (
                      <Picker.Item key={`esp-grade-${idx}`} label={`⚒️ ${e}`} value={e} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {agruparGradePor !== 'classe' && (
              <View style={styles.filterDropdown}>
                <Text style={styles.filterLabel}>Classe</Text>
                <View style={styles.modernPicker}>
                  <Picker selectedValue={classeGradeFiltro} onValueChange={setClasseGradeFiltro} style={styles.pickerStyle}>
                    <Picker.Item label="📚 Todas as classes" value="" />
                    {gradeOptions.classes.filter((c) => c !== "").map((c, idx) => (
                      <Picker.Item key={`cls-grade-${idx}`} label={`📚 ${c}`} value={c} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </View>

    {/* Loader */}
    {gradeLoading && (
      <View style={styles.centerContainer}>
        <LinearGradient colors={["#17a2b8", "#138496"]} style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>A carregar partes diárias...</Text>
        </LinearGradient>
      </View>
    )}

    {/* Sem dados */}
    {!gradeLoading && externosFiltradosGrade.length === 0 && (
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateCard}>
          <LinearGradient
            colors={["rgba(23, 162, 184, 0.1)", "rgba(19, 132, 150, 0.05)"]}
            style={styles.emptyStateIcon}
          >
            <Ionicons name="grid-outline" size={80} color="#17a2b8" />
          </LinearGradient>
          <Text style={styles.emptyStateTitle}>Sem partes diárias de externos</Text>
          <Text style={styles.emptyStateText}>
            Não há registos para este mês. Usa as setas acima para navegar entre meses.
          </Text>
        </View>
      </View>
    )}

    {/* Tabela */}
    {!gradeLoading && externosFiltradosGrade.length > 0 && (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View>
          {/* Cabeçalho dos dias */}
          <View style={styles.gradeMensalTableHeader}>
            {modoVisualizacaoGrade === 'porColaborador' ? (
              <>
                <View style={[styles.gradeMensalNomeCell, {width: 180, minWidth: 180, maxWidth: 180, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'flex-start'}]}>
                  <Text style={styles.gradeMensalHeaderText}>Colaborador</Text>
                </View>
                <View style={[styles.gradeMensalNomeCell, {width: 200, minWidth: 200, maxWidth: 200, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'flex-start'}]}>
                  <Text style={styles.gradeMensalHeaderText}>Obra</Text>
                </View>
              </>
            ) : (
              <View style={[styles.gradeMensalNomeCell, {width: 250, minWidth: 250, maxWidth: 250, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'flex-start'}]}>
                <Text style={styles.gradeMensalHeaderText}>Nome</Text>
              </View>
            )}
            {Array.from({ length: gradesMensais.diasNoMes }, (_, i) => i + 1).map((dia) => {
              const data = new Date(gradesMensais.anoAtual, gradesMensais.mesAtual - 1, dia);
              const isFds = data.getDay() === 0 || data.getDay() === 6;
              return (
                <View
                  key={dia}
                  style={[
                    styles.gradeMensalHeaderCell,
                    styles.gradeMensalDiaCell,
                    isFds && styles.gradeMensalFimDeSemana,
                  ]}
                >
                  <Text style={[styles.gradeMensalHeaderText, isFds && { color: "#dc3545" }]}>{dia}</Text>
                </View>
              );
            })}
            <View style={[styles.gradeMensalHeaderCell, styles.gradeMensalTotalCell]}>
              <Text style={styles.gradeMensalHeaderText}>Total</Text>
            </View>
          </View>

          {/* Linhas */}
          {externosFiltradosGrade.map((externo, idx) => {
            const totalMinutosLinha = Object.values(externo.diasHoras).reduce((s, m) => s + m, 0);
            const totalEmEuros = Object.values(externo.diasValores || {}).reduce((s, v) => s + v, 0);
            const moeda = externo.moeda || "EUR";

            return (
              <View
                key={externo.nome}
                style={[styles.gradeMensalRow, idx % 2 === 0 && styles.gradeMensalRowPar]}
              >
                {modoVisualizacaoGrade === 'porColaborador' ? (
                  <>
                    <View style={[styles.gradeMensalCell, styles.gradeMensalNomeCell, {width: 180, minWidth: 180, maxWidth: 180, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'flex-start'}]}>
                      <Text style={styles.gradeMensalNomeText} numberOfLines={1}>
                        {externo.colaborador || externo.nome}
                      </Text>
                    </View>
                    <View style={[styles.gradeMensalCell, styles.gradeMensalNomeCell, {width: 200, minWidth: 200, maxWidth: 200, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'flex-start'}]}>
                      <Text style={styles.gradeMensalNomeText} numberOfLines={2}>
                        {externo.obraLabel || '—'}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={[styles.gradeMensalCell, styles.gradeMensalNomeCell, {width: 250, minWidth: 250, maxWidth: 250, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'flex-start'}]}>
                    <Text style={styles.gradeMensalNomeText} numberOfLines={1}>
                      {externo.nome}
                    </Text>
                  </View>
                )}

                {Array.from({ length: gradesMensais.diasNoMes }, (_, i) => i + 1).map((dia) => {
                  const minutos = externo.diasHoras[dia] || 0;
                  const valorDia = (externo.diasValores || {})[dia] || 0;
                  const data = new Date(gradesMensais.anoAtual, gradesMensais.mesAtual - 1, dia);
                  const isFds = data.getDay() === 0 || data.getDay() === 6;
                  const temHoras = minutos > 0;

                  // Determinar cor da borda baseada nas horas
                  const horas = minutos / 60;
                  let borderColor = 'transparent';
                  let borderWidth = 0;

                  if (temHoras) {
                    if (horas >= 8) {
                      borderColor = '#28a745'; // Verde para 8h ou mais
                      borderWidth = 3;
                    } else {
                      borderColor = '#ffc107'; // Amarelo para menos de 8h
                      borderWidth = 3;
                    }
                  }

                  return (
                    <View
                      key={dia}
                      style={[
                        styles.gradeMensalCell,
                        styles.gradeMensalDiaCell,
                        isFds && styles.gradeMensalFimDeSemana,
                        temHoras && styles.gradeMensalCellComHoras,
                        {
                          borderLeftWidth: borderWidth,
                          borderLeftColor: borderColor,
                          borderRightWidth: borderWidth,
                          borderRightColor: borderColor,
                          borderTopWidth: borderWidth,
                          borderTopColor: borderColor,
                          borderBottomWidth: borderWidth,
                          borderBottomColor: borderColor,
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.gradeMensalCellText,
                          temHoras && styles.gradeMensalCellTextComHoras,
                        ]}
                      >
                        {minutos > 0
                          ? minutos >= 60
                            ? `${Math.floor(minutos / 60)}h${
                                minutos % 60 > 0 ? `${minutos % 60}` : ""
                              }`
                            : `${minutos}m`
                          : "—"}
                      </Text>
                      {minutos > 0 && valorDia > 0 && (
                        <Text style={styles.gradeMensalCellValueText}>
                          {formatarValor(valorDia)} {moeda}
                        </Text>
                      )}
                    </View>
                  );
                })}

                <View
                  style={[
                    styles.gradeMensalCell,
                    styles.gradeMensalTotalCell,
                    styles.gradeMensalCellTotal,
                  ]}
                >
                  <Text style={styles.gradeMensalTotalText}>
                    {totalMinutosLinha > 0
                      ? totalMinutosLinha >= 60
                        ? `${Math.floor(totalMinutosLinha / 60)}h${
                            totalMinutosLinha % 60 > 0 ? ` ${totalMinutosLinha % 60}m` : ""
                          }`
                        : `${totalMinutosLinha}m`
                      : "0h"}
                  </Text>
                  {totalMinutosLinha > 0 && totalEmEuros > 0 && (
                    <Text style={styles.gradeMensalTotalValueText}>
                      {formatarValor(totalEmEuros)} {moeda}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    )}
  </View>
</ScrollView>


                    </SafeAreaView>
                </Modal>

                {/* Modal de Exportação Excel */}
                <Modal visible={modalExportVisible} animationType="slide" onRequestClose={fecharModalExport} presentationStyle="pageSheet">
                    <SafeAreaView style={styles.modalContainer}>
                        <LinearGradient colors={['#28a745', '#20c997']} style={styles.modalHeader}>
                            <View style={styles.modalHeaderContent}>
                                <View style={styles.modalTitleContainer}>
                                    <View style={styles.modalIcon}>
                                        <Ionicons name="download" size={24} color="#fff" />
                                    </View>
                                    <Text style={styles.modalTitle}>Exportar para Excel</Text>
                                </View>
                                <TouchableOpacity onPress={fecharModalExport} style={styles.modalCloseBtn}>
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>

                        <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>
                                    <Ionicons name="information-circle" size={16} color="#28a745" /> Filtros de Exportação
                                </Text>
                                <Text style={styles.exportDescription}>
                                    Selecione o período e a empresa para exportar os dados dos trabalhadores externos para Excel.
                                </Text>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.controlSectionTitle}>Período de Exportação</Text>

                                <View style={styles.rowContainer}>
                                    <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                        <Text style={styles.inputLabel}>
                                            <Ionicons name="calendar" size={14} color="#666" /> Data de Início *
                                        </Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.modernInput}
                                                value={exportDataInicio}
                                                onChangeText={setExportDataInicio}
                                                placeholder="YYYY-MM-DD"
                                                placeholderTextColor="#999"
                                            />
                                        </View>
                                    </View>

                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.inputLabel}>
                                            <Ionicons name="calendar" size={14} color="#666" /> Data de Fim *
                                        </Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.modernInput}
                                                value={exportDataFim}
                                                onChangeText={setExportDataFim}
                                                placeholder="YYYY-MM-DD"
                                                placeholderTextColor="#999"
                                            />
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.controlSectionTitle}>Filtro de Empresa</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>
                                        <Ionicons name="business" size={14} color="#666" /> Empresa
                                    </Text>
                                    <View style={styles.modernPicker}>
                                        <Picker
                                            selectedValue={exportEmpresaFiltro}
                                            onValueChange={setExportEmpresaFiltro}
                                            style={styles.pickerStyle}
                                            dropdownIconColor="#28a745"
                                        >
                                            <Picker.Item label="Todas as empresas" value="" />
                                            {empresasCombo.slice(1).map((e, idx) => (
                                                <Picker.Item key={`exp-emp-${idx}`} label={e} value={e} />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.formSection}>
                                <View style={[styles.infoBox, { backgroundColor: '#e7f5ea', borderLeftColor: '#28a745' }]}>
                                    <Ionicons name="information-circle" size={20} color="#28a745" />
                                    <Text style={[styles.infoBoxText, { color: '#155724' }]}>
                                        A exportação incluirá todos os trabalhadores externos que tenham períodos de vigência
                                        que se sobreponham com as datas selecionadas.
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={exportarParaExcel}
                                disabled={exportando}
                                style={styles.saveButtonContainer}
                            >
                                <LinearGradient
                                    colors={exportando ? ['#999', '#777'] : ['#28a745', '#20c997']}
                                    style={styles.saveButton}
                                >
                                    {exportando ? (
                                        <>
                                            <ActivityIndicator size="small" color="#fff" />
                                            <Text style={styles.saveButtonText}>A exportar...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="download" size={20} color="#fff" />
                                            <Text style={styles.saveButtonText}>Exportar para Excel</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
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



export default GestaoTrabalhadoresExternos;