import React from 'react';

/**
 * Painel de Filtros para RegistosPorUtilizador
 * Componente separado para melhor organização e performance
 */
const FiltrosPanel = React.memo(({
    // Valores dos filtros
    obraSelecionada,
    utilizadorSelecionado,
    mesSelecionado,
    anoSelecionado,
    dataSelecionada,
    filtroTipo,

    // Dados para os dropdowns
    obras,
    utilizadores,

    // Callbacks
    onObraChange,
    onUtilizadorChange,
    onMesChange,
    onAnoChange,
    onDataChange,
    onFiltroTipoChange,
    onCarregarClick,

    // Estilos
    styles
}) => {
    // Gerar anos (últimos 5 anos + próximo ano)
    const anosDisponiveis = React.useMemo(() => {
        const anoAtual = new Date().getFullYear();
        return Array.from({ length: 7 }, (_, i) => anoAtual - 3 + i);
    }, []);

    // Meses do ano
    const meses = [
        { valor: 1, nome: 'Janeiro' },
        { valor: 2, nome: 'Fevereiro' },
        { valor: 3, nome: 'Março' },
        { valor: 4, nome: 'Abril' },
        { valor: 5, nome: 'Maio' },
        { valor: 6, nome: 'Junho' },
        { valor: 7, nome: 'Julho' },
        { valor: 8, nome: 'Agosto' },
        { valor: 9, nome: 'Setembro' },
        { valor: 10, nome: 'Outubro' },
        { valor: 11, nome: 'Novembro' },
        { valor: 12, nome: 'Dezembro' }
    ];

    return (
        <div style={styles.filtersCard}>
            <h3 style={{
                ...styles.sectionTitle,
                fontSize: '1.1rem',
                marginBottom: '12px'
            }}>
                <span style={styles.sectionIcon}>🔍</span>
                Filtros de Pesquisa
            </h3>

            <div style={{
                ...styles.filtersGrid,
                gap: '10px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))'
            }}>
                {/* Filtro de Obra */}
                <div style={styles.filterGroup}>
                    <label style={{
                        ...styles.label,
                        fontSize: '0.8rem',
                        marginBottom: '4px'
                    }}>
                        Obra
                    </label>
                    <select
                        style={{
                            ...styles.select,
                            padding: '6px 10px',
                            fontSize: '0.85rem'
                        }}
                        value={obraSelecionada}
                        onChange={e => onObraChange(e.target.value)}
                    >
                        <option value="">Todas</option>
                        {obras.map(o => (
                            <option key={o.id} value={o.id}>{o.nome}</option>
                        ))}
                    </select>
                </div>

                {/* Filtro de Utilizador */}
                <div style={styles.filterGroup}>
                    <label style={{
                        ...styles.label,
                        fontSize: '0.8rem',
                        marginBottom: '4px'
                    }}>
                        Utilizador
                    </label>
                    <select
                        style={{
                            ...styles.select,
                            padding: '6px 10px',
                            fontSize: '0.85rem'
                        }}
                        value={utilizadorSelecionado}
                        onChange={e => onUtilizadorChange(e.target.value)}
                    >
                        <option value="">Todos</option>
                        {utilizadores.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.nome || u.username} ({u.codFuncionario || u.email})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Filtro de Mês */}
                <div style={styles.filterGroup}>
                    <label style={{
                        ...styles.label,
                        fontSize: '0.8rem',
                        marginBottom: '4px'
                    }}>
                        Mês
                    </label>
                    <select
                        style={{
                            ...styles.select,
                            padding: '6px 10px',
                            fontSize: '0.85rem'
                        }}
                        value={mesSelecionado}
                        onChange={e => onMesChange(parseInt(e.target.value, 10))}
                    >
                        {meses.map(m => (
                            <option key={m.valor} value={m.valor}>
                                {m.nome}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Filtro de Ano */}
                <div style={styles.filterGroup}>
                    <label style={{
                        ...styles.label,
                        fontSize: '0.8rem',
                        marginBottom: '4px'
                    }}>
                        Ano
                    </label>
                    <select
                        style={{
                            ...styles.select,
                            padding: '6px 10px',
                            fontSize: '0.85rem'
                        }}
                        value={anoSelecionado}
                        onChange={e => onAnoChange(parseInt(e.target.value, 10))}
                    >
                        {anosDisponiveis.map(ano => (
                            <option key={ano} value={ano}>
                                {ano}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Filtro de Data Específica (opcional) */}
                {onDataChange && (
                    <div style={styles.filterGroup}>
                        <label style={{
                            ...styles.label,
                            fontSize: '0.8rem',
                            marginBottom: '4px'
                        }}>
                            Data Específica
                        </label>
                        <input
                            type="date"
                            style={{
                                ...styles.select,
                                padding: '6px 10px',
                                fontSize: '0.85rem'
                            }}
                            value={dataSelecionada}
                            onChange={e => onDataChange(e.target.value)}
                        />
                    </div>
                )}

                {/* Filtro de Tipo (opcional) */}
                {onFiltroTipoChange && (
                    <div style={styles.filterGroup}>
                        <label style={{
                            ...styles.label,
                            fontSize: '0.8rem',
                            marginBottom: '4px'
                        }}>
                            Tipo de Registo
                        </label>
                        <select
                            style={{
                                ...styles.select,
                                padding: '6px 10px',
                                fontSize: '0.85rem'
                            }}
                            value={filtroTipo}
                            onChange={e => onFiltroTipoChange(e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="completos">Completos (4 registos)</option>
                            <option value="parciais">Parciais</option>
                            <option value="faltas">Com Faltas</option>
                            <option value="horas_extras">Com Horas Extras</option>
                            <option value="vazios">Sem Registos</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Botão Carregar (se fornecido) */}
            {onCarregarClick && (
                <div style={{ marginTop: '12px', textAlign: 'right' }}>
                    <button
                        style={{
                            ...styles.button,
                            ...styles.primaryButton,
                            padding: '8px 20px',
                            fontSize: '0.9rem'
                        }}
                        onClick={onCarregarClick}
                    >
                        🔄 Carregar Dados
                    </button>
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Comparação otimizada - só re-renderiza se valores relevantes mudarem
    return (
        prevProps.obraSelecionada === nextProps.obraSelecionada &&
        prevProps.utilizadorSelecionado === nextProps.utilizadorSelecionado &&
        prevProps.mesSelecionado === nextProps.mesSelecionado &&
        prevProps.anoSelecionado === nextProps.anoSelecionado &&
        prevProps.dataSelecionada === nextProps.dataSelecionada &&
        prevProps.filtroTipo === nextProps.filtroTipo &&
        prevProps.obras.length === nextProps.obras.length &&
        prevProps.utilizadores.length === nextProps.utilizadores.length
    );
});

FiltrosPanel.displayName = 'FiltrosPanel';

export default FiltrosPanel;
