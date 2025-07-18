import React, { useEffect, useState } from 'react';
import { FaClock, FaCheckCircle, FaTimesCircle, FaSync } from 'react-icons/fa';

const AprovacaoPontoPendentes = () => {
  const [registos, setRegistos] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('loginToken');
  const urlempresa = localStorage.getItem('urlempresa');

  const carregarRegistos = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://backend.advir.pt/api/registopontoobra/pendentes', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        }
      });
      const data = await res.json();
      setRegistos(data);
    } catch (err) {
      console.error('Erro ao carregar registos:', err);
    } finally {
      setLoading(false);
    }
  };

  const confirmar = async (id) => {
    try {
      await fetch(`https://backend.advir.pt/api/registopontoobra/confirmar/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        }
      });
      carregarRegistos();
    } catch (err) {
      console.error('Erro ao confirmar:', err);
    }
  };

  const cancelar = async (id) => {
    if (!window.confirm('Tens a certeza que queres cancelar este registo?')) return;

    try {
      await fetch(`https://backend.advir.pt/api/registopontoobra/cancelar/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          urlempresa
        }
      });
      carregarRegistos();
    } catch (err) {
      console.error('Erro ao cancelar:', err);
    }
  };

  useEffect(() => {
    carregarRegistos();
  }, []);

  return (
    <div className="container mt-4">
      <h3><FaClock className="me-2" />Registos de Ponto Pendentes</h3>
      <button className="btn btn-outline-primary my-3" onClick={carregarRegistos} disabled={loading}>
        <FaSync className={loading ? 'fa-spin' : ''} /> Atualizar
      </button>

      {registos.length === 0 ? (
        <p className="text-muted">Sem registos pendentes.</p>
      ) : (
        <div className="list-group">
          {registos.map(r => (
            <div key={r.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>{r.User?.nome || 'Utilizador'}</strong> — {r.tipo.toUpperCase()} na obra <strong>{r.Obra?.nome}</strong> <br />
                <small>{new Date(r.timestamp).toLocaleString('pt-PT')}</small>
              </div>
              <div>
                <button className="btn btn-success btn-sm me-2" onClick={() => confirmar(r.id)}>
                  <FaCheckCircle /> Confirmar
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => cancelar(r.id)}>
                  <FaTimesCircle /> Cancelar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AprovacaoPontoPendentes;
