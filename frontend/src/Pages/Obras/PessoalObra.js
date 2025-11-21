import React, { useEffect, useState } from 'react';
import { styles } from './Css/PessoalObraStyles';
import { secureStorage } from '../../utils/secureStorage';
import * as XLSX from 'xlsx';
const PessoalObra = ({ route, navigation }) => {
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

    const [showExportModal, setShowExportModal] = useState(false);
    const [periodoExport, setPeriodoExport] = useState('dia'); // 'dia', 'semana', 'mes'

    const exportToExcel = async () => {
        if (!showExportModal) {
            setShowExportModal(true);
            return;
        }

        try {
            setLoading(true);
            
            // Calcular período baseado na seleção
            let dataInicio, dataFim;
            const hoje = new Date(dataSelecionada);
            
            if (periodoExport === 'dia') {
                dataInicio = dataFim = dataSelecionada.toISOString().split('T')[0];
            } else if (periodoExport === 'semana') {
                const diaSemana = hoje.getDay();
                const segunda = new Date(hoje);
                segunda.setDate(hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
                const domingo = new Date(segunda);
                domingo.setDate(segunda.getDate() + 6);
                dataInicio = segunda.toISOString().split('T')[0];
                dataFim = domingo.toISOString().split('T')[0];
            } else { // mes
                dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
                dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
            }

            const token = secureStorage.getItem('loginToken');
            const empresaId = secureStorage.getItem('empresa_id');

            // Buscar dados do período
            const dadosPeriodo = [];
            let dataAtual = new Date(dataInicio);
            const dataFinal = new Date(dataFim);

            while (dataAtual <= dataFinal) {
                const dataFormatada = dataAtual.toISOString().split('T')[0];

                // Buscar colaboradores
                const resColaboradores = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-obra-e-dia?obra_id=${obraId}&data=${dataFormatada}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });

                // Buscar visitantes
                const resVisitantes = await fetch(`https://backend.advir.pt/api/visitantes/resumo-obra?obra_id=${obraId}&empresa_id=${empresaId}&data=${dataFormatada}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });

                // Buscar externos
                const resExternos = await fetch(`https://backend.advir.pt/api/externos-jpa/resumo-obra?obra_id=${obraId}&empresa_id=${empresaId}&data=${dataFormatada}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });

                if (resColaboradores.ok) {
                    const dataColaboradores = await resColaboradores.json();
                    dataColaboradores.forEach(r => dadosPeriodo.push({ ...r, data: dataFormatada, tipo_pessoa: 'colaborador' }));
                }

                if (resVisitantes.ok) {
                    const dataVisitantes = await resVisitantes.json();
                    (dataVisitantes.entradasSaidas || []).forEach(r => {
                        dadosPeriodo.push({
                            ...r,
                            data: dataFormatada,
                            tipo_pessoa: 'visitante',
                            User: { nome: r.nome }
                        });
                    });
                }

                if (resExternos.ok) {
                    const dataExternos = await resExternos.json();
                    (dataExternos.entradasSaidas || []).forEach(r => {
                        dadosPeriodo.push({
                            ...r,
                            data: dataFormatada,
                            tipo_pessoa: 'externo',
                            User: { nome: r.nome }
                        });
                    });
                }

                dataAtual.setDate(dataAtual.getDate() + 1);
            }

            // Agrupar por pessoa e dia
            const agrupado = {};
            dadosPeriodo.forEach(r => {
                const nome = r.User?.nome || r.nome || 'Desconhecido';
                const data = r.data || r.timestamp?.split('T')[0];
                const chave = `${nome}_${data}`;
                
                if (!agrupado[chave]) {
                    agrupado[chave] = {
                        nome,
                        data,
                        tipo_pessoa: r.tipo_pessoa,
                        nomeEmpresa: r.nomeEmpresa || r.empresa || 'N/A',
                        eventos: []
                    };
                }
                agrupado[chave].eventos.push(r);
            });

            // Criar workbook com formatação
            const workbook = XLSX.utils.book_new();
            const wsData = [];

            // Cabeçalho principal
            wsData.push([`MAPA DE ASSIDUIDADE - ${nomeObra.toUpperCase()}`]);
            wsData.push([`Período: ${new Date(dataInicio).toLocaleDateString('pt-PT')} a ${new Date(dataFim).toLocaleDateString('pt-PT')}`]);
            wsData.push([]);

            // Cabeçalhos das colunas
            wsData.push([
                'Data',
                'Nome',
                'Tipo',
                'Empresa',
                'Picagem 1',
                'Picagem 2',
                'Picagem 3',
                'Picagem 4',
                'Total Horas',
                'Observações'
            ]);

            // Dados
            Object.values(agrupado).sort((a, b) => {
                const dataComp = a.data.localeCompare(b.data);
                return dataComp !== 0 ? dataComp : a.nome.localeCompare(b.nome);
            }).forEach(pessoa => {
                const eventos = pessoa.eventos.sort((a, b) => 
                    new Date(a.timestamp) - new Date(b.timestamp)
                );

                // Organizar picagens de forma sequencial independente do tipo
                const picagens = eventos.map(e => 
                    new Date(e.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                );

                // Garantir que temos pelo menos 4 slots, preenchendo com '-' se necessário
                const picagem1 = picagens[0] || '-';
                const picagem2 = picagens[1] || '-';
                const picagem3 = picagens[2] || '-';
                const picagem4 = picagens[3] || '-';

                // Calcular total de horas
                let totalMin = 0;
                for (let i = 0; i < eventos.length; i++) {
                    if (eventos[i].tipo === 'entrada' && eventos[i + 1]?.tipo === 'saida') {
                        const ent = new Date(eventos[i].timestamp);
                        const sai = new Date(eventos[i + 1].timestamp);
                        totalMin += Math.floor((sai - ent) / 60000);
                        i++;
                    }
                }
                const horas = Math.floor(totalMin / 60);
                const minutos = totalMin % 60;
                const totalHoras = `${horas}h ${minutos}min`;

                let tipoLabel = pessoa.tipo_pessoa === 'visitante' ? 'Visitante' : 
                                 pessoa.tipo_pessoa === 'externo' ? 'Externo' : 'Colaborador';
                
                let empresaNome = pessoa.nomeEmpresa;
                
                // Se empresa for N/A, buscar empresa selecionada do localStorage e tipo JPA
                if (empresaNome === 'N/A') {
                    const empresaSelecionadaStorage = secureStorage.getItem('empresaSelecionada');
                    empresaNome = empresaSelecionadaStorage || 'Martela';
                    tipoLabel = 'JPA';
                }

                wsData.push([
                    new Date(pessoa.data).toLocaleDateString('pt-PT'),
                    pessoa.nome,
                    tipoLabel,
                    empresaNome,
                    picagem1,
                    picagem2,
                    picagem3,
                    picagem4,
                    totalHoras,
                    ''
                ]);
            });

            // Adicionar linhas de assinatura
            wsData.push([]);
            wsData.push([]);
            wsData.push(['ASSINATURA DO RESPONSÁVEL:', '', '', '', 'DATA:']);
            wsData.push([]);
            wsData.push(['_______________________________', '', '', '', '____/____/________']);

            const worksheet = XLSX.utils.aoa_to_sheet(wsData);

            // Definir larguras das colunas
            worksheet['!cols'] = [
                { wch: 12 }, // Data
                { wch: 25 }, // Nome
                { wch: 12 }, // Tipo
                { wch: 20 }, // Empresa
                { wch: 10 }, // Picagem 1
                { wch: 10 }, // Picagem 2
                { wch: 10 }, // Picagem 3
                { wch: 10 }, // Picagem 4
                { wch: 12 }, // Total Horas
                { wch: 30 }  // Observações
            ];

            // Mesclar células do título
            if (!worksheet['!merges']) worksheet['!merges'] = [];
            worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } });
            worksheet['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } });

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Assiduidade');

            const periodoNome = periodoExport === 'dia' ? 'Dia' : periodoExport === 'semana' ? 'Semana' : 'Mes';
            const fileName = `Assiduidade_${nomeObra}_${periodoNome}_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            XLSX.writeFile(workbook, fileName);
            
            setShowExportModal(false);
            alert('Excel exportado com sucesso!');
        } catch (error) {
            console.error('Erro ao exportar:', error);
            alert('Erro ao exportar dados');
        } finally {
            setLoading(false);
        }
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
                    <button
                        style={styles.backButton}
                        onClick={() => navigation.navigate('Obras')}
                    >
                        ← Voltar
                    </button>
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
                
                {/* Modal de Exportação */}
                {showExportModal && (
                    <div style={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
                        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <h2 style={styles.modalTitle}>📊 Exportar para Excel</h2>
                            <p style={styles.modalSubtitle}>Selecione o período para exportação</p>
                            
                            <div style={styles.periodoOptions}>
                                <button
                                    style={{
                                        ...styles.periodoButton,
                                        ...(periodoExport === 'dia' ? styles.periodoButtonActive : {})
                                    }}
                                    onClick={() => setPeriodoExport('dia')}
                                >
                                    📅 Dia Atual
                                    <span style={styles.periodoDate}>
                                        {dataSelecionada.toLocaleDateString('pt-PT')}
                                    </span>
                                </button>
                                
                                <button
                                    style={{
                                        ...styles.periodoButton,
                                        ...(periodoExport === 'semana' ? styles.periodoButtonActive : {})
                                    }}
                                    onClick={() => setPeriodoExport('semana')}
                                >
                                    📆 Semana Atual
                                    <span style={styles.periodoDate}>
                                        {(() => {
                                            const hoje = new Date(dataSelecionada);
                                            const diaSemana = hoje.getDay();
                                            const segunda = new Date(hoje);
                                            segunda.setDate(hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
                                            const domingo = new Date(segunda);
                                            domingo.setDate(segunda.getDate() + 6);
                                            return `${segunda.toLocaleDateString('pt-PT')} - ${domingo.toLocaleDateString('pt-PT')}`;
                                        })()}
                                    </span>
                                </button>
                                
                                <button
                                    style={{
                                        ...styles.periodoButton,
                                        ...(periodoExport === 'mes' ? styles.periodoButtonActive : {})
                                    }}
                                    onClick={() => setPeriodoExport('mes')}
                                >
                                    📊 Mês Atual
                                    <span style={styles.periodoDate}>
                                        {dataSelecionada.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                                    </span>
                                </button>
                            </div>
                            
                            <div style={styles.modalActions}>
                                <button
                                    style={styles.modalCancelButton}
                                    onClick={() => setShowExportModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    style={styles.modalConfirmButton}
                                    onClick={exportToExcel}
                                >
                                    📥 Exportar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PessoalObra;