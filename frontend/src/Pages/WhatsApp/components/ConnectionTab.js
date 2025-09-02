import React from "react";

const ConnectionTab = ({
    status,
    loading,
    userInfo,
    testMessage,
    setTestMessage,
    handleConnect,
    handleDisconnect,
    handleChangeAccount,
    handleQuickChangeAccount,
    handleForceReconnect,
    handleTestMessage,
    checkStatus,
    API_BASE_URL,
    styles,
}) => {
    const getStatusColor = () => {
        switch (status.status) {
            case "ready":
                return "#28a745";
            case "qr_received":
                return "#ffc107";
            case "authenticated":
                return "#28a745";
            case "auth_failure":
                return "#dc3545";
            default:
                return "#6c757d";
        }
    };

    const getStatusText = () => {
        switch (status.status) {
            case "ready":
                return "Conectado e Pronto";
            case "qr_received":
                return "QR Code Disponível - Escaneie!";
            case "authenticated":
                return "Autenticado";
            case "auth_failure":
                return "Falha na Autenticação";
            default:
                return "Desconectado";
        }
    };

    const getStatusIcon = () => {
        switch (status.status) {
            case "ready":
                return "✅";
            case "qr_received":
                return "📱";
            case "authenticated":
                return "🔐";
            case "auth_failure":
                return "❌";
            default:
                return "⚫";
        }
    };

    


    return (
        <div>
            {/* Status Card */}
            <div style={{ ...styles.statusCard, background: `linear-gradient(135deg, ${getStatusColor()}15, ${getStatusColor()}05)`, border: `2px solid ${getStatusColor()}` }}>
                <span style={styles.statusIcon}>{getStatusIcon()}</span>
                <div style={{ ...styles.statusText, color: getStatusColor() }}>{getStatusText()}</div>
                <div style={styles.statusSubtext}>Status: {status.status}</div>
            </div>

            {/* Help Box */}
            <div style={styles.helpBox}>
                <h3 style={styles.helpTitle}>📋 Como conectar o WhatsApp Web</h3>
                <ol style={styles.helpList}>
                    <li>Clique em "Conectar WhatsApp Web"</li>
                    <li>Aguarde o QR Code aparecer</li>
                    <li>Abra o WhatsApp no seu telemóvel</li>
                    <li>Vá em Definições → Dispositivos conectados → Conectar dispositivo</li>
                    <li>Escaneie o QR Code</li>
                    <li>Aguarde a confirmação de conexão</li>
                </ol>
            </div>

            {/* Connection Controls */}
            <div style={{ ...styles.card, textAlign: "center", marginBottom: "30px" }}>
                <div style={styles.buttonGroup}>
                    {!status.isReady ? (
                        <>
                            <button
                                onClick={handleConnect}
                                style={{
                                    ...styles.button,
                                    ...(loading ? styles.buttonDisabled : {}),
                                }}
                                disabled={loading}
                            >
                                {loading ? "🔄 Conectando..." : "🔗 Conectar WhatsApp Web"}
                            </button>
                            <button
                                onClick={async () => {
                                    if (confirm("Isto irá forçar uma nova conexão com QR Code. Continuar?")) {
                                        setLoading(true);
                                        try {
                                            // Primeiro desconectar completamente
                                            await fetch(`${API_BASE_URL}/disconnect`, {
                                                method: "POST",
                                            });

                                            // Aguardar um momento
                                            await new Promise(resolve => setTimeout(resolve, 1000));

                                            // Depois conectar (que agora vai limpar a sessão automaticamente)
                                            const response = await fetch(`${API_BASE_URL}/connect`, {
                                                method: "POST",
                                            });

                                            if (response.ok) {
                                                alert("Nova conexão iniciada! Aguarde o QR Code aparecer.");
                                                checkStatus();
                                            } else {
                                                alert("Erro ao iniciar nova conexão");
                                            }
                                        } catch (error) {
                                            alert("Erro ao iniciar nova conexão");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }
                                }}
                                style={{
                                    ...styles.button,
                                    backgroundColor: "#17a2b8",
                                    ...(loading ? styles.buttonDisabled : {}),
                                }}
                                disabled={loading}
                            >
                                🆕 Nova Conexão
                            </button>
                            <button
                                onClick={async () => {
                                    if (confirm("Isso irá limpar completamente qualquer sessão existente. Continuar?")) {
                                        setLoading(true);
                                        try {
                                            const response = await fetch(`${API_BASE_URL}/clear-session`, {
                                                method: "POST",
                                            });

                                            if (response.ok) {
                                                alert("Sessão limpa! Agora pode conectar com qualquer conta.");
                                                setTimeout(() => handleConnect(), 1000);
                                            } else {
                                                alert("Erro ao limpar sessão");
                                            }
                                        } catch (error) {
                                            alert("Erro ao limpar sessão");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }
                                }}
                                style={{
                                    ...styles.button,
                                    ...styles.buttonWarning,
                                    ...(loading ? styles.buttonDisabled : {}),
                                }}
                                disabled={loading}
                            >
                                🗑️ Limpar Sessão
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleDisconnect}
                            style={{
                                ...styles.button,
                                ...styles.buttonDanger,
                                ...(loading ? styles.buttonDisabled : {}),
                            }}
                            disabled={loading}
                        >
                            {loading ? "🔄 Desconectando..." : "🔌 Desconectar"}
                        </button>
                    )}
                </div>
            </div>

            {/* QR Code */}
            {(status.status === "qr_received" || status.hasQrCode || status.qrCode) && (
                <div style={styles.qrContainer}>
                    <h3 style={styles.cardTitle}>📱 Escaneie o QR Code</h3>
                    {status.qrCode ? (
                        <div>
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(status.qrCode)}`}
                                alt="QR Code WhatsApp"
                                style={styles.qrCode}
                            />
                            <p style={{ color: "#ffc107", fontWeight: "600" }}>
                                ⏱️ Aguardando escaneamento...
                            </p>
                            <p style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                                O QR Code é atualizado automaticamente
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            backgroundColor: "#fff3cd",
                            padding: "20px",
                            borderRadius: "8px",
                        }}>
                            <p>⚠️ QR Code não disponível</p>
                            <button onClick={checkStatus} style={styles.button}>
                                🔄 Tentar Novamente
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* User Info */}
            {status.isReady && userInfo && (
                <div style={styles.userInfoCard}>
                    <h3 style={styles.cardTitle}>👤 Conta Conectada</h3>
                    <div style={{ marginBottom: "20px" }}>
                        <div style={{ marginBottom: "10px" }}>
                            <strong>📱 Nome:</strong> {userInfo.pushname || "Utilizador WhatsApp"}
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                            <strong>🔢 Número:</strong> {userInfo.formattedNumber || userInfo.wid || "Não disponível"}
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                            <strong>💻 Plataforma:</strong> {userInfo.platform || "WhatsApp Web"}
                        </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <button
                            style={{
                                ...styles.button,
                                backgroundColor: "#dc3545",
                                marginLeft: "8px",
                            }}
                            onClick={handleChangeAccount}
                            disabled={loading}
                        >
                            🔄 Trocar Conta
                        </button>

                        <button
                            style={{
                                ...styles.button,
                                backgroundColor: "#ff9800",
                                marginRight: "10px",
                            }}
                            onClick={handleQuickChangeAccount}
                            disabled={loading}
                        >
                            🔄 Trocar Número
                        </button>

                        <button
                            style={{
                                ...styles.button,
                                backgroundColor: "#2196f3",
                                marginRight: "10px",
                            }}
                            onClick={handleForceReconnect}
                            disabled={loading}
                        >
                            🔧 Forçar Reconexão
                        </button>
                    </div>
                </div>
            )}

            {/* Test Message */}
            {status.isReady && (
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>📤 Enviar Mensagem de Teste</h3>
                    <form onSubmit={handleTestMessage}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Número de Destino *</label>
                            <input
                                type="tel"
                                style={styles.input}
                                value={testMessage.to}
                                onChange={(e) =>
                                    setTestMessage({
                                        ...testMessage,
                                        to: e.target.value,
                                    })
                                }
                                placeholder="351912345678 (com código do país)"
                                required
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Mensagem *</label>
                            <textarea
                                style={styles.textarea}
                                value={testMessage.message}
                                onChange={(e) =>
                                    setTestMessage({
                                        ...testMessage,
                                        message: e.target.value,
                                    })
                                }
                                placeholder="Digite sua mensagem aqui..."
                                required
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Prioridade</label>
                            <select
                                style={styles.select}
                                value={testMessage.priority}
                                onChange={(e) =>
                                    setTestMessage({
                                        ...testMessage,
                                        priority: e.target.value,
                                    })
                                }
                            >
                                <option value="normal">Normal</option>
                                <option value="info">Informação</option>
                                <option value="warning">Aviso</option>
                                <option value="urgent">Urgente</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            style={{
                                ...styles.button,
                                ...styles.buttonSuccess,
                                width: "100%",
                                ...(loading ? styles.buttonDisabled : {}),
                            }}
                            disabled={loading}
                        >
                            {loading ? "📤 Enviando..." : "📤 Enviar Mensagem"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ConnectionTab;