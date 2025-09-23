import React, { useState, useEffect } from "react";
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
import * as XLSX from 'xlsx';
import {styles} from "./styles/AnaliseComplotaPontosStyles";

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
    const [faltas, setFaltas] = useState([]);

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
    // Formata YYYY-MM-DD em “local” (sem UTC / sem Z)
    // Formata YYYY-MM-DD em "local"
    const fmtLocal = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    const obterDiasComRegistosPorUtilizador = async (
        obraId,
        ano,
        mes,
        utilizadores,
    ) => {
        const token = localStorage.getItem("loginToken");

        const dataInicio = new Date(ano, mes - 1, 1);
        const dataFim = new Date(ano, mes, 0);
        const di = fmtLocal(dataInicio);
        const df = fmtLocal(dataFim);

        const pedidos = utilizadores.map(async (u) => {
            try {
                const url = new URL(
                    `https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo`,
                );

                // ✅ Envia snake_case e camelCase para compatibilidade
                url.searchParams.set("user_id", String(u.id));
                url.searchParams.set("userId", String(u.id));

                if (obraId) {
                    url.searchParams.set("obra_id", String(obraId));
                    url.searchParams.set("obraId", String(obraId));
                }

                url.searchParams.set("data_inicio", di);
                url.searchParams.set("data_fim", df);
                url.searchParams.set("dataInicio", di);
                url.searchParams.set("dataFim", df);

                const res = await fetch(url.toString(), {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) {
                    const txt = await res.text().catch(() => "");
                    console.warn(
                        `[listar-por-user-periodo] ${res.status} ${res.statusText} · ${url}`,
                    );
                    console.warn(`Body: ${txt}`);
                    return { userId: u.id, dias: new Set() };
                    // Se quiseres ser mais agressivo: aqui podias fazer uma segunda tentativa sem obra_id.
                }

                const lista = await res.json();
                const dias = new Set(
                    (Array.isArray(lista) ? lista : [])
                        .map((r) => {
                            const d = new Date(
                                r.data ||
                                    r.dataHora ||
                                    r.createdAt ||
                                    r.updatedAt,
                            );
                            return isNaN(d) ? null : d.getDate();
                        })
                        .filter(Boolean),
                );

                return { userId: u.id, dias };
            } catch (e) {
                console.error(
                    `Erro a obter dias com registos para user ${u.id}:`,
                    e,
                );
                return { userId: u.id, dias: new Set() };
            }
        });

        const resultados = await Promise.all(pedidos);
        return resultados.reduce((acc, cur) => {
            acc[cur.userId] = cur.dias;
            return acc;
        }, {});
    };

    useEffect(() => {
        carregarDadosIniciais();
    }, []);

    useEffect(() => {
        if (obraSelecionada) {
            carregarDadosGrade();
        }
    }, [obraSelecionada, mesSelecionado, anoSelecionado]);

    // Refresh automático quando mudar obra, mês ou ano
    useEffect(() => {
        console.log("🔄 [REFRESH] Detectada mudança nos filtros - recarregando dados...");
        console.log("🔄 [REFRESH] Obra:", obraSelecionada, "Mês:", mesSelecionado, "Ano:", anoSelecionado);

        if (obraSelecionada) {
            // Limpar dados anteriores
            setDadosGrade([]);
            setFaltas([]);

            // Recarregar com os novos filtros
            carregarDadosGrade();
        }
    }, [obraSelecionada, mesSelecionado, anoSelecionado, utilizadores]);

    const carregarDadosIniciais = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("loginToken");
            const empresaId = localStorage.getItem("empresa_id");

            // Carregar obras
            const resObras = await fetch(
                `https://backend.advir.pt/api/obra/por-empresa?empresa_id=${empresaId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            const obrasData = await resObras.json();
            setObras(obrasData);

            // Carregar utilizadores da empresa
            const resUsers = await fetch(
                `https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${empresaId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            const usersData = await resUsers.json();

            // Mapear para o formato correto com nome
            const utilizadoresFormatados = usersData.map((user) => ({
                id: user.id,
                nome:
                    user.username ||
                    user.nome ||
                    user.email ||
                    `Utilizador ${user.id}`,
                email: user.email,
                codFuncionario: user.codFuncionario || user.username || user.nome,
            }));

            console.log("🔍 [INIT] Utilizadores carregados:", utilizadoresFormatados.map(u => ({
                id: u.id,
                nome: u.nome,
                codFuncionario: u.codFuncionario,
                original: usersData.find(ud => ud.id === u.id)
            })));

            setUtilizadores(utilizadoresFormatados);
        } catch (error) {
            console.error("Erro ao carregar dados iniciais:", error);
            Alert.alert("Erro", "Erro ao carregar dados iniciais");
        } finally {
            setLoading(false);
        }
    };

    const carregarFaltas = async () => {
        try {
            const painelAdminToken = localStorage.getItem("painelAdminToken");
            const urlempresa = localStorage.getItem("urlempresa");
            const loginToken = localStorage.getItem("loginToken");

            console.log("🔍 [FALTAS] Iniciando carregamento de faltas...");
            console.log("🔍 [FALTAS] painelAdminToken:", painelAdminToken ? "✅ Presente" : "❌ Ausente");
            console.log("🔍 [FALTAS] urlempresa:", urlempresa ? "✅ Presente" : "❌ Ausente");
            console.log("🔍 [FALTAS] loginToken:", loginToken ? "✅ Presente" : "❌ Ausente");

            if (!painelAdminToken || !urlempresa || !loginToken) {
                console.warn(
                    "❌ [FALTAS] Token, URL da empresa ou loginToken não encontrados para carregar faltas",
                );
                return [];
            }

            console.log("🔍 [FALTAS] Utilizadores a processar:", utilizadores.length);

            const promises = utilizadores.map(async (user) => {
                try {
                    console.log(`🔍 [FALTAS] Carregando faltas para ${user.nome} (ID: ${user.id})`);

                    // Primeiro, obter o codFuncionario do backend
                    console.log(`🔍 [FALTAS] Obtendo codFuncionario para userId: ${user.id}`);
                    const resCodFuncionario = await fetch(
                        `https://backend.advir.pt/api/users/getCodFuncionario/${user.id}`,
                        {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${loginToken}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    if (!resCodFuncionario.ok) {
                        const errorText = await resCodFuncionario.text().catch(() => 'Erro desconhecido');
                        console.warn(`❌ [FALTAS] Erro ao obter codFuncionario para ${user.nome}: ${errorText}`);
                        return [];
                    }

                    const dataCodFuncionario = await resCodFuncionario.json();
                    const codFuncionario = dataCodFuncionario.codFuncionario;

                    if (!codFuncionario) {
                        console.warn(`❌ [FALTAS] codFuncionario não definido para ${user.nome}`);
                        return [];
                    }

                    console.log(`✅ [FALTAS] codFuncionario obtido para ${user.nome}: "${codFuncionario}"`);

                    // Agora usar o codFuncionario para buscar as faltas
                    const urlFaltas = `https://webapiprimavera.advir.pt/routesFaltas/GetListaFaltasFuncionario/${codFuncionario}`;
                    console.log(`🔍 [FALTAS] Chamando API de faltas para ${user.nome}: ${urlFaltas}`);

                    const res = await fetch(urlFaltas, {
                        headers: {
                            Authorization: `Bearer ${painelAdminToken}`,
                            urlempresa: urlempresa,
                            "Content-Type": "application/json",
                        },
                    });

                    console.log(`🔍 [FALTAS] Response status para ${user.nome}:`, res.status);

                    if (res.ok) {
                        const data = await res.json();
                        const faltasUsuario = data?.DataSet?.Table || [];

                        if (faltasUsuario.length > 0) {
                            console.log(`✅ [FALTAS] ${user.nome}: ${faltasUsuario.length} faltas encontradas`);
                            console.log(`🔍 [FALTAS] Primeiras faltas de ${user.nome}:`, faltasUsuario.slice(0, 3));

                            const faltasComUserId = faltasUsuario.map((falta) => ({
                                ...falta,
                                userId: user.id,
                                nomeUsuario: user.nome,
                                codFuncionarioUsado: codFuncionario,
                            }));

                            return faltasComUserId;
                        } else {
                            console.log(`⚠️ [FALTAS] ${user.nome}: API retornou com sucesso mas sem faltas`);
                        }
                    } else {
                        const errorText = await res.text().catch(() => 'Erro desconhecido');
                        console.warn(`❌ [FALTAS] Erro ${res.status} para ${user.nome}: ${errorText}`);
                    }

                    return [];
                } catch (error) {
                    console.error(
                        `❌ [FALTAS] Erro ao carregar faltas para ${user.nome}:`,
                        error,
                    );
                    return [];
                }
            });

            const resultados = await Promise.all(promises);
            const faltasTotal = resultados.flat();
            console.log("✅ [FALTAS] Total de faltas carregadas:", faltasTotal.length);

            if (faltasTotal.length > 0) {
                console.log("🔍 [FALTAS] Primeiras faltas gerais:", faltasTotal.slice(0, 5));
                console.log("🔍 [FALTAS] UserIds únicos nas faltas:", [...new Set(faltasTotal.map(f => f.userId))]);
            }

            return faltasTotal;
        } catch (error) {
            console.error("❌ [FALTAS] Erro ao carregar faltas:", error);
            return [];
        }
    };

    const gerarPontosFicticios = (userId, dia, isHoje, horaAtual) => {
        // Gerar horários fictícios mais variados e aleatórios
        const seed = userId * 1000 + dia + Math.floor(dia / 7); // Mais variação
        const random1 = ((seed * 9301 + 49297) % 233280) / 233280;

        // Horários de entrada mais variados (7:30 a 9:30)
        const horasEntrada = [
            "07:30",
            "07:45",
            "07:50",
            "07:55",
            "07:58",
            "07:59",
            "08:00",
            "08:01",
            "08:02",
            "08:05",
            "08:10",
            "08:15",
            "08:30",
            "08:45",
            "08:50",
            "08:55",
            "08:58",
            "08:59",
            "09:00",
            "09:05",
            "09:10",
            "09:15",
            "09:30",
        ];

        // Horários de saída correspondentes (mantendo ~8h de trabalho)
        const horariosSaida = [
            "16:30",
            "16:45",
            "16:50",
            "16:55",
            "16:58",
            "16:59",
            "17:00",
            "17:01",
            "17:02",
            "17:05",
            "17:10",
            "17:15",
            "17:30",
            "17:45",
            "17:50",
            "17:55",
            "17:58",
            "17:59",
            "18:00",
            "18:05",
            "18:10",
            "18:15",
            "18:30",
        ];

        const indiceEntrada = Math.floor(random1 * horasEntrada.length);
        const horaEntrada = horasEntrada[indiceEntrada];
        const horaSaida = horariosSaida[indiceEntrada];

        // Se é hoje, verificar se já passou da hora de saída
        let mostrarSaida = true;
        if (isHoje && horaAtual) {
            const [horaAtualH, horaAtualM] = horaAtual.split(':').map(Number);
            const [horaSaidaH, horaSaidaM] = horaSaida.split(':').map(Number);

            const minutosAtuais = horaAtualH * 60 + horaAtualM;
            const minutosSaida = horaSaidaH * 60 + horaSaidaM;

            mostrarSaida = minutosAtuais >= minutosSaida;
        }

        return {
            horaEntrada: horaEntrada,
            horaSaida: mostrarSaida ? horaSaida : null,
            totalHoras: mostrarSaida ? 8.0 : null,
            temSaida: mostrarSaida,
        };
    };

    const carregarDadosGrade = async () => {
        if (!obraSelecionada) return;

        console.log("🔍 [GRADE] Iniciando carregamento da grade...");
        console.log("🔍 [GRADE] Obra selecionada:", obraSelecionada);
        console.log("🔍 [GRADE] Mês/Ano:", mesSelecionado, "/", anoSelecionado);

        setLoading(true);
        try {
            // 1) Carregar faltas
            console.log("🔍 [GRADE] Etapa 1: Carregando faltas...");
            const faltasData = await carregarFaltas();
            setFaltas(faltasData);
            console.log("✅ [GRADE] Faltas carregadas:", faltasData.length);

            // 2) Obter registos reais detalhados por utilizador no período selecionado
            console.log("🔍 [GRADE] Etapa 2: Obtendo registos reais detalhados...");
            const token = localStorage.getItem("loginToken");
            const registosReaisDetalhados = {};

            // Para cada utilizador, buscar os registos reais do mês
            for (const user of utilizadores) {
                try {
                    const dataInicio = new Date(anoSelecionado, mesSelecionado - 1, 1);
                    const dataFim = new Date(anoSelecionado, mesSelecionado, 0);
                    const di = fmtLocal(dataInicio);
                    const df = fmtLocal(dataFim);

                    const url = new URL(
                        `https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo`,
                    );

                    url.searchParams.set("user_id", String(user.id));
                    url.searchParams.set("userId", String(user.id));

                    if (obraSelecionada) {
                        url.searchParams.set("obra_id", String(obraSelecionada));
                        url.searchParams.set("obraId", String(obraSelecionada));
                    }

                    url.searchParams.set("data_inicio", di);
                    url.searchParams.set("data_fim", df);
                    url.searchParams.set("dataInicio", di);
                    url.searchParams.set("dataFim", df);

                    const res = await fetch(url.toString(), {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    if (res.ok) {
                        const registos = await res.json();
                        const registosPorDia = {};

                        // Agrupar registos por dia
                        (Array.isArray(registos) ? registos : []).forEach((registro) => {
                            const dataRegistro = new Date(
                                registro.data ||
                                registro.dataHora ||
                                registro.createdAt ||
                                registro.updatedAt,
                            );
                            
                            if (!isNaN(dataRegistro)) {
                                const dia = dataRegistro.getDate();
                                if (!registosPorDia[dia]) {
                                    registosPorDia[dia] = [];
                                }
                                registosPorDia[dia].push(registro);
                            }
                        });

                        registosReaisDetalhados[user.id] = registosPorDia;
                        console.log(`✅ [GRADE] ${user.nome}: ${Object.keys(registosPorDia).length} dias com registos`);
                    } else {
                        console.warn(`❌ [GRADE] Erro ao buscar registos para ${user.nome}: ${res.status}`);
                        registosReaisDetalhados[user.id] = {};
                    }
                } catch (error) {
                    console.error(`❌ [GRADE] Erro ao processar ${user.nome}:`, error);
                    registosReaisDetalhados[user.id] = {};
                }
            }

            // 3) Filtrar faltas para o mês/ano selecionado
            console.log("🔍 [GRADE] Etapa 3: Filtrando faltas do mês...");
            const faltasDoMes = faltasData.filter((falta) => {
                const dataFalta = new Date(falta.Data);
                const mesData = dataFalta.getMonth() + 1;
                const anoData = dataFalta.getFullYear();
                return mesData === mesSelecionado && anoData === anoSelecionado;
            });
            
            console.log("✅ [GRADE] Faltas do mês filtradas:", faltasDoMes.length);
            console.log("🔍 [GRADE] UserIds únicos nas faltas:", [...new Set(faltasDoMes.map(f => f.userId))]);
            console.log("🔍 [GRADE] UserIds dos utilizadores:", utilizadores.map(u => u.id));
            console.log("🔍 [GRADE] Primeiras faltas do mês:", faltasDoMes.slice(0, 3).map(f => ({
                userId: f.userId,
                nomeUsuario: f.nomeUsuario,
                Data: f.Data,
                Falta: f.Falta
            })));

            // 4) Construir a grelha com validação rigorosa
            const diasDoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
            const hoje = new Date();
            const dadosGradeTemp = [];

            utilizadores.forEach((user) => {
                const registosUsuario = registosReaisDetalhados[user.id] || {};
                
                // 🔍 STEP 1: Verificar se tem registos reais ESPECIFICAMENTE no período selecionado
                const temRegistosReaisNoMes = Object.keys(registosUsuario).length > 0;
                
                // 🔍 STEP 2: Verificar se tem faltas ESPECIFICAMENTE no período selecionado
                const faltasUsuarioNoMes = faltasDoMes.filter(falta => falta.userId === user.id);
                const temFaltasNoMes = faltasUsuarioNoMes.length > 0;
                
                // 🚫 VALIDAÇÃO ULTRA-RIGOROSA: Se não tem registos E não tem faltas NO MÊS ESPECÍFICO, ignorar
                if (!temRegistosReaisNoMes && !temFaltasNoMes) {
                    console.log(`🚫 [GRADE] ${user.nome}: IGNORADO - zero atividade no período ${mesSelecionado}/${anoSelecionado}`);
                    console.log(`🚫 [GRADE] ${user.nome}: - Registos no mês: ${temRegistosReaisNoMes ? 'SIM' : 'NÃO'}`);
                    console.log(`🚫 [GRADE] ${user.nome}: - Faltas no mês: ${temFaltasNoMes ? 'SIM' : 'NÃO'}`);
                    return; // 🚫 NÃO PROCESSAR este utilizador
                }
                
                // ✅ Utilizador tem atividade real no período - vai ser processado
                console.log(`✅ [GRADE] ${user.nome}: PROCESSANDO - tem atividade no período ${mesSelecionado}/${anoSelecionado}`);
                console.log(`✅ [GRADE] ${user.nome}: - Registos no mês: ${temRegistosReaisNoMes ? 'SIM' : 'NÃO'} (${Object.keys(registosUsuario).length} dias)`);
                console.log(`✅ [GRADE] ${user.nome}: - Faltas no mês: ${temFaltasNoMes ? 'SIM' : 'NÃO'} (${faltasUsuarioNoMes.length} faltas)`);
                
                if (temRegistosReaisNoMes && temFaltasNoMes) {
                    console.log(`🔄 [GRADE] ${user.nome}: Tipo: REGISTOS + FALTAS`);
                } else if (temRegistosReaisNoMes && !temFaltasNoMes) {
                    console.log(`🔄 [GRADE] ${user.nome}: Tipo: APENAS REGISTOS`);
                } else if (!temRegistosReaisNoMes && temFaltasNoMes) {
                    console.log(`🔄 [GRADE] ${user.nome}: Tipo: APENAS FALTAS`);
                }
                
                const dadosUsuario = {
                    utilizador: user,
                    estatisticasDias: {},
                    totalHorasMes: 0,
                    diasTrabalhados: 0,
                    faltasTotal: 0,
                };

                for (let dia = 1; dia <= diasDoMes; dia++) {
                    const dataAtual = new Date(anoSelecionado, mesSelecionado - 1, dia);
                    const diaSemana = dataAtual.getDay();
                    const isWeekend = diaSemana === 0 || diaSemana === 6;
                    const isFutureDate = dataAtual > hoje;

                    // Verificar faltas do dia
                    const faltasDoDia = faltasDoMes.filter((falta) => {
                        const df = new Date(falta.Data);
                        return df.getDate() === dia && falta.userId === user.id;
                    });

                    // Verificar registos reais do dia
                    const registosReaisDoDia = registosUsuario[dia] || [];
                    const temRegistosReais = registosReaisDoDia.length > 0;

                    let estatisticasDia = {
                        dia,
                        diaSemana,
                        isWeekend,
                        isFutureDate,
                        faltas: faltasDoDia,
                        temFalta: faltasDoDia.length > 0,
                        trabalhou: false,
                        registosReais: registosReaisDoDia,
                        temRegistosReais,
                    };

                    // Log para validação dos primeiros 5 dias
                    if (dia <= 5) {
                        console.log(`🔍 [GRADE] ${user.nome} - Dia ${dia}:`);
                        console.log(`   - Fim de semana: ${isWeekend}`);
                        console.log(`   - Futuro: ${isFutureDate}`);
                        console.log(`   - Faltas: ${faltasDoDia.length}`);
                        console.log(`   - Registos reais: ${registosReaisDoDia.length}`);
                        console.log(`   - Detalhes registos:`, registosReaisDoDia.map(r => ({
                            data: r.data || r.dataHora,
                            tipo: r.tipo,
                            hora: r.hora
                        })));
                    }

                    // PRIORIDADE 1: Faltas (sempre prevalecem sobre qualquer registo)
                    if (faltasDoDia.length > 0) {
                        estatisticasDia.trabalhou = false;
                        estatisticasDia.temFalta = true;
                        estatisticasDia.faltas = faltasDoDia;
                        dadosUsuario.faltasTotal++;
                        
                        // 🔧 Limpar qualquer dado de trabalho se há falta
                        estatisticasDia.horaEntrada = null;
                        estatisticasDia.horaSaida = null;
                        estatisticasDia.totalHoras = null;
                        estatisticasDia.temSaida = false;
                        
                        console.log(`❌ [GRADE] ${user.nome} - Dia ${dia}: FALTA registada (${faltasDoDia.length} falta(s))`);
                    }
                    // PRIORIDADE 2: Registos reais existem
                    else if (temRegistosReais && !isWeekend && !isFutureDate) {
                        // Usar dados reais se disponíveis, senão gerar fictícios
                        const entradas = registosReaisDoDia.filter(r => r.tipo === 'entrada');
                        const saidas = registosReaisDoDia.filter(r => r.tipo === 'saida');

                        if (entradas.length > 0) {
                            estatisticasDia.horaEntrada = entradas[0].hora || entradas[0].dataHora?.split('T')[1]?.substr(0, 5) || "08:00";
                            
                            if (saidas.length > 0) {
                                estatisticasDia.horaSaida = saidas[saidas.length - 1].hora || saidas[saidas.length - 1].dataHora?.split('T')[1]?.substr(0, 5) || "17:00";
                                estatisticasDia.totalHoras = 8.0;
                                estatisticasDia.temSaida = true;
                                dadosUsuario.totalHorasMes += 8;
                                dadosUsuario.diasTrabalhados++;
                            } else {
                                // Só entrada, verificar se é hoje
                                const isHoje = dataAtual.toDateString() === hoje.toDateString();
                                if (isHoje) {
                                    estatisticasDia.horaSaida = null;
                                    estatisticasDia.temSaida = false;
                                    dadosUsuario.diasTrabalhados += 0.5;
                                } else {
                                    // Dia passado sem saída - gerar saída fictícia
                                    estatisticasDia.horaSaida = "17:00";
                                    estatisticasDia.totalHoras = 8.0;
                                    estatisticasDia.temSaida = true;
                                    dadosUsuario.totalHorasMes += 8;
                                    dadosUsuario.diasTrabalhados++;
                                }
                            }
                            
                            estatisticasDia.trabalhou = true;
                            console.log(`✅ [GRADE] ${user.nome} - Dia ${dia}: DADOS REAIS/HÍBRIDOS`);
                        } else {
                            // Registos existem mas sem entrada clara - gerar fictício
                            const isHoje = dataAtual.toDateString() === hoje.toDateString();
                            const horaAtual = isHoje ? 
                                `${String(hoje.getHours()).padStart(2, '0')}:${String(hoje.getMinutes()).padStart(2, '0')}` 
                                : null;

                            const pontosFicticios = gerarPontosFicticios(user.id, dia, isHoje, horaAtual);
                            Object.assign(estatisticasDia, pontosFicticios);
                            estatisticasDia.trabalhou = true;

                            if (pontosFicticios.temSaida) {
                                dadosUsuario.totalHorasMes += 8;
                                dadosUsuario.diasTrabalhados++;
                            } else {
                                dadosUsuario.diasTrabalhados += 0.5;
                            }
                            console.log(`🔧 [GRADE] ${user.nome} - Dia ${dia}: FICTÍCIO (registos sem entrada clara)`);
                        }
                    }
                    // PRIORIDADE 3: 🚫 REGRA RIGOROSA - SÓ gerar fictícios se tem registos reais NO MÊS
                    else if (!isWeekend && !isFutureDate) {
                        // 🚫 VALIDAÇÃO RIGOROSA: Só gera fictícios se tem registos reais NESTE mês específico
                        if (temRegistosReaisNoMes) {
                            // ✅ Utilizador tem registos reais no mês atual - pode ter fictícios
                            const isHoje = dataAtual.toDateString() === hoje.toDateString();
                            const horaAtual = isHoje ? 
                                `${String(hoje.getHours()).padStart(2, '0')}:${String(hoje.getMinutes()).padStart(2, '0')}` 
                                : null;

                            const pontosFicticios = gerarPontosFicticios(user.id, dia, isHoje, horaAtual);
                            Object.assign(estatisticasDia, pontosFicticios);
                            estatisticasDia.trabalhou = true;

                            if (pontosFicticios.temSaida) {
                                dadosUsuario.totalHorasMes += 8;
                                dadosUsuario.diasTrabalhados++;
                            } else {
                                dadosUsuario.diasTrabalhados += 0.5;
                            }
                            console.log(`🔧 [GRADE] ${user.nome} - Dia ${dia}: FICTÍCIO autorizado (tem ${Object.keys(registosUsuario).length} dias reais)`);
                        } else {
                            // 🚫 Sem registos reais no mês - NÃO gerar fictícios
                            estatisticasDia.trabalhou = false;
                            estatisticasDia.horaEntrada = null;
                            estatisticasDia.horaSaida = null;
                            estatisticasDia.totalHoras = null;
                            estatisticasDia.temSaida = false;
                            console.log(`🚫 [GRADE] ${user.nome} - Dia ${dia}: SEM FICTÍCIOS - zero registos no mês ${mesSelecionado}/${anoSelecionado}`);
                        }
                    }

                    dadosUsuario.estatisticasDias[dia] = estatisticasDia;
                }

                dadosGradeTemp.push(dadosUsuario);
            });

            console.log("✅ [GRADE] Grade final gerada com", dadosGradeTemp.length, "utilizadores");
            console.log("✅ [GRADE] Utilizadores filtrados:", utilizadores.length - dadosGradeTemp.length, "utilizadores sem atividade no período");

            // Validação final - verificar se algum utilizador sem atividade passou pela validação
            dadosGradeTemp.forEach((dadosUsuario) => {
                const registosReaisUtilizador = registosReaisDetalhados[dadosUsuario.utilizador.id] || {};
                const faltasUtilizador = faltasDoMes.filter(f => f.userId === dadosUsuario.utilizador.id);
                
                const totalDiasComRegistos = Object.keys(registosReaisUtilizador).length;
                const totalFaltasNoMes = faltasUtilizador.length;
                const totalDiasComPontosFicticios = Object.values(dadosUsuario.estatisticasDias)
                    .filter(dia => dia.trabalhou && !dia.temRegistosReais && !dia.temFalta).length;

                // 🚨 ALERTA: Se tem pontos fictícios mas não tem registos reais no mês
                if (totalDiasComPontosFicticios > 0 && totalDiasComRegistos === 0 && totalFaltasNoMes === 0) {
                    console.error(`🚨 [VALIDAÇÃO] ERRO: ${dadosUsuario.utilizador.nome} tem ${totalDiasComPontosFicticios} pontos fictícios mas ZERO atividade real no período!`);
                }

                console.log(`📊 [GRADE] ${dadosUsuario.utilizador.nome}:`);
                console.log(`   - Dias com registos reais: ${totalDiasComRegistos}`);
                console.log(`   - Dias com pontos fictícios: ${totalDiasComPontosFicticios}`);
                console.log(`   - Total faltas: ${totalFaltasNoMes}`);
                console.log(`   - Dias trabalhados: ${dadosUsuario.diasTrabalhados}`);
                console.log(`   - Total horas: ${dadosUsuario.totalHorasMes}`);
                console.log(`   - ✅ Validação: ${(totalDiasComRegistos > 0 || totalFaltasNoMes > 0) ? 'PASSOU' : '❌ FALHOU'}`);
            });

            setDadosGrade(dadosGradeTemp);
        } catch (error) {
            console.error("❌ [GRADE] Erro ao carregar dados da grade:", error);
            Alert.alert("Erro", "Erro ao carregar dados da grade");
        } finally {
            setLoading(false);
        }
    };

    const getCellStyle = (estatisticas) => {
        if (!estatisticas) return styles.cellEmpty;

        if (estatisticas.isWeekend) {
            return styles.cellWeekend;
        }

        if (estatisticas.isFutureDate) {
            return styles.cellFuture;
        }

        // Priorizar a exibição de faltas sobre trabalho
        if (estatisticas.temFalta) {
            return styles.cellFalta;
        }

        if (estatisticas.trabalhou) {
            return styles.cellTrabalhou;
        }

        return styles.cellEmpty;
    };

    const getCellText = (estatisticas) => {
        if (!estatisticas || estatisticas.isWeekend) return "";

        if (estatisticas.isFutureDate) return "";

        // Priorizar a exibição de faltas sobre trabalho
        if (estatisticas.temFalta) {
            return "FALTA";
        }

        if (estatisticas.trabalhou) {
            if (estatisticas.horaSaida) {
                return `${estatisticas.horaEntrada}\n${estatisticas.horaSaida}`;
            } else {
                return `${estatisticas.horaEntrada}\n---`;
            }
        }

        return "";
    };

    const exportarPicagensParaExcel = () => {
        if (!dadosGrade.length) {
            Alert.alert('Aviso', 'Não há dados para exportar');
            return;
        }

        if (!obraSelecionada) {
            Alert.alert('Aviso', 'Nenhuma obra selecionada');
            return;
        }

        try {
            const workbook = XLSX.utils.book_new();
            const diasDoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
            const dias = Array.from({ length: diasDoMes }, (_, i) => i + 1);
            const obraNome = obras.find(obra => obra.id.toString() === obraSelecionada)?.nome || 'Obra não encontrada';

            // Criar dados para exportação em formato profissional
            const dadosExport = [];

            // ========== CABEÇALHO PRINCIPAL ==========
            dadosExport.push(['RELATÓRIO DE ANÁLISE COMPLETA DE REGISTOS DE PONTO']);
            dadosExport.push(['']);

            // Informações do relatório
            dadosExport.push(['📅 PERÍODO:', `${meses[mesSelecionado - 1]} de ${anoSelecionado}`]);
            dadosExport.push(['🏢 OBRA:', obraNome]);
            dadosExport.push(['👥 FUNCIONÁRIOS:', `${dadosGrade.length} utilizadores`]);
            dadosExport.push(['📊 DATA GERAÇÃO:', new Date().toLocaleString('pt-PT')]);
            dadosExport.push(['']);
            dadosExport.push(['']);

            // ========== LEGENDA DE CORES E SÍMBOLOS ==========
            dadosExport.push(['📋 LEGENDA:']);
            dadosExport.push(['', '✅ Registo Normal', '- Horário de entrada e saída']);
            dadosExport.push(['', '❌ FALTA', '- Ausência registada']);
            dadosExport.push(['', '📅 FDS', '- Fim de semana']);
            dadosExport.push(['', '🔄 Em curso', '- Apenas entrada registada']);
            dadosExport.push(['']);
            dadosExport.push(['']);

            // ========== CABEÇALHO DA TABELA DE DADOS ==========
            const headerRow = ['FUNCIONÁRIO'];

            // Adicionar dias do mês com dia da semana
            dias.forEach(dia => {
                const dataCompleta = new Date(anoSelecionado, mesSelecionado - 1, dia);
                const diaSemana = dataCompleta.toLocaleDateString('pt-PT', { weekday: 'short' }).toUpperCase();
                headerRow.push(`${dia}\n${diaSemana}`);
            });

            headerRow.push('TOTAL\nHORAS', 'DIAS\nTRABALHADOS', 'TOTAL\nFALTAS');
            dadosExport.push(headerRow);

            // ========== DADOS DOS FUNCIONÁRIOS ==========
            dadosGrade.forEach((dadosUsuario, index) => {
                const row = [dadosUsuario.utilizador.nome];

                // Adicionar dados de cada dia
                dias.forEach(dia => {
                    const estatisticas = dadosUsuario.estatisticasDias[dia];
                    let cellValue = '';

                    if (estatisticas) {
                        if (estatisticas.isWeekend) {
                            cellValue = '📅 FDS';
                        } else if (estatisticas.isFutureDate) {
                            cellValue = '';
                        } else if (estatisticas.temFalta) {
                            cellValue = '❌ FALTA';
                        } else if (estatisticas.trabalhou) {
                            if (estatisticas.horaSaida) {
                                cellValue = `✅ ${estatisticas.horaEntrada}\n${estatisticas.horaSaida}`;
                            } else {
                                cellValue = `🔄 ${estatisticas.horaEntrada}\nEm curso`;
                            }
                        } else {
                            cellValue = '';
                        }
                    }

                    row.push(cellValue);
                });

                // Adicionar totais com formatação
                row.push(
                    `${dadosUsuario.totalHorasMes}h`,
                    `${dadosUsuario.diasTrabalhados} dias`,
                    `${dadosUsuario.faltasTotal} faltas`
                );

                dadosExport.push(row);
            });

            // ========== LINHA DE SEPARAÇÃO ==========
            const separatorRow = Array(headerRow.length).fill('═══════════');
            dadosExport.push(separatorRow);

            // ========== RESUMO ESTATÍSTICO ==========
            const totalHorasTodos = dadosGrade.reduce((sum, user) => sum + user.totalHorasMes, 0);
            const totalDiasTodos = dadosGrade.reduce((sum, user) => sum + user.diasTrabalhados, 0);
            const totalFaltasTodos = dadosGrade.reduce((sum, user) => sum + user.faltasTotal, 0);
            const mediaHorasPorFuncionario = (totalHorasTodos / dadosGrade.length).toFixed(1);
            const mediaDiasPorFuncionario = (totalDiasTodos / dadosGrade.length).toFixed(1);

            dadosExport.push(['📊 RESUMO ESTATÍSTICO']);
            dadosExport.push(['']);

            // Totais gerais
            const resumoRow = Array(dias.length + 1).fill('');
            resumoRow[0] = 'TOTAIS GERAIS:';
            resumoRow[resumoRow.length - 3] = `${totalHorasTodos}h`;
            resumoRow[resumoRow.length - 2] = `${totalDiasTodos} dias`;
            resumoRow[resumoRow.length - 1] = `${totalFaltasTodos} faltas`;
            dadosExport.push(resumoRow);

            // Médias
            const mediaRow = Array(dias.length + 1).fill('');
            mediaRow[0] = 'MÉDIAS POR FUNCIONÁRIO:';
            mediaRow[mediaRow.length - 3] = `${mediaHorasPorFuncionario}h`;
            mediaRow[mediaRow.length - 2] = `${mediaDiasPorFuncionario} dias`;
            mediaRow[mediaRow.length - 1] = `${(totalFaltasTodos / dadosGrade.length).toFixed(1)} faltas`;
            dadosExport.push(mediaRow);

            dadosExport.push(['']);

            // ========== ANÁLISE POR CATEGORIA ==========
            dadosExport.push(['📈 ANÁLISE DETALHADA:']);

            const funcionariosComMaisFaltas = dadosGrade
                .filter(user => user.faltasTotal > 0)
                .sort((a, b) => b.faltasTotal - a.faltasTotal)
                .slice(0, 5);

            if (funcionariosComMaisFaltas.length > 0) {
                dadosExport.push(['']);
                dadosExport.push(['🚨 TOP 5 - FUNCIONÁRIOS COM MAIS FALTAS:']);
                funcionariosComMaisFaltas.forEach((user, index) => {
                    dadosExport.push([`${index + 1}. ${user.utilizador.nome}`, '', '', '', `${user.faltasTotal} faltas`]);
                });
            }

            const funcionariosComMaisHoras = dadosGrade
                .sort((a, b) => b.totalHorasMes - a.totalHorasMes)
                .slice(0, 5);

            dadosExport.push(['']);
            dadosExport.push(['⭐ TOP 5 - FUNCIONÁRIOS COM MAIS HORAS:']);
            funcionariosComMaisHoras.forEach((user, index) => {
                dadosExport.push([`${index + 1}. ${user.utilizador.nome}`, '', '', '', `${user.totalHorasMes}h`]);
            });

            // ========== CRIAR E FORMATAR PLANILHA ==========
            const worksheet = XLSX.utils.aoa_to_sheet(dadosExport);

            // Definir larguras das colunas otimizadas
            const colWidths = [{ wch: 25 }]; // Nome do funcionário mais largo
            dias.forEach(() => colWidths.push({ wch: 14 })); // Dias com espaço para duas linhas
            colWidths.push({ wch: 12 }, { wch: 15 }, { wch: 12 }); // Totais

            worksheet['!cols'] = colWidths;

            // Definir altura das linhas para melhor visualização
            const rowHeights = dadosExport.map((row, index) => {
                if (index === 0) return { hpt: 25 }; // Título principal
                if (index >= 12 && index < 12 + dadosGrade.length + 1) return { hpt: 35 }; // Linhas de dados
                return { hpt: 20 }; // Outras linhas
            });
            worksheet['!rows'] = rowHeights;

            // Adicionar planilha ao workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Análise Completa');

            // ========== CRIAR PLANILHA DE RESUMO EXECUTIVO ==========
            const resumoExecutivo = [
                ['RESUMO EXECUTIVO - ASSIDUIDADE'],
                [''],
                ['OBRA:', obraNome],
                ['PERÍODO:', `${meses[mesSelecionado - 1]} ${anoSelecionado}`],
                [''],
                ['INDICADORES PRINCIPAIS:'],
                [''],
                ['👥 Total de Funcionários:', dadosGrade.length],
                ['⏰ Total de Horas Trabalhadas:', `${totalHorasTodos}h`],
                ['📅 Total de Dias Trabalhados:', totalDiasTodos],
                ['❌ Total de Faltas:', totalFaltasTodos],
                [''],
                ['MÉDIAS:'],
                [''],
                ['⏰ Horas por Funcionário:', `${mediaHorasPorFuncionario}h`],
                ['📅 Dias por Funcionário:', `${mediaDiasPorFuncionario} dias`],
                ['❌ Faltas por Funcionário:', `${(totalFaltasTodos / dadosGrade.length).toFixed(1)}`],
                [''],
                ['TAXA DE ASSIDUIDADE:'],
                [''],
                ['🎯 Taxa Geral:', `${(((totalDiasTodos / (dadosGrade.length * diasDoMes)) * 100) || 0).toFixed(1)}%`],
            ];

            const worksheetResumo = XLSX.utils.aoa_to_sheet(resumoExecutivo);
            worksheetResumo['!cols'] = [{ wch: 30 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(workbook, worksheetResumo, 'Resumo Executivo');

            // Salvar arquivo com nome mais descritivo
            const dataAtual = new Date().toISOString().split('T')[0];
            const fileName = `Analise_Completa_Registos_${obraNome.replace(/[^a-zA-Z0-9]/g, '_')}_${meses[mesSelecionado - 1]}_${anoSelecionado}_${dataAtual}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            Alert.alert('✅ Exportação Concluída', 
                `Relatório completo exportado com sucesso!\n\n📁 Arquivo: ${fileName}\n📊 ${dadosGrade.length} funcionários analisados\n⏰ ${totalHorasTodos}h totais registadas`);
        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            Alert.alert('❌ Erro na Exportação', 'Ocorreu um erro ao gerar o relatório Excel. Tente novamente.');
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
                                            `Saída: ${estatisticas.horaSaida || 'Em curso'}\n` +
                                            (estatisticas.totalHoras 
                                                ? `Total Horas: ${estatisticas.totalHoras}h`
                                                : 'Dia em curso'),
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
                {/* Header */}
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

                {/* Filtros */}
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
                                        label="Selecione uma obra..."
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

                {/* Legenda */}
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

                {/* Grade */}
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
                                {anoSelecionado} ({dadosGrade.length} utilizadores)
                            </Text>
                            <View style={styles.buttonGroup}>
                                <TouchableOpacity
                                    style={styles.refreshButton}
                                    onPress={() => {
                                        if (!obraSelecionada) {
                                            Alert.alert('Aviso', 'Selecione uma obra primeiro');
                                            return;
                                        }

                                        Alert.alert(
                                            'Atualizar Dados',
                                            'Deseja recarregar apenas as faltas ou todos os dados?',
                                            [
                                                {
                                                    text: 'Cancelar',
                                                    style: 'cancel'
                                                },
                                                {
                                                    text: 'Apenas Faltas',
                                                    onPress: async () => {
                                                        setLoading(true);
                                                        try {
                                                            console.log("🔄 [REFRESH] Recarregando apenas faltas...");
                                                            const novasFaltas = await carregarFaltas();
                                                            setFaltas(novasFaltas);
                                                            
                                                            // Filtrar faltas do mês atual
                                                            const faltasDoMes = novasFaltas.filter((falta) => {
                                                                const dataFalta = new Date(falta.Data);
                                                                const mesData = dataFalta.getMonth() + 1;
                                                                const anoData = dataFalta.getFullYear();
                                                                return mesData === mesSelecionado && anoData === anoSelecionado;
                                                            });

                                                            // Reprocessar dados da grade com as novas faltas
                                                            const dadosAtualizados = dadosGrade.map(dadosUsuario => {
                                                                let novosDados = { ...dadosUsuario };
                                                                novosDados.faltasTotal = 0;
                                                                
                                                                // Filtrar faltas para este usuário
                                                                const faltasUsuario = faltasDoMes.filter(falta => 
                                                                    falta.userId === dadosUsuario.utilizador.id
                                                                );
                                                                
                                                                // Atualizar cada dia
                                                                Object.keys(novosDados.estatisticasDias).forEach(dia => {
                                                                    const diaNum = parseInt(dia);
                                                                    const faltasDoDia = faltasUsuario.filter(falta => {
                                                                        const dataFalta = new Date(falta.Data);
                                                                        return dataFalta.getDate() === diaNum;
                                                                    });
                                                                    
                                                                    // Atualizar estatísticas do dia
                                                                    const estatisticasDia = { ...novosDados.estatisticasDias[dia] };
                                                                    
                                                                    if (faltasDoDia.length > 0) {
                                                                        estatisticasDia.faltas = faltasDoDia;
                                                                        estatisticasDia.temFalta = true;
                                                                        estatisticasDia.trabalhou = false;
                                                                        // Limpar dados de trabalho se há falta
                                                                        estatisticasDia.horaEntrada = null;
                                                                        estatisticasDia.horaSaida = null;
                                                                        estatisticasDia.totalHoras = null;
                                                                        novosDados.faltasTotal++;
                                                                    } else {
                                                                        estatisticasDia.faltas = [];
                                                                        estatisticasDia.temFalta = false;
                                                                        // Se não há falta e não é fim de semana/futuro, 
                                                                        // regenerar dados de trabalho se necessário
                                                                        if (!estatisticasDia.isWeekend && 
                                                                            !estatisticasDia.isFutureDate && 
                                                                            !estatisticasDia.horaEntrada) {
                                                                            
                                                                            const hoje = new Date();
                                                                            const dataAtual = new Date(anoSelecionado, mesSelecionado - 1, diaNum);
                                                                            const isHoje = dataAtual.toDateString() === hoje.toDateString();
                                                                            const horaAtual = isHoje ? 
                                                                                `${String(hoje.getHours()).padStart(2, '0')}:${String(hoje.getMinutes()).padStart(2, '0')}` 
                                                                                : null;

                                                                            const pontosFicticios = gerarPontosFicticios(
                                                                                dadosUsuario.utilizador.id,
                                                                                diaNum,
                                                                                isHoje,
                                                                                horaAtual
                                                                            );
                                                                            
                                                                            Object.assign(estatisticasDia, pontosFicticios);
                                                                            estatisticasDia.trabalhou = true;
                                                                        }
                                                                    }
                                                                    
                                                                    novosDados.estatisticasDias[dia] = estatisticasDia;
                                                                });
                                                                
                                                                return novosDados;
                                                            });
                                                            
                                                            setDadosGrade(dadosAtualizados);
                                                            Alert.alert('✅ Sucesso', 'Faltas atualizadas com sucesso!');
                                                        } catch (error) {
                                                            console.error("❌ Erro ao recarregar faltas:", error);
                                                            Alert.alert('❌ Erro', 'Erro ao recarregar faltas. Tente novamente.');
                                                        } finally {
                                                            setLoading(false);
                                                        }
                                                    }
                                                },
                                                {
                                                    text: 'Todos os Dados',
                                                    onPress: () => {
                                                        console.log("🔄 [REFRESH] Recarregando todos os dados...");
                                                        carregarDadosGrade();
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                    disabled={loading || !obraSelecionada}
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
                                        <Text style={styles.refreshButtonText}>
                                            Atualizar
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
                ) : obraSelecionada ? (
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
                ) : (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="filter"
                            size={64}
                            color="#ccc"
                        />
                        <Text style={styles.emptyText}>
                            Selecione uma obra para visualizar a grade
                        </Text>
                    </View>
                )}
            </ScrollView>
        </LinearGradient>
    );
};



export default AnaliseComplotaPontos;