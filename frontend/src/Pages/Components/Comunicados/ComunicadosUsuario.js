
import React, { useState, useEffect } from 'react';
import { secureStorage } from '../../../utils/secureStorage';

const ComunicadosUsuario = () => {
    const [comunicados, setComunicados] = useState([]);
    const [filtro, setFiltro] = useState('todos');
    const [comunicadoExpandido, setComunicadoExpandido] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const token = secureStorage.getItem('loginToken');
    const userId = secureStorage.getItem('userId');

    useEffect(() => {
        carregarComunicados();
        const interval = setInterval(carregarComunicados, 30000);
        return () => clearInterval(interval);
    }, []);

    const carregarComunicados = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(
                `https://backend.advir.pt/api/comunicados/usuario/${userId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.success) {
                setComunicados(data.data);
            }
        } catch (error) {
            console.error('Erro ao carregar comunicados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const marcarComoLido = async (comunicadoId) => {
        try {
            await fetch(
                `https://backend.advir.pt/api/comunicados/${comunicadoId}/lido/${userId}`,
                {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            carregarComunicados();
        } catch (error) {
            console.error('Erro ao marcar como lido:', error);
        }
    };

    const handleExpandir = (comunicado) => {
        setComunicadoExpandido(comunicado);
        if (!comunicado.lido) {
            marcarComoLido(comunicado.Comunicado.id);
        }
    };

    const comunicadosFiltrados = comunicados.filter(com => {
        if (filtro === 'nao_lidos') return !com.lido;
        if (filtro === 'lidos') return com.lido;
        return true;
    });

    const naoLidos = comunicados.filter(c => !c.lido).length;

    return (
        <div style={styles.pageWrapper}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerTop}>
                        <h1 style={styles.title}>
                            <span style={styles.iconWrapper}>📢</span>
                            Comunicados
                        </h1>
                        {naoLidos > 0 && (
                            <div style={styles.badge}>{naoLidos}</div>
                        )}
                    </div>
                    <p style={styles.subtitle}>Fique atualizado com as novidades da empresa</p>
                </div>

                {/* Filtros */}
                <div style={styles.filterContainer}>
                    <button
                        style={filtro === 'todos' ? styles.filterButtonActive : styles.filterButton}
                        onClick={() => setFiltro('todos')}
                    >
                        <span style={styles.filterIcon}>📋</span>
                        Todos
                        <span style={styles.filterCount}>{comunicados.length}</span>
                    </button>
                    <button
                        style={filtro === 'nao_lidos' ? styles.filterButtonActive : styles.filterButton}
                        onClick={() => setFiltro('nao_lidos')}
                    >
                        <span style={styles.filterIcon}>🔔</span>
                        Não Lidos
                        <span style={styles.filterCount}>{naoLidos}</span>
                    </button>
                    <button
                        style={filtro === 'lidos' ? styles.filterButtonActive : styles.filterButton}
                        onClick={() => setFiltro('lidos')}
                    >
                        <span style={styles.filterIcon}>✅</span>
                        Lidos
                        <span style={styles.filterCount}>{comunicados.length - naoLidos}</span>
                    </button>
                </div>

                {/* Lista de Comunicados */}
                {isLoading ? (
                    <div style={styles.loadingContainer}>
                        <div style={styles.spinner}></div>
                        <p style={styles.loadingText}>A carregar comunicados...</p>
                    </div>
                ) : comunicadosFiltrados.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📭</div>
                        <h3 style={styles.emptyTitle}>Nenhum comunicado encontrado</h3>
                        <p style={styles.emptyText}>
                            {filtro === 'nao_lidos' ? 'Parabéns! Você leu todos os comunicados.' : 'Não há comunicados para mostrar.'}
                        </p>
                    </div>
                ) : (
                    <div style={styles.comunicadosList}>
                        {comunicadosFiltrados.map(com => (
                            <div
                                key={com.id}
                                style={{
                                    ...styles.comunicadoCard,
                                    ...(com.lido ? styles.comunicadoCardLido : styles.comunicadoCardNaoLido)
                                }}
                                onClick={() => handleExpandir(com)}
                            >
                                <div style={styles.cardContent}>
                                    <div style={styles.cardHeader}>
                                        <div style={styles.cardTitleRow}>
                                            <h3 style={styles.cardTitle}>
                                                {!com.lido && <span style={styles.newBadge}>NOVO</span>}
                                                {com.Comunicado.titulo}
                                            </h3>
                                            <span style={getPrioridadeBadge(com.Comunicado.prioridade)}>
                                                {getPrioridadeIcon(com.Comunicado.prioridade)}
                                                {com.Comunicado.prioridade.toUpperCase()}
                                            </span>
                                        </div>
                                        <div style={styles.cardMeta}>
                                            <span style={styles.metaItem}>
                                                👤 {com.Comunicado.remetente_nome}
                                            </span>
                                            <span style={styles.metaSeparator}>•</span>
                                            <span style={styles.metaItem}>
                                                📅 {new Date(com.Comunicado.data_criacao).toLocaleDateString('pt-PT', {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <p style={styles.cardPreview}>
                                        {com.Comunicado.mensagem.substring(0, 150)}
                                        {com.Comunicado.mensagem.length > 150 && '...'}
                                    </p>
                                    
                                    {com.lido && com.data_leitura && (
                                        <div style={styles.readInfo}>
                                            <span style={styles.readIcon}>✓</span>
                                            Lido em {new Date(com.data_leitura).toLocaleDateString('pt-PT')} às {new Date(com.data_leitura).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                                
                                <div style={styles.cardFooter}>
                                    <span style={styles.readMoreText}>Clique para ler mais →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal de Comunicado Expandido */}
                {comunicadoExpandido && (
                    <div style={styles.modalOverlay} onClick={() => setComunicadoExpandido(null)}>
                        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <button style={styles.modalCloseBtn} onClick={() => setComunicadoExpandido(null)}>
                                ✕
                            </button>
                            
                            <div style={styles.modalHeader}>
                                <div style={styles.modalTitleRow}>
                                    <h2 style={styles.modalTitle}>{comunicadoExpandido.Comunicado.titulo}</h2>
                                    <span style={getPrioridadeBadge(comunicadoExpandido.Comunicado.prioridade)}>
                                        {getPrioridadeIcon(comunicadoExpandido.Comunicado.prioridade)}
                                        {comunicadoExpandido.Comunicado.prioridade.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            
                            <div style={styles.modalMeta}>
                                <div style={styles.modalMetaItem}>
                                    <strong>De:</strong> {comunicadoExpandido.Comunicado.remetente_nome}
                                </div>
                                <div style={styles.modalMetaItem}>
                                    <strong>Data:</strong> {new Date(comunicadoExpandido.Comunicado.data_criacao).toLocaleString('pt-PT')}
                                </div>
                                {comunicadoExpandido.lido && (
                                    <div style={styles.modalReadStatus}>
                                        ✓ Lido em {new Date(comunicadoExpandido.data_leitura).toLocaleString('pt-PT')}
                                    </div>
                                )}
                            </div>

                            <div style={styles.modalDivider}></div>

                            <div style={styles.modalMessage}>
                                {comunicadoExpandido.Comunicado.mensagem}
                            </div>

                            <button
                                style={styles.btnClose}
                                onClick={() => setComunicadoExpandido(null)}
                            >
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
        whiteSpace: 'nowrap'
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
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '0 20px'
    },
    header: {
        textAlign: 'center',
        marginBottom: '40px',
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
    badge: {
        backgroundColor: '#EF4444',
        color: 'white',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '700',
        minWidth: '28px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
    },
    filterContainer: {
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    filterButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        backgroundColor: '#F1F5F9',
        border: '2px solid transparent',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '600',
        color: '#475569',
        transition: 'all 0.2s ease',
        outline: 'none'
    },
    filterButtonActive: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        backgroundColor: '#1792FE',
        border: '2px solid #1792FE',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '600',
        color: 'white',
        transition: 'all 0.2s ease',
        outline: 'none',
        boxShadow: '0 4px 12px rgba(23, 146, 254, 0.3)'
    },
    filterIcon: {
        fontSize: '16px'
    },
    filterCount: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: '700'
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
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '1px solid transparent'
    },
    comunicadoCardNaoLido: {
        borderLeft: '5px solid #1792FE',
        boxShadow: '0 4px 12px rgba(23, 146, 254, 0.15)'
    },
    comunicadoCardLido: {
        borderLeft: '5px solid #94A3B8',
        opacity: 0.85
    },
    cardContent: {
        padding: '24px'
    },
    cardHeader: {
        marginBottom: '16px'
    },
    cardTitleRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        marginBottom: '12px',
        flexWrap: 'wrap'
    },
    cardTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1E293B',
        margin: 0,
        lineHeight: '1.4',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap'
    },
    newBadge: {
        backgroundColor: '#1792FE',
        color: 'white',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '800',
        letterSpacing: '0.5px'
    },
    cardMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#64748B',
        flexWrap: 'wrap'
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    },
    metaSeparator: {
        color: '#CBD5E1'
    },
    cardPreview: {
        fontSize: '15px',
        color: '#475569',
        lineHeight: '1.7',
        marginBottom: '16px'
    },
    readInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        color: '#059669',
        fontWeight: '500',
        padding: '8px 12px',
        backgroundColor: '#ECFDF5',
        borderRadius: '8px',
        marginTop: '12px'
    },
    readIcon: {
        fontSize: '14px'
    },
    cardFooter: {
        padding: '12px 24px',
        backgroundColor: '#F8FAFC',
        borderTop: '1px solid #E2E8F0'
    },
    readMoreText: {
        fontSize: '14px',
        color: '#1792FE',
        fontWeight: '600'
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
        maxWidth: '700px',
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
    modalHeader: {
        marginBottom: '24px'
    },
    modalTitleRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        flexWrap: 'wrap'
    },
    modalTitle: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1E293B',
        margin: 0,
        lineHeight: '1.3',
        flex: 1
    },
    modalMeta: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '24px'
    },
    modalMetaItem: {
        fontSize: '15px',
        color: '#475569'
    },
    modalReadStatus: {
        fontSize: '14px',
        color: '#059669',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    modalDivider: {
        height: '2px',
        backgroundColor: '#E2E8F0',
        margin: '24px 0'
    },
    modalMessage: {
        fontSize: '16px',
        lineHeight: '1.8',
        color: '#334155',
        marginBottom: '32px',
        whiteSpace: 'pre-wrap'
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

export default ComunicadosUsuario;
