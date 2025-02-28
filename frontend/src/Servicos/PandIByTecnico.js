import React, { useState, useEffect } from "react";
import {
    View,
    FlatList,
    Text,
    TouchableOpacity,
    Alert,
    StyleSheet,
    Picker,
    ScrollView,
    Platform,
    Dimensions,
} from "react-native";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from "recharts";

// Componente personalizado para seleção de data
const MyDatePicker = ({ value, onChange, ...props }) => {
    if (Platform.OS === "web") {
        // Formata a data para o formato YYYY-MM-DD
        const dateString = value ? value.toISOString().substr(0, 10) : "";
        return (
            <input
                type="date"
                value={dateString}
                onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    // Simula o objeto de evento esperado no onChange do DateTimePicker nativo
                    onChange(
                        {
                            type: "set",
                            nativeEvent: { timestamp: newDate.getTime() },
                        },
                        newDate,
                    );
                }}
                style={{ fontSize: 16, padding: 8, marginBottom: 15 }}
                {...props}
            />
        );
    } else {
        const DateTimePicker =
            require("@react-native-community/datetimepicker").default;
        return <DateTimePicker value={value} onChange={onChange} {...props} />;
    }
};

// Obtém a semana do ano
const getWeek = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

// Obtém as semanas de um mês específico
const getWeeksInMonth = (month, year) => {
    const weeks = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    let currentDate = new Date(firstDay);

    // Ajustar para o primeiro dia da semana (domingo)
    while (currentDate.getDay() !== 0) {
        currentDate.setDate(currentDate.getDate() - 1);
    }

    // Iterar pelas semanas do mês
    while (currentDate <= lastDay) {
        const weekNumber = getWeek(currentDate);
        if (!weeks.includes(weekNumber)) {
            weeks.push(weekNumber);
        }
        currentDate.setDate(currentDate.getDate() + 7);
    }

    return weeks;
};

// Obtém os dias de uma semana específica
const getDaysInWeek = (weekNumber, year) => {
    const days = [];
    const firstDayOfYear = new Date(year, 0, 1);

    // Calcular o primeiro dia da semana
    const firstDayOfWeek = new Date(firstDayOfYear);
    firstDayOfWeek.setDate(
        firstDayOfYear.getDate() +
            (weekNumber - 1) * 7 -
            firstDayOfYear.getDay(),
    );

    // Adicionar todos os dias da semana
    for (let i = 0; i < 7; i++) {
        const day = new Date(firstDayOfWeek);
        day.setDate(firstDayOfWeek.getDate() + i);
        days.push(day);
    }

    return days;
};

// Endpoint para buscar intervenções detalhadas por técnico com sistema de retry
const fetchIntervencoesByTecnico = async (tecnicoID, token, urlempresa, maxRetries = 3) => {
    let tentativaAtual = 0;
    let ultimoErro = null;
    
    while (tentativaAtual < maxRetries) {
        try {
            const response = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/ListaIntervencoesTecnico/${tecnicoID}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        urlempresa,
                    },
                },
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Status ${response.status}: ${errorText}`);
            }

            const data = await response.json();

            // Verificar se há dados válidos e retornar
            if (data?.DataSet?.Table && Array.isArray(data.DataSet.Table)) {
                console.log("Intervenções detalhadas recebidas:", data.DataSet.Table);
                return data.DataSet.Table;
            } else {
                console.warn(
                    "API retornou um formato inesperado para intervenções:",
                    data,
                );
                return [];
            }
        } catch (error) {
            tentativaAtual++;
            ultimoErro = error;
            
            // Se não for a última tentativa, espere antes de tentar novamente
            if (tentativaAtual < maxRetries) {
                console.log(`Tentativa ${tentativaAtual} falhou, tentando novamente em ${tentativaAtual * 1000}ms...`);
                await new Promise(resolve => setTimeout(resolve, tentativaAtual * 1000));
            }
        }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    console.error("Erro ao buscar intervenções após várias tentativas:", ultimoErro);
    if (Platform.OS !== 'web') {
        Alert.alert(
            "Erro",
            "Não foi possível obter intervenções após várias tentativas: " + (ultimoErro?.message || "Erro de conexão"),
        );
    }
    return [];
};

const PandIByTecnico = () => {
    const [tecnicoID, setTecnicoID] = useState("");
    const [intervencoes, setIntervencoes] = useState([]);
    const [processos, setProcessos] = useState([]);
    const [intervencoesDetalhadas, setIntervencoesDetalhadas] = useState([]);
    const [loading, setLoading] = useState(false);

    // Obtém o ano e mês atual
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();
    const mesAtual = dataAtual.getMonth() + 1; // getMonth() retorna 0-11
    const semanaAtual = getWeek(dataAtual);

    const [ano, setAno] = useState(anoAtual);
    const [mes, setMes] = useState(mesAtual);
    const [semana, setSemana] = useState(semanaAtual);
    const [filtro, setFiltro] = useState("semana"); // Default para semana

    // Função para tentar uma requisição com tentativas automáticas
    const fetchWithRetry = async (url, options, maxRetries = 3, delayMs = 1000) => {
        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await fetch(url, options);
                
                if (response.ok) {
                    return response;
                }
                
                // Se a resposta não for ok, tratamos como erro
                const errorData = await response.text();
                lastError = new Error(`Status: ${response.status}. ${errorData}`);
                
                // Aguardar antes de tentar novamente (aumentando o tempo entre tentativas)
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
                }
            } catch (error) {
                lastError = error;
                // Aguardar antes de tentar novamente
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
                }
            }
        }
        
        throw lastError || new Error("Falha após múltiplas tentativas");
    };

    const fetchData = async () => {
        if (!tecnicoID) {
            Alert.alert("Erro", "Insira o ID do técnico.");
            return;
        }

        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");

        if (!token || !urlempresa) {
            Alert.alert("Erro", "Token ou URL da empresa não encontrados.");
            return;
        }

        setLoading(true);
        
        try {
            const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                urlempresa,
            };
            
            // Busca intervenções e processos do técnico com sistema de retry
            const intervencoesResPromise = fetchWithRetry(
                `https://webapiprimavera.advir.pt/routePedidos_STP/ListaIntervencoesTecnico/${tecnicoID}`,
                { method: "GET", headers }
            );
            
            const processosResPromise = fetchWithRetry(
                `https://webapiprimavera.advir.pt/routePedidos_STP/ListaProcessosTecnico/${tecnicoID}`,
                { method: "GET", headers }
            );
            
            // Fazer chamadas em paralelo para melhorar desempenho
            const [intervencoesRes, processosRes] = await Promise.all([
                intervencoesResPromise,
                processosResPromise
            ]);
            
            // Buscar intervenções detalhadas com retry
            const intervencoesDetalhadasRes = await fetchIntervencoesByTecnico(tecnicoID, token, urlempresa);

            const intervencoesData = await intervencoesRes.json();
            const processosData = await processosRes.json();
            const intervencoesDetalhadasResFinal = intervencoesDetalhadasRes || [];

            // Log para debug
            console.log("Dados carregados com sucesso:", {
                intervencoes: intervencoesData?.DataSet?.Table?.length || 0,
                processos: processosData?.DataSet?.Table?.length || 0,
                intervencoesDetalhadas: intervencoesDetalhadasResFinal.length || 0
            });

            // Criar mapa de processos por ID para acesso rápido
            const processosMap = (processosData?.DataSet?.Table || []).reduce(
                (acc, processo) => {
                    acc[processo.ID] = processo;
                    return acc;
                },
                {},
            );

            // Primeiro, criar um objeto com todos os processos
            const todosProcessos = {};

            // Adicionar todos os processos primeiro (mesmo aqueles sem intervenções)
            (processosData?.DataSet?.Table || []).forEach((processo) => {
                todosProcessos[processo.ID] = {
                    processoID: processo.ID,
                    detalhesProcesso: processo,
                    intervencoes: [],
                };
            });

            // Depois, adicionar todas as intervenções aos processos correspondentes
            (intervencoesDetalhadasResFinal || []).forEach((intv) => {
                const processoID = intv.ProcessoID;

                // Se o processo não existir no mapa (caso raro), crie-o
                if (!todosProcessos[processoID]) {
                    todosProcessos[processoID] = {
                        processoID: processoID,
                        detalhesProcesso: processosMap[processoID] || null,
                        intervencoes: [],
                    };
                }

                // Adicionar a intervenção ao processo
                todosProcessos[processoID].intervencoes.push({
                    DataHoraInicio: intv.DataHoraInicio,
                    DataHoraFim: intv.DataHoraFim,
                    DescricaoResp: intv.DescricaoResp,
                    Duracao: intv.Duracao,
                    TipoInterv: intv.TipoInterv,
                    ID: intv.ID,
                });
            });

            setIntervencoes(intervencoesData?.DataSet?.Table || []);
            setProcessos(processosData?.DataSet?.Table || []);
            setIntervencoesDetalhadas(Object.values(todosProcessos));

            // Caso o modo de filtro seja semana e não haja semana selecionada
            // ou a semana selecionada não esteja no mês atual, define para a semana atual
            if (filtro === "semana") {
                const semanasDoMes = getWeeksInMonth(mes, ano);
                if (!semanasDoMes.includes(semana)) {
                    setSemana(
                        semanasDoMes.includes(semanaAtual)
                            ? semanaAtual
                            : semanasDoMes[0],
                    );
                }
            }
        } catch (error) {
            console.error("Erro na obtenção dos dados:", error);
            Alert.alert("Erro", `Falha ao obter dados: ${error.message || 'Erro na conexão com o servidor'}`);
        } finally {
            setLoading(false);
        }
    };

    // Função para verificar se uma data está na semana selecionada
    const isDateInSelectedWeek = (dateToCheck) => {
        if (!dateToCheck) return false;

        const date = new Date(dateToCheck);
        return getWeek(date) === semana && date.getFullYear() === ano;
    };

    // Função para verificar se uma data está no mês selecionado
    const isDateInSelectedMonth = (dateToCheck) => {
        if (!dateToCheck) return false;

        const date = new Date(dateToCheck);
        return date.getMonth() + 1 === mes && date.getFullYear() === ano;
    };

    // Função para organizar os processos por dia
    const getProcessosPorDia = () => {
        // Obter os dias a serem exibidos com base no filtro
        let diasParaExibir = [];

        if (filtro === "semana") {
            diasParaExibir = getDaysInWeek(semana, ano);
        } else if (filtro === "mes") {
            // Criar array com todos os dias do mês
            const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
            for (let i = 1; i <= ultimoDiaDoMes; i++) {
                diasParaExibir.push(new Date(ano, mes - 1, i));
            }
        } else if (filtro === "anual"){
            // Criar array com todos os dias do ano
            for (let i = 1; i <= 365; i++) {
                diasParaExibir.push(new Date(ano, 0, i));
            }
        } else {
            // Apenas hoje para modo padrão
            diasParaExibir = [new Date()];
        }

        // Organizar processos por dia
        const processosPorDia = {};

        // Inicializar objeto para cada dia
        diasParaExibir.forEach((dia) => {
            const dataString = dia.toISOString().split("T")[0];
            processosPorDia[dataString] = {
                data: new Date(dia),
                processos: [],
            };
        });

        // Função auxiliar para determinar em qual dia um processo deve aparecer
        const getDiaProcesso = (processo) => {
            // Se há intervenções, usar a data da primeira intervenção
            if (processo.intervencoes.length > 0) {
                return new Date(processo.intervencoes[0].DataHoraInicio)
                    .toISOString()
                    .split("T")[0];
            }

            // Caso contrário, usar a data de abertura do processo
            if (processo.detalhesProcesso?.DataHoraAbertura) {
                return new Date(processo.detalhesProcesso.DataHoraAbertura)
                    .toISOString()
                    .split("T")[0];
            }

            // Fallback para hoje
            return new Date().toISOString().split("T")[0];
        };

        // Filtrar e distribuir os processos pelos dias correspondentes
        intervencoesDetalhadas.forEach((processo) => {
            // Verificar se o processo tem intervenções que devem ser mostradas
            let temIntervencoesNoFiltro = false;

            if (processo.intervencoes.length > 0) {
                if (filtro === "semana") {
                    temIntervencoesNoFiltro = processo.intervencoes.some(
                        (intv) => isDateInSelectedWeek(intv.DataHoraInicio),
                    );
                } else if (filtro === "mes") {
                    temIntervencoesNoFiltro = processo.intervencoes.some(
                        (intv) => isDateInSelectedMonth(intv.DataHoraInicio),
                    );
                } else if (filtro === "anual") {
                    temIntervencoesNoFiltro = processo.intervencoes.some(
                        (intv) => new Date(intv.DataHoraInicio).getFullYear() === ano,
                    );
                }
            } else {
                // Para processos sem intervenções, verificar a data de abertura
                if (processo.detalhesProcesso?.DataHoraAbertura) {
                    if (filtro === "semana") {
                        temIntervencoesNoFiltro = isDateInSelectedWeek(
                            processo.detalhesProcesso.DataHoraAbertura,
                        );
                    } else if (filtro === "mes") {
                        temIntervencoesNoFiltro = isDateInSelectedMonth(
                            processo.detalhesProcesso.DataHoraAbertura,
                        );
                    } else if (filtro === "anual") {
                        // Verificar se a data está no ano selecionado
                        const date = new Date(processo.detalhesProcesso.DataHoraAbertura);
                        temIntervencoesNoFiltro = date.getFullYear() === ano;
                    }
                }
            }

            // Se o processo deve ser exibido, adicionar ao dia correspondente
            if (temIntervencoesNoFiltro || filtro === "anual") {
                const diaProcesso = getDiaProcesso(processo);

                // Verificar se o dia existe na nossa lista (pode não existir se for de outro período)
                if (processosPorDia[diaProcesso]) {
                    // Filtrar apenas as intervenções que pertencem ao período selecionado
                    const intervencoesNoFiltro = processo.intervencoes.filter(
                        (intv) => {
                            if (filtro === "semana") {
                                return isDateInSelectedWeek(
                                    intv.DataHoraInicio,
                                );
                            } else if (filtro === "mes") {
                                return isDateInSelectedMonth(
                                    intv.DataHoraInicio,
                                );
                            } else if (filtro === "anual") {
                                return new Date(intv.DataHoraInicio).getFullYear() === ano;
                            }
                            return true; // para o modo "todos"
                        },
                    );

                    // Criar cópia do processo com apenas as intervenções filtradas
                    const processoFiltrado = {
                        ...processo,
                        intervencoes: intervencoesNoFiltro,
                    };

                    processosPorDia[diaProcesso].processos.push(
                        processoFiltrado,
                    );
                }
            }
        });

        // Converter de objeto para array e ordenar por data
        return Object.values(processosPorDia)
            .filter((dia) => dia.processos.length > 0) // Remover dias sem processos
            .sort((a, b) => a.data - b.data); // Ordenar do mais antigo para o mais recente
    };

    // Obter os dados organizados por dias
    const dadosPorDia = getProcessosPorDia();

    // Cores para os gráficos
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#6B66FF'];

    // Função para obter dados para o gráfico de tipos de intervenção
    const getInterventionTypeData = () => {
        // Contagem de tipos de intervenção
        const tiposCounts = {};

        intervencoesDetalhadas.forEach(processo => {
            processo.intervencoes.forEach(interv => {
                const tipo = interv.TipoInterv || "Outro";
                tiposCounts[tipo] = (tiposCounts[tipo] || 0) + 1;
            });
        });

        // Converter para o formato esperado pelo PieChart
        return Object.keys(tiposCounts).map(tipo => ({
            name: tipo,
            value: tiposCounts[tipo]
        }));
    };

    // Função para obter dados para o gráfico de horas por dia
    const getHoursPerDayData = () => {
        const horasPorDia = {};

        // Obter todos os dias no período selecionado
        dadosPorDia.forEach(dia => {
            const dataStr = dia.data.toISOString().split('T')[0];
            horasPorDia[dataStr] = 0;

            // Somar as durações de todas as intervenções para este dia
            dia.processos.forEach(processo => {
                processo.intervencoes.forEach(interv => {
                    if (interv.Duracao) {
                        horasPorDia[dataStr] += interv.Duracao / 60; // Converter minutos para horas
                    }
                });
            });
        });

        // Converter para o formato esperado pelo BarChart
        return Object.keys(horasPorDia).map(dataStr => ({
            day: new Date(dataStr).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
            hours: parseFloat(horasPorDia[dataStr].toFixed(1))
        }));
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
        >
            <Text style={styles.title}>Dashboard Técnico</Text>

            <View style={styles.controlsContainer}>
                <View style={styles.controlBox}>
                    <Text style={styles.controlLabel}>Técnico:</Text>
                    <Picker
                        selectedValue={tecnicoID}
                        onValueChange={(value) => setTecnicoID(value)}
                        style={styles.picker}
                    >
                        <Picker.Item label="Selecione um Técnico" value="" />
                        <Picker.Item label="José Alves" value="001" />
                        <Picker.Item label="José Vale" value="002" />
                        <Picker.Item label="Jorge Almeida" value="003" />
                    </Picker>
                </View>

                <View style={styles.controlRow}>
                    <View style={styles.controlBox}>
                        <Text style={styles.controlLabel}>Filtro:</Text>
                        <Picker
                            selectedValue={filtro}
                            onValueChange={(value) => setFiltro(value)}
                            style={styles.picker}
                        >
                            <Picker.Item label="Semana" value="semana" />
                            <Picker.Item label="Mês" value="mes" />
                            <Picker.Item label="Anual" value="anual" />
                        </Picker>
                    </View>

                    <View style={styles.controlBox}>
                        <Text style={styles.controlLabel}>Ano:</Text>
                        <Picker
                            selectedValue={ano}
                            onValueChange={(value) => {
                                const anoValue = parseInt(value);
                                setAno(anoValue);

                                // Ao mudar o ano, ajustar as semanas disponíveis
                                if (filtro === "semana") {
                                    const semanasDisponiveis = getWeeksInMonth(
                                        mes,
                                        anoValue,
                                    );
                                    if (!semanasDisponiveis.includes(semana)) {
                                        setSemana(semanasDisponiveis[0]);
                                    }
                                }
                            }}
                            style={styles.picker}
                        >
                            <Picker.Item
                                label={(anoAtual - 1).toString()}
                                value={anoAtual - 1}
                            />
                            <Picker.Item
                                label={anoAtual.toString()}
                                value={anoAtual}
                            />
                            <Picker.Item
                                label={(anoAtual + 1).toString()}
                                value={anoAtual + 1}
                            />
                        </Picker>
                    </View>
                </View>

                {(filtro === "mes" || filtro === "semana") && (
                    <View style={styles.controlRow}>
                        {filtro === "mes" && (
                            <View style={styles.controlBox}>
                                <Text style={styles.controlLabel}>Mês:</Text>
                                <Picker
                                    selectedValue={mes}
                                    onValueChange={(value) => {
                                        const mesValue = parseInt(value);
                                        setMes(mesValue);

                                        // Ao mudar o mês, ajustar as semanas disponíveis
                                        if (filtro === "semana") {
                                            const semanasDisponiveis =
                                                getWeeksInMonth(mesValue, ano);
                                            if (
                                                !semanasDisponiveis.includes(
                                                    semana,
                                                )
                                            ) {
                                                setSemana(
                                                    semanasDisponiveis[0],
                                                );
                                            }
                                        }
                                    }}
                                    style={styles.picker}
                                >
                                    {Array.from(
                                        { length: 12 },
                                        (_, i) => i + 1,
                                    ).map((m) => (
                                        <Picker.Item
                                            key={m}
                                            label={`${m} - ${new Date(0, m - 1).toLocaleString("default", { month: "long" })}`}
                                            value={m}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        )}

                        {filtro === "semana" && (
                            <>
                                <View style={styles.controlBox}>
                                    <Text style={styles.controlLabel}>
                                        Mês:
                                    </Text>
                                    <Picker
                                        selectedValue={mes}
                                        onValueChange={(value) => {
                                            const mesValue = parseInt(value);
                                            setMes(mesValue);

                                            // Ao mudar o mês, ajustar as semanas disponíveis
                                            const semanasDisponiveis =
                                                getWeeksInMonth(mesValue, ano);
                                            if (
                                                !semanasDisponiveis.includes(
                                                    semana,
                                                )
                                            ) {
                                                setSemana(
                                                    semanasDisponiveis[0],
                                                );
                                            }
                                        }}
                                        style={styles.picker}
                                    >
                                        {Array.from(
                                            { length: 12 },
                                            (_, i) => i + 1,
                                        ).map((m) => (
                                            <Picker.Item
                                                key={m}
                                                label={`${m} - ${new Date(0, m - 1).toLocaleString("default", { month: "long" })}`}
                                                value={m}
                                            />
                                        ))}
                                    </Picker>
                                </View>

                                <View style={styles.controlBox}>
                                    <Text style={styles.controlLabel}>
                                        Semana:
                                    </Text>
                                    <Picker
                                        selectedValue={semana}
                                        onValueChange={(value) =>
                                            setSemana(parseInt(value))
                                        }
                                        style={styles.picker}
                                    >
                                        {getWeeksInMonth(mes, ano).map((s) => (
                                            <Picker.Item
                                                key={s}
                                                label={`Semana ${s}`}
                                                value={s}
                                            />
                                        ))}
                                    </Picker>
                                </View>
                            </>
                        )}
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={fetchData}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? "A carregar..." : "Obter Dados"}
                    </Text>
                </TouchableOpacity>
                {loading && (
                    <Text style={styles.loadingInfo}>
                        A carregar dados, por favor aguarde...
                    </Text>
                )}
            </View>

            {/* Dashboard Section */}
            {dadosPorDia.length > 0 && (
                <View style={styles.dashboardContainer}>
                    <Text style={styles.dashboardTitle}>Dashboard do Técnico</Text>

                    <View style={styles.dashboardRow}>
                        {/* Card 1: Total de Processos */}
                        <View style={styles.dashboardCard}>
                            <Text style={styles.cardTitle}>Total de Processos</Text>
                            <Text style={styles.cardValue}>
                                {intervencoesDetalhadas.length}
                            </Text>
                        </View>

                        {/* Card 2: Intervenções Realizadas */}
                        <View style={styles.dashboardCard}>
                            <Text style={styles.cardTitle}>Intervenções</Text>
                            <Text style={styles.cardValue}>
                                {intervencoesDetalhadas.reduce(
                                    (total, processo) => total + processo.intervencoes.length,
                                    0
                                )}
                            </Text>
                        </View>

                        {/* Card 3: Horas Trabalhadas */}
                        <View style={styles.dashboardCard}>
                            <Text style={styles.cardTitle}>Horas Totais</Text>
                            <Text style={styles.cardValue}>
                                {(intervencoesDetalhadas.reduce(
                                    (total, processo) => total + processo.intervencoes.reduce(
                                        (subtotal, interv) => subtotal + (interv.Duracao || 0),
                                        0
                                    ),
                                    0
                                ) / 60).toFixed(1)}h
                            </Text>
                        </View>
                    </View>

                    {/* Charts row */}
                    <View style={styles.chartsContainer}>
                        {/* Pie Chart - Tipos de Intervenção */}
                        <View style={styles.chartBox}>
                            <Text style={styles.chartTitle}>Tipos de Intervenção</Text>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={getInterventionTypeData()}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {getInterventionTypeData().map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={COLORS[index % COLORS.length]} 
                                            />
                                        ))}
                                    </Pie>
                                    <Legend />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </View>

                        {/* Bar Chart - Horas por Dia */}
                        <View style={styles.chartBox}>
                            <Text style={styles.chartTitle}>Horas por Dia</Text>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart
                                    data={getHoursPerDayData()}
                                    margin={{
                                        top: 5,
                                        right: 30,
                                        left: 20,
                                        bottom: 5,
                                    }}
                                >
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="hours" fill="#1792FE" name="Horas" />
                                </BarChart>
                            </ResponsiveContainer>
                        </View>
                    </View>
                </View>
            )}

            {dadosPorDia.length > 0 ? (
                <View style={styles.gridContainer}>
                    {/* Cabeçalho da tabela com as datas */}
                    <View style={styles.tableHeader}>
                        <Text style={styles.tableHeaderLabel}>Data</Text>
                        <Text style={styles.tableHeaderLabel}>Processos</Text>
                        <Text style={styles.tableHeaderLabel}>Cliente</Text>
                        <Text style={styles.tableHeaderLabel}>Estado</Text>
                        <Text style={styles.tableHeaderLabel}>
                            Intervenções
                        </Text>
                    </View>

                    {/* Linhas da tabela com os dados */}
                    {dadosPorDia.map((dia, diaIndex) => (
                        <View key={diaIndex}>
                            {/* Data como cabeçalho de seção */}
                            <View style={styles.dataSection}>
                                <Text style={styles.dataSectionTitle}>
                                    {dia.data.toLocaleDateString("pt-PT", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </Text>
                            </View>

                            {/* Processos para o dia */}
                            {dia.processos.map((processo, processoIndex) => (
                                <View
                                    key={processoIndex}
                                    style={[
                                        styles.tableRow,
                                        processoIndex % 2 === 0
                                            ? styles.tableRowEven
                                            : styles.tableRowOdd,
                                        processo.intervencoes.length === 0
                                            ? styles.tableRowPendente
                                            : {},
                                    ]}
                                >
                                    {/* Coluna da data */}
                                    <View style={styles.tableCell}>
                                        <Text style={styles.tableCellText}>
                                            {dia.data.toLocaleDateString(
                                                "pt-PT",
                                                {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                },
                                            )}
                                        </Text>
                                    </View>

                                    {/* Coluna do processo */}
                                    <View style={styles.tableCell}>
                                        <Text style={styles.tableCellTitle}>
                                            {processo.detalhesProcesso
                                                ?.Processo ||
                                                processo.processoID}
                                        </Text>
                                        <Text
                                            style={styles.tableCellDesc}
                                            numberOfLines={2}
                                        >
                                            {processo.detalhesProcesso
                                                ?.DescricaoProb ||
                                                "Sem descrição"}
                                        </Text>
                                    </View>

                                    {/* Coluna do cliente */}
                                    <View style={styles.tableCell}>
                                        <Text style={styles.tableCellTitle}>
                                            {processo.detalhesProcesso?.Nome?.substring(
                                                0,
                                                20,
                                            ) ||
                                                processo.detalhesProcesso
                                                    ?.Cliente ||
                                                "N/A"}
                                            {processo.detalhesProcesso?.Nome
                                                ?.length > 20
                                                ? "..."
                                                : ""}
                                        </Text>
                                        <Text style={styles.tableCellSubtext}>
                                            {`${processo.detalhesProcesso?.PrimeiroNome || ""} ${processo.detalhesProcesso?.UltimoNome || ""}`}
                                        </Text>
                                    </View>

                                    {/* Coluna de estado */}
                                    <View style={styles.tableCell}>
                                        {processo.intervencoes.length === 0 ? (
                                            <View style={styles.estadoPendente}>
                                                <Text
                                                    style={
                                                        styles.estadoPendenteText
                                                    }
                                                >
                                                    Pendente
                                                </Text>
                                            </View>
                                        ) : (
                                            <View
                                                style={styles.estadoConcluido}
                                            >
                                                <Text
                                                    style={
                                                        styles.estadoConcluidoText
                                                    }
                                                >
                                                    Concluído
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Coluna das intervenções */}
                                    <View style={styles.tableCellInterv}>
                                        {processo.intervencoes.length > 0 ? (
                                            processo.intervencoes.map(
                                                (intv, intervIndex) => (
                                                    <View
                                                        key={intervIndex}
                                                        style={
                                                            styles.intervCard
                                                        }
                                                    >
                                                        <View
                                                            style={
                                                                styles.intervHeader
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.intervType
                                                                }
                                                            >
                                                                {
                                                                    intv.TipoInterv
                                                                }
                                                            </Text>
                                                            <Text
                                                                style={
                                                                    styles.intervDuration
                                                                }
                                                            >
                                                                {intv.Duracao}{" "}
                                                                min
                                                            </Text>
                                                        </View>
                                                        <Text
                                                            style={
                                                                styles.intervTime
                                                            }
                                                        >
                                                            {new Date(
                                                                intv.DataHoraInicio,
                                                            ).toLocaleTimeString(
                                                                [],
                                                                {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                },
                                                            )}{" "}
                                                            -
                                                            {new Date(
                                                                intv.DataHoraFim,
                                                            ).toLocaleTimeString(
                                                                [],
                                                                {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                },
                                                            )}
                                                        </Text>
                                                        <Text
                                                            style={
                                                                styles.intervDesc
                                                            }
                                                            numberOfLines={3}
                                                        >
                                                            {intv.DescricaoResp}
                                                        </Text>
                                                    </View>
                                                ),
                                            )
                                        ) : (
                                            <Text style={styles.intervPendente}>
                                                Aguarda atendimento
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.noDataContainer}>
                    {loading ? (
                        <Text style={styles.noDataText}>
                            A carregar dados...
                        </Text>
                    ) : (
                        <Text style={styles.noDataText}>
                            Nenhum processo encontrado para o período
                            selecionado. Selecione um técnico e clique em "Obter
                            Dados".
                        </Text>
                    )}
                </View>
            )}
        </ScrollView>
    );
};

export default PandIByTecnico;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f0f7ff",
    },
    contentContainer: {
        padding: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#1792FE",
        marginBottom: 20,
        textAlign: "center",
    },
    // Dashboard styles
    dashboardContainer: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dashboardTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1792FE",
        marginBottom: 15,
        textAlign: "center",
    },
    dashboardRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
        flexWrap: "wrap",
    },
    dashboardCard: {
        backgroundColor: "#f5f9ff",
        borderRadius: 10,
        padding: 15,
        flex: 1,
        minWidth: 120,
        margin: 5,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#d0e1f9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 14,
        color: "#555",
        marginBottom: 8,
        textAlign: "center",
    },
    cardValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0056b3",
    },
    chartsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginTop: 10,
    },
    chartBox: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 10,
        marginBottom: 15,
        width: "48%",
        minWidth: 300,
        flex: 1,
        borderWidth: 1,
        borderColor: "#d0e1f9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#0056b3",
        marginBottom: 10,
        textAlign: "center",
    },
    controlsContainer: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    controlRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    controlBox: {
        flex: 1,
        marginHorizontal: 5,
    },
    controlLabel: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#555",
        marginBottom: 5,
    },
    picker: {
        backgroundColor: "#f5f9ff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#d0e1f9",
        paddingVertical: 8,
        paddingHorizontal: 10,
        width: "100%",
    },
    button: {
        backgroundColor: "#1792FE",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: "#93c5f0",
        opacity: 0.7,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    loadingInfo: {
        color: "#0056b3",
        textAlign: "center",
        marginTop: 8,
        fontStyle: "italic",
    },

    // Novos estilos para o layout em grelha
    gridContainer: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },

    // Estilos do cabeçalho da tabela
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#1792FE",
        padding: 15,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    tableHeaderLabel: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
        textAlign: "center",
        flex: 1,
    },

    // Seção de data
    dataSection: {
        backgroundColor: "#e6f0ff",
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#d0e1f9",
    },
    dataSectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#0056b3",
        textTransform: "capitalize",
    },

    // Estilos das linhas da tabela
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e6f0ff",
        padding: 10,
    },
    tableRowEven: {
        backgroundColor: "#f5f9ff",
    },
    tableRowOdd: {
        backgroundColor: "#fff",
    },
    tableRowPendente: {
        borderLeftWidth: 4,
        borderLeftColor: "#ffc107",
    },

    // Estilos das células da tabela
    tableCell: {
        flex: 1,
        padding: 8,
        justifyContent: "center",
    },
    tableCellInterv: {
        flex: 2,
        padding: 8,
    },
    tableCellText: {
        fontSize: 14,
        color: "#333",
    },
    tableCellTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#0056b3",
        marginBottom: 4,
    },
    tableCellSubtext: {
        fontSize: 12,
        color: "#666",
    },
    tableCellDesc: {
        fontSize: 12,
        color: "#555",
        fontStyle: "italic",
    },

    // Estado dos processos
    estadoPendente: {
        backgroundColor: "#fff3cd",
        borderRadius: 12,
        paddingVertical: 5,
        paddingHorizontal: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ffc107",
    },
    estadoPendenteText: {
        color: "#856404",
        fontSize: 12,
        fontWeight: "bold",
    },
    estadoConcluido: {
        backgroundColor: "#d4edda",
        borderRadius: 12,
        paddingVertical: 5,
        paddingHorizontal: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#28a745",
    },
    estadoConcluidoText: {
        color: "#155724",
        fontSize: 12,
        fontWeight: "bold",
    },

    // Cartões de intervenções
    intervCard: {
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#1792FE",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    intervHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    intervType: {
        fontSize: 13,
        fontWeight: "bold",
        color: "#0056b3",
    },
    intervDuration: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#28a745",
        backgroundColor: "#e6f7e6",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    intervTime: {
        fontSize: 12,
        color: "#6c757d",
        marginBottom: 4,
    },
    intervDesc: {
        fontSize: 12,
        color: "#333",
    },
    intervPendente: {
        fontSize: 14,
        fontStyle: "italic",
        color: "#999",
        textAlign: "center",
        padding: 10,
    },

    // Container para sem dados
    noDataContainer: {
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        marginTop: 20,
    },
    noDataText: {
        fontSize: 16,
        color: "#777",
        textAlign: "center",
    },
});