import React, { useEffect, useState } from 'react';

const AprovacaoFaltaFerias = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('loginToken');
  const painelToken = localStorage.getItem('painelAdminToken');
  const urlempresa = localStorage.getItem('urlempresa');
  const userNome = localStorage.getItem('userNome');

  const carregarPedidos = async () => {
    try {
      const res = await fetch('https://backend.advir.pt/api/faltas-ferias/aprovacao/pendentes', {
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
    carregarPedidos();
  }, []);

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

      if (res.ok) {
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
          const { dataInicio, dataFim, funcionario, horas, tempo, justificacao } = pedido;
          const inicio = new Date(dataInicio);
          const fim = new Date(dataFim);

          for (let dataAtual = new Date(inicio); dataAtual <= new Date(fim); dataAtual.setDate(dataAtual.getDate() + 1)) {
            const diaSemana = dataAtual.getDay();
            if (diaSemana === 0 || diaSemana === 6) continue;

            const dataFormatada = dataAtual.toISOString().split('T')[0];
            const faltasParaCriar = horas ? ['F40'] : ['F50', 'F40'];

            for (const faltaCod of faltasParaCriar) {
              await fetch(`https://webapiprimavera.advir.pt/routesFaltas/InserirFalta`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${painelToken}`,
                  urlempresa
                },
                body: JSON.stringify({
                  Funcionario: funcionario,
                  Data: dataFormatada,
                  Falta: faltaCod,
                  Horas: horas,
                  Tempo: tempo,
                  DescontaVenc: 0,
                  DescontaRem: 0,
                  ExcluiProc: 0,
                  ExcluiEstat: 0,
                  Observacoes: justificacao,
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
                })
              });
            }

            await fetch(`https://webapiprimavera.advir.pt/routesFaltas/InserirFeriasFuncionario`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${painelToken}`,
                urlempresa
              },
              body: JSON.stringify({
                Funcionario: funcionario,
                DataFeria: dataFormatada,
                EstadoGozo: 0,
                OriginouFalta: 1,
                TipoMarcacao: 1,
                OriginouFaltaSubAlim: 1,
                Duracao: tempo,
                Acerto: 0,
                NumProc: null,
                Origem: 0
              })
            });
          }
        }

        alert('Pedido aprovado e registado.');
        carregarPedidos();
      } else {
        alert('Erro ao aprovar.');
      }
    } catch (err) {
      console.error('Erro ao aprovar:', err);
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
    <div>
      <h2>Pedidos Pendentes</h2>
      {pedidos.length === 0 ? (
        <p>Sem pedidos pendentes.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Funcionário</th>
              <th>Tipo</th>
              <th>Data Pedido</th>
              <th>Falta</th>
              <th>Horas</th>
              <th>Tempo</th>
              <th>Justificação</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
  {pedidos.map((pedido) => (
    <tr key={pedido.id}>
      <td>{pedido.id}</td>
      <td>{pedido.funcionario}</td>
      <td>{pedido.tipoPedido}</td>
      <td>{formatarData(pedido.dataPedido)}</td>

      {pedido.tipoPedido === 'FALTA' ? (
        <>
          <td>{pedido.falta}</td>
          <td>{pedido.horas ? 'Sim' : 'Não'}</td>
          <td>{pedido.tempo || '-'}</td>
        </>
      ) : (
        <>
          <td>{formatarData(pedido.dataInicio)}</td>
          <td>{formatarData(pedido.dataFim)}</td>
          <td>{pedido.duracao || '-'}</td>
        </>
      )}

      <td>{pedido.justificacao || '-'}</td>
      <td>{pedido.estadoAprovacao}</td>
      <td>
        <button onClick={() => confirmarPedido(pedido)}>Aprovar</button>
        <button onClick={() => rejeitarPedido(pedido.id)} style={{ marginLeft: '10px' }}>
          Rejeitar
        </button>
      </td>
    </tr>
  ))}
</tbody>

        </table>
      )}
    </div>
  );
};

export default AprovacaoFaltaFerias;
