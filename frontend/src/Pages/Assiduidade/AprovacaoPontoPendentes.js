import React, { useEffect, useState } from 'react';
import { FaClock, FaCheckCircle, FaTimesCircle, FaSync, FaUser } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';

const AprovacaoPontoPendentes = () => {
  const [registos, setRegistos] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('loginToken');
  const urlempresa = localStorage.getItem('urlempresa');

  const carregarRegistos = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://backend.advir.pt/api/registo-ponto-obra/pendentes', {
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
      await fetch(`https://backend.advir.pt/api/registo-ponto-obra/confirmar/${id}`, {
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
      await fetch(`https://backend.advir.pt/api/registo-ponto-obra/cancelar/${id}`, {
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
<div className="container-fluid pagina-aprovacao-ponto min-vh-100 py-3 px-2 px-md-4" style={{ background: 'linear-gradient(to bottom, #e3f2fd, #bbdefb, #90caf9)', overflowX: 'hidden' }}>

    <style>{`
      .card-moderno {
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        transition: all 0.3s ease-in-out;
      }
      .card-moderno:hover {
        transform: translateY(-3px);
      }
      .btn-responsive {
        font-size: 0.875rem;
        padding: 0.5rem 1rem;
        width: 100%;
      }
      @media (min-width: 768px) {
        .btn-responsive {
          width: auto;
        }
      }
      .registo-card {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .justificacao-box {
        background: #f8f9fa;
        border-radius: 0.5rem;
        padding: 0.5rem;
        font-size: 0.85rem;
      }
      .scroll-area {
        max-height: calc(100vh - 160px);
        overflow-y: auto;
        padding-bottom: 80px;
      }
        body {
  overflow-x: hidden !important;
}

html {
  overflow-x: hidden;
}

.row {
  margin-right: 0 !important;
  margin-left: 0 !important;
}

    `}</style>

    <div className="text-center mb-3">
      <h4 className="text-primary">
        <FaClock className="me-2" />
        Registos de Ponto Pendentes
      </h4>
      <p className="text-muted small mb-0">Confirma os registos feitos pelos colaboradores nas obras</p>
    </div>

    <div className="d-flex justify-content-end mb-3">
      <button className="btn btn-outline-primary btn-responsive" onClick={carregarRegistos} disabled={loading}>
        <FaSync className={loading ? 'fa-spin' : ''} /> Atualizar
      </button>
    </div>

    <div className="scroll-area">
      <div className="row g-3">
        {registos.length === 0 ? (
          <div className="col-12">
            <div className="card card-moderno text-center py-5">
              <FaUser className="text-muted mb-3" size={48} />
              <p className="text-muted mb-0">Sem registos pendentes.</p>
            </div>
          </div>
        ) : (
          registos.map(r => (
            <div key={r.id} className="col-12 col-md-6 col-xl-4">
              <div className="card card-moderno registo-card p-3">
                <h6 className="fw-bold text-primary mb-1">{r.User?.nome || 'Utilizador Desconhecido'}</h6>
                <p className="mb-1"><strong>Tipo:</strong> {r.tipo.toUpperCase()}</p>
                <p className="mb-1"><strong>Obra:</strong> {r.Obra?.nome}</p>
                <p className="mb-1"><strong>Hora:</strong> {new Date(r.timestamp).toLocaleString('pt-PT')}</p>
                {r.justificacao && (
                  <div className="justificacao-box mt-2">
                    <strong>Justificação:</strong><br />
                    {r.justificacao}
                  </div>
                )}
                <div className="mt-auto pt-3 d-flex gap-2">
                  <button className="btn btn-success btn-sm btn-responsive" onClick={() => confirmar(r.id)}>
                    <FaCheckCircle className="me-1" /> Confirmar
                  </button>
                  <button className="btn btn-danger btn-sm btn-responsive" onClick={() => cancelar(r.id)}>
                    <FaTimesCircle className="me-1" /> Cancelar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);

};

export default AprovacaoPontoPendentes;
