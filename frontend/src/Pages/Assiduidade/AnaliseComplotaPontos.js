
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const AnaliseComplotaPontos = () => {
    const [loading, setLoading] = useState(false);
    const [utilizadores, setUtilizadores] = useState([]);
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState('');
    const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [dadosGrade, setDadosGrade] = useState([]);
    const [faltas, setFaltas] = useState([]);

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const anos = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

    useEffect(() => {
        carregarDadosIniciais();
    }, []);

    useEffect(() => {
        if (obraSelecionada) {
            carregarDadosGrade();
        }
    }, [obraSelecionada, mesSelecionado, anoSelecionado]);

    const carregarDadosIniciais = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('loginToken');
            const empresaId = localStorage.getItem('empresa_id');

            // Carregar obras
            const resObras = await fetch(`https://backend.advir.pt/api/obra/por-empresa?empresa_id=${empresaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const obrasData = await resObras.json();
            setObras(obrasData);

            // Carregar utilizadores
            const resUsers = await fetch(`https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${empresaId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const usersData = await resUsers.json();
            setUtilizadores(usersData);

        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            Alert.alert('Erro', 'Erro ao carregar dados iniciais');
        } finally {
            setLoading(false);
        }
    };

    const carregarFaltas = async () => {
        try {
            const painelAdminToken = localStorage.getItem('painelAdminToken');
            const urlempresa = localStorage.getItem('urlempresa');

            if (!painelAdminToken || !urlempresa) {
                console.warn('Token ou URL da empresa não encontrados para carregar faltas');
                return [];
            }

            const promises = utilizadores.map(async (user) => {
                try {
                    const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetListaFaltasFuncionario/${user.codFuncionario}`, {
                        headers: {
                            'Authorization': `Bearer ${painelAdminToken}`,
                            'urlempresa': urlempresa,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (res.ok) {
                        const data = await res.json();
                        const faltasUsuario = data?.DataSet?.Table || [];
                        return faltasUsuario.map(falta => ({
                            ...falta,
                            userId: user.id,
                            nomeUsuario: user.nome
                        }));
                    }
                    return [];
                } catch (error) {
                    console.error(`Erro ao carregar faltas para ${user.nome}:`, error);
                    return [];
                }
            });

            const resultados = await Promise.all(promises);
            return resultados.flat();
        } catch (error) {
            console.error('Erro ao carregar faltas:', error);
            return [];
        }
    };

    const gerarPontosFicticios = (userId, dia) => {
        // Gerar horários fictícios aleatórios mas consistentes
        const seed = userId * 1000 + dia; // Para manter consistência
        const random = (seed * 9301 + 49297) % 233280 / 233280;
        
        const horarios = [
            { entrada: '08:00', saida: '17:00' },
            { entrada: '08:30', saida: '17:30' },
            { entrada: '09:00', saida: '18:00' },
            { entrada: '07:30', saida: '16:30' },
            { entrada: '08:00', saida: '12:00', entradaTarde: '13:00', saidaTarde: '17:00' }
        ];

        const horarioEscolhido = horarios[Math.floor(random * horarios.length)];
        
        return {
            horaEntrada: horarioEscolhido.entrada,
            horaSaida: horarioEscolhido.saida,
            entradaTarde: horarioEscolhido.entradaTarde,
            saidaTarde: horarioEscolhido.saidaTarde,
            totalHoras: 8.0,
            temIntervalo: horarioEscolhido.entradaTarde ? true : false
        };
    };

    const carregarDadosGrade = async () => {
        if (!obraSelecionada) return;
        
        setLoading(true);
        try {
            // Carregar faltas
            const faltasData = await carregarFaltas();
            setFaltas(faltasData);

            // Filtrar faltas para o mês/ano selecionado
            const faltasDoMes = faltasData.filter(falta => {
                const dataFalta = new Date(falta.Data);
                return dataFalta.getMonth() + 1 === mesSelecionado && 
                       dataFalta.getFullYear() === anoSelecionado;
            });

            // Gerar dados da grade
            const diasDoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
            const dadosGradeTemp = [];

            utilizadores.forEach(user => {
                const dadosUsuario = {
                    utilizador: user,
                    estatisticasDias: {},
                    totalHorasMes: 0,
                    diasTrabalhados: 0,
                    faltasTotal: 0
                };

                for (let dia = 1; dia <= diasDoMes; dia++) {
                    const dataAtual = new Date(anoSelecionado, mesSelecionado - 1, dia);
                    const diaSemana = dataAtual.getDay();
                    const isWeekend = diaSemana === 0 || diaSemana === 6;
                    
                    // Verificar se há falta neste dia
                    const faltasDoDia = faltasDoMes.filter(falta => {
                        const dataFalta = new Date(falta.Data);
                        return falta.userId === user.id && 
                               dataFalta.getDate() === dia;
                    });

                    let estatisticasDia = {
                        dia: dia,
                        diaSemana: diaSemana,
                        isWeekend: isWeekend,
                        faltas: faltasDoDia,
                        temFalta: faltasDoDia.length > 0
                    };

                    if (!isWeekend && faltasDoDia.length === 0) {
                        // Gerar pontos fictícios para dias úteis sem falta
                        const pontosFicticios = gerarPontosFicticios(user.id, dia);
                        estatisticasDia = {
                            ...estatisticasDia,
                            ...pontosFicticios,
                            trabalhou: true
                        };
                        
                        dadosUsuario.totalHorasMes += 8;
                        dadosUsuario.diasTrabalhados++;
                    } else if (faltasDoDia.length > 0) {
                        estatisticasDia.trabalhou = false;
                        dadosUsuario.faltasTotal++;
                    }

                    dadosUsuario.estatisticasDias[dia] = estatisticasDia;
                }

                dadosGradeTemp.push(dadosUsuario);
            });

            setDadosGrade(dadosGradeTemp);
        } catch (error) {
            console.error('Erro ao carregar dados da grade:', error);
            Alert.alert('Erro', 'Erro ao carregar dados da grade');
        } finally {
            setLoading(false);
        }
    };

    const getCellStyle = (estatisticas) => {
        if (!estatisticas) return styles.cellEmpty;
        
        if (estatisticas.isWeekend) {
            return styles.cellWeekend;
        }
        
        if (estatisticas.temFalta) {
            return styles.cellFalta;
        }
        
        if (estatisticas.trabalhou) {
            return styles.cellTrabalhou;
        }
        
        return styles.cellEmpty;
    };

    const getCellText = (estatisticas) => {
        if (!estatisticas || estatisticas.isWeekend) return '';
        
        if (estatisticas.temFalta) {
            return 'FALTA';
        }
        
        if (estatisticas.trabalhou) {
            return `${estatisticas.horaEntrada}\n${estatisticas.horaSaida}`;
        }
        
        return '';
    };

    const renderGradeHeader = () => {
        const diasDoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
        const dias = Array.from({ length: diasDoMes }, (_, i) => i + 1);
        
        return (
            <View style={styles.headerRow}>
                <View style={styles.headerCell}>
                    <Text style={styles.headerText}>Funcionário</Text>
                </View>
                {dias.map(dia => (
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
                
                {dias.map(dia => {
                    const estatisticas = dadosUsuario.estatisticasDias[dia];
                    return (
                        <TouchableOpacity
                            key={dia}
                            style={[styles.dayCell, getCellStyle(estatisticas)]}
                            onPress={() => {
                                if (estatisticas && estatisticas.trabalhou) {
                                    Alert.alert(
                                        'Detalhes do Dia',
                                        `Funcionário: ${dadosUsuario.utilizador.nome}\n` +
                                        `Dia: ${dia}/${mesSelecionado}/${anoSelecionado}\n` +
                                        `Entrada: ${estatisticas.horaEntrada}\n` +
                                        `Saída: ${estatisticas.horaSaida}\n` +
                                        (estatisticas.temIntervalo ? 
                                            `Entrada Tarde: ${estatisticas.entradaTarde}\n` +
                                            `Saída Tarde: ${estatisticas.saidaTarde}\n` : '') +
                                        `Total Horas: ${estatisticas.totalHoras}h`
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
            colors={['#e3f2fd', '#bbdefb', '#90caf9']}
            style={styles.container}
        >
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <MaterialCommunityIcons name="chart-timeline-variant" size={28} color="#1792FE" />
                    <Text style={styles.headerTitle}>Registos de Ponto - Análise Completa</Text>
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
                                    <Picker.Item label="Selecione uma obra..." value="" />
                                    {obras.map(obra => (
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
                                    {anos.map(ano => (
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
                            <View style={[styles.legendColor, styles.cellTrabalhou]} />
                            <Text style={styles.legendText}>Trabalhou (8h fictícias)</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, styles.cellFalta]} />
                            <Text style={styles.legendText}>Falta</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, styles.cellWeekend]} />
                            <Text style={styles.legendText}>Fim de semana</Text>
                        </View>
                    </View>
                </View>

                {/* Grade */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#1792FE" />
                        <Text style={styles.loadingText}>Carregando dados...</Text>
                    </View>
                ) : dadosGrade.length > 0 ? (
                    <View style={styles.gradeCard}>
                        <Text style={styles.gradeTitle}>
                            Grade Mensal - {meses[mesSelecionado - 1]} {anoSelecionado} ({dadosGrade.length} utilizadores)
                        </Text>
                        
                        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                            <View style={styles.gradeContainer}>
                                {renderGradeHeader()}
                                {dadosGrade.map((dadosUsuario, index) => 
                                    renderGradeRow(dadosUsuario, index)
                                )}
                            </View>
                        </ScrollView>
                    </View>
                ) : obraSelecionada ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="information" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>Nenhum dado encontrado para os filtros selecionados</Text>
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="filter" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>Selecione uma obra para visualizar a grade</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        marginTop: 10,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1792FE',
        marginLeft: 12,
    },
    filtersCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    filtersTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    filterRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    filterItem: {
        flex: 1,
        marginHorizontal: 4,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
        marginBottom: 8,
    },
    pickerContainer: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    picker: {
        height: 50,
    },
    legendCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    legendTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
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
        color: '#666',
    },
    gradeCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    gradeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    gradeContainer: {
        minWidth: 800,
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 2,
        borderBottomColor: '#1792FE',
    },
    headerCell: {
        width: 120,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
    },
    headerText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    dayHeaderCell: {
        width: 40,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
    },
    dayHeaderText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#666',
    },
    totalHeaderCell: {
        width: 80,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradeRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    userCell: {
        width: 120,
        padding: 8,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
    },
    userText: {
        fontSize: 11,
        color: '#333',
        textAlign: 'center',
    },
    dayCell: {
        width: 40,
        height: 50,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
    },
    dayCellText: {
        fontSize: 8,
        textAlign: 'center',
        color: '#333',
    },
    totalCell: {
        width: 80,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    totalText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1792FE',
    },
    totalSubText: {
        fontSize: 9,
        color: '#666',
    },
    cellEmpty: {
        backgroundColor: '#f8f9fa',
    },
    cellTrabalhou: {
        backgroundColor: '#d4edda',
    },
    cellFalta: {
        backgroundColor: '#f8d7da',
    },
    cellWeekend: {
        backgroundColor: '#e2e3e5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
});

export default AnaliseComplotaPontos;
