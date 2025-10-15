
import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaFileAlt, FaCheckCircle, FaTimesCircle, FaClock, FaSync } from 'react-icons/fa';
import { motion } from 'framer-motion';

const Ausencias = () => {
    const [ausencias, setAusencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroTipo, setFiltroTipo] = useState('TODAS');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');

    const token = localStorage.getItem('loginToken');
    const empresaId = localStorage.getItem('empresa_id');
    const codFuncionario = localStorage.getItem('codFuncionario');

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
            }
        } catch (error) {
            console.error('Erro ao carregar ausências:', error);
        } finally {
            setLoading(false);
        }
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
        <div className="container-fluid bg-light min-vh-100 py-4" style={{
            background: 'linear-gradient(to bottom, #e3f2fd, #bbdefb, #90caf9)'
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
                                                    <small className="text-muted">
                                                        Criado em: {formatarData(ausencia.dataCriacao)}
                                                    </small>
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
        </div>
    );
};

export default Ausencias;
