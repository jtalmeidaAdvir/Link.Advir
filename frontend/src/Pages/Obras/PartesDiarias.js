
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    Dimensions,
    FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const { width } = Dimensions.get('window');

const PartesDiarias = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [registosPonto, setRegistosPonto] = useState([]);
    const [equipas, setEquipas] = useState([]);
    const [obras, setObras] = useState([]);
    const [mesAno, setMesAno] = useState({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear() });
    const [dadosProcessados, setDadosProcessados] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedTrabalhador, setSelectedTrabalhador] = useState(null);
    const [selectedDia, setSelectedDia] = useState(null);
    const [editData, setEditData] = useState({
        especialidade: '',
        categoria: 'MaoObra'
    });
    const [editingCell, setEditingCell] = useState(null);
    const [tempHoras, setTempHoras] = useState('');

    // Especialidades disponíveis
    const especialidades = [
        'Servente',
        'Pedreiro',
        'Carpinteiro',
        'Ferreiro',
        'Eletricista',
        'Canalizador',
        'Pintor',
        'Soldador',
        'Operador de Máquinas',
        'Encarregado',
        'Técnico'
    ];

    const categorias = [
        { label: 'Mão de Obra', value: 'MaoObra' },
        { label: 'Materiais', value: 'Materiais' },
        { label: 'Equipamentos', value: 'Equipamentos' }
    ];

    useEffect(() => {
        carregarDados();
    }, [mesAno]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            // Simular delay de carregamento
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            carregarDadosExemplo();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            Alert.alert('Erro', 'Erro ao carregar os dados necessários');
        } finally {
            setLoading(false);
        }
    };

    const carregarDadosExemplo = () => {
        // Dados de exemplo das equipas
        const equipasExemplo = [
            {
                id: 1,
                nome: 'Equipa Construção Civil',
                encarregado_id: 1,
                membros: [
                    { id: 2, nome: 'João Silva' },
                    { id: 3, nome: 'Maria Santos' },
                    { id: 4, nome: 'Pedro Costa' },
                    { id: 5, nome: 'Ana Oliveira' }
                ]
            },
            {
                id: 2,
                nome: 'Equipa Acabamentos',
                encarregado_id: 1,
                membros: [
                    { id: 6, nome: 'Carlos Ferreira' },
                    { id: 7, nome: 'Sofia Rodrigues' }
                ]
            }
        ];

        // Dados de exemplo das obras
        const obrasExemplo = [
            {
                id: 1,
                nome: 'Edifício Residencial Centro',
                codigo: 'ERC001'
            },
            {
                id: 2,
                nome: 'Centro Comercial Norte',
                codigo: 'CCN002'
            }
        ];

        // Gerar registos de ponto exemplo para o mês atual
        const registosExemplo = gerarRegistosExemplo(equipasExemplo, obrasExemplo);

        setEquipas(equipasExemplo);
        setObras(obrasExemplo);
        setRegistosPonto(registosExemplo);
        processarDadosPartes(registosExemplo, equipasExemplo);
    };

    const gerarRegistosExemplo = (equipas, obras) => {
        const registos = [];
        const diasDoMes = getDiasDoMes(mesAno.mes, mesAno.ano);
        
        // Para cada membro de cada equipa
        equipas.forEach(equipa => {
            equipa.membros.forEach(membro => {
                // Para cada obra (simular que trabalham em diferentes obras)
                obras.forEach(obra => {
                    // Gerar alguns dias de trabalho (não todos os dias)
                    diasDoMes.forEach(dia => {
                        // 70% chance de trabalhar neste dia
                        if (Math.random() > 0.3) {
                            const dataTrabalho = new Date(mesAno.ano, mesAno.mes - 1, dia);
                            
                            // Horário de entrada (8h-9h)
                            const horaEntrada = 8 + Math.random();
                            const timestampEntrada = new Date(dataTrabalho);
                            timestampEntrada.setHours(Math.floor(horaEntrada), (horaEntrada % 1) * 60);
                            
                            // Horário de saída (16h-18h)
                            const horaSaida = 16 + Math.random() * 2;
                            const timestampSaida = new Date(dataTrabalho);
                            timestampSaida.setHours(Math.floor(horaSaida), (horaSaida % 1) * 60);
                            
                            registos.push({
                                id: registos.length + 1,
                                User: membro,
                                Obra: obra,
                                tipo: 'entrada',
                                timestamp: timestampEntrada.toISOString()
                            });
                            
                            registos.push({
                                id: registos.length + 1,
                                User: membro,
                                Obra: obra,
                                tipo: 'saida',
                                timestamp: timestampSaida.toISOString()
                            });
                        }
                    });
                });
            });
        });
        
        return registos;
    };

    const processarDadosPartes = (registos, equipasData = equipas) => {
        const diasDoMes = getDiasDoMes(mesAno.mes, mesAno.ano);
        const dadosProcessados = [];

        // Filtrar apenas registos dos membros das minhas equipas
        const membrosEquipas = equipasData.flatMap(equipa => 
            equipa.membros ? equipa.membros.map(m => m.id) : []
        );

        const registosFiltrados = registos.filter(registo => 
            membrosEquipas.includes(registo.User.id)
        );

        // Agrupar registos por usuário e obra
        const registosPorUsuarioObra = registosFiltrados.reduce((acc, registo) => {
            const key = `${registo.User.id}-${registo.Obra.id}`;
            if (!acc[key]) {
                acc[key] = {
                    user: registo.User,
                    obra: registo.Obra,
                    registos: []
                };
            }
            acc[key].registos.push(registo);
            return acc;
        }, {});

        // Para cada usuário-obra, calcular horas por dia
        Object.values(registosPorUsuarioObra).forEach(grupo => {
            const horasPorDia = calcularHorasPorDia(grupo.registos, diasDoMes);
            
            // Criar entrada base para cada usuário-obra
            dadosProcessados.push({
                id: `${grupo.user.id}-${grupo.obra.id}`,
                userId: grupo.user.id,
                userName: grupo.user.nome,
                obraId: grupo.obra.id,
                obraNome: grupo.obra.nome,
                obraCodigo: grupo.obra.codigo,
                horasPorDia,
                especialidade: 'Servente',
                categoria: 'MaoObra',
                especialidades: [], // Array para múltiplas especialidades por dia
                isOriginal: true // Marca entrada original
            });
        });

        setDadosProcessados(dadosProcessados);
    };

    const calcularHorasPorDia = (registos, diasDoMes) => {
        const horasPorDia = {};
        
        diasDoMes.forEach(dia => {
            horasPorDia[dia] = 0;
        });

        // Agrupar registos por data
        const registosPorData = registos.reduce((acc, registo) => {
            const data = new Date(registo.timestamp).toISOString().split('T')[0];
            if (!acc[data]) acc[data] = [];
            acc[data].push(registo);
            return acc;
        }, {});

        // Calcular horas trabalhadas por dia
        Object.keys(registosPorData).forEach(data => {
            const registosDia = registosPorData[data].sort((a, b) => 
                new Date(a.timestamp) - new Date(b.timestamp)
            );

            let totalHoras = 0;
            let entradas = [];
            let saidas = [];

            registosDia.forEach(registo => {
                if (registo.tipo === 'entrada') {
                    entradas.push(new Date(registo.timestamp));
                } else if (registo.tipo === 'saida') {
                    saidas.push(new Date(registo.timestamp));
                }
            });

            // Calcular tempo entre entradas e saídas
            const minLength = Math.min(entradas.length, saidas.length);
            for (let i = 0; i < minLength; i++) {
                const horas = (saidas[i] - entradas[i]) / (1000 * 60 * 60);
                totalHoras += horas;
            }

            const dia = new Date(data).getDate();
            if (horasPorDia.hasOwnProperty(dia)) {
                horasPorDia[dia] = Math.round(totalHoras * 100) / 100;
            }
        });

        return horasPorDia;
    };

    const getDiasDoMes = (mes, ano) => {
        const diasNoMes = new Date(ano, mes, 0).getDate();
        return Array.from({ length: diasNoMes }, (_, i) => i + 1);
    };

    const abrirEdicao = (trabalhador, dia) => {
        setSelectedTrabalhador(trabalhador);
        setSelectedDia(dia);
        
        // Verificar se já existem especialidades para este dia
        const especialidadesDia = trabalhador.especialidades?.filter(esp => esp.dia === dia) || [];
        
        setEditData({
            especialidade: trabalhador.especialidade || 'Servente',
            categoria: trabalhador.categoria || 'MaoObra',
            especialidadesDia: especialidadesDia.length > 0 ? especialidadesDia : [
                {
                    especialidade: trabalhador.especialidade || 'Servente',
                    categoria: trabalhador.categoria || 'MaoObra',
                    horas: trabalhador.horasPorDia[dia] || 0
                }
            ]
        });
        setEditModalVisible(true);
    };

    const adicionarEspecialidade = () => {
        const novasEspecialidades = [...(editData.especialidadesDia || [])];
        novasEspecialidades.push({
            especialidade: 'Servente',
            categoria: 'MaoObra',
            horas: 0
        });
        
        setEditData({
            ...editData,
            especialidadesDia: novasEspecialidades
        });
    };

    const removerEspecialidade = (index) => {
        if (editData.especialidadesDia.length > 1) {
            const novasEspecialidades = editData.especialidadesDia.filter((_, i) => i !== index);
            setEditData({
                ...editData,
                especialidadesDia: novasEspecialidades
            });
        }
    };

    const atualizarEspecialidade = (index, campo, valor) => {
        const novasEspecialidades = [...editData.especialidadesDia];
        novasEspecialidades[index] = {
            ...novasEspecialidades[index],
            [campo]: valor
        };
        
        setEditData({
            ...editData,
            especialidadesDia: novasEspecialidades
        });
    };

    const iniciarEdicaoHoras = (userId, obraId, dia, horasAtuais) => {
        setEditingCell(`${userId}-${obraId}-${dia}`);
        setTempHoras(horasAtuais.toString());
    };

    const cancelarEdicaoHoras = () => {
        setEditingCell(null);
        setTempHoras('');
    };

    const salvarHorasInline = (userId, obraId, dia) => {
        const novasHoras = parseFloat(tempHoras) || 0;
        
        if (novasHoras < 0 || novasHoras > 24) {
            Alert.alert('Erro', 'As horas devem estar entre 0 e 24');
            return;
        }

        const novoDados = dadosProcessados.map(item => {
            if (item.userId === userId && item.obraId === obraId) {
                return {
                    ...item,
                    horasPorDia: {
                        ...item.horasPorDia,
                        [dia]: novasHoras
                    }
                };
            }
            return item;
        });

        setDadosProcessados(novoDados);
        setEditingCell(null);
        setTempHoras('');
    };

    const salvarEdicao = () => {
        if (selectedTrabalhador && selectedDia) {
            // Validar se a soma das horas não excede o total do dia
            const totalHorasDia = selectedTrabalhador.horasPorDia[selectedDia] || 0;
            const somaHorasEspecialidades = editData.especialidadesDia.reduce((sum, esp) => sum + (parseFloat(esp.horas) || 0), 0);
            
            if (Math.abs(somaHorasEspecialidades - totalHorasDia) > 0.1 && totalHorasDia > 0) {
                Alert.alert('Erro', `A soma das horas das especialidades (${somaHorasEspecialidades}h) deve ser igual ao total trabalhado no dia (${totalHorasDia}h)`);
                return;
            }
            
            const novoDados = dadosProcessados.map(item => {
                if (item.userId === selectedTrabalhador.userId && 
                    item.obraId === selectedTrabalhador.obraId) {
                    
                    // Atualizar horas do dia se foram alteradas através das especialidades
                    const novasHorasDia = editData.especialidadesDia.reduce((sum, esp) => sum + (parseFloat(esp.horas) || 0), 0);
                    
                    // Atualizar especialidades para o dia específico
                    const especialidadesAtualizadas = item.especialidades || [];
                    const especialidadesFiltradas = especialidadesAtualizadas.filter(esp => esp.dia !== selectedDia);
                    
                    // Adicionar novas especialidades para o dia
                    editData.especialidadesDia.forEach(esp => {
                        if (esp.horas > 0) {
                            especialidadesFiltradas.push({
                                dia: selectedDia,
                                especialidade: esp.especialidade,
                                categoria: esp.categoria,
                                horas: parseFloat(esp.horas)
                            });
                        }
                    });
                    
                    return {
                        ...item,
                        horasPorDia: {
                            ...item.horasPorDia,
                            [selectedDia]: novasHorasDia
                        },
                        especialidades: especialidadesFiltradas,
                        // Manter especialidade principal como a primeira do dia ou padrão
                        especialidade: editData.especialidadesDia.length > 0 ? editData.especialidadesDia[0].especialidade : item.especialidade,
                        categoria: editData.especialidadesDia.length > 0 ? editData.especialidadesDia[0].categoria : item.categoria
                    };
                }
                return item;
            });
            
            setDadosProcessados(novoDados);
            setEditModalVisible(false);
            Alert.alert('Sucesso', 'Especialidades atualizadas com sucesso!');
        }
    };

    const criarParteDiaria = async () => {
        try {
            const partesDiarias = [];
            
            dadosProcessados.forEach(item => {
                const diasDoMes = getDiasDoMes(mesAno.mes, mesAno.ano);
                
                diasDoMes.forEach(dia => {
                    if (item.horasPorDia[dia] > 0) {
                        // Verificar se há especialidades específicas para este dia
                        const especialidadesDia = item.especialidades?.filter(esp => esp.dia === dia) || [];
                        
                        if (especialidadesDia.length > 0) {
                            // Criar uma parte diária para cada especialidade
                            especialidadesDia.forEach(esp => {
                                if (esp.horas > 0) {
                                    partesDiarias.push({
                                        categoria: esp.categoria,
                                        quantidade: esp.horas,
                                        especialidade: esp.especialidade,
                                        unidade: 'horas',
                                        designacao: `${esp.especialidade} - Trabalho em ${item.obraNome}`,
                                        data: `${mesAno.ano}-${String(mesAno.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
                                        horas: esp.horas,
                                        nome: item.userName,
                                        obra_id: item.obraId
                                    });
                                }
                            });
                        } else {
                            // Criar parte diária padrão
                            partesDiarias.push({
                                categoria: item.categoria,
                                quantidade: item.horasPorDia[dia],
                                especialidade: item.especialidade,
                                unidade: 'horas',
                                designacao: `Trabalho em ${item.obraNome}`,
                                data: `${mesAno.ano}-${String(mesAno.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
                                horas: item.horasPorDia[dia],
                                nome: item.userName,
                                obra_id: item.obraId
                            });
                        }
                    }
                });
            });

            // Simular criação das partes diárias
            console.log('Partes diárias que seriam criadas:', partesDiarias);
            
            // Simular delay de processamento
            await new Promise(resolve => setTimeout(resolve, 1500));

            Alert.alert('Sucesso (Simulação)', `${partesDiarias.length} partes diárias seriam criadas!\n\nCada especialidade será registada separadamente.\n\nQuando implementar os endpoints, esta funcionalidade enviará os dados para o backend.`);
            setModalVisible(false);
            
        } catch (error) {
            console.error('Erro ao criar partes diárias:', error);
            Alert.alert('Erro', 'Erro ao criar partes diárias');
        }
    };

    const exportarExcel = () => {
        const workbook = XLSX.utils.book_new();
        
        // Preparar dados para exportação
        const dadosExcel = [];
        const diasDoMes = getDiasDoMes(mesAno.mes, mesAno.ano);
        
        // Cabeçalho
        const cabecalho = ['Trabalhador', 'Obra', 'Código', 'Especialidade', 'Categoria', ...diasDoMes.map(d => d.toString()), 'Total'];
        dadosExcel.push(cabecalho);
        
        // Dados dos trabalhadores
        dadosProcessados.forEach(item => {
            const linha = [
                item.userName,
                item.obraNome,
                item.obraCodigo,
                item.especialidade || 'Servente',
                item.categoria || 'MaoObra',
                ...diasDoMes.map(dia => item.horasPorDia[dia] || 0),
                diasDoMes.reduce((total, dia) => total + (item.horasPorDia[dia] || 0), 0).toFixed(2)
            ];
            dadosExcel.push(linha);
        });
        
        const worksheet = XLSX.utils.aoa_to_sheet(dadosExcel);
        
        // Definir larguras das colunas
        const wscols = [
            { wch: 20 }, // Trabalhador
            { wch: 25 }, // Obra
            { wch: 10 }, // Código
            { wch: 15 }, // Especialidade
            { wch: 12 }, // Categoria
            ...diasDoMes.map(() => ({ wch: 6 })), // Dias
            { wch: 10 } // Total
        ];
        worksheet['!cols'] = wscols;
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Partes Diárias');
        
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        const fileName = `PartesDiarias_${mesAno.mes}_${mesAno.ano}.xlsx`;
        saveAs(blob, fileName);
    };

    const renderHeader = () => (
        <LinearGradient
            colors={['#1792FE', '#0B5ED7']}
            style={styles.header}
        >
            <Text style={styles.headerTitle}>Partes Diárias - Minhas Equipas</Text>
            <Text style={styles.headerSubtitle}>
                {new Date(mesAno.ano, mesAno.mes - 1).toLocaleDateString('pt-PT', { 
                    month: 'long', 
                    year: 'numeric' 
                })}
            </Text>
        </LinearGradient>
    );

    const renderControls = () => (
        <View style={styles.controlsContainer}>
            <View style={styles.monthSelector}>
                <TouchableOpacity
                    style={styles.monthButton}
                    onPress={() => {
                        const novoMes = mesAno.mes === 1 ? 12 : mesAno.mes - 1;
                        const novoAno = mesAno.mes === 1 ? mesAno.ano - 1 : mesAno.ano;
                        setMesAno({ mes: novoMes, ano: novoAno });
                    }}
                >
                    <Ionicons name="chevron-back" size={20} color="#1792FE" />
                </TouchableOpacity>
                
                <Text style={styles.monthText}>
                    {new Date(mesAno.ano, mesAno.mes - 1).toLocaleDateString('pt-PT', { 
                        month: 'long', 
                        year: 'numeric' 
                    })}
                </Text>
                
                <TouchableOpacity
                    style={styles.monthButton}
                    onPress={() => {
                        const novoMes = mesAno.mes === 12 ? 1 : mesAno.mes + 1;
                        const novoAno = mesAno.mes === 12 ? mesAno.ano + 1 : mesAno.ano;
                        setMesAno({ mes: novoMes, ano: novoAno });
                    }}
                >
                    <Ionicons name="chevron-forward" size={20} color="#1792FE" />
                </TouchableOpacity>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setModalVisible(true)}
                >
                    <LinearGradient
                        colors={['#28a745', '#20c997']}
                        style={styles.buttonGradient}
                    >
                        <FontAwesome name="save" size={16} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Gerar Partes</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={exportarExcel}
                >
                    <LinearGradient
                        colors={['#1792FE', '#0B5ED7']}
                        style={styles.buttonGradient}
                    >
                        <FontAwesome name="download" size={16} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Exportar</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderDataSheet = () => {
        if (dadosProcessados.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="calendar-blank" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>Nenhum registo encontrado para este período</Text>
                    <Text style={styles.emptySubText}>Verifique se tem equipas associadas</Text>
                </View>
            );
        }

        const diasDoMes = getDiasDoMes(mesAno.mes, mesAno.ano);

        // Agrupar dados por obra
        const dadosAgrupadosPorObra = dadosProcessados.reduce((acc, item) => {
            const obraKey = item.obraId;
            if (!acc[obraKey]) {
                acc[obraKey] = {
                    obraInfo: {
                        id: item.obraId,
                        nome: item.obraNome,
                        codigo: item.obraCodigo
                    },
                    trabalhadores: []
                };
            }
            acc[obraKey].trabalhadores.push(item);
            return acc;
        }, {});

        return (
            <View style={styles.tableWrapper}>
                <Text style={styles.tableInstructions}>
                    Toque para editar especialidades • Toque longo para editar horas diretamente
                </Text>
                <ScrollView 
                    style={styles.tableContainer}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    showsHorizontalScrollIndicator={true}
                >
                    <ScrollView 
                        horizontal 
                        style={styles.horizontalScroll}
                        showsHorizontalScrollIndicator={true}
                        nestedScrollEnabled={true}
                    >
                        <View style={styles.tableContent}>
                            {/* Cabeçalho da tabela */}
                            <View style={styles.tableHeader}>
                                <View style={[styles.tableCell, styles.fixedColumn, { width: 120 }]}>
                                    <Text style={styles.headerText}>Trabalhador</Text>
                                </View>
                                <View style={[styles.tableCell, styles.fixedColumn, { width: 100 }]}>
                                    <Text style={styles.headerText}>Especialidade</Text>
                                </View>
                                <View style={[styles.tableCell, styles.fixedColumn, { width: 80 }]}>
                                    <Text style={styles.headerText}>Categoria</Text>
                                </View>
                                {diasDoMes.map(dia => (
                                    <View key={dia} style={[styles.tableCell, { width: 50 }]}>
                                        <Text style={styles.headerText}>{dia}</Text>
                                    </View>
                                ))}
                                <View style={[styles.tableCell, { width: 70 }]}>
                                    <Text style={styles.headerText}>Total</Text>
                                </View>
                            </View>

                            {/* Renderizar dados agrupados por obra */}
                            {Object.values(dadosAgrupadosPorObra).map((obraGroup, obraIndex) => (
                                <View key={obraGroup.obraInfo.id}>
                                    {/* Cabeçalho da obra */}
                                    <View style={styles.obraHeader}>
                                        <View style={styles.obraHeaderContent}>
                                            <MaterialCommunityIcons 
                                                name="office-building" 
                                                size={20} 
                                                color="#1792FE" 
                                                style={{ marginRight: 8 }}
                                            />
                                            <Text style={styles.obraHeaderText}>
                                                {obraGroup.obraInfo.nome}
                                            </Text>
                                            <Text style={styles.obraHeaderCode}>
                                                ({obraGroup.obraInfo.codigo})
                                            </Text>
                                        </View>
                                        <View style={styles.obraStats}>
                                            <Text style={styles.obraStatsText}>
                                                {obraGroup.trabalhadores.length} trabalhador{obraGroup.trabalhadores.length !== 1 ? 'es' : ''}
                                            </Text>
                                            <Text style={styles.obraStatsText}>
                                                Total: {obraGroup.trabalhadores.reduce((total, trab) => {
                                                    return total + diasDoMes.reduce((trabTotal, dia) => 
                                                        trabTotal + (trab.horasPorDia[dia] || 0), 0
                                                    );
                                                }, 0).toFixed(1)}h
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Trabalhadores da obra */}
                                    {obraGroup.trabalhadores.map((item, trabIndex) => (
                                        <View key={`${item.userId}-${item.obraId}`} style={[
                                            styles.tableRow,
                                            trabIndex % 2 === 0 ? styles.evenRow : styles.oddRow,
                                            styles.trabalhadoresRow
                                        ]}>
                                            <View style={[styles.tableCell, { width: 120 }]}>
                                                <Text style={styles.cellText} numberOfLines={1}>
                                                    {item.userName}
                                                </Text>
                                            </View>
                                            <View style={[styles.tableCell, { width: 100 }]}>
                                                <Text style={styles.cellText} numberOfLines={1}>
                                                    {item.especialidade || 'Servente'}
                                                </Text>
                                            </View>
                                            <View style={[styles.tableCell, { width: 80 }]}>
                                                <Text style={styles.cellText} numberOfLines={1}>
                                                    {item.categoria || 'MaoObra'}
                                                </Text>
                                            </View>
                                            {diasDoMes.map(dia => {
                                                const cellKey = `${item.userId}-${item.obraId}-${dia}`;
                                                const isEditing = editingCell === cellKey;
                                                
                                                return (
                                                    <View 
                                                        key={dia} 
                                                        style={[styles.tableCell, { width: 50 }]}
                                                    >
                                                        {isEditing ? (
                                                            <View style={styles.editingContainer}>
                                                                <TextInput
                                                                    style={styles.horasInputInline}
                                                                    value={tempHoras}
                                                                    onChangeText={setTempHoras}
                                                                    keyboardType="numeric"
                                                                    autoFocus
                                                                    onBlur={() => salvarHorasInline(item.userId, item.obraId, dia)}
                                                                    onSubmitEditing={() => salvarHorasInline(item.userId, item.obraId, dia)}
                                                                />
                                                            </View>
                                                        ) : (
                                                            <TouchableOpacity
                                                                style={styles.cellTouchable}
                                                                onPress={() => abrirEdicao(item, dia)}
                                                                onLongPress={() => iniciarEdicaoHoras(item.userId, item.obraId, dia, item.horasPorDia[dia] || 0)}
                                                            >
                                                                <Text style={[
                                                                    styles.cellText,
                                                                    { textAlign: 'center' },
                                                                    item.horasPorDia[dia] > 0 && styles.hoursText,
                                                                    styles.clickableHours
                                                                ]}>
                                                                    {item.horasPorDia[dia] > 0 ? item.horasPorDia[dia].toFixed(1) : '-'}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                            <View style={[styles.tableCell, { width: 70 }]}>
                                                <Text style={[styles.cellText, styles.totalText, { textAlign: 'center' }]}>
                                                    {diasDoMes.reduce((total, dia) => 
                                                        total + (item.horasPorDia[dia] || 0), 0
                                                    ).toFixed(1)}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}

                                    {/* Separador entre obras */}
                                    {obraIndex < Object.values(dadosAgrupadosPorObra).length - 1 && (
                                        <View style={styles.obraSeparator} />
                                    )}
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </ScrollView>
            </View>
        );
    };

    const renderConfirmModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Confirmar Geração</Text>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalBody}>
                        <Text style={styles.confirmText}>
                            Pretende gerar as partes diárias para todos os trabalhadores 
                            da sua equipa baseado nos registos de ponto?
                        </Text>
                        
                        <Text style={styles.confirmSubText}>
                            Serão criadas {dadosProcessados.reduce((total, item) => {
                                const diasDoMes = getDiasDoMes(mesAno.mes, mesAno.ano);
                                return total + diasDoMes.filter(dia => item.horasPorDia[dia] > 0).length;
                            }, 0)} partes diárias.
                        </Text>

                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={[styles.confirmButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.confirmButton, styles.submitButton]}
                                onPress={criarParteDiaria}
                            >
                                <LinearGradient
                                    colors={['#28a745', '#20c997']}
                                    style={styles.buttonGradient}
                                >
                                    <FontAwesome name="save" size={16} color="#FFFFFF" />
                                    <Text style={styles.buttonText}>Confirmar</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderEditModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={editModalVisible}
            onRequestClose={() => setEditModalVisible(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Editar Especialidade</Text>
                        <TouchableOpacity
                            onPress={() => setEditModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        {selectedTrabalhador && (
                            <View style={styles.editInfo}>
                                <Text style={styles.editInfoText}>
                                    Trabalhador: {selectedTrabalhador.userName}
                                </Text>
                                <Text style={styles.editInfoText}>
                                    Obra: {selectedTrabalhador.obraNome}
                                </Text>
                                <Text style={styles.editInfoText}>
                                    Dia: {selectedDia} - Horas: {selectedTrabalhador.horasPorDia[selectedDia] || 0}h
                                </Text>
                                <Text style={styles.editInfoSubText}>
                                    {selectedTrabalhador.horasPorDia[selectedDia] > 0 
                                        ? 'Baseado em registo de ponto' 
                                        : 'Adição manual de horas'
                                    }
                                </Text>
                            </View>
                        )}

                        <View style={styles.especialidadesContainer}>
                            <View style={styles.especialidadesHeader}>
                                <Text style={styles.inputLabel}>Especialidades do Dia</Text>
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={adicionarEspecialidade}
                                >
                                    <Ionicons name="add-circle" size={24} color="#28a745" />
                                    <Text style={styles.addButtonText}>Adicionar</Text>
                                </TouchableOpacity>
                            </View>

                            {editData.especialidadesDia?.map((espItem, index) => (
                                <View key={index} style={styles.especialidadeItem}>
                                    <View style={styles.especialidadeHeader}>
                                        <Text style={styles.especialidadeTitle}>Especialidade {index + 1}</Text>
                                        {editData.especialidadesDia.length > 1 && (
                                            <TouchableOpacity
                                                style={styles.removeButton}
                                                onPress={() => removerEspecialidade(index)}
                                            >
                                                <Ionicons name="trash" size={20} color="#dc3545" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <View style={styles.inputRow}>
                                        <View style={styles.inputHalf}>
                                            <Text style={styles.inputLabelSmall}>Horas</Text>
                                            <TextInput
                                                style={styles.horasInput}
                                                value={espItem.horas?.toString() || ''}
                                                onChangeText={(value) => atualizarEspecialidade(index, 'horas', parseFloat(value) || 0)}
                                                keyboardType="numeric"
                                                placeholder="0.0"
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabelSmall}>Especialidade</Text>
                                        <View style={styles.pickerContainer}>
                                            {especialidades.map((esp, espIndex) => (
                                                <TouchableOpacity
                                                    key={espIndex}
                                                    style={[
                                                        styles.pickerOptionSmall,
                                                        espItem.especialidade === esp && styles.pickerOptionSelected
                                                    ]}
                                                    onPress={() => atualizarEspecialidade(index, 'especialidade', esp)}
                                                >
                                                    <Text style={[
                                                        styles.pickerOptionTextSmall,
                                                        espItem.especialidade === esp && styles.pickerOptionTextSelected
                                                    ]}>
                                                        {esp}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabelSmall}>Categoria</Text>
                                        <View style={styles.pickerContainer}>
                                            {categorias.map((cat, catIndex) => (
                                                <TouchableOpacity
                                                    key={catIndex}
                                                    style={[
                                                        styles.pickerOptionSmall,
                                                        espItem.categoria === cat.value && styles.pickerOptionSelected
                                                    ]}
                                                    onPress={() => atualizarEspecialidade(index, 'categoria', cat.value)}
                                                >
                                                    <Text style={[
                                                        styles.pickerOptionTextSmall,
                                                        espItem.categoria === cat.value && styles.pickerOptionTextSelected
                                                    ]}>
                                                        {cat.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            ))}

                            <View style={styles.totalHoras}>
                                <Text style={styles.totalHorasText}>
                                    Total: {editData.especialidadesDia?.reduce((sum, esp) => sum + (parseFloat(esp.horas) || 0), 0).toFixed(1)}h 
                                    / {selectedTrabalhador?.horasPorDia[selectedDia]}h trabalhadas
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={salvarEdicao}
                        >
                            <LinearGradient
                                colors={['#28a745', '#20c997']}
                                style={styles.buttonGradient}
                            >
                                <FontAwesome name="save" size={16} color="#FFFFFF" />
                                <Text style={styles.buttonText}>Guardar</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1792FE" />
                <Text style={styles.loadingText}>A carregar partes diárias...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {renderHeader()}
            {renderControls()}
            {renderDataSheet()}
            {renderConfirmModal()}
            {renderEditModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
    },
    controlsContainer: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        marginHorizontal: 10,
        marginVertical: 10,
        borderRadius: 10,
        elevation: 2,
    },
    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    monthButton: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    monthText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginHorizontal: 20,
        textTransform: 'capitalize',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    actionButton: {
        borderRadius: 8,
        overflow: 'hidden',
        flex: 1,
        marginHorizontal: 5,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    tableContainer: {
        flex: 1,
        margin: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        elevation: 2,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1792FE',
        minHeight: 50,
    },
    tableRow: {
        flexDirection: 'row',
        minHeight: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    evenRow: {
        backgroundColor: '#FFFFFF',
    },
    oddRow: {
        backgroundColor: '#f9f9f9',
    },
    tableCell: {
        padding: 10,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#e0e0e0',
    },
    fixedColumn: {
        backgroundColor: '#f5f5f5',
    },
    headerText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    cellText: {
        fontSize: 12,
        color: '#333',
    },
    cellSubText: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
    hoursText: {
        fontWeight: '600',
        color: '#1792FE',
    },
    clickableHours: {
        textDecorationLine: 'underline',
    },
    totalText: {
        fontWeight: 'bold',
        color: '#333',
        fontSize: 13,
    },
    tableWrapper: {
        flex: 1,
        margin: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        elevation: 2,
    },
    tableInstructions: {
        fontSize: 12,
        color: '#666',
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    horizontalScroll: {
        flex: 1,
    },
    tableContent: {
        minWidth: '100%',
    },
    cellTouchable: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 40,
    },
    editingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e3f2fd',
        borderRadius: 4,
        margin: 2,
    },
    horasInputInline: {
        width: 40,
        height: 30,
        borderWidth: 1,
        borderColor: '#1792FE',
        borderRadius: 4,
        padding: 2,
        fontSize: 12,
        textAlign: 'center',
        backgroundColor: '#fff',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginTop: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#1792FE',
        marginTop: 10,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        width: '90%',
        maxHeight: '80%',
        borderRadius: 15,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 5,
    },
    modalBody: {
        padding: 20,
    },
    confirmText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginBottom: 15,
    },
    confirmSubText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    confirmButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    confirmButton: {
        flex: 1,
        marginHorizontal: 5,
        borderRadius: 8,
        overflow: 'hidden',
    },
    cancelButton: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    submitButton: {
        marginTop: 20,
        borderRadius: 8,
        overflow: 'hidden',
    },
    editInfo: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    editInfoText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 5,
    },
    editInfoSubText: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 5,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pickerOption: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginBottom: 8,
    },
    pickerOptionSelected: {
        backgroundColor: '#1792FE',
    },
    pickerOptionText: {
        fontSize: 14,
        color: '#666',
    },
    pickerOptionTextSelected: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    especialidadesContainer: {
        marginBottom: 20,
    },
    especialidadesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addButtonText: {
        color: '#28a745',
        fontWeight: '600',
        marginLeft: 5,
    },
    especialidadeItem: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    especialidadeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    especialidadeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    removeButton: {
        padding: 5,
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    inputHalf: {
        flex: 0.48,
    },
    inputLabelSmall: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    horasInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    pickerOptionSmall: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 15,
        backgroundColor: '#f0f0f0',
        marginBottom: 6,
        marginRight: 6,
    },
    pickerOptionTextSmall: {
        fontSize: 12,
        color: '#666',
    },
    totalHoras: {
        backgroundColor: '#e8f4f8',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#1792FE',
    },
    totalHorasText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1792FE',
        textAlign: 'center',
    },
    obraHeader: {
        backgroundColor: '#f0f8ff',
        borderBottomWidth: 2,
        borderBottomColor: '#1792FE',
        borderTopWidth: 2,
        borderTopColor: '#1792FE',
        paddingVertical: 12,
        paddingHorizontal: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    obraHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    obraHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1792FE',
        marginRight: 8,
    },
    obraHeaderCode: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    obraStats: {
        alignItems: 'flex-end',
    },
    obraStatsText: {
        fontSize: 12,
        color: '#1792FE',
        fontWeight: '600',
        marginBottom: 2,
    },
    trabalhadoresRow: {
        marginLeft: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#e3f2fd',
    },
    obraSeparator: {
        height: 15,
        backgroundColor: '#f5f5f5',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        marginVertical: 5,
    },
});

export default PartesDiarias;
