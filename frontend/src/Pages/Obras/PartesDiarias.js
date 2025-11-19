import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
} from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    Dimensions,
    SafeAreaView,
    FlatList,
} from "react-native";
import {
    FontAwesome,
    MaterialCommunityIcons,
    Ionicons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import { styles } from "./Css/PartesDiariasStyles";
import {secureStorage} from '../../utils/secureStorage';

const { width } = Dimensions.get("window");

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
    const [mesAno, setMesAno] = useState({
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
    });
    const [dadosProcessados, setDadosProcessados] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalResumoVisible, setModalResumoVisible] = useState(false);
    const [modalExternosVisible, setModalExternosVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedTrabalhador, setSelectedTrabalhador] = useState(null);
    const [selectedDia, setSelectedDia] = useState(null);
    const [editData, setEditData] = useState({
        especialidade: "",
        categoria: "MaoObra",
        notaDia: "", // <- nota do cabeçalho para o dia selecionado
    });

    // Estado para controlar se há rascunho guardado
    const [temRascunho, setTemRascunho] = useState(false);

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
    const [classesList, setClassesList] = useState([]);

    const [diasEditadosManualmente, setDiasEditadosManualmente] = useState(
        new Set(),
    );

    // Especialidade e classe por defeito para diretores
    const ESPECIALIDADE_DEFEITO = "Edificações de Estaleiro";
    const CLASSE_DEFEITO = "Estaleiro";



    // Helper genérico de confirmação (RN + Web)
const confirmAction = (title, message, okText = "Continuar", cancelText = "Cancelar") => {
  // Web (RN Web) usa window.confirm para simplificar
  const isWeb = typeof window !== "undefined" && typeof window.document !== "undefined";
  if (isWeb) {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  // Mobile: usar Alert com Promise
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        { text: okText, style: "default", onPress: () => resolve(true) },
      ],
      { cancelable: true }
    );
  });
};

    // ✅ Função para obter label da unidade do equipamento
    const getUnidadeLabel = (especialidadeCodigo, categoria) => {
        if (categoria !== "Equipamentos") return "Horas";

        // ✅ FORÇAR M² para o equipamento L006 (Andaime)
        if (String(especialidadeCodigo).toUpperCase().trim() === 'L006') {
            console.log(`🔧 FORÇADO: Equipamento L006 (Andaime) -> M²`);
            return 'M²';
        }

        const equip = equipamentosList.find(e => e.codigo === especialidadeCodigo);
        if (!equip || !equip.unidade) return "Horas";

        const unidade = String(equip.unidade || '').toUpperCase().trim();

        console.log(`🔍 DEBUG getUnidadeLabel: equipamento=${especialidadeCodigo}, unidade original="${equip.unidade}", unidade normalizada="${unidade}"`);

        // Mapear unidades para labels amigáveis - verificar várias variações
        if (unidade.includes('M2') || unidade.includes('M²')) {
            return 'M²';
        }
        if (unidade.includes('M3') || unidade.includes('M³')) {
            return 'M³';
        }
        if (unidade.includes('KG')) {
            return 'Kg';
        }
        if (unidade.includes('UN')) {
            return 'Unidades';
        }
        if (unidade.includes('T/')) {
            return 'Toneladas';
        }
        if (unidade === 'H') {
            return 'Horas';
        }

        // Fallback: retornar a unidade original se não encontrar mapeamento
        return equip.unidade || 'Unidades';
    };
    const obrasParaPickers = useMemo(() => {
        // Combinar obras de ambas as fontes e remover duplicados
        const obrasMap = new Map();

        // Função auxiliar para obter código normalizado
        const obterCodigo = (obra) => {
            // Tentar várias variações de campos
            const codigoCandidatos = [
                obra.codigo,
                obra.Codigo,
                obra.COD,
                obra.Code,
                obra.cod
            ].filter(Boolean);

            if (codigoCandidatos.length > 0) {
                return codigoCandidatos[0];
            }

            // Se não tem código, gera um baseado no ID
            return `OBR${String(obra.id).padStart(3, "0")}`;
        };

        // Adicionar obras da lista completa
        (obrasTodas || []).forEach(o => {
            obrasMap.set(o.id, {
                id: o.id,
                nome: o.nome || o.Descricao || o.Titulo || `Obra ${o.id}`,
                codigo: obterCodigo(o)
            });
        });

        // Adicionar obras dos registos (caso faltem na lista completa)
        (obras || []).forEach(o => {
            if (!obrasMap.has(o.id)) {
                obrasMap.set(o.id, {
                    id: o.id,
                    nome: o.nome || o.Descricao || o.Titulo || `Obra ${o.id}`,
                    codigo: obterCodigo(o)
                });
            }
        });

        // Converter para array e ordenar
        const listaObras = Array.from(obrasMap.values());
        return listaObras.sort((a, b) => {
            const codigoA = (a.codigo || '').toString().toUpperCase();
            const codigoB = (b.codigo || '').toString().toUpperCase();
            return codigoA.localeCompare(codigoB, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [obrasTodas, obras]);

    // === PESSOAL/EQUIPAMENTOS ===
const [modalPessoalEquipVisible, setModalPessoalEquipVisible] = useState(false);
const [linhasPessoalEquip, setLinhasPessoalEquip] = useState([]);
const [linhaPessoalEquipAtual, setLinhaPessoalEquipAtual] = useState({
  obraId: "",
  dia: "",
  colaboradorId: "",
  horas: "",
  horaExtra: false,
  categoria: "MaoObra",          // "MaoObra" | "Equipamentos"
  especialidadeCodigo: "",
  subEmpId: null,
  classeId: null,
  observacoes: "",
});

// Colaboradores únicos vindos das tuas equipas (internos - excluir externos)
const colaboradoresDisponiveis = useMemo(() => {
  const map = new Map(); // id -> { id, nome, codFuncionario }
  equipas.forEach(eq => (eq.membros || []).forEach(mb => {
    if (!mb?.id) return;
    // Filtrar externos
    if (mb.tipo === 'externo') return;
    if (!map.has(mb.id)) {
      map.set(mb.id, { id: mb.id, nome: mb.nome, codFuncionario: codMap[mb.id] ?? null });
    }
  }));
  // ordenar por nome
  return [...map.values()].sort((a,b) => (a.nome || "").localeCompare(b.nome || ""));
}, [equipas, codMap]);


const abrirModalPessoalEquip = () => {
  setLinhaPessoalEquipAtual({
    obraId: "",
    dia: "",
    colaboradorId: "",
    horas: "",
    horaExtra: false,
    categoria: "MaoObra",
    especialidadeCodigo: "",
    subEmpId: null,
    classeId: null,
    observacoes: "",
  });
  setLinhasPessoalEquip([]);
  setModalPessoalEquipVisible(true);
};

const [camposInvalidosPessoal, setCamposInvalidosPessoal] = useState(new Set());

const adicionarLinhaPessoalEquip = async () => {
  const {
    obraId, dia, colaboradorId, horas, categoria,
    especialidadeCodigo, subEmpId, classeId, observacoes
  } = linhaPessoalEquipAtual;

  // Reset campos inválidos
  const invalidos = new Set();

  // ✅ VALIDAÇÃO OBRIGATÓRIA: Obra
  const obraIdNum = Number(obraId);
  if (!obraId || obraId === "" || isNaN(obraIdNum)) {
    invalidos.add('obraId');
  }

  // ✅ VALIDAÇÃO OBRIGATÓRIA: Dia
  if (!dia || dia === "") {
    invalidos.add('dia');
  }

  // ✅ VALIDAÇÃO OBRIGATÓRIA: Colaborador
  if (!colaboradorId || colaboradorId === "") {
    invalidos.add('colaboradorId');
  }

  // ✅ VALIDAÇÃO OBRIGATÓRIA: Horas
  if (!horas || horas === "") {
    invalidos.add('horas');
  }

  // ✅ VALIDAÇÃO OBRIGATÓRIA: Especialidade
  if (!especialidadeCodigo || especialidadeCodigo === "") {
    invalidos.add('especialidadeCodigo');
  }

  // ✅ VALIDAÇÃO OBRIGATÓRIA: SubEmpId (vem da especialidade)
  if (!subEmpId) {
    invalidos.add('especialidadeCodigo');
  }

  // ✅ VALIDAÇÃO OBRIGATÓRIA: Classe (sempre obrigatória, exceto Equipamentos)
  if (categoria !== "Equipamentos" && (!classeId || classeId === null)) {
    invalidos.add('classeId');
  }

  // ✅ VALIDAÇÃO OBRIGATÓRIA: Observações se classe -1 (Indiferenciada)
  if (classeId === -1 && (!observacoes || observacoes.trim() === "")) {
    invalidos.add('observacoes');
  }

  // Se há campos inválidos, mostra erro e retorna
  if (invalidos.size > 0) {
    setCamposInvalidosPessoal(invalidos);

    // Mensagem específica se for falta de observações na classe -1
    if (invalidos.has('observacoes')) {
      Alert.alert(
        "Observações Obrigatórias",
        'A classe "Indiferenciada" requer observações obrigatórias.\n\nPor favor, preencha o campo de observações.'
      );
    } else {
      Alert.alert("Campos Obrigatórios", "Por favor, preencha todos os campos marcados a vermelho.");
    }
    return;
  }

  // Limpa marcações de erro
  setCamposInvalidosPessoal(new Set());

  const col = colaboradoresDisponiveis.find(c => String(c.id) === String(colaboradorId));
  if (!col || !col.codFuncionario) {
    Alert.alert("Validação", "Colaborador inválido ou sem código de funcionário.");
    return;
  }

  const minutos = parseHorasToMinutos(horas);
  if (minutos <= 0) {
    Alert.alert("Validação", "Horas inválidas.");
    return;
  }

  // Validar 8h normais por obra no mesmo dia
  if (!linhaPessoalEquipAtual.horaExtra) {
    const horasNaObraDia = linhasPessoalEquip
      .filter(l => l.dia === dia &&
                   l.colaboradorId === colaboradorId &&
                   String(l.obraId) === String(obraId) &&
                   !l.horaExtra)
      .reduce((tot, l) => tot + parseHorasToMinutos(l.horas), 0);

    if (horasNaObraDia + minutos > 8 * 60) {
      Alert.alert(
        "Limite de Horas Excedido",
        `Não é possível registar mais de 8 horas normais por dia nesta obra.\n\nJá registadas nesta obra: ${formatarHorasMinutos(horasNaObraDia)}\n\nPara mais horas, marque como "Hora Extra".`
      );
      return;
    }

    // Validar 10h totais por dia (todas as obras)
    const totalHorasDia = linhasPessoalEquip
      .filter(l => l.dia === dia && l.colaboradorId === colaboradorId)
      .reduce((tot, l) => tot + parseHorasToMinutos(l.horas), 0);

    if (totalHorasDia + minutos > 10 * 60) {
      Alert.alert(
        "Limite de Horas Diário Excedido",
        `Não é possível registar mais de 10 horas totais por dia.\n\nHoras totais já registadas no dia ${dia} (todas as obras): ${formatarHorasMinutos(totalHorasDia)}\n\nPara mais horas, marque como "Hora Extra".`
      );
      return;
    }
  }

  const lista = categoria === "Equipamentos" ? equipamentosList : especialidadesList;
  const sel   = lista.find(x => x.codigo === especialidadeCodigo);

  const novaLinha = {
    key: `${obraId}-${dia}-${colaboradorId}-${Date.now()}`,
    obraId: Number(obraId),
    dia: Number(dia),
    colaboradorId: Number(colaboradorId),
    colaboradorNome: col.nome,
    codFuncionario: String(col.codFuncionario),
    horas,            // string original (ex.: "2:30")
    horasMin: minutos,
    horaExtra: !!linhaPessoalEquipAtual.horaExtra,
    categoria,
    especialidadeCodigo,
    especialidadeDesc: sel?.descricao ?? "",
    subEmpId: sel?.subEmpId ?? null,
    classeId: categoria === "Equipamentos" ? -1 : (classeId || null),
    observacoes: observacoes || "",
  };

  setLinhasPessoalEquip(prev => [...prev, novaLinha]);

  // ✅ ATUALIZAR A GRADE PRINCIPAL
  setDadosProcessados(prev => {
    const itemKey = `${colaboradorId}-${obraId}`;
    const itemExistente = prev.find(it =>
      it.userId === Number(colaboradorId) && it.obraId === Number(obraId)
    );

    if (itemExistente) {
      // Atualizar item existente
      return prev.map(it => {
        if (it.userId === Number(colaboradorId) && it.obraId === Number(obraId)) {
          const horasAtuais = it.horasPorDia[dia] || 0;
          const novasEspecialidades = [...(it.especialidades || [])];

          novasEspecialidades.push({
            dia: Number(dia),
            especialidade: especialidadeCodigo,
            categoria,
            horas: minutos / 60,
            subEmpId,
            horaExtra: !!linhaPessoalEquipAtual.horaExtra,
            classeId,
            observacoes: observacoes || "",
            obraId: Number(obraId)
          });

          return {
            ...it,
            horasPorDia: {
              ...it.horasPorDia,
              [dia]: horasAtuais + minutos
            },
            especialidades: novasEspecialidades
          };
        }
        return it;
      });
    } else {
      // Criar novo item
      const obraMeta = obrasParaPickers.find(o => Number(o.id) === Number(obraId)) || {
        nome: `Obra ${obraId}`,
        codigo: `OBR${String(obraId).padStart(3, "0")}`
      };

      const baseHoras = Object.fromEntries(diasDoMes.map(d => [d, 0]));
      baseHoras[dia] = minutos;

      return [...prev, {
        id: itemKey,
        userId: Number(colaboradorId),
        userName: col.nome,
        codFuncionario: String(col.codFuncionario),
        obraId: Number(obraId),
        obraNome: obraMeta.nome,
        obraCodigo: obraMeta.codigo,
        horasPorDia: baseHoras,
        horasOriginais: {},
        especialidades: [{
          dia: Number(dia),
          especialidade: especialidadeCodigo,
          categoria,
          horas: minutos / 60,
          subEmpId,
          horaExtra: !!linhaPessoalEquipAtual.horaExtra,
          classeId,
          observacoes: observacoes || "",
          obraId: Number(obraId)
        }],
        isOriginal: false
      }];
    }
  });

  // Marcar dia como editado manualmente
  setDiasEditadosManualmente(prev => {
    const s = new Set(prev);
    s.add(`${colaboradorId}-${obraId}-${dia}`);
    return s;
  });

  // reset campos variáveis
    setLinhaPessoalEquipAtual(p => ({
      ...p,
      colaboradorId: "",
      horas: "",
      horaExtra: false,
      especialidadeCodigo: "",
      subEmpId: null,
      classeId: null, // Reset classId here
      observacoes: "",
    }));

  // ✅ GUARDAR RASCUNHO IMEDIATAMENTE (sem timeout)
  await guardarRascunhoAutomatico();
};

const removerLinhaPessoalEquip = (key) => {
  setLinhasPessoalEquip(prev => prev.filter(l => l.key !== key));
};

const submeterPessoalEquip = async () => {
  if (linhasPessoalEquip.length === 0) {
    Alert.alert("Aviso", "Não há linhas para submeter.");
    return;
  }

  try {
    const painelToken = await secureStorage.getItem("painelAdminToken");
    const userLogado  = (await secureStorage.getItem("userNome")) || "";

    // Agrupar por (obraId, diaISO, colaboradorId) → 1 cabeçalho por colaborador/dia/obra
    const grupos = new Map();
    for (const l of linhasPessoalEquip) {
      const dataISO = `${mesAno.ano}-${String(mesAno.mes).padStart(2,"0")}-${String(l.dia).padStart(2,"0")}`;
      const key = `${l.obraId}|${dataISO}|${l.colaboradorId}`;
      if (!grupos.has(key)) grupos.set(key, {
        obraId: l.obraId, dataISO, colaboradorId: l.colaboradorId,
        codFuncionario: l.codFuncionario, linhas: []
      });
      grupos.get(key).linhas.push(l);
    }

    let totalSubmetidos = 0;

    for (const [, grp] of grupos.entries()) {
      // 1) Cabeçalho com ColaboradorID (interno)
      const cabecalho = {
        ObraID: grp.obraId,
        Data: grp.dataISO,
        Notas: "Parte diária (Pessoal/Equipamentos)",
        CriadoPor: userLogado,
        Utilizador: userLogado,
        TipoEntidade: "O",
        ColaboradorID: grp.codFuncionario, // <- chave para internos
      };

      const respCab = await fetch("https://backend.advir.pt/api/parte-diaria/cabecalhos", {
        method: "POST",
        headers: { Authorization: `Bearer ${painelToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(cabecalho),
      });
      if (!respCab.ok) {
        const err = await respCab.json().catch(()=> ({}));
        throw new Error(err?.message || "Falha ao criar cabeçalho.");
      }
      const cab = await respCab.json();

      // 2) Itens do cabeçalho
      for (let i=0; i<grp.linhas.length; i++) {
        const l = grp.linhas[i];
        const [yyyy, mm, dd] = grp.dataISO.split("-").map(Number);
        const tipoHoraId = l.horaExtra
          ? (isFimDeSemana(yyyy, mm, dd) ? "H06" : "H01")
          : null;

        const item = {
          DocumentoID: cab.DocumentoID,
          ObraID: grp.obraId,
          Data: grp.dataISO,
          Numero: i + 1,
          ColaboradorID: grp.codFuncionario,   // interno → vai com ColaboradorID
          Funcionario: String(grp.codFuncionario),
          ClasseID: l.classeId || 1,
          SubEmpID: l.subEmpId ?? null,
          NumHoras: l.minutos,
          PrecoUnit: 0,
          categoria: l.categoria || "MaoObra",
          TipoHoraID: tipoHoraId,
          Observacoes: l.observacoes || "",
        };

        const respItem = await fetch("https://backend.advir.pt/api/parte-diaria/itens", {
          method: "POST",
          headers: { Authorization: `Bearer ${painelToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (!respItem.ok) {
          const err = await respItem.json().catch(()=> ({}));
          throw new Error(err?.message || `Falha ao criar item do colaborador ${l.colaboradorNome}.`);
        }
        totalSubmetidos++;
      }
    }

    // Fechar modal e limpar dados
    setModalPessoalEquipVisible(false);
    setLinhasPessoalEquip([]);
    setLinhaPessoalEquipAtual({
      obraId: "",
      dia: "",
      colaboradorId: "",
      horas: "",
      horaExtra: false,
      categoria: "MaoObra",
      especialidadeCodigo: "",
      subEmpId: null,
      classeId: null,
      observacoes: "",
    });

    Alert.alert("Sucesso", `${totalSubmetidos} registo${totalSubmetidos !== 1 ? 's' : ''} de Pessoal/Equipamentos submetido${totalSubmetidos !== 1 ? 's' : ''} com sucesso.`);

    await carregarItensSubmetidos();
    await carregarDados();
  } catch (e) {
    console.error("Erro ao submeter Pessoal/Equipamentos:", e);
    Alert.alert("Erro", e.message || "Ocorreu um erro ao submeter Pessoal/Equipamentos.");
  }
};


    // Especialidades disponíveis
    const [especialidades, setEspecialidades] = useState([]);

    const [itensSubmetidos, setItensSubmetidos] = useState([]);

    // Normaliza códigos (ex.: "1" -> "001")
    const normalizaCod = (c) =>
        String(c ?? "")
            .replace(/^0+/, "")
            .padStart(3, "0");

    // Itens submetidos agregados por ColaboradorID × ObraID no mês selecionado
    const submetidosPorUserObra = useMemo(() => {
        const map = new Map(); // key: "cod-obraId" -> { cod, obraId, horasPorDia, totalMin }
        (itensSubmetidos || []).forEach((it) => {
            if (it.ColaboradorID == null || !it.ObraID || !it.Data) return; // ignora EXTERNOS
            const [yyyy, mm, dd] = it.Data.split("T")[0].split("-").map(Number);
            if (yyyy !== mesAno.ano || mm !== mesAno.mes) return;

            const cod = normalizaCod(it.ColaboradorID);
            const obraId = Number(it.ObraID);
            const key = `${cod}-${obraId}`;

            if (!map.has(key)) {
                map.set(key, {
                    cod,
                    obraId,
                    horasPorDia: Object.fromEntries(diasDoMes.map((d) => [d, 0])),
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
        equipas.forEach((eq) =>
            (eq.membros || []).forEach((mb) => {
                const cod = codMap[mb.id];
                if (cod) m.set(normalizaCod(cod), { userId: mb.id, userName: mb.nome });
            }),
        );
        return m;
    }, [equipas, codMap]);

    // === EXTERNOS ===
    const [externosLista, setExternosLista] = useState([]); // da tabela trabalhadores_externos
    const [linhasExternos, setLinhasExternos] = useState([]); // linhas que vais submeter
    const [empresaFiltroExternos, setEmpresaFiltroExternos] = useState(""); // filtro por empresa

    // Lista de empresas únicas disponíveis nos externos
    const empresasExternosDisponiveis = useMemo(() => {
        const empresasUnicas = new Set();
        externosLista.forEach((externo) => {
            if (externo.empresa) {
                empresasUnicas.add(externo.empresa);
            }
        });
        return Array.from(empresasUnicas).sort();
    }, [externosLista]);

    // Externos filtrados pela empresa selecionada
    const externosFiltrados = useMemo(() => {
        if (!empresaFiltroExternos) {
            return externosLista;
        }
        return externosLista.filter(
            (externo) => externo.empresa === empresaFiltroExternos,
        );
    }, [externosLista, empresaFiltroExternos]);
    const [linhaAtual, setLinhaAtual] = useState({
        obraId: "",
        dia: "",
        trabalhadorId: "",
        horas: "",
        horaExtra: false,
        categoria: "MaoObra",
        especialidadeCodigo: "",
        subEmpId: null,
        classeId: null, // Added classeId
        observacoes: "", // Add observacoes field
    });

    const carregarObrasTodas = useCallback(async () => {
        try {
            const token = await secureStorage.getItem("loginToken");
            const empresaId = await secureStorage.getItem("empresa_id");

            const headers = {
                Authorization: `Bearer ${token}`,
                "X-Empresa-ID": empresaId, // Enviar empresa_id no header
            };

            const res = await fetch("https://backend.advir.pt/api/obra", {
                headers,
            });

            if (!res.ok) throw new Error("Falha ao obter lista de obras");
            const data = await res.json();

            // Lida com {data: [...]} ou array direto
            const lista = Array.isArray(data) ? data : data?.data || [];
            const formatadas = lista.map((o) => ({
                id: o.id,
                nome: o.nome || o.Descricao || `Obra ${o.id}`,
                codigo: o.codigo || o.Codigo || `OBR${String(o.id).padStart(3, "0")}`,
            }));

            setObrasTodas(formatadas);
        } catch (e) {
            console.warn("Erro ao carregar TODAS as obras:", e.message);
            // fallback: fica só com as obras já detetadas pelos registos
        }
    }, []);

    // 🔹 EXTERNOS SUBMETIDOS por Obra × Pessoa (persistentes, vindos da API)
    const externosSubmetidosPorObraPessoa = useMemo(() => {
        const baseHoras = Object.fromEntries(diasDoMes.map((d) => [d, 0]));
        const porObra = new Map(); // obraId -> Map(nome -> row)

        (itensSubmetidos || []).forEach((it) => {
            // Externo: ColaboradorID == null (pelos teus dados) e costuma vir " (Externo)" no campo Funcionario
            if (it.ColaboradorID != null) return;
            if (!it.Data || !it.ObraID) return;

            const iso = typeof it.Data === "string" ? it.Data : String(it.Data);
            const [yyyy, mm, dd] = iso.split("T")[0].split("-");
            if (Number(yyyy) !== mesAno.ano || Number(mm) !== mesAno.mes) return;

            const obraId = Number(it.ObraID);
            const diaNum = Number(dd);
            const nome =
                (it.Funcionario || "").replace(/\s*\(Externo\)\s*$/i, "").trim() ||
                "Externo";

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

        console.log("🔍 Externos submetidos agregados por obra:", porObra.size, "obras");
        porObra.forEach((byPessoa, obraId) => {
            console.log(`   Obra ${obraId}:`, byPessoa.size, "externos");
        });

        return porObra;
    }, [itensSubmetidos, diasDoMes, mesAno]);

    // Converte "H:MM" ou "H.MM" para minutos (número inteiro)
    const parseHorasToMinutos = (str) => {
        if (!str) return 0;
        const s = String(str).trim().replace(",", ".");
        if (s.includes(":")) {
            const [h, m] = s.split(":");
            return Math.max(0, (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0));
        }
        const dec = parseFloat(s);
        if (Number.isNaN(dec) || dec < 0) return 0;
        return Math.round(dec * 60);
    };

    // Busca os trabalhadores externos ativos
    const carregarExternos = useCallback(async () => {
        try {
            const token = await secureStorage.getItem("loginToken");
            const empresaId = await secureStorage.getItem("empresa_id");

            const headers = {
                Authorization: `Bearer ${token}`,
                "X-Empresa-ID": empresaId, // Enviar empresa_id no header
            };

            const res = await fetch(
                "https://backend.advir.pt/api/trabalhadores-externos?ativo=true&anulado=false&pageSize=500",
                {
                    headers,
                },
            );
            if (!res.ok) throw new Error("Falha ao obter externos");
            const data = await res.json();
            // o controlador devolve {data: [...]} ou array direto; lida com ambos
            const lista = Array.isArray(data) ? data : data?.data || [];
            setExternosLista(lista);
        } catch (e) {
            console.warn("Erro externos:", e.message);
            Alert.alert("Erro", "Não foi possível carregar a lista de externos.");
        }
    }, []);

    const abrirModalExternos = async () => {
        await carregarExternos();

        // Verificar se há linhas existentes para preencher os campos
        if (linhasExternos.length > 0) {
            const primeiraLinha = linhasExternos[0];
            setLinhaAtual({
                obraId: primeiraLinha.obraId || "",
                dia: primeiraLinha.dia || "",
                trabalhadorId: primeiraLinha.trabalhadorId || "",
                horas: primeiraLinha.horas || "",
                horaExtra: !!primeiraLinha.horaExtra,
                categoria: primeiraLinha.categoria || "MaoObra",
                especialidadeCodigo: primeiraLinha.especialidadeCodigo || "",
                subEmpId: primeiraLinha.subEmpId || null,
                classeId: primeiraLinha.classeId || null,
                observacoes: primeiraLinha.observacoes || "",
            });
        } else {
            setLinhaAtual({
                obraId: "",
                dia: "",
                trabalhadorId: "",
                horas: "",
                horaExtra: false,
                categoria: "MaoObra",
                especialidadeCodigo: "",
                subEmpId: null,
                classeId: null,
                observacoes: "",
            });
        }

        setModalExternosVisible(true);
    };

    const [camposInvalidos, setCamposInvalidos] = useState(new Set());

    const adicionarLinhaExterno = async () => {
        const {
            obraId,
            dia,
            trabalhadorId,
            horas,
            categoria,
            especialidadeCodigo,
            subEmpId,
            classeId,
            observacoes,
        } = linhaAtual;

        // Reset campos inválidos
        const invalidos = new Set();

        // ✅ VALIDAÇÃO OBRIGATÓRIA: Obra
        const obraIdNum = Number(obraId);
        if (!obraId || obraId === "" || isNaN(obraIdNum)) {
            invalidos.add('obraId');
        }

        // ✅ VALIDAÇÃO OBRIGATÓRIA: Dia
        if (!dia || dia === "") {
            invalidos.add('dia');
        }

        // ✅ VALIDAÇÃO OBRIGATÓRIA: Trabalhador
        if (!trabalhadorId || trabalhadorId === "") {
            invalidos.add('trabalhadorId');
        }

        // ✅ VALIDAÇÃO OBRIGATÓRIA: Horas
        if (!horas || horas === "") {
            invalidos.add('horas');
        }

        // ✅ VALIDAÇÃO OBRIGATÓRIA: Especialidade
        if (!especialidadeCodigo || especialidadeCodigo === "") {
            invalidos.add('especialidadeCodigo');
        }

        // ✅ VALIDAÇÃO OBRIGATÓRIA: SubEmpId (vem da especialidade)
        if (!subEmpId) {
            invalidos.add('especialidadeCodigo');
        }

        // ✅ VALIDAÇÃO OBRIGATÓRIA: Classe (sempre obrigatória, exceto Equipamentos)
        if (categoria !== "Equipamentos" && (!classeId || classeId === null)) {
            invalidos.add('classeId');
        }

        // ✅ VALIDAÇÃO OBRIGATÓRIA: Observações se classe -1 (Indiferenciada)
        if (classeId === -1 && (!observacoes || observacoes.trim() === "")) {
            invalidos.add('observacoes');
        }

        // Se há campos inválidos, mostra erro e retorna
        if (invalidos.size > 0) {
            setCamposInvalidos(invalidos);

            // Mensagem específica se for falta de observações na classe -1
            if (invalidos.has('observacoes')) {
                Alert.alert(
                    "Observações Obrigatórias",
                    'A classe "Indiferenciada" requer observações obrigatórias.\n\nPor favor, preencha o campo de observações.'
                );
            } else {
                Alert.alert("Campos Obrigatórios", "Por favor, preencha todos os campos marcados a vermelho.");
            }
            return;
        }

        // Limpa marcações de erro
        setCamposInvalidos(new Set());

        const trab = externosLista.find(
            (e) => String(e.id) === String(trabalhadorId),
        );
        if (!trab) {
            Alert.alert("Validação", "Trabalhador externo inválido.");
            return;
        }



        const minutos = parseHorasToMinutos(horas);
        if (minutos <= 0) {
            Alert.alert("Validação", "Horas inválidas.");
            return;
        }

        // Validação de horas:
        // - Máximo 10h normais por dia (todas as obras)
        if (!linhaAtual.horaExtra) {
            // Validar 10h totais por dia (todas as obras)
            const totalHorasDia = linhasExternos
                .filter((l) => String(l.trabalhadorId) === String(trabalhadorId) &&
                              l.dia === dia &&
                              !l.horaExtra)
                .reduce((total, l) => total + parseHorasToMinutos(l.horas), 0);

            if (totalHorasDia + minutos > 10 * 60) {
                Alert.alert(
                    "Limite de Horas Diário Excedido",
                    `Não é possível registar mais de 10 horas normais por dia para ${trab.funcionario}.\n\nHoras normais já registadas no dia ${dia} (todas as obras): ${formatarHorasMinutos(totalHorasDia)}\n\nPara mais horas, marque como "Hora Extra".`,
                    [{ text: "OK" }],
                );
                return;
            }
        }

        const lista =
            categoria === "Equipamentos" ? equipamentosList : especialidadesList;
        const sel = lista.find((x) => x.codigo === especialidadeCodigo);

        // Buscar informações da obra
        const obraMeta = obrasParaPickers.find((o) => Number(o.id) === Number(obraId));

        // Buscar informações da classe
        const classeMeta = classesList.find((c) => c.classeId === classeId);

        setLinhasExternos((prev) => [
            ...prev,
            {
                key: `${obraId}-${dia}-${trabalhadorId}-${Date.now()}`,
                obraId: Number(obraId),
                dia: Number(dia),
                trabalhadorId: trab.id,
                funcionario: trab.funcionario,
                empresa: trab.empresa,

                horasMin: minutos,
                horaExtra: !!linhaAtual.horaExtra,

                // novos campos
                categoria,
                especialidadeCodigo,
                especialidadeDesc: sel?.descricao ?? "",
                subEmpId: subEmpId ?? null,
                classeId: classeId,
                classe: classeMeta?.classe ?? "",
                classeDescricao: classeMeta?.descricao ?? "",
                obraCodigo: obraMeta?.codigo ?? "",
                obraNome: obraMeta?.nome ?? `Obra ${obraId}`,
                observacoes: observacoes || "",
                horas: horas, // guardar horas no formato original para validação
            },
        ]);

        setLinhaAtual((prev) => ({
            ...prev,
            trabalhadorId: "",
            horas: "",
            horaExtra: false,
            especialidadeCodigo: "",
            subEmpId: null,
            classeId: null,
            observacoes: "",
        }));

        // ✅ GUARDAR RASCUNHO IMEDIATAMENTE (sem timeout)
        await guardarRascunhoAutomatico();
    };

    const removerLinhaExterno = (key) => {
        setLinhasExternos((prev) => prev.filter((l) => l.key !== key));
    };

    const submeterExternos = async () => {
        if (linhasExternos.length === 0) {
            Alert.alert("Aviso", "Não há linhas para submeter.");
            return;
        }

        try {
            const painelToken = await secureStorage.getItem("painelAdminToken");
            const userLogado = (await secureStorage.getItem("userNome")) || "";

            // Agrupa por (obraId, dia)
            const grupos = new Map();
            for (const l of linhasExternos) {
                const dataISO = `${mesAno.ano}-${String(mesAno.mes).padStart(2, "0")}-${String(l.dia).padStart(2, "0")}`;
                const key = `${l.obraId}|${dataISO}`;
                if (!grupos.has(key))
                    grupos.set(key, { obraId: l.obraId, dataISO, linhas: [] });
                grupos.get(key).linhas.push(l);
            }

            for (const [, grp] of grupos.entries()) {
                // 1) cabeçalho
                const cabecalho = {
                    ObraID: grp.obraId,
                    Data: grp.dataISO,
                    Notas: "Parte diária de EXTERNOS",
                    CriadoPor: userLogado,
                    Utilizador: userLogado,
                    TipoEntidade: "O",
                    ColaboradorID: null,
                };

                const respCab = await fetch(
                    "https://backend.advir.pt/api/parte-diaria/cabecalhos",
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${painelToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(cabecalho),
                    },
                );

                if (!respCab.ok) {
                    const err = await respCab.json().catch(() => ({}));
                    throw new Error(
                        err?.message || "Falha ao criar cabeçalho para externos.",
                    );
                }
                const cab = await respCab.json();

                // 2) itens
                for (let i = 0; i < grp.linhas.length; i++) {
                    const l = grp.linhas[i];

                    const tipoHoraId = l.horaExtra
                        ? isFimDeSemana(mesAno.ano, mesAno.mes, l.dia)
                            ? "H06"
                            : "H01"
                        : null;

                    const item = {
                        DocumentoID: cab.DocumentoID,
                        ObraID: grp.obraId,
                        Data: grp.dataISO,
                        Numero: i + 1,
                        ColaboradorID: null,
                        Funcionario: `${l.funcionario} (Externo)`,
                        ClasseID: l.classeId || 1, // Use selected classeId or default
                        SubEmpID: l.subEmpId ?? null,
                        NumHoras: l.horasMin,
                        PrecoUnit: l.valor || 0,
                        categoria: l.categoria || "MaoObra",
                        TipoHoraID: tipoHoraId,
                        Observacoes: l.observacoes || "", // Add observacoes field
                    };

                    const respItem = await fetch(
                        "https://backend.advir.pt/api/parte-diaria/itens",
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${painelToken}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.JSON.stringify(item),
                        },
                    );

                    if (!respItem.ok) {
                        const err = await respItem.json().catch(() => ({}));
                        throw new Error(
                            err?.message || `Falha ao criar item externo (${l.funcionario}).`,
                        );
                    }
                }
            }

            setModalExternosVisible(false);
            setLinhasExternos([]);
            Alert.alert("Sucesso", "Partes diárias de externos submetidas.");
            await carregarItensSubmetidos();
            await carregarDados();
        } catch (e) {
            console.error("Erro ao submeter externos:", e);
            Alert.alert("Erro", e.message || "Ocorreu um erro ao submeter externos.");
        }
    };

    const isFimDeSemana = (ano, mes, dia) => {
        const dt = new Date(ano, mes - 1, dia); // getDay(): 0=Dom, 6=Sáb
        const dow = dt.getDay();
        return dow === 0 || dow === 6;
    };

    const selecionarOpcaoEspecialidade = (index, valor) => {
        const eq = equipamentosList.find((o) => o.codigo === valor);
        const mao = especialidadesList.find((o) => o.codigo === valor);

        setEditData((prev) => {
            const novas = [...(prev.especialidadesDia || [])];
            const linha = { ...novas[index] };

            if (eq) {
                // veio da lista de Equipamentos
                linha.categoria = "Equipamentos";
                linha.especialidade = eq.codigo;
                linha.subEmpId = eq.subEmpId ?? null;
                // Set classeId to -1 if category is Equipamentos
                linha.classeId = -1;
            } else if (mao) {
                // veio da lista de Mão de Obra
                linha.categoria = "MaoObra";
                linha.especialidade = mao.codigo;
                linha.subEmpId = mao.subEmpId ?? null;
                // ✅ SEMPRE null - obriga utilizador a escolher
                linha.classeId = null;
            } else {
                // fallback (não encontrou em nenhuma lista)
                linha.especialidade = valor;
            }

            novas[index] = linha;
            return { ...prev, especialidadesDia: novas };
        });
    };

    const carregarItensSubmetidos = async () => {
        const painelToken = await secureStorage.getItem("painelAdminToken");
        const userLogado = (await secureStorage.getItem("userNome")) || "";
        const tipoUser = await secureStorage.getItem("tipoUser");

        console.log("🔍 DEBUG carregarItensSubmetidos:");
        console.log("   userLogado:", userLogado);
        console.log("   tipoUser:", tipoUser);

        try {
            // Carregar cabeçalhos primeiro
            const resCabecalhos = await fetch(
                "https://backend.advir.pt/api/parte-diaria/cabecalhos",
                {
                    headers: {
                        Authorization: `Bearer ${painelToken}`,
                    },
                },
            );

            if (!resCabecalhos.ok) throw new Error("Erro ao carregar cabeçalhos");

            const cabecalhos = await resCabecalhos.json();

            console.log("📊 Total de cabeçalhos carregados:", cabecalhos.length);
            console.log("📊 Exemplo de cabeçalho:", cabecalhos[0]);

            // Filtrar cabeçalhos criados pelo utilizador logado (exceto para administradores)
            const cabecalhosFiltrados = tipoUser === "Administrador"
                ? cabecalhos
                : cabecalhos.filter(
                    (cab) => {
                        const match = cab.CriadoPor === userLogado || cab.Utilizador === userLogado;
                        if (!match && (cab.CriadoPor?.includes(userLogado) || cab.Utilizador?.includes(userLogado))) {
                            console.warn("⚠️ Possível match parcial:", {
                                userLogado,
                                CriadoPor: cab.CriadoPor,
                                Utilizador: cab.Utilizador
                            });
                        }
                        return match;
                    }
                );

            console.log("📊 Cabeçalhos após filtro:", cabecalhosFiltrados.length);

            // Extrair os DocumentoIDs dos cabeçalhos filtrados
            const documentoIdsPermitidos = new Set(
                cabecalhosFiltrados.map((cab) => cab.DocumentoID)
            );

            // Carregar itens
            const res = await fetch(
                "https://backend.advir.pt/api/parte-diaria/itens",
                {
                    headers: {
                        Authorization: `Bearer ${painelToken}`,
                    },
                },
            );

            if (!res.ok) throw new Error("Erro ao carregar itens submetidos");

            const allData = await res.json();

            // Filtrar apenas os itens que pertencem aos cabeçalhos criados pelo utilizador
            const data = allData.filter((item) =>
                documentoIdsPermitidos.has(item.DocumentoID)
            );

            console.log("📊 Itens carregados (incluindo externos):", data.length);
            console.log("📊 Externos encontrados:", data.filter(it => it.ColaboradorID == null).length);

            // 1) Atualiza o state dos itens
            setItensSubmetidos(data);
            // 2) Constroi imediatamente o Set de submetidos
            const novoSubmittedSet = new Set(
                data.map((item) => {
                    // Data vem no formato "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm:ss"
                    const diaISO = item.Data.split("T")[0];
                    const [ano, mes, dia] = diaISO.split("-");
                    // Para internos usa ColaboradorID, para externos usa identificador único
                    const id = item.ColaboradorID != null ? item.ColaboradorID : `externo-${item.DocumentoID}-${item.Numero}`;
                    return `${id}-${item.ObraID}-${ano}-${mes}-${dia}`;
                }),
            );
            setSubmittedSet(novoSubmittedSet);
            return novoSubmittedSet;
        } catch (err) {
            console.error("Erro ao carregar itens submetidos:", err);
        }
    };

    const carregarEspecialidades = useCallback(async () => {
        const painelToken = await secureStorage.getItem("painelAdminToken");
        const urlempresa = await secureStorage.getItem("urlempresa");
        try {
            const data = await fetchComRetentativas(
                "https://webapiprimavera.advir.pt/routesFaltas/GetListaEspecialidades",
                {
                    headers: { Authorization: `Bearer ${painelToken}`, urlempresa },
                },
            );
            const table = data?.DataSet?.Table;
            const items = Array.isArray(table)
                ? table
                    .filter((item) => item.CDU_CCS != null && item.CDU_CCS !== '') // Filtrar apenas especialidades com CDU_CCS preenchido
                    .map((item) => ({
                        codigo: item.SubEmp,
                        descricao: item.Descricao,
                        subEmpId: item.SubEmpId,
                        cduCcs: item.CDU_CCS,
                    }))
                : [];
            setEspecialidadesList(items);
        } catch (err) {
            console.error("Erro ao obter especialidades:", err);
            Alert.alert("Erro", "Não foi possível carregar as especialidades");
        }
    }, []);

    const carregarEquipamentos = useCallback(async () => {
        const painelToken = await secureStorage.getItem("painelAdminToken");
        const urlempresa = await secureStorage.getItem("urlempresa");
        try {
            const data = await fetchComRetentativas(
                "https://webapiprimavera.advir.pt/routesFaltas/GetListaEquipamentos",
                {
                    headers: { Authorization: `Bearer ${painelToken}`, urlempresa },
                },
            );

            // A API às vezes pode devolver um único objeto em vez de array
            const raw = data?.DataSet?.Table;
            const table = Array.isArray(raw) ? raw : raw ? [raw] : [];

            const items = table
                .filter((item) =>
                    typeof item?.Codigo === "string" &&
                    item.Codigo.trim().toUpperCase().startsWith("L")
                )
                .map((item) => ({
                    codigo: item.Codigo.trim(),
                    descricao: item.Desig,
                    subEmpId: item.ComponenteId ?? item.ComponenteID,
                    componenteID: item.ComponenteId ?? item.ComponenteID,
                    unidade: item.Unidade || item.UN || "UN/H", // ✅ Capturar unidade do equipamento
                }));

            console.log(`✅ Carregados ${items.length} equipamentos. Exemplo:`, items[0]);
            setEquipamentosList(items);
        } catch (err) {
            console.error("Erro ao obter equipamentos:", err);
            Alert.alert("Erro", "Não foi possível carregar os equipamentos");
        }
    }, []);



    const carregarClasses = useCallback(async () => {
        const painelToken = await secureStorage.getItem("painelAdminToken");
        const urlempresa = await secureStorage.getItem("urlempresa");
        try {
            const data = await fetchComRetentativas(
                "https://webapiprimavera.advir.pt/routesFaltas/GetListaClasses",
                {
                    headers: { Authorization: `Bearer ${painelToken}`, urlempresa },
                },
            );
            const table = data?.DataSet?.Table;
            const items = Array.isArray(table)
                ? table.map((item) => ({
                    classeId: item.ClasseId,
                    descricao: item.Descricao,
                    classe: item.Classe,
                    cduCcs: item.CDU_CCS || item.Classe, // Usar CDU_CCS se disponível, senão usar Classe
                }))
                : [];
            setClassesList(items);
        } catch (err) {
            console.error("Erro ao obter classes:", err);
            Alert.alert("Erro", "Não foi possível carregar as classes");
        }
    }, []);

    const fetchComRetentativas = async (
        url,
        options,
        tentativas = 3,
        delay = 1000,
    ) => {
        for (let i = 0; i < tentativas; i++) {
            try {
                const res = await fetch(url, options);
                if (!res.ok) throw new Error(`Erro ${res.status}`);
                return await res.json();
            } catch (err) {
                if (i === tentativas - 1) throw err;
                await new Promise((resolve) =>
                    setTimeout(resolve, delay * Math.pow(2, i)),
                ); // Exponential backoff
            }
        }
    };

    useEffect(() => {
        carregarEspecialidades();
        carregarEquipamentos();
        carregarClasses();
    }, [carregarEspecialidades, carregarEquipamentos, carregarClasses]);

    // Função auxiliar para obter chave do rascunho
    const obterChaveRascunho = useCallback(async () => {
        const userId = await secureStorage.getItem("userId");
        const userEmail = await secureStorage.getItem("userEmail");

        // Usar email como fallback se userId não estiver disponível
        const identificador = userId || userEmail || 'temp';
        return `partesDiarias_rascunho_${identificador}_${mesAno.mes}_${mesAno.ano}`;
    }, [mesAno]);

 // Função para guardar rascunho automaticamente (sem confirmação)
const guardarRascunhoAutomatico = useCallback(async () => {
  try {
    const token = await secureStorage.getItem("loginToken");

    // ✅ GARANTIR que está a guardar TODOS os dados da grade
    const dadosParaGuardar = {
      mes: mesAno.mes,
      ano: mesAno.ano,
      dadosProcessados: dadosProcessados || [],
      linhasExternos: linhasExternos || [],
      linhasPessoalEquip: linhasPessoalEquip || [],
      diasEditadosManualmente: Array.from(diasEditadosManualmente || new Set()),
    };

    console.log("📦 Guardando rascunho com:", {
      colaboradores: dadosParaGuardar.dadosProcessados.length,
      externos: dadosParaGuardar.linhasExternos.length,
      pessoalEquip: dadosParaGuardar.linhasPessoalEquip.length,
      diasEditados: dadosParaGuardar.diasEditadosManualmente.length,
    });

    const response = await fetch("https://backend.advir.pt/api/parte-diaria-rascunho/guardar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dadosParaGuardar),
    });

    const result = await response.json();

    if (result.success) {
      setTemRascunho(true);
      console.log("✅ Rascunho guardado com sucesso");
    } else {
      console.error("❌ Erro ao guardar rascunho:", result.message);
    }
  } catch (error) {
    console.error("❌ Erro ao guardar rascunho automático:", error);
  }
}, [dadosProcessados, linhasExternos, linhasPessoalEquip, diasEditadosManualmente, mesAno]);

// Função para carregar rascunho silenciosamente (sem confirmação)
const carregarRascunhoSilencioso = useCallback(async () => {
  // Garantir que classesList está carregado
  if (!classesList || classesList.length === 0) {
    console.warn("⚠️ classesList ainda não está carregado, aguardando...");
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Garantir que obrasParaPickers está carregado
  if (!obrasParaPickers || obrasParaPickers.length === 0) {
    console.warn("⚠️ obrasParaPickers ainda não está carregado, aguardando...");
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  try {

    const token = await secureStorage.getItem("loginToken");

    const response = await fetch(
      `https://backend.advir.pt/api/parte-diaria-rascunho/obter?mes=${mesAno.mes}&ano=${mesAno.ano}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const result = await response.json();

    console.log("📦 Resposta do servidor ao carregar rascunho:", result);

    if (!result.success || !result.rascunho) {
      setTemRascunho(false);
      Alert.alert("Aviso", "Não foi encontrado nenhum rascunho para este mês.");
      return false;
    }

    const rascunhoData = result.rascunho;

    // Helper para fazer parse seguro de JSON - MELHORADO
    const parseJSON = (data) => {
      if (!data) {
        console.log("⚠️ parseJSON: dados vazios");
        return [];
      }

      if (Array.isArray(data)) {
        console.log(`✅ parseJSON: já é array com ${data.length} itens`);
        return data;
      }

      if (typeof data === "string") {
        try {
          const parsed = JSON.parse(data);
          const result = Array.isArray(parsed) ? parsed : [];
          console.log(`✅ parseJSON: string convertida para array com ${result.length} itens`);
          return result;
        } catch (e) {
          console.error("❌ parseJSON: Erro ao fazer parse:", e);
          return [];
        }
      }

      // Se for objeto, tenta converter para array
      if (typeof data === "object") {
        console.log("⚠️ parseJSON: recebeu objeto, tentando converter");
        return Object.values(data).filter(v => v !== null && v !== undefined);
      }

      console.warn("⚠️ parseJSON: tipo inesperado:", typeof data);
      return [];
    };

    // Restaurar dados com parse correto
    const dadosRestaurados = parseJSON(rascunhoData.dadosProcessados);
    const linhasExternosRestauradas = parseJSON(rascunhoData.linhasExternos);
    const linhasPessoalRestauradas = parseJSON(rascunhoData.linhasPessoalEquip);

    // Parse dos dias editados
    let diasEditadosRestaurados = new Set();
    if (rascunhoData.diasEditadosManualmente) {
      const diasArray = parseJSON(rascunhoData.diasEditadosManualmente);
      diasEditadosRestaurados = new Set(diasArray);
    }

    // Enriquecer linhas de externos com informações completas da classe e obra
    const linhasExternosEnriquecidas = linhasExternosRestauradas.map(linha => {
      const enriquecida = { ...linha };

      // Enriquecer informações da classe
      if (linha.classeId && !linha.classe) {
        const classeMeta = classesList.find(c => c.classeId === linha.classeId);
        if (classeMeta) {
          enriquecida.classe = classeMeta.classe;
          enriquecida.classeDescricao = classeMeta.descricao;
        }
      }

      // Enriquecer informações da obra
      if (linha.obraId && (!linha.obraCodigo || !linha.obraNome)) {
        const obraMeta = obrasParaPickers.find(o => Number(o.id) === Number(linha.obraId));
        if (obraMeta) {
          enriquecida.obraCodigo = obraMeta.codigo || '';
          enriquecida.obraNome = obraMeta.nome || `Obra ${linha.obraId}`;
        }
      }

      return enriquecida;
    });

    console.log("📊 Dados a restaurar:", {
      dadosProcessados: dadosRestaurados.length,
      linhasExternos: linhasExternosEnriquecidas.length,
      linhasPessoalEquip: linhasPessoalRestauradas.length,
      diasEditados: diasEditadosRestaurados.size,
    });

    console.log("🔍 Amostra de externo enriquecido:", linhasExternosEnriquecidas[0]);

    // ✅ APLICAR DADOS RESTAURADOS COM VALIDAÇÃO
    console.log("📦 Aplicando dados do rascunho:", {
      colaboradores: dadosRestaurados.length,
      externos: linhasExternosEnriquecidas.length,
      pessoalEquip: linhasPessoalRestauradas.length,
      diasEditados: diasEditadosRestaurados.size,
    });

    // ✅ LIMPAR DADOS EXISTENTES ANTES DE RESTAURAR (evita duplicação)
    console.log("📦 Limpando dados existentes antes de restaurar rascunho...");

    // Aplicar dados restaurados (substitui completamente os dados)
    setDadosProcessados(dadosRestaurados);
    setLinhasExternos(linhasExternosEnriquecidas);
    setLinhasPessoalEquip(linhasPessoalRestauradas);
    setDiasEditadosManualmente(diasEditadosRestaurados);

    setTemRascunho(true);

    // Formatar data para exibição
    const dataRascunho = rascunhoData.createdAt ? new Date(rascunhoData.createdAt) : new Date();

    console.log(
      `✅ Rascunho de ${dataRascunho.toLocaleDateString("pt-PT")} às ${dataRascunho.toLocaleTimeString(
        "pt-PT",
        { hour: "2-digit", minute: "2-digit" }
      )} foi restaurado automaticamente.`
    );

    // ✅ VERIFICAÇÃO FINAL: Se há dados no rascunho mas não foram aplicados, alertar
    if ((dadosRestaurados.length > 0 || linhasExternosEnriquecidas.length > 0 || linhasPessoalRestauradas.length > 0) &&
        dadosProcessados.length === 0 && linhasExternos.length === 0 && linhasPessoalEquip.length === 0) {
      console.warn("⚠️ AVISO: Rascunho tinha dados mas não foram aplicados corretamente!");
      Alert.alert(
        "Aviso",
        "O rascunho foi carregado mas pode haver inconsistências. Verifique os dados antes de submeter.",
        [{ text: "OK" }]
      );
    }

    return true;
  } catch (error) {
    console.error("Erro ao carregar rascunho:", error);
    return false;
  }
}, [mesAno, classesList, obrasParaPickers]);

// Função para carregar rascunho com confirmação (para o botão manual)
const carregarRascunho = useCallback(async () => {
  try {
    const wants = await confirmAction(
      "Carregar rascunho?",
      "Irá substituir os dados atuais pelo ultimo rascunho. Confirma?"
    );
    if (!wants) return false;

    const sucesso = await carregarRascunhoSilencioso();

    if (sucesso) {
      Alert.alert(
        "Rascunho Carregado",
        "Os dados do rascunho foram restaurados com sucesso.",
        [{ text: "OK" }]
      );
    }

    return sucesso;
  } catch (error) {
    console.error("Erro ao carregar rascunho:", error);
    Alert.alert("Erro", `Não foi possível carregar o rascunho: ${error.message}`);
    return false;
  }
}, [carregarRascunhoSilencioso]);



    // Verificar e carregar rascunho automaticamente
    const verificarRascunho = useCallback(async () => {
        try {
            const token = await secureStorage.getItem("loginToken");

            const response = await fetch(`https://backend.advir.pt/api/parte-diaria-rascunho/obter?mes=${mesAno.mes}&ano=${mesAno.ano}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (result.success && result.rascunho) {
                setTemRascunho(true);
                console.log("📦 Rascunho encontrado, carregando automaticamente...");

                // Carregar automaticamente sem perguntar
                await carregarRascunhoSilencioso();
            } else {
                setTemRascunho(false);
            }
        } catch (error) {
            console.error("Erro ao verificar rascunho:", error);
            setTemRascunho(false);
        }
    }, [mesAno]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // 1) carregar e definir submittedSet, e já ter o valor correto aqui
                const novoSet = await carregarItensSubmetidos();
                console.log("🔍 submittedSet contém:", Array.from(novoSet));

                // 2) buscar equipas+registos e processar
                const resultado = (await carregarDados()) || {
                    equipas: [],
                    registos: [],
                };
                const { equipas, registos } = resultado;

                processarDadosPartes(registos, equipas);

                // 3) Verificar se existe rascunho após carregar dados
                await verificarRascunho();
            } catch (err) {
                console.error(err);
                Alert.alert("Erro", "Falha ao carregar dados.");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [mesAno]);

    // ✅ GUARDAR RASCUNHO sempre que houver mudanças nos dados da grade
    useEffect(() => {
        // Só guarda se já terminou o loading inicial
        if (!loading && (dadosProcessados.length > 0 || linhasExternos.length > 0 || linhasPessoalEquip.length > 0)) {
            // Debounce para não guardar excessivamente
            const timer = setTimeout(() => {
                guardarRascunhoAutomatico();
            }, 2000); // Guarda 2 segundos após última alteração

            return () => clearTimeout(timer);
        }
    }, [dadosProcessados, linhasExternos, linhasPessoalEquip, diasEditadosManualmente, loading, guardarRascunhoAutomatico]);

    useEffect(() => {
        carregarObrasTodas();
    }, [carregarObrasTodas]);



    // 🔹 AGREGADOR: Externos por Obra × Dia (para render na grelha)
    const externosPorObra = useMemo(() => {
        const baseHoras = Object.fromEntries(diasDoMes.map((d) => [d, 0]));
        const map = new Map();
        linhasExternos.forEach((l) => {
            const obraId = Number(l.obraId);
            if (!map.has(obraId)) {
                const meta = obrasParaPickers.find((o) => Number(o.id) === obraId);
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
        const baseHoras = Object.fromEntries(diasDoMes.map((d) => [d, 0]));
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
                    funcionario: l.funcionario, // nome do externo
                    empresa: l.empresa, // empresa (opcional)
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
        const baseHoras = Object.fromEntries(diasDoMes.map((d) => [d, 0]));

        // Helper para normalizar nome (remover espaços, acentos e case)
        const normalizarNome = (nome) => {
            return (nome || "")
                .toLowerCase()
                .trim()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, ""); // Remove acentos
        };

        // 1️⃣ Consolidar por pessoa (nome normalizado) e obra
        const consolidadoPorObraPessoa = new Map(); // "nomeNorm|obraId" -> { nome, empresa, horasPorDia, totalMin, obraId }

        // ✅ Adicionar submetidos
        externosSubmetidosPorObraPessoa.forEach((byPessoa, obraId) => {
            byPessoa.forEach((row) => {
                const nomeNorm = normalizarNome(row.funcionario);
                const key = `${nomeNorm}|${obraId}`;

                if (!consolidadoPorObraPessoa.has(key)) {
                    consolidadoPorObraPessoa.set(key, {
                        obraId: Number(obraId),
                        nome: row.funcionario,
                        nomeNorm,
                        empresa: "",
                        horasPorDia: { ...baseHoras },
                        totalMin: 0,
                    });
                }

                const item = consolidadoPorObraPessoa.get(key);
                diasDoMes.forEach((d) => {
                    const mins = row.horasPorDia[d] || 0;
                    item.horasPorDia[d] = (item.horasPorDia[d] || 0) + mins;
                    item.totalMin += mins;
                });
            });
        });

        // 📝 Adicionar/somar pendentes
        externosPorObraPessoa.forEach((byTrab, obraId) => {
            byTrab.forEach((row) => {
                const nomeNorm = normalizarNome(row.funcionario);
                const key = `${nomeNorm}|${obraId}`;

                if (consolidadoPorObraPessoa.has(key)) {
                    // Já existe - somar horas
                    const item = consolidadoPorObraPessoa.get(key);
                    diasDoMes.forEach((d) => {
                        const mins = row.horasPorDia[d] || 0;
                        item.horasPorDia[d] = (item.horasPorDia[d] || 0) + mins;
                        item.totalMin += mins;
                    });
                    item.empresa = row.empresa || item.empresa;
                } else {
                    // Novo (só pendente)
                    consolidadoPorObraPessoa.set(key, {
                        obraId: Number(obraId),
                        nome: row.funcionario,
                        nomeNorm,
                        empresa: row.empresa || "",
                        horasPorDia: { ...row.horasPorDia },
                        totalMin: row.totalMin,
                    });
                }
            });
        });

        // 2️⃣ Adicionar externos das equipas (sem registos) - SÓ se não tiverem dados consolidados
        equipas.forEach((eq) => {
            (eq.membros || []).forEach((mb) => {
                if (!mb?.id || mb.tipo !== 'externo') return;

                const nomeNorm = normalizarNome(mb.nome);

                // Verificar se este externo JÁ tem algum dado (submetido ou pendente)
                const temDados = Array.from(consolidadoPorObraPessoa.keys()).some(k => k.startsWith(`${nomeNorm}|`));

                if (!temDados) {
                    // Só adiciona se não tiver nenhum registo
                    const key = `${nomeNorm}|${OBRA_SEM_ASSOC}`;
                    consolidadoPorObraPessoa.set(key, {
                        obraId: OBRA_SEM_ASSOC,
                        nome: mb.nome,
                        nomeNorm,
                        empresa: mb.empresa || "",
                        horasPorDia: { ...baseHoras },
                        totalMin: 0,
                    });
                }
            });
        });

        // 3️⃣ Agrupar por pessoa (todas as obras de cada externo)
        const mapPessoa = new Map(); // nomeNorm -> { nome, empresa, obras: [] }

        consolidadoPorObraPessoa.forEach((item) => {
            if (!mapPessoa.has(item.nomeNorm)) {
                mapPessoa.set(item.nomeNorm, {
                    nome: item.nome,
                    empresa: item.empresa,
                    obras: [],
                });
            }

            const pessoa = mapPessoa.get(item.nomeNorm);

            // Atualizar empresa se vier melhor informação
            if (item.empresa && !pessoa.empresa) {
                pessoa.empresa = item.empresa;
            }

            // Adicionar obra (evitar duplicatas)
            const jaExiste = pessoa.obras.some(o => Number(o.obraId) === Number(item.obraId));
            if (!jaExiste) {
                const obraMeta = obrasParaPickers.find((o) => Number(o.id) === Number(item.obraId));
                pessoa.obras.push({
                    obraId: item.obraId,
                    obraNome: obraMeta?.nome || (item.obraId === OBRA_SEM_ASSOC ? "Sem obra" : `Obra ${item.obraId}`),
                    horasPorDia: item.horasPorDia,
                    totalMin: item.totalMin,
                });
            }
        });

        // 4️⃣ Converter para array e ordenar
        return [...mapPessoa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
    }, [
        externosSubmetidosPorObraPessoa,
        externosPorObraPessoa,
        diasDoMes,
        obrasParaPickers,
        equipas,
    ]);

    useEffect(() => {
        if (!editData?.categoria) return;

        const carregarCategoriaDinamicamente = async () => {
            const painelToken = await secureStorage.getItem("painelAdminToken");
            const urlempresa = await secureStorage.getItem("urlempresa");

            try {
                const endpoint =
                    editData.categoria === "Equipamentos"
                        ? "GetListaEquipamentos"
                        : "GetListaEspecialidades";

                const res = await fetch(
                    `https://webapiprimavera.advir.pt/routesFaltas/${endpoint}`,
                    {
                        headers: {
                            Authorization: `Bearer ${painelToken}`,
                            urlempresa,
                            "Content-Type": "application/json",
                        },
                    },
                );

                if (!res.ok) throw new Error(`Erro ao obter ${editData.categoria}`);

                const data = await res.json();
                const table = data?.DataSet?.Table;
                if (!Array.isArray(table)) {
                    console.warn(`Formato inesperado de ${editData.categoria}:`, data);
                    setEspecialidades([]);
                    return;
                }

                const itemsFormatados = table
                    .filter((item) => {
                        // Filter for items starting with 'L' if the category is Equipment
                        if (editData.categoria === "Equipamentos") {
                            return item.CDU_CCS != null && item.CDU_CCS !== '' && String(item.Codigo).startsWith('L');
                        }
                        // Otherwise, apply the existing filter
                        return item.CDU_CCS != null && item.CDU_CCS !== '';
                    })
                    .map((item) => {
                        if (editData.categoria === "Equipamentos") {
                            return {
                                codigo: item.Codigo,
                                descricao: item.Desig,
                                subEmpId: item.ComponenteID,
                                cduCcs: item.CDU_CCS,
                            };
                        } else {
                            return {
                                codigo: item.SubEmp,
                                descricao: item.Descricao,
                                subEmpId: item.SubEmpId,
                                cduCcs: item.CDU_CCS,
                            };
                        }
                    });

                setEspecialidades(itemsFormatados);
            } catch (err) {
                console.error(`Erro ao carregar ${editData.categoria}:`, err);
                Alert.alert(
                    "Erro",
                    `Não foi possível carregar os dados de ${editData.categoria}`,
                );
            }
        };

        carregarCategoriaDinamicamente();
    }, [editData?.categoria]);

    // Função para verificar se item já foi submetido
    const itemJaSubmetido = useCallback(
        (codFuncionario, obraId, dia) => {
            const diaStr = String(dia).padStart(2, "0");
            const mesStr = String(mesAno.mes).padStart(2, "0");
            const anoStr = String(mesAno.ano);
            const codRaw = String(codFuncionario ?? "");
            const codTrim = codRaw.replace(/^0+/, ""); // sem zeros à esquerda
            const codPad3 = codTrim.padStart(3, "0"); // com 3 dígitos
            const keyBase = (c) => `${c}-${obraId}-${anoStr}-${mesStr}-${diaStr}`;
            return (
                submittedSet.has(keyBase(codRaw)) ||
                submittedSet.has(keyBase(codTrim)) ||
                submittedSet.has(keyBase(codPad3))
            );
        },
        [submittedSet, mesAno],
    );

    // Minutos a mostrar numa célula: ParteDiária > editado/manual (ignora completamente o ponto)
    const getMinutosCell = useCallback(
        (item, dia) => {
            // Primeiro verifica se há horas submetidas (vindas da API)
            const mPD = item?.horasSubmetidasPorDia?.[dia] || 0;
            if (mPD > 0) return mPD;

            // Depois verifica se há horas editadas manualmente
            const mMan = item?.horasPorDia?.[dia] || 0;
            if (mMan > 0) return mMan;

            // Se não há horas submetidas nem editadas, verifica se existe registo no conjunto de submetidos
            const cod = item.codFuncionario ?? codMap[item.userId];
            if (cod && itemJaSubmetido(cod, item.obraId, dia)) {
                // Se está marcado como submetido mas não temos o valor, tenta buscar dos dados submetidos
                const codNorm = normalizaCod(cod);
                const key = `${codNorm}-${item.obraId}`;
                const submetidoRow = submetidosPorUserObra.get(key);
                if (submetidoRow?.horasPorDia?.[dia]) {
                    return submetidoRow.horasPorDia[dia];
                }
            }

            return 0;
        },
        [codMap, submetidosPorUserObra, itemJaSubmetido],
    );

    const categorias = [
        { label: "Mão de Obra", value: "MaoObra" },
        { label: "Equipamentos", value: "Equipamentos" },
    ];

    // Função para filtrar classes compatíveis com a especialidade selecionada
    const getClassesCompativeis = useCallback((especialidadeCodigo, categoria) => {
        if (!especialidadeCodigo) return classesList;

        const lista = categoria === "Equipamentos" ? equipamentosList : especialidadesList;
        const especialidadeSelecionada = lista.find(esp => esp.codigo === especialidadeCodigo);

        if (!especialidadeSelecionada || !especialidadeSelecionada.cduCcs) {
            return classesList;
        }

        // Dividir o CDU_CCS por vírgulas para obter os códigos compatíveis
        const codigosCompativeis = especialidadeSelecionada.cduCcs.split(',').map(codigo => codigo.trim());

        // Filtrar classes que têm o cduCcs (ou classe) que coincide com algum dos códigos compatíveis
        const classesCompativeis = classesList.filter(classe =>
            codigosCompativeis.includes(String(classe.cduCcs)) ||
            codigosCompativeis.includes(String(classe.classe))
        );

        // Garantir que a classe -1 (Indiferenciada) está sempre presente
        const classeIndiferenciada = classesList.find(c => c.classeId === -1);
        if (classeIndiferenciada && !classesCompativeis.some(c => c.classeId === -1)) {
            classesCompativeis.unshift(classeIndiferenciada);
        }

        return classesCompativeis;
    }, [classesList, especialidadesList, equipamentosList]);

    // === HELPER: extrai as linhas (uma só data + uma só obra) ===
    const montarLinhasDoDia = (item, dia, obraIdDia) => {
        const linhas = [];

        // primeiro tenta usar as especialidades lançadas nesse dia para essa obra
        const espDoDia = (item.especialidades || []).filter(
            (e) =>
                e.dia === dia && Number(e.obraId ?? item.obraId) === Number(obraIdDia),
        );

        if (espDoDia.length > 0) {
            espDoDia.forEach((esp) => {
                const lista =
                    esp.categoria === "Equipamentos"
                        ? equipamentosList
                        : especialidadesList;
                const match =
                    lista.find((opt) => opt.codigo === esp.especialidade) ||
                    lista.find((opt) => opt.descricao === esp.especialidade);

                const minutos = Math.round((parseFloat(esp.horas) || 0) * 60);
                if (minutos > 0) {
                    linhas.push({
                        obraId: obraIdDia,
                        minutos,
                        categoria:
                            esp.categoria === "Equipamentos" ? "Equipamentos" : "MaoObra",
                        subEmpId: esp.subEmpId ?? match?.subEmpId ?? null,
                        horaExtra: !!esp.horaExtra,
                        classeId: esp.classeId || null,
                        observacoes: esp.observacoes || "", // Include observacoes
                    });
                }
            });
            return linhas;
        }

        // se não havia especialidades, usa o default do item (categoria+especialidade) para esse dia
        const minutos = item?.horasPorDia?.[dia] || 0;
        if (minutos > 0) {
            const listaDefault =
                item.categoria === "Equipamentos"
                    ? equipamentosList
                    : especialidadesList;
            const match =
                listaDefault.find((opt) => opt.codigo === item.especialidade) ||
                listaDefault.find((opt) => opt.descricao === item.especialidade);

            linhas.push({
                obraId: obraIdDia,
                minutos,
                categoria:
                    item.categoria === "Equipamentos" ? "Equipamentos" : "MaoObra",
                subEmpId: match?.subEmpId ?? null,
                horaExtra: false,
                classeId: item.classeId || null,
                observacoes: item.observacoes || "", // Include observacoes
            });
        }

        return linhas;
    };

    // === HELPER: cria os itens no documento para uma obra/dia ===
    const postarItensGrupo = async (
        documentoID,
        obraId,
        dataISO,
        codFuncionario,
        linhas,
        nomeExterno = null,
    ) => {
        const painelToken = await secureStorage.getItem("painelAdminToken");

        let numeroSequencial = 1; // contador para numeração correta

        for (let i = 0; i < linhas.length; i++) {
            const l = linhas[i];

            // Para equipamentos, garantir que SubEmpID tem o ComponenteID correto
            let subEmpIdFinal = l.subEmpId ?? null;

            if (l.categoria === "Equipamentos") {
                // ✅ SEMPRE tentar obter o ComponenteId da lista de equipamentos pelo código
                const equipLista = equipamentosList || [];
                const equip = equipLista.find(e => e.codigo === l.especialidadeCodigo || e.codigo === l.especialidade);

                if (equip) {
                    // Usar componenteID da lista (que vem do ComponenteId da API)
                    subEmpIdFinal = equip.componenteID || equip.subEmpId;
                    console.log(`✅ ComponenteID para equipamento ${equip.codigo} (${equip.descricao}): ${subEmpIdFinal}`);
                } else if (!subEmpIdFinal) {
                    console.warn(
                        `⚠️ Equipamento ${l.especialidadeCodigo || l.especialidade} não encontrado na lista em ${dataISO} (obra ${obraId}).`,
                    );
                }
            }

            const [yyyy, mm, dd] = dataISO.split("-").map(Number);
            const tipoHoraId = l.horaExtra
                ? isFimDeSemana(yyyy, mm, dd)
                    ? "H06"
                    : "H01"
                : null;

            const payloadItem = {
                DocumentoID: documentoID,
                ObraID: obraId,
                Data: dataISO,
                Numero: numeroSequencial, // usa contador sequencial
                ColaboradorID: codFuncionario,
                Funcionario: nomeExterno || String(codFuncionario),
                ClasseID: l.classeId || 1, // usar classeId selecionada ou default 1
                SubEmpID: subEmpIdFinal,
                NumHoras: l.minutos,
                PrecoUnit: 0,
                categoria: l.categoria, // 'MaoObra' | 'Equipamentos'
                TipoHoraID: tipoHoraId,
                Observacoes: l.observacoes || "", // Add observacoes field
            };

            console.log(
                `📝 Enviando item ${numeroSequencial} (${l.categoria}) para ${dataISO}:`,
                payloadItem,
            );

            const resp = await fetch(
                "https://backend.advir.pt/api/parte-diaria/itens",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${painelToken}`,
                    },
                    body: JSON.stringify(payloadItem),
                },
            );

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                console.error(
                    `❌ Erro a criar item ${numeroSequencial} em ${dataISO} obra ${obraId}:`,
                    err,
                );
                throw new Error(
                    `Falha ao criar item ${numeroSequencial}: ${err.erro || "Erro desconhecido"}`,
                );
            } else {
                console.log(
                    `✅ Item ${numeroSequencial} (${l.categoria}) criado com sucesso`,
                );
                numeroSequencial++; // incrementa apenas se criou com sucesso
            }
        }
    };

    const [modoVisualizacao, setModoVisualizacao] = useState("obra");

    // Função para converter minutos para formato H:MM
    const formatarHorasMinutos = useCallback((minutos) => {
        if (minutos === 0) return "-";

        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;

        if (horas === 0) {
            return `${mins}m`;
        } else if (mins === 0) {
            return `${horas}h`;
        } else {
            return `${horas}h${mins.toString().padStart(2, "0")}`;
        }
    }, []);

    // Cache key baseado no mês/ano
    const cacheKey = useMemo(
        () => `partes-diarias-${mesAno.mes}-${mesAno.ano}`,
        [mesAno],
    );

    // Função para verificar se o cache é válido
    const isCacheValid = useCallback((key) => {
        const cached = dataCache.get(key);
        if (!cached) return false;
        return Date.now() - cached.timestamp < CACHE_DURATION;
    }, []);

    // Função para obter dados do cache
    const getCachedData = useCallback(
        (key) => {
            if (isCacheValid(key)) {
                return dataCache.get(key).data;
            }
            return null;
        },
        [isCacheValid],
    );

    // Função para armazenar dados no cache
    const setCachedData = useCallback((key, data) => {
        dataCache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }, []);

    const carregarDados = async () => {
        setLoadingProgress(0);

        try {
            // Verificar cache primeiro
            const cachedData = getCachedData(cacheKey);
            if (cachedData) {
                console.log("Carregando dados do cache...");
                setEquipas(cachedData.equipas);
                setObras(cachedData.obras);
                setRegistosPonto(cachedData.registos);
                // constrói o codMap a partir dos membros do cache
                const membrosIds = [];
                cachedData.equipas.forEach((eq) => {
                    (eq.membros || []).forEach((m) => m?.id && membrosIds.push(m.id));
                });
                const uniqueUserIds = [...new Set(membrosIds)];
                const novoCodMap = {};
                await Promise.all(
                    uniqueUserIds.map(async (uid) => {
                        const cod = await obterCodFuncionario(uid);
                        if (cod != null) novoCodMap[uid] = String(cod).padStart(3, "0");
                    }),
                );
                setCodMap(novoCodMap); // isto dispara o useEffect acima e refaz a grelha
                processarDadosPartes(
                    cachedData.registos || [],
                    cachedData.equipas || [],
                );
                return { equipas: cachedData.equipas, registos: cachedData.registos };
            }
            const resultado = await carregarDadosReais();

            return resultado;
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            Alert.alert("Erro", "Erro ao carregar os dados necessários");
        } finally {
        }
    };

    const carregarDadosReais = async () => {
        const token = await secureStorage.getItem("loginToken");
        const tipoUser = await secureStorage.getItem("tipoUser");
        const userId = await secureStorage.getItem("userId");
        const userName = await secureStorage.getItem("userNome");

        if (!token) {
            Alert.alert("Erro", "Token de autenticação não encontrado");
            return;
        }

        try {
            setLoadingProgress(0); // resetar progresso

            // 1. Buscar equipas (todas para admin, minhas para outros)
            console.log("Carregando equipas...");
            let equipasData;

            if (tipoUser === "Administrador") {
                // Administradores veem todos os utilizadores
                const empresaId = await secureStorage.getItem("empresa_id");
                const usersResponse = await fetch(
                    `https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${empresaId}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                );

                if (!usersResponse.ok) {
                    throw new Error("Erro ao carregar utilizadores");
                }

                const users = await usersResponse.json();

                // Criar uma "equipa" virtual com todos os utilizadores
                equipasData = [{
                    id: 0,
                    nome: "Todos os Colaboradores",
                    encarregado_id: null,
                    obraId: null,
                    membros: users.map(u => ({
                        id: u.id,
                        nome: u.nome,
                        codFuncionario: u.codFuncionario
                    }))
                }];
            } else {
                // Utilizadores normais veem apenas suas equipas
                const equipasResponse = await fetch(
                    "https://backend.advir.pt/api/equipa-obra/minhas-agrupadas",
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                );

                if (!equipasResponse.ok) {
                    throw new Error("Erro ao carregar equipas");
                }

                equipasData = await equipasResponse.json();
            }

            setLoadingProgress(10);

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
                obraId: getEquipaObraId(equipa), // <<— guardar a obra associada
                membros: equipa.membros || [],
            }));

            // Adicionar o próprio utilizador à primeira equipa se não existir (apenas para não-administradores)
            if (userId && userName && tipoUser !== "Administrador") {
                const primeiraEquipa = equipasFormatadas[0];
                if (primeiraEquipa) {
                    const jaExiste = primeiraEquipa.membros.some(m => String(m.id) === String(userId));
                    if (!jaExiste) {
                        primeiraEquipa.membros.push({
                            id: parseInt(userId),
                            nome: userName
                        });
                    }
                }
            }

            setEquipas(equipasFormatadas);
            setLoadingProgress(20);

            // 2. Coletar todos os IDs dos membros das equipas
            const membrosIds = [];
            equipasFormatadas.forEach((equipa) => {
                if (equipa.membros) {
                    equipa.membros.forEach((membro) => {
                        if (membro && membro.id && !membrosIds.includes(membro.id)) {
                            membrosIds.push(membro.id);
                        }
                    });
                }
            });
            // Dentro de carregarDadosReais, logo depois de montar equipasFormatadas e membrosIds:
            const uniqueUserIds = [...new Set(membrosIds)];
            const novoCodMap = {};
            await Promise.all(
                uniqueUserIds.map(async (uid) => {
                    const cod = await obterCodFuncionario(uid);
                    if (cod) novoCodMap[uid] = String(cod).padStart(3, "0");
                }),
            );
            setCodMap(novoCodMap);

            console.log("IDs dos membros encontrados:", membrosIds);
            setLoadingProgress(30);

            if (membrosIds.length === 0) {
                console.log("Nenhum membro encontrado nas equipas");
                setObras([]);
                setRegistosPonto([]);
                processarDadosPartes([], equipasFormatadas);
                return;
            }

            // 3. Carregar registos de forma otimizada com requisições paralelas
            const todosRegistos = [];
            const obrasUnicas = new Map();

            console.log("Carregando registos de ponto...");

            // Criar chunks de requisições para não sobrecarregar o servidor
            const CHUNK_SIZE = 5; // Processar 5 membros por vez
            const CONCURRENT_DAYS = 7; // Processar 7 dias por vez

            for (let i = 0; i < membrosIds.length; i += CHUNK_SIZE) {
                const membrosChunk = membrosIds.slice(i, i + CHUNK_SIZE);

                // Para cada chunk de membros, processar dias em paralelo
                for (let j = 0; j < diasDoMes.length; j += CONCURRENT_DAYS) {
                    const diasChunk = diasDoMes.slice(j, j + CONCURRENT_DAYS);

                    const promises = [];

                    membrosChunk.forEach((membroId) => {
                        diasChunk.forEach((dia) => {
                            const dataFormatada = `${mesAno.ano}-${String(mesAno.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

                            const promise = fetch(
                                `https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-e-dia?user_id=${membroId}&data=${dataFormatada}`,
                                {
                                    headers: { Authorization: `Bearer ${token}` },
                                },
                            )
                                .then(async (response) => {
                                    if (response.ok) {
                                        const registosDia = await response.json();
                                        return { membroId, dia, registos: registosDia };
                                    }
                                    return { membroId, dia, registos: [] };
                                })
                                .catch((error) => {
                                    console.log(
                                        `Erro ao buscar registos para membro ${membroId} no dia ${dataFormatada}:`,
                                        error,
                                    );
                                    return { membroId, dia, registos: [] };
                                });

                            promises.push(promise);
                        });
                    });

                    // Aguardar todas as requisições do chunk
                    const results = await Promise.all(promises);

                    // Processar resultados
                    results.forEach(({ registos }) => {
                        registos.forEach((registo) => {
                            if (
                                registo &&
                                registo.User &&
                                registo.Obra &&
                                registo.timestamp
                            ) {
                                todosRegistos.push(registo);

                                // Coletar obras únicas
                                if (!obrasUnicas.has(registo.Obra.id)) {
                                    obrasUnicas.set(registo.Obra.id, {
                                        id: registo.Obra.id,
                                        nome: registo.Obra.nome || "Obra sem nome",
                                        codigo: registo.Obra.codigo || `OBR${String(registo.Obra.id).padStart(3, "0")}`,
                                    });
                                }
                            }
                        });
                    });

                    // Atualizar progresso
                    const progressIncrement =
                        60 /
                        (Math.ceil(membrosIds.length / CHUNK_SIZE) *
                            Math.ceil(diasDoMes.length / CONCURRENT_DAYS));
                    setLoadingProgress((prev) => Math.min(90, prev + progressIncrement));
                }
            }

            const obrasArray = Array.from(obrasUnicas.values());
            console.log("Registos encontrados:", todosRegistos.length);
            console.log("Obras encontradas:", obrasArray.length);

            setLoadingProgress(95);

            setObras(obrasArray);
            setRegistosPonto(todosRegistos);

            // Armazenar no cache
            setCachedData(cacheKey, {
                equipas: equipasFormatadas,
                obras: obrasArray,
                registos: todosRegistos,
            });

            setEquipas(equipasFormatadas);
            setRegistosPonto(todosRegistos);
            setLoadingProgress(100);
            processarDadosPartes(todosRegistos, equipasFormatadas);
            return { equipas: equipasFormatadas, registos: todosRegistos };
        } catch (error) {
            console.error("Erro ao carregar dados reais:", error);
            Alert.alert(
                "Erro",
                "Erro ao carregar dados do servidor: " + error.message,
            );
        }
    };

    const agruparRegistosPorUserObra = useCallback(
        (registos) => {
            const map = new Map();
            for (const r of registos) {
                if (!r?.User?.id || !r?.Obra?.id || !r?.timestamp) continue;
                const dt = new Date(r.timestamp);
                if (dt.getFullYear() !== mesAno.ano || dt.getMonth() + 1 !== mesAno.mes)
                    continue;
                const key = `${r.User.id}-${r.Obra.id}`;
                if (!map.has(key))
                    map.set(key, { user: r.User, obra: r.Obra, registos: [] });
                map.get(key).registos.push(r);
            }
            return [...map.values()];
        },
        [mesAno.ano, mesAno.mes],
    );

    // Memoizar processamento de dados para evitar recálculos desnecessários
    const processarDadosPartes = useCallback(
        (registos, equipasData = equipas) => {
            const linhas = [];

            // ✅ ADICIONA ISTO:
            const registosPorUsuarioObra = agruparRegistosPorUserObra(registos);
            // --- (1) filtra, agrupa e calcula horas do PONTO (igual ao que já tens) ---
            // ... mantém teu código até aqui ...
            registosPorUsuarioObra.forEach((grupo) => {
                const horasPorDia = calcularHorasPorDia(grupo.registos, diasDoMes);

                // Inicializar com zeros - não usar as horas do ponto como padrão
                const horasPorDefeito = {};
                diasDoMes.forEach((d) => (horasPorDefeito[d] = 0));

                const cod = codMap[grupo.user.id] || null;

                linhas.push({
                    id: `${grupo.user.id}-${grupo.obra.id}`,
                    userId: grupo.user.id,
                    userName: grupo.user.nome,
                    codFuncionario: cod,
                    obraId: grupo.obra.id,
                    obraNome: grupo.obra.nome,
                    obraCodigo: grupo.obra.codigo,
                    horasPorDia: horasPorDefeito, // sempre zero inicialmente
                    horasOriginais: horasPorDia, // guarda as horas originais do ponto (apenas para referência)
                    // NEW: se quiseres guardar para UI, mas sem misturar com o ponto
                    horasSubmetidasPorDia: null,
                    totalMinSubmetido: 0,
                    isOriginal: true, // Marca como sendo do ponto original
                    isExterno: false, // Marca como interno
                });
            });

            // --- (2) injeta dados submetidos nas linhas existentes E cria novas se necessário ---
            submetidosPorUserObra.forEach((row, key) => {
                // Procura se já existe uma linha para este utilizador/obra
                const linhaExistente = linhas.find((l) => {
                    const codLinha = normalizaCod(
                        l.codFuncionario || codMap[l.userId] || "",
                    );
                    return (
                        codLinha === row.cod && Number(l.obraId) === Number(row.obraId)
                    );
                });
                
                if (linhaExistente) {
                    // Se já existe, atualiza com os dados submetidos
                    linhaExistente.horasSubmetidasPorDia = row.horasPorDia;
                    linhaExistente.totalMinSubmetido = row.totalMin;
                    linhaExistente.fromSubmittedOnly = false; // tem tanto ponto como PD
                } else {
                    // Se não existe, cria nova linha apenas com dados submetidos
                    const metaUser = codToUser.get(row.cod) || {};
                    const obraMeta = obrasParaPickers.find(o => Number(o.id) === Number(row.obraId));

                    const obraInfo = obraMeta ? {
                        nome: obraMeta.nome,
                        codigo: obraMeta.codigo || `OBR${String(row.obraId).padStart(3, "0")}`
                    } : {
                        nome: `Obra ${row.obraId}`,
                        codigo: `OBR${String(row.obraId).padStart(3, "0")}`
                    };

                    linhas.push({
                        id: `${metaUser.userId ?? `COD${row.cod}`}-${row.obraId}`,
                        userId: metaUser.userId ?? null,
                        userName: metaUser.userName ?? `Colab ${row.cod}`,
                        codFuncionario: row.cod,
                        obraId: row.obraId,
                        obraNome: obraInfo.nome,
                        obraCodigo: obraInfo.codigo,
                        horasPorDia: Object.fromEntries(diasDoMes.map((d) => [d, 0])), // nada de ponto
                        horasOriginais: {},
                        horasSubmetidasPorDia: row.horasPorDia,
                        totalMinSubmetido: row.totalMin,
                        isOriginal: false,
                        fromSubmittedOnly: true, // marca que esta linha vem só da PD
                    });
                }
            });

            // === FUNÇÃO AUXILIAR PARA BUSCAR METADADOS DA OBRA ===
            const obterMetaObra = (obraId) => {
                const obraMeta = obrasParaPickers.find(o => Number(o.id) === Number(obraId));
                if (obraMeta) {
                    return {
                        id: Number(obraId),
                        nome: obraMeta.nome,
                        codigo: obraMeta.codigo || `OBR${String(obraId).padStart(3, "0")}`
                    };
                }
                return {
                    id: Number(obraId),
                    nome: `Obra ${obraId}`,
                    codigo: `OBR${String(obraId).padStart(3, "0")}`
                };
            };

            // === ADICIONA MEMBROS SEM PONTO (linhas vazias) - INTERNOS E EXTERNOS ===
            const existentes = new Set(linhas.map((r) => `${r.userId}-${r.obraId}`));
            const userIdsComLinha = new Set(
                linhas.map((r) => r.userId).filter(Boolean),
            );
            const usersComPonto = new Set();
            (registos || []).forEach((r) => {
                if (!r?.User?.id || !r?.timestamp) return;
                const dt = new Date(r.timestamp);
                if (
                    dt.getFullYear() === mesAno.ano &&
                    dt.getMonth() + 1 === mesAno.mes
                ) {
                    usersComPonto.add(r.User.id);
                }
            });

            // função auxiliar para tentar obter o obraId da equipa
            const guessEquipaObraId = (eq) => {
                const direto =
                    eq.obraId ??
                    eq.obra_id ??
                    eq.ObraID ??
                    eq.ObraId ??
                    (eq.obra && (eq.obra.id ?? eq.obra.ObraID));
                if (direto) return Number(direto);
                const nomeEq = (eq.nome || "").trim().toLowerCase();
                if (!nomeEq) return null;
                const match = (obrasParaPickers || []).find(
                    (o) => (o.nome || "").trim().toLowerCase() === nomeEq,
                );
                return match ? Number(match.id) : null;
            };

            equipasData.forEach((eq) => {
                const obraIdDetected = guessEquipaObraId(eq);

                (eq.membros || []).forEach((mb) => {
                    if (!mb?.id) return;

                    const isExterno = mb.tipo === 'externo';
                    const userId = isExterno ? `externo-${mb.id}` : mb.id;

                    // se a equipa tem obra reconhecida → cria linha vazia dessa obra (se ainda não existir)
                    if (obraIdDetected) {
                        const obraId = Number(obraIdDetected);
                        const key = `${userId}-${obraId}`;
                        if (existentes.has(key)) return;
                        const obraMeta = obterMetaObra(obraId);
                        const baseHoras = Object.fromEntries(diasDoMes.map((d) => [d, 0]));
                        linhas.push({
                            id: `${userId}-${obraId}`,
                            userId: userId,
                            userName: mb.nome + (isExterno ? ` (${mb.empresa || 'Externo'})` : ''),
                            codFuncionario: isExterno ? null : (codMap[mb.id] ?? null),
                            obraId,
                            obraNome: obraMeta.nome,
                            obraCodigo: obraMeta.codigo,
                            horasPorDia: baseHoras,
                            horasOriginais: {},
                            especialidades: [],
                            isOriginal: false,
                            isExterno: isExterno,
                            externoId: isExterno ? mb.id : null,
                            externoEmpresa: isExterno ? mb.empresa : null,
                        });
                        existentes.add(key);
                        return;
                    }

                    // sem obra reconhecida → criar "Sem obra" para externos sempre, para internos só se não tiverem ponto
                    if (isExterno) {
                        // Para externos: sempre criar linha "Sem obra" se não existir nenhuma linha deste externo
                        const temLinhaExistente = Array.from(existentes).some(k => k.startsWith(`${userId}-`));
                        if (temLinhaExistente) return;

                        const keySemObra = `${userId}-${OBRA_SEM_ASSOC}`;
                        if (existentes.has(keySemObra)) return;
                        const baseHoras = Object.fromEntries(diasDoMes.map((d) => [d, 0]));
                        linhas.push({
                            id: `${userId}-${OBRA_SEM_ASSOC}`,
                            userId: userId,
                            userName: mb.nome + ` (${mb.empresa || 'Externo'})`,
                            codFuncionario: null,
                            obraId: OBRA_SEM_ASSOC,
                            obraNome: "Sem obra",
                            obraCodigo: "—",
                            horasPorDia: baseHoras,
                            horasOriginais: {},
                            especialidades: [],
                            isOriginal: false,
                            isExterno: true,
                            externoId: mb.id,
                            externoEmpresa: mb.empresa,
                        });
                        existentes.add(keySemObra);
                    } else {
                        // Para internos: só criar "Sem obra" se não tiverem ponto nem linhas
                        if (usersComPonto.has(mb.id) || userIdsComLinha.has(mb.id)) return;
                        const keySemObra = `${userId}-${OBRA_SEM_ASSOC}`;
                        if (existentes.has(keySemObra)) return;
                        const baseHoras = Object.fromEntries(diasDoMes.map((d) => [d, 0]));
                        linhas.push({
                            id: `${userId}-${OBRA_SEM_ASSOC}`,
                            userId: userId,
                            userName: mb.nome,
                            codFuncionario: codMap[mb.id] ?? null,
                            obraId: OBRA_SEM_ASSOC,
                            obraNome: "Sem obra",
                            obraCodigo: "—",
                            horasPorDia: baseHoras,
                            horasOriginais: {},
                            especialidades: [],
                            isOriginal: false,
                            isExterno: false,
                            externoId: null,
                            externoEmpresa: null,
                        });
                        existentes.add(keySemObra);
                    }
                });
            });

            setDadosProcessados(linhas);
        },
        [
            diasDoMes,
            equipas,
            codMap,
            submetidosPorUserObra,
            obrasParaPickers,
            obras,
            codToUser,
        ],
    );

    // 👉 quando o codMap for preenchido, refaz a grelha para injetar o codFuncionario
    useEffect(() => {
        if (equipas.length) {
            // mesmo que registosPonto esteja vazio, gera linhas a partir das equipas
            processarDadosPartes(registosPonto || [], equipas);
        }
    }, [codMap, registosPonto, equipas, processarDadosPartes]);

    // Memoizar cálculo de horas para melhor performance
    const calcularHorasPorDia = useCallback(
        (registos, diasDoMes) => {
            const horasPorDia = {};

            // Inicializar todos os dias com 0
            diasDoMes.forEach((dia) => {
                horasPorDia[dia] = 0;
            });

            // Agrupar registos por data apenas (não por obra, pois queremos somar por dia)
            const registosPorData = new Map();

            registos.forEach((registo) => {
                const data = new Date(registo.timestamp).toISOString().split("T")[0];

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

                    if (registo.tipo === "entrada") {
                        // Nova entrada - guarda o timestamp
                        ultimaEntrada = new Date(registo.timestamp);
                    } else if (registo.tipo === "saida" && ultimaEntrada) {
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
        },
        [],
    );

    const abrirEdicao = useCallback(
        async (trabalhador, dia) => {
            // Verificar se é um externo vindo da equipa
            if (trabalhador.isExterno && trabalhador.externoId) {
                // Abrir modal de externos
                await carregarExternos();

                // Preencher o formulário com os dados do externo
                const externo = externosLista.find(e => e.id === trabalhador.externoId);

                setLinhaAtual({
                    obraId: trabalhador.obraId !== OBRA_SEM_ASSOC ? trabalhador.obraId : "",
                    dia: dia,
                    trabalhadorId: trabalhador.externoId,
                    horas: "",
                    horaExtra: false,
                    categoria: "MaoObra",
                    especialidadeCodigo: "",
                    subEmpId: null,
                    classeId: null,
                    observacoes: "",
                });

                setModalExternosVisible(true);
                return;
            }

            // Lógica normal para internos
            setSelectedTrabalhador(trabalhador);
            setSelectedDia(dia);

            const especialidadesDia =
                trabalhador.especialidades?.filter((esp) => esp.dia === dia) || [];

            // Verificar se o utilizador atual é diretor
            const userId = await secureStorage.getItem("userId");
            const isProprioUtilizador = String(trabalhador.userId) === String(userId);

            // Encontrar a especialidade e classe por defeito
            let especialidadeDefeito = trabalhador.especialidade || "";
            let subEmpIdDefeito = trabalhador.subEmpId || null;

            if (isProprioUtilizador && especialidadesDia.length === 0) {
                // Procurar a especialidade "Edificações de Estaleiro"
                const espDefeito = especialidadesList.find(
                    (e) => e.descricao && e.descricao.toLowerCase().includes("edificaç") &&
                           e.descricao.toLowerCase().includes("estaleiro")
                );
                if (espDefeito) {
                    especialidadeDefeito = espDefeito.codigo;
                    subEmpIdDefeito = espDefeito.subEmpId;
                }
            }

            setEditData({
                especialidadesDia:
                    especialidadesDia.length > 0
                        ? especialidadesDia.map(esp => ({
                            ...esp,
                            classeId: esp.classeId || null // ✅ Garantir null se não tiver classe definida
                        }))
                        : [
                            {
                                dia,
                                categoria: trabalhador.categoria || "MaoObra",
                                especialidade: especialidadeDefeito,
                                horas: 0, // sempre começar a 0
                                subEmpId: subEmpIdDefeito,
                                obraId: trabalhador.obraId,
                                classeId: null, // ✅ SEMPRE null = "Selecionar classe"
                                notaDia: trabalhador?.notasPorDia?.[dia] ?? "",
                                observacoes: trabalhador.observacoes || "",
                            },
                        ],
                notaDia: trabalhador?.notasPorDia?.[dia] ?? "",
            });
            setEditModalVisible(true);
        },
        [selectedDia, especialidadesList, classesList, externosLista, carregarExternos],
    );

    const adicionarEspecialidade = useCallback(() => {
        const novasEspecialidades = [...(editData.especialidadesDia || [])];

        novasEspecialidades.push({
            dia: selectedDia,
            categoria: "MaoObra",
            especialidade: "",
            subEmpId: null,
            horas: 0,
            obraId: selectedTrabalhador?.obraId,
            horaExtra: false,
            classeId: null, // Add classeId to new speciality
            observacoes: "", // Add observacoes to new speciality
        });

        setEditData({
            ...editData,
            especialidadesDia: novasEspecialidades,
        });
    }, [editData, selectedTrabalhador, selectedDia]);

    const removerEspecialidade = useCallback(
        (index) => {
            if (editData.especialidadesDia.length > 1) {
                const novasEspecialidades = editData.especialidadesDia.filter(
                    (_, i) => i !== index,
                );
                setEditData({
                    ...editData,
                    especialidadesDia: novasEspecialidades,
                });
            }
        },
        [editData],
    );

    const atualizarEspecialidade = (index, campo, valor, subEmpId = null) => {
        const novas = [...editData.especialidadesDia];

        // actualiza o campo
        novas[index] = { ...novas[index], [campo]: valor };

        // se vier subEmpId, actualiza-o também
        if (campo === "especialidade" && subEmpId != null) {
            novas[index].subEmpId = subEmpId;

            // ✅ SEMPRE resetar para null (mostrar "Selecionar classe")
            novas[index].classeId = null;
        }

        if (campo === "categoria") {
            novas[index].especialidade = "";
            novas[index].subEmpId = null;
            // Set classeId to -1 if category is Equipamentos
            if (valor === "Equipamentos") {
                novas[index].classeId = -1;
            } else {
                novas[index].classeId = null; // Reset if not Equipamentos
            }
        }

        setEditData({ ...editData, especialidadesDia: novas });
    };

    const salvarEdicao = useCallback(async () => {
        if (!selectedTrabalhador || !selectedDia) return;

        // ✅ VALIDAÇÃO COMPLETA: obra, horas, especialidade, classe e observações (se classe -1)
        for (let i = 0; i < (editData.especialidadesDia || []).length; i++) {
            const esp = editData.especialidadesDia[i];

            // Validar obra
            const obraId = resolveObraId(esp.obraId, selectedTrabalhador.obraId);
            if (!obraId || obraId === OBRA_SEM_ASSOC) {
                Alert.alert(
                    "Obra Obrigatória",
                    `Por favor, selecione uma obra válida na especialidade ${i + 1}.`,
                    [{ text: "OK" }]
                );
                return;
                   }

            // Validar horas
            const horas = parseFloat(esp.horas) || 0;
            if (horas <= 0) {
                Alert.alert(
                    "Horas Obrigatórias",
                    `Por favor, preencha as horas na especialidade ${i + 1}.`,
                    [{ text: "OK" }]
                );
                return;
            }

            // Validar especialidade
            if (!esp.especialidade || esp.especialidade === "") {
                Alert.alert(
                    "Especialidade Obrigatória",
                    `Por favor, selecione uma especialidade na linha ${i + 1}.`,
                    [{ text: "OK" }]
                );
                return;
            }

            // Validar classe (obrigatória se não for Equipamentos)
            if (esp.categoria !== "Equipamentos" && (!esp.classeId || esp.classeId === null)) {
                Alert.alert(
                    "Classe Obrigatória",
                    `Por favor, selecione uma classe na especialidade ${i + 1}.`,
                    [{ text: "OK" }]
                );
                return;
            }

            // Validar observações se classe -1
            if (esp.classeId === -1 && (!esp.observacoes || esp.observacoes.trim() === "")) {
                Alert.alert(
                    "Observações Obrigatórias",
                    `A classe "Indiferenciada" requer observações obrigatórias.\n\nPor favor, preencha o campo de observações na especialidade ${i + 1}.`,
                    [{ text: "OK" }]
                );
                return;
            }
        }

        // Garante obra em cada linha + calcula minutos
        const linhas = (editData.especialidadesDia || []).map((esp) => {
            const obraIdNormalizada = resolveObraId(
                esp.obraId,
                selectedTrabalhador.obraId,
            );
            return {
                ...esp,
                obraId: obraIdNormalizada,
                minutos: Math.round((parseFloat(esp.horas) || 0) * 60),
            };
        });

        // Validação: não permitir mais de 8h por dia exceto se for hora extra
        const horasNormais = linhas
            .filter((l) => !l.horaExtra)
            .reduce((total, l) => total + l.minutos, 0);
        const horasNormaisDecimal = horasNormais / 60;

        if (horasNormaisDecimal > 8) {
            Alert.alert(
                "Limite de Horas Excedido",
                `Não é possível registar mais de 8 horas normais por dia.\n\nHoras normais tentadas: ${horasNormaisDecimal.toFixed(2)}h\n\nPara registar mais horas, marque como "Hora Extra".`,
                [{ text: "OK" }],
            );
            return;
        }

        // Mapa de minutos por obra
        const minutosPorObra = linhas.reduce((acc, l) => {
            if (l.minutos > 0) acc[l.obraId] = (acc[l.obraId] || 0) + l.minutos;
            return acc;
        }, {});

        setDadosProcessados((prev) => {
            let novo = [...prev];

            // 1) Atualiza o item da obra atual
            novo = novo.map((it) => {
                if (
                    it.userId === selectedTrabalhador.userId &&
                    it.obraId === selectedTrabalhador.obraId
                ) {
                    const minutosAtual = minutosPorObra[selectedTrabalhador.obraId] || 0;
                    const especRest = (it.especialidades || []).filter(
                        (e) => e.dia !== selectedDia,
                    );

                    linhas
                        .filter((l) => l.obraId === it.obraId && l.minutos > 0)
                        .forEach((l) => {
                            especRest.push({
                                dia: selectedDia,
                                especialidade: l.especialidade,
                                categoria: l.categoria,
                                horas: Math.round((l.minutos / 60) * 100) / 100, // guarda em horas decimais
                                subEmpId: l.subEmpId,
                                horaExtra: !!l.horaExtra,
                                classeId: l.classeId,
                                observacoes: l.observacoes || "", // Include observacoes
                            });
                        });

                    return {
                        ...it,
                        horasPorDia: { ...it.horasPorDia, [selectedDia]: minutosAtual },
                        especialidades: especRest,
                        categoria: linhas[0]?.categoria ?? it.categoria,
                        especialidade: linhas[0]?.especialidade ?? it.especialidade,
                        notasPorDia: {
                            ...(it.notasPorDia || {}),
                            [selectedDia]: (editData.notaDia ?? "").trim(),
                        },
                    };
                }
                return it;
            });

            // 2) Para cada outra obra, cria/atualiza o item desse utilizador
            Object.keys(minutosPorObra).forEach((obraIdStr) => {
                const obraId = Number(obraIdStr);
                if (obraId === selectedTrabalhador.obraId) return;

                let idx = novo.findIndex(
                    (it) =>
                        it.userId === selectedTrabalhador.userId && it.obraId === obraId,
                );
                if (idx === -1) {
                    const obraMeta = obras.find((o) => o.id === obraId) || {
                        nome: `Obra ${obraId}`,
                        codigo: `OBR${String(obraId).padStart(3, "0")}`,
                    };
                    const baseHoras = {};
                    diasDoMes.forEach((d) => (baseHoras[d] = 0));

                    novo.push({
                        id: `${selectedTrabalhador.userId}-${obraId}`,
                        userId: selectedTrabalhador.userId,
                        userName: selectedTrabalhador.userName,
                        codFuncionario:
                            selectedTrabalhador.codFuncionario ||
                            codMap[selectedTrabalhador.userId] ||
                            null,
                        obraId,
                        obraNome: obraMeta.nome,
                        obraCodigo: obraMeta.codigo,
                        horasPorDia: baseHoras,
                        horasOriginais: {},
                        especialidades: [],
                        isOriginal: false,
                    });
                    idx = novo.length - 1;
                }

                const it = novo[idx];
                const especRest = (it.especialidades || []).filter(
                    (e) => e.dia !== selectedDia,
                );

                linhas
                    .filter((l) => l.obraId === obraId && l.minutos > 0)
                    .forEach((l) => {
                        especRest.push({
                            dia: selectedDia,
                            especialidade: l.especialidade,
                            categoria: l.categoria,
                            horas: Math.round((l.minutos / 60) * 100) / 100,
                            subEmpId: l.subEmpId,
                            horaExtra: !!l.horaExtra,
                            classeId: l.classeId,
                            observacoes: l.observacoes || "", // Include observacoes
                        });
                    });

                novo[idx] = {
                    ...it,
                    horasPorDia: {
                        ...it.horasPorDia,
                        [selectedDia]: minutosPorObra[obraId],
                    },
                    especialidades: especRest,
                    notasPorDia: {
                        ...(it.notasPorDia || {}),
                        [selectedDia]: (editData.notaDia ?? "").trim(),
                    },
                };
            });

            return novo;
        });

        // Marca o(s) dia(s) editado(s) por obra
        setDiasEditadosManualmente((prev) => {
            const s = new Set(prev);
            Object.keys(minutosPorObra).forEach((obraIdStr) => {
                s.add(
                    `${selectedTrabalhador.userId}-${Number(obraIdStr)}-${selectedDia}`,
                );
            });
            return s;
        });

        setEditModalVisible(false);
        Alert.alert("Sucesso", "Horas distribuídas pelas obras selecionadas.");

        // ✅ GUARDAR RASCUNHO IMEDIATAMENTE (sem timeout)
        await guardarRascunhoAutomatico();
    }, [selectedTrabalhador, selectedDia, editData, obras, diasDoMes, codMap, guardarRascunhoAutomatico]);

    const obterCodFuncionario = async (userId) => {
        const painelToken = await secureStorage.getItem("painelAdminToken");

        const resposta = await fetch(
            `https://backend.advir.pt/api/users/getCodFuncionario/${userId}`,
            {
                headers: {
                    Authorization: `Bearer ${painelToken}`,
                },
            },
        );

        if (!resposta.ok) {
            console.error("Erro ao obter codFuncionario para o user", userId);
            return null;
        }

        const data = await resposta.json();
        return data.codFuncionario;
    };

    // Função para gerar resumo das submissões
    const gerarResumoSubmissao = useCallback(() => {
        const resumo = {
            totalItens: 0,
            totalExternos: linhasExternos.length,
            itensPorTrabalhador: [],
            externosPorObra: new Map(),
            totalHorasNormais: 0,
            totalHorasExtras: 0,
        };

        // Processar dados dos colaboradores
        dadosProcessados.forEach((item) => {
            const diasValidos = diasDoMes.filter((dia) => {
                const chave = `${item.userId}-${item.obraId}-${dia}`;
                const cod = item.codFuncionario ?? codMap[item.userId];
                return (
                    diasEditadosManualmente.has(chave) &&
                    !itemJaSubmetido(cod, item.obraId, dia)
                );
            });

            if (diasValidos.length > 0) {
                let totalMinutosTrabalhador = 0;
                let horasExtrasTrabalhador = 0;

                const diasComHoras = diasValidos
                    .map((dia) => {
                        // Calcular obra destino para este dia
                        let obraIdDia = item.obraId;
                        const espDoDia = (item.especialidades || []).filter(
                            (e) => e.dia === dia,
                        );
                        const espComObra = espDoDia.find(
                            (e) => e.obraId && Number(e.obraId) !== OBRA_SEM_ASSOC,
                        );
                        if (espComObra) {
                            obraIdDia = Number(espComObra.obraId);
                        }

                        // se ainda está “Sem obra” (-1) e não encontramos destino, não submetemos esse dia
                        if (Number(obraIdDia) === OBRA_SEM_ASSOC) {
                            console.warn(
                                `Dia ${dia} ignorado em ${item.userName}: sem obra destino definida.`,
                            );
                            return null; // Ignorar dias sem obra
                        }

                        const linhasDoDia = montarLinhasDoDia(item, dia, obraIdDia);
                        const minutosNormais = linhasDoDia
                            .filter((l) => !l.horaExtra)
                            .reduce((sum, l) => sum + l.minutos, 0);
                        const minutosExtras = linhasDoDia
                            .filter((l) => l.horaExtra)
                            .reduce((sum, l) => sum + l.minutos, 0);

                        totalMinutosTrabalhador += minutosNormais + minutosExtras;
                        horasExtrasTrabalhador += minutosExtras;

                        const obraMeta = obrasParaPickers.find(
                            (o) => Number(o.id) === Number(obraIdDia),
                        );

                        return {
                            dia,
                            obraId: obraIdDia,
                            obraNome: obraMeta?.nome || `Obra ${obraIdDia}`,
                            minutosNormais,
                            minutosExtras,
                            especialidades: linhasDoDia
                                .map((l) => {
                                    const lista =
                                        l.categoria === "Equipamentos"
                                            ? equipamentosList
                                            : especialidadesList;
                                    const item = lista.find((x) => x.subEmpId === l.subEmpId);
                                    return item?.descricao || l.especialidadeCodigo;
                                })
                                .join(", "),
                            classes: linhasDoDia
                                .map((l) => {
                                    if (l.categoria === "Equipamentos") return null;
                                    const classe = classesList.find((c) => c.classeId === l.classeId);
                                    return classe ? `${classe.classe} - ${classe.descricao}` : null;
                                })
                                .filter(Boolean)
                                .join(", "),
                        };
                    })
                    .filter((d) => d !== null);

                if (diasComHoras.length > 0) {
                    resumo.itensPorTrabalhador.push({
                        nome: item.userName,
                        codFuncionario: item.codFuncionario,
                        diasComHoras,
                        totalMinutos: totalMinutosTrabalhador,
                        horasExtras: horasExtrasTrabalhador,
                    });

                    resumo.totalItens++;
                    resumo.totalHorasNormais +=
                        totalMinutosTrabalhador - horasExtrasTrabalhador;
                    resumo.totalHorasExtras += horasExtrasTrabalhador;
                }
            }
        });

        // Processar externos e adicionar ao total de horas
        const gruposExternos = new Map();
        linhasExternos.forEach((l) => {
            const obraId = Number(l.obraId);
            if (!gruposExternos.has(obraId)) {
                const obraMeta = obrasParaPickers.find((o) => Number(o.id) === obraId);
                gruposExternos.set(obraId, {
                    obraNome: obraMeta?.nome || `Obra ${obraId}`,
                    externos: [],
                });
            }
            gruposExternos.get(obraId).externos.push(l);

            // ✅ ADICIONAR HORAS DOS EXTERNOS AO TOTAL
            const minutosExterno = l.horasMin || 0;
            if (l.horaExtra) {
                resumo.totalHorasExtras += minutosExterno;
            } else {
                resumo.totalHorasNormais += minutosExterno;
            }
        });

        resumo.externosPorObra = gruposExternos;

        return resumo;
    }, [
        dadosProcessados,
        linhasExternos,
        diasDoMes,
        diasEditadosManualmente,
        codMap,
        itemJaSubmetido,
        obrasParaPickers,
        montarLinhasDoDia,
    ]);

    const mostrarResumoSubmissao = async () => {
        if (!dadosProcessados || dadosProcessados.length === 0) {
            Alert.alert("Erro", "Não existem dados para submeter.");
            return;
        }

        // Chamar a função para obter o resumo
        const resumoSubmissao = gerarResumoSubmissao();

        // Validar se há algo a submeter
        if (
            resumoSubmissao.itensPorTrabalhador.length === 0 &&
            resumoSubmissao.totalExternos === 0
        ) {
            Alert.alert("Aviso", "Não há partes diárias para submeter.");
            return;
        }

        // Mostrar apenas o modal de resumo (não o modal de confirmação antigo)
        setModalResumoVisible(true);
    };

    const criarParteDiaria = async () => {
        const painelToken = await secureStorage.getItem("painelAdminToken");
        const userLogado = (await secureStorage.getItem("userNome")) || "";

        if (!dadosProcessados || dadosProcessados.length === 0) {
            Alert.alert("Erro", "Não existem dados para submeter.");
            return;
        }

        try {
            for (const item of dadosProcessados) {
                try {
                    // Se for externo, não precisa de codFuncionario
                    let codFuncionario = null;
                    if (!item.isExterno) {
                        codFuncionario = await obterCodFuncionario(item.userId);
                        if (!codFuncionario) {
                            console.warn(`codFuncionario não encontrado para ${item.userName}`);
                            continue;
                        }
                    }

                    // dias que este item (utilizador × obra) realmente precisa submeter
                    const diasValidos = diasDoMes.filter((dia) => {
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
                        const espDoDia = (item.especialidades || []).filter(
                            (e) => e.dia === dia,
                        );
                        const espComObra = espDoDia.find(
                            (e) => e.obraId && Number(e.obraId) !== OBRA_SEM_ASSOC,
                        );

                        if (espComObra) {
                            obraIdDia = Number(espComObra.obraId);
                        }

                        // se ainda está “Sem obra” (-1) e não encontramos destino, não submetemos esse dia
                        if (Number(obraIdDia) === OBRA_SEM_ASSOC) {
                            console.warn(
                                `Dia ${dia} ignorado em ${item.userName}: sem obra destino definida.`,
                            );
                            continue;
                        }

                        const dataISO = `${mesAno.ano}-${String(mesAno.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

                        // cria o cabeçalho certo para esta (obra, dia)
                        const notaCabecalho =
                            item?.notasPorDia && item.notasPorDia[dia]
                                ? String(item.notasPorDia[dia]).trim()
                                : "";

                        const payloadCab = {
                            ObraID: obraIdDia,
                            Data: dataISO,
                            Notas: notaCabecalho, // <- nota definida no editor para este dia
                            CriadoPor: userLogado,
                            Utilizador: userLogado,
                            TipoEntidade: "O",
                            ColaboradorID: item.isExterno ? null : codFuncionario,
                        };

                        const respCab = await fetch(
                            "https://backend.advir.pt/api/parte-diaria/cabecalhos",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${painelToken}`,
                                },
                                body: JSON.stringify(payloadCab),
                            },
                        );

                        if (!respCab.ok) {
                            const err = await respCab.json().catch(() => ({}));
                            console.error(
                                `Erro ao criar cabeçalho (${item.userName}) dia ${dataISO} obra ${obraIdDia}:`,
                                err,
                            );
                            continue;
                        }

                        const cab = await respCab.json();

                        // linhas (especialidades/equipamentos) apenas para este dia e esta obra
                        const linhasDoDia = montarLinhasDoDia(item, dia, obraIdDia);
                        if (linhasDoDia.length === 0) {
                            console.warn(
                                `Sem linhas para ${item.userName} em ${dataISO} (obra ${obraIdDia}).`,
                            );
                            continue;
                        }

                        await postarItensGrupo(
                            cab.DocumentoID,
                            obraIdDia,
                            dataISO,
                            item.isExterno ? null : codFuncionario,
                            linhasDoDia,
                            item.isExterno ? item.userName : null,
                        );
                    }
                } catch (e) {
                    console.error(`Erro geral com o item ${item.userName}:`, e);
                }
            }

            // ——— externos (como já fazias), mas silencioso para não duplicar alerts ———
            const haviaExternos = linhasExternos.length > 0;
            const submeteuExternos = haviaExternos
                ? await submeterExternosSilencioso()
                : false;

            setModalVisible(false); // Fecha o modal de confirmação geral (não o de resumo)
            setDiasEditadosManualmente(new Set());

            // ✅ ELIMINAR RASCUNHO APÓS SUBMISSÃO COM SUCESSO
            try {
                const token = await secureStorage.getItem("loginToken");
                const response = await fetch(
                    `https://backend.advir.pt/api/parte-diaria-rascunho/eliminar?mes=${mesAno.mes}&ano=${mesAno.ano}`,
                    {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                if (response.ok) {
                    console.log("✅ Rascunho eliminado após submissão com sucesso");
                    setTemRascunho(false);
                } else {
                    console.warn("⚠️ Erro ao eliminar rascunho após submissão:", await response.text());
                }
            } catch (error) {
                console.error("❌ Erro ao eliminar rascunho após submissão:", error);
            }

            await carregarDados();
            await carregarItensSubmetidos();

            Alert.alert(
                "Sucesso",
                submeteuExternos
                    ? "Partes diárias e externos submetidos com sucesso."
                    : "Partes diárias submetidas com sucesso.",
            );
        } catch (e) {
            console.error("Erro ao submeter partes diárias:", e);
            Alert.alert(
                "Erro",
                e.message || "Ocorreu um erro ao submeter as partes diárias.",
            );
        }
    };

    const resolveObraId = (espObraId, trabObraId) => {
        const toNum = (v) => (v == null ? null : Number(v));
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
        // Recolher linhas de externos do modal + externos das equipas com horas
        const linhasParaSubmeter = [...linhasExternos];

        // Adicionar externos das equipas que têm horas registadas
        dadosProcessados.forEach(item => {
            if (item.isExterno && item.externoId) {
                diasDoMes.forEach(dia => {
                    const minutos = item?.horasPorDia?.[dia] || 0;
                    if (minutos > 0) {
                        const especialidadesDia = (item.especialidades || []).filter(e => e.dia === dia);

                        especialidadesDia.forEach(esp => {
                            const lista =
                                esp.categoria === "Equipamentos" ? equipamentosList : especialidadesList;
                            const sel = lista.find(x => x.codigo === esp.especialidade);

                            linhasParaSubmeter.push({
                                key: `equipa-${item.externoId}-${item.obraId}-${dia}-${Date.now()}`,
                                obraId: Number(item.obraId),
                                dia: Number(dia),
                                trabalhadorId: item.externoId,
                                funcionario: item.userName.replace(/\s*\(.*?\)\s*$/, '').trim(),
                                empresa: item.externoEmpresa || '—',
                                horasMin: Math.round((parseFloat(esp.horas) || 0) * 60),
                                horaExtra: !!esp.horaExtra,
                                categoria: esp.categoria || "MaoObra",
                                especialidadeCodigo: esp.especialidade,
                                especialidadeDesc: sel?.descricao ?? "",
                                subEmpId: sel?.subEmpId ?? null,
                                classeId: esp.classeId || null,
                                observacoes: esp.observacoes || "",
                                horas: esp.horas,
                            });
                        });
                    }
                });
            }
        });

        if (linhasParaSubmeter.length === 0) return false;

        try {
            const painelToken = await secureStorage.getItem("painelAdminToken");
            const userLogado = (await secureStorage.getItem("userNome")) || "";

            // Agrupar por (obraId, dia)
const grupos = new Map();
for (const l of linhasParaSubmeter) {
    const dataISO = `${mesAno.ano}-${String(mesAno.mes).padStart(2, "0")}-${String(l.dia).padStart(2, "0")}`;
    const key = `${l.obraId}|${dataISO}`;
    if (!grupos.has(key)) {
        grupos.set(key, { obraId: l.obraId, dataISO, linhas: [] });
    }
    grupos.get(key).linhas.push(l);
}

            for (const [, grp] of grupos.entries()) {
                // 1) cabeçalho
                const cabecalho = {
                    ObraID: grp.obraId,
                    Data: grp.dataISO,
                    Notas: "Parte diária de EXTERNOS",
                    CriadoPor: userLogado,
                    Utilizador: userLogado,
                    TipoEntidade: "O",
                    ColaboradorID: null,
                };

               const respCab = await fetch(
                                        "https://backend.advir.pt/api/parte-diaria/cabecalhos",
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${painelToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(cabecalho),
                    },
                );
                if (!respCab.ok) {
                    const err = await respCab.json().catch(() => ({}));
                    throw new Error(
                        err?.message || "Falha ao criar cabeçalho para externos.",
                    );
                }
                const cab = await respCab.json();

                // 2) itens
                for (let i = 0; i < grp.linhas.length; i++) {
                    const l = grp.linhas[i];
                    const tipoHoraId = l.horaExtra
                        ? isFimDeSemana(mesAno.ano, mesAno.mes, l.dia)
                            ? "H06"
                            : "H01"
                        : null;

                    const item = {
                        DocumentoID: cab.DocumentoID,
                        ObraID: grp.obraId,
                        Data: grp.dataISO,
                        Numero: i + 1,
                        ColaboradorID: null,
                        Funcionario: `${l.funcionario} (Externo)`,
                        ClasseID: l.classeId || 1, // Use selected classeId or default
                        SubEmpID: l.subEmpId ?? null,
                        NumHoras: l.horasMin,
                        PrecoUnit: l.valor || 0,
                        categoria: l.categoria || "MaoObra",
                        TipoHoraID: tipoHoraId,
                        Observacoes: l.observacoes || "", // Include observacoes
                    };

                    const respItem = await fetch(
                        "https://backend.advir.pt/api/parte-diaria/itens",
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${painelToken}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(item),
                        },
                    );
                    if (!respItem.ok) {
                        const err = await respItem.json().catch(() => ({}));
                        throw new Error(
                            err?.message || `Falha ao criar item externo (${l.funcionario}).`,
                        );
                    }
                }
            }

            // sucesso: limpa a lista local para não submeter de novo
            setLinhasExternos([]);
            return true;
        } catch (e) {
            console.error("Erro ao submeter externos (silencioso):", e);
            Alert.alert("Erro", e.message || "Ocorreu um erro ao submeter externos.");
            return false;
        }
    };

    const renderHeader = () => (
        <LinearGradient colors={["#1792FE", "#0B5ED7"]} style={styles.header}>
            <Text style={styles.headerTitle}>Partes Diárias - Minhas Equipas</Text>
            <Text style={styles.headerSubtitle}>
                {new Date(mesAno.ano, mesAno.mes - 1).toLocaleDateString("pt-PT", {
                    month: "long",
                    year: "numeric",
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
                    {new Date(mesAno.ano, mesAno.mes - 1).toLocaleDateString("pt-PT", {
                        month: "long",
                        year: "numeric",
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
                    onPress={() =>
                        setModoVisualizacao((prev) => (prev === "obra" ? "user" : "obra"))
                    }
                >
                    <LinearGradient
                        colors={["#1792FE", "#0B5ED7"]}
                        style={styles.buttonGradient}
                    >
                        <FontAwesome name="exchange" size={16} color="#FFFFFF" />
                        <Text style={styles.buttonText}>
                            {modoVisualizacao === "obra"
                                ? "Vista por Utilizador"
                                : "Vista por Obra"}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={mostrarResumoSubmissao}
                >
                    <LinearGradient
                        colors={["#1792FE", "#1792FE"]}
                        style={styles.buttonGradient}
                    >
                        <FontAwesome name="save" size={16} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Enviar Partes</Text>
                    </LinearGradient>
                </TouchableOpacity>





                {/* BOTÃO DE LIMPAR PARTES */}
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={async () => {
                        const wants = await confirmAction(
                            "Limpar Partes?",
                            "Vai eliminar todas as alterações não submetidas e o rascunho guardado. Confirma?"
                        );
                        if (!wants) return;

                        setLoading(true);

                        // ✅ Eliminar rascunho do backend
                        try {
                            const token = await secureStorage.getItem("loginToken");
                            const response = await fetch(
                                `https://backend.advir.pt/api/parte-diaria-rascunho/eliminar?mes=${mesAno.mes}&ano=${mesAno.ano}`,
                                {
                                    method: "DELETE",
                                    headers: { Authorization: `Bearer ${token}` },
                                }
                            );

                            if (response.ok) {
                                console.log("✅ Rascunho eliminado do backend com sucesso");
                            } else {
                                console.warn("⚠️ Erro ao eliminar rascunho:", await response.text());
                            }
                        } catch (error) {
                            console.error("❌ Erro ao eliminar rascunho:", error);
                        }

                        // ✅ Limpar TODOS os dados locais
                        setDiasEditadosManualmente(new Set());
                        setLinhasExternos([]);
                        setLinhasPessoalEquip([]);
                        setDadosProcessados([]);
                        setTemRascunho(false);

                        // Recarregar dados
                        await carregarItensSubmetidos();
                        await carregarDados();

                        setLoading(false);

                        Alert.alert("Sucesso", "Todas as alterações foram limpas e o rascunho eliminado.");
                    }}
                >
                    <LinearGradient
                        colors={["#007bff", "#0056b3"]}
                        style={styles.buttonGradient}
                    >
                        <Ionicons name="refresh" size={16} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Limpar Partes</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                style={styles.actionButton}
                onPress={abrirModalPessoalEquip}
                >
                <LinearGradient colors={["#1792FE", "#1792FE"]} style={styles.buttonGradient}>
                    <Ionicons name="person-add" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Pessoal/Equipamentos</Text>
                </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={abrirModalExternos}
                >
                    <LinearGradient
                        colors={["#1792FE", "#1792FE"]}
                        style={styles.buttonGradient}
                    >
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
                // Buscar metadados completos da obra
                const obraMeta = obrasParaPickers.find(o => Number(o.id) === Number(item.obraId));
                const codigoObra = obraMeta?.codigo || item.obraCodigo || `OBR${String(item.obraId).padStart(3, "0")}`;
                const nomeObra = obraMeta?.nome || item.obraNome || `Obra ${item.obraId}`;

                acc[obraKey] = {
                    obraInfo: {
                        id: item.obraId,
                        nome: nomeObra,
                        codigo: codigoObra,
                    },
                    trabalhadores: [],
                };
            }
            acc[obraKey].trabalhadores.push(item);
            return acc;
        }, {});
    }, [dadosProcessados, obrasParaPickers]);

    const dadosAgrupadosPorUser = useMemo(() => {
        return dadosProcessados.reduce((acc, item) => {
            const userKey = item.userId;
            if (!acc[userKey]) {
                acc[userKey] = {
                    userInfo: {
                        id: item.userId,
                        nome: item.userName,
                    },
                    obras: [],
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
                        colors={["#1792FE", "#1792FE"]}
                        style={styles.externosModalHeader}
                    >
                        <View style={styles.externosModalHeaderContent}>
                            <View style={styles.externosModalTitleContainer}>
                                <Ionicons name="people" size={24} color="#fff" />
                                <Text style={styles.externosModalTitle}>
                                    Trabalhadores Externos
                                </Text>
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
                                <Ionicons name="document-text" size={16} color="#1792FE" /> Novo
                                Registo
                            </Text>

                            {/* Grid responsivo para campos */}
                            <View style={styles.externosFormGrid}>
                                {/* Obra */}
                                <View style={styles.externosInputGroup}>
                                    <Text style={styles.externosInputLabel}>
                                        <Ionicons name="business" size={14} color="#666" /> Obra *
                                    </Text>
                                    <View style={[
                                        styles.externosPickerWrapper,
                                        camposInvalidos.has('obraId') && { borderColor: '#dc3545', borderWidth: 2 }
                                    ]}>
                                        <Picker
                                            selectedValue={String(linhaAtual.obraId || "")}
                                            onValueChange={(v) => {
                                                setLinhaAtual((p) => ({ ...p, obraId: v === "" ? "" : Number(v) }));
                                                setCamposInvalidos(prev => {
                                                    const novo = new Set(prev);
                                                    novo.delete('obraId');
                                                    return novo;
                                                });
                                            }}
                                            style={styles.externosPicker}
                                        >
                                            <Picker.Item label="— Selecionar obra —" value="" />
                                            {obrasParaPickers.map((o) => (
                                                <Picker.Item key={o.id} label={`${o.codigo ? `${o.codigo} — ` : ""}${o.nome}`} value={String(o.id)} />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>

                                {/* Dia */}
                                <View style={styles.externosInputGroup}>
                                    <Text style={styles.externosInputLabel}>
                                        <Ionicons name="calendar" size={14} color="#666" /> Dia *
                                    </Text>
                                    <View style={[
                                        styles.externosPickerWrapper,
                                        camposInvalidos.has('dia') && { borderColor: '#dc3545', borderWidth: 2 }
                                    ]}>
                                        <Picker
                                            selectedValue={String(linhaAtual.dia || "")}
                                            onValueChange={(v) => {
                                                setLinhaAtual((p) => ({ ...p, dia: v === "" ? "" : Number(v) }));
                                                setCamposInvalidos(prev => {
                                                    const novo = new Set(prev);
                                                    novo.delete('dia');
                                                    return novo;
                                                });
                                            }}
                                            style={styles.externosPicker}
                                        >
                                            <Picker.Item label="— Selecionar dia —" value="" />
                                            {diasDoMes.map((d) => {
                                                // Verificar se já existe registo para este dia/trabalhador/obra
                                                const jaRegistado = linhaAtual.trabalhadorId && linhaAtual.obraId &&
                                                    linhasExternos.some(
                                                        (l) => String(l.trabalhadorId) === String(linhaAtual.trabalhadorId) &&
                                                               l.dia === d &&
                                                               String(l.obraId) === String(linhaAtual.obraId)
                                                    );

                                                return (
                                                    <Picker.Item
                                                        key={d}
                                                        label={jaRegistado ? `Dia ${d} ✓ (já registado)` : `Dia ${d}`}
                                                        value={String(d)}
                                                        color={jaRegistado ? "#28a745" : "#000"}
                                                    />
                                                );
                                            })}
                                        </Picker>
                                    </View>
                                </View>
                            </View>

                            {/* Filtro por Empresa */}
                            <View style={styles.externosInputGroup}>
                                <Text style={styles.externosInputLabel}>
                                    <Ionicons name="business" size={14} color="#666" /> Filtrar
                                    por Empresa
                                </Text>
                                <View style={styles.externosPickerWrapper}>
                                    <Picker
                                        selectedValue={empresaFiltroExternos}
                                        onValueChange={(v) => {
                                            setEmpresaFiltroExternos(v);
                                            // Limpar seleção do trabalhador quando muda empresa
                                            setLinhaAtual((p) => ({ ...p, trabalhadorId: "" }));
                                        }}
                                        style={styles.externosPicker}
                                    >
                                        <Picker.Item label="— Todas as empresas —" value="" />
                                        {empresasExternosDisponiveis.map((empresa) => (
                                            <Picker.Item
                                                key={empresa}
                                                label={empresa}
                                                value={empresa}
                                            />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            {/* Trabalhador Externo */}
                            <View style={styles.externosInputGroup}>
                                <Text style={styles.externosInputLabel}>
                                    <Ionicons name="person" size={14} color="#666" /> Trabalhador Externo *
                                </Text>
                                <View style={[
                                    styles.externosPickerWrapper,
                                    camposInvalidos.has('trabalhadorId') && { borderColor: '#dc3545', borderWidth: 2 }
                                ]}>
                                    <Picker
                                        selectedValue={String(linhaAtual.trabalhadorId || "")}
                                        onValueChange={(v) => {
                                            setLinhaAtual((p) => ({ ...p, trabalhadorId: v === "" ? "" : Number(v) }));
                                            setCamposInvalidos(prev => {
                                                const novo = new Set(prev);
                                                novo.delete('trabalhadorId');
                                                return novo;
                                            });
                                        }}
                                        style={styles.externosPicker}
                                    >
                                        <Picker.Item label="— Selecionar trabalhador —" value="" />
                                        {externosFiltrados.map((ext) => {
                                            // Obtém os dias já registados para este trabalhador e obra selecionada
                                            const diasRegistados = linhasExternos
                                                .filter(l => String(l.trabalhadorId) === String(ext.id) &&
                                                           String(l.obraId) === String(linhaAtual.obraId))
                                                .map(l => l.dia)
                                                .sort((a, b) => a - b);

                                            // Formata a label para incluir os dias já registados
                                            const labelExtra = diasRegistados.length > 0
                                                ? ` (Dias: ${diasRegistados.join(', ')})`
                                                : '';

                                            return (
                                                <Picker.Item
                                                    key={ext.id}
                                                    label={`${ext.funcionario} - ${ext.empresa}${labelExtra}`}
                                                    value={String(ext.id)}
                                                />
                                            );
                                        })}
                                    </Picker>
                                </View>
                            </View>

                            {/* Indicador de dias já registados - MELHORADO */}
                            {linhaAtual.trabalhadorId && linhaAtual.obraId && (
                                (() => {
                                    const diasRegistados = linhasExternos
                                        .filter(l => String(l.trabalhadorId) === String(linhaAtual.trabalhadorId) &&
                                                   String(l.obraId) === String(linhaAtual.obraId))
                                        .map(l => l.dia)
                                        .sort((a, b) => a - b);

                                    const trabalhadorNome = externosLista.find(e => String(e.id) === String(linhaAtual.trabalhadorId))?.funcionario || 'Trabalhador';
                                    const obraNome = obrasParaPickers.find(o => String(o.id) === String(linhaAtual.obraId))?.nome || 'Obra';

                                    return (
                                        <View style={{
                                            backgroundColor: diasRegistados.length > 0 ? '#fff3cd' : '#e7f3ff',
                                            padding: 12,
                                            borderRadius: 8,
                                            marginBottom: 10,
                                            borderLeftWidth: 4,
                                            borderLeftColor: diasRegistados.length > 0 ? '#ffc107' : '#1792FE'
                                        }}>
                                            <Text style={{ fontSize: 13, color: '#333', fontWeight: '600', marginBottom: 4 }}>
                                                {diasRegistados.length > 0 ? '⚠️' : 'ℹ️'} {trabalhadorNome} - {obraNome}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: '#666' }}>
                                                {diasRegistados.length > 0
                                                    ? `Dias já registados: ${diasRegistados.join(', ')}`
                                                    : 'Nenhum registo ainda. Selecione um dia disponível.'
                                                }
                                            </Text>
                                        </View>
                                    );
                                })()
                            )}

                            {/* Categoria com botões melhorados */}
                            <View style={styles.externosInputGroup}>
                                <Text style={styles.externosInputLabel}>
                                    <Ionicons name="layers" size={14} color="#666" /> Categoria *
                                </Text>
                                <View style={styles.externosCategoryButtons}>
                                    {[
                                        { label: "Mão de Obra", value: "MaoObra", icon: "people" },
                                        {
                                            label: "Equipamentos",
                                            value: "Equipamentos",
                                            icon: "construct",
                                        },
                                    ].map((opt) => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[
                                                styles.externosCategoryButton,
                                                linhaAtual.categoria === opt.value &&
                                                styles.externosCategoryButtonActive,
                                            ]}
                                            onPress={() => {
                                                const novaClasseId = opt.value === "Equipamentos" ? -1 : null;
                                                setLinhaAtual((p) => ({ ...p, categoria: opt.value, especialidadeCodigo: "", subEmpId: null, classeId: novaClasseId }));
                                            }}
                                        >
                                            <Ionicons
                                                name={opt.icon}
                                                size={16}
                                                color={
                                                    linhaAtual.categoria === opt.value
                                                        ? "#fff"
                                                        : "#1792FE"
                                                }
                                            />
                                            <Text
                                                style={[
                                                    styles.externosCategoryButtonText,
                                                    linhaAtual.categoria === opt.value &&
                                                    styles.externosCategoryButtonTextActive,
                                                ]}
                                            >
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
                                        name={
                                            linhaAtual.categoria === "Equipamentos"
                                                ? "construct"
                                                : "hammer"
                                        }
                                        size={14}
                                        color="#666"
                                    />{" "}
                                    {linhaAtual.categoria === "Equipamentos"
                                        ? "Equipamento"
                                        : "Especialidade"}{" "}
                                    *
                                </Text>
                                <View style={[
                                    styles.externosPickerWrapper,
                                    camposInvalidos.has('especialidadeCodigo') && { borderColor: '#dc3545', borderWidth: 2 }
                                ]}>
                                    <Picker
                                        selectedValue={linhaAtual.especialidadeCodigo}
                                        onValueChange={(cod) => {
                                            const lista =
                                                linhaAtual.categoria === "Equipamentos"
                                                    ? equipamentosList
                                                    : especialidadesList;
                                            const sel = lista.find((x) => x.codigo === cod);

                                            // ✅ SEMPRE null para Mão de Obra, -1 para Equipamentos
                                            const novaClasse = linhaAtual.categoria === "Equipamentos" ? -1 : null;

                                            setLinhaAtual((p) => ({
                                                ...p,
                                                especialidadeCodigo: cod,
                                                subEmpId: sel?.subEmpId ?? null,
                                                classeId: novaClasse,
                                            }));

                                            setCamposInvalidos(prev => {
                                                const novo = new Set(prev);
                                                novo.delete('especialidadeCodigo');
                                                return novo;
                                            });
                                        }}
                                        style={styles.externosPicker}
                                    >
                                        <Picker.Item
                                            label={`— Selecionar ${linhaAtual.categoria === "Equipamentos" ? "equipamento" : "especialidade"} —`}
                                            value=""
                                        />
                                        {(linhaAtual.categoria === "Equipamentos"
                                            ? equipamentosList
                                            : especialidadesList
                                        ).map((opt) => (
                                            <Picker.Item
                                                key={opt.codigo}
                                                label={opt.descricao}
                                                value={opt.codigo}
                                            />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            {/* Classe - NOVO CAMPO */}
                            <View style={styles.externosInputGroup}>
                                <Text style={styles.externosInputLabel}>
                                    <Ionicons name="library" size={14} color="#666" /> Classe *
                                </Text>
                                <View style={[
                                    styles.externosPickerWrapper,
                                    camposInvalidos.has('classeId') && { borderColor: '#dc3545', borderWidth: 2 }
                                ]}>
                                    <Picker
                                        selectedValue={linhaAtual.classeId}
                                        onValueChange={(v) => {
                                            setLinhaAtual((p) => ({ ...p, classeId: v }));
                                            setCamposInvalidos(prev => {
                                                const novo = new Set(prev);
                                                novo.delete('classeId');
                                                return novo;
                                            });
                                        }}
                                        style={styles.externosPicker}
                                    >
                                        <Picker.Item label="— Selecionar classe —" value={null} />
                                        {getClassesCompativeis(linhaAtual.especialidadeCodigo, linhaAtual.categoria).map((classe) => (
                                            <Picker.Item
                                                key={classe.classeId}
                                                label={`${classe.classe} - ${classe.descricao}`}
                                                value={classe.classeId}
                                            />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            {/* Grid para Horas e Hora Extra */}
                            <View style={styles.externosFormGrid}>
                                <View style={[styles.externosInputGroup, { flex: 2 }]}>
                                    <Text style={styles.externosInputLabel}>
                                        <Ionicons name="time" size={14} color="#666" /> {getUnidadeLabel(linhaAtual.especialidadeCodigo, linhaAtual.categoria)} *
                                    </Text>
                                    <TextInput
                                        style={[
                                            styles.externosTextInput,
                                            camposInvalidos.has('horas') && { borderColor: '#dc3545', borderWidth: 2 }
                                        ]}
                                        value={linhaAtual.horas}
                                        onChangeText={(v) => {
                                            setCamposInvalidos(prev => {
                                                const novo = new Set(prev);
                                                novo.delete('horas');
                                                return novo;
                                            });
                                            const { colaboradorId, dia, obraId } = linhaAtual;
                                            if (!colaboradorId || !dia || !obraId) {
                                                Alert.alert("Validação", "Preencha primeiro Obra, Dia e Colaborador.");
                                                return;
                                            }
                                            const minutos = parseHorasToMinutos(v);
                                            if (minutos <= 0 && v !== "") {
                                                Alert.alert("Validação", "Formato inválido. Use H:MM ou H.MM (ex: 2:30 ou 2.5)");
                                                return;
                                            }
                                            if (!linhaAtual.horaExtra) {
                                                const outras = linhasExternos
                                                    .filter(l => String(l.trabalhadorId) === String(linhaAtual.trabalhadorId) &&
                                                               l.dia === dia &&
                                                               !l.horaExtra)
                                                    .reduce((tot, l) => tot + parseHorasToMinutos(l.horas), 0);
                                                if (outras + minutos > 8*60 && v !== "") {
                                                    Alert.alert("Limite de Horas Excedido",
                                                      `Não é possível registar mais de 8 horas normais por dia.\n\nJá registadas: ${formatarHorasMinutos(outras)}\n\nPara mais horas, marque como "Hora Extra".`
                                                    );
                                                    return;
                                                  }
                                            }
                                            setLinhaAtual((p) => ({ ...p, horas: v }));
                                        }}
                                        placeholder="0:00"
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
                                            linhaAtual.horaExtra &&
                                            styles.externosCheckboxContainerActive,
                                        ]}
                                        onPress={() =>
                                            setLinhaAtual((p) => ({ ...p, horaExtra: !p.horaExtra }))
                                        }
                                    >
                                        <Ionicons
                                            name={
                                                linhaAtual.horaExtra
                                                    ? "checkmark-circle"
                                                    : "ellipse-outline"
                                            }
                                            size={20}
                                            color={linhaAtual.horaExtra ? "#fff" : "#1792FE"}
                                        />
                                        <Text
                                            style={[
                                                styles.externosCheckboxText,
                                                linhaAtual.horaExtra &&
                                                styles.externosCheckboxTextActive,
                                            ]}
                                        >
                                            Sim
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Observações - NOVO CAMPO */}
                            <View style={styles.externosInputGroup}>
                                <Text style={styles.externosInputLabel}>
                                    <Ionicons name="chatbubble-ellipses" size={14} color="#666" />{" "}
                                    Observações{linhaAtual.classeId === -1 ? ' *' : ''}
                                </Text>
                                <TextInput
                                    style={[
                                        styles.externosTextInput,
                                        camposInvalidos.has('observacoes') && { borderColor: '#dc3545', borderWidth: 2 }
                                    ]}
                                    value={linhaAtual.observacoes}
                                    onChangeText={(v) => {
                                        setCamposInvalidos(prev => {
                                            const novo = new Set(prev);
                                            novo.delete('observacoes');
                                            return novo;
                                        });
                                        setLinhaAtual((p) => ({ ...p, observacoes: v }));
                                    }}
                                    placeholder={linhaAtual.classeId === -1 ? "Obrigatório para classe Indiferenciada" : "Notas adicionais sobre este registo"}
                                    multiline
                                    numberOfLines={2}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Botão de adicionar */}
                            <TouchableOpacity
                                onPress={adicionarLinhaExterno}
                                style={styles.externosAddButton}
                            >
                                <LinearGradient
                                    colors={["#1792FE", "#1792FE"]}
                                    style={styles.externosAddButtonGradient}
                                >
                                    <Ionicons name="add-circle" size={18} color="#fff" />
                                    <Text style={styles.externosAddButtonText}>
                                        Adicionar à Lista
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* Lista de itens adicionados */}
                        {linhasExternos.length > 0 && (
                            <View style={styles.externosListCard}>
                                <Text style={styles.externosListTitle}>
                                    <Ionicons name="list" size={16} color="#1792FE" />
                                    Itens para Submeter ({linhasExternos.length})
                                </Text>

                                {linhasExternos.map((l) => (
                                    <View key={l.key} style={styles.externosListItem}>
                                        <View style={styles.externosListItemContent}>
                                            <View style={styles.externosListItemHeader}>
                                                <Text style={styles.externosListItemName}>
                                                    {l.funcionario}
                                                </Text>
                                                <View style={styles.externosListItemBadge}>
                                                    <Text style={styles.externosListItemBadgeText}>
                                                        {formatarHorasMinutos(l.horasMin)}
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text style={styles.externosListItemDetails}>
                                                <Ionicons name="business" size={12} color="#666" />{" "}
                                                {l.empresa}
                                                {" • "}
                                                <Ionicons
                                                    name="calendar"
                                                    size={12}
                                                    color="#666"
                                                /> Dia {l.dia}
                                                {" • "}
                                                {l.horaExtra && " • Extra"}
                                            </Text>
                                            <Text style={styles.externosListItemCategory}>
                                                <Ionicons name="business" size={12} color="#666" />{" "}
                                                Obra: {l.obraCodigo ? `${l.obraCodigo} - ${l.obraNome}` : l.obraNome || "N/D"}
                                            </Text>

                                            <Text style={styles.externosListItemCategory}>
                                                {l.categoria === "Equipamentos" ? "🔧" : "👷"}{" "}
                                                Especialidade: {l.especialidadeDesc || l.especialidadeCodigo}
                                            </Text>
                                            <Text style={styles.externosListItemCategory}>
                                                <Ionicons name="library" size={12} color="#666" />{" "}
                                                Classe: {l.classeDescricao || l.classe || "N/D"}
                                            </Text>

                                            {!!l.observacoes && (
                                                <Text style={styles.externosListItemObservations}>
                                                    <Ionicons name="chatbubble-ellipses" size={12} color="#1792FE" />{" "}
                                                    {l.observacoes}
                                                </Text>
                                            )}
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

                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
    const renderPessoalEquipModal = () => (
  <Modal
    animationType="slide"
    transparent
    visible={modalPessoalEquipVisible}
    onRequestClose={() => setModalPessoalEquipVisible(false)}
  >
    <View style={styles.externosModalContainer}>
      <View style={styles.externosModalContent}>
        <LinearGradient colors={["#1792FE", "#1792FE"]} style={styles.externosModalHeader}>
          <View style={styles.externosModalHeaderContent}>
            <View style={styles.externosModalTitleContainer}>
              <Ionicons name="people-circle" size={24} color="#fff" />
              <Text style={styles.externosModalTitle}>Pessoal / Equipamentos</Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalPessoalEquipVisible(false)}
              style={styles.externosCloseButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.externosModalSubtitle}>
            Adicionar registos de colaboradores internos e equipamentos
          </Text>
        </LinearGradient>

        <ScrollView style={styles.externosModalBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={styles.externosFormCard}>
            <Text style={styles.externosFormTitle}>
              <Ionicons name="document-text" size={16} color="#1792FE" /> Novo Registo
            </Text>

            {/* Obra & Dia */}
            <View style={styles.externosFormGrid}>
              <View style={styles.externosInputGroup}>
                <Text style={styles.externosInputLabel}><Ionicons name="business" size={14} color="#666" /> Obra *</Text>
                <View style={[
                  styles.externosPickerWrapper,
                  camposInvalidosPessoal.has('obraId') && { borderColor: '#dc3545', borderWidth: 2 }
                ]}>
                  <Picker
                    selectedValue={linhaPessoalEquipAtual.obraId}
                    onValueChange={(v) => {
                      setLinhaPessoalEquipAtual(p => ({...p, obraId: v}));
                      setCamposInvalidosPessoal(prev => {
                        const novo = new Set(prev);
                        novo.delete('obraId');
                        return novo;
                      });
                    }}
                    style={styles.externosPicker}
                  >
                    <Picker.Item label="— Selecionar obra —" value="" />
                    {obrasParaPickers.map(o => (

                      <Picker.Item key={o.id} label={`${o.codigo ? `${o.codigo} — ` : ""}${o.nome}`} value={o.id} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.externosInputGroup}>
                <Text style={styles.externosInputLabel}><Ionicons name="calendar" size={14} color="#666" /> Dia *</Text>
                <View style={[
                  styles.externosPickerWrapper,
                  camposInvalidosPessoal.has('dia') && { borderColor: '#dc3545', borderWidth: 2 }
                ]}>
                  <Picker
                    selectedValue={linhaPessoalEquipAtual.dia}
                    onValueChange={(v) => {
                      setLinhaPessoalEquipAtual(p => ({...p, dia: v}));
                      setCamposInvalidosPessoal(prev => {
                        const novo = new Set(prev);
                        novo.delete('dia');
                        return novo;
                      });
                    }}
                    style={styles.externosPicker}
                  >
                    <Picker.Item label="— Selecionar dia —" value="" />
                    {diasDoMes.map(d => <Picker.Item key={d} label={`Dia ${d}`} value={d} />)}
                  </Picker>
                </View>
              </View>
            </View>

            {/* Colaborador interno */}
            <View style={styles.externosInputGroup}>
              <Text style={styles.externosInputLabel}><Ionicons name="person" size={14} color="#666" /> Colaborador *</Text>
              <View style={[
                styles.externosPickerWrapper,
                camposInvalidosPessoal.has('colaboradorId') && { borderColor: '#dc3545', borderWidth: 2 }
              ]}>
                <Picker
                  selectedValue={linhaPessoalEquipAtual.colaboradorId}
                  onValueChange={(v) => {
                    setLinhaPessoalEquipAtual(p => ({...p, colaboradorId: v}));
                    setCamposInvalidosPessoal(prev => {
                      const novo = new Set(prev);
                      novo.delete('colaboradorId');
                      return novo;
                    });
                  }}
                  style={styles.externosPicker}
                >
                  <Picker.Item label="— Selecionar colaborador —" value="" />
                  {colaboradoresDisponiveis.map(c => (
                    <Picker.Item
                      key={c.id}
                      label={`${c.nome}${c.codFuncionario ? ` [${String(c.codFuncionario).padStart(3,"0")}]` : ""}`}
                      value={c.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Categoria */}
            <View style={styles.externosInputGroup}>
              <Text style={styles.externosInputLabel}><Ionicons name="layers" size={14} color="#666" /> Categoria *</Text>
              <View style={styles.externosCategoryButtons}>
                {[{label:"Mão de Obra", value:"MaoObra", icon:"people"},
                  {label:"Equipamentos", value:"Equipamentos", icon:"construct"}].map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.externosCategoryButton,
                      linhaPessoalEquipAtual.categoria === opt.value && styles.externosCategoryButtonActive,
                    ]}
                    onPress={() => {
                      const novaClasse = opt.value === "Equipamentos" ? -1 : null;
                      setLinhaPessoalEquipAtual(p => ({
                        ...p,
                        categoria: opt.value,
                        especialidadeCodigo: "",
                        subEmpId: null,
                        classeId: novaClasse,
                      }));
                    }}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={16}
                      color={linhaPessoalEquipAtual.categoria === opt.value ? "#fff" : "#1792FE"}
                    />
                    <Text
                      style={[
                        styles.externosCategoryButtonText,
                        linhaPessoalEquipAtual.categoria === opt.value && styles.externosCategoryButtonTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Especialidade / Equipamento */}
            <View style={styles.externosInputGroup}>
              <Text style={styles.externosInputLabel}>
                <Ionicons name={linhaPessoalEquipAtual.categoria === "Equipamentos" ? "construct" : "hammer"} size={14} color="#666" />{" "}
                {linhaPessoalEquipAtual.categoria === "Equipamentos" ? "Equipamento" : "Especialidade"} *
              </Text>
              <View style={[
                styles.externosPickerWrapper,
                camposInvalidosPessoal.has('especialidadeCodigo') && { borderColor: '#dc3545', borderWidth: 2 }
              ]}>
                <Picker
                  selectedValue={linhaPessoalEquipAtual.especialidadeCodigo}
                  onValueChange={(cod) => {
                    const lista = linhaPessoalEquipAtual.categoria === "Equipamentos" ? equipamentosList : especialidadesList;
                    const sel = lista.find(x => x.codigo === cod);

                    // ✅ SEMPRE null para Mão de Obra, -1 para Equipamentos
                    const novaClasse = linhaPessoalEquipAtual.categoria === "Equipamentos" ? -1 : null;

                    setLinhaPessoalEquipAtual(p => ({
                      ...p,
                      especialidadeCodigo: cod,
                      subEmpId: sel?.subEmpId ?? null,
                      classeId: novaClasse,
                    }));

                    setCamposInvalidosPessoal(prev => {
                      const novo = new Set(prev);
                      novo.delete('especialidadeCodigo');
                      return novo;
                    });
                  }}
                  style={styles.externosPicker}
                >
                  <Picker.Item label={`— Selecionar ${linhaPessoalEquipAtual.categoria === "Equipamentos" ? "equipamento" : "especialidade"} —`} value="" />
                  {(linhaPessoalEquipAtual.categoria === "Equipamentos" ? equipamentosList : especialidadesList)
                    .map(opt => <Picker.Item key={opt.codigo} label={opt.descricao} value={opt.codigo} />)}
                </Picker>
              </View>
            </View>

            {/* Classe */}
            <View style={styles.externosInputGroup}>
              <Text style={styles.externosInputLabel}><Ionicons name="library" size={14} color="#666" /> Classe *</Text>
              <View style={[
                styles.externosPickerWrapper,
                camposInvalidosPessoal.has('classeId') && { borderColor: '#dc3545', borderWidth: 2 }
              ]}>
                <Picker
                  selectedValue={linhaPessoalEquipAtual.classeId}
                  onValueChange={(v) => {
                    setLinhaPessoalEquipAtual(p => ({...p, classeId: v}));
                    setCamposInvalidosPessoal(prev => {
                      const novo = new Set(prev);
                      novo.delete('classeId');
                      return novo;
                    });
                  }}
                  style={styles.externosPicker}
                  enabled={linhaPessoalEquipAtual.categoria !== "Equipamentos"}
                >
                  <Picker.Item label={linhaPessoalEquipAtual.categoria === "Equipamentos" ? "N/A" : "— Selecionar classe —"} value={linhaPessoalEquipAtual.categoria === "Equipamentos" ? -1 : null} />
                  {getClassesCompativeis(linhaPessoalEquipAtual.especialidadeCodigo, linhaPessoalEquipAtual.categoria)
                    .map(cl => <Picker.Item key={cl.classeId} label={`${cl.classe} - ${cl.descricao}`} value={cl.classeId} />)}
                </Picker>
              </View>
            </View>

            {/* Horas + Extra */}
            <View style={styles.externosFormGrid}>
              <View style={[styles.externosInputGroup, { flex: 2 }]}>
                <Text style={styles.externosInputLabel}>
                  <Ionicons name="time" size={14} color="#666" /> {getUnidadeLabel(linhaPessoalEquipAtual.especialidadeCodigo, linhaPessoalEquipAtual.categoria)} *
                </Text>
                <TextInput
                  style={[
                    styles.externosTextInput,
                    camposInvalidosPessoal.has('horas') && { borderColor: '#dc3545', borderWidth: 2 }
                  ]}
                  value={linhaPessoalEquipAtual.horas}
                  onChangeText={(v) => {
                    setCamposInvalidosPessoal(prev => {
                      const novo = new Set(prev);
                      novo.delete('horas');
                      return novo;
                    });
                    const { colaboradorId, dia, obraId } = linhaPessoalEquipAtual;
                    if (!colaboradorId || !dia || !obraId) {
                      Alert.alert("Validação", "Preencha primeiro Obra, Dia e Colaborador.");
                      return;
                    }
                    const minutos = parseHorasToMinutos(v);
                    if (minutos <= 0 && v !== "") {
                      Alert.alert("Validação", "Formato inválido. Use H:MM ou H.MM (ex: 2:30 ou 2.5)");
                      return;
                    }
                    if (!linhaPessoalEquipAtual.horaExtra) {
                      const outras = linhasPessoalEquip
                        .filter(l => l.dia === dia && l.colaboradorId === colaboradorId && !l.horaExtra)
                        .reduce((tot, l) => tot + parseHorasToMinutos(l.horas), 0);
                      if (outras + minutos > 8*60 && v !== "") {
                        Alert.alert("Limite de Horas Excedido",
                          `Não é possível registar mais de 8 horas normais por dia.\n\nJá registadas: ${formatarHorasMinutos(outras)}\n\nPara mais horas, marque como "Hora Extra".`
                        );
                        return;
                      }
                    }
                    setLinhaPessoalEquipAtual(p => ({...p, horas: v}));
                  }}
                  placeholder={
                    linhaPessoalEquipAtual.categoria === "Equipamentos" && linhaPessoalEquipAtual.especialidadeCodigo
                      ? (() => {
                          const equip = equipamentosList.find(e => e.codigo === linhaPessoalEquipAtual.especialidadeCodigo);
                          const unidade = equip?.unidade?.toUpperCase().trim() || 'UN/H';
                          return unidade.includes('/D') ? '0' : '0:00';
                        })()
                      : '0:00'
                  }
                  keyboardType="default"
                />
              </View>

              <View style={[styles.externosInputGroup, { flex: 1 }]}>
                <Text style={styles.externosInputLabel}><Ionicons name="flash" size={14} color="#666" /> Extra</Text>
                <TouchableOpacity
                  style={[styles.externosCheckboxContainer, linhaPessoalEquipAtual.horaExtra && styles.externosCheckboxContainerActive]}
                  onPress={() => setLinhaPessoalEquipAtual(p => ({...p, horaExtra: !p.horaExtra}))}
                >
                  <Ionicons name={linhaPessoalEquipAtual.horaExtra ? "checkmark-circle" : "ellipse-outline"} size={20} color={linhaPessoalEquipAtual.horaExtra ? "#fff" : "#1792FE"} />
                  <Text style={[styles.externosCheckboxText, linhaPessoalEquipAtual.horaExtra && styles.externosCheckboxTextActive]}>Sim</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Observações */}
            <View style={styles.externosInputGroup}>
              <Text style={styles.externosInputLabel}>
                <Ionicons name="chatbubble-ellipses" size={14} color="#666" /> Observações{linhaPessoalEquipAtual.classeId === -1 ? ' *' : ''}
              </Text>
              <TextInput
                style={[
                  styles.externosTextInput,
                  camposInvalidosPessoal.has('observacoes') && { borderColor: '#dc3545', borderWidth: 2 }
                ]}
                value={linhaPessoalEquipAtual.observacoes}
                onChangeText={(v) => {
                  setCamposInvalidosPessoal(prev => {
                    const novo = new Set(prev);
                    novo.delete('observacoes');
                    return novo;
                  });
                  setLinhaPessoalEquipAtual(p => ({...p, observacoes: v}));
                }}
                placeholder={linhaPessoalEquipAtual.classeId === -1 ? "Obrigatório para classe Indiferenciada" : "Notas adicionais"}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Adicionar */}
            <TouchableOpacity onPress={adicionarLinhaPessoalEquip} style={styles.externosAddButton}>
              <LinearGradient colors={["#1792FE", "#1792FE"]} style={styles.externosAddButtonGradient}>
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.externosAddButtonText}>Adicionar à Lista</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Lista */}
          {linhasPessoalEquip.length > 0 && (
            <View style={styles.externosListCard}>
              <Text style={styles.externosListTitle}>
                <Ionicons name="list" size={16} color="#1792FE" /> Itens para Submeter ({linhasPessoalEquip.length})
              </Text>

              {linhasPessoalEquip.map(l => (
                <View key={l.key} style={styles.externosListItem}>
                  <View style={styles.externosListItemContent}>
                    <View style={styles.externosListItemHeader}>
                      <Text style={styles.externosListItemName}>
                        {l.colaboradorNome} {l.codFuncionario ? ` [${String(l.codFuncionario).padStart(3,"0")}]` : ""}
                      </Text>
                      <View style={styles.externosListItemBadge}>
                        <Text style={styles.externosListItemBadgeText}>{formatarHorasMinutos(l.horasMin)}</Text>
                      </View>
                    </View>

                    <Text style={styles.externosListItemDetails}>
                      <Ionicons name="business" size={12} color="#666" /> Obra {l.obraId}
                      {" • "}
                      <Ionicons name="calendar" size={12} color="#666" /> Dia {l.dia}
                      {l.horaExtra && " • Extra"}
                    </Text>

                    <Text style={styles.externosListItemCategory}>
                      {l.categoria === "Equipamentos" ? "🔧" : "👷"} {l.especialidadeDesc || l.especialidadeCodigo}
                    </Text>

                    {!!l.observacoes && (
                      <Text style={styles.externosListItemObservations}>
                        <Ionicons name="chatbubble-ellipses" size={12} color="#1792FE" /> {l.observacoes}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity onPress={() => removerLinhaPessoalEquip(l.key)} style={styles.externosListItemDelete}>
                    <Ionicons name="trash" size={18} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              ))}
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
                    <MaterialCommunityIcons
                        name="calendar-blank"
                        size={64}
                        color="#ccc"
                    />
                    <Text style={styles.emptyText}>
                        Nenhum registo encontrado para este período
                    </Text>
                    <Text style={styles.emptySubText}>
                        Verifique se tem equipas associadas                    </Text>
                </View>
            );
        }
        if (modoVisualizacao === "obra") {
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
                                {Object.values(dadosAgrupadosPorObra).map(
                                    (obraGroup, obraIndex) => (
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
                                                        {obraGroup.obraInfo.codigo} — {obraGroup.obraInfo.nome}
                                                    </Text>
                                                </View>
                                                <View style={styles.obraStats}>
                                                    <Text style={styles.obraStatsText}>
                                                        {obraGroup.trabalhadores.length} trabalhador
                                                        {obraGroup.trabalhadores.length !== 1 ? "es" : ""}
                                                    </Text>
                                                    <Text style={styles.obraStatsText}>
                                                        Total:{" "}
                                                        {formatarHorasMinutos(
                                                            obraGroup.trabalhadores.reduce((total, trab) => {
                                                                return (
                                                                    total +
                                                                    diasDoMes.reduce(
                                                                        (trabTotal, dia) =>
                                                                            trabTotal + getMinutosCell(trab, dia),
                                                                        0,
                                                                    )
                                                                );
                                                            }, 0),
                                                        )}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Cabeçalho dos dias para esta obra */}
                                            <View style={styles.obraDaysHeader}>
                                                <View style={[styles.tableCell, { width: 120 }]}>
                                                    <Text style={styles.obraDaysHeaderText}>
                                                        Trabalhador
                                                    </Text>
                                                </View>

                                                {diasDoMes.map((dia) => (
                                                    <View
                                                        key={dia}
                                                        style={[styles.tableCell, { width: 50 }]}
                                                    >
                                                        <Text style={styles.obraDaysHeaderText}>{dia}</Text>
                                                    </View>
                                                ))}
                                                <View style={[styles.tableCell, { width: 70 }]}>
                                                    <Text style={styles.obraDaysHeaderText}>Total</Text>
                                                </View>
                                            </View>

                                            {/* Trabalhadores da obra */}
                                            {obraGroup.trabalhadores.map((item, trabIndex) => (
                                                <View
                                                    key={`${item.userId}-${item.obraId}`}
                                                    style={[
                                                        styles.tableRow,
                                                        trabIndex % 2 === 0
                                                            ? styles.evenRow
                                                            : styles.oddRow,
                                                        styles.trabalhadoresRow,
                                                    ]}
                                                >
                                                    <View style={[styles.tableCell, { width: 120 }]}>
                                                        <Text style={styles.cellText} numberOfLines={1}>
                                                            {item.userName}
                                                        </Text>
                                                    </View>

                                                    {diasDoMes.map((dia) => {
                                                        const cellKey = `${item.userId}-${item.obraId}-${dia}`;
                                                        const editadoManual =
                                                            diasEditadosManualmente.has(cellKey);
                                                        const submetido = itemJaSubmetido(
                                                            item.codFuncionario,
                                                            item.obraId,
                                                            dia,
                                                        );

                                                        return (
                                                            <View
                                                                key={`${cellKey}`}
                                                                style={[
                                                                    styles.tableCell,
                                                                    { width: 50 },
                                                                    submetido && styles.cellSubmetido,
                                                                    editadoManual && styles.cellEditado,
                                                                ]}
                                                            >
                                                                <TouchableOpacity
                                                                    style={[
                                                                        styles.cellTouchable,
                                                                        submetido && styles.cellSubmetido,
                                                                        submetido && { opacity: 0.6 },
                                                                    ]}
                                                                    disabled={submetido}
                                                                    onPress={
                                                                        submetido
                                                                            ? undefined
                                                                            : () => abrirEdicao(item, dia)
                                                                    }
                                                                >
                                                                    {(() => {
                                                                        const mins = getMinutosCell(item, dia);
                                                                        return (
                                                                            <Text
                                                                                style={[
                                                                                    styles.cellText,
                                                                                    { textAlign: "center" },
                                                                                    mins > 0 && styles.hoursText,
                                                                                    styles.clickableHours,
                                                                                ]}
                                                                            >
                                                                                {mins > 0
                                                                                    ? formatarHorasMinutos(mins)
                                                                                    : "-"}
                                                                            </Text>
                                                                        );
                                                                    })()}
                                                                    {submetido && (
                                                                        <Ionicons

                                                                        />
                                                                    )}
                                                                </TouchableOpacity>
                                                            </View>
                                                        );
                                                    })}
                                                    <View style={[styles.tableCell, { width: 70 }]}>
                                                        <Text
                                                            style={[
                                                                styles.cellText,
                                                                styles.totalText,
                                                                { textAlign: "center" },
                                                            ]}
                                                        >
                                                            {formatarHorasMinutos(
                                                                diasDoMes.reduce(
                                                                    (total, dia) =>
                                                                        total + getMinutosCell(item, dia),
                                                                    0,
                                                                ),
                                                            )}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                            {/* 🔹 EXTERNOS CONSOLIDADOS (SUBMETIDOS + PENDENTES) */}
                                            {(() => {
                                                const extMapSub = externosSubmetidosPorObraPessoa.get(
                                                    obraGroup.obraInfo.id,
                                                );
                                                const extMapPend = externosPorObraPessoa.get(
                                                    obraGroup.obraInfo.id,
                                                );

                                                // Criar mapa consolidado por identificador único
                                                const consolidado = new Map();

                                                // Adicionar submetidos
                                                if (extMapSub) {
                                                    extMapSub.forEach((row) => {
                                                        const key = row.funcionario.toLowerCase().trim();
                                                        consolidado.set(key, {
                                                            funcionario: row.funcionario,
                                                            empresa: "",
                                                            horasPorDia: { ...row.horasPorDia },
                                                            totalMin: row.totalMin,
                                                            temSubmetido: true,
                                                            temPendente: false,
                                                            trabalhadorId: null
                                                        });
                                                    });
                                                }

                                                // Adicionar/somar pendentes
                                                if (extMapPend) {
                                                    extMapPend.forEach((row) => {
                                                        const key = row.funcionario.toLowerCase().trim();
                                                        if (consolidado.has(key)) {
                                                            const existing = consolidado.get(key);
                                                            diasDoMes.forEach(dia => {
                                                                existing.horasPorDia[dia] = (existing.horasPorDia[dia] || 0) + (row.horasPorDia[dia] || 0);
                                                            });
                                                            existing.totalMin += row.totalMin;
                                                            existing.temPendente = true;
                                                            existing.empresa = row.empresa || existing.empresa;
                                                            existing.trabalhadorId = row.trabalhadorId;
                                                        } else {
                                                            consolidado.set(key, {
                                                                funcionario: row.funcionario,
                                                                empresa: row.empresa || "",
                                                                horasPorDia: { ...row.horasPorDia },
                                                                totalMin: row.totalMin,
                                                                temSubmetido: false,
                                                                temPendente: true,
                                                                trabalhadorId: row.trabalhadorId
                                                            });
                                                        }
                                                    });
                                                }

                                                if (consolidado.size === 0) return null;

                                                return [...consolidado.values()].map((row, idx) => (
                                                    <View
                                                        key={`ext-consolidado-${obraGroup.obraInfo.id}-${idx}`}
                                                        style={[styles.tableRow, row.temPendente && !row.temSubmetido ? styles.externoResumoRow : styles.externoSubmetidoRow,]}
                                                    >
                                                        {/* Coluna do nome */}
                                                        <View style={[styles.tableCell, { width: 120 }]}>
                                                            <Text
                                                                style={[styles.cellText, { fontWeight: "700" }]}
                                                            >
                                                                {row.funcionario}
                                                            </Text>
                                                            <Text style={{ fontWeight: "400", fontSize: 11, color: "#666" }}>
                                                                (Externo)
                                                            </Text>
                                                            {row.temSubmetido && row.temPendente && (
                                                                <Text style={[styles.cellSubText, { color: "#1792FE" }]}>
                                                                    ✓ submetido + pendente
                                                                </Text>
                                                            )}
                                                            {row.temSubmetido && !row.temPendente && (
                                                                <Text style={styles.cellSubText}>
                                                                    ✓ submetido
                                                                </Text>
                                                            )}
                                                            {!!row.empresa && (
                                                                <Text style={styles.cellSubText}>
                                                                    {row.empresa}
                                                                </Text>
                                                            )}
                                                        </View>

                                                        {/* Colunas dos dias - AGORA COM CLIQUE */}
                                                        {diasDoMes.map((dia) => (
                                                            <View
                                                                key={`ext-consolidado-${obraGroup.obraInfo.id}-${idx}-${dia}`}
                                                                style={[styles.tableCell, { width: 50 }]}
                                                            >
                                                                <TouchableOpacity
                                                                    style={[styles.cellTouchable]}
                                                                    onPress={async () => {
                                                                        // Abrir modal de externos com dados pré-preenchidos
                                                                        await carregarExternos();

                                                                        // Tentar encontrar o trabalhador externo na lista
                                                                        const externo = externosLista.find(
                                                                            e => e.funcionario?.toLowerCase().trim() === row.funcionario.toLowerCase().trim()
                                                                        );

                                                                        setLinhaAtual({
                                                                            obraId: obraGroup.obraInfo.id,
                                                                            dia: dia,
                                                                            trabalhadorId: externo?.id || row.trabalhadorId || "",
                                                                            horas: "",
                                                                            horaExtra: false,
                                                                            categoria: "MaoObra",
                                                                            especialidadeCodigo: "",
                                                                            subEmpId: null,
                                                                            classeId: null,
                                                                            observacoes: "",
                                                                        });

                                                                        setModalExternosVisible(true);
                                                                    }}
                                                                >
                                                                    <Text
                                                                        style={[
                                                                            styles.cellText,
                                                                            { textAlign: "center" },
                                                                            row.horasPorDia[dia] > 0 && styles.hoursText,
                                                                            styles.clickableHours,
                                                                        ]}
                                                                    >
                                                                        {row.horasPorDia[dia] > 0
                                                                            ? formatarHorasMinutos(row.horasPorDia[dia])
                                                                            : "-"}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        ))}

                                                        {/* Total */}
                                                        <View style={[styles.tableCell, { width: 70 }]}>
                                                            <Text
                                                                style={[
                                                                    styles.cellText,
                                                                    styles.totalText,
                                                                    { textAlign: "center" },
                                                                ]}
                                                            >
                                                                {formatarHorasMinutos(row.totalMin)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                ));
                                            })()}

                                            {/* Separador entre obras */}
                                            {obraIndex <
                                                Object.values(dadosAgrupadosPorObra).length - 1 && (
                                                    <View style={styles.obraSeparator} />
                                                )}
                                        </View>
                                    ),
                                )}
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
                            {Object.values(dadosAgrupadosPorUser).map(
                                  (userGroup, userIndex) => (
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
                                            {diasDoMes.map((dia) => (
                                                <View
                                                    key={dia}
                                                    style={[styles.tableCell, { width: 50 }]}
                                                >
                                                    <Text style={styles.obraDaysHeaderText}>{dia}</Text>
                                                </View>
                                            ))}
                                            <View style={[styles.tableCell, { width: 70 }]}>
                                                <Text style={styles.obraDaysHeaderText}>Total</Text>
                                            </View>
                                        </View>

                                        {userGroup.obras.map((item, obraIndex) => (
                                            <View
                                                key={`${item.userId}-${item.obraId}`}
                                                style={[
                                                    styles.tableRow,
                                                    obraIndex % 2 === 0 ? styles.evenRow : styles.oddRow,
                                                    styles.trabalhadoresRow,
                                                ]}
                                            >
                                                <View style={[styles.tableCell, { width: 120 }]}>
                                                    <Text style={styles.cellText}>{item.obraNome}</Text>
                                                </View>
                                                {diasDoMes.map((dia) => {
                                                    const cellKey = `${item.userId}-${item.obraId}-${dia}`;
                                                    const submetido = itemJaSubmetido(
                                                        item.codFuncionario,
                                                        item.obraId,
                                                        dia,
                                                    );
                                                    const editadoManual =
                                                        diasEditadosManualmente.has(cellKey);

                                                    return (
                                                        <View
                                                            key={`${cellKey}`}
                                                            style={[
                                                                styles.tableCell,
                                                                { width: 50 },
                                                                submetido && styles.cellSubmetido,
                                                                editadoManual && styles.cellEditado,
                                                            ]}
                                                        >
                                                            <TouchableOpacity
                                                                style={[
                                                                    styles.cellTouchable,
                                                                    submetido && styles.cellSubmetido,
                                                                    submetido && { opacity: 0.6 },
                                                                ]}
                                                                disabled={submetido}
                                                                onPress={
                                                                    submetido
                                                                        ? undefined
                                                                        : () => abrirEdicao(item, dia)
                                                                }
                                                            >
                                                                {(() => {
                                                                    const mins = getMinutosCell(item, dia);
                                                                    return (
                                                                        <Text
                                                                            style={[
                                                                                styles.cellText,
                                                                                { textAlign: "center" },
                                                                                mins > 0 && styles.hoursText,
                                                                                styles.clickableHours,
                                                                            ]}
                                                                        >
                                                                            {mins > 0
                                                                                ? formatarHorasMinutos(mins)
                                                                                : "-"}
                                                                        </Text>
                                                                    );
                                                                })()}
                                                                {submetido && (
                                                                    <Ionicons

                                                                    />
                                                                )}
                                                            </TouchableOpacity>
                                                        </View>
                                                    );
                                                })}

                                                <View style={[styles.tableCell, { width: 70 }]}>
                                                    <Text
                                                        style={[
                                                            styles.cellText,
                                                            styles.totalText,
                                                            { textAlign: "center" },
                                                        ]}
                                                    >
                                                        {formatarHorasMinutos(
                                                            diasDoMes.reduce((acc, dia) => {
                                                                return acc + getMinutosCell(item, dia);
                                                            }, 0)
                                                        )}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}

                                        {/* Linha de total por dia para este utilizador */}
                                        <View
                                            style={[styles.tableRow, { backgroundColor: "#f0f0f0" }]}
                                        >
                                            <View style={[styles.tableCell, { width: 120 }]}>
                                                <Text
                                                    style={[
                                                        styles.cellText,
                                                        { fontWeight: "bold", color: "#000" },
                                                    ]}
                                                >
                                                    Total
                                                </Text>
                                            </View>

                                            {diasDoMes.map((dia) => {
                                                const totalMinutosDia = userGroup.obras.reduce(
                                                    (acc, obraItem) => {
                                                        return acc + getMinutosCell(obraItem, dia);
                                                    },
                                                    0,
                                                );

                                                return (
                                                    <View
                                                        key={`total-${userGroup.userInfo.id}-${dia}`}
                                                        style={[styles.tableCell, { width: 50 }]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.cellText,
                                                                { fontWeight: "600", color: "#333", textAlign: "center" },
                                                            ]}
                                                        >
                                                            {totalMinutosDia > 0 ? formatarHorasMinutos(totalMinutosDia) : "-"}
                                                        </Text>
                                                    </View>
                                                );
                                            })}

                                            <View style={[styles.tableCell, { width: 70 }]}>
                                                <Text
                                                    style={[
                                                        styles.cellText,
                                                        styles.totalText,
                                                        { textAlign: "center" },
                                                    ]}
                                                >
                                                    {formatarHorasMinutos(
                                                        userGroup.obras.reduce((totalGeral, obraItem) => {
                                                            return totalGeral + diasDoMes.reduce((acc, dia) => {
                                                                return acc + getMinutosCell(obraItem, dia);
                                                            }, 0);
                                                        }, 0)
                                                    )}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ),
                            )}
                            {/* === EXTERNOS na vista por UTILIZADOR === */}
                            {externosAgrupadosPorPessoa.length > 0 && (
                                <>
                                    <View style={[styles.obraHeader, { marginTop: 10 }]}></View>

                                    {externosAgrupadosPorPessoa.map((ext, idx) => (
                                        <View key={`extuser-${idx}`}>
                                            {/* Cabeçalho do "utilizador externo" */}
                                            <View style={styles.obraHeader}>
                                                <View style={styles.obraHeaderContent}>
                                                    <MaterialCommunityIcons
                                                        name="account"
                                                        size={20}
                                                        color="#1792FE"
                                                        style={{ marginRight: 8 }}
                                                    />
                                                    <Text style={styles.obraHeaderText}>
                                                        {ext.nome} (Externo)
                                                        {!!ext.empresa && ` · ${ext.empresa}`}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Cabeçalho dos dias */}
                                            <View style={styles.obraDaysHeader}>
                                                <View style={[styles.tableCell, { width: 120 }]}>
                                                    <Text style={styles.obraDaysHeaderText}>Obra</Text>
                                                </View>
                                                {diasDoMes.map((dia) => (
                                                    <View
                                                        key={dia}
                                                        style={[styles.tableCell, { width: 50 }]}
                                                    >
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
                                                        obraIndex % 2 === 0
                                                            ? styles.evenRow
                                                            : styles.oddRow,
                                                        styles.trabalhadoresRow,
                                                    ]}
                                                >
                                                    <View style={[styles.tableCell, { width: 120 }]}>
                                                        <Text style={styles.cellText}>
                                                            {obraItem.obraNome}
                                                        </Text>
                                                    </View>

                                                    {diasDoMes.map((dia) => (
                                                        <View
                                                            key={`extuser-${idx}-${obraItem.obraId}-${dia}`}
                                                            style={[styles.tableCell, { width: 50 }]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.cellText,
                                                                    { textAlign: "center" },
                                                                    obraItem.horasPorDia[dia] > 0 &&
                                                                    styles.hoursText,
                                                                ]}
                                                            >
                                                                {obraItem.horasPorDia[dia] > 0
                                                                    ? formatarHorasMinutos(
                                                                        obraItem.horasPorDia[dia],
                                                                    )
                                                                    : "-"}
                                                            </Text>
                                                        </View>
                                                    ))}

                                                    <View style={[styles.tableCell, { width: 70 }]}>
                                                        <Text
                                                            style={[
                                                                styles.cellText,
                                                                styles.totalText,
                                                                { textAlign: "center" },
                                                            ]}
                                                        >
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

    const renderConfirmModal = () => {
        const resumoSubmissao = gerarResumoSubmissao();

        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalResumoVisible}
                onRequestClose={() => setModalResumoVisible(false)}
            >
                <View style={styles.resumoModalContainer}>
                    <View style={styles.resumoModalContent}>
                        {/* Header melhorado */}
                        <LinearGradient
                            colors={["#1792FE", "#0B5ED7"]}
                            style={styles.resumoModalHeader}
                        >
                            <View style={styles.resumoModalHeaderContent}>
                                <View style={styles.resumoModalTitleContainer}>
                                    <Ionicons name="document-text" size={24} color="#fff" />
                                    <Text style={styles.resumoModalTitle}>
                                        Resumo da Submissão
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setModalResumoVisible(false)}
                                    style={styles.resumoCloseButton}
                                >
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.resumoModalSubtitle}>
                                Confirme os dados antes de submeter as partes diárias
                            </Text>
                        </LinearGradient>

                        <ScrollView
                            style={styles.resumoModalBody}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        >
                            {/* Card de estatísticas gerais */}
                            <View style={styles.resumoStatsCard}>
                                <Text style={styles.resumoStatsTitle}>
                                    <Ionicons name="analytics" size={16} color="#1792FE" /> Resumo
                                    Geral
                                </Text>
                                <View style={styles.resumoStatsGrid}>
                                    <View style={styles.resumoStatItem}>
                                        <Text style={styles.resumoStatNumber}>
                                            {resumoSubmissao.totalItens +
                                                resumoSubmissao.totalExternos}
                                        </Text>
                                        <Text style={styles.resumoStatLabel}>Total Registos</Text>
                                    </View>
                                    <View style={styles.resumoStatItem}>
                                        <Text style={styles.resumoStatNumber}>
                                            {resumoSubmissao.totalItens}
                                        </Text>
                                        <Text style={styles.resumoStatLabel}>Colaboradores</Text>
                                    </View>
                                    <View style={styles.resumoStatItem}>
                                        <Text style={styles.resumoStatNumber}>
                                            {resumoSubmissao.totalExternos}
                                        </Text>
                                        <Text style={styles.resumoStatLabel}>Externos</Text>
                                    </View>
                                    <View style={styles.resumoStatItem}>
                                        <Text style={styles.resumoStatNumber}>
                                            {formatarHorasMinutos(
                                                resumoSubmissao.totalHorasNormais +
                                                resumoSubmissao.totalHorasExtras,
                                            )}
                                        </Text>
                                        <Text style={styles.resumoStatLabel}>Total Horas</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Colaboradores */}
                            {resumoSubmissao.itensPorTrabalhador.length > 0 && (
                                <View style={styles.resumoSectionCard}>
                                    <Text style={styles.resumoSectionTitle}>
                                        <Ionicons name="people" size={18} color="#1792FE" />{" "}
                                        Colaboradores ({resumoSubmissao.totalItens})
                                    </Text>

                                    {resumoSubmissao.itensPorTrabalhador.map(
                                        (trabalhador, index) => (
                                            <View key={index} style={styles.resumoTrabalhadorItem}>
                                                <View style={styles.resumoTrabalhadorHeader}>
                                                    <Text style={styles.resumoTrabalhadorNome}>
                                                        {trabalhador.nome}
                                                    </Text>
                                                    <View style={styles.resumoTrabalhadorBadges}>
                                                        <View style={styles.resumoTrabalhadorBadge}>
                                                            <Ionicons name="time" size={12} color="#fff" />
                                                            <Text style={styles.resumoTrabalhadorBadgeText}>
                                                                {formatarHorasMinutos(trabalhador.totalMinutos)}
                                                            </Text>
                                                        </View>
                                                        {trabalhador.horasExtras > 0 && (
                                                            <View
                                                                style={[
                                                                    styles.resumoTrabalhadorBadge,
                                                                    styles.resumoTrabalhadorBadgeExtra,
                                                                ]}
                                                            >
                                                                <Ionicons name="flash" size={10} color="#fff" />
                                                                <Text style={styles.resumoTrabalhadorBadgeText}>
                                                                    {formatarHorasMinutos(
                                                                        trabalhador.horasExtras,
                                                                    )}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>

                                                {trabalhador.diasComHoras.map((diaInfo, diaIndex) => (
                                                    <View key={diaIndex} style={styles.resumoDiaItem}>
                                                        <Text style={styles.resumoDiaInfo}>
                                                            <Ionicons
                                                                name="calendar"
                                                                size={12}
                                                                color="#1792FE"
                                                            />{" "}
                                                            Dia {diaInfo.dia} • {diaInfo.obraNome}
                                                        </Text>
                                                        <Text style={styles.resumoDiaDetalhes}>
                                                            {formatarHorasMinutos(
                                                                diaInfo.minutosNormais + diaInfo.minutosExtras,
                                                            )}{" "}
                                                            • {diaInfo.especialidades}
                                                        </Text>
                                                        {diaInfo.classes && (
                                                            <Text style={styles.resumoDiaDetalhes}>
                                                                <Ionicons name="library" size={12} color="#666" />{" "}
                                                                Classes: {diaInfo.classes}
                                                            </Text>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        ),
                                    )}
                                </View>
                            )}

                            {/* Externos */}
                            {resumoSubmissao.totalExternos > 0 && (
                                <View style={styles.resumoSectionCard}>
                                    <Text style={styles.resumoSectionTitle}>
                                        <Ionicons name="person-add" size={18} color="#1792FE" />{" "}
                                        Trabalhadores Externos ({resumoSubmissao.totalExternos})
                                    </Text>

                                    {Array.from(resumoSubmissao.externosPorObra).map(
                                        ([obraId, obraData], index) => (
                                            <View key={obraId} style={styles.resumoObraExternos}>
                                                <Text style={styles.resumoObraExternosTitle}>
                                                    <Ionicons name="business" size={14} color="#1792FE" />{" "}
                                                    {obraData.obraNome}
                                                </Text>

                                                {obraData.externos.map((ext, extIndex) => (
                                                    <View key={extIndex} style={styles.resumoExternoItem}>
                                                        <View style={styles.resumoExternoHeader}>
                                                            <Text style={styles.resumoExternoNome}>
                                                                {ext.funcionario}
                                                            </Text>
                                                            <View style={styles.resumoExternoBadges}>
                                                                <View style={styles.resumoExternoBadge}>
                                                                    <Ionicons
                                                                        name="time"
                                                                        size={10}
                                                                        color="#fff"
                                                                    />
                                                                    <Text style={styles.resumoExternoBadgeText}>
                                                                        {formatarHorasMinutos(ext.horasMin)}
                                                                    </Text>
                                                                </View>
                                                                {ext.horaExtra && (
                                                                    <View
                                                                        style={[
                                                                            styles.resumoExternoBadge,
                                                                            styles.resumoExternoBadgeExtra,
                                                                        ]}
                                                                    >
                                                                        <Ionicons
                                                                            name="flash"
                                                                            size={8}
                                                                            color="#fff"
                                                                        />
                                                                        <Text style={styles.resumoExternoBadgeText}>
                                                                            Extra
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        </View>
                                                        <Text style={styles.resumoExternoDetalhes}>
                                                            <Ionicons
                                                                name="business"
                                                                size={12}
                                                                color="#666"
                                                            />{" "}
                                                            {ext.empresa}
                                                        </Text>
                                                        <Text style={styles.resumoExternoDetalhes}>
                                                            <Ionicons
                                                                name="briefcase"
                                                                size={12}
                                                                color="#666"
                                                            />{" "}
                                                            Obra: {ext.obraCodigo ? `${ext.obraCodigo} - ${ext.obraNome}` : ext.obraNome || obraData.obraNome}
                                                        </Text>
                                                        <Text style={styles.resumoExternoDetalhes}>
                                                            <Ionicons
                                                                name="calendar"
                                                                size={12}
                                                                color="#666"
                                                            />{" "}
                                                            Dia {ext.dia} •{" "}
                                                            <Ionicons
                                                                name="construct"
                                                                size={12}
                                                                color="#666"
                                                            />{" "}
                                                            {ext.especialidadeDesc || ext.especialidadeCodigo}
                                                        </Text>
                                                        {ext.classe && ext.classeDescricao && (
                                                            <Text style={styles.resumoExternoDetalhes}>
                                                                <Ionicons name="library" size={12} color="#666" />{" "}
                                                                Classe: {ext.classe} - {ext.classeDescricao}
                                                            </Text>
                                                        )}
                                                        {!!ext.observacoes && (
                                                            <Text style={styles.resumoExternoObservations}>
                                                                <Ionicons name="chatbubble-ellipses" size={12} color="#1792FE" />{" "}
                                                                {ext.observacoes}
                                                            </Text>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        ),
                                    )}
                                </View>
                            )}

                            {/* Mensagem se não há dados */}
                            {resumoSubmissao.totalItens === 0 &&
                                resumoSubmissao.totalExternos === 0 && (
                                    <View style={styles.resumoEmptyCard}>
                                        <Ionicons name="document-outline" size={64} color="#ccc" />
                                        <Text style={styles.resumoEmptyText}>
                                            Nenhum registo para submeter
                                        </Text>
                                        <Text style={styles.resumoEmptySubText}>
                                            Certifique-se de que editou as horas manualmente antes de
                                            submeter
                                        </Text>
                                    </View>
                                )}
                        </ScrollView>

                        {/* Footer com botões */}
                        <View style={styles.resumoModalFooter}>
                            <TouchableOpacity
                                style={styles.resumoCancelButton}
                                onPress={() => setModalResumoVisible(false)}
                            >
                                <Text style={styles.resumoCancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.resumoConfirmButton,
                                    resumoSubmissao.totalItens === 0 &&
                                    resumoSubmissao.totalExternos === 0 &&
                                    styles.resumoConfirmButtonDisabled,
                                ]}
                                disabled={
                                    resumoSubmissao.totalItens === 0 &&
                                    resumoSubmissao.totalExternos === 0
                                }
                                onPress={async () => {
                                    setModalResumoVisible(false);
                                    await criarParteDiaria();
                                }}
                            >
                                <LinearGradient
                                    colors={
                                        resumoSubmissao.totalItens === 0 &&
                                            resumoSubmissao.totalExternos === 0
                                            ? ["#ccc", "#999"]
                                            : ["#1792FE", "#0B5ED7"]
                                    }
                                    style={styles.resumoConfirmButtonGradient}
                                >
                                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                    <Text style={styles.resumoConfirmButtonText}>
                                        Confirmar Submissão (
                                        {resumoSubmissao.totalItens + resumoSubmissao.totalExternos}
                                        )
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

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
                        colors={["#1792FE", "#0B5ED7"]}
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
                                    <Ionicons name="person" size={16} color="#1792FE" />{" "}
                                    Informações do Registo
                                </Text>

                                <View style={styles.editInfoGrid}>
                                    <View style={styles.editInfoItem}>
                                        <Text style={styles.editInfoLabel}>
                                            <Ionicons name="person-circle" size={14} color="#666" />{" "}
                                            Trabalhador
                                        </Text>
                                        <Text style={styles.editInfoValue}>
                                            {selectedTrabalhador.userName}
                                        </Text>
                                    </View>

                                    <View style={styles.editInfoItem}>
                                        <Text style={styles.editInfoLabel}>
                                            <Ionicons name="business" size={14} color="#666" /> Obra
                                            Principal
                                        </Text>
                                        <Text style={styles.editInfoValue}>
                                            {selectedTrabalhador.obraNome}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.editInfoGrid}>
                                    <View style={styles.editInfoItem}>
                                        <Text style={[styles.editInfoValue, { color: "#1792FE" }]}>
                                            {formatarHorasMinutos(
                                                selectedTrabalhador.horasOriginais[selectedDia] || 0,
                                            )}
                                        </Text>
                                    </View>

                                    <View style={styles.editInfoItem}>
                                        <Text style={styles.editInfoLabel}>
                                            <Ionicons name="clipboard" size={14} color="#666" /> Para
                                            Parte Diária
                                        </Text>
                                        <Text style={[styles.editInfoValue, { color: "#1792FE" }]}>
                                            {formatarHorasMinutos(
                                                selectedTrabalhador.horasPorDia[selectedDia] || 0,
                                            )}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.editInfoFooter}>
                                    <Text style={styles.editInfoSubText}>
                                        <Ionicons
                                            name={
                                                selectedTrabalhador.horasPorDia[selectedDia] > 0
                                                    ? "checkmark-circle"
                                                    : "add-circle"
                                            }
                                            size={12}
                                            color={
                                                selectedTrabalhador.horasPorDia[selectedDia] > 0
                                                    ? "#1792FE"
                                                    : "#1792FE"
                                            }
                                        />{" "}
                                        {selectedTrabalhador.horasPorDia[selectedDia] > 0
                                            ? "Baseado em registo de ponto"
                                            : "Adição manual de horas"}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Nota para o cabeçalho deste dia */}
                        <View style={styles.editNoteCard}>
                            <Text style={styles.editNoteLabel}>
                                <Ionicons name="document-text" size={14} color="#666" /> Nota do
                                cabeçalho (opcional)
                            </Text>
                            <TextInput
                                style={styles.editNoteInput}
                                value={editData.notaDia ?? ""}
                                onChangeText={(v) =>
                                    setEditData((prev) => ({ ...prev, notaDia: v }))
                                }
                                placeholder=""
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Card das especialidades */}
                        <View style={styles.editSpecialitiesCard}>
                            <View style={styles.editSpecialitiesHeader}>
                                <Text style={styles.editSpecialitiesTitle}>
                                    <Ionicons name="layers" size={16} color="#1792FE" />{" "}
                                    Especialidades do Dia {selectedDia}
                                </Text>
                                <TouchableOpacity
                                    style={styles.editAddButton}
                                    onPress={adicionarEspecialidade}
                                >
                                    <LinearGradient
                                        colors={["#1792FE", "#1792FE"]}
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
                                            <Ionicons name="hammer" size={14} color="#1792FE" />{" "}
                                            Especialidade {index + 1}
                                        </Text>
                                        <View style={styles.editSpecialityActions}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.editHoraExtraButton,
                                                    espItem.horaExtra && styles.editHoraExtraButtonActive,
                                                ]}
                                                onPress={() =>
                                                    atualizarEspecialidade(
                                                        index,
                                                        "horaExtra",
                                                        !espItem.horaExtra,
                                                    )
                                                }
                                            >
                                                <Ionicons
                                                    name={espItem.horaExtra ? "flash" : "flash-outline"}
                                                    size={16}
                                                    color={espItem.horaExtra ? "#fff" : "#1792FE"}
                                                />
                                                <Text
                                                    style={[
                                                        styles.editHoraExtraText,
                                                        espItem.horaExtra && styles.editHoraExtraTextActive,
                                                    ]}
                                                >
                                                    Hora Extra
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
                                                <Ionicons name="business" size={14} color="#666" /> Obra
                                                Destino
                                            </Text>
                                            <View style={styles.editPickerWrapper}>
                                                <Picker
                                                    selectedValue={
                                                        espItem.obraId ?? selectedTrabalhador.obraId
                                                    }
                                                    onValueChange={(v) =>
                                                        atualizarEspecialidade(index, "obraId", v)
                                                    }
                                                    style={styles.editPicker}
                                                >
                                                    {obrasParaPickers.map((o) => {                                                        const codigo = o.codigo ?? o.cod ?? o.codigoObra; // usa o que existir
                                                        const label = codigo ? `${String(codigo)} — ${o.nome}` : o.nome;

                                                        return (
                                                            <Picker.Item
                                                            key={o.id}
                                                            label={label}
                                                            value={o.id}
                                                            />
                                                        );
                                                        })}

                                                </Picker>
                                            </View>
                                        </View>

                                        {/* Horas */}
                                        <View style={[styles.editInputGroup, { flex: 0.6 }]}>
                                            <Text style={styles.editInputLabel}>
                                                <Ionicons name="time" size={14} color="#666" />{" "}
                                                {getUnidadeLabel(espItem.especialidade, espItem.categoria)} *
                                            </Text>
                                            <TextInput
                                                style={styles.editTextInput}
                                                value={(() => {
                                                    const totalMinutos = Math.round(
                                                        (espItem.horas || 0) * 60,
                                                    );
                                                    const horas = Math.floor(totalMinutos / 60);
                                                    const mins = totalMinutos % 60;
                                                    return totalMinutos > 0
                                                        ? `${horas}:${mins.toString().padStart(2, "0")}`
                                                        : "";
                                                })()}
                                                onChangeText={(value) => {
                                                    if (value === "") {
                                                        atualizarEspecialidade(index, "horas", 0);
                                                        return;
                                                    }

                                                    let minutos = 0;

                                                    if (value.includes(":")) {
                                                        const [h, m] = value.split(":");
                                                        const horas = parseInt(h) || 0;
                                                        const mins = parseInt(m) || 0;
                                                        minutos = horas * 60 + mins;
                                                    } else {
                                                        const horas = parseFloat(value) || 0;
                                                        minutos = Math.round(horas * 60);
                                                    }

                                                    const horasDecimais = minutos / 60;

                                                    // Validação em tempo real para horas normais
                                                    if (!espItem.horaExtra) {
                                                        // Calcular total de horas normais incluindo esta alteração
                                                        const outrasHorasNormais =
                                                            (
                                                                editData.especialidadesDia || []
                                                            )
                                                                .filter(
                                                                    (esp, idx) => idx !== index && !esp.horaExtra,
                                                                )
                                                                .reduce(
                                                                    (total, esp) =>
                                                                        total + (parseFloat(esp.horas) || 0),
                                                                    0,
                                                                );

                                                        const totalHorasNormais =
                                                            outrasHorasNormais + horasDecimais;

                                                        if (totalHorasNormais > 8) {
                                                            const horasDisponiveis = Math.max(
                                                                0,
                                                                8 - outrasHorasNormais,
                                                            );
                                                            Alert.alert(
                                                                "Limite de Horas Excedido",
                                                                `Máximo de 8 horas normais por dia.\n\nHoras disponíveis: ${horasDisponiveis.toFixed(2)}h\n\nPara mais horas, marque como "Hora Extra".`,
                                                                [{ text: "OK" }],
                                                            );
                                                            return;
                                                        }
                                                    }

                                                    atualizarEspecialidade(index, "horas", horasDecimais);
                                                }}
                                                placeholder="0:00"
                                                keyboardType="default"
                                            />
                                        </View>
                                    </View>

                                    {/* Categoria com botões melhorados */}
                                    <View style={styles.editInputGroup}>
                                        <Text style={styles.editInputLabel}>
                                            <Ionicons name="layers" size={14} color="#666" />{" "}
                                            Categoria
                                        </Text>
                                        <View style={styles.editCategoryButtons}>
                                            {categorias.map((cat) => (
                                                <TouchableOpacity
                                                    key={cat.value}
                                                    style={[
                                                        styles.editCategoryButton,
                                                        espItem.categoria === cat.value &&
                                                        styles.editCategoryButtonActive,
                                                    ]}
                                                    onPress={() =>
                                                        atualizarEspecialidade(
                                                            index,
                                                            "categoria",
                                                            cat.value,
                                                        )
                                                    }
                                                >
                                                    <Ionicons
                                                        name={
                                                            cat.value === "Equipamentos"
                                                                ? "construct"
                                                                : "people"
                                                        }
                                                        size={16}
                                                        color={
                                                            espItem.categoria === cat.value
                                                                ? "#fff"
                                                                : "#1792FE"
                                                        }
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.editCategoryButtonText,
                                                            espItem.categoria === cat.value &&
                                                            styles.editCategoryButtonTextActive,
                                                        ]}
                                                    >
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
                                                name={
                                                    espItem.categoria === "Equipamentos"
                                                        ? "construct"
                                                        : "hammer"
                                                }
                                                size={14}
                                                color="#666"
                                            />{" "}
                                            {espItem.categoria === "Equipamentos"
                                                ? "Equipamento"
                                                : "Especialidade"}
                                        </Text>
                                        <View style={styles.editPickerWrapper}>
                                            <Picker
                                                selectedValue={espItem.especialidade}
                                                onValueChange={(valor) =>
                                                    selecionarOpcaoEspecialidade(index, valor)
                                                }
                                                style={styles.editPicker}
                                            >
                                                <Picker.Item
                                                    label={`— Selecionar ${espItem.categoria === "Equipamentos" ? "equipamento" : "especialidade"} —`}
                                                    value=""
                                                    enabled={false}
                                                    color="#999"
                                                />
                                                {(espItem.categoria === "MaoObra"
                                                    ? especialidadesList
                                                    : equipamentosList
                                                ).map((opt) => (
                                                    <Picker.Item
                                                        key={opt.codigo}
                                                        label={opt.descricao}
                                                        value={opt.codigo}
                                                    />
                                                ))}
                                            </Picker>
                                        </View>
                                    </View>

                                    {/* Classe */}
                                    <View style={styles.editInputGroup}>
                                        <Text style={styles.editInputLabel}>
                                            <Ionicons name="library" size={14} color="#666" /> Classe *
                                        </Text>
                                        <View style={styles.editPickerWrapper}>
                                            <Picker
                                                selectedValue={espItem.classeId === null ? "" : espItem.classeId}
                                                onValueChange={(valor) =>
                                                    atualizarEspecialidade(index, "classeId", valor === "" ? null : valor)
                                                }
                                                style={styles.editPicker}
                                                enabled={espItem.categoria !== "Equipamentos"}
                                            >
                                                <Picker.Item
                                                    label={espItem.categoria === "Equipamentos" ? "N/A" : "— Selecionar classe —"}
                                                    value=""
                                                />
                                                {getClassesCompativeis(espItem.especialidade, espItem.categoria).map((classe) => (
                                                    <Picker.Item
                                                        key={classe.classeId}
                                                        label={`${classe.classe} - ${classe.descricao}`}
                                                        value={classe.classeId}
                                                    />
                                                ))}
                                            </Picker>
                                        </View>
                                    </View>

                                    {/* Observações - NOVO CAMPO */}
                                    <View style={styles.editInputGroup}>
                                        <Text style={styles.editInputLabel}>
                                            <Ionicons name="chatbubble-ellipses" size={14} color="#666" />{" "}
                                            Observações{Number(espItem.classeId) === -1 ? ' *' : ''}
                                            {Number(espItem.classeId) === -1 && (
                                                <Text style={{ color: '#dc3545', fontSize: 11 }}>
                                                    {' '}(Obrigatório para Indiferenciada)
                                                </Text>
                                            )}
                                        </Text>
                                        <TextInput
                                            style={[
                                                styles.editTextInput,
                                                Number(espItem.classeId) === -1 && (!espItem.observacoes || espItem.observacoes.trim() === '') && {
                                                    borderColor: '#dc3545',
                                                    borderWidth: 2
                                                }
                                            ]}
                                            value={espItem.observacoes || ""}
                                            onChangeText={(v) =>
                                                atualizarEspecialidade(index, "observacoes", v)
                                            }
                                            placeholder={Number(espItem.classeId) === -1 ? "Obrigatório para classe Indiferenciada" : "Notas adicionais sobre este registo"}
                                            multiline
                                            numberOfLines={2}
                                            textAlignVertical="top"
                                        />
                                    </View>
                                </View>
                            ))}

                            {/* Resumo das horas */}
                            <View style={styles.editHoursSummary}>
                                <View style={styles.editHoursSummaryContent}>
                                    <Text style={styles.editHoursSummaryLabel}>
                                        Resumo das Horas
                                    </Text>
                                    <View style={styles.editHoursSummaryValues}>
                                        {(() => {
                                            const totalMinutos =
                                                editData.especialidadesDia?.reduce((sum, esp) => {
                                                    const horas = parseFloat(esp.horas) || 0;
                                                    return sum + Math.round(horas * 60);
                                                }, 0) || 0;

                                            const horasNormais =
                                                editData.especialidadesDia
                                                    ?.filter((esp) => !esp.horaExtra)
                                                    .reduce(
                                                        (sum, esp) => sum + (parseFloat(esp.horas) || 0),
                                                        0,
                                                    ) || 0;

                                            const horasExtras =
                                                editData.especialidadesDia
                                                    ?.filter((esp) => esp.horaExtra)
                                                    .reduce(
                                                        (sum, esp) => sum + (parseFloat(esp.horas) || 0),
                                                        0,
                                                    ) || 0;

                                            const excedeLimite = horasNormais > 8;

                                            return (
                                                <>
                                                    <Text style={styles.editHoursSummaryText}>
                                                        <Ionicons
                                                            name="calculator"
                                                            size={14}
                                                            color="#1792FE"
                                                        />
                                                        Total Distribuído:{" "}
                                                        <Text
                                                            style={{ fontWeight: "bold", color: "#1792FE" }}
                                                        >
                                                            {formatarHorasMinutos(totalMinutos)}
                                                        </Text>
                                                    </Text>

                                                    <Text style={styles.editHoursSummaryText}>
                                                        <Ionicons name="time" size={14} color="#28a745" />
                                                        Horas Normais:{" "}
                                                        <Text
                                                            style={{
                                                                fontWeight: "bold",
                                                                color: excedeLimite ? "#dc3545" : "#28a745",
                                                            }}
                                                        >
                                                            {horasNormais.toFixed(2)}h{" "}
                                                            {excedeLimite && "⚠️Excede 8h"}
                                                        </Text>
                                                    </Text>

                                                    {horasExtras > 0 && (
                                                        <Text style={styles.editHoursSummaryText}>
                                                            <Ionicons
                                                                name="flash"
                                                                size={14}
                                                                color="#ffc107"
                                                            />
                                                            Horas Extra:{" "}
                                                            <Text
                                                                style={{ fontWeight: "bold", color: "#ffc107" }}
                                                            >
                                                                {horasExtras.toFixed(2)}h
                                                            </Text>
                                                        </Text>
                                                    )}
                                                </>
                                            );
                                        })()}
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
                                colors={["#1792FE", "#0B5ED7"]}
                                style={styles.editSubmitButtonGradient}
                            >
                                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                <Text style={styles.editSubmitButtonText}>
                                    Guardar Alterações
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderPropriaParteModal = () => (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible} // Assuming this state controls visibility
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.propriaParteModalContainer}>
          <View style={styles.propriaParteModalContent}>
            <LinearGradient colors={["#1792FE", "#0B5ED7"]} style={styles.propriaParteModalHeader}>
              <View style={styles.propriaParteModalHeaderContent}>
                <View style={styles.propriaParteModalTitleContainer}>
                  <FontAwesome name="user-circle" size={24} color="#fff" />
                  <Text style={styles.propriaParteModalTitle}>Minha Parte Diária</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.propriaParteCloseButton}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.propriaParteModalSubtitle}>Registe a sua parte diária</Text>
            </LinearGradient>

            <ScrollView style={styles.propriaParteModalBody} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Conteúdo do formulário para a parte diária do diretor */}
              <View style={styles.propriaParteFormCard}>
                <Text style={styles.propriaParteFormTitle}>
                  <Ionicons name="document-text" size={16} color="#1792FE" /> Novo Registo
                </Text>

                {/* Obra e Classe - Campos fixos para o diretor */}
                <View style={styles.propriaParteInputGroup}>
                  <Text style={styles.propriaParteInputLabel}><Ionicons name="business" size={14} color="#666" /> Obra </Text>
                  <View style={styles.propriaPartePickerWrapper}>
                    <Picker
                      selectedValue={editData.obraId} // Use a state variable for this
                      onValueChange={(v) => setEditData(p => ({...p, obraId: v}))}
                      style={styles.propriaPartePicker}
                    >
                      <Picker.Item label="— Selecionar Obra —" value="" />
                      {obrasParaPickers.map(o => <Picker.Item key={o.id} label={`${o.codigo ? `${o.codigo} — ` : ""}${o.nome}`} value={o.id} />)}
                    </Picker>
                  </View>
                </View>

                <View style={styles.propriaParteInputGroup}>
                  <Text style={styles.propriaParteInputLabel}><Ionicons name="library" size={14} color="#666" /> Classe </Text>
                  <View style={styles.propriaPartePickerWrapper}>
                    <Picker
                      selectedValue={editData.classeId} // Use a state variable for this
                      onValueChange={(v) => setEditData(p => ({...p, classeId: v}))}
                      style={styles.propriaPartePicker}
                    >
                      <Picker.Item label="— Selecionar Classe —" value={null} />
                      {classesList.map(cl => (
                        <Picker.Item key={cl.classeId} label={`${cl.classe} - ${cl.descricao}`} value={cl.classeId} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Especialidade por defeito - Edificação de estaleiro */}
                <View style={styles.propriaParteInputGroup}>
                    <Text style={styles.propriaParteInputLabel}><Ionicons name="hammer" size={14} color="#666" /> Especialidade </Text>
                    <View style={styles.propriaPartePickerWrapper}>
                        <Picker
                            selectedValue={editData.especialidadeCodigo || "ESTALEIRO"} // Default value
                            onValueChange={(v) => {
                                setEditData(p => ({...p, especialidadeCodigo: v}));
                                // Automatically set subEmpId if applicable
                                const sel = especialidadesList.find(e => e.codigo === v);
                                setEditData(p => ({...p, subEmpId: sel?.subEmpId ?? null}));
                            }}
                            style={styles.propriaPartePicker}
                        >
                            <Picker.Item label="Edificação de estaleiro" value="ESTALEIRO" />
                            {/* Add other specialities if needed, but default to this one */}
                        </Picker>
                    </View>
                </View>


                {/* Dias e Horas */}
                <View style={styles.propriaParteFormGrid}>
                  <View style={styles.propriaParteInputGroup}>
                    <Text style={styles.propriaParteInputLabel}><Ionicons name="calendar" size={14} color="#666" /> Dia </Text>
                    <View style={styles.propriaPartePickerWrapper}>
                      <Picker
                        selectedValue={editData.dia} // Use a state variable for this
                        onValueChange={(v) => setEditData(p => ({...p, dia: v}))}
                        style={styles.propriaPartePicker}
                      >
                        <Picker.Item label="— Selecionar Dia —" value="" />
                        {diasDoMes.map(d => <Picker.Item key={d} label={`Dia ${d}`} value={d} />)}
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.propriaParteInputGroup}>
                    <Text style={styles.propriaParteInputLabel}><Ionicons name="time" size={14} color="#666" /> Horas </Text>
                    <TextInput
                      style={styles.propriaParteTextInput}
                      value={editData.horas} // Use a state variable for this
                      onChangeText={(v) => setEditData(p => ({...p, horas: v}))}
                      placeholder="Ex: 8:00 ou 8.5"
                      keyboardType="default"
                    />
                  </View>
                </View>

                {/* Observações */}
                <View style={styles.propriaParteInputGroup}>
                  <Text style={styles.propriaParteInputLabel}><Ionicons name="chatbubble-ellipses" size={14} color="#666" /> Observações</Text>
                  <TextInput
                    style={styles.propriaParteTextInput}
                    value={editData.observacoes} // Use a state variable for this
                    onChangeText={(v) => setEditData(p => ({...p, observacoes: v}))}
                    placeholder="Notas adicionais"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>

                {/* Botão de adicionar */}
                <TouchableOpacity onPress={() => { /* handle add action */ }} style={styles.propriaParteAddButton}>
                  <LinearGradient colors={["#1792FE", "#1792FE"]} style={styles.propriaParteAddButtonGradient}>
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.propriaParteAddButtonText}>Adicionar à Lista</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Lista de itens adicionados */}
              <View style={styles.propriaParteListCard}>
                <Text style={styles.propriaParteListTitle}><Ionicons name="list" size={16} color="#1792FE" /> Itens para Submeter (0)</Text>
                {/* Render list items here */}
              </View>
            </ScrollView>

            {/* Footer com botões */}
            <View style={styles.propriaParteModalFooter}>
              <TouchableOpacity style={styles.propriaParteCancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.propriaParteCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.propriaParteConfirmButton} onPress={() => { /* handle confirm action */ }}>
                <LinearGradient colors={["#1792FE", "#0B5ED7"]} style={styles.propriaParteConfirmButtonGradient}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.propriaParteConfirmButtonText}>Confirmar Submissão</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
                        <View
                            style={[styles.progressFill, { width: `${loadingProgress}%` }]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {Math.round(loadingProgress)}%
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <LinearGradient
            colors={["#e3f2fd", "#bbdefb", "#90caf9"]}
            style={{ flex: 1 }}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1 }}
                >
                    <View style={styles.container}>
                        {renderHeader()}
                        {renderControls()}
                        {renderDataSheet()}
                        {renderConfirmModal()}
                        {renderEditModal()}
                        {renderExternosModal()}
                        {renderPessoalEquipModal()}
                        {renderPropriaParteModal()}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
};

export default PartesDiarias;