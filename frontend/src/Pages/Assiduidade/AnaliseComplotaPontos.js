import React, { useState, useEffect, useRef } from "react";
import { secureStorage } from '../../utils/secureStorage';
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
    
    // ✅ NOVO: Flags de carregamento
    const [dadosCarregados, setDadosCarregados] = useState({
        feriados: false,
        faltas: false,
        horarios: false,
        inicial: false
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

            lista.forEach(item => {
                if (item.Data) {
                    const d = new Date(item.Data);
                    if (!isNaN(d.getTime())) {
                        const iso = fmtLocal(d);
                        set.add(iso);
                    }
                }
            });

            console.log(`✅ [FERIADOS] ${set.size} feriados normalizados`);
            return set;
        } catch (err) {
            console.error('❌ [FERIADOS] Erro ao normalizar:', err);
            return new Set();
        }
    };

    // ✅ CORRIGIDO: Carregar feriados com retry e retorno garantido
    const carregarFeriados = async (tentativa = 1, maxTentativas = 3) => {
        const painelAdminToken = secureStorage.getItem('painelAdminToken');
        const urlempresa = secureStorage.getItem('urlempresa');

        console.log(`🔍 [FERIADOS] Carregando feriados (tentativa ${tentativa}/${maxTentativas})...`);

        if (!painelAdminToken || !urlempresa) {
            console.warn('⚠️ [FERIADOS] Token ou URL da empresa não encontrados');
            const emptySet = new Set();
            setFeriados(emptySet);
            feriadosRef.current = emptySet;
            return emptySet;
        }

        try {
            const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/Feriados`, {
                headers: {
                    'Authorization': `Bearer ${painelAdminToken}`,
                    'urlempresa': urlempresa,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`🔍 [FERIADOS] Response status: ${res.status}`);

            if (!res.ok) {
                const errorText = await res.text();
                console.error(`❌ [FERIADOS] Erro na resposta: ${errorText}`);

                if (res.status === 409 && tentativa < maxTentativas) {
                    console.log(`⏳ [FERIADOS] Erro 409. Aguardando 2s antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return carregarFeriados(tentativa + 1, maxTentativas);
                }

                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            const data = await res.json();
            console.log(`✅ [FERIADOS] Dados recebidos:`, data?.DataSet?.Table?.length || 0, 'registos');
            
            const listaISO = normalizarFeriados(data);
            console.log(`✅ [FERIADOS] Total de feriados carregados: ${listaISO.size}`);
            
            if (listaISO.size > 0) {
                console.log(`📋 [FERIADOS] Lista de feriados:`, Array.from(listaISO).sort());
            }
            
            // ✅ IMPORTANTE: Atualizar state E ref
            setFeriados(listaISO);
            feriadosRef.current = listaISO;
            
            return listaISO;

        } catch (err) {
            console.error(`❌ [FERIADOS] Erro ao carregar (tentativa ${tentativa}):`, err);

            if (tentativa < maxTentativas && !err.message.includes('TypeError: Failed to fetch')) {
                console.log(`⏳ [FERIADOS] Tentando novamente em 3s...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                return carregarFeriados(tentativa + 1, maxTentativas);
            }

            console.warn('⚠️ [FERIADOS] Usando conjunto vazio como fallback');
            const emptySet = new Set();
            setFeriados(emptySet);
            feriadosRef.current = emptySet;
            return emptySet;
        }
    };

    // ✅ CORRIGIDO: Carregar faltas com retorno garantido
    const carregarFaltas = async (utilizadoresParam = null) => {
        try {
            const painelAdminToken = secureStorage.getItem("painelAdminToken");
            const urlempresa = secureStorage.getItem("urlempresa");
            const loginToken = secureStorage.getItem("loginToken");

            console.log("🔍 [FALTAS] Iniciando carregamento de faltas...");

            if (!painelAdminToken || !urlempresa || !loginToken) {
                console.warn("❌ [FALTAS] Tokens não encontrados");
                setFaltas([]);
                faltasRef.current = [];
                return [];
            }

            const utilizadoresParaProcessar = utilizadoresParam || utilizadores;

            console.log("🔍 [FALTAS] Utilizadores a processar:", utilizadoresParaProcessar.length);

            if (utilizadoresParaProcessar.length === 0) {
                console.warn("⚠️ [FALTAS] Nenhum utilizador disponível");
                setFaltas([]);
                faltasRef.current = [];
                return [];
            }

            const promises = utilizadoresParaProcessar.map(async (user) => {
                try {
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
                        return [];
                    }

                    const dataCodFuncionario = await resCodFuncionario.json();
                    const codFuncionario = dataCodFuncionario.codFuncionario;

                    if (!codFuncionario) {
                        return [];
                    }

                    const urlFaltas = `https://webapiprimavera.advir.pt/routesFaltas/GetListaFaltasFuncionario/${codFuncionario}`;

                    const res = await fetch(urlFaltas, {
                        headers: {
                            Authorization: `Bearer ${painelAdminToken}`,
                            urlempresa: urlempresa,
                            "Content-Type": "application/json",
                        },
                    });

                    if (res.ok) {
                        const data = await res.json();
                        const faltasUsuario = data?.DataSet?.Table || [];

                        if (faltasUsuario.length > 0) {
                            const faltasComUserId = faltasUsuario.map((falta) => ({
                                ...falta,
                                userId: user.id,
                                nomeUsuario: user.nome,
                                codFuncionarioUsado: codFuncionario,
                            }));

                            return faltasComUserId;
                        }
                    }

                    return [];
                } catch (error) {
                    console.error(`❌ [FALTAS] Erro ao carregar faltas para ${user.nome}:`, error);
                    return [];
                }
            });

            const resultados = await Promise.all(promises);
            const faltasTotal = resultados.flat();
            
            console.log("✅ [FALTAS] Total de faltas carregadas:", faltasTotal.length);
            
            // ✅ IMPORTANTE: Atualizar state E ref
            setFaltas(faltasTotal);
            faltasRef.current = faltasTotal;
            
            return faltasTotal;
        } catch (error) {
            console.error("❌ [FALTAS] Erro ao carregar faltas:", error);
            setFaltas([]);
            faltasRef.current = [];
            return [];
        }
    };

    const [horariosUtilizadores, setHorariosUtilizadores] = useState({});
    const horariosRef = useRef({});

    useEffect(() => {
        carregarDadosIniciais();
    }, []);

    // ✅ CORRIGIDO: Recarregar ao mudar filtros
    useEffect(() => {
        if (dadosCarregados.inicial && utilizadores.length > 0) {
            console.log(`🔄 [CHANGE] Detectada mudança de período ou obra`);
            console.log(`📋 [CHANGE] Novo período: ${mesSelecionado}/${anoSelecionado}`);
            console.log(`📋 [CHANGE] Obra: ${obraSelecionada || 'Todas'}`);
            
            recarregarDadosPeriodo();
        }
    }, [obraSelecionada, mesSelecionado, anoSelecionado]);

    // ✅ NOVO: Função principal de recarregamento com ordem garantida
    const recarregarDadosPeriodo = async () => {
        console.log(`\n${"=".repeat(60)}`);
        console.log(`🔄 [RELOAD] INICIANDO RECARREGAMENTO COMPLETO FORÇADO`);
        console.log(`📅 Período: ${mesSelecionado}/${anoSelecionado}`);
        console.log(`🏢 Obra: ${obraSelecionada || 'Todas'}`);
        console.log(`${"=".repeat(60)}\n`);

        setLoading(true);

        // ✅ LIMPEZA FORÇADA: Limpar TODOS os dados anteriores antes de recarregar
        console.log(`🧹 [CLEANUP] Limpando dados anteriores...`);
        setDadosGrade([]);
        setFeriados(new Set());
        feriadosRef.current = new Set();
        setFaltas([]);
        faltasRef.current = [];
        console.log(`✅ [CLEANUP] Dados anteriores limpos`);

        try {
            // ✅ PASSO 1: Carregar FERIADOS (OBRIGATÓRIO - SEMPRE)
            console.log(`\n📌 PASSO 1/3: Carregando FERIADOS (recarregamento forçado)...`);
            const feriadosCarregados = await carregarFeriados();
            console.log(`✅ PASSO 1/3 CONCLUÍDO: ${feriadosCarregados.size} feriados carregados`);

            // Validação obrigatória
            if (!feriadosCarregados) {
                throw new Error("Feriados não foram carregados corretamente");
            }
            if (feriadosCarregados.size === 0) {
                console.warn(`⚠️ [VALIDAÇÃO] Nenhum feriado encontrado - continuando sem feriados`);
            }

            // ✅ PASSO 2: Carregar FALTAS (OBRIGATÓRIO - SEMPRE)
            console.log(`\n📌 PASSO 2/3: Carregando FALTAS (recarregamento forçado)...`);
            const faltasCarregadas = await carregarFaltas();
            console.log(`✅ PASSO 2/3 CONCLUÍDO: ${faltasCarregadas.length} faltas carregadas`);

            // Validação obrigatória
            if (!faltasCarregadas) {
                throw new Error("Faltas não foram carregadas corretamente");
            }

            // Log detalhado de faltas por utilizador
            if (faltasCarregadas.length > 0) {
                const faltasPorUser = {};
                faltasCarregadas.forEach(f => {
                    if (!faltasPorUser[f.nomeUsuario]) {
                        faltasPorUser[f.nomeUsuario] = 0;
                    }
                    faltasPorUser[f.nomeUsuario]++;
                });
                console.log(`📊 [FALTAS] Distribuição por utilizador:`, faltasPorUser);
            }

            // ✅ PASSO 3: Gerar GRADE com PONTOS FICTÍCIOS (OBRIGATÓRIO - SEMPRE)
            console.log(`\n📌 PASSO 3/3: Gerando GRADE com PONTOS FICTÍCIOS (usando dados validados)...`);
            await gerarGradeComDadosValidados(feriadosCarregados, faltasCarregadas);
            console.log(`✅ PASSO 3/3 CONCLUÍDO: Grade gerada com pontos fictícios`);

            console.log(`\n${"=".repeat(60)}`);
            console.log(`✅ [RELOAD] RECARREGAMENTO COMPLETO FINALIZADO COM SUCESSO`);
            console.log(`   - Feriados: ${feriadosCarregados.size}`);
            console.log(`   - Faltas: ${faltasCarregadas.length}`);
            console.log(`   - Utilizadores na grade: ${dadosGrade.length || 'processando...'}`);
            console.log(`${"=".repeat(60)}\n`);

        } catch (error) {
            console.error("❌ [RELOAD] Erro ao recarregar dados:", error);
            Alert.alert("Erro", "Erro ao recarregar dados do período");
            // Garantir que os dados ficam limpos em caso de erro
            setDadosGrade([]);
        } finally {
            setLoading(false);
        }
    };

    // ✅ NOVO: Gerar grade com dados já validados (recebe os dados como parâmetro)
    const gerarGradeComDadosValidados = async (feriadosValidados, faltasValidadas) => {
        console.log(`\n🔍 [GRADE] Iniciando geração da grade...`);
        console.log(`📊 [GRADE] Dados recebidos:`);
        console.log(`   - Feriados: ${feriadosValidados.size} registos`);
        console.log(`   - Faltas: ${faltasValidadas.length} registos`);
        console.log(`   - Utilizadores: ${utilizadores.length}`);
        console.log(`   - Período: ${mesSelecionado}/${anoSelecionado}`);

        // Filtrar faltas para o mês/ano selecionado
        const faltasDoMes = faltasValidadas.filter((falta) => {
            const dataFalta = new Date(falta.Data);
            const mesData = dataFalta.getMonth() + 1;
            const anoData = dataFalta.getFullYear();
            return mesData === mesSelecionado && anoData === anoSelecionado;
        });

        console.log(`📋 [GRADE] Faltas filtradas para ${mesSelecionado}/${anoSelecionado}: ${faltasDoMes.length}`);
        
        if (faltasDoMes.length > 0) {
            console.log(`📋 [GRADE] Detalhes das faltas do mês:`);
            faltasDoMes.forEach(f => {
                const dataFalta = new Date(f.Data);
                console.log(`   - ${f.nomeUsuario}: Dia ${dataFalta.getDate()}/${mesSelecionado}`);
            });
        }

        // Filtrar feriados para o mês/ano selecionado
        const feriadosDoMes = new Set();
        feriadosValidados.forEach(feriadoISO => {
            const [ano, mes] = feriadoISO.split('-').map(Number);
            if (ano === anoSelecionado && mes === mesSelecionado) {
                feriadosDoMes.add(feriadoISO);
            }
        });
        
        console.log(`📋 [GRADE] Feriados do mês: ${feriadosDoMes.size}`);
        if (feriadosDoMes.size > 0) {
            console.log(`📋 [GRADE] Lista:`, Array.from(feriadosDoMes));
        }

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
            };

            // Faltas deste utilizador no mês
            const faltasDoUser = faltasDoMes.filter(f => f.userId === user.id);
            
            if (faltasDoUser.length > 0) {
                console.log(`👤 [GRADE] ${user.nome}: ${faltasDoUser.length} faltas no mês`);
            }

            for (let dia = 1; dia <= diasDoMes; dia++) {
                const dataAtual = new Date(anoSelecionado, mesSelecionado - 1, dia);
                const diaSemana = dataAtual.getDay();
                const isWeekend = diaSemana === 0 || diaSemana === 6;
                const isFutureDate = dataAtual > hoje;

                // ✅ Verificar se é feriado
                const dataISO = fmtLocal(dataAtual);
                const isFeriado = feriadosValidados.has(dataISO);

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
                };

                // ✅ PRIORIDADE 1: FALTAS (verificar PRIMEIRO - OBRIGATÓRIO)
                if (faltasDoDia.length > 0) {
                    estatisticasDia.trabalhou = false;
                    estatisticasDia.temFalta = true;
                    estatisticasDia.faltas = faltasDoDia;
                    dadosUsuario.faltasTotal++;
                    console.log(`   ⚠️ Dia ${dia}: FALTA`);
                }
                // ✅ PRIORIDADE 2: FERIADOS (verificar SEGUNDO - OBRIGATÓRIO)
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
                // ✅ PRIORIDADE 5: DIA ÚTIL -> GERAR HORÁRIO ESPERADO (ÚLTIMO)
                else {
                    const isHoje = dataAtual.toDateString() === hoje.toDateString();
                    const horaAtual = isHoje
                        ? `${String(hoje.getHours()).padStart(2, "0")}:${String(hoje.getMinutes()).padStart(2, "0")}`
                        : null;

                    const pontosFicticios = gerarPontosFicticios(user.id, dia, isHoje, horaAtual);
                    Object.assign(estatisticasDia, pontosFicticios);
                    estatisticasDia.trabalhou = true;

                    if (pontosFicticios.temSaida) {
                        const horasDia = horariosRef.current[user.id]?.horasPorDia || 8;
                        dadosUsuario.totalHorasMes += horasDia;
                        dadosUsuario.diasTrabalhados++;
                    } else {
                        dadosUsuario.diasTrabalhados += 0.5;
                    }
                }

                dadosUsuario.estatisticasDias[dia] = estatisticasDia;
            }

            dadosGradeTemp.push(dadosUsuario);
        });

        console.log(`\n📊 [GRADE] RESUMO FINAL:`);
        console.log(`   - Utilizadores processados: ${dadosGradeTemp.length}`);
        
        const totalFaltas = dadosGradeTemp.reduce((sum, u) => sum + u.faltasTotal, 0);
        const totalFeriados = dadosGradeTemp.reduce((sum, u) => sum + u.feriadosTotal, 0);
        
        console.log(`   - Total faltas na grade: ${totalFaltas}`);
        console.log(`   - Total feriados na grade: ${totalFeriados}`);
        
        // Listar utilizadores com faltas
        const usersComFaltas = dadosGradeTemp.filter(u => u.faltasTotal > 0);
        if (usersComFaltas.length > 0) {
            console.log(`   - Utilizadores com faltas:`);
            usersComFaltas.forEach(u => {
                console.log(`      • ${u.utilizador.nome}: ${u.faltasTotal} faltas`);
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
                nome: user.username || user.nome || user.email || `Utilizador ${user.id}`,
                email: user.email,
                codFuncionario: user.codFuncionario || user.username || user.nome,
            }));

            console.log(`✅ [INIT] ${utilizadoresFormatados.length} utilizadores carregados`);

            // Carregar horários e filtrar utilizadores com plano ativo
            console.log(`\n📌 [INIT] Carregando horários...`);
            const { utilizadoresComHorario, horariosMap } = await carregarHorariosUtilizadores(utilizadoresFormatados);

            console.log(`✅ [INIT] ${utilizadoresComHorario.length} utilizadores COM plano de horário ativo`);

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
            console.log(`✅ PASSO 1/3 CONCLUÍDO: ${feriadosIniciais.size} feriados carregados`);

            // ✅ PASSO 2: CARREGAR FALTAS (OBRIGATÓRIO - SEMPRE SEGUNDO)
            console.log(`\n${"━".repeat(60)}`);
            console.log(`📌 PASSO 2/3: Carregando FALTAS...`);
            console.log(`${"━".repeat(60)}`);
            const faltasIniciais = await carregarFaltas(utilizadoresComHorario);
            if (!faltasIniciais) {
                throw new Error("Faltas não foram carregadas corretamente");
            }
            console.log(`✅ PASSO 2/3 CONCLUÍDO: ${faltasIniciais.length} faltas carregadas`);

            // Marcar carregamento inicial como concluído
            setDadosCarregados({
                feriados: true,
                faltas: true,
                horarios: true,
                inicial: true
            });

            // ✅ PASSO 3: GERAR GRADE COM PONTOS FICTÍCIOS (OBRIGATÓRIO - SEMPRE TERCEIRO)
            console.log(`\n${"━".repeat(60)}`);
            console.log(`📌 PASSO 3/3: Gerando GRADE com PONTOS FICTÍCIOS...`);
            console.log(`${"━".repeat(60)}`);
            await gerarGradeComDadosValidadosInicial(
                utilizadoresComHorario,
                horariosMap,
                feriadosIniciais,
                faltasIniciais
            );
            console.log(`✅ PASSO 3/3 CONCLUÍDO: Grade gerada com pontos fictícios`);

            console.log(`\n${"=".repeat(60)}`);
            console.log(`✅ [INIT] CARREGAMENTO INICIAL CONCLUÍDO COM SUCESSO`);
            console.log(`   - Obras: ${obrasData.length}`);
            console.log(`   - Utilizadores: ${utilizadoresComHorario.length}`);
            console.log(`   - Feriados: ${feriadosIniciais.size}`);
            console.log(`   - Faltas: ${faltasIniciais.length}`);
            console.log(`   - ORDEM GARANTIDA: Feriados → Faltas → Pontos Fictícios`);
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
        } finally {
            setLoading(false);
        }
    };

    // ✅ NOVO: Versão especial para carregamento inicial (recebe todos os dados como parâmetro)
    const gerarGradeComDadosValidadosInicial = async (utilizadoresList, horariosMap, feriadosSet, faltasList) => {
        console.log(`🔍 [GRADE-INIT] Gerando grade inicial...`);
        console.log(`   - Utilizadores: ${utilizadoresList.length}`);
        console.log(`   - Feriados: ${feriadosSet.size}`);
        console.log(`   - Faltas: ${faltasList.length}`);

        // Filtrar faltas para o mês/ano selecionado
        const faltasDoMes = faltasList.filter((falta) => {
            const dataFalta = new Date(falta.Data);
            const mesData = dataFalta.getMonth() + 1;
            const anoData = dataFalta.getFullYear();
            return mesData === mesSelecionado && anoData === anoSelecionado;
        });

        console.log(`📋 [GRADE-INIT] Faltas do mês: ${faltasDoMes.length}`);

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
            };

            const faltasDoUser = faltasDoMes.filter(f => f.userId === user.id);

            for (let dia = 1; dia <= diasDoMes; dia++) {
                const dataAtual = new Date(anoSelecionado, mesSelecionado - 1, dia);
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
                    const isHoje = dataAtual.toDateString() === hoje.toDateString();
                    const horaAtual = isHoje
                        ? `${String(hoje.getHours()).padStart(2, "0")}:${String(hoje.getMinutes()).padStart(2, "0")}`
                        : null;

                    const pontosFicticios = gerarPontosFicticiosComHorario(user.id, dia, isHoje, horaAtual, horariosMap);
                    Object.assign(estatisticasDia, pontosFicticios);
                    estatisticasDia.trabalhou = true;

                    if (pontosFicticios.temSaida) {
                        const horasDia = horariosMap[user.id]?.horasPorDia || 8;
                        dadosUsuario.totalHorasMes += horasDia;
                        dadosUsuario.diasTrabalhados++;
                    } else {
                        dadosUsuario.diasTrabalhados += 0.5;
                    }
                }

                dadosUsuario.estatisticasDias[dia] = estatisticasDia;
            }

            dadosGradeTemp.push(dadosUsuario);
        });

        console.log(`✅ [GRADE-INIT] Grade gerada: ${dadosGradeTemp.length} utilizadores`);
        setDadosGrade(dadosGradeTemp);
    };

    // ✅ Versão que recebe horários como parâmetro (para carregamento inicial)
    const gerarPontosFicticiosComHorario = (userId, dia, isHoje, horaAtual, horariosMap) => {
        const horarioUser = horariosMap[userId];

        const horarioFinal = horarioUser || {
            horaEntrada: "08:00",
            horaSaida: "17:00",
            intervaloAlmoco: 1.00,
            horasPorDia: 8.00,
        };

        const parseHora = (horaStr) => {
            if (!horaStr) return { h: 0, m: 0 };
            const partes = String(horaStr).split(':');
            return {
                h: parseInt(partes[0], 10) || 0,
                m: parseInt(partes[1], 10) || 0
            };
        };

        const paraMinutos = (h, m) => h * 60 + m;

        const paraHora = (minutos) => {
            const h = Math.floor(minutos / 60);
            const m = minutos % 60;
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        };

        const aplicarVariacao = (minutos) => {
            const variacao = Math.floor(Math.random() * 11) - 5;
            return Math.max(0, minutos + variacao);
        };

        const entradaBase = parseHora(horarioFinal.horaEntrada);
        const saidaBase = parseHora(horarioFinal.horaSaida);

        const minutosEntradaBase = paraMinutos(entradaBase.h, entradaBase.m);
        const minutosSaidaBase = paraMinutos(saidaBase.h, saidaBase.m);

        const minutosEntradaVariada = aplicarVariacao(minutosEntradaBase);
        const minutosSaidaVariada = aplicarVariacao(minutosSaidaBase);

        const horaEntrada = paraHora(minutosEntradaVariada);
        const horaSaida = paraHora(minutosSaidaVariada);

        const intervaloMinutos = Math.floor(horarioFinal.intervaloAlmoco * 60);
        const minutosTrabalho = minutosSaidaVariada - minutosEntradaVariada - intervaloMinutos;
        const minutosAteAlmoco = Math.floor(minutosTrabalho / 2);

        const minutosSaidaAlmoco = minutosEntradaVariada + minutosAteAlmoco;
        const saidaAlmoco = paraHora(aplicarVariacao(minutosSaidaAlmoco));

        const minutosEntradaAlmoco = minutosSaidaAlmoco + intervaloMinutos;
        const entradaAlmoco = paraHora(aplicarVariacao(minutosEntradaAlmoco));

        let mostrarSaida = true;
        let mostrarAlmoco = true;

        if (isHoje && horaAtual) {
            const [horaAtualH, horaAtualM] = horaAtual.split(":").map(Number);
            const minutosAtuais = horaAtualH * 60 + horaAtualM;

            mostrarAlmoco = minutosAtuais >= minutosEntradaAlmoco;
            mostrarSaida = minutosAtuais >= minutosSaidaVariada;
        }

        const horasPorDia = parseFloat(horarioFinal.horasPorDia) || 8.0;

        return {
            horaEntrada: horaEntrada,
            horaSaida: mostrarSaida ? horaSaida : null,
            saidaAlmoco: mostrarAlmoco ? saidaAlmoco : null,
            entradaAlmoco: mostrarAlmoco ? entradaAlmoco : null,
            totalHoras: mostrarSaida ? horasPorDia : null,
            temSaida: mostrarSaida,
        };
    };

    const extrairHoraMinuto = (horaStr) => {
        if (!horaStr) return null;
        
        if (typeof horaStr === 'string' && (horaStr.includes('T') || horaStr.includes('-'))) {
            try {
                const data = new Date(horaStr);
                const horas = String(data.getUTCHours()).padStart(2, '0');
                const minutos = String(data.getUTCMinutes()).padStart(2, '0');
                return `${horas}:${minutos}`;
            } catch (e) {
                console.warn('Erro ao converter hora ISO:', horaStr, e);
                return null;
            }
        }
        
        const partes = String(horaStr).split(':');
        if (partes.length >= 2) {
            return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`;
        }
        
        return null;
    };

    const carregarHorariosUtilizadores = async (utilizadores) => {
        try {
            const token = secureStorage.getItem("loginToken");
            const horariosMap = {};
            const utilizadoresComHorario = [];

            console.log(`🔍 [HORARIOS] Carregando horários para ${utilizadores.length} utilizadores...`);

            const promises = utilizadores.map(async (user) => {
                try {
                    const res = await fetch(
                        `https://backend.advir.pt/api/horarios/user/${user.id}`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );

                    if (res.ok) {
                        const planoHorario = await res.json();
                        const horarioData = planoHorario?.Horario || planoHorario;

                        if (planoHorario && planoHorario.ativo === true && horarioData) {
                            const horaEntrada = extrairHoraMinuto(horarioData.horaEntrada) || "08:00";
                            const horaSaida = extrairHoraMinuto(horarioData.horaSaida) || "17:00";
                            
                            return {
                                user: user,
                                userId: user.id,
                                userName: user.nome,
                                horario: {
                                    horaEntrada: horaEntrada,
                                    horaSaida: horaSaida,
                                    intervaloAlmoco: parseFloat(horarioData.intervaloAlmoco) || 1.00,
                                    horasPorDia: parseFloat(horarioData.horasPorDia) || 8.00,
                                },
                                encontrado: true,
                                planoAtivo: true
                            };
                        } else {
                            return {
                                user: user,
                                userId: user.id,
                                userName: user.nome,
                                horario: null,
                                encontrado: false,
                                planoAtivo: false
                            };
                        }
                    } else {
                        return {
                            user: user,
                            userId: user.id,
                            userName: user.nome,
                            horario: null,
                            encontrado: false,
                            planoAtivo: false
                        };
                    }
                } catch (error) {
                    console.error(`❌ [HORARIOS] Erro ao carregar ${user.nome}:`, error.message);
                    return {
                        user: user,
                        userId: user.id,
                        userName: user.nome,
                        horario: null,
                        encontrado: false,
                        planoAtivo: false
                    };
                }
            });

            const resultados = await Promise.all(promises);

            resultados.forEach(resultado => {
                if (resultado.planoAtivo && resultado.horario) {
                    horariosMap[resultado.userId] = resultado.horario;
                    utilizadoresComHorario.push(resultado.user);
                }
            });

            const comHorario = resultados.filter(r => r.planoAtivo).length;
            console.log(`✅ [HORARIOS] ${comHorario} utilizadores com plano ativo`);

            return { utilizadoresComHorario, horariosMap };

        } catch (error) {
            console.error("❌ [HORARIOS] Erro geral:", error);
            return { utilizadoresComHorario: [], horariosMap: {} };
        }
    };

    const gerarPontosFicticios = (userId, dia, isHoje, horaAtual) => {
        return gerarPontosFicticiosComHorario(userId, dia, isHoje, horaAtual, horariosRef.current);
    };

    const getCellStyle = (estatisticas) => {
        if (!estatisticas) return styles.cellEmpty;

        // 1º FALTAS (prioridade absoluta)
        if (estatisticas.temFalta) return styles.cellFalta;
        // 2º FERIADOS
        if (estatisticas.isFeriado) return styles.cellFeriado || styles.cellWeekend;
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

        if (!obraSelecionada) {
            Alert.alert("Aviso", "Nenhuma obra selecionada");
            return;
        }

        try {
            const workbook = XLSX.utils.book_new();
            const diasDoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
            const dias = Array.from({ length: diasDoMes }, (_, i) => i + 1);
            const obraNome = obraSelecionada
                ? obras.find((obra) => obra.id.toString() === obraSelecionada)?.nome || "Obra não encontrada"
                : "Todas as Obras";

            const dadosExport = [];

            dadosExport.push(["RELATÓRIO DE ANÁLISE COMPLETA DE REGISTOS DE PONTO"]);
            dadosExport.push([""]);
            dadosExport.push(["📅 PERÍODO:", `${meses[mesSelecionado - 1]} de ${anoSelecionado}`]);
            dadosExport.push(["🏢 OBRA:", obraNome]);
            dadosExport.push(["👥 FUNCIONÁRIOS:", `${dadosGrade.length} utilizadores`]);
            dadosExport.push(["📊 DATA GERAÇÃO:", new Date().toLocaleString("pt-PT")]);
            dadosExport.push([""]);
            dadosExport.push([""]);

            dadosExport.push(["📋 LEGENDA:"]);
            dadosExport.push(["", "✅ Registo Normal", "- Horário de entrada e saída"]);
            dadosExport.push(["", "❌ FALTA", "- Ausência registada"]);
            dadosExport.push(["", "🎉 FERIADO", "- Feriado nacional/municipal"]);
            dadosExport.push(["", "📅 FDS", "- Fim de semana"]);
            dadosExport.push(["", "🔄 Em curso", "- Apenas entrada registada"]);
            dadosExport.push([""]);
            dadosExport.push([""]);

            const headerRow = ["FUNCIONÁRIO"];

            dias.forEach((dia) => {
                const dataCompleta = new Date(anoSelecionado, mesSelecionado - 1, dia);
                const diaSemana = dataCompleta.toLocaleDateString("pt-PT", { weekday: "short" }).toUpperCase();
                headerRow.push(`${dia}\n${diaSemana}`);
            });

            headerRow.push("TOTAL\nHORAS", "DIAS\nTRABALHADOS", "TOTAL\nFALTAS", "TOTAL\nFERIADOS");
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
                            cellValue = `✅ ${estatisticas.horaEntrada}`;
                            if (estatisticas.saidaAlmoco) {
                                cellValue += `\n${estatisticas.saidaAlmoco}`;
                            }
                            if (estatisticas.entradaAlmoco) {
                                cellValue += `\n${estatisticas.entradaAlmoco}`;
                            }
                            cellValue += `\n${estatisticas.horaSaida}`;
                        }
                    }

                    row.push(cellValue);
                });

                row.push(
                    `${dadosUsuario.totalHorasMes}h`,
                    `${dadosUsuario.diasTrabalhados} dias`,
                    `${dadosUsuario.faltasTotal} faltas`,
                    `${dadosUsuario.feriadosTotal} feriados`
                );

                dadosExport.push(row);
            });

            const separatorRow = Array(headerRow.length).fill("═══════════");
            dadosExport.push(separatorRow);

            const totalHorasTodos = dadosGrade.reduce((sum, user) => sum + user.totalHorasMes, 0);
            const totalDiasTodos = dadosGrade.reduce((sum, user) => sum + user.diasTrabalhados, 0);
            const totalFaltasTodos = dadosGrade.reduce((sum, user) => sum + user.faltasTotal, 0);
            const totalFeriadosTodos = dadosGrade.reduce((sum, user) => sum + user.feriadosTotal, 0);
            const mediaHorasPorFuncionario = (totalHorasTodos / dadosGrade.length).toFixed(1);
            const mediaDiasPorFuncionario = (totalDiasTodos / dadosGrade.length).toFixed(1);

            dadosExport.push(["📊 RESUMO ESTATÍSTICO"]);
            dadosExport.push([""]);

            const resumoRow = Array(dias.length + 1).fill("");
            resumoRow[0] = "TOTAIS GERAIS:";
            resumoRow[resumoRow.length - 4] = `${totalHorasTodos}h`;
            resumoRow[resumoRow.length - 3] = `${totalDiasTodos} dias`;
            resumoRow[resumoRow.length - 2] = `${totalFaltasTodos} faltas`;
            resumoRow[resumoRow.length - 1] = `${totalFeriadosTodos} feriados`;
            dadosExport.push(resumoRow);

            const mediaRow = Array(dias.length + 1).fill("");
            mediaRow[0] = "MÉDIAS POR FUNCIONÁRIO:";
            mediaRow[mediaRow.length - 4] = `${mediaHorasPorFuncionario}h`;
            mediaRow[mediaRow.length - 3] = `${mediaDiasPorFuncionario} dias`;
            mediaRow[mediaRow.length - 2] = `${(totalFaltasTodos / dadosGrade.length).toFixed(1)} faltas`;
            mediaRow[mediaRow.length - 1] = `${(totalFeriadosTodos / dadosGrade.length).toFixed(1)} feriados`;
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
                    dadosExport.push([`${index + 1}. ${user.utilizador.nome}`, "", "", "", `${user.faltasTotal} faltas`]);
                });
            }

            const funcionariosComMaisHoras = dadosGrade
                .sort((a, b) => b.totalHorasMes - a.totalHorasMes)
                .slice(0, 5);

            dadosExport.push([""]);
            dadosExport.push(["⭐ TOP 5 - FUNCIONÁRIOS COM MAIS HORAS:"]);
            funcionariosComMaisHoras.forEach((user, index) => {
                dadosExport.push([`${index + 1}. ${user.utilizador.nome}`, "", "", "", `${user.totalHorasMes}h`]);
            });

            const worksheet = XLSX.utils.aoa_to_sheet(dadosExport);

            const colWidths = [{ wch: 25 }];
            dias.forEach(() => colWidths.push({ wch: 14 }));
            colWidths.push({ wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 });

            worksheet["!cols"] = colWidths;

            XLSX.utils.book_append_sheet(workbook, worksheet, "Análise Completa");

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
                ["⏰ Total de Horas Trabalhadas:", `${totalHorasTodos}h`],
                ["📅 Total de Dias Trabalhados:", totalDiasTodos],
                ["❌ Total de Faltas:", totalFaltasTodos],
                ["🎉 Total de Feriados:", totalFeriadosTodos],
                [""],
                ["MÉDIAS:"],
                [""],
                ["⏰ Horas por Funcionário:", `${mediaHorasPorFuncionario}h`],
                ["📅 Dias por Funcionário:", `${mediaDiasPorFuncionario} dias`],
                ["❌ Faltas por Funcionário:", `${(totalFaltasTodos / dadosGrade.length).toFixed(1)}`],
                ["🎉 Feriados por Funcionário:", `${(totalFeriadosTodos / dadosGrade.length).toFixed(1)}`],
                [""],
                ["TAXA DE ASSIDUIDADE:"],
                [""],
                ["🎯 Taxa Geral:", `${((totalDiasTodos / (dadosGrade.length * diasDoMes)) * 100 || 0).toFixed(1)}%`],
            ];

            const worksheetResumo = XLSX.utils.aoa_to_sheet(resumoExecutivo);
            worksheetResumo["!cols"] = [{ wch: 30 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(workbook, worksheetResumo, "Resumo Executivo");

            const dataAtual = new Date().toISOString().split("T")[0];
            const fileName = `Analise_Completa_Registos_${obraNome.replace(/[^a-zA-Z0-9]/g, "_")}_${meses[mesSelecionado - 1]}_${anoSelecionado}_${dataAtual}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            Alert.alert(
                "✅ Exportação Concluída",
                `Relatório completo exportado com sucesso!\n\n📁 Arquivo: ${fileName}\n📊 ${dadosGrade.length} funcionários analisados\n⏰ ${totalHorasTodos}h totais registadas`,
            );
        } catch (error) {
            console.error("Erro ao exportar para Excel:", error);
            Alert.alert("❌ Erro na Exportação", "Ocorreu um erro ao gerar o relatório Excel. Tente novamente.");
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
                                    Alert.alert(
                                        "Detalhes do Dia",
                                        `Funcionário: ${dadosUsuario.utilizador.nome}\n` +
                                            `Dia: ${dia}/${mesSelecionado}/${anoSelecionado}\n` +
                                            `Entrada: ${estatisticas.horaEntrada}\n` +
                                            (estatisticas.saidaAlmoco ? `Saída Almoço: ${estatisticas.saidaAlmoco}\n` : "") +
                                            (estatisticas.entradaAlmoco ? `Entrada Almoço: ${estatisticas.entradaAlmoco}\n` : "") +
                                            `Saída: ${estatisticas.horaSaida || "Em curso"}\n` +
                                            (estatisticas.totalHoras
                                                ? `Total Horas: ${estatisticas.totalHoras}h`
                                                : "Dia em curso"),
                                    );
                                } else if (estatisticas && estatisticas.temFalta) {
                                    Alert.alert(
                                        "Detalhes do Dia",
                                        `Funcionário: ${dadosUsuario.utilizador.nome}\n` +
                                            `Dia: ${dia}/${mesSelecionado}/${anoSelecionado}\n` +
                                            `Motivo: FALTA`,
                                    );
                                } else if (estatisticas && estatisticas.isFeriado) {
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
                        {dadosUsuario.totalHorasMes}h
                    </Text>
                    <Text style={styles.totalSubText}>
                        {dadosUsuario.diasTrabalhados} dias
                    </Text>
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
                                    <Picker.Item label="Todas as Obras" value="" />
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
                            <View style={[styles.legendColor, styles.cellTrabalhou]} />
                            <Text style={styles.legendText}>Registos de Entrada/Saída</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, styles.cellFalta]} />
                            <Text style={styles.legendText}>Falta</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, styles.cellFeriado || styles.cellWeekend]} />
                            <Text style={styles.legendText}>Feriado</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, styles.cellWeekend]} />
                            <Text style={styles.legendText}>Fim de semana</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, styles.cellFuture]} />
                            <Text style={styles.legendText}>Dias futuros</Text>
                        </View>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#1792FE" />
                        <Text style={styles.loadingText}>
                            Carregando dados...
                        </Text>
                    </View>
                ) : dadosGrade.length > 0 ? (
                    <View style={styles.gradeCard}>
                        <View style={styles.gradeHeader}>
                            <Text style={styles.gradeTitle}>
                                Grade Mensal - {meses[mesSelecionado - 1]}{" "}
                                {anoSelecionado} - {obraSelecionada ? obras.find(o => o.id.toString() === obraSelecionada)?.nome : "Todas as Obras"} ({dadosGrade.length}{" "}
                                utilizadores)
                            </Text>
                            <View style={styles.buttonGroup}>
                                <TouchableOpacity
                                    style={styles.refreshButton}
                                    onPress={() => {
                                        Alert.alert(
                                            "Atualizar Dados",
                                            "Deseja recarregar os dados?",
                                            [
                                                { text: "Cancelar", style: "cancel" },
                                                { text: "Sim, atualizar", onPress: () => recarregarDadosPeriodo() },
                                            ],
                                        );
                                    }}
                                    disabled={loading}
                                >
                                    <LinearGradient
                                        colors={["#007bff", "#0056b3"]}
                                        style={styles.refreshButtonGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <MaterialCommunityIcons
                                            name={loading ? "loading" : "refresh"}
                                            size={18}
                                            color="#fff"
                                        />
                                        <Text style={styles.refreshButtonText}>Atualizar</Text>
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
                                        <Text style={styles.exportButtonText}>Exportar Excel</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
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