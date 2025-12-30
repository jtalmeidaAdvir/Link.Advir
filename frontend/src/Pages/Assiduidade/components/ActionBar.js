import React from 'react';
import styles from '../RegistosPorUtilizadorStyles';

/**
 * Componente de botão de ação individual
 */
const ActionButton = ({
    label,
    icon,
    onClick,
    variant = 'primary',
    disabled = false,
    count = null,
    loading = false
}) => {
    const variantStyles = {
        primary: styles.primaryButton,
        export: styles.exportButton,
        warning: { ...styles.primaryButton, backgroundColor: '#d69e2e' },
        success: { ...styles.primaryButton, backgroundColor: '#38a169' },
        danger: { ...styles.primaryButton, backgroundColor: '#e53e3e' },
        purple: { ...styles.primaryButton, backgroundColor: '#805ad5' },
        info: { ...styles.primaryButton, backgroundColor: '#3182ce' }
    };

    const buttonStyle = {
        ...variantStyles[variant],
        padding: '10px 16px',
        fontSize: '0.9rem',
        minWidth: '120px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px'
    };

    const displayLabel = loading
        ? 'A carregar...'
        : count !== null
            ? `${label} (${count})`
            : label;

    return (
        <button
            style={buttonStyle}
            onClick={onClick}
            disabled={disabled || loading}
        >
            <span>{icon}</span>
            <span>{displayLabel}</span>
        </button>
    );
};

/**
 * Container para grupo de botões relacionados
 */
const ButtonGroup = ({ children, title }) => (
    <div style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: '8px',
        marginRight: '16px'
    }}>
        {title && (
            <span style={{
                fontSize: '0.7rem',
                color: '#718096',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                paddingLeft: '4px'
            }}>
                {title}
            </span>
        )}
        <div style={{
            display: 'inline-flex',
            gap: '8px',
            flexWrap: 'wrap'
        }}>
            {children}
        </div>
    </div>
);

/**
 * Barra de ações organizada para o modo Grade
 */
const ActionBar = ({
    onCarregarGrade,
    onExportarGrade,
    onRegistoBloco,
    onFaltasBloco,
    onHorasExtrasBloco,
    onEliminarBloco,
    onAutoPreencher,
    onNovaFalta,
    onNovaHoraExtra,
    onLimparDia,
    loadingGrade = false,
    anoSelecionado = null,
    mesSelecionado = null,
    temDadosGrade = false,
    selectedCellsCount = 0
}) => {
    return (
        <div style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            padding: '12px 0'
        }}>
            {/* GRUPO 1: Gestão da Grade */}
            <ButtonGroup title="Grade">
                <ActionButton
                    icon="📊"
                    label="Carregar"
                    onClick={onCarregarGrade}
                    variant="primary"
                    disabled={loadingGrade || !anoSelecionado || !mesSelecionado}
                    loading={loadingGrade}
                />

                {temDadosGrade && (
                    <ActionButton
                        icon="📥"
                        label="Exportar"
                        onClick={onExportarGrade}
                        variant="export"
                    />
                )}
            </ButtonGroup>

            {/* GRUPO 2: Ações em Bloco */}
            {selectedCellsCount > 0 && (
                <ButtonGroup title={`Ações em Bloco (${selectedCellsCount})`}>
                    <ActionButton
                        icon="📋"
                        label="Pontos"
                        onClick={onRegistoBloco}
                        variant="info"
                        count={selectedCellsCount}
                    />

                    <ActionButton
                        icon="📅"
                        label="Faltas"
                        onClick={onFaltasBloco}
                        variant="warning"
                        count={selectedCellsCount}
                    />

                    <ActionButton
                        icon="⏰"
                        label="H.Extras"
                        onClick={onHorasExtrasBloco}
                        variant="success"
                        count={selectedCellsCount}
                    />

                    <ActionButton
                        icon="🗑️"
                        label="Eliminar"
                        onClick={onEliminarBloco}
                        variant="danger"
                        count={selectedCellsCount}
                    />
                </ButtonGroup>
            )}

            {/* GRUPO 3: Adicionar */}
            {temDadosGrade && (
                <ButtonGroup title="Adicionar">
                    <ActionButton
                        icon="➕"
                        label="Falta"
                        onClick={onNovaFalta}
                        variant="warning"
                    />

                    <ActionButton
                        icon="➕"
                        label="H.Extra"
                        onClick={onNovaHoraExtra}
                        variant="success"
                    />
                </ButtonGroup>
            )}

            {/* GRUPO 4: Ferramentas */}
            {temDadosGrade && (
                <ButtonGroup title="Ferramentas">
                    <ActionButton
                        icon="🤖"
                        label="Auto-Preencher"
                        onClick={onAutoPreencher}
                        variant="purple"
                    />

                    <ActionButton
                        icon="🧹"
                        label="Limpar Dia"
                        onClick={onLimparDia}
                        variant="danger"
                    />
                </ButtonGroup>
            )}
        </div>
    );
};

export default ActionBar;
