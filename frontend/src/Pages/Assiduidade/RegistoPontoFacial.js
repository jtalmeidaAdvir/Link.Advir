import React, { useState, useRef, useEffect } from 'react';
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
  FaUsers,
  FaUserCheck,
  FaSpinner
} from 'react-icons/fa';
import Select from 'react-select';
import InvisibleFacialScanner from '../Autenticacao/components/InvisibleFacialScanner';
import VisibleFacialScanner from '../Autenticacao/components/VisibleFacialScanner';
import { useAppStateRefresh } from '../Autenticacao/utils/useAppStateRefresh';
import { useEnsureValidTokens } from '../../utils/useEnsureValidTokens';
import backgroundImage from '../../../images/ImagemFundo.png';
import { useNavigation } from '@react-navigation/native';

const fetchWithTimeout = (url, opts = {}, ms = 8000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
};

const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return resolve({ coords: { latitude: null, longitude: null } });
    }
    navigator.geolocation.getCurrentPosition(
      pos =>
        resolve({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }
        }),
      err => resolve({ coords: { latitude: null, longitude: null }, error: err?.message }),
      {
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 15000
      }
    );
  });

const RegistoPontoFacial = (props) => {
  const [registos, setRegistos] = useState([]);
  const [obras, setObras] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [resumoObra, setResumoObra] = useState({ pessoasAConsultar: 0, entradasSaidas: [] });
  const [showResultModal, setShowResultModal] = useState(false);
  const [modalData, setModalData] = useState({ type: '', message: '', userName: '', action: '' });

  // Estados de loading separados
  const [isObrasLoading, setIsObrasLoading] = useState(false);
  const [isResumoLoading, setIsResumoLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isPostLoading, setIsPostLoading] = useState(false);

  const [isFacialScanning, setIsFacialScanning] = useState(false);
  const [facialScanResult, setFacialScanResult] = useState(null);

  // Bloqueios / locks
  const [isRegistering, setIsRegistering] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const registoLockRef = useRef(false);
  const scanLockRef = useRef(false);

  // Pré-aquecer localização quando o utilizador inicia o scan
  const locationPromiseRef = useRef(null);

  const navigation = useNavigation?.();

  const opcoesObras = obras.map(obra => ({
    value: obra.id,
    label: obra.nome
  }));

  // Debug + validação POS
  useEffect(() => {
    const isPOS = localStorage.getItem('isPOS') === 'true';
    const token = localStorage.getItem('loginToken');
    const empresaId = localStorage.getItem('empresa_id');

    if (!isPOS || !token || !empresaId) {
      console.error('Dados essenciais em falta. Redirecionando para login...');
      window.location.href = '/login-pos';
    }
  }, []);

  // Hooks auxiliares de tokens
  useAppStateRefresh();
  useEnsureValidTokens();

  // Helpers para decisões antigas (fallback)
  const dataRegisto = (r) => new Date(r.timestamp || r.createdAt);
  const temSaidaPosterior = (entrada, lista) =>
    lista.some(s =>
      s.tipo === 'saida' &&
      String(s.obra_id) === String(entrada.obra_id) &&
      dataRegisto(s) > dataRegisto(entrada)
    );
  const getEntradaAtivaPorObra = (obraId, lista) =>
    lista
      .filter(r => r.tipo === 'entrada' && String(r.obra_id) === String(obraId))
      .sort((a, b) => dataRegisto(b) - dataRegisto(a))
      .find(e => !temSaidaPosterior(e, lista));
  const getUltimaEntradaAtiva = (lista) =>
    lista
      .filter(r => r.tipo === 'entrada')
      .sort((a, b) => dataRegisto(b) - dataRegisto(a))
      .find(e => !temSaidaPosterior(e, lista));

  // Carregar obras
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsObrasLoading(true);
        const token = localStorage.getItem('loginToken');
        const empresaId = localStorage.getItem('empresa_id');
        const res = await fetchWithTimeout('https://backend.advir.pt/api/obra', {
          headers: { Authorization: `Bearer ${token}` }
        }, 8000);
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          const obrasDaEmpresa = data.filter(o => String(o.empresa_id) === String(empresaId));
          setObras(obrasDaEmpresa);
          if (obrasDaEmpresa.length === 1) setObraSelecionada(obrasDaEmpresa[0].id);
        } else {
          console.error('Falha ao carregar obras:', res.status);
        }
      } catch (e) {
        console.error('Erro ao carregar obras:', e);
      } finally {
        if (mounted) setIsObrasLoading(false);
      }
    })();
    return () => { mounted = false; setIsFacialScanning(false); registoLockRef.current = false; scanLockRef.current = false; };
  }, []);

  // Carregar resumo da obra ao selecionar
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!obraSelecionada || !mounted) {
        setResumoObra({ pessoasAConsultar: 0, entradasSaidas: [] });
        return;
      }
      await carregarResumoObra(obraSelecionada, mounted);
    })();
    return () => { mounted = false; };
  }, [obraSelecionada]);

  const carregarResumoObra = async (obraId, mountedCheck = true) => {
    try {
      setIsResumoLoading(true);
      const token = localStorage.getItem('loginToken');
      const url = `https://backend.advir.pt/api/registo-ponto-obra/resumo-obra/${obraId}`;
      const res = await fetchWithTimeout(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      }, 8000);

      if (mountedCheck && res.ok) {
        const data = await res.json();
        setResumoObra({
          pessoasAConsultar: data.pessoasAConsultar ?? 0,
          entradasSaidas: Array.isArray(data.entradasSaidas) ? data.entradasSaidas : []
        });
      } else if (mountedCheck) {
        setResumoObra({ pessoasAConsultar: 0, entradasSaidas: [] });
      }
    } catch (e) {
      console.error('Erro a carregar resumo da obra:', e);
      setResumoObra({ pessoasAConsultar: 0, entradasSaidas: [] });
    } finally {
      setIsResumoLoading(false);
    }
  };

  // --- Registo com fallback ---
  const registarPontoParaUtilizador = async (tipo, obraId, nomeObra, userId, userName, loc) => {
    try {
      if (registoLockRef.current || isRegistering) return false;
      registoLockRef.current = true;
      setIsPostLoading(true);
      setIsRegistering(true);
      setStatusMessage(`A registar ${tipo}...`);

      const token = localStorage.getItem('loginToken');
      const empresaNome = localStorage.getItem('empresa_areacliente');
      const idemKey = `${userId}-${obraId}-${tipo}-${Date.now()}`;

      const res = await fetchWithTimeout('https://backend.advir.pt/api/registo-ponto-obra', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idemKey
        },
        body: JSON.stringify({
          tipo,
          obra_id: obraId,
          latitude: loc?.coords?.latitude ?? null,
          longitude: loc?.coords?.longitude ?? null,
          targetUserId: userId,
          empresa: empresaNome
        })
      }, 10000);

      if (res.ok) {
        const actionText = tipo === 'entrada' ? 'Entrada' : 'Saída';
        setModalData({ type: 'success', message: `${actionText} registada!`, userName, action: actionText });
        setShowResultModal(true);
        // Atualiza apenas o resumo
        carregarResumoObra(obraId);
        return true;
      } else {
        const errorData = await res.json().catch(() => ({}));
        setModalData({ type: 'error', message: errorData.message || 'Erro', userName, action: 'Erro' });
        setShowResultModal(true);
        return false;
      }
    } catch (err) {
      console.error('Erro ao registar ponto:', err);
      setModalData({ type: 'error', message: err?.name === 'AbortError' ? 'Tempo de resposta excedido' : 'Erro ao registar', userName, action: 'Erro' });
      setShowResultModal(true);
      return false;
    } finally {
      setIsPostLoading(false);
      setIsRegistering(false);
      registoLockRef.current = false;
    }
  };

  const processarPontoComValidacaoParaUtilizador = async (obraId, nomeObra, userId, userName, registosDoUtilizador, loc) => {
    // 1) Se já houver entrada ativa na MESMA obra → SAÍDA
    const ativaMesmaObra = getEntradaAtivaPorObra(obraId, registosDoUtilizador);
    if (ativaMesmaObra) {
      await registarPontoParaUtilizador('saida', obraId, nomeObra, userId, userName, loc);
      return;
    }
    // 2) Se houver entrada ativa noutra obra → fechar essa e abrir ENTRADA nesta
    const ultimaAtiva = getUltimaEntradaAtiva(registosDoUtilizador);
    if (ultimaAtiva && String(ultimaAtiva.obra_id) !== String(obraId)) {
      const nomeAnterior = ultimaAtiva.Obra?.nome || 'Obra anterior';
      await registarPontoParaUtilizador('saida', ultimaAtiva.obra_id, nomeAnterior, userId, userName, loc);
      await new Promise(r => setTimeout(r, 200));
    }
    // 3) Sem ativa → ENTRADA nesta obra
    await registarPontoParaUtilizador('entrada', obraId, nomeObra, userId, userName, loc);
  };

  const autenticarERegistarPonto = async (obraId, nomeObra, facialData) => {
    if (isRegistering || isProcessingScan) return;

    try {
      setIsProcessingScan(true);
      setIsAuthLoading(true);
      setStatusMessage('A autenticar utilizador...');

      // 1) Autenticação facial com timeout
      const authRes = await fetchWithTimeout(
        'https://backend.advir.pt/api/auth/biometric/authenticate-facial',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facialData }) },
        7000
      );
      if (!authRes.ok) {
        const err = await authRes.json().catch(() => ({}));
        throw new Error(err.message || 'Falha na autenticação facial');
      }
      const authData = await authRes.json();
      const userId = authData.userId;
      const userName = authData.userNome || authData.username || 'Utilizador';

      setIsAuthLoading(false);
      setStatusMessage(`${userName} identificado. A obter localização...`);

      // 2) Localização (usa pré-aquecimento se existir)
      let loc = null;
      try {
        loc = locationPromiseRef.current ? await locationPromiseRef.current : await getCurrentLocation();
      } catch {
        loc = { coords: { latitude: null, longitude: null } };
      }

      setStatusMessage(`${userName} — a registar ponto...`);
      setIsPostLoading(true);

      // 3) TENTAR endpoint /auto (decisão no backend)
      const token = localStorage.getItem('loginToken');
      const idemKey = `${userId}-${obraId}-${Date.now()}`;

      let resAuto = await fetchWithTimeout(
        'https://backend.advir.pt/api/registo-ponto-obra/auto',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idemKey
          },
          body: JSON.stringify({
            obra_id: obraId,
            latitude: loc?.coords?.latitude ?? null,
            longitude: loc?.coords?.longitude ?? null,
            targetUserId: userId
          })
        },
        8000
      );

      if (resAuto.ok) {
        const data = await resAuto.json().catch(() => ({}));
        const actionText = data?.action === 'saida' ? 'Saída' : 'Entrada';
        setModalData({ type: 'success', message: `${actionText} registada!`, userName, action: actionText });
        setShowResultModal(true);
        await carregarResumoObra(obraId);
        return;
      }

      // 4) Fallback para lógica antiga (se /auto não existir ou falhar)
      if (!resAuto.ok && resAuto.status !== 404) {
        const err = await resAuto.json().catch(() => ({}));
        throw new Error(err.message || 'Erro ao registar (auto)');
      }

      // Fallback: ir buscar registos do dia e decidir no frontend
      const hoje = new Date().toISOString().split('T')[0];
      const registosUrl =
        `https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo` +
        `?user_id=${userId}&ano=${new Date().getFullYear()}` +
        `&mes=${String(new Date().getMonth() + 1).padStart(2, '0')}&data=${hoje}`;

      let registosUtilizadorIdentificado = [];
      try {
        const registosRes = await fetchWithTimeout(registosUrl, { headers: { Authorization: `Bearer ${token}` } }, 7000);
        if (registosRes.ok) {
          const data = await registosRes.json();
          registosUtilizadorIdentificado = (data.filter ? data.filter(r => r.timestamp && r.timestamp.startsWith(hoje)) : data);
        }
      } catch {
        // Se falhar, vamos assumir ENTRADA otimista
        registosUtilizadorIdentificado = [];
      }

      const registosFormatados = registosUtilizadorIdentificado.map(reg => ({
        ...reg,
        obra_id: reg.obra_id || reg.obraId,
        timestamp: reg.timestamp || reg.createdAt,
        tipo: reg.tipo,
        User: reg.User || { nome: userName },
        Obra: reg.Obra || { nome: nomeObra }
      }));

      await processarPontoComValidacaoParaUtilizador(obraId, nomeObra, userId, userName, registosFormatados, loc);

    } catch (e) {
      console.error('Erro no processo de autenticar e registar:', e);
      setModalData({ type: 'error', message: e?.message || 'Erro ao processar registo', userName: '', action: 'Erro' });
      setShowResultModal(true);
    } finally {
      setIsAuthLoading(false);
      setIsPostLoading(false);
      setIsProcessingScan(false);
    }
  };

  const processarEntradaComFacial = async (facialData) => {
    if (!obraSelecionada) {
      setStatusMessage('Por favor, selecione um local antes de iniciar o reconhecimento facial');
      return;
    }
    const obra = obras.find(o => String(o.id) === String(obraSelecionada));
    if (!obra) {
      setStatusMessage('Local selecionado não encontrado');
      return;
    }
    await autenticarERegistarPonto(obraSelecionada, obra.nome, facialData);
  };

  const handleStartFacialScan = () => {
    if (!obraSelecionada) {
      alert('Por favor, selecione um local antes de iniciar o reconhecimento facial');
      return;
    }
    if (isRegistering || isProcessingScan) {
      alert('Aguarde, ainda está a processar o registo anterior...');
      return;
    }
    // Pré-aquecer localização
    locationPromiseRef.current = getCurrentLocation();
    setIsFacialScanning(true);
    setStatusMessage('Iniciando reconhecimento facial...');
    setFacialScanResult(null);
  };

  const handleStopFacialScan = () => {
    setIsFacialScanning(false);
    setStatusMessage('');
    setFacialScanResult(null);
    locationPromiseRef.current = null;
  };

  const handleFacialScanComplete = async (facialData) => {
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTime;

    // Evitar reentradas e scans demasiado próximos
    if (scanLockRef.current || isRegistering || isProcessingScan || timeSinceLastScan < 3000) {
      setIsFacialScanning(false);
      return;
    }

    scanLockRef.current = true;
    setIsProcessingScan(true);
    setLastScanTime(now);
    setFacialScanResult(facialData);
    setIsFacialScanning(false);

    try {
      await processarEntradaComFacial(facialData);
    } catch (error) {
      console.error('Erro ao processar entrada com facial:', error);
      setStatusMessage('Erro ao processar reconhecimento facial');
    } finally {
      setTimeout(() => {
        scanLockRef.current = false;
        setIsProcessingScan(false);
      }, 1500);
    }
  };

  const handleLogoutPOS = () => {
    localStorage.clear();
    if (navigation) {
      navigation.navigate('LoginPOS');
    } else {
      window.location.href = '/login-pos';
    }
  };

  const handleCloseModal = () => {
    setShowResultModal(false);
    setModalData({ type: '', message: '', userName: '', action: '' });
    setStatusMessage('');
    setIsRegistering(false);
    setIsProcessingScan(false);
    registoLockRef.current = false;
    scanLockRef.current = false;
    // Atualiza apenas o resumo da obra selecionada
    if (obraSelecionada) carregarResumoObra(obraSelecionada);
  };

  const isPOS = localStorage.getItem('isPOS') === 'true';

  return (
    <div
      className="container-fluid bg-light min-vh-100 py-2 py-md-4"
      style={{ overflowX: 'hidden', overflowY: 'auto', position: 'relative', height: '100vh' }}
    >
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to bottom, rgba(227, 242, 253, 0.8), rgba(187, 222, 251, 0.8), rgba(144, 202, 249, 0.8))',
          zIndex: 0
        }}
      />

      <style jsx>{`
        .card-moderno {
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          border: none;
          margin-bottom: 1rem;
        }
        .btn-facial {
          background: linear-gradient(45deg, #1792FE, #0D7EFE);
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(23, 146, 254, 0.3);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .5rem;
        }
        .btn-facial:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(23, 146, 254, 0.4);
          color: white;
        }
        .btn-facial:disabled {
          opacity: 0.7;
          transform: none;
        }
        .status-message {
          background: rgba(23, 146, 254, 0.1);
          border: 1px solid #1792FE;
          border-radius: 8px;
          padding: 1rem;
          color: #1792FE;
          text-align: center;
          font-weight: 500;
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
        .registro-saida { border-left-color: #dc3545; }
        .result-modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 10000;
        }
        .result-modal {
          background: white; border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          max-width: 400px; width: 90%;
          padding: 0; overflow: hidden;
          animation: modalAppear 0.3s ease-out;
        }
        .result-modal-header { padding: 2rem 2rem 1rem; text-align: center; background: linear-gradient(135deg,#f8f9fa,#e9ecef); }
        .result-modal-body { padding: 1rem 2rem 2rem; text-align: center; }
        .success-icon { font-size: 3rem; color: #28a745; margin-bottom: 1rem; }
        .error-icon { font-size: 3rem; color: #dc3545; margin-bottom: 1rem; }
        .modal-title { font-size: 1.5rem; font-weight: 600; margin-bottom: .5rem; }
        .modal-subtitle { color: #6c757d; margin-bottom: 1rem; }
        .modal-close-btn {
          background: linear-gradient(45deg, #1792FE, #0D7EFE);
          border: none; border-radius: 25px;
          padding: 0.75rem 2rem; color: white; font-weight: 600; cursor: pointer; transition: all .3s ease; min-width: 120px;
        }
        .modal-close-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(23,146,254,.4); }
        @keyframes modalAppear {
          from { opacity: 0; transform: scale(.9) translateY(-20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @media (max-width: 767px) {
          .container-fluid { padding-left: .75rem; padding-right: .75rem; }
          .result-modal { width: 95%; margin: 1rem; }
          .result-modal-header, .result-modal-body { padding: 1.5rem 1rem; }
        }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, height: '100%', overflowY: 'auto' }}>
        <div className="row justify-content-center">
          <div className="col-12 col-xl-10">
            {/* Header */}
            <div className="card card-moderno mb-3 mb-md-4">
              <div className="card-body py-3 py-md-4">
                <div className="text-center">
                  <h1 className="h4 h3-md mb-2 text-primary">
                    <FaUserCheck className="me-2" />
                    Identificação Facial e Registo de Ponto
                  </h1>
                  <p className="text-muted mb-0 small">
                    Selecione o local e use o reconhecimento facial para identificar o utilizador e registar o seu ponto
                  </p>
                </div>
              </div>
            </div>

            <div className="row g-3 justify-content-center" style={{ marginBottom: '50px' }}>
              {/* Scanner Facial Section */}
              <div className="col-12 col-lg-8 col-xl-6">
                <div className="card card-moderno">
                  <div className="card-body p-3 p-md-4">
                    {/* Seleção de Obra */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Selecionar Local</label>
                      <Select
                        options={opcoesObras}
                        isLoading={isObrasLoading}
                        value={opcoesObras.find(o => String(o.value) === String(obraSelecionada)) || null}
                        onChange={(opcao) => setObraSelecionada(opcao?.value || '')}
                        placeholder="Escolha o local para registar o ponto..."
                        classNamePrefix="react-select"
                        isClearable
                      />
                    </div>

                    {/* Botão de Reconhecimento Facial */}
                    <div className="text-center mb-4">
                      {!isFacialScanning ? (
                        <button
                          className="btn btn-facial w-100 w-md-auto"
                          onClick={handleStartFacialScan}
                          disabled={!obraSelecionada || isRegistering || isProcessingScan || isAuthLoading || isPostLoading}
                        >
                          {(isAuthLoading || isPostLoading) ? <FaSpinner className="me-2 spin" /> : <FaCamera className="me-2" />}
                          <span className="d-none d-sm-inline">
                            {isAuthLoading ? 'A autenticar...' : (isPostLoading ? 'A registar...' : 'Identificar e Registar Ponto')}
                          </span>
                          <span className="d-sm-none">
                            {isAuthLoading ? 'A autenticar...' : (isPostLoading ? 'A registar...' : 'Identificar e Registar')}
                          </span>
                        </button>
                      ) : (
                        <button
                          className="btn btn-facial w-100 w-md-auto"
                          onClick={handleStopFacialScan}
                          disabled={isRegistering || isProcessingScan || isAuthLoading || isPostLoading}
                        >
                          <FaStop className="me-2" />
                          Cancelar Identificação
                        </button>
                      )}
                    </div>

                    {/* Status Message */}
                    {statusMessage && (
                      <div className="status-message mb-4">
                        {statusMessage}
                      </div>
                    )}

                    {/* Obra Selecionada */}
                    {obraSelecionada && (
                      <div className="alert alert-info">
                        <FaMapMarkerAlt className="me-2" />
                        <strong>Local Selecionado:</strong> {obras.find(o => String(o.id) === String(obraSelecionada))?.nome || 'Desconhecida'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumo da Obra */}
              {obraSelecionada && (
                <div className="col-12 col-lg-4 col-xl-6">
                  <div className="card card-moderno h-100">
                    <div className="card-body">
                      <h5 className="card-title text-primary fw-bold mb-3">
                        <FaUsers className="me-2" /> Resumo
                        {isResumoLoading && <FaSpinner className="ms-2 spin" />}
                      </h5>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="fw-semibold">Pessoas a Trabalhar:</span>
                        <span className="fs-4 fw-bold text-success">
                          {isResumoLoading ? '...' : resumoObra.pessoasAConsultar}
                        </span>
                      </div>
                      <hr className="mb-3" />
                      <h6 className="fw-semibold mb-2">Entradas e Saídas Recentes:</h6>
                      {isResumoLoading ? (
                        <p className="text-muted fst-italic">A carregar...</p>
                      ) : resumoObra.entradasSaidas?.length > 0 ? (
                        <ul className="list-unstyled mb-0" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {resumoObra.entradasSaidas.map((reg, index) => (
                            <li key={index} className={`registro-item ${reg.tipo === 'saida' ? 'registro-saida' : ''} d-flex justify-content-between align-items-center p-2 mb-2`}>
                              <div>
                                <strong className="d-block">{reg.User?.nome || 'Utilizador Desconhecido'}</strong>
                                <small className="text-muted">
                                  {reg.timestamp ? new Date(reg.timestamp).toLocaleString() : '-'}
                                </small>
                              </div>
                              <span className={`badge rounded-pill ${reg.tipo === 'entrada' ? 'bg-success' : 'bg-danger'}`}>
                                {reg.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted fst-italic">Sem registos recentes para este local.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Facial Visível */}
      <VisibleFacialScanner
        onScanComplete={handleFacialScanComplete}
        isScanning={isFacialScanning}
        onStartScan={handleStartFacialScan}
        onStopScan={handleStopFacialScan}
        t={(key) => key}
      />

      {/* Modal de Resultado */}
      {showResultModal && (
        <div className="result-modal-overlay" onClick={handleCloseModal}>
          <div className="result-modal" onClick={(e) => e.stopPropagation()}>
            <div className="result-modal-header">
              <div className={modalData.type === 'success' ? 'success-icon' : 'error-icon'}>
                {modalData.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
              </div>
              <h3 className="modal-title">
                {modalData.type === 'success' ? 'Sucesso!' : 'Erro!'}
              </h3>
              <p className="modal-subtitle">{modalData.userName}</p>
            </div>
            <div className="result-modal-body">
              <p
                style={{
                  fontSize: '1.1rem',
                  marginBottom: '1.5rem',
                  color: modalData.type === 'success' ? '#28a745' : '#dc3545',
                  fontWeight: '500'
                }}
              >
                {modalData.message}
              </p>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
};

export default RegistoPontoFacial;
