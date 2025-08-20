
import React, { useEffect, useState } from 'react';
import { FaClock, FaCheckCircle, FaTimesCircle, FaSync, FaUser, FaBuilding, FaCalendarAlt, FaExclamationTriangle, FaFilter } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigation } from '@react-navigation/native';


const AprovacaoPontoPendentes = () => {
  const [registos, setRegistos] = useState([]);
  const [todosRegistos, setTodosRegistos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState({});
  const [colaboradorFiltro, setColaboradorFiltro] = useState('');
const [minhasEquipas, setMinhasEquipas] = useState([]);
  const token = localStorage.getItem('loginToken');
  const urlempresa = localStorage.getItem('urlempresa');

const navigation = useNavigation();

const tipoUser = localStorage.getItem('tipoUser'); // ou usa context/state se aplicável

  /** 1) Carrega as equipas que eu lidero, com os membros */
 const carregarEquipas = async () => {
     try {
     const res = await fetch(
       'https://backend.advir.pt/api/equipa-obra/minhas-agrupadas',
       {
         headers: {
           'Content-Type': 'application/json',
           Authorization: `Bearer ${token}`,
           urlempresa
         }
       }
     );
     const data = await res.json();
     setMinhasEquipas(data);
     return data;
   } catch (err) {
     console.error('Erro ao carregar as tuas equipas:', err);
     return[];
   }
 };




  /**
   * Carrega os registos pendentes de aprovação
   */
  const carregarRegistos = async () => {
    setLoading(true);
    try {
      const empresaId = localStorage.getItem('empresa_id');
      const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/pendentes?empresa_id=${empresaId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        }
      });
      const data = await res.json();
        // Se for Administrador, mostra todos os registos
     if (tipoUser === 'Administrador') {
       setRegistos(data);
       setLoading(false); 
       return;
     }
         let resultado;
   if (tipoUser === 'Administrador') {
     // 1) Admin vê tudo
     resultado = data;
   } else {
     // 2) Encarregado filtra pelos seus membros
     const memberIDs = minhasEquipas.flatMap(eq => eq.membros.map(m => m.id));
     resultado = data.filter(r => memberIDs.includes(r.User?.id));
   }
   setRegistos(resultado);
    } catch (err) {
      console.error('Erro ao carregar registos:', err);
    } finally {
      setLoading(false);
    }
  };



  /**
   * Confirma um registo específico
   */
  const confirmar = async (id) => {
    setProcessando(prev => ({ ...prev, [id]: true }));
    try {
      await fetch(`https://backend.advir.pt/api/registo-ponto-obra/confirmar/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        }
      });
      await carregarRegistos();
    } catch (err) {
      console.error('Erro ao confirmar:', err);
    } finally {
      setProcessando(prev => ({ ...prev, [id]: false }));
    }
  };

  /**
   * Cancela um registo específico
   */
  const cancelar = async (id) => {
    if (!window.confirm('Tens a certeza que queres cancelar este registo?')) return;
    
    setProcessando(prev => ({ ...prev, [id]: true }));
    try {
      await fetch(`https://backend.advir.pt/api/registo-ponto-obra/cancelar/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        }
      });
      await carregarRegistos();
    } catch (err) {
      console.error('Erro ao cancelar:', err);
    } finally {
      setProcessando(prev => ({ ...prev, [id]: false }));
    }
  };

   useEffect(() => {
     if (tipoUser !== 'Administrador') {
       carregarEquipas();
     }
   }, []);

   useEffect(() => {
     if (tipoUser === 'Administrador') {
       carregarRegistos();
     }
   }, []);


      useEffect(() => {
     if (tipoUser !== 'Administrador' && minhasEquipas.length > 0) {
       carregarRegistos();
     }
   }, [minhasEquipas]);


    useEffect(() => {
   if (tipoUser === 'Administrador') {
     // Admin vê tudo
     carregarRegistos();
   } else {
     // Encarregado: carrega equipas e, se existirem, carrega registos; senão desliga o loading
     carregarEquipas().then(eqs => {
       if (eqs.length > 0) {
         carregarRegistos();
       } else {
         setLoading(false);
       }
     });
   }
    }, []);

  /**
   * Formata a data e hora para apresentação
   */
  const formatarDataHora = (timestamp) => {
    const data = new Date(timestamp);
    return {
      data: data.toLocaleDateString('pt-PT', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }),
      hora: data.toLocaleTimeString('pt-PT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  /**
   * Define a cor do badge baseado no tipo de registo
   */
  const getBadgeColor = (tipo) => {
    const tipos = {
      entrada: 'primary',
      saida: 'primary',
      pausa_inicio: 'warning',
      pausa_fim: 'info'
    };
    return tipos[tipo.toLowerCase()] || 'secondary';
  };

  

  return (
    <div className="container-fluid bg-light min-vh-100 py-2 py-md-4" style={{overflowX: 'hidden', background: 'linear-gradient(to bottom, #e3f2fd, #bbdefb, #90caf9)'}}>
      <style jsx>{`
        body {
          overflow-x: hidden;
        }
        .card-moderno {
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          border: none;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }
        .card-moderno:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        .form-moderno {
          border-radius: 8px;
          border: 1px solid #dee2e6;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }
        .form-moderno:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
        }
        .btn-responsive {
          font-size: 0.8rem;
          padding: 0.4rem 0.8rem;
        }
        @media (min-width: 768px) {
          .btn-responsive {
            font-size: 0.875rem;
            padding: 0.5rem 1rem;
          }
        }
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .registo-card {
          transition: all 0.3s ease;
          height: 100%;
        }
        .registo-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        .status-badge {
          font-size: 0.75rem;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-weight: 600;
        }
        .kpi-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          border: none;
          transition: all 0.3s ease;
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        }
        .kpi-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .kpi-number {
          font-size: 2rem;
          font-weight: bold;
          margin: 0;
          line-height: 1;
        }
        .kpi-label {
          color: #6c757d;
          font-size: 0.875rem;
          margin: 0;
          margin-top: 0.25rem;
        }
        @media (max-width: 767px) {
          .kpi-card {
            padding: 1rem;
          }
          .kpi-icon {
            font-size: 1.5rem;
          }
          .kpi-number {
            font-size: 1.5rem;
          }
        }
      `}</style>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner-border text-primary" role="status" style={{width: '3rem', height: '3rem'}}>
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      )}

      <div className="row justify-content-center">
        <div className="col-12 col-xl-11">
          {/* Header */}
          <div className="card card-moderno mb-3 mb-md-4">
            <div className="card-body text-center py-3 py-md-4">
              <h1 className="h4 h3-md mb-2 text-primary">
                <FaClock className="me-2 me-md-3" />
                <span className="d-none d-sm-inline">Aprovação de Registos de Ponto</span>
                <span className="d-sm-none">Registos Ponto</span>
              </h1>
              <p className="text-muted mb-0 small">Gerencie e aprove os registos de ponto dos colaboradores nas obras</p>
            </div>

            {tipoUser === "Administrador" && (
                <div className="text-end mb-3">
                    <button
                    className="btn btn-primary rounded-pill"
                    onClick={() => navigation.navigate('RegistosPorUtilizador')}
                    >
                    <FaCalendarAlt className="me-2" />
                    Relatórios
                    </button>
                </div>
                )}

          </div>
          


          {/* KPI Cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-6">
              <div className="kpi-card">
                <div className="kpi-icon text-primary">
                  <FaClock />
                </div>
                <h3 className="kpi-number text-primary">{registos.length}</h3>
                <p className="kpi-label">Registos Pendentes</p>
              </div>
            </div>
            <div className="col-6 col-md-6">
              <div className="kpi-card">
                <div className="kpi-icon text-primary">
                  <FaUser />
                </div>
                <h3 className="kpi-number text-primary">
                  {[...new Set(registos.map(r => r.User?.nome || 'Desconhecido'))].length}
                </h3>
                <p className="kpi-label">Colaboradores</p>
              </div>
            </div>
          </div>

          {/* Filtros e Controles */}
          <div className="card card-moderno mb-4">
            <div className="card-body">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                <div className="mb-3 mb-md-0">
                  <h5 className="fw-bold mb-1">
                    <FaFilter className="me-2 text-primary" />
                    Filtro
                  </h5>
                  <p className="text-muted mb-0 small">Filtrar por colaborador</p>
                </div>

                <div className="d-flex gap-2 w-100 w-md-auto">
                  <select
                    className="form-select form-moderno flex-grow-1"
                    value={colaboradorFiltro}
                    onChange={(e) => setColaboradorFiltro(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Todos os colaboradores</option>
                    {[...new Set(registos.map(r => r.User?.nome || 'Desconhecido'))]
                      .map((nome, index) => (
                        <option key={index} value={nome}>{nome}</option>
                      ))}
                  </select>

                  <button 
                    onClick={carregarRegistos} 
                    className="btn btn-outline-primary btn-responsive rounded-pill"
                    disabled={loading}
                  >
                    <FaSync className={loading ? 'fa-spin' : ''} />
                    <span className="d-none d-md-inline ms-2">Atualizar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Registos */}
<div className="row g-3" style={{marginBottom: '50px'}}>

   {tipoUser !== 'Administrador' && minhasEquipas.length === 0 ? (
       <div className="col-12">
         <div className="card card-moderno">
           <div className="card-body text-center py-5">

            <FaExclamationTriangle className="text-warning mb-3" size={48} />
            <h6 className="text-warning">Não tens nenhuma equipa</h6>
            <p className="text-muted small mb-0">
              Só verás pedidos de ponto de utilizadores atribuídos a uma equipa que lideras.
            </p>
           </div>
         </div>
       </div>
  ) : registos.length === 0 ? (
      <div className="col-12">
        <div className="card card-moderno">
          <div className="card-body text-center py-5">
            <FaClock className="text-muted mb-3" size={48} />
            <h6 className="text-muted">Nenhum registo encontrado</h6>
            <p className="text-muted small mb-0">
              {colaboradorFiltro 
                 ? `Nenhum registo pendente encontrado para ${colaboradorFiltro}.` 
                 : 'Não existem registos pendentes de aprovação no momento.'}
            </p>
          </div>
        </div>
      </div>
            ) : (
              registos
                .filter(r => colaboradorFiltro === '' || (r.User?.nome || 'Desconhecido') === colaboradorFiltro)
                .map((registo) => {
                  const { data, hora } = formatarDataHora(registo.timestamp);
                  const isProcessando = processando[registo.id];
                  
                  return (
                    <div key={registo.id} className="col-12 col-lg-6 col-xl-4">
                      <div className="card registo-card card-moderno h-100">
                        <div className="card-body d-flex flex-column">
                          {/* Header do Card */}
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                              <span className="badge bg-secondary fw-bold">#{registo.id}</span>
                              <h6 className="mb-1 mt-2">{registo.User?.nome || 'Utilizador Desconhecido'}</h6>
                            </div>
                            <div className="text-end">
                              <span className={`badge bg-${getBadgeColor(registo.tipo)} status-badge`}>
                                {registo.tipo.replace('_', ' ').toUpperCase()}
                              </span>
                              <div className="mt-2">
                                <span className="badge bg-warning status-badge">🕒 Pendente</span>
                              </div>
                            </div>
                          </div>

                          {/* Detalhes do Registo */}
                          <div className="mb-3 flex-grow-1">
                            <div className="border-start border-primary border-3 ps-3">
                              <div className="d-flex justify-content-between mb-1">
                                <small className="text-muted">Data:</small>
                                <small className="fw-semibold">{data}</small>
                              </div>
                              <div className="d-flex justify-content-between mb-1">
                                <small className="text-muted">Hora:</small>
                                <small className="fw-semibold">{hora}</small>
                              </div>
                              <div className="d-flex justify-content-between mb-1">
                                <small className="text-muted">Tipo:</small>
                                <small className="fw-semibold">{registo.tipo.replace('_', ' ')}</small>
                              </div>
                              <div className="d-flex justify-content-between">
                                <small className="text-muted">Obra:</small>
                                <small className="fw-semibold">{registo.Obra?.nome || 'N/A'}</small>
                              </div>
                            </div>

                            {registo.justificacao && (
                              <div className="mt-3">
                                <small className="text-muted fw-semibold">Justificação:</small>
                                <div className="bg-light rounded p-2 mt-1 small">
                                  {registo.justificacao}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Ações */}
                          <div className="mt-auto">
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-primary btn-responsive rounded-pill flex-fill"
                                onClick={() => confirmar(registo.id)}
                                disabled={isProcessando}
                              >
                                <FaCheckCircle className="me-1" />
                                <span className="d-none d-sm-inline">
                                  {isProcessando ? 'A Confirmar...' : 'Confirmar'}
                                </span>
                                <span className="d-sm-none">✔</span>
                              </button>
                              <button
                                className="btn btn-primary btn-responsive rounded-pill flex-fill"
                                onClick={() => cancelar(registo.id)}
                                disabled={isProcessando}
                              >
                                <FaTimesCircle className="me-1" />
                                <span className="d-none d-sm-inline">
                                  {isProcessando ? 'A Cancelar...' : 'Cancelar'}
                                </span>
                                <span className="d-sm-none">✖</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Loading Overlay */}
                        {isProcessando && (
                          <div 
                            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                            style={{
                              background: 'rgba(255,255,255,0.1)',
                              backdropFilter: 'blur(2px)',
                              borderRadius: '15px'
                            }}
                          >
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Processando...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AprovacaoPontoPendentes;
