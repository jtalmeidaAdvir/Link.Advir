import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { 
  FaQrcode, 
  FaClock, 
  FaMapMarkerAlt, 
  FaPlay, 
  FaStop, 
  FaCheckCircle,
  FaExclamationCircle,
  FaCamera,
  FaUsers
} from 'react-icons/fa';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import NotificacaoCombinada from './components/NotificacaoCombinada';
import Select from 'react-select';


const RegistoPontoObra = (props) => {
  const scannerRef = useRef(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [registos, setRegistos] = useState([]);
  const [obras, setObras] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState('');
  const [loading, setLoading] = useState(false);
  const [registosEquipa, setRegistosEquipa] = useState([]);
  const opcoesObras = obras.map(obra => ({
  value: obra.id,
  label: obra.nome
}));

  const tipoUser = localStorage.getItem('tipoUser');
const tipoUserNormalizado = (tipoUser || '').trim().toLowerCase();
const tiposPermitidos = ['administrador', 'encarregado', 'diretor'];
  // Estado para equipas e membros
  const [minhasEquipas, setMinhasEquipas] = useState([]);
  const [membrosSelecionados, setMembrosSelecionados] = useState([]);

  const [mostrarManual, setMostrarManual] = useState(false);
  const [mostrarEquipa, setMostrarEquipa] = useState(false);



  // Usa timestamp || createdAt para ser robusto
const dataRegisto = (r) => new Date(r.timestamp || r.createdAt);

const temSaidaPosterior = (entrada, lista) =>
  lista.some(s =>
    s.tipo === 'saida' &&
    String(s.obra_id) == String(entrada.obra_id) &&
    dataRegisto(s) > dataRegisto(entrada)
  );

const getEntradaAtivaPorObra = (obraId, lista) =>
  lista
    .filter(r => r.tipo === 'entrada' && String(r.obra_id) == String(obraId))
    .sort((a, b) => dataRegisto(b) - dataRegisto(a))
    .find(e => !temSaidaPosterior(e, lista));

const getUltimaEntradaAtiva = (lista) =>
  lista
    .filter(r => r.tipo === 'entrada')
    .sort((a, b) => dataRegisto(b) - dataRegisto(a))
    .find(e => !temSaidaPosterior(e, lista));



    const processarPorQR = async (obraId, nomeObra) => {
  // 1) Se já houver entrada ativa na MESMA obra → fazer SAÍDA
  const ativaMesmaObra = getEntradaAtivaPorObra(obraId, registos);
  if (ativaMesmaObra) {
    alert(`A sair da obra ${nomeObra}`);
    await registarPonto('saida', obraId, nomeObra);
    return;
  }

  // 2) Se houver entrada ativa noutra obra → fechar essa e abrir ENTRADA nesta
  const ultimaAtiva = getUltimaEntradaAtiva(registos);
  if (ultimaAtiva && String(ultimaAtiva.obra_id) != String(obraId)) {
    const nomeAnterior = ultimaAtiva.Obra?.nome || 'Obra anterior';
    alert(`A sair automaticamente de ${nomeAnterior}`);
    await registarPonto('saida', ultimaAtiva.obra_id, nomeAnterior);
  }

  // 3) Sem ativa → ENTRADA nesta obra
  alert(`A entrar na obra ${nomeObra}`);
  await registarPonto('entrada', obraId, nomeObra);
};


  // Função para navegar para aprovação de registos
  const handleNavigateToApproval = () => {
    // Use navigation.navigate para navegar para a página de aprovação
    if (props.navigation) {
      props.navigation.navigate('AprovacaoPontoPendentes');
    }
  };

  // Função para navegar para aprovação de faltas
  const handleNavigateToFaltasApproval = () => {
    // Use navigation.navigate para navegar para a página de aprovação de faltas
    if (props.navigation) {
      props.navigation.navigate('AprovacaoFaltaFerias');
    }
  };

  //
    useEffect(() => {
    const fetchEquipas = async () => {
        const token = localStorage.getItem('loginToken');
        const res = await fetch('https://backend.advir.pt/api/equipa-obra/minhas-agrupadas', {
        headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
        const data = await res.json();
        setMinhasEquipas(data);
        }
    };
    fetchEquipas();
    }, []);


  // Carregar obras disponíveis
  useEffect(() => {
    const fetchObras = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('loginToken');
        const res = await fetch('https://backend.advir.pt/api/obra', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const empresaId = localStorage.getItem('empresa_id');
          const obrasDaEmpresa = data.filter(o => o.empresa_id == empresaId);
          setObras(obrasDaEmpresa);

        }
      } catch (err) {
        console.error('Erro ao carregar obras:', err);
        alert('Erro ao carregar obras');
      } finally {
        setLoading(false);
      }
    };

    fetchObras();
  }, []);

  // Carregar registos do dia
  useEffect(() => {
    const carregarRegistosHoje = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('loginToken');
        const hoje = new Date().toISOString().split('T')[0];

        const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-dia?data=${hoje}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const dados = await res.json();
          // Inicializa com morada por carregar
            const registosIniciais = dados.map(r => ({
            ...r,
            morada: 'A carregar localização...'
            }));
            setRegistos(registosIniciais);

            // Vai buscar as moradas individualmente depois
            dados.forEach(async (r) => {
            const morada = await obterMoradaPorCoordenadas(r.latitude, r.longitude);
            setRegistos(prev =>
                prev.map(item =>
                item.id === r.id ? { ...item, morada } : item
                )
            );
            });


        }
      } catch (err) {
        console.error('Erro ao carregar registos de hoje:', err);
      } finally {
        setLoading(false);
      }
    };

    carregarRegistosHoje();
  }, []);

useEffect(() => {
  const fetchRegistosEquipa = async () => {
    const token = localStorage.getItem('loginToken');
    const todosMembros = minhasEquipas.flatMap(eq => eq.membros.map(m => m.id));
    if (!todosMembros.length) return;

    const ids = todosMembros.join(',');
    const res = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-dia-equipa?membros=${ids}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      setRegistosEquipa(data);
    }
  };

  fetchRegistosEquipa();
}, [minhasEquipas]);



  const obterMoradaPorCoordenadas = async (lat, lon) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const data = await res.json();
      return data.display_name || `${lat}, ${lon}`;
    } catch (err) {
      console.error('Erro ao obter morada:', err);
      return `${lat}, ${lon}`;
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } }),
        err => reject(err)
      );
    });
  };

  const registarPonto = async (tipo, obraId, nomeObra) => {
    try {
      setLoading(true);
      const loc = await getCurrentLocation();
      const token = localStorage.getItem('loginToken');

      const res = await fetch('https://backend.advir.pt/api/registo-ponto-obra', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipo,
          obra_id: obraId,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        })
      });

      if (res.ok) {
        const data = await res.json();
        const morada = await obterMoradaPorCoordenadas(data.latitude, data.longitude);
        setRegistos(prev => [...prev, { ...data, Obra: { nome: nomeObra }, morada }]);
        alert(`${tipo} registada na obra ${nomeObra}`);
      } else {
        alert('Erro ao registar ponto');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao registar ponto');
    } finally {
      setLoading(false);
    }
  };

  const processarEntradaComValidacao = async (novaObraId, nomeObraNova) => {
    // Verificar se já há entrada na mesma obra sem saída
    const entradasMesmaObra = registos
      .filter(r => r.tipo === 'entrada' && r.obra_id === novaObraId)
      .filter(entrada => {
        const saida = registos.find(saida =>
          saida.tipo === 'saida' &&
          saida.obra_id === novaObraId &&
          new Date(saida.timestamp) > new Date(entrada.timestamp)
        );
        return !saida;
      });

    if (entradasMesmaObra.length > 0) {
      return alert(`Já tens uma entrada ativa na obra "${nomeObraNova}". Dá saída antes de entrares novamente.`);
    }

    // Auto-fecho da última obra se for diferente
    const entradasSemSaida = registos
      .filter(r => r.tipo === 'entrada')
      .filter(entrada => {
        const saida = registos.find(saida =>
          saida.tipo === 'saida' &&
          saida.obra_id === entrada.obra_id &&
          new Date(saida.timestamp) > new Date(entrada.timestamp)
        );
        return !saida;
      });

    const ultimaEntradaSemSaida = entradasSemSaida
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (ultimaEntradaSemSaida && ultimaEntradaSemSaida.obra_id !== novaObraId) {
      const nomeObraAnterior = ultimaEntradaSemSaida.Obra?.nome || 'Obra anterior';
      alert(`A sair automaticamente de ${nomeObraAnterior}`);
      await registarPonto('saida', ultimaEntradaSemSaida.obra_id, nomeObraAnterior);
    }

    // Registar entrada nova
    alert(`A entrar na obra ${nomeObraNova}`);
    await registarPonto('entrada', novaObraId, nomeObraNova);
  };

  const onScanSuccess = async (data) => {
    try {
      const qrData = JSON.parse(data);
      if (qrData.tipo !== 'obra' || !qrData.obraId) {
        alert('QR Code inválido');
        return;
      }

      const novaObraId = qrData.obraId;
      const nomeObraNova = qrData.nome;

      await processarPorQR(novaObraId, nomeObraNova);
    } catch (err) {
      console.error('Erro ao processar o QR Code:', err);
      alert('Erro ao processar o QR Code');
    }
  };

  const toggleScanner = () => setScannerVisible(!scannerVisible);

  // Configurar scanner
  useEffect(() => {
    if (!scannerVisible) return;
    
    const startScanner = async () => {
      try {
        scannerRef.current = new Html5Qrcode("reader");
        const cameras = await Html5Qrcode.getCameras();
        const backCamera = cameras.find(c => /back/i.test(c.label)) || cameras[0];
        
        await scannerRef.current.start(
          backCamera.id,
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 }, 
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] 
          },
          async decodedText => {
            if (isProcessing) return;
            setIsProcessing(true);
            try { 
              await scannerRef.current.stop(); 
            } catch (_) {}
            scannerRef.current = null;
            setScannerVisible(false);
            await onScanSuccess(decodedText);
            setIsProcessing(false);
          }
        );
      } catch (err) {
        console.error("Erro ao iniciar scanner:", err);
        alert("Erro ao iniciar câmera");
        setScannerVisible(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scannerVisible, isProcessing]);

const handleManualAction = async (tipo) => {
  const obra = obras.find(o => o.id == obraSelecionada);
  if (!obraSelecionada || !obra) {
    return alert('Selecione uma obra válida');
  }

  const tipoAcao = tipo.toLowerCase();

  if (tipoAcao === 'entrada') {
    await processarEntradaComValidacao(obra.id, obra.nome);
  } 
  else if (tipoAcao === 'saida') {
    // Verifica se há entrada anterior sem saída para a mesma obra
    const entradaSemSaida = registos
      .filter(r => r.tipo === 'entrada' && r.obra_id === obra.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .find(entrada => {
        const saida = registos.find(saida =>
          saida.tipo === 'saida' &&
          saida.obra_id === entrada.obra_id &&
          new Date(saida.timestamp) > new Date(entrada.timestamp)
        );
        return !saida;
      });

    if (!entradaSemSaida) {
      return alert(`Não há entrada ativa na obra "${obra.nome}" para registar saída.`);
    }

    await registarPonto('saida', obra.id, obra.nome);
  }
};



  const handleRegistoEquipa = async (tipo) => {
  try {
    setLoading(true);
    const token = localStorage.getItem('loginToken');
    const loc = await getCurrentLocation();

    const res = await fetch('https://backend.advir.pt/api/registo-ponto-obra/registar-ponto-equipa', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tipo,
        obra_id: obraSelecionada,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        membros: membrosSelecionados
      })
    });

    if (res.ok) {
      alert(`Ponto "${tipo}" registado para ${membrosSelecionados.length} membro(s).`);
    } else {
      alert('Erro ao registar ponto para equipa.');
    }
  } catch (err) {
    console.error('Erro registo equipa:', err);
    alert('Erro interno ao registar ponto da equipa.');
  } finally {
    setLoading(false);
  }
};

console.log('tipoUser:', tipoUser);

  return (
    <div className="container-fluid bg-light min-vh-100 py-2 py-md-4" style={{overflowX: 'hidden', background: 'linear-gradient(to bottom, #e3f2fd, #bbdefb, #90caf9)'}}>
      
      <style jsx>{`

        


        .scanner-container {
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .card-moderno {
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          border: none;
          margin-bottom: 1rem;
        }
        .btn-scanner {
          background: linear-gradient(45deg, #04BEFE, #4481EB);
          border: none;
          border-radius: 12px;
          padding: 0.75rem 1.5rem;
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(68, 129, 235, 0.3);
        }
        .btn-scanner:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(68, 129, 235, 0.4);
          color: white;
        }
        .btn-action {
          border-radius: 8px;
          font-weight: 600;
          padding: 0.75rem 1.5rem;
          transition: all 0.3s ease;
          min-width: 120px;
        }
        .btn-action:hover {
          transform: translateY(-1px);
        }
        .registro-item {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          border-left: 4px solid #28a745;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
        }
        .registro-item:hover {
          box-shadow: 0 4px 15px rgba(0,0,0,0.12);
        }
        .registro-saida {
          border-left-color: #dc3545;
        }
        .form-control-custom {
          border-radius: 8px;
          border: 1px solid #dee2e6;
          padding: 0.75rem;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }
        .form-control-custom:focus {
          border-color: #4481EB;
          box-shadow: 0 0 0 0.2rem rgba(68,129,235,0.25);
        }
        @media (max-width: 767px) {
          .container-fluid {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .btn-action {
            min-width: 100px;
            padding: 0.6rem 1rem;
            font-size: 0.85rem;
          }
        }
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
      `}</style>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      )}

      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          {/* Header */}
          <div className="card card-moderno mb-3 mb-md-4">
            <div className="card-body py-3 py-md-4">
              <div className="d-flex justify-content-between align-items-center">
                <div className="text-center flex-grow-1">
                  <h1 className="h4 h3-md mb-2 text-primary">
                    <FaQrcode className="me-2 me-md-3" />
                    <span className="d-none d-sm-inline">Registo de Ponto QR Code</span>
                    <span className="d-sm-none">Ponto QR Code</span>
                  </h1>
                  <p className="text-muted mb-0 small">Digitaliza QR Code ou regista manualmente</p>
                </div>
                
         {/* Notification Bell for Specific User Types */}
{['Administrador', 'Encarregado', 'Diretor'].includes(tipoUser) && (
  <div className="d-flex align-items-center">
    <NotificacaoCombinada 
      tipoUser={tipoUser}
      onNavigateRegistos={handleNavigateToApproval}
      onNavigateFaltas={handleNavigateToFaltasApproval}
    />
  </div>
)}



              </div>
            </div>
          </div>

          <div className="row g-3" style={{marginBottom: '50px'}} >
            {/* Scanner Section */}
            <div className="col-12 col-lg-8">
              <div className="card card-moderno">
                <div className="card-body p-3 p-md-4">
                  {/* Scanner Button */}
                  <div className="text-center mb-4">
                    <button 
                      className="btn btn-scanner w-100 w-md-auto"
                      onClick={toggleScanner}
                      disabled={isProcessing}
                    >
                      <FaCamera className="me-2" />
                      <span className="d-none d-sm-inline">
                        {scannerVisible ? 'Fechar Scanner' : 'Abrir Scanner QR Code'}
                      </span>
                      
                      <span className="d-sm-none">
                        {scannerVisible ? 'Fechar' : 'Scanner'}
                      </span>
                    </button>
                  </div>

                  {/* Scanner Container */}
                  {scannerVisible && (
                    <div className="scanner-container mb-4">
                      <div id="reader" style={{width: '100%', minHeight: '300px'}}></div>
                    </div>
                  )}

                  {/* Manual Registration */}
                  <div className="border border-primary rounded mb-3">
  <div 
    className="bg-primary text-white px-3 py-2 d-flex justify-content-between align-items-center rounded-top"
    style={{ cursor: 'pointer' }}
    onClick={() => setMostrarManual(prev => !prev)}
  >
    <h5 className="mb-0">
      <FaClock className="me-2" />
      Registo Manual
    </h5>
    <span>{mostrarManual ? '−' : '+'}</span>
  </div>

  {mostrarManual && (
    <div className="p-3 p-md-4" style={{backgroundColor: '#f8f9ff'}}>
      <div className="mb-3">
        <label className="form-label fw-semibold small">Selecionar Obra</label>
        <Select
  options={opcoesObras}
  value={opcoesObras.find(o => o.value == obraSelecionada)}
  onChange={(opcao) => setObraSelecionada(opcao.value)}
  placeholder="Escolha a obra..."
  classNamePrefix="react-select"
  isClearable
/>

      </div>

      <div className="row g-2">
        <div className="col-6">
          <button
            className="btn btn-success btn-action w-100"
            onClick={() => handleManualAction('entrada')}
            disabled={!obraSelecionada || loading}
          >
            <FaPlay className="me-1 me-md-2" />
            <span className="d-none d-sm-inline">ENTRADA</span>
            <span className="d-sm-none">ENTRA</span>
          </button>
        </div>
        <div className="col-6">
          <button
            className="btn btn-danger btn-action w-100"
            onClick={() => handleManualAction('saida')}
            disabled={!obraSelecionada || loading}
          >
            <FaStop className="me-1 me-md-2" />
            <span className="d-none d-sm-inline">SAÍDA</span>
            <span className="d-sm-none">SAI</span>
          </button>
        </div>
      </div>
    </div>
  )}
</div>

                    {/* Team Registration */}
                    {tipoUser !== 'Trabalhador' && (
<div className="mt-4 border border-info rounded bg-white mb-3">
  <div 
    className="bg-info text-white px-3 py-2 d-flex justify-content-between align-items-center rounded-top"
    style={{ cursor: 'pointer' }}
    onClick={() => setMostrarEquipa(prev => !prev)}
  >
    <h5 className="mb-0">
      <FaUsers className="me-2" />
      Registo por Equipa
    </h5>
    <span>{mostrarEquipa ? '−' : '+'}</span>
  </div>

  {mostrarEquipa && (
    <div className="p-3 p-md-4">
      {/* Obra */}
      <div className="mb-3">
        <label className="form-label fw-semibold small">Obra</label>
         <Select
  options={opcoesObras}
  value={opcoesObras.find(o => o.value == obraSelecionada)}
  onChange={(opcao) => setObraSelecionada(opcao.value)}
  placeholder="Escolha a obra..."
  classNamePrefix="react-select"
  isClearable
/>
      </div>

     {/* Membros da equipa com estado atual */}
<div className="mb-3">
  <label className="form-label fw-semibold small">Membros da Equipa</label>
  {minhasEquipas.length === 0 ? (
    <p className="text-muted">Sem equipas associadas.</p>
  ) : (
    minhasEquipas.map(eq => (
      <div key={eq.nome} className="mb-3">
        <h6 className="fw-bold text-primary">{eq.nome}</h6>
       {eq.membros.map(m => {
  const entradas = registosEquipa.filter(r => r.user_id === m.id && r.tipo === 'entrada');
  const saidas = registosEquipa.filter(r => r.user_id === m.id && r.tipo === 'saida');

  const ultimaEntrada = entradas.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  const temSaidaPosterior = ultimaEntrada && saidas.some(s => new Date(s.timestamp) > new Date(ultimaEntrada.timestamp));

  let estado = 'Ausente';
  let corEstado = 'text-muted';

  if (ultimaEntrada && !temSaidaPosterior) {
    if (obraSelecionada && ultimaEntrada.obra_id == obraSelecionada) {
      estado = 'A Trabalhar';
      corEstado = 'text-success';
    } else {
      estado = 'Ocupado';
      corEstado = 'text-warning';
    }
  }

  return (
    <div key={m.id} className="form-check d-flex justify-content-between align-items-center border-bottom py-2 ps-3">
      <div>
        <input
          className="form-check-input me-2"
          type="checkbox"
          id={`membro-${m.id}`}
          value={m.id}
          checked={membrosSelecionados.includes(m.id)}
          onChange={(e) => {
            const checked = e.target.checked;
            setMembrosSelecionados(prev => checked
              ? [...prev, m.id]
              : prev.filter(id => id !== m.id));
          }}
        />
        <label className="form-check-label" htmlFor={`membro-${m.id}`}>
          {m.nome}
        </label>
      </div>
      <span className={`fw-semibold ${corEstado} me-2`}>{estado}</span>
    </div>
  );
})}


      </div>
    ))
  )}
</div>


      {/* Botões Entrada/Saída */}
      <div className="row g-2">
        <div className="col-6">
          <button
            className="btn btn-success btn-action w-100"
            onClick={() => handleRegistoEquipa('entrada')}
            disabled={!obraSelecionada || membrosSelecionados.length === 0 || loading}
          >
            <FaPlay className="me-1" /> ENTRADA
          </button>
        </div>
        <div className="col-6">
          <button
            className="btn btn-danger btn-action w-100"
            onClick={() => handleRegistoEquipa('saida')}
            disabled={!obraSelecionada || membrosSelecionados.length === 0 || loading}
          >
            <FaStop className="me-1" /> SAÍDA
          </button>
        </div>
      </div>




    </div>
  )}
</div>
                    )}


                </div>
              </div>
            </div>

            {/* Today's Records */}
            <div className="col-12 col-lg-4"style={{marginBottom: '50px'}}>
              <div className="card card-moderno">
                <div className="card-body p-3 p-md-4">
                  <h5 className="card-title d-flex align-items-center mb-3 mb-md-4" style={{fontSize: 'clamp(1rem, 3vw, 1.25rem)'}}>
                    <FaClock className="text-primary me-2 flex-shrink-0" />
                    <span className="d-none d-sm-inline">Registos de Hoje</span>
                    <span className="d-sm-none">Hoje</span>
                  </h5>

                  <div style={{maxHeight: '400px', overflowY: 'auto'}} className="custom-scroll">
                    {registos.length === 0 ? (
                      <div className="text-center py-4">
                        <FaExclamationCircle className="text-muted mb-3" size={32} />
                        <p className="text-muted mb-0">Nenhum registo encontrado para hoje</p>
                      </div>
                    ) : (
                      registos.map((r, i) => (
                        <div 
                          key={i} 
                          className={`registro-item ${r.tipo === 'saida' ? 'registro-saida' : ''}`}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center mb-1">
                                {r.tipo === 'entrada' ? (
                                  <FaPlay className="text-success me-2" />
                                ) : (
                                  <FaStop className="text-danger me-2" />
                                )}
                                <span className="fw-bold text-uppercase small">
                                  {r.tipo}
                                </span>
                              </div>
                              <small className="text-muted d-block">
                                {new Date(r.timestamp || r.createdAt).toLocaleString('pt-PT', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit'
                                })}
                              </small>
                            </div>
                            <FaCheckCircle className="text-success" />
                          </div>
                          
                          <div className="mb-2">
                            <span className="fw-semibold text-primary">
                              {r.Obra?.nome}
                            </span>
                          </div>
                          
                          {r.morada && (
                            <div className="d-flex align-items-start">
                              <FaMapMarkerAlt className="text-muted me-2 mt-1 flex-shrink-0" size={12} />
                              <small className="text-muted text-truncate">
                                {r.morada}
                              </small>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            

          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistoPontoObra;