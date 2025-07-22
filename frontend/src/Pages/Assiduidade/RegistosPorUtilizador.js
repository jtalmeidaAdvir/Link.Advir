import React, { useState, useEffect } from 'react';

const RegistosPorUtilizador = () => {
  const [utilizadores, setUtilizadores] = useState([]);
  const [userSelecionado, setUserSelecionado] = useState('');
  const [nomeSelecionado, setNomeSelecionado] = useState('');
  const [obras, setObras] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [registos, setRegistos] = useState([]);
  const [agrupadoPorDia, setAgrupadoPorDia] = useState({});
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('loginToken');
  const urlempresa = localStorage.getItem('urlempresa');

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
    console.log('Utilizadores recebidos:', data);
    if (Array.isArray(data)) {
      setUtilizadores(data);
    } else {
      console.error('Resposta inesperada:', data);
      setUtilizadores([]);
    }
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
      setObras(data);
    } catch (err) {
      console.error('Erro ao carregar obras:', err);
    }
  };

  const carregarRegistos = async () => {
    if (!userSelecionado || !obraSelecionada) return;
    setLoading(true);
    try {
      const dataFiltro = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-01`;

      const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-e-dia?user_id=${userSelecionado}&data=${dataFiltro}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const filtrados = data.filter(r => r.obra_id === parseInt(obraSelecionada));

      const agrupados = {};
      filtrados.forEach(reg => {
        const dia = new Date(reg.timestamp).toISOString().split('T')[0];
        if (!agrupados[dia]) agrupados[dia] = [];
        agrupados[dia].push(reg);
      });

      setRegistos(filtrados);
      setAgrupadoPorDia(agrupados);
    } catch (err) {
      console.error('Erro ao carregar registos:', err);
    } finally {
      setLoading(false);
    }
  };

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
        <option value="">-- Seleciona --</option>
        {obras.map(o => (
          <option key={o.id} value={o.id}>{o.nome}</option>
        ))}
      </select>

      {/* Filtros de mês e ano */}
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
              <ul>
                {eventos
                  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                  .map((e, i) => (
                    <li key={i}>
                      [{new Date(e.timestamp).toLocaleTimeString('pt-PT')}] {e.tipo}
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
