
import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaFileAlt, FaCheckCircle, FaTimesCircle, FaClock, FaSync, FaPaperclip, FaTrash, FaDownload } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { secureStorage } from '../../utils/secureStorage';

const Ausencias = () => {
    const [ausencias, setAusencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroTipo, setFiltroTipo] = useState('TODAS');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [uploadingAnexo, setUploadingAnexo] = useState(false);
    const [anexosPorFalta, setAnexosPorFalta] = useState({});
    const [mostrarModalAnexo, setMostrarModalAnexo] = useState(false);
    const [faltaSelecionada, setFaltaSelecionada] = useState(null);

    const token = secureStorage.getItem('loginToken');
    const empresaId = secureStorage.getItem('empresa_id');
    const codFuncionario = secureStorage.getItem('codFuncionario');

    useEffect(() => {
        carregarAusencias();
    }, []);

    const carregarAusencias = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `https://backend.advir.pt/api/faltas-ferias/aprovacao/minha-lista`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'urlempresa': empresaId,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                // Filtrar apenas os pedidos do funcionário logado
                const minhasAusencias = data.filter(
                    (pedido) => pedido.funcionario === codFuncionario
                );
                setAusencias(minhasAusencias);
                
                // Carregar anexos para cada ausência
                minhasAusencias.forEach(ausencia => {
                    carregarAnexosDaFalta(ausencia.id);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar ausências:', error);
        } finally {
            setLoading(false);
        }
    };

    const carregarAnexosDaFalta = async (faltaId) => {
        try {
            const response = await fetch(
                `https://backend.advir.pt/api/anexo-falta/falta/${faltaId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setAnexosPorFalta(prev => ({
                    ...prev,
                    [faltaId]: data.anexos || []
                }));
            }
        } catch (error) {
            console.error('Erro ao carregar anexos:', error);
        }
    };

    const handleUploadAnexo = async (event, faltaId) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('Ficheiro demasiado grande. Máximo 10MB.');
            event.target.value = '';
            return;
        }

        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type)) {
            alert('Tipo de ficheiro não permitido. Use: JPG, PNG, GIF, PDF, DOC, DOCX ou TXT.');
            event.target.value = '';
            return;
        }

        setUploadingAnexo(true);
        const formData = new FormData();
        formData.append('arquivo', file);

        try {
            // Upload temporário
            const uploadRes = await fetch('https://backend.advir.pt/api/anexo-falta/upload-temp', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!uploadRes.ok) {
                throw new Error('Erro no upload temporário');
            }

            const uploadData = await uploadRes.json();

            // Associar ao pedido
            const associarRes = await fetch('https://backend.advir.pt/api/anexo-falta/associar-temp', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pedido_falta_id: faltaId,
                    anexos_temp: [uploadData.arquivo_temp]
                })
            });

            if (!associarRes.ok) {
                throw new Error('Erro ao associar anexo');
            }

            alert('Anexo adicionado com sucesso!');
            carregarAnexosDaFalta(faltaId);
            event.target.value = '';
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            alert('Erro ao fazer upload do anexo');
        } finally {
            setUploadingAnexo(false);
        }
    };

    const handleDownloadAnexo = async (anexoId) => {
        try {
            const response = await fetch(
                `https://backend.advir.pt/api/anexo-falta/download/${anexoId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `anexo_${anexoId}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Erro ao fazer download:', error);
            alert('Erro ao fazer download do anexo');
        }
    };

    const handleDeletarAnexo = async (anexoId, faltaId) => {
        if (!window.confirm('Deseja realmente eliminar este anexo?')) return;

        try {
            const response = await fetch(
                `https://backend.advir.pt/api/anexo-falta/${anexoId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                alert('Anexo eliminado com sucesso!');
                carregarAnexosDaFalta(faltaId);
            }
        } catch (error) {
            console.error('Erro ao eliminar anexo:', error);
            alert('Erro ao eliminar anexo');
        }
    };

    const abrirModalAnexos = (ausencia) => {
        setFaltaSelecionada(ausencia);
        setMostrarModalAnexo(true);
    };

    const formatarData = (data) => {
        if (!data) return '-';
        return new Date(data).toLocaleDateString('pt-PT');
    };

    const getEstadoBadge = (estado) => {
        switch (estado) {
            case 'Aprovado':
                return { color: 'success', icon: <FaCheckCircle /> };
            case 'Rejeitado':
                return { color: 'danger', icon: <FaTimesCircle /> };
            default:
                return { color: 'warning', icon: <FaClock /> };
        }
    };

    const ausenciasFiltradas = ausencias.filter((ausencia) => {
        const filtroTipoOk = filtroTipo === 'TODAS' || ausencia.tipoPedido === filtroTipo;
        const filtroEstadoOk = filtroEstado === 'TODOS' || ausencia.estadoAprovacao === filtroEstado;
        return filtroTipoOk && filtroEstadoOk;
    });

    return (
        <div className="container-fluid bg-light py-4" style={{
            background: 'linear-gradient(to bottom, #e3f2fd, #bbdefb, #90caf9)',
            minHeight: '100vh',
            maxHeight: '100vh',
            overflowY: 'auto',
            overflowX: 'hidden'
        }}>
            <style jsx>{`
                .card-moderno {
                    border-radius: 15px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    border: none;
                    margin-bottom: 1rem;
                    transition: all 0.3s ease;
                }
                .card-moderno:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }
                .ausencia-card {
                    transition: all 0.3s ease;
                }
                .ausencia-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(212, 228, 255, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
            `}</style>

            {loading && (
                <div className="loading-overlay">
                    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                </div>
            )}

            <div className="row justify-content-center">
                <div className="col-12 col-xl-11">
                    {/* Header */}
                    <div className="card card-moderno mb-4">
                        <div className="card-body text-center py-4">
                            <h1 className="h3 mb-2 text-primary">
                                <FaCalendarAlt className="me-3" />
                                Minhas Ausências
                            </h1>
                            <p className="text-muted mb-0">
                                Acompanhe suas faltas e férias
                            </p>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="card card-moderno mb-4">
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Tipo de Ausência</label>
                                    <select
                                        className="form-select"
                                        value={filtroTipo}
                                        onChange={(e) => setFiltroTipo(e.target.value)}
                                    >
                                        <option value="TODAS">Todas</option>
                                        <option value="FALTA">Faltas</option>
                                        <option value="FERIAS">Férias</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Estado</label>
                                    <select
                                        className="form-select"
                                        value={filtroEstado}
                                        onChange={(e) => setFiltroEstado(e.target.value)}
                                    >
                                        <option value="TODOS">Todos</option>
                                        <option value="Pendente">Pendentes</option>
                                        <option value="Aprovado">Aprovados</option>
                                        <option value="Rejeitado">Rejeitados</option>
                                    </select>
                                </div>
                            </div>
                            <div className="text-end mt-3">
                                <button
                                    className="btn btn-outline-primary rounded-pill"
                                    onClick={carregarAusencias}
                                    disabled={loading}
                                >
                                    <FaSync className={loading ? 'fa-spin' : ''} />
                                    <span className="ms-2">Atualizar</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Ausências */}
                    <div className="row g-3">
                        {ausenciasFiltradas.length === 0 ? (
                            <div className="col-12">
                                <div className="card card-moderno">
                                    <div className="card-body text-center py-5">
                                        <FaFileAlt className="text-muted mb-3" size={48} />
                                        <h6 className="text-muted">Nenhuma ausência encontrada</h6>
                                        <p className="text-muted small mb-0">
                                            Não há registos de ausências com os filtros selecionados.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            ausenciasFiltradas.map((ausencia, index) => {
                                const estadoBadge = getEstadoBadge(ausencia.estadoAprovacao);
                                return (
                                    <div key={ausencia.id} className="col-12 col-md-6 col-lg-4">
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.05 }}
                                            className="card ausencia-card card-moderno h-100"
                                        >
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between align-items-start mb-3">
                                                    <div>
                                                        <span className={`badge bg-${ausencia.tipoPedido === 'FALTA' ? 'danger' : 'primary'}`}>
                                                            {ausencia.tipoPedido === 'FALTA' ? '🚫 FALTA' : '🌴 FÉRIAS'}
                                                        </span>
                                                    </div>
                                                    <span className={`badge bg-${estadoBadge.color}`}>
                                                        {estadoBadge.icon}
                                                        <span className="ms-1">{ausencia.estadoAprovacao}</span>
                                                    </span>
                                                </div>

                                                <div className="border-start border-primary border-3 ps-3">
                                                    {ausencia.tipoPedido === 'FALTA' ? (
                                                        <>
                                                            <div className="mb-2">
                                                                <small className="text-muted">Data:</small>
                                                                <div className="fw-semibold">{formatarData(ausencia.dataPedido)}</div>
                                                            </div>
                                                            <div className="mb-2">
                                                                <small className="text-muted">Tipo de Falta:</small>
                                                                <div className="fw-semibold">{ausencia.falta}</div>
                                                            </div>
                                                            <div className="mb-2">
                                                                <small className="text-muted">Duração:</small>
                                                                <div className="fw-semibold">
                                                                    {ausencia.tempo} {ausencia.horas ? 'hora(s)' : 'dia(s)'}
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="mb-2">
                                                                <small className="text-muted">Período:</small>
                                                                <div className="fw-semibold">
                                                                    {formatarData(ausencia.dataInicio)} - {formatarData(ausencia.dataFim)}
                                                                </div>
                                                            </div>
                                                            <div className="mb-2">
                                                                <small className="text-muted">Duração:</small>
                                                                <div className="fw-semibold">{ausencia.duracao || '-'} dias</div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {ausencia.justificacao && (
                                                    <div className="mt-3">
                                                        <small className="text-muted fw-semibold">Justificação:</small>
                                                        <div className="bg-light rounded p-2 mt-1 small">
                                                            {ausencia.justificacao}
                                                        </div>
                                                    </div>
                                                )}

                                                {ausencia.observacoesResposta && (
                                                    <div className="mt-3">
                                                        <small className="text-muted fw-semibold">Resposta:</small>
                                                        <div className="bg-light rounded p-2 mt-1 small">
                                                            {ausencia.observacoesResposta}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="mt-3 pt-3 border-top">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <small className="text-muted">
                                                            Criado em: {formatarData(ausencia.dataCriacao)}
                                                        </small>
                                                        <button
                                                            className="btn btn-sm btn-outline-primary rounded-pill"
                                                            onClick={() => abrirModalAnexos(ausencia)}
                                                        >
                                                            <FaPaperclip className="me-1" />
                                                            Anexos ({anexosPorFalta[ausencia.id]?.length || 0})
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Anexos */}
            {mostrarModalAnexo && faltaSelecionada && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">
                                    <FaPaperclip className="me-2" />
                                    Anexos - {faltaSelecionada.tipoPedido === 'FALTA' ? 'Falta' : 'Férias'}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setMostrarModalAnexo(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-4">
                                    <label className="form-label fw-semibold">Adicionar novo anexo</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        onChange={(e) => handleUploadAnexo(e, faltaSelecionada.id)}
                                        disabled={uploadingAnexo}
                                        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
                                    />
                                    {uploadingAnexo && (
                                        <small className="text-muted">
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            A carregar...
                                        </small>
                                    )}
                                    <small className="text-muted d-block mt-1">
                                        Tipos permitidos: JPG, PNG, GIF, PDF, DOC, DOCX, TXT (máx. 10MB)
                                    </small>
                                </div>

                                <div className="border-top pt-3">
                                    <h6 className="mb-3">Anexos existentes:</h6>
                                    {anexosPorFalta[faltaSelecionada.id]?.length > 0 ? (
                                        <div className="list-group">
                                            {anexosPorFalta[faltaSelecionada.id].map((anexo) => (
                                                <div key={anexo.id} className="list-group-item d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <FaFileAlt className="me-2 text-primary" />
                                                        <strong>{anexo.nome_arquivo}</strong>
                                                        <small className="text-muted ms-2">
                                                            ({(anexo.tamanho / 1024).toFixed(2)} KB)
                                                        </small>
                                                    </div>
                                                    <div>
                                                        <button
                                                            className="btn btn-sm btn-outline-primary me-2"
                                                            onClick={() => handleDownloadAnexo(anexo.id)}
                                                        >
                                                            <FaDownload />
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => handleDeletarAnexo(anexo.id, faltaSelecionada.id)}
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted text-center py-3">Nenhum anexo adicionado</p>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setMostrarModalAnexo(false)}
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ausencias;
