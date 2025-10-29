
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Animated } from 'react-native';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { secureStorage } from '../../utils/secureStorage';
const RegistoPontoAdmin = () => {
    const [users, setUsers] = useState([]);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState("");
    const [historicoPontos, setHistoricoPontos] = useState([]);
    const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [fadeAnimation] = useState(new Animated.Value(0));
    
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    useEffect(() => {
        Animated.timing(fadeAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
        }).start();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (usuarioSelecionado) {
            fetchHistoricoPontos(usuarioSelecionado);
        }
    }, [usuarioSelecionado, mesSelecionado, anoSelecionado]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const idDaEmpresa = secureStorage.getItem('empresa_id');
const response = await fetch(`https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${idDaEmpresa}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${secureStorage.getItem('loginToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const groupedUsers = data.reduce((acc, curr) => {
                    const user = acc.find(u => u.username === curr.username);
                    if (user) {
                        user.empresas.push(curr.empresa);
                    } else {
                        acc.push({ ...curr, empresas: [curr.empresa] });
                    }
                    return acc;
                }, []);
                setUsers(groupedUsers);
                setErrorMessage('');
            } else {
                setErrorMessage('Erro ao carregar utilizadores.');
            }
        } catch (error) {
            console.error('Erro ao carregar utilizadores:', error);
            setErrorMessage('Erro de rede ao carregar utilizadores.');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistoricoPontos = async (userId) => {
        setLoadingButton(true);
        try {
            const response = await fetch(`https://backend.advir.pt/api/registoPonto/listaradmin?usuario=${userId}&mes=${mesSelecionado}&ano=${anoSelecionado}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${secureStorage.getItem('loginToken')}` },
            });

            if (response.ok) {
                const data = await response.json();
                // Ordenar os registos em ordem decrescente pela data
                const registosOrdenados = (data.registos || []).sort((a, b) => new Date(b.data) - new Date(a.data));
                setHistoricoPontos(registosOrdenados);
                setErrorMessage('');
            } else {
                setErrorMessage('Erro ao obter histórico de pontos.');
                setHistoricoPontos([]);
            }
        } catch (error) {
            console.error('Erro ao obter histórico de pontos:', error);
            setHistoricoPontos([]);
        } finally {
            setLoadingButton(false);
        }
    };

    const exportarParaExcel = () => {
        if (!usuarioSelecionado) {
            alert('Por favor, selecione um utilizador antes de exportar.');
            return;
        }

        const usuario = users.find(u => u.id === parseInt(usuarioSelecionado));
        const nomeUtilizador = usuario ? usuario.username : 'Desconhecido';
        
        // Criar um workbook novo
        const workbook = XLSX.utils.book_new();
        
        // Criar uma planilha
        const worksheet = XLSX.utils.aoa_to_sheet([]);
        
        // Adicionar cabeçalho com logo e título
        const headerRows = [
            [`RELATÓRIO DE PONTO - ${nomeUtilizador.toUpperCase()}`],
            [`Período: ${months[mesSelecionado-1]} de ${anoSelecionado}`],
            [],  // linha em branco
        ];
        
        // Adicionar cabeçalhos das colunas
        const columnHeaders = [
            ["Data", "Dia da Semana", "Entrada", "Saída", "Pausas (h)", "Horas Trabalhadas", "Local de Registro"]
        ];
        
        // Preparar dados dos registros
        const registrosData = historicoPontos.map(item => {
            const data = new Date(item.data);
            const diaSemana = data.toLocaleDateString('pt-PT', { weekday: 'long' });
            const dataFormatada = data.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            const horaEntrada = item.horaEntrada 
                ? new Date(item.horaEntrada).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                : '—';
            
            const horaSaida = item.horaSaida
                ? new Date(item.horaSaida).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                : '—';
            
            const totalPausas = parseFloat(item.totalTempoIntervalo || 0).toFixed(2);
            const horasTrabalhadas = ((item.totalHorasTrabalhadas || 0) - (item.totalTempoIntervalo || 0)).toFixed(2);
            
            // Criar um endereço baseado nas coordenadas
            const local = item.endereco || 
                  (item.latitude && item.longitude ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}` : "Não registrado");
            
            return [
                dataFormatada,
                diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
                horaEntrada,
                horaSaida,
                totalPausas,
                horasTrabalhadas,
                local
            ];
        });
        
        // Separador antes do resumo
        const separador = [
            [],  // linha em branco
            ["RESUMO DO PERÍODO"],
            []   // linha em branco
        ];
        
        // Dados do resumo
        const resumoData = [
            ["Total de Dias Trabalhados:", historicoPontos.length, "", "Total de Horas Trabalhadas:", sumario.horasTotais]
        ];

        // Combinar todos os dados
        const allData = [
            ...headerRows,
            ...columnHeaders,
            ...registrosData,
            ...separador,
            ...resumoData
        ];
        
        // Criar planilha com todos os dados
        XLSX.utils.sheet_add_aoa(worksheet, allData, { origin: 'A1' });
        
        // Definir larguras de coluna para melhor formatação
        const wscols = [
            { wch: 12 },  // Data
            { wch: 18 },  // Dia da Semana
            { wch: 10 },  // Entrada
            { wch: 10 },  // Saída
            { wch: 12 },  // Pausas
            { wch: 18 },  // Horas Trabalhadas
            { wch: 45 },  // Local
        ];
        worksheet['!cols'] = wscols;
        
        // Mesclar células para o cabeçalho principal
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },  // Primeira linha (título)
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },  // Segunda linha (período)
            { s: { r: headerRows.length + registrosData.length + 1, c: 0 }, e: { r: headerRows.length + registrosData.length + 1, c: 6 } }  // Resumo título
        ];
        
        // Definir estilos para a tabela (através de metadados)
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // Criar um objeto para armazenar informações de célula
        if (!worksheet['!cellStyles']) worksheet['!cellStyles'] = {};
        
        // Estilos para cabeçalhos
        for (let C = range.s.c; C <= range.e.c; C++) {
            // Estilo para o cabeçalho da tabela
            const cellRef = XLSX.utils.encode_cell({ r: headerRows.length - 1, c: C });
            worksheet['!cellStyles'][cellRef] = { 
                patternType: 'solid',
                fgColor: { rgb: "4481EB" },
                bold: true,
                color: { rgb: "FFFFFF" }
            };
        }
        
        // Adicionar planilha ao workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Registro de Ponto');

        // Converter para buffer de bytes
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        const fileName = `RegistroPonto_${nomeUtilizador}_${mesSelecionado}_${anoSelecionado}.xlsx`;
        saveAs(blob, fileName);
    };

    const exportarParaExcelTodos = async () => {
        if (users.length === 0) {
            alert('Nenhum utilizador disponível para exportar.');
            return;
        }
        
        setLoadingButton(true);
        
        // Criar um workbook para todos os usuários
        const workbook = XLSX.utils.book_new();
        
        // Para cada usuário, criar uma planilha separada
        for (const usuario of users) {
            try {
                // Faz o fetch dos registos para cada utilizador
                const response = await fetch(`https://backend.advir.pt/api/registoPonto/listaradmin?usuario=${usuario.id}&mes=${mesSelecionado}&ano=${anoSelecionado}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${secureStorage.getItem('loginToken')}` },
                });
    
                if (response.ok) {
                    const data = await response.json();
                    const historicoUsuario = data.registos || [];
                    
                    // Cabeçalho do relatório
                    const headerRow = [
                        { 
                            A: `Relatório de Ponto - ${usuario.username}`, 
                            B: `Empresa(s): ${usuario.empresas.join(", ")}`,
                            C: `Período: ${months[mesSelecionado-1]} de ${anoSelecionado}`
                        }
                    ];
                    
                    // Linha em branco após o cabeçalho
                    const blankRow = [{ A: "" }];
                    
                    // Se não houver registros, adicionar mensagem informativa
                    if (historicoUsuario.length === 0) {
                        const semRegistros = [
                            { A: "Sem registros para este período" }
                        ];
                        
                        const dadosExportacaoVazio = [
                            ...headerRow,
                            ...blankRow,
                            ...semRegistros
                        ];
                        
                        // Criar planilha para o usuário sem registros
                        const worksheetVazio = XLSX.utils.json_to_sheet(dadosExportacaoVazio, { skipHeader: true });
                        
                        // Adicionar planilha ao workbook
                        const sheetName = usuario.username.substring(0, 30); // Limitar tamanho para evitar erros
                        XLSX.utils.book_append_sheet(workbook, worksheetVazio, sheetName);
                        continue;
                    }
                    
                    // Cabeçalhos das colunas
                    const columnHeaders = [
                        { 
                            A: "Data", 
                            B: "Dia da Semana", 
                            C: "Entrada", 
                            D: "Saída", 
                            E: "Pausas (h)",
                            F: "Horas Trabalhadas",
                            G: "Local de Registro"
                        }
                    ];
                    
                    // Dados dos registros
                    const registrosData = historicoUsuario.map(item => {
                        const data = new Date(item.data);
                        const diaSemana = data.toLocaleDateString('pt-PT', { weekday: 'long' });
                        const dataFormatada = data.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        
                        const horaEntrada = item.horaEntrada 
                            ? new Date(item.horaEntrada).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                            : '—';
                        
                        const horaSaida = item.horaSaida
                            ? new Date(item.horaSaida).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                            : '—';
                        
                        const totalPausas = parseFloat(item.totalTempoIntervalo || 0).toFixed(2);
                        const horasTrabalhadas = ((item.totalHorasTrabalhadas || 0) - (item.totalTempoIntervalo || 0)).toFixed(2);
                        
                        // Criar um endereço baseado nas coordenadas se disponíveis
                        const local = item.endereco || 
                              (item.latitude && item.longitude ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}` : "Não registrado");
                        
                        return {
                            A: dataFormatada,
                            B: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
                            C: horaEntrada,
                            D: horaSaida,
                            E: totalPausas,
                            F: horasTrabalhadas,
                            G: local
                        };
                    });
                    
                    // Linha em branco antes do resumo
                    const preResumoBlankRow = [{ A: "" }];
                    
                    // Calcular o total de horas trabalhadas
                    let totalHorasTrabalhadas = 0;
                    historicoUsuario.forEach(item => {
                        const horasTrabalhadas = parseFloat(item.totalHorasTrabalhadas || 0);
                        const tempoIntervalo = parseFloat(item.totalTempoIntervalo || 0);
                        
                        if (!isNaN(horasTrabalhadas) && !isNaN(tempoIntervalo)) {
                            totalHorasTrabalhadas += horasTrabalhadas - tempoIntervalo;
                        }
                    });
                    
                    // Resumo do período
                    const resumo = [
                        { A: "Resumo do Período", B: "", C: "", D: "", E: "", F: "", G: "" },
                        { 
                            A: "Total de Dias Trabalhados", 
                            B: historicoUsuario.length,
                            C: "",
                            D: "Total de Horas Trabalhadas",
                            E: totalHorasTrabalhadas.toFixed(2),
                            F: "",
                            G: ""
                        }
                    ];
                    
                    // Combinar todas as partes
                    const dadosExportacao = [
                        ...headerRow,
                        ...blankRow,
                        ...columnHeaders,
                        ...registrosData,
                        ...preResumoBlankRow,
                        ...resumo
                    ];
                    
                    // Criar planilha para o usuário
                    const worksheet = XLSX.utils.json_to_sheet(dadosExportacao, { skipHeader: true });
                    
                    // Definir larguras de coluna para melhor formatação
                    const wscols = [
                        { wch: 12 },  // Data
                        { wch: 15 },  // Dia da Semana
                        { wch: 10 },  // Entrada
                        { wch: 10 },  // Saída
                        { wch: 10 },  // Pausas
                        { wch: 15 },  // Horas Trabalhadas
                        { wch: 40 },  // Local
                    ];
                    worksheet['!cols'] = wscols;
                    
                    // Adicionar planilha ao workbook - limitar o tamanho do nome para evitar erros
                    const sheetName = usuario.username.substring(0, 30);
                    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
                } else {
                    console.error(`Erro ao obter histórico para o utilizador ${usuario.username}`);
                    
                    // Adicionar planilha vazia com mensagem de erro
                    const errorSheet = XLSX.utils.json_to_sheet([
                        { A: `Erro ao obter dados para ${usuario.username}` }
                    ]);
                    
                    const sheetName = usuario.username.substring(0, 30);
                    XLSX.utils.book_append_sheet(workbook, errorSheet, sheetName);
                }
            } catch (error) {
                console.error(`Erro de rede ao carregar registos para o utilizador ${usuario.username}:`, error);
                
                // Adicionar planilha vazia com mensagem de erro
                const errorSheet = XLSX.utils.json_to_sheet([
                    { A: `Erro de conexão para ${usuario.username}` }
                ]);
                
                const sheetName = usuario.username.substring(0, 30);
                XLSX.utils.book_append_sheet(workbook, errorSheet, sheetName);
            }
        }
    
        // Adicionar uma planilha de resumo geral com todos os usuários
        const resumoGeral = [
            { A: `Resumo Geral - ${months[mesSelecionado-1]} de ${anoSelecionado}`, B: "", C: "" },
            { A: "" },
            { A: "Utilizador", B: "Empresa(s)", C: "Dias Trabalhados", D: "Total Horas" }
        ];
        
        // Adicionar linha para cada usuário
        for (const usuario of users) {
            try {
                const response = await fetch(`https://backend.advir.pt/api/registoPonto/listaradmin?usuario=${usuario.id}&mes=${mesSelecionado}&ano=${anoSelecionado}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${secureStorage.getItem('loginToken')}` },
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const historicoUsuario = data.registos || [];
                    
                    // Calcular total de horas
                    let totalHoras = 0;
                    historicoUsuario.forEach(item => {
                        const horasTrabalhadas = parseFloat(item.totalHorasTrabalhadas || 0);
                        const tempoIntervalo = parseFloat(item.totalTempoIntervalo || 0);
                        
                        if (!isNaN(horasTrabalhadas) && !isNaN(tempoIntervalo)) {
                            totalHoras += horasTrabalhadas - tempoIntervalo;
                        }
                    });
                    
                    // Adicionar linha ao resumo
                    resumoGeral.push({
                        A: usuario.username,
                        B: usuario.empresas.join(", "),
                        C: historicoUsuario.length,
                        D: totalHoras.toFixed(2)
                    });
                } else {
                    resumoGeral.push({
                        A: usuario.username,
                        B: usuario.empresas.join(", "),
                        C: "Erro",
                        D: "-"
                    });
                }
            } catch (error) {
                resumoGeral.push({
                    A: usuario.username,
                    B: usuario.empresas.join(", "),
                    C: "Erro",
                    D: "-"
                });
            }
        }
        
        // Criar e adicionar a planilha de resumo
        const resumoSheet = XLSX.utils.json_to_sheet(resumoGeral, { skipHeader: true });
        XLSX.utils.book_append_sheet(workbook, resumoSheet, "Resumo Geral");
    
        // Gerar o arquivo Excel
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        const fileName = `Relatorio_Todos_${mesSelecionado}_${anoSelecionado}.xlsx`;
        saveAs(blob, fileName);
        
        setLoadingButton(false);
    };

    // Calcular o sumário dos dados do utilizador selecionado
    const calcularSumarioMes = () => {
        if (historicoPontos.length === 0) return { dias: 0, horasTotais: 0 };
        
        const dias = historicoPontos.length;
        let horasTotais = 0;
        
        historicoPontos.forEach(item => {
            const horasTrabalhadas = parseFloat(item.totalHorasTrabalhadas || 0);
            const tempoIntervalo = parseFloat(item.totalTempoIntervalo || 0);
            
            if (!isNaN(horasTrabalhadas) && !isNaN(tempoIntervalo)) {
                horasTotais += horasTrabalhadas - tempoIntervalo;
            }
        });
        
        return { 
            dias,
            horasTotais: horasTotais.toFixed(2)
        };
    };

    const sumario = calcularSumarioMes();

    const nextMonth = () => {
        if (mesSelecionado === 12) {
            setMesSelecionado(1);
            setAnoSelecionado(anoSelecionado + 1);
        } else {
            setMesSelecionado(mesSelecionado + 1);
        }
    };

    const prevMonth = () => {
        if (mesSelecionado === 1) {
            setMesSelecionado(12);
            setAnoSelecionado(anoSelecionado - 1);
        } else {
            setMesSelecionado(mesSelecionado - 1);
        }
    };

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <LinearGradient
                colors={['#4481EB', '#04BEFE']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Administração de Ponto</Text>
                    <Text style={styles.headerSubtitle}>Gerencie os registos de ponto dos utilizadores</Text>
                </View>
            </LinearGradient>
            
            <Animated.View 
                style={[
                    styles.contentContainer, 
                    { opacity: fadeAnimation, transform: [{ translateY: fadeAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                    })}] }
                ]}
            >
                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <MaterialCommunityIcons name="alert-circle" size={24} color="#ff6b6b" />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4481EB" />
                        <Text style={styles.loadingText}>A carregar utilizadores...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Selecionar Utilizador</Text>
                            
                            <View style={styles.selectContainer}>
                                <MaterialCommunityIcons name="account-search" size={22} color="#4481EB" style={styles.selectIcon} />
                                <select
                                    value={usuarioSelecionado}
                                    onChange={(e) => setUsuarioSelecionado(e.target.value || "")}
                                    style={styles.select}
                                >
                                    <option value="">Escolha um utilizador</option>
                                    {users.map((usuario) => (
                                        <option key={usuario.id} value={usuario.id}>
                                            {usuario.email} - {usuario.nome}
                                        </option>
                                    ))}
                                </select>
                            </View>
                            
                            <View style={styles.dateFilterCard}>
                                <View style={styles.monthSelector}>
                                    <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
                                        <Ionicons name="chevron-back" size={22} color="#4481EB" />
                                    </TouchableOpacity>
                                    
                                    <View style={styles.monthDisplay}>
                                        <Text style={styles.monthText}>{months[mesSelecionado-1]}</Text>
                                        <Text style={styles.yearText}>{anoSelecionado}</Text>
                                    </View>
                                    
                                    <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
                                        <Ionicons name="chevron-forward" size={22} color="#4481EB" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            
                            {usuarioSelecionado && (
                                <View style={styles.summaryContainer}>
                                    <View style={styles.summaryItem}>
                                        <MaterialCommunityIcons name="calendar-check" size={20} color="#4481EB" />
                                        <View style={styles.summaryTextContainer}>
                                            <Text style={styles.summaryValue}>{sumario.dias}</Text>
                                            <Text style={styles.summaryLabel}>Dias</Text>
                                        </View>
                                    </View>
                                    
                                    <View style={styles.summaryDivider}></View>
                                    
                                    <View style={styles.summaryItem}>
                                        <MaterialCommunityIcons name="clock-time-five" size={20} color="#4481EB" />
                                        <View style={styles.summaryTextContainer}>
                                            <Text style={styles.summaryValue}>{sumario.horasTotais}</Text>
                                            <Text style={styles.summaryLabel}>Horas</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                        
                        <View style={styles.exportCard}>
                            <Text style={styles.cardTitle}>Exportar Dados</Text>
                            
                            <TouchableOpacity 
                                style={[styles.exportButton, !usuarioSelecionado && styles.disabledButton]} 
                                onPress={exportarParaExcel} 
                                disabled={!usuarioSelecionado || loadingButton}
                            >
                                <LinearGradient
                                    colors={!usuarioSelecionado ? ['#ccc', '#ddd'] : ['#4481EB', '#04BEFE']}
                                    style={styles.buttonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loadingButton ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="file-excel" size={22} color="#fff" />
                                            <Text style={styles.buttonText}>Exportar Utilizador Selecionado</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.exportButton} 
                                onPress={exportarParaExcelTodos} 
                                disabled={loadingButton}
                            >
                                <LinearGradient
                                    colors={loadingButton ? ['#ccc', '#ddd'] : ['#6c5ce7', '#a29bfe']}
                                    style={styles.buttonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loadingButton ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="file-multiple" size={22} color="#fff" />
                                            <Text style={styles.buttonText}>Exportar Todos Utilizadores</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {usuarioSelecionado && historicoPontos.length > 0 && (
                            <View style={styles.tableCard}>
                                <Text style={styles.cardTitle}>Registos de Ponto</Text>
                                
                                <View style={styles.tableHeader}>
                                    <Text style={styles.tableHeaderCell}>Data</Text>
                                    <Text style={styles.tableHeaderCell}>Horas Trabalhadas</Text>
                                </View>
                                
                                <FlatList
                                    data={historicoPontos}
                                    keyExtractor={(item) => `${item.id}`}
                                    renderItem={({ item }) => {
                                        const totalHorasDia = (item.totalHorasTrabalhadas || 0) - (item.totalTempoIntervalo || 0);
                                        return (
                                            <View style={styles.tableRow}>
                                                <Text style={styles.tableCell}>
                                                    {new Date(item.data).toLocaleDateString('pt-PT', {weekday: 'short', day: 'numeric', month: 'short'})}
                                                </Text>
                                                <Text style={styles.tableCell}>
                                                    <Text style={styles.hoursValue}>{totalHorasDia.toFixed(2)}</Text> horas
                                                </Text>
                                            </View>
                                        );
                                    }}
                                    scrollEnabled={false}
                                    ListEmptyComponent={
                                        <View style={styles.emptyContainer}>
                                            <MaterialCommunityIcons name="timetable" size={50} color="#d1dbed" />
                                            <Text style={styles.emptyText}>Sem registos para este período</Text>
                                        </View>
                                    }
                                />
                            </View>
                        )}
                        
                        {usuarioSelecionado && historicoPontos.length === 0 && !loadingButton && (
                            <View style={styles.emptyStateCard}>
                                <MaterialCommunityIcons name="calendar-blank" size={60} color="#d1dbed" />
                                <Text style={styles.emptyStateTitle}>Sem registos para o período</Text>
                                <Text style={styles.emptyStateText}>
                                    Não foram encontrados registos de ponto para o utilizador e período selecionados.
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </Animated.View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        width: '100%',
        paddingTop: 40,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    headerContent: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    contentContainer: {
        flex: 1,
        marginTop: -20,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    exportCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    tableCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    selectContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f5f7fa',
        marginBottom: 15,
    },
    selectIcon: {
        paddingHorizontal: 12,
    },
    select: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: '#333',
        borderWidth: 0,
        outline: 'none',
        backgroundColor: 'transparent',
        padding: '0 12px',
    },
    dateFilterCard: {
        marginBottom: 15,
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    monthArrow: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: '#f5f7fa',
    },
    monthDisplay: {
        alignItems: 'center',
    },
    monthText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    yearText: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    summaryContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 15,
    },
    summaryItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#f0f0f0',
    },
    summaryTextContainer: {
        marginLeft: 10,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#777',
    },
    exportButton: {
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 10,
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.7,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f4ff',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 8,
    },
    tableHeaderCell: {
        flex: 1,
        fontWeight: '600',
        color: '#4481EB',
        fontSize: 15,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tableCell: {
        flex: 1,
        fontSize: 15,
        color: '#555',
    },
    hoursValue: {
        color: '#333',
        fontWeight: '600',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8d7da',
        padding: 15,
        borderRadius: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#ff6b6b',
        marginLeft: 10,
        fontSize: 15,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 30,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#777',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
    },
    emptyText: {
        fontSize: 15,
        color: '#777',
        marginTop: 10,
    },
    emptyStateCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 15,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        maxWidth: '80%',
    },
});

export default RegistoPontoAdmin;
