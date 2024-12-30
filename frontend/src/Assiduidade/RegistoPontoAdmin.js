import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import BASE_URL from '../../config';


const RegistoPontoAdmin = () => {
    const [users, setUsers] = useState([]);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState("");
    const [historicoPontos, setHistoricoPontos] = useState([]);
    const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (usuarioSelecionado) {
            fetchHistoricoPontos(usuarioSelecionado);
        }
    }, [usuarioSelecionado, mesSelecionado, anoSelecionado]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://192.168.1.4/api/users/usersByEmpresa', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('loginToken')}`
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
            const response = await fetch(`http://192.168.1.4/api/registoPonto/listaradmin?usuario=${userId}&mes=${mesSelecionado}&ano=${anoSelecionado}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('loginToken')}` },
            });

            if (response.ok) {
                const data = await response.json();
                setHistoricoPontos(data.registos || []);
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

        const dadosExportacao = [
            { Dia: `Histórico de Horas - ${nomeUtilizador} - ${mesSelecionado}/${anoSelecionado}`, "Total de Horas Trabalhadas": "" },
            ...historicoPontos.map(item => ({
                Dia: new Date(item.data).toLocaleDateString('pt-PT'),
                "Total de Horas Trabalhadas": ((item.totalHorasTrabalhadas || 0) - (item.totalTempoIntervalo || 0)).toFixed(2) + " horas"
            }))
        ];

        const worksheet = XLSX.utils.json_to_sheet(dadosExportacao, { skipHeader: true });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'HistoricoPonto');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        const fileName = `HistoricoPonto_${nomeUtilizador}_${mesSelecionado}_${anoSelecionado}.xlsx`;
        saveAs(blob, fileName);
    };


    const exportarParaExcelTodos = async () => {
        if (users.length === 0) {
            alert('Nenhum utilizador disponível para exportar.');
            return;
        }
    
        let dadosExportacao = [];
    
        for (const usuario of users) {
            try {
                // Faz o fetch dos registos para cada utilizador
                const response = await fetch(`http://192.168.1.4/api/registoPonto/listaradmin?usuario=${usuario.id}&mes=${mesSelecionado}&ano=${anoSelecionado}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('loginToken')}` },
                });
    
                if (response.ok) {
                    const data = await response.json();
                    const historicoUsuario = data.registos || [];
    
                    // Verifica se o utilizador tem registos e adiciona os dados, senão adiciona uma linha informativa
                    if (historicoUsuario.length > 0) {
                        dadosExportacao.push(
                            { Dia: `Histórico de Horas - ${usuario.username} (${usuario.empresas.join(", ")}) - ${mesSelecionado}/${anoSelecionado}`, "Total de Horas Trabalhadas": "" },
                            ...historicoUsuario.map(item => ({
                                Dia: new Date(item.data).toLocaleDateString('pt-PT'),
                                "Total de Horas Trabalhadas": ((item.totalHorasTrabalhadas || 0) - (item.totalTempoIntervalo || 0)).toFixed(2) + " horas"
                            })),
                            { Dia: "", "Total de Horas Trabalhadas": "" } // Linha em branco entre utilizadores
                        );
                    } else {
                        dadosExportacao.push(
                            { Dia: `Histórico de Horas - ${usuario.username} (${usuario.empresas.join(", ")}) - ${mesSelecionado}/${anoSelecionado}`, "Total de Horas Trabalhadas": "Sem registos para este período" },
                            { Dia: "", "Total de Horas Trabalhadas": "" }
                        );
                    }
                } else {
                    console.error(`Erro ao obter histórico para o utilizador ${usuario.username}`);
                }
            } catch (error) {
                console.error(`Erro de rede ao carregar registos para o utilizador ${usuario.username}:`, error);
            }
        }
    
        // Geração do ficheiro Excel com todos os dados
        const worksheet = XLSX.utils.json_to_sheet(dadosExportacao, { skipHeader: true });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'HistoricoPontoTodos');
    
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        const fileName = `HistoricoPonto_Todos_${mesSelecionado}_${anoSelecionado}.xlsx`;
        saveAs(blob, fileName);
    };
    
    
    

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>Total de Horas Trabalhadas por Dia</Text>
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            {loading ? (
                <ActivityIndicator size="large" color="#0022FF" />
            ) : (
                <>
                    {/* Selector de Utilizador */}
                    <View style={styles.selectorContainer}>
                        <Text style={styles.filtroLabel}>Selecionar Utilizador:</Text>
                        <select
                            value={usuarioSelecionado}
                            onChange={(e) => setUsuarioSelecionado(e.target.value || "")}
                            style={styles.picker}
                        >
                            <option value="">Escolha um utilizador</option>
                            {users.map((usuario) => (
                                <option key={usuario.id} value={usuario.id}>
                                    {usuario.username} ({usuario.empresas.join(", ")})
                                </option>
                            ))}
                        </select>
                    </View>

                    {/* Filtros de Mês e Ano */}
                    <View style={styles.filtroContainer}>
                        <Text style={styles.filtroLabel}>Mês:</Text>
                        <select
                            value={mesSelecionado}
                            onChange={(e) => setMesSelecionado(e.target.value)}
                            style={styles.picker}
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                                <option key={mes} value={mes}>{mes}</option>
                            ))}
                        </select>
                        <Text style={styles.filtroLabel}>Ano:</Text>
                        <select
                            value={anoSelecionado}
                            onChange={(e) => setAnoSelecionado(e.target.value)}
                            style={styles.picker}
                        >
                            {[2023, 2024, 2025].map((ano) => (
                                <option key={ano} value={ano}>{ano}</option>
                            ))}
                        </select>
                    </View>

                    <TouchableOpacity style={styles.exportButton} onPress={exportarParaExcel} disabled={loadingButton}>
                        {loadingButton ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Exportar para Excel</Text>
                        )}
                    </TouchableOpacity>


                    <TouchableOpacity style={styles.exportButton} onPress={exportarParaExcelTodos} disabled={loadingButton}>
                        {loadingButton ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Exportar Registos de Todos os Utilizadores</Text>
                        )}
                    </TouchableOpacity>


                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.tableHeaderText}>Dia</Text>
                            <Text style={styles.tableHeaderText}>Total de Horas Trabalhadas</Text>
                        </View>
                        <FlatList
                            data={historicoPontos}
                            keyExtractor={(item) => `${item.id}`}
                            renderItem={({ item }) => {
                                const totalHorasDia = (item.totalHorasTrabalhadas || 0) - (item.totalTempoIntervalo || 0);
                                return (
                                    <View style={styles.tableRow}>
                                        <Text style={styles.tableCell}>{new Date(item.data).toLocaleDateString('pt-PT')}</Text>
                                        <Text style={styles.tableCell}>
                                            {totalHorasDia.toFixed(2)} horas
                                        </Text>
                                    </View>
                                );
                            }}
                        />
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#d4e4ff',
        padding: 20,
    },
    titulo: {
        fontSize: 24,
        fontWeight: '600',
        color: '#0022FF',
        marginBottom: 20,
    },
    selectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        
    },
    filtroContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    filtroLabel: {
        marginRight: 5,
    },
    picker: {
        marginHorizontal: 10,
        borderRadius: '30px',
        padding: '10px 20px',
        width: '100%',
        marginBottom: '20px',
        fontSize: '1rem',
        border: '1px solid #ccc',
    },
    exportButton: {
        borderRadius: 10,
        padding: 15,
        backgroundColor: '#0022FF',
        width: '80%',
        alignItems: 'center',
        marginVertical: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    tableContainer: {
        width: '100%',
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#e1ecff',
        paddingVertical: 10,
    },
    tableHeaderText: {
        flex: 1,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1A3D7C',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    tableCell: {
        flex: 1,
        textAlign: 'center',
        color: '#333',
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
});

export default RegistoPontoAdmin;
