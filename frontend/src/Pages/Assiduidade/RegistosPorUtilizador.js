import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx-js-style';
import EditarRegistoModal from './EditarRegistoModalWeb';
import { secureStorage } from '../../utils/secureStorage';

// ✨ Componentes otimizados
import FiltrosPanel from './components/FiltrosPanel';
import ExportActions from './components/ExportActions';
import NavigationTabs from './components/NavigationTabs';
import ModalBase from './components/ModalBase';
import RegistoGradeRow from './components/RegistoGradeRow';
import UserSelectionList from './components/UserSelectionList';
import DaySelectionList from './components/DaySelectionList';
import HorariosInput from './components/HorariosInput';
import ObraSelector from './components/ObraSelector';
import ActionBar from './components/ActionBar';

// ✨ Hooks customizados
import { useRegistosOptimized } from './hooks/useRegistosOptimized';

// ✨ Utilitários
import {
    formatDate,
    getTodayISO,
    getISODate,
    createTimestamp,
    createTimestampFromParts,
    formatarHorasParaExibicao,
    isWeekend,
    getDayName
} from './utils/dateUtils';
import { exportToExcel } from './utils/excelExporter';
import { groupCellsByUser } from './utils/cellUtils';
import { normalizarFalta, normalizarHoraExtra } from './utils/dataNormalizers';

// ✨ Serviços de API
import * as API from './services/apiService';
import { criarF40SeNecessario, inserirFaltaComTratamentoErros } from './services/faltasService';

// ✨ Estilos separados
import styles from './RegistosPorUtilizadorStyles';
const RegistosPorUtilizador = () => {
    const [utilizadores, setUtilizadores] = useState([]);
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState('');
    const [utilizadorSelecionado, setUtilizadorSelecionado] = useState('');
    const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
    const [dataSelecionada, setDataSelecionada] = useState('');
    const [resumoUtilizadores, setResumoUtilizadores] = useState([]);
    const [utilizadorDetalhado, setUtilizadorDetalhado] = useState(null);
    const [registosDetalhados, setRegistosDetalhados] = useState([]);
    const [agrupadoPorDia, setAgrupadoPorDia] = useState({});
    const [loading, setLoading] = useState(false);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);
    const [enderecos, setEnderecos] = useState({});
    const [filtroTipo, setFiltroTipo] = useState('');

    // New states for grid view
    const [viewMode, setViewMode] = useState('resumo'); // 'resumo', 'grade', 'detalhes'
    const [dadosGrade, setDadosGrade] = useState([]);
    const [loadingGrade, setLoadingGrade] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [diasDoMes, setDiasDoMes] = useState([]);
    const [tiposFaltas, setTiposFaltas] = useState({});
    const [tiposHorasExtras, setTiposHorasExtras] = useState({});
    const [horasExtrasUtilizadores, setHorasExtrasUtilizadores] = useState({});

    // States para Bolsa de Horas
    const [bolsaHoras, setBolsaHoras] = useState([]);
    const [loadingBolsa, setLoadingBolsa] = useState(false);
    const [horariosUtilizadores, setHorariosUtilizadores] = useState({});

    // Cache para codFuncionario (OTIMIZAÇÃO)
    const [cacheCodFuncionario, setCacheCodFuncionario] = useState({});

    const token = secureStorage.getItem('loginToken');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [userToRegistar, setUserToRegistar] = useState(null);
    const [diaToRegistar, setDiaToRegistar] = useState(null);
    const [obraNoDialog, setObraNoDialog] = useState(obraSelecionada || '');

    const [selectedCells, setSelectedCells] = useState([]);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [loadingBulkDelete, setLoadingBulkDelete] = useState(false);

    // Estados para edição direta
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [registoParaEditar, setRegistoParaEditar] = useState(null);
    const [dadosEdicao, setDadosEdicao] = useState({
        userId: null,
        dia: null,
        registos: []
    });


    const [horarios, setHorarios] = useState({
        entradaManha: '09:00',
        saidaManha: '13:00',
        entradaTarde: '14:00',
        saidaTarde: '18:00'
    });

    const [isInitialized, setIsInitialized] = useState(false);
    const [initError, setInitError] = useState(null);

    // Converte horas decimais (ex: 8.94) para formato HH:MM (ex: 8:56)
    const formatarHorasMinutos = (horasDecimais) => {
        const horas = Math.floor(horasDecimais);
        const minutos = Math.round((horasDecimais - horas) * 60);
        return `${horas}:${String(minutos).padStart(2, '0')}`;
    };





    // State for falta modal
    const [faltaDialogOpen, setFaltaDialogOpen] = useState(false);
    const [tipoFaltaSelecionado, setTipoFaltaSelecionado] = useState('');
    const [duracaoFalta, setDuracaoFalta] = useState(''); // 'd' for day, 'h' for hour
    const [faltaIntervalo, setFaltaIntervalo] = useState(false);
    const [dataFimFalta, setDataFimFalta] = useState('');
    const [loadingFalta, setLoadingFalta] = useState(false);

    // State for bulk falta modal
    const [bulkFaltaDialogOpen, setBulkFaltaDialogOpen] = useState(false);
    const [tipoFaltaSelecionadoBulk, setTipoFaltaSelecionadoBulk] = useState('');
    const [duracaoFaltaBulk, setDuracaoFaltaBulk] = useState('');
    const [loadingBulkFalta, setLoadingBulkFalta] = useState(false);

    // State for auto-fill modal
    const [autoFillDialogOpen, setAutoFillDialogOpen] = useState(false);
    const [funcionarioSelecionadoAutoFill, setFuncionarioSelecionadoAutoFill] = useState('');
    const [loadingAutoFill, setLoadingAutoFill] = useState(false);

    // State for clear points modal
    const [clearPointsDialogOpen, setClearPointsDialogOpen] = useState(false);
    const [funcionarioSelecionadoClear, setFuncionarioSelecionadoClear] = useState('');
    const [diaSelecionadoClear, setDiaSelecionadoClear] = useState('');
    const [loadingClear, setLoadingClear] = useState(false);

    // State for remover falta modal
    const [removerFaltaDialogOpen, setRemoverFaltaDialogOpen] = useState(false);
    const [faltaParaRemover, setFaltaParaRemover] = useState(null);
    const [loadingRemoverFalta, setLoadingRemoverFalta] = useState(false);

    // State for remover hora extra modal
    const [removerHoraExtraDialogOpen, setRemoverHoraExtraDialogOpen] = useState(false);
    const [horaExtraParaRemover, setHoraExtraParaRemover] = useState(null);
    const [loadingRemoverHoraExtra, setLoadingRemoverHoraExtra] = useState(false);

    // State for hora extra modal
    const [horaExtraDialogOpen, setHoraExtraDialogOpen] = useState(false);
    const [tipoHoraExtraSelecionado, setTipoHoraExtraSelecionado] = useState('');
    const [tempoHoraExtra, setTempoHoraExtra] = useState('');
    const [observacoesHoraExtra, setObservacoesHoraExtra] = useState('');
    const [loadingHoraExtra, setLoadingHoraExtra] = useState(false);

    // State for bulk hora extra modal
    const [bulkHoraExtraDialogOpen, setBulkHoraExtraDialogOpen] = useState(false);
    const [tipoHoraExtraSelecionadoBulk, setTipoHoraExtraSelecionadoBulk] = useState('');
    const [tempoHoraExtraBulk, setTempoHoraExtraBulk] = useState('');
    const [loadingBulkHoraExtra, setLoadingBulkHoraExtra] = useState(false);

    // ✨ Hook otimizado para cálculos pesados memoizados
    const {
        cellsByUser,
        utilizadoresList,
        estatisticasGerais,
        findUtilizadorById,
        isCellSelected,
        diasVaziosPorUtilizador
    } = useRegistosOptimized(dadosGrade, diasDoMes, selectedCells);

    // ✨ Callbacks memoizados
    const handleBulkConfirm = useCallback(async () => {
        if (!obraNoDialog) {
            return alert('Escolhe uma obra para registar.');
        }
        try {
            for (const cellKey of selectedCells) {
                const [userId, dia] = cellKey.split('-');
                const userIdNumber = parseInt(userId, 10);
                const diaNumber = parseInt(dia, 10);
                const dataFormatada = formatDate(anoSelecionado, mesSelecionado, diaNumber);
                const tipos = ['entrada', 'saida', 'entrada', 'saida'];
                const horas = [
                    horarios.entradaManha,
                    horarios.saidaManha,
                    horarios.entradaTarde,
                    horarios.saidaTarde
                ];
                for (let i = 0; i < 4; i++) {
                    // Criar timestamp sem timezone offset para evitar +1 hora
                    const [hh, mm] = horas[i].split(':').map(Number);
                    const timestamp = makeUTCISO(parseInt(anoSelecionado, 10), parseInt(mesSelecionado, 10), parseInt(diaNumber, 10), hh, mm);

                    const ponto = await API.registarPontoEsquecido(token, {
                        tipo: tipos[i],
                        obra_id: Number(obraNoDialog),
                        user_id: userIdNumber,
                        timestamp: timestamp
                    });
                    await API.confirmarPonto(token, ponto.id);
                }
            }
            alert(`Registados e confirmados em bloco ${selectedCells.length} pontos!`);
            setBulkDialogOpen(false);
            setSelectedCells([]);
            carregarDadosGrade();
        } catch (err) {
            alert(err.message);
        }
    }, [selectedCells, obraNoDialog, anoSelecionado, mesSelecionado, token]);

    // ✨ Callback otimizado para clique em utilizador na grade
    const handleUtilizadorClick = useCallback((utilizador) => {
        carregarDetalhesUtilizador(utilizador);
        setViewMode('detalhes');
    }, []);

    // ✨ Callback otimizado para clique em célula da grade
    const handleCellClick = useCallback(async (e, userId, dia, cellKey) => {
        const userIdNumber = parseInt(userId, 10);
        const diaNumber = parseInt(dia, 10);

        if (isNaN(userIdNumber) || isNaN(diaNumber)) {
            console.error(`[ERROR] IDs inválidos - userId: ${userId}, dia: ${dia}`);
            return;
        }

        if (e.ctrlKey) {
            // Ctrl + Click = Seleção múltipla
            setSelectedCells(cells => {
                const newCells = cells.includes(cellKey)
                    ? cells.filter(c => c !== cellKey)
                    : [...cells, cellKey];
                return newCells;
            });
        } else {
            // Clique normal - abrir modal/editor conforme o conteúdo da célula
            const item = dadosGrade.find(i => i.utilizador.id === userIdNumber);
            if (!item) return;

            const estatisticas = item.estatisticasDias?.[diaNumber];

            // Verificar horas extras primeiro
            if (estatisticas && estatisticas.horasExtras && estatisticas.horasExtras.length > 0) {
                const horaExtra = estatisticas.horasExtras[0];
                setHoraExtraParaRemover({
                    IdFuncRemCBL: horaExtra.IdFuncRemCBL,
                    funcionarioNome: item.utilizador.nome,
                    dia: diaNumber,
                    tipo: horaExtra.HoraExtra || horaExtra.HorasExtras,
                    tempo: horaExtra.Tempo,
                    todasHorasExtras: estatisticas.horasExtras
                });
                setRemoverHoraExtraDialogOpen(true);
            } else if (estatisticas && estatisticas.faltas && estatisticas.faltas.length > 0) {
                // Há falta(s) - abrir modal de remoção
                const dataFormatada = formatDate(anoSelecionado, mesSelecionado, diaNumber);
                const codFunc = await obterCodFuncionario(userIdNumber);
                setFaltaParaRemover({
                    funcionarioId: codFunc,
                    funcionarioNome: item.utilizador.nome,
                    dia: diaNumber,
                    data: new Date(dataFormatada).toISOString(),
                    falta: estatisticas.faltas[0],
                    todasFaltas: estatisticas.faltas
                });
                setRemoverFaltaDialogOpen(true);
            } else {
                // Abrir editor
                abrirEdicaoDirecta(userIdNumber, diaNumber, item.utilizador.nome);
            }
        }
    }, [dadosGrade, anoSelecionado, mesSelecionado]);

    const obterEndereco = async (lat, lon) => {
        const chave = `${lat},${lon}`;
        if (enderecos[chave]) return enderecos[chave];

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
            const data = await res.json();
            const endereco = data.display_name || `${lat}, ${lon}`;
            setEnderecos(prev => ({ ...prev, [chave]: endereco }));
            return endereco;
        } catch (err) {
            console.error('Erro ao obter endereço:', err);
            return `${lat}, ${lon}`;
        }
    };

    useEffect(() => {
        const inicializarComponente = async () => {
            setIsInitialized(false);
            setInitError(null);

            try {

                // Validar tokens antes de começar
                const painelAdminToken = secureStorage.getItem('painelAdminToken');
                const urlempresa = secureStorage.getItem('urlempresa');
                const loginToken = secureStorage.getItem('loginToken');

                if (!painelAdminToken || !urlempresa) {
                    throw new Error('⚠️ Tokens do Primavera não encontrados. Por favor, configure o acesso ao ERP.');
                }

                if (!loginToken) {
                    throw new Error('⚠️ Token de autenticação não encontrado. Por favor, faça login novamente.');
                }

                // Carregar dados essenciais em paralelo com validação
                const resultados = await Promise.allSettled([
                    carregarUtilizadores(),
                    carregarObras(),
                    carregarTiposFaltas(),
                    carregarTiposHorasExtras()
                ]);

                // Verificar se algum carregamento falhou
                const falhas = resultados.filter(r => r.status === 'rejected');

                if (falhas.length > 0) {
                    const erros = falhas.map(f => f.reason?.message || 'Erro desconhecido').join('; ');
                    throw new Error(`Falha ao carregar dados essenciais: ${erros}`);
                }

                setIsInitialized(true);

            } catch (error) {
                console.error('❌ Erro ao inicializar componente:', error);
                setInitError(error.message);
                setIsInitialized(false);
            }
        };

        inicializarComponente();
    }, []);

    const carregarTiposFaltas = async () => {
        const painelAdminToken = secureStorage.getItem('painelAdminToken');
        const urlempresa = secureStorage.getItem('urlempresa');

        if (!painelAdminToken || !urlempresa) {
            throw new Error('Tokens do Primavera não configurados');
        }

        let tentativas = 0;
        const maxTentativas = 3;

        while (tentativas < maxTentativas) {
            try {
                const data = await API.buscarTiposFaltas(painelAdminToken, urlempresa);
                const tipos = data?.DataSet?.Table ?? [];

                if (!Array.isArray(tipos) || tipos.length === 0) {
                    throw new Error('Nenhum tipo de falta retornado do servidor');
                }

                const mapaFaltas = {};
                tipos.forEach(t => {
                    mapaFaltas[t.Falta] = t.Descricao;
                });
                setTiposFaltas(mapaFaltas);
                return true;
            } catch (err) {
                tentativas++;
                console.error(`❌ Tentativa ${tentativas}/${maxTentativas} falhou ao carregar tipos de faltas:`, err.message);

                if (tentativas >= maxTentativas) {
                    throw new Error(`Falha ao carregar tipos de faltas após ${maxTentativas} tentativas: ${err.message}`);
                }

                // Aguardar 1 segundo antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    };

     const carregarTiposHorasExtras = async () => {
        const painelAdminToken = secureStorage.getItem('painelAdminToken');
        const urlempresa = secureStorage.getItem('urlempresa');

        if (!painelAdminToken || !urlempresa) {
            throw new Error('Tokens do Primavera não configurados');
        }

        let tentativas = 0;
        const maxTentativas = 3;

        while (tentativas < maxTentativas) {
            try {
                const data = await API.buscarTiposHorasExtras(painelAdminToken, urlempresa);
                const tipos = data?.DataSet?.Table ?? [];

                if (!Array.isArray(tipos) || tipos.length === 0) {
                    throw new Error('Nenhum tipo de hora extra retornado do servidor');
                }

                const mapaHorasExtras = {};
                tipos.forEach(t => {
                    // Use "HorasExtra" como chave e "Descricao" como valor a exibir
                    mapaHorasExtras[t.HorasExtra] = t.Descricao;
                });
                setTiposHorasExtras(mapaHorasExtras);
                return true;
            } catch (err) {
                tentativas++;
                console.error(`❌ Tentativa ${tentativas}/${maxTentativas} falhou ao carregar tipos de horas extras:`, err.message);

                if (tentativas >= maxTentativas) {
                    throw new Error(`Falha ao carregar tipos de horas extras após ${maxTentativas} tentativas: ${err.message}`);
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    };

    const carregarHorasExtrasUtilizadores = async () => {
        const painelAdminToken = secureStorage.getItem('painelAdminToken');
        const urlempresa = secureStorage.getItem('urlempresa');

        if (!painelAdminToken || !urlempresa) {
            console.warn('⚠️ Tokens do Primavera não disponíveis para carregar horas extras');
            return {};
        }

        try {
            const data = await API.buscarHorasExtrasTodosFuncionarios(painelAdminToken, urlempresa);
            const horasExtras = data?.DataSet?.Table ?? [];

            // Organizar horas extras por funcionário e data
            const horasExtrasPorFuncionario = {};
            horasExtras.forEach(he => {
                const funcionario = he.Funcionario;
                if (!horasExtrasPorFuncionario[funcionario]) {
                    horasExtrasPorFuncionario[funcionario] = [];
                }
                horasExtrasPorFuncionario[funcionario].push(he);
            });

            return horasExtrasPorFuncionario;
        } catch (err) {
            console.error('❌ Erro ao carregar horas extras:', err);
            return {};
        }
    };

    // Função para carregar horários dos utilizadores
    const carregarHorariosUtilizadores = async () => {
        try {
            const token = secureStorage.getItem('loginToken');
            const empresaId = secureStorage.getItem('empresa_id');

            if (!token || !empresaId) {
                console.warn('⚠️ Token ou empresa ID não encontrados');
                return {};
            }

            // Buscar todos os utilizadores da empresa
            const usersData = await API.buscarUtilizadoresPorEmpresa(token, empresaId);
            const horariosMap = {};

            // Para cada utilizador, buscar o horário ativo
            for (const user of usersData) {
                try {
                    const horarioData = await API.buscarHorarioUtilizador(token, user.id);
                    if (horarioData && horarioData.Horario) {
                        horariosMap[user.id] = horarioData.Horario;
                    }
                } catch (err) {
                    console.error(`Erro ao buscar horário do user ${user.id}:`, err);
                }
            }

            return horariosMap;
        } catch (err) {
            console.error('❌ Erro ao carregar horários:', err);
            return {};
        }
    };

    // Função para calcular bolsa de horas GLOBAL (todos os registos desde o início)
    const calcularBolsaHoras = async () => {
        setLoadingBolsa(true);
        try {
            const empresaId = secureStorage.getItem('empresa_id');

            // Carregar horários dos utilizadores
            const horarios = await carregarHorariosUtilizadores();
            setHorariosUtilizadores(horarios);

            // Buscar todos os utilizadores
            const users = await API.buscarUtilizadoresPorEmpresa(token, empresaId);
            const bolsaCalculada = [];

            // Para cada utilizador, calcular bolsa global
            for (const user of users) {

                const horarioUser = horarios[user.id];

                if (!horarioUser) {
                    console.warn(`⚠️ [BOLSA] ${user.nome || user.username} SEM horário definido - A IGNORAR`);
                    // Só processar utilizadores com horário definido
                    continue;
                }

                const horasPorDia = horarioUser ? parseFloat(horarioUser.horasPorDia) || 8 : 8;
                const dataInicioHorario = horarioUser?.dataInicio ? new Date(horarioUser.dataInicio) : new Date('2020-01-01');
                const dataAtual = new Date();


                // Buscar TODOS os registos do utilizador desde o início do horário
                // Dividir em períodos mensais (a API usa ano=YYYY&mes=MM)
                const todosRegistos = [];
                const anoInicio = dataInicioHorario.getFullYear();
                const mesInicio = dataInicioHorario.getMonth() + 1; // 1-12
                const anoFim = dataAtual.getFullYear();
                const mesFim = dataAtual.getMonth() + 1; // 1-12


                // Iterar por cada mês desde o início até agora
                for (let ano = anoInicio; ano <= anoFim; ano++) {
                    const primMes = (ano === anoInicio) ? mesInicio : 1;
                    const ultMes = (ano === anoFim) ? mesFim : 12;

                    for (let mes = primMes; mes <= ultMes; mes++) {
                        const mesStr = String(mes).padStart(2, '0');

                        try {
                            const registosMes = await API.buscarRegistosPonto(token, user.id, ano, mes);
                            todosRegistos.push(...registosMes);
                        } catch (error) {
                            console.warn(`⚠️ [BOLSA] ${user.nome || user.username} - ${ano}/${mesStr}: ${error.message}`);
                        }
                    }
                }


                if (todosRegistos.length === 0) {
                    console.warn(`⚠️ [BOLSA] ${user.nome || user.username} - Sem registos encontrados`);
                    bolsaCalculada.push({
                        utilizador: user,
                        horario: horarioUser,
                        horasPorDia,
                        totalHorasTrabalhadas: 0,
                        totalHorasEsperadas: 0,
                        totalHorasDescontadasFBH: 0,
                        saldoBolsa: 0,
                        diasTrabalhados: 0,
                        dataInicio: dataInicioHorario,
                        detalhes: []
                    });
                    continue;
                }

                if (todosRegistos.length > 0) {
                }

                // Agrupar registos por data
                const registosPorData = {};
                todosRegistos.forEach(reg => {
                    const dataReg = new Date(reg.timestamp);

                    // Filtrar apenas registos após o início do horário
                    if (dataReg >= dataInicioHorario && dataReg <= dataAtual) {
                        const dataKey = `${dataReg.getFullYear()}-${String(dataReg.getMonth() + 1).padStart(2, '0')}-${String(dataReg.getDate()).padStart(2, '0')}`;

                        if (!registosPorData[dataKey]) {
                            registosPorData[dataKey] = [];
                        }
                        registosPorData[dataKey].push(reg);
                    }
                });


                let totalHorasTrabalhadas = 0;
                let totalHorasEsperadas = 0;
                let diasTrabalhadosDetalhes = [];
                let totalDiasTrabalhados = 0;

                // Calcular horas para cada dia
                Object.keys(registosPorData).forEach(dataKey => {
                    const registosDoDia = registosPorData[dataKey];

                    // Calcular horas trabalhadas neste dia
                    const eventosOrdenados = registosDoDia
                        .filter(r => r.tipo === 'entrada' || r.tipo === 'saida')
                        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                    let horasDia = 0;
                    let ultimaEntrada = null;

                    eventosOrdenados.forEach(reg => {
                        if (reg.tipo === 'entrada') {
                            ultimaEntrada = new Date(reg.timestamp);
                        } else if (reg.tipo === 'saida' && ultimaEntrada) {
                            const saida = new Date(reg.timestamp);
                            const horas = (saida - ultimaEntrada) / (1000 * 60 * 60);
                            horasDia += horas;
                            ultimaEntrada = null;
                        }
                    });

                    if (horasDia > 0) {
                        totalDiasTrabalhados++;

                        // Aplicar lógica de arredondamento para bolsa de horas
                        let horasParaBolsa = horasDia;

                        // Log para debug - ver o que está vindo do horário
                        if (Object.keys(registosPorData).indexOf(dataKey) === 0) {
                        }

                        // Se o horário tem tempoArredondamento definido (ex: "08:45" ou 8.75)
                        if (horarioUser && horarioUser.tempoArredondamento) {
                            let tempoArredondamento = 0;

                            // Converter tempoArredondamento para horas
                            if (typeof horarioUser.tempoArredondamento === 'string') {
                                // Se estiver no formato "HH:MM" (ex: "08:45")
                                const partes = horarioUser.tempoArredondamento.split(':');
                                if (partes.length === 2) {
                                    tempoArredondamento = parseInt(partes[0]) + (parseInt(partes[1]) / 60);
                                } else {
                                    // Se for string numérica (ex: "8.75")
                                    tempoArredondamento = parseFloat(horarioUser.tempoArredondamento);
                                }
                            } else {
                                // Se já for número
                                tempoArredondamento = parseFloat(horarioUser.tempoArredondamento);
                            }

                            // Lógica de arredondamento para bolsa de horas
                            // tempoArredondamento define quando arredondar para o próximo bloco
                            // Ex: horasPorDia = 8h, tempoArredondamento = 8:45 (8.75h)
                            // - < 8:45h: 0h extra (ainda dentro das 8h esperadas)
                            // - >= 8:45h e < 9:45h: 1h extra (arredonda para 1h)
                            // - >= 9:45h e < 10:45h: 2h extra (arredonda para 2h)
                            // - >= 10:45h e < 11:45h: 3h extra (arredonda para 3h)

                            if (horasDia < tempoArredondamento) {
                                // Trabalhou menos que o limite de arredondamento
                                // Não conta hora extra
                                horasParaBolsa = 0;
                            } else {
                                // Trabalhou mais que o limite de arredondamento
                                // Calcular em qual "bloco" de hora extra está
                                // Cada bloco tem 1h de intervalo após tempoArredondamento
                                const horasAcima = horasDia - tempoArredondamento;
                                horasParaBolsa = Math.floor(horasAcima) + 1; // +1 porque já passou do limite
                            }

                        } else {
                            console.warn(`⚠️ [BOLSA] ${user.nome || user.username} - SEM tempoArredondamento definido! Usando horas reais.`);
                        }

                        // horasParaBolsa já contém apenas as horas extras (0, 1, 2, etc.)
                        totalHorasTrabalhadas += horasParaBolsa;
                        totalHorasEsperadas += horasPorDia;

                        // Guardar detalhes apenas dos dias com horas extras
                        if (horasParaBolsa > 0) {
                            diasTrabalhadosDetalhes.push({
                                data: dataKey,
                                horasReaisTrabalhadas: horasDia, // Horas reais (para exibir)
                                horasTrabalhadas: horasParaBolsa, // Horas extras (1h, 2h, etc.)
                                horasEsperadas: horasPorDia,
                                diferenca: horasParaBolsa // Diferença = horas extras
                            });
                        }
                    }
                });

                // Buscar faltas do tipo FBH (Falta de Bolsa de Horas) para descontar do saldo
                let totalHorasDescontadasFBH = 0;
                const painelAdminToken = secureStorage.getItem('painelAdminToken');
                const loginToken = secureStorage.getItem('loginToken');
                const urlempresa = secureStorage.getItem('urlempresa');

                try {
                    // Obter codFuncionario do utilizador
                    const codFuncionario = await API.buscarCodFuncionario(loginToken, user.id);

                    if (codFuncionario && painelAdminToken && urlempresa) {
                            // Buscar todas as faltas do funcionário desde o início do horário até hoje
                            const urlFaltas = `https://webapiprimavera.advir.pt/routesFaltas/GetListaFaltasFuncionario/${codFuncionario}`;


                            const resFaltas = await fetch(urlFaltas, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${painelAdminToken}`,
                                    'urlempresa': urlempresa,
                                }
                            });


                            if (resFaltas.ok) {
                                const dataFaltas = await resFaltas.json();


                                // Verificar se é array direto ou se está dentro de DataSet.Table
                                let todasFaltas = [];
                                if (Array.isArray(dataFaltas)) {
                                    todasFaltas = dataFaltas;
                                } else if (dataFaltas && dataFaltas.DataSet && Array.isArray(dataFaltas.DataSet.Table)) {
                                    todasFaltas = dataFaltas.DataSet.Table;
                                }

                                if (todasFaltas.length > 0) {

                                    // Log da primeira falta para ver a estrutura

                                    const faltasFBH = todasFaltas.filter(falta => {
                               // Verificar se é falta do tipo FBH, FBHD ou FBHH
                                        const tipoFalta = falta.Falta || falta.Falta1;
                                        const dataFalta = falta.Data || falta.Data1 || falta.Data2;



                                        // Aceitar FBH, FBHD e FBHH
                                        if ((tipoFalta === 'FBH' || tipoFalta === 'FBHD' || tipoFalta === 'FBHH') && dataFalta) {

                                            const dataFaltaObj = new Date(dataFalta);
                                            // Verificar se a falta está após o início do horário
                                            // Não limitamos ao futuro porque faltas FBH podem ser agendadas
                                            const apósInicioHorario = dataFaltaObj >= dataInicioHorario;


                                            return apósInicioHorario;
                                        }
                                        return false;
                                    });



                                    // Somar as horas das faltas FBH/FBHD/FBHH
                                    faltasFBH.forEach(falta => {
                                        const tempo = parseFloat(falta.Tempo || 0);
                                        const tipoFalta = falta.Falta || falta.Falta1;

                                        totalHorasDescontadasFBH += tempo;
                                    });

                                    if (totalHorasDescontadasFBH > 0) {
                                    } else {
                                    }
                                } else {
                                    console.warn(`⚠️ [BOLSA-FBH] ${user.nome || user.username} - Nenhuma falta encontrada na resposta da API`);
                                }
                            } else {
                                console.warn(`⚠️ [BOLSA-FBH] ${user.nome || user.username} - Erro na API: ${resFaltas.status}`);
                            }
                        } else {
                            console.warn(`⚠️ [BOLSA-FBH] ${user.nome || user.username} - Faltam credenciais (codFuncionario: ${codFuncionario}, painelAdminToken: ${!!painelAdminToken}, urlempresa: ${!!urlempresa})`);
                        }
                } catch (errFaltas) {
                    console.warn(`⚠️ [BOLSA] ${user.nome || user.username} - Erro ao buscar faltas FBH:`, errFaltas);
                }

                // totalHorasTrabalhadas já contém APENAS as horas extras acumuladas
                // Descontar as horas das faltas FBH
                const saldoBolsa = totalHorasTrabalhadas - totalHorasDescontadasFBH;


                // Adicionar todos os utilizadores, mesmo com saldo zero
                bolsaCalculada.push({
                    utilizador: user,
                    horario: horarioUser || { descricao: 'Horário Padrão', horasPorDia: 8 },
                    horasPorDia,
                    totalHorasTrabalhadas,
                    totalHorasEsperadas,
                    totalHorasDescontadasFBH,
                    saldoBolsa,
                    diasTrabalhados: totalDiasTrabalhados,
                    dataInicio: dataInicioHorario,
                    detalhes: diasTrabalhadosDetalhes.sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 30)
                });
            }

            // Ordenar por saldo (do maior para o menor)
            bolsaCalculada.sort((a, b) => b.saldoBolsa - a.saldoBolsa);

            setBolsaHoras(bolsaCalculada);

        } catch (err) {
            console.error('❌ [BOLSA] Erro ao calcular bolsa de horas:', err);
            alert('Erro ao calcular bolsa de horas: ' + err.message);
        } finally {
            setLoadingBolsa(false);
        }
    };

    useEffect(() => {
        if (utilizadorSelecionado) {
            carregarDetalhesUtilizador(utilizadores.find(u => u.id.toString() === utilizadorSelecionado.toString()));
        }
    }, [utilizadorSelecionado, mesSelecionado, anoSelecionado]);

    const carregarUtilizadores = async () => {
        const empresaId = secureStorage.getItem('empresa_id');

        if (!empresaId) {
            throw new Error('ID da empresa não encontrado');
        }

        try {
            const data = await API.buscarUtilizadoresPorEmpresa(token, empresaId);

            if (!Array.isArray(data)) {
                throw new Error('Formato de resposta inválido ao carregar utilizadores');
            }

            // Filtrar e ordenar utilizadores (ignorar testes@advir.pt)
            const utilizadoresFiltrados = data.filter(u => u.email !== 'testes@advir.pt');

            if (utilizadoresFiltrados.length === 0) {
                console.warn('⚠️ Nenhum utilizador encontrado para esta empresa');
            }

            const utilizadoresOrdenados = utilizadoresFiltrados.sort((a, b) => {
                const codA = a.codFuncionario || a.username || a.email || '';
                const codB = b.codFuncionario || b.username || b.email || '';

                // Tentar converter para número se possível
                const numA = parseInt(codA);
                const numB = parseInt(codB);

                // Se ambos são números, comparar numericamente
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }

                // Caso contrário, comparar alfabeticamente com suporte numérico
                return codA.toString().localeCompare(codB.toString(), undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
            });

            setUtilizadores(utilizadoresOrdenados);
            return true;
        } catch (err) {
            console.error('❌ Erro ao carregar utilizadores:', err);
            throw err;
        }
    };

    const carregarObras = async () => {
        const empresaId = secureStorage.getItem('empresa_id');

        if (!empresaId) {
            throw new Error('ID da empresa não encontrado');
        }

        try {
            const data = await API.buscarObrasPorEmpresa(token, empresaId);

            if (!Array.isArray(data)) {
                throw new Error('Formato de resposta inválido ao carregar obras');
            }

            setObras(data);
            return true;
        } catch (err) {
            console.error('❌ Erro ao carregar obras:', err);
            throw err;
        }
    };

    const gerarDiasDoMes = (ano, mes) => {
        if (!ano || !mes) return [];

        const dataInicio = new Date(ano, mes - 1, 1);
        const dataFim = new Date(ano, mes, 0);
        const dias = [];

        for (let dia = 1; dia <= dataFim.getDate(); dia++) {
            dias.push(dia);
        }

        return dias;
    };

    // Função para atualizar apenas um utilizador específico na grade
    const atualizarUtilizadorNaGrade = async (userId) => {
        if (!anoSelecionado || !mesSelecionado || !userId) {
            return;
        }

        try {
            const user = utilizadores.find(u => u.id === parseInt(userId));
            if (!user) return;

            // Carregar dados apenas deste utilizador
            const painelAdminToken = secureStorage.getItem('painelAdminToken');
            const urlempresa = secureStorage.getItem('urlempresa');
            const loginToken = secureStorage.getItem('loginToken');

            let query = `user_id=${user.id}&ano=${anoSelecionado}&mes=${String(mesSelecionado).padStart(2, '0')}`;
            if (obraSelecionada) query += `&obra_id=${obraSelecionada}`;

            const [resRegistos] = await Promise.all([
                fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo?${query}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            let faltasUtilizador = [];
            let horasExtrasUtilizador = [];
            
            if (painelAdminToken && urlempresa && loginToken) {
                try {
                    const urlFaltasMensal = `https://webapiprimavera.advir.pt/routesFaltas/GetListaFaltasFuncionariosMensal/${mesSelecionado}`;

                    const codFuncionario = await API.buscarCodFuncionario(loginToken, user.id);

                    if (codFuncionario) {
                            const resFaltas = await fetch(urlFaltasMensal, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${painelAdminToken}`,
                                    urlempresa: urlempresa,
                                },
                            });

                            if (resFaltas.ok) {
                                const dataFaltas = await resFaltas.json();
                                if (dataFaltas && dataFaltas.DataSet && Array.isArray(dataFaltas.DataSet.Table)) {
                                    const listaMes = dataFaltas.DataSet.Table;

                                    listaMes.forEach(item => {
                                        const funcionarioFalta = item.Funcionario2 || item.Funcionario1;
                                        if (funcionarioFalta === codFuncionario && item.Falta1) {
                                            const dataFalta = item.Data2 || item.Data1;
                                            if (dataFalta) {
                                                const dataObj = new Date(dataFalta);
                                                if (dataObj.getFullYear() === parseInt(anoSelecionado)) {
                                                    faltasUtilizador.push({
                                                        Funcionario: funcionarioFalta,
                                                        Funcionario1: item.Funcionario1,
                                                        Funcionario2: item.Funcionario2,
                                                        Data: dataFalta,
                                                        Data1: item.Data1,
                                                        Data2: item.Data2,
                                                        Falta: item.Falta1,
                                                        Falta1: item.Falta1,
                                                        Horas: item.Horas,
                                                        HorasFalta: item.HorasFalta,
                                                        Tempo: item.Tempo1 || item.TempoFalta,
                                                        Tempo1: item.Tempo1,
                                                        TempoFalta: item.TempoFalta
                                                    });
                                                }
                                            }
                                        }
                                        
                                        if (item.Funcionario === codFuncionario && item.HoraExtra) {
                                            const dataHE = item.Data;
                                            if (dataHE) {
                                                const dataObj = new Date(dataHE);
                                                if (dataObj.getFullYear() === parseInt(anoSelecionado)) {
                                                    horasExtrasUtilizador.push({
                                                        Funcionario: item.Funcionario,
                                                        Funcionario1: item.Funcionario1,
                                                        Data: item.Data,
                                                        Data1: item.Data1,
                                                        HoraExtra: item.HoraExtra,
                                                        HoraExtra1: item.HoraExtra1,
                                                        Tempo: item.TempoExtra || item.Tempo,
                                                        TempoExtra: item.TempoExtra,
                                                        IdFuncRemCBL: item.idFuncRemCBL,
                                                        idFuncRemCBL: item.idFuncRemCBL
                                                    });
                                                }
                                            }
                                        }
                                    });
                                }
                            }
                        }
                } catch (faltaErr) {
                    console.error(`Erro ao carregar dados para ${user.nome}:`, faltaErr);
                }
            }

            if (resRegistos.ok) {
                const registos = await resRegistos.json();

                const registosPorDia = {};
                const faltasPorDia = {};
                const horasExtrasPorDia = {};

                registos.forEach(reg => {
                    const dia = new Date(reg.timestamp).getDate();
                    if (!registosPorDia[dia]) registosPorDia[dia] = [];
                    registosPorDia[dia].push(reg);
                });

                faltasUtilizador.forEach(falta => {
                    const dataFalta = falta.Data1 || falta.Data2;
                    const codigoFalta = falta.Falta1 || falta.Falta;
                    
                    if (dataFalta && codigoFalta) {
                        const dataObj = new Date(dataFalta);
                        const dia = dataObj.getDate();
                        const mes = dataObj.getMonth() + 1;
                        const ano = dataObj.getFullYear();
                        
                        if (mes === parseInt(mesSelecionado) && ano === parseInt(anoSelecionado)) {
                            if (!faltasPorDia[dia]) faltasPorDia[dia] = [];
                            
                            const faltaNormalizada = normalizarFalta(falta, dataFalta, codigoFalta);
                            
                            faltasPorDia[dia].push(faltaNormalizada);
                        }
                    }
                });

                horasExtrasUtilizador.forEach(he => {
                    const dataHE = he.Data || he.Data1;
                    const codigoHE = he.HoraExtra || he.HoraExtra1;
                    
                    if (dataHE && codigoHE) {
                        const dataObj = new Date(dataHE);
                        const dia = dataObj.getDate();
                        const mes = dataObj.getMonth() + 1;
                        const ano = dataObj.getFullYear();
                        
                        if (mes === parseInt(mesSelecionado) && ano === parseInt(anoSelecionado)) {
                            if (!horasExtrasPorDia[dia]) horasExtrasPorDia[dia] = [];
                            
                            const hENormalizada = {
                                ...he,
                                Data: dataHE,
                                HoraExtra: codigoHE,
                                Funcionario: he.Funcionario1 || he.Funcionario,
                                Tempo: he.TempoExtra || he.Tempo,
                                IdFuncRemCBL: he.idFuncRemCBL || he.IdFuncRemCBL
                            };
                            
                            horasExtrasPorDia[dia].push(hENormalizada);
                        }
                    }
                });

                const estatisticasDias = {};
                let totalDiasComRegistos = 0;
                let totalHorasEstimadas = 0;

                diasDoMes.forEach(dia => {
                    const regs = registosPorDia[dia] || [];
                    const faltas = faltasPorDia[dia] || [];
                    const horasExtras = horasExtrasPorDia[dia] || [];

                    if (regs.length > 0 || faltas.length > 0 || horasExtras.length > 0) {
                        if (regs.length > 0) totalDiasComRegistos++;

                        const entradas = regs.filter(r => r.tipo === 'entrada').length;
                        const saidas = regs.filter(r => r.tipo === 'saida').length;
                        const confirmados = regs.filter(r => r.is_confirmed).length;

                        let horasEstimadas = 0;
                        const eventosOrdenados = regs
                            .filter(r => r.tipo === 'entrada' || r.tipo === 'saida')
                            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                        let ultimaEntrada = null;
                        eventosOrdenados.forEach(reg => {
                            if (reg.tipo === 'entrada') {
                                ultimaEntrada = new Date(reg.timestamp);
                            } else if (reg.tipo === 'saida' && ultimaEntrada) {
                                const diff = (new Date(reg.timestamp) - ultimaEntrada) / 3600000;
                                if (diff > 0 && diff < 24) {
                                    horasEstimadas += diff;
                                }
                                ultimaEntrada = null;
                            }
                        });

                        totalHorasEstimadas += horasEstimadas;

                        const timestamps = regs.map(r => new Date(r.timestamp).getTime());

                        estatisticasDias[dia] = {
                            totalRegistos: regs.length,
                            entradas,
                            saidas,
                            confirmados,
                            naoConfirmados: regs.length - confirmados,
                            horasEstimadas: horasEstimadas.toFixed(1),
                            primeiroRegisto: timestamps.length > 0 ? new Date(Math.min(...timestamps)).toLocaleTimeString('pt-PT') : null,
                            ultimoRegisto: timestamps.length > 0 ? new Date(Math.max(...timestamps)).toLocaleTimeString('pt-PT') : null,
                            obras: [...new Set(regs.map(r => r.Obra?.nome).filter(Boolean))],
                            faltas: faltas,
                            horasExtras: horasExtras
                        };
                    }
                });

                const dadosAtualizados = {
                    utilizador: user,
                    estatisticasDias,
                    totalDias: totalDiasComRegistos,
                    totalRegistos: registos.length,
                    totalHorasEstimadas: totalHorasEstimadas.toFixed(1),
                    totalFaltas: faltasUtilizador.length,
                    totalHorasExtras: horasExtrasUtilizador.length
                };

                // Atualizar apenas este utilizador na grade
                setDadosGrade(prevGrade => {
                    const index = prevGrade.findIndex(item => item.utilizador.id === user.id);
                    if (index >= 0) {
                        const newGrade = [...prevGrade];
                        newGrade[index] = dadosAtualizados;
                        return newGrade;
                    }
                    return prevGrade;
                });
            }
        } catch (err) {
            console.error('Erro ao atualizar utilizador na grade:', err);
        }
    };

    const carregarDadosGrade = async () => {
        if (!anoSelecionado || !mesSelecionado) {
            alert('Por favor, selecione o ano e mês para visualização em grade.');
            return;
        }

        setLoadingGrade(true);
        setLoadingProgress(0);
        setLoadingMessage('Iniciando carregamento...');
        setDadosGrade([]);

        try {
            // 1) Validar e carregar tipos de faltas primeiro
            setLoadingMessage('Validando tipos de faltas e horas extras...');

            const painelAdminToken = secureStorage.getItem('painelAdminToken');
            const urlempresa = secureStorage.getItem('urlempresa');

            if (!painelAdminToken || !urlempresa) {
                console.error('❌ [GRADE] Erro: Tokens do Primavera não encontrados');
                alert('Tokens do Primavera não encontrados. Por favor, configure o acesso ao ERP.');
                setLoadingGrade(false);
                return;
            }

            // Carregar tipos de faltas e horas extras com validação
            try {
                await Promise.all([
                    carregarTiposFaltas(),
                    carregarTiposHorasExtras()
                ]);
            } catch (err) {
                console.error('❌ [GRADE] Erro ao validar tipos:', err);
                alert('Erro ao carregar tipos de faltas/horas extras. Por favor, tente novamente.');
                setLoadingGrade(false);
                return;
            }

            const dias = gerarDiasDoMes(parseInt(anoSelecionado), parseInt(mesSelecionado));
            setDiasDoMes(dias);

            setLoadingProgress(10);
            setLoadingMessage('Identificando utilizadores...');

            let utilizadoresParaPesquisar = utilizadores;

            // Se tiver utilizador específico selecionado, usar apenas esse
            if (utilizadorSelecionado) {
                const userSelecionado = utilizadores.find(u => u.id.toString() === utilizadorSelecionado.toString());
                utilizadoresParaPesquisar = userSelecionado ? [userSelecionado] : [];
            }
            // Se tiver obra selecionada, filtrar utilizadores dessa obra (OTIMIZADO - 1 requisição)
            else if (obraSelecionada) {
                setLoadingMessage('Filtrando utilizadores por obra...');

                try {
                    // OTIMIZAÇÃO: Fazer apenas 1 request para o mês inteiro
                    const query = `obra_id=${obraSelecionada}&ano=${anoSelecionado}&mes=${String(mesSelecionado).padStart(2, '0')}`;
                    const registos = await API.listarRegistosPorObraPeriodo(token, query);
                    const userIdsObra = [...new Set(registos.map(reg => reg.user_id).filter(Boolean))];
                    utilizadoresParaPesquisar = utilizadores.filter(u => userIdsObra.includes(u.id));
                } catch (error) {
                    console.error('Erro ao filtrar utilizadores por obra:', error);
                }
            }

            setLoadingProgress(20);

            const dadosGradeTemp = [];
            const totalUsers = utilizadoresParaPesquisar.length;
            const progressPerUser = 70 / totalUsers;

            // Processar em lotes paralelos para otimizar
            const BATCH_SIZE = 30;

            for (let i = 0; i < utilizadoresParaPesquisar.length; i += BATCH_SIZE) {
                const batch = utilizadoresParaPesquisar.slice(i, Math.min(i + BATCH_SIZE, utilizadoresParaPesquisar.length));

                await Promise.all(batch.map(async (user, batchIndex) => {
                    const index = i + batchIndex;
                    setLoadingMessage(`Carregando dados (${index + 1}/${totalUsers})...`);

                    try {
                        // Carregar registos de ponto
                        let query = `user_id=${user.id}&ano=${anoSelecionado}&mes=${String(mesSelecionado).padStart(2, '0')}`;
                        if (obraSelecionada) query += `&obra_id=${obraSelecionada}`;

                        const [resRegistos] = await Promise.all([
                            fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo?${query}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            })
                        ]);

                        // Carregar faltas E horas extras do utilizador (em paralelo) com validação
                        const painelAdminToken = secureStorage.getItem('painelAdminToken');
                        const urlempresa = secureStorage.getItem('urlempresa');
                        const loginToken = secureStorage.getItem('loginToken');

                        let faltasUtilizador = [];
                        let horasExtrasUtilizador = [];
                        
                        if (painelAdminToken && urlempresa && loginToken) {
                            try {
                                // Usar o novo endpoint mensal que retorna FALTAS E HORAS EXTRAS
                                const urlFaltasMensal = `https://webapiprimavera.advir.pt/routesFaltas/GetListaFaltasFuncionariosMensal/${mesSelecionado}`;

                                // Obter codFuncionario do utilizador ANTES de fazer a requisição
                                // Verificar cache primeiro
                                let codFuncionario = cacheCodFuncionario[user.id];

                                if (!codFuncionario) {
                                    // Só faz requisição se não estiver em cache
                                    codFuncionario = await API.buscarCodFuncionario(loginToken, user.id);

                                    // Armazenar em cache
                                    if (codFuncionario) {
                                        setCacheCodFuncionario(prev => ({...prev, [user.id]: codFuncionario}));
                                    } else {
                                        console.warn(`⚠️ [GRADE] Não foi possível obter codFuncionario para ${user.nome}`);
                                    }
                                }

                                if (codFuncionario) {

                                        const resFaltas = await fetch(urlFaltasMensal, {
                                            method: 'GET',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                Authorization: `Bearer ${painelAdminToken}`,
                                                urlempresa: urlempresa,
                                            },
                                        });

                                        if (resFaltas.ok) {
                                            const dataFaltas = await resFaltas.json();

                                            // Validar estrutura de resposta
                                            if (!dataFaltas || !dataFaltas.DataSet || !Array.isArray(dataFaltas.DataSet.Table)) {
                                                console.warn(`⚠️ [GRADE] Formato de resposta inválido para ${user.nome}`);
                                            } else {
                                                const listaMes = dataFaltas.DataSet.Table;

                                                // Processar dados do mês - separar faltas e horas extras
                                                listaMes.forEach(item => {
                                                    // Verificar se é FALTA (tem Funcionario2 e Falta1)
                                                    // Nota: A API mensal usa Funcionario2 para faltas
                                                    const funcionarioFalta = item.Funcionario2 || item.Funcionario1;
                                                    if (funcionarioFalta === codFuncionario && item.Falta1) {
                                                        const dataFalta = item.Data2 || item.Data1;
                                                        if (dataFalta) {
                                                            const dataObj = new Date(dataFalta);
                                                            if (dataObj.getFullYear() === parseInt(anoSelecionado)) {
                                                                faltasUtilizador.push({
                                                                    Funcionario: funcionarioFalta,
                                                                    Funcionario1: item.Funcionario1,
                                                                    Funcionario2: item.Funcionario2,
                                                                    Data: dataFalta,
                                                                    Data1: item.Data1,
                                                                    Data2: item.Data2,
                                                                    Falta: item.Falta1,
                                                                    Falta1: item.Falta1,
                                                                    Horas: item.Horas,
                                                                    HorasFalta: item.HorasFalta,
                                                                    Tempo: item.Tempo1 || item.TempoFalta,
                                                                    Tempo1: item.Tempo1,
                                                                    TempoFalta: item.TempoFalta
                                                                });
                                                            }
                                                        }
                                                    }
                                                    
                                                    // Verificar se é HORA EXTRA (tem Funcionario e HoraExtra)
                                                    if (item.Funcionario === codFuncionario && item.HoraExtra) {
                                                        const dataHE = item.Data;
                                                        if (dataHE) {
                                                            const dataObj = new Date(dataHE);
                                                            if (dataObj.getFullYear() === parseInt(anoSelecionado)) {
                                                                horasExtrasUtilizador.push({
                                                                    Funcionario: item.Funcionario,
                                                                    Funcionario1: item.Funcionario1,
                                                                    Data: item.Data,
                                                                    Data1: item.Data1,
                                                                    HoraExtra: item.HoraExtra,
                                                                    HoraExtra1: item.HoraExtra1,
                                                                    Tempo: item.TempoExtra || item.Tempo,
                                                                    TempoExtra: item.TempoExtra,
                                                                    IdFuncRemCBL: item.idFuncRemCBL,
                                                                    idFuncRemCBL: item.idFuncRemCBL
                                                                });
                                                            }
                                                        }
                                                    }
                                                });

                                            }
                                        } else {
                                            console.warn(`⚠️ [GRADE] Erro HTTP ${resFaltas.status} ao carregar dados do mês ${mesSelecionado}`);
                                        }
                                }
                            } catch (faltaErr) {
                                console.error(`❌ [GRADE] Erro ao carregar dados para ${user.nome}:`, faltaErr);
                            }
                        } else {
                            console.warn(`⚠️ [GRADE] Tokens não disponíveis para carregar dados de ${user.nome}`);
                        }

                        if (resRegistos.ok) {
                            const registos = await resRegistos.json();

                            // Organizar registos por dia (otimizado)
                            const registosPorDia = {};
                            const faltasPorDia = {};
                            const horasExtrasPorDia = {};

                            registos.forEach(reg => {
                                const dia = new Date(reg.timestamp).getDate();
                                if (!registosPorDia[dia]) registosPorDia[dia] = [];
                                registosPorDia[dia].push(reg);
                            });

                            // Mapear faltas por dia com validação
                            faltasUtilizador.forEach(falta => {
                                // A API mensal retorna faltas em campos diferentes: Data1/Data2 e Falta1
                                const dataFalta = falta.Data1 || falta.Data2;
                                const codigoFalta = falta.Falta1 || falta.Falta;
                                
                                if (dataFalta && codigoFalta) {
                                    const dataObj = new Date(dataFalta);
                                    const dia = dataObj.getDate();
                                    const mes = dataObj.getMonth() + 1;
                                    const ano = dataObj.getFullYear();
                                    
                                    // Validar se é do mês/ano correto
                                    if (mes === parseInt(mesSelecionado) && ano === parseInt(anoSelecionado)) {
                                        if (!faltasPorDia[dia]) faltasPorDia[dia] = [];
                                        
                                        // Normalizar estrutura da falta para compatibilidade
                                        const faltaNormalizada = normalizarFalta(falta, dataFalta, codigoFalta);
                                        
                                        faltasPorDia[dia].push(faltaNormalizada);
                                    }
                                }
                            });

                            // Mapear horas extras por dia com validação
                            horasExtrasUtilizador.forEach(he => {
                                // A API mensal retorna horas extras em campos diferentes: Data/Data1
                                const dataHE = he.Data || he.Data1;
                                const codigoHE = he.HoraExtra || he.HoraExtra1;
                                
                                if (dataHE && codigoHE) {
                                    const dataObj = new Date(dataHE);
                                    const dia = dataObj.getDate();
                                    const mes = dataObj.getMonth() + 1;
                                    const ano = dataObj.getFullYear();
                                    
                                    // Validar se é do mês/ano correto
                                    if (mes === parseInt(mesSelecionado) && ano === parseInt(anoSelecionado)) {
                                        if (!horasExtrasPorDia[dia]) horasExtrasPorDia[dia] = [];
                                        
                                        // Normalizar estrutura da hora extra para compatibilidade
                                        const hENormalizada = {
                                            ...he,
                                            Data: dataHE,
                                            HoraExtra: codigoHE,
                                            Funcionario: he.Funcionario1 || he.Funcionario,
                                            Tempo: he.TempoExtra || he.Tempo,
                                            IdFuncRemCBL: he.idFuncRemCBL || he.IdFuncRemCBL
                                        };
                                        
                                        horasExtrasPorDia[dia].push(hENormalizada);
                                    }
                                }
                            });

                            // Calcular estatísticas por dia (otimizado)
                            const estatisticasDias = {};
                            let totalDiasComRegistos = 0;
                            let totalHorasEstimadas = 0;

                            dias.forEach(dia => {
                                const regs = registosPorDia[dia] || [];
                                const faltas = faltasPorDia[dia] || [];
                                const horasExtras = horasExtrasPorDia[dia] || [];

                                if (regs.length > 0 || faltas.length > 0 || horasExtras.length > 0) {
                                    if (regs.length > 0) totalDiasComRegistos++;

                                    const entradas = regs.filter(r => r.tipo === 'entrada').length;
                                    const saidas = regs.filter(r => r.tipo === 'saida').length;
                                    const confirmados = regs.filter(r => r.is_confirmed).length;

                                    // Calcular horas (otimizado)
                                    let horasEstimadas = 0;
                                    const eventosOrdenados = regs
                                        .filter(r => r.tipo === 'entrada' || r.tipo === 'saida')
                                        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                                    let ultimaEntrada = null;
                                    eventosOrdenados.forEach(reg => {
                                        if (reg.tipo === 'entrada') {
                                            ultimaEntrada = new Date(reg.timestamp);
                                        } else if (reg.tipo === 'saida' && ultimaEntrada) {
                                            const diff = (new Date(reg.timestamp) - ultimaEntrada) / 3600000;
                                            if (diff > 0 && diff < 24) {
                                                horasEstimadas += diff;
                                            }
                                            ultimaEntrada = null;
                                        }
                                    });

                                    totalHorasEstimadas += horasEstimadas;

                                    const timestamps = regs.map(r => new Date(r.timestamp).getTime());

                                    estatisticasDias[dia] = {
                                        totalRegistos: regs.length,
                                        entradas,
                                        saidas,
                                        confirmados,
                                        naoConfirmados: regs.length - confirmados,
                                        horasEstimadas: horasEstimadas.toFixed(1),
                                        primeiroRegisto: timestamps.length > 0 ? new Date(Math.min(...timestamps)).toLocaleTimeString('pt-PT') : null,
                                        ultimoRegisto: timestamps.length > 0 ? new Date(Math.max(...timestamps)).toLocaleTimeString('pt-PT') : null,
                                        obras: [...new Set(regs.map(r => r.Obra?.nome).filter(Boolean))],
                                        faltas: faltas,
                                        horasExtras: horasExtras
                                    };
                                }
                            });

                            dadosGradeTemp.push({
                                utilizador: user,
                                estatisticasDias,
                                totalDias: totalDiasComRegistos,
                                totalRegistos: registos.length,
                                totalHorasEstimadas: totalHorasEstimadas.toFixed(1),
                                totalFaltas: faltasUtilizador.length,
                                totalHorasExtras: horasExtrasUtilizador.length
                            });
                        } else {
                            dadosGradeTemp.push({
                                utilizador: user,
                                estatisticasDias: {},
                                totalDias: 0,
                                totalRegistos: 0,
                                totalHorasEstimadas: '0.0',
                                totalFaltas: 0
                            });
                        }
                    } catch (err) {
                        console.error(`Erro ao carregar dados do utilizador ${user.nome}:`, err);
                        dadosGradeTemp.push({
                            utilizador: user,
                            estatisticasDias: {},
                            totalDias: 0,
                            totalRegistos: 0,
                            totalHorasEstimadas: '0.0',
                            totalFaltas: 0,
                            totalHorasExtras: 0
                        });
                    }

                    setLoadingProgress(20 + ((index + 1) * progressPerUser));
                }));
            }

            setLoadingProgress(90);
            setLoadingMessage('Organizando dados...');

            // Ordenar (otimizado)
            dadosGradeTemp.sort((a, b) => {
                const codA = a.utilizador.codFuncionario || a.utilizador.username || a.utilizador.email || '';
                const codB = b.utilizador.codFuncionario || b.utilizador.username || b.utilizador.email || '';

                const numA = parseInt(codA);
                const numB = parseInt(codB);

                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }

                return codA.toString().localeCompare(codB.toString(), undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
            });

            // Validação final da integridade dos dados

            const totalFaltasNaGrade = dadosGradeTemp.reduce((sum, user) => sum + (user.totalFaltas || 0), 0);
            const totalRegistosNaGrade = dadosGradeTemp.reduce((sum, user) => sum + (user.totalRegistos || 0), 0);


            if (dadosGradeTemp.length === 0) {
                console.warn('⚠️ [GRADE] Nenhum utilizador com dados para o período selecionado');
            }


            setDadosGrade(dadosGradeTemp);
            setLoadingProgress(100);
            setLoadingMessage('Concluído!');


        } catch (err) {
            console.error('❌ [GRADE] Erro ao carregar dados da grade:', err);
            setLoadingMessage('Erro ao carregar dados');
            alert(`Erro ao carregar grade: ${err.message || 'Erro desconhecido'}\n\nPor favor, tente novamente.`);
        } finally {
            setTimeout(() => {
                setLoadingGrade(false);
                setLoadingProgress(0);
                setLoadingMessage('');
            }, 500);
        }
    };

    const carregarResumoUtilizadores = async () => {
        setLoading(true);
        setResumoUtilizadores([]);
        setUtilizadorDetalhado(null);

        try {
            let utilizadoresParaPesquisar = utilizadores;

            // Se tiver utilizador específico selecionado, usar apenas esse
            if (utilizadorSelecionado) {
                const userSelecionado = utilizadores.find(u => u.id.toString() === utilizadorSelecionado.toString());
                utilizadoresParaPesquisar = userSelecionado ? [userSelecionado] : [];
            }
            // Se tiver obra selecionada, buscar apenas utilizadores dessa obra
            else if (obraSelecionada && dataSelecionada) {
                const dataObraUsers = await API.listarRegistosPorObraEDia(token, obraSelecionada, dataSelecionada);

                // Extrair utilizadores únicos desta obra
                const userIdsObra = [...new Set(dataObraUsers.map(reg => reg.User?.id).filter(Boolean))];
                utilizadoresParaPesquisar = utilizadores.filter(u => userIdsObra.includes(u.id));
            }

            const resumos = [];

            for (const user of utilizadoresParaPesquisar) {
                try {
                    let query = `user_id=${user.id}`;

                    if (dataSelecionada) {
                        query += `&data=${dataSelecionada}`;
                    } else {
                        if (anoSelecionado) query += `&ano=${anoSelecionado}`;
                        if (mesSelecionado) query += `&mes=${String(mesSelecionado).padStart(2, '0')}`;
                    }
                    if (obraSelecionada) query += `&obra_id=${obraSelecionada}`;

                    const registos = await API.listarRegistosPorUserPeriodo(token, query);

                    if (registos.length > 0) {
                        // Calcular estatísticas do utilizador
                        const diasUnicos = [...new Set(registos.map(r => new Date(r.timestamp).toISOString().split('T')[0]))];
                        const totalRegistos = registos.length;
                        const registosConfirmados = registos.filter(r => r.is_confirmed).length;

                        // Calcular horas trabalhadas (estimativa baseada em entradas/saídas)
                        const horasPorDia = {};
                        registos.forEach(reg => {
                            const dia = new Date(reg.timestamp).toISOString().split('T')[0];
                            if (!horasPorDia[dia]) horasPorDia[dia] = [];
                            horasPorDia[dia].push(reg);
                        });

                        let totalHorasEstimadas = 0;

                        Object.values(horasPorDia).forEach(registosDia => {
                            // Ordenar os registos por timestamp
                            const eventosOrdenados = registosDia
                                .filter(r => r.tipo === 'entrada' || r.tipo === 'saida')
                                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                            let ultimaEntrada = null;
                            let horasDia = 0;

                            eventosOrdenados.forEach(reg => {
                                if (reg.tipo === 'entrada') {
                                    ultimaEntrada = new Date(reg.timestamp);
                                } else if (reg.tipo === 'saida' && ultimaEntrada) {
                                    const saida = new Date(reg.timestamp);
                                    const diff = (saida - ultimaEntrada) / (1000 * 60 * 60); // em horas
                                    if (diff > 0 && diff < 24) {
                                        horasDia += diff;
                                    }
                                    ultimaEntrada = null; // limpar entrada após pareamento
                                }
                            });

                            totalHorasEstimadas += horasDia;
                        });

                        const obrasUtilizador = [...new Set(registos.map(r => r.Obra?.nome).filter(Boolean))];

                        resumos.push({
                            utilizador: user,
                            totalDias: diasUnicos.length,
                            totalRegistos,
                            registosConfirmados,
                            registosNaoConfirmados: totalRegistos - registosConfirmados,
                            percentagemConfirmados: totalRegistos > 0 ? ((registosConfirmados / totalRegistos) * 100).toFixed(1) : 0,
                            totalHorasEstimadas: totalHorasEstimadas.toFixed(1),
                            obras: obrasUtilizador,
                            periodoInicio: new Date(Math.min(...registos.map(r => new Date(r.timestamp)))).toLocaleDateString('pt-PT'),
                            periodoFim: new Date(Math.max(...registos.map(r => new Date(r.timestamp)))).toLocaleDateString('pt-PT')
                        });
                    }
                } catch (err) {
                    console.error(`Erro ao carregar dados do utilizador ${user.nome}:`, err);
                }
            }

            // Ordenar por total de horas (decrescente)
            resumos.sort((a, b) => parseFloat(b.totalHorasEstimadas) - parseFloat(a.totalHorasEstimadas));
            setResumoUtilizadores(resumos);

        } catch (err) {
            console.error('Erro ao carregar resumo:', err);
        } finally {
            setLoading(false);
        }
    };

    const carregarDetalhesUtilizador = async (user) => {
        setLoadingDetalhes(true);
        setUtilizadorDetalhado(user);

        try {
            let query = `user_id=${user.id}`;

            if (dataSelecionada) {
                query += `&data=${dataSelecionada}`;
            } else {
                if (anoSelecionado) query += `&ano=${anoSelecionado}`;
                if (mesSelecionado) query += `&mes=${String(mesSelecionado).padStart(2, '0')}`;
            }
            if (obraSelecionada) query += `&obra_id=${obraSelecionada}`;

            const data = await API.listarRegistosPorUserPeriodo(token, query);

            const agrupados = {};
            data.forEach(reg => {
                const dia = new Date(reg.timestamp).toISOString().split('T')[0];
                if (!agrupados[dia]) agrupados[dia] = [];
                agrupados[dia].push(reg);
            });

            setRegistosDetalhados(data);
            setAgrupadoPorDia(agrupados);

        } catch (err) {
            console.error('Erro ao carregar detalhes:', err);
        } finally {
            setLoadingDetalhes(false);
        }
    };




    useEffect(() => {
        const fetchEnderecos = async () => {
            if (!utilizadorDetalhado) return;

            const promessas = [];
            Object.values(agrupadoPorDia).flat().forEach((reg) => {
                if (reg.latitude && reg.longitude) {
                    const chave = `${reg.latitude},${reg.longitude}`;
                    if (!enderecos[chave]) {
                        promessas.push(obterEndereco(reg.latitude, reg.longitude));
                    }
                }
            });
            if (promessas.length > 0) await Promise.all(promessas);
        };

        if (Object.keys(agrupadoPorDia).length > 0) {
            fetchEnderecos();
        }
    }, [agrupadoPorDia, utilizadorDetalhado]);

    const exportarResumo = () => {
        const data = resumoUtilizadores.map(resumo => [
            resumo.utilizador.nome,
            resumo.totalDias,
            resumo.totalRegistos,
            resumo.registosConfirmados,
            resumo.registosNaoConfirmados,
            `${resumo.percentagemConfirmados}%`,
            resumo.totalHorasEstimadas,
            resumo.obras.join(', '),
            `${resumo.periodoInicio} - ${resumo.periodoFim}`
        ]);

        exportToExcel({
            fileName: 'Resumo_Utilizadores',
            sheetName: 'Resumo',
            data,
            headers: ['Utilizador', 'Total Dias', 'Total Registos', 'Confirmados', 'Não Confirmados', '% Confirmação', 'Horas Estimadas', 'Obras', 'Período'],
            columnWidths: [25, 12, 15, 12, 15, 15, 15, 30, 20],
            title: 'Resumo de Registos por Utilizador',
            subtitle: `Período: ${dataSelecionada || `${mesSelecionado}/${anoSelecionado}`}`
        });
    };

    const exportarGrade = () => {
        if (!dadosGrade.length) {
            alert('Não há dados da grade para exportar');
            return;
        }

        // Função para converter horas decimais em formato HhMm
        const formatarHoras = (horasDecimais) => {
            if (!horasDecimais || horasDecimais === 0) return '';
            const horas = Math.floor(horasDecimais);
            const minutos = Math.round((horasDecimais - horas) * 60);
            return `${horas}h${minutos.toString().padStart(2, '0')}m`;
        };

        const workbook = XLSX.utils.book_new();
        const dadosExport = [];

        // Linha 1: Nome e dias do mês
        const headerRow1 = ['Nome'];
        diasDoMes.forEach(dia => headerRow1.push(dia));
        headerRow1.push('Total Dias', 'Total Horas', 'DIVERSOS', 'Sabados');
        dadosExport.push(headerRow1);

        // Dados dos utilizadores
        dadosGrade.forEach(item => {
            const row = [item.utilizador.nome];

            let totalSabados = 0;
            let totalDiversos = 0;

            diasDoMes.forEach(dia => {
                const estatisticas = item.estatisticasDias[dia];
                const dataDia = new Date(anoSelecionado, mesSelecionado - 1, dia);
                const diaSemana = dataDia.getDay();

                if (estatisticas && estatisticas.totalRegistos > 0) {
                    // Contar sábados trabalhados
                    if (diaSemana === 6) {
                        totalSabados++;
                    }

                    // Formatar horas
                    row.push(formatarHoras(parseFloat(estatisticas.horasEstimadas)));
                } else {
                    row.push('');
                }
            });

            // Adicionar colunas finais
            row.push(item.totalDias);
            row.push(formatarHoras(parseFloat(item.totalHorasEstimadas)));
            row.push(totalDiversos > 0 ? `${totalDiversos} Horas` : '');
            row.push(totalSabados > 0 ? `${totalSabados} Sabados` : '');

            dadosExport.push(row);
        });

        // Criar worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(dadosExport);

        // Aplicar formatação no cabeçalho dos dias primeiro
        for (let C = 1; C <= diasDoMes.length; C++) {
            const dia = diasDoMes[C - 1];
            const dataDia = new Date(anoSelecionado, mesSelecionado - 1, dia);
            const diaSemana = dataDia.getDay();

            const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });

            // Cor do cabeçalho - amarelo para fins de semana
            let corHeader = 'FFD9D9D9'; // Cinza padrão
            if (diaSemana === 0 || diaSemana === 6) {
                corHeader = 'FFFFFF00'; // Amarelo para fins de semana
            }

            if (worksheet[headerCell]) {
                worksheet[headerCell].s = {
                    font: { bold: true, size: 10, name: 'Calibri' },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    fill: {
                        patternType: 'solid',
                        fgColor: { rgb: corHeader },
                        bgColor: { rgb: corHeader }
                    },
                    border: {
                        top: { style: 'thin', color: { rgb: '000000' } },
                        bottom: { style: 'thin', color: { rgb: '000000' } },
                        left: { style: 'thin', color: { rgb: '000000' } },
                        right: { style: 'thin', color: { rgb: '000000' } }
                    }
                };
            }
        }

        // Aplicar formatação e cores nas linhas dos utilizadores
        for (let R = 1; R < dadosExport.length; R++) {
            const utilizador = dadosGrade[R - 1];
            if (!utilizador) continue;

            // Formatar nome
            const nomeCell = XLSX.utils.encode_cell({ r: R, c: 0 });
            if (worksheet[nomeCell]) {
                worksheet[nomeCell].s = {
                    alignment: { horizontal: 'left', vertical: 'center' },
                    font: { size: 9, name: 'Calibri' },
                    border: {
                        top: { style: 'thin', color: { rgb: '000000' } },
                        bottom: { style: 'thin', color: { rgb: '000000' } },
                        left: { style: 'thin', color: { rgb: '000000' } },
                        right: { style: 'thin', color: { rgb: '000000' } }
                    }
                };
            }

            // Formatar dias
            for (let C = 1; C <= diasDoMes.length; C++) {
                const dia = diasDoMes[C - 1];
                const dataDia = new Date(anoSelecionado, mesSelecionado - 1, dia);
                const diaSemana = dataDia.getDay();

                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });

                // Garantir que a célula existe
                if (!worksheet[cellAddress]) {
                    worksheet[cellAddress] = { t: 's', v: '' };
                }

                // Fins de semana sempre amarelo
                let corFundo = 'FFFFFFFF'; // Branco por padrão
                if (diaSemana === 0 || diaSemana === 6) {
                    corFundo = 'FFFFFF00'; // Amarelo para fins de semana
                }

                worksheet[cellAddress].s = {
                    fill: {
                        patternType: 'solid',
                        fgColor: { rgb: corFundo },
                        bgColor: { rgb: corFundo }
                    },
                    alignment: {
                        horizontal: 'center',
                        vertical: 'center',
                        wrapText: false
                    },
                    font: {
                        size: 9,
                        name: 'Calibri'
                    },
                    border: {
                        top: { style: 'thin', color: { rgb: '000000' } },
                        bottom: { style: 'thin', color: { rgb: '000000' } },
                        left: { style: 'thin', color: { rgb: '000000' } },
                        right: { style: 'thin', color: { rgb: '000000' } }
                    }
                };
            }
        }

        // Formatar restante do cabeçalho (Nome, Total Dias, Total Horas, DIVERSOS, Sabados)
        const colunasHeaderEspeciais = [0]; // Nome
        const numDias = diasDoMes.length;
        colunasHeaderEspeciais.push(numDias + 1, numDias + 2, numDias + 3, numDias + 4);

        colunasHeaderEspeciais.forEach(C => {
            const cell = XLSX.utils.encode_cell({ r: 0, c: C });
            if (worksheet[cell]) {
                worksheet[cell].s = {
                    font: { bold: true, size: 10, name: 'Calibri' },
                    alignment: { horizontal: 'center', vertical: 'center' },
                    fill: {
                        patternType: 'solid',
                        fgColor: { rgb: 'FFD9D9D9' },
                        bgColor: { rgb: 'FFD9D9D9' }
                    },
                    border: {
                        top: { style: 'thin', color: { rgb: '000000' } },
                        bottom: { style: 'thin', color: { rgb: '000000' } },
                        left: { style: 'thin', color: { rgb: '000000' } },
                        right: { style: 'thin', color: { rgb: '000000' } }
                    }
                };
            }
        });

        // Formatar colunas finais (Total Dias, Total Horas, DIVERSOS, Sabados)
        for (let R = 1; R < dadosExport.length; R++) {
            const numDias = diasDoMes.length;
            const colunasFinais = [numDias + 1, numDias + 2, numDias + 3, numDias + 4];

            colunasFinais.forEach(C => {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (worksheet[cellAddress]) {
                    worksheet[cellAddress].s = {
                        alignment: { horizontal: 'center', vertical: 'center' },
                        font: { size: 9, name: 'Calibri' },
                        border: {
                            top: { style: 'thin', color: { rgb: '000000' } },
                            bottom: { style: 'thin', color: { rgb: '000000' } },
                            left: { style: 'thin', color: { rgb: '000000' } },
                            right: { style: 'thin', color: { rgb: '000000' } }
                        }
                    };
                }
            });
        }

        // Larguras das colunas
        const wscols = [
            { wch: 25 }, // Nome
            ...diasDoMes.map(() => ({ wch: 6 })), // Dias
            { wch: 10 }, // Total Dias
            { wch: 12 }, // Total Horas
            { wch: 12 }, // DIVERSOS
            { wch: 12 }  // Sabados
        ];
        worksheet['!cols'] = wscols;

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Grade');

        const fileName = `Grade_Mensal_${mesSelecionado}_${anoSelecionado}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const exportarDetalhesUtilizador = () => {
        if (!utilizadorDetalhado || !registosDetalhados.length) {
            alert('Não há detalhes para exportar');
            return;
        }

        const data = [];
        Object.entries(agrupadoPorDia).forEach(([dia, eventos]) => {
            eventos
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                .forEach(evento => {
                    data.push([
                        new Date(dia).toLocaleDateString('pt-PT'),
                        new Date(evento.timestamp).toLocaleTimeString('pt-PT'),
                        evento.tipo.toUpperCase(),
                        evento.Obra?.nome || 'N/A',
                        evento.is_confirmed ? 'Sim' : 'Não',
                        evento.justificacao || '',
                        evento.latitude && evento.longitude
                            ? enderecos[`${evento.latitude},${evento.longitude}`] || 'A obter...'
                            : 'N/A'
                    ]);
                });
        });

        exportToExcel({
            fileName: `Detalhes_${utilizadorDetalhado.nome.replace(/\s+/g, '_')}`,
            sheetName: 'Detalhes',
            data,
            headers: ['Data', 'Hora', 'Tipo', 'Obra', 'Confirmado', 'Justificação', 'Localização'],
            columnWidths: [12, 10, 12, 25, 12, 30, 40],
            title: `Detalhes de Registos - ${utilizadorDetalhado.nome}`,
            subtitle: `Período: ${dataSelecionada || `${mesSelecionado}/${anoSelecionado}`}`
        });
    };

    const registosFiltrados = Object.entries(agrupadoPorDia).reduce((acc, [dia, eventos]) => {
        const eventosFiltrados = filtroTipo
            ? eventos.filter(e => e.tipo === filtroTipo)
            : eventos;

        if (eventosFiltrados.length > 0) {
            acc[dia] = eventosFiltrados;
        }
        return acc;
    }, {});

    const obterCorStatusDia = (estatisticas) => {
        if (!estatisticas || estatisticas.totalRegistos === 0) return '#f8f9fa';

        const percentagemConfirmados = (estatisticas.confirmados / estatisticas.totalRegistos) * 100;
        const horas = parseFloat(estatisticas.horasEstimadas);

        if (percentagemConfirmados === 100 && horas >= 7) return '#d4edda'; // Verde claro - perfeito
        if (percentagemConfirmados >= 80 && horas >= 6) return '#fff3cd'; // Amarelo - bom
        if (percentagemConfirmados >= 50 || horas >= 4) return '#f8d7da'; // Rosa - problema menor
        return '#f5c6cb'; // Vermelho claro - problema sério
    };

    // Registar ponto para um utilizador específico usando SEMPRE o endpoint de "esquecido" + confirmar
    const registarPontoParaUtilizador = async (
        userId,
        dia,
        obraId,
        tipo = 'entrada',
        horaStr = '09:00' // <- usa horaStr e tem default
    ) => {
        if (!userId || !dia || !anoSelecionado || !mesSelecionado || !obraId) {
            return alert('Faltam dados para registar ponto');
        }

        const uid = Number(userId);
        const oid = Number(obraId);
        const dataFormatada = formatDate(anoSelecionado, mesSelecionado, dia);

        try {
            const ponto = await API.registarPontoEsquecido(token, {
                tipo,
                obra_id: oid,
                user_id: uid,
                timestamp
            });
            await API.confirmarPonto(token, ponto.id);
            if (viewMode === 'grade') carregarDadosGrade();
        } catch (err) {
            alert(err.message);
        }
    };

    // Função auxiliar para formatar horas decimais em horas e minutos
    const formatarHorasParaExibicao = (horasDecimais) => {
        if (!horasDecimais || horasDecimais === 0) return '0h';
        const horas = Math.floor(horasDecimais);
        const minutos = Math.round((horasDecimais - horas) * 60);
        return minutos > 0 ? `${horas}h${minutos}m` : `${horas}h`;
    };

    // Function to get cell content (including absence data and overtime)
    const obterConteudoCelula = (estatisticas) => {
        // Se não há estatísticas, célula vazia
        if (!estatisticas) {
            return { texto: '-', cor: '#f5f5f5', textoCor: '#999' };
        }

        // PRIORIDADE 1: Verificar se há faltas (com ou sem registos)
        if (estatisticas.faltas && estatisticas.faltas.length > 0) {
            
            // Se há múltiplas faltas, priorizar F50 sobre F40
            let faltaPrioritaria = estatisticas.faltas[0];
            
            if (estatisticas.faltas.length > 1) {
                // Procurar F50 nas faltas
                const f50 = estatisticas.faltas.find(f => {
                    const codigo = f.Falta || f.Falta1 || '';
                    return codigo === 'F50';
                });
                
                if (f50) {
                    faltaPrioritaria = f50;
                }
            }
            
            const tipoFalta = faltaPrioritaria.Falta || faltaPrioritaria.Falta1 || 'F';
            const descricaoFalta = tiposFaltas[tipoFalta] || tipoFalta;
            
            // Se há múltiplas faltas, incluir no title
            const titleFaltas = estatisticas.faltas.length > 1 
                ? `Faltas: ${estatisticas.faltas.map(f => {
                    const cod = f.Falta || f.Falta1 || 'F';
                    return `${cod} - ${tiposFaltas[cod] || cod}`;
                  }).join(', ')}`
                : `Falta: ${descricaoFalta}`;
            
            return {
                texto: tipoFalta,
                cor: '#ffebee',
                textoCor: '#d32f2f',
                title: titleFaltas
            };
        }

        // PRIORIDADE 2: Verificar se há horas extras
        if (estatisticas.horasExtras && estatisticas.horasExtras.length > 0) {
            const totalHE = estatisticas.horasExtras.reduce((sum, he) => {
                const tempo = parseFloat(he.Tempo);
                return sum + (isNaN(tempo) ? 0 : tempo);
            }, 0);

            const tiposHE = [...new Set(estatisticas.horasExtras.map(he => {
                const tipo = he.HorasExtra || he.HoraExtra;
                return tiposHorasExtras[tipo] || tipo;
            }))].join(', ');

            // Formatar o total de horas extras
            const horasExtrasFormatadas = formatarHorasParaExibicao(totalHE);
            const textoExtras = totalHE === 1 ? '1h extra' : `${horasExtrasFormatadas} extras`;

            // Se NÃO tem registos, mostrar apenas HE
            if (!estatisticas.totalRegistos || estatisticas.totalRegistos === 0) {
                return {
                    texto: textoExtras,
                    cor: '#e3f2fd',
                    textoCor: '#1976d2',
                    title: `Horas Extras: ${horasExtrasFormatadas} (${tiposHE})`
                };
            }

            // Se tem registos, mostrar horas normais + extras (sem o +)
            const horasNormais = parseFloat(estatisticas.horasEstimadas) || 0;
            const horasNormaisFormatadas = formatarHorasParaExibicao(horasNormais);

            return {
                texto: `${horasNormaisFormatadas} ${textoExtras}`,
                cor: '#e8f5e9',
                textoCor: '#2e7d32',
                title: `Horas Trabalhadas: ${horasNormaisFormatadas}\nHoras Extras: ${horasExtrasFormatadas} (${tiposHE})`
            };
        }

        // PRIORIDADE 3: Se não tem registos, faltas nem horas extras
        if (!estatisticas.totalRegistos || estatisticas.totalRegistos === 0) {
            return { texto: '-', cor: '#f5f5f5', textoCor: '#999' };
        }

        // PRIORIDADE 4: Mostrar horas normais baseado na percentagem de confirmação
        const percentagemConfirmados = (estatisticas.confirmados / estatisticas.totalRegistos) * 100;
        const horas = parseFloat(estatisticas.horasEstimadas);
        const horasFormatadas = formatarHorasParaExibicao(horas);

        if (percentagemConfirmados === 100 && horas >= 7) {
            return {
                texto: horasFormatadas,
                cor: '#e8f5e9',
                textoCor: '#2e7d32',
                title: `${horasFormatadas} - ${estatisticas.totalRegistos} registos`
            };
        }
        if (percentagemConfirmados >= 80 && horas >= 6) {
            return {
                texto: horasFormatadas,
                cor: '#fff3e0',
                textoCor: '#f57c00',
                title: `${horasFormatadas} - ${estatisticas.totalRegistos} registos`
            };
        }

        return {
            texto: horasFormatadas,
            cor: '#ffebee',
            textoCor: '#d32f2f',
            title: `${horasFormatadas} - ${estatisticas.totalRegistos} registos (problemas)`
        };
    };

    const obterCodFuncionario = async (userId) => {
        try {
            const res = await fetch(`https://backend.advir.pt/api/users/${userId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                }
            });
            if (!res.ok) throw new Error('Erro ao obter codFuncionario');
            const data = await res.json();
            return data.codFuncionario;
        } catch (err) {
            console.error('Erro ao obter codFuncionario:', err);
            return null;
        }
    };

    const removerFalta = async () => {
        if (!faltaParaRemover) return;

        setLoadingRemoverFalta(true);

        try {
            const painelToken = secureStorage.getItem('painelAdminToken');
            const urlempresa = secureStorage.getItem('urlempresa');

            if (!painelToken || !urlempresa) {
                throw new Error('Tokens do Primavera não encontrados');
            }

            const { funcionarioId, data, falta, todasFaltas } = faltaParaRemover; // Recebe todasFaltas

            // Formatar a data para o formato esperado pelo endpoint (YYYY-MM-DD)
            const dataFormatada = new Date(data).toISOString().split('T')[0];

            // Lógica para remover todas as faltas do dia
            let falhasNaRemocao = 0;
            for (const faltaItem of todasFaltas) {
                try {
                    await API.removerFaltaPorParametros(painelToken, urlempresa, funcionarioId, dataFormatada, faltaItem.Falta);
                } catch (err) {
                    falhasNaRemocao++;
                    console.error(`Erro ao eliminar falta ${faltaItem.Falta}:`, err);
                }
            }

            if (falhasNaRemocao === 0) {
                alert('✅ Todas as faltas do dia eliminadas com sucesso!');
            } else {
                alert(`⚠️ Eliminação de faltas concluída com ${falhasNaRemocao} erro(s).\nConsulte a consola para mais detalhes.`);
            }

            // Atualizar apenas o utilizador afetado
            if (viewMode === 'grade') {
                const userIdFromFalta = utilizadores.find(u => u.codFuncionario === funcionarioId)?.id;
                if (userIdFromFalta) {
                    await atualizarUtilizadorNaGrade(userIdFromFalta);
                }
            }

            setRemoverFaltaDialogOpen(false);
            setFaltaParaRemover(null);

        } catch (err) {
            console.error('Erro ao remover falta:', err);
            alert(`Erro ao remover falta: ${err.message}`);
        } finally {
            setLoadingRemoverFalta(false);
        }
    };

    const removerHoraExtra = async () => {
        if (!horaExtraParaRemover) return;

        setLoadingRemoverHoraExtra(true);

        try {
            const painelToken = secureStorage.getItem('painelAdminToken');
            const urlempresa = secureStorage.getItem('urlempresa');

            if (!painelToken || !urlempresa) {
                throw new Error('Tokens do Primavera não encontrados');
            }

            const { IdFuncRemCBL } = horaExtraParaRemover;

            if (!IdFuncRemCBL) {
                console.error('❌ Dados da hora extra:', horaExtraParaRemover);
                throw new Error('ID da hora extra não encontrado. Verifique se o campo idFuncRemCBL está presente nos dados.');
            }

            await API.removerHoraExtraPorId(painelToken, urlempresa, IdFuncRemCBL);
            alert('✅ Hora extra removida com sucesso!');

            // Atualizar apenas o utilizador afetado
            if (viewMode === 'grade') {
                const userIdFromHE = utilizadores.find(u => u.codFuncionario === horaExtraParaRemover.funcionarioNome)?.id;
                if (userIdFromHE) {
                    await atualizarUtilizadorNaGrade(userIdFromHE);
                } else {
                    // Fallback: tentar encontrar pelo nome
                    const userByName = utilizadores.find(u => u.nome === horaExtraParaRemover.funcionarioNome)?.id;
                    if (userByName) {
                        await atualizarUtilizadorNaGrade(userByName);
                    }
                }
            }

            setRemoverHoraExtraDialogOpen(false);
            setHoraExtraParaRemover(null);

        } catch (err) {
            console.error('Erro ao remover hora extra:', err);
            alert(`Erro ao remover hora extra: ${err.message}`);
        } finally {
            setLoadingRemoverHoraExtra(false);
        }
    };

    const limparPontosDoDia = async () => {
        if (!funcionarioSelecionadoClear || !diaSelecionadoClear) {
            return alert('Por favor, selecione um funcionário e um dia.');
        }

        if (!anoSelecionado || !mesSelecionado) {
            return alert('Por favor, selecione o ano e mês.');
        }

        setLoadingClear(true);

        try {
            // 1. Obter o funcionário selecionado
            const funcionarioData = dadosGrade.find(item => item.utilizador.id.toString() === funcionarioSelecionadoClear.toString());

            if (!funcionarioData) {
                throw new Error('Funcionário não encontrado nos dados da grade');
            }

            // 2. Verificar se existem registos no dia selecionado
            const dia = parseInt(diaSelecionadoClear);
            const estatisticas = funcionarioData.estatisticasDias[dia];

            if (!estatisticas || estatisticas.totalRegistos === 0) {
                alert(`O funcionário ${funcionarioData.utilizador.nome} não tem registos no dia ${dia}.`);
                return;
            }

            // 3. Confirmar com o utilizador
            const confirmacao = confirm(`⚠️ ATENÇÃO: Esta ação irá eliminar TODOS os ${estatisticas.totalRegistos} registos de ponto do dia ${dia} para o funcionário ${funcionarioData.utilizador.nome}.\n\nEsta ação NÃO pode ser desfeita!\n\nTem certeza que pretende continuar?`);

            if (!confirmacao) {
                return;
            }

            // 4. Segunda confirmação para segurança
            const segundaConfirmacao = confirm(`🔥 ÚLTIMA CONFIRMAÇÃO:\n\nVai eliminar ${estatisticas.totalRegistos} registos de ponto do dia ${dia}/${mesSelecionado}/${anoSelecionado} para ${funcionarioData.utilizador.nome}.\n\nEscreva "CONFIRMAR" na próxima caixa de diálogo para prosseguir.`);

            if (!segundaConfirmacao) {
                return;
            }

            const textoConfirmacao = prompt('Digite "CONFIRMAR" (sem aspas) para eliminar os registos:');
            if (textoConfirmacao !== 'CONFIRMAR') {
                alert('Operação cancelada. Texto de confirmação incorreto.');
                return;
            }

            // 5. Buscar todos os registos do dia específico
            const dataFormatada = formatDate(anoSelecionado, mesSelecionado, dia);

            let query = `user_id=${funcionarioSelecionadoClear}&data=${dataFormatada}`;
            if (obraSelecionada) query += `&obra_id=${obraSelecionada}`;

            const registosParaEliminar = await API.listarRegistosPorUserPeriodo(token, query);

            if (registosParaEliminar.length === 0) {
                alert('Não foram encontrados registos para eliminar.');
                return;
            }

            // 6. Eliminar cada registo individualmente
            let registosEliminados = 0;
            let erros = 0;

            for (const registo of registosParaEliminar) {
                try {
                    try {
                        await API.eliminarRegistoPonto(token, registo.id);
                        registosEliminados++;
                    } catch (err) {
                        console.error(`Erro ao eliminar registo ${registo.id}:`, err);
                        erros++;
                    }

                    // Pequena pausa para não sobrecarregar o servidor
                    if (registosParaEliminar.length > 5) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                } catch (registoErr) {
                    console.error(`Erro ao eliminar registo ${registo.id}:`, registoErr);
                    erros++;
                }
            }

            // 7. Mostrar resultado da operação
            let mensagem = `✅ Limpeza concluída!\n\n`;
            mensagem += `• Registos eliminados: ${registosEliminados}\n`;
            if (erros > 0) {
                mensagem += `• Erros encontrados: ${erros}\n`;
                mensagem += `• Verifique o console para detalhes dos erros\n`;
            }
            mensagem += `\nTodos os registos de ponto do dia ${dia}/${mesSelecionado}/${anoSelecionado} foram eliminados para ${funcionarioData.utilizador.nome}.`;

            alert(mensagem);

            // 8. Recarregar dados da grade para mostrar as alterações
            if (viewMode === 'grade') {
                carregarDadosGrade();
            }

            // 9. Fechar modal
            setClearPointsDialogOpen(false);
            setFuncionarioSelecionadoClear('');
            setDiaSelecionadoClear('');

        } catch (err) {
            console.error('Erro ao limpar pontos do dia:', err);
            alert(`Erro ao limpar pontos: ${err.message}`);
        } finally {
            setLoadingClear(false);
        }
    };

    const preencherPontosEmFalta = async () => {
        if (!funcionarioSelecionadoAutoFill || !obraNoDialog) { // Mudança: verificar obraNoDialog em vez de obraSelecionada
            return alert('Por favor, selecione um funcionário e uma obra.');
        }

        if (!anoSelecionado || !mesSelecionado) {
            return alert('Por favor, selecione o ano e mês.');
        }

        setLoadingAutoFill(true);

        try {
            // 1. Obter os dados atuais do funcionário para identificar dias vazios
            const funcionarioData = dadosGrade.find(item => item.utilizador.id.toString() === funcionarioSelecionadoAutoFill.toString());

            if (!funcionarioData) {
                throw new Error('Funcionário não encontrado nos dados da grade');
            }

            // 2. Identificar dias vazios (sem registos e sem faltas)
            const diasVazios = [];
            diasDoMes.forEach(dia => {
                const estatisticas = funcionarioData.estatisticasDias[dia];
                const dataObj = new Date(parseInt(anoSelecionado), parseInt(mesSelecionado) - 1, dia);
                const isWeekend = dataObj.getDay() === 0 || dataObj.getDay() === 6; // Domingo ou Sábado

                // Só adicionar dias úteis que estão completamente vazios (sem registos nem faltas)
                if (!isWeekend && (!estatisticas || (estatisticas.totalRegistos === 0 && (!estatisticas.faltas || estatisticas.faltas.length === 0)))) {
                    diasVazios.push(dia);
                }
            });

            if (diasVazios.length === 0) {
                alert('Não há dias vazios para preencher. O funcionário já tem registos ou faltas em todos os dias úteis.');
                return;
            }

            // 3. Confirmar com o utilizador
            const confirmacao = confirm(`Pretende preencher ${diasVazios.length} dias vazios (${diasVazios.join(', ')}) com pontos automáticos para ${funcionarioData.utilizador.nome}?`);

            if (!confirmacao) {
                return;
            }

            // 4. Preencher cada dia vazio com os 4 pontos (entrada manhã, saída manhã, entrada tarde, saída tarde)
            let diasPreenchidos = 0;

            for (const dia of diasVazios) {
                try {
                    const dataFormatada = formatDate(anoSelecionado, mesSelecionado, dia);
                    const tipos = ['entrada', 'saida', 'entrada', 'saida'];
                    const horas = [
                        horarios.entradaManha,
                        horarios.saidaManha,
                        horarios.entradaTarde,
                        horarios.saidaTarde
                    ];

                    // Registar os 4 pontos para este dia
                    for (let i = 0; i < 4; i++) {
                        // Criar timestamp sem timezone offset para evitar +1 hora
                        const [hh, mm] = horas[i].split(':').map(Number);
                        const timestamp = makeUTCISO(parseInt(anoSelecionado, 10), parseInt(mesSelecionado, 10), parseInt(dia, 10), hh, mm);


                        const ponto = await API.registarPontoEsquecido(token, {
                            tipo: tipos[i],
                            obra_id: Number(obraNoDialog),
                            user_id: Number(funcionarioSelecionadoAutoFill),
                            timestamp: timestamp
                        });

                        // Confirmar cada ponto
                        try {
                            await API.confirmarPonto(token, ponto.id);
                        } catch (confirmErr) {
                            console.warn(`Aviso: Não foi possível confirmar automaticamente o ponto ${tipos[i]} do dia ${dia}`);
                        }
                    }

                    diasPreenchidos++;

                    // Pequena pausa entre dias para não sobrecarregar o servidor
                    if (diasVazios.length > 5) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                } catch (diaErr) {
                    console.error(`Erro ao preencher dia ${dia}:`, diaErr);
                    // Continuar com os outros dias mesmo se um falhar
                }
            }

            alert(`✅ Preenchimento concluído!\n\n${diasPreenchidos} de ${diasVazios.length} dias foram preenchidos com sucesso.\n\nCada dia foi preenchido com 4 pontos:\n- Entrada manhã: ${horarios.entradaManha}\n- Saída manhã: ${horarios.saidaManha}\n- Entrada tarde: ${horarios.entradaTarde}\n- Saída tarde: ${horarios.saidaTarde}`);

            // 5. Recarregar dados da grade para mostrar as alterações
            if (viewMode === 'grade') {
                carregarDadosGrade();
            }

            // 6. Fechar modal
            setAutoFillDialogOpen(false);
            setFuncionarioSelecionadoAutoFill('');

        } catch (err) {
            console.error('Erro ao preencher pontos em falta:', err);
            alert(`Erro ao preencher pontos: ${err.message}`);
        } finally {
            setLoadingAutoFill(false);
        }
    };

    const eliminarPontosEmBloco = async () => {
        if (selectedCells.length === 0) {
            return alert('Nenhuma célula selecionada.');
        }

        // Agrupar células por utilizador para mostrar um resumo melhor
        const cellsByUser = groupCellsByUser(selectedCells);

        // Criar mensagem de confirmação detalhada
        let mensagemConfirmacao = `⚠️ ATENÇÃO: Esta ação irá eliminar TODOS os registos de ponto dos dias selecionados:\n\n`;

        Object.entries(cellsByUser).forEach(([userId, dias]) => {
            const funcionario = dadosGrade.find(item => item.utilizador.id === parseInt(userId, 10));
            if (funcionario) {
                mensagemConfirmacao += `• ${funcionario.utilizador.nome}: dias ${dias.join(', ')}\n`;
            }
        });

        mensagemConfirmacao += `\nTotal de ${selectedCells.length} seleções.\n\nEsta ação NÃO pode ser desfeita!\n\nTem certeza que pretende continuar?`;

        const confirmacao = confirm(mensagemConfirmacao);
        if (!confirmacao) return;

        // Segunda confirmação para segurança
        const segundaConfirmacao = confirm(`🔥 ÚLTIMA CONFIRMAÇÃO:\n\nVai eliminar registos de ${selectedCells.length} dias selecionados.\n\nEscreva "ELIMINAR" na próxima caixa de diálogo para prosseguir.`);
        if (!segundaConfirmacao) return;

        const textoConfirmacao = prompt('Digite "ELIMINAR" (sem aspas) para confirmar a eliminação:');
        if (textoConfirmacao !== 'ELIMINAR') {
            alert('Operação cancelada. Texto de confirmação incorreto.');
            return;
        }

        setLoadingBulkDelete(true);

        try {
            let totalEliminados = 0;
            let totalErros = 0;

            for (const cellKey of selectedCells) {
                try {
                    const [userId, dia] = cellKey.split('-');
                    const userIdNumber = parseInt(userId, 10);
                    const diaNumber = parseInt(dia, 10);

                    if (!userIdNumber || isNaN(userIdNumber)) {
                        console.error(`[ERROR] userId inválido para célula ${cellKey}: ${userId}`);
                        totalErros++;
                        continue;
                    }

                    const dataFormatada = formatDate(anoSelecionado, mesSelecionado, diaNumber);

                    // Buscar registos do dia específico usando o user_id diretamente
                    let query = `user_id=${userIdNumber}&data=${dataFormatada}`;
                    if (obraSelecionada) query += `&obra_id=${obraSelecionada}`;

                    let registosParaEliminar;
                    try {
                        registosParaEliminar = await API.listarRegistosPorUserPeriodo(token, query);
                    } catch (err) {
                        console.error(`Erro ao obter registos para eliminação do dia ${dia} do utilizador ${userId}:`, err);
                        totalErros++;
                        continue;
                    }

                    // Eliminar cada registo individualmente
                    for (const registo of registosParaEliminar) {
                        try {
                            try {
                                await API.eliminarRegistoPonto(token, registo.id);
                                totalEliminados++;
                            } catch (err) {
                                console.error(`Erro ao eliminar registo ${registo.id}:`, err);
                                totalErros++;
                            }

                        } catch (registoErr) {
                            console.error(`Erro ao eliminar registo ${registo.id}:`, registoErr);
                            totalErros++;
                        }
                    }

                    // Pequena pausa para não sobrecarregar o servidor
                    if (selectedCells.length > 3) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                } catch (cellErr) {
                    console.error(`Erro ao processar célula ${cellKey}:`, cellErr);
                    totalErros++;
                }
            }

            // Mostrar resultado da operação
            let mensagemResultado = `✅ Eliminação em bloco concluída!\n\n`;
            mensagemResultado += `• Registos eliminados: ${totalEliminados}\n`;
            if (totalErros > 0) {
                mensagemResultado += `• Erros encontrados: ${totalErros}\n`;
                mensagemResultado += `• Verifique o console para detalhes dos erros\n`;
            }
            mensagemResultado += `\nTodos os registos selecionados foram processados.`;

            alert(mensagemResultado);

            // Limpar seleções e recarregar dados
            setSelectedCells([]);
            setBulkDeleteDialogOpen(false);

            if (viewMode === 'grade') {
                carregarDadosGrade();
            }

        } catch (err) {
            console.error('Erro na eliminação em bloco:', err);
            alert(`Erro na eliminação em bloco: ${err.message}`);
        } finally {
            setLoadingBulkDelete(false);
        }
    };

    const abrirEdicaoDirecta = async (userId, dia, utilizadorNome) => {
        if (!anoSelecionado || !mesSelecionado) {
            alert('Por favor, selecione o ano e mês para editar.');
            return;
        }

        try {
            const dataFormatada = formatDate(anoSelecionado, mesSelecionado, dia);

            // Buscar TODOS os registos existentes para este dia (sem filtro de obra)
            let query = `user_id=${userId}&data=${dataFormatada}`;

            const registos = await API.listarRegistosPorUserPeriodo(token, query);

            // Criar um registo "virtual" que representa o dia completo com todos os registos
            const registoVirtual = {
                id: registos.length > 0 ? `edit_${userId}_${dia}` : `novo_${userId}_${dia}`,
                data: dataFormatada,
                utilizador: utilizadorNome,
                utilizadorId: userId,
                dia: dia,
                registosOriginais: registos || []
            };

            setRegistoParaEditar(registoVirtual);
            setDadosEdicao({
                userId: parseInt(userId, 10),
                dia: parseInt(dia, 10),
                registos: registos || []
            });

            setEditModalOpen(true);
        } catch (err) {
            console.error('Erro ao abrir edição direta:', err);
            alert('Erro ao abrir edição direta: ' + err.message);
        }
    };

    // Função para salvar edição direta
    const salvarEdicaoDirecta = async (dadosEditados) => {
        try {
            const { userId, dia } = dadosEdicao;
            const dataFormatada = formatDate(anoSelecionado, mesSelecionado, dia);

            // Se há registos originais, eliminar todos primeiro
            if (dadosEdicao.registos.length > 0) {
                for (const registo of dadosEdicao.registos) {
                    try {
                        await API.eliminarRegistoPonto(token, registo.id);
                    } catch (err) {
                        console.warn(`Erro ao eliminar registo ${registo.id}:`, err);
                    }
                }
            }

            // Processar registos editados do modal
            const registosEditados = dadosEditados.registosEditados || [];
            let registosCriados = 0;
            let erros = [];

            for (const registoEditado of registosEditados) {
                if (registoEditado.hora && registoEditado.tipo && registoEditado.obraId) {
                    const timestamp = createTimestamp(dataFormatada, registoEditado.hora);

                    try {
                        const ponto = await API.registarPontoEsquecido(token, {
                            tipo: registoEditado.tipo,
                            obra_id: Number(registoEditado.obraId),
                            user_id: Number(userId),
                            timestamp: timestamp
                        });

                        // Confirmar automaticamente
                        await API.confirmarPonto(token, ponto.id);
                        registosCriados++;
                    } catch (err) {
                        console.error(`Erro ao criar registo ${registoEditado.tipo}:`, err);
                        erros.push(`Erro ao criar registo ${registoEditado.tipo}: ${err.message}`);
                    }
                } else if (registoEditado.hora && registoEditado.tipo && !registoEditado.obraId) {
                    erros.push(`Registo ${registoEditado.tipo} às ${registoEditado.hora}: obra não especificada`);
                }
            }

            if (registosCriados > 0) {
                let mensagem = `${registosCriados} registos editados e integrados com sucesso!`;
                if (erros.length > 0) {
                    mensagem += `\n\nErros encontrados:\n${erros.join('\n')}`;
                }
                alert(mensagem);
            } else {
                if (erros.length > 0) {
                    alert(`Nenhum registo foi criado devido aos seguintes erros:\n${erros.join('\n')}`);
                } else {
                    alert('Nenhum registo foi criado. Verifique se preencheu as horas e obras corretamente.');
                }
            }

            setEditModalOpen(false);
            setRegistoParaEditar(null);
            setDadosEdicao({ userId: null, dia: null, registos: [] });

            // Atualizar apenas o utilizador afetado na grade
            if (viewMode === 'grade' && userId) {
                await atualizarUtilizadorNaGrade(userId);
            }

        } catch (err) {
            console.error('Erro ao salvar edição direta:', err);
            alert(`Erro ao salvar edição: ${err.message}`);
        }
    };

    const registarHoraExtra = async () => {
        if (!userToRegistar || !diaToRegistar || !tipoHoraExtraSelecionado || !tempoHoraExtra) {
            return alert('Por favor, preencha todos os campos para registar a hora extra.');
        }

        const token = secureStorage.getItem('loginToken');
        const painelToken = secureStorage.getItem('painelAdminToken');
        const urlempresa = secureStorage.getItem('urlempresa');

        const funcionarioId = await obterCodFuncionario(userToRegistar);

        if (!funcionarioId) {
            return alert('Não foi possível encontrar o código do funcionário.');
        }

        try {
            setLoadingHoraExtra(true);

            const dataFormatada = formatDate(anoSelecionado, mesSelecionado, diaToRegistar);

            const dadosERP = {
                Funcionario: funcionarioId,
                Data: new Date(dataFormatada).toISOString(),
                HoraExtra: tipoHoraExtraSelecionado,
                Tempo: parseFloat(tempoHoraExtra),
                Observacoes: observacoesHoraExtra || 'Registado via interface de administração'
            };

            await API.inserirHoraExtraPrimavera(painelToken, urlempresa, dadosERP);
            alert('✅ Hora extra registada com sucesso!');

            setHoraExtraDialogOpen(false);
            setDialogOpen(false);
            setTipoHoraExtraSelecionado('');
            setTempoHoraExtra('');
            setObservacoesHoraExtra('');

            if (viewMode === 'grade' && userToRegistar) {
                await atualizarUtilizadorNaGrade(userToRegistar);
            }

        } catch (err) {
            console.error('❌ Erro ao submeter hora extra:', err);
            alert('Erro ao registar hora extra: ' + err.message);
        } finally {
            setLoadingHoraExtra(false);
        }
    };

    const registarFalta = async () => {
        if (!userToRegistar || !diaToRegistar || !tipoFaltaSelecionado || !duracaoFalta) {
            return alert('Por favor, preencha todos os campos para registar a falta.');
        }

        if (faltaIntervalo && !dataFimFalta) {
            return alert('Por favor, selecione a data de fim do intervalo.');
        }

        const token = secureStorage.getItem('loginToken');
        const painelToken = secureStorage.getItem('painelAdminToken');
        const urlempresa = secureStorage.getItem('urlempresa');

        // Obter o codFuncionario através do endpoint
        const funcionarioId = await obterCodFuncionario(userToRegistar);

        if (!funcionarioId) {
            return alert('Não foi possível encontrar o código do funcionário.');
        }

        // Determinar se é por horas baseado na duração
        const isHoras = duracaoFalta && duracaoFalta.toString().includes('h');
        const tempoNumerico = parseInt(duracaoFalta) || 1;

        // Criar lista de datas a processar
        const datasParaProcessar = [];

        if (faltaIntervalo && dataFimFalta) {
            // Calcular todas as datas no intervalo
            const dataInicio = new Date(`${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(diaToRegistar).padStart(2, '0')}`);
            const dataFim = new Date(dataFimFalta);

            if (dataFim < dataInicio) {
                return alert('A data de fim deve ser posterior à data de início.');
            }

            let dataAtual = new Date(dataInicio);
            while (dataAtual <= dataFim) {
                const dia = dataAtual.getDate();
                const mes = dataAtual.getMonth() + 1;
                const ano = dataAtual.getFullYear();
                datasParaProcessar.push(`${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`);
                dataAtual.setDate(dataAtual.getDate() + 1);
            }

            // Confirmação adicional para intervalos
            const confirmacao = confirm(
                `⚠️ Vai registar a falta "${tiposFaltas[tipoFaltaSelecionado] || tipoFaltaSelecionado}" para ${datasParaProcessar.length} dias.\n\n` +
                `De: ${new Date(dataInicio).toLocaleDateString('pt-PT')}\n` +
                `Até: ${new Date(dataFim).toLocaleDateString('pt-PT')}\n\n` +
                `Deseja continuar?`
            );

            if (!confirmacao) {
                return;
            }
        } else {
            // Apenas uma data
            datasParaProcessar.push(`${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(diaToRegistar).padStart(2, '0')}`);
        }

        // Carregar dados completos do tipo de falta do ERP
        let faltaSelecionadaCompleta = null;
        try {
            const dataFaltasERP = await API.buscarTiposFaltas(painelToken, urlempresa);
            const listaFaltasERP = dataFaltasERP?.DataSet?.Table ?? [];
            faltaSelecionadaCompleta = listaFaltasERP.find(f => f.Falta === tipoFaltaSelecionado);
        } catch (err) {
            console.error('Erro ao carregar dados completos da falta:', err);
        }

        const descontaAlimentacao = faltaSelecionadaCompleta && 
            (faltaSelecionadaCompleta.DescontaSubsAlim === 1 || 
             faltaSelecionadaCompleta.DescontaSubsAlim === '1' ||
             faltaSelecionadaCompleta.DescontaSubsAlim === true);

        try {
            setLoadingFalta(true);

            let faltasRegistadas = 0;
            let faltasF40Registadas = 0;
            let erros = 0;

            // Processar cada data
            for (const dataAtualFormatada of datasParaProcessar) {
                try {
                    // Verificar se é fim de semana ANTES de criar o payload
                    const dataObj = new Date(dataAtualFormatada);
                    const diaSemana = dataObj.getDay();
                    const isFimDeSemana = diaSemana === 0 || diaSemana === 6;

                    // 1. Integrar diretamente no ERP (sem pedido intermédio)
                    if (painelToken && urlempresa) {
                        const dadosERP = {
                            Funcionario: funcionarioId,
                            Data: new Date(dataAtualFormatada).toISOString(),
                            Falta: tipoFaltaSelecionado,
                            Horas: isHoras ? 1 : 0,
                            Tempo: tempoNumerico,
                            DescontaVenc: 0,
                            DescontaRem: 0,
                            ExcluiProc: 0,
                            ExcluiEstat: 0,
                            Observacoes: faltaIntervalo ? 'Registado via interface de administração (intervalo)' : 'Registado via interface de administração',
                            CalculoFalta: 1,
                            DescontaSubsAlim: (descontaAlimentacao && !isFimDeSemana) ? 1 : 0,
                            DataProc: null,
                            NumPeriodoProcessado: 0,
                            JaProcessado: 0,
                            InseridoBloco: 0,
                            ValorDescontado: 0,
                            AnoProcessado: 0,
                            NumProc: 0,
                            Origem: "2",
                            PlanoCurso: null,
                            IdGDOC: null,
                            CambioMBase: 0,
                            CambioMAlt: 0,
                            CotizaPeloMinimo: 0,
                            Acerto: 0,
                            MotivoAcerto: null,
                            NumLinhaDespesa: null,
                            NumRelatorioDespesa: null,
                            FuncComplementosBaixaId: null,
                            DescontaSubsTurno: 0,
                            SubTurnoProporcional: 0,
                            SubAlimProporcional: 0
                        };

                        const resultado = await inserirFaltaComTratamentoErros(painelToken, urlempresa, dadosERP);

                        if (resultado.success) {
                            faltasRegistadas++;

                            // Criar F40 automaticamente se necessário
                            const resultadoF40 = await criarF40SeNecessario(
                                painelToken,
                                urlempresa,
                                funcionarioId,
                                dataAtualFormatada,
                                descontaAlimentacao,
                                isFimDeSemana
                            );
                            if (resultadoF40.success) faltasF40Registadas++;
                        } else {
                            // Falta falhou - lançar erro com mensagem amigável
                            throw new Error(`${resultado.errorMessage}\n${resultado.errorSuggestion || ''}`);
                        }

                        // Pequena pausa entre cada registo
                        if (datasParaProcessar.length > 1) {
                            await new Promise(resolve => setTimeout(resolve, 150));
                        }
                    } else {
                        throw new Error('Tokens do Primavera não encontrados. Configure o acesso ao ERP.');
                    }
                } catch (dataErr) {
                    console.error(`Erro ao processar data ${dataAtualFormatada}:`, dataErr);
                    erros++;
                }
            }

            // Mostrar resultado
            let mensagemResultado = '';

            if (erros === 0) {
                mensagemResultado = `✅ Registo de falta${datasParaProcessar.length > 1 ? 's' : ''} concluído com sucesso!\n\n`;
            } else if (faltasRegistadas > 0) {
                mensagemResultado = `⚠️ Registo de falta${datasParaProcessar.length > 1 ? 's' : ''} concluído com alertas\n\n`;
            } else {
                mensagemResultado = `❌ Falha no registo de falta${datasParaProcessar.length > 1 ? 's' : ''}\n\n`;
            }

            mensagemResultado += `• Faltas registadas: ${faltasRegistadas} de ${datasParaProcessar.length}\n`;
            if (faltasF40Registadas > 0) {
                mensagemResultado += `• Faltas F40 automáticas criadas: ${faltasF40Registadas}\n`;
            }
            if (erros > 0) {
                mensagemResultado += `• Erros encontrados: ${erros}\n`;
                mensagemResultado += `\nConsulte o console do browser para mais detalhes sobre os erros.\n`;
            }

            alert(mensagemResultado);

            // Resetar formulários
            setFaltaDialogOpen(false);
            setDialogOpen(false);
            setTipoFaltaSelecionado('');
            setDuracaoFalta('');
            setFaltaIntervalo(false);
            setDataFimFalta('');

            // Atualizar apenas o utilizador afetado na grade
            if (viewMode === 'grade' && userToRegistar) {
                await atualizarUtilizadorNaGrade(userToRegistar);
            }

        } catch (err) {
            console.error('❌ Erro ao submeter falta:', err);
            alert('Erro ao registar falta: ' + err.message);
        } finally {
            setLoadingFalta(false);
        }
    };

    const registarHorasExtrasEmBloco = async () => {
        if (selectedCells.length === 0) {
            return alert('Nenhuma célula selecionada.');
        }

        if (!tipoHoraExtraSelecionadoBulk || !tempoHoraExtraBulk) {
            return alert('Por favor, selecione o tipo de hora extra e o tempo.');
        }

        const painelToken = secureStorage.getItem('painelAdminToken');
        const urlempresa = secureStorage.getItem('urlempresa');

        if (!painelToken || !urlempresa) {
            return alert('Tokens do Primavera não encontrados. Configure o acesso ao ERP.');
        }

        const cellsByUser = groupCellsByUser(selectedCells);

        let mensagemConfirmacao = `📅 Vai registar horas extras para:\n\n`;

        for (const [userId, dias] of Object.entries(cellsByUser)) {
            const funcionario = dadosGrade.find(item => item.utilizador.id === parseInt(userId, 10));
            if (funcionario) {
                mensagemConfirmacao += `• ${funcionario.utilizador.nome}: dias ${dias.join(', ')}\n`;
            }
        }

        mensagemConfirmacao += `\nTipo de hora extra: ${tiposHorasExtras[tipoHoraExtraSelecionadoBulk] || tipoHoraExtraSelecionadoBulk}\n`;
        mensagemConfirmacao += `Tempo: ${tempoHoraExtraBulk} hora(s)\n`;
        mensagemConfirmacao += `\nTotal: ${selectedCells.length} horas extras\n\nDeseja continuar?`;

        const confirmacao = confirm(mensagemConfirmacao);
        if (!confirmacao) return;

        setLoadingBulkHoraExtra(true);

        try {
            let horasExtrasRegistadas = 0;
            let erros = 0;

            for (const [userId, dias] of Object.entries(cellsByUser)) {
                const userIdNumber = parseInt(userId, 10);
                const funcionarioId = await obterCodFuncionario(userIdNumber);

                if (!funcionarioId) {
                    console.error(`Código do funcionário não encontrado para userId ${userIdNumber}`);
                    erros += dias.length;
                    continue;
                }

                for (const dia of dias) {
                    try {
                        const dataFormatada = formatDate(anoSelecionado, mesSelecionado, dia);

                        const dadosERP = {
                            Funcionario: funcionarioId,
                            Data: new Date(dataFormatada).toISOString(),
                            HoraExtra: tipoHoraExtraSelecionadoBulk,
                            Tempo: parseFloat(tempoHoraExtraBulk),
                            Observacoes: 'Registado em bloco via interface de administração'
                        };

                        await API.inserirHoraExtraPrimavera(painelToken, urlempresa, dadosERP);
                        horasExtrasRegistadas++;

                        await new Promise(resolve => setTimeout(resolve, 150));

                    } catch (diaErr) {
                        console.error(`Erro ao processar dia ${dia}:`, diaErr);
                        erros++;
                    }
                }
            }

            let mensagemResultado = `✅ Registo de horas extras em bloco concluído!\n\n`;
            mensagemResultado += `• Horas extras registadas: ${horasExtrasRegistadas}\n`;
            if (erros > 0) {
                mensagemResultado += `• Erros encontrados: ${erros}\n`;
                mensagemResultado += `• Verifique o console para detalhes dos erros\n`;
            }

            alert(mensagemResultado);

            setSelectedCells([]);
            setBulkHoraExtraDialogOpen(false);
            setTipoHoraExtraSelecionadoBulk('');
            setTempoHoraExtraBulk('');

            if (viewMode === 'grade') {
                carregarDadosGrade();
            }

        } catch (err) {
            console.error('Erro ao registar horas extras em bloco:', err);
            alert(`Erro ao registar horas extras em bloco: ${err.message}`);
        } finally {
            setLoadingBulkHoraExtra(false);
        }
    };

    const registarFaltasEmBloco = async () => {
        if (selectedCells.length === 0) {
            return alert('Nenhuma célula selecionada.');
        }

        if (!tipoFaltaSelecionadoBulk || !duracaoFaltaBulk) {
            return alert('Por favor, selecione o tipo de falta e a duração.');
        }

        const painelToken = secureStorage.getItem('painelAdminToken');
        const urlempresa = secureStorage.getItem('urlempresa');
        const empresaId = secureStorage.getItem('empresa_id');

        if (!painelToken || !urlempresa) {
            return alert('Tokens do Primavera não encontrados. Configure o acesso ao ERP.');
        }

        // Carregar dados completos do tipo de falta do ERP
        let faltaSelecionadaCompleta = null;
        try {
            const dataFaltasERP = await API.buscarTiposFaltas(painelToken, urlempresa);
            const listaFaltasERP = dataFaltasERP?.DataSet?.Table ?? [];
            faltaSelecionadaCompleta = listaFaltasERP.find(f => f.Falta === tipoFaltaSelecionadoBulk);
        } catch (err) {
            console.error('Erro ao carregar dados completos da falta:', err);
        }

        const descontaAlimentacao = faltaSelecionadaCompleta && 
            (faltaSelecionadaCompleta.DescontaSubsAlim === 1 || 
             faltaSelecionadaCompleta.DescontaSubsAlim === '1' ||
             faltaSelecionadaCompleta.DescontaSubsAlim === true);

        // Agrupar células por utilizador
        const cellsByUser = groupCellsByUser(selectedCells);

        // Criar mensagem de confirmação
        let mensagemConfirmacao = `📅 Vai registar faltas para:\n\n`;

        for (const [userId, dias] of Object.entries(cellsByUser)) {
            const funcionario = dadosGrade.find(item => item.utilizador.id === parseInt(userId, 10));
            if (funcionario) {
                mensagemConfirmacao += `• ${funcionario.utilizador.nome}: dias ${dias.join(', ')}\n`;
            }
        }

        mensagemConfirmacao += `\nTipo de falta: ${tiposFaltas[tipoFaltaSelecionadoBulk] || tipoFaltaSelecionadoBulk}\n`;
        mensagemConfirmacao += `Duração: ${duracaoFaltaBulk}\n`;
        if (descontaAlimentacao) {
            mensagemConfirmacao += `\n⚠️ Nota: Esta falta desconta alimentação, será criada automaticamente uma falta F40 para cada dia útil (exceto fins de semana).\n`;
        }
        mensagemConfirmacao += `\nTotal: ${selectedCells.length} faltas\n\nDeseja continuar?`;

        const confirmacao = confirm(mensagemConfirmacao);
        if (!confirmacao) return;

        setLoadingBulkFalta(true);

        try {
            const isHoras = duracaoFaltaBulk && duracaoFaltaBulk.toString().includes('h');
            const tempoNumerico = parseInt(duracaoFaltaBulk) || 1;

            let faltasRegistadas = 0;
            let faltasF40Registadas = 0;
            let erros = 0;
            let errosPrimavera = [];

            // Processar cada utilizador separadamente
            for (const [userId, dias] of Object.entries(cellsByUser)) {
                const userIdNumber = parseInt(userId, 10);

                // Obter codFuncionario uma vez por utilizador
                const funcionarioId = await obterCodFuncionario(userIdNumber);

                if (!funcionarioId) {
                    console.error(`Código do funcionário não encontrado para userId ${userIdNumber}`);
                    erros += dias.length;
                    errosPrimavera.push(`Funcionário ID ${userIdNumber}: código não encontrado no sistema`);
                    continue;
                }

                // Registar falta para cada dia deste utilizador
                for (const dia of dias) {
                    try {
                        const dataFormatada = formatDate(anoSelecionado, mesSelecionado, dia);

                        // Verificar se é fim de semana
                        const dataObj = new Date(dataFormatada);
                        const diaSemana = dataObj.getDay();
                        const isFimDeSemana = diaSemana === 0 || diaSemana === 6;

                        const dadosERP = {
                            Funcionario: funcionarioId,
                            Data: new Date(dataFormatada).toISOString(),
                            Falta: tipoFaltaSelecionadoBulk,
                            Horas: isHoras ? 1 : 0,
                            Tempo: tempoNumerico,
                            DescontaVenc: 0,
                            DescontaRem: 0,
                            ExcluiProc: 0,
                            ExcluiEstat: 0,
                            Observacoes: 'Registado em bloco via interface de administração',
                            CalculoFalta: 1,
                            DescontaSubsAlim: (descontaAlimentacao && !isFimDeSemana) ? 1 : 0,
                            DataProc: null,
                            NumPeriodoProcessado: 0,
                            JaProcessado: 0,
                            InseridoBloco: 0,
                            ValorDescontado: 0,
                            AnoProcessado: 0,
                            NumProc: 0,
                            Origem: "2",
                            PlanoCurso: null,
                            IdGDOC: null,
                            CambioMBase: 0,
                            CambioMAlt: 0,
                            CotizaPeloMinimo: 0,
                            Acerto: 0,
                            MotivoAcerto: null,
                            NumLinhaDespesa: null,
                            NumRelatorioDespesa: null,
                            FuncComplementosBaixaId: null,
                            DescontaSubsTurno: 0,
                            SubTurnoProporcional: 0,
                            SubAlimProporcional: 0
                        };

                        const resultado = await inserirFaltaComTratamentoErros(painelToken, urlempresa, dadosERP);

                        if (resultado.success) {
                            faltasRegistadas++;

                            // Criar F40 automaticamente se necessário
                            const resultadoF40 = await criarF40SeNecessario(
                                painelToken,
                                urlempresa,
                                funcionarioId,
                                dataFormatada,
                                descontaAlimentacao,
                                isFimDeSemana
                            );
                            if (resultadoF40.success) faltasF40Registadas++;
                        } else {
                            erros++;
                            errosPrimavera.push(`Dia ${dia}: ${resultado.errorMessage}`);
                        }

                        // Pequena pausa entre cada registo
                        await new Promise(resolve => setTimeout(resolve, 150));

                    } catch (diaErr) {
                        console.error(`Erro ao processar dia ${dia}:`, diaErr);
                        erros++;
                        errosPrimavera.push(`Dia ${dia}: ${diaErr.message}`);
                    }
                }
            }

            // Mostrar resultado
            let mensagemResultado = '';

            if (erros === 0) {
                mensagemResultado = `✅ Registo de faltas em bloco concluído com sucesso!\n\n`;
            } else if (faltasRegistadas > 0) {
                mensagemResultado = `⚠️ Registo de faltas em bloco concluído com alertas\n\n`;
            } else {
                mensagemResultado = `❌ Falha no registo de faltas em bloco\n\n`;
            }

            mensagemResultado += `• Faltas registadas: ${faltasRegistadas} de ${selectedCells.length}\n`;
            if (faltasF40Registadas > 0) {
                mensagemResultado += `• Faltas F40 automáticas criadas: ${faltasF40Registadas}\n`;
            }
            if (erros > 0) {
                mensagemResultado += `• Erros encontrados: ${erros}\n\n`;

                if (errosPrimavera.length > 0) {
                    mensagemResultado += `Detalhes dos erros:\n`;
                    // Mostrar apenas os primeiros 5 erros para não sobrecarregar o alert
                    const errosParaMostrar = errosPrimavera.slice(0, 5);
                    errosParaMostrar.forEach(erro => {
                        mensagemResultado += `• ${erro}\n`;
                    });
                    if (errosPrimavera.length > 5) {
                        mensagemResultado += `\n... e mais ${errosPrimavera.length - 5} erros (consulte o console)\n`;
                    }
                }
            }

            alert(mensagemResultado);

            // Limpar seleções e fechar modal
            setSelectedCells([]);
            setBulkFaltaDialogOpen(false);
            setTipoFaltaSelecionadoBulk('');
            setDuracaoFaltaBulk('');

            // Recarregar dados da grade
            if (viewMode === 'grade') {
                carregarDadosGrade();
            }

        } catch (err) {
            console.error('Erro ao registar faltas em bloco:', err);
            alert(`Erro ao registar faltas em bloco: ${err.message}`);
        } finally {
            setLoadingBulkFalta(false);
        }
    };


    // Mostrar erro de inicialização se houver
    if (initError) {
        return (
            <div style={styles.container}>
                <div style={{
                    ...styles.loadingCard,
                    backgroundColor: '#fed7d7',
                    border: '2px solid #fc8181',
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
                    <h2 style={{ color: '#742a2a', marginBottom: '20px' }}>Erro ao Carregar Página</h2>
                    <p style={{ color: '#742a2a', marginBottom: '30px', fontSize: '1.1rem' }}>
                        {initError}
                    </p>
                    <button
                        style={{
                            ...styles.primaryButton,
                            backgroundColor: '#e53e3e',
                            fontSize: '1.1rem',
                            padding: '15px 30px'
                        }}
                        onClick={() => window.location.reload()}
                    >
                        🔄 Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    // Mostrar loading enquanto inicializa
    if (!isInitialized) {
        return (
            <div style={styles.container}>
                <div style={{
                    ...styles.loadingCard,
                    padding: '60px',
                    textAlign: 'center'
                }}>
                    <div style={styles.spinner}></div>
                    <h2 style={{ marginTop: '30px', color: '#2d3748' }}>A carregar dados essenciais...</h2>
                    <p style={{ color: '#718096', marginTop: '15px', fontSize: '1rem' }}>
                        A validar ligação ao ERP e carregar tipos de faltas...
                    </p>
                    <div style={{
                        marginTop: '30px',
                        padding: '20px',
                        backgroundColor: '#e6fffa',
                        borderRadius: '12px',
                        border: '1px solid #81e6d9'
                    }}>
                        <div style={{ fontSize: '0.9rem', color: '#234e52', lineHeight: '1.8' }}>
                            <div>✓ A verificar tokens de autenticação...</div>
                            <div>✓ A carregar utilizadores...</div>
                            <div>✓ A carregar obras...</div>
                            <div>✓ A validar tipos de faltas do ERP...</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>
                    <span style={styles.icon}>👥</span>
                    Registos de Ponto - Análise Completa
                </h1>
                <p style={styles.subtitle}>Vista compacta, grade mensal e detalhes expandíveis</p>
            </div>

            {/* ✨ Navigation Tabs - Componente Otimizado */}
            <NavigationTabs
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                utilizadorDetalhado={utilizadorDetalhado}
                onBolsaHorasClick={calcularBolsaHoras}
                styles={styles}
            />

            {/* ✨ Filtros - Componente Otimizado */}
            <FiltrosPanel
                obraSelecionada={obraSelecionada}
                utilizadorSelecionado={utilizadorSelecionado}
                mesSelecionado={mesSelecionado}
                anoSelecionado={anoSelecionado}
                dataSelecionada={dataSelecionada}
                obras={obras}
                utilizadores={utilizadores}
                onObraChange={setObraSelecionada}
                onUtilizadorChange={setUtilizadorSelecionado}
                onMesChange={setMesSelecionado}
                onAnoChange={setAnoSelecionado}
                onDataChange={setDataSelecionada}
                styles={styles}
            />

            {/* Botões de Ação */}
            <div style={styles.filtersCard}>

                <div style={{
                    ...styles.actionButtons,
                    gap: '8px',
                    marginTop: '12px'
                }}>
                    {viewMode === 'resumo' && (
                        <>
                            <button
                                style={{
                                    ...styles.primaryButton,
                                    padding: '8px 14px',
                                    fontSize: '0.85rem'
                                }}
                                onClick={carregarResumoUtilizadores}
                                disabled={loading}
                            >
                                {loading ? '🔄 Carregar...' : '🔍 Resumo'}
                            </button>

                            {resumoUtilizadores.length > 0 && (
                                <button
                                    style={{
                                        ...styles.exportButton,
                                        padding: '8px 14px',
                                        fontSize: '0.85rem'
                                    }}
                                    onClick={exportarResumo}
                                >
                                    📊 Exportar
                                </button>
                            )}
                        </>
                    )}


                    {viewMode === 'grade' && (
                        <>
                            <ActionBar
                                onCarregarGrade={carregarDadosGrade}
                                onExportarGrade={exportarGrade}
                                onRegistoBloco={() => setBulkDialogOpen(true)}
                                onFaltasBloco={() => setBulkFaltaDialogOpen(true)}
                                onHorasExtrasBloco={() => setBulkHoraExtraDialogOpen(true)}
                                onEliminarBloco={() => setBulkDeleteDialogOpen(true)}
                                onAutoPreencher={() => {
                                    setObraNoDialog(obraSelecionada || '');
                                    setAutoFillDialogOpen(true);
                                }}
                                onNovaFalta={() => {
                                    const primeiroFuncionario = dadosGrade[0];
                                    if (primeiroFuncionario) {
                                        setUserToRegistar(primeiroFuncionario.utilizador.id);
                                        setDiaToRegistar(1);
                                        setObraNoDialog(obraSelecionada || '');
                                        setFaltaIntervalo(false);
                                        setDataFimFalta('');
                                        setTipoFaltaSelecionado('');
                                        setDuracaoFalta('');
                                        setFaltaDialogOpen(true);
                                    }
                                }}
                                onNovaHoraExtra={() => {
                                    const primeiroFuncionario = dadosGrade[0];
                                    if (primeiroFuncionario) {
                                        setUserToRegistar(primeiroFuncionario.utilizador.id);
                                        setDiaToRegistar(1);
                                        setTipoHoraExtraSelecionado('');
                                        setTempoHoraExtra('');
                                        setObservacoesHoraExtra('');
                                        setHoraExtraDialogOpen(true);
                                    }
                                }}
                                onLimparDia={() => setClearPointsDialogOpen(true)}
                                loadingGrade={loadingGrade}
                                anoSelecionado={anoSelecionado}
                                mesSelecionado={mesSelecionado}
                                temDadosGrade={dadosGrade.length > 0}
                                selectedCellsCount={selectedCells.length}
                            />

                            <ModalBase
                                isOpen={bulkDialogOpen}
                                onClose={() => setBulkDialogOpen(false)}
                                title="🗓️ Registar Pontos em Bloco"
                                subtitle={`Registando para ${selectedCells.length} seleções`}
                                size="large"
                                styles={styles}
                                footer={
                                    <>
                                        <button
                                            style={styles.cancelButton}
                                            onClick={() => setBulkDialogOpen(false)}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            style={styles.confirmButton}
                                            onClick={handleBulkConfirm}
                                            disabled={!obraNoDialog}
                                        >
                                            ✅ Confirmar Registo em Bloco
                                        </button>
                                    </>
                                }
                            >
                                            <div style={styles.selectedCellsContainer}>
                                                <span style={styles.selectedCellsLabel}>Células selecionadas:</span>
                                                <div style={styles.selectedCellsList}>
                                                    {selectedCells.map((cell, index) => (
                                                        <span key={index} style={styles.selectedCell}>
                                                            {cell}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <HorariosInput horarios={horarios} onChange={setHorarios} />

                                            <ObraSelector
                                                value={obraNoDialog}
                                                onChange={setObraNoDialog}
                                                obras={obras}
                                                label="🏗️ Selecionar Obra"
                                            />
                            </ModalBase>

                            {/* Modal para eliminação em bloco */}
                            <ModalBase
                                isOpen={bulkDeleteDialogOpen}
                                onClose={() => setBulkDeleteDialogOpen(false)}
                                title="🗑️ Eliminar Pontos em Bloco"
                                subtitle={`Eliminando registos de ${selectedCells.length} seleções`}
                                size="large"
                                headerColor="linear-gradient(135deg, #e53e3e, #c53030)"
                                styles={styles}
                                footer={
                                    <>
                                        <button
                                            style={styles.cancelButton}
                                            onClick={() => setBulkDeleteDialogOpen(false)}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            style={{ ...styles.confirmButton, backgroundColor: '#e53e3e' }}
                                            onClick={eliminarPontosEmBloco}
                                            disabled={loadingBulkDelete}
                                        >
                                            {loadingBulkDelete ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    A eliminar...
                                                </>
                                            ) : (
                                                '🗑️ Confirmar Eliminação'
                                            )}
                                        </button>
                                    </>
                                }
                            >
                                            <div style={{
                                                ...styles.selectedCellsContainer,
                                                backgroundColor: '#fed7d7',
                                                border: '1px solid #fc8181'
                                            }}>
                                                <div style={{ fontSize: '0.9rem', color: '#742a2a' }}>
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <strong>⚠️ ATENÇÃO:</strong>
                                                    </div>
                                                    <div style={{ marginBottom: '10px' }}>
                                                        Esta operação irá <strong>eliminar permanentemente</strong> todos os registos de ponto dos dias selecionados.
                                                    </div>
                                                    <div style={{ marginTop: '15px', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                                        Esta ação <strong>NÃO pode ser desfeita</strong>!
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={styles.selectedCellsContainer}>
                                                <span style={styles.selectedCellsLabel}>Dias selecionados para eliminação:</span>

                                                {(() => {
                                                    // Agrupar por utilizador para mostrar organizadamente
                                                    const cellsByUser = groupCellsByUser(selectedCells);

                                                    return Object.entries(cellsByUser).map(([userId, dias]) => {
                                                        const funcionario = dadosGrade.find(item => item.utilizador.id === parseInt(userId, 10));
                                                        if (!funcionario) return null;

                                                        return (
                                                            <div key={userId} style={{
                                                                marginBottom: '15px',
                                                                padding: '12px',
                                                                backgroundColor: '#f8f9fa',
                                                                borderRadius: '8px',
                                                                border: '1px solid #e2e8f0'
                                                            }}>
                                                                <div style={{
                                                                    fontWeight: '600',
                                                                    marginBottom: '8px',
                                                                    color: '#2d3748'
                                                                }}>
                                                                    👤 {funcionario.utilizador.nome}
                                                                </div>
                                                                <div style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                                                                    <strong>Dias:</strong> {dias.sort((a, b) => a - b).join(', ')}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '4px' }}>
                                                                    {dias.length} dia{dias.length !== 1 ? 's' : ''} selecionado{dias.length !== 1 ? 's' : ''}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>

                                            <div style={styles.obraContainer}>
                                                <label style={styles.obraLabel}>
                                                    <span style={styles.obraIcon}>🏗️</span>
                                                    Obra Selecionada (Filtro)
                                                </label>
                                                <div style={{
                                                    padding: '12px 16px',
                                                    border: '2px solid #e2e8f0',
                                                    borderRadius: '12px',
                                                    backgroundColor: '#f8f9fa',
                                                    fontSize: '1rem',
                                                    color: obraSelecionada ? '#2d3748' : '#718096'
                                                }}>
                                                    {obraSelecionada
                                                        ? `${obras.find(o => o.id.toString() === obraSelecionada.toString())?.nome || `Obra ${obraSelecionada}`} - Apenas registos desta obra serão eliminados`
                                                        : 'Todas as obras - Todos os registos dos dias serão eliminados'
                                                    }
                                                </div>
                                            </div>
                            </ModalBase>

                            {/* Modal para registo individual */}
                            <ModalBase
                                isOpen={dialogOpen}
                                onClose={() => setDialogOpen(false)}
                                title="📝 Registar Ponto Individual"
                                subtitle={`Dia ${diaToRegistar} - ${utilizadores.find(u => u.id === userToRegistar)?.nome || 'Utilizador'}`}
                                size="medium"
                                styles={styles}
                                footer={null}
                            >
                                            <HorariosInput horarios={horarios} onChange={setHorarios} />

                                            <ObraSelector
                                                value={obraNoDialog}
                                                onChange={setObraNoDialog}
                                                obras={obras}
                                                label="🏗️ Selecionar Obra"
                                            />

                                <div style={styles.individualModalActions}>
                                    <button
                                        style={styles.cancelButton}
                                        onClick={() => setDialogOpen(false)}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        style={styles.confirmButton}
                                        onClick={async () => {
                                            if (!obraNoDialog) {
                                                return alert('Escolhe uma obra para registar.');
                                            }

                                            try {
                                                const dataFormatada = formatDate(anoSelecionado, mesSelecionado, diaToRegistar);
                                                const timestamps = [
                                                    createTimestamp(dataFormatada, horarios.entradaManha),
                                                    createTimestamp(dataFormatada, horarios.saidaManha),
                                                    createTimestamp(dataFormatada, horarios.entradaTarde),
                                                    createTimestamp(dataFormatada, horarios.saidaTarde)
                                                ];

                                                await API.registar4Pontos(token, userToRegistar, dataFormatada, timestamps, obraNoDialog);

                                                alert('Quatro pontos registados e confirmados com sucesso!');
                                                setDialogOpen(false);
                                                if (viewMode === 'grade') carregarDadosGrade();
                                            } catch (err) {
                                                alert(err.message);
                                            }
                                        }}
                                        disabled={!obraNoDialog}
                                    >
                                        ✅ Confirmar Registo
                                    </button>
                                    <button
                                        style={{ ...styles.confirmButton, backgroundColor: '#dc3545', marginTop: '10px' }}
                                        onClick={() => {
                                            setDialogOpen(false);
                                            setFaltaDialogOpen(true);
                                            setFaltaIntervalo(false);
                                            setDataFimFalta('');
                                        }}
                                    >
                                        📅 Registar Falta
                                    </button>
                                    <button
                                        style={{ ...styles.confirmButton, backgroundColor: '#38a169', marginTop: '10px' }}
                                        onClick={() => {
                                            setDialogOpen(false);
                                            setTipoHoraExtraSelecionado('');
                                            setTempoHoraExtra('');
                                            setObservacoesHoraExtra('');
                                            setHoraExtraDialogOpen(true);
                                        }}
                                    >
                                        ⏰ Registar Hora Extra
                                    </button>
                                    <button
                                        style={{ ...styles.confirmButton, backgroundColor: '#6c757d', marginTop: '10px' }}
                                        onClick={() => {
                                            setDialogOpen(false);
                                            abrirEdicaoDirecta(userToRegistar, diaToRegistar, utilizadores.find(u => u.id === userToRegistar)?.nome);
                                        }}
                                    >
                                        ✏️ Editar Pontos
                                    </button>
                                </div>
                            </ModalBase>

                            {/* Modal para registo de hora extra */}
                            <ModalBase
                                isOpen={horaExtraDialogOpen}
                                onClose={() => setHoraExtraDialogOpen(false)}
                                title="⏰ Registar Hora Extra"
                                subtitle={userToRegistar ? `${utilizadores.find(u => u.id === userToRegistar)?.nome || 'Utilizador'} - Dia ${diaToRegistar}` : 'Selecione um funcionário'}
                                size="medium"
                                headerColor="linear-gradient(135deg, #38a169, #2f855a)"
                                styles={styles}
                                footer={
                                    <>
                                        <button
                                            style={styles.cancelButton}
                                            onClick={() => setHoraExtraDialogOpen(false)}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            style={{ ...styles.confirmButton, backgroundColor: '#38a169' }}
                                            onClick={registarHoraExtra}
                                            disabled={!userToRegistar || !diaToRegistar || !tipoHoraExtraSelecionado || !tempoHoraExtra || loadingHoraExtra}
                                        >
                                            {loadingHoraExtra ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    A registar...
                                                </>
                                            ) : (
                                                '⏰ Confirmar Hora Extra'
                                            )}
                                        </button>
                                    </>
                                }
                            >
                                <div style={styles.filterGroup}>
                                    <label style={styles.label}>Funcionário</label>
                                    <UserSelectionList
                                        dadosGrade={dadosGrade}
                                        value={userToRegistar}
                                        onChange={e => setUserToRegistar(parseInt(e.target.value))}
                                        style={styles.select}
                                    />
                                </div>

                                <div style={styles.filterGroup}>
                                    <label style={styles.label}>Dia do Mês</label>
                                    <DaySelectionList
                                        diasDoMes={diasDoMes}
                                        mesSelecionado={mesSelecionado}
                                        anoSelecionado={anoSelecionado}
                                        value={diaToRegistar}
                                        onChange={e => setDiaToRegistar(parseInt(e.target.value))}
                                        style={styles.select}
                                    />
                                </div>

                                <div style={styles.filterGroup}>
                                    <label style={styles.label}>Tipo de Hora Extra</label>
                                    <select
                                        style={styles.select}
                                        value={tipoHoraExtraSelecionado}
                                        onChange={e => setTipoHoraExtraSelecionado(e.target.value)}
                                    >
                                        <option value="">-- Selecione o tipo de hora extra --</option>
                                        {Object.entries(tiposHorasExtras).map(([key, value]) => (
                                            <option key={key} value={key}>{value} ({key})</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={styles.filterGroup}>
                                    <label style={styles.label}>Tempo (horas)</label>
                                    <input
                                        type="number"
                                        style={styles.input}
                                        min="0.5"
                                        step="0.5"
                                        value={tempoHoraExtra}
                                        onChange={e => setTempoHoraExtra(e.target.value)}
                                        placeholder="Ex: 2 (para 2 horas)"
                                    />
                                </div>

                                <div style={styles.filterGroup}>
                                    <label style={styles.label}>Observações (opcional)</label>
                                    <input
                                        type="text"
                                        style={styles.input}
                                        value={observacoesHoraExtra}
                                        onChange={e => setObservacoesHoraExtra(e.target.value)}
                                        placeholder="Ex: Trabalho adicional em fecho de mês"
                                    />
                                </div>

                                {tipoHoraExtraSelecionado && tiposHorasExtras[tipoHoraExtraSelecionado] && (
                                    <div style={{
                                        ...styles.filterGroup,
                                        backgroundColor: '#e6fffa',
                                        border: '1px solid #81e6d9',
                                        borderRadius: '8px',
                                        padding: '12px'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', color: '#234e52' }}>
                                            <div><strong>Tipo de Hora Extra:</strong> {tiposHorasExtras[tipoHoraExtraSelecionado]}</div>
                                            <div><strong>Código:</strong> {tipoHoraExtraSelecionado}</div>
                                            <div><strong>Tempo:</strong> {tempoHoraExtra || '0'} hora(s)</div>
                                            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#285e61' }}>
                                                Esta hora extra será integrada diretamente no ERP Primavera.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </ModalBase>

                            {/* Modal para registo de falta */}
                            <ModalBase
                                isOpen={faltaDialogOpen}
                                onClose={() => setFaltaDialogOpen(false)}
                                title="📅 Registar Falta"
                                subtitle={userToRegistar ? `${utilizadores.find(u => u.id === userToRegistar)?.nome || 'Utilizador'} - Dia ${diaToRegistar}` : 'Selecione um funcionário'}
                                size="medium"
                                styles={styles}
                                footer={
                                    <>
                                        <button
                                            style={styles.cancelButton}
                                            onClick={() => setFaltaDialogOpen(false)}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            style={styles.confirmButton}
                                            onClick={registarFalta}
                                            disabled={!userToRegistar || !diaToRegistar || !tipoFaltaSelecionado || !duracaoFalta || loadingFalta}
                                        >
                                            {loadingFalta ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    A registar...
                                                </>
                                            ) : (
                                                '📅 Confirmar Falta'
                                            )}
                                        </button>
                                    </>
                                }
                            >
                                <div style={styles.filterGroup}>
                                    <label style={styles.label}>Funcionário</label>
                                    <UserSelectionList
                                        dadosGrade={dadosGrade}
                                        value={userToRegistar}
                                        onChange={e => setUserToRegistar(parseInt(e.target.value))}
                                        style={styles.select}
                                    />
                                </div>

                                <div style={styles.filterGroup}>
                                    <label style={styles.label}>Dia do Mês</label>
                                    <DaySelectionList
                                        diasDoMes={diasDoMes}
                                        mesSelecionado={mesSelecionado}
                                        anoSelecionado={anoSelecionado}
                                        value={diaToRegistar}
                                        onChange={e => setDiaToRegistar(parseInt(e.target.value))}
                                        style={styles.select}
                                    />
                                </div>

                                <div style={styles.filterGroup}>
                                    <label style={styles.label}>
                                        <input
                                            type="checkbox"
                                            checked={faltaIntervalo}
                                            onChange={e => {
                                                setFaltaIntervalo(e.target.checked);
                                                if (!e.target.checked) {
                                                    setDataFimFalta('');
                                                }
                                            }}
                                            style={{ marginRight: '8px' }}
                                        />
                                        Registar para intervalo de datas
                                    </label>
                                </div>

                                {faltaIntervalo && (
                                    <div style={styles.filterGroup}>
                                        <label style={styles.label}>Data de Fim</label>
                                        <input
                                            type="date"
                                            style={styles.input}
                                            value={dataFimFalta}
                                            onChange={e => setDataFimFalta(e.target.value)}
                                            min={`${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(diaToRegistar).padStart(2, '0')}`}
                                        />
                                    </div>
                                )}

                                <div style={styles.filterGroup}>
                                    <label style={styles.label}>Tipo de Falta</label>
                                    <select
                                        style={styles.select}
                                        value={tipoFaltaSelecionado}
                                        onChange={e => setTipoFaltaSelecionado(e.target.value)}
                                    >
                                        <option value="">-- Selecione o tipo de falta --</option>
                                        {Object.entries(tiposFaltas).map(([key, value]) => (
                                            <option key={key} value={key}>{value} ({key})</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={styles.filterGroup}>
                                    <label style={styles.label}>Duração</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="number"
                                            style={{ ...styles.input, flex: 1 }}
                                            min="1"
                                            value={parseInt(duracaoFalta) || ''}
                                            onChange={e => {
                                                const valor = e.target.value;
                                                const unidade = duracaoFalta?.endsWith('h') ? 'h' : 'd';
                                                setDuracaoFalta(valor ? `${valor}${unidade}` : '');
                                            }}
                                            placeholder="Quantidade"
                                        />
                                        <select
                                            style={{ ...styles.select, flex: 0.5 }}
                                            value={duracaoFalta === '' ? '' : duracaoFalta?.endsWith('h') ? 'h' : 'd'}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                const quantidade = parseInt(duracaoFalta) || 1;
                                                if (value === 'd') setDuracaoFalta(`${quantidade}d`);
                                                else if (value === 'h') setDuracaoFalta(`${quantidade}h`);
                                            }}
                                        >
                                            <option value="">-- Unidade --</option>
                                            <option value="d">Dia(s)</option>
                                            <option value="h">Hora(s)</option>
                                        </select>
                                    </div>
                                </div>

                                {tipoFaltaSelecionado && tiposFaltas[tipoFaltaSelecionado] && (
                                    <div style={{
                                        ...styles.filterGroup,
                                        backgroundColor: faltaIntervalo ? '#e3f2fd' : '#f8f9fa',
                                        border: `1px solid ${faltaIntervalo ? '#90caf9' : '#dee2e6'}`,
                                        borderRadius: '8px',
                                        padding: '12px'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', color: '#495057' }}>
                                            <div><strong>Tipo de Falta:</strong> {tiposFaltas[tipoFaltaSelecionado]}</div>
                                            <div><strong>Código:</strong> {tipoFaltaSelecionado}</div>
                                            {faltaIntervalo && dataFimFalta ? (
                                                <>
                                                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                                                        <div style={{ fontWeight: 'bold', color: '#856404', marginBottom: '4px' }}>📅 Intervalo de Datas:</div>
                                                        <div><strong>Início:</strong> {`${diaToRegistar}/${mesSelecionado}/${anoSelecionado}`}</div>
                                                        <div><strong>Fim:</strong> {new Date(dataFimFalta).toLocaleDateString('pt-PT')}</div>
                                                        <div><strong>Total de dias:</strong> {(() => {
                                                            const inicio = new Date(`${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(diaToRegistar).padStart(2, '0')}`);
                                                            const fim = new Date(dataFimFalta);
                                                            return Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)) + 1;
                                                        })()} dias consecutivos</div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div><strong>Duração:</strong> {duracaoFalta || '1d'}</div>
                                            )}
                                            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#6c757d' }}>
                                                {faltaIntervalo ? '⚠️ Faltas serão registadas para TODOS os dias do intervalo (incluindo fins de semana).' : 'Esta falta será registada no ERP.'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </ModalBase>

                            {/* Modal para registo de horas extras em bloco */}
                            <ModalBase
                                isOpen={bulkHoraExtraDialogOpen}
                                onClose={() => setBulkHoraExtraDialogOpen(false)}
                                title="⏰ Registar Horas Extras em Bloco"
                                subtitle={`Registando horas extras para ${selectedCells.length} seleções`}
                                size="large"
                                headerColor="linear-gradient(135deg, #38a169, #2f855a)"
                                styles={styles}
                                footer={
                                    <>
                                        <button
                                            style={styles.cancelButton}
                                            onClick={() => setBulkHoraExtraDialogOpen(false)}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            style={{ ...styles.confirmButton, backgroundColor: '#38a169' }}
                                            onClick={registarHorasExtrasEmBloco}
                                            disabled={!tipoHoraExtraSelecionadoBulk || !tempoHoraExtraBulk || loadingBulkHoraExtra}
                                        >
                                            {loadingBulkHoraExtra ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    A registar...
                                                </>
                                            ) : (
                                                '⏰ Confirmar Horas Extras em Bloco'
                                            )}
                                        </button>
                                    </>
                                }
                            >
                                            <div style={styles.selectedCellsContainer}>
                                                <span style={styles.selectedCellsLabel}>Dias selecionados para registo de hora extra:</span>

                                                {(() => {
                                                    const cellsByUser = groupCellsByUser(selectedCells);

                                                    return Object.entries(cellsByUser).map(([userId, dias]) => {
                                                        const funcionario = dadosGrade.find(item => item.utilizador.id === parseInt(userId, 10));
                                                        if (!funcionario) return null;

                                                        return (
                                                            <div key={userId} style={{
                                                                marginBottom: '15px',
                                                                padding: '12px',
                                                                backgroundColor: '#e6fffa',
                                                                borderRadius: '8px',
                                                                border: '1px solid #81e6d9'
                                                            }}>
                                                                <div style={{
                                                                    fontWeight: '600',
                                                                    marginBottom: '8px',
                                                                    color: '#2d3748'
                                                                }}>
                                                                    👤 {funcionario.utilizador.nome}
                                                                </div>
                                                                <div style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                                                                    <strong>Dias:</strong> {dias.sort((a, b) => a - b).join(', ')}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '4px' }}>
                                                                    {dias.length} dia{dias.length !== 1 ? 's' : ''} selecionado{dias.length !== 1 ? 's' : ''}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>

                                            <div style={styles.filterGroup}>
                                                <label style={styles.label}>Tipo de Hora Extra</label>
                                                <select
                                                    style={styles.select}
                                                    value={tipoHoraExtraSelecionadoBulk}
                                                    onChange={e => setTipoHoraExtraSelecionadoBulk(e.target.value)}
                                                >
                                                    <option value="">-- Selecione o tipo de hora extra --</option>
                                                    {Object.entries(tiposHorasExtras).map(([key, value]) => (
                                                        <option key={key} value={key}>{value} ({key})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div style={styles.filterGroup}>
                                                <label style={styles.label}>Tempo (horas)</label>
                                                <input
                                                    type="number"
                                                    style={styles.input}
                                                    min="0.5"
                                                    step="0.5"
                                                    value={tempoHoraExtraBulk}
                                                    onChange={e => setTempoHoraExtraBulk(e.target.value)}
                                                    placeholder="Ex: 2 (para 2 horas)"
                                                />
                                            </div>
                                            
                                            {tipoHoraExtraSelecionadoBulk && tiposHorasExtras[tipoHoraExtraSelecionadoBulk] && (
                                                <div style={{
                                                    ...styles.selectedCellsContainer,
                                                    backgroundColor: '#e6fffa',
                                                    border: '1px solid #81e6d9'
                                                }}>
                                                    <div style={{ fontSize: '0.9rem', color: '#234e52' }}>
                                                        <div><strong>Tipo de Hora Extra:</strong> {tiposHorasExtras[tipoHoraExtraSelecionadoBulk]}</div>
                                                        <div><strong>Código:</strong> {tipoHoraExtraSelecionadoBulk}</div>
                                                        <div><strong>Tempo:</strong> {tempoHoraExtraBulk || '0'} hora(s)</div>
                                                        <div><strong>Total de horas extras a registar:</strong> {selectedCells.length}</div>
                                                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#285e61' }}>
                                                            Estas horas extras serão integradas diretamente no ERP Primavera.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                            </ModalBase>

                            {/* Modal para registo de faltas em bloco */}
                            <ModalBase
                                isOpen={bulkFaltaDialogOpen}
                                onClose={() => setBulkFaltaDialogOpen(false)}
                                title="📅 Registar Faltas em Bloco"
                                subtitle={`Registando faltas para ${selectedCells.length} seleções`}
                                size="large"
                                headerColor="linear-gradient(135deg, #d69e2e, #b7791f)"
                                styles={styles}
                                footer={
                                    <>
                                        <button
                                            style={styles.cancelButton}
                                            onClick={() => setBulkFaltaDialogOpen(false)}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            style={{ ...styles.confirmButton, backgroundColor: '#d69e2e' }}
                                            onClick={registarFaltasEmBloco}
                                            disabled={!tipoFaltaSelecionadoBulk || !duracaoFaltaBulk || loadingBulkFalta}
                                        >
                                            {loadingBulkFalta ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    A registar...
                                                </>
                                            ) : (
                                                '📅 Confirmar Faltas em Bloco'
                                            )}
                                        </button>
                                    </>
                                }
                            >
                                            <div style={styles.selectedCellsContainer}>
                                                <span style={styles.selectedCellsLabel}>Dias selecionados para registo de falta:</span>

                                                {(() => {
                                                    const cellsByUser = groupCellsByUser(selectedCells);

                                                    return Object.entries(cellsByUser).map(([userId, dias]) => {
                                                        const funcionario = dadosGrade.find(item => item.utilizador.id === parseInt(userId, 10));
                                                        if (!funcionario) return null;

                                                        return (
                                                            <div key={userId} style={{
                                                                marginBottom: '15px',
                                                                padding: '12px',
                                                                backgroundColor: '#fff3cd',
                                                                borderRadius: '8px',
                                                                border: '1px solid #ffeaa7'
                                                            }}>
                                                                <div style={{
                                                                    fontWeight: '600',
                                                                    marginBottom: '8px',
                                                                    color: '#2d3748'
                                                                }}>
                                                                    👤 {funcionario.utilizador.nome}
                                                                </div>
                                                                <div style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                                                                    <strong>Dias:</strong> {dias.sort((a, b) => a - b).join(', ')}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '4px' }}>
                                                                    {dias.length} dia{dias.length !== 1 ? 's' : ''} selecionado{dias.length !== 1 ? 's' : ''}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>

                                            <div style={styles.filterGroup}>
                                                <label style={styles.label}>Tipo de Falta</label>
                                                <select
                                                    style={styles.select}
                                                    value={tipoFaltaSelecionadoBulk}
                                                    onChange={e => setTipoFaltaSelecionadoBulk(e.target.value)}
                                                >
                                                    <option value="">-- Selecione o tipo de falta --</option>
                                                    {Object.entries(tiposFaltas).map(([key, value]) => (
                                                        <option key={key} value={key}>{value} ({key})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div style={styles.filterGroup}>
                                                <label style={styles.label}>Duração</label>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <input
                                                        type="number"
                                                        style={{ ...styles.input, flex: 1 }}
                                                        min="1"
                                                        value={parseInt(duracaoFaltaBulk) || ''}
                                                        onChange={e => {
                                                            const valor = e.target.value;
                                                            const unidade = duracaoFaltaBulk?.endsWith('h') ? 'h' : 'd';
                                                            setDuracaoFaltaBulk(valor ? `${valor}${unidade}` : '');
                                                        }}
                                                        placeholder="Quantidade"
                                                    />
                                                    <select
                                                        style={{ ...styles.select, flex: 0.5 }}
                                                        value={duracaoFaltaBulk === '' ? '' : duracaoFaltaBulk?.endsWith('h') ? 'h' : 'd'}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            const quantidade = parseInt(duracaoFaltaBulk) || 1;
                                                            if (value === 'd') setDuracaoFaltaBulk(`${quantidade}d`);
                                                            else if (value === 'h') setDuracaoFaltaBulk(`${quantidade}h`);
                                                        }}
                                                    >
                                                        <option value="">-- Unidade --</option>
                                                        <option value="d">Dia(s)</option>
                                                        <option value="h">Hora(s)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {tipoFaltaSelecionadoBulk && tiposFaltas[tipoFaltaSelecionadoBulk] && (
                                                <div style={{
                                                    ...styles.selectedCellsContainer,
                                                    backgroundColor: '#e6fffa',
                                                    border: '1px solid #81e6d9'
                                                }}>
                                                    <div style={{ fontSize: '0.9rem', color: '#234e52' }}>
                                                        <div><strong>Tipo de Falta:</strong> {tiposFaltas[tipoFaltaSelecionadoBulk]}</div>
                                                        <div><strong>Código:</strong> {tipoFaltaSelecionadoBulk}</div>
                                                        <div><strong>Duração:</strong> {duracaoFaltaBulk || '1d'}</div>
                                                        <div><strong>Total de faltas a registar:</strong> {selectedCells.length}</div>
                                                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#285e61' }}>
                                                            Estas faltas serão integradas diretamente no ERP Primavera.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                            </ModalBase>

                            {/* Modal para limpar pontos de um dia */}
                            <ModalBase
                                isOpen={clearPointsDialogOpen}
                                onClose={() => setClearPointsDialogOpen(false)}
                                title="🗑️ Limpar Pontos de um Dia"
                                subtitle="Eliminar todos os registos de ponto de um dia específico"
                                size="medium"
                                styles={styles}
                                footer={
                                    <>
                                        <button
                                            style={styles.cancelButton}
                                            onClick={() => setClearPointsDialogOpen(false)}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            style={{ ...styles.confirmButton, backgroundColor: '#e53e3e' }}
                                            onClick={limparPontosDoDia}
                                            disabled={!funcionarioSelecionadoClear || !diaSelecionadoClear || loadingClear}
                                        >
                                            {loadingClear ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    A eliminar...
                                                </>
                                            ) : (
                                                '🗑️ Eliminar Registos'
                                            )}
                                        </button>
                                    </>
                                }
                            >
                                <div style={{
                                    ...styles.selectedCellsContainer,
                                    backgroundColor: '#fed7d7',
                                    border: '1px solid #fc8181'
                                }}>
                                    <div style={{ fontSize: '0.9rem', color: '#742a2a' }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <strong>⚠️ ATENÇÃO:</strong>
                                        </div>
                                        <div>
                                            Esta operação irá <strong>eliminar permanentemente</strong> todos os registos de ponto do dia selecionado para o funcionário escolhido.
                                        </div>
                                        <div style={{ marginTop: '10px', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                            Esta ação <strong>NÃO pode ser desfeita</strong>!
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.filterGroup}>
                                    <label style={styles.label}>Funcionário</label>
                                    <UserSelectionList
                                        dadosGrade={dadosGrade}
                                        value={funcionarioSelecionadoClear}
                                        onChange={e => setFuncionarioSelecionadoClear(e.target.value)}
                                        style={styles.select}
                                    />
                                </div>

                                <div style={styles.filterGroup}>
                                    <label style={styles.label}>Dia do Mês</label>
                                    <DaySelectionList
                                        diasDoMes={diasDoMes}
                                        mesSelecionado={mesSelecionado}
                                        anoSelecionado={anoSelecionado}
                                        value={diaSelecionadoClear}
                                        onChange={e => setDiaSelecionadoClear(e.target.value)}
                                        style={styles.select}
                                    />
                                </div>

                                {funcionarioSelecionadoClear && diaSelecionadoClear && (
                                    <div style={{
                                        ...styles.selectedCellsContainer,
                                        backgroundColor: '#fef5e7',
                                        border: '1px solid #f6e05e'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', color: '#744210' }}>
                                            <div style={{ marginBottom: '10px' }}>
                                                <strong>📊 Pré-visualização da Limpeza:</strong>
                                            </div>
                                            {(() => {
                                                const funcionarioData = dadosGrade.find(item => item.utilizador.id.toString() === funcionarioSelecionadoClear.toString());
                                                const dia = parseInt(diaSelecionadoClear);
                                                if (funcionarioData) {
                                                    const estatisticas = funcionarioData.estatisticasDias[dia];

                                                    return (
                                                        <div>
                                                            <div>• <strong>Funcionário:</strong> {funcionarioData.utilizador.nome}</div>
                                                            <div>• <strong>Dia:</strong> {dia}/{mesSelecionado}/{anoSelecionado}</div>
                                                            <div>• <strong>Registos a eliminar:</strong> {estatisticas?.totalRegistos || 0}</div>
                                                            <div>• <strong>Horas a perder:</strong> {formatarHorasParaExibicao(parseFloat(estatisticas?.horasEstimadas) || 0)}</div>
                                                            {estatisticas?.obras && estatisticas.obras.length > 0 && (
                                                                <div>• <strong>Obras afetadas:</strong> {estatisticas.obras.join(', ')}</div>
                                                            )}
                                                            {(!estatisticas || estatisticas.totalRegistos === 0) && (
                                                                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e2e8f0', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                                    <div style={{ color: '#2d3748', fontSize: '0.85rem' }}>
                                                                        <strong>ℹ️ Informação:</strong> Não existem registos neste dia para eliminar.
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return <div>Selecione um funcionário e dia para ver a pré-visualização.</div>;
                                            })()}
                                        </div>
                                    </div>
                                )}

                                <div style={styles.obraContainer}>
                                    <label style={styles.obraLabel}>
                                        <span style={styles.obraIcon}>🏗️</span>
                                        Obra Selecionada (Filtro)
                                    </label>
                                    <div style={{
                                        padding: '12px 16px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        backgroundColor: '#f8f9fa',
                                        fontSize: '1rem',
                                        color: obraSelecionada ? '#2d3748' : '#718096'
                                    }}>
                                        {obraSelecionada
                                            ? `${obras.find(o => o.id.toString() === obraSelecionada.toString())?.nome || `Obra ${obraSelecionada}`} - Apenas registos desta obra serão eliminados`
                                            : 'Todas as obras - Todos os registos do dia serão eliminados'
                                        }
                                    </div>
                                </div>
                            </ModalBase>

                            {/* Modal para preencher pontos em falta */}
                            <ModalBase
                                isOpen={autoFillDialogOpen}
                                onClose={() => setAutoFillDialogOpen(false)}
                                title="🤖 Preencher Pontos em Falta"
                                subtitle="Preencher automaticamente os dias vazios de um funcionário"
                                size="large"
                                headerColor="linear-gradient(135deg, #805ad5, #6b46c1)"
                                styles={styles}
                                footer={
                                    <>
                                        <button
                                            style={styles.cancelButton}
                                            onClick={() => setAutoFillDialogOpen(false)}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            style={{ ...styles.confirmButton, backgroundColor: '#805ad5' }}
                                            onClick={preencherPontosEmFalta}
                                            disabled={!funcionarioSelecionadoAutoFill || !obraNoDialog || loadingAutoFill}
                                        >
                                            {loadingAutoFill ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    A preencher...
                                                </>
                                            ) : (
                                                '🤖 Preencher Automaticamente'
                                            )}
                                        </button>
                                    </>
                                }
                            >
                                            <div style={styles.filterGroup}>
                                                <label style={styles.label}>Funcionário</label>
                                                <select
                                                    style={styles.select}
                                                    value={funcionarioSelecionadoAutoFill}
                                                    onChange={e => setFuncionarioSelecionadoAutoFill(e.target.value)}
                                                >
                                                    <option value="">-- Selecione um funcionário --</option>
                                                    {dadosGrade.map(item => (
                                                        <option key={item.utilizador.id} value={item.utilizador.id}>
                                                            {item.utilizador.nome} ({item.utilizador.codFuncionario})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {funcionarioSelecionadoAutoFill && (
                                                <div style={{
                                                    ...styles.selectedCellsContainer,
                                                    backgroundColor: '#fff3cd',
                                                    border: '1px solid #ffeaa7'
                                                }}>
                                                    <div style={{ fontSize: '0.9rem', color: '#856404' }}>
                                                        <div style={{ marginBottom: '10px' }}>
                                                            <strong>📊 Análise do Funcionário:</strong>
                                                        </div>
                                                        {(() => {
                                                            const funcionarioData = dadosGrade.find(item => item.utilizador.id.toString() === funcionarioSelecionadoAutoFill.toString());
                                                            if (funcionarioData) {
                                                                const diasVazios = diasDoMes.filter(dia => {
                                                                    const estatisticas = funcionarioData.estatisticasDias[dia];
                                                                    const dataObj = new Date(parseInt(anoSelecionado), parseInt(mesSelecionado) - 1, dia);
                                                                    const isWeekend = dataObj.getDay() === 0 || dataObj.getDay() === 6;
                                                                    return !isWeekend && (!estatisticas || (estatisticas.totalRegistos === 0 && (!estatisticas.faltas || estatisticas.faltas.length === 0)));
                                                                });

                                                                return (
                                                                    <div>
                                                                        <div>• <strong>Nome:</strong> {funcionarioData.utilizador.nome}</div>
                                                                        <div>• <strong>Total dias com registos:</strong> {funcionarioData.totalDias}</div>
                                                                        <div>• <strong>Total horas trabalhadas:</strong> {formatarHorasParaExibicao(parseFloat(funcionarioData.totalHorasEstimadas))}</div>
                                                                        <div>• <strong>Dias vazios encontrados:</strong> {diasVazios.length} dias ({diasVazios.length > 0 ? diasVazios.join(', ') : 'nenhum'})</div>
                                                                        {diasVazios.length > 0 && (
                                                                            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#d1ecf1', borderRadius: '6px', border: '1px solid #bee5eb' }}>
                                                                                <div style={{ color: '#0c5460', fontSize: '0.85rem' }}>
                                                                                    <strong>⚡ Ação a realizar:</strong> Serão criados {diasVazios.length * 4} registos de ponto
                                                                                    ({diasVazios.length} dias × 4 pontos por dia) nos dias vazios listados acima.
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                            return <div>Selecione um funcionário para ver a análise.</div>;
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            <div style={styles.horariosContainer}>
                                                <h4 style={styles.horariosTitle}>⏰ Horários a Aplicar</h4>

                                                <div style={styles.horariosGrid}>
                                                    <div style={styles.periodoContainer}>
                                                        <div style={styles.periodoHeader}>
                                                            <span style={styles.periodoIcon}>🌅</span>
                                                            <span style={styles.periodoTitle}>Manhã</span>
                                                        </div>
                                                        <div style={styles.horarioRow}>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Entrada</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.entradaManha}
                                                                    onChange={e => setHorarios(h => ({ ...h, entradaManha: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Saída</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.saidaManha}
                                                                    onChange={e => setHorarios(h => ({ ...h, saidaManha: e.target.value }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={styles.periodoContainer}>
                                                        <div style={styles.periodoHeader}>
                                                            <span style={styles.periodoIcon}>🌇</span>
                                                            <span style={styles.periodoTitle}>Tarde</span>
                                                        </div>
                                                        <div style={styles.horarioRow}>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Entrada</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.entradaTarde}
                                                                    onChange={e => setHorarios(h => ({ ...h, entradaTarde: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div style={styles.inputGroup}>
                                                                <label style={styles.timeLabel}>Saída</label>
                                                                <input
                                                                    type="time"
                                                                    style={styles.timeInput}
                                                                    value={horarios.saidaTarde}
                                                                    onChange={e => setHorarios(h => ({ ...h, saidaTarde: e.target.value }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <ObraSelector
                                                value={obraNoDialog}
                                                onChange={setObraNoDialog}
                                                obras={obras}
                                                label="🏗️ Selecionar Obra"
                                            />
                            </ModalBase>

                        </>
                    )}

                    {viewMode === 'detalhes' && utilizadorDetalhado && (
                        <>
                            <button
                                style={{
                                    ...styles.detailsButton,
                                    padding: '8px 14px',
                                    fontSize: '0.85rem'
                                }}
                                onClick={() => {
                                    setUtilizadorDetalhado(null);
                                    setViewMode('resumo');
                                }}
                            >
                                ← Voltar
                            </button>

                            {registosDetalhados.length > 0 && (
                                <button
                                    style={{
                                        ...styles.exportButton,
                                        padding: '8px 14px',
                                        fontSize: '0.85rem'
                                    }}
                                    onClick={exportarDetalhesUtilizador}
                                >
                                    📊 Exportar
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Loading com Progress Bar */}
            {(loading || loadingGrade) && (
                <div style={styles.loadingCard}>
                    <div style={styles.spinner}></div>
                    <p style={styles.loadingText}>{loadingMessage || 'A carregar dados...'}</p>
                    {loadingGrade && (
                        <div style={styles.progressBarContainer}>
                            <div style={styles.progressBarBackground}>
                                <div
                                    style={{
                                        ...styles.progressBarFill,
                                        width: `${loadingProgress}%`
                                    }}
                                >
                                    <span style={styles.progressBarText}>{Math.round(loadingProgress)}%</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Resumo dos Utilizadores */}
            {viewMode === 'resumo' && !loading && resumoUtilizadores.length > 0 && (
                <div style={styles.resumoSection}>
                    <h3 style={styles.sectionTitle}>
                        <span style={styles.sectionIcon}>📊</span>
                        Resumo por Utilizador ({resumoUtilizadores.length} utilizadores)
                    </h3>

                    <div style={styles.utilizadoresGrid}>
                        {resumoUtilizadores.map((resumo, index) => (
                            <div
                                key={resumo.utilizador.id}
                                style={{ ...styles.utilizadorCard, ...styles.utilizadorCardHover }}
                                onClick={() => {
                                    carregarDetalhesUtilizador(resumo.utilizador);
                                    setViewMode('detalhes');
                                }}
                            >
                                <div style={styles.utilizadorHeader}>
                                    <div style={styles.utilizadorInfo}>
                                        <h4 style={styles.utilizadorNome}>
                                            👤 {resumo.utilizador.nome}
                                        </h4>

                                       <p style={styles.utilizadorGradeNome}>{resumo.utilizador.username}</p>
                                        <p style={styles.utilizadorEmail}>{resumo.utilizador.codFuncionario}</p>
                                    </div>
                                    <div style={styles.horasDestaque}>
                                        <span style={styles.horasNumero}>
                                            {(() => {
                                                const horasDecimal = parseFloat(resumo.totalHorasEstimadas);
                                                const horas = Math.floor(horasDecimal);
                                                const minutos = Math.round((horasDecimal - horas) * 60);
                                                return minutos > 0 ? `${horas}h ${minutos}m` : `${horas}h`;
                                            })()}
                                        </span>
                                        <span style={styles.horasLabel}>total</span>
                                    </div>
                                </div>

                                <div style={styles.statsRow}>
                                    <div style={styles.statItem}>
                                        <span style={styles.statValue}>{resumo.totalDias}</span>
                                        <span style={styles.statLabel}>dias</span>
                                    </div>
                                    <div style={styles.statItem}>
                                        <span style={styles.statValue}>{resumo.totalRegistos}</span>
                                        <span style={styles.statLabel}>registos</span>
                                    </div>
                                    <div style={styles.statItem}>
                                        <span style={styles.statValue}>{resumo.percentagemConfirmados}%</span>
                                        <span style={styles.statLabel}>confirmado</span>
                                    </div>
                                </div>

                                <div style={styles.obrasInfo}>
                                    <span style={styles.obrasLabel}>Obras:</span>
                                    <span style={styles.obrasTexto}>{resumo.obras.length > 0 ? resumo.obras.join(', ') : 'N/A'}</span>
                                </div>

                                <div style={styles.periodoInfo}>
                                    <span style={styles.periodoTexto}>📅 {resumo.periodoInicio} - {resumo.periodoFim}</span>
                                </div>

                                <div style={styles.clickHint}>
                                    👆 Clique para ver detalhes completos
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Grade Mensal */}
            {viewMode === 'grade' && !loadingGrade && (anoSelecionado && mesSelecionado) && (
                <div style={styles.gradeSection}>
                    <h3 style={styles.sectionTitle}>
                        <span style={styles.sectionIcon}>📅</span>
                        Grade Mensal - {mesSelecionado}/{anoSelecionado} ({dadosGrade.length} utilizadores)
                    </h3>

                    {/* ✨ Botões de Exportação - Componente Otimizado */}
                    <ExportActions
                        dadosGrade={dadosGrade}
                        diasDoMes={diasDoMes}
                        mesSelecionado={mesSelecionado}
                        anoSelecionado={anoSelecionado}
                        obraSelecionada={obraSelecionada}
                        obras={obras}
                        tiposFaltas={tiposFaltas}
                        styles={styles}
                    />

                    <div style={styles.legendaContainer}>
                        <h4 style={styles.legendaTitle}>Legenda:</h4>
                        <div style={styles.legendaItems}>
                            <div style={styles.legendaItem}>
                                <div style={{ ...styles.legendaCor, backgroundColor: '#d4edda' }}></div>
                                <span>Ótimo (100% confirmado, 7+ horas)</span>
                            </div>
                            <div style={styles.legendaItem}>
                                <div style={{ ...styles.legendaCor, backgroundColor: '#fff3cd' }}></div>
                                <span>Bom (80%+ confirmado, 6+ horas)</span>
                            </div>
                            <div style={styles.legendaItem}>
                                <div style={{ ...styles.legendaCor, backgroundColor: '#f8d7da' }}></div>
                                <span>Atenção (50%+ confirmado ou 4+ horas)</span>
                            </div>
                            <div style={styles.legendaItem}>
                                <div style={{ ...styles.legendaCor, backgroundColor: '#f5c6cb' }}></div>
                                <span>Problema (menos de 50% ou menos de 4h)</span>
                            </div>
                            <div style={styles.legendaItem}>
                                <div style={{ ...styles.legendaCor, backgroundColor: '#f8f9fa' }}></div>
                                <span>Sem registos</span>
                            </div>
                        </div>
                        <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#4a5568', fontStyle: 'italic' }}>
                            <strong>Instruções:</strong> Clique normal = <strong>abrir editor de pontos</strong> (se houver falta, permite remover) | Ctrl + Clique = seleção múltipla
                        </div>
                    </div>

                    <div style={styles.gradeContainer}>
                        <div style={styles.gradeScrollContainer}>
                            <table style={styles.gradeTable}>
                                <thead>
                                    <tr>
                                        <th style={{ ...styles.gradeHeader, ...styles.gradeHeaderFixed }}>Nome</th>
                                        {diasDoMes.map(dia => {
                                            // certifica-te de transformar strings em números
                                            const y = parseInt(anoSelecionado, 10);
                                            const m = parseInt(mesSelecionado, 10) - 1;
                                            const dateObj = new Date(y, m, dia);
                                            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                                            return (
                                                <th
                                                    key={dia}
                                                    style={{
                                                        ...styles.gradeHeader,
                                                        ...(isWeekend ? styles.weekendHeader : {})
                                                    }}
                                                >
                                                    {dia}
                                                </th>
                                            );
                                        })}

                                        <th style={styles.gradeHeader}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dadosGrade.map((item, index) => (
                                        <tr key={item.utilizador.id} style={index % 2 === 0 ? styles.gradeRowEven : styles.gradeRowOdd}>
                                            <td
                                                style={{ ...styles.gradeCell, ...styles.gradeCellFixed }}
                                                onClick={() => {
                                                    carregarDetalhesUtilizador(item.utilizador);
                                                    setViewMode('detalhes');
                                                }}
                                            >
                                                <div style={styles.utilizadorGradeInfo}>
                                                    <div style={styles.utilizadorGradeNome}>{item.utilizador.username}</div>
                                                    <div style={styles.utilizadorGradeEmail}>{item.utilizador.codFuncionario}</div>
                                                </div>
                                            </td>
                                            {diasDoMes.map(dia => {
                                                const estatisticas = item.estatisticasDias[dia];
                                                const cellKey = `${item.utilizador.id}-${dia}`;

                                                return (
                                                    <td
                                                        key={cellKey}
                                                        onClick={async (e) => {
                                                            // Garantir que os valores são números válidos antes de criar a cellKey
                                                            const userId = parseInt(item.utilizador.id, 10);
                                                            const diaNum = parseInt(dia, 10);

                                                            if (isNaN(userId) || isNaN(diaNum)) {
                                                                console.error(`[ERROR] IDs inválidos - utilizador.id: ${item.utilizador.id}, dia: ${dia}`);
                                                                return;
                                                            }

                                                            const cellKey = `${userId}-${diaNum}`;

                                                            if (e.ctrlKey) {
                                                                // Ctrl + Click = Seleção múltipla
                                                                setSelectedCells(cells => {
                                                                    const newCells = cells.includes(cellKey)
                                                                        ? cells.filter(c => c !== cellKey)
                                                                        : [...cells, cellKey];
                                                                    return newCells;
                                                                });
                                                            } else {
                                                                // Verificar se há faltas ou horas extras neste dia
                                                                const estatisticas = item.estatisticasDias[diaNum];
                                                                
                                                                // Verificar horas extras primeiro
                                                                if (estatisticas && estatisticas.horasExtras && estatisticas.horasExtras.length > 0) {
                                                                    // Há hora(s) extra(s) - abrir modal de remoção
                                                                    const horaExtra = estatisticas.horasExtras[0];
                                                                    
                                                                    setHoraExtraParaRemover({
                                                                        IdFuncRemCBL: horaExtra.IdFuncRemCBL,
                                                                        funcionarioNome: item.utilizador.nome,
                                                                        dia: diaNum,
                                                                        tipo: horaExtra.HoraExtra || horaExtra.HorasExtra,
                                                                        tempo: horaExtra.Tempo,
                                                                        todasHorasExtras: estatisticas.horasExtras
                                                                    });
                                                                    setRemoverHoraExtraDialogOpen(true);
                                                                } else if (estatisticas && estatisticas.faltas && estatisticas.faltas.length > 0) {
                                                                    // Há falta(s) - abrir modal de remoção
                                                                    const dataFormatada = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;

                                                                    // Obter codFuncionario
                                                                    const codFunc = await obterCodFuncionario(userId);

                                                                    setFaltaParaRemover({
                                                                        funcionarioId: codFunc,
                                                                        funcionarioNome: item.utilizador.nome,
                                                                        dia: diaNum,
                                                                        data: new Date(dataFormatada).toISOString(),
                                                                        falta: estatisticas.faltas[0],
                                                                        todasFaltas: estatisticas.faltas // Passar todas as faltas do dia
                                                                    });
                                                                    setRemoverFaltaDialogOpen(true);
                                                                } else {
                                                                    // Não há falta nem hora extra - abrir editor (funciona para células vazias ou com registos)
                                                                    abrirEdicaoDirecta(userId, diaNum, item.utilizador.nome);
                                                                }
                                                            }
                                                        }}
                                                        style={{
                                                            ...styles.gradeCell,
                                                            border: selectedCells.includes(`${item.utilizador.id}-${dia}`)
                                                                ? '3px solid #3182ce'
                                                                : estatisticas
                                                                    ? '1px solid #e2e8f0'
                                                                    : '1px dashed #cbd5e1',
                                                            backgroundColor: (() => {
                                                                const isWeekend = new Date(parseInt(anoSelecionado, 10), parseInt(mesSelecionado, 10) - 1, dia).getDay() === 0 ||
                                                                                  new Date(parseInt(anoSelecionado, 10), parseInt(mesSelecionado, 10) - 1, dia).getDay() === 6;

                                                                if (selectedCells.includes(`${item.utilizador.id}-${dia}`)) {
                                                                    return '#bee3f8';
                                                                } else if (isWeekend) {
                                                                    return '#e0f7fa'; // Azul claro para fins de semana
                                                                } else if (estatisticas) {
                                                                    return obterCorStatusDia(estatisticas);
                                                                } else {
                                                                    return '#fafafa';
                                                                }
                                                            })(),
                                                            cursor: 'pointer'
                                                        }}

                                                        title={estatisticas ?
                                                            `${estatisticas.totalRegistos} registos\n${estatisticas.horasEstimadas} horas\n${estatisticas.confirmados}/${estatisticas.totalRegistos} confirmados\nPrimeiro: ${estatisticas.primeiroRegisto}\nÚltimo: ${estatisticas.ultimoRegisto}${estatisticas.faltas && estatisticas.faltas.length > 0 ? `\n\nFaltas: ${estatisticas.faltas.map(f => `${f.Falta} - ${tiposFaltas[f.Falta] || 'Desconhecido'} (${f.Tempo}${f.Horas ? 'h' : 'd'})`).join(', ')}` : ''}\n\nClique: abrir editor de pontos\nCtrl+Click: seleção múltipla`
                                                            : 'Sem registos\n\nClique: abrir editor de pontos\nCtrl+Click: seleção múltipla'
                                                        }



                                                    >
                                                        {(() => {
                                                            const cellData = obterConteudoCelula(estatisticas);
                                                            return (
                                                                <div style={{
                                                                    ...styles.gradeCellContent,
                                                                    color: cellData.textoCor,
                                                                    fontWeight: '600'
                                                                }}>
                                                                    <div style={{
                                                                        whiteSpace: 'normal',
                                                                        fontSize: '0.7rem',
                                                                        wordBreak: 'break-word',
                                                                        lineHeight: '1.2',
                                                                        textAlign: 'center',
                                                                        maxWidth: '100%',
                                                                        overflow: 'hidden'
                                                                    }}>
                                                                        {cellData.texto}
                                                                    </div>
                                                                    {estatisticas && estatisticas.totalRegistos > 0 && (
                                                                        <div style={styles.gradeCellRegistos}>{estatisticas.totalRegistos}r</div>
                                                                    )}
                                                                    {estatisticas && estatisticas.naoConfirmados > 0 && (
                                                                        <div style={styles.gradeCellAlert}>⚠️{estatisticas.naoConfirmados}</div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ ...styles.gradeCell, ...styles.gradeCellTotal }}>
                                                <div style={styles.gradeTotalContent}>
                                                    <div style={styles.gradeTotalHoras}>
                                                        {(() => {
                                                            const horasDecimal = parseFloat(item.totalHorasEstimadas);
                                                            const horas = Math.floor(horasDecimal);
                                                            const minutos = Math.round((horasDecimal - horas) * 60);
                                                            return minutos > 0 ? `${horas}h ${minutos}m` : `${horas}h`;
                                                        })()}
                                                    </div>
                                                    <div style={styles.gradeTotalDias}>{item.totalDias} dias</div>
                                                    {item.totalFaltas > 0 && (
                                                        <div style={styles.gradeTotalFaltas}>{item.totalFaltas} faltas</div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Detalhes do Utilizador Selecionado */}
            {viewMode === 'detalhes' && utilizadorDetalhado && (
                <div style={styles.detalhesSection}>
                    <div style={styles.detalhesHeader}>
                        <div>
                            <h3 style={styles.sectionTitle}>
                                <span style={styles.sectionIcon}>📋</span>
                                Detalhes - {utilizadorDetalhado.nome}
                            </h3>
                            <p style={styles.detalhesSubtitle}>{utilizadorDetalhado.email}</p>
                        </div>

                        <div style={styles.detalhesActions}>
                            {registosDetalhados.length > 0 && (
                                <button
                                    style={styles.exportButton}
                                    onClick={exportarDetalhesUtilizador}
                                >
                                    📊 Exportar Detalhes
                                </button>
                            )}

                            <div style={styles.filterGroup}>
                                <select
                                    style={styles.selectSmall}
                                    value={filtroTipo}
                                    onChange={e => setFiltroTipo(e.target.value)}
                                >
                                    <option value="">-- Todos os tipos --</option>
                                    <option value="entrada">Entrada</option>
                                    <option value="saida">Saída</option>
                                    <option value="pausa">Pausa</option>
                                    <option value="retorno">Retorno</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {loadingDetalhes && (
                        <div style={styles.loadingCard}>
                            <div style={styles.spinner}></div>
                            <p>A carregar detalhes...</p>
                        </div>
                    )}

                    {!loadingDetalhes && Object.entries(registosFiltrados).length > 0 && (
                        Object.entries(registosFiltrados)
                            .sort(([a], [b]) => new Date(b) - new Date(a))
                            .map(([dia, eventos]) => (
                                <div key={dia} style={styles.dayCard}>
                                    <div style={styles.dayHeader}>
                                        <h4 style={styles.dayTitle}>
                                            📅 {new Date(dia).toLocaleDateString('pt-PT', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </h4>
                                        <span style={styles.dayBadge}>
                                            {eventos.length} registo{eventos.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    
                                    <div style={styles.eventsList}>
                                        {eventos
                                            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                                            .map((evento, i) => (
                                                <div key={i} style={{ ...styles.eventCard, ...styles.eventCardHover }}>
                                                    <div style={styles.eventHeader}>
                                                        <div style={styles.eventType}>
                                                            <span style={styles.typeIcon}>
                                                                {evento.tipo === 'entrada' ? '🟢' :
                                                                    evento.tipo === 'saida' ? '🔴' :
                                                                        evento.tipo === 'pausa' ? '⏸️' : '▶️'}
                                                            </span>
                                                            <span style={styles.typeText}>{evento.tipo.toUpperCase()}</span>
                                                        </div>
                                                        <div style={styles.eventTime}>
                                                            🕐 {new Date(evento.timestamp).toLocaleTimeString('pt-PT')}
                                                        </div>
                                                    </div>

                                                    <div style={styles.eventDetails}>
                                                        <div style={styles.eventInfo}>
                                                            <span style={styles.infoLabel}>Obra:</span>
                                                            <span style={styles.infoValue}>{evento.Obra?.nome || 'N/A'}</span>
                                                        </div>

                                                        <div style={styles.eventInfo}>
                                                            <span style={styles.infoLabel}>Status:</span>
                                                            <span style={{
                                                                ...styles.statusBadge,
                                                                ...(evento.is_confirmed ? styles.confirmed : styles.unconfirmed)
                                                            }}>
                                                                {evento.is_confirmed ? '✅ Confirmado' : '⏳ Pendente'}
                                                            </span>
                                                        </div>

                                                        {evento.justificacao && (
                                                            <div style={styles.eventInfo}>
                                                                <span style={styles.infoLabel}>Justificação:</span>
                                                                <span style={styles.infoValue}>{evento.justificacao}</span>
                                                            </div>
                                                        )}

                                                        {evento.latitude && evento.longitude && (
                                                            <div style={styles.eventInfo}>
                                                                <span style={styles.infoLabel}>Localização:</span>
                                                                <span style={styles.infoValue}>
                                                                    📍 {enderecos[`${evento.latitude},${evento.longitude}`] || 'A obter localização...'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))
                    )}

                    {!loadingDetalhes && Object.entries(registosFiltrados).length === 0 && (
                        <div style={styles.emptyState}>
                            <span style={styles.emptyIcon}>📋</span>
                            <h3>Nenhum registo encontrado</h3>
                            <p>Não foram encontrados registos para os critérios selecionados.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal para remover hora extra */}
            <ModalBase
                isOpen={removerHoraExtraDialogOpen && horaExtraParaRemover}
                onClose={() => {
                    setRemoverHoraExtraDialogOpen(false);
                    setHoraExtraParaRemover(null);
                }}
                title="🗑️ Remover Hora Extra"
                subtitle="Confirmar remoção de hora extra"
                size="medium"
                headerColor="linear-gradient(135deg, #38a169, #2f855a)"
                styles={styles}
                footer={
                    <>
                        <button
                            style={styles.cancelButton}
                            onClick={() => {
                                setRemoverHoraExtraDialogOpen(false);
                                setHoraExtraParaRemover(null);
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            style={{ ...styles.confirmButton, backgroundColor: '#38a169' }}
                            onClick={removerHoraExtra}
                            disabled={loadingRemoverHoraExtra}
                        >
                            {loadingRemoverHoraExtra ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    A remover...
                                </>
                            ) : (
                                '🗑️ Confirmar Remoção'
                            )}
                        </button>
                    </>
                }
            >
                {horaExtraParaRemover && (
                    <div style={{
                        ...styles.selectedCellsContainer,
                        backgroundColor: '#e6fffa',
                        border: '1px solid #81e6d9'
                    }}>
                        <div style={{ fontSize: '0.9rem', color: '#234e52' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <strong>⚠️ ATENÇÃO:</strong>
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                Vai eliminar a hora extra:
                            </div>
                            <div style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '8px', marginTop: '10px' }}>
                                <div><strong>Funcionário:</strong> {horaExtraParaRemover.funcionarioNome}</div>
                                <div><strong>Dia:</strong> {horaExtraParaRemover.dia}/{mesSelecionado}/{anoSelecionado}</div>
                                <div><strong>Tipo:</strong> {tiposHorasExtras[horaExtraParaRemover.tipo] || horaExtraParaRemover.tipo}</div>
                                <div><strong>Tempo:</strong> {formatarHorasParaExibicao(parseFloat(horaExtraParaRemover.tempo))}</div>
                                {horaExtraParaRemover.IdFuncRemCBL && (
                                    <div><strong>ID:</strong> {horaExtraParaRemover.IdFuncRemCBL}</div>
                                )}
                            </div>
                            <div style={{ marginTop: '15px', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                Esta ação <strong>NÃO pode ser desfeita</strong>!
                            </div>
                        </div>
                    </div>
                )}
            </ModalBase>

            {/* Modal para remover falta */}
                            <ModalBase
                                isOpen={removerFaltaDialogOpen && faltaParaRemover}
                                onClose={() => {
                                    setRemoverFaltaDialogOpen(false);
                                    setFaltaParaRemover(null);
                                }}
                                title="🗑️ Remover Falta"
                                subtitle="Confirmar remoção de falta"
                                size="medium"
                                headerColor="linear-gradient(135deg, #e53e3e, #c53030)"
                                styles={styles}
                                footer={
                                    <>
                                        <button
                                            style={styles.cancelButton}
                                            onClick={() => {
                                                setRemoverFaltaDialogOpen(false);
                                                setFaltaParaRemover(null);
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            style={{ ...styles.confirmButton, backgroundColor: '#e53e3e' }}
                                            onClick={removerFalta}
                                            disabled={loadingRemoverFalta}
                                        >
                                            {loadingRemoverFalta ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    A remover...
                                                </>
                                            ) : (
                                                '🗑️ Confirmar Remoção'
                                            )}
                                        </button>
                                    </>
                                }
                            >
                                {faltaParaRemover && (
                                    <div style={{
                                        ...styles.selectedCellsContainer,
                                        backgroundColor: '#fed7d7',
                                        border: '1px solid #fc8181'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', color: '#742a2a' }}>
                                            <div style={{ marginBottom: '10px' }}>
                                                <strong>⚠️ ATENÇÃO:</strong>
                                            </div>
                                            <div style={{ marginBottom: '10px' }}>
                                                Vai eliminar a falta:
                                            </div>
                                            <div style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '8px', marginTop: '10px' }}>
                                                <div><strong>Funcionário:</strong> {faltaParaRemover.funcionarioNome}</div>
                                                <div><strong>Dia:</strong> {faltaParaRemover.dia}/{mesSelecionado}/{anoSelecionado}</div>
                                                <div><strong>Tipo:</strong> {tiposFaltas[faltaParaRemover.falta.Falta] || faltaParaRemover.falta.Falta}</div>
                                                <div><strong>Duração:</strong> {faltaParaRemover.falta.Tempo}{faltaParaRemover.falta.Horas ? 'h' : 'd'}</div>
                                            </div>
                                            <div style={{ marginTop: '15px', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                                Esta ação <strong>NÃO pode ser desfeita</strong>!
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </ModalBase>

                            {/* Modal de Edição Direta */}
            {editModalOpen && registoParaEditar && (
                <EditarRegistoModal
                    registo={registoParaEditar}
                    visible={editModalOpen}
                    onClose={() => {
                        setEditModalOpen(false);
                        setRegistoParaEditar(null);
                        setDadosEdicao({ userId: null, dia: null, registos: [] });
                    }}
                    onSave={salvarEdicaoDirecta}
                />
            )}

            {/* Bolsa de Horas */}
            {viewMode === 'bolsa' && (
                <div style={styles.bolsaSection}>
                    <h3 style={styles.sectionTitle}>
                        <span style={styles.sectionIcon}>💰</span>
                        Bolsa de Horas Acumulada (Global)
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: '#718096', marginBottom: '20px', marginTop: '-10px' }}>
                        Saldo calculado desde o início do horário de cada colaborador até hoje
                    </p>

                    {loadingBolsa && (
                        <div style={styles.loadingCard}>
                            <div style={styles.spinner}></div>
                            <p>A calcular bolsa de horas...</p>
                        </div>
                    )}

                    {!loadingBolsa && bolsaHoras.length === 0 && (
                        <div style={styles.emptyState}>
                            <span style={styles.emptyIcon}>💼</span>
                            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                                Nenhum dado de bolsa de horas disponível para o período selecionado.
                            </p>
                            <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '5px' }}>
                                Certifique-se de que os horários estão definidos para os colaboradores.
                            </p>
                        </div>
                    )}

                    {!loadingBolsa && bolsaHoras.length > 0 && (
                        <>
                            {/* Resumo Geral */}
                            <div style={styles.bolsaResumo}>
                                <div style={styles.bolsaResumoCard}>
                                    <div style={styles.bolsaResumoIcon}>👥</div>
                                    <div>
                                        <div style={styles.bolsaResumoValor}>{bolsaHoras.length}</div>
                                        <div style={styles.bolsaResumoLabel}>Colaboradores</div>
                                    </div>
                                </div>
                                <div style={styles.bolsaResumoCard}>
                                    <div style={{...styles.bolsaResumoIcon, backgroundColor: '#e8f5e9', color: '#4caf50'}}>+</div>
                                    <div>
                                        <div style={{...styles.bolsaResumoValor, color: '#4caf50'}}>
                                            {bolsaHoras.filter(b => b.saldoBolsa > 0).length}
                                        </div>
                                        <div style={styles.bolsaResumoLabel}>Com Saldo Positivo</div>
                                    </div>
                                </div>
                                <div style={styles.bolsaResumoCard}>
                                    <div style={{...styles.bolsaResumoIcon, backgroundColor: '#ffebee', color: '#f44336'}}>-</div>
                                    <div>
                                        <div style={{...styles.bolsaResumoValor, color: '#f44336'}}>
                                            {bolsaHoras.filter(b => b.saldoBolsa < 0).length}
                                        </div>
                                        <div style={styles.bolsaResumoLabel}>Com Saldo Negativo</div>
                                    </div>
                                </div>
                            </div>

                            {/* Lista de Colaboradores */}
                            <div style={styles.bolsaLista}>
                                {bolsaHoras.map((bolsa, index) => (
                                    <div
                                        key={bolsa.utilizador.id}
                                        style={{
                                            ...styles.bolsaCard,
                                            borderLeft: `5px solid ${bolsa.saldoBolsa >= 0 ? '#4caf50' : '#f44336'}`
                                        }}
                                    >
                                        {/* Cabeçalho do Card */}
                                        <div style={styles.bolsaCardHeader}>
                                            <div>
                                                <h4 style={styles.bolsaNome}>👤 {bolsa.utilizador.nome}</h4>
                                                <p style={styles.bolsaEmail}>{bolsa.utilizador.email}</p>
                                                <p style={styles.bolsaHorario}>
                                                    Horário: {bolsa.horario.descricao} ({bolsa.horasPorDia}h/dia)
                                                </p>
                                               
                                            </div>
                                            <div style={styles.bolsaSaldo}>
                                                <div style={{
                                                    ...styles.bolsaSaldoValor,
                                                    color: bolsa.saldoBolsa >= 0 ? '#4caf50' : '#f44336'
                                                }}>
                                                    {bolsa.saldoBolsa >= 0 ? '+' : ''}{formatarHorasMinutos(Math.abs(bolsa.saldoBolsa))}
                                                </div>
                                                <div style={styles.bolsaSaldoLabel}>Saldo</div>
                                            </div>
                                        </div>

                                        {/* Estatísticas */}
                                        <div style={styles.bolsaStats}>
                                            <div style={styles.bolsaStatItem}>
                                                <span style={styles.bolsaStatLabel}>Horas Extras Acumuladas:</span>
                                                <span style={{...styles.bolsaStatValue, color: '#4caf50'}}>+{formatarHorasMinutos(bolsa.totalHorasTrabalhadas)}</span>
                                            </div>

                                            {bolsa.totalHorasDescontadasFBH > 0 && (
                                                <div style={styles.bolsaStatItem}>
                                                    <span style={styles.bolsaStatLabel}>Faltas FBH Descontadas:</span>
                                                    <span style={{...styles.bolsaStatValue, color: '#f44336'}}>-{formatarHorasMinutos(bolsa.totalHorasDescontadasFBH)}</span>
                                                </div>
                                            )}

                                            <div style={styles.bolsaStatItem}>
                                                <span style={styles.bolsaStatLabel}>Dias Trabalhados:</span>
                                                <span style={styles.bolsaStatValue}>{bolsa.diasTrabalhados}</span>
                                            </div>
                                        </div>

                                        {/* Detalhes (opcional, pode expandir) */}
                                        {bolsa.detalhes.length > 0 && (
                                            <details style={styles.bolsaDetalhes}>
                                                <summary style={styles.bolsaDetalhesSummary}>
                                                    Ver últimos 30 dias com diferença ({bolsa.detalhes.length} dias no total)
                                                </summary>
                                                <div style={styles.bolsaDetalhesConteudo}>
                                                    {bolsa.detalhes.slice(0, 30).map((dia, idx) => (
                                                        <div key={idx} style={styles.bolsaDiaItem}>
                                                            <span style={styles.bolsaDiaData}>
                                                                {new Date(dia.data).toLocaleDateString('pt-PT', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric'
                                                                })}
                                                            </span>
                                                            <span style={styles.bolsaDiaHoras}>
                                                                {dia.horasReaisTrabalhadas ? `${formatarHorasMinutos(dia.horasReaisTrabalhadas)} → ${formatarHorasMinutos(dia.horasTrabalhadas)}` : `${formatarHorasMinutos(dia.horasTrabalhadas)}`}
                                                            </span>
                                                            <span style={{
                                                                ...styles.bolsaDiaDiff,
                                                                color: dia.diferenca >= 0 ? '#4caf50' : '#f44336'
                                                            }}>
                                                                {dia.diferenca >= 0 ? '+' : ''}{formatarHorasMinutos(Math.abs(dia.diferenca))}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {bolsa.detalhes.length > 30 && (
                                                        <p style={styles.bolsaDetalhesMore}>
                                                            ... e mais {bolsa.detalhes.length - 30} dias
                                                        </p>
                                                    )}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Empty States */}


            {viewMode === 'grade' && !loadingGrade && (anoSelecionado && mesSelecionado) && (
                <div style={styles.emptyState}>
                    <span style={styles.emptyIcon}></span>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>

                    </p>
                </div>
            )}
        </div>
    );
};

// Estilos agora importados de RegistosPorUtilizadorStyles.js

export default RegistosPorUtilizador;
