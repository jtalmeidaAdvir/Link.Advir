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

            // 2) Obter dias com registos reais por utilizador (no período selecionado)
            console.log("🔍 [GRADE] Etapa 2: Obtendo dias com registos...");
            const diasComRegistosByUser =
                await obterDiasComRegistosPorUtilizador(
                    obraSelecionada,
                    anoSelecionado,
                    mesSelecionado,
                    utilizadores,
                );
            console.log("✅ [GRADE] Dias com registos por utilizador:", diasComRegistosByUser);

            // 3) Filtrar faltas para o mês/ano selecionado
            console.log("🔍 [GRADE] Etapa 3: Filtrando faltas do mês...");
            console.log("🔍 [GRADE] Mês selecionado:", mesSelecionado, "Ano selecionado:", anoSelecionado);
            console.log("🔍 [GRADE] Total faltas antes do filtro:", faltasData.length);
            
            const faltasDoMes = faltasData.filter((falta) => {
                const dataFalta = new Date(falta.Data);
                const mesData = dataFalta.getMonth() + 1;
                const anoData = dataFalta.getFullYear();
                const match = mesData === mesSelecionado && anoData === anoSelecionado;
                
                if (faltasData.indexOf(falta) < 5) { // Log das primeiras 5 faltas para debug
                    console.log(`🔍 [GRADE] Falta ${faltasData.indexOf(falta)}:`, {
                        data: falta.Data,
                        mesData,
                        anoData,
                        userId: falta.userId,
                        match
                    });
                }
                
                return match;
            });
            console.log("✅ [GRADE] Faltas do mês filtradas:", faltasDoMes.length);
            
            if (faltasDoMes.length > 0) {
                console.log("🔍 [GRADE] Primeiras faltas do mês:", faltasDoMes.slice(0, 3));
            }

            // 4) Construir a grelha apenas com fictícios nos dias com registos reais
            const diasDoMes = new Date(
                anoSelecionado,
                mesSelecionado,
                0,
            ).getDate();
            const hoje = new Date();
            const dadosGradeTemp = [];

            utilizadores.forEach((user) => {
                const diasReais = diasComRegistosByUser[user.id] || new Set();
                const dadosUsuario = {
                    utilizador: user,
                    estatisticasDias: {},
                    totalHorasMes: 0,
                    diasTrabalhados: 0,
                    faltasTotal: 0,
                };

                for (let dia = 1; dia <= diasDoMes; dia++) {
                    const dataAtual = new Date(
                        anoSelecionado,
                        mesSelecionado - 1,
                        dia,
                    );
                    const diaSemana = dataAtual.getDay();
                    const isWeekend = diaSemana === 0 || diaSemana === 6;
                    const isFutureDate = dataAtual > hoje;

                    const faltasDoDia = faltasDoMes.filter((falta) => {
                        const df = new Date(falta.Data);
                        const diaFalta = df.getDate();
                        const userMatch = falta.userId === user.id;
                        const diaMatch = diaFalta === dia;
                        
                        // Log detalhado para debug
                        if (dia <= 5) {
                            console.log(`🔍 [GRADE] Verificando falta para ${user.nome} (ID: ${user.id}) - Dia ${dia}:`);
                            console.log(`   - Data falta: ${falta.Data} (dia ${diaFalta})`);
                            console.log(`   - User match: ${userMatch} (falta.userId: ${falta.userId})`);
                            console.log(`   - Dia match: ${diaMatch}`);
                        }
                        
                        return userMatch && diaMatch;
                    });

                    // Log detalhado para os primeiros dias e quando há faltas
                    if (dia <= 5 || faltasDoDia.length > 0) {
                        console.log(`🔍 [GRADE] ${user.nome} - Dia ${dia}:`);
                        console.log(`   - É fim de semana: ${isWeekend}`);
                        console.log(`   - É futuro: ${isFutureDate}`);
                        console.log(`   - Faltas do dia: ${faltasDoDia.length}`);
                        console.log(`   - Tem registos: ${diasReais.has(dia)}`);
                        if (faltasDoDia.length > 0) {
                            console.log(`   - Faltas encontradas:`, faltasDoDia);
                        }
                    }

                    let estatisticasDia = {
                        dia,
                        diaSemana,
                        isWeekend,
                        isFutureDate,
                        faltas: faltasDoDia,
                        temFalta: faltasDoDia.length > 0,
                        trabalhou: false,
                    };

                    // Processar faltas primeiro - tem prioridade
                    if (faltasDoDia.length > 0) {
                        console.log(`✅ [GRADE] ${user.nome} - Dia ${dia}: FALTA PROCESSADA`);
                        estatisticasDia.trabalhou = false;
                        estatisticasDia.temFalta = true;
                        dadosUsuario.faltasTotal++;
                    } else if (
                        !isWeekend &&
                        !isFutureDate &&
                        diasReais.has(dia)
                    ) {
                        // ✅ Só gerar fictício se:
                        // - não é fim de semana
                        // - não é futuro
                        // - não tem falta
                        // - E HOUVE MESMO REGISTO nesse dia (diasReais.has(dia))
                        
                        // Verificar se é hoje e obter hora atual
                        const isHoje = dataAtual.toDateString() === hoje.toDateString();
                        const horaAtual = isHoje ? 
                            `${String(hoje.getHours()).padStart(2, '0')}:${String(hoje.getMinutes()).padStart(2, '0')}` 
                            : null;

                        const pontosFicticios = gerarPontosFicticios(
                            user.id,
                            dia,
                            isHoje,
                            horaAtual
                        );
                        estatisticasDia = {
                            ...estatisticasDia,
                            ...pontosFicticios,
                            trabalhou: true,
                        };
                        
                        if (dia <= 5) {
                            console.log(`✅ [GRADE] ${user.nome} - Dia ${dia}: PONTO FICTÍCIO GERADO`);
                        }
                        
                        // Só contar horas e dias se tiver saída
                        if (pontosFicticios.temSaida) {
                            dadosUsuario.totalHorasMes += 8;
                            dadosUsuario.diasTrabalhados++;
                        } else {
                            dadosUsuario.diasTrabalhados += 0.5; // Meio dia se só tem entrada
                        }
                    }

                    dadosUsuario.estatisticasDias[dia] = estatisticasDia;
                }

                dadosGradeTemp.push(dadosUsuario);
            });

            console.log("✅ [GRADE] Grade final gerada com", dadosGradeTemp.length, "utilizadores");
            
            // Log do resumo final
            dadosGradeTemp.forEach((dadosUsuario) => {
                const totalFaltasCalculadas = Object.values(dadosUsuario.estatisticasDias)
                    .filter(dia => dia.temFalta).length;
                
                console.log(`📊 [GRADE] ${dadosUsuario.utilizador.nome}:`);
                console.log(`   - Total faltas: ${dadosUsuario.faltasTotal}`);
                console.log(`   - Faltas calculadas: ${totalFaltasCalculadas}`);
                console.log(`   - Dias trabalhados: ${dadosUsuario.diasTrabalhados}`);
                console.log(`   - Total horas: ${dadosUsuario.totalHorasMes}`);
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
                        <Text style={styles.gradeTitle}>
                            Grade Mensal - {meses[mesSelecionado - 1]}{" "}
                            {anoSelecionado} ({dadosGrade.length} utilizadores)
                        </Text>

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

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 20,
        paddingHorizontal: 16,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: 12,
        marginTop: 10,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1792FE",
        marginLeft: 12,
    },
    filtersCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    filtersTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 16,
    },
    filterRow: {
        flexDirection: "row",
        marginBottom: 12,
    },
    filterItem: {
        flex: 1,
        marginHorizontal: 4,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: "#666",
        marginBottom: 8,
    },
    pickerContainer: {
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    picker: {
        height: 50,
    },
    legendCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    legendTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 12,
    },
    legendRow: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 16,
        marginBottom: 8,
    },
    legendColor: {
        width: 16,
        height: 16,
        borderRadius: 4,
        marginRight: 8,
    },
    legendText: {
        fontSize: 12,
        color: "#666",
    },
    gradeCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    gradeTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 16,
        textAlign: "center",
    },
    gradeContainer: {
        minWidth: 800,
    },
    headerRow: {
        flexDirection: "row",
        backgroundColor: "#f8f9fa",
        borderBottomWidth: 2,
        borderBottomColor: "#1792FE",
    },
    headerCell: {
        width: 120,
        padding: 8,
        justifyContent: "center",
        alignItems: "center",
        borderRightWidth: 1,
        borderRightColor: "#ddd",
    },
    headerText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center",
    },
    dayHeaderCell: {
        width: 40,
        padding: 8,
        justifyContent: "center",
        alignItems: "center",
        borderRightWidth: 1,
        borderRightColor: "#ddd",
    },
    dayHeaderText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#666",
    },
    totalHeaderCell: {
        width: 80,
        padding: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    gradeRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    userCell: {
        width: 120,
        padding: 8,
        justifyContent: "center",
        borderRightWidth: 1,
        borderRightColor: "#ddd",
    },
    userText: {
        fontSize: 11,
        color: "#333",
        textAlign: "center",
    },
    dayCell: {
        width: 40,
        height: 50,
        padding: 2,
        justifyContent: "center",
        alignItems: "center",
        borderRightWidth: 1,
        borderRightColor: "#ddd",
    },
    dayCellText: {
        fontSize: 8,
        textAlign: "center",
        color: "#333",
    },
    totalCell: {
        width: 80,
        padding: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    totalText: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#1792FE",
    },
    totalSubText: {
        fontSize: 9,
        color: "#666",
    },
    cellEmpty: {
        backgroundColor: "#f8f9fa",
    },
    cellTrabalhou: {
        backgroundColor: "#d4edda",
    },
    cellFalta: {
        backgroundColor: "#f8d7da",
    },
    cellWeekend: {
        backgroundColor: "#e2e3e5",
    },
    cellFuture: {
        backgroundColor: "#f8f9fa",
        opacity: 0.5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#666",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: "#666",
        textAlign: "center",
    },
});

export default AnaliseComplotaPontos;
