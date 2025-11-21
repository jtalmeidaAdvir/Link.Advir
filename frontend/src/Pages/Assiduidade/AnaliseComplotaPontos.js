import React, { useState, useEffect } from "react";
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
        const token = secureStorage.getItem("loginToken");

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
                    console.log(`Body: ${txt}`);
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

    const [horariosUtilizadores, setHorariosUtilizadores] = useState({});
    const [horariosCarregados, setHorariosCarregados] = useState(false);

    useEffect(() => {
        carregarDadosIniciais();
    }, []);

    // Só carregar dados da grade quando os horários estiverem disponíveis
    useEffect(() => {
        if (horariosCarregados && utilizadores.length > 0 && Object.keys(horariosUtilizadores).length > 0) {
            console.log(`✅ [INIT] Horários carregados (${Object.keys(horariosUtilizadores).length}/${utilizadores.length}), iniciando carregamento da grade...`);
            console.log(`📋 [INIT] Período: ${mesSelecionado}/${anoSelecionado} | Obra: ${obraSelecionada || 'Todas'}`);
            carregarDadosGrade();
        } else if (utilizadores.length > 0 && !horariosCarregados) {
            console.log(`⏳ [INIT] Aguardando carregamento de horários (${Object.keys(horariosUtilizadores).length}/${utilizadores.length} carregados)...`);
        }
    }, [obraSelecionada, mesSelecionado, anoSelecionado, horariosCarregados]);

    const carregarDadosIniciais = async () => {
        setLoading(true);
        try {
            const token = secureStorage.getItem("loginToken");
            const empresaId = secureStorage.getItem("empresa_id");

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
                codFuncionario:
                    user.codFuncionario || user.username || user.nome,
            }));

            console.log(
                "🔍 [INIT] Utilizadores carregados:",
                utilizadoresFormatados.length,
            );

            // Carregar horários e filtrar apenas utilizadores com plano ativo
            const { utilizadoresComHorario, horariosMap } = await carregarHorariosUtilizadores(utilizadoresFormatados);

            console.log(`✅ [INIT] Filtrados ${utilizadoresComHorario.length} utilizadores COM plano de horário ativo`);

            setUtilizadores(utilizadoresComHorario);
            setHorariosUtilizadores(horariosMap);

            // Marcar horários como carregados apenas depois de concluir
            setHorariosCarregados(true);
            console.log("✅ [INIT] Todos os horários carregados, pronto para carregar grade");
        } catch (error) {
            console.error("Erro ao carregar dados iniciais:", error);
            Alert.alert("Erro", "Erro ao carregar dados iniciais");
        } finally {
            setLoading(false);
        }
    };

    // Função auxiliar para extrair HH:mm de uma string ISO ou hora completa
    const extrairHoraMinuto = (horaStr) => {
        if (!horaStr) return null;
        
        // Se for uma data ISO (contém 'T' ou '-'), extrair apenas a parte da hora
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
        
        // Se já estiver em formato HH:mm ou HH:mm:ss, extrair apenas HH:mm
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

            console.log(`🔍 [HORARIOS] Iniciando carregamento de horários para ${utilizadores.length} utilizadores...`);

            // Carregar todos os horários em paralelo para ser mais rápido
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
                        // A API retorna um objeto PlanoHorario que contém um objeto Horario aninhado
                        const horarioData = planoHorario?.Horario || planoHorario;

                        // ✅ VALIDAR que o plano está ATIVO
                        if (planoHorario && planoHorario.ativo === true && horarioData) {
                            // ✅ CONVERTER horários ISO para formato HH:mm
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
                            console.warn(`⚠️ [HORARIOS] ${user.nome}: Plano inativo ou sem horário associado`);
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
                        console.warn(`⚠️ [HORARIOS] ${user.nome}: Sem plano de horário (${res.status})`);
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

            // ✅ FILTRAR apenas utilizadores com plano de horário ativo
            resultados.forEach(resultado => {
                if (resultado.planoAtivo && resultado.horario) {
                    horariosMap[resultado.userId] = resultado.horario;
                    utilizadoresComHorario.push(resultado.user);
                }
            });

            // Logs de resumo
            const comHorario = resultados.filter(r => r.planoAtivo).length;
            const semHorario = resultados.length - comHorario;

            console.log(`✅ [HORARIOS] Carregamento concluído:`);
            console.log(`   - Total analisado: ${resultados.length} utilizadores`);
            console.log(`   - ✅ Com plano ativo: ${comHorario}`);
            console.log(`   - ❌ Sem plano ativo (EXCLUÍDOS): ${semHorario}`);

            if (comHorario > 0) {
                console.log(`📋 [HORARIOS] Utilizadores com horário ativo:`);
                resultados.filter(r => r.planoAtivo).forEach(r => {
                    console.log(`   - ${r.userName}: ${r.horario.horaEntrada}-${r.horario.horaSaida} (${r.horario.horasPorDia}h/dia)`);
                });
            }

            return { utilizadoresComHorario, horariosMap };

        } catch (error) {
            console.error("❌ [HORARIOS] Erro geral ao carregar horários:", error);
            return { utilizadoresComHorario: [], horariosMap: {} };
        }
    };

    const carregarFaltas = async () => {
        try {
            const painelAdminToken = secureStorage.getItem("painelAdminToken");
            const urlempresa = secureStorage.getItem("urlempresa");
            const loginToken = secureStorage.getItem("loginToken");

            console.log("🔍 [FALTAS] Iniciando carregamento de faltas...");
            console.log(
                "🔍 [FALTAS] painelAdminToken:",
                painelAdminToken ? "✅ Presente" : "❌ Ausente",
            );
            console.log(
                "🔍 [FALTAS] urlempresa:",
                urlempresa ? "✅ Presente" : "❌ Ausente",
            );
            console.log(
                "🔍 [FALTAS] loginToken:",
                loginToken ? "✅ Presente" : "❌ Ausente",
            );

            if (!painelAdminToken || !urlempresa || !loginToken) {
                console.warn(
                    "❌ [FALTAS] Token, URL da empresa ou loginToken não encontrados para carregar faltas",
                );
                return [];
            }

            console.log(
                "🔍 [FALTAS] Utilizadores a processar:",
                utilizadores.length,
            );

            const promises = utilizadores.map(async (user) => {
                try {
                    console.log(
                        `🔍 [FALTAS] Carregando faltas para ${user.nome} (ID: ${user.id})`,
                    );

                    // Primeiro, obter o codFuncionario do backend
                    console.log(
                        `🔍 [FALTAS] Obtendo codFuncionario para userId: ${user.id}`,
                    );
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
                        const errorText = await resCodFuncionario
                            .text()
                            .catch(() => "Erro desconhecido");
                        console.warn(
                            `❌ [FALTAS] Erro ao obter codFuncionario para ${user.nome}: ${errorText}`,
                        );
                        return [];
                    }

                    const dataCodFuncionario = await resCodFuncionario.json();
                    const codFuncionario = dataCodFuncionario.codFuncionario;

                    if (!codFuncionario) {
                        console.warn(
                            `❌ [FALTAS] codFuncionario não definido para ${user.nome}`,
                        );
                        return [];
                    }

                    console.log(
                        `✅ [FALTAS] codFuncionario obtido para ${user.nome}: "${codFuncionario}"`,
                    );

                    // Agora usar o codFuncionario para buscar as faltas
                    const urlFaltas = `https://webapiprimavera.advir.pt/routesFaltas/GetListaFaltasFuncionario/${codFuncionario}`;
                    console.log(
                        `🔍 [FALTAS] Chamando API de faltas para ${user.nome}: ${urlFaltas}`,
                    );

                    const res = await fetch(urlFaltas, {
                        headers: {
                            Authorization: `Bearer ${painelAdminToken}`,
                            urlempresa: urlempresa,
                            "Content-Type": "application/json",
                        },
                    });

                    console.log(
                        `🔍 [FALTAS] Response status para ${user.nome}:`,
                        res.status,
                    );

                    if (res.ok) {
                        const data = await res.json();
                        const faltasUsuario = data?.DataSet?.Table || [];

                        if (faltasUsuario.length > 0) {
                            console.log(
                                `✅ [FALTAS] ${user.nome}: ${faltasUsuario.length} faltas encontradas`,
                            );
                            console.log(
                                `🔍 [FALTAS] Primeiras faltas de ${user.nome}:`,
                                faltasUsuario.slice(0, 3),
                            );

                            const faltasComUserId = faltasUsuario.map(
                                (falta) => ({
                                    ...falta,
                                    userId: user.id,
                                    nomeUsuario: user.nome,
                                    codFuncionarioUsado: codFuncionario,
                                }),
                            );

                            return faltasComUserId;
                        } else {
                            console.log(
                                `⚠️ [FALTAS] ${user.nome}: API retornou com sucesso mas sem faltas`,
                            );
                        }
                    } else {
                        const errorText = await res
                            .text()
                            .catch(() => "Erro desconhecido");
                        console.warn(
                            `❌ [FALTAS] Erro ${res.status} para ${user.nome}: ${errorText}`,
                        );
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
            console.log(
                "✅ [FALTAS] Total de faltas carregadas:",
                faltasTotal.length,
            );

            if (faltasTotal.length > 0) {
                console.log(
                    "🔍 [FALTAS] Primeiras faltas gerais:",
                    faltasTotal.slice(0, 5),
                );
                console.log("🔍 [FALTAS] UserIds únicos nas faltas:", [
                    ...new Set(faltasTotal.map((f) => f.userId)),
                ]);
            }

            return faltasTotal;
        } catch (error) {
            console.error("❌ [FALTAS] Erro ao carregar faltas:", error);
            return [];
        }
    };

    const gerarPontosFicticios = (userId, dia, isHoje, horaAtual) => {
        // Obter horário do utilizador
        const horarioUser = horariosUtilizadores[userId];

        if (!horarioUser) {
            console.warn(`⚠️ [PONTOS] UserId ${userId} - Dia ${dia}: Horário não encontrado, usando padrão 08:00-17:00`);
            console.log(`📊 [PONTOS] Estado: ${Object.keys(horariosUtilizadores).length} horários carregados - IDs: [${Object.keys(horariosUtilizadores).join(', ')}]`);
        }

        const horarioFinal = horarioUser || {
            horaEntrada: "08:00",
            horaSaida: "17:00",
            intervaloAlmoco: 1.00,
            horasPorDia: 8.00,
        };

        if (dia === 1) {
            console.log(`📋 [PONTOS] UserId ${userId}: Horário aplicado ${horarioFinal.horaEntrada}-${horarioFinal.horaSaida} (${horarioFinal.horasPorDia}h/dia, ${horarioFinal.intervaloAlmoco}h almoço)`);
        }

        // Parse do horário (formato HH:mm ou HH:mm:ss)
        const parseHora = (horaStr) => {
            if (!horaStr) return { h: 0, m: 0 };
            const partes = String(horaStr).split(':');
            return {
                h: parseInt(partes[0], 10) || 0,
                m: parseInt(partes[1], 10) || 0
            };
        };

        // Função para adicionar variação aleatória de -5 a +5 minutos
        const adicionarVariacao = (h, m) => {
            // Gerar variação entre -5 e +5 minutos
            const variacao = Math.floor(Math.random() * 11) - 5; // -5 a +5
            let totalMinutos = h * 60 + m + variacao;

            // Garantir que não fica negativo
            if (totalMinutos < 0) totalMinutos = 0;

            const novaHora = Math.floor(totalMinutos / 60);
            const novoMinuto = totalMinutos % 60;

            return {
                h: novaHora,
                m: novoMinuto
            };
        };

        // Aplicar variação aos horários
        const entradaBase = parseHora(horarioFinal.horaEntrada);
        const saidaBase = parseHora(horarioFinal.horaSaida);

        const entradaVariada = adicionarVariacao(entradaBase.h, entradaBase.m);
        const saidaVariada = adicionarVariacao(saidaBase.h, saidaBase.m);

        const horaEntrada = `${String(entradaVariada.h).padStart(2, "0")}:${String(entradaVariada.m).padStart(2, "0")}`;
        const horaSaida = `${String(saidaVariada.h).padStart(2, "0")}:${String(saidaVariada.m).padStart(2, "0")}`;

        // Calcular intervalo de almoço (com horários base, não variados)
        const intervaloMinutos = Math.floor(horarioFinal.intervaloAlmoco * 60);
        const minutosEntrada = entradaBase.h * 60 + entradaBase.m;
        const minutosSaida = saidaBase.h * 60 + saidaBase.m;

        // Saída e entrada de almoço (meio do expediente)
        const minutosTrabalho = minutosSaida - minutosEntrada - intervaloMinutos;
        const minutosAteAlmoco = Math.floor(minutosTrabalho / 2);

        const minutosSaidaAlmoco = minutosEntrada + minutosAteAlmoco;
        const saidaAlmocoBase = {
            h: Math.floor(minutosSaidaAlmoco / 60),
            m: minutosSaidaAlmoco % 60
        };
        const saidaAlmocoVariada = adicionarVariacao(saidaAlmocoBase.h, saidaAlmocoBase.m);
        const saidaAlmoco = `${String(saidaAlmocoVariada.h).padStart(2, "0")}:${String(saidaAlmocoVariada.m).padStart(2, "0")}`;

        const minutosEntradaAlmoco = minutosSaidaAlmoco + intervaloMinutos;
        const entradaAlmocoBase = {
            h: Math.floor(minutosEntradaAlmoco / 60),
            m: minutosEntradaAlmoco % 60
        };
        const entradaAlmocoVariada = adicionarVariacao(entradaAlmocoBase.h, entradaAlmocoBase.m);
        const entradaAlmoco = `${String(entradaAlmocoVariada.h).padStart(2, "0")}:${String(entradaAlmocoVariada.m).padStart(2, "0")}`;

        // Verificar se deve mostrar saída (se é hoje e já passou da hora)
        let mostrarSaida = true;
        let mostrarAlmoco = true;

        if (isHoje && horaAtual) {
            const [horaAtualH, horaAtualM] = horaAtual.split(":").map(Number);
            const minutosAtuais = horaAtualH * 60 + horaAtualM;

            mostrarAlmoco = minutosAtuais >= minutosEntradaAlmoco;
            mostrarSaida = minutosAtuais >= minutosSaida;
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

    // Extrai Y/M/D e HH:mm de um ISO (preferir UTC por causa do "Z" do endpoint)
    const ymdFrom = (iso) => {
        if (!iso) return null;
        const d = new Date(iso);
        if (isNaN(d)) return null;
        return {
            y: d.getUTCFullYear(),
            m: d.getUTCMonth() + 1,
            d: d.getUTCDate(),
            hh: String(d.getUTCHours()).padStart(2, "0"),
            mm: String(d.getUTCMinutes()).padStart(2, "0"),
        };
    };

    const horaFrom = (reg) => {
        const iso =
            reg?.timestamp ||
            reg?.dataHora ||
            reg?.data ||
            reg?.createdAt ||
            reg?.updatedAt;
        const p = ymdFrom(iso);
        return p ? `${p.hh}:${p.mm}` : null;
    };

    const carregarDadosGrade = async () => {
        console.log("🔍 [GRADE] Iniciando carregamento da grade...");
        console.log("🔍 [GRADE] Obra selecionada:", obraSelecionada || "Todas as obras");
        console.log("🔍 [GRADE] Mês/Ano:", mesSelecionado, "/", anoSelecionado);

        setLoading(true);
        try {
            // 1) Carregar faltas
            console.log("🔍 [GRADE] Carregando faltas...");
            const faltasData = await carregarFaltas();
            setFaltas(faltasData);
            console.log("✅ [GRADE] Faltas carregadas:", faltasData.length);

            // 2) Filtrar faltas para o mês/ano selecionado
            const faltasDoMes = faltasData.filter((falta) => {
                const dataFalta = new Date(falta.Data);
                const mesData = dataFalta.getMonth() + 1;
                const anoData = dataFalta.getFullYear();
                return mesData === mesSelecionado && anoData === anoSelecionado;
            });

            console.log("✅ [GRADE] Faltas do mês filtradas:", faltasDoMes.length);

            // 3) Construir a grelha apenas com horários esperados
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

                    let estatisticasDia = {
                        dia,
                        diaSemana,
                        isWeekend,
                        isFutureDate,
                        faltas: faltasDoDia,
                        temFalta: faltasDoDia.length > 0,
                        trabalhou: false,
                    };

                    // PRIORIDADE 1: Faltas
                    if (faltasDoDia.length > 0) {
                        estatisticasDia.trabalhou = false;
                        estatisticasDia.temFalta = true;
                        estatisticasDia.faltas = faltasDoDia;
                        dadosUsuario.faltasTotal++;
                    }
                    // PRIORIDADE 2: Dias úteis -> GERAR HORÁRIO ESPERADO
                    else if (!isWeekend && !isFutureDate) {
                        const isHoje = dataAtual.toDateString() === hoje.toDateString();
                        const horaAtual = isHoje
                            ? `${String(hoje.getHours()).padStart(2, "0")}:${String(hoje.getMinutes()).padStart(2, "0")}`
                            : null;

                        // Gerar horário esperado
                        const pontosFicticios = gerarPontosFicticios(user.id, dia, isHoje, horaAtual);
                        Object.assign(estatisticasDia, pontosFicticios);
                        estatisticasDia.trabalhou = true;

                        // Contar horas
                        if (pontosFicticios.temSaida) {
                            const horasDia = horariosUtilizadores[user.id]?.horasPorDia || 8;
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

            console.log("✅ [GRADE] Grade gerada com", dadosGradeTemp.length, "utilizadores");
            setDadosGrade(dadosGradeTemp);
        } catch (error) {
            console.error("❌ [GRADE] Erro ao carregar dados da grade:", error);
            Alert.alert("Erro", "Erro ao carregar dados da grade");
        } finally {
            setLoading(false);
        }
    };

    const getCellStyle = (estatisticas) => {
        // ✅ VERIFICAÇÃO DE SEGURANÇA: se estatisticas é undefined, retornar estilo vazio
        if (!estatisticas) return styles.cellEmpty;

        // 1º FALTAS (tem prioridade absoluta, mesmo em futuro/fds)
        if (estatisticas.temFalta) return styles.cellFalta;
        // 2º FIM DE SEMANA
        if (estatisticas.isWeekend) return styles.cellWeekend;
        // 3º FUTURO (sem falta)
        if (estatisticas.isFutureDate) return styles.cellFuture;

        if (estatisticas.trabalhou) {
            return styles.cellTrabalhou;
        }

        return styles.cellEmpty;
    };

    const getCellText = (estatisticas) => {
        if (!estatisticas || estatisticas.isWeekend) return "";

        // Faltas
        if (estatisticas.temFalta) return "FALTA";

        // Futuro
        if (estatisticas.isFutureDate) return "";

        // Horário esperado
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
            const diasDoMes = new Date(
                anoSelecionado,
                mesSelecionado,
                0,
            ).getDate();
            const dias = Array.from({ length: diasDoMes }, (_, i) => i + 1);
            const obraNome = obraSelecionada
                ? obras.find((obra) => obra.id.toString() === obraSelecionada)?.nome || "Obra não encontrada"
                : "Todas as Obras";

            // Criar dados para exportação em formato profissional
            const dadosExport = [];

            // ========== CABEÇALHO PRINCIPAL ==========
            dadosExport.push([
                "RELATÓRIO DE ANÁLISE COMPLETA DE REGISTOS DE PONTO",
            ]);
            dadosExport.push([""]);

            // Informações do relatório
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

            // ========== LEGENDA DE CORES E SÍMBOLOS ==========
            dadosExport.push(["📋 LEGENDA:"]);
            dadosExport.push([
                "",
                "✅ Registo Normal",
                "- Horário de entrada e saída",
            ]);
            dadosExport.push(["", "❌ FALTA", "- Ausência registada"]);
            dadosExport.push(["", "📅 FDS", "- Fim de semana"]);
            dadosExport.push(["", "🔄 Em curso", "- Apenas entrada registada"]);
            dadosExport.push([""]);
            dadosExport.push([""]);

            // ========== CABEÇALHO DA TABELA DE DADOS ==========
            const headerRow = ["FUNCIONÁRIO"];

            // Adicionar dias do mês com dia da semana
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
            );
            dadosExport.push(headerRow);

            // ========== DADOS DOS FUNCIONÁRIOS ==========
            dadosGrade.forEach((dadosUsuario, index) => {
                const row = [dadosUsuario.utilizador.nome];

                // Adicionar dados de cada dia
                dias.forEach((dia) => {
                    const estatisticas = dadosUsuario.estatisticasDias[dia];
                    let cellValue = "";

                    if (estatisticas) {
                        if (estatisticas.temFalta) {
                            cellValue = "❌ FALTA"; // falta futura aparece
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
                        } else {
                            cellValue = "";
                        }
                    }

                    row.push(cellValue);
                });

                // Adicionar totais com formatação
                row.push(
                    `${dadosUsuario.totalHorasMes}h`,
                    `${dadosUsuario.diasTrabalhados} dias`,
                    `${dadosUsuario.faltasTotal} faltas`,
                );

                dadosExport.push(row);
            });

            // ========== LINHA DE SEPARAÇÃO ==========
            const separatorRow = Array(headerRow.length).fill("═══════════");
            dadosExport.push(separatorRow);

            // ========== RESUMO ESTATÍSTICO ==========
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
            const mediaHorasPorFuncionario = (
                totalHorasTodos / dadosGrade.length
            ).toFixed(1);
            const mediaDiasPorFuncionario = (
                totalDiasTodos / dadosGrade.length
            ).toFixed(1);

            dadosExport.push(["📊 RESUMO ESTATÍSTICO"]);
            dadosExport.push([""]);

            // Totais gerais
            const resumoRow = Array(dias.length + 1).fill("");
            resumoRow[0] = "TOTAIS GERAIS:";
            resumoRow[resumoRow.length - 3] = `${totalHorasTodos}h`;
            resumoRow[resumoRow.length - 2] = `${totalDiasTodos} dias`;
            resumoRow[resumoRow.length - 1] = `${totalFaltasTodos} faltas`;
            dadosExport.push(resumoRow);

            // Médias
            const mediaRow = Array(dias.length + 1).fill("");
            mediaRow[0] = "MÉDIAS POR FUNCIONÁRIO:";
            mediaRow[mediaRow.length - 3] = `${mediaHorasPorFuncionario}h`;
            mediaRow[mediaRow.length - 2] = `${mediaDiasPorFuncionario} dias`;
            mediaRow[mediaRow.length - 1] =
                `${(totalFaltasTodos / dadosGrade.length).toFixed(1)} faltas`;
            dadosExport.push(mediaRow);

            dadosExport.push([""]);

            // ========== ANÁLISE POR CATEGORIA ==========
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
                    `${user.totalHorasMes}h`,
                ]);
            });

            // ========== CRIAR E FORMATAR PLANILHA ==========
            const worksheet = XLSX.utils.aoa_to_sheet(dadosExport);

            // Definir larguras das colunas otimizadas
            const colWidths = [{ wch: 25 }]; // Nome do funcionário mais largo
            dias.forEach(() => colWidths.push({ wch: 14 })); // Dias com espaço para duas linhas
            colWidths.push({ wch: 12 }, { wch: 15 }, { wch: 12 }); // Totais

            worksheet["!cols"] = colWidths;

            // Definir altura das linhas para melhor visualização
            const rowHeights = dadosExport.map((row, index) => {
                if (index === 0) return { hpt: 25 }; // Título principal
                if (index >= 12 && index < 12 + dadosGrade.length + 1)
                    return { hpt: 35 }; // Linhas de dados
                return { hpt: 20 }; // Outras linhas
            });
            worksheet["!rows"] = rowHeights;

            // Adicionar planilha ao workbook
            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Análise Completa",
            );

            // ========== CRIAR PLANILHA DE RESUMO EXECUTIVO ==========
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
                [""],
                ["MÉDIAS:"],
                [""],
                ["⏰ Horas por Funcionário:", `${mediaHorasPorFuncionario}h`],
                ["📅 Dias por Funcionário:", `${mediaDiasPorFuncionario} dias`],
                [
                    "❌ Faltas por Funcionário:",
                    `${(totalFaltasTodos / dadosGrade.length).toFixed(1)}`,
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

            // Salvar arquivo com nome mais descritivo
            const dataAtual = new Date().toISOString().split("T")[0];
            const fileName = `Analise_Completa_Registos_${obraNome.replace(/[^a-zA-Z0-9]/g, "_")}_${meses[mesSelecionado - 1]}_${anoSelecionado}_${dataAtual}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            Alert.alert(
                "✅ Exportação Concluída",
                `Relatório completo exportado com sucesso!\n\n📁 Arquivo: ${fileName}\n📊 ${dadosGrade.length} funcionários analisados\n⏰ ${totalHorasTodos}h totais registadas`,
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
                                {anoSelecionado} - {obraSelecionada ? obras.find(o => o.id.toString() === obraSelecionada)?.nome : "Todas as Obras"} ({dadosGrade.length}{" "}
                                utilizadores)
                            </Text>
                            <View style={styles.buttonGroup}>
                                <TouchableOpacity
                                    style={styles.refreshButton}
                                    onPress={() => {
                                        Alert.alert(
                                            "Atualizar Dados",
                                            "Deseja recarregar apenas as faltas ou todos os dados?",
                                            [
                                                {
                                                    text: "Cancelar",
                                                    style: "cancel",
                                                },
                                                {
                                                    text: "Apenas Faltas",
                                                    onPress: async () => {
                                                        setLoading(true);
                                                        try {
                                                            console.log(
                                                                "🔄 [REFRESH] Recarregando apenas faltas...",
                                                            );
                                                            const novasFaltas =
                                                                await carregarFaltas();
                                                            setFaltas(
                                                                novasFaltas,
                                                            );

                                                            // Filtrar faltas do mês atual
                                                            const faltasDoMes =
                                                                novasFaltas.filter(
                                                                    (falta) => {
                                                                        const dataFalta =
                                                                            new Date(
                                                                                falta.Data,
                                                                            );
                                                                        const mesData =
                                                                            dataFalta.getMonth() +
                                                                            1;
                                                                        const anoData =
                                                                            dataFalta.getFullYear();
                                                                        return (
                                                                            mesData ===
                                                                                mesSelecionado &&
                                                                            anoData ===
                                                                                anoSelecionado
                                                                        );
                                                                    },
                                                                );

                                                            // Reprocessar dados da grade com as novas faltas
                                                            const dadosAtualizados =
                                                                dadosGrade.map(
                                                                    (
                                                                        dadosUsuario,
                                                                    ) => {
                                                                        let novosDados =
                                                                            {
                                                                                ...dadosUsuario,
                                                                            };
                                                                        novosDados.faltasTotal = 0;

                                                                        // Filtrar faltas para este usuário
                                                                        const faltasUsuario =
                                                                            faltasDoMes.filter(
                                                                                (
                                                                                    falta,
                                                                                ) =>
                                                                                    falta.userId ===
                                                                                    dadosUsuario
                                                                                        .utilizador
                                                                                        .id,
                                                                            );

                                                                        // Atualizar cada dia
                                                                        Object.keys(
                                                                            novosDados.estatisticasDias,
                                                                        ).forEach(
                                                                            (
                                                                                dia,
                                                                            ) => {
                                                                                const diaNum =
                                                                                    parseInt(
                                                                                        dia,
                                                                                    );
                                                                                const faltasDoDia =
                                                                                    faltasUsuario.filter(
                                                                                        (
                                                                                            falta,
                                                                                        ) => {
                                                                                            const dataFalta =
                                                                                                new Date(
                                                                                                    falta.Data,
                                                                                                );
                                                                                            return (
                                                                                                dataFalta.getDate() ===
                                                                                                diaNum
                                                                                            );
                                                                                        },
                                                                                    );

                                                                                // Atualizar estatísticas do dia
                                                                                const estatisticasDia =
                                                                                    {
                                                                                        ...novosDados
                                                                                            .estatisticasDias[
                                                                                            dia
                                                                                        ],
                                                                                    };

                                                                                if (
                                                                                    faltasDoDia.length >
                                                                                    0
                                                                                ) {
                                                                                    estatisticasDia.faltas =
                                                                                        faltasDoDia;
                                                                                    estatisticasDia.temFalta = true;
                                                                                    estatisticasDia.trabalhou = false;
                                                                                    // Limpar dados de trabalho se há falta
                                                                                    estatisticasDia.horaEntrada =
                                                                                        null;
                                                                                    estatisticasDia.horaSaida =
                                                                                        null;
                                                                                    estatisticasDia.totalHoras =
                                                                                        null;
                                                                                    estatisticasDia.saidaAlmoco = null;
                                                                                    estatisticasDia.entradaAlmoco = null;
                                                                                    novosDados.faltasTotal++;
                                                                                } else {
                                                                                    estatisticasDia.faltas =
                                                                                        [];
                                                                                    estatisticasDia.temFalta = false;
                                                                                    // Se não há falta e não é fim de semana/futuro,
                                                                                    // regenerar dados de trabalho se necessário
                                                                                    if (
                                                                                        !estatisticasDia.isWeekend &&
                                                                                        !estatisticasDia.isFutureDate &&
                                                                                        !estatisticasDia.temFalta &&
                                                                                        estatisticasDia.temRegistosReais && // ✅ só se o DIA tem real
                                                                                        !estatisticasDia.horaEntrada
                                                                                    ) {
                                                                                        const hoje =
                                                                                            new Date();
                                                                                        const dataAtual =
                                                                                            new Date(
                                                                                                anoSelecionado,
                                                                                                mesSelecionado -
                                                                                                    1,
                                                                                                diaNum,
                                                                                            );
                                                                                        const isHoje =
                                                                                            dataAtual.toDateString() ===
                                                                                            hoje.toDateString();
                                                                                        const horaAtual =
                                                                                            isHoje
                                                                                                ? `${String(hoje.getHours()).padStart(2, "0")}:${String(hoje.getMinutes()).padStart(2, "0")}`
                                                                                                : null;

                                                                                        const pontosFicticios =
                                                                                            gerarPontosFicticios(
                                                                                                dadosUsuario
                                                                                                    .utilizador
                                                                                                    .id,
                                                                                                diaNum,
                                                                                                isHoje,
                                                                                                horaAtual,
                                                                                            );

                                                                                        Object.assign(
                                                                                            estatisticasDia,
                                                                                            pontosFicticios,
                                                                                        );
                                                                                        estatisticasDia.trabalhou = true;
                                                                                    }
                                                                                }

                                                                                novosDados.estatisticasDias[
                                                                                    dia
                                                                                ] =
                                                                                    estatisticasDia;
                                                                            },
                                                                        );

                                                                        return novosDados;
                                                                    },
                                                                );

                                                            setDadosGrade(
                                                                dadosAtualizados,
                                                            );
                                                            Alert.alert(
                                                                "✅ Sucesso",
                                                                "Faltas atualizadas com sucesso!",
                                                            );
                                                        } catch (error) {
                                                            console.error(
                                                                "❌ Erro ao recarregar faltas:",
                                                                error,
                                                            );
                                                            Alert.alert(
                                                                "❌ Erro",
                                                                "Erro ao recarregar faltas. Tente novamente.",
                                                            );
                                                        } finally {
                                                            setLoading(false);
                                                        }
                                                    },
                                                },
                                                {
                                                    text: "Todos os Dados",
                                                    onPress: () => {
                                                        console.log(
                                                            "🔄 [REFRESH] Recarregando todos os dados...",
                                                        );
                                                        carregarDadosGrade();
                                                    },
                                                },
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
                                            name={
                                                loading ? "loading" : "refresh"
                                            }
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