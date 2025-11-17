import React, { useEffect, useState } from 'react';
import { styles } from './Css/PessoalObraStyles';
import { secureStorage } from '../../utils/secureStorage';
import * as XLSX from 'xlsx';
const PessoalObra = ({ route }) => {
    const { obraId, nomeObra } = route.params;
    const [registos, setRegistos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [registosAgrupados, setRegistosAgrupados] = useState({});
    const [resumoFuncionarios, setResumoFuncionarios] = useState([]);
    const [dataSelecionada, setDataSelecionada] = useState(new Date());
    const [expandedCards, setExpandedCards] = useState({});
    const [animatedValue, setAnimatedValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState('todos'); // 'todos', 'colaborador', 'visitante', 'externo'

    // Animation effect for header pulse
    useEffect(() => {
        const animateHeader = () => {
            setAnimatedValue(prev => prev === 0 ? 1 : 0);
        };

        const interval = setInterval(animateHeader, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setErrorMessage('');

            try {
                const token = secureStorage.getItem('loginToken');
                const empresaId = secureStorage.getItem('empresa_id');

                if (!token) {
                    throw new Error('Token de autenticação não encontrado');
                }

                const dataFormatada = dataSelecionada.toISOString().split('T')[0];

                // Buscar registos de colaboradores
                const resColaboradores = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-obra-e-dia?obra_id=${obraId}&data=${dataFormatada}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!resColaboradores.ok) {
                    throw new Error(`Erro ao carregar colaboradores: ${resColaboradores.statusText}`);
                }

                const dataColaboradores = await resColaboradores.json();

                // Buscar registos de visitantes
                const resVisitantes = await fetch(`https://backend.advir.pt/api/visitantes/resumo-obra?obra_id=${obraId}&empresa_id=${empresaId}&data=${dataFormatada}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                let dataVisitantes = { entradasSaidas: [] };
                if (resVisitantes.ok) {
                    dataVisitantes = await resVisitantes.json();
                    console.log('✅ Visitantes carregados:', dataVisitantes.entradasSaidas?.length || 0);
                    console.log('📋 Dados visitantes:', dataVisitantes.entradasSaidas);
                } else {
                    console.warn('⚠️ Erro ao carregar visitantes:', resVisitantes.status);
                }

                // Buscar registos de externos
                const resExternos = await fetch(`https://backend.advir.pt/api/externos-jpa/resumo-obra?obra_id=${obraId}&empresa_id=${empresaId}&data=${dataFormatada}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                let dataExternos = { entradasSaidas: [] };
                if (resExternos.ok) {
                    dataExternos = await resExternos.json();
                }

                // Consolidar todos os registos
                const todosRegistos = [
                    ...dataColaboradores.map(r => ({ ...r, tipo_pessoa: 'colaborador' })),
                    ...(dataVisitantes.entradasSaidas || []).map(r => ({
                        id: r.id,
                        tipo: r.tipo,
                        timestamp: r.timestamp,
                        latitude: r.latitude,
                        longitude: r.longitude,
                        tipo_pessoa: 'visitante',
                        nome: r.nome,
                        nomeEmpresa: r.nomeEmpresa || 'N/A',
                        User: { nome: r.nome }
                    })),
                    ...(dataExternos.entradasSaidas || []).map(r => ({
                        id: r.id,
                        tipo: r.tipo,
                        timestamp: r.timestamp,
                        latitude: r.latitude,
                        longitude: r.longitude,
                        tipo_pessoa: 'externo',
                        nome: r.nome,
                        nomeEmpresa: r.empresa || 'N/A',
                        User: { nome: r.nome }
                    }))
                ];

                setRegistos(todosRegistos);

                const agrupado = agruparPorFuncionario(todosRegistos);
                setRegistosAgrupados(agrupado);
                setResumoFuncionarios(calcularResumo(agrupado));
            } catch (err) {
                console.error('Erro ao carregar registos:', err);
                setErrorMessage(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dataSelecionada, obraId]);

    const agruparPorFuncionario = (dados) => {
        const agrupado = {};
        dados.forEach(r => {
            const nome = r.User?.nome || r.nome || 'Desconhecido';
            const tipoPessoa = r.tipo_pessoa || 'colaborador';
            const chave = `${nome}`;

            if (!agrupado[chave]) {
                agrupado[chave] = [];
            }
            agrupado[chave].push({ ...r, tipoPessoa });
        });
        return agrupado;
    };

    const calcularResumo = (grupo) => {
        const resumos = [];

        Object.entries(grupo).forEach(([nome, eventos]) => {
            const ordenados = eventos.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            let totalMin = 0;
            let status = 'Inativo';
            let obs = 'Sem atividade';
            let statusColor = '#dc3545';

            for (let i = 0; i < ordenados.length; i++) {
                const atual = ordenados[i];
                const proximo = ordenados[i + 1];

                if (atual.tipo === 'entrada' && proximo?.tipo === 'saida') {
                    const entrada = new Date(atual.timestamp);
                    const saida = new Date(proximo.timestamp);
                    totalMin += Math.floor((saida - entrada) / 60000);
                    i++;
                }
            }

            const ultimo = ordenados[ordenados.length - 1];
            if (ultimo?.tipo === 'entrada') {
                status = 'Ativo';
                obs = 'A trabalhar';
                statusColor = '#28a745';
                totalMin += Math.floor((new Date() - new Date(ultimo.timestamp)) / 60000);
            } else if (ultimo?.tipo === 'pausa') {
                status = 'Em Pausa';
                obs = 'Está em pausa';
                statusColor = '#ffc107';
            } else if (ultimo?.tipo === 'saida') {
                status = 'Inativo';
                obs = 'Terminou o turno';
                statusColor = '#6c757d';
            }

            const horas = Math.floor(totalMin / 60);
            const minutos = totalMin % 60;

            resumos.push({
                nome,
                total: `${horas > 0 ? `${horas}h ` : ''}${minutos}min`,
                totalMinutos: totalMin,
                status,
                statusColor,
                observacoes: obs,
                eventos: ordenados
            });
        });

        return resumos.sort((a, b) => b.totalMinutos - a.totalMinutos);
    };

    const applyFilters = (searchText = searchTerm, filtroTipo = tipoFiltro) => {
        let filtered = [...resumoFuncionarios];

        // Filtrar por tipo de pessoa
        if (filtroTipo !== 'todos') {
            filtered = filtered.filter(funcionario => {
                const tipoPessoa = funcionario.eventos?.[0]?.tipoPessoa || 'colaborador';
                return tipoPessoa === filtroTipo;
            });
        }

        // Filtrar por texto de pesquisa
        if (searchText.trim() !== '') {
            filtered = filtered.filter(funcionario =>
                funcionario.nome.toLowerCase().includes(searchText.toLowerCase()) ||
                funcionario.status.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        return filtered;
    };

    const handleSearch = (text) => {
        setSearchTerm(text);
    };

    const handleTipoFiltroChange = (tipo) => {
        setTipoFiltro(tipo);
    };

    const toggleCardExpansion = (nome) => {
        setExpandedCards(prev => ({
            ...prev,
            [nome]: !prev[nome]
        }));
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('pt-PT', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('pt-PT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const exportToExcel = () => {
        const filteredData = applyFilters();
        
        // Preparar dados para exportação
        const dataToExport = filteredData.map(funcionario => {
            const tipoPessoa = funcionario.eventos?.[0]?.tipoPessoa || 'colaborador';
            const nomeEmpresa = funcionario.eventos?.[0]?.nomeEmpresa || 'N/A';
            
            return {
                'Nome': funcionario.nome,
                'Tipo': tipoPessoa === 'visitante' ? 'Visitante' : tipoPessoa === 'externo' ? 'Externo' : 'Colaborador',
                'Empresa': nomeEmpresa,
                'Total de Horas': funcionario.total,
                'Status': funcionario.status,
                'Observações': funcionario.observacoes,
                'Número de Registos': funcionario.eventos.length
            };
        });

        // Criar worksheet
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        
        // Criar workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Pessoal');
        
        // Nome do arquivo
        const fileName = `Pessoal_${nomeObra}_${dataSelecionada.toISOString().split('T')[0]}.xlsx`;
        
        // Fazer download
        XLSX.writeFile(workbook, fileName);
    };

    const getProgressWidth = (totalMinutos) => {
        const maxMinutos = 8 * 60; // 8 horas
        return Math.min((totalMinutos / maxMinutos) * 100, 100);
    };

    const renderHeader = () => (
        <div style={styles.headerContainer}>
            <div style={styles.headerGradient}>
                <div style={{
                    ...styles.headerContent,
                    ...(animatedValue ? styles.headerContentPulse : {})
                }}>
                    <h1 style={styles.headerTitle}>Colaboradores na Obra</h1>
                    <p style={styles.headerSubtitle}>
                        {nomeObra}
                    </p>
                    <p style={styles.headerCount}>
                        {applyFilters().length} funcionário{applyFilters().length !== 1 ? 's' : ''}
                        {searchTerm ? ' encontrados' : ' registados'}
                    </p>
                </div>
            </div>
        </div>
    );

    const renderDatePicker = () => (
        <div style={styles.datePickerContainer}>
            <div style={styles.datePickerHeader}>
                <h3 style={styles.datePickerTitle}>Selecionar Data</h3>
            </div>
            <div style={styles.datePickerContent}>
                <input
                    type="date"
                    value={dataSelecionada.toISOString().split('T')[0]}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                        setDataSelecionada(new Date(e.target.value));
                    }}
                    style={styles.dateInput}
                />
                <p style={styles.selectedDate}>
                    {formatDate(dataSelecionada)}
                </p>
            </div>
        </div>
    );

    const renderFilterButtons = () => (
        <div style={styles.filterButtonsContainer}>
            <button
                style={{
                    ...styles.filterButton,
                    ...(tipoFiltro === 'todos' ? styles.filterButtonActive : {})
                }}
                onClick={() => handleTipoFiltroChange('todos')}
            >
                📊 Todos
            </button>
            <button
                style={{
                    ...styles.filterButton,
                    ...(tipoFiltro === 'colaborador' ? styles.filterButtonActive : {})
                }}
                onClick={() => handleTipoFiltroChange('colaborador')}
            >
                👷 Colaboradores
            </button>
            <button
                style={{
                    ...styles.filterButton,
                    ...(tipoFiltro === 'visitante' ? styles.filterButtonActive : {})
                }}
                onClick={() => handleTipoFiltroChange('visitante')}
            >
                👤 Visitantes
            </button>
            <button
                style={{
                    ...styles.filterButton,
                    ...(tipoFiltro === 'externo' ? styles.filterButtonActive : {})
                }}
                onClick={() => handleTipoFiltroChange('externo')}
            >
                🔧 Externos
            </button>
            <button
                style={{
                    ...styles.filterButton,
                    backgroundColor: '#28a745',
                    color: 'white',
                    borderColor: '#28a745'
                }}
                onClick={exportToExcel}
            >
                📥 Exportar Excel
            </button>
        </div>
    );

    const renderSearchBar = () => (
        <div style={{
            ...styles.searchContainer,
            ...(searchTerm ? styles.searchContainerActive : {})
        }}>
            <div style={styles.searchInputContainer}>
                <span style={styles.searchIcon}>🔍</span>
                <input
                    type="text"
                    style={styles.searchInput}
                    placeholder="Procurar por nome ou status..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                />
                {searchTerm && (
                    <button
                        style={styles.clearButton}
                        onClick={() => handleSearch('')}
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );

    const renderEmployeeCard = (funcionario, index) => {
        const isExpanded = expandedCards[funcionario.nome];

        // Determinar o tipo de pessoa para exibição
        const tipoPessoa = funcionario.eventos?.[0]?.tipoPessoa || 'colaborador';
        const tipoPessoaLabel = tipoPessoa === 'visitante' ? '👤 Visitante' :
            tipoPessoa === 'externo' ? '🔧 Externo' : '👷 Colaborador';

        // Obter nome da empresa (funciona para visitantes e externos)
        const nomeEmpresa = funcionario.eventos?.[0]?.nomeEmpresa
            ? funcionario.eventos[0].nomeEmpresa
            : null;

        return (
            <div key={index} style={styles.employeeCard}>
                <div
                    style={styles.employeeCardHeader}
                    onClick={() => toggleCardExpansion(funcionario.nome)}
                >
                    <div style={styles.employeeInfo}>
                        <div style={styles.employeeAvatar}>
                        </div>
                        <div style={styles.employeeDetails}>
                            <h4 style={styles.employeeName}>{funcionario.nome}</h4>
                            <p style={styles.employeeTotal}>
                                {tipoPessoaLabel}
                                {nomeEmpresa && ` - ${nomeEmpresa}`}
                                {' • Total: '}
                                {funcionario.total}
                            </p>
                        </div>
                    </div>
                    <div style={styles.employeeStatusContainer}>
                        <div
                            style={{
                                ...styles.statusBadge,
                                backgroundColor: funcionario.statusColor
                            }}
                        >
                            {funcionario.status}
                        </div>
                    </div>
                </div>

                <div style={styles.progressContainer}>
                    <div style={styles.progressBar}>
                        <div
                            style={{
                                ...styles.progressFill,
                                width: `${getProgressWidth(funcionario.totalMinutos)}%`,
                                backgroundColor: funcionario.statusColor
                            }}
                        ></div>
                    </div>
                    <span style={styles.progressText}>
                        {Math.round(funcionario.totalMinutos / 60 * 100) / 100}h / 8h
                    </span>
                </div>

                <p style={styles.employeeObservations}>{funcionario.observacoes}</p>

                {isExpanded && (
                    <div style={styles.employeeTimeline}>
                        <h5 style={styles.timelineTitle}> Cronologia do Dia
                        </h5>
                        <div style={styles.timelineContainer}>
                            {funcionario.eventos.map((evento, eventIndex) => (
                                <div key={eventIndex} style={styles.timelineItem}>
                                    <div style={{
                                        ...styles.timelineMarker,
                                        ...(evento.tipo === 'entrada' ? styles.timelineMarkerEntrada :
                                            evento.tipo === 'saida' ? styles.timelineMarkerSaida :
                                                styles.timelineMarkerPausa)
                                    }}>
                                    </div>
                                    <div style={styles.timelineContent}>
                                        <span style={styles.timelineType}>
                                            {evento.tipo.charAt(0).toUpperCase() + evento.tipo.slice(1)}
                                        </span>
                                        <span style={styles.timelineTime}>
                                            {formatTime(evento.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div style={styles.loadingContainer}>
                    <div style={styles.loadingSpinner}></div>
                    <p style={styles.loadingText}>Carregando dados do pessoal...</p>
                </div>
            );
        }

        if (errorMessage) {
            return (
                <div style={styles.errorContainer}>
                    <h3 style={styles.errorTitle}>Erro ao Carregar Dados</h3>
                    <p style={styles.errorMessage}>{errorMessage}</p>
                    <button
                        style={styles.retryButton}
                        onClick={() => window.location.reload()}
                    > Tentar Novamente
                    </button>
                </div>
            );
        }

        const filteredEmployees = applyFilters();

        if (filteredEmployees.length === 0) {
            return (
                <div style={styles.emptyState}>
                    <h3 style={styles.emptyTitle}>
                        {searchTerm ? 'Nenhum Funcionário Encontrado' : 'Nenhum Registo Encontrado'}
                    </h3>
                    <p style={styles.emptyMessage}>
                        {searchTerm ?
                            'Não há funcionários que correspondam aos critérios de pesquisa.' :
                            'Não há registos de pessoal para a data selecionada.'
                        }
                    </p>
                </div>
            );
        }

        return (
            <div style={styles.employeesContainer}>
                {filteredEmployees.map((funcionario, index) =>
                    renderEmployeeCard(funcionario, index)
                )}
            </div>
        );
    };

    return (
        <>
            <style>
                {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
            </style>
            <div style={styles.container}>
                {renderHeader()}
                {renderDatePicker()}
                {renderFilterButtons()}
                {renderSearchBar()}
                {renderContent()}
            </div>
        </>
    );
};

export default PessoalObra;