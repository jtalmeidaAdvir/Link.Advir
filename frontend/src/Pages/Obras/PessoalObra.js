import React, { useEffect, useState } from 'react';
import { styles } from './Css/PessoalObraStyles';

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
        // Try localStorage for web
        const token = localStorage.getItem('loginToken');
        
        if (!token) {
          throw new Error('Token de autenticação não encontrado');
        }

        const dataFormatada = dataSelecionada.toISOString().split('T')[0];
        
        const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-obra-e-dia?obra_id=${obraId}&data=${dataFormatada}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          throw new Error(`Erro: ${res.statusText}`);
        }

        const data = await res.json();
        setRegistos(data);

        const agrupado = agruparPorFuncionario(data);
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
      const nome = r.User?.nome || 'Desconhecido';
      if (!agrupado[nome]) agrupado[nome] = [];
      agrupado[nome].push(r);
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

  const applyFilters = (searchText = searchTerm) => {
    let filtered = [...resumoFuncionarios];

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

  const renderSearchBar = () => (
    <div style={{
      ...styles.searchContainer,
      ...(searchTerm ? styles.searchContainerActive : {})
    }}>
      <div style={styles.searchInputContainer}>
        

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
          </button>
        )}
      </div>
    </div>
  );

  const renderEmployeeCard = (funcionario, index) => {
    const isExpanded = expandedCards[funcionario.nome];
    
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
              <p style={styles.employeeTotal}>Total: {funcionario.total}</p>
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
        {renderSearchBar()}
        {renderContent()}
      </div>
    </>
  );
};

export default PessoalObra;