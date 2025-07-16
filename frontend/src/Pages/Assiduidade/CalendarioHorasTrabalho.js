import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaCalendarCheck, FaClock, FaPlus, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

const CalendarioHorasTrabalho = () => {
  const [mesAtual, setMesAtual] = useState(new Date());
  const [resumo, setResumo] = useState({});
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [detalhes, setDetalhes] = useState([]);
  const [obras, setObras] = useState([]);
  const [novaEntrada, setNovaEntrada] = useState({ 
    tipo: 'entrada', 
    obra_id: '', 
    hora: '08:00', 
    justificacao: '' 
  });
  const [registosBrutos, setRegistosBrutos] = useState([]);
  const [loading, setLoading] = useState(false);


  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarFormularioFalta, setMostrarFormularioFalta] = useState(false);
  
  const [MostrarFormularioFerias, setMostrarFormularioFerias] = useState(false);

const [faltas, setFaltas] = useState([]);
const [faltasDoDia, setFaltasDoDia] = useState([]);
const [tiposFalta, setTiposFalta] = useState([]);
const [mapaFaltas, setMapaFaltas] = useState({});


const [horarioFuncionario, setHorarioFuncionario] = useState(null); // contém o .Horario (ex: "001")
const [horariosTrabalho, setHorariosTrabalho] = useState([]); // lista completa vinda do segundo endpoint
const [detalhesHorario, setDetalhesHorario] = useState(null); // dados finais: descrição, horas, etc.

const [novaFalta, setNovaFalta] = useState({
  Falta: '',
  Horas: false,
  Tempo: 1,
  Observacoes: '',
});

const [novaFaltaFerias, setNovaFaltaFerias] = useState({
  dataInicio: '',
  dataFim: '',
  Horas: false,
  Tempo: 1,
  Observacoes: ''
});

const [modoEdicaoFalta, setModoEdicaoFalta] = useState(false);

const [modoEdicaoFerias, setModoEdicaoFerias] = useState(false);
const [faltaOriginal, setFaltaOriginal] = useState(null); // guarda Falta + Data + Funcionario

const [feriasTotalizador, setFeriasTotalizador] = useState(null);











const submeterFalta = async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('painelAdminToken');
  const funcionarioId = localStorage.getItem('codFuncionario');
  const urlempresa = localStorage.getItem('urlempresa');
  const dataFalta = diaSelecionado;

  const dados = {
    tipoPedido: 'FALTA',
    funcionario: funcionarioId,
    dataPedido: dataFalta,
    falta: novaFalta.Falta,
    horas: novaFalta.Horas ? 1 : 0,
    tempo: novaFalta.Tempo,
    justificacao: novaFalta.Observacoes,
    observacoes: '',
    usuarioCriador: funcionarioId,
    origem: 'frontend'
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
      alert('Pedido de falta submetido com sucesso para aprovação.');
      setMostrarFormularioFalta(false);
      setNovaFalta({ Falta: '', Horas: false, Tempo: 1, Observacoes: '' });
      await carregarFaltasFuncionario(); // opcional se ainda fores buscar da outra origem
    } else {
      const erro = await res.text();
      alert('Erro ao submeter falta: ' + erro);
    }
  } catch (err) {
    console.error('Erro ao submeter falta:', err);
    alert('Erro inesperado.');
  }
};




const carregarFaltasFuncionario = async () => {
  const token = localStorage.getItem("painelAdminToken");
  const funcionarioId = localStorage.getItem('codFuncionario');
  const urlempresa = localStorage.getItem('urlempresa');
  
        

 try {
  const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetListaFaltasFuncionario/${funcionarioId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      urlempresa: urlempresa,
    },
  });

  if (res.ok) {
    const data = await res.json();
    const listaFaltas = data?.DataSet?.Table ?? [];
    setFaltas(listaFaltas);
    console.log('Faltas carregadas:', listaFaltas);
  } else {
    const msg = await res.text(); // lê a resposta mesmo se for erro
    console.error('Erro ao carregar faltas:', res.status, msg);
  }
} catch (err) {
  console.error('Erro ao buscar faltas:', err);
}

};

const carregarTiposFalta = async () => {
  const token = localStorage.getItem("painelAdminToken");
  const urlempresa = localStorage.getItem("urlempresa");

  try {
    const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetListaTipoFaltas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        urlempresa: urlempresa,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const lista = data?.DataSet?.Table ?? [];
      setTiposFalta(lista);
        const mapa = Object.fromEntries(lista.map(f => [f.Falta, f.Descricao]));
        setMapaFaltas(mapa);

      console.log('Tipos de falta carregados:', lista);
    } else {
      const msg = await res.text();
      console.error('Erro ao carregar tipos de falta:', res.status, msg);
    }
  } catch (err) {
    console.error('Erro ao buscar tipos de falta:', err);
  }
};

const carregarHorarioFuncionario = async () => {
  const token = localStorage.getItem("painelAdminToken");
  const funcionarioId = "001";
  const urlempresa = localStorage.getItem("urlempresa");

  try {
    const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetHorarioFuncionario/${funcionarioId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        urlempresa: urlempresa,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const horario = data?.DataSet?.Table?.[0] ?? null;
      setHorarioFuncionario(horario); // ex: { Funcionario: "001", Horario: "001", ... }
    } else {
      console.error("Erro ao carregar horário do funcionário:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Erro ao buscar horário do funcionário:", err);
  }
};

const carregarHorariosTrabalho = async () => {
  const token = localStorage.getItem("painelAdminToken");
  const urlempresa = localStorage.getItem("urlempresa");

  try {
    const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetHorariosTrabalho`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        urlempresa: urlempresa,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const lista = data?.DataSet?.Table ?? [];
      setHorariosTrabalho(lista);
    } else {
      console.error("Erro ao carregar horários de trabalho:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Erro ao buscar horários de trabalho:", err);
  }
};


const carregarTotalizadorFerias = async () => {
  const token = localStorage.getItem("painelAdminToken");
  const urlempresa = localStorage.getItem("urlempresa");
  const funcionarioId = localStorage.getItem("codFuncionario");

  try {
    const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/GetTotalizadorFeriasFuncionario/${funcionarioId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        urlempresa,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      setFeriasTotalizador(data?.DataSet?.Table?.[0] || null); // Assumindo estrutura com DataSet
    } else {
      console.warn("Erro ao carregar totalizador de férias", await res.text());
    }
  } catch (err) {
    console.error("Erro ao buscar totalizador de férias:", err);
  }
};

const submeterFerias = async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("painelAdminToken");
  const urlempresa = localStorage.getItem("urlempresa");
  const funcionarioId = localStorage.getItem("codFuncionario");

  const { dataInicio, dataFim, Horas, Tempo, Observacoes } = novaFaltaFerias;

  const dados = {
    tipoPedido: 'FERIAS',
    funcionario: funcionarioId,
    dataPedido: new Date().toISOString().split("T")[0],
    duracao: Tempo,
    horas: Horas ? 1 : 0,
    justificacao: Observacoes,
    observacoes: '',
    usuarioCriador: funcionarioId,
    origem: 'frontend',
    dataInicio,
    dataFim
  };

  try {
    const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        urlempresa,
      },
      body: JSON.stringify(dados),
    });

    if (res.ok) {
      alert("Pedido de férias submetido com sucesso para aprovação.");
      setMostrarFormularioFerias(false);
      setNovaFaltaFerias({
        dataInicio: '',
        dataFim: '',
        Horas: false,
        Tempo: 1,
        Observacoes: ''
      });
      await carregarFaltasFuncionario(); // se aplicável
    } else {
      const erro = await res.text();
      alert("Erro ao submeter férias: " + erro);
    }
  } catch (err) {
    console.error("Erro ao submeter férias:", err);
    alert("Erro inesperado ao submeter férias.");
  }
};




useEffect(() => {
  if (horarioFuncionario && horariosTrabalho.length > 0) {
    const detalhes = horariosTrabalho.find(h => h.Horario === horarioFuncionario.Horario);
    setDetalhesHorario(detalhes);
  }
}, [horarioFuncionario, horariosTrabalho]);



  const formatarData = (date) => {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const carregarResumo = async () => {
    const token = localStorage.getItem('loginToken');
    const ano = mesAtual.getFullYear();
    const mes = String(mesAtual.getMonth() + 1).padStart(2, '0');

    try {
      setLoading(true);
      const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/resumo-mensal?ano=${ano}&mes=${mes}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const dados = await res.json();
      const mapeado = {};
      dados.forEach(dia => {
        mapeado[dia.dia] = `${dia.horas}h${dia.minutos > 0 ? ` ${dia.minutos}min` : ''}`;
      });

      setResumo(mapeado);
    } catch (err) {
      console.error('Erro ao carregar resumo mensal:', err);
      alert('Erro ao carregar resumo mensal');
    } finally {
      setLoading(false);
    }
  };

  const carregarObras = async () => {
    const token = localStorage.getItem('loginToken');
    try {
      const res = await fetch(`https://backend.advir.pt/api/obra`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dados = await res.json();
      setObras(dados);
    } catch (err) {
      console.error('Erro ao carregar obras:', err);
    }
  };

  const carregarDetalhes = async (data) => {
    setDiaSelecionado(data);
    const faltasNoDia = faltas.filter(f => {
  const dataFalta = new Date(f.Data);
  return (
    dataFalta.getFullYear() === new Date(data).getFullYear() &&
    dataFalta.getMonth() === new Date(data).getMonth() &&
    dataFalta.getDate() === new Date(data).getDate()
  );
});
setFaltasDoDia(faltasNoDia);

    const token = localStorage.getItem('loginToken');
    try {
      setLoading(true);
      const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-dia?data=${data}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const dados = await res.json();
        setRegistosBrutos(dados);
        const ordenado = dados.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const temposPorObra = {};
        const estadoAtualPorObra = {};

        for (const registo of ordenado) {
          const obraId = registo.obra_id;
          const nomeObra = registo.Obra?.nome || 'Sem nome';
          const ts = new Date(registo.timestamp);

          if (!temposPorObra[obraId]) {
            temposPorObra[obraId] = { nome: nomeObra, totalMinutos: 0 };
          }

          if (registo.tipo === 'entrada') {
            estadoAtualPorObra[obraId] = ts;
          }

          if (registo.tipo === 'saida' && estadoAtualPorObra[obraId]) {
            const entradaTS = estadoAtualPorObra[obraId];
            const minutos = Math.max(0, (ts - entradaTS) / 60000);
            temposPorObra[obraId].totalMinutos += minutos;
            estadoAtualPorObra[obraId] = null;
          }
        }

        const detalhesPorObra = Object.values(temposPorObra).map(o => ({
          nome: o.nome,
          horas: Math.floor(o.totalMinutos / 60),
          minutos: Math.round(o.totalMinutos % 60)
        }));

        setDetalhes(detalhesPorObra);
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes do dia:', err);
    } finally {
      setLoading(false);
    }
  };

  const submeterPontoEsquecido = async (e) => {
    e.preventDefault();
    if (!novaEntrada.obra_id || !diaSelecionado) {
      alert('Selecione uma obra antes de submeter');
      return;
    }

    const token = localStorage.getItem('loginToken');
    try {
      setLoading(true);
      const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/registar-esquecido`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...novaEntrada,
          timestamp: `${diaSelecionado}T${novaEntrada.hora}:00`
        })
      });

      if (res.ok) {
        alert('Ponto registado para aprovação');
        carregarResumo();
        carregarDetalhes(diaSelecionado);
        setNovaEntrada({ tipo: 'entrada', obra_id: '', hora: '08:00', justificacao: '' });
      } else {
        alert('Erro ao registar ponto');
      }
    } catch (err) {
      console.error('Erro ao submeter ponto esquecido:', err);
      alert('Erro ao submeter ponto esquecido');
    } finally {
      setLoading(false);
    }
  };

  const gerarCalendario = () => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasDoMes = [];

    // Dias em branco no início
    const diaSemanaInicio = primeiroDia.getDay();
    for (let i = 0; i < diaSemanaInicio; i++) {
      diasDoMes.push(null);
    }

    // Dias do mês
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      diasDoMes.push(new Date(ano, mes, dia));
    }

    return diasDoMes;
  };

 const obterClasseDia = (date) => {
  if (!date) return '';
  
  const hoje = new Date();
  const dataFormatada = formatarData(date);
  const isHoje = formatarData(hoje) === dataFormatada;
  const isPassado = date < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const temRegisto = resumo[dataFormatada];
  const diaSemana = date.getDay();
  const isDiaUtil = diaSemana !== 0 && diaSemana !== 6;
  const isSelecionado = diaSelecionado === dataFormatada;

const existeFalta = Array.isArray(faltas) && faltas.some(f => {
  const dataFalta = new Date(f.Data);
  return (
    dataFalta.getFullYear() === date.getFullYear() &&
    dataFalta.getMonth() === date.getMonth() &&
    dataFalta.getDate() === date.getDate()
  );
});




  let classes = 'calendario-dia btn';

  if (isSelecionado) classes += ' btn-primary';
else if (existeFalta) classes += ' dia-falta';


  else if (isHoje) classes += ' btn-outline-primary';
else if (temRegisto) {
  const horasStr = resumo[dataFormatada]?.split('h')[0];
  const horasTrabalhadas = parseInt(horasStr, 10);

  if (horasTrabalhadas >= 8) {
    classes += ' btn-success';
  } else {
    classes += ' btn-menor-8h';
  }
}

  //else if (isPassado && isDiaUtil) classes += ' btn-warning';
  else classes += ' btn-outline-secondary';

  return classes;
};



  

useEffect(() => {
  const inicializarTudo = async () => {
  setLoading(true);
  try {
    await carregarResumo();
    await carregarObras();
    await carregarFaltasFuncionario();
    await carregarTiposFalta();
    await carregarHorarioFuncionario();
    await carregarHorariosTrabalho();
    await carregarTotalizadorFerias();


    const hoje = new Date();
    const dataFormatada = formatarData(hoje);
    setDiaSelecionado(dataFormatada);
    await carregarDetalhes(dataFormatada);
  } catch (err) {
    console.error('Erro ao carregar dados iniciais:', err);
  } finally {
    setLoading(false);
  }
};


  inicializarTudo();
}, [mesAtual]);




  const diasDoMes = gerarCalendario();

  return (
    <div className="container-fluid bg-light min-vh-100 py-2 py-md-4" style={{overflowX: 'hidden', background: 'linear-gradient(to bottom, #e3f2fd, #bbdefb, #90caf9)'}}>
      <style jsx>{`
        body {
          overflow-x: hidden;
        }
        .calendario-dia {
          width: 100%;
          height: 60px;
          margin: 1px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          border-radius: 8px !important;
          transition: all 0.3s ease;
          cursor: pointer;
        }
          .dia-falta {
  position: relative;
  background-image: repeating-linear-gradient(
    45deg,
    #dee2e6 0,
    #dee2e6 4px,
    #f8f9fa 4px,
    #f8f9fa 8px
  );
  color: #6c757d !important;
  border: 1px solid #ced4da;
}
  .btn-menor-8h {
  background-color: #fff3cd !important; /* amarelo claro */
  border: 1px solid #ffeeba;
  color: #856404;
}



        @media (min-width: 768px) {
          .calendario-dia {
            height: 80px;
            margin: 2px;
            font-size: 0.9rem;
          }
        }
        .calendario-dia:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .calendario-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          margin-top: 1rem;
        }
        @media (min-width: 768px) {
          .calendario-grid {
            gap: 4px;
          }
        }
        .horas-dia {
          font-size: 0.65rem;
          font-weight: bold;
          margin-top: 2px;
        }
        @media (min-width: 768px) {
          .horas-dia {
            font-size: 0.75rem;
          }
        }
        .card-moderno {
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          border: none;
          margin-bottom: 1rem;
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
        .legend-mobile {
          font-size: 0.75rem;
        }
        @media (min-width: 768px) {
          .legend-mobile {
            font-size: 0.875rem;
          }
        }
        .sidebar-sticky {
          position: sticky;
          top: 1rem;
          max-height: calc(100vh - 2rem);
          overflow-y: auto;
        }
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          z-index: 10;
        }
        .scroll-container {
          max-height: 100vh;
          overflow-y: auto;
          padding-right: 0;
        }
        @media (max-width: 991px) {
          .sidebar-sticky {
            position: static;
            max-height: none;
            overflow-y: visible;
          }
        }
        /* Custom scrollbar */
        .sidebar-sticky::-webkit-scrollbar {
          width: 6px;
        }
        .sidebar-sticky::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .sidebar-sticky::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .sidebar-sticky::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        /* Custom scrollbar for history */
        .custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        /* Smooth scroll behavior */
        html {
          scroll-behavior: smooth;
        }
        /* Mobile scroll improvements */
        @media (max-width: 767px) {
          .container-fluid {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
        }
      `}</style>

      <div className="row justify-content-center">
        <div className="col-12 col-xl-11">
          {/* Header */}
          <div className="card card-moderno mb-3 mb-md-4">
            <div className="card-body text-center py-3 py-md-4">
              <h1 className="h4 h3-md mb-2 text-primary">
                <FaCalendarCheck className="me-2 me-md-3" />
                <span className="d-none d-sm-inline">Calendário de Horas Trabalhadas</span>
                <span className="d-sm-none">Horas Trabalhadas</span>
              </h1>
              <p className="text-muted mb-0 small">Gerencie e visualize suas horas de trabalho</p>
            </div>
          </div>

          <div className="row g-3" style={{marginBottom: '50px'}} >
            {/* Calendário */}
            <div className="col-12 col-lg-8">
              <div className="card card-moderno position-relative">
                {loading && (
                  <div className="loading-overlay">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Carregando...</span>
                    </div>
                  </div>
                )}
                <div className="card-body p-3 p-md-4">
                  {/* Navegação do mês */}
                  <div className="d-flex justify-content-between align-items-center mb-3 mb-md-4">
                    <button 
                      className="btn btn-outline-primary btn-responsive rounded-pill"
                      onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1))}
                      disabled={loading}
                    >
                      <span className="d-none d-sm-inline">&#8592; Anterior</span>
                      <span className="d-sm-none">&#8592;</span>
                    </button>
                    <h4 className="mb-0 fw-bold text-center px-2" style={{fontSize: 'clamp(1rem, 4vw, 1.5rem)'}}>
                      <span className="d-none d-md-inline">
                        {mesAtual.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                      </span>
                      <span className="d-md-none">
                        {mesAtual.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}
                      </span>
                    </h4>
                    <button 
                      className="btn btn-outline-primary btn-responsive rounded-pill"
                      onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1))}
                      disabled={loading}
                    >
                      <span className="d-none d-sm-inline">Próximo &#8594;</span>
                      <span className="d-sm-none">&#8594;</span>
                    </button>
                  </div>

                  {/* Headers dos dias */}
                  <div className="calendario-grid mb-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, index) => (
                      <div key={dia} className="text-center fw-bold text-muted py-1 py-md-2" style={{fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)'}}>
                        <span className="d-none d-sm-inline">{dia}</span>
                        <span className="d-sm-none">{dia.substr(0, 1)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Grade do calendário */}
                  <div className="calendario-grid">
                    {diasDoMes.map((date, index) => (
                      <button
                        key={index}
                        className={date ? obterClasseDia(date) : 'invisible'}
                        onClick={() => date && carregarDetalhes(formatarData(date))}
                        disabled={!date}
                      >
                        {date && (
                          <>
                            <span>{date.getDate()}</span>
                            {resumo[formatarData(date)] && (
                              <span className="horas-dia">{resumo[formatarData(date)]}</span>
                            )}
                            {!resumo[formatarData(date)] && 
                             date < new Date() && 
                             date.getDay() !== 0 && 
                             date.getDay() !== 6 && (
                              <FaExclamationTriangle className="text-warning mt-1" size={12} />
                            )}
                          </>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Legenda */}
                  <div className="mt-3 mt-md-4">
                    <div className="row g-1 g-md-2 text-center legend-mobile">
                      <div className="col-12 col-sm-4">
                        <small className="text-muted d-flex align-items-center justify-content-center">
                          <span className="badge bg-success me-1 me-md-2">●</span>
                          <span className="d-none d-sm-inline">Horas registadas</span>
                          <span className="d-sm-none">Registado</span>
                        </small>
                      </div>
                      <div className="col-6 col-sm-4">
                        <small className="text-muted d-flex align-items-center justify-content-center">
                          <span className="badge bg-warning me-1 me-md-2">⚠</span>
                          <span className="d-none d-sm-inline">Sem registo</span>
                          <span className="d-sm-none">Falta</span>
                        </small>
                      </div>
                      <div className="col-6 col-sm-4">
                        <small className="text-muted d-flex align-items-center justify-content-center">
                          <span className="badge bg-primary me-1 me-md-2">●</span>
                          <span>Hoje</span>
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalhes do dia */}
            <div className="col-12 col-lg-4">
               


              {diaSelecionado ? (
                <div className="card card-moderno sidebar-sticky">
                    
                  <div className="card-body p-3 p-md-4">
                    {detalhesHorario && (
                <div className="mb-3">
  <h6 className="fw-bold text-muted mb-2">Horário Contratual & Férias</h6>
  <div className="row g-2">
    <div className="col-12 col-md-6">
      <div className="border-start border-info border-3 ps-3 small">
        <div><strong>Descrição:</strong> {detalhesHorario.Descricao}</div>
        <div><strong>Horas por dia:</strong> {detalhesHorario.Horas1}</div>
        <div><strong>Total Horas Semanais:</strong> {detalhesHorario.TotalHoras}</div>
      </div>
    </div>
    <div className="col-12 col-md-6">
      <div className="border-start border-success border-3 ps-3 small">
        <div><strong>Dias Direito:</strong> {feriasTotalizador.DiasDireito} dias</div>
        <div><strong>Dias Ano Anterior:</strong> {feriasTotalizador.DiasAnoAnterior} dias</div>
        <div><strong>Total Dias:</strong> {feriasTotalizador.TotalDias} dias</div>
        <div><strong>Dias Já Gozados:</strong> {feriasTotalizador.DiasJaGozados} dias</div>
        <div><strong>Total Por Gozar:</strong> {feriasTotalizador.DiasPorGozar} dias</div>
      </div>
    </div>
  </div>
</div>

                )}
                    <h5 className="card-title d-flex align-items-center mb-3 mb-md-4" style={{fontSize: 'clamp(1rem, 3vw, 1.25rem)'}}>
                      <FaClock className="text-primary me-2 flex-shrink-0" />
                      <span className="text-truncate">
                        <span className="d-none d-md-inline">
                          {new Date(diaSelecionado).toLocaleDateString('pt-PT', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </span>
                        <span className="d-md-none">
                          {new Date(diaSelecionado).toLocaleDateString('pt-PT', { 
                            day: 'numeric', 
                            month: 'short'
                          })}
                        </span>
                      </span>
                    </h5>

                    {/* Resumo do dia */}
                    {detalhes.length > 0 && (
                      <div className="mb-4">
                        
                        <h6 className="fw-bold text-muted mb-3">Resumo do Dia</h6>
                        {detalhes.map((entry, index) => (
                          <div key={index} className="border-start border-success border-3 ps-3 mb-3">
                            <div className="d-flex justify-content-between">
                              <span className="fw-semibold">🛠 {entry.nome}</span>
                              <span className="text-success fw-bold">
                                {entry.horas}h {entry.minutos > 0 ? `${entry.minutos}min` : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                        <hr />
                        <div className="d-flex justify-content-between">
                          <span className="fw-bold">Total:</span>
                          <span className="fw-bold text-primary">
                            {detalhes.reduce((acc, entry) => acc + entry.horas, 0)}h {' '}
                            {detalhes.reduce((acc, entry) => acc + entry.minutos, 0)}min
                          </span>
                        </div>
                      </div>
                    )}
                    {faltasDoDia.length > 0 && (
  <div className="mb-4">
    <h6 className="fw-bold text-danger mb-3">Faltas neste dia</h6>
    {faltasDoDia.map((f, idx) => (
      <div key={idx} className="border-start border-danger border-3 ps-3 mb-2">
        <div className="d-flex justify-content-between small">
          <span className="fw-semibold">🟥 Código:</span>
          <span>
{f.Falta} – {mapaFaltas[f.Falta] || 'Desconhecido'}



</span>

        </div>
        <div className="d-flex justify-content-between small">
          <span>Tipo:</span>
          <span>{f.Horas ? 'Por horas' : 'Dia inteiro'}</span>
        </div>
        <div className="d-flex justify-content-between small">
          <span>Duração:</span> 
          <span>{f.Tempo} {f.Horas ? 'h' : 'dia(s)'}</span>
        </div>


        
        <div className="mt-1 text-end">
      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() => {
          setNovaFalta({
            Falta: f.Falta,
            Horas: f.Horas,
            Tempo: f.Tempo,
            Observacoes: f.Observacoes || '',
          });
          setModoEdicaoFalta(true);
          setFaltaOriginal({
            Funcionario: f.Funcionario,
            Data: f.Data,
            Falta: f.Falta,
          });
          setMostrarFormularioFalta(true);
        }}
      >
        📝 Editar
      </button>
    </div>
      </div>
      
    ))}

  </div>
)}


                    {/* Formulário */}
                    <div className="mb-3">
  <button
    className="btn btn-outline-primary w-100 rounded-pill btn-responsive mb-2"
    onClick={() => setMostrarFormulario(prev => !prev)}
    type="button"
  >
    {mostrarFormulario ? '- Recolher Registo' : '+ Registar Ponto Esquecido'}
  </button>

  {mostrarFormulario && (
    <div className="border border-primary rounded p-3 mt-2" style={{ backgroundColor: '#f8f9ff' }}>
      <h6 className="text-primary fw-bold mb-3" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
        <FaPlus className="me-2" />
        <span className="d-none d-sm-inline">Novo Registo Manual</span>
        <span className="d-sm-none">Novo Registo</span>
      </h6>

      <form onSubmit={submeterPontoEsquecido}>
        <div className="mb-3">
          <label className="form-label fw-semibold small">Obra</label>
          <select
            className="form-select form-moderno"
            value={novaEntrada.obra_id}
            onChange={(e) => setNovaEntrada({ ...novaEntrada, obra_id: e.target.value })}
            required
          >
            <option value="">Selecione uma obra...</option>
            {obras.map(obra => (
              <option key={obra.id} value={obra.id}>{obra.nome}</option>
            ))}
          </select>
        </div>

        <div className="row g-2 mb-3">
          <div className="col-6">
            <label className="form-label fw-semibold small">Tipo</label>
            <select
              className="form-select form-moderno"
              value={novaEntrada.tipo}
              onChange={(e) => setNovaEntrada({ ...novaEntrada, tipo: e.target.value })}
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>
          <div className="col-6">
            <label className="form-label fw-semibold small">Hora</label>
            <input
              type="time"
              className="form-control form-moderno"
              value={novaEntrada.hora}
              onChange={(e) => setNovaEntrada({ ...novaEntrada, hora: e.target.value })}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold small">Justificação</label>
          <textarea
            className="form-control form-moderno"
            rows="2"
            placeholder="Motivo do registo manual..."
            value={novaEntrada.justificacao}
            onChange={(e) => setNovaEntrada({ ...novaEntrada, justificacao: e.target.value })}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100 rounded-pill btn-responsive"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Registando...
            </>
          ) : (
            <>
              <FaCheckCircle className="me-2" />
              <span className="d-none d-sm-inline">Submeter Registo</span>
              <span className="d-sm-none">Submeter</span>
            </>
          )}
        </button>
      </form>
    </div>
  )}
</div>



 <button
    className="btn btn-outline-primary w-100 rounded-pill btn-responsive mb-2"
    onClick={() => setMostrarFormularioFalta(prev => !prev)}
    type="button"
  >
    {mostrarFormularioFalta ? '- Recolher Falta' : '+ Registar Falta'}
  </button>

{mostrarFormularioFalta && (
<div className="border border-danger rounded p-3 mt-4" style={{ backgroundColor: '#fff5f5' }}>
  <h6 className="text-danger fw-bold mb-3">
    <FaPlus className="me-2" />
    <span className="d-none d-sm-inline">Registar Falta</span>
    <span className="d-sm-none">Falta</span>
  </h6>

  <form onSubmit={submeterFalta}>
    <div className="mb-3">
      <label className="form-label small fw-semibold">Tipo de Falta</label>
      <select
        className="form-select form-moderno"
        value={novaFalta.Falta}
        onChange={(e) => setNovaFalta({ ...novaFalta, Falta: e.target.value })}
        required
      >
        <option value="">Selecione o tipo...</option>
        {tiposFalta.map((t, i) => (
          <option key={i} value={t.Falta}>
            {t.Falta} – {t.Descricao}
          </option>
        ))}
      </select>
    </div>

    <div className="row g-2 mb-3">
      <div className="col-6">
        <label className="form-label small fw-semibold">Duração</label>
        <input
          type="number"
          className="form-control form-moderno"
          min="1"
          value={novaFalta.Tempo}
          onChange={(e) => setNovaFalta({ ...novaFalta, Tempo: parseInt(e.target.value) })}
          required
        />
      </div>
      <div className="col-6">
        <label className="form-label small fw-semibold">Por horas?</label>
        <select
          className="form-select form-moderno"
          value={novaFalta.Horas ? "1" : "0"}
          onChange={(e) => setNovaFalta({ ...novaFalta, Horas: e.target.value === "1" })}
        >
          <option value="0">Dia completo</option>
          <option value="1">Por horas</option>
        </select>
      </div>
    </div>

    <div className="mb-3">
      <label className="form-label small fw-semibold">Observações</label>
      <textarea
        className="form-control form-moderno"
        rows="2"
        value={novaFalta.Observacoes}
        onChange={(e) => setNovaFalta({ ...novaFalta, Observacoes: e.target.value })}
      />
    </div>

    <button
  type="submit"
  className={`btn ${modoEdicaoFalta ? "btn-warning" : "btn-danger"} w-100 rounded-pill btn-responsive`}
  disabled={loading}
>
  {loading
    ? modoEdicaoFalta ? "A editar..." : "A registar..."
    : modoEdicaoFalta ? "Guardar Alterações" : "Registar Falta"}
</button>
{modoEdicaoFalta && (
  <button
    type="button"
    className="btn btn-outline-secondary w-100 rounded-pill btn-responsive mt-2"
    onClick={() => {
      setNovaFalta({ Falta: '', Horas: false, Tempo: 1, Observacoes: '' });
      setModoEdicaoFalta(false);
      setFaltaOriginal(null);
    }}
  >
    Cancelar Edição
  </button>
)}


  </form>
</div>
)}





<button
    className="btn btn-outline-primary w-100 rounded-pill btn-responsive mb-2"
    onClick={() => setMostrarFormularioFerias(prev => !prev)}
    type="button"
  >
    {MostrarFormularioFerias ? '- Recolher Férias' : '+ Registar Férias'}
  </button>

{MostrarFormularioFerias && (
<div className="border border-danger rounded p-3 mt-4" style={{ backgroundColor: '#fff5f5' }}>
  <h6 className="text-danger fw-bold mb-3">
    <FaPlus className="me-2" />
    <span className="d-none d-sm-inline">Registar Férias</span>
    <span className="d-sm-none">Férias</span>
  </h6>

  <form onSubmit={submeterFerias}>

   

    <div className="row g-2 mb-3">
  <div className="col-6">
    <label className="form-label small fw-semibold">Data Início</label>
    <input
      type="date"
      className="form-control form-moderno"
      value={novaFaltaFerias.dataInicio}
      onChange={(e) => setNovaFaltaFerias({ ...novaFaltaFerias, dataInicio: e.target.value })}
      required
    />
  </div>
  <div className="col-6">
    <label className="form-label small fw-semibold">Data Fim</label>
    <input
      type="date"
      className="form-control form-moderno"
      value={novaFaltaFerias.dataFim}
      onChange={(e) => setNovaFaltaFerias({ ...novaFaltaFerias, dataFim: e.target.value })}
      required
    />
  </div>
</div>


    <div className="mb-3">
      <label className="form-label small fw-semibold">Observações</label>
      <textarea
        className="form-control form-moderno"
        rows="2"
        value={novaFalta.Observacoes}
        onChange={(e) => setNovaFalta({ ...novaFalta, Observacoes: e.target.value })}
      />
    </div>

    <button
  type="submit"
  className={`btn ${modoEdicaoFerias ? "btn-warning" : "btn-danger"} w-100 rounded-pill btn-responsive`}
  disabled={loading}
>
  {loading
    ? modoEdicaoFerias ? "A editar..." : "A registar..."
    : modoEdicaoFerias ? "Guardar Alterações" : "Registar Férias"}
</button>
{modoEdicaoFerias && (
  <button
    type="button"
    className="btn btn-outline-secondary w-100 rounded-pill btn-responsive mt-2"
    onClick={() => {
      setNovaFalta({ Falta: '', Horas: false, Tempo: 1, Observacoes: '' });
      setModoEdicaoFerias(false);
      setFaltaOriginal(null);
    }}
  >
    Cancelar Edição
  </button>
)}


  </form>
</div>
)}










































                    {/* Histórico */}
                    {registosBrutos.length > 0 && (
                      <div>
                        <h6 className="fw-bold text-muted mb-3" style={{fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'}}>
                          <span className="d-none d-sm-inline">Histórico de Submissões</span>
                          <span className="d-sm-none">Histórico</span>
                        </h6>
                        <div style={{maxHeight: '250px', overflowY: 'auto'}} className="custom-scroll">
                          {registosBrutos.map((submission) => (
                            <div key={submission.id} className="border rounded p-2 mb-2 bg-light">
                              <div className="d-flex justify-content-between align-items-start mb-1">
                                <div className="flex-grow-1 me-2">
                                  <span className="fw-semibold small">{submission.tipo}</span>
                                  <small className="text-muted ms-1 d-block d-sm-inline">
                                    {new Date(submission.timestamp).toLocaleTimeString('pt-PT', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </small>
                                </div>
                                <span className={`badge ${
                                  submission.is_confirmed ? 'bg-success' : 'bg-warning'
                                } flex-shrink-0`} style={{fontSize: '0.7rem'}}>
                                  <span className="d-none d-sm-inline">
                                    {submission.is_confirmed ? 'Confirmado' : 'Pendente'}
                                  </span>
                                  <span className="d-sm-none">
                                    {submission.is_confirmed ? '✓' : '⏳'}
                                  </span>
                                </span>
                              </div>
                              <small className="text-muted d-block text-truncate">
                                {submission.Obra?.nome || submission.obra_id}
                              </small>
                              {submission.justificacao && (
                                <small className="text-muted d-block text-truncate">
                                  {submission.justificacao}
                                </small>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                    )}
                  </div>
                </div>
              ) : (
                <div className="card card-moderno">
                  <div className="card-body text-center py-5">
                    <FaCalendarCheck className="text-muted mb-3" size={48} />
                    <h6 className="text-muted">Selecione um dia no calendário</h6>
                    <p className="text-muted small mb-0">Clique em qualquer dia para ver detalhes e registar pontos</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarioHorasTrabalho;