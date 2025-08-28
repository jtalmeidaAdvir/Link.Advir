
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
    FaUsers,
    FaUserCheck
} from 'react-icons/fa';
import Select from 'react-select';
import InvisibleFacialScanner from '../Autenticacao/components/InvisibleFacialScanner';
import { useAppStateRefresh } from '../Autenticacao/utils/useAppStateRefresh';
import { useEnsureValidTokens } from '../../utils/useEnsureValidTokens';
import backgroundImage from '../../../images/ImagemFundo.png';

const RegistoPontoFacial = (props) => {
    const [registos, setRegistos] = useState([]);
    const [obras, setObras] = useState([]);
    const [obraSelecionada, setObraSelecionada] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFacialScanning, setIsFacialScanning] = useState(false);
    const [facialScanResult, setFacialScanResult] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');

    const opcoesObras = obras.map(obra => ({
        value: obra.id,
        label: obra.nome
    }));

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
            setStatusMessage(`A registar ponto ${tipo} para ${userName} na obra "${nomeObra}"...`);

            // Obter localização
            const loc = await getCurrentLocation();
            const token = localStorage.getItem('loginToken');
            const empresaNome = localStorage.getItem('empresa_areacliente');

            // Registar ponto para o utilizador identificado
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
                    longitude: loc.coords.longitude,
                    targetUserId: userId,
                    empresa: empresaNome
                })
            });

            if (res.ok) {
                const data = await res.json();
                setStatusMessage(`Ponto "${tipo}" registado com sucesso para ${userName} na obra "${nomeObra}"`);
            } else {
                const errorData = await res.json();
                setStatusMessage(`Erro ao registar ponto: ${errorData.message || 'Erro desconhecido'}`);
            }
        } catch (err) {
            console.error('Erro ao registar ponto:', err);
            setStatusMessage('Erro ao registar ponto');
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

                    // Auto-selecionar se só houver uma obra
                    if (obrasDaEmpresa.length === 1) {
                        setObraSelecionada(obrasDaEmpresa[0].id);
                    }
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

    // Não carregamos registos para exibição - apenas processamos quando necessário

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
            setLoading(true);
            setStatusMessage('A autenticar utilizador pelo reconhecimento facial...');

            // Primeiro, autenticar o utilizador com os dados faciais
            const authRes = await fetch('https://backend.advir.pt/api/auth/biometric/authenticate-facial', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ facialData })
            });

            if (!authRes.ok) {
                const authError = await authRes.json();
                setStatusMessage(`Falha na autenticação facial: ${authError.message || 'Utilizador não reconhecido'}`);
                return;
            }

            const authData = await authRes.json();
            const userId = authData.userId;
            const userName = authData.userNome || authData.username;

            setStatusMessage(`Utilizador identificado: ${userName}. A verificar estado atual...`);

            // Obter registos do utilizador identificado para o dia
            const token = localStorage.getItem('loginToken');
            const hoje = new Date().toISOString().split('T')[0];

            const registosRes = await fetch(`https://backend.advir.pt/api/registo-ponto-obra/listar-dia?data=${hoje}&userId=${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            let registosUtilizador = [];
            if (registosRes.ok) {
                registosUtilizador = await registosRes.json();
            }

            // Processar com validação automática
            await processarPontoComValidacao(obraId, nomeObra, userId, userName, registosUtilizador);

        } catch (err) {
            console.error('Erro na autenticação facial e registo de ponto:', err);
            setStatusMessage('Erro ao processar reconhecimento facial e registo de ponto');
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
        setFacialScanResult(facialData);
        setIsFacialScanning(false);
        
        // Processar o registo automaticamente
        await processarEntradaComFacial(facialData);
    };

    return (
        <div className="container-fluid bg-light min-vh-100 py-2 py-md-4" style={{ 
            overflowX: 'hidden',
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
                @media (max-width: 767px) {
                    .container-fluid {
                        padding-left: 0.75rem;
                        padding-right: 0.75rem;
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

            <div style={{ position: 'relative', zIndex: 1 }}>
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
                                    <p className="text-muted mb-0 small">Selecione a obra e use o reconhecimento facial para identificar o utilizador e registar o seu ponto</p>
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
                                            <label className="form-label fw-semibold">Selecionar Obra</label>
                                            <Select
                                                options={opcoesObras}
                                                value={opcoesObras.find(o => o.value == obraSelecionada)}
                                                onChange={(opcao) => setObraSelecionada(opcao?.value || '')}
                                                placeholder="Escolha a obra para registar o ponto..."
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
                                                    disabled={!obraSelecionada || loading}
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
                                                    disabled={loading}
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
                                                <strong>Obra Selecionada:</strong> {obras.find(o => o.id == obraSelecionada)?.nome || 'Desconhecida'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            

                        </div>
                        
                    </div>
                </div>
            </div>

            {/* Scanner Facial Invisível */}
            <InvisibleFacialScanner
                onScanComplete={handleFacialScanComplete}
                isScanning={isFacialScanning}
                onStartScan={handleStartFacialScan}
                onStopScan={handleStopFacialScan}
                t={(key) => key} // Placeholder para traduções
            />
        </div>
    );
};

export default RegistoPontoFacial;
