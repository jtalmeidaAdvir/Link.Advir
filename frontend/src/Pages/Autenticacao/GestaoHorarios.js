
import React, { useState, useEffect } from 'react';
import { secureStorage } from '../../utils/secureStorage';
import { motion } from 'framer-motion';
import { FaClock, FaPlus, FaEdit, FaTrash, FaUsers, FaHistory, FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

const GestaoHorarios = () => {
    const [activeTab, setActiveTab] = useState('visao-geral');
    const [horarios, setHorarios] = useState([]);
    const [users, setUsers] = useState([]);
    const [planosAtivos, setPlanosAtivos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showPlanoModal, setShowPlanoModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedHorario, setSelectedHorario] = useState(null);
    const [historico, setHistorico] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('todos'); // 'todos', 'com-horario', 'sem-horario'

    // Estados para o calendário
    const [calendarioUser, setCalendarioUser] = useState(null);
    const [calendarioMes, setCalendarioMes] = useState(new Date().getMonth());
    const [calendarioAno, setCalendarioAno] = useState(new Date().getFullYear());
    const [planosCalendario, setPlanosCalendario] = useState([]);

    const [novoHorario, setNovoHorario] = useState({
        descricao: '',
        horasPorDia: 8.00,
        horasSemanais: 40.00,
        diasSemana: [1, 2, 3, 4, 5],
        horaEntrada: '09:00',
        horaSaida: '18:00',
        intervaloAlmoco: 1.00,
        horaInicioAlmoco: '12:00',
        horaFimAlmoco: '13:00',
        tempoArredondamento: '08:45',
        observacoes: ''
    });

    const [novoPlano, setNovoPlano] = useState({
        user_id: '',
        horario_id: '',
        dataInicio: new Date().toISOString().split('T')[0],
        tipoPeriodo: 'permanente',
        diaEspecifico: '',
        mesEspecifico: '',
        anoEspecifico: '',
        observacoes: ''
    });

    const diasSemanaLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    useEffect(() => {
        fetchHorarios();
        fetchUsers();
        fetchPlanosAtivos();
    }, []);

    // Carregar planos do calendário quando o utilizador ou mês/ano mudar
    useEffect(() => {
        if (calendarioUser && calendarioUser.userId) {
            console.log(`[CALENDARIO] useEffect - Carregando planos para userId=${calendarioUser.userId}`);
            carregarPlanosCalendario(calendarioUser.userId, calendarioMes, calendarioAno);
        }
    }, [calendarioUser, calendarioMes, calendarioAno]);

    const fetchHorarios = async () => {
        setLoading(true);
        try {
            const token = secureStorage.getItem('loginToken');
            const empresaId = secureStorage.getItem('empresa_id');

            const response = await fetch(`https://backend.advir.pt/api/horarios/empresa/${empresaId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setHorarios(data);
            }
        } catch (error) {
            console.error('Erro ao carregar horários:', error);
            setErrorMessage('Erro ao carregar horários');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = secureStorage.getItem('loginToken');
            const empresaId = secureStorage.getItem('empresa_id');

            const response = await fetch(`https://backend.advir.pt/api/users/empresa/${empresaId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Erro ao carregar utilizadores:', error);
            setErrorMessage('Erro ao carregar utilizadores');
        }
    };

    const fetchPlanosAtivos = async () => {
        try {
            const token = secureStorage.getItem('loginToken');
            const empresaId = secureStorage.getItem('empresa_id');

            console.log('[PLANOS] Iniciando carregamento de planos ativos...');

            // Buscar todos os utilizadores da empresa
            const usersResponse = await fetch(`https://backend.advir.pt/api/users/empresa/${empresaId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                console.log(`[PLANOS] ${usersData.length} utilizadores encontrados`);
                
                // Para cada utilizador, buscar o plano ativo
                const planosPromises = usersData.map(async (user) => {
                    try {
                        const planoResponse = await fetch(`https://backend.advir.pt/api/horarios/user/${user.id}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (planoResponse.ok) {
                            const planoData = await planoResponse.json();
                            console.log(`[PLANOS] ✅ User ${user.username} (ID: ${user.id}) tem plano:`, planoData);
                            
                            return {
                                userId: user.id,
                                userName: user.username,
                                userEmail: user.email,
                                plano: planoData,
                                hasPlano: true
                            };
                        } else {
                            const errorText = await planoResponse.text();
                            console.log(`[PLANOS] ⚠️ User ${user.username} (ID: ${user.id}) sem plano - Status: ${planoResponse.status}`, errorText);
                        }
                    } catch (err) {
                        console.error(`[PLANOS] ❌ Erro ao buscar plano do user ${user.username}:`, err);
                    }
                    
                    return {
                        userId: user.id,
                        userName: user.username,
                        userEmail: user.email,
                        plano: null,
                        hasPlano: false
                    };
                });

                const planosData = await Promise.all(planosPromises);
                console.log('[PLANOS] Dados finais:', planosData);
                console.log(`[PLANOS] Total: ${planosData.length} | Com horário: ${planosData.filter(p => p.hasPlano).length} | Sem horário: ${planosData.filter(p => !p.hasPlano).length}`);
                
                setPlanosAtivos(planosData);
            } else {
                console.error('[PLANOS] Erro ao buscar utilizadores:', usersResponse.status);
            }
        } catch (error) {
            console.error('[PLANOS] Erro ao carregar planos ativos:', error);
            setErrorMessage('Erro ao carregar dados dos utilizadores');
        }
    };

    const handleCriarHorario = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const token = secureStorage.getItem('loginToken');
            const empresaId = secureStorage.getItem('empresa_id');

            const isEditing = selectedHorario && selectedHorario.id;
            const url = isEditing 
                ? `https://backend.advir.pt/api/horarios/${selectedHorario.id}`
                : `https://backend.advir.pt/api/horarios/empresa/${empresaId}`;
            
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(novoHorario)
            });

            if (response.ok) {
                setSuccessMessage(isEditing ? 'Horário atualizado com sucesso!' : 'Horário criado com sucesso!');
                setShowModal(false);
                setSelectedHorario(null);
                resetNovoHorario();
                fetchHorarios();
            } else {
                const error = await response.json();
                setErrorMessage(error.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} horário`);
            }
        } catch (error) {
            console.error('Erro ao processar horário:', error);
            setErrorMessage('Erro ao processar horário');
        } finally {
            setLoading(false);
        }
    };

    const handleAtribuirHorario = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const token = secureStorage.getItem('loginToken');

            if (!novoPlano.user_id || !novoPlano.horario_id) {
                setErrorMessage('Por favor, selecione um utilizador e um horário.');
                setLoading(false);
                return;
            }

            // Calcular prioridade baseada no tipo de período
            let prioridade = 0;
            if (novoPlano.tipoPeriodo === 'dia') prioridade = 3;
            else if (novoPlano.tipoPeriodo === 'mes') prioridade = 2;
            else if (novoPlano.tipoPeriodo === 'ano') prioridade = 1;

            const payload = {
                userId: parseInt(novoPlano.user_id, 10),
                horarioId: parseInt(novoPlano.horario_id, 10),
                dataInicio: novoPlano.dataInicio,
                tipoPeriodo: novoPlano.tipoPeriodo,
                diaEspecifico: novoPlano.tipoPeriodo === 'dia' ? novoPlano.diaEspecifico : null,
                mesEspecifico: novoPlano.tipoPeriodo === 'mes' ? parseInt(novoPlano.mesEspecifico, 10) : null,
                anoEspecifico: novoPlano.tipoPeriodo === 'ano' ? parseInt(novoPlano.anoEspecifico, 10) : null,
                prioridade: prioridade,
                observacoes: novoPlano.observacoes || ''
            };

            const response = await fetch(`https://backend.advir.pt/api/horarios/atribuir`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage('Horário atribuído com sucesso!');
                setShowPlanoModal(false);
                resetNovoPlano();

                // Aguardar um pouco antes de recarregar para garantir que o backend processou
                setTimeout(() => {
                    fetchPlanosAtivos();
                    // Se estamos no calendário, recarregar os planos do calendário
                    if (calendarioUser && activeTab === 'calendario') {
                        carregarPlanosCalendario(calendarioUser.userId, calendarioMes, calendarioAno);
                    }
                }, 500);
            } else {
                setErrorMessage(data.message || data.error || 'Erro ao atribuir horário');
            }
        } catch (error) {
            console.error('Erro ao atribuir horário:', error);
            setErrorMessage('Erro de conexão ao atribuir horário: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEliminarHorario = async (horarioId) => {
        if (!window.confirm('Tem certeza que deseja eliminar este horário?')) return;

        try {
            const token = secureStorage.getItem('loginToken');

            const response = await fetch(`https://backend.advir.pt/api/horarios/${horarioId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setSuccessMessage('Horário eliminado com sucesso!');
                fetchHorarios();
            } else {
                const error = await response.json();
                setErrorMessage(error.message || 'Erro ao eliminar horário');
            }
        } catch (error) {
            console.error('Erro ao eliminar horário:', error);
            setErrorMessage('Erro ao eliminar horário');
        }
    };

    const verHistorico = async (userId) => {
        try {
            const token = secureStorage.getItem('loginToken');

            const response = await fetch(`https://backend.advir.pt/api/horarios/user/${userId}/historico`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setHistorico(data);
                setSelectedUser(planosAtivos.find(p => p.userId === userId));
                setActiveTab('historico');
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    };

    const formatHora = (v) => {
        if (!v) return '';
        if (/^\d{2}:\d{2}$/.test(v)) return v;
        const m = String(v).match(/T(\d{2}):(\d{2})/);
        if (m) return `${m[1]}:${m[2]}`;
        try {
            const d = new Date(v);
            return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch {
            return '';
        }
    };

    const resetNovoHorario = () => {
        setNovoHorario({
            descricao: '',
            horasPorDia: 8.00,
            horasSemanais: 40.00,
            diasSemana: [1, 2, 3, 4, 5],
            horaEntrada: '09:00',
            horaSaida: '18:00',
            intervaloAlmoco: 1.00,
            horaInicioAlmoco: '12:00',
            horaFimAlmoco: '13:00',
            tempoArredondamento: '08:45',
            observacoes: ''
        });
    };

    const resetNovoPlano = () => {
        setNovoPlano({
            user_id: '',
            horario_id: '',
            dataInicio: new Date().toISOString().split('T')[0],
            tipoPeriodo: 'permanente',
            diaEspecifico: '',
            mesEspecifico: '',
            anoEspecifico: '',
            observacoes: ''
        });
    };

    const toggleDiaSemana = (dia) => {
        setNovoHorario(prev => ({
            ...prev,
            diasSemana: prev.diasSemana.includes(dia)
                ? prev.diasSemana.filter(d => d !== dia)
                : [...prev.diasSemana, dia].sort()
        }));
    };

    // Funções para o calendário
    const getDiasDoMes = (mes, ano) => {
        const primeiroDia = new Date(ano, mes, 1);
        const ultimoDia = new Date(ano, mes + 1, 0);
        const diasNoMes = ultimoDia.getDate();
        const diaSemanaInicio = primeiroDia.getDay(); // 0 = Domingo, 1 = Segunda, etc.

        const dias = [];

        // Adicionar dias vazios no início
        for (let i = 0; i < diaSemanaInicio; i++) {
            dias.push(null);
        }

        // Adicionar os dias do mês
        for (let dia = 1; dia <= diasNoMes; dia++) {
            dias.push(dia);
        }

        return dias;
    };

    const carregarPlanosCalendario = async (userId, mes, ano) => {
        try {
            const token = secureStorage.getItem('loginToken');
            console.log(`[CALENDARIO] Carregando planos para userId=${userId}, mes=${mes}, ano=${ano}`);

            const response = await fetch(`https://backend.advir.pt/api/horarios/user/${userId}/historico`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`[CALENDARIO] Planos carregados:`, data);
                setPlanosCalendario(Array.isArray(data) ? data : []);
            } else {
                const errorText = await response.text();
                console.error(`[CALENDARIO] Erro na resposta: ${response.status}`, errorText);
                setPlanosCalendario([]);
                if (response.status === 404) {
                    console.log(`[CALENDARIO] Utilizador ${userId} não tem histórico de horários`);
                } else if (response.status === 500) {
                    console.error(`[CALENDARIO] Erro no servidor ao buscar histórico do utilizador ${userId}`);
                    setErrorMessage('Erro ao carregar histórico de horários. Por favor, contacte o suporte.');
                }
            }
        } catch (error) {
            console.error('[CALENDARIO] Erro ao carregar planos do calendário:', error);
            setPlanosCalendario([]);
        }
    };

    const getPlanoParaDia = (dia) => {
        if (!calendarioUser || !dia) return null;

        const dataAtual = new Date(calendarioAno, calendarioMes, dia);
        const dataAtualStr = dataAtual.toISOString().split('T')[0];

        console.log(`[CALENDARIO] Verificando plano para dia ${dia}: dataAtualStr=${dataAtualStr}, total planos=${planosCalendario.length}`);

        // Buscar planos que se aplicam a este dia, ordenados por prioridade
        const planosAplicaveis = planosCalendario.filter(plano => {
            console.log(`[CALENDARIO] Verificando plano ID ${plano.id}: ativo=${plano.ativo}, tipoPeriodo=${plano.tipoPeriodo}`);

            if (!plano.ativo) {
                console.log(`[CALENDARIO] Plano ${plano.id} não está ativo`);
                return false;
            }

            // Verificar se está dentro do período de vigência
            const dataInicio = new Date(plano.dataInicio);
            const dataFim = plano.dataFim ? new Date(plano.dataFim) : null;

            console.log(`[CALENDARIO] Plano ${plano.id}: dataInicio=${plano.dataInicio}, dataFim=${plano.dataFim}`);

            if (dataAtual < dataInicio) {
                console.log(`[CALENDARIO] Data ${dataAtualStr} antes do início ${plano.dataInicio}`);
                return false;
            }
            if (dataFim && dataAtual > dataFim) {
                console.log(`[CALENDARIO] Data ${dataAtualStr} depois do fim ${plano.dataFim}`);
                return false;
            }

            // Verificar tipo de período
            if (plano.tipoPeriodo === 'dia' && plano.diaEspecifico) {
                const match = plano.diaEspecifico === dataAtualStr;
                console.log(`[CALENDARIO] Tipo DIA: diaEspecifico=${plano.diaEspecifico}, match=${match}`);
                return match;
            } else if (plano.tipoPeriodo === 'mes' && plano.mesEspecifico) {
                const match = (dataAtual.getMonth() + 1) === plano.mesEspecifico;
                console.log(`[CALENDARIO] Tipo MES: mesEspecifico=${plano.mesEspecifico}, mesAtual=${dataAtual.getMonth() + 1}, match=${match}`);
                return match;
            } else if (plano.tipoPeriodo === 'ano' && plano.anoEspecifico) {
                const match = dataAtual.getFullYear() === plano.anoEspecifico;
                console.log(`[CALENDARIO] Tipo ANO: anoEspecifico=${plano.anoEspecifico}, anoAtual=${dataAtual.getFullYear()}, match=${match}`);
                return match;
            } else if (plano.tipoPeriodo === 'permanente') {
                console.log(`[CALENDARIO] Tipo PERMANENTE: match=true`);
                return true;
            }

            console.log(`[CALENDARIO] Plano ${plano.id} não se aplica a este dia`);
            return false;
        }).sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0));

        console.log(`[CALENDARIO] Planos aplicáveis ao dia ${dia}: ${planosAplicaveis.length}`);
        if (planosAplicaveis.length > 0) {
            console.log(`[CALENDARIO] Plano selecionado:`, planosAplicaveis[0]);
        }

        return planosAplicaveis.length > 0 ? planosAplicaveis[0] : null;
    };

    const atribuirHorarioDia = async (dia) => {
        if (!calendarioUser) {
            setErrorMessage('Selecione um utilizador primeiro');
            return;
        }

        const dataEspecifica = new Date(calendarioAno, calendarioMes, dia).toISOString().split('T')[0];

        setNovoPlano({
            user_id: calendarioUser.userId,
            horario_id: '',
            dataInicio: dataEspecifica,
            tipoPeriodo: 'dia',
            diaEspecifico: dataEspecifica,
            mesEspecifico: '',
            anoEspecifico: '',
            observacoes: `Horário para ${dia}/${calendarioMes + 1}/${calendarioAno}`
        });

        setShowPlanoModal(true);
    };

    // Estatísticas
    const totalUsers = planosAtivos.length;
    const usersComHorario = planosAtivos.filter(p => p.hasPlano).length;
    const usersSemHorario = totalUsers - usersComHorario;

    // Filtragem de utilizadores
    const planosFiltrados = planosAtivos.filter(plano => {
        // Filtro de pesquisa
        const matchSearch = searchTerm === '' || 
            plano.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            plano.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Filtro de status
        let matchStatus = true;
        if (filtroStatus === 'com-horario') {
            matchStatus = plano.hasPlano;
        } else if (filtroStatus === 'sem-horario') {
            matchStatus = !plano.hasPlano;
        }
        
        return matchSearch && matchStatus;
    });

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>
                    <FaClock style={styles.titleIcon} />
                    Gestão de Horários
                </h1>
            </div>

            {errorMessage && (
                <div style={styles.errorMessage}>{errorMessage}</div>
            )}
            {successMessage && (
                <div style={styles.successMessage}>{successMessage}</div>
            )}

            {/* Tabs */}
            <div style={styles.tabs}>
                <button
                    style={activeTab === 'visao-geral' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('visao-geral')}
                >
                    <FaUsers /> Visão Geral
                </button>
                <button
                    style={activeTab === 'horarios' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('horarios')}
                >
                    <FaClock /> Horários
                </button>
                <button
                    style={activeTab === 'calendario' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('calendario')}
                >
                    <FaHistory /> Calendário
                </button>
            </div>

            {/* Visão Geral - Nova Tab Principal */}
            {activeTab === 'visao-geral' && (
                <div style={styles.content}>
                    {/* Estatísticas */}
                    <div style={styles.statsGrid}>
                        <div style={styles.statCard}>
                            <div style={styles.statIcon} className="stat-icon-total">
                                <FaUsers />
                            </div>
                            <div style={styles.statContent}>
                                <div style={styles.statValue}>{totalUsers}</div>
                                <div style={styles.statLabel}>Total de Utilizadores</div>
                            </div>
                        </div>

                        <div style={styles.statCard}>
                            <div style={{...styles.statIcon, backgroundColor: '#e8f5e9'}} className="stat-icon-com">
                                <FaCheck style={{color: '#4caf50'}} />
                            </div>
                            <div style={styles.statContent}>
                                <div style={{...styles.statValue, color: '#4caf50'}}>{usersComHorario}</div>
                                <div style={styles.statLabel}>Com Horário Definido</div>
                            </div>
                        </div>

                        <div style={styles.statCard}>
                            <div style={{...styles.statIcon, backgroundColor: '#fff3e0'}} className="stat-icon-sem">
                                <FaExclamationTriangle style={{color: '#ff9800'}} />
                            </div>
                            <div style={styles.statContent}>
                                <div style={{...styles.statValue, color: '#ff9800'}}>{usersSemHorario}</div>
                                <div style={styles.statLabel}>Sem Horário Definido</div>
                            </div>
                        </div>
                    </div>

                    {/* Ações Rápidas */}
                    <div style={styles.actionBar}>
                        <button
                            style={styles.btnPrimary}
                            onClick={() => setShowPlanoModal(true)}
                        >
                            <FaPlus /> Atribuir Horário
                        </button>
                    </div>

                    {/* Lista de Utilizadores com Status Visual */}
                    <div style={styles.usersListContainer}>
                        <h3 style={styles.sectionTitle}>Utilizadores</h3>
                        
                        {/* Barra de Pesquisa e Filtros */}
                        <div style={styles.searchFilterContainer}>
                            <div style={styles.searchBox}>
                                <input
                                    type="text"
                                    placeholder="Pesquisar por nome "
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={styles.searchInput}
                                />
                            </div>
                            
                            <div style={styles.filterButtons}>
                                <button
                                    style={filtroStatus === 'todos' ? styles.filterButtonActive : styles.filterButton}
                                    onClick={() => setFiltroStatus('todos')}
                                >
                                    Todos ({totalUsers})
                                </button>
                                <button
                                    style={filtroStatus === 'com-horario' ? styles.filterButtonActiveSuccess : styles.filterButton}
                                    onClick={() => setFiltroStatus('com-horario')}
                                >
                                    <FaCheck style={{marginRight: '5px'}} />
                                    Com Horário ({usersComHorario})
                                </button>
                                <button
                                    style={filtroStatus === 'sem-horario' ? styles.filterButtonActiveWarning : styles.filterButton}
                                    onClick={() => setFiltroStatus('sem-horario')}
                                >
                                    <FaExclamationTriangle style={{marginRight: '5px'}} />
                                    Sem Horário ({usersSemHorario})
                                </button>
                            </div>
                        </div>

                        {/* Resultados da Pesquisa */}
                        {planosFiltrados.length === 0 ? (
                            <div style={styles.noResults}>
                                <FaExclamationTriangle style={{fontSize: '48px', color: '#ff9800', marginBottom: '15px'}} />
                                <p style={{fontSize: '16px', color: '#757575'}}>
                                    Nenhum utilizador encontrado com os filtros selecionados.
                                </p>
                            </div>
                        ) : (
                            <div style={styles.resultadosInfo}>
                                A mostrar <strong>{planosFiltrados.length}</strong> de <strong>{totalUsers}</strong> utilizadores
                            </div>
                        )}
                        
                        <div style={styles.usersCompactList}>
                            {planosFiltrados.map(plano => (
                                <div 
                                    key={plano.userId} 
                                    style={plano.hasPlano ? styles.userItemComHorario : styles.userItemSemHorario}
                                >
                                    <div style={styles.userItemLeft}>
                                        <div style={plano.hasPlano ? styles.statusIndicatorAtivo : styles.statusIndicatorInativo}>
                                            {plano.hasPlano ? <FaCheck /> : <FaTimes />}
                                        </div>
                                        <div style={styles.userItemInfo}>
                                            <h4 style={styles.userName}>{plano.userName}</h4>
                                            <p style={styles.userEmail}></p>
                                            {plano.hasPlano && plano.plano?.Horario && (
                                                <>
                                                    <div style={styles.horarioTag}>
                                                        <FaClock style={{fontSize: '12px', marginRight: '5px'}} />
                                                        {plano.plano.Horario.descricao} ({plano.plano.Horario.horasSemanais}h/sem)
                                                    </div>
                                                    {plano.plano.tipoPeriodo && plano.plano.tipoPeriodo !== 'permanente' && (
                                                        <div style={{...styles.horarioTag, backgroundColor: '#fff3e0', color: '#f57c00', fontSize: '12px', marginTop: '5px'}}>
                                                            {plano.plano.tipoPeriodo === 'dia' && `📅 Dia: ${new Date(plano.plano.diaEspecifico).toLocaleDateString('pt-PT')}`}
                                                            {plano.plano.tipoPeriodo === 'mes' && `📅 Mês: ${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][plano.plano.mesEspecifico - 1]}`}
                                                            {plano.plano.tipoPeriodo === 'ano' && `📅 Ano: ${plano.plano.anoEspecifico}`}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div style={styles.userItemActions}>
                                        {plano.hasPlano ? (
                                            <>
                                              
                                                <button
                                                    style={styles.btnEditar}
                                                    onClick={() => {
                                                        setNovoPlano({
                                                            user_id: plano.userId,
                                                            horario_id: '',
                                                            dataInicio: new Date().toISOString().split('T')[0],
                                                            observacoes: ''
                                                        });
                                                        setShowPlanoModal(true);
                                                    }}
                                                >
                                                    <FaEdit />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                style={styles.btnAtribuir}
                                                onClick={() => {
                                                    setNovoPlano({
                                                        user_id: plano.userId,
                                                        horario_id: '',
                                                        dataInicio: new Date().toISOString().split('T')[0],
                                                        observacoes: ''
                                                    });
                                                    setShowPlanoModal(true);
                                                }}
                                            >
                                                <FaPlus />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Horários */}
            {activeTab === 'horarios' && (
                <div style={styles.content}>
                    <div style={styles.actionBar}>
                        <button
                            style={styles.btnPrimary}
                            onClick={() => setShowModal(true)}
                        >
                            <FaPlus /> Novo Horário
                        </button>
                    </div>

                    <div style={styles.grid}>
                        {horarios.map(horario => (
                            <motion.div
                                key={horario.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={styles.card}
                            >
                                <div style={styles.cardHeader}>
                                    <h3 style={styles.cardTitle}>{horario.descricao}</h3>
                                    <div style={styles.cardActions}>
                                        <button
                                            style={styles.btnIcon}
                                            onClick={() => {
                                                setSelectedHorario(horario);
                                                setNovoHorario(horario);
                                                setShowModal(true);
                                            }}
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            style={styles.btnIconDanger}
                                            onClick={() => handleEliminarHorario(horario.id)}
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                                <div style={styles.cardBody}>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Horas/Dia:</span>
                                        <span style={styles.value}>{horario.horasPorDia}h</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Horas/Semana:</span>
                                        <span style={styles.value}>{horario.horasSemanais}h</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Hora entrada:</span>
                                        <span style={styles.value}>
                                            {formatHora(horario.horaEntrada)}
                                        </span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Hora saída:</span>
                                        <span style={styles.value}>
                                            {formatHora(horario.horaSaida)}
                                        </span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Intervalo:</span>
                                        <span style={styles.value}>{horario.intervaloAlmoco}h</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Almoço:</span>
                                        <span style={styles.value}>
                                            {formatHora(horario.horaInicioAlmoco) && formatHora(horario.horaFimAlmoco)
                                                ? `${formatHora(horario.horaInicioAlmoco)} - ${formatHora(horario.horaFimAlmoco)}`
                                                : 'Não definido'}
                                        </span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Arredondamento:</span>
                                        <span style={styles.value}>
                                            {formatHora(horario.tempoArredondamento) || 'Não definido'}
                                        </span>
                                    </div>
                                    <div style={styles.diasSemana}>
                                        {diasSemanaLabels.map((dia, idx) => (
                                            <span
                                                key={idx}
                                                style={{
                                                    ...styles.diaBadge,
                                                    ...(horario.diasSemana?.includes(idx + 1)
                                                        ? styles.diaAtivo
                                                        : styles.diaInativo)
                                                }}
                                            >
                                                {dia}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab Histórico */}
            {activeTab === 'historico' && selectedUser && (
                <div style={styles.content}>
                    <div style={styles.actionBar}>
                        <h3>Histórico de {selectedUser.userName}</h3>
                        <button
                            style={styles.btnSecondary}
                            onClick={() => setActiveTab('visao-geral')}
                        >
                            Voltar
                        </button>
                    </div>

                    <div style={styles.historicoList}>
                        {historico.map(plano => (
                            <div key={plano.id} style={styles.historicoCard}>
                                <div style={styles.historicoHeader}>
                                    <h4>{plano.Horario?.descricao}</h4>
                                    <span style={plano.ativo ? styles.badgeAtivo : styles.badgeInativo}>
                                        {plano.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                                <div style={styles.historicoBody}>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Data Início:</span>
                                        <span style={styles.value}>
                                            {new Date(plano.dataInicio).toLocaleDateString('pt-PT')}
                                        </span>
                                    </div>
                                    {plano.dataFim && (
                                        <div style={styles.infoRow}>
                                            <span style={styles.label}>Data Fim:</span>
                                            <span style={styles.value}>
                                                {new Date(plano.dataFim).toLocaleDateString('pt-PT')}
                                            </span>
                                        </div>
                                    )}
                                    {plano.observacoes && (
                                        <div style={styles.observacoes}>
                                            <span style={styles.label}>Observações:</span>
                                            <p>{plano.observacoes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab Calendário */}
            {activeTab === 'calendario' && (
                <div style={styles.content}>
                    <h3 style={styles.sectionTitle}>Calendário de Horários</h3>

                    {/* Seletor de Utilizador */}
                    <div style={styles.calendarioControls}>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Utilizador *</label>
                            <select
                                style={styles.formInput}
                                value={calendarioUser?.userId || ''}
                                onChange={(e) => {
                                    const userId = parseInt(e.target.value);
                                    const user = planosAtivos.find(p => p.userId === userId);
                                    setCalendarioUser(user);
                                    // O useEffect vai carregar os planos automaticamente
                                }}
                            >
                                <option value="">Selecione um utilizador</option>
                                {planosAtivos.map(plano => (
                                    <option key={plano.userId} value={plano.userId}>
                                        {plano.userName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Navegação do Calendário */}
                        <div style={styles.calendarioNav}>
                            <button
                                style={styles.btnSecondary}
                                onClick={() => {
                                    if (calendarioMes === 0) {
                                        setCalendarioMes(11);
                                        setCalendarioAno(calendarioAno - 1);
                                    } else {
                                        setCalendarioMes(calendarioMes - 1);
                                    }
                                    // O useEffect vai carregar os planos automaticamente
                                }}
                            >
                                ← Anterior
                            </button>
                            <h3 style={styles.calendarioMesAno}>
                                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][calendarioMes]} {calendarioAno}
                            </h3>
                            <button
                                style={styles.btnSecondary}
                                onClick={() => {
                                    if (calendarioMes === 11) {
                                        setCalendarioMes(0);
                                        setCalendarioAno(calendarioAno + 1);
                                    } else {
                                        setCalendarioMes(calendarioMes + 1);
                                    }
                                    // O useEffect vai carregar os planos automaticamente
                                }}
                            >
                                Próximo →
                            </button>
                        </div>
                    </div>

                    {/* Calendário */}
                    {calendarioUser ? (
                        <div style={styles.calendarioContainer}>
                            {/* Cabeçalho dos dias da semana */}
                            <div style={styles.calendarioHeader}>
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                                    <div key={dia} style={styles.calendarioDiaSemana}>{dia}</div>
                                ))}
                            </div>

                            {/* Grid de dias */}
                            <div style={styles.calendarioGrid}>
                                {getDiasDoMes(calendarioMes, calendarioAno).map((dia, index) => {
                                    if (!dia) {
                                        return <div key={`empty-${index}`} style={styles.calendarioDiaVazio}></div>;
                                    }

                                    const plano = getPlanoParaDia(dia);
                                    const temHorario = !!plano;
                                    const hoje = new Date();
                                    const ehHoje = dia === hoje.getDate() &&
                                                   calendarioMes === hoje.getMonth() &&
                                                   calendarioAno === hoje.getFullYear();

                                    return (
                                        <div
                                            key={dia}
                                            style={{
                                                ...styles.calendarioDia,
                                                ...(ehHoje ? styles.calendarioDiaHoje : {}),
                                                ...(temHorario ? styles.calendarioDiaComHorario : {})
                                            }}
                                            onClick={() => atribuirHorarioDia(dia)}
                                        >
                                            <div style={styles.calendarioDiaNumero}>{dia}</div>
                                            {temHorario && plano.Horario && (
                                                <div style={styles.calendarioDiaHorario}>
                                                    <div style={styles.calendarioHorarioNome}>{plano.Horario.descricao}</div>
                                                    <div style={styles.calendarioHorarioHoras}>
                                                        {formatHora(plano.Horario.horaEntrada)} - {formatHora(plano.Horario.horaSaida)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Legenda */}
                            <div style={styles.calendarioLegenda}>
                                <div style={styles.legendaItem}>
                                    <div style={{...styles.legendaCor, backgroundColor: '#e3f2fd', border: '2px solid #1976D2'}}></div>
                                    <span>Hoje</span>
                                </div>
                                <div style={styles.legendaItem}>
                                    <div style={{...styles.legendaCor, backgroundColor: '#e8f5e9'}}></div>
                                    <span>Com horário definido</span>
                                </div>
                                <div style={styles.legendaItem}>
                                    <div style={{...styles.legendaCor, backgroundColor: '#f5f5f5'}}></div>
                                    <span>Sem horário específico</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={styles.calendarioPlaceholder}>
                            <FaUsers style={{fontSize: '48px', color: '#ccc', marginBottom: '15px'}} />
                            <p>Selecione um utilizador para ver e gerir o calendário de horários</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Criar/Editar Horário */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={styles.modalTitle}>
                            {selectedHorario ? 'Editar Horário' : 'Novo Horário'}
                        </h2>
                        <form onSubmit={handleCriarHorario}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Descrição *</label>
                                <input
                                    type="text"
                                    style={styles.formInput}
                                    value={novoHorario.descricao}
                                    onChange={e => setNovoHorario({ ...novoHorario, descricao: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Horas/Dia *</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        style={styles.formInput}
                                        value={novoHorario.horasPorDia}
                                        onChange={e => setNovoHorario({ ...novoHorario, horasPorDia: parseFloat(e.target.value) })}
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Horas/Semana *</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        style={styles.formInput}
                                        value={novoHorario.horasSemanais}
                                        onChange={e => setNovoHorario({ ...novoHorario, horasSemanais: parseFloat(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Hora Entrada</label>
                                    <input
                                        type="time"
                                        style={styles.formInput}
                                        value={novoHorario.horaEntrada || ''}
                                        onChange={e => setNovoHorario({ ...novoHorario, horaEntrada: e.target.value })}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Hora Saída</label>
                                    <input
                                        type="time"
                                        style={styles.formInput}
                                        value={novoHorario.horaSaida || ''}
                                        onChange={e => setNovoHorario({ ...novoHorario, horaSaida: e.target.value })}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Intervalo (horas)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        style={styles.formInput}
                                        value={novoHorario.intervaloAlmoco || 0}
                                        onChange={e => setNovoHorario({ ...novoHorario, intervaloAlmoco: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Início do Almoço</label>
                                    <input
                                        type="time"
                                        style={styles.formInput}
                                        value={novoHorario.horaInicioAlmoco || ''}
                                        onChange={e => setNovoHorario({ ...novoHorario, horaInicioAlmoco: e.target.value })}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Fim do Almoço</label>
                                    <input
                                        type="time"
                                        style={styles.formInput}
                                        value={novoHorario.horaFimAlmoco || ''}
                                        onChange={e => setNovoHorario({ ...novoHorario, horaFimAlmoco: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Tempo de Arredondamento (Bolsa de Horas)</label>
                                <input
                                    type="time"
                                    style={styles.formInput}
                                    value={novoHorario.tempoArredondamento || '-'}
                                    onChange={e => setNovoHorario({ ...novoHorario, tempoArredondamento: e.target.value })}
                                />
                                <small style={{ color: '#757575', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                                    Define a partir de que tempo é feita a contabilização para a bolsa de horas (ex: 08:45 = a partir de 8h45min conta como 1h)
                                </small>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Dias da Semana</label>
                                <div style={styles.diasSemanaSelector}>
                                    {diasSemanaLabels.map((dia, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            style={{
                                                ...styles.diaButton,
                                                ...(novoHorario.diasSemana.includes(idx + 1)
                                                    ? styles.diaButtonAtivo
                                                    : {})
                                            }}
                                            onClick={() => toggleDiaSemana(idx + 1)}
                                        >
                                            {dia}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Observações</label>
                                <textarea
                                    style={styles.formTextarea}
                                    value={novoHorario.observacoes}
                                    onChange={e => setNovoHorario({ ...novoHorario, observacoes: e.target.value })}
                                    rows="3"
                                />
                            </div>

                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    style={styles.btnSecondary}
                                    onClick={() => {
                                        setShowModal(false);
                                        setSelectedHorario(null);
                                        resetNovoHorario();
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button type="submit" style={styles.btnPrimary} disabled={loading}>
                                    {loading ? 'A guardar...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Atribuir Horário */}
            {showPlanoModal && (
                <div style={styles.modalOverlay} onClick={() => setShowPlanoModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={styles.modalTitle}>Atribuir Horário</h2>
                        <form onSubmit={handleAtribuirHorario}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Utilizador *</label>
                                <select
                                    style={styles.formInput}
                                    value={novoPlano.user_id}
                                    onChange={e => setNovoPlano({ ...novoPlano, user_id: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione um utilizador</option>
                                    {planosAtivos.map(plano => (
                                        <option key={plano.userId} value={plano.userId}>
                                            {plano.userName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Horário *</label>
                                <select
                                    style={styles.formInput}
                                    value={novoPlano.horario_id}
                                    onChange={e => setNovoPlano({ ...novoPlano, horario_id: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione um horário</option>
                                    {horarios.map(horario => (
                                        <option key={horario.id} value={horario.id}>
                                            {horario.descricao} ({horario.horasSemanais}h/semana)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Tipo de Período *</label>
                                <select
                                    style={styles.formInput}
                                    value={novoPlano.tipoPeriodo}
                                    onChange={e => setNovoPlano({
                                        ...novoPlano,
                                        tipoPeriodo: e.target.value,
                                        diaEspecifico: '',
                                        mesEspecifico: '',
                                        anoEspecifico: ''
                                    })}
                                    required
                                >
                                    <option value="permanente">Permanente</option>
                                    <option value="ano">Anual (Ano Específico)</option>
                                    <option value="mes">Mensal (Mês Específico)</option>
                                    <option value="dia">Diário (Dia Específico)</option>
                                </select>
                                <small style={{ color: '#757575', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                                    {novoPlano.tipoPeriodo === 'permanente' && 'Horário será aplicado permanentemente'}
                                    {novoPlano.tipoPeriodo === 'ano' && 'Horário será aplicado apenas no ano específico'}
                                    {novoPlano.tipoPeriodo === 'mes' && 'Horário será aplicado apenas no mês específico todos os anos'}
                                    {novoPlano.tipoPeriodo === 'dia' && 'Horário será aplicado apenas no dia específico'}
                                </small>
                            </div>

                            {novoPlano.tipoPeriodo === 'dia' && (
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Dia Específico *</label>
                                    <input
                                        type="date"
                                        style={styles.formInput}
                                        value={novoPlano.diaEspecifico}
                                        onChange={e => setNovoPlano({ ...novoPlano, diaEspecifico: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            {novoPlano.tipoPeriodo === 'mes' && (
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Mês Específico *</label>
                                    <select
                                        style={styles.formInput}
                                        value={novoPlano.mesEspecifico}
                                        onChange={e => setNovoPlano({ ...novoPlano, mesEspecifico: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecione o mês</option>
                                        <option value="1">Janeiro</option>
                                        <option value="2">Fevereiro</option>
                                        <option value="3">Março</option>
                                        <option value="4">Abril</option>
                                        <option value="5">Maio</option>
                                        <option value="6">Junho</option>
                                        <option value="7">Julho</option>
                                        <option value="8">Agosto</option>
                                        <option value="9">Setembro</option>
                                        <option value="10">Outubro</option>
                                        <option value="11">Novembro</option>
                                        <option value="12">Dezembro</option>
                                    </select>
                                </div>
                            )}

                            {novoPlano.tipoPeriodo === 'ano' && (
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Ano Específico *</label>
                                    <input
                                        type="number"
                                        style={styles.formInput}
                                        value={novoPlano.anoEspecifico}
                                        onChange={e => setNovoPlano({ ...novoPlano, anoEspecifico: e.target.value })}
                                        min="2020"
                                        max="2100"
                                        placeholder="ex: 2025"
                                        required
                                    />
                                </div>
                            )}

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Data Início *</label>
                                <input
                                    type="date"
                                    style={styles.formInput}
                                    value={novoPlano.dataInicio}
                                    onChange={e => setNovoPlano({ ...novoPlano, dataInicio: e.target.value })}
                                    required
                                />
                                <small style={{ color: '#757575', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                                    Data de início da vigência deste plano de horário
                                </small>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Observações</label>
                                <textarea
                                    style={styles.formTextarea}
                                    value={novoPlano.observacoes}
                                    onChange={e => setNovoPlano({ ...novoPlano, observacoes: e.target.value })}
                                    rows="3"
                                />
                            </div>

                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    style={styles.btnSecondary}
                                    onClick={() => {
                                        setShowPlanoModal(false);
                                        resetNovoPlano();
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button type="submit" style={styles.btnPrimary} disabled={loading}>
                                    {loading ? 'A atribuir...' : 'Atribuir'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
    padding: '20px',
    width: '100%',
    fontFamily: 'Poppins, sans-serif',
    boxSizing: 'border-box',
    minHeight: '100vh',
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden'
},


'@media (min-width: 600px)': {
    container: {
        padding: '20px'
    }
}
,
    header: {
        marginBottom: '30px'
    },
    title: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#1976D2',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
    },
    titleIcon: {
        fontSize: '28px'
    },
    tabs: {
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #e0e0e0'
    },
    tab: {
        padding: '12px 24px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '3px solid transparent',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '500',
        color: '#757575',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease'
    },
    activeTab: {
        padding: '12px 24px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '3px solid #1976D2',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '600',
        color: '#1976D2',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    content: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px'
    },
    statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '15px',
    marginBottom: '30px',
},

// Responsivo
'@media (min-width: 600px)': {
    statsGrid: {
        gridTemplateColumns: 'repeat(2, 1fr)',
    },
},
'@media (min-width: 900px)': {
    statsGrid: {
        grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px'
},

'@media (min-width: 600px)': {
    grid: {
        gridTemplateColumns: 'repeat(2, 1fr)',
    },
},

'@media (min-width: 900px)': {
    grid: {
        gridTemplateColumns: 'repeat(3, 1fr)',
    },
},

    },
},

    statCard: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    statIcon: {
        width: '60px',
        height: '60px',
        borderRadius: '12px',
        backgroundColor: '#e3f2fd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        color: '#1976D2'
    },
    statContent: {
        flex: 1
    },
    statValue: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#1976D2',
        marginBottom: '5px'
    },
    statLabel: {
        fontSize: '14px',
        color: '#757575',
        fontWeight: '500'
    },
    sectionTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '20px'
    },
    usersListContainer: {
        marginTop: '20px'
    },
    searchFilterContainer: {
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    searchBox: {
        width: '100%'
    },
    searchInput: {
        width: '100%',
        padding: '12px 16px',
        fontSize: '14px',
        border: '2px solid #e0e0e0',
        borderRadius: '8px',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        boxSizing: 'border-box'
    },
    filterButtons: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
    },
    filterButton: {
        padding: '10px 20px',
        backgroundColor: '#fff',
        color: '#757575',
        border: '2px solid #e0e0e0',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s ease'
    },
    filterButtonActive: {
        padding: '10px 20px',
        backgroundColor: '#1976D2',
        color: '#fff',
        border: '2px solid #1976D2',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s ease'
    },
    filterButtonActiveSuccess: {
        padding: '10px 20px',
        backgroundColor: '#4caf50',
        color: '#fff',
        border: '2px solid #4caf50',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s ease'
    },
    filterButtonActiveWarning: {
        padding: '10px 20px',
        backgroundColor: '#ff9800',
        color: '#fff',
        border: '2px solid #ff9800',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s ease'
    },
    noResults: {
        textAlign: 'center',
        padding: '40px 20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '20px'
    },
    resultadosInfo: {
        fontSize: '14px',
        color: '#757575',
        marginBottom: '15px',
        padding: '10px 15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        borderLeft: '4px solid #1976D2'
    },
    usersCompactList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
userItemSemHorario: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: '2px solid #ff9800',
    marginBottom: '12px',
    gap: '12px'
},

userItemComHorario: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: '2px solid #4caf50',
    marginBottom: '12px',
    gap: '12px'
},



// Desktop
'@media (min-width: 700px)': {
    userItemComHorario: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    userItemSemHorario: {
        flexDirection: 'row',
        alignItems: 'center'
    }
}
,
userItemActions: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: '8px'
},

'@media (min-width: 600px)': {
    userItemActions: {
        flexDirection: 'row',
        width: 'auto'
    }
},



userItemLeft: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
    flexGrow: 1,
    minWidth: 0   // <---- SUPER IMPORTANTE
}
,

    statusIndicatorAtivo: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#4caf50',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        flexShrink: 0
    },
    statusIndicatorInativo: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#ff9800',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        flexShrink: 0
    },
    userItemInfo: {
        flex: 1
    },
    userName: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 4px 0'
    },
    userEmail: {
        fontSize: '14px',
        color: '#757575',
        margin: '0 0 8px 0'
    },
    horarioTag: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        backgroundColor: '#e3f2fd',
        color: '#1976D2',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '500'
    },
  userItemActions: {
    flexShrink: 0,     // impede de encolher
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
},


'@media (min-width: 600px)': {
    userItemActions: {
        flexDirection: 'row',
        width: 'auto'
    }
}
,
    btnHistorico: {
        padding: '8px 16px',
        backgroundColor: '#fff',
        color: '#1976D2',
        border: '1px solid #1976D2',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        whiteSpace: 'nowrap'
    },
    btnEditar: {
        padding: '8px 16px',
        backgroundColor: '#4caf50',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        whiteSpace: 'nowrap'
    },
    btnAtribuir: {
    padding: '8px 12px',
    backgroundColor: '#ff9800',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flexShrink: 0
}
,
    actionBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
    },
    card: {
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e0e0e0'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        margin: 0
    },
    cardActions: {
        display: 'flex',
        gap: '8px'
    },
    cardBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    label: {
        fontSize: '14px',
        color: '#757575',
        fontWeight: '500'
    },
    value: {
        fontSize: '14px',
        color: '#333',
        fontWeight: '600'
    },
    diasSemana: {
        display: 'flex',
        gap: '5px',
        marginTop: '10px'
    },
    diaBadge: {
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500'
    },
    diaAtivo: {
        backgroundColor: '#1976D2',
        color: '#fff'
    },
    diaInativo: {
        backgroundColor: '#e0e0e0',
        color: '#999'
    },
    historicoList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    historicoCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '15px',
        border: '1px solid #e0e0e0'
    },
    historicoHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
    },
    historicoBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    badgeAtivo: {
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: '#4caf50',
        color: '#fff'
    },
    badgeInativo: {
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: '#999',
        color: '#fff'
    },
    observacoes: {
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#fff',
        borderRadius: '6px'
    },
    btnPrimary: {
        padding: '10px 20px',
        backgroundColor: '#1976D2',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    btnSecondary: {
        padding: '10px 20px',
        backgroundColor: '#fff',
        color: '#1976D2',
        border: '1px solid #1976D2',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    btnIcon: {
        padding: '8px',
        backgroundColor: '#1976D2',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    btnIconDanger: {
        padding: '8px',
        backgroundColor: '#f44336',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '85vh',
        overflowY: 'auto'
    },
    modalTitle: {
        fontSize: '24px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '20px'
    },
    formGroup: {
        marginBottom: '20px'
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
    },
    formLabel: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        color: '#555',
        marginBottom: '8px'
    },
    formInput: {
        width: '100%',
        padding: '10px',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        fontSize: '14px'
    },
    formTextarea: {
        width: '100%',
        padding: '10px',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        fontSize: '14px',
        resize: 'vertical'
    },
    diasSemanaSelector: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    diaButton: {
        padding: '8px 16px',
        backgroundColor: '#f0f0f0',
        color: '#555',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
    },
    diaButtonAtivo: {
        backgroundColor: '#1976D2',
        color: '#fff',
        borderColor: '#1976D2'
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '20px'
    },
    errorMessage: {
        padding: '15px',
        backgroundColor: '#ffebee',
        color: '#c62828',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ffcdd2'
    },
    successMessage: {
        padding: '15px',
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #c8e6c9'
    },

    // Estilos do Calendário
    calendarioControls: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginBottom: '30px'
    },
    calendarioNav: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '15px'
    },
    calendarioMesAno: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#1976D2',
        margin: 0
    },
    calendarioContainer: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e0e0e0'
    },
    calendarioHeader: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '10px',
        marginBottom: '10px'
    },
    calendarioDiaSemana: {
        textAlign: 'center',
        fontWeight: '600',
        color: '#1976D2',
        fontSize: '14px',
        padding: '10px 0'
    },
    calendarioGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '10px',
        marginBottom: '20px'
    },
    calendarioDiaVazio: {
        minHeight: '80px'
    },
    calendarioDia: {
        minHeight: '80px',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: '2px solid transparent',
        display: 'flex',
        flexDirection: 'column'
    },
    calendarioDiaHoje: {
        backgroundColor: '#e3f2fd',
        border: '2px solid #1976D2'
    },
    calendarioDiaComHorario: {
        backgroundColor: '#e8f5e9',
        border: '2px solid #4caf50'
    },
    calendarioDiaNumero: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '5px'
    },
    calendarioDiaHorario: {
        fontSize: '11px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    },
    calendarioHorarioNome: {
        fontWeight: '600',
        color: '#1976D2',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    },
    calendarioHorarioHoras: {
        color: '#757575',
        fontSize: '10px'
    },
    calendarioLegenda: {
        display: 'flex',
        gap: '20px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        paddingTop: '20px',
        borderTop: '1px solid #e0e0e0'
    },
    legendaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#555'
    },
    legendaCor: {
        width: '20px',
        height: '20px',
        borderRadius: '4px',
        border: '1px solid #ddd'
    },
    calendarioPlaceholder: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#999',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    }
};

export default GestaoHorarios;
