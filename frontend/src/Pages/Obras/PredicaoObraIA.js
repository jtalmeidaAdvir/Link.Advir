
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { secureStorage } from '../../utils/secureStorage';

const PredicaoObraIA = ({ navigation }) => {
    const [loading, setLoading] = useState(false);
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState('');
    const [diasPrevistos, setDiasPrevistos] = useState('30');
    const [predicao, setPredicao] = useState(null);

    useEffect(() => {
        carregarObras();
    }, []);

    // Limpar predição quando mudar de obra
    useEffect(() => {
        setPredicao(null);
    }, [obraSelecionada]);

    const carregarObras = async () => {
        try {
            const token = await secureStorage.getItem('loginToken');
            const res = await fetch('https://backend.advir.pt/api/obra', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setObras(data);
            }
        } catch (error) {
            console.error('Erro ao carregar obras:', error);
        }
    };

    const obterPredicao = async () => {
        if (!obraSelecionada) {
            Alert.alert('Aviso', 'Por favor, selecione uma obra');
            return;
        }

        setLoading(true);
        try {
            const token = await secureStorage.getItem('loginToken');
            const url = `https://backend.advir.pt/api/predicao-obra/${obraSelecionada}?diasPrevistos=${diasPrevistos}`;
            
            console.log('Buscando predição para obra:', obraSelecionada);
            
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setPredicao(data);
            } else {
                const error = await res.json();
                Alert.alert('Erro', error.mensagem || 'Sem dados suficientes para predição');
            }
        } catch (error) {
            console.error('Erro ao obter predição:', error);
            Alert.alert('Erro', 'Erro ao processar predição');
        } finally {
            setLoading(false);
        }
    };

    const renderCartao = (titulo, valor, icone, cor) => (
        <View style={[styles.cartao, { borderLeftColor: cor }]}>
            <View style={styles.cartaoHeader}>
                <Ionicons name={icone} size={24} color={cor} />
                <Text style={styles.cartaoTitulo}>{titulo}</Text>
            </View>
            <Text style={styles.cartaoValor}>{valor}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1792FE', '#0B5ED7']} style={styles.header}>
                <Text style={styles.headerTitle}>IA - Predição de Obras</Text>
                <Text style={styles.headerSubtitle}>
                    Análise preditiva baseada em partes diárias
                </Text>
            </LinearGradient>

            <ScrollView style={styles.content}>
                <View style={styles.formContainer}>
                    <Text style={styles.label}>Selecionar Obra:</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={obraSelecionada}
                            onValueChange={setObraSelecionada}
                            style={styles.picker}
                        >
                            <Picker.Item label="-- Selecione uma obra --" value="" />
                            {obras.map(obra => (
                                <Picker.Item 
                                    key={obra.id} 
                                    label={`${obra.codigo} - ${obra.nome}`} 
                                    value={obra.id} 
                                />
                            ))}
                        </Picker>
                    </View>

                    <Text style={styles.label}>Dias para Prever:</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={diasPrevistos}
                            onValueChange={setDiasPrevistos}
                            style={styles.picker}
                        >
                            <Picker.Item label="15 dias" value="15" />
                            <Picker.Item label="30 dias" value="30" />
                            <Picker.Item label="60 dias" value="60" />
                            <Picker.Item label="90 dias" value="90" />
                        </Picker>
                    </View>

                    <TouchableOpacity 
                        style={styles.botaoAnalisar}
                        onPress={obterPredicao}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#1792FE', '#0B5ED7']}
                            style={styles.buttonGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="analytics" size={20} color="#fff" />
                                    <Text style={styles.botaoTexto}>Analisar com IA</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {predicao && predicao.sucesso && (
                    <View style={styles.resultadosContainer}>
                        <Text style={styles.secaoTitulo}>📊 Análise Histórica</Text>
                        {renderCartao(
                            'Dias Analisados',
                            predicao.analiseHistorica.diasAnalisados,
                            'calendar',
                            '#17a2b8'
                        )}
                        {renderCartao(
                            'Horas Acumuladas',
                            `${predicao.analiseHistorica.horasAcumuladas.toFixed(2)}h`,
                            'time',
                            '#28a745'
                        )}
                        {renderCartao(
                            'Custo Acumulado',
                            `€${parseFloat(predicao.analiseHistorica.custoAcumulado).toFixed(2)}`,
                            'cash',
                            '#ffc107'
                        )}

                        <Text style={styles.secaoTitulo}>🔮 Predição ({diasPrevistos} dias)</Text>
                        {renderCartao(
                            'Horas Previstas Total',
                            `${predicao.predicao.horasPrevistoFinal}h`,
                            'trending-up',
                            '#6f42c1'
                        )}
                        {renderCartao(
                            'Custo Previsto Total',
                            `€${parseFloat(predicao.predicao.custoPrevistoFinal).toFixed(2)}`,
                            'trending-up',
                            '#dc3545'
                        )}
                        {renderCartao(
                            'Horas Restantes',
                            `${predicao.predicao.horasRestantes}h`,
                            'hourglass',
                            '#fd7e14'
                        )}

                        <Text style={styles.secaoTitulo}>🎯 Confiança da IA</Text>
                        <View style={styles.confiancaCard}>
                            <Text style={styles.confiancaLabel}>Qualidade da Predição:</Text>
                            <Text style={[
                                styles.confiancaValor,
                                { color: predicao.confianca.qualidade === 'Alta' ? '#28a745' : 
                                         predicao.confianca.qualidade === 'Média' ? '#ffc107' : '#dc3545' }
                            ]}>
                                {predicao.confianca.qualidade}
                            </Text>
                            <Text style={styles.confiancaDetalhe}>
                                Confiança em Custos: {predicao.confianca.nivelConfiancaCusto}
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    header: {
        padding: 20,
        paddingTop: 40
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.9
    },
    content: {
        flex: 1,
        padding: 15
    },
    formContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333'
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 15,
        backgroundColor: '#f9f9f9'
    },
    picker: {
        height: 50
    },
    botaoAnalisar: {
        marginTop: 10
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 8,
        gap: 8
    },
    botaoTexto: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    resultadosContainer: {
        marginTop: 10
    },
    secaoTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        color: '#333'
    },
    cartao: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    cartaoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8
    },
    cartaoTitulo: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500'
    },
    cartaoValor: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333'
    },
    confiancaCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    confiancaLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5
    },
    confiancaValor: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 10
    },
    confiancaDetalhe: {
        fontSize: 12,
        color: '#999'
    }
});

export default PredicaoObraIA;
