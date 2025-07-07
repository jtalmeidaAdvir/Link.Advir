import React, { useState } from "react";
import styles from "../../Styles/ConcursosAprovacaoStyles";

const formatDate = (dataISO) => {
    if (!dataISO) return "-";
    const data = new Date(dataISO);
    return data.toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const formatCurrency = (value) => {
    if (!value) return "€ 0,00";
    return new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
    }).format(value);
};

const getUrgencyStatus = (dataEntrega) => {
    if (!dataEntrega)
        return { text: "Sem data", color: "#64748b", bg: "#f1f5f9" };

    const data = new Date(dataEntrega);
    const hoje = new Date();
    const diffTime = data - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: "Expirado", color: "#dc2626", bg: "#fef2f2" };
    } else if (diffDays <= 3) {
        return { text: "Muito Urgente", color: "#dc2626", bg: "#fef2f2" };
    } else if (diffDays <= 7) {
        return { text: "Urgente", color: "#ea580c", bg: "#fff7ed" };
    } else if (diffDays <= 14) {
        return { text: "Moderado", color: "#d97706", bg: "#fffbeb" };
    } else {
        return { text: "Normal", color: "#059669", bg: "#ecfdf5" };
    }
};

const ConcursoCard = ({ concurso, onClick }) => {
    const [hover, setHover] = useState(false);
    const urgencyStatus = getUrgencyStatus(concurso.dataEntrega);

    const handleKeyPress = (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyPress={handleKeyPress}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                ...styles.concursoCard,
                ...(hover ? {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
                    border: "1px solid #3b82f6",
                } : {}),
            }}
            className="concursos-card"
            aria-label={`Concurso ${concurso.titulo}`}
        >
            {/* Header with title and status */}
            <div style={styles.concursoHeader}>
                <h3 style={styles.concursoTitulo}>{concurso.titulo}</h3>
                <div
                    style={{
                        ...styles.concursoStatus,
                        backgroundColor: urgencyStatus.bg,
                        color: urgencyStatus.color,
                    }}
                >
                    {urgencyStatus.text}
                </div>
            </div>

            {/* Content */}
            <div style={styles.concursoContent}>
                <div style={styles.concursoInfo}>
                    <span style={styles.concursoInfoIcon}>🏢</span>
                    <span style={styles.concursoInfoLabel}>Código:</span>
                    <span style={styles.concursoInfoValue}>
                        {concurso.codigo.replace("", "í")}
                    </span>
                </div>

                <div style={styles.concursoInfo}>
                    <span style={styles.concursoInfoIcon}>🏛️</span>
                    <span style={styles.concursoInfoLabel}>Entidade:</span>
                    <span style={styles.concursoInfoValue}>
                        {concurso.entidade || "Não especificado"}
                    </span>
                </div>

                <div style={styles.concursoInfo}>
                    <span style={styles.concursoInfoIcon}>📍</span>
                    <span style={styles.concursoInfoLabel}>Zona:</span>
                    <span style={styles.concursoInfoValue}>
                        {concurso.zona || "Não especificado"}
                    </span>
                </div>

                <div style={styles.concursoInfo}>
                    <span style={styles.concursoInfoIcon}>🏗️</span>
                    <span style={styles.concursoInfoLabel}>Tipo:</span>
                    <span style={styles.concursoInfoValue}>
                        {concurso.tipo || "Não especificado"}
                    </span>
                </div>
            </div>

            {/* Footer with price and delivery date */}
            <div style={styles.concursoFooter}>
                <div style={styles.concursoPreco}>
                    {formatCurrency(concurso.precoBase)}
                </div>
                <div style={styles.concursoDataEntrega}>
                    📅 {formatDate(concurso.dataEntrega)}
                </div>
            </div>

            {/* Hover indicator */}
            {hover && (
                <div
                    style={{
                        position: "absolute",
                        top: "0.75rem",
                        right: "0.75rem",
                        color: "#3b82f6",
                        fontSize: "1.2rem",
                        fontWeight: "bold",
                    }}
                >
                    →
                </div>
            )}
        </div>
    );
};

export default ConcursoCard;