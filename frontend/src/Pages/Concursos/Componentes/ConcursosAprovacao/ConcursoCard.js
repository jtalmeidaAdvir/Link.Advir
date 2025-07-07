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
        return { text: "Sem data", color: "#666", bg: "#f5f5f5" };

    const data = new Date(dataEntrega);
    const hoje = new Date();
    const diffTime = data - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: "Expirado", color: "#dc2626", bg: "#fef2f2" };
    } else if (diffDays <= 3) {
        return { text: "Urgente", color: "#dc2626", bg: "#fef2f2" };
    } else if (diffDays <= 7) {
        return { text: "Moderado", color: "#ea580c", bg: "#fff7ed" };
    } else {
        return { text: "Normal", color: "#16a34a", bg: "#f0fdf4" };
    }
};

const ConcursoCard = ({ concurso, onClick }) => {
    const [hover, setHover] = useState(false);
    const urgencyStatus = getUrgencyStatus(concurso.dataEntrega);

    return (
        <div
            className="concurso-card"
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                ...styles.concursoCard,
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: hover ? "#2563eb" : "#e0e0e0",
                boxShadow: hover ? "0 2px 8px rgba(37, 99, 235, 0.1)" : "none",
            }}
            role="button"
            tabIndex={0}
        >
            <div style={styles.concursoHeader}>
                <h3 style={styles.concursoTitulo}>{concurso.titulo}</h3>
                <span
                    style={{
                        ...styles.concursoStatus,
                        backgroundColor: urgencyStatus.bg,
                        color: urgencyStatus.color,
                    }}
                >
                    {urgencyStatus.text}
                </span>
            </div>

            <div style={styles.concursoContent}>
                <div style={styles.concursoInfo}>
                    <span style={styles.concursoInfoIcon}>📋</span>
                    <span style={styles.concursoInfoLabel}>Código:</span>
                    <span style={styles.concursoInfoValue}>
                        {concurso.codigo}
                    </span>
                </div>

                <div style={styles.concursoInfo}>
                    <span style={styles.concursoInfoIcon}>🏢</span>
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
                    <span style={styles.concursoInfoIcon}>🔧</span>
                    <span style={styles.concursoInfoLabel}>Tipo:</span>
                    <span style={styles.concursoInfoValue}>
                        {concurso.tipo || "Não especificado"}
                    </span>
                </div>
            </div>

            <div style={styles.concursoFooter}>
                <div style={styles.concursoPreco}>
                    {formatCurrency(concurso.precoBase)}
                </div>
                <div style={styles.concursoDataEntrega}>
                    {formatDate(concurso.dataEntrega)}
                </div>
            </div>
        </div>
    );
};

export default ConcursoCard;