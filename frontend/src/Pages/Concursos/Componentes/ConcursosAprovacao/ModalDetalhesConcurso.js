import React from "react";

const formatDate = (isoDate) => {
    if (!isoDate) return "-";
    const d = new Date(isoDate);
    return d.toLocaleDateString("pt-PT");
};

const ModalDetalhesConcurso = ({
    visible,
    onClose,
    concurso,
    onApprove,
    onReject,
}) => {
    if (!visible || !concurso) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                {/* Close button */}
                <button
                    style={styles.closeButton}
                    onClick={onClose}
                    aria-label="Fechar modal"
                >
                    ✕
                </button>

                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.iconContainer}>
                        <span style={styles.headerIcon}>📋</span>
                    </div>
                    <h2 style={styles.title}>Detalhes do Concurso</h2>
                    <p style={styles.subtitle}>
                        {concurso.codigo?.replace(/�/g, "í")}
                    </p>
                </div>

                {/* Content */}
                <div style={styles.content}>
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Informações Gerais</h3>
                        <div style={styles.grid}>
                            <InfoItem
                                icon="📝"
                                label="Título"
                                value={concurso.titulo}
                            />
                            <InfoItem
                                icon="🏛️"
                                label="Entidade"
                                value={concurso.entidade}
                            />
                            <InfoItem
                                icon="📍"
                                label="Zona"
                                value={concurso.zona}
                            />
                            <InfoItem
                                icon="🏗️"
                                label="Tipo de Obra"
                                value={concurso.tipo}
                            />
                        </div>
                    </div>

                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>
                            Detalhes Financeiros
                        </h3>
                        <div style={styles.grid}>
                            <InfoItem
                                icon="💰"
                                label="Preço Base"
                                value={`€ ${concurso.precoBase?.toLocaleString("pt-PT")}`}
                                highlight={true}
                            />
                            <InfoItem
                                icon="📄"
                                label="Forma Contrato"
                                value={concurso.formaContrato}
                            />
                            <InfoItem
                                icon="📊"
                                label="Tipo Proposta"
                                value={concurso.tipoProposta}
                            />
                            <InfoItem
                                icon="🎯"
                                label="Critérios"
                                value={concurso.criterios}
                            />
                        </div>
                    </div>

                    {/* Data Entrega destacada */}
                    <div style={styles.deliverySection}>
                        <div style={styles.deliveryIcon}>⏰</div>
                        <div style={styles.deliveryContent}>
                            <span style={styles.deliveryLabel}>
                                Entrega de Propostas
                            </span>
                            <span style={styles.deliveryDate}>
                                {formatDate(concurso.dataEntrega)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div style={styles.actions}>
                    <button
                        style={styles.approveButton}
                        onClick={() => onApprove(concurso)}
                    >
                        <span style={styles.buttonIcon}>✅</span>
                        Aprovar Concurso
                    </button>
                    <button
                        style={styles.rejectButton}
                        onClick={() => onReject(concurso)}
                    >
                        <span style={styles.buttonIcon}>❌</span>
                        Recusar Concurso
                    </button>
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ icon, label, value, highlight = false }) => (
    <div
        style={
            highlight
                ? { ...styles.infoItem, ...styles.infoItemHighlight }
                : styles.infoItem
        }
    >
        <div style={styles.infoIcon}>{icon}</div>
        <div style={styles.infoContent}>
            <span style={styles.infoLabel}>{label}</span>
            <span style={styles.infoValue}>{value || "Não especificado"}</span>
        </div>
    </div>
);

const styles = {
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "1rem",
        backdropFilter: "blur(4px)",
    },
    modal: {
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        width: "100%",
        maxWidth: "500px",
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#e2e8f0",
        position: "relative",
        animation: "slideUp 0.3s ease-out",
    },
    closeButton: {
        position: "absolute",
        top: "1rem",
        right: "1rem",
        background: "rgba(0, 0, 0, 0.1)",
        border: "none",
        borderRadius: "50%",
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: "1.2rem",
        color: "white",
        zIndex: 1,
        transition: "all 0.2s ease",
    },
    header: {
        background: "linear-gradient(135deg, #667eea 0%, #1688ed 100%)",
        color: "white",
        padding: "2rem",
        borderRadius: "20px 20px 0 0",
        textAlign: "center",
        position: "relative",
    },
    iconContainer: {
        display: "inline-block",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: "50%",
        width: "60px",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "1rem",
        margin: "0 auto 1rem auto",
    },
    headerIcon: {
        fontSize: "1.8rem",
    },
    title: {
        margin: "0",
        fontSize: "1.5rem",
        fontWeight: "700",
        marginBottom: "0.5rem",
    },
    subtitle: {
        margin: "0",
        fontSize: "1rem",
        opacity: 0.9,
        fontWeight: "400",
    },
    content: {
        padding: "2rem",
    },
    section: {
        marginBottom: "2rem",
    },
    sectionTitle: {
        fontSize: "1.1rem",
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    grid: {
        display: "grid",
        gap: "1rem",
    },
    infoItem: {
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        padding: "1rem",
        backgroundColor: "#f8fafc",
        borderRadius: "12px",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#e2e8f0",
        transition: "all 0.2s ease",
    },
    infoItemHighlight: {
        backgroundColor: "#f0f9ff",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#0ea5e9",
    },
    infoIcon: {
        fontSize: "1.2rem",
        minWidth: "20px",
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        display: "block",
        fontSize: "0.8rem",
        color: "#64748b",
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        marginBottom: "0.25rem",
    },
    infoValue: {
        display: "block",
        fontSize: "1rem",
        color: "#1e293b",
        fontWeight: "600",
        wordBreak: "break-word",
    },
    deliverySection: {
        background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
        borderRadius: "16px",
        padding: "1.5rem",
        color: "white",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginTop: "2rem",
    },
    deliveryIcon: {
        fontSize: "2rem",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: "50%",
        width: "50px",
        height: "50px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    deliveryContent: {
        flex: 1,
    },
    deliveryLabel: {
        display: "block",
        fontSize: "0.9rem",
        opacity: 0.9,
        marginBottom: "0.25rem",
    },
    deliveryDate: {
        display: "block",
        fontSize: "1.3rem",
        fontWeight: "700",
    },
    actions: {
        padding: "1.5rem 2rem 2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    },
    approveButton: {
        backgroundColor: "#10b981",
        color: "white",
        border: "none",
        borderRadius: "12px",
        padding: "1rem 1.5rem",
        fontSize: "1rem",
        fontWeight: "600",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        transition: "all 0.2s ease",
        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
    },
    rejectButton: {
        backgroundColor: "#ef4444",
        color: "white",
        border: "none",
        borderRadius: "12px",
        padding: "1rem 1.5rem",
        fontSize: "1rem",
        fontWeight: "600",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        transition: "all 0.2s ease",
        boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
    },
    buttonIcon: {
        fontSize: "1.1rem",
    },
    // Responsive styles
    "@media (max-width: 768px)": {
        modal: {
            margin: "1rem",
            maxWidth: "calc(100% - 2rem)",
        },
        header: {
            padding: "1.5rem",
        },
        content: {
            padding: "1.5rem",
        },
        actions: {
            padding: "1rem 1.5rem 1.5rem",
        },
    },
};

// Add CSS animation
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes slideUp {
            from {
                transform: translateY(100px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .modal button:hover {
            transform: translateY(-2px);
        }

        .modal .closeButton:hover {
            background: rgba(0, 0, 0, 0.2);
        }
    `;
    document.head.appendChild(style);
}

export default ModalDetalhesConcurso;
