const styles = {
    container: {
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
        padding: "0",
        overflow: "hidden",
    },

    header: {
        backgroundColor: "#fff",
        padding: "1rem",
        borderBottom: "1px solid #e0e0e0",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },

    title: {
        fontSize: "1.5rem",
        fontWeight: "600",
        color: "#1a1a1a",
        margin: "0 0 0.5rem 0",
    },

    subtitle: {
        fontSize: "0.875rem",
        color: "#666",
        margin: "0",
        fontWeight: "400",
    },

    searchContainer: {
        padding: "1rem",
        backgroundColor: "#fff",
        borderBottom: "1px solid #e0e0e0",
        position: "sticky",
        top: "80px",
        zIndex: 99,
    },

    searchInput: {
        width: "100%",
        padding: "0.75rem",
        fontSize: "0.875rem",
        border: "1px solid #d0d0d0",
        borderRadius: "8px",
        backgroundColor: "#fff",
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.2s",
    },

    searchInputFocused: {
        borderColor: "#2563eb",
    },

    loadingContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "3rem 1rem",
        color: "#666",
    },

    loadingSpinner: {
        width: "32px",
        height: "32px",
        border: "2px solid #f0f0f0",
        borderTop: "2px solid #2563eb",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
    },

    errorContainer: {
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "8px",
        padding: "1rem",
        margin: "1rem",
        color: "#dc2626",
        textAlign: "center",
    },

    listaConcursos: {
        flex: 1,
        overflowY: "auto",
        padding: "1rem 1rem 2rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        marginBottom: "40px",
        backgroundColor: "#d4e4ff",
    },

    semConcursos: {
        textAlign: "center",
        padding: "3rem 1rem",
        backgroundColor: "#fff",
        borderRadius: "8px",
        color: "#666",
        fontSize: "0.875rem",
        border: "1px solid #e0e0e0",
    },

    // Card styles
    concursoCard: {
        backgroundColor: "#fff",
        borderRadius: "8px",
        padding: "1rem",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#e0e0e0",
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
    },

    concursoCardHover: {
        borderColor: "#2563eb",
        boxShadow: "0 2px 8px rgba(37, 99, 235, 0.1)",
    },

    concursoHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "0.75rem",
    },

    concursoTitulo: {
        fontSize: "1rem",
        fontWeight: "600",
        color: "#1a1a1a",
        margin: "0",
        lineHeight: "1.4",
        flex: 1,
    },

    concursoStatus: {
        fontSize: "0.75rem",
        fontWeight: "500",
        padding: "0.25rem 0.5rem",
        borderRadius: "4px",
        whiteSpace: "nowrap",
        textTransform: "uppercase",
        letterSpacing: "0.025em",
    },

    concursoContent: {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
    },

    concursoInfo: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.875rem",
        color: "#666",
    },

    concursoInfoIcon: {
        width: "16px",
        textAlign: "center",
        color: "#999",
    },

    concursoInfoLabel: {
        fontWeight: "500",
        color: "#333",
        minWidth: "70px",
    },

    concursoInfoValue: {
        color: "#666",
        flex: 1,
    },

    concursoFooter: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: "0.75rem",
        borderTop: "1px solid #f0f0f0",
    },

    concursoPreco: {
        fontSize: "1rem",
        fontWeight: "600",
        color: "#16a34a",
    },

    concursoDataEntrega: {
        fontSize: "0.75rem",
        color: "#dc2626",
        fontWeight: "500",
        backgroundColor: "#fef2f2",
        padding: "0.25rem 0.5rem",
        borderRadius: "4px",
        border: "1px solid #fecaca",
    },

    // Pull to refresh
    pullIndicator: {
        position: "fixed",
        top: "0",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#fff",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        borderRadius: "0 0 8px 8px",
        padding: "0.75rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        zIndex: 1000,
        border: "1px solid #e0e0e0",
        borderTop: "none",
    },

    pullIcon: {
        fontSize: "1.25rem",
        transition: "transform 0.2s ease",
    },

    pullText: {
        fontSize: "0.75rem",
        color: "#666",
        fontWeight: "500",
    },

    // Mobile optimizations
    "@media (max-width: 768px)": {
        header: {
            padding: "0.75rem 1rem",
        },
        title: {
            fontSize: "1.25rem",
        },
        subtitle: {
            fontSize: "0.8rem",
        },
        searchContainer: {
            padding: "0.75rem 1rem",
            top: "72px",
        },
        listaConcursos: {
            padding: "0.75rem 0.75rem 2rem 0.75rem",
            gap: "0.5rem",
        },
        concursoCard: {
            padding: "0.75rem",
            gap: "0.5rem",
        },
        concursoTitulo: {
            fontSize: "0.9rem",
        },
        concursoInfo: {
            fontSize: "0.8rem",
        },
        concursoInfoLabel: {
            minWidth: "60px",
        },
        concursoFooter: {
            flexDirection: "column",
            gap: "0.5rem",
            alignItems: "stretch",
        },
        concursoPreco: {
            textAlign: "center",
            fontSize: "0.9rem",
        },
        concursoDataEntrega: {
            textAlign: "center",
            alignSelf: "center",
        },
    },
    pullText: {
        fontSize: "0.8rem",
        color: "#666",
        marginTop: "0.25rem",
    },

    // Success Message
    successMessage: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.75rem 1rem",
        margin: "0 1rem 1rem 1rem",
        backgroundColor: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: "8px",
        color: "#166534",
        fontSize: "0.875rem",
        fontWeight: "500",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    },

    successIcon: {
        fontSize: "1rem",
    },

    // Confirmation Modal
    confirmOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10001,
        padding: "1rem",
    },

    confirmModal: {
        backgroundColor: "#fff",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
    },

    confirmHeader: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1.5rem 1rem 1rem 1rem",
        textAlign: "center",
    },

    confirmIcon: {
        fontSize: "2.5rem",
        marginBottom: "0.75rem",
    },

    confirmTitle: {
        fontSize: "1.125rem",
        fontWeight: "600",
        color: "#1a1a1a",
        margin: "0",
    },

    confirmContent: {
        padding: "0 1.5rem 1rem 1.5rem",
        textAlign: "center",
    },

    confirmMessage: {
        fontSize: "0.875rem",
        color: "#666",
        margin: "0 0 0.75rem 0",
        lineHeight: "1.5",
    },

    confirmDetail: {
        fontSize: "0.875rem",
        color: "#1a1a1a",
        margin: "0 0 0.75rem 0",
        padding: "0.5rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "6px",
        border: "1px solid #e9ecef",
    },

    confirmWarning: {
        fontSize: "0.75rem",
        color: "#dc2626",
        margin: "0",
        fontStyle: "italic",
    },

    confirmActions: {
        display: "flex",
        gap: "0.75rem",
        padding: "1rem 1.5rem 1.5rem 1.5rem",
    },

    confirmCancelButton: {
        flex: 1,
        padding: "0.75rem",
        backgroundColor: "#fff",
        color: "#666",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "0.875rem",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.2s",
    },

    confirmActionButton: {
        flex: 1,
        padding: "0.75rem",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.875rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s",
    },
};

// CSS animations
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .concurso-card:hover {
            border-color: #2563eb !important;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1) !important;
        }
    `;
    document.head.appendChild(style);
}

export default styles;