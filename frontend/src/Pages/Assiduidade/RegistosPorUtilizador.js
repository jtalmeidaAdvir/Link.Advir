
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const RegistosPorUtilizador = () => {
  const [utilizadores, setUtilizadores] = useState([]);
  const [obras, setObras] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState('');
  const [utilizadorSelecionado, setUtilizadorSelecionado] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [anoSelecionado, setAnoSelecionado] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [resumoUtilizadores, setResumoUtilizadores] = useState([]);
  const [utilizadorDetalhado, setUtilizadorDetalhado] = useState(null);
  const [registosDetalhados, setRegistosDetalhados] = useState([]);
  const [agrupadoPorDia, setAgrupadoPorDia] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [enderecos, setEnderecos] = useState({});
  const [filtroTipo, setFiltroTipo] = useState('');

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
        const resObraUsers = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-obra-e-dia?obra_id=${obraSelecionada}&data=${dataSelecionada}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dataObraUsers = await resObraUsers.json();
        
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

          const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo?${query}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.ok) {
            const registos = await res.json();
            
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
    if (!resumoUtilizadores.length) {
      alert('Não há dados para exportar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    
    const dadosExport = [];
    
    // Cabeçalho
    dadosExport.push([
      'Resumo de Registos por Utilizador',
      '',
      '',
      '',
      `Período: ${dataSelecionada || `${mesSelecionado}/${anoSelecionado}`}`
    ]);
    dadosExport.push([]);
    
    // Cabeçalhos da tabela
    dadosExport.push([
      'Utilizador',
      'Email',
      'Total Dias',
      'Total Registos',
      'Confirmados',
      'Não Confirmados',
      '% Confirmação',
      'Horas Estimadas',
      'Obras',
      'Período'
    ]);

    // Dados dos utilizadores
    resumoUtilizadores.forEach(resumo => {
      dadosExport.push([
        resumo.utilizador.nome,
        resumo.utilizador.email,
        resumo.totalDias,
        resumo.totalRegistos,
        resumo.registosConfirmados,
        resumo.registosNaoConfirmados,
        `${resumo.percentagemConfirmados}%`,
        resumo.totalHorasEstimadas,
        resumo.obras.join(', '),
        `${resumo.periodoInicio} - ${resumo.periodoFim}`
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(dadosExport);
    
    const wscols = [
      { wch: 20 }, // Utilizador
      { wch: 25 }, // Email
      { wch: 12 }, // Total Dias
      { wch: 15 }, // Total Registos
      { wch: 12 }, // Confirmados
      { wch: 15 }, // Não Confirmados
      { wch: 15 }, // % Confirmação
      { wch: 15 }, // Horas Estimadas
      { wch: 30 }, // Obras
      { wch: 20 }  // Período
    ];
    worksheet['!cols'] = wscols;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumo');
    
    const fileName = `Resumo_Utilizadores_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportarDetalhesUtilizador = () => {
    if (!utilizadorDetalhado || !registosDetalhados.length) {
      alert('Não há detalhes para exportar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    
    const dadosExport = [];
    
    // Cabeçalho
    dadosExport.push([
      `Detalhes de Registos - ${utilizadorDetalhado.nome}`,
      '',
      '',
      '',
      `Período: ${dataSelecionada || `${mesSelecionado}/${anoSelecionado}`}`
    ]);
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

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detalhes');
    
    const fileName = `Detalhes_${utilizadorDetalhado.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.icon}>👥</span>
          Registos de Ponto - Resumo por Utilizador
        </h1>
        <p style={styles.subtitle}>Vista compacta com detalhes expandíveis</p>
      </div>

      {/* Filtros */}
      <div style={styles.filtersCard}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>🔍</span>
          Filtros de Pesquisa
        </h3>
        
        <div style={styles.filtersGrid}>
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
            <label style={styles.label}>Utilizador (Opcional)</label>
            <select 
              style={styles.select}
              value={utilizadorSelecionado} 
              onChange={e => setUtilizadorSelecionado(e.target.value)}
            >
              <option value="">-- Todos os utilizadores --</option>
              {utilizadores.map(u => (
                <option key={u.id} value={u.id}>{u.email}</option>
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
        </div>

        <div style={styles.actionButtons}>
          <button 
            style={styles.primaryButton}
            onClick={carregarResumoUtilizadores}
            disabled={loading}
          >
            {loading ? '🔄 A carregar...' : '🔍 Carregar Resumo'}
          </button>
          
          {resumoUtilizadores.length > 0 && (
            <button 
              style={styles.exportButton}
              onClick={exportarResumo}
            >
              📊 Exportar Resumo
            </button>
          )}

          {utilizadorDetalhado && (
            <button 
              style={styles.detailsButton}
              onClick={() => setUtilizadorDetalhado(null)}
            >
              ← Voltar ao Resumo
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <p>A carregar resumo...</p>
        </div>
      )}

      {/* Resumo dos Utilizadores */}
      {!loading && !utilizadorDetalhado && resumoUtilizadores.length > 0 && (
        <div style={styles.resumoSection}>
          <h3 style={styles.sectionTitle}>
            <span style={styles.sectionIcon}>📊</span>
            Resumo por Utilizador ({resumoUtilizadores.length} utilizadores)
          </h3>
          
          <div style={styles.utilizadoresGrid}>
            {resumoUtilizadores.map((resumo, index) => (
              <div 
                key={resumo.utilizador.id} 
                style={styles.utilizadorCard}
                onClick={() => carregarDetalhesUtilizador(resumo.utilizador)}
              >
                <div style={styles.utilizadorHeader}>
                  <div style={styles.utilizadorInfo}>
                    <h4 style={styles.utilizadorNome}>
                      👤 {resumo.utilizador.nome}
                    </h4>
                    <p style={styles.utilizadorEmail}>{resumo.utilizador.email}</p>
                  </div>
                  <div style={styles.horasDestaque}>
                    <span style={styles.horasNumero}>{resumo.totalHorasEstimadas}</span>
                    <span style={styles.horasLabel}>horas</span>
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

      {/* Detalhes do Utilizador Selecionado */}
      {utilizadorDetalhado && (
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

      {/* Empty State para resumo */}
      {!loading && !utilizadorDetalhado && resumoUtilizadores.length === 0 && (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>👥</span>
          <h3>Nenhum utilizador encontrado</h3>
          <p>Não foram encontrados registos para os critérios selecionados.</p>
        </div>
      )}
    </div>
  );
};

const styles = {
container: {
  padding: '20px',
  maxWidth: '100%', // <--- muda aqui!
  width: '100%',
  margin: '0 auto',
  backgroundImage: 'linear-gradient(to bottom, #e3f2fd, #bbdefb, #90caf9)',
  minHeight: '100vh',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  overflowX: 'hidden',
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
  background: '#ffffff',
  borderRadius: '15px',
  padding: '30px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  marginBottom: '30px',
  border: 'none'
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
  selectSmall: {
    padding: '8px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.9rem',
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
  detailsButton: {
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
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
  resumoSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    marginBottom: '30px'
  },
  utilizadoresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '25px'
  },
  utilizadorCard: {
    backgroundColor: '#f7fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '16px',
    padding: '25px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative'
  },
  utilizadorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  utilizadorInfo: {
    flex: 1
  },
  utilizadorNome: {
    margin: '0 0 5px 0',
    color: '#2d3748',
    fontSize: '1.3rem',
    fontWeight: '700'
  },
  utilizadorEmail: {
    margin: 0,
    color: '#718096',
    fontSize: '0.9rem'
  },
  horasDestaque: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#3182ce',
    color: 'white',
    padding: '15px 20px',
    borderRadius: '12px'
  },
  horasNumero: {
    fontSize: '2rem',
    fontWeight: '700',
    lineHeight: 1
  },
  horasLabel: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  estatisticasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '20px'
  },
  estatItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '15px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  estatNumero: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#3182ce',
    lineHeight: 1
  },
  estatLabel: {
    fontSize: '0.8rem',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '5px'
  },
  obrasInfo: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '15px'
  },
  obrasLabel: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '5px'
  },
  obrasTexto: {
    fontSize: '0.9rem',
    color: '#2d3748',
    lineHeight: 1.4
  },
  periodoInfo: {
    marginBottom: '15px'
  },
  periodoTexto: {
    fontSize: '0.9rem',
    color: '#718096'
  },
  clickHint: {
    position: 'absolute',
    bottom: '10px',
    right: '15px',
    fontSize: '0.8rem',
    color: '#a0aec0',
    fontStyle: 'italic'
  },
  detalhesSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  detalhesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  detalhesSubtitle: {
    color: '#718096',
    fontSize: '1rem',
    margin: '5px 0 0 0'
  },
  detalhesActions: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    flexWrap: 'wrap'
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

// Hover effects
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .utilizador-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(0,0,0,0.15) !important;
    border-color: #3182ce !important;
  }

  .event-card:hover {
    background-color: #edf2f7 !important;
    transform: translateX(5px);
  }

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

  html {
    scroll-behavior: smooth;
  }

  body {
  background: #f5f7fa !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
  }
  `;
  document.head.appendChild(style);
}

export default RegistosPorUtilizador;
