import React, { useState, useEffect } from "react";
import {View,Text,Alert,ScrollView} from "react-native";
import styles from './Styles/PandIByTecnicoStyles';
import TecnicoFilterControls from './Components/PandIByTecnico/TecnicoFilterControls';
import DashboardCards from './Components/PandIByTecnico/DashboardCards';
import ProcessoListagem from './Components/PandIByTecnico/ProcessoListagem';
import ChartsSection from './Components/PandIByTecnico/ChartsSection';
import ModalDetalhesProcesso from './Components/PandIByTecnico/ModalDetalhesProcesso';
import useProcessosPorDia from './Hooks/PandIByTecnico/useProcessosPorDia';
import useProcessosFiltrados from './Hooks/PandIByTecnico/useProcessosFiltrados';
import useGraficoData from './Hooks/PandIByTecnico/useGraficoData';
import { getWeek, getWeeksInMonth } from './Utils/dateUtils';
import { fetchWithRetry } from './Utils/fetchUtils';


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
    const { getInterventionTypeData, getAssistanceTypeData, getHoursPerDayData } =
    useGraficoData(processosFiltrados);

    
    useEffect(() => {
        const storedIsAdmin = localStorage.getItem("isAdmin") === "true";
        const storedTecnicoID = localStorage.getItem("id_tecnico") || "";
    
        setIsAdmin(storedIsAdmin);
        setUserTecnicoID(storedTecnicoID);
    
        if (!storedIsAdmin) {
            setTecnicoID(storedTecnicoID); // forçar seleção automática se não for admin
        }
    }, []);
    



    const abrirModalProcesso = (processo) => {
        setProcessoSelecionado(processo);
        setModalVisible(true);
    };
    

    const getTotalProcessosDoTecnico = () => {
        return processosFiltrados.filter(p => p.Tecnico1 === tecnicoID).length;
    };
    

    const filterProcessosByPeriodo = () => {
  return processosFiltrados.filter(p => p.Tecnico1 === tecnicoID);
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
