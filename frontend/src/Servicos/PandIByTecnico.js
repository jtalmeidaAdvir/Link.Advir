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
import styles from './Styles/PandIByTecnicoStyles';
import TecnicoFilterControls from './Components/PandIByTecnico/TecnicoFilterControls';
import DashboardCards from './Components/PandIByTecnico/DashboardCards';
import ProcessoListagem from './Components/PandIByTecnico/ProcessoListagem';
import ChartsSection from './Components/PandIByTecnico/ChartsSection';
import ModalDetalhesProcesso from './Components/PandIByTecnico/ModalDetalhesProcesso';
import useProcessosPorDia from './Hooks/PandIByTecnico/useProcessosPorDia';
import useProcessosFiltrados from './Hooks/PandIByTecnico/useProcessosFiltrados';
import { getWeek, getWeeksInMonth, getDaysInWeek } from './Utils/dateUtils';







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

    const processosFiltrados = useProcessosFiltrados(processos, filtro, ano, mes, semana);


    
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
        return processosFiltrados.filter(p => p.Tecnico1 === tecnicoID).length;
    };
    
    
    const getAssistanceTypeData = () => {
        const tiposCounts = {};
        processosFiltrados.forEach(processo => {
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




    
    // Obter os dados organizados por dias
    const dadosPorDia = useProcessosPorDia(intervencoesDetalhadas, filtro, ano, mes, semana);


    // Cores para os gráficos
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#6B66FF'];

    // Função para obter dados para o gráfico de tipos de intervenção
    const getInterventionTypeData = () => {
        const tiposCounts = {};
        processosFiltrados.forEach(processo => {
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
        processosFiltrados.forEach(processo => {
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

            <TecnicoFilterControls
            isAdmin={isAdmin}
            tecnicoID={tecnicoID}
            setTecnicoID={setTecnicoID}
            filtro={filtro}
            setFiltro={setFiltro}
            ano={ano}
            setAno={setAno}
            mes={mes}
            setMes={setMes}
            semana={semana}
            setSemana={setSemana}
            anoAtual={anoAtual}
            loading={loading}
            fetchData={fetchData}
            getWeeksInMonth={getWeeksInMonth}
            />


          {/* Dashboard Section */}
{processos.length > 0 && (
  <DashboardCards
    processos={processos}
    tecnicoID={tecnicoID}
    filterProcessosByPeriodo={filterProcessosByPeriodo}
    getTotalProcessosDoTecnico={getTotalProcessosDoTecnico}
  />
  
)
}
<ChartsSection
  getInterventionTypeData={getInterventionTypeData}
  getAssistanceTypeData={getAssistanceTypeData}
  getHoursPerDayData={getHoursPerDayData}
/>


<ProcessoListagem
  dadosPorDia={dadosPorDia}
  abrirModalProcesso={abrirModalProcesso}
  loading={loading}
/>

        </ScrollView>
          {/* Modal tem de estar AQUI FORA do ScrollView */}
          <ModalDetalhesProcesso
            processoSelecionado={processoSelecionado}
            modalVisible={modalVisible}
            setModalVisible={setModalVisible}
            />

    </View>
    );
    
};

export default PandIByTecnico;
