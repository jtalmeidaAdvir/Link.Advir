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
    FaUserCheck
} from 'react-icons/fa';
import Select from 'react-select';
import InvisibleFacialScanner from '../Autenticacao/components/InvisibleFacialScanner';
import VisibleFacialScanner from '../Autenticacao/components/VisibleFacialScanner';
import { useAppStateRefresh } from '../Autenticacao/utils/useAppStateRefresh';
import { useEnsureValidTokens } from '../../utils/useEnsureValidTokens';
import backgroundImage from '../../../images/ImagemFundo.png';
import { useNavigation } from '@react-navigation/native';


const RegistoPontoFacial = (props) => {
    const [registos, setRegistos] = useState([]);
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFacialScanning, setIsFacialScanning] = useState(false);
    const [facialScanResult, setFacialScanResult] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [resumoObra, setResumoObra] = useState({ pessoasAConsultar: 0, entradasSaidas: [] });
    const [showResultModal, setShowResultModal] = useState(false);
    const [modalData, setModalData] = useState({ type: '', message: '', userName: '', action: '' });
    const [isRegistering, setIsRegistering] = useState(false); // Bloqueio para evitar registos duplicados
    const [lastScanTime, setLastScanTime] = useState(0); // Timestamp do último scan
    const [isProcessingScan, setIsProcessingScan] = useState(false); // Estado específico para processamento de scan

    const registoLockRef = useRef(false);  // bloqueia POSTs duplicados
    const scanLockRef = useRef(false);     // bloqueia processamentos duplicados do onScanComplete



    const opcoesObras = obras.map(obra => ({
        value: obra.id,
        label: obra.nome
    }));

    // Debug: verificar dados do localStorage no carregamento
    useEffect(() => {
        console.log('=== DEBUG: Dados do localStorage ===');
        console.log('loginToken:', localStorage.getItem('loginToken'));
        console.log('isPOS:', localStorage.getItem('isPOS'));
        console.log('empresa_id:', localStorage.getItem('empresa_id'));
        console.log('empresa_areacliente:', localStorage.getItem('empresa_areacliente'));
        console.log('posId:', localStorage.getItem('posId'));
        console.log('posNome:', localStorage.getItem('posNome'));
        console.log('=====================================');
        
        // Verificar se é POS e se tem dados essenciais
        const isPOS = localStorage.getItem('isPOS') === 'true';
        const token = localStorage.getItem('loginToken');
        const empresaId = localStorage.getItem('empresa_id');
        
        if (!isPOS || !token || !empresaId) {
            console.error('Dados essenciais em falta. Redirecionando para login...');
            window.location.href = '/login-pos';
        }
    }, []);

    // Hook para renovar tokens automaticamente quando o app volta ao primeiro plano
    useAppStateRefresh();

    // Garantir que os tokens estão válidos quando a página carrega
    useEnsureValidTokens();

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

    const registarPontoParaUtilizador = async (tipo, obraId, nomeObra, userId, userName) => {
  try {
    if (registoLockRef.current || isRegistering) {
      return false;
    }
    registoLockRef.current = true;
    setIsRegistering(true);
    setStatusMessage(`A registar ${tipo}...`);

    const [loc] = await Promise.all([
      getCurrentLocation()
    ]);
    
    const token = localStorage.getItem('loginToken');
    const empresaNome = localStorage.getItem('empresa_areacliente');
    const idemKey = `${userId}-${obraId}-${tipo}-${Date.now()}`;

    const res = await fetch('https://backend.advir.pt/api/registo-ponto-obra', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idemKey
      },
      body: JSON.stringify({
        tipo,
        obra_id: obraId,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        targetUserId: userId,
        empresa: empresaNome
      })
    });

            if (res.ok) {
                const data = await res.json();
                const actionText = tipo === 'entrada' ? 'Entrada' : 'Saída';
                setModalData({
                    type: 'success',
                    message: `${actionText} registada!`,
                    userName: userName,
                    action: actionText
                });
                setShowResultModal(true);
                
                // Auto-fechar modal após 1.5 segundos
                setTimeout(() => {
                    handleCloseModal();
                }, 1500);
                
                return true; // Indica sucesso
            } else {
                const errorData = await res.json();
                setModalData({
                    type: 'error',
                    message: errorData.message || 'Erro',
                    userName: userName,
                    action: 'Erro'
                });
                setShowResultModal(true);
                
                // Auto-fechar modal após 1.5 segundos
                setTimeout(() => {
                    handleCloseModal();
                }, 1500);
                
                return false; // Indica falha
            }
        } catch (err) {
            console.error('Erro ao registar ponto:', err);
            setModalData({
                type: 'error',
                message: 'Erro ao registar',
                userName: userName,
                action: 'Erro'
            });
            setShowResultModal(true);
            
            // Auto-fechar modal após 1.5 segundos
            setTimeout(() => {
                handleCloseModal();
            }, 1500);
            
            return false; // Indica falha
        } finally {
            setIsRegistering(false); // Libertar bloqueio sempre
            registoLockRef.current = false; // Libertar lock
        }
    };

    const processarPontoComValidacao = async (obraId, nomeObra, userId, userName, registosUtilizador) => {
        // 1) Se já houver entrada ativa na MESMA obra → fazer SAÍDA
        const ativaMesmaObra = getEntradaAtivaPorObra(obraId, registosUtilizador);
        if (ativaMesmaObra) {
            await registarPontoParaUtilizador('saida', obraId, nomeObra, userId, userName);
            return;
        }

        // 2) Se houver entrada ativa noutra obra → fechar essa e abrir ENTRADA nesta
        const ultimaAtiva = getUltimaEntradaAtiva(registosUtilizador);
        if (ultimaAtiva && String(ultimaAtiva.obra_id) !== String(obraId)) {
            const nomeAnterior = ultimaAtiva.Obra?.nome || 'Obra anterior';
            await registarPontoParaUtilizador('saida', ultimaAtiva.obra_id, nomeAnterior, userId, userName);
        }

        // 3) Sem ativa → ENTRADA nesta obra
        await registarPontoParaUtilizador('entrada', obraId, nomeObra, userId, userName);
    };

    const processarPontoComValidacaoParaUtilizador = async (obraId, nomeObra, userId, userName, registosDoUtilizador) => {
        // 1) Se já houver entrada ativa na MESMA obra → fazer SAÍDA
        const ativaMesmaObra = getEntradaAtivaPorObra(obraId, registosDoUtilizador);

        if (ativaMesmaObra) {
            await registarPontoParaUtilizador('saida', obraId, nomeObra, userId, userName);
            return;
        }

        // 2) Se houver entrada ativa noutra obra → fechar essa e abrir ENTRADA nesta
        const ultimaAtiva = getUltimaEntradaAtiva(registosDoUtilizador);

        if (ultimaAtiva && String(ultimaAtiva.obra_id) !== String(obraId)) {
            const nomeAnterior = ultimaAtiva.Obra?.nome || 'Obra anterior';
            await registarPontoParaUtilizador('saida', ultimaAtiva.obra_id, nomeAnterior, userId, userName);
            // Reduzir tempo de espera para 200ms
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // 3) Sem ativa ou após fechar anterior → ENTRADA nesta obra
        await registarPontoParaUtilizador('entrada', obraId, nomeObra, userId, userName);
    };

    // Carregar obras disponíveis
    useEffect(() => {
        let isMounted = true;
        
        const fetchObras = async () => {
            try {
                if (!isMounted) return;
                setLoading(true);
                
                const token = localStorage.getItem('loginToken');
                const empresaId = localStorage.getItem('empresa_id');
                
                console.log('🔄 Carregando obras...');
                console.log('Token:', token ? 'Presente' : 'Ausente');
                console.log('Empresa ID:', empresaId);
                
                const res = await fetch('https://backend.advir.pt/api/obra', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok && isMounted) {
                    const data = await res.json();
                    const empresaId = localStorage.getItem('empresa_id');
                    const obrasDaEmpresa = data.filter(o => o.empresa_id == empresaId);
                    setObras(obrasDaEmpresa);

                    // Auto-selecionar se só houver uma obra
                    if (obrasDaEmpresa.length === 1) {
                        setObraSelecionada(obrasDaEmpresa[0].id);
                    }
                }
            } catch (err) {
                console.error('Erro ao carregar obras:', err);
                if (isMounted) {
                    setStatusMessage('Erro ao carregar obras');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchObras();
        
        // Cleanup function para limpar recursos quando componente desmonta
        return () => {
            isMounted = false;
            setIsFacialScanning(false);
            registoLockRef.current = false;
            scanLockRef.current = false;
        };
    }, []);

    // Carregar resumo da obra selecionada
    useEffect(() => {
        let isMounted = true;
        
        const loadResumo = async () => {
            if (obraSelecionada && isMounted) {
                await carregarResumoObra(obraSelecionada);
            } else if (isMounted) {
                setResumoObra({ pessoasAConsultar: 0, entradasSaidas: [] });
            }
        };
        
        loadResumo();
        
        return () => {
            isMounted = false;
        };
    }, [obraSelecionada]);

    const carregarResumoObra = async (obraId) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('loginToken');
            const url = `https://backend.advir.pt/api/registo-ponto-obra/resumo-obra/${obraId}`;

            console.log('🔄 Carregando resumo da obra...');

            const res = await fetch(url, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });

            console.log('📥 Response status:', res.status);
            console.log('📥 Response headers:', Object.fromEntries(res.headers.entries()));

            if (res.ok) {
                const data = await res.json();
                console.log('✅ Resumo da obra carregado:', data);
                console.log('👥 Pessoas a trabalhar:', data.pessoasAConsultar);
                console.log('📋 Entradas/Saídas:', data.entradasSaidas?.length || 0);
                setResumoObra(data);
            } else {
                console.error('❌ Erro ao carregar resumo da obra:', res.status);
                const errorData = await res.text();
                console.error('📋 Detalhes do erro:', errorData);
                setResumoObra({ pessoasAConsultar: 0, entradasSaidas: [] });
            }
        } catch (err) {
            console.error('❌ Erro de rede ao carregar resumo da obra:', err);
            setResumoObra({ pessoasAConsultar: 0, entradasSaidas: [] });
        } finally {
            setLoading(false);
        }
    };

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

    const autenticarERegistarPonto = async (obraId, nomeObra, facialData) => {
        try {
            // Verificar se já está a processar um registo
            if (isRegistering || isProcessingScan) {
                console.log('⚠️ Já está a processar um registo, ignorando nova tentativa');
                return;
            }

            setLoading(true);
            setStatusMessage('A autenticar...');

            // Autenticar utilizador com dados faciais
            const authRes = await fetch('https://backend.advir.pt/api/auth/biometric/authenticate-facial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ facialData })
            });

            if (!authRes.ok) {
                const authError = await authRes.json();
                setStatusMessage(`Falha: ${authError.message || 'Utilizador não reconhecido'}`);
                return;
            }

            const authData = await authRes.json();
            const userId = authData.userId;
            const userName = authData.userNome || authData.username;

            setStatusMessage(`${userName} - A registar...`);

            // Obter registos do dia (chamada em paralelo com validação no backend)
            const token = localStorage.getItem('loginToken');
            const hoje = new Date().toISOString().split('T')[0];
            
            const registosUrl = `https://backend.advir.pt/api/registo-ponto-obra/listar-por-user-periodo?user_id=${userId}&ano=${new Date().getFullYear()}&mes=${String(new Date().getMonth() + 1).padStart(2, '0')}&data=${hoje}`;

            const [registosRes] = await Promise.allSettled([
                fetch(registosUrl, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            let registosUtilizadorIdentificado = [];
            if (registosRes.status === 'fulfilled' && registosRes.value.ok) {
                const data = await registosRes.value.json();
                registosUtilizadorIdentificado = (data.filter ? data.filter(r => r.timestamp && r.timestamp.startsWith(hoje)) : data);
            }

            // Formatar registos de forma simplificada
            const registosFormatados = registosUtilizadorIdentificado.map(reg => ({
                ...reg,
                obra_id: reg.obra_id || reg.obraId,
                timestamp: reg.timestamp || reg.createdAt,
                tipo: reg.tipo,
                User: reg.User || { nome: userName },
                Obra: reg.Obra || { nome: nomeObra }
            }));

            // Processar registo imediatamente
            await processarPontoComValidacaoParaUtilizador(obraId, nomeObra, userId, userName, registosFormatados);

        } catch (err) {
            console.error('❌ Erro:', err);
            setStatusMessage('Erro ao processar registo');
        } finally {
            setLoading(false);
        }
    };

    const processarEntradaComFacial = async (facialData) => {
        if (!obraSelecionada) {
            setStatusMessage('Por favor, selecione uma obra antes de iniciar o reconhecimento facial');
            return;
        }

        const obra = obras.find(o => o.id == obraSelecionada);
        if (!obra) {
            setStatusMessage('Obra selecionada não encontrada');
            return;
        }

        // Usar a nova lógica de validação automática
        await autenticarERegistarPonto(obraSelecionada, obra.nome, facialData);
    };

    const handleStartFacialScan = () => {
        if (!obraSelecionada) {
            alert('Por favor, selecione uma obra antes de iniciar o reconhecimento facial');
            return;
        }

        // Verificar se já está a registar ou a processar scan
        if (isRegistering || isProcessingScan) {
            alert('Aguarde, ainda está a processar o registo anterior...');
            return;
        }

        setIsFacialScanning(true);
        setStatusMessage('Iniciando reconhecimento facial...');
        setFacialScanResult(null);
    };

    const handleStopFacialScan = () => {
        setIsFacialScanning(false);
        setStatusMessage('');
        setFacialScanResult(null);
    };

const handleFacialScanComplete = async (facialData) => {
  console.log('Scan facial completo:', facialData);

  const now = Date.now();
  const timeSinceLastScan = now - lastScanTime;

  // 🔒 evita reentradas imediatas
  if (scanLockRef.current || isRegistering || isProcessingScan || timeSinceLastScan < 5000) {
    console.log('⚠️ Scan ignorado (já a processar ou demasiado recente)');
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
    // Timeout maior para reduzir carga no servidor
    setTimeout(() => {
      scanLockRef.current = false;
      setIsProcessingScan(false);
    }, 2000);
  }
};


    const handleScanFace = () => {
        setShowInstructions(false);
        setScanning(true);
        setCountdown(3);

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setScanning(false);
                    startCapture();
                    return 0;
                } else {
                    return prev - 1;
                }
            });
        }, 1000);
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
        
        // Recarregar apenas o resumo da obra sem refresh da página
        if (obraSelecionada) {
            setTimeout(() => {
                carregarResumoObra(obraSelecionada);
            }, 1000);
        }
    };

    const isPOS = localStorage.getItem('isPOS') === 'true';

    return (
        <div className="container-fluid bg-light min-vh-100 py-2 py-md-4" style={{
            overflowX: 'hidden',
            overflowY: 'auto',
            position: 'relative',
            height: '100vh'
        }}>
            
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to bottom, rgba(227, 242, 253, 0.8), rgba(187, 222, 251, 0.8), rgba(144, 202, 249, 0.8))',
                zIndex: 0
            }}></div>

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
                }
                .btn-facial:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(23, 146, 254, 0.4);
                    color: white;
                }
                .btn-facial:disabled {
                    opacity: 0.6;
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
                .registro-saida {
                    border-left-color: #dc3545;
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
                .result-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                .result-modal {
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    max-width: 400px;
                    width: 90%;
                    padding: 0;
                    overflow: hidden;
                    animation: modalAppear 0.3s ease-out;
                }
                .result-modal-header {
                    padding: 2rem 2rem 1rem 2rem;
                    text-align: center;
                    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                }
                .result-modal-body {
                    padding: 1rem 2rem 2rem 2rem;
                    text-align: center;
                }
                .success-icon {
                    font-size: 3rem;
                    color: #28a745;
                    margin-bottom: 1rem;
                }
                .error-icon {
                    font-size: 3rem;
                    color: #dc3545;
                    margin-bottom: 1rem;
                }
                .modal-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }
                .modal-subtitle {
                    color: #6c757d;
                    margin-bottom: 1rem;
                }
                .modal-close-btn {
                    background: linear-gradient(45deg, #1792FE, #0D7EFE);
                    border: none;
                    border-radius: 25px;
                    padding: 0.75rem 2rem;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    min-width: 120px;
                }
                .modal-close-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(23, 146, 254, 0.4);
                }
                @keyframes modalAppear {
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                @media (max-width: 767px) {
                    .container-fluid {
                        padding-left: 0.75rem;
                        padding-right: 0.75rem;
                    }
                    .result-modal {
                        width: 95%;
                        margin: 1rem;
                    }
                    .result-modal-header,
                    .result-modal-body {
                        padding: 1.5rem 1rem;
                    }
                }
            `}</style>

            {loading && (
                <div className="loading-overlay">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                </div>
            )}

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
                                    <p className="text-muted mb-0 small">Selecione o local e use o reconhecimento facial para identificar o utilizador e registar o seu ponto</p>
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
                                                value={opcoesObras.find(o => o.value == obraSelecionada)}
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
                                                    disabled={!obraSelecionada || loading || isRegistering || isProcessingScan}
                                                >
                                                    <FaCamera className="me-2" />
                                                    <span className="d-none d-sm-inline">
                                                        Identificar e Registar Ponto
                                                    </span>
                                                    <span className="d-sm-none">
                                                        Identificar e Registar
                                                    </span>
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn btn-facial w-100 w-md-auto"
                                                    onClick={handleStopFacialScan}
                                                    disabled={loading || isRegistering || isProcessingScan}
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
                                                <strong>Local Selecionado:</strong> {obras.find(o => o.id == obraSelecionada)?.nome || 'Desconhecida'}
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
                                            </h5>
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <span className="fw-semibold">Pessoas a Trabalhar:</span>
                                                <span className="fs-4 fw-bold text-success">{resumoObra.pessoasAConsultar}</span>
                                            </div>
                                            <hr className="mb-3" />
                                            <h6 className="fw-semibold mb-2">Entradas e Saídas Recentes:</h6>
                                            {resumoObra.entradasSaidas.length > 0 ? (
                                                <ul className="list-unstyled mb-0" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                    {resumoObra.entradasSaidas.map((reg, index) => (
                                                        <li key={index} className={`registro-item ${reg.tipo === 'saida' ? 'registro-saida' : ''} d-flex justify-content-between align-items-center p-2 mb-2`}>
                                                            <div>
                                                                <strong className="d-block">{reg.User?.nome || 'Utilizador Desconhecido'}</strong>
                                                                <small className="text-muted">{new Date(reg.timestamp).toLocaleString()}</small>
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
                t={(key) => key} // Placeholder para traduções
            />

            {/* Modal de Resultado */}
            {showResultModal && (
                <div className="result-modal-overlay" onClick={handleCloseModal}>
                    <div className="result-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="result-modal-header">
                            <div className={modalData.type === 'success' ? 'success-icon' : 'error-icon'}>
                                {modalData.type === 'success' ? (
                                    <FaCheckCircle />
                                ) : (
                                    <FaExclamationCircle />
                                )}
                            </div>
                            <h3 className="modal-title">
                                {modalData.type === 'success' ? 'Sucesso!' : 'Erro!'}
                            </h3>
                            <p className="modal-subtitle">
                                {modalData.userName}
                            </p>
                        </div>
                        <div className="result-modal-body">
                            <p style={{ 
                                fontSize: '1.1rem', 
                                marginBottom: '1.5rem',
                                color: modalData.type === 'success' ? '#28a745' : '#dc3545',
                                fontWeight: '500'
                            }}>
                                {modalData.message}
                            </p>
                            <button 
                                className="modal-close-btn"
                                onClick={handleCloseModal}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegistoPontoFacial;