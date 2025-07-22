import React, { useState, useEffect } from 'react';

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

  const token = localStorage.getItem('loginToken');

  const obterEndereco = async (lat, lon) => {
  const chave = `${lat},${lon}`;

  // Já temos esta localização?
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


  return (
    <div style={{ padding: 20 }}>
      <h2>Registos de Ponto por Utilizador</h2>

      {/* Seleção de Utilizador */}
      <label>Selecionar Utilizador:</label>
      <select value={userSelecionado} onChange={(e) => {
        const userId = e.target.value;
        const nome = utilizadores.find(u => u.id == userId)?.nome || '';
        setUserSelecionado(userId);
        setNomeSelecionado(nome);
      }}>
        <option value="">-- Seleciona --</option>
        {utilizadores.map(u => (
          <option key={u.id} value={u.id}>{u.email}</option>
        ))}
      </select>

      {/* Seleção de Obra */}
      <label>Selecionar Obra:</label>
      <select value={obraSelecionada} onChange={e => setObraSelecionada(e.target.value)}>
        <option value="">-- Todas --</option>
        {obras.map(o => (
          <option key={o.id} value={o.id}>{o.nome}</option>
        ))}
      </select>

      {/* Filtro por Data específica */}
      <label>Data específica (opcional):</label>
      <input type="date" value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)} />

      <p style={{ fontStyle: 'italic' }}>Ou, em alternativa:</p>

      {/* Filtros por mês e ano */}
      <label>Mês:</label>
      <input type="number" min="1" max="12" value={mesSelecionado} onChange={e => setMesSelecionado(e.target.value)} />

      <label>Ano:</label>
      <input type="number" min="2020" value={anoSelecionado} onChange={e => setAnoSelecionado(e.target.value)} />

      <br /><br />
      <button onClick={carregarRegistos}>Carregar Registos</button>

      {loading && <p>A carregar registos...</p>}

      {!loading && Object.entries(agrupadoPorDia).length > 0 && (
        <>
          <h3>Registos de {nomeSelecionado}</h3>
          {Object.entries(agrupadoPorDia).map(([dia, eventos]) => (
            <div key={dia} style={{ marginTop: 20, border: '1px solid #ccc', padding: 10, borderRadius: 8 }}>
              <h4>{new Date(dia).toLocaleDateString('pt-PT')}</h4>
             <ul style={{ listStyleType: 'none', padding: 0 }}>
                {eventos
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                    .map((e, i) => (
                    <li key={i} style={{ 
                        background: '#f9f9f9', 
                        marginBottom: '10px', 
                        padding: '10px', 
                        border: '1px solid #ccc', 
                        borderRadius: '6px' 
                    }}>
                        <strong>{e.tipo.toUpperCase()}</strong> - {new Date(e.timestamp).toLocaleTimeString('pt-PT')}
                        <br />
                        <span><strong>Obra:</strong> {e.Obra?.nome || 'N/A'}</span><br />
                        <span><strong>Confirmado:</strong> {e.is_confirmed ? '✅ Sim' : '❌ Não'}</span><br />
                        {e.justificacao && <span><strong>Justificação:</strong> {e.justificacao}</span>}<br />
                        {e.latitude && e.longitude && (
                            <span>
                                <strong>Localização:</strong>{' '}
                                {enderecos[`${e.latitude},${e.longitude}`] || 'A obter...'}
                            </span>
                            )}

                    </li>
                    ))}
                </ul>

            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default RegistosPorUtilizador;
