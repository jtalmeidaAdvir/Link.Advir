
import React, { useState, useEffect } from 'react';
import { styles } from './Css/ContratosListStyles';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';

const ContratosList = () => {
  const [clienteId, setClienteId] = useState('');
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [clientes, setClientes] = useState([]);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('ativo');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredStat, setHoveredStat] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [animatedValue, setAnimatedValue] = useState(0);

  // Animation effect for header pulse
  useEffect(() => {
    const animateHeader = () => {
      setAnimatedValue(prev => prev === 0 ? 1 : 0);
    };
    
    const interval = setInterval(animateHeader, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchClientes = async (force = false) => {
    if ((clientes.length > 0 && !force) || carregandoClientes) return;
    setErro('');
    setCarregandoClientes(true);
    try {
      const [token, urlempresa] = await Promise.all([
        localStorage.getItem('painelAdminToken'),
        localStorage.getItem('urlempresa'),
      ]);
      if (!token || !urlempresa) {
        throw new Error('Token/empresa em falta no storage.');
      }

      const url = 'https://webapiprimavera.advir.pt/routePedidos_STP/LstClientes';
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          urlempresa,
          Accept: 'application/json',
        },
      });

      const raw = await resp.text();
      if (!resp.ok) {
        throw new Error(`Falha ${resp.status} em LstClientes: ${raw || 'sem detalhes'}`);
      }
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (e) {
        throw new Error(`Resposta inválida do backend: ${raw?.slice(0, 500)}`);
      }
      const tabela = Array.isArray(data?.DataSet?.Table) ? data.DataSet.Table : [];
      setClientes(tabela);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      setErro(error.message);
    } finally {
      setCarregandoClientes(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchContratos = async () => {
    if (!clienteId) {
      setErro('Por favor, selecione um cliente primeiro.');
      return;
    }

    setErro('');
    setContratos([]);
    setLoading(true);

    try {
      const token = await localStorage.getItem('painelAdminToken');
      const urlempresa = await localStorage.getItem('urlempresa');

      if (!token || !urlempresa) {
        throw new Error('Credenciais em falta.');
      }

      const response = await fetch(`https://webapiprimavera.advir.pt/clientArea/ObterInfoContrato/${clienteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          urlempresa,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao obter contratos. Código ' + response.status);
      }

      const data = await response.json();

      const listaContratos = data?.DataSet?.Table;
      if (!listaContratos || listaContratos.length === 0) {
        throw new Error('Nenhum contrato encontrado para este cliente.');
      }

      const contratosComHoras = listaContratos.map(c => ({
        ...c,
        horasDisponiveis: ((c.HorasTotais ?? 0) - (c.HorasGastas ?? 0)).toFixed(2),
        percentagemUsada: c.HorasTotais > 0 ? ((c.HorasGastas / c.HorasTotais) * 100).toFixed(1) : 0
      }));

      setContratos(contratosComHoras);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  const contratosFiltrados = contratos.filter((contrato) => {
    let matchesFilter = false;
    
    if (filtroEstado === 'cancelado') matchesFilter = contrato.Cancelado === true;
    else if (filtroEstado === 'caducado') matchesFilter = contrato.Estado === 6 && contrato.Cancelado === false;
    else if (filtroEstado === 'ativo') matchesFilter = contrato.Estado === 3 && contrato.Cancelado === false;
    else matchesFilter = true;

    // Search filter
    if (searchTerm.trim() !== '') {
      const searchText = searchTerm.toLowerCase();
      const matchesSearch = 
        contrato.Codigo?.toLowerCase().includes(searchText) ||
        contrato.Descricao?.toLowerCase().includes(searchText);
      return matchesFilter && matchesSearch;
    }

    return matchesFilter;
  });

  const getContractStatus = (contrato) => {
    if (contrato.Cancelado) return { label: 'Cancelado', style: styles.statusCancelled };
    if (contrato.Estado === 6) return { label: 'Caducado', style: styles.statusExpired };
    if (contrato.Estado === 3) return { label: 'Ativo', style: styles.statusActive };
    return { label: 'Desconhecido', style: styles.statusCancelled };
  };

  const getProgressColor = (percentage) => {
    if (percentage < 50) return '#28a745';
    if (percentage < 80) return '#ffc107';
    return '#dc3545';
  };

  const calculateStats = () => {
    const total = contratos.length;
    const ativos = contratos.filter(c => c.Estado === 3 && !c.Cancelado).length;
    const caducados = contratos.filter(c => c.Estado === 6 && !c.Cancelado).length;
    const cancelados = contratos.filter(c => c.Cancelado).length;
    
    return { total, ativos, caducados, cancelados };
  };

  const renderHeader = () => (
    <div style={styles.headerContainer}>
      <div style={{
        ...styles.headerGradient,
        ...(animatedValue ? styles.headerGradientPulse : {})
      }}>
        <div style={styles.headerIcon}>📊</div>
        <h1 style={styles.headerTitle}>Consultar Contratos</h1>
        <p style={styles.headerSubtitle}>
          Gerencie e acompanhe os contratos dos seus clientes
        </p>
        <div style={styles.headerStats}>
          {contratos.length > 0 && (
            <span style={styles.headerStatsText}>
              {contratosFiltrados.length} de {contratos.length} contratos
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const renderClientForm = () => {
    const selectedClient = clientes.find(c => c.Cliente === clienteId);
    
    return (
      <div style={styles.formContainer}>
        <div style={styles.formHeader}>
          <h3 style={styles.formTitle}>
            <span style={styles.formTitleIcon}>👥</span>
            Selecionar Cliente
          </h3>
        </div>
        
        <div style={styles.inputContainer}>
          <label style={styles.label}>Cliente</label>
          <div style={styles.selectWrapper}>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              style={styles.select}
              onFocus={(e) => {
                Object.assign(e.target.style, styles.selectFocused);
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">-- Escolha um cliente --</option>
              {clientes.map((cliente) => (
                <option key={cliente.Cliente} value={cliente.Cliente}>
                  {cliente.Cliente} - {cliente.Nome}
                </option>
              ))}
            </select>
            <div style={styles.selectArrow}>▼</div>
          </div>
        </div>

        {selectedClient && (
          <div style={styles.selectedClientInfo}>
            <div style={styles.selectedClientIcon}>✅</div>
            <div>
              <p style={styles.selectedClientLabel}>Cliente selecionado:</p>
              <p style={styles.selectedClientName}>{selectedClient.Nome}</p>
            </div>
          </div>
        )}

        <button
          style={{
            ...styles.consultButton,
            ...(clienteId ? {} : styles.consultButtonDisabled)
          }}
          onClick={fetchContratos}
          disabled={!clienteId || loading}
          onMouseEnter={(e) => {
            if (clienteId && !loading) {
              Object.assign(e.target.style, styles.consultButtonHover);
            }
          }}
          onMouseLeave={(e) => {
            if (clienteId) {
              Object.assign(e.target.style, styles.consultButton);
            }
          }}
        >
          <span style={styles.consultButtonIcon}>
            {loading ? '⏳' : '🔍'}
          </span>
          {loading ? 'Consultando...' : 'Consultar Contratos'}
        </button>
      </div>
    );
  };

  const renderSearchBar = () => {
    if (contratos.length === 0) return null;
    
    return (
      <div style={styles.searchContainer}>
        <div style={styles.searchInputContainer}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Pesquisar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = '#1792FE';
              e.target.style.boxShadow = '0 0 0 3px rgba(23, 146, 254, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e9ecef';
              e.target.style.boxShadow = 'none';
            }}
          />
          {searchTerm && (
            <button 
              style={styles.clearButton}
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderFilters = () => {
    if (contratos.length === 0) return null;
    
    return (
      <div style={styles.filtersContainer}>
        <div style={styles.filtersHeader}>
          <span style={styles.filtersIcon}>🎛️</span>
          <span style={styles.filtersLabel}>Filtros:</span>
        </div>
        <div style={styles.filtersButtons}>
          {[
            { key: 'ativo', label: 'Ativos', icon: '✅' },
            { key: 'caducado', label: 'Caducados', icon: '⏰' },
            { key: 'cancelado', label: 'Cancelados', icon: '❌' }
          ].map(filter => (
            <button
              key={filter.key}
              style={{
                ...styles.filterButton,
                ...(filtroEstado === filter.key ? styles.filterButtonActive : {})
              }}
              onClick={() => setFiltroEstado(filter.key)}
              onMouseEnter={(e) => {
                if (filtroEstado !== filter.key) {
                  Object.assign(e.target.style, styles.filterButtonHover);
                }
              }}
              onMouseLeave={(e) => {
                if (filtroEstado !== filter.key) {
                  Object.assign(e.target.style, styles.filterButton);
                }
              }}
            >
              <span style={styles.filterButtonIcon}>{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderStats = () => {
    if (contratos.length === 0) return null;
    
    const stats = calculateStats();
    
    return (
      <div style={styles.statsContainer}>
        <h4 style={styles.statsTitle}>
          <span style={styles.statsTitleIcon}>📊</span>
          Resumo dos Contratos
        </h4>
        <div style={styles.statsGrid}>
          {[
            { label: 'Total', value: stats.total, color: '#1792FE', icon: '📋' },
            { label: 'Ativos', value: stats.ativos, color: '#28a745', icon: '✅' },
            { label: 'Caducados', value: stats.caducados, color: '#dc3545', icon: '⏰' },
            { label: 'Cancelados', value: stats.cancelados, color: '#6c757d', icon: '❌' }
          ].map((stat, index) => (
            <div
              key={index}
              style={{
                ...styles.statItem,
                ...(hoveredStat === index ? styles.statItemHover : {})
              }}
              onMouseEnter={() => setHoveredStat(index)}
              onMouseLeave={() => setHoveredStat(null)}
            >
              <div style={styles.statIcon}>{stat.icon}</div>
              <div style={{ ...styles.statNumber, color: stat.color }}>
                {stat.value}
              </div>
              <div style={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContractCard = (contrato, index) => {
    const status = getContractStatus(contrato);
    const progressWidth = contrato.HorasTotais > 0 ? (contrato.HorasGastas / contrato.HorasTotais) * 100 : 0;
    
    return (
      <div
        key={index}
        style={{
          ...styles.contractCard,
          ...(hoveredCard === index ? styles.contractCardHover : {})
        }}
        onMouseEnter={() => setHoveredCard(index)}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div style={{ ...styles.statusBadge, ...status.style }}>
          <span style={styles.statusBadgeIcon}>
            {status.label === 'Ativo' ? '✅' : 
             status.label === 'Caducado' ? '⏰' : '❌'}
          </span>
          {status.label}
        </div>
        
        <div style={styles.contractHeader}>
          <div style={styles.contractCode}>
            <span style={styles.contractCodeIcon}>📄</span>
            #{contrato.Codigo}
          </div>
          <div style={styles.contractDescription}>{contrato.Descricao}</div>
        </div>

        <div style={styles.contractDetails}>
          <div style={styles.contractRow}>
            <div style={styles.contractRowIcon}>📅</div>
            <span style={styles.contractLabel}>Data do Contrato</span>
            <span style={styles.contractDate}>
              {new Date(contrato.Data).toLocaleDateString('pt-PT')}
            </span>
          </div>
          
          <div style={styles.contractRow}>
            <div style={styles.contractRowIcon}>⏱️</div>
            <span style={styles.contractLabel}>Horas Totais</span>
            <span style={{ ...styles.contractValue, ...styles.contractValueHighlight }}>
              {contrato.HorasTotais}h
            </span>
          </div>
          
          <div style={styles.contractRow}>
            <div style={styles.contractRowIcon}>📊</div>
            <span style={styles.contractLabel}>Horas Gastas</span>
            <span style={styles.contractValue}>{contrato.HorasGastas}h</span>
          </div>
          
          <div style={styles.contractRow}>
            <div style={styles.contractRowIcon}>⚡</div>
            <span style={styles.contractLabel}>Horas Disponíveis</span>
            <span style={{ 
              ...styles.contractValue, 
              ...styles.contractValueHighlight,
              color: contrato.horasDisponiveis > 0 ? '#28a745' : '#dc3545'
            }}>
              {contrato.horasDisponiveis}h
            </span>
          </div>
        </div>

        {contrato.HorasTotais > 0 && (
          <div style={styles.hoursProgressContainer}>
            <div style={styles.hoursProgressHeader}>
              <span style={styles.hoursProgressIcon}>📈</span>
              <span style={styles.hoursProgressLabel}>
                Progresso: {contrato.percentagemUsada}% utilizado
              </span>
            </div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progressWidth}%`,
                  backgroundColor: getProgressColor(progressWidth)
                }}
              ></div>
            </div>
            <div style={styles.progressText}>
              {contrato.HorasGastas}h de {contrato.HorasTotais}h
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
          <p style={styles.loadingText}>
            <span style={styles.loadingIcon}>⏳</span>
            Carregando contratos...
          </p>
        </div>
      );
    }

    if (erro) {
      return (
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h3 style={styles.errorTitle}>Erro ao Carregar Dados</h3>
          <p style={styles.errorMessage}>{erro}</p>
          <button 
            style={styles.retryButton}
            onClick={() => {
              setErro('');
              if (clienteId) fetchContratos();
              else fetchClientes(true);
            }}
            onMouseEnter={(e) => {
              Object.assign(e.target.style, styles.retryButtonHover);
            }}
            onMouseLeave={(e) => {
              Object.assign(e.target.style, styles.retryButton);
            }}
          >
            <span style={styles.retryButtonIcon}>🔄</span>
            Tentar Novamente
          </button>
        </div>
      );
    }

    if (contratos.length === 0 && clienteId) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateIcon}>📭</div>
          <h3 style={styles.emptyTitle}>Nenhum Contrato Encontrado</h3>
          <p style={styles.emptyMessage}>
            Não foram encontrados contratos para o cliente selecionado.
            Tente selecionar outro cliente ou verifique se existem contratos cadastrados.
          </p>
        </div>
      );
    }

    if (contratosFiltrados.length === 0 && contratos.length > 0) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateIcon}>🔍</div>
          <h3 style={styles.emptyTitle}>
            Nenhum {filtroEstado.charAt(0).toUpperCase() + filtroEstado.slice(1)} Encontrado
          </h3>
          <p style={styles.emptyMessage}>
            {searchTerm ? 
              `Não há contratos que correspondam à pesquisa "${searchTerm}".` :
              `Não há contratos ${filtroEstado}s para este cliente.`
            }
            {!searchTerm && ' Experimente alterar o filtro para ver outros tipos de contratos.'}
          </p>
          {searchTerm && (
            <button 
              style={styles.clearSearchButton}
              onClick={() => setSearchTerm('')}
            >
              <span style={styles.clearSearchIcon}>🔄</span>
              Limpar Pesquisa
            </button>
          )}
        </div>
      );
    }

    return (
      <>
        {renderStats()}
        {renderSearchBar()}
        {renderFilters()}
        <div style={styles.contractsGrid}>
          {contratosFiltrados.map((contrato, index) => renderContractCard(contrato, index))}
        </div>
      </>
    );
  };

  const selectedClientName = clientes.find(c => c.Cliente === clienteId)?.Nome;

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.02); opacity: 0.95; }
          }
          
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {renderHeader()}
        {renderClientForm()}
        {selectedClientName && (
          <div style={styles.selectedClientBanner}>
            <div style={styles.selectedClientBannerIcon}>🎯</div>
            <div style={styles.selectedClientBannerContent}>
              <strong>Contratos do Cliente:</strong> {selectedClientName}
            </div>
          </div>
        )}
        {renderContent()}
      </ScrollView>
    </>
  );
};

export default ContratosList;
