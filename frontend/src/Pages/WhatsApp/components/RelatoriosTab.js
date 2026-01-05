import React, { useState, useEffect } from "react";
import { secureStorage } from '../../../utils/secureStorage';
const RelatoriosTab = ({ styles, API_BASE_URL }) => {
    const [relatorios, setRelatorios] = useState([]);
    const [obras, setObras] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editandoRelatorio, setEditandoRelatorio] = useState(null);
    const [obrasEdicao, setObrasEdicao] = useState([]);

    const [novoRelatorio, setNovoRelatorio] = useState({
        nome: "",
        tipo: "registos_obra_dia", // registos_obra_dia, resumo_mensal, mapa_registos
        empresa_id: "",
        obra_id: "",
        emails: "",
        frequency: "daily",
        time: "10:00",
        days: [1, 2, 3, 4, 5], // Segunda a Sexta por defeito
        enabled: true,
    });

    useEffect(() => {
        carregarRelatorios();
        carregarEmpresas();
    }, []);

    const carregarRelatorios = async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/relatorios-agendados`,
            );
            const data = await response.json();
            setRelatorios(data);
        } catch (error) {
            console.error("Erro ao carregar relatórios:", error);
        }
    };

    const carregarEmpresas = async () => {
        try {
            const token = secureStorage.getItem("loginToken");

            const response = await fetch("https://backend.advir.pt/api/empresas/listar", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Erro ao carregar empresas: ${response.status}`);
            }

            const data = await response.json();
            // Ensure data is an array
            setEmpresas(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Erro ao carregar empresas:", error);
            setEmpresas([]);
        }
    };

    const carregarObrasPorEmpresa = async (empresaId) => {
        if (!empresaId) {
            setObras([]);
            return;
        }

        try {
            const token = secureStorage.getItem("loginToken");

            const response = await fetch("https://backend.advir.pt/api/obra", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-empresa-id": empresaId,
                },
            });

            if (!response.ok) {
                throw new Error(`Erro ao carregar obras: ${response.status}`);
            }

            const data = await response.json();
            // Filtrar apenas obras ativas da empresa selecionada
            setObras(
                data.filter(
                    (o) =>
                        o.estado === "Ativo" &&
                        o.empresa_id.toString() === empresaId.toString(),
                ),
            );
        } catch (error) {
            console.error("Erro ao carregar obras:", error);
            setObras([]);
        }
    };

    const handleCriarRelatorio = async (e) => {
        e.preventDefault();

        if (!novoRelatorio.nome || !novoRelatorio.emails) {
            alert("Nome e destinatários de email são obrigatórios");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/relatorios-agendados`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...novoRelatorio,
                        obra_id: novoRelatorio.obra_id || novoRelatorio.empresa_id
                    }),
                },
            );

            if (response.ok) {
                alert("Relatório agendado com sucesso!");
                setNovoRelatorio({
                    nome: "",
                    tipo: "registos_obra_dia",
                    empresa_id: "",
                    obra_id: "",
                    emails: "",
                    frequency: "daily",
                    time: "10:00",
                    days: [1, 2, 3, 4, 5],
                    enabled: true,
                });
                setObras([]); // Limpar obras ao resetar
                carregarRelatorios();
            } else {
                const error = await response.json();
                alert(`Erro: ${error.error || "Erro ao criar relatório"}`);
            }
        } catch (error) {
            console.error("Erro ao criar relatório:", error);
            alert("Erro ao criar relatório agendado");
        } finally {
            setLoading(false);
        }
    };

    const toggleRelatorio = async (id, enabled) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/relatorios-agendados/${id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ enabled: !enabled }),
                },
            );

            if (response.ok) {
                carregarRelatorios();
            }
        } catch (error) {
            console.error("Erro ao alternar relatório:", error);
        }
    };

    const eliminarRelatorio = async (id) => {
        if (
            !confirm("Tem certeza que deseja eliminar este relatório agendado?")
        ) {
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/relatorios-agendados/${id}`,
                {
                    method: "DELETE",
                },
            );

            if (response.ok) {
                alert("Relatório eliminado com sucesso!");
                carregarRelatorios();
            }
        } catch (error) {
            console.error("Erro ao eliminar relatório:", error);
            alert("Erro ao eliminar relatório");
        }
    };

    const executarAgora = async (id) => {
        if (
            !confirm("Deseja executar este relatório agora e enviar por email?")
        ) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/relatorios-agendados/${id}/executar`,
                {
                    method: "POST",
                },
            );

            const data = await response.json();
            if (response.ok) {
                alert("Relatório executado e enviado com sucesso!");
            } else {
                alert(`Erro: ${data.error || "Erro ao executar relatório"}`);
            }
        } catch (error) {
            console.error("Erro ao executar relatório:", error);
            alert("Erro ao executar relatório");
        } finally {
            setLoading(false);
        }
    };

    const iniciarEdicao = async (relatorio) => {
        // Garantir que days é um array válido
        let daysArray = [];
        if (relatorio.days) {
            try {
                daysArray = typeof relatorio.days === 'string'
                    ? JSON.parse(relatorio.days)
                    : Array.isArray(relatorio.days)
                        ? relatorio.days
                        : [];
            } catch (e) {
                daysArray = [];
            }
        }

        setEditandoRelatorio({
            ...relatorio,
            days: daysArray,
            empresa_id: relatorio.empresa_id || "",
            obra_id: relatorio.obra_id || "",
        });

        // Carregar obras se houver empresa selecionada
        if (relatorio.empresa_id) {
            await carregarObrasPorEmpresaEdicao(relatorio.empresa_id);
        }

        // Scroll para o topo para mostrar o formulário de edição
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    const cancelarEdicao = () => {
        setEditandoRelatorio(null);
        setObrasEdicao([]);
    };

    const carregarObrasPorEmpresaEdicao = async (empresaId) => {
        if (!empresaId) {
            setObrasEdicao([]);
            return;
        }

        try {
            const token = secureStorage.getItem("loginToken");

            const response = await fetch("https://backend.advir.pt/api/obra", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-empresa-id": empresaId,
                },
            });

            if (!response.ok) {
                throw new Error(`Erro ao carregar obras: ${response.status}`);
            }

            const data = await response.json();
            setObrasEdicao(
                data.filter(
                    (o) =>
                        o.estado === "Ativo" &&
                        o.empresa_id.toString() === empresaId.toString(),
                ),
            );
        } catch (error) {
            console.error("Erro ao carregar obras:", error);
            setObrasEdicao([]);
        }
    };

    const handleEditarRelatorio = async (e) => {
        e.preventDefault();

        if (!editandoRelatorio.nome || !editandoRelatorio.emails) {
            alert("Nome e destinatários de email são obrigatórios");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/relatorios-agendados/${editandoRelatorio.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...editandoRelatorio,
                        obra_id: editandoRelatorio.obra_id || editandoRelatorio.empresa_id
                    }),
                },
            );

            if (response.ok) {
                alert("Relatório atualizado com sucesso!");
                setEditandoRelatorio(null);
                setObrasEdicao([]);
                carregarRelatorios();
            } else {
                const error = await response.json();
                alert(`Erro: ${error.error || "Erro ao atualizar relatório"}`);
            }
        } catch (error) {
            console.error("Erro ao atualizar relatório:", error);
            alert("Erro ao atualizar relatório");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.grid}>
            {/* Formulário de Edição (se estiver editando) */}
            {editandoRelatorio && (
                <div style={{ ...styles.card, backgroundColor: "#fff3cd", borderColor: "#ffc107" }}>
                    <h3 style={styles.cardTitle}>✏️ Editar Relatório</h3>
                    <form onSubmit={handleEditarRelatorio}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Nome do Relatório *</label>
                            <input
                                type="text"
                                style={styles.input}
                                value={editandoRelatorio.nome}
                                onChange={(e) =>
                                    setEditandoRelatorio({
                                        ...editandoRelatorio,
                                        nome: e.target.value,
                                    })
                                }
                                placeholder="Ex: Relatório Diário Obra X"
                                required
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Tipo de Relatório *</label>
                            <select
                                style={styles.select}
                                value={editandoRelatorio.tipo}
                                onChange={(e) =>
                                    setEditandoRelatorio({
                                        ...editandoRelatorio,
                                        tipo: e.target.value,
                                    })
                                }
                            >
                                <option value="registos_obra_dia">
                                    Registos de Ponto por Obra (Dia)
                                </option>
                                <option value="resumo_mensal">
                                    Resumo Mensal de Horas
                                </option>
                                <option value="mapa_registos">
                                    Mapa de Registos Geral
                                </option>
                                <option value="obras_ativas">
                                    Resumo de Obras Ativas
                                </option>
                                <option value="resumo_ausentes_dia">
                                    Resumo de Ausentes (Dia)
                                </option>
                            </select>
                        </div>

                        {(editandoRelatorio.tipo === "registos_obra_dia" ||
                            editandoRelatorio.tipo === "resumo_mensal" ||
                            editandoRelatorio.tipo === "resumo_ausentes_dia") && (
                                <>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Empresa (opcional)</label>
                                        <select
                                            style={styles.select}
                                            value={editandoRelatorio.empresa_id}
                                            onChange={(e) => {
                                                const empresaId = e.target.value;
                                                setEditandoRelatorio({
                                                    ...editandoRelatorio,
                                                    empresa_id: empresaId,
                                                    obra_id: "",
                                                });
                                                carregarObrasPorEmpresaEdicao(empresaId);
                                            }}
                                        >
                                            <option value="">Todas as empresas</option>
                                            {Array.isArray(empresas) && empresas.map((empresa) => (
                                                <option key={empresa.id} value={empresa.id}>
                                                    {empresa.empresa}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Obra (opcional)</label>
                                        <select
                                            style={styles.select}
                                            value={editandoRelatorio.obra_id}
                                            onChange={(e) =>
                                                setEditandoRelatorio({
                                                    ...editandoRelatorio,
                                                    obra_id: e.target.value,
                                                })
                                            }
                                            disabled={!editandoRelatorio.empresa_id && empresas.length > 0}
                                        >
                                            <option value="">
                                                {editandoRelatorio.empresa_id
                                                    ? "Todas as obras da empresa"
                                                    : "Selecione uma empresa primeiro"}
                                            </option>
                                            {obrasEdicao.map((obra) => (
                                                <option key={obra.id} value={obra.id}>
                                                    {obra.codigo} - {obra.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                Destinatários (Emails) *
                            </label>
                            <textarea
                                style={styles.textarea}
                                value={editandoRelatorio.emails}
                                onChange={(e) =>
                                    setEditandoRelatorio({
                                        ...editandoRelatorio,
                                        emails: e.target.value,
                                    })
                                }
                                placeholder="email1@exemplo.com, email2@exemplo.com"
                                rows="3"
                                required
                            />
                            <small style={{ color: "#6c757d" }}>
                                Separar múltiplos emails por vírgula
                            </small>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Frequência</label>
                            <select
                                style={styles.select}
                                value={editandoRelatorio.frequency}
                                onChange={(e) =>
                                    setEditandoRelatorio({
                                        ...editandoRelatorio,
                                        frequency: e.target.value,
                                        days:
                                            e.target.value === "daily"
                                                ? [1, 2, 3, 4, 5]
                                                : editandoRelatorio.days,
                                    })
                                }
                            >
                                <option value="daily">Diariamente</option>
                                <option value="custom">Dias Específicos</option>
                                <option value="weekly">Semanalmente</option>
                                <option value="monthly">Mensalmente</option>
                            </select>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Hora de Envio</label>
                            <input
                                type="time"
                                style={styles.input}
                                value={editandoRelatorio.time}
                                onChange={(e) =>
                                    setEditandoRelatorio({
                                        ...editandoRelatorio,
                                        time: e.target.value,
                                    })
                                }
                            />
                        </div>

                        {(editandoRelatorio.frequency === "weekly" ||
                            editandoRelatorio.frequency === "custom") && (
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Dias da Semana</label>
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: "10px",
                                        }}
                                    >
                                        {[
                                            "Segunda",
                                            "Terça",
                                            "Quarta",
                                            "Quinta",
                                            "Sexta",
                                            "Sábado",
                                            "Domingo",
                                        ].map((day, index) => (
                                            <label
                                                key={index}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    padding: "8px 12px",
                                                    backgroundColor:
                                                        editandoRelatorio.days.includes(
                                                            index + 1,
                                                        )
                                                            ? "#007bff"
                                                            : "#f8f9fa",
                                                    color: editandoRelatorio.days.includes(
                                                        index + 1,
                                                    )
                                                        ? "#fff"
                                                        : "#495057",
                                                    borderRadius: "6px",
                                                    cursor: "pointer",
                                                    fontSize: "0.9rem",
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    style={{ marginRight: "8px" }}
                                                    checked={editandoRelatorio.days.includes(
                                                        index + 1,
                                                    )}
                                                    onChange={(e) => {
                                                        const days = [
                                                            ...editandoRelatorio.days,
                                                        ];
                                                        if (e.target.checked) {
                                                            days.push(index + 1);
                                                        } else {
                                                            const i = days.indexOf(
                                                                index + 1,
                                                            );
                                                            if (i > -1)
                                                                days.splice(i, 1);
                                                        }
                                                        setEditandoRelatorio({
                                                            ...editandoRelatorio,
                                                            days,
                                                        });
                                                    }}
                                                />
                                                {day}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    ...styles.button,
                                    ...styles.buttonSuccess,
                                    flex: 1,
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                {loading ? "⏳ A guardar..." : "💾 Guardar Alterações"}
                            </button>
                            <button
                                type="button"
                                onClick={cancelarEdicao}
                                style={{
                                    ...styles.button,
                                    ...styles.buttonWarning,
                                    flex: 1,
                                }}
                            >
                                ❌ Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Criar Relatório */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📧 Agendar Relatório por Email</h3>
                <form onSubmit={handleCriarRelatorio}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Nome do Relatório *</label>
                        <input
                            type="text"
                            style={styles.input}
                            value={novoRelatorio.nome}
                            onChange={(e) =>
                                setNovoRelatorio({
                                    ...novoRelatorio,
                                    nome: e.target.value,
                                })
                            }
                            placeholder="Ex: Relatório Diário Obra X"
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Tipo de Relatório *</label>
                        <select
                            style={styles.select}
                            value={novoRelatorio.tipo}
                            onChange={(e) =>
                                setNovoRelatorio({
                                    ...novoRelatorio,
                                    tipo: e.target.value,
                                })
                            }
                        >
                            <option value="registos_obra_dia">
                                Registos de Ponto por Obra (Dia)
                            </option>
                            <option value="resumo_mensal">
                                Resumo Mensal de Horas
                            </option>
                            <option value="mapa_registos">
                                Mapa de Registos Geral
                            </option>
                            <option value="obras_ativas">
                                Resumo de Obras Ativas
                            </option>
                            <option value="resumo_ausentes_dia">
                                Resumo de Ausentes (Dia)
                            </option>
                        </select>
                    </div>

                    {(novoRelatorio.tipo === "registos_obra_dia" ||
                        novoRelatorio.tipo === "resumo_mensal" ||
                        novoRelatorio.tipo === "resumo_ausentes_dia") && (
                            <>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Empresa (opcional)</label>
                                    <select
                                        style={styles.select}
                                        value={novoRelatorio.empresa_id}
                                        onChange={(e) => {
                                            const empresaId = e.target.value;
                                            setNovoRelatorio({
                                                ...novoRelatorio,
                                                empresa_id: empresaId,
                                                obra_id: "", // Limpar obra quando trocar empresa
                                            });
                                            carregarObrasPorEmpresa(empresaId);
                                        }}
                                    >
                                        <option value="">Todas as empresas</option>
                                        {Array.isArray(empresas) && empresas.map((empresa) => (
                                            <option key={empresa.id} value={empresa.id}>
                                                {empresa.empresa}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Obra (opcional)</label>
                                    <select
                                        style={styles.select}
                                        value={novoRelatorio.obra_id}
                                        onChange={(e) =>
                                            setNovoRelatorio({
                                                ...novoRelatorio,
                                                obra_id: e.target.value,
                                            })
                                        }
                                        disabled={!novoRelatorio.empresa_id && empresas.length > 0}
                                    >
                                        <option value="">
                                            {novoRelatorio.empresa_id
                                                ? "Todas as obras da empresa"
                                                : "Selecione uma empresa primeiro"}
                                        </option>
                                        {obras.map((obra) => (
                                            <option key={obra.id} value={obra.id}>
                                                {obra.codigo} - {obra.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            Destinatários (Emails) *
                        </label>
                        <textarea
                            style={styles.textarea}
                            value={novoRelatorio.emails}
                            onChange={(e) =>
                                setNovoRelatorio({
                                    ...novoRelatorio,
                                    emails: e.target.value,
                                })
                            }
                            placeholder="email1@exemplo.com, email2@exemplo.com"
                            rows="3"
                            required
                        />
                        <small style={{ color: "#6c757d" }}>
                            Separar múltiplos emails por vírgula
                        </small>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Frequência</label>
                        <select
                            style={styles.select}
                            value={novoRelatorio.frequency}
                            onChange={(e) =>
                                setNovoRelatorio({
                                    ...novoRelatorio,
                                    frequency: e.target.value,
                                    days:
                                        e.target.value === "daily"
                                            ? [1, 2, 3, 4, 5]
                                            : [],
                                })
                            }
                        >
                            <option value="daily">Diariamente</option>
                            <option value="custom">Dias Específicos</option>
                            <option value="weekly">Semanalmente</option>
                            <option value="monthly">Mensalmente</option>
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Hora de Envio</label>
                        <input
                            type="time"
                            style={styles.input}
                            value={novoRelatorio.time}
                            onChange={(e) =>
                                setNovoRelatorio({
                                    ...novoRelatorio,
                                    time: e.target.value,
                                })
                            }
                        />
                    </div>

                    {(novoRelatorio.frequency === "weekly" ||
                        novoRelatorio.frequency === "custom") && (
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Dias da Semana</label>
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "10px",
                                    }}
                                >
                                    {[
                                        "Segunda",
                                        "Terça",
                                        "Quarta",
                                        "Quinta",
                                        "Sexta",
                                        "Sábado",
                                        "Domingo",
                                    ].map((day, index) => (
                                        <label
                                            key={index}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                padding: "8px 12px",
                                                backgroundColor:
                                                    novoRelatorio.days.includes(
                                                        index + 1,
                                                    )
                                                        ? "#007bff"
                                                        : "#f8f9fa",
                                                color: novoRelatorio.days.includes(
                                                    index + 1,
                                                )
                                                    ? "#fff"
                                                    : "#495057",
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                                fontSize: "0.9rem",
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                style={{ marginRight: "8px" }}
                                                checked={novoRelatorio.days.includes(
                                                    index + 1,
                                                )}
                                                onChange={(e) => {
                                                    const days = [
                                                        ...novoRelatorio.days,
                                                    ];
                                                    if (e.target.checked) {
                                                        days.push(index + 1);
                                                    } else {
                                                        const i = days.indexOf(
                                                            index + 1,
                                                        );
                                                        if (i > -1)
                                                            days.splice(i, 1);
                                                    }
                                                    setNovoRelatorio({
                                                        ...novoRelatorio,
                                                        days,
                                                    });
                                                }}
                                            />
                                            {day}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.button,
                            ...styles.buttonSuccess,
                            width: "100%",
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        {loading ? "⏳ A criar..." : "📧 Agendar Relatório"}
                    </button>
                </form>
            </div>

            {/* Lista de Relatórios */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>
                    📊 Relatórios Agendados ({relatorios.length})
                </h3>

                {relatorios.length === 0 ? (
                    <p
                        style={{
                            textAlign: "center",
                            color: "#6c757d",
                            padding: "20px",
                        }}
                    >
                        Nenhum relatório agendado ainda.
                    </p>
                ) : (
                    <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                        {relatorios.map((relatorio) => (
                            <div key={relatorio.id} style={styles.listItem}>
                                <div style={styles.listContent}>
                                    <div style={styles.listTitle}>
                                        {relatorio.nome}
                                    </div>
                                    <div style={styles.listMeta}>
                                        📋{" "}
                                        {relatorio.tipo === "registos_obra_dia"
                                            ? "Registos Diários"
                                            : relatorio.tipo === "resumo_mensal"
                                                ? "Resumo Mensal"
                                                : relatorio.tipo === "mapa_registos"
                                                    ? "Mapa de Registos"
                                                    : relatorio.tipo === "resumo_ausentes_dia"
                                                        ? "Resumo de Ausentes"
                                                        : "Obras Ativas"}
                                    </div>
                                    <div style={styles.listMeta}>
                                        📧 {relatorio.emails.split(",").length}{" "}
                                        destinatário(s)
                                    </div>
                                    <div style={styles.listMeta}>
                                        🕐{" "}
                                        {relatorio.frequency === "daily"
                                            ? "Diário"
                                            : relatorio.frequency === "weekly"
                                                ? "Semanal"
                                                : relatorio.frequency === "custom"
                                                    ? "Dias Específicos"
                                                    : "Mensal"}{" "}
                                        às {relatorio.time}
                                    </div>
                                    <div style={styles.listMeta}>
                                        {relatorio.enabled
                                            ? "✅ Ativo"
                                            : "⏸️ Pausado"}
                                    </div>
                                    {relatorio.last_sent && (
                                        <div style={styles.listMeta}>
                                            📤 Último envio:{" "}
                                            {new Date(
                                                relatorio.last_sent,
                                            ).toLocaleString("pt-PT")}
                                        </div>
                                    )}
                                </div>
                                <div style={styles.buttonGroup}>
                                    <button
                                        onClick={() =>
                                            executarAgora(relatorio.id)
                                        }
                                        disabled={loading}
                                        style={{
                                            ...styles.button,
                                            padding: "6px 10px",
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        ▶️ Executar
                                    </button>
                                    <button
                                        onClick={() => iniciarEdicao(relatorio)}
                                        style={{
                                            ...styles.button,
                                            backgroundColor: "#17a2b8",
                                            color: "white",
                                            padding: "6px 10px",
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onClick={() =>
                                            toggleRelatorio(
                                                relatorio.id,
                                                relatorio.enabled,
                                            )
                                        }
                                        style={{
                                            ...styles.button,
                                            ...(relatorio.enabled
                                                ? styles.buttonWarning
                                                : styles.buttonSuccess),
                                            padding: "6px 10px",
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        {relatorio.enabled
                                            ? "⏸️ Pausar"
                                            : "▶️ Ativar"}
                                    </button>
                                    <button
                                        onClick={() =>
                                            eliminarRelatorio(relatorio.id)
                                        }
                                        style={{
                                            ...styles.button,
                                            ...styles.buttonDanger,
                                            padding: "6px 10px",
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RelatoriosTab;