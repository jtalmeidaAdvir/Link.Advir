import React, { useState, useEffect } from "react";
import { secureStorage } from '../../utils/secureStorage';
const EditarRegistoModalWeb = ({ registo, visible, onClose, onSave }) => {
    const [registosEditaveis, setRegistosEditaveis] = useState([]);
    const [registosOriginais, setRegistosOriginais] = useState([]);
    const [obras, setObras] = useState([]);

    useEffect(() => {
        console.log('Modal recebeu registo:', registo); // Debug

        // Carregar obras disponíveis
        const carregarObras = async () => {
            const token = secureStorage.getItem('loginToken');
            const empresaId = secureStorage.getItem('empresa_id');

            if (!empresaId) {
                console.error('ID da empresa não encontrado');
                return;
            }

            try {
                const res = await fetch(`https://backend.advir.pt/api/obra/por-empresa?empresa_id=${empresaId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                setObras(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Erro ao carregar obras:', err);
            }
        };

        carregarObras();

        if (registo && registo.registosOriginais && registo.registosOriginais.length > 0) {
            // Organizar registos por timestamp (ordem cronológica)
            const registosOrdenados = [...registo.registosOriginais].sort(
                (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
            );

            console.log('Registos ordenados:', registosOrdenados); // Debug

            // Criar estrutura editável para cada registo individual
            const editaveis = registosOrdenados.map((reg, index) => ({
                id: reg.id || `registo_${index}`,
                tipo: reg.tipo || 'entrada',
                hora: new Date(reg.timestamp).toTimeString().substring(0, 5),
                obra: reg.Obra?.nome || reg.obra || "Não definida",
                obraId: reg.obra_id || reg.Obra?.id || '',
                confirmado: reg.is_confirmed || false,
                timestamp: reg.timestamp,
                index: index,
                isOriginal: true,
            }));

            console.log('Registos editáveis criados:', editaveis); // Debug
            setRegistosEditaveis(editaveis);
            setRegistosOriginais(registosOrdenados);
        } else {
            // Se não há registos originais, criar uma estrutura vazia para poder adicionar
            console.log('Nenhum registo original encontrado, iniciando vazio');
            setRegistosEditaveis([]);
            setRegistosOriginais([]);
        }
    }, [registo]);

    const atualizarHora = (index, novaHora) => {
        setRegistosEditaveis((prev) =>
            prev.map((reg, i) => (i === index ? { ...reg, hora: novaHora } : reg)),
        );
    };

    const removerRegisto = (index) => {
        setRegistosEditaveis((prev) => prev.filter((_, i) => i !== index));
    };

    const adicionarNovoRegisto = () => {
        // Se não há registos editáveis, pré-carregar os 4 pontos padrão
        if (registosEditaveis.length === 0) {
            const pontosPreCarregados = [
                {
                    id: `novo_entrada_manha_${Date.now()}`,
                    tipo: "entrada",
                    hora: "09:00",
                    obra: "Selecione uma obra",
                    obraId: '',
                    confirmado: false,
                    timestamp: null,
                    index: 0,
                },
                {
                    id: `novo_saida_manha_${Date.now()}`,
                    tipo: "saida",
                    hora: "13:00",
                    obra: "Selecione uma obra",
                    obraId: '',
                    confirmado: false,
                    timestamp: null,
                    index: 1,
                },
                {
                    id: `novo_entrada_tarde_${Date.now()}`,
                    tipo: "entrada",
                    hora: "14:00",
                    obra: "Selecione uma obra",
                    obraId: '',
                    confirmado: false,
                    timestamp: null,
                    index: 2,
                },
                {
                    id: `novo_saida_tarde_${Date.now()}`,
                    tipo: "saida",
                    hora: "18:00",
                    obra: "Selecione uma obra",
                    obraId: '',
                    confirmado: false,
                    timestamp: null,
                    index: 3,
                }
            ];
            setRegistosEditaveis(pontosPreCarregados);
        } else {
            // Caso já existam registos, adicionar apenas um registo individual
            const novoRegisto = {
                id: `novo_${Date.now()}`,
                tipo: "entrada",
                hora: "09:00",
                obra: "Selecione uma obra",
                obraId: '',
                confirmado: false,
                timestamp: null,
                index: registosEditaveis.length,
            };
            setRegistosEditaveis((prev) => [...prev, novoRegisto]);
        }
    };

    const alterarTipoRegisto = (index, novoTipo) => {
        setRegistosEditaveis((prev) =>
            prev.map((reg, i) => (i === index ? { ...reg, tipo: novoTipo } : reg)),
        );
    };

    const alterarObraRegisto = (index, novaObraId) => {
        const obraSelecionada = obras.find(o => o.id.toString() === novaObraId.toString());
        setRegistosEditaveis((prev) =>
            prev.map((reg, i) => (i === index ? {
                ...reg,
                obraId: novaObraId,
                obra: obraSelecionada ? obraSelecionada.nome : 'Obra não encontrada'
            } : reg)),
        );
    };

    const handleSave = async () => {
        if (registosEditaveis.length === 0) {
            alert("Deve ter pelo menos um registo.");
            return;
        }

        // Validar horários e obras
        for (let i = 0; i < registosEditaveis.length; i++) {
            if (!registosEditaveis[i].hora) {
                alert(`Por favor, preencha a hora do registo ${i + 1}.`);
                return;
            }
            if (!registosEditaveis[i].obraId && !registosEditaveis[i].isOriginal) {
                alert(`Por favor, selecione uma obra para o registo ${i + 1}.`);
                return;
            }
        }

        try {
            const token = secureStorage.getItem("loginToken");

            // Preparar dados para salvar
            const dadosParaSalvar = {
                registosEditados: registosEditaveis.map((reg) => ({
                    id: reg.id,
                    tipo: reg.tipo,
                    hora: reg.hora,
                    obraId: reg.obraId,
                    isNovo: reg.id.toString().startsWith("novo_"),
                })),
                registosOriginais: registosOriginais,
                dia: registo.dia,
                userId: registo.utilizadorId || registo.userId,
            };

            // Usar callback personalizado se disponível, senão usar endpoint padrão
            if (onSave && typeof onSave === "function") {
                await onSave(dadosParaSalvar);
            } else {
                // Endpoint padrão (mantido para compatibilidade)
                const response = await fetch(
                    `https://backend.advir.pt/api/registoPonto/editar-direto/${registo.id}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            registosEditados: registosEditaveis,
                        }),
                    },
                );

                if (response.ok) {
                    alert("Registos editados com sucesso!");
                } else {
                    const errorData = await response.json();
                    alert(errorData.message || "Não foi possível editar os registos.");
                    return;
                }
            }

            onClose();
        } catch (error) {
            console.error("Erro ao editar registos:", error);
            alert("Erro de rede ao editar registos.");
        }
    };

    const getIconeByTipo = (tipo) => {
        switch (tipo) {
            case "entrada":
                return "🟢";
            case "saida":
                return "🔴";
            case "pausa":
                return "⏸️";
            case "retorno":
                return "▶️";
            default:
                return "🕐";
        }
    };

    const getCorByTipo = (tipo) => {
        switch (tipo) {
            case "entrada":
                return "#28a745";
            case "saida":
                return "#dc3545";
            case "pausa":
                return "#ffc107";
            case "retorno":
                return "#17a2b8";
            default:
                return "#6c757d";
        }
    };

    if (!visible) return null;

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContainer}>
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>✏️ Editar Registos de Ponto</h3>
                    <p style={styles.modalSubtitle}>
                        {registo?.utilizador} - Dia {registo?.dia}
                    </p>
                    <button style={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div style={styles.formContainer}>
                    {registosOriginais.length > 0 && (
                        <div style={styles.currentRegistosInfo}>
                            <div style={styles.currentRegistosHeader}>
                                <span style={styles.icon}>📊</span>
                                <span style={styles.currentRegistosTitle}>
                                    Registos Existentes:
                                </span>
                            </div>
                            <div style={styles.registosList}>
                                {registosOriginais.map((reg, idx) => (
                                    <div key={idx} style={styles.registoOriginalItem}>
                                        <span style={styles.registoNumero}>#{idx + 1}</span>
                                        <span style={{ color: getCorByTipo(reg.tipo) }}>
                                            {getIconeByTipo(reg.tipo)} {reg.tipo.toUpperCase()}:
                                        </span>
                                        <span style={styles.registoHora}>
                                            {new Date(reg.timestamp).toLocaleTimeString("pt-PT", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                        {reg.Obra && (
                                            <span style={styles.registoObra}>({reg.Obra.nome})</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div style={styles.infoNote}>
                                Os registos existentes serão substituídos pelos novos valores
                                abaixo.
                            </div>
                        </div>
                    )}

                    <div style={styles.editRegistosSection}>
                        <div style={styles.sectionHeader}>
                            <span style={styles.icon}>✏️</span>
                            <span style={styles.sectionTitle}>Editar Registos:</span>
                            <button
                                style={styles.addButton}
                                onClick={adicionarNovoRegisto}
                                title={registosEditaveis.length === 0 ? "Pré-carregar 4 pontos padrão" : "Adicionar novo registo"}
                            >
                                {registosEditaveis.length === 0 ? "⚡ Pré-carregar 4 Pontos" : "➕ Adicionar"}
                            </button>
                        </div>

                        {registosEditaveis.length === 0 ? (
                            <div style={styles.emptyState}>
                                <p style={styles.emptyMessage}>
                                    📝 Nenhum registo para editar.
                                </p>
                                <p style={styles.emptyHint}>
                                    Clique em "⚡ Pré-carregar 4 Pontos" para criar automaticamente os 4 pontos padrão do dia (entrada manhã, saída manhã, entrada tarde, saída tarde).
                                </p>
                            </div>
                        ) : (
                            <div style={styles.registosEditaveisList}>
                                {registosEditaveis.map((registo, index) => (
                                    <div
                                        key={`${registo.id}_${index}`}
                                        style={{
                                            ...styles.registoEditavelItem,
                                            border: registo.isOriginal
                                                ? '2px solid #38a169'
                                                : registo.id.toString().startsWith("novo_")
                                                    ? '2px solid #3182ce'
                                                    : '2px solid #e2e8f0'
                                        }}
                                    >
                                        <div style={styles.registoEditavelHeader}>
                                            <div style={styles.registoEditavelNumero}>
                                                <span style={styles.registoNumeroTag}>
                                                    #{index + 1}
                                                </span>
                                                <span style={{ color: getCorByTipo(registo.tipo) }}>
                                                    {getIconeByTipo(registo.tipo)}{" "}
                                                    {registo.tipo.toUpperCase()}
                                                </span>
                                                {registo.id.toString().startsWith("novo_") && (
                                                    <span style={styles.novoTag}>NOVO</span>
                                                )}
                                                {registo.isOriginal && (
                                                    <span style={styles.originalTag}>ORIGINAL</span>
                                                )}
                                            </div>
                                            <div style={styles.actionButtons}>
                                                <button
                                                    style={styles.removeButton}
                                                    onClick={() => removerRegisto(index)}
                                                    title="Remover este registo"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>

                                        <div style={styles.registoEditavelInputs}>
                                            <div style={styles.inputGroup}>
                                                <label style={styles.inputLabel}>Tipo:</label>
                                                <select
                                                    style={styles.tipoSelect}
                                                    value={registo.tipo}
                                                    onChange={(e) =>
                                                        alterarTipoRegisto(index, e.target.value)
                                                    }
                                                >
                                                    <option value="entrada">🟢 Entrada</option>
                                                    <option value="saida">🔴 Saída</option>
                                                    <option value="pausa">⏸️ Pausa</option>
                                                    <option value="retorno">▶️ Retorno</option>
                                                </select>
                                            </div>

                                            <div style={styles.inputGroup}>
                                                <label style={styles.inputLabel}>Hora:</label>
                                                <input
                                                    type="time"
                                                    style={styles.timeInput}
                                                    value={registo.hora}
                                                    onChange={(e) => atualizarHora(index, e.target.value)}
                                                />
                                            </div>

                                            <div style={styles.inputGroup}>
                                                <label style={styles.inputLabel}>Obra:</label>
                                                {registo.isOriginal ? (
                                                    <div style={styles.obraReadonly}>
                                                        {registo.obra}
                                                    </div>
                                                ) : (
                                                    <select
                                                        style={styles.obraSelect}
                                                        value={registo.obraId || ''}
                                                        onChange={(e) =>
                                                            alterarObraRegisto(index, e.target.value)
                                                        }
                                                    >
                                                        <option value="">-- Selecione uma obra --</option>
                                                        {obras.map(obra => (
                                                            <option key={obra.id} value={obra.id}>
                                                                {obra.nome}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </div>

                                        {registo.isOriginal && (
                                            <div style={styles.registoOriginalInfo}>
                                                <div style={styles.registoInfo}>
                                                    <span style={styles.infoLabel}>Hora Original:</span>
                                                    <span style={styles.infoValue}>
                                                        {new Date(registo.timestamp).toLocaleTimeString('pt-PT', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <div style={styles.registoInfo}>
                                                    <span style={styles.infoLabel}>Obra:</span>
                                                    <span style={styles.infoValue}>{registo.obra}</span>
                                                </div>
                                                <div style={styles.registoInfo}>
                                                    <span style={styles.infoLabel}>Status:</span>
                                                    <span style={{
                                                        ...styles.infoValue,
                                                        color: registo.confirmado ? '#38a169' : '#e53e3e',
                                                        fontWeight: '600'
                                                    }}>
                                                        {registo.confirmado ? '✅ Confirmado' : '⏳ Pendente'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {registo.obra !== "N/A" && !registo.isOriginal && (
                                            <div style={styles.registoInfo}>
                                                <span style={styles.infoLabel}>Obra:</span>
                                                <span style={styles.infoValue}>{registo.obra}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={styles.resumoSection}>
                        <div style={styles.resumoHeader}>
                            <span style={styles.icon}>📈</span>
                            <span style={styles.resumoTitle}>Resumo:</span>
                        </div>
                        <div style={styles.resumoContent}>
                            <div>
                                Total de registos: <strong>{registosEditaveis.length}</strong>
                            </div>
                            <div>
                                Entradas:{" "}
                                <strong>
                                    {registosEditaveis.filter((r) => r.tipo === "entrada").length}
                                </strong>
                            </div>
                            <div>
                                Saídas:{" "}
                                <strong>
                                    {registosEditaveis.filter((r) => r.tipo === "saida").length}
                                </strong>
                            </div>
                            <div>
                                Pausas:{" "}
                                <strong>
                                    {registosEditaveis.filter((r) => r.tipo === "pausa").length}
                                </strong>
                            </div>
                            <div>
                                Retornos:{" "}
                                <strong>
                                    {registosEditaveis.filter((r) => r.tipo === "retorno").length}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div style={styles.infoCard}>
                        <span style={styles.icon}>ℹ️</span>
                        <span style={styles.infoText}>
                            As alterações serão aplicadas diretamente. Todos os registos
                            existentes deste dia serão substituídos pelos valores editados
                            acima.
                        </span>
                    </div>
                </div>

                <div style={styles.modalButtons}>
                    <button style={styles.cancelButton} onClick={onClose}>
                        Cancelar
                    </button>

                    <button style={styles.saveButton} onClick={handleSave}>
                        💾 Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        backdropFilter: "blur(3px)",
    },
    modalContainer: {
        backgroundColor: "#fff",
        borderRadius: "16px",
        width: "90%",
        maxWidth: "700px",
        maxHeight: "85vh",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        animation: "modalSlideIn 0.3s ease-out",
    },
    modalHeader: {
        background: "linear-gradient(135deg, #3182ce, #2c5aa0)",
        color: "white",
        padding: "25px 30px",
        position: "relative",
    },
    modalTitle: {
        fontSize: "20px",
        fontWeight: "bold",
        margin: "0 0 8px 0",
    },
    modalSubtitle: {
        fontSize: "14px",
        margin: 0,
        opacity: 0.9,
    },
    closeButton: {
        position: "absolute",
        top: "20px",
        right: "25px",
        background: "rgba(255,255,255,0.2)",
        border: "none",
        color: "white",
        fontSize: "24px",
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
    },
    formContainer: {
        padding: "25px",
        maxHeight: "calc(85vh - 180px)",
        overflowY: "auto",
    },
    currentRegistosInfo: {
        backgroundColor: "#fff3cd",
        border: "1px solid #ffeaa7",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "25px",
    },
    currentRegistosHeader: {
        display: "flex",
        alignItems: "center",
        marginBottom: "15px",
    },
    currentRegistosTitle: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#856404",
        marginLeft: "8px",
    },
    registosList: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginBottom: "15px",
    },
    registoOriginalItem: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "14px",
        padding: "8px 12px",
        backgroundColor: "rgba(255,255,255,0.7)",
        borderRadius: "8px",
    },
    registoNumero: {
        backgroundColor: "#3182ce",
        color: "white",
        fontSize: "12px",
        fontWeight: "600",
        padding: "2px 6px",
        borderRadius: "10px",
        minWidth: "20px",
        textAlign: "center",
    },
    registoHora: {
        fontWeight: "600",
        color: "#2d3748",
    },
    registoObra: {
        fontSize: "12px",
        color: "#666",
        fontStyle: "italic",
    },
    infoNote: {
        fontSize: "13px",
        color: "#856404",
        fontStyle: "italic",
    },
    editRegistosSection: {
        marginBottom: "25px",
    },
    sectionHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "20px",
        paddingBottom: "10px",
        borderBottom: "2px solid #e2e8f0",
    },
    sectionTitle: {
        fontSize: "18px",
        fontWeight: "600",
        color: "#2d3748",
        marginLeft: "8px",
        flex: 1,
    },
    addButton: {
        backgroundColor: "#38a169",
        color: "white",
        border: "none",
        padding: "8px 16px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s",
    },
    emptyState: {
        textAlign: "center",
        padding: "40px 20px",
        backgroundColor: "#f8f9fa",
        borderRadius: "12px",
        border: "2px dashed #dee2e6",
    },
    emptyMessage: {
        fontSize: "18px",
        fontWeight: "600",
        color: "#495057",
        margin: "0 0 10px 0",
    },
    emptyHint: {
        fontSize: "14px",
        color: "#6c757d",
        margin: 0,
    },
    registosEditaveisList: {
        display: "flex",
        flexDirection: "column",
        gap: "15px",
    },
    registoEditavelItem: {
        backgroundColor: "#f8f9fa",
        border: "2px solid #e2e8f0",
        borderRadius: "12px",
        padding: "20px",
        transition: "all 0.2s",
    },
    registoEditavelHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "15px",
    },
    registoEditavelNumero: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "16px",
        fontWeight: "600",
    },
    registoNumeroTag: {
        backgroundColor: "#3182ce",
        color: "white",
        fontSize: "12px",
        fontWeight: "700",
        padding: "4px 8px",
        borderRadius: "12px",
        minWidth: "28px",
        textAlign: "center",
    },
    originalTag: {
        backgroundColor: "#38a169",
        color: "white",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: "600",
    },
    novoTag: {
        backgroundColor: "#28a745",
        color: "white",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: "600",
    },
    actionButtons: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    duplicateButton: {
        backgroundColor: '#3182ce',
        color: 'white',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    removeButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    registoEditavelInputs: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "15px",
        marginBottom: "10px",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
    },
    inputLabel: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#4a5568",
        marginBottom: "6px",
    },
    tipoSelect: {
        padding: "10px 12px",
        border: "2px solid #e2e8f0",
        borderRadius: "8px",
        fontSize: "14px",
        backgroundColor: "#ffffff",
        transition: "all 0.2s",
        outline: "none",
    },
    timeInput: {
        padding: "10px 12px",
        border: "2px solid #e2e8f0",
        borderRadius: "8px",
        fontSize: "14px",
        backgroundColor: "#ffffff",
        transition: "all 0.2s",
        outline: "none",
    },
    obraSelect: {
        padding: "10px 12px",
        border: "2px solid #e2e8f0",
        borderRadius: "8px",
        fontSize: "14px",
        backgroundColor: "#ffffff",
        transition: "all 0.2s",
        outline: "none",
    },
    obraReadonly: {
        padding: "10px 12px",
        border: "2px solid #f0f0f0",
        borderRadius: "8px",
        fontSize: "14px",
        backgroundColor: "#f8f9fa",
        color: "#6c757d",
        fontStyle: "italic",
    },
    registoInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        color: '#666',
        marginTop: '10px',
    },
    infoLabel: {
        fontWeight: '600',
    },
    infoValue: {
        color: '#2d3748',
    },
    registoOriginalInfo: {
        backgroundColor: '#f8f9fa',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '12px',
        marginTop: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    resumoSection: {
        backgroundColor: "#e3f2fd",
        border: "1px solid #90caf9",
        borderRadius: "12px",
        padding: "15px",
        marginBottom: "20px",
    },
    resumoHeader: {
        display: "flex",
        alignItems: "center",
        marginBottom: "10px",
    },
    resumoTitle: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#1565c0",
        marginLeft: "8px",
    },
    resumoContent: {
        display: "flex",
        gap: "20px",
        fontSize: "14px",
        color: "#1565c0",
    },
    infoCard: {
        display: "flex",
        alignItems: "flex-start",
        backgroundColor: "#e3f2fd",
        padding: "15px",
        borderRadius: "10px",
        border: "1px solid #90caf9",
    },
    infoText: {
        fontSize: "14px",
        color: "#1565c0",
        marginLeft: "10px",
        lineHeight: "20px",
    },
    modalButtons: {
        display: "flex",
        justifyContent: "space-between",
        padding: "20px 25px",
        borderTop: "1px solid #e2e8f0",
        backgroundColor: "#f8f9fa",
        gap: "15px",
    },
    cancelButton: {
        backgroundColor: "#fff",
        border: "2px solid #dc3545",
        color: "#dc3545",
        padding: "12px 24px",
        borderRadius: "10px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "16px",
        flex: 1,
        transition: "all 0.2s",
    },
    saveButton: {
        backgroundColor: "#3182ce",
        border: "none",
        color: "#fff",
        padding: "12px 28px",
        borderRadius: "10px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "16px",
        flex: 1,
        transition: "all 0.2s",
        boxShadow: "0 4px 12px rgba(49, 130, 206, 0.3)",
    },
    icon: {
        fontSize: "16px",
    },
};

export default EditarRegistoModalWeb;