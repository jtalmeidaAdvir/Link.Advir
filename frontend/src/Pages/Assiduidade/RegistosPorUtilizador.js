
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const RegistosPorUtilizador = () => {
  const [utilizadores, setUtilizadores] = useState([]);
  const [userSelecionado, setUserSelecionado] = useState('');
  const [nomeSelecionado, setNomeSelecionado] = useState('');
  const [obras, setObras] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [anoSelecionado, setAnoSelecionado] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [registos, setRegistos] = useState([]);
  const [agrupadoPorDia, setAgrupadoPorDia] = useState({});
  const [loading, setLoading] = useState(false);
  const [enderecos, setEnderecos] = useState({});
  const [filtroTipo, setFiltroTipo] = useState('');
  const [exibirEstatisticas, setExibirEstatisticas] = useState(true);

  const token = localStorage.getItem('loginToken');

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
    carregarUtilizadores();
    carregarObras();
  }, []);

  const carregarUtilizadores = async () => {
    try {
      const res = await fetch(`https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${localStorage.getItem('empresa_id')}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUtilizadores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar utilizadores:', err);
      setUtilizadores([]);
    }
  };

  const carregarObras = async () => {
    try {
      const res = await fetch(`https://backend.advir.pt/api/obra/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setObras(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar obras:', err);
    }
  };

  const carregarRegistos = async () => {
    if (!userSelecionado) return;

    setLoading(true);
    try {
      let query = `user_id=${userSelecionado}`;
      if (dataSelecionada) {
        query += `&data=${dataSelecionada}`;
      } else {
        if (anoSelecionado) query += `&ano=${anoSelecionado}`;
        if (mesSelecionado) query += `&mes=${String(mesSelecionado).padStart(2, '0')}`;
      }
      if (obraSelecionada) query += `&obra_id=${obraSelecionada}`;

      const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      const agrupados = {};
      data.forEach(reg => {
        const dia = new Date(reg.timestamp).toISOString().split('T')[0];
        if (!agrupados[dia]) agrupados[dia] = [];
        agrupados[dia].push(reg);
      });

      setRegistos(data);
      setAgrupadoPorDia(agrupados);
    } catch (err) {
      console.error('Erro ao carregar registos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchEnderecos = async () => {
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
  }, [agrupadoPorDia]);

  const calcularEstatisticas = () => {
    const totalDias = Object.keys(agrupadoPorDia).length;
    const totalRegistos = registos.length;
    const registosConfirmados = registos.filter(r => r.is_confirmed).length;
    const registosNaoConfirmados = totalRegistos - registosConfirmados;
    
    return {
      totalDias,
      totalRegistos,
      registosConfirmados,
      registosNaoConfirmados,
      percentagemConfirmados: totalRegistos > 0 ? ((registosConfirmados / totalRegistos) * 100).toFixed(1) : 0
    };
  };

  const exportarParaExcel = () => {
    if (!registos.length) {
      alert('Não há dados para exportar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    
    // Dados para exportação
    const dadosExport = [];
    
    // Cabeçalho
    dadosExport.push([
      `Relatório de Registos - ${nomeSelecionado}`,
      '',
      '',
      '',
      `Período: ${dataSelecionada || `${mesSelecionado}/${anoSelecionado}`}`
    ]);
    dadosExport.push([]);
    
    // Estatísticas
    const stats = calcularEstatisticas();
    dadosExport.push(['RESUMO EXECUTIVO']);
    dadosExport.push(['Total de Dias:', stats.totalDias]);
    dadosExport.push(['Total de Registos:', stats.totalRegistos]);
    dadosExport.push(['Registos Confirmados:', stats.registosConfirmados]);
    dadosExport.push(['Registos Não Confirmados:', stats.registosNaoConfirmados]);
    dadosExport.push(['Taxa de Confirmação:', `${stats.percentagemConfirmados}%`]);
    dadosExport.push([]);

    // Cabeçalhos da tabela
    dadosExport.push([
      'Data',
      'Hora',
      'Tipo',
      'Obra',
      'Confirmado',
      'Justificação',
      'Localização'
    ]);

    // Dados dos registos
    Object.entries(agrupadoPorDia).forEach(([dia, eventos]) => {
      eventos
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .forEach(evento => {
          dadosExport.push([
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

    const worksheet = XLSX.utils.aoa_to_sheet(dadosExport);
    
    // Definir larguras das colunas
    const wscols = [
      { wch: 12 }, // Data
      { wch: 10 }, // Hora
      { wch: 12 }, // Tipo
      { wch: 25 }, // Obra
      { wch: 12 }, // Confirmado
      { wch: 30 }, // Justificação
      { wch: 40 }  // Localização
    ];
    worksheet['!cols'] = wscols;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registos');
    
    const fileName = `Registos_${nomeSelecionado.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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

  const stats = calcularEstatisticas();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.icon}>👥</span>
          Registos de Ponto por Utilizador
        </h1>
        <p style={styles.subtitle}>Consulta e análise de registos de assiduidade</p>
      </div>

      {/* Filtros */}
      <div style={styles.filtersCard}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>🔍</span>
          Filtros de Pesquisa
        </h3>
        
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Utilizador *</label>
            <select 
              style={styles.select}
              value={userSelecionado} 
              onChange={(e) => {
                const userId = e.target.value;
                const nome = utilizadores.find(u => u.id == userId)?.nome || '';
                setUserSelecionado(userId);
                setNomeSelecionado(nome);
              }}
            >
              <option value="">-- Selecione um utilizador --</option>
              {utilizadores.map(u => (
                <option key={u.id} value={u.id}>{u.nome} ({u.email})</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Obra</label>
            <select 
              style={styles.select}
              value={obraSelecionada} 
              onChange={e => setObraSelecionada(e.target.value)}
            >
              <option value="">-- Todas as obras --</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Data Específica</label>
            <input 
              type="date" 
              style={styles.input}
              value={dataSelecionada} 
              onChange={e => setDataSelecionada(e.target.value)} 
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Mês</label>
            <input 
              type="number" 
              style={styles.input}
              min="1" 
              max="12" 
              value={mesSelecionado} 
              onChange={e => setMesSelecionado(e.target.value)}
              placeholder="1-12"
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Ano</label>
            <input 
              type="number" 
              style={styles.input}
              min="2020" 
              value={anoSelecionado} 
              onChange={e => setAnoSelecionado(e.target.value)}
              placeholder="2024"
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Tipo de Registo</label>
            <select 
              style={styles.select}
              value={filtroTipo} 
              onChange={e => setFiltroTipo(e.target.value)}
            >
              <option value="">-- Todos --</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
              <option value="pausa">Pausa</option>
              <option value="retorno">Retorno</option>
            </select>
          </div>
        </div>

        <div style={styles.actionButtons}>
          <button 
            style={styles.primaryButton}
            onClick={carregarRegistos}
            disabled={!userSelecionado || loading}
          >
            {loading ? '🔄 A carregar...' : '🔍 Pesquisar Registos'}
          </button>
          
          {registos.length > 0 && (
            <button 
              style={styles.exportButton}
              onClick={exportarParaExcel}
            >
              📊 Exportar Excel
            </button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      {registos.length > 0 && exibirEstatisticas && (
        <div style={styles.statsCard}>
          <div style={styles.statsHeader}>
            <h3 style={styles.sectionTitle}>
              <span style={styles.sectionIcon}>📈</span>
              Estatísticas - {nomeSelecionado}
            </h3>
            <button 
              style={styles.toggleButton}
              onClick={() => setExibirEstatisticas(!exibirEstatisticas)}
            >
              ➖
            </button>
          </div>
          
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{stats.totalDias}</span>
              <span style={styles.statLabel}>Dias</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{stats.totalRegistos}</span>
              <span style={styles.statLabel}>Total Registos</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{stats.registosConfirmados}</span>
              <span style={styles.statLabel}>Confirmados</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{stats.registosNaoConfirmados}</span>
              <span style={styles.statLabel}>Não Confirmados</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>{stats.percentagemConfirmados}%</span>
              <span style={styles.statLabel}>Taxa Confirmação</span>
            </div>
          </div>
        </div>
      )}

      {/* Registos */}
      {loading && (
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <p>A carregar registos...</p>
        </div>
      )}

      {!loading && Object.entries(registosFiltrados).length > 0 && (
        <div style={styles.registosSection}>
          <h3 style={styles.sectionTitle}>
            <span style={styles.sectionIcon}>📋</span>
            Registos Detalhados
          </h3>
          
          {Object.entries(registosFiltrados)
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
                      <div key={i} style={styles.eventCard}>
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
                              ...styles.infoValue,
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
            ))}
        </div>
      )}

      {!loading && Object.entries(registosFiltrados).length === 0 && userSelecionado && (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📋</span>
          <h3>Nenhum registo encontrado</h3>
          <p>Não foram encontrados registos para os critérios selecionados.</p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    overflowY: 'auto',
    overflowX: 'hidden'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '2.5rem',
    color: '#2d3748',
    margin: '0 0 10px 0',
    fontWeight: '700'
  },
  subtitle: {
    color: '#718096',
    fontSize: '1.1rem',
    margin: 0
  },
  icon: {
    marginRight: '10px'
  },
  filtersCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    marginBottom: '30px',
    border: '1px solid #e2e8f0'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    color: '#2d3748',
    marginBottom: '20px',
    fontWeight: '600'
  },
  sectionIcon: {
    marginRight: '10px'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '8px'
  },
  select: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s',
    outline: 'none'
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s',
    outline: 'none'
  },
  actionButtons: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  primaryButton: {
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '200px'
  },
  exportButton: {
    backgroundColor: '#38a169',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    marginBottom: '30px',
    border: '1px solid #e2e8f0'
  },
  statsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  toggleButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px'
  },
  statItem: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f7fafc',
    borderRadius: '12px',
    border: '2px solid #e2e8f0'
  },
  statNumber: {
    display: 'block',
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#3182ce',
    marginBottom: '8px'
  },
  statLabel: {
    display: 'block',
    fontSize: '0.9rem',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '60px',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3182ce',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  registosSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  dayCard: {
    marginBottom: '30px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  dayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#f7fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  dayTitle: {
    margin: 0,
    color: '#2d3748',
    fontSize: '1.2rem',
    fontWeight: '600'
  },
  dayBadge: {
    backgroundColor: '#3182ce',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  eventsList: {
    padding: '20px'
  },
  eventCard: {
    backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '15px',
    transition: 'all 0.2s'
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  eventType: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  typeIcon: {
    fontSize: '1.2rem'
  },
  typeText: {
    fontWeight: '700',
    fontSize: '1.1rem',
    color: '#2d3748'
  },
  eventTime: {
    color: '#718096',
    fontSize: '1rem',
    fontWeight: '500'
  },
  eventDetails: {
    display: 'grid',
    gap: '10px'
  },
  eventInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px'
  },
  infoLabel: {
    fontWeight: '600',
    color: '#4a5568',
    minWidth: '100px'
  },
  infoValue: {
    color: '#2d3748',
    flex: 1
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  confirmed: {
    backgroundColor: '#c6f6d5',
    color: '#22543d'
  },
  unconfirmed: {
    backgroundColor: '#fed7d7',
    color: '#742a2a'
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '60px',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
  },
  emptyIcon: {
    fontSize: '4rem',
    display: 'block',
    marginBottom: '20px'
  }
};

// Adicionar animação do spinner e estilos de scroll via CSS-in-JS
const spinKeyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Estilos de scroll personalizados */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Scroll suave */
html {
  scroll-behavior: smooth;
}

/* Garantir que o body permite scroll */
body {
  overflow-y: auto !important;
  overflow-x: hidden !important;
}
`;

// Injetar keyframes no documento
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinKeyframes;
  document.head.appendChild(style);
}

export default RegistosPorUtilizador;
