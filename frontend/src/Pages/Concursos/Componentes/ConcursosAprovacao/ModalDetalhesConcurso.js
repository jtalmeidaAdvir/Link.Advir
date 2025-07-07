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
                <div style={styles.header}>
                    <h2 style={styles.title}>Detalhes do Concurso</h2>
                    <button
                        style={styles.closeButton}
                        onClick={onClose}
                        aria-label="Fechar"
                    >
                        ×
                    </button>
                </div>

                <div style={styles.content}>
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Informações Gerais</h3>
                        <div style={styles.grid}>
                            <InfoItem
                                label="Título"
                                value={concurso.titulo}
                            />
                            <InfoItem
                                label="Código"
                                value={concurso.codigo}
                            />
                            <InfoItem
                                label="Entidade"
                                value={concurso.entidade}
                            />
                            <InfoItem
                                label="Zona"
                                value={concurso.zona}
                            />
                            <InfoItem
                                label="Tipo"
                                value={concurso.tipo}
                            />
                        </div>
                    </div>

                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Detalhes Financeiros</h3>
                        <div style={styles.grid}>
                            <InfoItem
                                label="Preço Base"
                                value={`€ ${concurso.precoBase?.toLocaleString("pt-PT") || "0"}`}
                                highlight={true}
                            />
                            <InfoItem
                                label="Forma Contrato"
                                value={concurso.formaContrato}
                            />
                            <InfoItem
                                label="Tipo Proposta"
                                value={concurso.tipoProposta}
                            />
                            <InfoItem
                                label="Data Entrega"
                                value={formatDate(concurso.dataEntrega)}
                                highlight={true}
                            />
                        </div>
                    </div>

                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Critérios</h3>
                        <div style={styles.criteriaBox}>
                            {concurso.criterios || "Não especificado"}
                        </div>
                    </div>
                </div>

                <div style={styles.actions}>
                    <button
                        style={styles.rejectButton}
                        onClick={() => onReject(concurso)}
                    >
                        Recusar
                    </button>
                    <button
                        style={styles.approveButton}
                        onClick={() => onApprove(concurso)}
                    >
                        Aprovar
                    </button>
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ label, value, highlight = false }) => (
    <div
        style={{
            ...styles.infoItem,
            ...(highlight ? styles.infoItemHighlight : {}),
        }}
    >
        <span style={styles.infoLabel}>{label}</span>
        <span style={styles.infoValue}>{value || "Não especificado"}</span>
    </div>
);

const styles = {
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "1rem",
    },
    modal: {
        backgroundColor: "#fff",
        borderRadius: "8px",
        width: "100%",
        maxWidth: "500px",
        maxHeight: "77vh",
        overflowY: "auto",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
        display: "flex",
        flexDirection: "column",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem",
        borderBottom: "1px solid #e0e0e0",
        position: "sticky",
        top: 0,
        backgroundColor: "#fff",
        zIndex: 1,
    },
    title: {
        fontSize: "1.25rem",
        fontWeight: "600",
        color: "#1a1a1a",
        margin: "0",
    },
    closeButton: {
        background: "none",
        border: "none",
        fontSize: "1.5rem",
        cursor: "pointer",
        color: "#666",
        padding: "0.25rem",
        borderRadius: "4px",
        width: "32px",
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
    },
    content: {
        padding: "1rem",
        flex: 1,
    },
    section: {
        marginBottom: "1.5rem",
    },
    sectionTitle: {
        fontSize: "1rem",
        fontWeight: "600",
        color: "#1a1a1a",
        margin: "0 0 0.75rem 0",
    },
    grid: {
        display: "grid",
        gap: "0.75rem",
    },
    infoItem: {
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        padding: "0.75rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "6px",
        border: "1px solid #e9ecef",
    },
    infoItemHighlight: {
        backgroundColor: "#f0f9ff",
        borderColor: "#bfdbfe",
    },
    infoLabel: {
        fontSize: "0.75rem",
        fontWeight: "500",
        color: "#666",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
    },
    infoValue: {
        fontSize: "0.875rem",
        fontWeight: "500",
        color: "#1a1a1a",
        wordBreak: "break-word",
    },
    criteriaBox: {
        padding: "0.75rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "6px",
        border: "1px solid #e9ecef",
        fontSize: "0.875rem",
        color: "#1a1a1a",
        lineHeight: "1.5",
    },
    actions: {
        display: "flex",
        gap: "0.75rem",
        padding: "1rem",
        borderTop: "1px solid #e0e0e0",
        position: "sticky",
        bottom: 0,
        backgroundColor: "#fff",
    },
    rejectButton: {
        flex: 1,
        padding: "0.75rem",
        backgroundColor: "#fff",
        color: "#dc2626",
        border: "1px solid #dc2626",
        borderRadius: "6px",
        fontSize: "0.875rem",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.2s",
    },
    approveButton: {
        flex: 1,
        padding: "0.75rem",
        backgroundColor: "#2563eb",
        color: "#fff",
        border: "1px solid #2563eb",
        borderRadius: "6px",
        fontSize: "0.875rem",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.2s",
    },
};

// CSS for hover effects
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = `
        button:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        .modal button:hover {
            opacity: 0.9;
        }

        .close-button:hover {
            background-color: #f5f5f5 !important;
        }
    `;
    document.head.appendChild(style);
}

export default ModalDetalhesConcurso;