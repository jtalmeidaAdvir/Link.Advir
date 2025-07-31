
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// Cache para armazenar dados e evitar requisições desnecessárias
const dataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const PartesDiarias = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
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
    const [especialidades, setEspecialidades] = useState([]);
    const carregarEspecialidades = useCallback(async () => {
  const painelToken = await AsyncStorage.getItem('painelAdminToken');
  const urlempresa = await AsyncStorage.getItem('urlempresa');

  try {
    const res = await fetch(
      'https://webapiprimavera.advir.pt/routesFaltas/GetListaEspecialidades',
      {
        headers: {
          Authorization: `Bearer ${painelToken}`,
          urlempresa,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!res.ok) throw new Error('Erro ao obter especialidades');

    const data = await res.json();

    // Extrai o array real
    const table = data?.DataSet?.Table;
    if (!Array.isArray(table)) {
      console.warn('Formato inesperado de especialidades:', data);
      setEspecialidades([]);
      return;
    }

    // Mapeia para o shape que queres usar no picker
    const especialidadesFormatadas = table.map(item => ({
      codigo: item.SubEmp,        // ou item.SubEmpId, conforme prefiras
      descricao: item.Descricao
    }));

    setEspecialidades(especialidadesFormatadas);
  } catch (err) {
    console.error('Erro ao carregar especialidades:', err);
    Alert.alert('Erro', 'Não foi possível carregar as especialidades');
  }
}, []);


    useEffect(() => {
    carregarEspecialidades();
    }, []);


    const categorias = [
        { label: 'Mão de Obra', value: 'MaoObra' },
        { label: 'Equipamentos', value: 'Equipamentos' }
    ];
    

    const [modoVisualizacao, setModoVisualizacao] = useState('obra');


    // Função para converter minutos para formato H:MM
    const formatarHorasMinutos = useCallback((minutos) => {
        if (minutos === 0) return '-';
        
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        
        if (horas === 0) {
            return `${mins}m`;
        } else if (mins === 0) {
            return `${horas}h`;
        } else {
            return `${horas}h${mins.toString().padStart(2, '0')}`;
        }
    }, []);

    // State para armazenar horas originais (do ponto)
    const [horasOriginais, setHorasOriginais] = useState(new Map());

    // Memoizar dias do mês para evitar recálculos
    const diasDoMes = useMemo(() => {
        const diasNoMes = new Date(mesAno.ano, mesAno.mes, 0).getDate();
        return Array.from({ length: diasNoMes }, (_, i) => i + 1);
    }, [mesAno.mes, mesAno.ano]);

    // Função para calcular e formatar variação de horas
    const calcularVariacao = useCallback((item) => {
        const chaveOriginal = `${item.userId}-${item.obraId}`;
        const horasOriginaisItem = horasOriginais.get(chaveOriginal);
        
        if (!horasOriginaisItem) return { texto: '', cor: '#666' };

        const totalAtual = diasDoMes.reduce((total, dia) => total + (item.horasPorDia[dia] || 0), 0);
        const totalOriginal = diasDoMes.reduce((total, dia) => total + (horasOriginaisItem[dia] || 0), 0);
        const diferenca = totalAtual - totalOriginal;

        if (diferenca === 0) {
            return { texto: '', cor: '#666' };
        } else if (diferenca > 0) {
            return { 
                texto: `+${formatarHorasMinutos(diferenca)}`, 
                cor: '#28a745',
                icon: '↗️'
            };
        } else {
            return { 
                texto: `${formatarHorasMinutos(diferenca)}`, 
                cor: '#dc3545',
                icon: '↘️'
            };
        }
    }, [horasOriginais, diasDoMes, formatarHorasMinutos]);

    // Cache key baseado no mês/ano
    const cacheKey = useMemo(() => `partes-diarias-${mesAno.mes}-${mesAno.ano}`, [mesAno]);

    useEffect(() => {
        carregarDados();
    }, [mesAno]);

    // Função para verificar se o cache é válido
    const isCacheValid = useCallback((key) => {
        const cached = dataCache.get(key);
        if (!cached) return false;
        return (Date.now() - cached.timestamp) < CACHE_DURATION;
    }, []);

    // Função para obter dados do cache
    const getCachedData = useCallback((key) => {
        if (isCacheValid(key)) {
            return dataCache.get(key).data;
        }
        return null;
    }, [isCacheValid]);

    // Função para armazenar dados no cache
    const setCachedData = useCallback((key, data) => {
        dataCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }, []);

    const carregarDados = async () => {
        setLoading(true);
        setLoadingProgress(0);
        
        try {
            // Verificar cache primeiro
            const cachedData = getCachedData(cacheKey);
            if (cachedData) {
                console.log('Carregando dados do cache...');
                setEquipas(cachedData.equipas);
                setObras(cachedData.obras);
                setRegistosPonto(cachedData.registos);
                processarDadosPartes(cachedData.registos, cachedData.equipas);
                setLoading(false);
                return;
            }

            await carregarDadosReais();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            Alert.alert('Erro', 'Erro ao carregar os dados necessários');
        } finally {
            setLoading(false);
        }
    };

    const carregarDadosReais = async () => {
        const token = await AsyncStorage.getItem('loginToken');
        if (!token) {
            Alert.alert('Erro', 'Token de autenticação não encontrado');
            return;
        }

        try {
            setLoadingProgress(10);
            
            // 1. Buscar minhas equipas primeiro
            console.log('Carregando equipas...');
            const equipasResponse = await fetch('https://backend.advir.pt/api/equipa-obra/minhas-agrupadas', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!equipasResponse.ok) {
                throw new Error('Erro ao carregar equipas');
            }

            const equipasData = await equipasResponse.json();
            setLoadingProgress(20);
            
            // Transformar dados para o formato esperado
            const equipasFormatadas = equipasData.map((equipa, index) => ({
                id: index + 1,
                nome: equipa.nome,
                encarregado_id: 1,
                membros: equipa.membros || []
            }));

            setEquipas(equipasFormatadas);
            setLoadingProgress(30);

            // 2. Coletar todos os IDs dos membros
            const membrosIds = [];
            equipasFormatadas.forEach(equipa => {
                if (equipa.membros) {
                    equipa.membros.forEach(membro => {
                        if (membro && membro.id) {
                            membrosIds.push(membro.id);
                        }
                    });
                }
            });

            console.log('IDs dos membros encontrados:', membrosIds);
            setLoadingProgress(40);

            if (membrosIds.length === 0) {
                console.log('Nenhum membro encontrado nas equipas');
                setObras([]);
                setRegistosPonto([]);
                processarDadosPartes([], equipasFormatadas);
                return;
            }

            // 3. Carregar registos de forma otimizada com requisições paralelas
            const todosRegistos = [];
            const obrasUnicas = new Map();
            
            console.log('Carregando registos de ponto...');
            
            // Criar chunks de requisições para não sobrecarregar o servidor
            const CHUNK_SIZE = 5; // Processar 5 membros por vez
            const CONCURRENT_DAYS = 7; // Processar 7 dias por vez

            for (let i = 0; i < membrosIds.length; i += CHUNK_SIZE) {
                const membrosChunk = membrosIds.slice(i, i + CHUNK_SIZE);
                
                // Para cada chunk de membros, processar dias em paralelo
                for (let j = 0; j < diasDoMes.length; j += CONCURRENT_DAYS) {
                    const diasChunk = diasDoMes.slice(j, j + CONCURRENT_DAYS);
                    
                    const promises = [];
                    
                    membrosChunk.forEach(membroId => {
                        diasChunk.forEach(dia => {
                            const dataFormatada = `${mesAno.ano}-${String(mesAno.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                            
                            const promise = fetch(
                                `https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-e-dia?user_id=${membroId}&data=${dataFormatada}`,
                                {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                }
                            ).then(async response => {
                                if (response.ok) {
                                    const registosDia = await response.json();
                                    return { membroId, dia, registos: registosDia };
                                }
                                return { membroId, dia, registos: [] };
                            }).catch(error => {
                                console.log(`Erro ao buscar registos para membro ${membroId} no dia ${dataFormatada}:`, error);
                                return { membroId, dia, registos: [] };
                            });
                            
                            promises.push(promise);
                        });
                    });
                    
                    // Aguardar todas as requisições do chunk
                    const results = await Promise.all(promises);
                    
                    // Processar resultados
                    results.forEach(({ registos }) => {
                        registos.forEach(registo => {
                            if (registo && registo.User && registo.Obra) {
                                todosRegistos.push(registo);
                                
                                // Coletar obras únicas
                                if (!obrasUnicas.has(registo.Obra.id)) {
                                    obrasUnicas.set(registo.Obra.id, {
                                        id: registo.Obra.id,
                                        nome: registo.Obra.nome || 'Obra sem nome',
                                        codigo: `OBR${String(registo.Obra.id).padStart(3, '0')}`
                                    });
                                }
                            }
                        });
                    });
                    
                    // Atualizar progresso
                    const progressIncrement = 50 / (membrosIds.length * diasDoMes.length / (CHUNK_SIZE * CONCURRENT_DAYS));
                    setLoadingProgress(prev => Math.min(90, prev + progressIncrement));
                }
            }

            const obrasArray = Array.from(obrasUnicas.values());
            console.log('Registos encontrados:', todosRegistos.length);
            console.log('Obras encontradas:', obrasArray.length);

            setLoadingProgress(95);

            setObras(obrasArray);
            setRegistosPonto(todosRegistos);
            
            // Armazenar no cache
            setCachedData(cacheKey, {
                equipas: equipasFormatadas,
                obras: obrasArray,
                registos: todosRegistos
            });

            setLoadingProgress(100);
            processarDadosPartes(todosRegistos, equipasFormatadas);

        } catch (error) {
            console.error('Erro ao carregar dados reais:', error);
            Alert.alert('Erro', 'Erro ao carregar dados do servidor: ' + error.message);
        }
    };

    // Memoizar processamento de dados para evitar recálculos desnecessários
    const processarDadosPartes = useCallback((registos, equipasData = equipas) => {
        const dadosProcessados = [];
        const novasHorasOriginais = new Map();

        // Filtrar apenas registos dos membros das minhas equipas
        const membrosEquipas = equipasData.flatMap(equipa => 
            equipa.membros ? equipa.membros.map(m => m.id) : []
        );

        const registosFiltrados = registos.filter(registo => 
            registo && registo.User && registo.Obra && membrosEquipas.includes(registo.User.id)
        );

        // Agrupar registos por usuário e obra usando Map para melhor performance
        const registosPorUsuarioObra = new Map();
        
        registosFiltrados.forEach(registo => {
            if (!registo || !registo.User || !registo.Obra) {
                console.warn('Registo inválido encontrado:', registo);
                return;
            }

            const key = `${registo.User.id}-${registo.Obra.id}`;
            if (!registosPorUsuarioObra.has(key)) {
                registosPorUsuarioObra.set(key, {
                    user: registo.User,
                    obra: {
                        id: registo.Obra.id,
                        nome: registo.Obra.nome || 'Obra sem nome',
                        codigo: `OBR${String(registo.Obra.id).padStart(3, '0')}`
                    },
                    registos: []
                });
            }
            registosPorUsuarioObra.get(key).registos.push(registo);
        });

        // Para cada usuário-obra, calcular horas por dia
        registosPorUsuarioObra.forEach(grupo => {
            const horasPorDia = calcularHorasPorDia(grupo.registos, diasDoMes);
            
            // Armazenar horas originais para comparação
            const chaveOriginal = `${grupo.user.id}-${grupo.obra.id}`;
            novasHorasOriginais.set(chaveOriginal, {...horasPorDia});
            
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
                especialidades: [],
                isOriginal: true
            });
        });

        setHorasOriginais(novasHorasOriginais);
        setDadosProcessados(dadosProcessados);
    }, [diasDoMes, equipas]);

    // Memoizar cálculo de horas para melhor performance
    const calcularHorasPorDia = useCallback((registos, diasDoMes) => {
        const horasPorDia = {};
        
        // Inicializar todos os dias com 0
        diasDoMes.forEach(dia => {
            horasPorDia[dia] = 0;
        });

        // Agrupar registos por data apenas (não por obra, pois queremos somar por dia)
        const registosPorData = new Map();
        
        registos.forEach(registo => {
            const data = new Date(registo.timestamp).toISOString().split('T')[0];
            
            if (!registosPorData.has(data)) {
                registosPorData.set(data, []);
            }
            registosPorData.get(data).push(registo);
        });

        // Calcular horas trabalhadas por data
        registosPorData.forEach((registosDia, data) => {
            // Ordenar registos por timestamp
            registosDia.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            let totalMinutosDia = 0;
            let ultimaEntrada = null;

            // Processar registos sequencialmente
            for (let i = 0; i < registosDia.length; i++) {
                const registo = registosDia[i];
                
                if (registo.tipo === 'entrada') {
                    // Nova entrada - guarda o timestamp
                    ultimaEntrada = new Date(registo.timestamp);
                } else if (registo.tipo === 'saida' && ultimaEntrada) {
                    // Saída - calcula tempo desde a última entrada em minutos
                    const saida = new Date(registo.timestamp);
                    const minutos = (saida - ultimaEntrada) / (1000 * 60);
                    totalMinutosDia += Math.max(0, minutos);
                    ultimaEntrada = null; // Reset para próxima sessão
                }
            }

            // Se há uma entrada sem saída correspondente no final do dia
            if (ultimaEntrada) {
                const fimDia = new Date(ultimaEntrada);
                fimDia.setHours(18, 0, 0, 0);
                
                if (ultimaEntrada < fimDia) {
                    const minutos = (fimDia - ultimaEntrada) / (1000 * 60);
                    totalMinutosDia += Math.max(0, minutos);
                }
            }

            // Atribuir as horas ao dia correto (manter em minutos para preservar precisão)
            const dia = new Date(data).getDate();
            if (horasPorDia.hasOwnProperty(dia)) {
                // Arredondar para o minuto mais próximo
                horasPorDia[dia] = Math.round(totalMinutosDia);
            }
        });

        return horasPorDia;
    }, []);

    const abrirEdicao = useCallback((trabalhador, dia) => {
        setSelectedTrabalhador(trabalhador);
        setSelectedDia(dia);
        
        const especialidadesDia = trabalhador.especialidades?.filter(esp => esp.dia === dia) || [];
        
        setEditData({
            especialidade: trabalhador.especialidade || 'Servente',
            categoria: trabalhador.categoria || 'MaoObra',
            especialidadesDia: especialidadesDia.length > 0 ? especialidadesDia : [
                {
                    especialidade: trabalhador.especialidade || 'Servente',
                    categoria: trabalhador.categoria || 'MaoObra',
                    horas: (trabalhador.horasPorDia[dia] || 0) / 60 // Converter minutos para horas decimais
                }
            ]
        });
        setEditModalVisible(true);
    }, []);

    const adicionarEspecialidade = useCallback(() => {
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
    }, [editData]);

    const removerEspecialidade = useCallback((index) => {
        if (editData.especialidadesDia.length > 1) {
            const novasEspecialidades = editData.especialidadesDia.filter((_, i) => i !== index);
            setEditData({
                ...editData,
                especialidadesDia: novasEspecialidades
            });
        }
    }, [editData]);

    const atualizarEspecialidade = useCallback((index, campo, valor) => {
        const novasEspecialidades = [...editData.especialidadesDia];
        novasEspecialidades[index] = {
            ...novasEspecialidades[index],
            [campo]: valor
        };
        
        setEditData({
            ...editData,
            especialidadesDia: novasEspecialidades
        });
    }, [editData]);

    const iniciarEdicaoHoras = useCallback((userId, obraId, dia, minutosAtuais) => {
        setEditingCell(`${userId}-${obraId}-${dia}`);
        // Converter minutos para formato H:MM para edição
        const horas = Math.floor(minutosAtuais / 60);
        const mins = minutosAtuais % 60;
        setTempHoras(horas > 0 || mins > 0 ? `${horas}:${mins.toString().padStart(2, '0')}` : '0:00');
    }, []);

    const cancelarEdicaoHoras = useCallback(() => {
        setEditingCell(null);
        setTempHoras('');
    }, []);

    const salvarHorasInline = useCallback((userId, obraId, dia) => {
        // Converter formato H:MM para minutos
        let novosMinutos = 0;
        
        if (tempHoras.includes(':')) {
            const [horas, mins] = tempHoras.split(':').map(num => parseInt(num) || 0);
            novosMinutos = (horas * 60) + mins;
        } else {
            // Se foi inserido apenas um número, assumir que são horas
            const horas = parseFloat(tempHoras) || 0;
            novosMinutos = Math.round(horas * 60);
        }
        
        if (novosMinutos < 0 || novosMinutos > (24 * 60)) {
            Alert.alert('Erro', 'As horas devem estar entre 0 e 24');
            return;
        }

        const novoDados = dadosProcessados.map(item => {
            if (item.userId === userId && item.obraId === obraId) {
                return {
                    ...item,
                    horasPorDia: {
                        ...item.horasPorDia,
                        [dia]: novosMinutos
                    }
                };
            }
            return item;
        });

        setDadosProcessados(novoDados);
        setEditingCell(null);
        setTempHoras('');
    }, [tempHoras, dadosProcessados]);

    const salvarEdicao = useCallback(() => {
        if (selectedTrabalhador && selectedDia) {
            const totalMinutosDia = selectedTrabalhador.horasPorDia[selectedDia] || 0;
            const somaMinutosEspecialidades = editData.especialidadesDia.reduce((sum, esp) => {
                const horas = parseFloat(esp.horas) || 0;
                return sum + Math.round(horas * 60);
            }, 0);
            
            if (Math.abs(somaMinutosEspecialidades - totalMinutosDia) > 5 && totalMinutosDia > 0) {
                Alert.alert('Erro', `A soma das horas das especialidades (${formatarHorasMinutos(somaMinutosEspecialidades)}) deve ser igual ao total trabalhado no dia (${formatarHorasMinutos(totalMinutosDia)})`);
                return;
            }
            
            const novoDados = dadosProcessados.map(item => {
                if (item.userId === selectedTrabalhador.userId && 
                    item.obraId === selectedTrabalhador.obraId) {
                    
                    const novasHorasDia = editData.especialidadesDia.reduce((sum, esp) => sum + (parseFloat(esp.horas) || 0), 0);
                    
                    const especialidadesAtualizadas = item.especialidades || [];
                    const especialidadesFiltradas = especialidadesAtualizadas.filter(esp => esp.dia !== selectedDia);
                    
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
    }, [selectedTrabalhador, selectedDia, editData, dadosProcessados]);

    const criarParteDiaria = async () => {
        try {
            const partesDiarias = [];
            
            dadosProcessados.forEach(item => {
                diasDoMes.forEach(dia => {
                    if (item.horasPorDia[dia] > 0) {
                        const especialidadesDia = item.especialidades?.filter(esp => esp.dia === dia) || [];
                        
                        if (especialidadesDia.length > 0) {
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

            console.log('Partes diárias que seriam criadas:', partesDiarias);
            
            await new Promise(resolve => setTimeout(resolve, 1500));

            Alert.alert('Sucesso (Simulação)', `${partesDiarias.length} partes diárias seriam criadas!\n\nCada especialidade será registada separadamente.\n\nQuando implementar os endpoints, esta funcionalidade enviará os dados para o backend.`);
            setModalVisible(false);
            
        } catch (error) {
            console.error('Erro ao criar partes diárias:', error);
            Alert.alert('Erro', 'Erro ao criar partes diárias');
        }
    };

    const exportarExcel = useCallback(() => {
        const workbook = XLSX.utils.book_new();
        
        const dadosExcel = [];
        
        const cabecalho = ['Trabalhador', 'Obra', 'Código', 'Especialidade', 'Categoria', ...diasDoMes.map(d => d.toString()), 'Total'];
        dadosExcel.push(cabecalho);
        
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
        
        const wscols = [
            { wch: 20 },
            { wch: 25 },
            { wch: 10 },
            { wch: 15 },
            { wch: 12 },
            ...diasDoMes.map(() => ({ wch: 6 })),
            { wch: 10 }
        ];
        worksheet['!cols'] = wscols;
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Partes Diárias');
        
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        const fileName = `PartesDiarias_${mesAno.mes}_${mesAno.ano}.xlsx`;
        saveAs(blob, fileName);
    }, [dadosProcessados, diasDoMes, mesAno]);

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
                <TouchableOpacity
    style={styles.actionButton}
    onPress={() => setModoVisualizacao(prev => prev === 'obra' ? 'user' : 'obra')}
>
    <LinearGradient
        colors={['#6f42c1', '#6610f2']}
        style={styles.buttonGradient}
    >
        <FontAwesome name="exchange" size={16} color="#FFFFFF" />
        <Text style={styles.buttonText}>
            {modoVisualizacao === 'obra' ? 'Vista por Utilizador' : 'Vista por Obra'}
        </Text>
    </LinearGradient>
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
                        <Text style={styles.buttonText}>Enviar Partes</Text>
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

    // Memoizar dados agrupados por obra para evitar recálculos
    const dadosAgrupadosPorObra = useMemo(() => {
        return dadosProcessados.reduce((acc, item) => {
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
    }, [dadosProcessados]);

    const dadosAgrupadosPorUser = useMemo(() => {
    return dadosProcessados.reduce((acc, item) => {
        const userKey = item.userId;
        if (!acc[userKey]) {
            acc[userKey] = {
                userInfo: {
                    id: item.userId,
                    nome: item.userName
                },
                obras: []
            };
        }
        acc[userKey].obras.push(item);
        return acc;
    }, {});
}, [dadosProcessados]);


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
if (modoVisualizacao === 'obra') {
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
                                                Total: {formatarHorasMinutos(obraGroup.trabalhadores.reduce((total, trab) => {
                                                    return total + diasDoMes.reduce((trabTotal, dia) => 
                                                        trabTotal + (trab.horasPorDia[dia] || 0), 0
                                                    );
                                                }, 0))}
                                            </Text>
                                            {(() => {
                                                const variacaoTotalObra = obraGroup.trabalhadores.reduce((totalVariacao, trab) => {
                                                    const variacao = calcularVariacao(trab);
                                                    if (variacao.texto) {
                                                        // Extrair o valor numérico da variação (remover + ou -)
                                                        const valor = variacao.texto.replace('+', '').replace('-', '');
                                                        const minutos = valor.includes('h') 
                                                            ? (parseInt(valor.split('h')[0]) * 60) + (parseInt(valor.split('h')[1]?.replace('m', '') || '0'))
                                                            : parseInt(valor.replace('m', '') || '0');
                                                        return totalVariacao + (variacao.texto.startsWith('-') ? -minutos : minutos);
                                                    }
                                                    return totalVariacao;
                                                }, 0);
                                                
                                                if (variacaoTotalObra !== 0) {
                                                    return (
                                                        <Text style={[
                                                            styles.obraStatsText, 
                                                            { color: variacaoTotalObra > 0 ? '#28a745' : '#dc3545' }
                                                        ]}>
                                                            Variação: {variacaoTotalObra > 0 ? '+' : ''}{formatarHorasMinutos(Math.abs(variacaoTotalObra))}
                                                        </Text>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </View>
                                    </View>

                                    {/* Cabeçalho dos dias para esta obra */}
                                    <View style={styles.obraDaysHeader}>
                                        <View style={[styles.tableCell, { width: 120 }]}>
                                            <Text style={styles.obraDaysHeaderText}>Trabalhador</Text>
                                        </View>
                                        
                                        {diasDoMes.map(dia => (
                                            <View key={dia} style={[styles.tableCell, { width: 50 }]}>
                                                <Text style={styles.obraDaysHeaderText}>{dia}</Text>
                                            </View>
                                        ))}
                                        <View style={[styles.tableCell, { width: 70 }]}>
                                            <Text style={styles.obraDaysHeaderText}>Total</Text>
                                        </View>
                                        <View style={[styles.tableCell, { width: 80 }]}>
                                            <Text style={styles.obraDaysHeaderText}>Variação</Text>
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
                                                                    {formatarHorasMinutos(item.horasPorDia[dia] || 0)}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                            <View style={[styles.tableCell, { width: 70 }]}>
                                                <Text style={[styles.cellText, styles.totalText, { textAlign: 'center' }]}>
                                                    {formatarHorasMinutos(diasDoMes.reduce((total, dia) => 
                                                        total + (item.horasPorDia[dia] || 0), 0
                                                    ))}
                                                </Text>
                                            </View>
                                            <View style={[styles.tableCell, { width: 80 }]}>
                                                <Text style={[
                                                    styles.cellText, 
                                                    styles.variacaoText,
                                                    { textAlign: 'center', color: calcularVariacao(item).cor, fontWeight: '600' }
                                                ]}>
                                                    {calcularVariacao(item).texto}
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

    }else {
    return (
        // Vista por utilizador
        <ScrollView style={styles.tableContainer}>
            <ScrollView horizontal style={styles.horizontalScroll}>
                <View style={styles.tableContent}>
                    {Object.values(dadosAgrupadosPorUser).map((userGroup, userIndex) => (
                        <View key={userGroup.userInfo.id}>
                            <View style={styles.obraHeader}>
                                <Text style={styles.obraHeaderText}>
                                    {userGroup.userInfo.nome}
                                </Text>
                            </View>

                            <View style={styles.obraDaysHeader}>
                                <View style={[styles.tableCell, { width: 120 }]}>
                                    <Text style={styles.obraDaysHeaderText}>Obra</Text>
                                </View>
                                {diasDoMes.map(dia => (
                                    <View key={dia} style={[styles.tableCell, { width: 50 }]}>
                                        <Text style={styles.obraDaysHeaderText}>{dia}</Text>
                                    </View>
                                ))}
                                <View style={[styles.tableCell, { width: 70 }]}>
                                    <Text style={styles.obraDaysHeaderText}>Total</Text>
                                </View>
                            </View>

                            {userGroup.obras.map((item, obraIndex) => (
                                <View key={`${item.userId}-${item.obraId}`} style={[
                                    styles.tableRow,
                                    obraIndex % 2 === 0 ? styles.evenRow : styles.oddRow,
                                    styles.trabalhadoresRow
                                ]}>
                                    <View style={[styles.tableCell, { width: 120 }]}>
                                        <Text style={styles.cellText}>
                                            {item.obraNome}
                                        </Text>
                                    </View>
                                    {diasDoMes.map(dia => {
    const cellKey = `${item.userId}-${item.obraId}-${dia}`;
    const isEditing = editingCell === cellKey;

    return (
        <View key={dia} style={[styles.tableCell, { width: 50 }]}>
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
                        {formatarHorasMinutos(item.horasPorDia[dia] || 0)}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
})}

                                    <View style={[styles.tableCell, { width: 70 }]}>
                                        <Text style={[styles.cellText, styles.totalText, { textAlign: 'center' }]}>
                                            {formatarHorasMinutos(diasDoMes.reduce((total, dia) =>
                                                total + (item.horasPorDia[dia] || 0), 0
                                            ))}
                                        </Text>
                                    </View>
                                    
                                </View>
                            ))}
                            {/* Linha de total por dia para este utilizador */}
<View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
  <View style={[styles.tableCell, { width: 120 }]}>
    <Text style={[styles.cellText, { fontWeight: 'bold', color: '#000' }]}>
      Total
    </Text>
  </View>

  {diasDoMes.map(dia => {
    const totalMinutosDia = userGroup.obras.reduce((acc, obraItem) => {
      return acc + (obraItem.horasPorDia[dia] || 0);
    }, 0);

    return (
      <View key={`total-${userGroup.userInfo.id}-${dia}`} style={[styles.tableCell, { width: 50 }]}>
        <Text style={[styles.cellText, { fontWeight: '600', color: '#333', textAlign: 'center' }]}>
          {formatarHorasMinutos(totalMinutosDia)}
        </Text>
      </View>
    );
  })}

  <View style={[styles.tableCell, { width: 70 }]}>
    <Text style={[styles.cellText, { fontWeight: '700', textAlign: 'center', color: '#1792FE' }]}>
      {formatarHorasMinutos(
        diasDoMes.reduce((acc, dia) => {
          return acc + userGroup.obras.reduce((accObra, item) => accObra + (item.horasPorDia[dia] || 0), 0);
        }, 0)
      )}
    </Text>
  </View>
</View>

                        </View>
                    ))}
                </View>
            </ScrollView>
        </ScrollView>
    );
};
}

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
                                    Dia: {selectedDia} - Horas: {formatarHorasMinutos(selectedTrabalhador.horasPorDia[selectedDia] || 0)}
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
                                                value={(() => {
                                                    const totalMinutos = Math.round((espItem.horas || 0) * 60);
                                                    const horas = Math.floor(totalMinutos / 60);
                                                    const mins = totalMinutos % 60;
                                                    return totalMinutos > 0 ? `${horas}:${mins.toString().padStart(2, '0')}` : '';
                                                })()}
                                                onChangeText={(value) => {
                                                    if (value === '') {
                                                        atualizarEspecialidade(index, 'horas', 0);
                                                        return;
                                                    }
                                                    
                                                    let minutos = 0;
                                                    
                                                    if (value.includes(':')) {
                                                        // Formato H:MM
                                                        const [h, m] = value.split(':');
                                                        const horas = parseInt(h) || 0;
                                                        const mins = parseInt(m) || 0;
                                                        minutos = (horas * 60) + mins;
                                                    } else {
                                                        // Assumir que é apenas horas
                                                        const horas = parseFloat(value) || 0;
                                                        minutos = Math.round(horas * 60);
                                                    }
                                                    
                                                    // Converter minutos de volta para horas decimais para compatibilidade
                                                    const horasDecimais = minutos / 60;
                                                    atualizarEspecialidade(index, 'horas', horasDecimais);
                                                }}
                                                placeholder="0:00"
                                                keyboardType="default"
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabelSmall}>Especialidade</Text>
                                        <View style={styles.pickerContainer}>
                                    {especialidades.map((esp) => (
                                        <TouchableOpacity
                                            key={esp.codigo}
                                            style={[
                                            styles.pickerOptionSmall,
                                            espItem.especialidade === esp.codigo && styles.pickerOptionSelected
                                            ]}
                                            onPress={() => atualizarEspecialidade(index, 'especialidade', esp.codigo)}
                                        >
                                            <Text style={[
                                            styles.pickerOptionTextSmall,
                                            espItem.especialidade === esp.codigo && styles.pickerOptionTextSelected
                                            ]}>
                                            {esp.descricao}
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
                                    Total: {formatarHorasMinutos(editData.especialidadesDia?.reduce((sum, esp) => {
                                        const horas = parseFloat(esp.horas) || 0;
                                        return sum + Math.round(horas * 60);
                                    }, 0))} 
                                    / {formatarHorasMinutos(selectedTrabalhador?.horasPorDia[selectedDia] || 0)} trabalhadas
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
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${loadingProgress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{Math.round(loadingProgress)}%</Text>
                </View>
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
  height: 50, // substitui minHeight por height fixa
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
        alignSelf: 'stretch',
  overflow: 'hidden',
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
    variacaoText: {
        fontSize: 12,
        fontWeight: '600',
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
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: '#1792FE',
        marginTop: 10,
        marginBottom: 20,
    },
    progressContainer: {
        width: '80%',
        alignItems: 'center',
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#1792FE',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
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
        marginLeft: 0,
        borderLeftWidth: 0,
        borderLeftColor: '#e3f2fd',
    },
    obraSeparator: {
        height: 15,
        backgroundColor: '#f5f5f5',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        marginVertical: 5,
    },
    obraDaysHeader: {
  flexDirection: 'row',
  backgroundColor: '#e3f2fd',
  height: 50, // altura igual à `tableRow`
  borderBottomWidth: 1,
  borderBottomColor: '#1792FE',
},

    obraDaysHeaderText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1792FE',
        textAlign: 'center',
    },
});

export default PartesDiarias;
