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
    const [pullStartY, setPullStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [showPullIndicator, setShowPullIndicator] = useState(false);
    const containerRef = useRef(null);

    // Função para buscar concursos
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
                },
            );

            if (!response.ok) {
                throw new Error(`Erro: ${response.statusText}`);
            }

            const data = await response.json();

            const formatado = data.DataSet.Table.map((item) => ({
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
                criterios: `${item.Factor || ""} (${item.Peso || 0}%) - ${item.DescricaoCriterio || ""}`,
            }));

            setConcursos(formatado);
            setConcursosFiltrados(formatado);
        } catch (error) {
            setError(
                "Falha ao carregar os concursos. Verifique sua conexão e tente novamente.",
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

    // Filter concursos based on search term
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setConcursosFiltrados(concursos);
        } else {
            const filtered = concursos.filter(
                (concurso) => {
                    const searchLower = searchTerm.toLowerCase();
                    return (
                        (concurso.titulo && concurso.titulo.toLowerCase().includes(searchLower)) ||
                        (concurso.codigo && concurso.codigo.toLowerCase().includes(searchLower)) ||
                        (concurso.entidade && concurso.entidade.toLowerCase().includes(searchLower)) ||
                        (concurso.zona && concurso.zona.toLowerCase().includes(searchLower))
                    );
                }
            );
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

    const handleApprove = async (concurso) => {
        console.log("Aprovado:", concurso);

        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");

        const payload = {
            Id: concurso.codigo,
            Responsavel: localStorage.getItem("username") || "Admin",
            Titulo: concurso.titulo,
        };
        console.log(payload);

        try {
            const response = await fetch(
                `https://webapiprimavera.advir.pt/routesConcursos/Aprovar`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        urlempresa: urlempresa,
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                alert(`Concurso ${concurso.titulo} aprovado!`);
                // Atualizar a lista após aprovação
                await fetchConcursos();
            } else {
                alert("Erro ao aprovar concurso. Tente novamente mais tarde.");
            }
        } catch (error) {
            console.error("Erro ao aprovar concurso:", error);
            alert("Erro ao aprovar concurso. Tente novamente mais tarde.");
        }

        setModalVisible(false);
    };

    const handleReject = async (concurso) => {
        console.log("Recusado:", concurso);

        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");

        const payload = {
            Id: concurso.codigo,
            Responsavel: localStorage.getItem("username") || "Admin",
        };
        console.log(payload);

        try {
            const response = await fetch(
                `https://webapiprimavera.advir.pt/routesConcursos/Recusar`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        urlempresa: urlempresa,
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                alert(`Concurso ${concurso.titulo} recusado.`);
                // Atualizar a lista após recusa
                await fetchConcursos();
            } else {
                alert("Erro ao recusar concurso. Tente novamente mais tarde.");
            }
        } catch (error) {
            console.error("Erro ao Recusar concurso:", error);
            alert("Erro ao Recusar concurso. Tente novamente mais tarde.");
        }

        setModalVisible(false);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const clearSearch = () => {
        setSearchTerm("");
    };

    // Pull-to-refresh handlers
    const handleTouchStart = (e) => {
        if (window.scrollY === 0) {
            setPullStartY(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e) => {
        if (pullStartY > 0 && window.scrollY === 0) {
            const currentY = e.touches[0].clientY;
            const distance = Math.max(0, currentY - pullStartY);

            if (distance > 10) {
                setPullDistance(distance);
                setShowPullIndicator(true);

                // Only prevent default when actively pulling down and event is cancelable
                if (distance > 80 && e.cancelable) {
                    e.preventDefault();
                }
            }
        }
    };

    const handleTouchEnd = () => {
        if (pullDistance > 80 && !isRefreshing) {
            fetchConcursos(true);
        }
        setPullStartY(0);
        setPullDistance(0);
        setShowPullIndicator(false);
    };

    // Setup proper event listeners with passive: false when needed
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const options = { passive: false };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, options);
        container.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pullStartY, pullDistance, isRefreshing]);

    // Mouse events for desktop
    const handleMouseDown = (e) => {
        if (window.scrollY === 0 && e.button === 0) {
            setPullStartY(e.clientY);
        }
    };

    const handleMouseMove = (e) => {
        if (pullStartY > 0 && window.scrollY === 0 && e.buttons === 1) {
            const distance = Math.max(0, e.clientY - pullStartY);

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
        setPullStartY(0);
        setPullDistance(0);
        setShowPullIndicator(false);
    };

    return (
        <div
            ref={containerRef}
            style={styles.container}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
                // Reset pull state when mouse leaves container
                setPullStartY(0);
                setPullDistance(0);
                setShowPullIndicator(false);
            }}
        >
            {/* Pull to Refresh Indicator */}
            {(showPullIndicator || isRefreshing) && (
                <div
                    style={{
                        ...styles.pullIndicator,
                        transform: `translateY(${Math.min(pullDistance, 100)}px)`,
                        opacity: isRefreshing
                            ? 1
                            : Math.min(pullDistance / 80, 1),
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

            {/* Header Section */}
            <div style={styles.header}>
                <h1 style={styles.title}>Concursos a Concorrer</h1>
                <p style={styles.subtitle}>
                    Gerencie e avalie os concursos disponíveis para sua empresa
                </p>
            </div>

            {/* Search Bar */}
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
                            fontSize: "1.2rem",
                            cursor: "pointer",
                            color: "#64748b",
                            padding: "0.25rem",
                            borderRadius: "50%",
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Loading State */}
            {loading && (
                <div style={styles.loadingContainer}>
                    <div style={styles.loadingSpinner}></div>
                    <p>Carregando concursos...</p>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div style={styles.errorContainer}>
                    <p>⚠️ {error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: "0.5rem",
                            padding: "0.5rem 1rem",
                            backgroundColor: "#dc2626",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                        }}
                    >
                        Tentar Novamente
                    </button>
                </div>
            )}

            {/* Concursos Grid */}
            {!loading && !error && (
                <div style={styles.listaConcursos} className="concursos-grid">
                    {concursosFiltrados.length === 0 && searchTerm && (
                        <div style={styles.semConcursos}>
                            <p>
                                📭 Nenhum concurso encontrado para "{searchTerm}
                                "
                            </p>
                            <button
                                onClick={clearSearch}
                                style={{
                                    marginTop: "1rem",
                                    padding: "0.5rem 1rem",
                                    backgroundColor: "#3b82f6",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
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
        </div>
    );
};

export default ConcursosAprovacao;
