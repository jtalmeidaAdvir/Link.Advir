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
import { filterProcessosByTecnico, countProcessosByTecnico } from './Utils/filters';
import { fetchProcessosByTecnico } from './Utils/fetchProcessos';

import { secureStorage } from '../../utils/secureStorage';

const PandIByTecnico = () => {
    const [tecnicoID, setTecnicoID] = useState("");
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

    const getTotalProcessosDoTecnico = () => countProcessosByTecnico(processosFiltrados, tecnicoID);
    const filterProcessosByPeriodo = () => filterProcessosByTecnico(processosFiltrados, tecnicoID);
    const dadosPorDia = useProcessosPorDia(intervencoesDetalhadas, filtro, ano, mes, semana);




    useEffect(() => {
        const storedIsAdmin = secureStorage.getItem("isAdmin") === "true";
        const storedTecnicoID = secureStorage.getItem("id_tecnico") || "";
    
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
    
   const fetchData = async () => {
  if (!tecnicoID) {
    Alert.alert("Erro", "Insira o ID do técnico.");
    return;
  }

  try {
    const { processos, intervencoesDetalhadas } = await fetchProcessosByTecnico(
      tecnicoID, ano, mes, semana, setSemana, setLoading
    );

    setProcessos(processos);
    setIntervencoesDetalhadas(intervencoesDetalhadas);

  } catch (error) {
    console.error("Erro na obtenção dos dados:", error);
    Alert.alert("Erro", `Falha ao obter dados: ${error.message || 'Erro na conexão com o servidor'}`);
  }
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
