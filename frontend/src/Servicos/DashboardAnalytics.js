
import React, { useState, useEffect } from 'react';
import {View,Text,StyleSheet,ScrollView,ActivityIndicator,TouchableOpacity,Dimensions,Alert} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faChartLine,faClock,faUsers,faCheckCircle,faExclamationTriangle,faCalendarAlt,faTrophy,faArrowUp,faArrowDown,faFilter,faDownload} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import styles from './Styles/DashboardAnalyticsStyles'; 
import KPICard from './Components/KPICard';
import TecnicoRankingCard from './Components/TecnicoRankingCard';





const DashboardAnalytics = ({ navigation }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState({
        kpis: {},
        chartData: {},
        tecnicosPerformance: [],
        tempoResolucao: [],
        satisfacaoCliente: []
    });
    const [filtroTempo, setFiltroTempo] = useState('30'); // 30 dias por padrão
    const [filtroTecnico, setFiltroTecnico] = useState('todos');
    const [showFilters, setShowFilters] = useState(false);

    const COLORS = ['#1792FE', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#20c997'];

    useEffect(() => {
        fetchAnalyticsData();
    }, [filtroTempo, filtroTecnico]);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("painelAdminToken");
            const urlempresa = localStorage.getItem("urlempresa");

            if (!token) {
                Alert.alert("Erro", "Token não encontrado. Faça login novamente.");
                return;
            }

            // Usar o endpoint local do backend que integra com Primavera
            const response = await fetch(
                `https://backend.advir.pt/api/analytics/pedidos`, // https://backend.advir.pt
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        urlempresa: urlempresa
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }

            const data = await response.json();
            console.log("Dados recebidos da API:", data);

            if (data?.DataSet?.Table) {
                processAnalyticsData(data.DataSet.Table);
            }
        } catch (error) {
            console.error("Erro ao buscar dados analytics:", error);
            Alert.alert("Erro", "Não foi possível carregar os dados de analytics. Verifique se o backend está em execução.");
        } finally {
            setLoading(false);
        }
    };

    const processAnalyticsData = (pedidos) => {
        const agora = new Date();
        const diasFiltro = parseInt(filtroTempo);
        const dataInicio = new Date(agora.getTime() - (diasFiltro * 24 * 60 * 60 * 1000));

        // Filtrar pedidos por período
        const pedidosFiltrados = pedidos.filter(pedido => {
            const dataPedido = new Date(pedido.DataHoraAbertura || pedido.DataHoraInicio);
            return dataPedido >= dataInicio;
        });

        // Calcular KPIs
        const totalPedidos = pedidosFiltrados.length;
        const pedidosResolvidos = pedidosFiltrados.filter(p => p.Estado1 === '0').length;
        const pedidosAbertos = pedidosFiltrados.filter(p => p.Estado1 === '1' || !p.Estado1).length;
        const pedidosEmAndamento = pedidosFiltrados.filter(p => p.Estado1 === '2').length;

        // Tempo médio de resolução (usar Duracao em minutos)
        const pedidosComTempo = pedidosFiltrados.filter(p =>
            p.Duracao && p.Duracao > 0 && p.Estado1 === '0'
        );

        const tempoMedioResolucao = pedidosComTempo.length > 0
            ? pedidosComTempo.reduce((acc, p) => acc + (p.Duracao || 0), 0) / pedidosComTempo.length / 60 // converter minutos para horas
            : 0;

        // Performance por técnico
        const tecnicosMap = new Map();
        pedidosFiltrados.forEach(pedido => {
            const tecnico = pedido.NomeTecnico || 'Não Atribuído';
            if (!tecnicosMap.has(tecnico)) {
                tecnicosMap.set(tecnico, {
                    nome: tecnico,
                    total: 0,
                    resolvidos: 0,
                    emAndamento: 0,
                    tempoTotal: 0,
                    tempoMedio: 0,
                    eficiencia: 0
                });
            }

            const dados = tecnicosMap.get(tecnico);
            dados.total++;

            if (pedido.Estado1 === '0') {
                dados.resolvidos++;
                if (pedido.Duracao) {
                    dados.tempoTotal += pedido.Duracao / 60; // converter minutos para horas
                }
            } else if (pedido.Estado1 === '2') {
                dados.emAndamento++;
            }
        });

        // Calcular tempo médio por técnico
        tecnicosMap.forEach(tecnico => {
            if (tecnico.resolvidos > 0) {
                tecnico.tempoMedio = tecnico.tempoTotal / tecnico.resolvidos;
                tecnico.eficiencia = (tecnico.resolvidos / tecnico.total * 100);
            }
        });

        const tecnicosPerformance = Array.from(tecnicosMap.values())
            .sort((a, b) => b.eficiencia - a.eficiencia);

        // Dados para gráficos
        const estadosData = [
            { name: 'Resolvidos', value: pedidosResolvidos, color: '#28a745' },
            { name: 'Em Andamento', value: pedidosEmAndamento, color: '#ffc107' },
            { name: 'Abertos', value: pedidosAbertos, color: '#dc3545' }
        ];

        // Gráfico de tendência por dia
        const diasMap = new Map();
        pedidosFiltrados.forEach(pedido => {
            const data = new Date(pedido.DataHoraAbertura || pedido.DataHoraInicio).toISOString().split('T')[0];
            if (!diasMap.has(data)) {
                diasMap.set(data, { data, novos: 0, resolvidos: 0 });
            }
            diasMap.get(data).novos++;
            if (pedido.Estado1 === '0') {
                diasMap.get(data).resolvidos++;
            }
        });

        const tendenciaData = Array.from(diasMap.values())
            .sort((a, b) => new Date(a.data) - new Date(b.data))
            .slice(-14); // Últimos 14 dias

        // Prioridades
        const prioridadesMap = new Map();
        pedidosFiltrados.forEach(pedido => {
            const prioridade = pedido.Prioridade === '1' ? 'Baixa' :
                pedido.Prioridade === '2' ? 'Média' :
                    pedido.Prioridade === '3' ? 'Alta' : 'Normal';
            prioridadesMap.set(prioridade, (prioridadesMap.get(prioridade) || 0) + 1);
        });

        const prioridadesData = Array.from(prioridadesMap.entries()).map(([name, value]) => ({
            name,
            value
        }));

        // Obter lista de pedidos em andamento
        const listaPedidosEmAndamento = pedidosFiltrados.filter(p => p.Estado1 === '2');

        setAnalyticsData({
            kpis: {
                totalPedidos,
                pedidosResolvidos,
                pedidosAbertos,
                pedidosEmAndamento,
                tempoMedioResolucao: Math.round(tempoMedioResolucao * 10) / 10,
                taxaResolucao: totalPedidos > 0 ? Math.round((pedidosResolvidos / totalPedidos) * 100) : 0
            },
            chartData: {
                estados: estadosData,
                tendencia: tendenciaData,
                prioridades: prioridadesData
            },
            tecnicosPerformance,
            pedidosEmAndamento: listaPedidosEmAndamento
        });
    };



    const exportarRelatorio = () => {
        Alert.alert(
            "Exportar Relatório",
            "Escolha o formato de exportação:",
            [
                { text: "PDF", onPress: () => exportToPDF() },
                { text: "Excel", onPress: () => exportToExcel() },
                { text: "Cancelar", style: "cancel" }
            ]
        );
    };

    const exportToPDF = () => {
        Alert.alert("Info", "Funcionalidade de exportação PDF será implementada em breve.");
    };

    const exportToExcel = () => {
        Alert.alert("Info", "Funcionalidade de exportação Excel será implementada em breve.");
    };

    // Componente simples para substituir o gráfico de pizza
    const SimplePieChart = ({ data }) => (
        <View style={styles.simplePieContainer}>
            {data.map((item, index) => (
                <View key={index} style={styles.pieItem}>
                    <View style={[styles.pieColor, { backgroundColor: item.color }]} />
                    <Text style={styles.pieLabel}>{item.name}: {item.value}</Text>
                </View>
            ))}
        </View>
    );

    // Componente simples para gráfico de barras
    const SimpleBarChart = ({ data }) => (
        <View style={styles.simpleBarContainer}>
            {data.map((item, index) => (
                <View key={index} style={styles.barItem}>
                    <Text style={styles.barLabel}>{item.name}</Text>
                    <View style={styles.barBackground}>
                        <View
                            style={[
                                styles.barFill,
                                {
                                    width: `${(item.value / Math.max(...data.map(d => d.value))) * 100}%`,
                                    backgroundColor: COLORS[index % COLORS.length]
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.barValue}>{item.value}</Text>
                </View>
            ))}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1792FE" />
                <Text style={styles.loadingText}>Carregando analytics...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <FontAwesomeIcon icon={faChartLine} color="#fff" size="xl" />
                    <Text style={styles.headerTitle}>Dashboard Analytics</Text>
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <FontAwesomeIcon icon={faFilter} color="#fff" size="sm" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.exportButton}
                        onPress={exportarRelatorio}
                    >
                        <FontAwesomeIcon icon={faDownload} color="#fff" size="sm" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filtros */}
            {showFilters && (
                <View style={styles.filtersContainer}>
                    <Text style={styles.filterLabel}>Período:</Text>
                    <View style={styles.filterButtons}>
                        {['7', '30', '90', '365'].map(dias => (
                            <TouchableOpacity
                                key={dias}
                                style={[
                                    styles.filterOption,
                                    filtroTempo === dias && styles.filterOptionActive
                                ]}
                                onPress={() => setFiltroTempo(dias)}
                            >
                                <Text style={[
                                    styles.filterOptionText,
                                    filtroTempo === dias && styles.filterOptionTextActive
                                ]}>
                                    {dias === '365' ? '1 ano' : `${dias} dias`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* KPIs principais */}
                <View style={styles.kpisContainer}>
                    <Text style={styles.sectionTitle}>Indicadores Principais</Text>

                   <View style={styles.kpisGrid}>
                    <KPICard
                        title="Total de Pedidos"
                        value={analyticsData.kpis.totalPedidos}
                        icon={faUsers}
                        color="#1792FE"
                    />

                    <KPICard
                        title="Taxa de Resolução"
                        value={`${analyticsData.kpis.taxaResolucao}%`}
                        icon={faCheckCircle}
                        color="#28a745"
                    />

                    <KPICard
                        title="Tempo Médio"
                        value={`${analyticsData.kpis.tempoMedioResolucao}h`}
                        icon={faClock}
                        color="#ffc107"
                    />

                    <KPICard
                        title="Pedidos Abertos"
                        value={analyticsData.kpis.pedidosAbertos}
                        icon={faExclamationTriangle}
                        color="#dc3545"
                    />
                    </View>

                </View>

                {/* Gráfico de Estados */}
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Distribuição por Estado</Text>
                    <SimplePieChart data={analyticsData.chartData.estados || []} />
                </View>

                {/* Performance dos Técnicos */}
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Ranking de Técnicos</Text>
                    {analyticsData.tecnicosPerformance.map((tecnico, index) => (
                    <TecnicoRankingCard key={index} tecnico={tecnico} index={index} />
                    ))}

                </View>

                {/* Gráfico de Prioridades */}
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Distribuição por Prioridade</Text>
                    <SimpleBarChart data={analyticsData.chartData.prioridades || []} />
                </View>

                {/* Pedidos Em Andamento */}
                {analyticsData.pedidosEmAndamento && analyticsData.pedidosEmAndamento.length > 0 && (
                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>
                            Pedidos Em Andamento ({analyticsData.pedidosEmAndamento.length})
                        </Text>
                        {analyticsData.pedidosEmAndamento.map((pedido, index) => (
                            <View key={index} style={styles.pedidoCard}>
                                <View style={styles.pedidoHeader}>
                                    <Text style={styles.pedidoNumero}>
                                        {pedido.Processo || `#${pedido.NumProcesso}`}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: '#ffc107' }]}>
                                        <Text style={styles.statusText}>Em Andamento</Text>
                                    </View>
                                </View>

                                <Text style={styles.pedidoCliente}>
                                    Cliente: {pedido.NomeCliente || pedido.Cliente}
                                </Text>

                                <Text style={styles.pedidoTecnico}>
                                    Técnico: {pedido.NomeTecnico || 'Não atribuído'}
                                </Text>

                                <Text style={styles.pedidoTipo}>
                                    Tipo: {pedido.TipoInterv || 'Não especificado'}
                                </Text>

                                <Text style={styles.pedidoData}>
                                    Abertura: {new Date(pedido.DataHoraAbertura || pedido.DataHoraInicio).toLocaleDateString('pt-PT')}
                                </Text>

                                {pedido.DescricaoProb && (
                                    <Text style={styles.pedidoDescricao}>
                                        {pedido.DescricaoProb}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};


export default DashboardAnalytics;
