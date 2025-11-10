
import React, { useState, useEffect } from "react";
import { secureStorage } from "../../../utils/secureStorage";


// topo do ficheiro, depois dos imports
const getEmpresaId = () =>
  secureStorage.getItem("empresaId") ?? secureStorage.getItem("empresa_id");


const GestorComunicados = () => {
    const [comunicados, setComunicados] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [comunicadoSelecionado, setComunicadoSelecionado] = useState(null);
    const [estatisticas, setEstatisticas] = useState(null);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchUser, setSearchUser] = useState("");

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [secureStorage.getItem("empresaId") ?? secureStorage.getItem("empresa_id")]);


    const carregarComunicados = async () => {
  try {
    setIsLoading(true);
    const empresaId = getEmpresaId();
    if (!empresaId) {
      console.error("Empresa não selecionada");
      setIsLoading(false);
      return;
    }

    const response = await fetch(
      `https://backend.advir.pt/api/comunicados?empresaId=${empresaId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (data.success) setComunicados(data.data);
  } catch (error) {
    console.error("Erro ao carregar comunicados:", error);
  } finally {
    setIsLoading(false);
  }
};


    const carregarUsuarios = async () => {
  try {
    const empresaId = getEmpresaId();
    if (!empresaId) {
      console.error("Empresa não selecionada");
      return;
    }

    const response = await fetch(
      `https://backend.advir.pt/api/users?empresaId=${empresaId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (data.success) setUsuarios(data.users);
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
  }
};


    const criarComunicado = async () => {
  try {
    const empresaId = getEmpresaId();
    if (!empresaId) {
      alert("Selecione uma empresa antes de criar o comunicado.");
      return;
    }

    const response = await fetch("https://backend.advir.pt/api/comunicados", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...novoComunicado,
        remetente_id: Number(userId),
        empresa_id: Number(empresaId), // <<< importante
      }),
    });

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
      setMostrarFormulario(false);
      carregarComunicados();
    } else {
      alert(data.error || "Erro ao criar comunicado");
    }
  } catch (error) {
    console.error("Erro ao criar comunicado:", error);
    alert("Erro ao criar comunicado");
  }
};


    const verEstatisticas = async (comunicadoId) => {
  try {
    const empresaId = getEmpresaId();
    const response = await fetch(
      `https://backend.advir.pt/api/comunicados/${comunicadoId}/estatisticas?empresaId=${empresaId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (data.success) {
      setEstatisticas(data.data);
      setComunicadoSelecionado(comunicados.find((c) => c.id === comunicadoId));
      setMostrarModal(true);
    }
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
  }
};


    const desativarComunicado = async (id) => {
  if (!confirm("Deseja realmente desativar este comunicado?")) return;

  try {
    const empresaId = getEmpresaId();
    const response = await fetch(
      `https://backend.advir.pt/api/comunicados/${id}/desativar?empresaId=${empresaId}`,
      { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (data.success) {
      alert("Comunicado desativado com sucesso!");
      carregarComunicados();
    } else {
      alert(data.error || "Erro ao desativar comunicado");
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
        <div style={styles.pageWrapper}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerTop}>
                        <h1 style={styles.title}>
                            <span style={styles.iconWrapper}>📢</span>
                            Gestor de Comunicados
                        </h1>
                    </div>
                    <p style={styles.subtitle}>Crie e gerencie comunicados para a sua equipa</p>
                </div>

                {/* Botão Novo Comunicado */}
                <div style={styles.actionBar}>
                    <button
                        style={styles.btnNovo}
                        onClick={() => setMostrarFormulario(!mostrarFormulario)}
                    >
                        <span style={styles.btnIcon}>{mostrarFormulario ? '−' : '+'}</span>
                        {mostrarFormulario ? 'Cancelar' : 'Novo Comunicado'}
                    </button>
                </div>

                {/* Formulário de Novo Comunicado */}
                {mostrarFormulario && (
                    <div style={styles.formCard}>
                        <h2 style={styles.formTitle}>✍️ Criar Novo Comunicado</h2>

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
                                placeholder="Digite o título do comunicado"
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
                                rows="6"
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
                                    <option value="todos">Todos os colaboradores</option>
                                    <option value="especificos">Colaboradores específicos</option>
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
                                    Selecionar Colaboradores ({novoComunicado.destinatarios_ids.length} selecionados)
                                </label>
                                <input
                                    type="text"
                                    style={styles.searchInput}
                                    placeholder="🔍 Pesquisar por nome..."
                                    value={searchUser}
                                    onChange={(e) => setSearchUser(e.target.value)}
                                />
                                <div style={styles.checkboxContainer}>
                                    {usuarios
                                        .filter((user) => {
                                            const nome = user.nome || user.username || '';
                                            return nome.toLowerCase().includes(searchUser.toLowerCase());
                                        })
                                        .map((user) => (
                                            <label key={user.id} style={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    style={styles.checkbox}
                                                    checked={novoComunicado.destinatarios_ids.includes(user.id)}
                                                    onChange={() => handleDestinatariosChange(user.id)}
                                                />
                                                <span style={styles.checkboxText}>
                                                    {user.nome || user.username}
                                                </span>
                                            </label>
                                        ))}
                                </div>
                            </div>
                        )}

                        <button
                            style={{
                                ...styles.btnPrimary,
                                ...((!novoComunicado.titulo || !novoComunicado.mensagem) && styles.btnDisabled)
                            }}
                            onClick={criarComunicado}
                            disabled={!novoComunicado.titulo || !novoComunicado.mensagem}
                        >
                            📤 Enviar Comunicado
                        </button>
                    </div>
                )}

                {/* Lista de Comunicados */}
                <div style={styles.listSection}>
                    <h2 style={styles.sectionTitle}>📋 Comunicados Enviados</h2>
                    
                    {isLoading ? (
                        <div style={styles.loadingContainer}>
                            <div style={styles.spinner}></div>
                            <p style={styles.loadingText}>A carregar comunicados...</p>
                        </div>
                    ) : comunicados.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>📭</div>
                            <h3 style={styles.emptyTitle}>Nenhum comunicado enviado</h3>
                            <p style={styles.emptyText}>Crie o seu primeiro comunicado para começar!</p>
                        </div>
                    ) : (
                        <div style={styles.comunicadosList}>
                            {comunicados.map((com) => (
                                <div key={com.id} style={styles.comunicadoCard}>
                                    <div style={styles.cardHeader}>
                                        <div style={styles.cardTitleSection}>
                                            <h3 style={styles.cardTitle}>
                                                {com.titulo}
                                                <span style={getPrioridadeBadge(com.prioridade)}>
                                                    {getPrioridadeIcon(com.prioridade)}
                                                    {com.prioridade.toUpperCase()}
                                                </span>
                                            </h3>
                                            <p style={styles.cardMeta}>
                                                📅 Enviado em {new Date(com.data_criacao).toLocaleString("pt-PT", {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                             <p style={styles.cardMeta}>
                                                Criado Por: {com.remetente_nome}
                                            </p>
                                        </div>
                                        <div style={styles.cardActions}>
                                            <button
                                                style={styles.btnStats}
                                                onClick={() => verEstatisticas(com.id)}
                                            >
                                                📊 Estatísticas
                                            </button>
                                            <button
                                                style={styles.btnDanger}
                                                onClick={() => desativarComunicado(com.id)}
                                            >
                                                🗑️ Desativar
                                            </button>
                                        </div>
                                    </div>
                                    <p style={styles.cardMessage}>{com.mensagem}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal de Estatísticas */}
                {mostrarModal && estatisticas && comunicadoSelecionado && (
                    <div style={styles.modalOverlay} onClick={() => setMostrarModal(false)}>
                        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <button style={styles.modalCloseBtn} onClick={() => setMostrarModal(false)}>
                                ✕
                            </button>
                            
                            <h2 style={styles.modalTitle}>📊 Estatísticas de Leitura</h2>
                            <h3 style={styles.modalSubtitle}>{comunicadoSelecionado.titulo}</h3>

                            <div style={styles.statsGrid}>
                                <div style={styles.statCard}>
                                    <div style={styles.statNumber}>{estatisticas.total_destinatarios}</div>
                                    <div style={styles.statLabel}>Total Destinatários</div>
                                </div>
                                <div style={{...styles.statCard, ...styles.statCardSuccess}}>
                                    <div style={styles.statNumber}>{estatisticas.total_lidos}</div>
                                    <div style={styles.statLabel}>Lidos</div>
                                </div>
                                <div style={{...styles.statCard, ...styles.statCardWarning}}>
                                    <div style={styles.statNumber}>{estatisticas.total_nao_lidos}</div>
                                    <div style={styles.statLabel}>Não Lidos</div>
                                </div>
                                <div style={styles.statCard}>
                                    <div style={styles.statNumber}>{estatisticas.percentagem_leitura}%</div>
                                    <div style={styles.statLabel}>Taxa de Leitura</div>
                                </div>
                            </div>

                            <div style={styles.listsContainer}>
                                <div style={styles.listSectionModal}>
                                    <h4 style={styles.listTitle}>✅ Leram ({estatisticas.lidos.length})</h4>
                                    <div style={styles.listScroll}>
                                        {estatisticas.lidos.map((l) => (
                                            <div key={l.usuario_id} style={styles.listItem}>
                                                <span>{l.usuario_nome}</span>
                                                <span style={styles.listItemDate}>
                                                    {new Date(l.data_leitura).toLocaleString("pt-PT")}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={styles.listSectionModal}>
                                    <h4 style={styles.listTitle}>❌ Não Leram ({estatisticas.nao_lidos.length})</h4>
                                    <div style={styles.listScroll}>
                                        {estatisticas.nao_lidos.map((l) => (
                                            <div key={l.usuario_id} style={styles.listItem}>
                                                <span>{l.usuario_nome}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button style={styles.btnClose} onClick={() => setMostrarModal(false)}>
                                Fechar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const getPrioridadeIcon = (prioridade) => {
    const icons = {
        baixa: '🔵',
        normal: '🟢',
        alta: '🟡',
        urgente: '🔴'
    };
    return icons[prioridade] || '';
};

const getPrioridadeBadge = (prioridade) => {
    const baseStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap',
        marginLeft: '12px'
    };

    const colors = {
        baixa: { backgroundColor: '#E3F2FD', color: '#1565C0', border: '1px solid #90CAF9' },
        normal: { backgroundColor: '#E8F5E9', color: '#2E7D32', border: '1px solid #81C784' },
        alta: { backgroundColor: '#FFF3E0', color: '#E65100', border: '1px solid #FFB74D' },
        urgente: { backgroundColor: '#FFEBEE', color: '#C62828', border: '1px solid #EF5350' }
    };

    return { ...baseStyle, ...colors[prioridade] };
};

const styles = {
    pageWrapper: {
        minHeight: '100vh',
        maxHeight: '100vh',
        overflow: 'auto',
        backgroundColor: '#F5F7FA',
        paddingTop: '20px',
        paddingBottom: '40px'
    },
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
    },
    header: {
        textAlign: 'center',
        marginBottom: '32px',
        paddingTop: '20px'
    },
    headerTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '8px'
    },
    title: {
        fontSize: '36px',
        fontWeight: '700',
        color: '#1E293B',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    iconWrapper: {
        fontSize: '32px'
    },
    subtitle: {
        fontSize: '16px',
        color: '#64748B',
        margin: 0
    },
    actionBar: {
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'flex-end'
    },
    btnNovo: {
        backgroundColor: '#1792FE',
        color: 'white',
        border: 'none',
        padding: '14px 28px',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 12px rgba(23, 146, 254, 0.3)',
        transition: 'all 0.2s ease'
    },
    btnIcon: {
        fontSize: '20px',
        fontWeight: '700'
    },
    formCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #E2E8F0'
    },
    formTitle: {
        fontSize: '22px',
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #E2E8F0'
    },
    formGroup: {
        marginBottom: '20px'
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        color: '#475569',
        fontSize: '14px'
    },
    input: {
        width: '100%',
        padding: '12px 16px',
        border: '2px solid #E2E8F0',
        borderRadius: '10px',
        fontSize: '15px',
        color: '#1E293B',
        transition: 'all 0.2s ease',
        outline: 'none',
        boxSizing: 'border-box'
    },
    textarea: {
        width: '100%',
        padding: '12px 16px',
        border: '2px solid #E2E8F0',
        borderRadius: '10px',
        fontSize: '15px',
        color: '#1E293B',
        resize: 'vertical',
        fontFamily: 'inherit',
        lineHeight: '1.6',
        transition: 'all 0.2s ease',
        outline: 'none',
        boxSizing: 'border-box'
    },
    select: {
        width: '100%',
        padding: '12px 16px',
        border: '2px solid #E2E8F0',
        borderRadius: '10px',
        fontSize: '15px',
        color: '#1E293B',
        backgroundColor: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        outline: 'none',
        boxSizing: 'border-box'
    },
    searchInput: {
        width: '100%',
        padding: '12px 16px',
        border: '2px solid #E2E8F0',
        borderRadius: '10px',
        fontSize: '15px',
        color: '#1E293B',
        marginBottom: '12px',
        transition: 'all 0.2s ease',
        outline: 'none',
        boxSizing: 'border-box'
    },
    checkboxContainer: {
        maxHeight: '240px',
        overflowY: 'auto',
        border: '2px solid #E2E8F0',
        borderRadius: '10px',
        padding: '12px',
        backgroundColor: '#F8FAFC'
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px',
        cursor: 'pointer',
        borderRadius: '8px',
        transition: 'background-color 0.2s ease',
        marginBottom: '4px'
    },
    checkbox: {
        width: '18px',
        height: '18px',
        cursor: 'pointer',
        accentColor: '#1792FE'
    },
    checkboxText: {
        marginLeft: '10px',
        fontSize: '15px',
        color: '#475569'
    },
    btnPrimary: {
        backgroundColor: '#1792FE',
        color: 'white',
        border: 'none',
        padding: '14px 24px',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        width: '100%',
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 12px rgba(23, 146, 254, 0.3)',
        marginTop: '8px'
    },
    btnDisabled: {
        backgroundColor: '#94A3B8',
        cursor: 'not-allowed',
        boxShadow: 'none'
    },
    listSection: {
        marginTop: '32px'
    },
    sectionTitle: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: '2px solid #E2E8F0'
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        gap: '16px'
    },
    spinner: {
        width: '48px',
        height: '48px',
        border: '4px solid #E2E8F0',
        borderTop: '4px solid #1792FE',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    loadingText: {
        fontSize: '16px',
        color: '#64748B',
        margin: 0
    },
    emptyState: {
        textAlign: 'center',
        padding: '80px 20px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    },
    emptyIcon: {
        fontSize: '64px',
        marginBottom: '16px'
    },
    emptyTitle: {
        fontSize: '22px',
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: '8px'
    },
    emptyText: {
        fontSize: '15px',
        color: '#64748B',
        margin: 0
    },
    comunicadosList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    comunicadoCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '1px solid #E2E8F0',
        transition: 'all 0.2s ease'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
        gap: '20px',
        flexWrap: 'wrap'
    },
    cardTitleSection: {
        flex: 1,
        minWidth: '200px'
    },
    cardTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1E293B',
        margin: '0 0 8px 0',
        lineHeight: '1.4',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap'
    },
    cardMeta: {
        fontSize: '14px',
        color: '#64748B',
        margin: 0
    },
    cardActions: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    btnStats: {
        backgroundColor: '#10B981',
        color: 'white',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
    },
    btnDanger: {
        backgroundColor: '#EF4444',
        color: 'white',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)'
    },
    cardMessage: {
        fontSize: '15px',
        color: '#475569',
        lineHeight: '1.7',
        margin: 0,
        whiteSpace: 'pre-wrap'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px',
        backdropFilter: 'blur(4px)'
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '32px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
    },
    modalCloseBtn: {
        position: 'absolute',
        top: '16px',
        right: '16px',
        backgroundColor: '#F1F5F9',
        border: 'none',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        color: '#64748B',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    },
    modalTitle: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1E293B',
        margin: '0 0 8px 0'
    },
    modalSubtitle: {
        fontSize: '18px',
        color: '#64748B',
        margin: '0 0 24px 0',
        fontWeight: '500'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
    },
    statCard: {
        backgroundColor: '#F8FAFC',
        padding: '24px',
        borderRadius: '12px',
        textAlign: 'center',
        border: '2px solid #E2E8F0'
    },
    statCardSuccess: {
        backgroundColor: '#ECFDF5',
        border: '2px solid #86EFAC'
    },
    statCardWarning: {
        backgroundColor: '#FEF3C7',
        border: '2px solid #FDE047'
    },
    statNumber: {
        fontSize: '36px',
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: '4px'
    },
    statLabel: {
        fontSize: '14px',
        color: '#64748B',
        fontWeight: '600'
    },
    listsContainer: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '24px'
    },
    listSectionModal: {
        backgroundColor: '#F8FAFC',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #E2E8F0'
    },
    listTitle: {
        fontSize: '16px',
        fontWeight: '700',
        marginBottom: '12px',
        color: '#1E293B',
        paddingBottom: '8px',
        borderBottom: '2px solid #E2E8F0'
    },
    listScroll: {
        maxHeight: '300px',
        overflowY: 'auto'
    },
    listItem: {
        padding: '12px',
        borderBottom: '1px solid #E2E8F0',
        fontSize: '14px',
        color: '#475569',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
    },
    listItemDate: {
        fontSize: '12px',
        color: '#94A3B8',
        whiteSpace: 'nowrap'
    },
    btnClose: {
        backgroundColor: '#1792FE',
        color: 'white',
        border: 'none',
        padding: '14px 32px',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        width: '100%',
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 12px rgba(23, 146, 254, 0.3)'
    }
};

export default GestorComunicados;
