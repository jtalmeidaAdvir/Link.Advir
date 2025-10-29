
import React, { useState, useEffect } from 'react';
import { secureStorage } from '../../../utils/secureStorage';

const ComunicadosUsuario = () => {
    const [comunicados, setComunicados] = useState([]);
    const [filtro, setFiltro] = useState('todos');
    const [comunicadoExpandido, setComunicadoExpandido] = useState(null);

    const token = secureStorage.getItem('loginToken');
    const userId = secureStorage.getItem('userId');

    useEffect(() => {
        carregarComunicados();
        const interval = setInterval(carregarComunicados, 30000);
        return () => clearInterval(interval);
    }, []);

    const carregarComunicados = async () => {
        try {
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
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>
                    📢 Comunicados
                    {naoLidos > 0 && (
                        <span style={styles.badge}>{naoLidos} não lidos</span>
                    )}
                </h1>

                <div style={styles.filterButtons}>
                    <button
                        style={filtro === 'todos' ? styles.filterButtonActive : styles.filterButton}
                        onClick={() => setFiltro('todos')}
                    >
                        Todos
                    </button>
                    <button
                        style={filtro === 'nao_lidos' ? styles.filterButtonActive : styles.filterButton}
                        onClick={() => setFiltro('nao_lidos')}
                    >
                        Não Lidos ({naoLidos})
                    </button>
                    <button
                        style={filtro === 'lidos' ? styles.filterButtonActive : styles.filterButton}
                        onClick={() => setFiltro('lidos')}
                    >
                        Lidos
                    </button>
                </div>
            </div>

            <div style={styles.comunicadosList}>
                {comunicadosFiltrados.length === 0 ? (
                    <div style={styles.empty}>
                        <p>Nenhum comunicado para mostrar.</p>
                    </div>
                ) : (
                    comunicadosFiltrados.map(com => (
                        <div
                            key={com.id}
                            style={{
                                ...styles.comunicadoCard,
                                backgroundColor: com.lido ? '#f8f9fa' : '#e8f4fd',
                                borderLeft: com.lido ? '4px solid #6c757d' : '4px solid #1792FE'
                            }}
                            onClick={() => handleExpandir(com)}
                        >
                            <div style={styles.cardHeader}>
                                <div>
                                    <h3 style={styles.cardTitle}>
                                        {!com.lido && <span style={styles.newBadge}>NOVO</span>}
                                        {com.Comunicado.titulo}
                                    </h3>
                                    <p style={styles.cardMeta}>
                                        De: {com.Comunicado.remetente_nome} • 
                                        {new Date(com.Comunicado.data_criacao).toLocaleDateString('pt-PT')}
                                    </p>
                                </div>
                                <span style={getPrioridadeBadge(com.Comunicado.prioridade)}>
                                    {com.Comunicado.prioridade.toUpperCase()}
                                </span>
                            </div>
                            <p style={styles.cardPreview}>
                                {com.Comunicado.mensagem.substring(0, 100)}...
                            </p>
                            {com.lido && com.data_leitura && (
                                <p style={styles.readInfo}>
                                    ✓ Lido em {new Date(com.data_leitura).toLocaleString('pt-PT')}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Comunicado Expandido */}
            {comunicadoExpandido && (
                <div style={styles.modalOverlay} onClick={() => setComunicadoExpandido(null)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>{comunicadoExpandido.Comunicado.titulo}</h2>
                            <span style={getPrioridadeBadge(comunicadoExpandido.Comunicado.prioridade)}>
                                {comunicadoExpandido.Comunicado.prioridade.toUpperCase()}
                            </span>
                        </div>
                        
                        <div style={styles.modalMeta}>
                            <p><strong>De:</strong> {comunicadoExpandido.Comunicado.remetente_nome}</p>
                            <p><strong>Data:</strong> {new Date(comunicadoExpandido.Comunicado.data_criacao).toLocaleString('pt-PT')}</p>
                            {comunicadoExpandido.lido && (
                                <p style={styles.readStatus}>
                                    ✓ Lido em {new Date(comunicadoExpandido.data_leitura).toLocaleString('pt-PT')}
                                </p>
                            )}
                        </div>

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
    );
};

const getPrioridadeBadge = (prioridade) => {
    const baseStyle = {
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
    };

    const colors = {
        baixa: { backgroundColor: '#d1ecf1', color: '#0c5460' },
        normal: { backgroundColor: '#d4edda', color: '#155724' },
        alta: { backgroundColor: '#fff3cd', color: '#856404' },
        urgente: { backgroundColor: '#f8d7da', color: '#721c24' },
    };

    return { ...baseStyle, ...colors[prioridade] };
};

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1000px',
        margin: '0 auto',
    },
    header: {
        marginBottom: '24px',
    },
    title: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '16px',
    },
    badge: {
        marginLeft: '12px',
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 'normal',
    },
    filterButtons: {
        display: 'flex',
        gap: '12px',
    },
    filterButton: {
        padding: '8px 16px',
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
    },
    filterButtonActive: {
        padding: '8px 16px',
        backgroundColor: '#1792FE',
        color: 'white',
        border: '1px solid #1792FE',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
    },
    comunicadosList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    comunicadoCard: {
        padding: '20px',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px',
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '4px',
    },
    newBadge: {
        backgroundColor: '#1792FE',
        color: 'white',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        marginRight: '8px',
        fontWeight: 'bold',
    },
    cardMeta: {
        fontSize: '13px',
        color: '#666',
        margin: 0,
    },
    cardPreview: {
        fontSize: '14px',
        color: '#555',
        lineHeight: '1.5',
        marginBottom: '8px',
    },
    readInfo: {
        fontSize: '12px',
        color: '#28a745',
        margin: 0,
        fontStyle: 'italic',
    },
    empty: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#888',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '700px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
        paddingBottom: '16px',
        borderBottom: '2px solid #eee',
    },
    modalTitle: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#333',
        margin: 0,
    },
    modalMeta: {
        marginBottom: '24px',
        fontSize: '14px',
        color: '#666',
    },
    readStatus: {
        color: '#28a745',
        fontWeight: '500',
    },
    modalMessage: {
        fontSize: '16px',
        lineHeight: '1.7',
        color: '#333',
        marginBottom: '24px',
        whiteSpace: 'pre-wrap',
    },
    btnClose: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '6px',
        fontSize: '16px',
        cursor: 'pointer',
        width: '100%',
    },
};

export default ComunicadosUsuario;
