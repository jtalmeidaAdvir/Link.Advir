import React, { useState, useEffect } from "react";

const NotificacoesBell = ({ userId }) => {
    const [notificacoes, setNotificacoes] = useState([]);
    const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
    const [naoLidas, setNaoLidas] = useState(0);

    useEffect(() => {
        if (userId) {
            buscarNotificacoes();
            contarNaoLidas();

            // Atualizar a cada 30 segundos
            const interval = setInterval(() => {
                buscarNotificacoes();
                contarNaoLidas();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [userId]);

    const buscarNotificacoes = async () => {
        try {
            const response = await fetch(
                `https://backend.advir.pt/api/notificacoes/${userId}`,
            );
            const data = await response.json();

            if (data.success) {
                setNotificacoes(data.data);
            }
        } catch (error) {
            console.error("Erro ao buscar notificações:", error);
        }
    };

    const contarNaoLidas = async () => {
        try {
            const response = await fetch(
                `https://backend.advir.pt/api/notificacoes/${userId}/nao-lidas`,
            );
            const data = await response.json();

            if (data.success) {
                setNaoLidas(data.data.count);
            }
        } catch (error) {
            console.error("Erro ao contar notificações não lidas:", error);
        }
    };

    const marcarComoLida = async (notificacaoId) => {
        try {
            await fetch(
                `https://backend.advir.pt/api/notificacoes/${notificacaoId}/lida`,
                {
                    method: "PUT",
                },
            );

            buscarNotificacoes();
            contarNaoLidas();
        } catch (error) {
            console.error("Erro ao marcar notificação como lida:", error);
        }
    };

    const formatarData = (data) => {
        return new Date(data).toLocaleString("pt-PT");
    };

    if (!userId) return null;

    return (
        <div style={containerStyle}>
            <div
                style={bellContainerStyle}
                onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}
            >
                <div style={bellIconStyle}>🔔</div>
                {naoLidas > 0 && (
                    <div style={badgeStyle}>
                        {naoLidas > 99 ? "99+" : naoLidas}
                    </div>
                )}
            </div>

            {mostrarNotificacoes && (
                <div style={dropdownStyle}>
                    <div style={headerStyle}>
                        <h3 style={titleStyle}>Notificações</h3>
                        <button
                            style={closeButtonStyle}
                            onClick={() => setMostrarNotificacoes(false)}
                        >
                            ×
                        </button>
                    </div>

                    <div style={notificacoesListStyle}>
                        {notificacoes.length === 0 ? (
                            <div style={emptyStyle}>Não há notificações</div>
                        ) : (
                            notificacoes.map((notif) => (
                                <div
                                    key={notif.id}
                                    style={{
                                        ...notificacaoItemStyle,
                                        backgroundColor: notif.lida
                                            ? "#f8f9fa"
                                            : "#e8f4fd",
                                    }}
                                    onClick={() =>
                                        !notif.lida && marcarComoLida(notif.id)
                                    }
                                >
                                    <div style={notifHeaderStyle}>
                                        <span style={notifTitleStyle}>
                                            {notif.titulo}
                                        </span>
                                        {!notif.lida && (
                                            <div style={unreadDotStyle}></div>
                                        )}
                                    </div>
                                    <div style={notifMessageStyle}>
                                        {notif.mensagem}
                                    </div>
                                    <div style={notifDateStyle}>
                                        {formatarData(notif.data_criacao)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Estilos
const containerStyle = {
    position: "relative",
    display: "inline-block",
};

const bellContainerStyle = {
    position: "relative",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "50%",
    backgroundColor: "transparent",
    transition: "background-color 0.2s",
};

const bellIconStyle = {
    fontSize: "24px",
    color: "#1792FE",
};

const badgeStyle = {
    position: "absolute",
    top: "0",
    right: "0",
    backgroundColor: "#ff4444",
    color: "white",
    borderRadius: "50%",
    padding: "2px 6px",
    fontSize: "12px",
    fontWeight: "bold",
    minWidth: "18px",
    textAlign: "center",
};

const dropdownStyle = {
    position: "absolute",
    top: "100%",
    right: "0",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    zIndex: 1000,
    width: "350px",
    maxHeight: "400px",
    overflow: "hidden",
};

const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    borderBottom: "1px solid #e9ecef",
};

const titleStyle = {
    margin: 0,
    fontSize: "16px",
    color: "#333",
};

const closeButtonStyle = {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#666",
};

const notificacoesListStyle = {
    maxHeight: "300px",
    overflowY: "auto",
};

const emptyStyle = {
    padding: "20px",
    textAlign: "center",
    color: "#666",
};

const notificacaoItemStyle = {
    padding: "12px 16px",
    borderBottom: "1px solid #e9ecef",
    cursor: "pointer",
    transition: "background-color 0.2s",
};

const notifHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
};

const notifTitleStyle = {
    fontWeight: "600",
    color: "#333",
    fontSize: "14px",
};

const unreadDotStyle = {
    width: "8px",
    height: "8px",
    backgroundColor: "#1792FE",
    borderRadius: "50%",
};

const notifMessageStyle = {
    fontSize: "13px",
    color: "#666",
    marginBottom: "4px",
    lineHeight: "1.4",
};

const notifDateStyle = {
    fontSize: "11px",
    color: "#999",
};

export default NotificacoesBell;
