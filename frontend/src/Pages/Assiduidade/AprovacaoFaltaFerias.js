
import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaCheckCircle, FaTimesCircle, FaClock, FaUser, FaCalendarAlt, FaFilter, FaSync, FaPlus } from 'react-icons/fa';

const AprovacaoFaltaFerias = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState('pendentes');

  const token = localStorage.getItem('loginToken');
  const painelToken = localStorage.getItem('painelAdminToken');
  const urlempresa = localStorage.getItem('urlempresa');
  const userNome = localStorage.getItem('userNome');
    const empresaId = localStorage.getItem('empresa_id');

  const [todosPedidos, setTodosPedidos] = useState([]);

  const [colaboradorFiltro, setColaboradorFiltro] = useState('');

const tipoUser = localStorage.getItem('tipoUser');

const [mostrarFormulario, setMostrarFormulario] = useState(false);



const [colaboradoresEquipa, setColaboradoresEquipa] = useState([]);
const [tiposFalta, setTiposFalta] = useState([]);
const [mapaFaltas, setMapaFaltas] = useState({});
const [minhasEquipas, setMinhasEquipas] = useState([]);

const [novaFaltaEquipa, setNovaFaltaEquipa] = useState({
  funcionario: '',
  Falta: '',
  Data: '',
  Horas: false,
  Tempo: 1,
  Observacoes: '',
  DescontaAlimentacao: false,
  DescontaSubsidioTurno: false
});

useEffect(() => {
  carregarColaboradoresEquipa();
  carregarTiposFaltaEquipa();
}, []);

const carregarColaboradoresEquipa = async () => {
  try {
    let membros = [];

    if (tipoUser === 'Administrador') {
      const res = await fetch(`https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${empresaId}`, {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
});


      if (!res.ok) throw new Error('Erro ao obter utilizadores');

      const data = await res.json();

      membros = data.map(u => ({
  codigo: u.id,
  nome: u.nome ? `${u.nome} (${u.email})` : u.email
}));

    } else {
      const res = await fetch('https://backend.advir.pt/api/equipa-obra/minhas-agrupadas', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,

        }
      });

      const data = await res.json();

      membros = data.flatMap(equipa => equipa.membros.map(m => ({
        codigo: m.id,
        nome: m.nome
      })));
    }

    setColaboradoresEquipa(membros);
  } catch (err) {
    console.error('Erro ao carregar colaboradores:', err);
    setColaboradoresEquipa([]);
  }
};



const obterCodFuncionario = async (userId) => {
  try {
    const res = await fetch(`https://backend.advir.pt/api/users/${userId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        urlempresa
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


const carregarTiposFaltaEquipa = async () => {
  try {
    const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetListaTipoFaltas`, {
      headers: {
        Authorization: `Bearer ${painelToken}`,
        urlempresa,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    const lista = data?.DataSet?.Table ?? [];
    setTiposFalta(lista);
    const mapa = Object.fromEntries(lista.map(f => [f.Falta, f.Descricao]));
    setMapaFaltas(mapa);
  } catch (err) {
    console.error('Erro ao carregar tipos de falta:', err);
  }
};

const submeterFaltaEquipa = async (e) => {
  e.preventDefault();

if (!novaFaltaEquipa.funcionario || !novaFaltaEquipa.Falta) {
  alert("Seleciona colaborador e tipo de falta.");
  return;
}

// ⚠️ obter codFuncionario antes de continuar
const codFuncionario = await obterCodFuncionario(novaFaltaEquipa.funcionario);
if (!codFuncionario) {
  alert("Erro ao obter funcionário associado.");
  return;
}


  const dados = {
    tipoPedido: 'FALTA',
    funcionario: codFuncionario,
    dataPedido: novaFaltaEquipa.Data,
    falta: novaFaltaEquipa.Falta,
    horas: novaFaltaEquipa.Horas ? 1 : 0,
    tempo: novaFaltaEquipa.Tempo,
    justificacao: novaFaltaEquipa.Observacoes,
    observacoes: '',
    usuarioCriador: localStorage.getItem('codFuncionario'),
    origem: 'ENCARREGADO',
    descontaAlimentacao: novaFaltaEquipa.DescontaAlimentacao ? 1 : 0,
    descontaSubsidioTurno: novaFaltaEquipa.DescontaSubsidioTurno ? 1 : 0
  };

  try {
    const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        urlempresa
      },
      body: JSON.stringify(dados)
    });

    if (res.ok) {
      alert('Falta registada com sucesso!');
      setNovaFaltaEquipa({
        funcionario: '',
        Falta: '',
        Horas: false,
        Tempo: 1,
        Observacoes: '',
        DescontaAlimentacao: false,
        DescontaSubsidioTurno: false
      });
      await carregarTodosPedidos();
    } else {
      alert('Erro ao registar falta: ' + await res.text());
    }
  } catch (err) {
    console.error('Erro ao submeter falta:', err);
    alert('Erro inesperado');
  }
};



const carregarTodosPedidos = async () => {
  try {
    setLoading(true);
    
    const [resPendentes, resAprovados, resRejeitados] = await Promise.all([
      fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/pendentes`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        }
      }),
      fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/aprovados`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        }
      }),
      fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/rejeitados`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        }
      }),
    ]);

    const [pendentes, aprovados, rejeitados] = await Promise.all([
      resPendentes.ok ? resPendentes.json() : [],
      resAprovados.ok ? resAprovados.json() : [],
      resRejeitados.ok ? resRejeitados.json() : []
    ]);

    const todosPedidos = [...pendentes, ...aprovados, ...rejeitados];
    
    // Obter lista única de funcionários
    const funcionariosUnicos = [...new Set(todosPedidos.map(p => p.funcionario))];
    
    // Carregar nomes de todos os funcionários em paralelo
    const nomesPromises = funcionariosUnicos.map(async (codFuncionario) => {
      const nome = await obterNomeFuncionario(codFuncionario);
      return { codigo: codFuncionario, nome };
    });
    
    const nomesCarregados = await Promise.all(nomesPromises);
    const mapaNomes = Object.fromEntries(nomesCarregados.map(n => [n.codigo, n.nome]));
    
    // Aplicar nomes aos pedidos
    const pedidosComNome = todosPedidos.map(p => ({
      ...p,
      nomeFuncionario: mapaNomes[p.funcionario] || p.funcionario
    }));

    setTodosPedidos(pedidosComNome);
    
    // Aplicar filtro atual aos pedidos com nomes
    const pedidosFiltrados = pedidosComNome.filter(p => {
      if (estadoFiltro === 'pendentes') return p.estadoAprovacao === 'Pendente';
      if (estadoFiltro === 'aprovados') return p.estadoAprovacao === 'Aprovado';
      if (estadoFiltro === 'rejeitados') return p.estadoAprovacao === 'Rejeitado';
      return true;
    });
    
    setPedidos(pedidosFiltrados);
  } catch (err) {
    console.error('Erro ao carregar todos os pedidos:', err);
  } finally {
    setLoading(false);
  }
};








  const carregarPedidos = async (estado = 'pendentes') => {
    // Se já temos todos os pedidos carregados, apenas filtramos
    if (todosPedidos.length > 0) {
      const pedidosFiltrados = todosPedidos.filter(p => {
        if (estado === 'pendentes') return p.estadoAprovacao === 'Pendente';
        if (estado === 'aprovados') return p.estadoAprovacao === 'Aprovado';
        if (estado === 'rejeitados') return p.estadoAprovacao === 'Rejeitado';
        return true;
      });
      setPedidos(pedidosFiltrados);
      return;
    }

    // Caso contrário, carrega normalmente
    setLoading(true);
    let endpoint = 'pendentes';
    if (estado === 'aprovados') endpoint = 'aprovados';
    if (estado === 'rejeitados') endpoint = 'rejeitados';

    try {
      const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        }
      });

      if (res.ok) {
        const data = await res.json();
        
        // Carregar nomes dos funcionários para os pedidos carregados
        const funcionariosUnicos = [...new Set(data.map(p => p.funcionario))];
        const nomesPromises = funcionariosUnicos.map(async (codFuncionario) => {
          const nome = await obterNomeFuncionario(codFuncionario);
          return { codigo: codFuncionario, nome };
        });
        
        const nomesCarregados = await Promise.all(nomesPromises);
        const mapaNomes = Object.fromEntries(nomesCarregados.map(n => [n.codigo, n.nome]));
        
        const pedidosComNome = data.map(p => ({
          ...p,
          nomeFuncionario: mapaNomes[p.funcionario] || p.funcionario
        }));
        
        setPedidos(pedidosComNome);
      } else {
        console.error('Erro ao carregar pedidos');
      }
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-PT');
  };

  

useEffect(() => {
  carregarTodosPedidos();
}, []);

useEffect(() => {
  if (todosPedidos.length > 0) {
    carregarPedidos(estadoFiltro);
  }
}, [estadoFiltro, todosPedidos]);


const confirmarPedido = async (pedido) => {
  const tipoUser = localStorage.getItem('tipoUser'); // 'Encarregado' ou 'Administrador'
  setLoading(true);

  try {
    if (tipoUser === 'Encarregado') {
      const confirmarN1 = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/${pedido.id}/confirmar-nivel1`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        },
        body: JSON.stringify({ confirmadoPor1: userNome })
      });

      if (confirmarN1.ok) {
        alert('Confirmação enviada com sucesso. Aguarda validação da administração.');
        carregarPedidos(estadoFiltro);
      } else {
        alert('Erro ao confirmar como encarregado.');
      }
      return; // ⚠️ Impede a continuação da aprovação
    }

    if (tipoUser === 'Administrador') {
      const confirmarN2 = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/${pedido.id}/confirmar-nivel2`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        },
        body: JSON.stringify({ confirmadoPor2: userNome })
      });

      if (!confirmarN2.ok) {
        alert('Erro ao confirmar como administrador.');
        return;
      }

      // Só o admin aprova
      aprovarPedido(pedido);
    }
  } catch (err) {
    console.error('Erro ao confirmar:', err);
    alert('Erro inesperado ao confirmar.');
  } finally {
    setLoading(false);
  }
};


  const aprovarPedido = async (pedido) => {
    try {
      const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/${pedido.id}/aprovar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        },
        body: JSON.stringify({ aprovadoPor: userNome, observacoesResposta: 'Aprovado.' })
      });

      if (!res.ok) {
        alert('Erro ao aprovar.');
        return;
      }

      console.log("Tipo de pedido:", pedido.tipoPedido);

      if (pedido.tipoPedido === 'FALTA') {
        const dadosFalta = {
          Funcionario: pedido.funcionario,
          Data: new Date(pedido.dataPedido).toISOString(),
          Falta: pedido.falta,
          Horas: pedido.horas,
          Tempo: pedido.tempo,
          DescontaVenc: 0,
          DescontaRem: 0,
          ExcluiProc: 0,
          ExcluiEstat: 0,
          Observacoes: pedido.justificacao,
          CalculoFalta: 1,
          DescontaSubsAlim: 0,
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

        await fetch(`https://webapiprimavera.advir.pt/routesFaltas/InserirFalta`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${painelToken}`,
            urlempresa
          },
          body: JSON.stringify(dadosFalta)
        });
      }

      if (pedido.tipoPedido === 'FERIAS') {
        const inicio = new Date(pedido.dataInicio);
        const fim = new Date(pedido.dataFim);
        const faltasParaCriar = pedido.horas ? ["F40"] : ["F50", "F40"];

        for (let dia = new Date(inicio); dia <= fim; dia.setDate(dia.getDate() + 1)) {
          const dataStr = dia.toISOString().split("T")[0];

          for (const faltaCod of faltasParaCriar) {
            const dadosFalta = {
              Funcionario: pedido.funcionario,
              Data: dataStr,
              Falta: faltaCod,
              Horas: pedido.horas ? 1 : 0,
              Tempo: pedido.tempo,
              DescontaVenc: 0,
              DescontaRem: 0,
              ExcluiProc: 0,
              ExcluiEstat: 0,
              Observacoes: pedido.justificacao,
              CalculoFalta: 1,
              DescontaSubsAlim: 0,
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

            try {
              await fetch('https://webapiprimavera.advir.pt/routesFaltas/InserirFalta', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${painelToken}`,
                  urlempresa
                },
                body: JSON.stringify(dadosFalta)
              });
            } catch (error) {
              console.warn(`Falta já existente ou erro ignorado: ${faltaCod} em ${dataStr}`, error);
            }
          }

          const dadosFerias = {
            Funcionario: pedido.funcionario,
            DataFeria: dataStr,
            EstadoGozo: 0,
            OriginouFalta: 1,
            TipoMarcacao: 1,
            OriginouFaltaSubAlim: 1,
            Duracao: pedido.tempo,
            Acerto: 0,
            NumProc: null,
            Origem: 0
          };

          try {
            await fetch('https://webapiprimavera.advir.pt/routesFaltas/InserirFeriasFuncionario', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${painelToken}`,
                urlempresa
              },
              body: JSON.stringify(dadosFerias)
            });
          } catch (error) {
            console.warn('Férias já existentes ou erro ignorado:', error);
          }
        }
      }

      alert('Pedido aprovado e registado com sucesso.');
      await carregarPedidos(estadoFiltro);
     await carregarTodosPedidos();
    } catch (err) {
      console.error('Erro ao aprovar:', err);
      alert('Erro inesperado.');
    }
  };

  const rejeitarPedido = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/${id}/rejeitar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        },
        body: JSON.stringify({ observacoesResposta: 'Rejeitado por ' + userNome + '.' })
      });

      if (res.ok) {
        alert('Pedido rejeitado com sucesso.');
        await carregarPedidos(estadoFiltro);
        await carregarTodosPedidos();
      } else {
        alert('Erro ao rejeitar.');
      }
    } catch (err) {
      console.error('Erro ao rejeitar:', err);
      alert('Erro inesperado ao rejeitar.');
    } finally {
      setLoading(false);
    }
  };

 const contarPorEstado = (estado) => {
  switch (estado) {
    case 'Pendente':
      return todosPedidos.filter(p => p.estadoAprovacao === 'Pendente').length;
    case 'Aprovado':
      return todosPedidos.filter(p => p.estadoAprovacao === 'Aprovado').length;
    case 'Rejeitado':
      return todosPedidos.filter(p => p.estadoAprovacao === 'Rejeitado').length;
    default:
      return todosPedidos.length;
  }
};



// Cache para nomes de funcionários
const cacheNomes = {};

const obterNomeFuncionario = async (codFuncionario) => {
  // Verificar se já está em cache
  if (cacheNomes[codFuncionario]) {
    return cacheNomes[codFuncionario];
  }

  try {
    const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetNomeFuncionario/${codFuncionario}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${painelToken}`,
        urlempresa,
      }
    });

    if (res.ok) {
      const data = await res.json();
      const nome = data?.DataSet?.Table?.[0]?.Nome || codFuncionario;
      
      // Guardar em cache
      cacheNomes[codFuncionario] = nome;
      return nome;
    } else {
      console.warn(`Erro ao obter nome do funcionário ${codFuncionario}`);
      cacheNomes[codFuncionario] = codFuncionario;
      return codFuncionario;
    }
  } catch (err) {
    console.error("Erro ao obter nome do funcionário:", err);
    cacheNomes[codFuncionario] = codFuncionario;
    return codFuncionario;
  }
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
        .pedido-card {
          transition: all 0.3s ease;
          height: 100%;
        }
        .pedido-card:hover {
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
                <FaCheckCircle className="me-2 me-md-3" />
                <span className="d-none d-sm-inline">Aprovação de Faltas e Férias</span>
                <span className="d-sm-none">Aprovações</span>
              </h1>
              <p className="text-muted mb-0 small">Gerencie pedidos de faltas e férias dos colaboradores</p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="kpi-card">
                <div className="kpi-icon text-warning">
                  <FaClock />
                </div>
                <h3 className="kpi-number text-warning">{contarPorEstado('Pendente')}</h3>
                <p className="kpi-label">Pendentes</p>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="kpi-card">
                <div className="kpi-icon text-success">
                  <FaCheckCircle />
                </div>
                <h3 className="kpi-number text-success">{contarPorEstado('Aprovado')}</h3>
                <p className="kpi-label">Aprovados</p>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="kpi-card">
                <div className="kpi-icon text-danger">
                  <FaTimesCircle />
                </div>
                <h3 className="kpi-number text-danger">{contarPorEstado('Rejeitado')}</h3>
                <p className="kpi-label">Rejeitados</p>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="kpi-card">
                <div className="kpi-icon text-primary">
                  <FaCalendarAlt />
                </div>
                <h3 className="kpi-number text-primary">{todosPedidos.length}</h3>
<p className="kpi-label">Total</p>

              </div>
            </div>
          </div>




{['Encarregado', 'Diretor', 'Administrador'].includes(tipoUser) && (
  <>
    <div className="card card-moderno mb-4">
      <div className="card-body">
        <h5 className="text-primary fw-bold mb-3">Registar Falta de um Colaborador</h5>

        <button
          className="btn btn-outline-secondary btn-sm mb-3"
          type="button"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? 'Esconder' : 'Mostrar'} Formulário
        </button>

        {mostrarFormulario && (
          <form onSubmit={submeterFaltaEquipa} className="row g-2">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Colaborador</label>
              <select
                className="form-select form-moderno"
                value={novaFaltaEquipa.funcionario}
                onChange={(e) =>
                  setNovaFaltaEquipa({ ...novaFaltaEquipa, funcionario: e.target.value })
                }
                required
              >
                <option value="">Seleciona...</option>
                {colaboradoresEquipa.map((c, i) => (
                  <option key={i} value={c.codigo}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label small fw-semibold">Data da Falta</label>
              <input
                type="date"
                className="form-control form-moderno"
                value={novaFaltaEquipa.Data}
                onChange={(e) =>
                  setNovaFaltaEquipa({ ...novaFaltaEquipa, Data: e.target.value })
                }
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold">Tipo de Falta</label>
              <select
                className="form-select form-moderno"
                value={novaFaltaEquipa.Falta}
                onChange={(e) => {
                  const falta = tiposFalta.find(f => f.Falta === e.target.value);
                  setNovaFaltaEquipa({
                    ...novaFaltaEquipa,
                    Falta: falta.Falta,
                    Horas: Number(falta.Horas) === 1,
                    Tempo: 1,
                    DescontaAlimentacao: Number(falta.DescontaSubsAlim) === 1,
                    DescontaSubsidioTurno: Number(falta.DescontaSubsTurno) === 1
                  });
                }}
                required
              >
                <option value="">Seleciona tipo...</option>
                {tiposFalta.map((f, i) => (
                  <option key={i} value={f.Falta}>
                    {f.Falta} – {f.Descricao}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label small fw-semibold">Tempo</label>
              <input
                type="number"
                className="form-control form-moderno"
                value={novaFaltaEquipa.Tempo}
                min={1}
                onChange={(e) =>
                  setNovaFaltaEquipa({ ...novaFaltaEquipa, Tempo: parseInt(e.target.value) })
                }
              />
            </div>

            <div className="col-md-12">
              <label className="form-label small fw-semibold">Observações</label>
              <textarea
                className="form-control form-moderno"
                rows="2"
                value={novaFaltaEquipa.Observacoes}
                onChange={(e) =>
                  setNovaFaltaEquipa({ ...novaFaltaEquipa, Observacoes: e.target.value })
                }
              />
            </div>

            <div className="col-12">
              <button type="submit" className="btn btn-danger w-100 rounded-pill">
                Registar Falta
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  </>
)}




          {/* Filtros e Controles */}
          <div className="card card-moderno mb-4">
            <div className="card-body">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                <div className="mb-3 mb-md-0">
                  <h5 className="fw-bold mb-1">
                    <FaFilter className="me-2 text-primary" />
                    Filtros
                  </h5>
                  <p className="text-muted mb-0 small">Selecione o estado dos pedidos</p>
                </div>

                <div className="d-flex gap-2 w-100 w-md-auto">
                  <select
                    className="form-select form-moderno flex-grow-1"
                    value={estadoFiltro}
                    onChange={(e) => setEstadoFiltro(e.target.value)}
                    disabled={loading}
                  >
                    <option value="pendentes">🕒 Pendentes</option>
                    <option value="aprovados">✅ Aprovados</option>
                    <option value="rejeitados">❌ Rejeitados</option>
                  </select>
                  <select
                    className="form-select form-moderno"
                    value={colaboradorFiltro}
                    onChange={(e) => setColaboradorFiltro(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Todos os colaboradores</option>
                    {[...new Map(todosPedidos.map(p => [p.funcionario, `${p.nomeFuncionario || p.funcionario} (${p.funcionario})`])).entries()]
  .map(([codigo, label]) => (
    <option key={codigo} value={codigo}>{label}</option>
))}

                  </select>

                  <button 
                    onClick={() => carregarPedidos(estadoFiltro)} 
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

          
          {/* Lista de Pedidos */}
          <div className="row g-3" style={{marginBottom: '50px'}}>
            {pedidos.length === 0 ? (
              <div className="col-12">
                <div className="card card-moderno">
                  <div className="card-body text-center py-5">
                    <FaUser className="text-muted mb-3" size={48} />
                    <h6 className="text-muted">Nenhum pedido encontrado</h6>
                    <p className="text-muted small mb-0">
                      {estadoFiltro === 'pendentes' ? 'Não há pedidos pendentes de aprovação.' :
                       estadoFiltro === 'aprovados' ? 'Não há pedidos aprovados.' :
                       'Não há pedidos rejeitados.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              pedidos
 .filter(p =>
  colaboradorFiltro === '' || p.funcionario === colaboradorFiltro
)

  .map((pedido) => {

                const aprovado = pedido.estadoAprovacao === 'Aprovado';
                const rejeitado = pedido.estadoAprovacao === 'Rejeitado';
                const pendente = pedido.estadoAprovacao === 'Pendente';
                
                return (
                  <div key={pedido.id} className="col-12 col-lg-6 col-xl-4">
                    <div className="card pedido-card card-moderno h-100">
                      <div className="card-body d-flex flex-column">
                        {/* Header do Card */}
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <span className="badge bg-secondary fw-bold">#{pedido.id}</span>
                            <h6 className="mb-1 mt-2">{`${pedido.nomeFuncionario || pedido.funcionario} (${pedido.funcionario})`}</h6>


                          </div>
                          <div className="text-end">
                            <span className={`badge ${pedido.tipoPedido === 'FALTA' ? 'bg-danger' : 'bg-primary'} status-badge`}>
                              {pedido.tipoPedido === 'FALTA' ? '🚫 FALTA' : '🌴 FÉRIAS'}
                            </span>
                            <div className="mt-2">
                              {pendente && <span className="badge bg-warning status-badge">🕒 Pendente</span>}
                              {aprovado && <span className="badge bg-success status-badge">✅ Aprovado</span>}
                              {rejeitado && <span className="badge bg-danger status-badge">❌ Rejeitado</span>}
                            </div>
                          </div>
                        </div>

                        {/* Detalhes do Pedido */}
                        <div className="mb-3 flex-grow-1">
                          <div className="border-start border-primary border-3 ps-3">
                            {pedido.tipoPedido === 'FALTA' ? (
                              <>
                                <div className="d-flex justify-content-between mb-1">
                                  <small className="text-muted">Data:</small>
                                  <small className="fw-semibold">{formatarData(pedido.dataPedido)}</small>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                  <small className="text-muted">Tipo:</small>
                                  <small className="fw-semibold">{pedido.falta}</small>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                  <small className="text-muted">Por horas:</small>
                                  <small className="fw-semibold">{pedido.horas ? 'Sim' : 'Não'}</small>
                                </div>
                                <div className="d-flex justify-content-between">
                                  <small className="text-muted">Duração:</small>
                                  <small className="fw-semibold">{pedido.tempo || 0}{pedido.horas ? 'h' : ' dia(s)'}</small>
                                </div>
                                <div className="d-flex justify-content-between">
                                  <small className="text-muted">Confirmação Encarregado:</small>
                                  <small className="fw-semibold">{pedido.confirmadoPor1}</small>
                                </div>
                                <div className="d-flex justify-content-between">
                                  <small className="text-muted">Confirmação RH:</small>
                                  <small className="fw-semibold">{pedido.confirmadoPor2}</small>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="d-flex justify-content-between mb-1">
                                  <small className="text-muted">Início:</small>
                                  <small className="fw-semibold">{formatarData(pedido.dataInicio)}</small>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                  <small className="text-muted">Fim:</small>
                                  <small className="fw-semibold">{formatarData(pedido.dataFim)}</small>
                                </div>
                                <div className="d-flex justify-content-between">
                                  <small className="text-muted">Duração:</small>
                                  <small className="fw-semibold">{pedido.duracao || '-'} dias</small>
                                </div>
                                <div className="d-flex justify-content-between">
                                  <small className="text-muted">Confirmação Encarregado:</small>
                                  <small className="fw-semibold">{pedido.confirmadoPor1}</small>
                                </div>
                                <div className="d-flex justify-content-between">
                                  <small className="text-muted">Confirmação RH:</small>
                                  <small className="fw-semibold">{pedido.confirmadoPor2}</small>
                                </div>
                              </>
                            )}
                          </div>

                          {pedido.justificacao && (
                            <div className="mt-3">
                              <small className="text-muted fw-semibold">Justificação:</small>
                              <div className="bg-light rounded p-2 mt-1 small">
                                {pedido.justificacao}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="mt-auto">
                          {aprovado ? (
                            <div className="alert alert-success p-2 small mb-0">
                              <div className="d-flex align-items-center">
                                <FaCheckCircle className="me-2" />
                                <div>
                                  <strong>Aprovado</strong><br />
                                  Por: {pedido.aprovadoPor || 'Admin'}
                                </div>
                              </div>
                            </div>
                          ) : rejeitado ? (
                            <div className="alert alert-danger p-2 small mb-0">
                              <div className="d-flex align-items-center">
                                <FaTimesCircle className="me-2" />
                                <div>
                                  <strong>Rejeitado</strong><br />
                                  Por: {pedido.aprovadoPor || 'Admin'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-success btn-responsive rounded-pill flex-fill"
                                onClick={() => confirmarPedido(pedido)}
                                disabled={loading}
                              >
                                <FaCheckCircle className="me-1" />
                                <span className="d-none d-sm-inline">Aprovar</span>
                                <span className="d-sm-none">✔</span>
                              </button>
                              <button
                                className="btn btn-danger btn-responsive rounded-pill flex-fill"
                                onClick={() => rejeitarPedido(pedido.id)}
                                disabled={loading}
                              >
                                <FaTimesCircle className="me-1" />
                                <span className="d-none d-sm-inline">Rejeitar</span>
                                <span className="d-sm-none">✖</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
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

export default AprovacaoFaltaFerias;
