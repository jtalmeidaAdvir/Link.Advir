
import React from "react";

const ExternosTab = ({
    novoExternoContacto,
    setNovoExternoContacto,
    externosDisponiveis,
    obrasDisponiveis,
    externosContactos,
    handleCreateExternoContacto,
    deleteExternoContacto,
    styles,
}) => {
    return (
        <div style={styles.grid}>
            {/* Adicionar Contacto Externo */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>🏗️ Adicionar Contacto Externo</h3>
                <form onSubmit={handleCreateExternoContacto}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Trabalhador Externo *</label>
                        <select
                            style={styles.select}
                            value={novoExternoContacto.externoId}
                            onChange={(e) =>
                                setNovoExternoContacto({
                                    ...novoExternoContacto,
                                    externoId: e.target.value,
                                })
                            }
                            required
                        >
                            <option value="">Selecione um externo...</option>
                            {externosDisponiveis.map((externo) => (
                                <option key={externo.id} value={externo.id}>
                                    {externo.funcionario} - {externo.empresa} ({externo.categoria})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Número de Telefone *</label>
                        <input
                            type="tel"
                            style={styles.input}
                            value={novoExternoContacto.telefone}
                            onChange={(e) =>
                                setNovoExternoContacto({
                                    ...novoExternoContacto,
                                    telefone: e.target.value,
                                })
                            }
                            placeholder="351912345678 (com código do país)"
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label
                            style={{
                                ...styles.label,
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                                padding: "12px 16px",
                                backgroundColor: novoExternoContacto.autorizaEntradaObra ? "#e3f2fd" : "#f8f9fa",
                                borderRadius: "8px",
                                border: `2px solid ${novoExternoContacto.autorizaEntradaObra ? "#007bff" : "#e9ecef"}`,
                                transition: "all 0.3s ease",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={novoExternoContacto.autorizaEntradaObra}
                                onChange={(e) =>
                                    setNovoExternoContacto({
                                        ...novoExternoContacto,
                                        autorizaEntradaObra: e.target.checked,
                                    })
                                }
                                style={{
                                    marginRight: "12px",
                                    transform: "scale(1.2)",
                                }}
                            />
                            <div>
                                <span style={{ fontWeight: "600", color: "#343a40" }}>
                                    🚪 Autorizar entrada em obra
                                </span>
                                <div style={{
                                    fontSize: "0.85rem",
                                    color: "#6c757d",
                                    marginTop: "4px",
                                }}>
                                    Este externo pode dar entrada em obras
                                </div>
                            </div>
                        </label>
                    </div>

                    {novoExternoContacto.autorizaEntradaObra && (
                        <>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Obra Autorizada</label>
                                <select
                                    style={styles.select}
                                    value={novoExternoContacto.obraAutorizada}
                                    onChange={(e) =>
                                        setNovoExternoContacto({
                                            ...novoExternoContacto,
                                            obraAutorizada: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Todas as obras</option>
                                    {obrasDisponiveis.map((obra) => (
                                        <option key={obra.id} value={obra.id}>
                                            {obra.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Data de Autorização de Início</label>
                                <input
                                    type="date"
                                    style={styles.input}
                                    value={novoExternoContacto.dataAutorizacaoInicio}
                                    onChange={(e) =>
                                        setNovoExternoContacto({
                                            ...novoExternoContacto,
                                            dataAutorizacaoInicio: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Data de Autorização de Fim</label>
                                <input
                                    type="date"
                                    style={styles.input}
                                    value={novoExternoContacto.dataAutorizacaoFim}
                                    onChange={(e) =>
                                        setNovoExternoContacto({
                                            ...novoExternoContacto,
                                            dataAutorizacaoFim: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        style={{
                            ...styles.button,
                            ...styles.buttonSuccess,
                            width: "100%",
                        }}
                    >
                        ➕ Adicionar Contacto Externo
                    </button>
                </form>
            </div>

            {/* Lista de Contactos Externos */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📋 Contactos Externos ({externosContactos.length})</h3>
                {externosContactos.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#6c757d", padding: "20px" }}>
                        Nenhum contacto externo adicionado ainda.
                    </p>
                ) : (
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        {externosContactos.map((contacto) => {
                            const obraAutorizada = contacto.obraAutorizada
                                ? obrasDisponiveis.find((obra) => obra.id.toString() === contacto.obraAutorizada)?.nome ||
                                "Obra não encontrada"
                                : "Todas as obras";

                            return (
                                <div
                                    key={contacto.id}
                                    style={{
                                        ...styles.listItem,
                                        border: `2px solid ${contacto.autorizaEntradaObra ? "#28a745" : "#e9ecef"}`,
                                        backgroundColor: contacto.autorizaEntradaObra
                                            ? "#f8fff8"
                                            : styles.listItem.backgroundColor,
                                    }}
                                >
                                    <div style={styles.listContent}>
                                        <div style={styles.listTitle}>
                                            {contacto.autorizaEntradaObra && (
                                                <span style={{ color: "#28a745", marginRight: "8px" }}>🚪</span>
                                            )}
                                            {contacto.externoNome}
                                        </div>
                                        <div style={styles.listMeta}>🏢 {contacto.externoEmpresa}</div>
                                        <div style={styles.listMeta}>📱 {contacto.telefone}</div>
                                        {contacto.dataAutorizacaoInicio && (
                                            <div style={styles.listMeta}>
                                                📅 Início:{" "}
                                                {new Date(contacto.dataAutorizacaoInicio).toLocaleDateString("pt-PT")}
                                            </div>
                                        )}
                                        {contacto.dataAutorizacaoFim && (
                                            <div style={styles.listMeta}>
                                                📅 Fim:{" "}
                                                {new Date(contacto.dataAutorizacaoFim).toLocaleDateString("pt-PT")}
                                            </div>
                                        )}
                                        <div
                                            style={{
                                                ...styles.listMeta,
                                                color: contacto.autorizaEntradaObra ? "#28a745" : "#dc3545",
                                                fontWeight: "600",
                                            }}
                                        >
                                            {contacto.autorizaEntradaObra
                                                ? `✅ Autorizado: ${obraAutorizada}`
                                                : "❌ Sem autorização de obra"}
                                        </div>
                                    </div>
                                    <div style={styles.buttonGroup}>
                                        <button
                                            onClick={() => deleteExternoContacto(contacto.id)}
                                            style={{
                                                ...styles.button,
                                                ...styles.buttonDanger,
                                                padding: "8px 12px",
                                                fontSize: "0.85rem",
                                            }}
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExternosTab;
