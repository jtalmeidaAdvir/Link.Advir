
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
    Alert
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartLine,
    faClock,
    faUsers,
    faCheckCircle,
    faExclamationTriangle,
    faCalendarAlt,
    faTrophy,
    faArrowUp,
    faArrowDown,
    faFilter,
    faDownload
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

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

    const renderKPICard = (title, value, icon, color, trend = null) => (
        <View style={[styles.kpiCard, { borderLeftColor: color }]}>
            <View style={styles.kpiHeader}>
                <FontAwesomeIcon icon={icon} color={color} size="lg" />
                {trend && (
                    <FontAwesomeIcon
                        icon={trend > 0 ? faArrowUp : faArrowDown}
                        color={trend > 0 ? '#28a745' : '#dc3545'}
                        size="sm"
                    />
                )}
            </View>
            <Text style={styles.kpiValue}>{value}</Text>
            <Text style={styles.kpiTitle}>{title}</Text>
        </View>
    );

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
                        {renderKPICard(
                            "Total de Pedidos",
                            analyticsData.kpis.totalPedidos,
                            faUsers,
                            "#1792FE"
                        )}

                        {renderKPICard(
                            "Taxa de Resolução",
                            `${analyticsData.kpis.taxaResolucao}%`,
                            faCheckCircle,
                            "#28a745"
                        )}

                        {renderKPICard(
                            "Tempo Médio",
                            `${analyticsData.kpis.tempoMedioResolucao}h`,
                            faClock,
                            "#ffc107"
                        )}

                        {renderKPICard(
                            "Pedidos Abertos",
                            analyticsData.kpis.pedidosAbertos,
                            faExclamationTriangle,
                            "#dc3545"
                        )}
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
                        <View key={index} style={styles.tecnicoCard}>
                            <View style={styles.tecnicoHeader}>
                                <View style={styles.tecnicoRank}>
                                    <Text style={styles.rankNumber}>{index + 1}</Text>
                                    {index < 3 && (
                                        <FontAwesomeIcon
                                            icon={faTrophy}
                                            color={index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32'}
                                            size="sm"
                                        />
                                    )}
                                </View>
                                <Text style={styles.tecnicoNome}>{tecnico.nome}</Text>
                            </View>

                            <View style={styles.tecnicoStats}>
                                <View style={styles.stat}>
                                    <Text style={styles.statValue}>{tecnico.total}</Text>
                                    <Text style={styles.statLabel}>Total</Text>
                                </View>
                                <View style={styles.stat}>
                                    <Text style={styles.statValue}>{tecnico.resolvidos}</Text>
                                    <Text style={styles.statLabel}>Resolvidos</Text>
                                </View>
                                <View style={styles.stat}>
                                    <Text style={styles.statValue}>{Math.round(tecnico.eficiencia)}%</Text>
                                    <Text style={styles.statLabel}>Eficiência</Text>
                                </View>
                                <View style={styles.stat}>
                                    <Text style={styles.statValue}>{Math.round(tecnico.tempoMedio)}h</Text>
                                    <Text style={styles.statLabel}>Tempo Médio</Text>
                                </View>
                            </View>

                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${Math.min(tecnico.eficiencia, 100)}%` }
                                    ]}
                                />
                            </View>
                        </View>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f7fa',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    header: {
        backgroundColor: '#1792FE',
        paddingVertical: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    filterButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 10,
        borderRadius: 8,
    },
    exportButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 10,
        borderRadius: 8,
    },
    filtersContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    filterButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    filterOption: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    filterOptionActive: {
        backgroundColor: '#1792FE',
        borderColor: '#1792FE',
    },
    filterOptionText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    filterOptionTextActive: {
        color: '#fff',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 16,
    },
    kpisContainer: {
        marginBottom: 24,
    },
    kpisGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    kpiCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flex: 1,
        minWidth: 150,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    kpiHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },

    kpiValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    kpiTitle: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    // Estilos para gráficos simples
    simplePieContainer: {
        alignItems: 'center',
    },
    pieItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
        width: '100%',
    },
    pieColor: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 8,
    },
    pieLabel: {
        fontSize: 14,
        color: '#333',
    },
    simpleBarContainer: {
        gap: 12,
    },
    barItem: {
        marginBottom: 8,
    },
    barLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    barBackground: {
        height: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 10,
    },
    barValue: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginTop: 2,
    },
    tecnicoCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    tecnicoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    tecnicoRank: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
        minWidth: 40,
    },
    rankNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1792FE',
        marginRight: 4,
    },

    tecnicoNome: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    tecnicoStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    stat: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1792FE',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#e9ecef',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#1792FE',
    },
    // Estilos para pedidos em andamento
    pedidoCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
    },
    pedidoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    pedidoNumero: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#fff',
    },
    pedidoCliente: {
        fontSize: 14,
        color: '#333',
        marginBottom: 4,
        fontWeight: '600',
    },
    pedidoTecnico: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    pedidoTipo: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    pedidoData: {
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
    },
    pedidoDescricao: {
        fontSize: 12,
        color: '#555',
        fontStyle: 'italic',
        marginTop: 4,
    },
});

export default DashboardAnalytics;
