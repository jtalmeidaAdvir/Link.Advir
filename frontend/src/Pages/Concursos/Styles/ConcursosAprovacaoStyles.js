const styles = {
    container: {
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100vw",
        padding: "1rem",
        boxSizing: "border-box",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch", // Para iOS
        scrollBehavior: "smooth",
    },

    header: {
        width: "100%",
        maxWidth: "1200px",
        textAlign: "center",
        marginBottom: "1rem",
    },

    title: {
        fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
        fontWeight: "700",
        color: "#1e293b",
        margin: "0",
        marginBottom: "0.5rem",
        textShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },

    subtitle: {
        fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
        color: "#64748b",
        margin: "0",
        fontWeight: "400",
    },

    statsContainer: {
        width: "100%",
        maxWidth: "1200px",
        display: "flex",
        justifyContent: "center",
        gap: "1rem",
        marginBottom: "1rem",
        flexWrap: "wrap",
    },

    statCard: {
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        padding: "1rem 1.5rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#e2e8f0",
        minWidth: "120px",
        textAlign: "center",
    },

    statNumber: {
        fontSize: "1.5rem",
        fontWeight: "700",
        color: "#3b82f6",
        display: "block",
    },

    statLabel: {
        fontSize: "0.8rem",
        color: "#64748b",
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },

    searchContainer: {
        width: "100%",
        maxWidth: "500px",
        position: "relative",
        marginBottom: "1rem",
    },

    searchInput: {
        width: "100%",
        padding: "0.75rem 1rem 0.75rem 2.5rem",
        fontSize: "1rem",
        borderWidth: "2px",
        borderStyle: "solid",
        borderColor: "#e2e8f0",
        borderRadius: "25px",
        backgroundColor: "#ffffff",
        outlineWidth: "0",
        transition: "border-color 0.2s ease",
        boxSizing: "border-box",
    },

    searchIcon: {
        position: "absolute",
        left: "0.75rem",
        top: "50%",
        transform: "translateY(-50%)",
        color: "#64748b",
        fontSize: "1.1rem",
    },

    loadingContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
        padding: "3rem",
        color: "#64748b",
    },

    loadingSpinner: {
        width: "40px",
        height: "40px",
        border: "3px solid #e2e8f0",
        borderTop: "3px solid #3b82f6",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
    },

    errorContainer: {
        backgroundColor: "#fef2f2",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#fecaca",
        borderRadius: "12px",
        padding: "1rem",
        color: "#dc2626",
        textAlign: "center",
        maxWidth: "500px",
        margin: "2rem auto",
    },

    listaConcursos: {
        width: "100%",
        maxWidth: "1200px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "1.5rem",
        padding: "0 0.5rem",
        boxSizing: "border-box",
    },

    // General mobile responsiveness
    "@media (max-width: 768px)": {
        container: {
            padding: "0.75rem 0.5rem",
            gap: "1rem",
        },
        statsContainer: {
            gap: "0.5rem",
        },
        statCard: {
            padding: "0.75rem 1rem",
            minWidth: "100px",
        },
        searchContainer: {
            maxWidth: "100%",
            marginBottom: "0.75rem",
        },
    },

    semConcursos: {
        gridColumn: "1 / -1",
        textAlign: "center",
        padding: "3rem",
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        borderWidth: "2px",
        borderStyle: "dashed",
        borderColor: "#e2e8f0",
        color: "#64748b",
        fontSize: "1.1rem",
        fontStyle: "italic",
    },

    concursoCard: {
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        padding: "1.5rem 1.5rem 2rem 1.5rem",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
        border: "1px solid #e2e8f0",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        position: "relative",
        overflow: "visible",
        minHeight: "240px",
        justifyContent: "space-between",
        marginBottom: "1rem",
    },

    concursoCardHover: {
        transform: "translateY(-4px)",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)",
        border: "1px solid #3b82f6",
    },

    concursoHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "1rem",
        marginBottom: "1rem",
        flexWrap: "nowrap",
    },

    concursoTitulo: {
        fontSize: "1.25rem",
        fontWeight: "700",
        color: "#1e293b",
        margin: "0",
        lineHeight: "1.3",
        flex: 1,
        minWidth: 0,
    },

    concursoStatus: {
        backgroundColor: "#ecfdf5",
        color: "#059669",
        padding: "0.4rem 0.8rem",
        borderRadius: "20px",
        fontSize: "0.75rem",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        whiteSpace: "nowrap",
        alignSelf: "flex-start",
        flexShrink: 0,
        marginTop: "0.1rem",
    },

    concursoContent: {
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        flex: 1,
    },

    concursoInfo: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.9rem",
        color: "#475569",
        margin: "0",
    },

    concursoInfoIcon: {
        fontSize: "1rem",
        color: "#64748b",
        minWidth: "16px",
    },

    concursoInfoLabel: {
        fontWeight: "600",
        color: "#374151",
        minWidth: "80px",
    },

    concursoInfoValue: {
        color: "#1f2937",
        flex: 1,
    },

    concursoFooter: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: "1.25rem",
        borderTop: "1px solid #f1f5f9",
        marginTop: "auto",
        minHeight: "50px",
    },

    concursoPreco: {
        fontSize: "1.1rem",
        fontWeight: "700",
        color: "#059669",
        flex: "0 0 auto",
    },

    concursoDataEntrega: {
        fontSize: "0.85rem",
        color: "#dc2626",
        fontWeight: "600",
        backgroundColor: "#fef2f2",
        padding: "0.4rem 0.8rem",
        borderRadius: "20px",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#fecaca",
        whiteSpace: "nowrap",
        flex: "0 0 auto",
    },

    // Pull-to-refresh styles
    pullIndicator: {
        position: "fixed",
        top: "0",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        borderRadius: "0 0 20px 20px",
        padding: "1rem 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        zIndex: 1000,
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#e2e8f0",
        borderTopWidth: "0",
        transition: "all 0.3s ease",
    },

    pullIcon: {
        fontSize: "1.5rem",
        transition: "transform 0.2s ease",
    },

    pullText: {
        fontSize: "0.9rem",
        color: "#64748b",
        fontWeight: "500",
        textAlign: "center",
    },

    // Responsive card adjustments
    "@media (max-width: 768px)": {
        container: {
            padding: "0.5rem",
            gap: "1rem",
        },
        listaConcursos: {
            gridTemplateColumns: "1fr",
            gap: "1rem",
            padding: "0",
            marginBottom: "2rem",
            width: "100%",
        },
        concursoCard: {
            padding: "1rem",
            minHeight: "auto",
            marginBottom: "0",
            overflow: "visible",
            width: "100%",
            boxSizing: "border-box",
            margin: "0",
            borderRadius: "12px",
        },
        concursoHeader: {
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "0.75rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
        },
        concursoTitulo: {
            fontSize: "1.1rem",
            width: "100%",
            marginBottom: "0",
            lineHeight: "1.4",
            wordBreak: "break-word",
            whiteSpace: "normal",
            overflow: "visible",
        },
        concursoStatus: {
            alignSelf: "flex-start",
            marginTop: "0",
            fontSize: "0.7rem",
            padding: "0.3rem 0.6rem",
            maxWidth: "100%",
            textAlign: "center",
        },
        concursoContent: {
            gap: "0.75rem",
            width: "100%",
        },
        concursoInfo: {
            fontSize: "0.85rem",
            gap: "0.5rem",
            flexWrap: "wrap",
            width: "100%",
        },
        concursoInfoLabel: {
            minWidth: "70px",
            fontSize: "0.85rem",
            flexShrink: 0,
        },
        concursoInfoValue: {
            wordBreak: "break-word",
            overflow: "visible",
            whiteSpace: "normal",
        },
        concursoFooter: {
            flexDirection: "column",
            gap: "0.75rem",
            alignItems: "stretch",
            paddingTop: "1rem",
            minHeight: "auto",
            width: "100%",
        },
        concursoPreco: {
            fontSize: "1rem",
            textAlign: "center",
            width: "100%",
        },
        concursoDataEntrega: {
            textAlign: "center",
            fontSize: "0.8rem",
            padding: "0.3rem 0.6rem",
            width: "auto",
            alignSelf: "center",
        },
    },

    "@media (max-width: 480px)": {
        container: {
            padding: "0.25rem",
        },
        listaConcursos: {
            padding: "0",
            gap: "0.75rem",
            width: "100%",
        },
        concursoCard: {
            padding: "0.75rem",
            marginBottom: "0",
            width: "100%",
            maxWidth: "100%",
        },
        concursoTitulo: {
            fontSize: "1rem",
            lineHeight: "1.3",
        },
        concursoInfo: {
            fontSize: "0.8rem",
            gap: "0.4rem",
        },
        concursoInfoLabel: {
            minWidth: "60px",
            fontSize: "0.8rem",
        },
        concursoPreco: {
            fontSize: "0.9rem",
        },
        concursoDataEntrega: {
            fontSize: "0.75rem",
            padding: "0.25rem 0.5rem",
        },
    },
};

// Add CSS animation for loading spinner
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            .concursos-grid {
                grid-template-columns: 1fr !important;
                width: 100% !important;
                padding: 0 !important;
                margin-bottom: 65px !important;
            }
            
            .concursos-card {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                overflow: visible !important;
            }
        }

        @media (max-width: 480px) {
            .concursos-card {
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
            }
        }
    `;
    document.head.appendChild(style);
}

export default styles;