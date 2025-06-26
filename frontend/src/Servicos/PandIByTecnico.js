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
    Modal,
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
import styles from './PandIByTecnicoStyles';


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



const PandIByTecnico = () => {
    const [tecnicoID, setTecnicoID] = useState("");
    const [intervencoes, setIntervencoes] = useState([]);
    const [processos, setProcessos] = useState([]);
    const [intervencoesDetalhadas, setIntervencoesDetalhadas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [processoSelecionado, setProcessoSelecionado] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userTecnicoID, setUserTecnicoID] = useState("");

    // Obtém o ano e mês atual
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();
    const mesAtual = dataAtual.getMonth() + 1; // getMonth() retorna 0-11
    const semanaAtual = getWeek(dataAtual);

    const [ano, setAno] = useState(anoAtual);
    const [mes, setMes] = useState(mesAtual);
    const [semana, setSemana] = useState(semanaAtual);
    const [filtro, setFiltro] = useState("semana"); // Default para semana



    
    useEffect(() => {
        const storedIsAdmin = localStorage.getItem("isAdmin") === "true";
        const storedTecnicoID = localStorage.getItem("id_tecnico") || "";
    
        setIsAdmin(storedIsAdmin);
        setUserTecnicoID(storedTecnicoID);
    
        if (!storedIsAdmin) {
            setTecnicoID(storedTecnicoID); // forçar seleção automática se não for admin
        }
    }, []);
    
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


    const abrirModalProcesso = (processo) => {
        setProcessoSelecionado(processo);
        setModalVisible(true);
    };
    

    const getTotalProcessosDoTecnico = () => {
        return filterProcessosByPeriodo().filter(p => p.Tecnico1 === tecnicoID).length;
    };
    
    
    const getAssistanceTypeData = () => {
        const tiposCounts = {};
        filterProcessosByPeriodo().forEach(processo => {
            const tipo = processo.TipoDoc1 || "Outro";
            tiposCounts[tipo] = (tiposCounts[tipo] || 0) + 1;
        });
    
        return Object.keys(tiposCounts).map(tipo => ({
            name: tipo,
            value: tiposCounts[tipo],
        }));
    };
    

        const fetchData = async () => {
        if (!tecnicoID) {
            Alert.alert("Erro", "Insira o ID do técnico.");
            console.log(processos);
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

            
            const processosResPromise = fetchWithRetry(
                `https://webapiprimavera.advir.pt/routePedidos_STP/ListaProcessosTecnico/${tecnicoID}`,
                { method: "GET", headers }
            );
            
            // Fazer chamadas em paralelo para melhorar desempenho
            const [ processosRes] = await Promise.all([

                processosResPromise
            ]);
            
            const processosData = await processosRes.json();


            // Log para debug
            console.log("Dados carregados com sucesso:", {
                processos: processosData
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
                    intervencoes: [
                        {
                            TipoInterv: processo.TipoInterv,
                            DataHoraInicio: processo.DataHoraInicio,
                            Duracao: processo.Duracao,
                            Observacoes: processo.DescricaoResp
                        }
                    ]
                };
            });
            



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


    const filterProcessosByPeriodo = () => {
        return processos.filter((processo) => {
            const dataInicio = new Date(processo.DataHoraInicio);
            
            if (filtro === "semana") {
                return isDateInSelectedWeek(dataInicio);
            }
            if (filtro === "mes") {
                return isDateInSelectedMonth(dataInicio);
            }
            if (filtro === "anual") {
                return dataInicio.getFullYear() === ano;
            }
            return true;
        });
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
            if (processo.detalhesProcesso?.DataHoraInicio) {
                return new Date(processo.detalhesProcesso.DataHoraInicio)
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
                if (processo.detalhesProcesso?.DataHoraInicio) {
                    if (filtro === "semana") {
                        temIntervencoesNoFiltro = isDateInSelectedWeek(
                            processo.detalhesProcesso.DataHoraInicio,
                        );
                    } else if (filtro === "mes") {
                        temIntervencoesNoFiltro = isDateInSelectedMonth(
                            processo.detalhesProcesso.DataHoraInicio,
                        );
                    } else if (filtro === "anual") {
                        // Verificar se a data está no ano selecionado
                        const date = new Date(processo.detalhesProcesso.DataHoraInicio);
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
        const tiposCounts = {};
        filterProcessosByPeriodo().forEach(processo => {
            const tipo = processo.TipoInterv || "Outro";
            tiposCounts[tipo] = (tiposCounts[tipo] || 0) + 1;
        });
    
        return Object.keys(tiposCounts).map(tipo => ({
            name: tipo,
            value: tiposCounts[tipo]
        }));
    };
    
    

    // Função para obter dados para o gráfico de horas por dia
    const getHoursPerDayData = () => {
        const horasPorDia = {};
        filterProcessosByPeriodo().forEach(processo => {
            if (processo.DataHoraInicio && processo.Duracao) {
                const dataStr = new Date(processo.DataHoraInicio).toISOString().split('T')[0];
                if (!horasPorDia[dataStr]) {
                    horasPorDia[dataStr] = 0;
                }
                horasPorDia[dataStr] += processo.Duracao / 60;
            }
        });
    
        return Object.keys(horasPorDia).map(dataStr => ({
            day: new Date(dataStr).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
            hours: parseFloat(horasPorDia[dataStr].toFixed(1))
        }));
    };
    
    

    return (
        <View style={{ flex: 1 }}>

        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
        >
            <Text style={styles.title}>Dashboard Técnico</Text>

            <View style={styles.controlsContainer}>
                <View style={styles.controlBox}>
                    <Text style={styles.controlLabel}>Técnico:</Text>
                    {isAdmin ? (
    <Picker
        selectedValue={tecnicoID}
        onValueChange={(value) => setTecnicoID(value)}
        style={styles.picker}
    >
        <Picker.Item label="Selecione um Técnico" value="" />
        <Picker.Item label="José Alves" value="001" />
        <Picker.Item label="José Vale" value="002" />
        <Picker.Item label="Jorge Almeida" value="003" />
        <Picker.Item label="Vitor Mendes" value="004" />
    </Picker>
) : (
    <Text style={{ padding: 10, fontSize: 16 }}>
        {tecnicoID === "001"
            ? "José Alves"
            : tecnicoID === "002"
            ? "José Vale"
            : tecnicoID === "003"
            ? "Jorge Almeida"
            : tecnicoID === "004"
            ? "Vitor Mendes"
            : tecnicoID}
    </Text>
)}

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
{processos.length > 0 && (
    <View style={styles.dashboardContainer}>
        <Text style={styles.dashboardTitle}> </Text>

        <View style={styles.dashboardRow}>
            {/* Card 1: Total de Intervenções */}
            <View style={styles.dashboardCard}>
    <Text style={styles.cardTitle}>Total de Intervenções</Text>
    <Text style={styles.cardValue}>
        {filterProcessosByPeriodo().length}
    </Text>
</View>

<View style={styles.dashboardCard}>
    <Text style={styles.cardTitle}>Pedidos do Técnico</Text>
    <Text style={styles.cardValue}>
        {getTotalProcessosDoTecnico()}
    </Text>
</View>




            {/* Card 3: Horas Trabalhadas */}
            <View style={styles.dashboardCard}>
    <Text style={styles.cardTitle}>Horas Totais</Text>
    <Text style={styles.cardValue}>
        {(filterProcessosByPeriodo().reduce(
            (total, processo) => total + (processo.Duracao || 0),
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Pie>
            <Legend />
            <Tooltip />
        </PieChart>
    </ResponsiveContainer>
</View>
<View style={styles.chartBox}>
    <Text style={styles.chartTitle}>Tipos de Contratos</Text>
    <ResponsiveContainer width="100%" height={220}>
        <PieChart>
            <Pie
                data={getAssistanceTypeData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#82ca9d"
                dataKey="value"
                label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                }
            >
                {getAssistanceTypeData().map((entry, index) => (
                    <Cell key={`cell-assist-${index}`} fill={COLORS[index % COLORS.length]} />
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
        <BarChart data={getHoursPerDayData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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

                    {dadosPorDia.map((dia, diaIndex) => (
                        <View key={diaIndex}>
                            {/* Data como cabeçalho de seção */}
                            

                            {/* Processos para o dia */}
                            {dia.processos.map((processo, i) => (
  <TouchableOpacity
    key={i}
    onPress={() => abrirModalProcesso(processo)}
    style={styles.processCard}
  >
    <Text style={styles.cardDate}>
      {dia.data.toLocaleDateString("pt-PT", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
    </Text>

    <Text style={styles.cardLine}>
      <Text style={styles.cardLabel}>Processo: </Text>
      {processo.detalhesProcesso?.Processo}
    </Text>

    <Text style={styles.cardLine}>
      <Text style={styles.cardLabel}>Cliente: </Text>
      {processo.detalhesProcesso?.NomeCliente || "N/A"}
    </Text>

    <Text style={styles.cardLine}>
      <Text style={styles.cardLabel}>Contacto: </Text>
      {processo.detalhesProcesso?.NomeContacto || "Sem contacto"}
    </Text>

    <Text style={styles.cardLine}>
      <Text style={styles.cardLabel}>Estado: </Text>
      {processo.intervencoes.length > 0 ? "Concluído ✅" : "Pendente ⏳"}
    </Text>

    <Text style={styles.cardLine}>
      <Text style={styles.cardLabel}>Duração: </Text>
      {processo.detalhesProcesso?.Duracao || 0} minutos
    </Text>

    <Text style={styles.cardDesc}>
      {processo.detalhesProcesso?.DescricaoResp || "Sem descrição."}
    </Text>
  </TouchableOpacity>
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
          {/* Modal tem de estar AQUI FORA do ScrollView */}
          {processoSelecionado && (
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Processo {processoSelecionado.detalhesProcesso?.Processo}
                        </Text>
                        <Text style={styles.modalInfo}>
                            <Text style={{ fontWeight: "bold" }}>Cliente: </Text>
                            {processoSelecionado.detalhesProcesso?.NomeCliente || "N/A"}
                        </Text>
                        <Text style={styles.modalInfo}>
                            <Text style={{ fontWeight: "bold" }}>Contacto: </Text>
                            {processoSelecionado.detalhesProcesso?.NomeContacto || "N/A"}
                        </Text>
                        <Text style={styles.modalInfo}>
                            <Text style={{ fontWeight: "bold" }}>Estado: </Text>
                            {processoSelecionado.intervencoes.length > 0 ? "Concluído" : "Pendente"}
                        </Text>
                        <Text style={styles.modalInfo}>
                            <Text style={{ fontWeight: "bold" }}>Duração: </Text>
                            {processoSelecionado.detalhesProcesso?.Duracao || 0} minutos
                        </Text>
                        <Text style={styles.modalDesc}>
                            {processoSelecionado.detalhesProcesso?.DescricaoProb || "Sem descrição."}
                        </Text>

                        {/* Intervenções no modal */}
                        {processoSelecionado.intervencoes.length > 0 ? (
                            <ScrollView style={{ maxHeight: 200, marginTop: 10 }}>
                                {processoSelecionado.intervencoes.map((intv, idx) => (
                                    <View
                                        key={idx}
                                        style={{
                                            backgroundColor: "#f0f4ff",
                                            padding: 10,
                                            borderRadius: 8,
                                            marginBottom: 6,
                                        }}
                                    >
                                        <Text style={{ fontWeight: "bold", color: "#0056b3" }}>
                                            {intv.TipoInterv || "Tipo não definido"}
                                        </Text>
                                       
                                        <Text style={{ fontSize: 12, color: "#444" }}>
                                            Duração: {intv.Duracao || 0} min
                                        </Text>
                                        {intv.Observacoes && (
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    color: "#666",
                                                    fontStyle: "italic",
                                                    marginTop: 4,
                                                }}
                                            >
                                                {intv.Observacoes}
                                            </Text>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.intervPendente}>
                                Sem intervenções registadas.
                            </Text>
                        )}

                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>Fechar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        )}
    </View>
    );
    
};

export default PandIByTecnico;

