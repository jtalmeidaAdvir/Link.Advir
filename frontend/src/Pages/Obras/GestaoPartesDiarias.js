import React, { useState, useEffect, useCallback, useMemo } from "react";
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
    Alert,
    Platform,
    TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "./Css/GestaoPartesDiariasStyles";

const GestaoPartesDiarias = () => {
    // === NO TOPO DO FICHEIRO (fora do componente) ===
    const DOC_ID_DEFAULT = "1747FEA9-5D2F-45B4-A89B-9EA30B1E0DCB"; // mão-de-obra/outros
    const DOC_ID_EQUIP = "11C77189-1046-4CDE-96F9-503B8EB25B08"; // equipamentos

    // Pessoal / mão-de-obra (usa InsertParteDiariaItem)
    const buildPayloadPessoal = ({
        docId,
        cab,
        itens,
        idObra,
        colaboradorIdCab,
        colaboradorIdItens,
    }) => ({
        Cabecalho: {
            DocumentoID: docId,
            ObraID: idObra,
            Data: cab.Data,
            Notas: cab.Notas || "",
            CriadoPor: cab.CriadoPor || "",
            Utilizador: cab.Utilizador || "",
            TipoEntidade: "O",
            ColaboradorID: colaboradorIdCab ?? colaboradorIdItens ?? null,
        },
        Itens: itens.map((it) => ({
            ComponenteID: it.ComponenteID,
            Funcionario: "",
            ClasseID: it.ClasseID,
            SubEmpID: it.SubEmpID,
            NumHoras: Number((it.NumHoras / 60).toFixed(2)), // horas decimais
            TotalHoras: Number((it.NumHoras / 60).toFixed(2)),
            TipoEntidade: "O",
            ColaboradorID: colaboradorIdItens ?? null,
            Data: it.Data,
            ObraID: idObra,
            TipoHoraID: it.TipoHoraID ?? null,
            Observacoes: it.Observacoes || "", // Adicionar observações
        })),
    });

    // Equipamentos (usa InsertParteDiariaEquipamento)
    const buildPayloadEquip = ({ docId, cab, itens, idObra }) => ({
        Cabecalho: {
            DocumentoID: docId,
            ObraID: idObra,
            Data: cab.Data,
            Notas: cab.Notas || "",
            CriadoPor: cab.CriadoPor || "",
            Utilizador: cab.Utilizador || "",
            Encarregado: null,
        },
        Itens: itens.map((it) => ({
            ComponenteID: it.SubEmpID ?? 0, // aqui o ComponenteID recebe o que vinha no SubEmpID
            Funcionario: "",
            ClasseID: it.ClasseID ?? -1,
            Fornecedor: null,
            SubEmpID: null, // força vazio
            NumHorasTrabalho: Number((it.NumHoras / 60).toFixed(2)),
            NumHorasOrdem: 0,
            NumHorasAvariada: 0,
            PrecoUnit: it.PrecoUnit ?? 0,
            ItemId: null,
            Observacoes: it.Observacoes || "", // Adicionar observações
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
    const [filtroEstado, setFiltroEstado] = useState("pendentes");
    const [integrandoIds, setIntegrandoIds] = useState(new Set());
    const [equipamentosMap, setEquipamentosMap] = useState({});
    const [obrasResponsavel, setObrasResponsavel] = useState(new Set()); // Set com IDs das obras que sou responsável
    const [classesMap, setClassesMap] = useState({}); // Novo estado para o mapa de classes
    const [classesList, setClassesList] = useState([]);
    const [classesMapById, setClassesMapById] = useState({});
    const [loadingPercentage, setLoadingPercentage] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState("");

    const confirm = (title, message) =>
        new Promise((resolve) => {
            if (Platform.OS === "web") {
                // RN Web: usa window.confirm para garantir que aparece
                resolve(window.confirm(`${title}\n\n${message}`));
                return;
            }
            Alert.alert(
                title,
                message,
                [
                    {
                        text: "Cancelar",
                        style: "cancel",
                        onPress: () => resolve(false),
                    },
                    {
                        text: "Rejeitar",
                        style: "destructive",
                        onPress: () => resolve(true),
                    },
                ],
                { cancelable: true },
            );
        });

    // helper perto do topo do componente
    const getItemId = (x) =>
        String(
            x?.ComponenteID ?? x?.ID ?? x?.ItemID ?? x?.ItemId ?? x?.id ?? "",
        );

    const cabecalhosFiltrados = useMemo(() => {
        let filtered = cabecalhos;

        // Filtrar por estado (pendentes/integrados)
        if (filtroEstado === "pendentes") {
            filtered = filtered.filter((c) => !c.IntegradoERP);
        } else if (filtroEstado === "integrados") {
            filtered = filtered.filter((c) => c.IntegradoERP);
        }

        // Filtrar apenas obras onde sou responsável
        filtered = filtered.filter((c) => {
            const obraId = Number(c.ObraID);
            return obrasResponsavel.has(obraId);
        });

        return filtered;
    }, [cabecalhos, filtroEstado, obrasResponsavel]);

    // === ESTADOS DE EDIÇÃO ===
    const [editItemModalVisible, setEditItemModalVisible] = useState(false);
    const [itemEmEdicao, setItemEmEdicao] = useState(null);
    const [editItem, setEditItem] = useState({
        id: null, // ID do item no teu backend
        documentoID: null,
        obraId: null,
        dataISO: "",
        categoria: "MaoObra", // 'MaoObra' | 'Equipamentos'
        especialidadeCodigo: "",
        subEmpId: null, // SubEmpId (Mão de obra) ou ComponenteID (Equip)
        horasStr: "", // input do utilizador (H:MM ou decimal)
        horaExtra: false,
        classeID: null, // Adicionado para a classe
    });

    const [especialidadesList, setEspecialidadesList] = useState([]);
    const [equipamentosList, setEquipamentosList] = useState([]);

    // === HELPERS DE HORAS/DIAS ===
    const parseHorasToMinutos = (s) => {
        if (!s) return 0;
        const t = String(s).trim().replace(",", ".");
        if (t.includes(":")) {
            const [h, m] = t.split(":");
            return Math.max(0, (parseInt(h) || 0) * 60 + (parseInt(m) || 0));
        }
        const dec = parseFloat(t);
        if (Number.isNaN(dec) || dec < 0) return 0;
        return Math.round(dec * 60);
    };
    const formatMinutos = (min) => {
        const h = Math.floor((min || 0) / 60);
        const m = Math.abs((min || 0) % 60);
        return min > 0 ? `${h}:${String(m).padStart(2, "0")}` : "";
    };
    const isFimDeSemana = (isoDate) => {
        const d = new Date(isoDate);
        const w = d.getDay(); // 0=Dom, 6=Sáb
        return w === 0 || w === 6;
    };

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setLoadingPercentage(0);
                setLoadingMessage("A iniciar carregamento...");

                // Carregar dados em paralelo para melhor performance
                const totalSteps = 5;
                let currentStep = 0;

                const updateProgress = (step, message) => {
                    currentStep = step;
                    const percentage = Math.round((currentStep / totalSteps) * 100);
                    setLoadingPercentage(percentage);
                    setLoadingMessage(message);
                };

                // Carregar dados críticos primeiro (paralelo)
                updateProgress(1, "A carregar especialidades e equipamentos...");
                await Promise.all([
                    fetchEspecialidades(),
                    fetchEquipamentos(),
                    fetchClasses()
                ]);

                // Carregar obras (necessário antes de cabecalhos)
                updateProgress(3, "A carregar obras...");
                await fetchObras();

                // Carregar cabeçalhos
                updateProgress(4, "A carregar partes diárias...");
                await fetchCabecalhos();

                updateProgress(5, "Concluído!");
                
                // Pequeno delay para mostrar 100%
                setTimeout(() => {
                    setLoading(false);
                    setLoadingPercentage(0);
                }, 300);
            } catch (err) {
                console.error("Erro no carregamento inicial:", err);
                setLoading(false);
                setError("Erro ao carregar dados iniciais");
            }
        })();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchCabecalhos();
        setRefreshing(false);
    }, []);

    const fetchEspecialidades = async () => {
        try {
            const token = await AsyncStorage.getItem("painelAdminToken");
            const urlempresa = await AsyncStorage.getItem("urlempresa");
            
            const res = await fetch(
                "https://webapiprimavera.advir.pt/routesFaltas/GetListaEspecialidades",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );
            
            if (!res.ok) throw new Error("Falha ao obter especialidades");
            const data = await res.json();
            const table = data?.DataSet?.Table || [];

            const map = {};
            const list = [];

            table.forEach((item) => {
                const subEmpId = item.SubEmpId ?? item.SubEmpID ?? item.SubEmpid;
                const codigo = item.SubEmp ?? String(subEmpId ?? "");
                const desc = item.Descricao ?? item.Desig ?? codigo;
                if (subEmpId != null) map[String(subEmpId)] = desc;
                list.push({ codigo, descricao: desc, subEmpId });
            });

            setEspecialidadesMap(map);
            setEspecialidadesList(list);
        } catch (err) {
            console.warn("Erro especialidades:", err.message);
        }
    };

    const fetchEquipamentos = async () => {
        try {
            const token = await AsyncStorage.getItem("painelAdminToken");
            const urlempresa = await AsyncStorage.getItem("urlempresa");

            const res = await fetch(
                "https://webapiprimavera.advir.pt/routesFaltas/GetListaEquipamentos",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );
            if (!res.ok) throw new Error("Falha ao obter equipamentos");
            const data = await res.json();

            const table = data?.DataSet?.Table || [];
            const map = {};
            const list = [];

            table.forEach((item) => {
                const componenteID = item.ComponenteID ?? item.ID ?? null;
                const codigo = item.Codigo ?? String(componenteID ?? "");
                const nome = item.Desig ?? codigo;
                if (componenteID != null) map[String(componenteID)] = nome;
                list.push({ codigo, descricao: nome, subEmpId: componenteID });
            });

            setEquipamentosMap(map);
            setEquipamentosList(list);
        } catch (err) {
            console.warn("Erro equipamentos:", err.message);
        }
    };

    const getClasseNomeById = (id) => {
        if (id === null || id === undefined || id === "") return "—";
        const k1 = String(id).trim();
        const k2 = String(parseInt(k1, 10)); // tenta versão numérica (remove zeros à esquerda)
        return (
            classesMapById[k1] ||
            classesMapById[k2] ||
            (classesList.length ? `Classe ${k1}` : "Classes não carregadas")
        );
    };

    const carregarClasses = useCallback(async () => {
        const painelToken = await AsyncStorage.getItem("painelAdminToken");
        const urlempresa = await AsyncStorage.getItem("urlempresa");
        try {
            const data = await fetchComRetentativas(
                "https://webapiprimavera.advir.pt/routesFaltas/GetListaClasses",
                {
                    headers: {
                        Authorization: `Bearer ${painelToken}`,
                        urlempresa,
                    },
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

    const getClasseDescricao = (classeId) => {
        if (classeId === undefined || classeId === null || classeId === "")
            return "Não definida";

        // strings consistentes
        const raw = String(classeId).trim();
        const soDigitos = raw.replace(/\D/g, ""); // "47.0" -> "470" (já vamos tratar)
        const semZeros = raw.replace(/^0+/, "") || "0";
        const semZerosDig = soDigitos.replace(/^0+/, "") || "0";

        // tenta também interpretar como número
        const numRaw = parseInt(semZeros, 10);
        const numDig = parseInt(semZerosDig, 10);

        const padLens = [2, 3, 4, 5, 6, 7, 8, 9, 10];

        // candidatos em ordem de probabilidade
        const candidatos = new Set(
            [
                raw,
                semZeros,
                soDigitos,
                semZerosDig,
                Number.isNaN(numRaw) ? null : String(numRaw),
                Number.isNaN(numDig) ? null : String(numDig),
                ...padLens.map((L) => raw.padStart(L, "0")),
                ...padLens.map((L) => semZeros.padStart(L, "0")),
                ...padLens.map((L) => soDigitos.padStart(L, "0")),
                ...(!Number.isNaN(numRaw)
                    ? padLens.map((L) => String(numRaw).padStart(L, "0"))
                    : []),
                ...(!Number.isNaN(numDig)
                    ? padLens.map((L) => String(numDig).padStart(L, "0"))
                    : []),
            ].filter(Boolean),
        );

        // 1ª passagem: devolver descrição “válida”
        for (const k of candidatos) {
            const hit = classesMap[k];
            if (hit && hit !== k) return hit;
        }
        // 2ª passagem: se a entrada existe, devolve-a (mesmo que igual à chave)
        for (const k of candidatos) {
            if (classesMap[k]) return classesMap[k];
        }

        const total = Object.keys(classesMap).length;
        return total === 0
            ? "Classes não carregadas"
            : `Classe ${classeId} (${total} classes disponíveis)`;
    };

    // Nova função para buscar classes
    // === CLASSES ===
    const fetchClasses = async () => {
        try {
            const token = await AsyncStorage.getItem("painelAdminToken");
            const urlempresa = await AsyncStorage.getItem("urlempresa");

            const res = await fetch(
                "https://webapiprimavera.advir.pt/routesFaltas/GetListaClasses",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );
            if (!res.ok) throw new Error("Falha ao obter classes");
            const data = await res.json();

            const table =
                data?.DataSet?.Table || data?.Table || data?.data || [];
            const mapLoose = {}; // várias chaves possíveis -> descrição (mantém o teu comportamento atual)
            const mapById = {}; // ID “canónico” -> descrição (para getClasseNomeById)
            const listById = new Map(); // para construir lista única pro Picker

            const put = (obj, k, v) => {
                if (k === undefined || k === null) return;
                const ks = String(k).trim();
                if (!ks) return;
                obj[ks] = v;
            };

            table.forEach((item) => {
                // tentar apanhar tudo que costuma vir do serviço
                const idRaw =
                    item.ClasseId ??
                    item.ClasseID ??
                    item.ID ??
                    item.Id ??
                    item.id;
                const codigoRaw =
                    item.CDU_CCS ??
                    item.Classe ??
                    item.Codigo ??
                    item.Code ??
                    item.Cod;
                const desc =
                    item.Descricao ??
                    item.Desig ??
                    item.Nome ??
                    String(idRaw ?? codigoRaw ?? "");

                // 1) mapById (apenas por ID canónico)
                if (idRaw !== undefined && idRaw !== null) {
                    const idStr = String(idRaw).trim();
                    put(mapById, idStr, desc);
                    // construir lista única para o Picker
                    if (!listById.has(idStr)) {
                        listById.set(idStr, {
                            id: idStr,
                            codigo: codigoRaw ? String(codigoRaw).trim() : null,
                            descricao: desc,
                        });
                    }
                }

                // 2) mapLoose (todas as variantes como antes)
                //    — ID com e sem zeros à esquerda e zero-pad comum
                if (idRaw !== undefined && idRaw !== null) {
                    const idStr = String(idRaw).trim();
                    const idNoZeros = idStr.replace(/^0+/, "") || "0";
                    const idNum = parseInt(idNoZeros, 10);
                    put(mapLoose, idStr, desc);
                    put(mapLoose, idNoZeros, desc);
                    if (!Number.isNaN(idNum)) {
                        put(mapLoose, String(idNum), desc);
                        put(mapLoose, String(idNum).padStart(2, "0"), desc);
                        put(mapLoose, String(idNum).padStart(3, "0"), desc);
                    }
                }
                //    — Código com e sem zeros à esquerda
                if (codigoRaw !== undefined && codigoRaw !== null) {
                    const codStr = String(codigoRaw).trim();
                    const codNoZeros = codStr.replace(/^0+/, "") || "0";
                    const codNum = parseInt(codNoZeros, 10);
                    put(mapLoose, codStr, desc);
                    put(mapLoose, codNoZeros, desc);
                    if (!Number.isNaN(codNum)) {
                        put(mapLoose, String(codNum), desc);
                        put(mapLoose, String(codNum).padStart(2, "0"), desc);
                        put(mapLoose, String(codNum).padStart(3, "0"), desc);
                    }
                }
            });

            // lista ordenada alfabeticamente por descrição
            const list = Array.from(listById.values()).sort((a, b) =>
                String(a.descricao).localeCompare(String(b.descricao), "pt", {
                    sensitivity: "base",
                }),
            );

            setClassesMap(mapLoose);
            setClassesMapById(mapById);
            setClassesList(list);
        } catch (err) {
            console.warn("Erro classes:", err.message);
        }
    };

    const abrirEdicaoItem = (item, cab, idx) => {
        // Detecta categoria
        const cat =
            String(item.Categoria || "").toLowerCase() === "equipamentos"
                ? "Equipamentos"
                : "MaoObra";

        // Descobre subEmpId inicial
        const subId =
            cat === "Equipamentos"
                ? (item.ComponenteID ?? item.SubEmpID ?? null)
                : (item.SubEmpID ?? null);

        // Tenta achar "código" a partir do subEmpId (para pré-seleção do Picker)
        const lista =
            cat === "Equipamentos" ? equipamentosList : especialidadesList;
        const found = lista.find((x) => String(x.subEmpId) === String(subId));

        const dataISO = (item.Data || "").split("T")[0] || item.Data;
        const horasStr = formatMinutos(item.NumHoras || 0);
        const horaExtra = !!item.TipoHoraID; // se já vinha marcado

        setItemEmEdicao({
            ...item,
            _cabDocId: cab.DocumentoID,
            _idx: idx,
            // guarda o Numero real se existir; senão usa o índice (1-based)
            Numero: item.Numero ?? item.numero ?? idx + 1,
        });
        setEditItem({
            id:
                item.ComponenteID ??
                item.ID ??
                item.ItemID ??
                item.ItemId ??
                item.id ??
                null,
            documentoID: cab.DocumentoID,
            obraId: item.ObraID ?? cab.ObraID ?? null,
            dataISO,
            categoria: cat,
            especialidadeCodigo: found?.codigo || "",
            subEmpId: found?.subEmpId ?? subId ?? null,
            horasStr,
            horaExtra,
            classeID: item.ClasseID ?? null, // Adicionar ClasseID ao estado de edição
        });
        setEditItemModalVisible(true);
    };

    const guardarItemEditado = async () => {
        try {
            console.log("💾 Guardar clicado", editItem);

            if (!itemEmEdicao) {
                Alert.alert("Erro", "Item inválido.");
                return;
            }
            if (!editItem.obraId || !editItem.dataISO) {
                Alert.alert("Erro", "Obra e Data são obrigatórias.");
                return;
            }

            const loginToken = await AsyncStorage.getItem("loginToken");
            if (!loginToken) {
                Alert.alert("Sessão", "Sem sessão válida. Entre novamente.");
                return;
            }

            const minutos = parseHorasToMinutos(editItem.horasStr);
            const categoriaBD =
                editItem.categoria === "Equipamentos"
                    ? "Equipamentos"
                    : "MaoObra";
            const tipoHoraId = editItem.horaExtra
                ? isFimDeSemana(editItem.dataISO)
                    ? "H06"
                    : "H01"
                : null;

            // Valores anteriores do item (se existirem)
            const prev = itemEmEdicao || {};

            // Campos obrigatórios no create (e inofensivos no update)
            const obrigatorios = {
                Funcionario: prev.Funcionario ?? "",
                ClasseID: editItem.classeID ?? prev.ClasseID ?? -1, // Usar valor do editItem, ou anterior
                PrecoUnit: prev.PrecoUnit ?? 0,
                TipoEntidade: prev.TipoEntidade ?? "O",
                ColaboradorID: prev.ColaboradorID ?? null,
            };

            const payload = {
                DocumentoID: editItem.documentoID,
                ObraID: Number(editItem.obraId) || null,
                Data: editItem.dataISO,
                Categoria: categoriaBD,
                SubEmpID: editItem.subEmpId ?? null,
                ComponenteID:
                    editItem.categoria === "Equipamentos"
                        ? (editItem.subEmpId ?? null)
                        : null,
                NumHoras: minutos,
                TipoHoraID: tipoHoraId,
                ...obrigatorios,
            };

            // Decide URL e método
            let url = "";
            let method = "PUT";

            if (editItem.id) {
                // Atualizar por PK
                url = `https://backend.advir.pt/api/parte-diaria/itens/${encodeURIComponent(editItem.id)}`;
            } else if (prev?.Numero != null) {
                // Fallback: atualizar por DocumentoID + Número (linha) — precisa da rota no backend
                url = `https://backend.advir.pt/api/parte-diaria/itens/doc/${encodeURIComponent(editItem.documentoID)}/linha/${Number(prev.Numero)}`;
            } else {
                // Último recurso: criar
                method = "POST";
                payload.Numero =
                    prev?._idx != null
                        ? prev._idx + 1
                        : (prev.Numero ?? undefined);
                url = `https://backend.advir.pt/api/parte-diaria/itens`;
            }

            console.log("URL UPDATE:", method, url);
            console.log("ID usado:", editItem.id);

            const resp = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${loginToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const raw = await resp.text();
            let saved = null;
            try {
                saved = raw ? JSON.parse(raw) : null;
            } catch {
                /* 204, etc. */
            }

            if (!resp.ok) {
                const msg =
                    saved?.erro ||
                    saved?.message ||
                    `Falha ao guardar (HTTP ${resp.status})`;
                throw new Error(msg);
            }

            // Construir item atualizado (prioriza o que veio do servidor)
            const itemAtualizado = {
                ...itemEmEdicao,
                ...(saved || {}),
                ObraID: saved?.ObraID ?? payload.ObraID,
                Data: saved?.Data ?? payload.Data,
                Categoria: saved?.Categoria ?? payload.Categoria,
                SubEmpID: saved?.SubEmpID ?? payload.SubEmpID,
                ComponenteID: saved?.ComponenteID ?? payload.ComponenteID,
                NumHoras: saved?.NumHoras ?? payload.NumHoras,
                TipoHoraID: saved?.TipoHoraID ?? payload.TipoHoraID,
                Funcionario: saved?.Funcionario ?? payload.Funcionario,
                ClasseID: saved?.ClasseID ?? payload.ClasseID, // Atualiza ClasseID
                PrecoUnit: saved?.PrecoUnit ?? payload.PrecoUnit,
                TipoEntidade: saved?.TipoEntidade ?? payload.TipoEntidade,
                ColaboradorID: saved?.ColaboradorID ?? payload.ColaboradorID,
                Numero: saved?.Numero ?? prev.Numero ?? payload.Numero,
            };

            // Obter id devolvido pelo servidor (em caso de criação)
            const newId = String(
                saved?.ComponenteID ?? saved?.id ?? saved?.ID ?? "",
            ).trim();
            const eid = String(editItem.id ?? newId ?? "").trim();
            const linhaNumero = Number(
                itemEmEdicao?.Numero ?? saved?.Numero ?? saved?.numero ?? NaN,
            );

            const isSame = (i) => {
                const iid = getItemId(i);
                if (eid) return String(iid) === String(eid);
                if (!Number.isNaN(linhaNumero))
                    return Number(i.Numero ?? i.numero) === linhaNumero;
                return false;
            };

            // Atualiza selectedCabecalho
            setSelectedCabecalho((prevCab) => {
                if (!prevCab) return prevCab;
                const arr = prevCab.ParteDiariaItems || [];
                let encontrou = false;
                const novos = arr.map((i) => {
                    if (isSame(i)) {
                        encontrou = true;
                        return itemAtualizado;
                    }
                    return i;
                });
                const lista = encontrou ? novos : [...novos, itemAtualizado];
                return { ...prevCab, ParteDiariaItems: lista };
            });

            // Atualiza lista total de cabeçalhos
            setCabecalhos((prevList) =>
                prevList.map((c) => {
                    if (
                        String(c.DocumentoID) !==
                        String(itemEmEdicao._cabDocId || editItem.documentoID)
                    )
                        return c;
                    const arr = c.ParteDiariaItems || [];
                    let encontrou = false;
                    const novos = arr.map((i) => {
                        if (isSame(i)) {
                            encontrou = true;
                            return itemAtualizado;
                        }
                        return i;
                    });
                    const lista = encontrou
                        ? novos
                        : [...novos, itemAtualizado];
                    return { ...c, ParteDiariaItems: lista };
                }),
            );

            // Fecha modal e limpa estado
            setEditItemModalVisible(false);
            setItemEmEdicao(null);

            // Se criou, guarda o id novo no estado de edição (se quiseres)
            if (!editItem.id && newId) {
                setEditItem((s) => ({ ...s, id: newId }));
            }

            Alert.alert("Sucesso", "Item atualizado.");
        } catch (e) {
            console.error("Erro a guardar item:", e);
            Alert.alert("Erro", e.message || "Não foi possível guardar.");
        }
    };

    const getCategoriaChip = (categoria) => {
        const cat = String(categoria || "").toLowerCase();
        if (cat === "equipamentos") {
            return { label: "Equipamento", bg: "#6f42c1", icon: "construct" };
        }
        return { label: "Pessoal", bg: "#17a2b8", icon: "people" };
    };

    // === EXTERNOS: helpers ===
    const isExternoItem = (it) => {
        const semColab =
            it.ColaboradorID === null ||
            it.ColaboradorID === undefined ||
            String(it.ColaboradorID).trim() === "";
        const marca = String(it.Funcionario || "")
            .toLowerCase()
            .includes("(externo)");
        return semColab || marca;
    };

    const hasOnlyExternos = (cab) => {
        const itens = cab?.ParteDiariaItems || [];
        return itens.length > 0 && itens.every(isExternoItem);
    };

    const contarPorCategoria = (itens = []) => {
        let pes = 0,
            eq = 0,
            ext = 0;
        itens.forEach((it) => {
            if (isExternoItem(it)) {
                ext++;
                return;
            }
            if (String(it.Categoria || "").toLowerCase() === "equipamentos")
                eq++;
            else pes++;
        });
        return { pes, eq, ext };
    };

    const obterNomeFuncionario = useCallback(
        async (codFuncionario) => {
            if (!codFuncionario) return ""; // externos não têm ColaboradorID
            if (cacheNomes[codFuncionario]) return cacheNomes[codFuncionario];

            try {
                const painelToken =
                    await AsyncStorage.getItem("painelAdminToken");
                const urlempresa = await AsyncStorage.getItem("urlempresa");
                const res = await fetch(
                    `https://webapiprimavera.advir.pt/routesFaltas/GetNomeFuncionario/${codFuncionario}`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${painelToken}`,
                            urlempresa,
                        },
                    },
                );

                if (res.ok) {
                    const data = await res.json();
                    const nome =
                        data?.DataSet?.Table?.[0]?.Nome || codFuncionario;
                    setCacheNomes((prev) => ({
                        ...prev,
                        [codFuncionario]: nome,
                    }));
                    return nome;
                }

                console.warn(
                    `Erro ao obter nome do funcionário ${codFuncionario}`,
                );
                setCacheNomes((prev) => ({
                    ...prev,
                    [codFuncionario]: codFuncionario,
                }));
                return codFuncionario;
            } catch (err) {
                console.error("Erro ao obter nome do funcionário:", err);
                setCacheNomes((prev) => ({
                    ...prev,
                    [codFuncionario]: codFuncionario,
                }));
                return codFuncionario;
            }
        },
        [cacheNomes],
    );

    const obterColaboradorID = useCallback(
        async (codFuncionario) => {
            if (!codFuncionario) return null;
            if (cacheColaboradorID[codFuncionario])
                return cacheColaboradorID[codFuncionario];

            try {
                const painelToken =
                    await AsyncStorage.getItem("painelAdminToken");
                const urlempresa = await AsyncStorage.getItem("urlempresa");

                const res = await fetch(
                    `https://webapiprimavera.advir.pt/routesFaltas/GetColaboradorId/${codFuncionario}`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${painelToken}`,
                            urlempresa,
                        },
                    },
                );

                const data = await res.json();
                const colaboradorID =
                    data?.DataSet?.Table?.[0]?.IDOperador || null;

                if (colaboradorID !== null) {
                    setCacheColaboradorID((prev) => ({
                        ...prev,
                        [codFuncionario]: colaboradorID,
                    }));
                    return colaboradorID;
                }

                console.warn(
                    `ColaboradorID não encontrado para ${codFuncionario}`,
                );
                setCacheColaboradorID((prev) => ({
                    ...prev,
                    [codFuncionario]: null,
                }));
                return null;
            } catch (err) {
                console.error(
                    `Erro ao obter ColaboradorID para ${codFuncionario}:`,
                    err,
                );
                setCacheColaboradorID((prev) => ({
                    ...prev,
                    [codFuncionario]: null,
                }));
                return null;
            }
        },
        [cacheColaboradorID],
    );

    const obterCodObra = useCallback(async (obraID) => {
        try {
            const token = await AsyncStorage.getItem("loginToken");

            const response = await fetch(
                `https://backend.advir.pt/api/obra/getcodigo/${obraID}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            const data = await response.json();

            if (response.ok) {
                return data;
            } else {
                Alert.alert("Erro", `Erro ao obter obra: ${data.message}`);
            }
        } catch (error) {
            console.error("Erro ao obter obra:", error);
            Alert.alert("Erro", "Erro ao obter obra");
        }
    }, []);

    const obterIDObra = useCallback(async (codigoObra) => {
        try {
            const token = await AsyncStorage.getItem("painelAdminToken");
            const urlempresa = await AsyncStorage.getItem("urlempresa");

            const response = await fetch(
                `https://webapiprimavera.advir.pt/routesFaltas/GetObraId/${codigoObra}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        urlempresa: urlempresa,
                    },
                },
            );

            const data = await response.json();

            if (response.ok) {
                const id = data?.DataSet?.Table?.[0]?.Id;
                return id || null;
            } else {
                Alert.alert(
                    "Erro",
                    `Erro ao obter ID da obra: ${data.message}`,
                );
                return null;
            }
        } catch (error) {
            console.error("Erro ao obter ID da obra:", error);
            Alert.alert("Erro", "Erro ao obter ID da obra");
            return null;
        }
    }, []);

    const fetchResponsavelObra = async (codigoObra) => {
        try {
            const token = await AsyncStorage.getItem("painelAdminToken");
            const urlempresa = await AsyncStorage.getItem("urlempresa");

            if (!token || !urlempresa) {
                return null;
            }

            const encodedCodigo = encodeURIComponent(codigoObra);

            const response = await fetch(
                `https://webapiprimavera.advir.pt/listarObras/GetResponsavel/${encodedCodigo}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );

            if (response.ok) {
                const data = await response.json();
                if (
                    data &&
                    data.DataSet &&
                    data.DataSet.Table &&
                    data.DataSet.Table.length > 0
                ) {
                    return (
                        data.DataSet.Table[0].CDU_AcessoUtilizador1 ||
                        data.DataSet.Table[0].Nome ||
                        data.DataSet.Table[0].name ||
                        null
                    );
                }
            }
        } catch (error) {
            console.error(
                `Erro ao buscar responsável da obra ${codigoObra}:`,
                error,
            );
        }
        return null;
    };

    const fetchObras = async () => {
        try {
            const logintoken = await AsyncStorage.getItem("loginToken");
            const res = await fetch("https://backend.advir.pt/api/obra", {
                headers: {
                    Authorization: `Bearer ${logintoken}`,
                    "Content-Type": "application/json",
                },
            });
            if (!res.ok) throw new Error("Falha ao obter obras");
            const obras = await res.json();
            const map = {};

            // Obter o responsável atual do localStorage
            const codRecursosHumanos = await AsyncStorage.getItem("codRecursosHumanos");
            const obrasDoResponsavel = new Set();

            // Verificar responsáveis em paralelo (máximo 10 simultâneos)
            const chunkSize = 10;
            for (let i = 0; i < obras.length; i += chunkSize) {
                const chunk = obras.slice(i, i + chunkSize);
                const resultados = await Promise.all(
                    chunk.map(async (obra) => {
                        const key = String(obra.id || obra.ID);
                        map[key] = { codigo: obra.codigo, descricao: obra.nome };

                        if (codRecursosHumanos && obra.codigo) {
                            const responsavel = await fetchResponsavelObra(obra.codigo);
                            return { key, isResponsavel: responsavel === codRecursosHumanos };
                        }
                        return { key, isResponsavel: false };
                    })
                );

                resultados.forEach(({ key, isResponsavel }) => {
                    if (isResponsavel) {
                        obrasDoResponsavel.add(Number(key));
                    }
                });
            }

            setObrasMap(map);
            setObrasResponsavel(obrasDoResponsavel);
        } catch (err) {
            console.warn("Erro obras:", err.message);
        }
    };

    const fetchCabecalhos = async () => {
        try {
            const token = await AsyncStorage.getItem("painelAdminToken");
            if (!token) throw new Error("Token de autenticação não encontrado.");
            
            const res = await fetch(
                "https://backend.advir.pt/api/parte-diaria/cabecalhos",
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            
            if (!res.ok) throw new Error("Falha ao obter partes diárias.");
            const data = await res.json();

            // Otimização: Carregar nomes de colaboradores únicos em paralelo
            const colaboradoresUnicos = new Set();
            data.forEach(cab => {
                cab?.ParteDiariaItems?.forEach(item => {
                    if (!isExternoItem(item) && item.ColaboradorID) {
                        colaboradoresUnicos.add(item.ColaboradorID);
                    }
                });
            });

            // Carregar todos os nomes em paralelo (máximo 10 simultâneos para evitar sobrecarga)
            const colaboradoresArray = Array.from(colaboradoresUnicos);
            const chunkSize = 10;
            for (let i = 0; i < colaboradoresArray.length; i += chunkSize) {
                const chunk = colaboradoresArray.slice(i, i + chunkSize);
                await Promise.all(chunk.map(id => obterNomeFuncionario(id)));
            }

            setCabecalhos(data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    const formatarHoras = (minutos) => {
        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        return `${h > 0 ? `${h}h ` : ""}${m}m`;
    };

    // === INTEGRAR: exclui EXTERNOS (envia só internos)
    const handleIntegrar = async (cab) => {
        setIntegrandoIds((prev) => new Set(prev).add(cab.DocumentoID));

        try {
            const token = await AsyncStorage.getItem("painelAdminToken");
            const urlempresa = await AsyncStorage.getItem("urlempresa");
            const loginToken = await AsyncStorage.getItem("loginToken");
            if (!token || !urlempresa) {
                Alert.alert("Erro", "Token ou empresa em falta.");
                return;
            }

            const apiUrlPessoal =
                "https://webapiprimavera.advir.pt/routesFaltas/InsertParteDiariaItem";
            const apiUrlEquip =
                "https://webapiprimavera.advir.pt/routesFaltas/InsertParteDiariaEquipamento";

            // Obra (converter para ID do ERP)
            const dadosObra = await obterCodObra(cab.ObraID);
            const codigoObra = dadosObra?.codigo;
            const idObra = await obterIDObra(codigoObra);

            // Colaborador no cabeçalho (se existir em storage)
            const codFuncLocal = await AsyncStorage.getItem("codFuncionario");
            const colaboradorIdCab = codFuncLocal
                ? await obterColaboradorID(codFuncLocal)
                : null;

            // Colaborador para os itens (primeiro NÃO externo)
            const primeiroItemColab = cab?.ParteDiariaItems?.find(
                (i) => !isExternoItem(i),
            )?.ColaboradorID;
            const colaboradorIdItens = primeiroItemColab
                ? await obterColaboradorID(primeiroItemColab)
                : null;

            // === FILTRAR EXTERNOS (não enviar) ===
            const itens = cab.ParteDiariaItems || [];
            const itensNaoExterno = itens.filter((it) => !isExternoItem(it));

            if (itensNaoExterno.length === 0) {
                Alert.alert(
                    "Informação",
                    'Este documento só contém EXTERNOS. Usa o botão "Aceitar".',
                );
                return;
            }

            // dividir itens não externos por categoria
            const itensEquip = itensNaoExterno.filter(
                (it) =>
                    String(it.Categoria || "").toLowerCase() === "equipamentos",
            );
            const itensOutros = itensNaoExterno.filter(
                (it) =>
                    String(it.Categoria || "").toLowerCase() !== "equipamentos",
            );

            // construir pedidos com URL por tipo
            const pedidos = [];
            if (itensEquip.length > 0) {
                pedidos.push({
                    nome: "equipamentos",
                    url: apiUrlEquip,
                    payload: buildPayloadEquip({
                        docId: DOC_ID_EQUIP,
                        cab,
                        itens: itensEquip,
                        idObra,
                    }),
                });
            }
            if (itensOutros.length > 0) {
                pedidos.push({
                    nome: "pessoal",
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
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        urlempresa,
                    },
                    body: JSON.stringify(p.payload),
                });
                const result = await resp.json().catch(() => ({}));
                if (!resp.ok) {
                    console.error(`❌ Falha ao integrar (${p.nome}):`, result);
                    Alert.alert(
                        "Erro",
                        `Falha ao integrar (${p.nome}): ${result?.detalhes || result?.error || "erro desconhecido"}`,
                    );
                    return;
                }
            }

            // marcar como integrado no teu backend
            const marcarRes = await fetch(
                `https://backend.advir.pt/api/parte-diaria/cabecalhos/${cab.DocumentoID}/integrar`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${loginToken}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            if (marcarRes.ok) {
                Alert.alert(
                    "Sucesso",
                    "Parte integrada com sucesso (apenas não externos).",
                );
                fetchCabecalhos();
            } else {
                Alert.alert(
                    "Aviso",
                    "Parte enviada mas falhou ao marcar como integrada.",
                );
            }
        } catch (err) {
            console.error("Erro na integração:", err);
            Alert.alert("Erro", "Erro inesperado ao integrar parte.");
        } finally {
            setIntegrandoIds((prev) => {
                const s = new Set(prev);
                s.delete(cab.DocumentoID);
                return s;
            });
        }
    };

    // === ACEITAR (só externos): marca como integrado sem enviar ao Primavera ===
    const handleAceitarSomenteExternos = async (cab) => {
        setIntegrandoIds((prev) => new Set(prev).add(cab.DocumentoID));
        try {
            if (!hasOnlyExternos(cab)) {
                Alert.alert(
                    "Aviso",
                    "Este documento não é exclusivo de externos.",
                );
                return;
            }
            const loginToken = await AsyncStorage.getItem("loginToken");
            const marcarRes = await fetch(
                `https://backend.advir.pt/api/parte-diaria/cabecalhos/${cab.DocumentoID}/integrar`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${loginToken}`,
                        "Content-Type": "application/json",
                    },
                },
            );
            if (marcarRes.ok) {
                Alert.alert(
                    "Sucesso",
                    "Parte aceite (só externos) — marcado como integrado.",
                );
                fetchCabecalhos();
            } else {
                Alert.Alert.alert(
                    "Erro",
                    "Não foi possível marcar como integrado.",
                );
            }
        } catch (err) {
            console.error("Erro ao aceitar só externos:", err);
            Alert.alert("Erro", "Erro inesperado ao aceitar (só externos).");
        } finally {
            setIntegrandoIds((prev) => {
                const s = new Set(prev);
                s.delete(cab.DocumentoID);
                return s;
            });
        }
    };

    const handleRejeitar = async (cab) => {
        try {
            console.log("⚠️ Rejeitar clicado para", cab?.DocumentoID);

            if (cab?.IntegradoERP) {
                Alert.alert(
                    "Não permitido",
                    "Esta parte já foi integrada e não pode ser rejeitada.",
                );
                return;
            }

            const ok = await confirm(
                "Rejeitar Parte",
                "Tens a certeza que queres rejeitar esta parte diária? Esta ação não pode ser anulada.",
            );
            if (!ok) return;

            const loginToken = await AsyncStorage.getItem("loginToken");
            if (!loginToken) throw new Error("Sem sessão válida.");

            const url = `https://backend.advir.pt/api/parte-diaria/cabecalhos/${encodeURIComponent(String(cab.DocumentoID))}`;
            console.log("DELETE ->", url);

            const resp = await fetch(url, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${loginToken}` },
            });
            const txt = await resp.text().catch(() => "");
            console.log("DELETE status", resp.status, "body:", txt);

            if (!resp.ok)
                throw new Error(
                    txt || `Falha ao rejeitar (HTTP ${resp.status})`,
                );

            setCabecalhos((prev) =>
                prev.filter(
                    (c) => String(c.DocumentoID) !== String(cab.DocumentoID),
                ),
            );
            if (selectedCabecalho?.DocumentoID === cab.DocumentoID) {
                setModalVisible(false);
                setSelectedCabecalho(null);
            }
            Alert.alert("Sucesso", "Parte rejeitada e removida.");
        } catch (e) {
            console.error("Erro a rejeitar:", e);
            Alert.alert("Erro", e.message || "Não foi possível rejeitar.");
        }
    };

    const handleIntegrarTudo = async () => {
        try {
            const partesPendentes = cabecalhosFiltrados.filter(
                (c) => !c.IntegradoERP,
            );

            if (partesPendentes.length === 0) {
                Alert.alert(
                    "Informação",
                    "Não há partes pendentes para integrar.",
                );
                return;
            }

            const ok = await confirm(
                "Integrar Todas as Partes",
                `Tens a certeza que queres integrar ${partesPendentes.length} parte(s) diária(s)? Esta ação irá enviar todas as partes pendentes para o Primavera.`,
            );
            if (!ok) return;

            let sucessos = 0;
            let falhas = 0;
            const erros = [];

            for (const cab of partesPendentes) {
                try {
                    const onlyExternos = hasOnlyExternos(cab);

                    if (onlyExternos) {
                        // Aceitar apenas externos
                        const loginToken =
                            await AsyncStorage.getItem("loginToken");
                        const marcarRes = await fetch(
                            `https://backend.advir.pt/api/parte-diaria/cabecalhos/${cab.DocumentoID}/integrar`,
                            {
                                method: "PUT",
                                headers: {
                                    Authorization: `Bearer ${loginToken}`,
                                    "Content-Type": "application/json",
                                },
                            },
                        );
                        if (marcarRes.ok) {
                            sucessos++;
                        } else {
                            falhas++;
                            erros.push(
                                `Parte ${cab.DocumentoID}: Falha ao aceitar`,
                            );
                        }
                    } else {
                        // Integrar normalmente (sem mostrar alerts individuais)
                        setIntegrandoIds((prev) =>
                            new Set(prev).add(cab.DocumentoID),
                        );

                        const token =
                            await AsyncStorage.getItem("painelAdminToken");
                        const urlempresa =
                            await AsyncStorage.getItem("urlempresa");
                        const loginToken =
                            await AsyncStorage.getItem("loginToken");

                        const dadosObra = await obterCodObra(cab.ObraID);
                        const codigoObra = dadosObra?.codigo;
                        const idObra = await obterIDObra(codigoObra);

                        const codFuncLocal =
                            await AsyncStorage.getItem("codFuncionario");
                        const colaboradorIdCab = codFuncLocal
                            ? await obterColaboradorID(codFuncLocal)
                            : null;

                        const primeiroItemColab = cab?.ParteDiariaItems?.find(
                            (i) => !isExternoItem(i),
                        )?.ColaboradorID;
                        const colaboradorIdItens = primeiroItemColab
                            ? await obterColaboradorID(primeiroItemColab)
                            : null;

                        const itens = cab.ParteDiariaItems || [];
                        const itensNaoExterno = itens.filter(
                            (it) => !isExternoItem(it),
                        );

                        const itensEquip = itensNaoExterno.filter(
                            (it) =>
                                String(it.Categoria || "").toLowerCase() ===
                                "equipamentos",
                        );
                        const itensOutros = itensNaoExterno.filter(
                            (it) =>
                                String(it.Categoria || "").toLowerCase() !==
                                "equipamentos",
                        );

                        const pedidos = [];
                        if (itensEquip.length > 0) {
                            pedidos.push({
                                url: "https://webapiprimavera.advir.pt/routesFaltas/InsertParteDiariaEquipamento",
                                payload: buildPayloadEquip({
                                    docId: DOC_ID_EQUIP,
                                    cab,
                                    itens: itensEquip,
                                    idObra,
                                }),
                            });
                        }
                        if (itensOutros.length > 0) {
                            pedidos.push({
                                url: "https://webapiprimavera.advir.pt/routesFaltas/InsertParteDiariaItem",
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

                        let integracaoOk = true;
                        for (const p of pedidos) {
                            const resp = await fetch(p.url, {
                                method: "PUT",
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    "Content-Type": "application/json",
                                    urlempresa,
                                },
                                body: JSON.stringify(p.payload),
                            });
                            if (!resp.ok) {
                                integracaoOk = false;
                                break;
                            }
                        }

                        if (integracaoOk) {
                            const marcarRes = await fetch(
                                `https://backend.advir.pt/api/parte-diaria/cabecalhos/${cab.DocumentoID}/integrar`,
                                {
                                    method: "PUT",
                                    headers: {
                                        Authorization: `Bearer ${loginToken}`,
                                        "Content-Type": "application/json",
                                    },
                                },
                            );
                            if (marcarRes.ok) {
                                sucessos++;
                            } else {
                                falhas++;
                                erros.push(
                                    `Parte ${cab.DocumentoID}: Falha ao marcar como integrada`,
                                );
                            }
                        } else {
                            falhas++;
                            erros.push(
                                `Parte ${cab.DocumentoID}: Falha ao integrar no Primavera`,
                            );
                        }

                        setIntegrandoIds((prev) => {
                            const s = new Set(prev);
                            s.delete(cab.DocumentoID);
                            return s;
                        });
                    }
                } catch (e) {
                    falhas++;
                    erros.push(`Parte ${cab.DocumentoID}: ${e.message}`);
                    setIntegrandoIds((prev) => {
                        const s = new Set(prev);
                        s.delete(cab.DocumentoID);
                        return s;
                    });
                }
            }

            await fetchCabecalhos();

            let mensagem = `${sucessos} parte(s) integrada(s) com sucesso.`;
            if (falhas > 0) {
                mensagem += `\n${falhas} parte(s) falharam.\n\n${erros.slice(0, 5).join("\n")}`;
                if (erros.length > 5)
                    mensagem += `\n... e mais ${erros.length - 5} erro(s).`;
            }

            Alert.alert(
                falhas > 0 ? "Integração Parcial" : "Sucesso",
                mensagem,
            );
        } catch (e) {
            console.error("Erro ao integrar tudo:", e);
            Alert.alert(
                "Erro",
                e.message || "Erro inesperado ao integrar todas as partes.",
            );
        }
    };

    const handleRejeitarTudo = async () => {
        try {
            const partesPendentes = cabecalhosFiltrados.filter(
                (c) => !c.IntegradoERP,
            );

            if (partesPendentes.length === 0) {
                Alert.alert(
                    "Informação",
                    "Não há partes pendentes para rejeitar.",
                );
                return;
            }

            const ok = await confirm(
                "Rejeitar Todas as Partes",
                `Tens a certeza que queres rejeitar ${partesPendentes.length} parte(s) diária(s)? Esta ação não pode ser anulada e todas as partes pendentes serão removidas.`,
            );
            if (!ok) return;

            const loginToken = await AsyncStorage.getItem("loginToken");
            if (!loginToken) throw new Error("Sem sessão válida.");

            let sucessos = 0;
            let falhas = 0;
            const erros = [];

            for (const cab of partesPendentes) {
                try {
                    const url = `https://backend.advir.pt/api/parte-diaria/cabecalhos/${encodeURIComponent(String(cab.DocumentoID))}`;
                    const resp = await fetch(url, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${loginToken}` },
                    });

                    if (resp.ok) {
                        sucessos++;
                    } else {
                        falhas++;
                        erros.push(
                            `Parte ${cab.DocumentoID}: HTTP ${resp.status}`,
                        );
                    }
                } catch (e) {
                    falhas++;
                    erros.push(`Parte ${cab.DocumentoID}: ${e.message}`);
                }
            }

            await fetchCabecalhos();
            if (selectedCabecalho) {
                setModalVisible(false);
                setSelectedCabecalho(null);
            }

            let mensagem = `${sucessos} parte(s) rejeitada(s) com sucesso.`;
            if (falhas > 0) {
                mensagem += `\n${falhas} parte(s) falharam.\n\n${erros.slice(0, 5).join("\n")}`;
                if (erros.length > 5)
                    mensagem += `\n... e mais ${erros.length - 5} erro(s).`;
            }

            Alert.alert(falhas > 0 ? "Rejeição Parcial" : "Sucesso", mensagem);
        } catch (e) {
            console.error("Erro ao rejeitar tudo:", e);
            Alert.alert(
                "Erro",
                e.message || "Erro inesperado ao rejeitar todas as partes.",
            );
        }
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

    const getStatusColor = (integrado) => (integrado ? "#28a745" : "#ffc107");
    const getStatusIcon = (integrado) =>
        integrado ? "checkmark-circle" : "time";

    const renderItem = ({ item }) => {
        const isIntegrando = integrandoIds.has(item.DocumentoID);
        const { pes, eq, ext } = contarPorCategoria(item?.ParteDiariaItems);
        const onlyExternos = hasOnlyExternos(item);

        return (
            <View style={styles.card}>
                <TouchableOpacity
                    onPress={() => abrirDetalhes(item)}
                    style={styles.cardContent}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.titleContainer}>
                            <Ionicons
                                name="document-text"
                                size={20}
                                color="#1792FE"
                            />
                            <Text style={styles.cardTitle}>Parte Diária</Text>
                        </View>
                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: getStatusColor(
                                        item.IntegradoERP,
                                    ),
                                },
                            ]}
                        >
                            <Ionicons
                                name={getStatusIcon(item.IntegradoERP)}
                                size={12}
                                color="#fff"
                                style={styles.statusIcon}
                            />
                            <Text style={styles.statusText}>
                                {item.IntegradoERP ? "Integrado" : "Pendente"}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.cardBody}>
                        <View style={styles.infoRow}>
                            <Ionicons name="person" size={16} color="#666" />
                            <Text style={styles.cardText}>
                                Registado por:{" "}
                                {item.CriadoPor || item.Utilizador}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="business" size={16} color="#666" />
                            <Text style={styles.cardText}>
                                {obrasMap[String(item.ObraID)]
                                    ? `${obrasMap[String(item.ObraID)].codigo} — ${obrasMap[String(item.ObraID)].descricao}`
                                    : item.ObraID || "Obra não definida"}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="calendar" size={16} color="#666" />
                            <Text style={styles.cardText}>
                                Data do Registo:{" "}
                                {new Date(item.Data).toLocaleDateString(
                                    "pt-PT",
                                )}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="list" size={16} color="#666" />
                            <Text style={styles.cardText}>
                                Itens: {item.ParteDiariaItems?.length || 0}
                            </Text>
                            <View
                                style={[styles.infoRow, { flexWrap: "wrap" }]}
                            >
                                {pes > 0 && (
                                    <View
                                        style={[
                                            styles.categoriaChip,
                                            {
                                                backgroundColor:
                                                    getCategoriaChip("pessoal")
                                                        .bg,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name="people"
                                            size={12}
                                            color="#fff"
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={styles.categoriaChipText}>
                                            Pessoal: {pes}
                                        </Text>
                                    </View>
                                )}
                                {eq > 0 && (
                                    <View
                                        style={[
                                            styles.categoriaChip,
                                            {
                                                backgroundColor:
                                                    getCategoriaChip(
                                                        "equipamentos",
                                                    ).bg,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name="construct"
                                            size={12}
                                            color="#fff"
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={styles.categoriaChipText}>
                                            Equipamentos: {eq}
                                        </Text>
                                    </View>
                                )}
                                {ext > 0 && (
                                    <View
                                        style={[
                                            styles.categoriaChip,
                                            { backgroundColor: "#fd7e14" },
                                        ]}
                                    >
                                        <Ionicons
                                            name="warning"
                                            size={12}
                                            color="#fff"
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={styles.categoriaChipText}>
                                            Externos: {ext}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {onlyExternos && (
                            <View
                                style={{
                                    marginTop: 6,
                                    flexDirection: "row",
                                    alignItems: "center",
                                }}
                            >
                                <Ionicons
                                    name="information-circle"
                                    size={16}
                                    color="#fd7e14"
                                    style={{ marginRight: 6 }}
                                />
                                <Text
                                    style={{
                                        color: "#fd7e14",
                                        fontWeight: "600",
                                    }}
                                >
                                    Apenas EXTERNOS — não será enviado para o
                                    Primavera.
                                </Text>
                            </View>
                        )}

                        {/* Prévia dos Itens */}
                        {item.ParteDiariaItems &&
                            item.ParteDiariaItems.length > 0 && (
                                <View style={styles.itemsPreviewContainer}>
                                    <View style={styles.itemsPreviewHeader}>
                                        <Ionicons
                                            name="list-outline"
                                            size={16}
                                            color="#1792FE"
                                        />
                                        <Text style={styles.itemsPreviewTitle}>
                                            Itens da Parte Diária
                                        </Text>
                                    </View>
                                    {item.ParteDiariaItems.slice(0, 3).map(
                                        (itemDetail, index) => {
                                            const externo =
                                                isExternoItem(itemDetail);
                                            const isEquipamento =
                                                String(
                                                    itemDetail.Categoria || "",
                                                ).toLowerCase() ===
                                                "equipamentos";
                                            return (
                                                <View
                                                    key={`${String(itemDetail.ComponenteID)}-${index}`}
                                                    style={
                                                        styles.itemPreviewCard
                                                    }
                                                >
                                                    <View
                                                        style={
                                                            styles.itemPreviewHeader
                                                        }
                                                    >
                                                        <View
                                                            style={[
                                                                styles.itemTypeBadgeSmall,
                                                                {
                                                                    backgroundColor:
                                                                        isEquipamento
                                                                            ? "#6f42c1"
                                                                            : "#17a2b8",
                                                                },
                                                            ]}
                                                        >
                                                            <Ionicons
                                                                name={
                                                                    isEquipamento
                                                                        ? "construct"
                                                                        : "people"
                                                                }
                                                                size={10}
                                                                color="#fff"
                                                            />
                                                        </View>
                                                        <Text
                                                            style={
                                                                styles.itemPreviewType
                                                            }
                                                        >
                                                            {isEquipamento
                                                                ? "Equipamento"
                                                                : "Pessoal"}
                                                        </Text>
                                                        {externo && (
                                                            <View
                                                                style={[
                                                                    styles.itemTypeBadgeSmall,
                                                                    {
                                                                        backgroundColor:
                                                                            "#fd7e14",
                                                                    },
                                                                ]}
                                                            >
                                                                <Text
                                                                    style={
                                                                        styles.itemTypeBadgeSmallText
                                                                    }
                                                                >
                                                                    EXT
                                                                </Text>
                                                            </View>
                                                        )}
                                                        <TouchableOpacity
                                                            onPress={() =>
                                                                abrirEdicaoItem(
                                                                    itemDetail,
                                                                    item,
                                                                    index,
                                                                )
                                                            }
                                                            style={
                                                                styles.itemPreviewEditButton
                                                            }
                                                        >
                                                            <Ionicons
                                                                name="create-outline"
                                                                size={14}
                                                                color="#1792FE"
                                                            />
                                                            <Text
                                                                style={
                                                                    styles.itemPreviewEditText
                                                                }
                                                            >
                                                                Editar
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                    <View
                                                        style={
                                                            styles.itemPreviewContent
                                                        }
                                                    >
                                                        <View
                                                            style={
                                                                styles.itemPreviewRow
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.itemPreviewLabel
                                                                }
                                                            >
                                                                <b>Nome:</b>{" "}
                                                                {externo
                                                                    ? itemDetail.Funcionario ||
                                                                      "Trabalhador Externo"
                                                                    : cacheNomes[
                                                                          itemDetail
                                                                              .ColaboradorID
                                                                      ] ||
                                                                      itemDetail.ColaboradorID ||
                                                                      "N/A"}
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={
                                                                styles.itemPreviewRow
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.itemPreviewLabel
                                                                }
                                                            >
                                                                {isEquipamento ? (
                                                                    <b>
                                                                        Equipamento:
                                                                    </b>
                                                                ) : (
                                                                    <b>
                                                                        Especialidade:
                                                                    </b>
                                                                )}{" "}
                                                                {isEquipamento
                                                                    ? equipamentosMap[
                                                                          String(
                                                                              itemDetail.ComponenteID,
                                                                          )
                                                                      ] ||
                                                                      equipamentosMap[
                                                                          String(
                                                                              itemDetail.SubEmpID,
                                                                          )
                                                                      ] ||
                                                                      itemDetail.ComponenteID ||
                                                                      itemDetail.SubEmpID ||
                                                                      "N/A"
                                                                    : especialidadesMap[
                                                                          String(
                                                                              itemDetail.SubEmpID,
                                                                          )
                                                                      ] ||
                                                                      itemDetail.SubEmpID ||
                                                                      "N/A"}
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={
                                                                styles.itemPreviewRow
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.itemPreviewLabel
                                                                }
                                                            >
                                                                <b>Classe:</b>{" "}
                                                                {getClasseNomeById(
                                                                    itemDetail.ClasseID ??
                                                                        itemDetail.ClasseId ??
                                                                        itemDetail.classeID ??
                                                                        itemDetail.classeId ??
                                                                        itemDetail.Classe ??
                                                                        null,
                                                                )}
                                                            </Text>
                                                        </View>

                                                        <View
                                                            style={
                                                                styles.itemPreviewRow
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.itemPreviewLabel
                                                                }
                                                            >
                                                                <b>Horas:</b>{" "}
                                                                {formatarHoras(
                                                                    itemDetail.NumHoras ||
                                                                        0,
                                                                )}
                                                            </Text>
                                                            <View
                                                                style={
                                                                    styles.itemPreviewHorasContainer
                                                                }
                                                            >
                                                                {itemDetail.TipoHoraID && (
                                                                    <View
                                                                        style={
                                                                            styles.horaExtraBadge
                                                                        }
                                                                    >
                                                                        <Ionicons
                                                                            name="flash"
                                                                            size={
                                                                                10
                                                                            }
                                                                            color="#fff"
                                                                        />
                                                                        <Text
                                                                            style={
                                                                                styles.horaExtraText
                                                                            }
                                                                        >
                                                                            Extra
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        },
                                    )}
                                    {item.ParteDiariaItems.length > 3 && (
                                        <View style={styles.moreItemsIndicator}>
                                            <Text style={styles.moreItemsText}>
                                                +
                                                {item.ParteDiariaItems.length -
                                                    3}{" "}
                                                item(s) adicional(is)
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                    </View>

                    <TouchableOpacity
                        style={styles.viewDetailsButton}
                        onPress={() => abrirDetalhes(item)}
                    >
                        <Text style={styles.viewDetailsText}>Ver Detalhes</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="#1792FE"
                        />
                    </TouchableOpacity>
                </TouchableOpacity>

                {!item.IntegradoERP && (
                    <View style={styles.buttonContainer}>
                        {onlyExternos ? (
                            // BOTÃO ACEITAR (só externos)
                            <TouchableOpacity
                                style={[
                                    styles.integrarButton,
                                    isIntegrando && styles.buttonDisabled,
                                ]}
                                onPress={() =>
                                    handleAceitarSomenteExternos(item)
                                }
                                disabled={isIntegrando}
                            >
                                <LinearGradient
                                    colors={["#28a745", "#20c997"]}
                                    style={styles.buttonGradient}
                                >
                                    {isIntegrando ? (
                                        <ActivityIndicator
                                            size="small"
                                            color="#fff"
                                        />
                                    ) : (
                                        <Ionicons
                                            name="checkmark-done"
                                            size={16}
                                            color="#fff"
                                        />
                                    )}
                                    <Text style={styles.buttonText}>
                                        {isIntegrando
                                            ? "A aceitar..."
                                            : "Aceitar"}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            // BOTÃO INTEGRAR (envia internos, ignora externos)
                            <TouchableOpacity
                                style={[
                                    styles.integrarButton,
                                    isIntegrando && styles.buttonDisabled,
                                ]}
                                onPress={() => handleIntegrar(item)}
                                disabled={isIntegrando}
                            >
                                <LinearGradient
                                    colors={
                                        isIntegrando
                                            ? ["#ccc", "#999"]
                                            : ["#1792FE", "#0B5ED7"]
                                    }
                                    style={styles.buttonGradient}
                                >
                                    {isIntegrando ? (
                                        <ActivityIndicator
                                            size="small"
                                            color="#fff"
                                        />
                                    ) : (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={16}
                                            color="#fff"
                                        />
                                    )}
                                    <Text style={styles.buttonText}>
                                        {isIntegrando
                                            ? "Integrando..."
                                            : "Integrar"}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.rejeitarButton}
                            onPress={() => handleRejeitar(item)}
                        >
                            <LinearGradient
                                colors={["#1792FE", "#0B5ED7"]}
                                style={styles.buttonGradient}
                            >
                                <Ionicons
                                    name="close-circle"
                                    size={16}
                                    color="#fff"
                                />
                                <Text style={styles.buttonText}>Rejeitar</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (loading)
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1792FE" />
                <Text style={styles.loadingText}>{loadingMessage}</Text>
                <View style={{
                    width: '80%',
                    height: 8,
                    backgroundColor: '#e0e0e0',
                    borderRadius: 4,
                    marginTop: 20,
                    overflow: 'hidden'
                }}>
                    <View style={{
                        width: `${loadingPercentage}%`,
                        height: '100%',
                        backgroundColor: '#1792FE',
                        borderRadius: 4,
                        transition: 'width 0.3s ease'
                    }} />
                </View>
                <Text style={[styles.loadingText, { marginTop: 10, fontSize: 14 }]}>
                    {loadingPercentage}%
                </Text>
            </View>
        );

    if (error)
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={64} color="#dc3545" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    onPress={fetchCabecalhos}
                    style={styles.retryButton}
                >
                    <LinearGradient
                        colors={["#1792FE", "#0B5ED7"]}
                        style={styles.buttonGradient}
                    >
                        <Ionicons name="refresh" size={16} color="#fff" />
                        <Text style={styles.retryText}>Tentar Novamente</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );

    return (
        <LinearGradient
            colors={["#e3f2fd", "#bbdefb", "#90caf9"]}
            style={{ flex: 1 }}
        >
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={["#1792FE", "#0B5ED7"]}
                    style={styles.header}
                >
                    <Text style={styles.headerTitle}>
                        Gestão de Partes Diárias
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {cabecalhosFiltrados.length}{" "}
                        {cabecalhosFiltrados.length === 1 ? "parte" : "partes"}{" "}
                        das suas obras
                    </Text>
                </LinearGradient>

                <View style={styles.filtroContainer}>
                    {["pendentes", "integrados"].map((opcao) => (
                        <TouchableOpacity
                            key={opcao}
                            style={[
                                styles.filtroBotao,
                                filtroEstado === opcao &&
                                    styles.filtroBotaoAtivo,
                            ]}
                            onPress={() => setFiltroEstado(opcao)}
                        >
                            <Text
                                style={
                                    filtroEstado === opcao
                                        ? styles.filtroTextoAtivo
                                        : styles.filtroTexto
                                }
                            >
                                {opcao === "pendentes"
                                    ? "Pendentes"
                                    : "Integrados"}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {filtroEstado === "pendentes" &&
                    cabecalhosFiltrados.length > 0 && (
                        <View style={styles.botoesAcoesGlobaisContainer}>
                            <TouchableOpacity
                                style={styles.botaoIntegrarTudo}
                                onPress={handleIntegrarTudo}
                            >
                                <LinearGradient
                                    colors={["#1792FE", "#1792FE"]}
                                    style={styles.buttonGradient}
                                >
                                    <Ionicons
                                        name="checkmark-done-circle"
                                        size={18}
                                        color="#fff"
                                    />
                                    <Text style={styles.buttonText}>
                                        Integrar Tudo
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.botaoRejeitarTudo}
                                onPress={handleRejeitarTudo}
                            >
                                <LinearGradient
                                    colors={["#1792FE", "#1792FE"]}
                                    style={styles.buttonGradient}
                                >
                                    <Ionicons
                                        name="close-circle"
                                        size={18}
                                        color="#fff"
                                    />
                                    <Text style={styles.buttonText}>
                                        Rejeitar Tudo
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                <FlatList
                    data={cabecalhosFiltrados}
                    keyExtractor={(item) => String(item.DocumentoID)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={["#1792FE"]}
                        />
                    }
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Ionicons
                                name="calendar-clear"
                                size={80}
                                color="#ccc"
                            />
                            <Text style={styles.emptyTitle}>
                                Nenhuma parte diária encontrada
                            </Text>
                            <Text style={styles.emptyText}>
                                {filtroEstado === "pendentes"
                                    ? "Não há partes pendentes das suas obras no momento."
                                    : filtroEstado === "integrados"
                                      ? "Não há partes integradas das suas obras ainda."
                                      : "Não há partes diárias registadas para as suas obras."}
                            </Text>
                        </View>
                    )}
                />

                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    onRequestClose={fecharModal}
                >
                    <SafeAreaView style={styles.modalContainer}>
                        {/* Header do Modal */}
                        <LinearGradient
                            colors={["#1792FE", "#0B5ED7"]}
                            style={styles.modalHeader}
                        >
                            <View style={styles.modalHeaderContent}>
                                <Text style={styles.modalTitle}>
                                    Detalhes da Parte Diária
                                </Text>
                                <TouchableOpacity
                                    onPress={fecharModal}
                                    style={styles.closeButton}
                                >
                                    <Ionicons
                                        name="close"
                                        size={26}
                                        color="#fff"
                                    />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>

                        <ScrollView
                            contentContainerStyle={styles.modalBody}
                            showsVerticalScrollIndicator={false}
                        >
                            {selectedCabecalho && (
                                <>
                                    {/* Informações Principais */}
                                    <View style={styles.modalInfoCard}>
                                        <Text style={styles.modalSectionTitle}>
                                            Informações Gerais
                                        </Text>

                                        <View style={styles.modalInfoGrid}>
                                            <View style={styles.modalInfoItem}>
                                                <View
                                                    style={
                                                        styles.modalInfoIconContainer
                                                    }
                                                >
                                                    <Ionicons
                                                        name="person-circle"
                                                        size={24}
                                                        color="#1792FE"
                                                    />
                                                </View>
                                                <View
                                                    style={
                                                        styles.modalInfoContent
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.modalInfoLabel
                                                        }
                                                    >
                                                        Registado por
                                                    </Text>
                                                    <Text
                                                        style={
                                                            styles.modalInfoValue
                                                        }
                                                    >
                                                        {selectedCabecalho.CriadoPor ||
                                                            selectedCabecalho.Utilizador}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.modalInfoItem}>
                                                <View
                                                    style={
                                                        styles.modalInfoIconContainer
                                                    }
                                                >
                                                    <Ionicons
                                                        name="calendar-outline"
                                                        size={24}
                                                        color="#1792FE"
                                                    />
                                                </View>
                                                <View
                                                    style={
                                                        styles.modalInfoContent
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.modalInfoLabel
                                                        }
                                                    >
                                                        Data do registo
                                                    </Text>
                                                    <Text
                                                        style={
                                                            styles.modalInfoValue
                                                        }
                                                    >
                                                        {new Date(
                                                            selectedCabecalho.Data,
                                                        ).toLocaleDateString(
                                                            "pt-PT",
                                                            {
                                                                weekday: "long",
                                                                year: "numeric",
                                                                month: "long",
                                                                day: "numeric",
                                                            },
                                                        )}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.modalInfoItem}>
                                                <View
                                                    style={
                                                        styles.modalInfoIconContainer
                                                    }
                                                >
                                                    <Ionicons
                                                        name="business-outline"
                                                        size={24}
                                                        color="#1792FE"
                                                    />
                                                </View>
                                                <View
                                                    style={
                                                        styles.modalInfoContent
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.modalInfoLabel
                                                        }
                                                    >
                                                        Obra
                                                    </Text>
                                                    <Text
                                                        style={
                                                            styles.modalInfoValue
                                                        }
                                                    >
                                                        {obrasMap[
                                                            String(
                                                                selectedCabecalho.ObraID,
                                                            )
                                                        ]
                                                            ? `${obrasMap[String(selectedCabecalho.ObraID)].codigo} — ${obrasMap[String(selectedCabecalho.ObraID)].descricao}`
                                                            : selectedCabecalho.ObraID}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.modalInfoItem}>
                                                <View
                                                    style={
                                                        styles.modalInfoIconContainer
                                                    }
                                                >
                                                    <Ionicons
                                                        name={getStatusIcon(
                                                            selectedCabecalho.IntegradoERP,
                                                        )}
                                                        size={24}
                                                        color={getStatusColor(
                                                            selectedCabecalho.IntegradoERP,
                                                        )}
                                                    />
                                                </View>
                                                <View
                                                    style={
                                                        styles.modalInfoContent
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.modalInfoLabel
                                                        }
                                                    >
                                                        Estado
                                                    </Text>
                                                    <View
                                                        style={[
                                                            styles.statusBadgeModal,
                                                            {
                                                                backgroundColor:
                                                                    getStatusColor(
                                                                        selectedCabecalho.IntegradoERP,
                                                                    ),
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={
                                                                styles.statusTextModal
                                                            }
                                                        >
                                                            {selectedCabecalho.IntegradoERP
                                                                ? "Integrado"
                                                                : "Pendente"}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Resumo dos Itens */}
                                    <View style={styles.modalSummaryCard}>
                                        <Text style={styles.modalSectionTitle}>
                                            Resumo
                                        </Text>
                                        <View style={styles.summaryGrid}>
                                            {(() => {
                                                const { pes, eq, ext } =
                                                    contarPorCategoria(
                                                        selectedCabecalho?.ParteDiariaItems,
                                                    );
                                                const totalHoras =
                                                    selectedCabecalho?.ParteDiariaItems?.reduce(
                                                        (acc, item) =>
                                                            acc +
                                                            (item.NumHoras ||
                                                                0),
                                                        0,
                                                    ) || 0;
                                                return (
                                                    <>
                                                        <View
                                                            style={
                                                                styles.summaryItem
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.summaryValue
                                                                }
                                                            >
                                                                {selectedCabecalho
                                                                    .ParteDiariaItems
                                                                    ?.length ||
                                                                    0}
                                                            </Text>
                                                            <Text
                                                                style={
                                                                    styles.summaryLabel
                                                                }
                                                            >
                                                                Total Itens
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={
                                                                styles.summaryItem
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.summaryValue
                                                                }
                                                            >
                                                                {formatarHoras(
                                                                    totalHoras,
                                                                )}
                                                            </Text>
                                                            <Text
                                                                style={
                                                                    styles.summaryLabel
                                                                }
                                                            >
                                                                Total Horas
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={
                                                                styles.summaryItem
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.summaryValue
                                                                }
                                                            >
                                                                {pes}
                                                            </Text>
                                                            <Text
                                                                style={
                                                                    styles.summaryLabel
                                                                }
                                                            >
                                                                Pessoal
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={
                                                                styles.summaryItem
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.summaryValue
                                                                }
                                                            >
                                                                {eq}
                                                            </Text>
                                                            <Text
                                                                style={
                                                                    styles.summaryLabel
                                                                }
                                                            >
                                                                Equipamentos
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={
                                                                styles.summaryItem
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.summaryValue
                                                                }
                                                            >
                                                                {ext}
                                                            </Text>
                                                            <Text
                                                                style={
                                                                    styles.summaryLabel
                                                                }
                                                            >
                                                                Externos
                                                            </Text>
                                                        </View>
                                                    </>
                                                );
                                            })()}
                                        </View>
                                    </View>

                                    {/* Lista de Itens */}
                                    <View style={styles.modalItemsSection}>
                                        <Text style={styles.modalSectionTitle}>
                                            Itens da Parte Diária
                                        </Text>
                                        {selectedCabecalho.ParteDiariaItems
                                            ?.length > 0 ? (
                                            selectedCabecalho.ParteDiariaItems.map(
                                                (item, index) => {
                                                    const externo =
                                                        isExternoItem(item);
                                                    const isEquipamento =
                                                        String(
                                                            item.Categoria ||
                                                                "",
                                                        ).toLowerCase() ===
                                                        "equipamentos";
                                                    return (
                                                        <View
                                                            key={`${String(item.ComponenteID)}-${index}`}
                                                            style={
                                                                styles.modernItemCard
                                                            }
                                                        >
                                                            {/* Header do Item */}
                                                            <View
                                                                style={
                                                                    styles.modernItemHeader
                                                                }
                                                            >
                                                                <View
                                                                    style={
                                                                        styles.itemHeaderLeft
                                                                    }
                                                                >
                                                                    <View
                                                                        style={[
                                                                            styles.itemTypeBadge,
                                                                            {
                                                                                backgroundColor:
                                                                                    isEquipamento
                                                                                        ? "#6f42c1"
                                                                                        : "#17a2b8",
                                                                            },
                                                                        ]}
                                                                    >
                                                                        <Ionicons
                                                                            name={
                                                                                isEquipamento
                                                                                    ? "construct"
                                                                                    : "people"
                                                                            }
                                                                            size={
                                                                                12
                                                                            }
                                                                            color="#fff"
                                                                        />
                                                                        <Text
                                                                            style={
                                                                                styles.itemTypeBadgeText
                                                                            }
                                                                        >
                                                                            {isEquipamento
                                                                                ? "EQUIP"
                                                                                : "PESSOAL"}
                                                                        </Text>
                                                                    </View>
                                                                    <Text
                                                                        style={
                                                                            styles.modernItemNumber
                                                                        }
                                                                    >
                                                                        Item{" "}
                                                                        {index +
                                                                            1}
                                                                    </Text>
                                                                </View>

                                                                <TouchableOpacity
                                                                    onPress={() =>
                                                                        abrirEdicaoItem(
                                                                            item,
                                                                            selectedCabecalho,
                                                                            index,
                                                                        )
                                                                    }
                                                                    style={
                                                                        styles.editButton
                                                                    }
                                                                >
                                                                    <Ionicons
                                                                        name="create-outline"
                                                                        size={
                                                                            18
                                                                        }
                                                                        color="#1792FE"
                                                                    />
                                                                    <Text
                                                                        style={
                                                                            styles.editButtonText
                                                                        }
                                                                    >
                                                                        Editar
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            </View>

                                                            {/* Conteúdo do Item */}
                                                            <View
                                                                style={
                                                                    styles.modernItemContent
                                                                }
                                                            >
                                                                <View
                                                                    style={
                                                                        styles.itemDetailRow
                                                                    }
                                                                >
                                                                    <View
                                                                        style={
                                                                            styles.itemDetailColumn
                                                                        }
                                                                    >
                                                                        <Text
                                                                            style={
                                                                                styles.itemDetailLabel
                                                                            }
                                                                        >
                                                                            Data
                                                                        </Text>
                                                                        <Text
                                                                            style={
                                                                                styles.itemDetailValue
                                                                            }
                                                                        >
                                                                            {new Date(
                                                                                item.Data,
                                                                            ).toLocaleDateString(
                                                                                "pt-PT",
                                                                            )}
                                                                        </Text>
                                                                    </View>
                                                                    <View
                                                                        style={
                                                                            styles.itemDetailColumn
                                                                        }
                                                                    >
                                                                        <Text
                                                                            style={
                                                                                styles.itemDetailLabel
                                                                            }
                                                                        >
                                                                            Horas
                                                                        </Text>
                                                                        <View
                                                                            style={
                                                                                styles.horasContainer
                                                                            }
                                                                        >
                                                                            <Ionicons
                                                                                name="time-outline"
                                                                                size={
                                                                                    16
                                                                                }
                                                                                color="#1792FE"
                                                                            />
                                                                            <Text
                                                                                style={
                                                                                    styles.horasValue
                                                                                }
                                                                            >
                                                                                {formatarHoras(
                                                                                    item.NumHoras,
                                                                                )}
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                </View>

                                                                <View
                                                                    style={
                                                                        styles.itemDetailFull
                                                                    }
                                                                >
                                                                    <Text
                                                                        style={
                                                                            styles.itemDetailLabel
                                                                        }
                                                                    >
                                                                        {externo
                                                                            ? "Colaborador (Externo)"
                                                                            : "Colaborador"}
                                                                    </Text>
                                                                    <Text
                                                                        style={[
                                                                            styles.itemDetailValue,
                                                                            externo && {
                                                                                color: "#fd7e14",
                                                                                fontWeight:
                                                                                    "600",
                                                                            },
                                                                        ]}
                                                                    >
                                                                        {externo
                                                                            ? item.Funcionario ||
                                                                              "Trabalhador Externo"
                                                                            : cacheNomes[
                                                                                  item
                                                                                      .ColaboradorID
                                                                              ] ||
                                                                              item.ColaboradorID}
                                                                    </Text>
                                                                </View>

                                                                <View
                                                                    style={
                                                                        styles.itemDetailFull
                                                                    }
                                                                >
                                                                    <Text
                                                                        style={
                                                                            styles.itemDetailLabel
                                                                        }
                                                                    >
                                                                        {isEquipamento
                                                                            ? "Equipamento"
                                                                            : "Especialidade"}
                                                                    </Text>
                                                                    <Text
                                                                        style={
                                                                            styles.itemDetailValue
                                                                        }
                                                                    >
                                                                        {isEquipamento
                                                                            ? equipamentosMap[
                                                                                  String(
                                                                                      item.ComponenteID,
                                                                                  )
                                                                              ] ||
                                                                              equipamentosMap[
                                                                                  String(
                                                                                      item.SubEmpID,
                                                                                  )
                                                                              ] ||
                                                                              item.ComponenteID ||
                                                                              item.SubEmpID
                                                                            : especialidadesMap[
                                                                                  String(
                                                                                      item.SubEmpID,
                                                                                  )
                                                                              ] ||
                                                                              item.SubEmpID}
                                                                    </Text>
                                                                </View>

                                                                {/* Exibição da Classe */}
                                                                <View
                                                                    style={
                                                                        styles.itemDetailFull
                                                                    }
                                                                >
                                                                    <Text
                                                                        style={
                                                                            styles.itemDetailLabel
                                                                        }
                                                                    >
                                                                        Classe
                                                                    </Text>
                                                                    <Text
                                                                        style={
                                                                            styles.itemDetailValue
                                                                        }
                                                                    >
                                                                        {getClasseNomeById(
                                                                            item.ClasseID,
                                                                        )}
                                                                    </Text>
                                                                </View>

                                                                {/* Status do Item */}
                                                                <View
                                                                    style={
                                                                        styles.itemStatusContainer
                                                                    }
                                                                >
                                                                    <View
                                                                        style={[
                                                                            styles.itemStatusBadge,
                                                                            {
                                                                                backgroundColor:
                                                                                    externo
                                                                                        ? "#fd7e14"
                                                                                        : "#28a745",
                                                                            },
                                                                        ]}
                                                                    >
                                                                        <Ionicons
                                                                            name={
                                                                                externo
                                                                                    ? "warning-outline"
                                                                                    : "checkmark-circle-outline"
                                                                            }
                                                                            size={
                                                                                14
                                                                            }
                                                                            color="#fff"
                                                                        />
                                                                        <Text
                                                                            style={
                                                                                styles.itemStatusText
                                                                            }
                                                                        >
                                                                            {externo
                                                                                ? "Externo"
                                                                                : "Interno"}
                                                                        </Text>
                                                                    </View>
                                                                    {item.TipoHoraID && (
                                                                        <View
                                                                            style={[
                                                                                styles.itemStatusBadge,
                                                                                {
                                                                                    backgroundColor:
                                                                                        "#dc3545",
                                                                                },
                                                                            ]}
                                                                        >
                                                                            <Ionicons
                                                                                name="flash-outline"
                                                                                size={
                                                                                    14
                                                                                }
                                                                                color="#fff"
                                                                            />
                                                                            <Text
                                                                                style={
                                                                                    styles.itemStatusText
                                                                                }
                                                                            >
                                                                                Hora
                                                                                Extra
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        </View>
                                                    );
                                                },
                                            )
                                        ) : (
                                            <View
                                                style={
                                                    styles.emptyItemsContainer
                                                }
                                            >
                                                <Ionicons
                                                    name="document-outline"
                                                    size={48}
                                                    color="#ccc"
                                                />
                                                <Text
                                                    style={
                                                        styles.emptyItemsText
                                                    }
                                                >
                                                    Sem itens registados
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.emptyItemsSubtext
                                                    }
                                                >
                                                    Esta parte diária não contém
                                                    itens.
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </SafeAreaView>
                </Modal>
                <Modal
                    visible={editItemModalVisible}
                    animationType="slide"
                    onRequestClose={() => setEditItemModalVisible(false)}
                    transparent
                >
                    <View style={styles.editModalOverlay}>
                        <View style={styles.editModalContainer}>
                            {/* Header com gradiente */}
                            <LinearGradient
                                colors={["#1792FE", "#0B5ED7"]}
                                style={styles.editModalHeader}
                            >
                                <View style={styles.editModalHeaderContent}>
                                    <View
                                        style={styles.editModalTitleContainer}
                                    >
                                        <Ionicons
                                            name="create-outline"
                                            size={24}
                                            color="#fff"
                                        />
                                        <Text style={styles.editModalTitle}>
                                            Editar Item da Parte Diária
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() =>
                                            setEditItemModalVisible(false)
                                        }
                                        style={styles.editModalCloseButton}
                                    >
                                        <Ionicons
                                            name="close"
                                            size={26}
                                            color="#fff"
                                        />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.editModalSubtitle}>
                                    Modifique os dados do item selecionado
                                </Text>
                            </LinearGradient>

                            <ScrollView
                                style={styles.editModalBody}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 30 }}
                            >
                                {/* Card de informação da data */}
                                <View style={styles.editInfoCard}>
                                    <View style={styles.editInfoHeader}>
                                        <Ionicons
                                            name="calendar-outline"
                                            size={20}
                                            color="#1792FE"
                                        />
                                        <Text style={styles.editInfoTitle}>
                                            Data do Registo
                                        </Text>
                                    </View>
                                    <View style={styles.editDateContainer}>
                                        <Text style={styles.editDateValue}>
                                            {new Date(
                                                editItem.dataISO,
                                            ).toLocaleDateString("pt-PT", {
                                                weekday: "long",
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </Text>
                                    </View>
                                </View>

                                {/* Card de seleção de obra */}
                                <View style={styles.editCard}>
                                    <View style={styles.editCardHeader}>
                                        <Ionicons
                                            name="business-outline"
                                            size={20}
                                            color="#1792FE"
                                        />
                                        <Text style={styles.editCardTitle}>
                                            Obra
                                        </Text>
                                    </View>
                                    <View style={styles.editPickerContainer}>
                                        <Picker
                                            selectedValue={editItem.obraId}
                                            onValueChange={(v) =>
                                                setEditItem((s) => ({
                                                    ...s,
                                                    obraId: v,
                                                }))
                                            }
                                            style={styles.editPicker}
                                        >
                                            {Object.entries(obrasMap).map(
                                                ([id, meta]) => (
                                                    <Picker.Item
                                                        key={id}
                                                        label={`${meta.codigo} — ${meta.descricao}`}
                                                        value={Number(id)}
                                                    />
                                                ),
                                            )}
                                        </Picker>
                                    </View>
                                </View>

                                {/* Card de categoria */}
                                <View style={styles.editCard}>
                                    <View style={styles.editCardHeader}>
                                        <Ionicons
                                            name="list-outline"
                                            size={20}
                                            color="#1792FE"
                                        />
                                        <Text style={styles.editCardTitle}>
                                            Categoria
                                        </Text>
                                    </View>
                                    <View style={styles.editCategoryContainer}>
                                        {[
                                            {
                                                label: "Mão de Obra",
                                                value: "MaoObra",
                                                icon: "people-outline",
                                            },
                                            {
                                                label: "Equipamentos",
                                                value: "Equipamentos",
                                                icon: "construct-outline",
                                            },
                                        ].map((opt) => (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[
                                                    styles.editCategoryOption,
                                                    editItem.categoria ===
                                                        opt.value &&
                                                        styles.editCategoryOptionSelected,
                                                ]}
                                                onPress={() =>
                                                    setEditItem((s) => ({
                                                        ...s,
                                                        categoria: opt.value,
                                                        especialidadeCodigo: "",
                                                        subEmpId: null,
                                                    }))
                                                }
                                            >
                                                <Ionicons
                                                    name={opt.icon}
                                                    size={20}
                                                    color={
                                                        editItem.categoria ===
                                                        opt.value
                                                            ? "#fff"
                                                            : "#1792FE"
                                                    }
                                                />
                                                <Text
                                                    style={[
                                                        styles.editCategoryOptionText,
                                                        editItem.categoria ===
                                                            opt.value &&
                                                            styles.editCategoryOptionTextSelected,
                                                    ]}
                                                >
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Card de especialidade/equipamento */}
                                <View style={styles.editCard}>
                                    <View style={styles.editCardHeader}>
                                        <Ionicons
                                            name={
                                                editItem.categoria ===
                                                "Equipamentos"
                                                    ? "construct-outline"
                                                    : "school-outline"
                                            }
                                            size={20}
                                            color="#1792FE"
                                        />
                                        <Text style={styles.editCardTitle}>
                                            {editItem.categoria ===
                                            "Equipamentos"
                                                ? "Equipamento"
                                                : "Especialidade"}
                                        </Text>
                                    </View>
                                    <View style={styles.editPickerContainer}>
                                        <Picker
                                            selectedValue={
                                                editItem.especialidadeCodigo
                                            }
                                            onValueChange={(cod) => {
                                                const lista =
                                                    editItem.categoria ===
                                                    "Equipamentos"
                                                        ? equipamentosList
                                                        : especialidadesList;
                                                const sel = lista.find(
                                                    (x) => x.codigo === cod,
                                                );
                                                setEditItem((s) => ({
                                                    ...s,
                                                    especialidadeCodigo: cod,
                                                    subEmpId:
                                                        sel?.subEmpId ?? null,
                                                }));
                                            }}
                                            style={styles.editPicker}
                                        >
                                            <Picker.Item
                                                label="— Selecione uma opção —"
                                                value=""
                                            />
                                            {(editItem.categoria ===
                                            "Equipamentos"
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

                                {/* Card de Classe */}
                                <View style={styles.editCard}>
                                    <View style={styles.editCardHeader}>
                                        <Ionicons
                                            name="pricetag-outline"
                                            size={20}
                                            color="#1792FE"
                                        />
                                        <Text style={styles.editCardTitle}>
                                            Classe
                                        </Text>
                                    </View>
                                    <View style={styles.editPickerContainer}>
                                        <Picker
                                            selectedValue={editItem.classeID}
                                            onValueChange={(v) =>
                                                setEditItem((s) => ({
                                                    ...s,
                                                    classeID: v,
                                                }))
                                            }
                                            style={styles.editPicker}
                                        >
                                            <Picker.Item
                                                label="— Selecione uma classe —"
                                                value={null}
                                            />
                                            {Object.entries(classesMap).map(
                                                ([id, descricao]) => (
                                                    <Picker.Item
                                                        key={id}
                                                        label={descricao}
                                                        value={id}
                                                    />
                                                ),
                                            )}
                                        </Picker>
                                    </View>
                                </View>

                                {/* Card de horas */}
                                <View style={styles.editCard}>
                                    <View style={styles.editCardHeader}>
                                        <Ionicons
                                            name="time-outline"
                                            size={20}
                                            color="#1792FE"
                                        />
                                        <Text style={styles.editCardTitle}>
                                            Horas Trabalhadas
                                        </Text>
                                    </View>
                                    <View style={styles.editInputContainer}>
                                        <TextInput
                                            style={styles.editHorasInput}
                                            value={editItem.horasStr}
                                            onChangeText={(v) =>
                                                setEditItem((s) => ({
                                                    ...s,
                                                    horasStr: v,
                                                }))
                                            }
                                            placeholder="ex.: 8:00 ou 8.0"
                                            keyboardType="default"
                                            placeholderTextColor="#999"
                                        />
                                        <View style={styles.editHorasHint}>
                                            <Ionicons
                                                name="information-circle-outline"
                                                size={16}
                                                color="#666"
                                            />
                                            <Text
                                                style={styles.editHorasHintText}
                                            >
                                                Use formato H:MM (ex: 8:30) ou
                                                decimal (ex: 8.5)
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Card de hora extra */}
                                <View style={styles.editCard}>
                                    <TouchableOpacity
                                        style={styles.editHoraExtraContainer}
                                        onPress={() =>
                                            setEditItem((s) => ({
                                                ...s,
                                                horaExtra: !s.horaExtra,
                                            }))
                                        }
                                    >
                                        <View style={styles.editHoraExtraLeft}>
                                            <Ionicons
                                                name="flash-outline"
                                                size={20}
                                                color="#1792FE"
                                            />
                                            <View
                                                style={styles.editHoraExtraInfo}
                                            >
                                                <Text
                                                    style={
                                                        styles.editHoraExtraTitle
                                                    }
                                                >
                                                    Hora Extra
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.editHoraExtraSubtitle
                                                    }
                                                >
                                                    Marcar estas horas como
                                                    extraordinárias
                                                </Text>
                                            </View>
                                        </View>
                                        <View
                                            style={[
                                                styles.editCheckbox,
                                                editItem.horaExtra &&
                                                    styles.editCheckboxSelected,
                                            ]}
                                        >
                                            {editItem.horaExtra && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={16}
                                                    color="#fff"
                                                />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>

                            {/* Footer com botões */}
                            <View style={styles.editModalFooter}>
                                <TouchableOpacity
                                    onPress={() =>
                                        setEditItemModalVisible(false)
                                    }
                                    style={styles.editCancelButton}
                                >
                                    <Text style={styles.editCancelButtonText}>
                                        Cancelar
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={guardarItemEditado}
                                    style={styles.editSaveButton}
                                >
                                    <LinearGradient
                                        colors={["#28a745", "#20c997"]}
                                        style={styles.editSaveButtonGradient}
                                    >
                                        <Ionicons
                                            name="checkmark-circle-outline"
                                            size={18}
                                            color="#fff"
                                        />
                                        <Text style={styles.editSaveButtonText}>
                                            Guardar Alterações
                                        </Text>
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

export default GestaoPartesDiarias;
