
import React from "react";

const LogsTab = ({
    logs,
    stats,
    logFilter,
    setLogFilter,
    scheduledMessages,
    loadLogs,
    clearLogs,
    styles,
}) => {
    const getLogColor = (type) => {
        switch (type) {
            case "success":
                return "#28a745";
            case "error":
                return "#dc3545";
            case "warning":
                return "#ffc107";
            case "info":
            default:
                return "#007bff";
        }
    };

    const getLogIcon = (type) => {
        switch (type) {
            case "success":
                return "✅";
            case "error":
                return "❌";
            case "warning":
                return "⚠️";
            case "info":
            default:
                return "ℹ️";
        }
    };

    return (
        <div>
            {/* Stats Cards */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{stats.totalSchedules || 0}</div>
                    <div style={styles.statLabel}>📅 Total Agendamentos</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{stats.activeSchedules || 0}</div>
                    <div style={styles.statLabel}>🟢 Ativos</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{stats.totalLogs || 0}</div>
                    <div style={styles.statLabel}>📝 Total Logs</div>
                </div>
                {stats.logsByType && (
                    <div style={styles.statCard}>
                        <div style={styles.statNumber}>{stats.logsByType.error || 0}</div>
                        <div style={styles.statLabel}>❌ Erros</div>
                    </div>
                )}
            </div>

            <div style={styles.grid}>
                {/* Log Filters */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>🔍 Filtros de Logs</h3>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Agendamento</label>
                        <select
                            style={styles.select}
                            value={logFilter.scheduleId}
                            onChange={(e) =>
                                setLogFilter({
                                    ...logFilter,
                                    scheduleId: e.target.value,
                                })
                            }
                        >
                            <option value="">Todos os agendamentos</option>
                            {Array.isArray(scheduledMessages) &&
                                scheduledMessages.map((schedule) => (
                                    <option key={schedule.id} value={schedule.id}>
                                        {schedule.message.substring(0, 30)}...
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Tipo</label>
                        <select
                            style={styles.select}
                            value={logFilter.type}
                            onChange={(e) =>
                                setLogFilter({
                                    ...logFilter,
                                    type: e.target.value,
                                })
                            }
                        >
                            <option value="">Todos os tipos</option>
                            <option value="info">ℹ️ Informação</option>
                            <option value="success">✅ Sucesso</option>
                            <option value="warning">⚠️ Aviso</option>
                            <option value="error">❌ Erro</option>
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Limite</label>
                        <select
                            style={styles.select}
                            value={logFilter.limit}
                            onChange={(e) =>
                                setLogFilter({
                                    ...logFilter,
                                    limit: parseInt(e.target.value),
                                })
                            }
                        >
                            <option value={50}>50 logs</option>
                            <option value={100}>100 logs</option>
                            <option value={200}>200 logs</option>
                            <option value={500}>500 logs</option>
                        </select>
                    </div>

                    <div style={styles.buttonGroup}>
                        <button onClick={loadLogs} style={styles.button}>
                            🔄 Atualizar
                        </button>
                        <button
                            onClick={() => clearLogs()}
                            style={{
                                ...styles.button,
                                ...styles.buttonDanger,
                            }}
                        >
                            🗑️ Limpar Todos
                        </button>
                    </div>
                </div>

                {/* Type Stats */}
                {stats.logsByType && (
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>📊 Estatísticas por Tipo</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                            <div style={{ ...styles.statCard, backgroundColor: "#e3f2fd" }}>
                                <div style={{ ...styles.statNumber, fontSize: "1.5rem" }}>
                                    {stats.logsByType.info || 0}
                                </div>
                                <div style={styles.statLabel}>ℹ️ Info</div>
                            </div>
                            <div style={{ ...styles.statCard, backgroundColor: "#e8f5e8" }}>
                                <div style={{ ...styles.statNumber, fontSize: "1.5rem" }}>
                                    {stats.logsByType.success || 0}
                                </div>
                                <div style={styles.statLabel}>✅ Sucesso</div>
                            </div>
                            <div style={{ ...styles.statCard, backgroundColor: "#fff3e0" }}>
                                <div style={{ ...styles.statNumber, fontSize: "1.5rem" }}>
                                    {stats.logsByType.warning || 0}
                                </div>
                                <div style={styles.statLabel}>⚠️ Avisos</div>
                            </div>
                            <div style={{ ...styles.statCard, backgroundColor: "#ffebee" }}>
                                <div style={{ ...styles.statNumber, fontSize: "1.5rem" }}>
                                    {stats.logsByType.error || 0}
                                </div>
                                <div style={styles.statLabel}>❌ Erros</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Logs List */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📋 Logs dos Agendamentos ({logs.length})</h3>
                <div style={styles.logsContainer}>
                    {logs.length === 0 ? (
                        <p style={{ textAlign: "center", color: "#6c757d", padding: "20px" }}>
                            Nenhum log encontrado.
                        </p>
                    ) : (
                        logs.map((log) => (
                            <div
                                key={log.id}
                                style={{
                                    ...styles.logItem,
                                    borderLeft: `4px solid ${getLogColor(log.type)}`,
                                }}
                            >
                                <div style={styles.logHeader}>
                                    <span
                                        style={{
                                            ...styles.logType,
                                            backgroundColor: getLogColor(log.type),
                                            color: "#fff",
                                        }}
                                    >
                                        {getLogIcon(log.type)} {log.type.toUpperCase()}
                                    </span>
                                    <span style={styles.logTime}>
                                        {new Date(log.timestamp).toLocaleString("pt-PT")}
                                    </span>
                                </div>
                                <div style={styles.logMessage}>{log.message}</div>
                                {log.details && (
                                    <details style={{ marginTop: "10px" }}>
                                        <summary style={{ cursor: "pointer", color: "#007bff" }}>
                                            Ver detalhes
                                        </summary>
                                        <pre
                                            style={{
                                                background: "#f8f9fa",
                                                padding: "10px",
                                                borderRadius: "4px",
                                                fontSize: "0.8rem",
                                                overflow: "auto",
                                                maxHeight: "200px",
                                                marginTop: "8px",
                                            }}
                                        >
                                            {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogsTab;
