import React, { useEffect, useState } from 'react';



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

  // Estilos em JavaScript
  const styles = {
    container: {
      width: '100%',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      overflowY: 'auto', 
     
    },
    
    headerContainer: {
      width: '100%',
      marginBottom: '20px',
    },
    
    headerGradient: {
      background: 'linear-gradient(135deg, #1792FE 0%, #0B5ED7 100%)',
      padding: '30px 20px',
      borderRadius: '0 0 20px 20px',
      boxShadow: '0 4px 20px rgba(23, 146, 254, 0.3)',
      position: 'relative',
      overflow: 'hidden',
    },
    
    headerContent: {
      textAlign: 'center',
      color: 'white',
      position: 'relative',
      zIndex: 1,
      transition: 'transform 0.3s ease',
    },
    
    headerContentPulse: {
      transform: 'scale(1.02)',
    },
    
    headerIcon: {
      fontSize: '32px',
      marginBottom: '10px',
      display: 'block',
    },
    
    headerTitle: {
    fontSize: 'clamp(1.5rem, 2vw, 2rem)', // entre 24px e 32px
    fontWeight: '700',
    margin: '0 0 8px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },

    
    headerSubtitle: {
      fontSize: '18px',
      margin: '0 0 5px 0',
      opacity: 0.9,
      fontWeight: '500',
    },
    
    headerCount: {
      fontSize: '14px',
      margin: 0,
      opacity: 0.8,
    },
    
    datePickerContainer: {
      background: 'white',
      margin: '20px',
      borderRadius: '15px',
      padding: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      border: '1px solid rgba(23, 146, 254, 0.1)',
    },
    
    datePickerHeader: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '15px',
    },
    
    dateIcon: {
      color: '#1792FE',
      fontSize: '20px',
      marginRight: '10px',
    },
    
    datePickerTitle: {
      margin: 0,
      color: '#333',
      fontSize: '18px',
      fontWeight: '600',
    },
    
    datePickerContent: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    
    dateInput: {
      padding: '12px 15px',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'all 0.3s ease',
      outline: 'none',
    },
    
    dateInputFocus: {
      borderColor: '#1792FE',
      boxShadow: '0 0 0 3px rgba(23, 146, 254, 0.1)',
    },
    
    selectedDate: {
      color: '#666',
      fontSize: '14px',
      margin: 0,
      fontStyle: 'italic',
    },
    
    searchContainer: {
      margin: '0 20px 20px',
      borderRadius: '15px',
      padding: '5px 15px',
      background: 'rgba(255,255,255,0.9)',
      transition: 'background 0.3s ease',
    },
    
    searchContainerActive: {
      background: 'rgba(23,146,254,0.1)',
    },
    
    searchInputContainer: {
      display: 'flex',
      alignItems: 'center',
      background: 'white',
      borderRadius: '10px',
      padding: '10px 15px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    },
    
    searchIcon: {
      color: '#1792FE',
      marginRight: '10px',
    },
    
    searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    color: '#333',
    background: 'transparent',
    minHeight: '40px', // 👈
    },

    
    clearButton: {
      padding: '5px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#999',
    },
    
    employeesContainer: {
      padding: '0 20px 20px',
       marginBottom: '80px'
    },
    
    employeeCard: {
      background: 'white',
      borderRadius: '15px',
      marginBottom: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      border: '1px solid rgba(23, 146, 254, 0.1)',
      cursor: 'pointer',
    },
    
    employeeCardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
    },
    
    employeeCardHeader: {
      padding: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'background-color 0.3s ease',
    },
    
    employeeCardHeaderHover: {
      backgroundColor: 'rgba(23, 146, 254, 0.05)',
    },
    
    employeeInfo: {
      display: 'flex',
      alignItems: 'center',
      flex: 1,
      flexWrap: 'wrap',
      gap: '10px',
    },
    

    
    employeeDetails: {
      flex: 1,
    },
    
    employeeName: {
      margin: '0 0 5px 0',
      fontSize: '18px',
      fontWeight: '600',
      color: '#333',
    },
    
    employeeTotal: {
      margin: 0,
      color: '#666',
      fontSize: '14px',
    },
    
    employeeStatusContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    
    statusBadge: {
      padding: '6px 12px',
      borderRadius: '20px',
      color: 'white',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    
    expandIcon: {
      color: '#999',
      fontSize: '16px',
      transition: 'transform 0.3s ease',
    },
    
    progressContainer: {
      padding: '0 20px 15px',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    
    progressBar: {
      flex: 1,
      height: '8px',
      backgroundColor: '#e9ecef',
      borderRadius: '4px',
      overflow: 'hidden',
    },
    
    progressFill: {
      height: '100%',
      borderRadius: '4px',
      transition: 'width 0.6s ease',
    },
    
    progressText: {
      fontSize: '12px',
      color: '#666',
      minWidth: '60px',
      textAlign: 'right',
    },
    
    employeeObservations: {
      padding: '0 20px 20px',
      margin: 0,
      color: '#666',
      fontSize: '14px',
      fontStyle: 'italic',
    },
    
    employeeTimeline: {
      padding: '20px',
      borderTop: '1px solid #e9ecef',
      backgroundColor: '#f8f9fa',
    },
    
    timelineTitle: {
      margin: '0 0 20px 0',
      color: '#333',
      fontSize: '16px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    
    timelineContainer: {
      position: 'relative',
      maxHeight: '200px',
      overflowY: 'auto',
    },
    
    timelineItem: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '15px',
      position: 'relative',
    },
    
    timelineMarker: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '14px',
      marginRight: '15px',
      position: 'relative',
    },
    
    timelineMarkerEntrada: {
      background: 'linear-gradient(135deg, #28a745, #20c997)',
    },
    
    timelineMarkerSaida: {
      background: 'linear-gradient(135deg, #dc3545, #e83e8c)',
    },
    
    timelineMarkerPausa: {
      background: 'linear-gradient(135deg, #ffc107, #fd7e14)',
    },
    
    timelineContent: {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
    },
    
    timelineType: {
      fontWeight: '600',
      color: '#333',
      fontSize: '14px',
    },
    
    timelineTime: {
      color: '#666',
      fontSize: '12px',
    },
    
    loadingContainer: {
      textAlign: 'center',
      padding: '60px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '300px',
    },
    
    loadingSpinner: {
      width: '40px',
      height: '40px',
      border: '4px solid #e9ecef',
      borderTop: '4px solid #1792FE',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '20px',
    },
    
    loadingText: {
      color: '#666',
      fontSize: '16px',
      margin: 0,
    },
    
    errorContainer: {
      textAlign: 'center',
      padding: '60px 20px',
      background: 'white',
      margin: '20px',
      borderRadius: '15px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    
    errorIcon: {
      fontSize: '48px',
      color: '#dc3545',
      marginBottom: '20px',
    },
    
    errorTitle: {
      color: '#333',
      margin: '0 0 10px 0',
      fontSize: '20px',
    },
    
    errorMessage: {
      color: '#666',
      margin: '0 0 30px 0',
    },
    
    retryButton: {
      background: 'linear-gradient(135deg, #1792FE, #0B5ED7)',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
    },
    
    retryButtonHover: {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 15px rgba(23, 146, 254, 0.3)',
    },
    
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      background: 'white',
      margin: '20px',
      borderRadius: '15px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    
    emptyIcon: {
      fontSize: '48px',
      color: '#6c757d',
      marginBottom: '20px',
    },
    
    emptyTitle: {
      color: '#333',
      margin: '0 0 10px 0',
      fontSize: '20px',
    },
    
    emptyMessage: {
      color: '#666',
      margin: 0,
    },
  };

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