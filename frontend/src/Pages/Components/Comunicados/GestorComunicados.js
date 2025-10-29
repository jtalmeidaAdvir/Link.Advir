import React, { useState, useEffect } from "react";
import { secureStorage } from "../../../utils/secureStorage";

const GestorComunicados = () => {
    const [comunicados, setComunicados] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [comunicadoSelecionado, setComunicadoSelecionado] = useState(null);
    const [estatisticas, setEstatisticas] = useState(null);

    const [novoComunicado, setNovoComunicado] = useState({
        titulo: "",
        mensagem: "",
        destinatarios_tipo: "todos",
        destinatarios_ids: [],
        prioridade: "normal",
        data_expiracao: "",
    });

    const token = secureStorage.getItem("loginToken");
    const userId = secureStorage.getItem("userId");

    useEffect(() => {
        carregarComunicados();
        carregarUsuarios();
    }, []);

    const carregarComunicados = async () => {
        try {
            const response = await fetch(
                "https://backend.advir.pt/api/comunicados",
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            const data = await response.json();
            if (data.success) {
                setComunicados(data.data);
            }
        } catch (error) {
            console.error("Erro ao carregar comunicados:", error);
        }
    };

    const carregarUsuarios = async () => {
        try {
            const empresaId = secureStorage.getItem("empresa_id");
            if (!empresaId) {
                console.error("Empresa não selecionada");
                return;
            }

            const response = await fetch(
                `https://backend.advir.pt/api/users?empresaId=${empresaId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const data = await response.json();
            if (data.success) {
                setUsuarios(data.users);
            }
        } catch (error) {
            console.error("Erro ao carregar usuários:", error);
        }
    };

    const criarComunicado = async () => {
        try {
            const response = await fetch(
                "https://backend.advir.pt/api/comunicados",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        ...novoComunicado,
                        remetente_id: userId,
                    }),
                },
            );

            const data = await response.json();
            if (data.success) {
                alert("Comunicado criado com sucesso!");
                setNovoComunicado({
                    titulo: "",
                    mensagem: "",
                    destinatarios_tipo: "todos",
                    destinatarios_ids: [],
                    prioridade: "normal",
                    data_expiracao: "",
                });
                carregarComunicados();
            }
        } catch (error) {
            console.error("Erro ao criar comunicado:", error);
            alert("Erro ao criar comunicado");
        }
    };

    const verEstatisticas = async (comunicadoId) => {
        try {
            const response = await fetch(
                `https://backend.advir.pt/api/comunicados/${comunicadoId}/estatisticas`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            const data = await response.json();
            if (data.success) {
                setEstatisticas(data.data);
                setComunicadoSelecionado(
                    comunicados.find((c) => c.id === comunicadoId),
                );
                setMostrarModal(true);
            }
        } catch (error) {
            console.error("Erro ao obter estatísticas:", error);
        }
    };

    const desativarComunicado = async (id) => {
        if (!confirm("Deseja realmente desativar este comunicado?")) return;

        try {
            const response = await fetch(
                `https://backend.advir.pt/api/comunicados/${id}/desativar`,
                {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            const data = await response.json();
            if (data.success) {
                alert("Comunicado desativado com sucesso!");
                carregarComunicados();
            }
        } catch (error) {
            console.error("Erro ao desativar comunicado:", error);
        }
    };

    const handleDestinatariosChange = (userId) => {
        setNovoComunicado((prev) => {
            const ids = prev.destinatarios_ids.includes(userId)
                ? prev.destinatarios_ids.filter((id) => id !== userId)
                : [...prev.destinatarios_ids, userId];
            return { ...prev, destinatarios_ids: ids };
        });
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>📢 Gestor de Comunicados</h1>

            {/* Formulário de Novo Comunicado */}
            <div style={styles.formCard}>
                <h2 style={styles.subtitle}>Criar Novo Comunicado</h2>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Título *</label>
                    <input
                        type="text"
                        style={styles.input}
                        value={novoComunicado.titulo}
                        onChange={(e) =>
                            setNovoComunicado({
                                ...novoComunicado,
                                titulo: e.target.value,
                            })
                        }
                        placeholder="Título do comunicado"
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Mensagem *</label>
                    <textarea
                        style={styles.textarea}
                        value={novoComunicado.mensagem}
                        onChange={(e) =>
                            setNovoComunicado({
                                ...novoComunicado,
                                mensagem: e.target.value,
                            })
                        }
                        placeholder="Digite a mensagem do comunicado"
                        rows="5"
                    />
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Destinatários</label>
                        <select
                            style={styles.select}
                            value={novoComunicado.destinatarios_tipo}
                            onChange={(e) =>
                                setNovoComunicado({
                                    ...novoComunicado,
                                    destinatarios_tipo: e.target.value,
                                    destinatarios_ids: [],
                                })
                            }
                        >
                            <option value="todos">
                                Todos os colaboradores
                            </option>
                            <option value="especificos">
                                Colaboradores específicos
                            </option>
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Prioridade</label>
                        <select
                            style={styles.select}
                            value={novoComunicado.prioridade}
                            onChange={(e) =>
                                setNovoComunicado({
                                    ...novoComunicado,
                                    prioridade: e.target.value,
                                })
                            }
                        >
                            <option value="baixa">Baixa</option>
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>
                </div>

                {novoComunicado.destinatarios_tipo === "especificos" && (
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            Selecionar Colaboradores
                        </label>
                        <div style={styles.checkboxContainer}>
                            {usuarios.map((user) => (
                                <label
                                    key={user.id}
                                    style={styles.checkboxLabel}
                                >
                                    <input
                                        type="checkbox"
                                        checked={novoComunicado.destinatarios_ids.includes(
                                            user.id,
                                        )}
                                        onChange={() =>
                                            handleDestinatariosChange(user.id)
                                        }
                                    />
                                    <span style={styles.checkboxText}>
                                        {user.nome || user.username}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <div style={styles.formGroup}>
                    <label style={styles.label}>
                        Data de Expiração (opcional)
                    </label>
                    <input
                        type="datetime-local"
                        style={styles.input}
                        value={novoComunicado.data_expiracao}
                        onChange={(e) =>
                            setNovoComunicado({
                                ...novoComunicado,
                                data_expiracao: e.target.value,
                            })
                        }
                    />
                </div>

                <button
                    style={styles.btnPrimary}
                    onClick={criarComunicado}
                    disabled={
                        !novoComunicado.titulo || !novoComunicado.mensagem
                    }
                >
                    📤 Enviar Comunicado
                </button>
            </div>

            {/* Lista de Comunicados */}
            <div style={styles.listCard}>
                <h2 style={styles.subtitle}>Comunicados Enviados</h2>
                {comunicados.length === 0 ? (
                    <p style={styles.emptyText}>
                        Nenhum comunicado enviado ainda.
                    </p>
                ) : (
                    comunicados.map((com) => (
                        <div key={com.id} style={styles.comunicadoItem}>
                            <div style={styles.comunicadoHeader}>
                                <div>
                                    <h3 style={styles.comunicadoTitulo}>
                                        {com.titulo}
                                        <span
                                            style={getPrioridadeStyle(
                                                com.prioridade,
                                            )}
                                        >
                                            {com.prioridade.toUpperCase()}
                                        </span>
                                    </h3>
                                    <p style={styles.comunicadoMeta}>
                                        Enviado em{" "}
                                        {new Date(
                                            com.data_criacao,
                                        ).toLocaleString("pt-PT")}
                                    </p>
                                </div>
                                <div style={styles.comunicadoActions}>
                                    <button
                                        style={styles.btnStats}
                                        onClick={() => verEstatisticas(com.id)}
                                    >
                                        📊 Estatísticas
                                    </button>
                                    <button
                                        style={styles.btnDanger}
                                        onClick={() =>
                                            desativarComunicado(com.id)
                                        }
                                    >
                                        🗑️ Desativar
                                    </button>
                                </div>
                            </div>
                            <p style={styles.comunicadoMensagem}>
                                {com.mensagem}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Estatísticas */}
            {mostrarModal && estatisticas && comunicadoSelecionado && (
                <div
                    style={styles.modalOverlay}
                    onClick={() => setMostrarModal(false)}
                >
                    <div
                        style={styles.modalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={styles.modalTitle}>
                            📊 Estatísticas de Leitura
                        </h2>
                        <h3 style={styles.modalSubtitle}>
                            {comunicadoSelecionado.titulo}
                        </h3>

                        <div style={styles.statsGrid}>
                            <div style={styles.statCard}>
                                <div style={styles.statNumber}>
                                    {estatisticas.total_destinatarios}
                                </div>
                                <div style={styles.statLabel}>
                                    Total Destinatários
                                </div>
                            </div>
                            <div
                                style={{
                                    ...styles.statCard,
                                    ...styles.statCardSuccess,
                                }}
                            >
                                <div style={styles.statNumber}>
                                    {estatisticas.total_lidos}
                                </div>
                                <div style={styles.statLabel}>Lidos</div>
                            </div>
                            <div
                                style={{
                                    ...styles.statCard,
                                    ...styles.statCardWarning,
                                }}
                            >
                                <div style={styles.statNumber}>
                                    {estatisticas.total_nao_lidos}
                                </div>
                                <div style={styles.statLabel}>Não Lidos</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={styles.statNumber}>
                                    {estatisticas.percentagem_leitura}%
                                </div>
                                <div style={styles.statLabel}>
                                    Taxa de Leitura
                                </div>
                            </div>
                        </div>

                        <div style={styles.listsContainer}>
                            <div style={styles.listSection}>
                                <h4 style={styles.listTitle}>
                                    ✅ Leram ({estatisticas.lidos.length})
                                </h4>
                                {estatisticas.lidos.map((l) => (
                                    <div
                                        key={l.usuario_id}
                                        style={styles.listItem}
                                    >
                                        {l.usuario_nome}
                                        <span style={styles.listItemDate}>
                                            {new Date(
                                                l.data_leitura,
                                            ).toLocaleString("pt-PT")}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div style={styles.listSection}>
                                <h4 style={styles.listTitle}>
                                    ❌ Não Leram (
                                    {estatisticas.nao_lidos.length})
                                </h4>
                                {estatisticas.nao_lidos.map((l) => (
                                    <div
                                        key={l.usuario_id}
                                        style={styles.listItem}
                                    >
                                        {l.usuario_nome}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            style={styles.btnClose}
                            onClick={() => setMostrarModal(false)}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const getPrioridadeStyle = (prioridade) => {
    const baseStyle = {
        marginLeft: "10px",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "bold",
    };

    const colors = {
        baixa: { backgroundColor: "#d1ecf1", color: "#0c5460" },
        normal: { backgroundColor: "#d4edda", color: "#155724" },
        alta: { backgroundColor: "#fff3cd", color: "#856404" },
        urgente: { backgroundColor: "#f8d7da", color: "#721c24" },
    };

    return { ...baseStyle, ...colors[prioridade] };
};

const styles = {
    container: {
        padding: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
    },
    title: {
        fontSize: "28px",
        fontWeight: "bold",
        marginBottom: "20px",
        color: "#333",
    },
    subtitle: {
        fontSize: "20px",
        fontWeight: "600",
        marginBottom: "15px",
        color: "#555",
    },
    formCard: {
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "24px",
        marginBottom: "24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    },
    listCard: {
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    },
    formGroup: {
        marginBottom: "16px",
    },
    formRow: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
    },
    label: {
        display: "block",
        marginBottom: "8px",
        fontWeight: "500",
        color: "#555",
    },
    input: {
        width: "100%",
        padding: "10px",
        border: "1px solid #ddd",
        borderRadius: "6px",
        fontSize: "14px",
    },
    textarea: {
        width: "100%",
        padding: "10px",
        border: "1px solid #ddd",
        borderRadius: "6px",
        fontSize: "14px",
        resize: "vertical",
    },
    select: {
        width: "100%",
        padding: "10px",
        border: "1px solid #ddd",
        borderRadius: "6px",
        fontSize: "14px",
    },
    checkboxContainer: {
        maxHeight: "200px",
        overflowY: "auto",
        border: "1px solid #ddd",
        borderRadius: "6px",
        padding: "10px",
    },
    checkboxLabel: {
        display: "flex",
        alignItems: "center",
        padding: "8px",
        cursor: "pointer",
    },
    checkboxText: {
        marginLeft: "8px",
    },
    btnPrimary: {
        backgroundColor: "#1792FE",
        color: "white",
        border: "none",
        padding: "12px 24px",
        borderRadius: "6px",
        fontSize: "16px",
        fontWeight: "500",
        cursor: "pointer",
        width: "100%",
    },
    btnStats: {
        backgroundColor: "#17a2b8",
        color: "white",
        border: "none",
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "14px",
        cursor: "pointer",
        marginRight: "8px",
    },
    btnDanger: {
        backgroundColor: "#dc3545",
        color: "white",
        border: "none",
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "14px",
        cursor: "pointer",
    },
    btnClose: {
        backgroundColor: "#6c757d",
        color: "white",
        border: "none",
        padding: "10px 20px",
        borderRadius: "6px",
        fontSize: "14px",
        cursor: "pointer",
        marginTop: "20px",
    },
    comunicadoItem: {
        borderBottom: "1px solid #eee",
        padding: "16px 0",
    },
    comunicadoHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "12px",
    },
    comunicadoTitulo: {
        fontSize: "18px",
        fontWeight: "600",
        color: "#333",
        marginBottom: "4px",
    },
    comunicadoMeta: {
        fontSize: "12px",
        color: "#888",
        margin: 0,
    },
    comunicadoMensagem: {
        fontSize: "14px",
        color: "#555",
        lineHeight: "1.6",
    },
    comunicadoActions: {
        display: "flex",
    },
    emptyText: {
        textAlign: "center",
        color: "#888",
        padding: "40px",
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "32px",
        maxWidth: "800px",
        width: "90%",
        maxHeight: "80vh",
        overflowY: "auto",
    },
    modalTitle: {
        fontSize: "24px",
        fontWeight: "bold",
        marginBottom: "8px",
        color: "#333",
    },
    modalSubtitle: {
        fontSize: "18px",
        color: "#666",
        marginBottom: "24px",
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
        marginBottom: "24px",
    },
    statCard: {
        backgroundColor: "#f8f9fa",
        padding: "20px",
        borderRadius: "8px",
        textAlign: "center",
    },
    statCardSuccess: {
        backgroundColor: "#d4edda",
    },
    statCardWarning: {
        backgroundColor: "#fff3cd",
    },
    statNumber: {
        fontSize: "32px",
        fontWeight: "bold",
        color: "#333",
    },
    statLabel: {
        fontSize: "14px",
        color: "#666",
        marginTop: "4px",
    },
    listsContainer: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px",
    },
    listSection: {
        backgroundColor: "#f8f9fa",
        padding: "16px",
        borderRadius: "8px",
    },
    listTitle: {
        fontSize: "16px",
        fontWeight: "600",
        marginBottom: "12px",
        color: "#333",
    },
    listItem: {
        padding: "8px",
        borderBottom: "1px solid #dee2e6",
        fontSize: "14px",
        color: "#555",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    listItemDate: {
        fontSize: "12px",
        color: "#888",
    },
};

export default GestorComunicados;
