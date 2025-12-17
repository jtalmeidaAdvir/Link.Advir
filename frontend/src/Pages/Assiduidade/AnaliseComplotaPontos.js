import React, { useState, useEffect, useRef } from "react";
import { secureStorage } from "../../utils/secureStorage";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as XLSX from "xlsx";
import { styles } from "./styles/AnaliseComplotaPontosStyles";

const AnaliseComplotaPontos = () => {
    const [loading, setLoading] = useState(false);
    const [utilizadores, setUtilizadores] = useState([]);
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState("");
    const [mesSelecionado, setMesSelecionado] = useState(
        new Date().getMonth() + 1,
    );
    const [anoSelecionado, setAnoSelecionado] = useState(
        new Date().getFullYear(),
    );
    const [dadosGrade, setDadosGrade] = useState([]);

    // ✅ NOVO: Estados para faltas e feriados com refs para acesso síncrono
    const [faltas, setFaltas] = useState([]);
    const [feriados, setFeriados] = useState(new Set());
    const faltasRef = useRef([]);
    const feriadosRef = useRef(new Set());

    // ✅ NOVO: Estados e refs para horas extras
    const [horasExtras, setHorasExtras] = useState([]);
    const horasExtrasRef = useRef([]);

    // ✅ NOVO: Flags de carregamento
    const [dadosCarregados, setDadosCarregados] = useState({
        feriados: false,
        faltas: false,
        horarios: false,
        horasExtras: false,
        inicial: false,
    });

    const meses = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
    ];

    const anos = Array.from(
        { length: 10 },
        (_, i) => new Date().getFullYear() - 5 + i,
    );

    const fmtLocal = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    // ✅ Função para normalizar feriados
    const normalizarFeriados = (data) => {
        try {
            const lista = data?.DataSet?.Table || [];
            const set = new Set();

            lista.forEach((item) => {
                // A API retorna com a chave "Feriado", não "Data"
                const dataFeriado = item.Feriado || item.Data;
                if (dataFeriado) {
                    const d = new Date(dataFeriado);
                    if (!isNaN(d.getTime())) {
                        const iso = fmtLocal(d);
                        set.add(iso);
                        console.log(
                            `   📅 Feriado adicionado: ${iso} (${item.Ano || d.getFullYear()})`,
                        );
                    }
                }
            });

            console.log(`✅ [FERIADOS] ${set.size} feriados normalizados`);
            return set;
        } catch (err) {
            console.error("❌ [FERIADOS] Erro ao normalizar:", err);
            return new Set();
        }
    };

    // ✅ CORRIGIDO: Carregar feriados com retry e retorno garantido
    const carregarFeriados = async (tentativa = 1, maxTentativas = 3) => {
        const painelAdminToken = secureStorage.getItem("painelAdminToken");
        const urlempresa = secureStorage.getItem("urlempresa");

        console.log(
            `🔍 [FERIADOS] Carregando feriados (tentativa ${tentativa}/${maxTentativas})...`,
        );

        if (!painelAdminToken || !urlempresa) {
            console.warn(
                "⚠️ [FERIADOS] Token ou URL da empresa não encontrados",
            );
            const emptySet = new Set();
            setFeriados(emptySet);
            feriadosRef.current = emptySet;
            return emptySet;
        }

        try {
            const res = await fetch(
                `https://webapiprimavera.advir.pt/routesFaltas/Feriados`,
                {
                    headers: {
                        Authorization: `Bearer ${painelAdminToken}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );

            console.log(`🔍 [FERIADOS] Response status: ${res.status}`);

            if (!res.ok) {
                const errorText = await res.text();
                console.error(`❌ [FERIADOS] Erro na resposta: ${errorText}`);

                if (res.status === 409 && tentativa < maxTentativas) {
                    console.log(
                        `⏳ [FERIADOS] Erro 409. Aguardando 2s antes da próxima tentativa...`,
                    );
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    return carregarFeriados(tentativa + 1, maxTentativas);
                }

                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            const data = await res.json();
            console.log(
                `✅ [FERIADOS] Dados recebidos:`,
                data?.DataSet?.Table?.length || 0,
                "registos",
            );
            console.log(
                `📦 [FERIADOS] Payload completo:`,
                JSON.stringify(data?.DataSet?.Table?.slice(0, 3), null, 2),
            );

            const listaISO = normalizarFeriados(data);
            console.log(
                `✅ [FERIADOS] Total de feriados carregados: ${listaISO.size}`,
            );

            if (listaISO.size > 0) {
                const feriadosArray = Array.from(listaISO).sort();
                console.log(
                    `📋 [FERIADOS] Lista completa de feriados:`,
                    feriadosArray,
                );
                console.log(
                    `📋 [FERIADOS] Feriados de ${mesSelecionado}/${anoSelecionado}:`,
                    feriadosArray.filter((f) => {
                        const [ano, mes] = f.split("-").map(Number);
                        return ano === anoSelecionado && mes === mesSelecionado;
                    }),
                );
            } else {
                console.warn(`⚠️ [FERIADOS] NENHUM feriado foi carregado!`);
            }

            // ✅ IMPORTANTE: Atualizar state E ref
            setFeriados(listaISO);
            feriadosRef.current = listaISO;

            return listaISO;
        } catch (err) {
            console.error(
                `❌ [FERIADOS] Erro ao carregar (tentativa ${tentativa}):`,
                err,
            );

            if (
                tentativa < maxTentativas &&
                !err.message.includes("TypeError: Failed to fetch")
            ) {
                console.log(`⏳ [FERIADOS] Tentando novamente em 3s...`);
                await new Promise((resolve) => setTimeout(resolve, 3000));
                return carregarFeriados(tentativa + 1, maxTentativas);
            }

            console.warn("⚠️ [FERIADOS] Usando conjunto vazio como fallback");
            const emptySet = new Set();
            setFeriados(emptySet);
            feriadosRef.current = emptySet;
            return emptySet;
        }
    };

    // ✅ CORRIGIDO: Carregar faltas E HORAS EXTRAS do endpoint mensal unificado
    const carregarFaltas = async (
        utilizadoresParam = null,
        tentativaGlobal = 1,
        maxTentativasGlobais = 3,
    ) => {
        try {
            const painelAdminToken = secureStorage.getItem("painelAdminToken");
            const urlempresa = secureStorage.getItem("urlempresa");
            const loginToken = secureStorage.getItem("loginToken");

            console.log(
                `\n🔍 [FALTAS] Iniciando carregamento (tentativa global ${tentativaGlobal}/${maxTentativasGlobais})...`,
            );

            if (!painelAdminToken || !urlempresa || !loginToken) {
                console.warn("❌ [FALTAS] Tokens não encontrados");
                setFaltas([]);
                faltasRef.current = [];
                setHorasExtras([]);
                horasExtrasRef.current = [];
                return { faltas: [], horasExtras: [] };
            }

            const utilizadoresParaProcessar = utilizadoresParam || utilizadores;

            console.log(
                `📊 [FALTAS] Total de utilizadores: ${utilizadoresParaProcessar.length}`,
            );

            if (utilizadoresParaProcessar.length === 0) {
                console.warn("⚠️ [FALTAS] Nenhum utilizador disponível");
                setFaltas([]);
                faltasRef.current = [];
                setHorasExtras([]);
                horasExtrasRef.current = [];
                return { faltas: [], horasExtras: [] };
            }

            // ✅ Função para carregar faltas E HORAS EXTRAS de UM utilizador com retry individual
            const carregarFaltasUtilizador = async (
                user,
                tentativa = 1,
                maxTentativas = 3,
            ) => {
                try {
                    console.log(
                        `   🔄 [${user.nome}] Carregando faltas/horas extras (tentativa ${tentativa}/${maxTentativas})...`,
                    );

                    // Passo 1: Obter codFuncionario
                    const resCodFuncionario = await fetch(
                        `https://backend.advir.pt/api/users/getCodFuncionario/${user.id}`,
                        {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${loginToken}`,
                                "Content-Type": "application/json",
                            },
                        },
                    );

                    if (!resCodFuncionario.ok) {
                        throw new Error(
                            `Falha ao obter codFuncionario: ${resCodFuncionario.status}`,
                        );
                    }

                    const dataCodFuncionario = await resCodFuncionario.json();
                    const codFuncionario = dataCodFuncionario.codFuncionario;

                    if (!codFuncionario) {
                        console.log(
                            `   ℹ️ [${user.nome}] Sem codFuncionario - retornando arrays vazios`,
                        );
                        return {
                            success: true,
                            user: user.nome,
                            faltas: [],
                            horasExtras: [],
                        };
                    }

                    // Passo 2: Buscar dados do mês na API Primavera (faltas + horas extras)
                    const urlFaltasMensal = `https://webapiprimavera.advir.pt/routesFaltas/GetListaFaltasFuncionariosMensal/${mesSelecionado}`;

                    const res = await fetch(urlFaltasMensal, {
                        headers: {
                            Authorization: `Bearer ${painelAdminToken}`,
                            urlempresa: urlempresa,
                            "Content-Type": "application/json",
                        },
                    });

                    if (!res.ok) {
                        throw new Error(`API retornou ${res.status}`);
                    }

                    const dataFaltas = await res.json();
                    const faltasUtilizador = [];
                    const horasExtrasUtilizador = [];

                    if (
                        !dataFaltas ||
                        !dataFaltas.DataSet ||
                        !Array.isArray(dataFaltas.DataSet.Table)
                    ) {
                        console.warn(
                            `⚠️ [FALTAS] Formato de resposta inválido para ${user.nome}`,
                        );
                    } else {
                        const listaMes = dataFaltas.DataSet.Table;
                        console.log(
                            `📊 [FALTAS] Total de registos no mês ${mesSelecionado}: ${listaMes.length}`,
                        );

                        // Processar dados do mês - separar faltas e horas extras
                        listaMes.forEach((item) => {
                            // ✅ VERIFICAR SE É FALTA (tem Funcionario2 e Falta1)
                            const funcionarioFalta = item.Funcionario2;
                            if (
                                funcionarioFalta === codFuncionario &&
                                item.Falta1
                            ) {
                                const dataFalta = item.Data2;
                                if (dataFalta) {
                                    const dataObj = new Date(dataFalta);
                                    const anoData = dataObj.getFullYear();
                                    const mesData = dataObj.getMonth() + 1;

                                    console.log(
                                        `   🔍 Falta encontrada: ${user.nome}, Data: ${dataFalta}, Ano: ${anoData}, Mês: ${mesData}, Ano selecionado: ${anoSelecionado}, Mês selecionado: ${mesSelecionado}`,
                                    );

                                    if (
                                        anoData === parseInt(anoSelecionado) &&
                                        mesData === parseInt(mesSelecionado)
                                    ) {
                                        faltasUtilizador.push({
                                            Funcionario: funcionarioFalta,
                                            Data: dataFalta,
                                            Falta: item.Falta1,
                                            Horas: item.Horas,
                                            HorasFalta: item.HorasFalta,
                                            Tempo: item.Tempo1,
                                            TempoFalta: item.TempoFalta,
                                            userId: user.id,
                                            nomeUsuario: user.nome,
                                            codFuncionarioUsado: codFuncionario,
                                        });
                                        console.log(
                                            `      ✅ Falta INCLUÍDA na lista`,
                                        );
                                    } else {
                                        console.log(
                                            `      ❌ Falta EXCLUÍDA (ano/mês não corresponde)`,
                                        );
                                    }
                                }
                            }

                            // ✅ VERIFICAR SE É HORA EXTRA (tem Funcionario e HoraExtra)
                            const funcionarioHE = item.Funcionario;
                            if (
                                funcionarioHE === codFuncionario &&
                                item.HoraExtra
                            ) {
                                const dataHE = item.Data;
                                if (dataHE) {
                                    const dataObj = new Date(dataHE);
                                    const anoData = dataObj.getFullYear();
                                    const mesData = dataObj.getMonth() + 1;

                                    console.log(
                                        `   🔍 Hora Extra encontrada: ${user.nome}, Data: ${dataHE}, Ano: ${anoData}, Mês: ${mesData}, Ano selecionado: ${anoSelecionado}, Mês selecionado: ${mesSelecionado}`,
                                    );

                                    if (
                                        anoData === parseInt(anoSelecionado) &&
                                        mesData === parseInt(mesSelecionado)
                                    ) {
                                        horasExtrasUtilizador.push({
                                            Funcionario: funcionarioHE,
                                            Data: dataHE,
                                            HoraExtra: item.HoraExtra,
                                            Tempo: item.Tempo,
                                            TempoExtra: item.TempoExtra,
                                            Horas:
                                                item.Tempo || item.TempoExtra,
                                            IdFuncRemCBL: item.idFuncRemCBL,
                                            userId: user.id,
                                            nomeUsuario: user.nome,
                                            codFuncionarioUsado: codFuncionario,
                                        });
                                        console.log(
                                            `      ✅ Hora Extra INCLUÍDA na lista`,
                                        );
                                    } else {
                                        console.log(
                                            `      ❌ Hora Extra EXCLUÍDA (ano/mês não corresponde)`,
                                        );
                                    }
                                }
                            }
                        });

                        console.log(
                            `✅ [FALTAS] ${user.nome}: ${faltasUtilizador.length} faltas e ${horasExtrasUtilizador.length} horas extras para ${mesSelecionado}/${anoSelecionado}`,
                        );
                    }

                    // Combinar faltas e horas extras no resultado
                    return {
                        success: true,
                        user: user.nome,
                        faltas: faltasUtilizador,
                        horasExtras: horasExtrasUtilizador,
                    };
                } catch (error) {
                    console.error(
                        `   ❌ [${user.nome}] Erro (tentativa ${tentativa}): ${error.message}`,
                    );

                    // Retry se ainda houver tentativas
                    if (tentativa < maxTentativas) {
                        console.log(
                            `   ⏳ [${user.nome}] Aguardando 2s antes de tentar novamente...`,
                        );
                        await new Promise((resolve) =>
                            setTimeout(resolve, 2000),
                        );
                        return carregarFaltasUtilizador(
                            user,
                            tentativa + 1,
                            maxTentativas,
                        );
                    }

                    // Se esgotaram as tentativas, retornar falha
                    return {
                        success: false,
                        user: user.nome,
                        faltas: [],
                        horasExtras: [],
                        error: error.message,
                    };
                }
            };

            // ✅ Carregar faltas de TODOS os utilizadores
            console.log(
                `\n🚀 [FALTAS] Iniciando carregamento paralelo de ${utilizadoresParaProcessar.length} utilizadores...`,
            );

            const resultados = await Promise.all(
                utilizadoresParaProcessar.map((user) =>
                    carregarFaltasUtilizador(user),
                ),
            );

            // ✅ VALIDAÇÃO CRÍTICA: Verificar se TODOS foram bem-sucedidos
            const falhados = resultados.filter((r) => !r.success);

            if (falhados.length > 0) {
                console.error(
                    `\n❌ [FALTAS] FALHA: ${falhados.length} utilizadores não foram carregados com sucesso:`,
                );
                falhados.forEach((f) => {
                    console.error(`   ❌ ${f.user}: ${f.error}`);
                });

                // Se ainda houver tentativas globais, tentar novamente TUDO
                if (tentativaGlobal < maxTentativasGlobais) {
                    console.log(
                        `\n⏳ [FALTAS] Aguardando 3s antes de tentar carregar TUDO novamente...`,
                    );
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                    return carregarFaltas(
                        utilizadoresParam,
                        tentativaGlobal + 1,
                        maxTentativasGlobais,
                    );
                }

                // Se esgotaram as tentativas, lançar erro
                throw new Error(
                    `Falha ao carregar faltas de ${falhados.length} utilizadores após ${maxTentativasGlobais} tentativas globais`,
                );
            }

            // ✅ SUCESSO: Todos os utilizadores foram carregados
            const faltasTotal = resultados.flatMap((r) => r.faltas);
            const horasExtrasTotal = resultados.flatMap((r) => r.horasExtras);

            console.log(`\n✅ [FALTAS] SUCESSO COMPLETO!`);
            console.log(
                `   📊 Total de utilizadores processados: ${resultados.length}`,
            );
            console.log(
                `   📋 Total de faltas carregadas: ${faltasTotal.length}`,
            );
            console.log(
                `   📋 Total de horas extras carregadas: ${horasExtrasTotal.length}`,
            );

            // Mostrar resumo por utilizador
            const comFaltas = resultados.filter((r) => r.faltas.length > 0);
            if (comFaltas.length > 0) {
                console.log(
                    `   👥 Utilizadores com faltas (${comFaltas.length}):`,
                );
                comFaltas.forEach((r) => {
                    console.log(`      • ${r.user}: ${r.faltas.length} faltas`);
                });
            } else {
                console.log(`   ℹ️ Nenhum utilizador tem faltas registadas`);
            }

            // Mostrar resumo de horas extras por utilizador
            const comHorasExtras = resultados.filter(
                (r) => r.horasExtras.length > 0,
            );
            if (comHorasExtras.length > 0) {
                console.log(
                    `   👥 Utilizadores com horas extras (${comHorasExtras.length}):`,
                );
                comHorasExtras.forEach((r) => {
                    console.log(
                        `      • ${r.user}: ${r.horasExtras.length} registos de horas extras`,
                    );
                });
            } else {
                console.log(
                    `   ℹ️ Nenhum utilizador tem horas extras registadas`,
                );
            }

            // ✅ IMPORTANTE: Atualizar state E ref
            setFaltas(faltasTotal);
            faltasRef.current = faltasTotal;
            setHorasExtras(horasExtrasTotal); // Atualizar também o estado das horas extras
            horasExtrasRef.current = horasExtrasTotal; // E a ref

            return { faltas: faltasTotal, horasExtras: horasExtrasTotal }; // Retornar ambos os arrays
        } catch (error) {
            console.error(
                `\n❌ [FALTAS] ERRO CRÍTICO no carregamento:`,
                error.message,
            );
            setFaltas([]);
            faltasRef.current = [];
            setHorasExtras([]);
            horasExtrasRef.current = [];
            throw error; // Propagar erro para tratamento superior
        }
    };

    const [horariosUtilizadores, setHorariosUtilizadores] = useState({});
    const horariosRef = useRef({});

    useEffect(() => {
        carregarDadosIniciais();
    }, []);

    // ✅ CORRIGIDO: Recarregar ao mudar filtros com debounce
    useEffect(() => {
        if (dadosCarregados.inicial && utilizadores.length > 0) {
            console.log(`🔄 [CHANGE] Detectada mudança de período ou obra`);
            console.log(
                `📋 [CHANGE] Novo período: ${mesSelecionado}/${anoSelecionado}`,
            );
            console.log(`📋 [CHANGE] Obra: ${obraSelecionada || "Todas"}`);

            // Pequeno debounce para evitar múltiplos recarregamentos
            const timer = setTimeout(() => {
                recarregarDadosPeriodo();
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [obraSelecionada, mesSelecionado, anoSelecionado]);

    // ✅ CORRIGIDO: Função principal de recarregamento com validação rigorosa
    const recarregarDadosPeriodo = async () => {
        console.log(`\n${"=".repeat(60)}`);
        console.log(`🔄 [RELOAD] INICIANDO RECARREGAMENTO COMPLETO FORÇADO`);
        console.log(`📅 Período: ${mesSelecionado}/${anoSelecionado}`);
        console.log(`🏢 Obra: ${obraSelecionada || "Todas"}`);
        console.log(`${"=".repeat(60)}\n`);

        setLoading(true);

        // ✅ LIMPEZA FORÇADA TOTAL
        console.log(`🧹 [CLEANUP] Limpando TODOS os dados anteriores...`);
        setDadosGrade([]);
        setFeriados(new Set());
        feriadosRef.current = new Set();
        setFaltas([]);
        faltasRef.current = [];
        setHorasExtras([]); // Limpar também horas extras
        horasExtrasRef.current = []; // Limpar ref de horas extras
        console.log(`✅ [CLEANUP] Dados anteriores completamente limpos`);

        try {
            // ✅ PASSO 1: FERIADOS - COM VALIDAÇÃO RIGOROSA
            console.log(`\n📌 PASSO 1/3: Carregando FERIADOS...`);
            const feriadosCarregados = await carregarFeriados();

            // Validação obrigatória
            if (!feriadosCarregados || !(feriadosCarregados instanceof Set)) {
                throw new Error(
                    "❌ CRÍTICO: Feriados não retornaram um Set válido",
                );
            }

            // Aguardar sincronização do state
            await new Promise((resolve) => {
                setFeriados(feriadosCarregados);
                feriadosRef.current = feriadosCarregados;
                setTimeout(resolve, 100); // Pequena pausa para garantir state update
            });

            console.log(
                `✅ PASSO 1/3 CONCLUÍDO: ${feriadosCarregados.size} feriados carregados e sincronizados`,
            );
            console.log(
                `🔍 [VALIDAÇÃO] feriadosRef.current.size: ${feriadosRef.current.size}`,
            );

            // ✅ PASSO 2: FALTAS E HORAS EXTRAS - COM VALIDAÇÃO RIGOROSA
            console.log(`\n📌 PASSO 2/3: Carregando FALTAS e HORAS EXTRAS...`);

            let faltasEHorasExtrasCarregadas;
            try {
                faltasEHorasExtrasCarregadas = await carregarFaltas();
            } catch (error) {
                console.error(
                    `❌ [RELOAD] FALHA CRÍTICA ao carregar faltas/horas extras:`,
                    error.message,
                );
                throw new Error(
                    `Não foi possível carregar todas as faltas e horas extras: ${error.message}`,
                );
            }

            // Validação obrigatória
            if (
                !faltasEHorasExtrasCarregadas ||
                !faltasEHorasExtrasCarregadas.faltas ||
                !Array.isArray(faltasEHorasExtrasCarregadas.faltas) ||
                !faltasEHorasExtrasCarregadas.horasExtras ||
                !Array.isArray(faltasEHorasExtrasCarregadas.horasExtras)
            ) {
                throw new Error(
                    "❌ CRÍTICO: Faltas ou Horas Extras não retornaram arrays válidos",
                );
            }

            // Aguardar sincronização do state
            await new Promise((resolve) => {
                setFaltas(faltasEHorasExtrasCarregadas.faltas);
                faltasRef.current = faltasEHorasExtrasCarregadas.faltas;
                setHorasExtras(faltasEHorasExtrasCarregadas.horasExtras);
                horasExtrasRef.current =
                    faltasEHorasExtrasCarregadas.horasExtras;
                setTimeout(resolve, 100); // Pequena pausa para garantir state update
            });

            console.log(
                `✅ PASSO 2/3 CONCLUÍDO: ${faltasEHorasExtrasCarregadas.faltas.length} faltas e ${faltasEHorasExtrasCarregadas.horasExtras.length} horas extras carregadas e sincronizadas`,
            );
            console.log(
                `🔍 [VALIDAÇÃO] faltasRef.current.length: ${faltasRef.current.length}`,
            );
            console.log(
                `🔍 [VALIDAÇÃO] horasExtrasRef.current.length: ${horasExtrasRef.current.length}`,
            );

            // ✅ VALIDAÇÃO FINAL ANTES DE GERAR GRADE
            console.log(
                `\n🔍 [PRÉ-GRADE] Validação final dos dados carregados:`,
            );
            console.log(
                `   - Feriados (Set): ${feriadosRef.current.size} elementos`,
            );
            console.log(
                `   - Faltas (Array): ${faltasRef.current.length} elementos`,
            );
            console.log(
                `   - Horas Extras (Array): ${horasExtrasRef.current.length} elementos`,
            );
            console.log(`   - Utilizadores: ${utilizadores.length} elementos`);

            if (
                !feriadosRef.current ||
                !faltasRef.current ||
                !horasExtrasRef.current
            ) {
                throw new Error(
                    "❌ CRÍTICO: Refs não foram sincronizadas corretamente",
                );
            }

            // ✅ ATUALIZAR FLAGS DE CARREGAMENTO
            setDadosCarregados({
                feriados: true,
                faltas: true,
                horarios: true,
                horasExtras: true,
                inicial: true,
            });

            // ✅ PASSO 3: GERAR GRADE - SÓ APÓS VALIDAÇÃO COMPLETA
            console.log(`\n📌 PASSO 3/3: Gerando GRADE com dados VALIDADOS...`);
            await gerarGradeComDadosValidados(
                feriadosRef.current,
                faltasRef.current,
                horasExtrasRef.current,
            );
            console.log(
                `✅ PASSO 3/3 CONCLUÍDO: Grade gerada com pontos fictícios`,
            );

            console.log(`\n${"=".repeat(60)}`);
            console.log(
                `✅ [RELOAD] RECARREGAMENTO COMPLETO FINALIZADO COM SUCESSO`,
            );
            console.log(`   - Feriados: ${feriadosRef.current.size}`);
            console.log(`   - Faltas: ${faltasRef.current.length}`);
            console.log(`   - Horas Extras: ${horasExtrasRef.current.length}`);
            console.log(`   - Grade: ${dadosGrade.length} utilizadores`);
            console.log(`${"=".repeat(60)}\n`);
        } catch (error) {
            console.error("❌ [RELOAD] Erro ao recarregar dados:", error);
            Alert.alert("Erro", `Erro ao recarregar dados: ${error.message}`);
            // Garantir limpeza completa em caso de erro
            setDadosGrade([]);
            setFeriados(new Set());
            feriadosRef.current = new Set();
            setFaltas([]);
            faltasRef.current = [];
            setHorasExtras([]);
            horasExtrasRef.current = [];
            setDadosCarregados({
                feriados: false,
                faltas: false,
                horarios: false,
                horasExtras: false,
                inicial: false,
            });
        } finally {
            setLoading(false);
        }
    };

    // ✅ NOVO: Gerar grade com dados já validados (recebe os dados como parâmetro)
    const gerarGradeComDadosValidados = async (
        feriadosValidados,
        faltasValidadas,
        horasExtrasValidadas,
    ) => {
        console.log(`\n🔍 [GRADE] Iniciando geração da grade...`);
        console.log(`📊 [GRADE] Dados recebidos:`);
        console.log(`   - Feriados: ${feriadosValidados.size} registos`);
        console.log(`   - Faltas: ${faltasValidadas.length} registos`);
        console.log(
            `   - Horas Extras: ${horasExtrasValidadas.length} registos`,
        );
        console.log(`   - Utilizadores: ${utilizadores.length}`);
        console.log(`   - Período: ${mesSelecionado}/${anoSelecionado}`);

        // Converter mês/ano para números para comparação
        const mesNum = parseInt(mesSelecionado);
        const anoNum = parseInt(anoSelecionado);

        console.log(
            `🔍 [GRADE] Filtros: Mês=${mesNum} (tipo: ${typeof mesNum}), Ano=${anoNum} (tipo: ${typeof anoNum})`,
        );

        // Filtrar faltas para o mês/ano selecionado
        const faltasDoMes = faltasValidadas.filter((falta) => {
            const dataFalta = new Date(falta.Data);
            const mesData = dataFalta.getMonth() + 1;
            const anoData = dataFalta.getFullYear();
            const match = mesData === mesNum && anoData === anoNum;

            if (!match && falta.nomeUsuario) {
                console.log(
                    `   ⚠️ Falta EXCLUÍDA: ${falta.nomeUsuario}, Data=${falta.Data}, Mês=${mesData}, Ano=${anoData}`,
                );
            }

            return match;
        });

        console.log(
            `📋 [GRADE] Faltas filtradas para ${mesNum}/${anoNum}: ${faltasDoMes.length}`,
        );

        if (faltasDoMes.length > 0) {
            console.log(`📋 [GRADE] Detalhes das faltas do mês:`);
            faltasDoMes.forEach((f) => {
                const dataFalta = new Date(f.Data);
                console.log(
                    `   - ${f.nomeUsuario}: Dia ${dataFalta.getDate()}/${mesNum}`,
                );
            });
        }

        // Filtrar feriados para o mês/ano selecionado
        const feriadosDoMes = new Set();
        console.log(
            `🔍 [GRADE] Filtrando feriados para ${mesNum}/${anoNum}...`,
        );
        console.log(
            `🔍 [GRADE] Total de feriados disponíveis: ${feriadosValidados.size}`,
        );

        feriadosValidados.forEach((feriadoISO) => {
            const [ano, mes, dia] = feriadoISO.split("-").map(Number);
            if (ano === anoNum && mes === mesNum) {
                feriadosDoMes.add(feriadoISO);
                console.log(
                    `   ✓ Feriado encontrado para o mês: Dia ${dia}/${mes}/${ano}`,
                );
            }
        });

        console.log(
            `📋 [GRADE] Feriados do mês ${mesNum}/${anoNum}: ${feriadosDoMes.size}`,
        );
        if (feriadosDoMes.size > 0) {
            console.log(
                `📋 [GRADE] Lista completa:`,
                Array.from(feriadosDoMes).sort(),
            );
        } else {
            console.warn(
                `⚠️ [GRADE] NENHUM feriado encontrado para ${mesNum}/${anoNum}!`,
            );
        }

        // Filtrar horas extras para o mês/ano selecionado
        const horasExtrasDoMes = horasExtrasValidadas.filter((he) => {
            const dataHE = new Date(he.Data);
            const mesData = dataHE.getMonth() + 1;
            const anoData = dataHE.getFullYear();
            const match = mesData === mesNum && anoData === anoNum;

            if (!match && he.nomeUsuario) {
                console.log(
                    `   ⚠️ Hora Extra EXCLUÍDA: ${he.nomeUsuario}, Data=${he.Data}, Mês=${mesData}, Ano=${anoData}`,
                );
            }

            return match;
        });

        console.log(
            `📋 [GRADE] Horas Extras filtradas para ${mesNum}/${anoNum}: ${horasExtrasDoMes.length}`,
        );

        const diasDoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
        const hoje = new Date();
        const dadosGradeTemp = [];

        utilizadores.forEach((user) => {
            const dadosUsuario = {
                utilizador: user,
                estatisticasDias: {},
                totalHorasMes: 0,
                diasTrabalhados: 0,
                faltasTotal: 0,
                feriadosTotal: 0,
                horasExtrasTotal: 0, // Adicionar total de horas extras
            };

            // Faltas deste utilizador no mês
            const faltasDoUser = faltasDoMes.filter(
                (f) => f.userId === user.id,
            );

            if (faltasDoUser.length > 0) {
                console.log(
                    `👤 [GRADE] ${user.nome}: ${faltasDoUser.length} faltas no mês`,
                );
            }

            // Horas extras deste utilizador no mês
            const horasExtrasDoUser = horasExtrasDoMes.filter((he) => {
                // Ajustar a lógica de correspondência se o campo 'Funcionario' não for o ID direto
                // Assumindo que 'he.Funcionario' pode ser o nome ou código do funcionário
                return (
                    he.Funcionario === user.nome ||
                    he.Funcionario === user.codFuncionario
                );
            });

            if (horasExtrasDoUser.length > 0) {
                console.log(
                    `👤 [GRADE] ${user.nome}: ${horasExtrasDoUser.length} registos de horas extras no mês`,
                );
                horasExtrasDoUser.forEach((he) => {
                    dadosUsuario.horasExtrasTotal += parseFloat(he.Horas); // Somar as horas extras
                });
                console.log(
                    `   -> Total de horas extras: ${dadosUsuario.horasExtrasTotal.toFixed(2)}h`,
                );
            }

            for (let dia = 1; dia <= diasDoMes; dia++) {
                const dataAtual = new Date(
                    anoSelecionado,
                    mesSelecionado - 1,
                    dia,
                );
                const diaSemana = dataAtual.getDay();
                const isWeekend = diaSemana === 0 || diaSemana === 6;
                const isFutureDate = dataAtual > hoje;

                // ✅ Verificar se é feriado
                const dataISO = fmtLocal(dataAtual);
                const isFeriado = feriadosValidados.has(dataISO);

                if (isFeriado) {
                    console.log(
                        `   🎉 [FERIADO DETECTADO] ${user.nome} - Dia ${dia}/${mesSelecionado}/${anoSelecionado} (${dataISO})`,
                    );
                }

                // ✅ Verificar faltas do dia para este utilizador
                const faltasDoDia = faltasDoUser.filter((falta) => {
                    const df = new Date(falta.Data);
                    return df.getDate() === dia;
                });

                let estatisticasDia = {
                    dia,
                    diaSemana,
                    isWeekend,
                    isFutureDate,
                    isFeriado,
                    faltas: faltasDoDia,
                    temFalta: faltasDoDia.length > 0,
                    trabalhou: false,
                    horasExtras: 0, // Adicionar campo para horas extras do dia
                };

                // ✅ PRIORIDADE 1: FALTAS
                if (faltasDoDia.length > 0) {
                    estatisticasDia.trabalhou = false;
                    estatisticasDia.temFalta = true;
                    estatisticasDia.faltas = faltasDoDia;
                    dadosUsuario.faltasTotal++;
                    console.log(`   ⚠️ Dia ${dia}: FALTA`);
                }
                // ✅ PRIORIDADE 2: FERIADOS
                else if (isFeriado) {
                    estatisticasDia.trabalhou = false;
                    dadosUsuario.feriadosTotal++;
                    console.log(`   🎉 Dia ${dia}: FERIADO`);
                }
                // ✅ PRIORIDADE 3: FIM DE SEMANA
                else if (isWeekend) {
                    estatisticasDia.trabalhou = false;
                }
                // ✅ PRIORIDADE 4: FUTURO
                else if (isFutureDate) {
                    estatisticasDia.trabalhou = false;
                }
                // ✅ PRIORIDADE 5: DIA ÚTIL -> GERAR HORÁRIO ESPERADO E VERIFICAR HORAS EXTRAS
                else {
                    const isHoje =
                        dataAtual.toDateString() === hoje.toDateString();
                    const horaAtual = isHoje
                        ? `${String(hoje.getHours()).padStart(2, "0")}:${String(hoje.getMinutes()).padStart(2, "0")}`
                        : null;

                    // Verificar se há horas extras para este dia específico
                    const horasExtrasDia = horasExtrasDoUser.find((he) => {
                        const dataHE = new Date(he.Data);
                        return dataHE.getDate() === dia;
                    });

                    const horasExtras = horasExtrasDia
                        ? parseFloat(horasExtrasDia.Horas)
                        : 0;

                    if (horasExtras > 0) {
                        console.log(
                            `   ➕ Dia ${dia}: ${horasExtras.toFixed(2)}h de Horas Extras`,
                        );
                    }

                    // Gerar pontos fictícios COM horas extras integradas
                    const pontosFicticios = gerarPontosFicticios(
                        user.id,
                        dia,
                        isHoje,
                        horaAtual,
                        horasExtras,
                    );
                    Object.assign(estatisticasDia, pontosFicticios);
                    estatisticasDia.trabalhou = true;

                    if (pontosFicticios.temSaida) {
                        // Calcular horas reais baseadas nos timestamps gerados (com variações)
                        const intervaloAlmoco = horariosRef.current[user.id]?.intervaloAlmoco || 1.0;
                        const horasDia = calcularHorasTrabalhadasReais(pontosFicticios, intervaloAlmoco);
                        dadosUsuario.totalHorasMes += horasDia;
                        dadosUsuario.diasTrabalhados++;
                    } else {
                        dadosUsuario.diasTrabalhados += 0.5; // Considera meio dia se não houver saída completa
                    }
                }

                dadosUsuario.estatisticasDias[dia] = estatisticasDia;
            }

            // Adicionar horas extras ao total do mês do utilizador
            dadosUsuario.totalHorasMes += dadosUsuario.horasExtrasTotal;

            dadosGradeTemp.push(dadosUsuario);
        });

        console.log(`\n📊 [GRADE] RESUMO FINAL:`);
        console.log(`   - Utilizadores processados: ${dadosGradeTemp.length}`);

        const totalFaltas = dadosGradeTemp.reduce(
            (sum, u) => sum + u.faltasTotal,
            0,
        );
        const totalFeriados = dadosGradeTemp.reduce(
            (sum, u) => sum + u.feriadosTotal,
            0,
        );
        const totalHorasExtras = dadosGradeTemp.reduce(
            (sum, u) => sum + u.horasExtrasTotal,
            0,
        );

        console.log(`   - Total faltas na grade: ${totalFaltas}`);
        console.log(`   - Total feriados na grade: ${totalFeriados}`);
        console.log(
            `   - Total Horas Extras na grade: ${totalHorasExtras.toFixed(2)}h`,
        );

        // Listar utilizadores com faltas
        const usersComFaltas = dadosGradeTemp.filter((u) => u.faltasTotal > 0);
        if (usersComFaltas.length > 0) {
            console.log(`   - Utilizadores com faltas:`);
            usersComFaltas.forEach((u) => {
                console.log(
                    `      • ${u.utilizador.nome}: ${u.faltasTotal} faltas`,
                );
            });
        }

        // Listar utilizadores com horas extras
        const usersComHorasExtras = dadosGradeTemp.filter(
            (u) => u.horasExtrasTotal > 0,
        );
        if (usersComHorasExtras.length > 0) {
            console.log(`   - Utilizadores com horas extras:`);
            usersComHorasExtras.forEach((u) => {
                console.log(
                    `      • ${u.utilizador.nome}: ${u.horasExtrasTotal.toFixed(2)}h`,
                );
            });
        }

        setDadosGrade(dadosGradeTemp);
    };

    const carregarDadosIniciais = async () => {
        console.log(`\n${"=".repeat(60)}`);
        console.log(`🚀 [INIT] INICIANDO CARREGAMENTO INICIAL COMPLETO`);
        console.log(`${"=".repeat(60)}\n`);

        setLoading(true);

        // ✅ LIMPEZA INICIAL: Garantir que não há dados residuais
        console.log(`🧹 [INIT-CLEANUP] Limpando estados iniciais...`);
        setDadosGrade([]);
        setFeriados(new Set());
        feriadosRef.current = new Set();
        setFaltas([]);
        faltasRef.current = [];
        setHorasExtras([]); // Limpar horas extras
        horasExtrasRef.current = []; // Limpar ref de horas extras
        console.log(`✅ [INIT-CLEANUP] Estados iniciais limpos`);

        try {
            const token = secureStorage.getItem("loginToken");
            const empresaId = secureStorage.getItem("empresa_id");

            // Carregar obras
            console.log(`\n📌 [INIT] Carregando obras...`);
            const resObras = await fetch(
                `https://backend.advir.pt/api/obra/por-empresa?empresa_id=${empresaId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            const obrasData = await resObras.json();
            setObras(obrasData);
            console.log(`✅ [INIT] ${obrasData.length} obras carregadas`);

            // Carregar utilizadores
            console.log(`\n📌 [INIT] Carregando utilizadores...`);
            const resUsers = await fetch(
                `https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${empresaId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            const usersData = await resUsers.json();

            const utilizadoresFormatados = usersData.map((user) => ({
                id: user.id,
                nome:
                    user.username ||
                    user.nome ||
                    user.email ||
                    `Utilizador ${user.id}`,
                email: user.email,
                codFuncionario:
                    user.codFuncionario || user.username || user.nome,
            }));

            console.log(
                `✅ [INIT] ${utilizadoresFormatados.length} utilizadores carregados`,
            );

            // Carregar horários e filtrar utilizadores com plano ativo
            console.log(`\n📌 [INIT] Carregando horários...`);
            const { utilizadoresComHorario, horariosMap } =
                await carregarHorariosUtilizadores(utilizadoresFormatados);

            console.log(
                `✅ [INIT] ${utilizadoresComHorario.length} utilizadores COM plano de horário ativo`,
            );

            setUtilizadores(utilizadoresComHorario);
            setHorariosUtilizadores(horariosMap);
            horariosRef.current = horariosMap;

            // ✅ PASSO 1: CARREGAR FERIADOS (OBRIGATÓRIO - SEMPRE PRIMEIRO)
            console.log(`\n${"━".repeat(60)}`);
            console.log(`📌 PASSO 1/3: Carregando FERIADOS...`);
            console.log(`${"━".repeat(60)}`);
            const feriadosIniciais = await carregarFeriados();
            if (!feriadosIniciais) {
                throw new Error("Feriados não foram carregados corretamente");
            }
            console.log(
                `✅ PASSO 1/3 CONCLUÍDO: ${feriadosIniciais.size} feriados carregados`,
            );

            // ✅ PASSO 2: CARREGAR FALTAS E HORAS EXTRAS (OBRIGATÓRIO - SEMPRE SEGUNDO)
            console.log(`\n${"━".repeat(60)}`);
            console.log(`📌 PASSO 2/3: Carregando FALTAS e HORAS EXTRAS...`);
            console.log(`${"━".repeat(60)}`);

            let faltasEHorasExtrasIniciais;
            try {
                faltasEHorasExtrasIniciais = await carregarFaltas(
                    utilizadoresComHorario,
                );
            } catch (error) {
                console.error(
                    `❌ [INIT] FALHA CRÍTICA ao carregar faltas/horas extras:`,
                    error.message,
                );
                throw new Error(
                    `Não foi possível carregar todas as faltas e horas extras no carregamento inicial: ${error.message}`,
                );
            }

            if (
                !faltasEHorasExtrasIniciais ||
                !Array.isArray(faltasEHorasExtrasIniciais.faltas) ||
                !Array.isArray(faltasEHorasExtrasIniciais.horasExtras)
            ) {
                throw new Error(
                    "Faltas ou Horas Extras não foram carregadas corretamente - retorno inválido",
                );
            }

            console.log(
                `✅ PASSO 2/3 CONCLUÍDO: ${faltasEHorasExtrasIniciais.faltas.length} faltas e ${faltasEHorasExtrasIniciais.horasExtras.length} horas extras carregadas de TODOS os ${utilizadoresComHorario.length} utilizadores`,
            );

            // Marcar carregamento inicial como concluído
            setDadosCarregados({
                feriados: true,
                faltas: true,
                horarios: true,
                horasExtras: true,
                inicial: true,
            });

            // ✅ PASSO 3: GERAR GRADE COM PONTOS FICTÍCIOS (OBRIGATÓRIO - SEMPRE TERCEIRO)
            console.log(`\n${"━".repeat(60)}`);
            console.log(`📌 PASSO 3/3: Gerando GRADE com PONTOS FICTÍCIOS...`);
            console.log(`${"━".repeat(60)}`);
            await gerarGradeComDadosValidadosInicial(
                utilizadoresComHorario,
                horariosMap,
                feriadosIniciais,
                faltasEHorasExtrasIniciais.faltas,
                faltasEHorasExtrasIniciais.horasExtras, // Passar horas extras
            );
            console.log(
                `✅ PASSO 3/3 CONCLUÍDO: Grade gerada com pontos fictícios`,
            );

            console.log(`\n${"=".repeat(60)}`);
            console.log(`✅ [INIT] CARREGAMENTO INICIAL CONCLUÍDO COM SUCESSO`);
            console.log(`   - Obras: ${obrasData.length}`);
            console.log(`   - Utilizadores: ${utilizadoresComHorario.length}`);
            console.log(`   - Feriados: ${feriadosIniciais.size}`);
            console.log(
                `   - Faltas: ${faltasEHorasExtrasIniciais.faltas.length}`,
            );
            console.log(
                `   - Horas Extras: ${faltasEHorasExtrasIniciais.horasExtras.length}`,
            );
            console.log(
                `   - ORDEM GARANTIDA: Feriados → Faltas/Horas Extras → Pontos Fictícios`,
            );
            console.log(`${"=".repeat(60)}\n`);
        } catch (error) {
            console.error("❌ [INIT] Erro ao carregar dados iniciais:", error);
            Alert.alert("Erro", "Erro ao carregar dados iniciais");
            // Garantir que os dados ficam limpos em caso de erro
            setDadosGrade([]);
            setFeriados(new Set());
            feriadosRef.current = new Set();
            setFaltas([]);
            faltasRef.current = [];
            setHorasExtras([]);
            horasExtrasRef.current = [];
        } finally {
            setLoading(false);
        }
    };

    // ✅ NOVO: Versão especial para carregamento inicial (recebe todos os dados como parâmetro)
    const gerarGradeComDadosValidadosInicial = async (
        utilizadoresList,
        horariosMap,
        feriadosSet,
        faltasList,
        horasExtrasList,
    ) => {
        console.log(`🔍 [GRADE-INIT] Gerando grade inicial...`);
        console.log(`   - Utilizadores: ${utilizadoresList.length}`);
        console.log(`   - Feriados: ${feriadosSet.size}`);
        console.log(`   - Faltas: ${faltasList.length}`);
        console.log(`   - Horas Extras: ${horasExtrasList.length}`);

        // Converter mês/ano para números
        const mesNum = parseInt(mesSelecionado);
        const anoNum = parseInt(anoSelecionado);

        console.log(`🔍 [GRADE-INIT] Filtros: Mês=${mesNum}, Ano=${anoNum}`);

        // Filtrar faltas para o mês/ano selecionado
        const faltasDoMes = faltasList.filter((falta) => {
            const dataFalta = new Date(falta.Data);
            const mesData = dataFalta.getMonth() + 1;
            const anoData = dataFalta.getFullYear();
            return mesData === mesNum && anoData === anoNum;
        });

        console.log(`📋 [GRADE-INIT] Faltas do mês: ${faltasDoMes.length}`);

        // Filtrar horas extras para o mês/ano selecionado
        const horasExtrasDoMes = horasExtrasList.filter((he) => {
            const dataHE = new Date(he.Data);
            const mesData = dataHE.getMonth() + 1;
            const anoData = dataHE.getFullYear();
            return mesData === mesNum && anoData === anoNum;
        });

        console.log(
            `📋 [GRADE-INIT] Horas Extras do mês: ${horasExtrasDoMes.length}`,
        );

        const diasDoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
        const hoje = new Date();
        const dadosGradeTemp = [];

        utilizadoresList.forEach((user) => {
            const dadosUsuario = {
                utilizador: user,
                estatisticasDias: {},
                totalHorasMes: 0,
                diasTrabalhados: 0,
                faltasTotal: 0,
                feriadosTotal: 0,
                horasExtrasTotal: 0, // Adicionar total de horas extras
            };

            const faltasDoUser = faltasDoMes.filter(
                (f) => f.userId === user.id,
            );
            const horasExtrasDoUser = horasExtrasDoMes.filter((he) => {
                return (
                    he.Funcionario === user.nome ||
                    he.Funcionario === user.codFuncionario
                );
            });

            if (horasExtrasDoUser.length > 0) {
                horasExtrasDoUser.forEach((he) => {
                    dadosUsuario.horasExtrasTotal += parseFloat(he.Horas);
                });
            }

            for (let dia = 1; dia <= diasDoMes; dia++) {
                const dataAtual = new Date(
                    anoSelecionado,
                    mesSelecionado - 1,
                    dia,
                );
                const diaSemana = dataAtual.getDay();
                const isWeekend = diaSemana === 0 || diaSemana === 6;
                const isFutureDate = dataAtual > hoje;

                const dataISO = fmtLocal(dataAtual);
                const isFeriado = feriadosSet.has(dataISO);

                const faltasDoDia = faltasDoUser.filter((falta) => {
                    const df = new Date(falta.Data);
                    return df.getDate() === dia;
                });

                let estatisticasDia = {
                    dia,
                    diaSemana,
                    isWeekend,
                    isFutureDate,
                    isFeriado,
                    faltas: faltasDoDia,
                    temFalta: faltasDoDia.length > 0,
                    trabalhou: false,
                    horasExtras: 0, // Horas extras do dia
                };

                // ✅ PRIORIDADE 1: FALTAS
                if (faltasDoDia.length > 0) {
                    estatisticasDia.trabalhou = false;
                    estatisticasDia.temFalta = true;
                    estatisticasDia.faltas = faltasDoDia;
                    dadosUsuario.faltasTotal++;
                }
                // ✅ PRIORIDADE 2: FERIADOS
                else if (isFeriado) {
                    estatisticasDia.trabalhou = false;
                    dadosUsuario.feriadosTotal++;
                }
                // ✅ PRIORIDADE 3: FIM DE SEMANA
                else if (isWeekend) {
                    estatisticasDia.trabalhou = false;
                }
                // ✅ PRIORIDADE 4: FUTURO
                else if (isFutureDate) {
                    estatisticasDia.trabalhou = false;
                }
                // ✅ PRIORIDADE 5: DIA ÚTIL
                else {
                    const isHoje =
                        dataAtual.toDateString() === hoje.toDateString();
                    const horaAtual = isHoje
                        ? `${String(hoje.getHours()).padStart(2, "0")}:${String(hoje.getMinutes()).padStart(2, "0")}`
                        : null;

                    // Verificar horas extras para o dia específico
                    const horasExtrasDia = horasExtrasDoUser.find((he) => {
                        const dataHE = new Date(he.Data);
                        return dataHE.getDate() === dia;
                    });

                    const horasExtras = horasExtrasDia
                        ? parseFloat(horasExtrasDia.Horas)
                        : 0;

                    // Gerar pontos fictícios COM horas extras integradas
                    const pontosFicticios = gerarPontosFicticiosComHorario(
                        user.id,
                        dia,
                        isHoje,
                        horaAtual,
                        horariosMap,
                        horasExtras,
                    );
                    Object.assign(estatisticasDia, pontosFicticios);
                    estatisticasDia.trabalhou = true;

                    if (pontosFicticios.temSaida) {
                        // Calcular horas reais baseadas nos timestamps gerados (com variações)
                        const intervaloAlmoco = horariosMap[user.id]?.intervaloAlmoco || 1.0;
                        const horasDia = calcularHorasTrabalhadasReais(pontosFicticios, intervaloAlmoco);
                        dadosUsuario.totalHorasMes += horasDia;
                        dadosUsuario.diasTrabalhados++;
                    } else {
                        dadosUsuario.diasTrabalhados += 0.5;
                    }
                }

                dadosUsuario.estatisticasDias[dia] = estatisticasDia;
            }

            // Adicionar horas extras ao total do mês do utilizador
            dadosUsuario.totalHorasMes += dadosUsuario.horasExtrasTotal;

            dadosGradeTemp.push(dadosUsuario);
        });

        console.log(
            `✅ [GRADE-INIT] Grade gerada: ${dadosGradeTemp.length} utilizadores`,
        );
        setDadosGrade(dadosGradeTemp);
    };

    const extrairHoraMinuto = (horaStr) => {
        if (!horaStr) return null;

        if (
            typeof horaStr === "string" &&
            (horaStr.includes("T") || horaStr.includes("-"))
        ) {
            try {
                const data = new Date(horaStr);
                const horas = String(data.getUTCHours()).padStart(2, "0");
                const minutos = String(data.getUTCMinutes()).padStart(2, "0");
                return `${horas}:${minutos}`;
            } catch (e) {
                console.warn("Erro ao converter hora ISO:", horaStr, e);
                return null;
            }
        }

        const partes = String(horaStr).split(":");
        if (partes.length >= 2) {
            return `${partes[0].padStart(2, "0")}:${partes[1].padStart(2, "0")}`;
        }

        return null;
    };

    // Helper para formatar horas decimais em formato "Xh Ymin"
    const formatarHorasParaExibicao = (horasDecimais) => {
        if (!horasDecimais || horasDecimais === 0) return '0h';

        const horas = Math.floor(horasDecimais);
        const minutos = Math.round((horasDecimais - horas) * 60);

        if (minutos === 0) {
            return `${horas}h`;
        } else if (horas === 0) {
            return `${minutos}min`;
        } else {
            return `${horas}h ${minutos}min`;
        }
    };

    // Helper para calcular horas trabalhadas a partir dos timestamps gerados
    const calcularHorasTrabalhadasReais = (pontosFicticios, intervaloAlmoco = 1.0) => {
        if (!pontosFicticios.horaEntrada || !pontosFicticios.horaSaida) {
            return 0;
        }

        // Converter strings "HH:MM" para minutos totais
        const horaParaMinutos = (horaStr) => {
            const [h, m] = horaStr.split(':').map(Number);
            return h * 60 + m;
        };

        const minutosEntrada = horaParaMinutos(pontosFicticios.horaEntrada);
        const minutosSaida = horaParaMinutos(pontosFicticios.horaSaida);
        const minutosIntervalo = intervaloAlmoco * 60;

        // Total de minutos trabalhados (excluindo intervalo de almoço)
        const minutosTrabalhados = minutosSaida - minutosEntrada - minutosIntervalo;

        // Converter para horas decimais
        return minutosTrabalhados / 60;
    };

    const carregarHorariosUtilizadores = async (utilizadores) => {
        try {
            const token = secureStorage.getItem("loginToken");
            const horariosMap = {};
            const utilizadoresComHorario = [];

            console.log(
                `🔍 [HORARIOS] Carregando horários para ${utilizadores.length} utilizadores...`,
            );

            const promises = utilizadores.map(async (user) => {
                try {
                    const res = await fetch(
                        `https://backend.advir.pt/api/horarios/user/${user.id}`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        },
                    );

                    if (res.ok) {
                        const planoHorario = await res.json();
                        const horarioData =
                            planoHorario?.Horario || planoHorario;

                        if (
                            planoHorario &&
                            planoHorario.ativo === true &&
                            horarioData
                        ) {
                            const horaEntrada =
                                extrairHoraMinuto(horarioData.horaEntrada) ||
                                "08:00";
                            const horaSaida =
                                extrairHoraMinuto(horarioData.horaSaida) ||
                                "17:00";

                            return {
                                user: user,
                                userId: user.id,
                                userName: user.nome,
                                horario: {
                                    horaEntrada: horaEntrada,
                                    horaSaida: horaSaida,
                                    intervaloAlmoco:
                                        parseFloat(
                                            horarioData.intervaloAlmoco,
                                        ) || 1.0,
                                    horasPorDia:
                                        parseFloat(horarioData.horasPorDia) ||
                                        8.0,
                                },
                                encontrado: true,
                                planoAtivo: true,
                            };
                        } else {
                            return {
                                user: user,
                                userId: user.id,
                                userName: user.nome,
                                horario: null,
                                encontrado: false,
                                planoAtivo: false,
                            };
                        }
                    } else {
                        return {
                            user: user,
                            userId: user.id,
                            userName: user.nome,
                            horario: null,
                            encontrado: false,
                            planoAtivo: false,
                        };
                    }
                } catch (error) {
                    console.error(
                        `❌ [HORARIOS] Erro ao carregar ${user.nome}:`,
                        error.message,
                    );
                    return {
                        user: user,
                        userId: user.id,
                        userName: user.nome,
                        horario: null,
                        encontrado: false,
                        planoAtivo: false,
                    };
                }
            });

            const resultados = await Promise.all(promises);

            resultados.forEach((resultado) => {
                if (resultado.planoAtivo && resultado.horario) {
                    horariosMap[resultado.userId] = resultado.horario;
                    utilizadoresComHorario.push(resultado.user);
                }
            });

            const comHorario = resultados.filter((r) => r.planoAtivo).length;
            console.log(
                `✅ [HORARIOS] ${comHorario} utilizadores com plano ativo`,
            );

            return { utilizadoresComHorario, horariosMap };
        } catch (error) {
            console.error("❌ [HORARIOS] Erro geral:", error);
            return { utilizadoresComHorario: [], horariosMap: {} };
        }
    };

    // ✅ Função auxiliar para adicionar variação aleatória ao horário
    const adicionarVariacaoHorario = (
        horaStr,
        variacaoMinutosMin,
        variacaoMinutosMax,
    ) => {
        const [horas, minutos] = horaStr.split(":").map(Number);
        const totalMinutos = horas * 60 + minutos;

        // Gerar variação aleatória entre min e max
        const variacao =
            Math.floor(
                Math.random() * (variacaoMinutosMax - variacaoMinutosMin + 1),
            ) + variacaoMinutosMin;
        const novosMinutos = totalMinutos + variacao;

        const novasHoras = Math.floor(novosMinutos / 60);
        const novosMinutosRestantes = novosMinutos % 60;

        return `${String(novasHoras).padStart(2, "0")}:${String(novosMinutosRestantes).padStart(2, "0")}`;
    };

    const gerarPontosFicticiosComHorario = (
        userId,
        dia,
        isHoje,
        horaAtual,
        horariosMap,
        horasExtras = 0,
    ) => {
        const horario = horariosMap[userId] || {
            horaEntrada: "08:00",
            horaSaida: "17:00",
            intervaloAlmoco: 1.0,
            horasPorDia: 8.0,
        };

        const pontos = {
            horaEntrada: null,
            saidaAlmoco: null,
            entradaAlmoco: null,
            horaSaida: null,
            temSaida: false,
            totalHoras: null,
        };

        // Se for hoje e ainda não passou da hora de entrada, não mostrar ponto
        if (isHoje && horaAtual < horario.horaEntrada) {
            return pontos;
        }

        // ✅ Entrada com variação de -2 a +5 minutos (ex: 08:00 -> 07:58 a 08:05)
        pontos.horaEntrada = adicionarVariacaoHorario(
            horario.horaEntrada,
            -2,
            5,
        );

        // ✅ NOVO: Calcular horários de almoço de forma inteligente
        const [entradaH, entradaM] = horario.horaEntrada.split(":").map(Number);
        const [saidaH, saidaM] = horario.horaSaida.split(":").map(Number);

        const minutosEntrada = entradaH * 60 + entradaM;
        const minutosSaida = saidaH * 60 + saidaM;
        const minutosIntervalo = horario.intervaloAlmoco * 60;

        // Calcular horário ideal de saída para almoço
        // 8h às 17h (9h no local com 1h almoço = 8h trabalho) -> almoço às 12:30 (4.5h após entrada)
        // 9h às 18h (9h no local com 1h almoço = 8h trabalho) -> almoço às 13:30 (4.5h após entrada)
        // Lógica: almoço começa na metade do tempo total no local (entrada até saída)
        const totalMinutosNoLocal = minutosSaida - minutosEntrada;
        const minutosAteAlmoco = totalMinutosNoLocal / 2;

        const minutosSaidaAlmoco = minutosEntrada + minutosAteAlmoco;
        const saidaAlmocoH = Math.floor(minutosSaidaAlmoco / 60);
        const saidaAlmocoM = minutosSaidaAlmoco % 60;
        const saidaAlmocoBase = `${String(saidaAlmocoH).padStart(2, "0")}:${String(saidaAlmocoM).padStart(2, "0")}`;

        // ✅ Saída para almoço com variação de -2 a +5 minutos (só se já passou da hora)
        const saidaAlmocoGerada = adicionarVariacaoHorario(saidaAlmocoBase, -2, 5);
        if (!isHoje || (isHoje && horaAtual >= saidaAlmocoBase)) {
            pontos.saidaAlmoco = saidaAlmocoGerada;
        }

        // Calcular entrada do almoço (saída + intervalo)
        const minutosEntradaAlmoco = minutosSaidaAlmoco + minutosIntervalo;
        const entradaAlmocoH = Math.floor(minutosEntradaAlmoco / 60);
        const entradaAlmocoM = minutosEntradaAlmoco % 60;
        const entradaAlmocoBase = `${String(entradaAlmocoH).padStart(2, "0")}:${String(entradaAlmocoM).padStart(2, "0")}`;

        // ✅ Entrada do almoço com variação de -2 a +5 minutos (só se já passou da hora)
        const entradaAlmocoGerada = adicionarVariacaoHorario(
            entradaAlmocoBase,
            -2,
            5,
        );
        if (!isHoje || (isHoje && horaAtual >= entradaAlmocoBase)) {
            pontos.entradaAlmoco = entradaAlmocoGerada;
        }

        // Se for dia passado ou hoje após hora de saída, mostrar saída
        if (!isHoje || (isHoje && horaAtual >= horario.horaSaida)) {
            // ✅ Saída base com variação de +1 a +10 minutos (ex: 17:00 -> 17:01 a 17:10)
            let horaSaidaFicticia = adicionarVariacaoHorario(
                horario.horaSaida,
                1,
                10,
            );

            // ✅ ADICIONAR HORAS EXTRAS ao horário de saída (empurrar para frente)
            if (horasExtras > 0) {
                const minutosExtras = Math.round(horasExtras * 60); // Converter horas em minutos
                horaSaidaFicticia = adicionarVariacaoHorario(
                    horaSaidaFicticia,
                    minutosExtras,
                    minutosExtras,
                );
            }

            pontos.horaSaida = horaSaidaFicticia;
            pontos.temSaida = true;
            pontos.totalHoras = horario.horasPorDia;
        }

        return pontos;
    };

    const gerarPontosFicticios = (
        userId,
        dia,
        isHoje,
        horaAtual,
        horasExtras = 0,
    ) => {
        return gerarPontosFicticiosComHorario(
            userId,
            dia,
            isHoje,
            horaAtual,
            horariosRef.current,
            horasExtras,
        );
    };

    const getCellStyle = (estatisticas) => {
        if (!estatisticas) return styles.cellEmpty;

        // 1º FALTAS (prioridade absoluta)
        if (estatisticas.temFalta) return styles.cellFalta;
        // 2º FERIADOS
        if (estatisticas.isFeriado)
            return styles.cellFeriado || styles.cellWeekend;
        // 3º FIM DE SEMANA
        if (estatisticas.isWeekend) return styles.cellWeekend;
        // 4º FUTURO
        if (estatisticas.isFutureDate) return styles.cellFuture;

        if (estatisticas.trabalhou) {
            return styles.cellTrabalhou;
        }

        return styles.cellEmpty;
    };

    const getCellText = (estatisticas) => {
        if (!estatisticas || estatisticas.isWeekend) return "";

        if (estatisticas.temFalta) return "FALTA";
        if (estatisticas.isFeriado) return "FERIADO";
        if (estatisticas.isFutureDate) return "";

        if (estatisticas.trabalhou) {
            let cellValue = "";

            if (estatisticas.horaEntrada) {
                cellValue = `${estatisticas.horaEntrada}`;
                if (estatisticas.saidaAlmoco) {
                    cellValue += `\n${estatisticas.saidaAlmoco}`;
                }
                if (estatisticas.entradaAlmoco) {
                    cellValue += `\n${estatisticas.entradaAlmoco}`;
                }
                if (estatisticas.horaSaida) {
                    cellValue += `\n${estatisticas.horaSaida}`;
                } else {
                    cellValue += `\n---`;
                }
            }

            return cellValue;
        }

        return "";
    };

    const exportarPicagensParaExcel = () => {
        if (!dadosGrade.length) {
            Alert.alert("Aviso", "Não há dados para exportar");
            return;
        }

        try {
            const workbook = XLSX.utils.book_new();
            const diasDoMes = new Date(
                anoSelecionado,
                mesSelecionado,
                0,
            ).getDate();
            const dias = Array.from({ length: diasDoMes }, (_, i) => i + 1);
            const obraNome = obraSelecionada
                ? obras.find((obra) => obra.id.toString() === obraSelecionada)
                      ?.nome || "Obra não encontrada"
                : "Todas as Obras";

            const dadosExport = [];

            dadosExport.push([
                "RELATÓRIO DE ANÁLISE COMPLETA DE REGISTOS DE PONTO",
            ]);
            dadosExport.push([""]);
            dadosExport.push([
                "📅 PERÍODO:",
                `${meses[mesSelecionado - 1]} de ${anoSelecionado}`,
            ]);
            dadosExport.push(["🏢 OBRA:", obraNome]);
            dadosExport.push([
                "👥 FUNCIONÁRIOS:",
                `${dadosGrade.length} utilizadores`,
            ]);
            dadosExport.push([
                "📊 DATA GERAÇÃO:",
                new Date().toLocaleString("pt-PT"),
            ]);
            dadosExport.push([""]);
            dadosExport.push([""]);

            dadosExport.push(["📋 LEGENDA:"]);
            dadosExport.push([
                "",
                "✅ Registo Normal",
                "- Horário de entrada e saída",
            ]);
            dadosExport.push(["", "❌ FALTA", "- Ausência registada"]);
            dadosExport.push([
                "",
                "🎉 FERIADO",
                "- Feriado nacional/municipal",
            ]);
            dadosExport.push(["", "📅 FDS", "- Fim de semana"]);
            dadosExport.push(["", "🔄 Em curso", "- Apenas entrada registada"]);
            dadosExport.push([""]);
            dadosExport.push([""]);

            const headerRow = ["FUNCIONÁRIO"];

            dias.forEach((dia) => {
                const dataCompleta = new Date(
                    anoSelecionado,
                    mesSelecionado - 1,
                    dia,
                );
                const diaSemana = dataCompleta
                    .toLocaleDateString("pt-PT", { weekday: "short" })
                    .toUpperCase();
                headerRow.push(`${dia}\n${diaSemana}`);
            });

            headerRow.push(
                "TOTAL\nHORAS",
                "DIAS\nTRABALHADOS",
                "TOTAL\nFALTAS",
                "TOTAL\nFERIADOS",
                "TOTAL\nHORAS EXTRAS",
            );
            dadosExport.push(headerRow);

            dadosGrade.forEach((dadosUsuario) => {
                const row = [dadosUsuario.utilizador.nome];

                dias.forEach((dia) => {
                    const estatisticas = dadosUsuario.estatisticasDias[dia];
                    let cellValue = "";

                    if (estatisticas) {
                        if (estatisticas.temFalta) {
                            cellValue = "❌ FALTA";
                        } else if (estatisticas.isFeriado) {
                            cellValue = "🎉 FERIADO";
                        } else if (estatisticas.isWeekend) {
                            cellValue = "📅 FDS";
                        } else if (estatisticas.isFutureDate) {
                            cellValue = "";
                        } else if (estatisticas.trabalhou) {
                            cellValue = `✅ E: ${estatisticas.horaEntrada}`;

                            if (estatisticas.saidaAlmoco) {
                                cellValue += `\n S: ${estatisticas.saidaAlmoco}`;
                            }

                            if (estatisticas.entradaAlmoco) {
                                cellValue += `\n E: ${estatisticas.entradaAlmoco}`;
                            }

                            cellValue += `\n S: ${estatisticas.horaSaida}`;
                        }
                    }

                    row.push(cellValue);
                });

                row.push(
                    formatarHorasParaExibicao(dadosUsuario.totalHorasMes),
                    `${dadosUsuario.diasTrabalhados} dias`,
                    `${dadosUsuario.faltasTotal} faltas`,
                    `${dadosUsuario.feriadosTotal} feriados`,
                    `${formatarHorasParaExibicao(dadosUsuario.horasExtrasTotal)} extras`,
                );

                dadosExport.push(row);
            });

            const separatorRow = Array(headerRow.length).fill("═══════════");
            dadosExport.push(separatorRow);

            const totalHorasTodos = dadosGrade.reduce(
                (sum, user) => sum + user.totalHorasMes,
                0,
            );
            const totalDiasTodos = dadosGrade.reduce(
                (sum, user) => sum + user.diasTrabalhados,
                0,
            );
            const totalFaltasTodos = dadosGrade.reduce(
                (sum, user) => sum + user.faltasTotal,
                0,
            );
            const totalFeriadosTodos = dadosGrade.reduce(
                (sum, user) => sum + user.feriadosTotal,
                0,
            );
            const totalHorasExtrasTodos = dadosGrade.reduce(
                (sum, user) => sum + user.horasExtrasTotal,
                0,
            );
            const mediaHorasPorFuncionario = (
                totalHorasTodos / dadosGrade.length
            ).toFixed(1);
            const mediaDiasPorFuncionario = (
                totalDiasTodos / dadosGrade.length
            ).toFixed(1);

            dadosExport.push(["📊 RESUMO ESTATÍSTICO"]);
            dadosExport.push([""]);

            const resumoRow = Array(dias.length + 1).fill("");
            resumoRow[0] = "TOTAIS GERAIS:";
            resumoRow[resumoRow.length - 5] = formatarHorasParaExibicao(totalHorasTodos);
            resumoRow[resumoRow.length - 4] = `${totalDiasTodos} dias`;
            resumoRow[resumoRow.length - 3] = `${totalFaltasTodos} faltas`;
            resumoRow[resumoRow.length - 2] = `${totalFeriadosTodos} feriados`;
            resumoRow[resumoRow.length - 1] =
                `${formatarHorasParaExibicao(totalHorasExtrasTodos)} extras`;
            dadosExport.push(resumoRow);

            const mediaRow = Array(dias.length + 1).fill("");
            mediaRow[0] = "MÉDIAS POR FUNCIONÁRIO:";
            mediaRow[mediaRow.length - 5] = formatarHorasParaExibicao(mediaHorasPorFuncionario);
            mediaRow[mediaRow.length - 4] = `${mediaDiasPorFuncionario} dias`;
            mediaRow[mediaRow.length - 3] =
                `${(totalFaltasTodos / dadosGrade.length).toFixed(1)} faltas`;
            mediaRow[mediaRow.length - 2] =
                `${(totalFeriadosTodos / dadosGrade.length).toFixed(1)} feriados`;
            mediaRow[mediaRow.length - 1] =
                `${(totalHorasExtrasTodos / dadosGrade.length).toFixed(2)}h extras`;
            dadosExport.push(mediaRow);

            dadosExport.push([""]);
            dadosExport.push(["📈 ANÁLISE DETALHADA:"]);

            const funcionariosComMaisFaltas = dadosGrade
                .filter((user) => user.faltasTotal > 0)
                .sort((a, b) => b.faltasTotal - a.faltasTotal)
                .slice(0, 5);

            if (funcionariosComMaisFaltas.length > 0) {
                dadosExport.push([""]);
                dadosExport.push(["🚨 TOP 5 - FUNCIONÁRIOS COM MAIS FALTAS:"]);
                funcionariosComMaisFaltas.forEach((user, index) => {
                    dadosExport.push([
                        `${index + 1}. ${user.utilizador.nome}`,
                        "",
                        "",
                        "",
                        `${user.faltasTotal} faltas`,
                    ]);
                });
            }

            const funcionariosComMaisHoras = dadosGrade
                .sort((a, b) => b.totalHorasMes - a.totalHorasMes)
                .slice(0, 5);

            dadosExport.push([""]);
            dadosExport.push(["⭐ TOP 5 - FUNCIONÁRIOS COM MAIS HORAS:"]);
            funcionariosComMaisHoras.forEach((user, index) => {
                dadosExport.push([
                    `${index + 1}. ${user.utilizador.nome}`,
                    "",
                    "",
                    "",
                    formatarHorasParaExibicao(user.totalHorasMes),
                ]);
            });

            const funcionariosComMaisHorasExtras = dadosGrade
                .sort((a, b) => b.horasExtrasTotal - a.horasExtrasTotal)
                .slice(0, 5);

            if (funcionariosComMaisHorasExtras.length > 0) {
                dadosExport.push([""]);
                dadosExport.push([
                    "🚀 TOP 5 - FUNCIONÁRIOS COM MAIS HORAS EXTRAS:",
                ]);
                funcionariosComMaisHorasExtras.forEach((user, index) => {
                    dadosExport.push([
                        `${index + 1}. ${user.utilizador.nome}`,
                        "",
                        "",
                        "",
                        `${formatarHorasParaExibicao(user.horasExtrasTotal)} extras`,
                    ]);
                });
            }

            const worksheet = XLSX.utils.aoa_to_sheet(dadosExport);

            const colWidths = [{ wch: 25 }];
            dias.forEach(() => colWidths.push({ wch: 14 }));
            colWidths.push(
                { wch: 12 },
                { wch: 15 },
                { wch: 12 },
                { wch: 12 },
                { wch: 15 },
            );

            worksheet["!cols"] = colWidths;

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Análise Completa",
            );

            // Resumo Executivo
            const resumoExecutivo = [
                ["RESUMO EXECUTIVO - ASSIDUIDADE"],
                [""],
                ["OBRA:", obraNome],
                ["PERÍODO:", `${meses[mesSelecionado - 1]} ${anoSelecionado}`],
                [""],
                ["INDICADORES PRINCIPAIS:"],
                [""],
                ["👥 Total de Funcionários:", dadosGrade.length],
                [
                    "⏰ Total de Horas Trabalhadas (incl. extras):",
                    formatarHorasParaExibicao(totalHorasTodos),
                ],
                ["📅 Total de Dias Trabalhados:", totalDiasTodos],
                ["❌ Total de Faltas:", totalFaltasTodos],
                ["🎉 Total de Feriados:", totalFeriadosTodos],
                [
                    "🚀 Total de Horas Extras:",
                    formatarHorasParaExibicao(totalHorasExtrasTodos),
                ],
                [""],
                ["MÉDIAS:"],
                [""],
                ["⏰ Horas por Funcionário:", formatarHorasParaExibicao(mediaHorasPorFuncionario)],
                ["📅 Dias por Funcionário:", `${mediaDiasPorFuncionario} dias`],
                [
                    "❌ Faltas por Funcionário:",
                    `${(totalFaltasTodos / dadosGrade.length).toFixed(1)}`,
                ],
                [
                    "🎉 Feriados por Funcionário:",
                    `${(totalFeriadosTodos / dadosGrade.length).toFixed(1)}`,
                ],
                [
                    "🚀 Horas Extras por Funcionário:",
                    `${(totalHorasExtrasTodos / dadosGrade.length).toFixed(2)}h`,
                ],
                [""],
                ["TAXA DE ASSIDUIDADE:"],
                [""],
                [
                    "🎯 Taxa Geral:",
                    `${((totalDiasTodos / (dadosGrade.length * diasDoMes)) * 100 || 0).toFixed(1)}%`,
                ],
            ];

            const worksheetResumo = XLSX.utils.aoa_to_sheet(resumoExecutivo);
            worksheetResumo["!cols"] = [{ wch: 30 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(
                workbook,
                worksheetResumo,
                "Resumo Executivo",
            );

            const dataAtual = new Date().toISOString().split("T")[0];
            const fileName = `Analise_Completa_Registos_${obraNome.replace(/[^a-zA-Z0-9]/g, "_")}_${meses[mesSelecionado - 1]}_${anoSelecionado}_${dataAtual}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            Alert.alert(
                "✅ Exportação Concluída",
                `Relatório completo exportado com sucesso!\n\n📁 Arquivo: ${fileName}\n📊 ${dadosGrade.length} funcionários analisados\n⏰ ${formatarHorasParaExibicao(totalHorasTodos)} totais registadas`,
            );
        } catch (error) {
            console.error("Erro ao exportar para Excel:", error);
            Alert.alert(
                "❌ Erro na Exportação",
                "Ocorreu um erro ao gerar o relatório Excel. Tente novamente.",
            );
        }
    };

    const renderGradeHeader = () => {
        const diasDoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
        const dias = Array.from({ length: diasDoMes }, (_, i) => i + 1);

        return (
            <View style={styles.headerRow}>
                <View style={styles.headerCell}>
                    <Text style={styles.headerText}>Funcionário</Text>
                </View>
                {dias.map((dia) => (
                    <View key={dia} style={styles.dayHeaderCell}>
                        <Text style={styles.dayHeaderText}>{dia}</Text>
                    </View>
                ))}
                <View style={styles.totalHeaderCell}>
                    <Text style={styles.headerText}>Total</Text>
                </View>
            </View>
        );
    };

    const renderGradeRow = (dadosUsuario, index) => {
        const diasDoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
        const dias = Array.from({ length: diasDoMes }, (_, i) => i + 1);

        return (
            <View key={dadosUsuario.utilizador.id} style={styles.gradeRow}>
                <View style={styles.userCell}>
                    <Text style={styles.userText} numberOfLines={2}>
                        {dadosUsuario.utilizador.nome}
                    </Text>
                </View>

                {dias.map((dia) => {
                    const estatisticas = dadosUsuario.estatisticasDias[dia];

                    return (
                        <TouchableOpacity
                            key={dia}
                            style={[styles.dayCell, getCellStyle(estatisticas)]}
                            onPress={() => {
                                if (estatisticas && estatisticas.trabalhou) {
                                    let mensagem =
                                        `Funcionário: ${dadosUsuario.utilizador.nome}\n` +
                                        `Dia: ${dia}/${mesSelecionado}/${anoSelecionado}\n` +
                                        `Entrada: ${estatisticas.horaEntrada}\n` +
                                        (estatisticas.saidaAlmoco
                                            ? `Saída Almoço: ${estatisticas.saidaAlmoco}\n`
                                            : "") +
                                        (estatisticas.entradaAlmoco
                                            ? `Entrada Almoço: ${estatisticas.entradaAlmoco}\n`
                                            : "") +
                                        `Saída: ${estatisticas.horaSaida || "Em curso"}\n` +
                                        (estatisticas.totalHoras
                                            ? `Total Horas: ${estatisticas.totalHoras}h`
                                            : "Dia em curso");

                                    Alert.alert("Detalhes do Dia", mensagem);
                                } else if (
                                    estatisticas &&
                                    estatisticas.temFalta
                                ) {
                                    Alert.alert(
                                        "Detalhes do Dia",
                                        `Funcionário: ${dadosUsuario.utilizador.nome}\n` +
                                            `Dia: ${dia}/${mesSelecionado}/${anoSelecionado}\n` +
                                            `Motivo: FALTA`,
                                    );
                                } else if (
                                    estatisticas &&
                                    estatisticas.isFeriado
                                ) {
                                    Alert.alert(
                                        "Detalhes do Dia",
                                        `Funcionário: ${dadosUsuario.utilizador.nome}\n` +
                                            `Dia: ${dia}/${mesSelecionado}/${anoSelecionado}\n` +
                                            `Motivo: FERIADO`,
                                    );
                                }
                            }}
                        >
                            <Text style={styles.dayCellText}>
                                {getCellText(estatisticas)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}

                <View style={styles.totalCell}>
                    <Text style={styles.totalText}>
                        {formatarHorasParaExibicao(dadosUsuario.totalHorasMes)}
                    </Text>
                    <Text style={styles.totalSubText}>
                        {dadosUsuario.diasTrabalhados} dias
                    </Text>
                    {dadosUsuario.horasExtrasTotal > 0 && (
                        <Text style={styles.totalSubTextExtra}>
                            +{formatarHorasParaExibicao(dadosUsuario.horasExtrasTotal)} extras
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <LinearGradient
            colors={["#e3f2fd", "#bbdefb", "#90caf9"]}
            style={styles.container}
        >
            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <MaterialCommunityIcons
                        name="chart-timeline-variant"
                        size={28}
                        color="#1792FE"
                    />
                    <Text style={styles.headerTitle}>
                        Registos de Ponto - Análise Completa
                    </Text>
                </View>

                <View style={styles.filtersCard}>
                    <Text style={styles.filtersTitle}>Filtros de Pesquisa</Text>

                    <View style={styles.filterRow}>
                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>Obra</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={obraSelecionada}
                                    onValueChange={setObraSelecionada}
                                    style={styles.picker}
                                >
                                    <Picker.Item
                                        label="Todas as Obras"
                                        value=""
                                    />
                                    {obras.map((obra) => (
                                        <Picker.Item
                                            key={obra.id}
                                            label={obra.nome}
                                            value={obra.id.toString()}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>Mês</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={mesSelecionado}
                                    onValueChange={setMesSelecionado}
                                    style={styles.picker}
                                >
                                    {meses.map((mes, index) => (
                                        <Picker.Item
                                            key={index}
                                            label={mes}
                                            value={index + 1}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.filterItem}>
                            <Text style={styles.filterLabel}>Ano</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={anoSelecionado}
                                    onValueChange={setAnoSelecionado}
                                    style={styles.picker}
                                >
                                    {anos.map((ano) => (
                                        <Picker.Item
                                            key={ano}
                                            label={ano.toString()}
                                            value={ano}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.legendCard}>
                    <Text style={styles.legendTitle}>Legenda</Text>
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                            <View
                                style={[
                                    styles.legendColor,
                                    styles.cellTrabalhou,
                                ]}
                            />
                            <Text style={styles.legendText}>
                                Registos de Entrada/Saída
                            </Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View
                                style={[styles.legendColor, styles.cellFalta]}
                            />
                            <Text style={styles.legendText}>Falta</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View
                                style={[
                                    styles.legendColor,
                                    styles.cellFeriado || styles.cellWeekend,
                                ]}
                            />
                            <Text style={styles.legendText}>Feriado</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View
                                style={[styles.legendColor, styles.cellWeekend]}
                            />
                            <Text style={styles.legendText}>Fim de semana</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View
                                style={[styles.legendColor, styles.cellFuture]}
                            />
                            <Text style={styles.legendText}>Dias futuros</Text>
                        </View>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#1792FE" />
                        <Text style={styles.loadingText}>
                            A carregar dados...
                        </Text>
                    </View>
                ) : dadosGrade.length > 0 ? (
                    <View style={styles.gradeCard}>
                        <View style={styles.gradeHeader}>
                            <Text style={styles.gradeTitle}>
                                Grade Mensal - {meses[mesSelecionado - 1]}{" "}
                                {anoSelecionado} -{" "}
                                {obraSelecionada
                                    ? obras.find(
                                          (o) =>
                                              o.id.toString() ===
                                              obraSelecionada,
                                      )?.nome
                                    : "Todas as Obras"}
                            </Text>
                            <View style={styles.buttonGroup}>
                                <TouchableOpacity
                                    style={styles.refreshButton}
                                    onPress={async () => {
                                        console.log(
                                            `🔄 [BTN-ATUALIZAR] Botão Atualizar pressionado`,
                                        );

                                        // Recarregar imediatamente sem confirmação para debug
                                        await recarregarDadosPeriodo();
                                    }}
                                    disabled={loading}
                                >
                                    <LinearGradient
                                        colors={
                                            loading
                                                ? ["#6c757d", "#495057"]
                                                : ["#007bff", "#0056b3"]
                                        }
                                        style={styles.refreshButtonGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <MaterialCommunityIcons
                                            name={
                                                loading ? "loading" : "refresh"
                                            }
                                            size={18}
                                            color="#fff"
                                        />
                                        <Text style={styles.refreshButtonText}>
                                            {loading
                                                ? "A carregar..."
                                                : "Atualizar"}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.exportButton}
                                    onPress={exportarPicagensParaExcel}
                                >
                                    <LinearGradient
                                        colors={["#28a745", "#20c997"]}
                                        style={styles.exportButtonGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <MaterialCommunityIcons
                                            name="file-excel"
                                            size={20}
                                            color="#fff"
                                        />
                                        <Text style={styles.exportButtonText}>
                                            Exportar Excel
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={true}
                        >
                            <View style={styles.gradeContainer}>
                                {renderGradeHeader()}
                                {dadosGrade.map((dadosUsuario, index) =>
                                    renderGradeRow(dadosUsuario, index),
                                )}
                            </View>
                        </ScrollView>
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="information"
                            size={64}
                            color="#ccc"
                        />
                        <Text style={styles.emptyText}>
                            Nenhum dado encontrado para os filtros selecionados
                        </Text>
                    </View>
                )}
            </ScrollView>
        </LinearGradient>
    );
};

export default AnaliseComplotaPontos;
