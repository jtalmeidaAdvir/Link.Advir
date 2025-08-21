
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    Dimensions,
    SafeAreaView,
    FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';


const { width } = Dimensions.get('window');

// Cache para armazenar dados e evitar requisições desnecessárias
const dataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const OBRA_SEM_ASSOC = -1;


const PartesDiarias = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [registosPonto, setRegistosPonto] = useState([]);
    const [equipas, setEquipas] = useState([]);
    const [obras, setObras] = useState([]);
    const [mesAno, setMesAno] = useState({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear() });
    const [dadosProcessados, setDadosProcessados] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedTrabalhador, setSelectedTrabalhador] = useState(null);
    const [selectedDia, setSelectedDia] = useState(null);
    const [editData, setEditData] = useState({
        especialidade: '',
        categoria: 'MaoObra'
    });

    const [obrasTodas, setObrasTodas] = useState([]);

        // Memoizar dias do mês para evitar recálculos
    const diasDoMes = useMemo(() => {
        const diasNoMes = new Date(mesAno.ano, mesAno.mes, 0).getDate();
        return Array.from({ length: diasNoMes }, (_, i) => i + 1);
    }, [mesAno.mes, mesAno.ano]);






const [codMap, setCodMap] = useState({});
const [submittedSet, setSubmittedSet] = useState(new Set());


const [especialidadesList, setEspecialidadesList] = useState([]);
const [equipamentosList, setEquipamentosList] = useState([]);

const [diasEditadosManualmente, setDiasEditadosManualmente] = useState(new Set());


    // Especialidades disponíveis
const [especialidades, setEspecialidades] = useState([]);


const [membrosSelecionados, setMembrosSelecionados] = useState([]);
const [equipaSelecionada, setEquipaSelecionada] = useState(null);

const [itensSubmetidos, setItensSubmetidos] = useState([]);

// Normaliza códigos (ex.: "1" -> "001")
const normalizaCod = (c) => String(c ?? '').replace(/^0+/, '').padStart(3, '0');

// Itens submetidos agregados por ColaboradorID × ObraID no mês selecionado
const submetidosPorUserObra = useMemo(() => {
  const map = new Map(); // key: "cod-obraId" -> { cod, obraId, horasPorDia, totalMin }
  (itensSubmetidos || []).forEach(it => {
    if (it.ColaboradorID == null || !it.ObraID || !it.Data) return; // ignora EXTERNOS
    const [yyyy, mm, dd] = it.Data.split('T')[0].split('-').map(Number);
    if (yyyy !== mesAno.ano || mm !== mesAno.mes) return;

    const cod = normalizaCod(it.ColaboradorID);
    const obraId = Number(it.ObraID);
    const key = `${cod}-${obraId}`;

    if (!map.has(key)) {
      map.set(key, {
        cod,
        obraId,
        horasPorDia: Object.fromEntries(diasDoMes.map(d => [d, 0])),
        totalMin: 0,
      });
    }
    const row = map.get(key);
    const dia = dd;
    const mins = Number(it.NumHoras || 0);
    row.horasPorDia[dia] = (row.horasPorDia[dia] || 0) + mins;
    row.totalMin += mins;
  });
  return map;
}, [itensSubmetidos, mesAno, diasDoMes]);

const codToUser = useMemo(() => {
  const m = new Map();
  equipas.forEach(eq => (eq.membros || []).forEach(mb => {
    const cod = codMap[mb.id];
    if (cod) m.set(normalizaCod(cod), { userId: mb.id, userName: mb.nome });
  }));
  return m;
}, [equipas, codMap]);


// === EXTERNOS ===
const [modalExternosVisible, setModalExternosVisible] = useState(false);
const [externosLista, setExternosLista] = useState([]);           // da tabela trabalhadores_externos
const [linhasExternos, setLinhasExternos] = useState([]);         // linhas que vais submeter
const [linhaAtual, setLinhaAtual] = useState({
  obraId: '',
  dia: '',
  trabalhadorId: '',
  horas: '',
  horaExtra: false,
  categoria: 'MaoObra',
  especialidadeCodigo: '',
  subEmpId: null,
});



const carregarObrasTodas = useCallback(async () => {
  try {
    const token = await AsyncStorage.getItem('loginToken');

    // 👇 AJUSTA este endpoint/params conforme a tua API
    const res = await fetch('https://backend.advir.pt/api/obra', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Falha ao obter lista de obras');
    const data = await res.json();

    // Lida com {data: [...]} ou array direto
    const lista = Array.isArray(data) ? data : (data?.data || []);
    const formatadas = lista.map(o => ({
      id: o.id,
      nome: o.nome || o.Descricao || `Obra ${o.id}`,
      codigo: o.codigo || o.Codigo || `OBR${String(o.id).padStart(3,'0')}`
    }));

    setObrasTodas(formatadas);
  } catch (e) {
    console.warn('Erro ao carregar TODAS as obras:', e.message);
    // fallback: fica só com as obras já detetadas pelos registos
  }
}, []);



// 🔹 EXTERNOS SUBMETIDOS por Obra × Pessoa (persistentes, vindos da API)
const externosSubmetidosPorObraPessoa = useMemo(() => {
  const baseHoras = Object.fromEntries(diasDoMes.map(d => [d, 0]));
  const porObra = new Map(); // obraId -> Map(nome -> row)

  (itensSubmetidos || []).forEach(it => {
    // Externo: ColaboradorID == null (pelos teus dados) e costuma vir " (Externo)" no campo Funcionario
    if (it.ColaboradorID != null) return;
    if (!it.Data || !it.ObraID) return;

    const iso = typeof it.Data === 'string' ? it.Data : String(it.Data);
    const [yyyy, mm, dd] = iso.split('T')[0].split('-');
    if (Number(yyyy) !== mesAno.ano || Number(mm) !== mesAno.mes) return;

    const obraId = Number(it.ObraID);
    const diaNum = Number(dd);
    const nome = (it.Funcionario || '')
      .replace(/\s*\(Externo\)\s*$/i, '')
      .trim() || 'Externo';

    if (!porObra.has(obraId)) porObra.set(obraId, new Map());
    const byPessoa = porObra.get(obraId);

    if (!byPessoa.has(nome)) {
      byPessoa.set(nome, {
        obraId,
        funcionario: nome,
        horasPorDia: { ...baseHoras },
        totalMin: 0,
      });
    }

    const row = byPessoa.get(nome);
    const mins = Number(it.NumHoras || 0); // já vens a gravar em minutos
    row.horasPorDia[diaNum] = (row.horasPorDia[diaNum] || 0) + mins;
    row.totalMin += mins;
  });

  return porObra;
}, [itensSubmetidos, diasDoMes, mesAno]);



// Converte "H:MM" ou "H.MM" para minutos (número inteiro)
const parseHorasToMinutos = (str) => {
  if (!str) return 0;
  const s = String(str).trim().replace(',', '.');
  if (s.includes(':')) {
    const [h, m] = s.split(':');
    return Math.max(0, (parseInt(h,10)||0) * 60 + (parseInt(m,10)||0));
  }
  const dec = parseFloat(s);
  if (Number.isNaN(dec) || dec < 0) return 0;
  return Math.round(dec * 60);
};

// Busca os trabalhadores externos ativos
const carregarExternos = useCallback(async () => {
  try {
    const token = await AsyncStorage.getItem('loginToken');
    const res = await fetch('https://backend.advir.pt/api/trabalhadores-externos?ativo=true&anulado=false&pageSize=500', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Falha ao obter externos');
    const data = await res.json();
    // o controlador devolve {data: [...]} ou array direto; lida com ambos
    const lista = Array.isArray(data) ? data : (data?.data || []);
    setExternosLista(lista);
  } catch (e) {
    console.warn('Erro externos:', e.message);
    Alert.alert('Erro', 'Não foi possível carregar a lista de externos.');
  }
}, []);



    const abrirModalExternos = async () => {
      await carregarExternos();
      setLinhaAtual({
        obraId: '',
        dia: '',
        trabalhadorId: '',
        horas: '',
        horaExtra: false,
        categoria: 'MaoObra',
        especialidadeCodigo: '',
        subEmpId: null,
      });
      setLinhasExternos([]);
      setModalExternosVisible(true);
    };

    const adicionarLinhaExterno = () => {
      const { obraId, dia, trabalhadorId, horas, categoria, especialidadeCodigo, subEmpId } = linhaAtual;

      if (!obraId || !dia || !trabalhadorId || !horas) {
        Alert.alert('Validação', 'Seleciona Obra, Dia, Externo e Horas.');
        return;
      }
      if (!especialidadeCodigo || !subEmpId) {
        Alert.alert('Validação', 'Seleciona a especialidade/equipamento.');
        return;
      }

      const trab = externosLista.find(e => String(e.id) === String(trabalhadorId));
      if (!trab) { Alert.alert('Validação', 'Trabalhador externo inválido.'); return; }

      const minutos = parseHorasToMinutos(horas);
      if (minutos <= 0) { Alert.alert('Validação', 'Horas inválidas.'); return; }

      const lista = categoria === 'Equipamentos' ? equipamentosList : especialidadesList;
      const sel   = lista.find(x => x.codigo === especialidadeCodigo);

      setLinhasExternos(prev => ([
        ...prev,
        {
          key: `${obraId}-${dia}-${trabalhadorId}-${Date.now()}`,
          obraId: Number(obraId),
          dia: Number(dia),
          trabalhadorId: trab.id,
          funcionario: trab.funcionario,
          empresa: trab.empresa,
          valor: Number(trab.valor || 0),
          moeda: trab.moeda || 'EUR',
          horasMin: minutos,
          horaExtra: !!linhaAtual.horaExtra,

          // novos campos
          categoria,
          especialidadeCodigo,
          especialidadeDesc: sel?.descricao ?? '',
          subEmpId: subEmpId ?? null,
        }
      ]));

      setLinhaAtual(prev => ({
        ...prev,
        trabalhadorId: '',
        horas: '',
        horaExtra: false,
        especialidadeCodigo: '',
        subEmpId: null,
      }));
    };

    const removerLinhaExterno = (key) => {
      setLinhasExternos(prev => prev.filter(l => l.key !== key));
    };

    const submeterExternos = async () => {
      if (linhasExternos.length === 0) {
        Alert.alert('Aviso', 'Não há linhas para submeter.');
        return;
      }

      try {
        const painelToken = await AsyncStorage.getItem('painelAdminToken');
        const loginToken  = await AsyncStorage.getItem('loginToken');
        const userLogado  = (await AsyncStorage.getItem('userNome')) || '';

        // Agrupa por (obraId, dia)
        const grupos = new Map();
        for (const l of linhasExternos) {
          const dataISO = `${mesAno.ano}-${String(mesAno.mes).padStart(2,'0')}-${String(l.dia).padStart(2,'0')}`;
          const key = `${l.obraId}|${dataISO}`;
          if (!grupos.has(key)) grupos.set(key, { obraId: l.obraId, dataISO, linhas: [] });
          grupos.get(key).linhas.push(l);
        }

        for (const [, grp] of grupos.entries()) {
          // 1) cabeçalho
          const cabecalho = {
            ObraID: grp.obraId,
            Data: grp.dataISO,
            Notas: 'Parte diária de EXTERNOS',
            CriadoPor: userLogado,
            Utilizador: userLogado,
            TipoEntidade: 'O',
            ColaboradorID: null,
          };

          const respCab = await fetch('https://backend.advir.pt/api/parte-diaria/cabecalhos', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${painelToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(cabecalho),
          });

          if (!respCab.ok) {
            const err = await respCab.json().catch(() => ({}));
            throw new Error(err?.message || 'Falha ao criar cabeçalho para externos.');
          }
          const cab = await respCab.json();

          // 2) itens
          for (let i = 0; i < grp.linhas.length; i++) {
            const l = grp.linhas[i];

            const tipoHoraId = l.horaExtra
              ? (isFimDeSemana(mesAno.ano, mesAno.mes, l.dia) ? 'H06' : 'H01')
              : null;

            const item = {
              DocumentoID: cab.DocumentoID,
              ObraID: grp.obraId,
              Data: grp.dataISO,
              Numero: i + 1,
              ColaboradorID: null,
              Funcionario: `${l.funcionario} (Externo)`,
              ClasseID: 1,
              SubEmpID: l.subEmpId ?? null,
              NumHoras: l.horasMin,
              PrecoUnit: l.valor || 0,
              categoria: l.categoria || 'MaoObra',
              TipoHoraID: tipoHoraId,
            };

            const respItem = await fetch('https://backend.advir.pt/api/parte-diaria/itens', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${painelToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(item),
            });

            if (!respItem.ok) {
              const err = await respItem.json().catch(() => ({}));
              throw new Error(err?.message || `Falha ao criar item externo (${l.funcionario}).`);
            }
          }
        }

        setModalExternosVisible(false);
        setLinhasExternos([]);
        Alert.alert('Sucesso', 'Partes diárias de externos submetidas.');
        await carregarItensSubmetidos();
        await carregarDados();
      } catch (e) {
        console.error('Erro ao submeter externos:', e);
        Alert.alert('Erro', e.message || 'Ocorreu um erro ao submeter externos.');
      }
    };


const isFimDeSemana = (ano, mes, dia) => {
  const dt = new Date(ano, mes - 1, dia); // getDay(): 0=Dom, 6=Sáb
  const dow = dt.getDay();
  return dow === 0 || dow === 6;
};


const selecionarOpcaoEspecialidade = (index, valor) => {
  const eq = equipamentosList.find(o => o.codigo === valor);
  const mao = especialidadesList.find(o => o.codigo === valor);

  setEditData(prev => {
    const novas = [...(prev.especialidadesDia || [])];
    const linha = { ...novas[index] };

    if (eq) {
      // veio da lista de Equipamentos
      linha.categoria = 'Equipamentos';
      linha.especialidade = eq.codigo;
      linha.subEmpId = eq.subEmpId ?? null;
    } else if (mao) {
      // veio da lista de Mão de Obra
      linha.categoria = 'MaoObra';
      linha.especialidade = mao.codigo;
      linha.subEmpId = mao.subEmpId ?? null;
    } else {
      // fallback (não encontrou em nenhuma lista)
      linha.especialidade = valor;
    }

    novas[index] = linha;
    return { ...prev, especialidadesDia: novas };
  });
};


const carregarItensSubmetidos = async () => {
  const painelToken = await AsyncStorage.getItem("painelAdminToken");

  try {
    const res = await fetch('https://backend.advir.pt/api/parte-diaria/itens', {
      headers: {
        'Authorization': `Bearer ${painelToken}`
      }
    });

    if (!res.ok) throw new Error('Erro ao carregar itens submetidos');

    const data = await res.json();
     // 1) Atualiza o state dos itens
    setItensSubmetidos(data);
    // 2) Constroi imediatamente o Set de submetidos
    const novoSubmittedSet = new Set(
      data.map(item => {
        // Data vem no formato "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm:ss"
        const diaISO = item.Data.split('T')[0];
        const [ano, mes, dia] = diaISO.split('-');
        return `${item.ColaboradorID}-${item.ObraID}-${ano}-${mes}-${dia}`;
      })
    );
    setSubmittedSet(novoSubmittedSet);
  return novoSubmittedSet; 
  } catch (err) {
    console.error("Erro ao carregar itens submetidos:", err);
  }
};




const carregarEspecialidades = useCallback(async () => {
  const painelToken = await AsyncStorage.getItem('painelAdminToken');
  const urlempresa = await AsyncStorage.getItem('urlempresa');
  try {
    const data = await fetchComRetentativas(
      'https://webapiprimavera.advir.pt/routesFaltas/GetListaEspecialidades',
      {
        headers: { Authorization: `Bearer ${painelToken}`, urlempresa }
      }
    );
    const table = data?.DataSet?.Table;
    const items = Array.isArray(table)
      ? table.map(item => ({
          codigo: item.SubEmp,
          descricao: item.Descricao,
          subEmpId: item.SubEmpId
        }))
      : [];
    setEspecialidadesList(items);
  } catch (err) {
    console.error("Erro ao obter especialidades:", err);
    Alert.alert('Erro', 'Não foi possível carregar as especialidades');
  }
}, []);




const carregarEquipamentos = useCallback(async () => {
  const painelToken = await AsyncStorage.getItem('painelAdminToken');
  const urlempresa = await AsyncStorage.getItem('urlempresa');
  try {
    const data = await fetchComRetentativas(
      'https://webapiprimavera.advir.pt/routesFaltas/GetListaEquipamentos',
      {
        headers: { Authorization: `Bearer ${painelToken}`, urlempresa }
      }
    );
    const table = data?.DataSet?.Table;
    const items = Array.isArray(table)
      ? table.map(item => ({
          codigo: item.Codigo,
          descricao: item.Desig,
          subEmpId: item.ComponenteID
        }))
      : [];
    setEquipamentosList(items);
  } catch (err) {
    console.error("Erro ao obter equipamentos:", err);
    Alert.alert('Erro', 'Não foi possível carregar os equipamentos');
  }
}, []);



const fetchComRetentativas = async (url, options, tentativas = 3, delay = 1000) => {
  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === tentativas - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Exponential backoff
    }
  }
};



useEffect(() => {
  carregarEspecialidades();
  carregarEquipamentos();
}, [carregarEspecialidades, carregarEquipamentos]);



useEffect(() => {
  const init = async () => {
    setLoading(true);
    try {
    // 1) carregar e definir submittedSet, e já ter o valor correto aqui
    const novoSet = await carregarItensSubmetidos();
    console.log('🔍 submittedSet contém:', Array.from(novoSet));

    // 2) buscar equipas+registos e processar
const resultado = await carregarDados() || { equipas: [], registos: [] };
const { equipas: eq, registos } = resultado;

    processarDadosPartes(registos, eq);
  } catch (err) {
    console.error(err);
    Alert.alert('Erro', 'Falha ao carregar dados.');
  } finally {
    setLoading(false);
    }
  };

  init();
}, [mesAno]);


useEffect(() => {
  carregarObrasTodas();
}, [carregarObrasTodas]);

const obrasParaPickers = useMemo(
  () => (obrasTodas.length > 0 ? obrasTodas : obras),
  [obrasTodas, obras]
);



   // 🔹 AGREGADOR: Externos por Obra × Dia (para render na grelha)
    const externosPorObra = useMemo(() => {
      const baseHoras = Object.fromEntries(diasDoMes.map(d => [d, 0]));
      const map = new Map();
      linhasExternos.forEach(l => {
        const obraId = Number(l.obraId);
        if (!map.has(obraId)) {
          const meta = obrasParaPickers.find(o => Number(o.id) === obraId);
          map.set(obraId, {
            obraId,
            obraNome: meta?.nome || `Obra ${obraId}`,
            horasPorDia: { ...baseHoras },
            totalMin: 0,
          });
        }
        const row = map.get(obraId);
        const dia = Number(l.dia);
        const mins = Number(l.horasMin || 0);
        row.horasPorDia[dia] = (row.horasPorDia[dia] || 0) + mins;
        row.totalMin += mins;
      });
      return map;
    }, [linhasExternos, diasDoMes, obrasParaPickers]);


    // 🔹 EXTERNOS por Obra × Pessoa (cada linha é um externo)
const externosPorObraPessoa = useMemo(() => {
  const baseHoras = Object.fromEntries(diasDoMes.map(d => [d, 0]));
  const map = new Map(); // obraId -> Map(trabalhadorId -> rowAccum)

  for (const l of linhasExternos) {
    const obraId = Number(l.obraId);
    const trabId = Number(l.trabalhadorId);

    if (!map.has(obraId)) map.set(obraId, new Map());
    const inner = map.get(obraId);

    if (!inner.has(trabId)) {
      inner.set(trabId, {
        obraId,
        trabalhadorId: trabId,
        funcionario: l.funcionario,            // nome do externo
        empresa: l.empresa,                    // empresa (opcional)
        horasPorDia: { ...baseHoras },
        totalMin: 0,
      });
    }

    const row = inner.get(trabId);
    const dia = Number(l.dia);
    const mins = Number(l.horasMin || 0);
    row.horasPorDia[dia] = (row.horasPorDia[dia] || 0) + mins;
    row.totalMin += mins;
  }

  return map;
}, [linhasExternos, diasDoMes]);

// 🔹 EXTERNOS para a VISTA POR UTILIZADOR (agregado por pessoa -> obras)
const externosAgrupadosPorPessoa = useMemo(() => {
  const baseHoras = Object.fromEntries(diasDoMes.map(d => [d, 0]));
  const mapPessoa = new Map(); // key -> { nome, empresa, obras: Map(obraId -> { obraId, obraNome, horasPorDia, totalMin }) }

  const ensurePessoa = (key, nome, empresa = '') => {
    if (!mapPessoa.has(key)) mapPessoa.set(key, { nome, empresa, obras: new Map() });
    return mapPessoa.get(key);
  };
  const ensureObra = (pessoa, obraId) => {
    if (!pessoa.obras.has(obraId)) {
      const meta = obrasParaPickers.find(o => Number(o.id) === Number(obraId));
      pessoa.obras.set(obraId, {
        obraId: Number(obraId),
        obraNome: meta?.nome || `Obra ${obraId}`,
        horasPorDia: { ...baseHoras },
        totalMin: 0,
      });
    }
    return pessoa.obras.get(obraId);
  };

  // ✅ Submetidos (vindos da API)
  externosSubmetidosPorObraPessoa.forEach((byPessoa, obraId) => {
    byPessoa.forEach(row => {
      // usa o nome como chave (é o que temos nos submetidos)
      const pessoa = ensurePessoa(row.funcionario, row.funcionario, '');
      const obra = ensureObra(pessoa, obraId);
      diasDoMes.forEach(d => {
        const mins = row.horasPorDia[d] || 0;
        obra.horasPorDia[d] = (obra.horasPorDia[d] || 0) + mins;
        obra.totalMin += mins;
      });
    });
  });

  // 📝 Pendentes (linhas ainda no modal)
  externosPorObraPessoa.forEach((byTrab, obraId) => {
    byTrab.forEach(row => {
      // aqui temos id e empresa — usamos uma chave estável baseada no id
      const key = `id:${row.trabalhadorId}`;
      const pessoa = ensurePessoa(key, row.funcionario, row.empresa || '');
      const obra = ensureObra(pessoa, obraId);
      diasDoMes.forEach(d => {
        const mins = row.horasPorDia[d] || 0;
        obra.horasPorDia[d] = (obra.horasPorDia[d] || 0) + mins;
        obra.totalMin += mins;
      });
    });
  });

  // -> array para render
  return [...mapPessoa.values()].map(p => ({
    nome: p.nome,
    empresa: p.empresa,
    obras: [...p.obras.values()],
  }));
}, [externosSubmetidosPorObraPessoa, externosPorObraPessoa, diasDoMes, obrasParaPickers]);



useEffect(() => {
  if (!editData?.categoria) return;

  const carregarCategoriaDinamicamente = async () => {
    const painelToken = await AsyncStorage.getItem('painelAdminToken');
    const urlempresa = await AsyncStorage.getItem('urlempresa');

    try {
      const endpoint = editData.categoria === 'Equipamentos'
        ? 'GetListaEquipamentos'
        : 'GetListaEspecialidades';

      const res = await fetch(
        `https://webapiprimavera.advir.pt/routesFaltas/${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${painelToken}`,
            urlempresa,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!res.ok) throw new Error(`Erro ao obter ${editData.categoria}`);

      const data = await res.json();
      const table = data?.DataSet?.Table;
      if (!Array.isArray(table)) {
        console.warn(`Formato inesperado de ${editData.categoria}:`, data);
        setEspecialidades([]);
        return;
      }

      const itemsFormatados = table.map(item => {
  if (editData.categoria === 'Equipamentos') {
    return {
      codigo: item.Codigo,
      descricao: item.Desig,
      subEmpId: item.ComponenteID 
    };
  } else {
    return {
      codigo: item.SubEmp,
      descricao: item.Descricao,
      subEmpId: item.SubEmpId
    };
  }
});


      setEspecialidades(itemsFormatados);
    } catch (err) {
      console.error(`Erro ao carregar ${editData.categoria}:`, err);
      Alert.alert('Erro', `Não foi possível carregar os dados de ${editData.categoria}`);
    }
  };

  carregarCategoriaDinamicamente();
}, [editData?.categoria]);

// Minutos a mostrar numa célula: ParteDiária > editado/manual > default 480 se houve ponto
const getMinutosCell = useCallback((item, dia) => {
  const mPD = item?.horasSubmetidasPorDia?.[dia] || 0;
  if (mPD > 0) return mPD;

  const mMan = item?.horasPorDia?.[dia] || 0;
  if (mMan > 0) return mMan;

  const mPonto = item?.horasOriginais?.[dia] || 0;
  return mPonto > 0 ? 480 : 0;
}, []);



    const categorias = [
        { label: 'Mão de Obra', value: 'MaoObra' },
        { label: 'Equipamentos', value: 'Equipamentos' }
    ];
    

    // === HELPER: extrai as linhas (uma só data + uma só obra) ===
const montarLinhasDoDia = (item, dia, obraIdDia) => {
  const linhas = [];

  // primeiro tenta usar as especialidades lançadas nesse dia para essa obra
  const espDoDia = (item.especialidades || []).filter(
    e => e.dia === dia && Number((e.obraId ?? item.obraId)) === Number(obraIdDia)
  );

  if (espDoDia.length > 0) {
    espDoDia.forEach(esp => {
      const lista = esp.categoria === 'Equipamentos' ? equipamentosList : especialidadesList;
      const match = lista.find(opt => opt.codigo === esp.especialidade) ||
                    lista.find(opt => opt.descricao === esp.especialidade);

      const minutos = Math.round((parseFloat(esp.horas) || 0) * 60);
      if (minutos > 0) {
        linhas.push({
          obraId: obraIdDia,
          minutos,
          categoria: esp.categoria === 'Equipamentos' ? 'Equipamentos' : 'MaoObra',
          subEmpId: esp.subEmpId ?? match?.subEmpId ?? null,
          horaExtra: !!esp.horaExtra,
        });
      }
    });
    return linhas;
  }

  // se não havia especialidades, usa o default do item (categoria+especialidade) para esse dia
  const minutos = item?.horasPorDia?.[dia] || 0;
  if (minutos > 0) {
    const listaDefault = item.categoria === 'Equipamentos' ? equipamentosList : especialidadesList;
    const match = listaDefault.find(opt => opt.codigo === item.especialidade) ||
                  listaDefault.find(opt => opt.descricao === item.especialidade);

    linhas.push({
      obraId: obraIdDia,
      minutos,
      categoria: item.categoria === 'Equipamentos' ? 'Equipamentos' : 'MaoObra',
      subEmpId: match?.subEmpId ?? null,
      horaExtra: false,
    });
  }

  return linhas;
};

// === HELPER: cria os itens no documento para uma obra/dia ===
const postarItensGrupo = async (documentoID, obraId, dataISO, codFuncionario, linhas) => {
  const painelToken = await AsyncStorage.getItem('painelAdminToken');

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];

    // para equipamentos, é obrigatório o SubEmpID/ComponenteID
    if (l.categoria === 'Equipamentos' && !l.subEmpId) {
      console.warn(`⛔ Equipamento sem SubEmpID em ${dataISO} (obra ${obraId}). Linha ignorada.`);
      continue;
    }

    const [yyyy, mm, dd] = dataISO.split('-').map(Number);
    const tipoHoraId = l.horaExtra ? (isFimDeSemana(yyyy, mm, dd) ? 'H06' : 'H01') : null;

    const payloadItem = {
      DocumentoID: documentoID,
      ObraID: obraId,
      Data: dataISO,
      Numero: i + 1,
      ColaboradorID: codFuncionario,
      Funcionario: String(codFuncionario),
      ClasseID: 1,
      SubEmpID: l.subEmpId ?? null,
      NumHoras: l.minutos,
      PrecoUnit: 0,
      categoria: l.categoria, // 'MaoObra' | 'Equipamentos'
      TipoHoraID: tipoHoraId,
    };

    const resp = await fetch('https://backend.advir.pt/api/parte-diaria/itens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${painelToken}`,
      },
      body: JSON.stringify(payloadItem),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      console.warn(`Erro a criar item (${i + 1}) em ${dataISO} obra ${obraId}`, err);
    }
  }
};


    const [modoVisualizacao, setModoVisualizacao] = useState('obra');


    // Função para converter minutos para formato H:MM
    const formatarHorasMinutos = useCallback((minutos) => {
        if (minutos === 0) return '-';
        
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        
        if (horas === 0) {
            return `${mins}m`;
        } else if (mins === 0) {
            return `${horas}h`;
        } else {
            return `${horas}h${mins.toString().padStart(2, '0')}`;
        }
    }, []);

    // State para armazenar horas originais (do ponto)
    const [horasOriginais, setHorasOriginais] = useState(new Map());



    // Cache key baseado no mês/ano
    const cacheKey = useMemo(() => `partes-diarias-${mesAno.mes}-${mesAno.ano}`, [mesAno]);


    // Função para verificar se o cache é válido
    const isCacheValid = useCallback((key) => {
        const cached = dataCache.get(key);
        if (!cached) return false;
        return (Date.now() - cached.timestamp) < CACHE_DURATION;
    }, []);

    // Função para obter dados do cache
    const getCachedData = useCallback((key) => {
        if (isCacheValid(key)) {
            return dataCache.get(key).data;
        }
        return null;
    }, [isCacheValid]);

    // Função para armazenar dados no cache
    const setCachedData = useCallback((key, data) => {
        dataCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }, []);

    const carregarDados = async () => {
 setLoadingProgress(0);
        
        try {
            // Verificar cache primeiro
            const cachedData = getCachedData(cacheKey);
            if (cachedData) {
                console.log('Carregando dados do cache...');
                setEquipas(cachedData.equipas);
                setObras(cachedData.obras);
                setRegistosPonto(cachedData.registos);
                 // constrói o codMap a partir dos membros do cache
                const membrosIds = [];
                cachedData.equipas.forEach(eq => {
                (eq.membros || []).forEach(m => m?.id && membrosIds.push(m.id));
                });
                const uniqueUserIds = [...new Set(membrosIds)];
                const novoCodMap = {};
                await Promise.all(uniqueUserIds.map(async uid => {
                const cod = await obterCodFuncionario(uid);
                if (cod != null) novoCodMap[uid] = String(cod).padStart(3, '0');
                }));
                setCodMap(novoCodMap); // isto dispara o useEffect acima e refaz a grelha
                processarDadosPartes(cachedData.registos || [], cachedData.equipas || []);
return { equipas: cachedData.equipas, registos: cachedData.registos };

 
            }
 const resultado = await carregarDadosReais();

  return resultado;  
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            Alert.alert('Erro', 'Erro ao carregar os dados necessários');
        } finally {

        }
    };

    const carregarDadosReais = async () => {
        const token = await AsyncStorage.getItem('loginToken');
        if (!token) {
            Alert.alert('Erro', 'Token de autenticação não encontrado');
            return;
        }

        try {
            setLoadingProgress(10);
            
            // 1. Buscar minhas equipas primeiro
            console.log('Carregando equipas...');
            const equipasResponse = await fetch('https://backend.advir.pt/api/equipa-obra/minhas-agrupadas', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!equipasResponse.ok) {
                throw new Error('Erro ao carregar equipas');
            }

            const equipasData = await equipasResponse.json();
            setLoadingProgress(20);
            
            // Transformar dados para o formato esperado
            
            const getEquipaObraId = (equipa) =>
   // tenta várias formas comuns que a API pode devolver
   equipa.obraId ??
   equipa.obra_id ??
   equipa.ObraID ??
   equipa.ObraId ??
   (equipa.obra && (equipa.obra.id ?? equipa.obra.ObraID)) ??
   null;

 const equipasFormatadas = equipasData.map((equipa, index) => ({
   id: index + 1,
   nome: equipa.nome || equipa.obraNome || `Equipa ${index + 1}`,
   encarregado_id: 1,
   obraId: getEquipaObraId(equipa),     // <<— guardar a obra associada
   membros: equipa.membros || []
 }));

            setEquipas(equipasFormatadas);
            setLoadingProgress(30);

            // 2. Coletar todos os IDs dos membros
            const membrosIds = [];
            equipasFormatadas.forEach(equipa => {
                if (equipa.membros) {
                    equipa.membros.forEach(membro => {
                        if (membro && membro.id) {
                            membrosIds.push(membro.id);
                        }
                    });
                }
            });
            // Dentro de carregarDadosReais, logo depois de montar equipasFormatadas e membrosIds:
                    const uniqueUserIds = [...new Set(membrosIds)];
                    const novoCodMap = {};
                    await Promise.all(uniqueUserIds.map(async uid => {
                    const cod = await obterCodFuncionario(uid);
                    if (cod) novoCodMap[uid] = String(cod).padStart(3, '0');
                    }));
                    setCodMap(novoCodMap);



            console.log('IDs dos membros encontrados:', membrosIds);
            setLoadingProgress(40);

            if (membrosIds.length === 0) {
                console.log('Nenhum membro encontrado nas equipas');
                setObras([]);
                setRegistosPonto([]);
                processarDadosPartes([], equipasFormatadas);
                return;
            }

            // 3. Carregar registos de forma otimizada com requisições paralelas
            const todosRegistos = [];
            const obrasUnicas = new Map();
            
            console.log('Carregando registos de ponto...');
            
            // Criar chunks de requisições para não sobrecarregar o servidor
            const CHUNK_SIZE = 5; // Processar 5 membros por vez
            const CONCURRENT_DAYS = 7; // Processar 7 dias por vez

            for (let i = 0; i < membrosIds.length; i += CHUNK_SIZE) {
                const membrosChunk = membrosIds.slice(i, i + CHUNK_SIZE);
                
                // Para cada chunk de membros, processar dias em paralelo
                for (let j = 0; j < diasDoMes.length; j += CONCURRENT_DAYS) {
                    const diasChunk = diasDoMes.slice(j, j + CONCURRENT_DAYS);
                    
                    const promises = [];
                    
                    membrosChunk.forEach(membroId => {
                        diasChunk.forEach(dia => {
                            const dataFormatada = `${mesAno.ano}-${String(mesAno.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                            
                            const promise = fetch(
                                `https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-e-dia?user_id=${membroId}&data=${dataFormatada}`,
                                {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                }
                            ).then(async response => {
                                if (response.ok) {
                                    const registosDia = await response.json();
                                    return { membroId, dia, registos: registosDia };
                                }
                                return { membroId, dia, registos: [] };
                            }).catch(error => {
                                console.log(`Erro ao buscar registos para membro ${membroId} no dia ${dataFormatada}:`, error);
                                return { membroId, dia, registos: [] };
                            });
                            
                            promises.push(promise);
                        });
                    });
                    
                    // Aguardar todas as requisições do chunk
                    const results = await Promise.all(promises);
                    
                    

                    // Processar resultados
                    results.forEach(({ registos }) => {
                        registos.forEach(registo => {
                            if (registo && registo.User && registo.Obra) {
                                todosRegistos.push(registo);
                                
                                // Coletar obras únicas
                                if (!obrasUnicas.has(registo.Obra.id)) {
                                    obrasUnicas.set(registo.Obra.id, {
                                        id: registo.Obra.id,
                                        nome: registo.Obra.nome || 'Obra sem nome',
                                        codigo: `OBR${String(registo.Obra.id).padStart(3, '0')}`
                                    });
                                }
                            }
                        });
                    });
                    
                    // Atualizar progresso
                    const progressIncrement = 50 / (membrosIds.length * diasDoMes.length / (CHUNK_SIZE * CONCURRENT_DAYS));
                    setLoadingProgress(prev => Math.min(90, prev + progressIncrement));
                }
            }

            const obrasArray = Array.from(obrasUnicas.values());
            console.log('Registos encontrados:', todosRegistos.length);
            console.log('Obras encontradas:', obrasArray.length);

            setLoadingProgress(95);

            setObras(obrasArray);
            setRegistosPonto(todosRegistos);
            
            // Armazenar no cache
            setCachedData(cacheKey, {
                equipas: equipasFormatadas,
                obras: obrasArray,
                registos: todosRegistos
            });

            setEquipas(equipasFormatadas);
            setRegistosPonto(todosRegistos);
            setLoadingProgress(100);
            processarDadosPartes(todosRegistos, equipasFormatadas);
return { equipas: equipasFormatadas, registos: todosRegistos };
            


        } catch (error) {
            console.error('Erro ao carregar dados reais:', error);
            Alert.alert('Erro', 'Erro ao carregar dados do servidor: ' + error.message);
        }
    };

const agruparRegistosPorUserObra = useCallback((registos) => {
  const map = new Map();
  for (const r of registos) {
    if (!r?.User || !r?.Obra || !r?.timestamp) continue;
    const dt = new Date(r.timestamp);
    if (dt.getFullYear() !== mesAno.ano || (dt.getMonth()+1) !== mesAno.mes) continue;
    const key = `${r.User.id}-${r.Obra.id}`;
    if (!map.has(key)) map.set(key, { user: r.User, obra: r.Obra, registos: [] });
    map.get(key).registos.push(r);
  }
  return [...map.values()];
}, [mesAno.ano, mesAno.mes]);

    // Memoizar processamento de dados para evitar recálculos desnecessários
const processarDadosPartes = useCallback((registos, equipasData = equipas) => {
  const linhas = [];

    // ✅ ADICIONA ISTO:
  const registosPorUsuarioObra = agruparRegistosPorUserObra(registos);
  // --- (1) filtra, agrupa e calcula horas do PONTO (igual ao que já tens) ---
  // ... mantém teu código até aqui ...
  registosPorUsuarioObra.forEach(grupo => {
    const horasPorDia = calcularHorasPorDia(grupo.registos, diasDoMes);

    const horasOriginaisPorDia = { ...horasPorDia };
    const horasPorDefeito = {};
    diasDoMes.forEach(d => (horasPorDefeito[d] = horasOriginaisPorDia[d] > 0 ? 480 : 0));

    const cod = codMap[grupo.user.id] || null;

    linhas.push({
      id: `${grupo.user.id}-${grupo.obra.id}`,
      userId: grupo.user.id,
      userName: grupo.user.nome,
      codFuncionario: cod,
      obraId: grupo.obra.id,
      obraNome: grupo.obra.nome,
      obraCodigo: grupo.obra.codigo,
      horasPorDia: horasPorDefeito,
      horasOriginais: horasOriginaisPorDia,
      // NEW: se quiseres guardar para UI, mas sem misturar com o ponto
      horasSubmetidasPorDia: null,
      totalMinSubmetido: 0,
      isOriginal: true,
    });
  });

  // --- (2) injeta APENAS pares que têm parte diária mas NÃO têm ponto ---
  const paresComPonto = new Set(
    linhas.map(r => `${normalizaCod(r.codFuncionario || codMap[r.userId] || '')}-${r.obraId}`)
  );

  submetidosPorUserObra.forEach((row, key) => {
    if (paresComPonto.has(key)) return; // já há linha do ponto → não duplica

    const metaUser = codToUser.get(row.cod) || {};
    const obraMeta = (obrasParaPickers || obras || []).find(o => Number(o.id) === Number(row.obraId));

    linhas.push({
      id: `${metaUser.userId ?? `COD${row.cod}`}-${row.obraId}`,
      userId: metaUser.userId ?? null,
      userName: metaUser.userName ?? `Colab ${row.cod}`,
      codFuncionario: row.cod,
      obraId: row.obraId,
      obraNome: obraMeta?.nome || `Obra ${row.obraId}`,
      obraCodigo: obraMeta?.codigo || `OBR${String(row.obraId).padStart(3,'0')}`,
      horasPorDia: Object.fromEntries(diasDoMes.map(d => [d, 0])), // nada de ponto
      horasOriginais: {},
      // NEW: aqui mostramos as horas do "parte diária"
      horasSubmetidasPorDia: row.horasPorDia,
      totalMinSubmetido: row.totalMin,
      isOriginal: false,
      fromSubmittedOnly: true, // marca que esta linha vem só da PD
    });
  });

  // === ADICIONA MEMBROS SEM PONTO (linhas vazias)
  // -> "Sem obra" SÓ para quem NÃO tem ponto no mês ===
  const existentes = new Set(linhas.map(r => `${r.userId}-${r.obraId}`));
  const userIdsComLinha = new Set(linhas.map(r => r.userId).filter(Boolean));
  const usersComPonto = new Set();
  (registos || []).forEach(r => {
    if (!r?.User?.id || !r?.timestamp) return;
    const dt = new Date(r.timestamp);
    if (dt.getFullYear() === mesAno.ano && (dt.getMonth() + 1) === mesAno.mes) {
      usersComPonto.add(r.User.id);
    }
  });

  // função auxiliar para tentar obter o obraId da equipa
 const guessEquipaObraId = (eq) => {
     const direto =
       eq.obraId ?? eq.obra_id ?? eq.ObraID ?? eq.ObraId ??
       (eq.obra && (eq.obra.id ?? eq.obra.ObraID));
     if (direto) return Number(direto);
     const nomeEq = (eq.nome || '').trim().toLowerCase();
     if (!nomeEq) return null;
     const match = (obrasParaPickers || []).find(
       o => (o.nome || '').trim().toLowerCase() === nomeEq
     );
     return match ? Number(match.id) : null;
   };

   equipasData.forEach(eq => {

    const obraIdDetected = guessEquipaObraId(eq);

     (eq.membros || []).forEach(mb => {
       if (!mb?.id) return;

      // se a equipa tem obra reconhecida → cria linha vazia dessa obra (se ainda não existir)
      if (obraIdDetected) {
        const obraId = Number(obraIdDetected);
        const key = `${mb.id}-${obraId}`;
        if (existentes.has(key)) return;
        const obraMeta =
          (obrasParaPickers || []).find(o => Number(o.id) === obraId) ||
          { id: obraId, nome: eq.nome || `Obra ${obraId}`, codigo: `OBR${String(obraId).padStart(3,'0')}` };
        const baseHoras = Object.fromEntries(diasDoMes.map(d => [d, 0]));
        linhas.push({
          id: `${mb.id}-${obraId}`,
          userId: mb.id,
          userName: mb.nome,
          codFuncionario: codMap[mb.id] ?? null,
          obraId,
          obraNome: obraMeta.nome,
          obraCodigo: obraMeta.codigo,
          horasPorDia: baseHoras,
          horasOriginais: {},
          especialidades: [],
          isOriginal: false
        });
        existentes.add(key);
        return;
      }

      // sem obra reconhecida → só criar "Sem obra" se:
      //  (a) NÃO tem ponto no mês e
      //  (b) ainda não existe nenhuma linha deste utilizador (ex.: vinda de parte diária submetida)
      if (usersComPonto.has(mb.id) || userIdsComLinha.has(mb.id)) return;
      const keySemObra = `${mb.id}-${OBRA_SEM_ASSOC}`;
      if (existentes.has(keySemObra)) return;
      const baseHoras = Object.fromEntries(diasDoMes.map(d => [d, 0]));
      linhas.push({
        id: `${mb.id}-${OBRA_SEM_ASSOC}`,
        userId: mb.id,
        userName: mb.nome,
        codFuncionario: codMap[mb.id] ?? null,
        obraId: OBRA_SEM_ASSOC,
        obraNome: 'Sem obra',
        obraCodigo: '—',
        horasPorDia: baseHoras,
        horasOriginais: {},
        especialidades: [],
        isOriginal: false
      });
      existentes.add(keySemObra);
     });
   });

  
  setDadosProcessados(linhas);
}, [diasDoMes, equipas, codMap, submetidosPorUserObra, obrasParaPickers, obras, codToUser]);

 // 👉 quando o codMap for preenchido, refaz a grelha para injetar o codFuncionario
useEffect(() => {
  if (equipas.length) {
    // mesmo que registosPonto esteja vazio, gera linhas a partir das equipas
    processarDadosPartes(registosPonto || [], equipas);
  }
}, [codMap, registosPonto, equipas, processarDadosPartes]);



    // Memoizar cálculo de horas para melhor performance
    const calcularHorasPorDia = useCallback((registos, diasDoMes) => {
        const horasPorDia = {};
        
        // Inicializar todos os dias com 0
        diasDoMes.forEach(dia => {
            horasPorDia[dia] = 0;
        });

        // Agrupar registos por data apenas (não por obra, pois queremos somar por dia)
        const registosPorData = new Map();
        
        registos.forEach(registo => {
            const data = new Date(registo.timestamp).toISOString().split('T')[0];
            
            if (!registosPorData.has(data)) {
                registosPorData.set(data, []);
            }
            registosPorData.get(data).push(registo);
        });

        // Calcular horas trabalhadas por data
        registosPorData.forEach((registosDia, data) => {
            // Ordenar registos por timestamp
            registosDia.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            let totalMinutosDia = 0;
            let ultimaEntrada = null;

            // Processar registos sequencialmente
            for (let i = 0; i < registosDia.length; i++) {
                const registo = registosDia[i];
                
                if (registo.tipo === 'entrada') {
                    // Nova entrada - guarda o timestamp
                    ultimaEntrada = new Date(registo.timestamp);
                } else if (registo.tipo === 'saida' && ultimaEntrada) {
                    // Saída - calcula tempo desde a última entrada em minutos
                    const saida = new Date(registo.timestamp);
                    const minutos = (saida - ultimaEntrada) / (1000 * 60);
                    totalMinutosDia += Math.max(0, minutos);
                    ultimaEntrada = null; // Reset para próxima sessão
                }
            }

            // Se há uma entrada sem saída correspondente no final do dia
            if (ultimaEntrada) {
                const fimDia = new Date(ultimaEntrada);
                fimDia.setHours(18, 0, 0, 0);
                
                if (ultimaEntrada < fimDia) {
                    const minutos = (fimDia - ultimaEntrada) / (1000 * 60);
                    totalMinutosDia += Math.max(0, minutos);
                }
            }

            // Atribuir as horas ao dia correto (manter em minutos para preservar precisão)
            const dia = new Date(data).getDate();
            if (horasPorDia.hasOwnProperty(dia)) {
                // Arredondar para o minuto mais próximo
                horasPorDia[dia] = Math.round(totalMinutosDia);
            }
        });

        return horasPorDia;
    }, []);

    const abrirEdicao = useCallback((trabalhador, dia) => {
            setSelectedTrabalhador(trabalhador);
    setSelectedDia(dia);

    const especialidadesDia = trabalhador.especialidades?.filter(esp => esp.dia === dia) || [];
    setEditData({
      especialidadesDia: especialidadesDia.length > 0
        ? especialidadesDia
        : [
            {
              dia,
              // PASSAR sempre pelo parâmetro `trabalhador`, não pelo estado
              categoria: trabalhador.categoria || 'MaoObra',
              especialidade: trabalhador.especialidade || '',
              horas: (trabalhador.horasPorDia[dia] || 0) / 60,
              subEmpId: trabalhador.subEmpId || null,
              obraId: trabalhador.obraId, 
            }
         ]
    });
    setEditModalVisible(true);
 }, []);


const adicionarEspecialidade = useCallback(() => {
  const novasEspecialidades = [...(editData.especialidadesDia || [])];


  novasEspecialidades.push({
    horas: 0,
    categoria: 'MaoObra',
    especialidade: '',
    subEmpId: null,
    dia: selectedDia,
    horaExtra: false,
    obraId: selectedTrabalhador?.obraId,
  });

  setEditData({
    ...editData,
    especialidadesDia: novasEspecialidades
  });
}, [editData, selectedTrabalhador, selectedDia]);


    const removerEspecialidade = useCallback((index) => {
        if (editData.especialidadesDia.length > 1) {
            const novasEspecialidades = editData.especialidadesDia.filter((_, i) => i !== index);
            setEditData({
                ...editData,
                especialidadesDia: novasEspecialidades
            });
        }
    }, [editData]);

 const atualizarEspecialidade = (index, campo, valor, subEmpId = null) => {
   const novas = [...editData.especialidadesDia];

   // actualiza o campo
   novas[index] = { ...novas[index], [campo]: valor };

   // se vier subEmpId, actualiza-o também
   if (campo === 'especialidade' && subEmpId != null) {
     novas[index].subEmpId = subEmpId;
   }

     if (campo === 'categoria') {
    novas[index].especialidade = '';
    novas[index].subEmpId = null;
  }

   setEditData({ ...editData, especialidadesDia: novas });
 };


const itemJaSubmetido = (codFuncionario, obraId, dia) => {
  const diaStr = String(dia).padStart(2, '0');
  const mesStr = String(mesAno.mes).padStart(2, '0');
  const anoStr = String(mesAno.ano);
const codRaw = String(codFuncionario ?? '');
 const codTrim = codRaw.replace(/^0+/, '');      // sem zeros à esquerda
 const codPad3 = codTrim.padStart(3, '0');       // com 3 dígitos
 const keyBase = (c) => `${c}-${obraId}-${anoStr}-${mesStr}-${diaStr}`;
 return submittedSet.has(keyBase(codRaw))
     || submittedSet.has(keyBase(codTrim))
     || submittedSet.has(keyBase(codPad3));
};


    
  const salvarEdicao = useCallback(() => {
  if (!selectedTrabalhador || !selectedDia) return;

  // Garante obra em cada linha + calcula minutos
 const linhas = (editData.especialidadesDia || []).map(esp => {
   const obraIdNormalizada = resolveObraId(esp.obraId, selectedTrabalhador.obraId);
   return {
     ...esp,
     obraId: obraIdNormalizada,
     minutos: Math.round((parseFloat(esp.horas) || 0) * 60),
   };
 });

  // Mapa de minutos por obra
  const minutosPorObra = linhas.reduce((acc, l) => {
    if (l.minutos > 0) acc[l.obraId] = (acc[l.obraId] || 0) + l.minutos;
    return acc;
  }, {});

  setDadosProcessados(prev => {
    let novo = [...prev];

    // 1) Atualiza o item da obra atual
    novo = novo.map(it => {
      if (it.userId === selectedTrabalhador.userId && it.obraId === selectedTrabalhador.obraId) {
        const minutosAtual = minutosPorObra[selectedTrabalhador.obraId] || 0;
        const especRest = (it.especialidades || []).filter(e => e.dia !== selectedDia);

        linhas
          .filter(l => l.obraId === it.obraId && l.minutos > 0)
          .forEach(l => {
            especRest.push({
              dia: selectedDia,
              especialidade: l.especialidade,
              categoria: l.categoria,
              horas: Math.round((l.minutos / 60) * 100) / 100, // guarda em horas decimais
              subEmpId: l.subEmpId,
              horaExtra: !!l.horaExtra,
              obraId: it.obraId,
            });
          });

        return {
          ...it,
          horasPorDia: { ...it.horasPorDia, [selectedDia]: minutosAtual },
          especialidades: especRest,
          categoria: linhas[0]?.categoria ?? it.categoria,
          especialidade: linhas[0]?.especialidade ?? it.especialidade
        };
      }
      return it;
    });

    // 2) Para cada outra obra, cria/atualiza o item desse utilizador
    Object.keys(minutosPorObra).forEach(obraIdStr => {
      const obraId = Number(obraIdStr);
      if (obraId === selectedTrabalhador.obraId) return;

      let idx = novo.findIndex(it => it.userId === selectedTrabalhador.userId && it.obraId === obraId);
      if (idx === -1) {
        const obraMeta = obras.find(o => o.id === obraId) || { nome: `Obra ${obraId}`, codigo: `OBR${String(obraId).padStart(3, '0')}` };
        const baseHoras = {};
        diasDoMes.forEach(d => (baseHoras[d] = 0));

        novo.push({
          id: `${selectedTrabalhador.userId}-${obraId}`,
          userId: selectedTrabalhador.userId,
          userName: selectedTrabalhador.userName,
          codFuncionario: selectedTrabalhador.codFuncionario || codMap[selectedTrabalhador.userId] || null,
          obraId,
          obraNome: obraMeta.nome,
          obraCodigo: obraMeta.codigo,
          horasPorDia: baseHoras,
          horasOriginais: {},      // sem ponto (manual)
          especialidades: [],
          isOriginal: false
        });
        idx = novo.length - 1;
      }

      const it = novo[idx];
      const especRest = (it.especialidades || []).filter(e => e.dia !== selectedDia);

      linhas
        .filter(l => l.obraId === obraId && l.minutos > 0)
        .forEach(l => {
          especRest.push({
            dia: selectedDia,
            especialidade: l.especialidade,
            categoria: l.categoria,
            horas: Math.round((l.minutos / 60) * 100) / 100,
            subEmpId: l.subEmpId,
            horaExtra: !!l.horaExtra,
            obraId
          });
        });

      novo[idx] = {
        ...it,
        horasPorDia: { ...it.horasPorDia, [selectedDia]: minutosPorObra[obraId] },
        especialidades: especRest,
      };
    });

    return novo;
  });

  // Marca o(s) dia(s) editado(s) por obra
  setDiasEditadosManualmente(prev => {
    const s = new Set(prev);
    Object.keys(minutosPorObra).forEach(obraIdStr => {
      s.add(`${selectedTrabalhador.userId}-${Number(obraIdStr)}-${selectedDia}`);
    });
    return s;
  });

  setEditModalVisible(false);
  Alert.alert('Sucesso', 'Horas distribuídas pelas obras selecionadas.');
}, [selectedTrabalhador, selectedDia, editData, obras, diasDoMes, codMap]);

    
const obterCodFuncionario = async (userId) => {
  const painelToken = await AsyncStorage.getItem("painelAdminToken");

  const resposta = await fetch(`https://backend.advir.pt/api/users/getCodFuncionario/${userId}`, {
    headers: {
      Authorization: `Bearer ${painelToken}`
    }
  });

  if (!resposta.ok) {
    console.error("Erro ao obter codFuncionario para o user", userId);
    return null;
  }

  const data = await resposta.json();
  return data.codFuncionario;
};


const criarParteDiaria = async () => {
  const painelToken = await AsyncStorage.getItem('painelAdminToken');
  const userLogado  = (await AsyncStorage.getItem('userNome')) || '';

  if (!dadosProcessados || dadosProcessados.length === 0) {
    Alert.alert('Erro', 'Não existem dados para submeter.');
    return;
  }

  try {
    for (const item of dadosProcessados) {
      try {
        const codFuncionario = await obterCodFuncionario(item.userId);
        if (!codFuncionario) {
          console.warn(`codFuncionario não encontrado para ${item.userName}`);
          continue;
        }

        // dias que este item (utilizador × obra) realmente precisa submeter
        const diasValidos = diasDoMes.filter(dia => {
          const chave = `${item.userId}-${item.obraId}-${dia}`;
          const cod = item.codFuncionario ?? codMap[item.userId];
          return (
            diasEditadosManualmente.has(chave) &&
            !itemJaSubmetido(cod, item.obraId, dia)
          );
        });

        if (diasValidos.length === 0) continue;

        // === Cabeçalho por (obra, dia) ===
        for (const dia of diasValidos) {
          // obra correta para este dia:
          let obraIdDia = item.obraId;
          const espDoDia = (item.especialidades || []).filter(e => e.dia === dia);
          const espComObra = espDoDia.find(e => e.obraId && Number(e.obraId) !== OBRA_SEM_ASSOC);

          if (espComObra) {
            obraIdDia = Number(espComObra.obraId);
          }

          // se ainda está “Sem obra” (-1) e não encontramos destino, não submetemos esse dia
          if (Number(obraIdDia) === OBRA_SEM_ASSOC) {
            console.warn(`Dia ${dia} ignorado em ${item.userName}: sem obra destino definida.`);
            continue;
          }

          const dataISO = `${mesAno.ano}-${String(mesAno.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

          // cria o cabeçalho certo para esta (obra, dia)
          const payloadCab = {
            ObraID: obraIdDia,
            Data: dataISO,
            Notas: '',
            CriadoPor: userLogado,
            Utilizador: userLogado,
            TipoEntidade: 'O',
            ColaboradorID: codFuncionario,
          };

          const respCab = await fetch('https://backend.advir.pt/api/parte-diaria/cabecalhos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${painelToken}`,
            },
            body: JSON.stringify(payloadCab),
          });

          if (!respCab.ok) {
            const err = await respCab.json().catch(() => ({}));
            console.error(`Erro ao criar cabeçalho (${item.userName}) dia ${dataISO} obra ${obraIdDia}:`, err);
            continue;
          }

          const cab = await respCab.json();

          // linhas (especialidades/equipamentos) apenas para este dia e esta obra
          const linhasDoDia = montarLinhasDoDia(item, dia, obraIdDia);
          if (linhasDoDia.length === 0) {
            console.warn(`Sem linhas para ${item.userName} em ${dataISO} (obra ${obraIdDia}).`);
            continue;
          }

          await postarItensGrupo(cab.DocumentoID, obraIdDia, dataISO, codFuncionario, linhasDoDia);
        }
      } catch (e) {
        console.error(`Erro geral com o item ${item.userName}:`, e);
      }
    }

    // ——— externos (como já fazias), mas silencioso para não duplicar alerts ———
    const haviaExternos = linhasExternos.length > 0;
    const submeteuExternos = haviaExternos ? await submeterExternosSilencioso() : false;

    setModalVisible(false);
    setDiasEditadosManualmente(new Set());

    await carregarDados();
    await carregarItensSubmetidos();

    Alert.alert('Sucesso', submeteuExternos
      ? 'Partes diárias e externos submetidos com sucesso.'
      : 'Partes diárias submetidas com sucesso.'
    );
  } catch (e) {
    console.error('Erro ao submeter partes diárias:', e);
    Alert.alert('Erro', e.message || 'Ocorreu um erro ao submeter as partes diárias.');
  }
};

// coloca isto no componente (fora de salvarEdicao)
const resolveObraId = (espObraId, trabObraId) => {
  const toNum = v => v == null ? null : Number(v);
  const cand1 = toNum(espObraId);
  if (cand1 && cand1 !== OBRA_SEM_ASSOC) return cand1;

  const cand2 = toNum(trabObraId);
  if (cand2 && cand2 !== OBRA_SEM_ASSOC) return cand2;

  // último recurso: 1ª obra da lista (se existir)
  const cand3 = obrasParaPickers?.[0]?.id;
  return cand3 != null ? Number(cand3) : null;
};


// ——— ENVIAR EXTERNOS "SILENCIOSO" (sem fechar modal nem alerts de sucesso) ———
const submeterExternosSilencioso = async () => {
  if (linhasExternos.length === 0) return false;

  try {
    const painelToken = await AsyncStorage.getItem('painelAdminToken');
    const userLogado  = (await AsyncStorage.getItem('userNome')) || '';

    // Agrupar por (obraId, dia)
    const grupos = new Map();
    for (const l of linhasExternos) {
      const dataISO = `${mesAno.ano}-${String(mesAno.mes).padStart(2,'0')}-${String(l.dia).padStart(2,'0')}`;
      const key = `${l.obraId}|${dataISO}`;
      if (!grupos.has(key)) grupos.set(key, { obraId: l.obraId, dataISO, linhas: [] });
      grupos.get(key).linhas.push(l);
    }

    for (const [, grp] of grupos.entries()) {
      // 1) cabeçalho
      const cabecalho = {
        ObraID: grp.obraId,
        Data: grp.dataISO,
        Notas: 'Parte diária de EXTERNOS',
        CriadoPor: userLogado,
        Utilizador: userLogado,
        TipoEntidade: 'O',
        ColaboradorID: null,
      };

      const respCab = await fetch('https://backend.advir.pt/api/parte-diaria/cabecalhos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${painelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cabecalho),
      });
      if (!respCab.ok) {
        const err = await respCab.json().catch(() => ({}));
        throw new Error(err?.message || 'Falha ao criar cabeçalho para externos.');
      }
      const cab = await respCab.json();

      // 2) itens
      for (let i = 0; i < grp.linhas.length; i++) {
        const l = grp.linhas[i];
        const tipoHoraId = l.horaExtra
          ? (isFimDeSemana(mesAno.ano, mesAno.mes, l.dia) ? 'H06' : 'H01')
          : null;

        const item = {
          DocumentoID: cab.DocumentoID,
          ObraID: grp.obraId,
          Data: grp.dataISO,
          Numero: i + 1,
          ColaboradorID: null,
          Funcionario: `${l.funcionario} (Externo)`,
          ClasseID: 1,
          SubEmpID: l.subEmpId ?? null,
          NumHoras: l.horasMin,
          PrecoUnit: l.valor || 0,
          categoria: l.categoria || 'MaoObra',
          TipoHoraID: tipoHoraId,
        };

        const respItem = await fetch('https://backend.advir.pt/api/parte-diaria/itens', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${painelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item),
        });
        if (!respItem.ok) {
          const err = await respItem.json().catch(() => ({}));
          throw new Error(err?.message || `Falha ao criar item externo (${l.funcionario}).`);
        }
      }
    }

    // sucesso: limpa a lista local para não submeter de novo
    setLinhasExternos([]);
    return true;
  } catch (e) {
    console.error('Erro ao submeter externos (silencioso):', e);
    Alert.alert('Erro', e.message || 'Ocorreu um erro ao submeter externos.');
    return false;
  }
};


const criarItensParaMembro = async (documentoID, item, codFuncionario, mesAno, diasValidos) => {
  const painelToken = await AsyncStorage.getItem("painelAdminToken");
  const listaDefault = item.categoria === 'MaoObra'
    ? especialidadesList
    : equipamentosList;

    const mapCategoria = (c) => (c === 'Equipamentos' ? 'Equipamentos' : 'MaoObra');

  // Declara 'linhas' antes de usar
  let linhas = [];
  if (item.especialidades.length > 0) {

    linhas = item.especialidades
  .filter(esp => diasValidos.includes(esp.dia))
  .map(esp => {
   const list = (esp.categoria === 'Equipamentos') ? equipamentosList : especialidadesList;
   const match = list.find(opt => opt.codigo === esp.especialidade) || list.find(opt => opt.descricao === esp.especialidade);
    return {
      dia: esp.dia,
      obraId: esp.obraId || item.obraId, 
      especialidade: esp.especialidade,
      categoria: mapCategoria(esp.categoria),
      horas: esp.horas,
     subEmpId: esp.subEmpId ?? match?.subEmpId ?? null,
      horaExtra: esp.horaExtra === true
    };
  });
  } else {
    linhas = diasValidos.map(dia => {
      const match = 
        listaDefault.find(opt => opt.codigo === item.especialidade)
        || listaDefault.find(opt => opt.descricao === item.especialidade);

      return {
        dia,
        especialidade: item.especialidade,
        categoria:     mapCategoria(item.categoria),
        horas:         (item.horasPorDia[dia] || 0) / 60,
        subEmpId:      match?.subEmpId ?? null,
        horaExtra:     false  
      };
    });
  }

  if (linhas.length === 0) return;

  for (let i = 0; i < linhas.length; i++) {
    const esp = linhas[i];

     if (esp.categoria === 'Equipamentos' && !esp.subEmpId) {
   console.warn(`⛔ Equipamento sem SubEmpID (ComponenteID) no dia ${esp.dia}. Linha ignorada.`);
   continue; // ou faz Alert e aborta tudo, como preferires
 }

    const minutosTotal = Math.round((esp.horas || 0) * 60);

      // ✅ H01 nos dias úteis, H06 ao fim-de-semana (se for hora extra)
  const tipoHoraId = esp.horaExtra === true
    ? (isFimDeSemana(mesAno.ano, mesAno.mes, esp.dia) ? 'H06' : 'H01')
    : null;


    const payloadItem = {
      DocumentoID:   documentoID,
      ObraID:        esp.obraId ?? item.obraId,
      Data:          `${mesAno.ano}-${String(mesAno.mes).padStart(2,'0')}-${String(esp.dia).padStart(2,'0')}`,
      Numero:        i + 1,
      ColaboradorID: codFuncionario,
      Funcionario:   String(codFuncionario),
      ClasseID:      1,
      SubEmpID:      esp.subEmpId,    // agora corretamente preenchido
      NumHoras:      minutosTotal,
      PrecoUnit:     esp.precoUnit || 0,
      categoria:     mapCategoria(esp.categoria),
      TipoHoraID:    tipoHoraId      


    };

    console.log("▶ payloadItem", payloadItem);
    try {
      const resp = await fetch("https://backend.advir.pt/api/parte-diaria/itens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${painelToken}`
        },
        body: JSON.stringify(payloadItem)
      });
      if (!resp.ok) {
        const err = await resp.json();
        console.warn(`Erro a criar item ${i+1}:`, err);
      } else {
        console.log(`✅ Item ${i+1} criado`);
      }
    } catch (e) {
      console.error(`Erro de rede item ${i+1}:`, e);
    }
  }
};



    const renderHeader = () => (
        <LinearGradient
            colors={['#1792FE', '#0B5ED7']}
            style={styles.header}
        >
            <Text style={styles.headerTitle}>Partes Diárias - Minhas Equipas</Text>
            <Text style={styles.headerSubtitle}>
                {new Date(mesAno.ano, mesAno.mes - 1).toLocaleDateString('pt-PT', { 
                    month: 'long', 
                    year: 'numeric' 
                })}
            </Text>
        </LinearGradient>
    );

    const renderControls = () => (
        <View style={styles.controlsContainer}>
            <View style={styles.monthSelector}>
                <TouchableOpacity
                    style={styles.monthButton}
                    onPress={() => {
                        const novoMes = mesAno.mes === 1 ? 12 : mesAno.mes - 1;
                        const novoAno = mesAno.mes === 1 ? mesAno.ano - 1 : mesAno.ano;
                        setMesAno({ mes: novoMes, ano: novoAno });
                    }}
                >
                    <Ionicons name="chevron-back" size={20} color="#1792FE" />
                </TouchableOpacity>
                
                <Text style={styles.monthText}>
                    {new Date(mesAno.ano, mesAno.mes - 1).toLocaleDateString('pt-PT', { 
                        month: 'long', 
                        year: 'numeric' 
                    })}
                </Text>
                
                <TouchableOpacity
                    style={styles.monthButton}
                    onPress={() => {
                        const novoMes = mesAno.mes === 12 ? 1 : mesAno.mes + 1;
                        const novoAno = mesAno.mes === 12 ? mesAno.ano + 1 : mesAno.ano;
                        setMesAno({ mes: novoMes, ano: novoAno });
                    }}
                >
                    <Ionicons name="chevron-forward" size={20} color="#1792FE" />
                </TouchableOpacity>
                <TouchableOpacity
    style={styles.actionButton}
    onPress={() => setModoVisualizacao(prev => prev === 'obra' ? 'user' : 'obra')}
>
    <LinearGradient
        colors={['#1792FE', '#0B5ED7']}
        style={styles.buttonGradient}
    >
        <FontAwesome name="exchange" size={16} color="#FFFFFF" />
        <Text style={styles.buttonText}>
            {modoVisualizacao === 'obra' ? 'Vista por Utilizador' : 'Vista por Obra'}
        </Text>
    </LinearGradient>
</TouchableOpacity>

            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setModalVisible(true)}
                >
                    <LinearGradient
                        colors={['#28a745', '#20c997']}
                        style={styles.buttonGradient}
                    >
                        <FontAwesome name="save" size={16} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Enviar Partes</Text>
                    </LinearGradient>
                </TouchableOpacity>
                 {/* NOVO BOTÃO DE ATUALIZAR */}
  <TouchableOpacity
  style={styles.actionButton}
  onPress={async () => {
    setLoading(true); // ativa o loading e barra de progresso
    setDiasEditadosManualmente(new Set()); // limpa marcações manuais (se quiseres manter)
    await carregarItensSubmetidos(); // recarrega os submetidos
    console.log('🔍 submittedSet contém:', Array.from(submittedSet).slice(0, 10));

    setLoading(false);
  }}
>
  <LinearGradient
    colors={['#007bff', '#0056b3']}
    style={styles.buttonGradient}
  >
    <Ionicons name="refresh" size={16} color="#FFFFFF" />
    <Text style={styles.buttonText}>Limpar Partes</Text>
  </LinearGradient>
</TouchableOpacity>

<TouchableOpacity
  style={styles.actionButton}
  onPress={abrirModalExternos}
>
  <LinearGradient colors={['#6f42c1', '#5b32a3']} style={styles.buttonGradient}>
    <Ionicons name="people" size={16} color="#fff" />
    <Text style={styles.buttonText}>Adicionar Externos</Text>
  </LinearGradient>
</TouchableOpacity>




            </View>
        </View>
    );

    // Memoizar dados agrupados por obra para evitar recálculos
    const dadosAgrupadosPorObra = useMemo(() => {
        return dadosProcessados.reduce((acc, item) => {
            const obraKey = item.obraId;
            if (!acc[obraKey]) {
                acc[obraKey] = {
                    obraInfo: {
                        id: item.obraId,
                        nome: item.obraNome,
                        codigo: item.obraCodigo
                    },
                    trabalhadores: []
                };
            }
            acc[obraKey].trabalhadores.push(item);
            return acc;
        }, {});
    }, [dadosProcessados]);

    const dadosAgrupadosPorUser = useMemo(() => {
    return dadosProcessados.reduce((acc, item) => {
        const userKey = item.userId;
        if (!acc[userKey]) {
            acc[userKey] = {
                userInfo: {
                    id: item.userId,
                    nome: item.userName
                },
                obras: []
            };
        }
        acc[userKey].obras.push(item);
        return acc;
    }, {});
}, [dadosProcessados]);


    const renderExternosModal = () => (
      <Modal
        animationType="slide"
        transparent
        visible={modalExternosVisible}
        onRequestClose={() => setModalExternosVisible(false)}
      >
        <View style={styles.externosModalContainer}>
          <View style={styles.externosModalContent}>
            {/* Header melhorado */}
            <LinearGradient 
              colors={['#6f42c1', '#5b32a3']} 
              style={styles.externosModalHeader}
            >
              <View style={styles.externosModalHeaderContent}>
                <View style={styles.externosModalTitleContainer}>
                  <Ionicons name="people" size={24} color="#fff" />
                  <Text style={styles.externosModalTitle}>Trabalhadores Externos</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setModalExternosVisible(false)} 
                  style={styles.externosCloseButton}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.externosModalSubtitle}>
                Adicionar registos de trabalhadores externos
              </Text>
            </LinearGradient>

            <ScrollView 
              style={styles.externosModalBody}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Card do formulário */}
              <View style={styles.externosFormCard}>
                <Text style={styles.externosFormTitle}>
                  <Ionicons name="document-text" size={16} color="#6f42c1" /> Novo Registo
                </Text>
                
                {/* Grid responsivo para campos */}
                <View style={styles.externosFormGrid}>
                  {/* Obra */}
                  <View style={styles.externosInputGroup}>
                    <Text style={styles.externosInputLabel}>
                      <Ionicons name="business" size={14} color="#666" /> Obra *
                    </Text>
                    <View style={styles.externosPickerWrapper}>
                      <Picker
                        selectedValue={linhaAtual.obraId}
                        onValueChange={(v) => setLinhaAtual(p => ({ ...p, obraId: v }))}
                        style={styles.externosPicker}
                      >
                        <Picker.Item label="— Selecionar obra —" value="" />
                        {obrasParaPickers.map(o => (
                          <Picker.Item key={o.id} label={o.nome} value={o.id} />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  {/* Dia */}
                  <View style={styles.externosInputGroup}>
                    <Text style={styles.externosInputLabel}>
                      <Ionicons name="calendar" size={14} color="#666" /> Dia *
                    </Text>
                    <View style={styles.externosPickerWrapper}>
                      <Picker
                        selectedValue={linhaAtual.dia}
                        onValueChange={(v) => setLinhaAtual(p => ({ ...p, dia: v }))}
                        style={styles.externosPicker}
                      >
                        <Picker.Item label="— Selecionar dia —" value="" />
                        {diasDoMes.map(d => (
                          <Picker.Item key={d} label={`Dia ${d}`} value={d} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>

                {/* Trabalhador Externo - campo largo */}
                <View style={styles.externosInputGroup}>
                  <Text style={styles.externosInputLabel}>
                    <Ionicons name="person" size={14} color="#666" /> Trabalhador Externo *
                  </Text>
                  <View style={styles.externosPickerWrapper}>
                    <Picker
                      selectedValue={linhaAtual.trabalhadorId}
                      onValueChange={(v) => setLinhaAtual(p => ({ ...p, trabalhadorId: v }))}
                      style={styles.externosPicker}
                    >
                      <Picker.Item label="— Selecionar trabalhador —" value="" />
                      {externosLista.map(t => (
                        <Picker.Item
                          key={t.id}
                          label={`${t.funcionario} (${t.empresa})`}
                          value={t.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Categoria com botões melhorados */}
                <View style={styles.externosInputGroup}>
                  <Text style={styles.externosInputLabel}>
                    <Ionicons name="layers" size={14} color="#666" /> Categoria *
                  </Text>
                  <View style={styles.externosCategoryButtons}>
                    {[
                      { label: 'Mão de Obra', value: 'MaoObra', icon: 'people' },
                      { label: 'Equipamentos', value: 'Equipamentos', icon: 'construct' },
                    ].map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.externosCategoryButton,
                          linhaAtual.categoria === opt.value && styles.externosCategoryButtonActive
                        ]}
                        onPress={() => setLinhaAtual(p => ({
                          ...p,
                          categoria: opt.value,
                          especialidadeCodigo: '',
                          subEmpId: null
                        }))}
                      >
                        <Ionicons 
                          name={opt.icon} 
                          size={16} 
                          color={linhaAtual.categoria === opt.value ? '#fff' : '#6f42c1'} 
                        />
                        <Text style={[
                          styles.externosCategoryButtonText,
                          linhaAtual.categoria === opt.value && styles.externosCategoryButtonTextActive
                        ]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Especialidade/Equipamento */}
                <View style={styles.externosInputGroup}>
                  <Text style={styles.externosInputLabel}>
                    <Ionicons 
                      name={linhaAtual.categoria === 'Equipamentos' ? 'construct' : 'hammer'} 
                      size={14} 
                      color="#666" 
                    /> {linhaAtual.categoria === 'Equipamentos' ? 'Equipamento' : 'Especialidade'} *
                  </Text>
                  <View style={styles.externosPickerWrapper}>
                    <Picker
                      selectedValue={linhaAtual.especialidadeCodigo}
                      onValueChange={(cod) => {
                        const lista = linhaAtual.categoria === 'Equipamentos' ? equipamentosList : especialidadesList;
                        const sel   = lista.find(x => x.codigo === cod);
                        setLinhaAtual(p => ({
                          ...p,
                          especialidadeCodigo: cod,
                          subEmpId: sel?.subEmpId ?? null
                        }));
                      }}
                      style={styles.externosPicker}
                    >
                      <Picker.Item 
                        label={`— Selecionar ${linhaAtual.categoria === 'Equipamentos' ? 'equipamento' : 'especialidade'} —`} 
                        value="" 
                      />
                      {(linhaAtual.categoria === 'Equipamentos' ? equipamentosList : especialidadesList)
                        .map(opt => (
                          <Picker.Item key={opt.codigo} label={opt.descricao} value={opt.codigo} />
                        ))
                      }
                    </Picker>
                  </View>
                </View>

                {/* Grid para Horas e Hora Extra */}
                <View style={styles.externosFormGrid}>
                  <View style={[styles.externosInputGroup, { flex: 2 }]}>
                    <Text style={styles.externosInputLabel}>
                      <Ionicons name="time" size={14} color="#666" /> Horas *
                    </Text>
                    <TextInput
                      style={styles.externosTextInput}
                      value={linhaAtual.horas}
                      onChangeText={(v) => setLinhaAtual(p => ({ ...p, horas: v }))}
                      placeholder="ex.: 8:00 ou 8.0"
                      keyboardType="default"
                    />
                  </View>

                  <View style={[styles.externosInputGroup, { flex: 1 }]}>
                    <Text style={styles.externosInputLabel}>
                      <Ionicons name="flash" size={14} color="#666" /> Extra
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.externosCheckboxContainer,
                        linhaAtual.horaExtra && styles.externosCheckboxContainerActive
                      ]}
                      onPress={() => setLinhaAtual(p => ({ ...p, horaExtra: !p.horaExtra }))}
                    >
                      <Ionicons
                        name={linhaAtual.horaExtra ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={linhaAtual.horaExtra ? '#fff' : '#6f42c1'}
                      />
                      <Text style={[
                        styles.externosCheckboxText,
                        linhaAtual.horaExtra && styles.externosCheckboxTextActive
                      ]}>
                        Sim
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Botão de adicionar */}
                <TouchableOpacity 
                  onPress={adicionarLinhaExterno} 
                  style={styles.externosAddButton}
                >
                  <LinearGradient 
                    colors={['#17a2b8', '#0ea5a3']} 
                    style={styles.externosAddButtonGradient}
                  >
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.externosAddButtonText}>Adicionar à Lista</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Lista de itens adicionados */}
              {linhasExternos.length > 0 && (
                <View style={styles.externosListCard}>
                  <Text style={styles.externosListTitle}>
                    <Ionicons name="list" size={16} color="#17a2b8" /> 
                    Itens para Submeter ({linhasExternos.length})
                  </Text>
                  
                  {linhasExternos.map(l => (
                    <View key={l.key} style={styles.externosListItem}>
                      <View style={styles.externosListItemContent}>
                        <View style={styles.externosListItemHeader}>
                          <Text style={styles.externosListItemName}>
                            {l.funcionario}
                          </Text>
                          <View style={styles.externosListItemBadge}>
                            <Text style={styles.externosListItemBadgeText}>
                              {Math.round(l.horasMin/60*100)/100}h
                            </Text>
                          </View>
                        </View>
                        
                        <Text style={styles.externosListItemDetails}>
                          <Ionicons name="business" size={12} color="#666" /> {l.empresa}
                          {' • '}
                          <Ionicons name="calendar" size={12} color="#666" /> Dia {l.dia}
                          {' • '}
                          <Ionicons name="cash" size={12} color="#666" /> {l.valor?.toFixed(2)} {l.moeda}
                          {l.horaExtra && ' • Extra'}
                        </Text>
                        
                        <Text style={styles.externosListItemCategory}>
                          {l.categoria === 'Equipamentos' ? '🔧' : '👷'} {l.especialidadeDesc || l.especialidadeCodigo}
                        </Text>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => removerLinhaExterno(l.key)}
                        style={styles.externosListItemDelete}
                      >
                        <Ionicons name="trash" size={18} color="#dc3545" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Botão de submeter */}
                  <TouchableOpacity 
                    onPress={submeterExternos} 
                    disabled={linhasExternos.length === 0} 
                    style={[
                      styles.externosSubmitButton,
                      linhasExternos.length === 0 && styles.externosSubmitButtonDisabled
                    ]}
                  >
                    <LinearGradient 
                      colors={linhasExternos.length === 0 ? ['#ccc', '#999'] : ['#6f42c1', '#5b32a3']} 
                      style={styles.externosSubmitButtonGradient}
                    >
                      <Ionicons name="cloud-upload" size={18} color="#fff" />
                      <Text style={styles.externosSubmitButtonText}>
                        Submeter {linhasExternos.length} Item{linhasExternos.length !== 1 ? 's' : ''}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );



const renderDataSheet = () => {
        if (dadosProcessados.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="calendar-blank" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>Nenhum registo encontrado para este período</Text>
                    <Text style={styles.emptySubText}>Verifique se tem equipas associadas</Text>
                </View>
            );
        }
        if (modoVisualizacao === 'obra') {
          return (
              <View style={styles.tableWrapper}>
                  <Text style={styles.tableInstructions}>
                      Toque para definir as especialidades
                  </Text>
                  <ScrollView
                      style={styles.tableContainer}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                      showsHorizontalScrollIndicator={true}
                  >
                      <ScrollView
                          horizontal
                          style={styles.horizontalScroll}
                          showsHorizontalScrollIndicator={true}
                          nestedScrollEnabled={true}
                      >
                          <View style={styles.tableContent}>
                              {/* Renderizar dados agrupados por obra */}
                              {Object.values(dadosAgrupadosPorObra).map((obraGroup, obraIndex) => (
                                  <View key={obraGroup.obraInfo.id}>
                                      {/* Cabeçalho da obra */}
                                      <View style={styles.obraHeader}>
                                          <View style={styles.obraHeaderContent}>
                                              <MaterialCommunityIcons
                                                  name="office-building"
                                                  size={20}
                                                  color="#1792FE"
                                                  style={{ marginRight: 8 }}
                                              />
                                              <Text style={styles.obraHeaderText}>
                                                  {obraGroup.obraInfo.nome}
                                              </Text>
                                              <Text style={styles.obraHeaderCode}>
                                                  ({obraGroup.obraInfo.codigo})
                                              </Text>
                                          </View>
                                          <View style={styles.obraStats}>
                                              <Text style={styles.obraStatsText}>
                                                  {obraGroup.trabalhadores.length} trabalhador{obraGroup.trabalhadores.length !== 1 ? 'es' : ''}
                                              </Text>
                                              <Text style={styles.obraStatsText}>
                                                   Total: {formatarHorasMinutos(obraGroup.trabalhadores.reduce((total, trab) => {
   return total + diasDoMes.reduce((trabTotal, dia) =>
     trabTotal + getMinutosCell(trab, dia), 0
   );
 }, 0))}
                                              </Text>
                                          </View>
                                      </View>

                                      {/* Cabeçalho dos dias para esta obra */}
                                      <View style={styles.obraDaysHeader}>
                                          <View style={[styles.tableCell, { width: 120 }]}>
                                              <Text style={styles.obraDaysHeaderText}>Trabalhador</Text>
                                          </View>

                                          {diasDoMes.map(dia => (
                                              <View key={dia} style={[styles.tableCell, { width: 50 }]}>
                                                  <Text style={styles.obraDaysHeaderText}>{dia}</Text>
                                              </View>
                                          ))}
                                          <View style={[styles.tableCell, { width: 70 }]}>
                                              <Text style={styles.obraDaysHeaderText}>Total</Text>
                                          </View>
                                      </View>

                                      {/* Trabalhadores da obra */}
                                      {obraGroup.trabalhadores.map((item, trabIndex) => (
                                          <View key={`${item.userId}-${item.obraId}`} style={[
                                              styles.tableRow,
                                              trabIndex % 2 === 0 ? styles.evenRow : styles.oddRow,
                                              styles.trabalhadoresRow
                                          ]}>
                                              <View style={[styles.tableCell, { width: 120 }]}>
                                                  <Text style={styles.cellText} numberOfLines={1}>
                                                      {item.userName}
                                                  </Text>
                                              </View>

                                              {diasDoMes.map(dia => {
                                                  const cellKey = `${item.userId}-${item.obraId}-${dia}`;
                                                  const editadoManual = diasEditadosManualmente.has(cellKey);
                                                  const submetido = itemJaSubmetido(item.codFuncionario, item.obraId, dia);

                                                  return (
                                                     <View key={`${cellKey}`} style={[styles.tableCell, { width: 50 }, submetido && styles.cellSubmetido, editadoManual && styles.cellEditado]}>
                                                       <TouchableOpacity
                                                         style={[styles.cellTouchable, submetido && styles.cellSubmetido, submetido && { opacity: 0.6 }]}
                                                         disabled={submetido}
                                                         onPress={submetido ? undefined : () => abrirEdicao(item, dia)}
                                                       >
                                                          {(() => {
                                                               const mins = getMinutosCell(item, dia);
                                                               return (
                                                                 <Text style={[
                                                                   styles.cellText,
                                                                   { textAlign: 'center' },
                                                                   mins > 0 && styles.hoursText,
                                                                   styles.clickableHours
                                                                 ]}>
                                                                   { mins > 0 ? formatarHorasMinutos(mins) : '-' }
                                                                 </Text>
                                                               );
                                                             })()}
                                                         {submetido && (
                                                           <Ionicons
                                                             name="checkmark-circle"
                                                             size={16}
                                                             color="#28a745"
                                                             style={styles.iconSubmetido}
                                                           />
                                                         )}
                                                       </TouchableOpacity>
                                                     </View>
                                                   );
                                              })}
                                              <View style={[styles.tableCell, { width: 70 }]}>
                                                  <Text style={[styles.cellText, styles.totalText, { textAlign: 'center' }]}>
                                                       {formatarHorasMinutos(diasDoMes.reduce((total, dia) =>
   total + getMinutosCell(item, dia), 0))}
                                                  </Text>
                                              </View>
                                          </View>
                                      ))}
                                        {/* 🔹 EXTERNOS (SUBMETIDOS) – vindos do servidor */}
{(() => {
  const extMapSub = externosSubmetidosPorObraPessoa.get(obraGroup.obraInfo.id);
  if (!extMapSub || extMapSub.size === 0) return null;

  return [...extMapSub.values()].map((row) => (
    <View
      key={`ext-sub-${obraGroup.obraInfo.id}-${row.funcionario}`}
      style={[styles.tableRow, styles.externoSubmetidoRow]}
    >
      {/* Coluna do nome */}
      <View style={[styles.tableCell, { width: 120 }]}>
        <Text style={[styles.cellText, { fontWeight: '700' }]}>
          {row.funcionario} <Text style={{ fontWeight: '400' }}>(Externo)</Text>
        </Text>
        <Text style={styles.cellSubText}>✓ submetido</Text>
      </View>

      {/* Colunas dos dias */}
      {diasDoMes.map((dia) => (
        <View
          key={`ext-sub-${obraGroup.obraInfo.id}-${row.funcionario}-${dia}`}
          style={[styles.tableCell, { width: 50 }]}
        >
          <Text
            style={[
              styles.cellText,
              { textAlign: 'center' },
              row.horasPorDia[dia] > 0 && styles.hoursText,
            ]}
          >
            {row.horasPorDia[dia] > 0 ? formatarHorasMinutos(row.horasPorDia[dia]) : '-'}
          </Text>
        </View>
      ))}

      {/* Total */}
      <View style={[styles.tableCell, { width: 70 }]}>
        <Text style={[styles.cellText, styles.totalText, { textAlign: 'center' }]}>
          {formatarHorasMinutos(row.totalMin)}
        </Text>
      </View>
    </View>
  ));
})()}

                                      {/* 🔹 LINHA AGREGADA DE EXTERNOS POR OBRA (se existir) */}
                                      {(() => {
  const extMap = externosPorObraPessoa.get(obraGroup.obraInfo.id);
  if (!extMap || extMap.size === 0) return null;

  return [...extMap.values()].map((row) => (
    <View
      key={`ext-${obraGroup.obraInfo.id}-${row.trabalhadorId}`}
      style={[styles.tableRow, styles.externoResumoRow]}
    >
      {/* Coluna do nome */}
      <View style={[styles.tableCell, { width: 120 }]}>
        <Text style={[styles.cellText, { fontWeight: '700' }]}>
          {row.funcionario} <Text style={{ fontWeight: '400' }}>(Externo)</Text>
        </Text>
        {!!row.empresa && (
          <Text style={styles.cellSubText}>{row.empresa}</Text>
        )}
      </View>

      {/* Colunas dos dias */}
      {diasDoMes.map((dia) => (
        <View
          key={`ext-${obraGroup.obraInfo.id}-${row.trabalhadorId}-${dia}`}
          style={[styles.tableCell, { width: 50 }]}
        >
          <Text
            style={[
              styles.cellText,
              { textAlign: 'center' },
              row.horasPorDia[dia] > 0 && styles.hoursText,
            ]}
          >
            {row.horasPorDia[dia] > 0 ? formatarHorasMinutos(row.horasPorDia[dia]) : '-'}
          </Text>
        </View>
      ))}

      {/* Total */}
      <View style={[styles.tableCell, { width: 70 }]}>
        <Text style={[styles.cellText, styles.totalText, { textAlign: 'center' }]}>
          {formatarHorasMinutos(row.totalMin)}
        </Text>
      </View>
    </View>
  ));
})()}


                                      {/* Separador entre obras */}
                                      {obraIndex < Object.values(dadosAgrupadosPorObra).length - 1 && (
                                          <View style={styles.obraSeparator} />
                                      )}
                                  </View>
                              ))}
                          </View>
                      </ScrollView>
                  </ScrollView>
              </View>
          );
        } else {
          return (
              // Vista por utilizador
              <ScrollView style={styles.tableContainer}>
                  <ScrollView horizontal style={styles.horizontalScroll}>
                      <View style={styles.tableContent}>
                          {Object.values(dadosAgrupadosPorUser).map((userGroup, userIndex) => (
                              <View key={userGroup.userInfo.id}>
                                  <View style={styles.obraHeader}>
                                      <Text style={styles.obraHeaderText}>
                                          {userGroup.userInfo.nome}
                                      </Text>
                                  </View>

                                  <View style={styles.obraDaysHeader}>
                                      <View style={[styles.tableCell, { width: 120 }]}>
                                          <Text style={styles.obraDaysHeaderText}>Obra</Text>
                                      </View>
                                      {diasDoMes.map(dia => (
                                          <View key={dia} style={[styles.tableCell, { width: 50 }]}>
                                              <Text style={styles.obraDaysHeaderText}>{dia}</Text>
                                          </View>
                                      ))}
                                      <View style={[styles.tableCell, { width: 70 }]}>
                                          <Text style={styles.obraDaysHeaderText}>Total</Text>
                                      </View>
                                  </View>

                                  {userGroup.obras.map((item, obraIndex) => (
                                      <View key={`${item.userId}-${item.obraId}`} style={[
                                          styles.tableRow,
                                          obraIndex % 2 === 0 ? styles.evenRow : styles.oddRow,
                                          styles.trabalhadoresRow
                                      ]}>
                                          <View style={[styles.tableCell, { width: 120 }]}>
                                              <Text style={styles.cellText}>
                                                  {item.obraNome}
                                              </Text>
                                          </View>
                                          {diasDoMes.map(dia => {
                                            const cellKey = `${item.userId}-${item.obraId}-${dia}`;
                                            const submetido = itemJaSubmetido(item.codFuncionario, item.obraId, dia);
                                            const editadoManual = diasEditadosManualmente.has(cellKey);

                                            return (
                                               <View key={`${cellKey}`} style={[styles.tableCell, { width: 50 }, submetido && styles.cellSubmetido, editadoManual && styles.cellEditado]}>
                                                 <TouchableOpacity
                                                   style={[styles.cellTouchable, submetido && styles.cellSubmetido, submetido && { opacity: 0.6 }]}
                                                   disabled={submetido}
                                                   onPress={submetido ? undefined : () => abrirEdicao(item, dia)}
                                                 >
                                                    {(() => {
   const mins = getMinutosCell(item, dia);
   return (
     <Text style={[
       styles.cellText,
       { textAlign: 'center' },
       mins > 0 && styles.hoursText,
       styles.clickableHours
     ]}>
       { mins > 0 ? formatarHorasMinutos(mins) : '-' }
     </Text>
   );
 })()}
                                                   {submetido && (
                                                     <Ionicons
                                                       name="checkmark-circle"
                                                       size={16}
                                                       color="#28a745"
                                                       style={styles.iconSubmetido}
                                                     />
                                                   )}
                                                 </TouchableOpacity>
                                               </View>
                                             );
                                          })}

                                          <View style={[styles.tableCell, { width: 70 }]}>
                                              <Text style={[styles.cellText, styles.totalText, { textAlign: 'center' }]}>
                                                  {formatarHorasMinutos(
                                                        diasDoMes.reduce((acc, dia) => {
                                                            return acc + userGroup.obras.reduce((accObra, item) => accObra + getMinutosCell(item, dia), 0);
                                                        }, 0)
                                                        )}
                                              </Text>
                                          </View>
                                      </View>
                                  ))}

                                  {/* Linha de total por dia para este utilizador */}
<View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
  <View style={[styles.tableCell, { width: 120 }]}>
    <Text style={[styles.cellText, { fontWeight: 'bold', color: '#000' }]}>
      Total
    </Text>
  </View>

  {diasDoMes.map((dia) => {
    const totalMinutosDia = userGroup.obras.reduce((acc, obraItem) => {
      return acc + getMinutosCell(obraItem, dia);
    }, 0);

    return (
      <View
        key={`total-${userGroup.userInfo.id}-${dia}`}
        style={[styles.tableCell, { width: 50 }]}
      >
        <Text
          style={[
            styles.cellText,
            { fontWeight: '600', color: '#333', textAlign: 'center' },
          ]}
        >
          {formatarHorasMinutos(totalMinutosDia)}
        </Text>
      </View>
    );
  })}

  <View style={[styles.tableCell, { width: 70 }]}>
    <Text
      style={[
        styles.cellText,
        { fontWeight: '700', textAlign: 'center', color: '#1792FE' },
      ]}
    >
      {formatarHorasMinutos(
        diasDoMes.reduce((acc, dia) => {
          return (
            acc +
            userGroup.obras.reduce(
              (accObra, item) => accObra + getMinutosCell(item, dia),
              0
            )
          );
        }, 0)
      )}
    </Text>
  </View>
</View>

                                  
                              </View>
                          ))}
                            {/* === EXTERNOS na vista por UTILIZADOR === */}
{externosAgrupadosPorPessoa.length > 0 && (
  <>
    <View style={[styles.obraHeader, { marginTop: 10 }]}>
    </View>

    {externosAgrupadosPorPessoa.map((ext, idx) => (
      <View key={`extuser-${idx}`}>
        {/* Cabeçalho do "utilizador externo" */}
        <View style={styles.obraHeader}>
          <View style={styles.obraHeaderContent}>
            <Text style={styles.obraHeaderText}>
              {ext.nome} <Text style={{ fontWeight: 'normal' }}>(Externo)</Text>
            </Text>
            {!!ext.empresa && (
              <Text style={styles.obraHeaderCode}> · {ext.empresa}</Text>
            )}
          </View>
        </View>

        {/* Cabeçalho dos dias */}
        <View style={styles.obraDaysHeader}>
          <View style={[styles.tableCell, { width: 120 }]}>
            <Text style={styles.obraDaysHeaderText}>Obra</Text>
          </View>
          {diasDoMes.map(dia => (
            <View key={dia} style={[styles.tableCell, { width: 50 }]}>
              <Text style={styles.obraDaysHeaderText}>{dia}</Text>
            </View>
          ))}
          <View style={[styles.tableCell, { width: 70 }]}>
            <Text style={styles.obraDaysHeaderText}>Total</Text>
          </View>
        </View>

        {/* Linhas (obras) para este externo */}
        {ext.obras.map((obraItem, obraIndex) => (
          <View
            key={`extuser-${idx}-${obraItem.obraId}`}
            style={[
              styles.tableRow,
              obraIndex % 2 === 0 ? styles.evenRow : styles.oddRow,
              styles.trabalhadoresRow,
            ]}
          >
            <View style={[styles.tableCell, { width: 120 }]}>
              <Text style={styles.cellText}>{obraItem.obraNome}</Text>
            </View>

            {diasDoMes.map(dia => (
              <View key={`extuser-${idx}-${obraItem.obraId}-${dia}`} style={[styles.tableCell, { width: 50 }]}>
                <Text style={[
                  styles.cellText,
                  { textAlign: 'center' },
                  obraItem.horasPorDia[dia] > 0 && styles.hoursText,
                ]}>
                  {obraItem.horasPorDia[dia] > 0 ? formatarHorasMinutos(obraItem.horasPorDia[dia]) : '-'}
                </Text>
              </View>
            ))}

            <View style={[styles.tableCell, { width: 70 }]}>
              <Text style={[styles.cellText, styles.totalText, { textAlign: 'center' }]}>
                {formatarHorasMinutos(obraItem.totalMin)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    ))}
  </>
)}
                      </View>
                    

                  </ScrollView>
              </ScrollView>
          );
        }
    };

    const renderConfirmModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Confirmar Geração</Text>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalBody}>
                        <Text style={styles.confirmText}>
                            Pretende gerar as partes diárias os registos de ponto que mapeou as respetivas tarefas?
                        </Text>
                        
                  

                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.confirmButton, styles.submitButton]}
                                onPress={criarParteDiaria}
                            >
                                <LinearGradient
                                    colors={['#1792FE', '#1792FE']}
                                    style={styles.buttonGradient}
                                >
                                    <FontAwesome name="save" size={16} color="#FFFFFF" />
                                    <Text style={styles.buttonText}>Confirmar</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderEditModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={editModalVisible}
            onRequestClose={() => setEditModalVisible(false)}
        >
            <View style={styles.editModalContainer}>
                <View style={styles.editModalContent}>
                    {/* Header melhorado */}
                    <LinearGradient 
                        colors={['#1792FE', '#0B5ED7']} 
                        style={styles.editModalHeader}
                    >
                        <View style={styles.editModalHeaderContent}>
                            <View style={styles.editModalTitleContainer}>
                                <Ionicons name="construct" size={24} color="#fff" />
                                <Text style={styles.editModalTitle}>Editar Especialidades</Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => setEditModalVisible(false)} 
                                style={styles.editCloseButton}
                            >
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.editModalSubtitle}>
                            Defina as especialidades e horas por obra
                        </Text>
                    </LinearGradient>

                    <ScrollView 
                        style={styles.editModalBody}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
                        {/* Card de informações do trabalhador */}
                        {selectedTrabalhador && (
                            <View style={styles.editInfoCard}>
                                <Text style={styles.editInfoTitle}>
                                    <Ionicons name="person" size={16} color="#1792FE" /> Informações do Registo
                                </Text>
                                
                                <View style={styles.editInfoGrid}>
                                    <View style={styles.editInfoItem}>
                                        <Text style={styles.editInfoLabel}>
                                            <Ionicons name="person-circle" size={14} color="#666" /> Trabalhador
                                        </Text>
                                        <Text style={styles.editInfoValue}>{selectedTrabalhador.userName}</Text>
                                    </View>
                                    
                                    <View style={styles.editInfoItem}>
                                        <Text style={styles.editInfoLabel}>
                                            <Ionicons name="business" size={14} color="#666" /> Obra Principal
                                        </Text>
                                        <Text style={styles.editInfoValue}>{selectedTrabalhador.obraNome}</Text>
                                    </View>
                                </View>

                                <View style={styles.editInfoGrid}>
                                    <View style={styles.editInfoItem}>
                                        <Text style={styles.editInfoLabel}>
                                            <Ionicons name="time" size={14} color="#666" /> Horas de Ponto
                                        </Text>
                                        <Text style={[styles.editInfoValue, { color: '#17a2b8' }]}>
                                            {formatarHorasMinutos(selectedTrabalhador.horasOriginais[selectedDia] || 0)}
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.editInfoItem}>
                                        <Text style={styles.editInfoLabel}>
                                            <Ionicons name="clipboard" size={14} color="#666" /> Para Parte Diária
                                        </Text>
                                        <Text style={[styles.editInfoValue, { color: '#28a745' }]}>
                                            {formatarHorasMinutos(selectedTrabalhador.horasPorDia[selectedDia] || 0)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.editInfoFooter}>
                                    <Text style={styles.editInfoSubText}>
                                        <Ionicons 
                                            name={selectedTrabalhador.horasPorDia[selectedDia] > 0 ? 'checkmark-circle' : 'add-circle'} 
                                            size={12} 
                                            color={selectedTrabalhador.horasPorDia[selectedDia] > 0 ? '#1792FE' : '#1792FE'} 
                                        />
                                        {' '}
                                        {selectedTrabalhador.horasPorDia[selectedDia] > 0 
                                            ? 'Baseado em registo de ponto' 
                                            : 'Adição manual de horas'
                                        }
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Card das especialidades */}
                        <View style={styles.editSpecialitiesCard}>
                            <View style={styles.editSpecialitiesHeader}>
                                <Text style={styles.editSpecialitiesTitle}>
                                    <Ionicons name="layers" size={16} color="#1792FE" /> Especialidades do Dia {selectedDia}
                                </Text>
                                <TouchableOpacity
                                    style={styles.editAddButton}
                                    onPress={adicionarEspecialidade}
                                >
                                    <LinearGradient
                                        colors={['#1792FE', '#1792FE']}
                                        style={styles.editAddButtonGradient}
                                    >
                                        <Ionicons name="add-circle" size={18} color="#fff" />
                                        <Text style={styles.editAddButtonText}>Adicionar</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            {editData.especialidadesDia?.map((espItem, index) => (
                                <View key={index} style={styles.editSpecialityItem}>
                                    {/* Header do item com número e botão remover */}
                                    <View style={styles.editSpecialityHeader}>
                                        <Text style={styles.editSpecialityNumber}>
                                            <Ionicons name="hammer" size={14} color="#1792FE" /> Especialidade {index + 1}
                                        </Text>
                                        <View style={styles.editSpecialityActions}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.editHoraExtraButton,
                                                    espItem.horaExtra && styles.editHoraExtraButtonActive
                                                ]}
                                                onPress={() => atualizarEspecialidade(index, 'horaExtra', !espItem.horaExtra)}
                                            >
                                                <Ionicons
                                                    name={espItem.horaExtra ? 'flash' : 'flash-outline'}
                                                    size={16}
                                                    color={espItem.horaExtra ? '#1792FE' : '#1792FE'}
                                                />
                                                <Text style={[
                                                    styles.editHoraExtraText,
                                                    espItem.horaExtra && styles.editHoraExtraTextActive
                                                ]}>
                                                    Extra
                                                </Text>
                                            </TouchableOpacity>
                                            
                                            {editData.especialidadesDia.length > 1 && (
                                                <TouchableOpacity
                                                    style={styles.editRemoveButton}
                                                    onPress={() => removerEspecialidade(index)}
                                                >
                                                    <Ionicons name="trash" size={18} color="#1792FE" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>

                                    {/* Grid dos campos principais */}
                                    <View style={styles.editSpecialityGrid}>
                                        {/* Obra destino */}
                                        <View style={styles.editInputGroup}>
                                            <Text style={styles.editInputLabel}>
                                                <Ionicons name="business" size={14} color="#666" /> Obra Destino
                                            </Text>
                                            <View style={styles.editPickerWrapper}>
                                                <Picker
                                                    selectedValue={espItem.obraId ?? selectedTrabalhador.obraId}
                                                    onValueChange={(v) => atualizarEspecialidade(index, 'obraId', v)}
                                                    style={styles.editPicker}
                                                >
                                                    {obrasParaPickers.map(o => (
                                                        <Picker.Item key={o.id} label={o.nome} value={o.id} />
                                                    ))}
                                                </Picker>
                                            </View>
                                        </View>

                                        {/* Horas */}
                                        <View style={[styles.editInputGroup, { flex: 0.6 }]}>
                                            <Text style={styles.editInputLabel}>
                                                <Ionicons name="time" size={14} color="#666" /> Horas
                                            </Text>
                                            <TextInput
                                                style={styles.editTextInput}
                                                value={(() => {
                                                    const totalMinutos = Math.round((espItem.horas || 0) * 60);
                                                    const horas = Math.floor(totalMinutos / 60);
                                                    const mins = totalMinutos % 60;
                                                    return totalMinutos > 0 ? `${horas}:${mins.toString().padStart(2, '0')}` : '';
                                                })()}
                                                onChangeText={(value) => {
                                                    if (value === '') {
                                                        atualizarEspecialidade(index, 'horas', 0);
                                                        return;
                                                    }
                                                    
                                                    let minutos = 0;
                                                    
                                                    if (value.includes(':')) {
                                                        const [h, m] = value.split(':');
                                                        const horas = parseInt(h) || 0;
                                                        const mins = parseInt(m) || 0;
                                                        minutos = (horas * 60) + mins;
                                                    } else {
                                                        const horas = parseFloat(value) || 0;
                                                        minutos = Math.round(horas * 60);
                                                    }
                                                    
                                                    const horasDecimais = minutos / 60;
                                                    atualizarEspecialidade(index, 'horas', horasDecimais);
                                                }}
                                                placeholder="8:00"
                                                keyboardType="default"
                                            />
                                        </View>
                                    </View>

                                    {/* Categoria com botões melhorados */}
                                    <View style={styles.editInputGroup}>
                                        <Text style={styles.editInputLabel}>
                                            <Ionicons name="layers" size={14} color="#666" /> Categoria
                                        </Text>
                                        <View style={styles.editCategoryButtons}>
                                            {categorias.map((cat) => (
                                                <TouchableOpacity
                                                    key={cat.value}
                                                    style={[
                                                        styles.editCategoryButton,
                                                        espItem.categoria === cat.value && styles.editCategoryButtonActive
                                                    ]}
                                                    onPress={() => atualizarEspecialidade(index, 'categoria', cat.value)}
                                                >
                                                    <Ionicons 
                                                        name={cat.value === 'Equipamentos' ? 'construct' : 'people'} 
                                                        size={16} 
                                                        color={espItem.categoria === cat.value ? '#fff' : '#1792FE'} 
                                                    />
                                                    <Text style={[
                                                        styles.editCategoryButtonText,
                                                        espItem.categoria === cat.value && styles.editCategoryButtonTextActive
                                                    ]}>
                                                        {cat.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    {/* Especialidade/Equipamento */}
                                    <View style={styles.editInputGroup}>
                                        <Text style={styles.editInputLabel}>
                                            <Ionicons 
                                                name={espItem.categoria === 'Equipamentos' ? 'construct' : 'hammer'} 
                                                size={14} 
                                                color="#666" 
                                            />
                                            {' '}
                                            {espItem.categoria === 'Equipamentos' ? 'Equipamento' : 'Especialidade'}
                                        </Text>
                                        <View style={styles.editPickerWrapper}>
                                            <Picker
                                                selectedValue={espItem.especialidade}
                                                onValueChange={(valor) => selecionarOpcaoEspecialidade(index, valor)}
                                                style={styles.editPicker}
                                            >
                                                <Picker.Item 
                                                    label={`— Selecionar ${espItem.categoria === 'Equipamentos' ? 'equipamento' : 'especialidade'} —`} 
                                                    value="" 
                                                    enabled={false} 
                                                    color="#999" 
                                                />
                                                {(espItem.categoria === "MaoObra" ? especialidadesList : equipamentosList).map((opt) => (
                                                    <Picker.Item key={opt.codigo} label={opt.descricao} value={opt.codigo} />
                                                ))}
                                            </Picker>
                                        </View>
                                    </View>
                                </View>
                            ))}

                            {/* Resumo das horas */}
                            <View style={styles.editHoursSummary}>
                                <View style={styles.editHoursSummaryContent}>
                                    <Text style={styles.editHoursSummaryLabel}>Resumo das Horas</Text>
                                    <View style={styles.editHoursSummaryValues}>
                                        <Text style={styles.editHoursSummaryText}>
                                            <Ionicons name="calculator" size={14} color="#1792FE" /> 
                                            Total Distribuído: <Text style={{ fontWeight: 'bold', color: '#1792FE' }}>
                                                {formatarHorasMinutos(editData.especialidadesDia?.reduce((sum, esp) => {
                                                    const horas = parseFloat(esp.horas) || 0;
                                                    return sum + Math.round(horas * 60);
                                                }, 0))}
                                            </Text>
                                        </Text>
                                        <Text style={styles.editHoursSummaryText}>
                                            <Ionicons name="time" size={14} color="#28a745" /> 
                                            Horas Trabalhadas: <Text style={{ fontWeight: 'bold', color: '#28a745' }}>
                                                {formatarHorasMinutos(selectedTrabalhador?.horasPorDia[selectedDia] || 0)}
                                            </Text>
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Botão de guardar */}
                        <TouchableOpacity
                            style={styles.editSubmitButton}
                            onPress={salvarEdicao}
                        >
                            <LinearGradient
                                colors={['#1792FE', '#0B5ED7']}
                                style={styles.editSubmitButtonGradient}
                            >
                                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                <Text style={styles.editSubmitButtonText}>Guardar Alterações</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1792FE" />
                <Text style={styles.loadingText}>A carregar partes diárias...</Text>
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${loadingProgress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{Math.round(loadingProgress)}%</Text>
                </View>
            </View>
        );
    }

 return (
  <LinearGradient
    colors={['#e3f2fd', '#bbdefb', '#90caf9']}
    style={{ flex: 1 }}
  >
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        {renderHeader()}
        {renderControls()}
        {renderDataSheet()}
        {renderConfirmModal()}
        {renderEditModal()}
        {renderExternosModal()}

      </ScrollView>
    </SafeAreaView>
  </LinearGradient>
);


};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    cellEditado: {
  backgroundColor: '#fff3cd', // amarelo claro
},
externoSubmetidoRow: {
  backgroundColor: '#eefaf0', // verde muito claro
},
externoLinha: {
  backgroundColor: '#f8f9fa',
  borderWidth: 1,
  borderColor: '#e0e0e0',
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 10,
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
},

// Novos estilos para o modal de externos melhorado
externosModalContainer: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 10,
},

externosModalContent: {
  backgroundColor: '#FFFFFF',
  width: '100%',
  maxWidth: 800,
  maxHeight: '90%',
  borderRadius: 20,
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
  overflow: 'hidden',
},

externosModalHeader: {
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 15,
},

externosModalHeaderContent: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},

externosModalTitleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

externosModalTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#fff',
},

externosModalSubtitle: {
  fontSize: 14,
  color: 'rgba(255,255,255,0.9)',
  marginTop: 5,
},

externosCloseButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.2)',
  alignItems: 'center',
  justifyContent: 'center',
},

externosModalBody: {
  flex: 1,
  paddingHorizontal: 20,
  paddingTop: 15,
},

externosFormCard: {
  backgroundColor: '#f8f9fa',
  borderRadius: 16,
  padding: 20,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: '#e9ecef',
},

externosFormTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#333',
  marginBottom: 20,
  textAlign: 'center',
},

externosFormGrid: {
  flexDirection: 'row',
  gap: 12,
  marginBottom: 16,
},

externosInputGroup: {
  flex: 1,
  marginBottom: 16,
},

externosInputLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#495057',
  marginBottom: 8,
  flexDirection: 'row',
  alignItems: 'center',
},

externosPickerWrapper: {
  backgroundColor: '#fff',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#dee2e6',
  elevation: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
},

externosPicker: {
  height: 50,
  paddingHorizontal: 12,
},

externosTextInput: {
  backgroundColor: '#fff',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#dee2e6',
  paddingHorizontal: 15,
  paddingVertical: 12,
  fontSize: 16,
  elevation: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
},

externosCategoryButtons: {
  flexDirection: 'row',
  gap: 10,
},

externosCategoryButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#6f42c1',
  backgroundColor: '#fff',
  gap: 8,
},

externosCategoryButtonActive: {
  backgroundColor: '#6f42c1',
  borderColor: '#6f42c1',
},

externosCategoryButtonText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#6f42c1',
},

externosCategoryButtonTextActive: {
  color: '#fff',
},

externosCheckboxContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#6f42c1',
  backgroundColor: '#fff',
  gap: 8,
},

externosCheckboxContainerActive: {
  backgroundColor: '#6f42c1',
  borderColor: '#6f42c1',
},

externosCheckboxText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#6f42c1',
},

externosCheckboxTextActive: {
  color: '#fff',
},

externosAddButton: {
  borderRadius: 12,
  overflow: 'hidden',
  marginTop: 10,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
},

externosAddButtonGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 14,
  paddingHorizontal: 20,
  gap: 8,
},

externosAddButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '700',
},

externosListCard: {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 20,
  borderWidth: 1,
  borderColor: '#e9ecef',
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},

externosListTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#333',
  marginBottom: 15,
  textAlign: 'center',
},

externosListItem: {
  flexDirection: 'row',
  backgroundColor: '#f8f9fa',
  borderRadius: 12,
  padding: 15,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#e9ecef',
  alignItems: 'center',
},

externosListItemContent: {
  flex: 1,
},

externosListItemHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
},

externosListItemName: {
  fontSize: 16,
  fontWeight: '700',
  color: '#333',
  flex: 1,
},

externosListItemBadge: {
  backgroundColor: '#17a2b8',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
},

externosListItemBadgeText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '700',
},

externosListItemDetails: {
  fontSize: 13,
  color: '#666',
  marginBottom: 4,
  lineHeight: 18,
},

externosListItemCategory: {
  fontSize: 12,
  color: '#495057',
  fontStyle: 'italic',
},

externosListItemDelete: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#fff',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 10,
  elevation: 2,
  shadowColor: '#dc3545',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
},

externosSubmitButton: {
  borderRadius: 12,
  overflow: 'hidden',
  marginTop: 15,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
},

externosSubmitButtonDisabled: {
  elevation: 0,
  shadowOpacity: 0,
},

externosSubmitButtonGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 16,
  paddingHorizontal: 20,
  gap: 10,
},

externosSubmitButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '700',
},

// Estilos para o modal de editar especialidade melhorado
editModalContainer: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 10,
},

editModalContent: {
  backgroundColor: '#FFFFFF',
  width: '100%',
  maxWidth: 900,
  maxHeight: '90%',
  borderRadius: 20,
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
  overflow: 'hidden',
},

editModalHeader: {
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 15,
},

editModalHeaderContent: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},

editModalTitleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

editModalTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#fff',
},

editModalSubtitle: {
  fontSize: 14,
  color: 'rgba(255,255,255,0.9)',
  marginTop: 5,
},

editCloseButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.2)',
  alignItems: 'center',
  justifyContent: 'center',
},

editModalBody: {
  flex: 1,
  paddingHorizontal: 20,
  paddingTop: 15,
},

editInfoCard: {
  backgroundColor: '#f8f9fa',
  borderRadius: 16,
  padding: 20,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: '#e9ecef',
},

editInfoTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#333',
  marginBottom: 15,
  textAlign: 'center',
},

editInfoGrid: {
  flexDirection: 'row',
  gap: 15,
  marginBottom: 12,
},

editInfoItem: {
  flex: 1,
},

editInfoLabel: {
  fontSize: 12,
  fontWeight: '600',
  color: '#666',
  marginBottom: 4,
},

editInfoValue: {
  fontSize: 14,
  fontWeight: '600',
  color: '#333',
},

editInfoFooter: {
  marginTop: 10,
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: '#e9ecef',
},

editInfoSubText: {
  fontSize: 12,
  color: '#666',
  textAlign: 'center',
  fontStyle: 'italic',
},

editSpecialitiesCard: {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 20,
  borderWidth: 1,
  borderColor: '#e9ecef',
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},

editSpecialitiesHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
},

editSpecialitiesTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#333',
  flex: 1,
},

editAddButton: {
  borderRadius: 12,
  overflow: 'hidden',
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
},

editAddButtonGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 10,
  paddingHorizontal: 16,
  gap: 6,
},

editAddButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '700',
},

editSpecialityItem: {
  backgroundColor: '#f8f9fa',
  borderRadius: 12,
  padding: 16,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: '#e9ecef',
},

editSpecialityHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 15,
},

editSpecialityNumber: {
  fontSize: 14,
  fontWeight: '700',
  color: '#333',
  flex: 1,
},

editSpecialityActions: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

editHoraExtraButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#fff',
  backgroundColor: '#fff',
  gap: 4,
},

editHoraExtraButtonActive: {
  backgroundColor: '#1792FE',
  borderColor: '#1792FE',
},

editHoraExtraText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#1792FE',
},

editHoraExtraTextActive: {
  color: '#fff',
},

editRemoveButton: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: '#fff',
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 1,
  shadowColor: '#dc3545',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
  borderWidth: 1,
  borderColor: '#dc3545',
},

editSpecialityGrid: {
  flexDirection: 'row',
  gap: 12,
  marginBottom: 16,
},

editInputGroup: {
  flex: 1,
  marginBottom: 16,
},

editInputLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#495057',
  marginBottom: 8,
},

editPickerWrapper: {
  backgroundColor: '#fff',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#dee2e6',
  elevation: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
},

editPicker: {
  height: 50,
  paddingHorizontal: 12,
},

editTextInput: {
  backgroundColor: '#fff',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#dee2e6',
  paddingHorizontal: 15,
  paddingVertical: 12,
  fontSize: 16,
  elevation: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
},

editCategoryButtons: {
  flexDirection: 'row',
  gap: 10,
},

editCategoryButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#1792FE',
  backgroundColor: '#fff',
  gap: 8,
},

editCategoryButtonActive: {
  backgroundColor: '#1792FE',
  borderColor: '#1792FE',
},

editCategoryButtonText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#1792FE',
},

editCategoryButtonTextActive: {
  color: '#fff',
},

editHoursSummary: {
  backgroundColor: '#e3f2fd',
  borderRadius: 12,
  padding: 16,
  marginTop: 10,
  borderWidth: 1,
  borderColor: '#1792FE',
},

editHoursSummaryContent: {
  alignItems: 'center',
},

editHoursSummaryLabel: {
  fontSize: 14,
  fontWeight: '700',
  color: '#1792FE',
  marginBottom: 10,
},

editHoursSummaryValues: {
  alignItems: 'center',
  gap: 6,
},

editHoursSummaryText: {
  fontSize: 13,
  color: '#666',
  textAlign: 'center',
},

editSubmitButton: {
  borderRadius: 12,
  overflow: 'hidden',
  marginTop: 20,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
},

editSubmitButtonGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 16,
  paddingHorizontal: 20,
  gap: 10,
},

editSubmitButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '700',
},

    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
    },
    controlsContainer: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        marginHorizontal: 10,
        marginVertical: 10,
        borderRadius: 10,
        elevation: 2,
    },
    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    monthButton: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    monthText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginHorizontal: 20,
        textTransform: 'capitalize',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    actionButton: {
        borderRadius: 8,
        overflow: 'hidden',
        flex: 1,
        marginHorizontal: 5,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    tableContainer: {
        flex: 1,
        margin: 10,
        borderRadius: 10,
        elevation: 2,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1792FE',
        minHeight: 50,
    },
    tableRow: {
  flexDirection: 'row',
  height: 50, // substitui minHeight por height fixa
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},

    evenRow: {
        backgroundColor: '#FFFFFF',
    },
    oddRow: {
        backgroundColor: '#f9f9f9',
    },
    tableCell: {
        padding: 10,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#e0e0e0',
        alignSelf: 'stretch',
  overflow: 'hidden',
    },
    fixedColumn: {
        backgroundColor: '#f5f5f5',
    },
    headerText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    cellText: {
        fontSize: 12,
        color: '#333',
    },
    cellSubText: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
    hoursText: {
        fontWeight: '600',
        color: '#1792FE',
    },
    clickableHours: {
        textDecorationLine: 'underline',
    },
    totalText: {
        fontWeight: 'bold',
        color: '#333',
        fontSize: 13,
    },
    variacaoText: {
        fontSize: 12,
        fontWeight: '600',
    },
    tableWrapper: {
        flex: 1,
        margin: 10,
        
        borderRadius: 10,
        elevation: 2,
    },
    tableInstructions: {
        fontSize: 12,
        color: '#666',
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    horizontalScroll: {
        flex: 1,
    },
    tableContent: {
        minWidth: '100%',
    },
    cellTouchable: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 40,
    },
    editingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e3f2fd',
        borderRadius: 4,
        margin: 2,
    },
    horasInputInline: {
        width: 40,
        height: 30,
        borderWidth: 1,
        borderColor: '#1792FE',
        borderRadius: 4,
        padding: 2,
        fontSize: 12,
        textAlign: 'center',
        backgroundColor: '#fff',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginTop: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: '#1792FE',
        marginTop: 10,
        marginBottom: 20,
    },
    progressContainer: {
        width: '80%',
        alignItems: 'center',
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#1792FE',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        width: '90%',
        maxHeight: '80%',
        borderRadius: 15,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 5,
    },
    modalBody: {
        padding: 20,
    },
    confirmText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginBottom: 15,
    },
    confirmSubText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    confirmButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    confirmButton: {
        flex: 1,
        marginHorizontal: 5,
        borderRadius: 8,
        overflow: 'hidden',
    },
    cancelButton: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    submitButton: {
        marginTop: 20,
        borderRadius: 8,
        overflow: 'hidden',
    },
    editInfo: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    editInfoText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 5,
    },
    editInfoSubText: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 5,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pickerOption: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginBottom: 8,
    },
    pickerOptionSelected: {
        backgroundColor: '#1792FE',
    },
    pickerOptionText: {
        fontSize: 14,
        color: '#666',
    },
    pickerOptionTextSelected: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    especialidadesContainer: {
        marginBottom: 20,
    },
    especialidadesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addButtonText: {
        color: '#28a745',
        fontWeight: '600',
        marginLeft: 5,
    },
    especialidadeItem: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    especialidadeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    especialidadeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    removeButton: {
        padding: 5,
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    inputHalf: {
        flex: 0.48,
    },
    inputLabelSmall: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    horasInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    pickerOptionSmall: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 15,
        backgroundColor: '#f0f0f0',
        marginBottom: 6,
        marginRight: 6,
    },
    pickerOptionTextSmall: {
        fontSize: 12,
        color: '#666',
    },
    totalHoras: {
        backgroundColor: '#e8f4f8',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#1792FE',
    },
    totalHorasText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1792FE',
        textAlign: 'center',
    },
    obraHeader: {
        backgroundColor: '#f0f8ff',
        borderBottomWidth: 2,
        borderBottomColor: '#1792FE',
        borderTopWidth: 2,
        borderTopColor: '#1792FE',
        paddingVertical: 12,
        paddingHorizontal: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    obraHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    obraHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1792FE',
        marginRight: 8,
    },
    obraHeaderCode: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    obraStats: {
        alignItems: 'flex-end',
    },
    obraStatsText: {
        fontSize: 12,
        color: '#1792FE',
        fontWeight: '600',
        marginBottom: 2,
    },
    trabalhadoresRow: {
        marginLeft: 0,
        borderLeftWidth: 0,
        borderLeftColor: '#e3f2fd',
    },
    obraSeparator: {
        height: 15,
        backgroundColor: '#f5f5f5',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        marginVertical: 5,
    },
    cellSubmetido: {
    backgroundColor: '#e6f9e6', // verde muito claro
  },
  iconSubmetido: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
    obraDaysHeader: {
  flexDirection: 'row',
  backgroundColor: '#e3f2fd',
  height: 50, // altura igual à `tableRow`
  borderBottomWidth: 1,
  borderBottomColor: '#1792FE',
},

    obraDaysHeaderText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1792FE',
        textAlign: 'center',
    },
});

export default PartesDiarias;
