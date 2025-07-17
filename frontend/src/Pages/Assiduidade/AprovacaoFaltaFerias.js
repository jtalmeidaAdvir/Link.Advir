import React, { useEffect, useState } from 'react';

const AprovacaoFaltaFerias = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [estadoFiltro, setEstadoFiltro] = useState('pendentes');



  const token = localStorage.getItem('loginToken');
  const painelToken = localStorage.getItem('painelAdminToken');
  const urlempresa = localStorage.getItem('urlempresa');
  const userNome = localStorage.getItem('userNome');

const carregarPedidos = async (estado = 'pendentes') => {
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
      setPedidos(data);
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
    return new Date(data).toLocaleDateString();
  };


useEffect(() => {
  carregarPedidos(estadoFiltro);
}, [estadoFiltro]);


  const confirmarPedido = async (pedido) => {
    const confirmarN1 = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/${pedido.id}/confirmar-nivel1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        urlempresa
      },
      body: JSON.stringify({ confirmadoPor1: userNome })
    });

    if (!confirmarN1.ok) {
      alert('Erro ao confirmar nível 1');
      return;
    }

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
      alert('Erro ao confirmar nível 2');
      return;
    }

    aprovarPedido(pedido);
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
        Data: pedido.dataPedido,
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

    alert('Pedido aprovado e registado.');
    carregarPedidos();

  } catch (err) {
    console.error('Erro ao aprovar:', err);
    alert('Erro inesperado.');
  }
};


































  const rejeitarPedido = async (id) => {
    try {
      const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/${id}/rejeitar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        },
        body: JSON.stringify({ observacoesResposta: 'Rejeitado por'+userNome+'.' })
      });

      if (res.ok) {
        alert('Pedido rejeitado.');
        carregarPedidos();
      } else {
        alert('Erro ao rejeitar.');
      }
    } catch (err) {
      console.error('Erro ao rejeitar:', err);
    }
  };

  if (loading) return <p>A carregar pedidos...</p>;


return (
  <div className="container py-4">
    {/* HEADER */}
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
      <div>
        <h3 className="fw-bold mb-1">📋 Pedidos de Aprovação</h3>
        <p className="text-muted mb-0 small">Gerir faltas e férias dos colaboradores</p>
      </div>

      <div className="d-flex gap-2 mt-3 mt-md-0">
        <select
          className="form-select form-select-sm"
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
        >
          <option value="pendentes">Pendentes</option>
          <option value="aprovados">Aprovados</option>
          <option value="rejeitados">Rejeitados</option>
        </select>
        <button onClick={() => carregarPedidos(estadoFiltro)} className="btn btn-outline-secondary btn-sm">
          🔄 Atualizar
        </button>
      </div>
    </div>

    {/* RESUMO */}
    <div className="row g-3 mb-4">
      <div className="col-6 col-md-3">
        <div className="card text-center border-0 shadow-sm">
          <div className="card-body">
            <div className="text-warning fs-4">🕒</div>
            <h5 className="fw-bold mb-0">{pedidos.filter(p => p.estadoAprovacao === 'Pendente').length}</h5>
            <small className="text-muted">Pendentes</small>
          </div>
        </div>
      </div>
      <div className="col-6 col-md-3">
        <div className="card text-center border-0 shadow-sm">
          <div className="card-body">
            <div className="text-success fs-4">✅</div>
            <h5 className="fw-bold mb-0">{pedidos.filter(p => p.estadoAprovacao === 'Aprovado').length}</h5>
            <small className="text-muted">Aprovados</small>
          </div>
        </div>
      </div>
      <div className="col-6 col-md-3">
        <div className="card text-center border-0 shadow-sm">
          <div className="card-body">
            <div className="text-danger fs-4">❌</div>
            <h5 className="fw-bold mb-0">{pedidos.filter(p => p.estadoAprovacao === 'Rejeitado').length}</h5>
            <small className="text-muted">Rejeitados</small>
          </div>
        </div>
      </div>
      <div className="col-6 col-md-3">
        <div className="card text-center border-0 shadow-sm">
          <div className="card-body">
            <div className="text-primary fs-4">📅</div>
            <h5 className="fw-bold mb-0">{pedidos.length}</h5>
            <small className="text-muted">Este Mês</small>
          </div>
        </div>
      </div>
    </div>

    {/* PEDIDOS */}
    <div className="row g-3">
      {pedidos.length === 0 ? (
        <p className="text-muted">Sem pedidos encontrados.</p>
      ) : (
        pedidos.map((pedido) => {
          const aprovado = pedido.estadoAprovacao === 'Aprovado';
          const rejeitado = pedido.estadoAprovacao === 'Rejeitado';
          const pendente = pedido.estadoAprovacao === 'Pendente';
          const bgCard = aprovado ? 'border-success' : rejeitado ? 'border-danger' : 'border-warning';

          return (
            <div key={pedido.id} className="col-12 col-md-6 col-xl-4">
              <div className={`card h-100 border-start ${bgCard} border-4 shadow-sm`}>
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge bg-secondary fw-bold">#{pedido.id}</span>
                    <span className={`badge ${pedido.tipoPedido === 'FALTA' ? 'bg-danger' : 'bg-primary'}`}>
                      {pedido.tipoPedido}
                    </span>
                  </div>

                  <h6 className="mb-0">{pedido.nomeFuncionario || pedido.funcionario}</h6>
                  <small className="text-muted mb-2">{pedido.cargo || 'Colaborador'}</small>

                  <div className="mb-2 small">
                    {pedido.tipoPedido === 'FALTA' ? (
                      <>
                        <div><strong>Data:</strong> {formatarData(pedido.dataPedido)}</div>
                        <div><strong>Tipo:</strong> {pedido.falta}</div>
                        <div><strong>Horas:</strong> {pedido.horas ? 'Sim' : 'Não'}</div>
                        <div><strong>Tempo:</strong> {pedido.tempo || 0}h</div>
                      </>
                    ) : (
                      <>
                        <div><strong>Início:</strong> {formatarData(pedido.dataInicio)}</div>
                        <div><strong>Fim:</strong> {formatarData(pedido.dataFim)}</div>
                        <div><strong>Duração:</strong> {pedido.duracao || '-'} dias</div>
                      </>
                    )}
                  </div>

                  {pedido.justificacao && (
                    <div className="mb-2 small">
                      <strong>Justificação:</strong>
                      <div className="bg-light rounded p-2 mt-1">{pedido.justificacao}</div>
                    </div>
                  )}

                  {aprovado ? (
                    <div className="alert alert-success p-2 small mt-auto">
                      <strong>Aprovado</strong><br />
                      Por: {pedido.aprovadoPor || 'Admin'}
                    </div>
                  ) : rejeitado ? (
                    <div className="alert alert-danger p-2 small mt-auto">
                      <strong>Rejeitado</strong><br />
                      Por: {pedido.aprovadoPor || 'Admin'}
                    </div>
                  ) : (
                    <div className="d-flex justify-content-between mt-auto">
                      <button
                        className="btn btn-success btn-sm w-50 me-2 rounded-pill"
                        onClick={() => confirmarPedido(pedido)}
                      >
                        ✔ Aprovar
                      </button>
                      <button
                        className="btn btn-danger btn-sm w-50 rounded-pill"
                        onClick={() => rejeitarPedido(pedido.id)}
                      >
                        ✖ Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
);


};

export default AprovacaoFaltaFerias;
