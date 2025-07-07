import React, { useState, useEffect, useRef } from "react";
import styles from "./Styles/ConcursosAprovacaoStyles";
import ConcursoCard from "./Componentes/ConcursosAprovacao/ConcursoCard";
import ModalDetalhesConcurso from "./Componentes/ConcursosAprovacao/ModalDetalhesConcurso";

const ConcursosAprovacao = () => {
    const [concursos, setConcursos] = useState([]);
    const [concursosFiltrados, setConcursosFiltrados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [concursoSelecionado, setConcursoSelecionado] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [showPullIndicator, setShowPullIndicator] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [actionType, setActionType] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const containerRef = useRef(null);

    const fetchConcursos = async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");

        try {
            const response = await fetch(
                "https://webapiprimavera.advir.pt/routesConcursos/listarConcursos",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Erro: ${response.statusText}`);
            }

            const data = await response.json();

            // Agrupar dados por código do concurso
            const concursosAgrupados = {};

            data.DataSet.Table.forEach((item) => {
                const codigo = item.Codigo;

                if (!concursosAgrupados[codigo]) {
                    concursosAgrupados[codigo] = {
                        codigo: item.Codigo,
                        titulo: item.Titulo,
                        dataProposta: item.DataProposta,
                        precoBase: item.PrecoBase,
                        entidade: item.Nome,
                        dataEntrega: item.DataEntregaPropostas,
                        formaContrato: item.FormaContrato,
                        tipoProposta: item.TipoProposta,
                        zona: item.Zona,
                        tipo: item.TipoObra,
                        criterios: []
                    };
                }

                // Adicionar critério se existir
                if (item.Factor || item.DescricaoCriterio || item.Peso) {
                    const criterio = `${item.Factor || ""} (${item.Peso || 0}%) - ${item.DescricaoCriterio || ""}`;
                    concursosAgrupados[codigo].criterios.push(criterio);
                }
            });

            // Converter para array e formatar critérios
            const formatado = Object.values(concursosAgrupados).map((concurso) => ({
                ...concurso,
                criterios: concurso.criterios.length > 0
                    ? concurso.criterios.join('; ')
                    : "Não especificado"
            }));

            setConcursos(formatado);
            setConcursosFiltrados(formatado);
        } catch (error) {
            setError(
                "Falha ao carregar os concursos. Verifique sua conexão e tente novamente."
            );
            console.error("Erro ao buscar concursos:", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchConcursos();
    }, []);

    useEffect(() => {
        if (searchTerm.trim() === "") {
            setConcursosFiltrados(concursos);
        } else {
            const filtered = concursos.filter((concurso) => {
                const searchLower = searchTerm.toLowerCase();
                return (
                    (concurso.titulo &&
                        concurso.titulo.toLowerCase().includes(searchLower)) ||
                    (concurso.codigo &&
                        concurso.codigo.toLowerCase().includes(searchLower)) ||
                    (concurso.entidade &&
                        concurso.entidade.toLowerCase().includes(searchLower)) ||
                    (concurso.zona &&
                        concurso.zona.toLowerCase().includes(searchLower))
                );
            });
            setConcursosFiltrados(filtered);
        }
    }, [searchTerm, concursos]);

    // Bloqueia scroll do body quando modal estiver aberto
    useEffect(() => {
        if (modalVisible) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => (document.body.style.overflow = "auto");
    }, [modalVisible]);

    const abrirModal = (concurso) => {
        setConcursoSelecionado(concurso);
        setModalVisible(true);
    };

    const handleApprove = (concurso) => {
        setConfirmAction(() => () => executeApprove(concurso));
        setActionType('approve');
        setShowConfirmModal(true);
    };

    const executeApprove = async (concurso) => {
        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");

        const payload = {
            Id: concurso.codigo,
            Responsavel: localStorage.getItem("username") || "Admin",
            Titulo: concurso.titulo,
        };

        try {
            const response = await fetch(
                "https://webapiprimavera.advir.pt/routesConcursos/Aprovar",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        urlempresa: urlempresa,
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (response.ok) {
                setSuccessMessage(`Concurso "${concurso.titulo}" aprovado com sucesso!`);
                setTimeout(() => setSuccessMessage(''), 4000);
                await fetchConcursos();
            } else {
                setError("Erro ao aprovar concurso. Tente novamente.");
            }
        } catch (error) {
            console.error("Erro ao aprovar concurso:", error);
            setError("Erro ao aprovar concurso. Tente novamente.");
        }

        setModalVisible(false);
        setShowConfirmModal(false);
    };

    const handleReject = (concurso) => {
        setConfirmAction(() => () => executeReject(concurso));
        setActionType('reject');
        setShowConfirmModal(true);
    };

    const executeReject = async (concurso) => {
        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");

        const payload = {
            Id: concurso.codigo,
            Responsavel: localStorage.getItem("username") || "Admin",
        };

        try {
            const response = await fetch(
                "https://webapiprimavera.advir.pt/routesConcursos/Recusar",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        urlempresa: urlempresa,
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (response.ok) {
                setSuccessMessage(`Concurso "${concurso.titulo}" recusado com sucesso!`);
                setTimeout(() => setSuccessMessage(''), 4000);
                await fetchConcursos();
            } else {
                setError("Erro ao recusar concurso. Tente novamente.");
            }
        } catch (error) {
            console.error("Erro ao recusar concurso:", error);
            setError("Erro ao recusar concurso. Tente novamente.");
        }

        setModalVisible(false);
        setShowConfirmModal(false);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const clearSearch = () => {
        setSearchTerm("");
    };

    // Pull to refresh functionality
    const handleTouchStart = (e) => {
        if (window.scrollY === 0) {
            const startY = e.touches[0].clientY;
            containerRef.current.startY = startY;
        }
    };

    const handleTouchMove = (e) => {
        if (window.scrollY === 0 && containerRef.current.startY) {
            const currentY = e.touches[0].clientY;
            const distance = Math.max(0, currentY - containerRef.current.startY);

            if (distance > 10) {
                setPullDistance(distance);
                setShowPullIndicator(true);
            }
        }
    };

    const handleTouchEnd = () => {
        if (pullDistance > 80 && !isRefreshing) {
            fetchConcursos(true);
        }
        containerRef.current.startY = null;
        setPullDistance(0);
        setShowPullIndicator(false);
    };

    // Setup proper event listeners with passive: false when needed
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener("touchstart", handleTouchStart, {
            passive: true,
        });
        container.addEventListener("touchmove", handleTouchMove, {
            passive: true,
        });
        container.addEventListener("touchend", handleTouchEnd, {
            passive: true,
        });

        return () => {
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchmove", handleTouchMove);
            container.removeEventListener("touchend", handleTouchEnd);
        };
    }, [pullDistance, isRefreshing]);

    // Mouse events for desktop
    const handleMouseDown = (e) => {
        if (window.scrollY === 0 && e.button === 0) {
            containerRef.current.startY = e.clientY
        }
    };

    const handleMouseMove = (e) => {
        if (window.scrollY === 0 && containerRef.current.startY && e.buttons === 1) {
            const distance = Math.max(0, e.clientY - containerRef.current.startY);

            if (distance > 10) {
                setPullDistance(distance);
                setShowPullIndicator(true);
            }
        }
    };

    const handleMouseUp = () => {
        if (pullDistance > 80 && !isRefreshing) {
            fetchConcursos(true);
        }
        containerRef.current.startY = null;
        setPullDistance(0);
        setShowPullIndicator(false);
    };

    return (
        <div
            ref={containerRef}
            style={styles.container}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
                // Reset pull state when mouse leaves container
                containerRef.current.startY = null;
                setPullDistance(0);
                setShowPullIndicator(false);
            }}
        >
            {/* Pull to refresh indicator */}
            {(showPullIndicator || isRefreshing) && (
                <div
                    style={{
                        ...styles.pullIndicator,
                        transform: `translateY(${Math.min(pullDistance, 100)}px)`,
                        opacity: isRefreshing ? 1 : Math.min(pullDistance / 80, 1),
                    }}
                >
                    <div
                        style={{
                            ...styles.pullIcon,
                            transform: isRefreshing
                                ? "rotate(360deg)"
                                : `rotate(${pullDistance * 2}deg)`,
                        }}
                    >
                        {isRefreshing ? "🔄" : "↓"}
                    </div>
                    <span style={styles.pullText}>
                        {isRefreshing
                            ? "Atualizando..."
                            : pullDistance > 80
                                ? "Solte para atualizar"
                                : "Puxe para atualizar"}
                    </span>
                </div>
            )}

            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>Concursos a Concorrer</h1>
                <p style={styles.subtitle}>
                    Gerencie e avalie os concursos disponíveis para sua empresa
                </p>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div style={styles.successMessage}>
                    <span style={styles.successIcon}>✅</span>
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Search */}
            <div style={styles.searchContainer}>
                <span style={styles.searchIcon}>🔍</span>
                <input
                    type="text"
                    placeholder="Pesquisar por título, código, entidade ou zona..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    style={{
                        ...styles.searchInput,
                        borderColor: searchTerm ? "#3b82f6" : "#e2e8f0",
                    }}
                />
                {searchTerm && (
                    <button
                        onClick={clearSearch}
                        style={{
                            position: "absolute",
                            right: "0.75rem",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            fontSize: "1.25rem",
                            cursor: "pointer",
                            color: "#666",
                        }}
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Loading */}
            {loading && (
                <div style={styles.loadingContainer}>
                    <div style={styles.loadingSpinner}></div>
                    <p>Carregando concursos...</p>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div style={styles.errorContainer}>
                    <p>⚠️ {error}</p>
                    <button
                        onClick={() => fetchConcursos()}
                        style={{
                            marginTop: "0.5rem",
                            padding: "0.5rem 1rem",
                            backgroundColor: "#dc2626",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                        }}
                    >
                        Tentar Novamente
                    </button>
                </div>
            )}

            {/* Content */}
            {!loading && !error && (
                <div style={styles.listaConcursos}>
                    {concursosFiltrados.length === 0 && searchTerm && (
                        <div style={styles.semConcursos}>
                            <p>
                                📭 Nenhum concurso encontrado para "{searchTerm}"
                            </p>
                            <button
                                onClick={clearSearch}
                                style={{
                                    marginTop: "1rem",
                                    padding: "0.5rem 1rem",
                                    backgroundColor: "#2563eb",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                }}
                            >
                                Limpar Pesquisa
                            </button>
                        </div>
                    )}

                    {concursosFiltrados.length === 0 && !searchTerm && (
                        <div style={styles.semConcursos}>
                            <p>📋 Nenhum concurso disponível no momento.</p>
                            <p
                                style={{
                                    fontSize: "0.9rem",
                                    marginTop: "0.5rem",
                                }}
                            >
                                Novos concursos aparecerão aqui quando estiverem
                                disponíveis.
                            </p>
                        </div>
                    )}

                    {concursosFiltrados.map((concurso, index) => (
                        <ConcursoCard
                            key={`${concurso.codigo}-${index}`}
                            concurso={concurso}
                            onClick={() => abrirModal(concurso)}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            <ModalDetalhesConcurso
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                concurso={concursoSelecionado}
                onApprove={handleApprove}
                onReject={handleReject}
            />

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div style={styles.confirmOverlay}>
                    <div style={styles.confirmModal}>
                        <div style={styles.confirmHeader}>
                            <span style={styles.confirmIcon}>
                                {actionType === 'approve' ? '✅' : '❌'}
                            </span>
                            <h3 style={styles.confirmTitle}>
                                {actionType === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Recusa'}
                            </h3>
                        </div>

                        <div style={styles.confirmContent}>
                            <p style={styles.confirmMessage}>
                                Tem certeza que deseja {actionType === 'approve' ? 'aprovar' : 'recusar'} este concurso?
                            </p>
                            <p style={styles.confirmDetail}>
                                <strong>{concursoSelecionado?.titulo}</strong>
                            </p>
                            <p style={styles.confirmWarning}>
                                Esta ação não pode ser desfeita.
                            </p>
                        </div>

                        <div style={styles.confirmActions}>
                            <button
                                style={styles.confirmCancelButton}
                                onClick={() => setShowConfirmModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                style={{
                                    ...styles.confirmActionButton,
                                    backgroundColor: actionType === 'approve' ? '#16a34a' : '#dc2626'
                                }}
                                onClick={confirmAction}
                            >
                                {actionType === 'approve' ? 'Aprovar' : 'Recusar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConcursosAprovacao;