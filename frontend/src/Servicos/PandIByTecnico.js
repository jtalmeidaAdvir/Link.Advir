import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    StyleSheet,
    Picker,
} from 'react-native';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const getWeek = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const PandIByTecnico = () => {
    const [tecnicoID, setTecnicoID] = useState('');
    const [intervencoes, setIntervencoes] = useState([]);
    const [processos, setProcessos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtro, setFiltro] = useState('mes');
    const [ano, setAno] = useState(2025);

    const fetchData = async () => {
        if (!tecnicoID) {
            Alert.alert('Erro', 'Insira o ID do técnico.');
            return;
        }

        const token = localStorage.getItem('painelAdminToken');
        const urlempresa = localStorage.getItem('urlempresa');

        if (!token || !urlempresa) {
            Alert.alert('Erro', 'Token ou URL da empresa não encontrados.');
            return;
        }

        setLoading(true);
        try {
            const [intervencoesRes, processosRes] = await Promise.all([
                fetch(`https://webapiprimavera.advir.pt/routePedidos_STP/ListaIntervencoesTecnico/${tecnicoID}`, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'urlempresa': urlempresa },
                }),
                fetch(`https://webapiprimavera.advir.pt/routePedidos_STP/ListaProcessosTecnico/${tecnicoID}`, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'urlempresa': urlempresa },
                })
            ]);
            
            if (!intervencoesRes.ok || !processosRes.ok) throw new Error('Erro ao obter dados');
            
            const intervencoesData = await intervencoesRes.json();
            const processosData = await processosRes.json();

            setIntervencoes(intervencoesData?.DataSet?.Table || []);
            setProcessos(processosData?.DataSet?.Table || []);
        } catch (error) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    const getTotalMinutesPerMonth = () => {
        const anoSelecionado = Number(ano); // Garante que é um número
    
        return Array.from({ length: 12 }, (_, i) => i + 1).map(mes => ({
            name: `${mes}`,
            horas: intervencoes.reduce((total, { DataHoraInicio, DataHoraFim }) => {
                const inicio = new Date(DataHoraInicio);
                const fim = new Date(DataHoraFim);
                return total + (inicio.getMonth() + 1 === mes && inicio.getFullYear() === anoSelecionado ? (fim - inicio) / 3600000 : 0);
            }, 0) // Convertendo minutos para horas (divisão por 3600000 ms)
        }));
    };
    

    const processData = () => {
        const anoSelecionado = Number(ano); // Garante que é um número
    
        if (filtro === 'ano') {
            const anos = [...new Set([...intervencoes, ...processos].map(({ DataHoraInicio, DataHoraAbertura }) => {
                return new Date(DataHoraInicio || DataHoraAbertura).getFullYear();
            }))];
    
            return anos.map(ano => ({
                name: `${ano}`,
                intervencoes: intervencoes.filter(({ DataHoraInicio }) => new Date(DataHoraInicio).getFullYear() === ano).length,
                minutos: intervencoes.reduce((total, { DataHoraInicio, DataHoraFim }) => {
                    const inicio = new Date(DataHoraInicio);
                    const fim = new Date(DataHoraFim);
                    return total + (inicio.getFullYear() === ano ? (fim - inicio) / 60000 : 0);
                }, 0),
                processos: processos.filter(({ DataHoraAbertura }) => new Date(DataHoraAbertura).getFullYear() === ano).length
            }));
        }
    
        if (filtro === 'mes' || filtro === 'semana') {
            return Array.from({ length: filtro === 'mes' ? 12 : 52 }, (_, i) => i + 1).map(value => ({
                name: `${value}`,
                intervencoes: intervencoes.filter(({ DataHoraInicio }) => {
                    const date = new Date(DataHoraInicio);
                    return (filtro === 'mes' ? date.getMonth() + 1 : getWeek(date)) === value && date.getFullYear() === anoSelecionado;
                }).length,
                minutos: intervencoes.reduce((total, { DataHoraInicio, DataHoraFim }) => {
                    const inicio = new Date(DataHoraInicio);
                    const fim = new Date(DataHoraFim);
                    return total + ((filtro === 'mes' ? inicio.getMonth() + 1 : getWeek(inicio)) === value && inicio.getFullYear() === anoSelecionado ? (fim - inicio) / 60000 : 0);
                }, 0),
                processos: processos.filter(({ DataHoraAbertura }) => {
                    const date = new Date(DataHoraAbertura);
                    return (filtro === 'mes' ? date.getMonth() + 1 : getWeek(date)) === value && date.getFullYear() === anoSelecionado;
                }).length
            }));
        }
    
        return [];
    };
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Dashboard Técnico</Text>
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

            <Picker selectedValue={filtro} onValueChange={(value) => setFiltro(value)} style={styles.picker}>
                <Picker.Item label="Mês" value="mes" />
                <Picker.Item label="Semana" value="semana" />
                <Picker.Item label="Ano" value="ano" />
            </Picker>

            {(filtro === 'mes' || filtro === 'semana') && (
                <Picker selectedValue={ano} onValueChange={(value) => setAno(value)} style={styles.picker}>
                    <Picker.Item label="2025" value={2025} />
                    <Picker.Item label="2024" value={2024} />
                </Picker>
            )}


            <TouchableOpacity style={styles.button} onPress={fetchData} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'A carregar...' : 'Obter Dados'}</Text>
            </TouchableOpacity>
            
            {intervencoes.length > 0 && processos.length > 0 && (
                <View style={styles.chartContainer}>
                    <View style={styles.chartBox}>
                        <Text style={styles.chartTitle}>Intervenções</Text>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={processData()}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="intervencoes" fill="#007bff" name="Intervenções" />
                            </BarChart>
                        </ResponsiveContainer>
                    </View>

                    <View style={styles.chartBox}>
                        <Text style={styles.chartTitle}>Tempo Total (Minutos)</Text>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={processData()}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="minutos" fill="#007bff" name="Minutos" />
                            </BarChart>
                        </ResponsiveContainer>
                    </View>

                    <View style={styles.chartBox}>
                        <Text style={styles.chartTitle}>Processos</Text>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={processData()}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="processos" fill="#007bff" name="Processos" />
                            </BarChart>
                        </ResponsiveContainer>
                    </View>
                    <View style={styles.chartBox}>
    <Text style={styles.chartTitle}>Total de Horas por Mês</Text>
    <ResponsiveContainer width="100%" height={250}>
        <BarChart data={getTotalMinutesPerMonth()}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="horas" fill="#007bff" name="Horas" />
        </BarChart>
    </ResponsiveContainer>
</View>
                </View>
            )}
            

        </View>
        
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#d4e4ff' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1792FE', marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
    button: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20,width: '100%', },
    buttonText: { color: '#fff', fontWeight: 'bold' },
    picker: { width: '100%', marginBottom: 15, borderRadius:'10px', fontSize:20, alignItems: 'center' },
    chartTitle: { fontSize: 26, fontWeight: 'bold', color: '#1792FE', marginBottom: 20, textAlign: 'center' },
    chartContainer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
    chartBox: { width: '48%', alignItems: 'center', marginBottom: 50 },
});

export default PandIByTecnico;
