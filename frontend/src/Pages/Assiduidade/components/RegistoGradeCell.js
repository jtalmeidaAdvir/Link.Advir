import React from 'react';

/**
 * Componente memoizado para renderizar cada célula da grade de registos
 * Evita re-renders desnecessários quando outros utilizadores ou dias mudam
 */
const RegistoGradeCell = React.memo(({
    userId,
    dia,
    estatisticas,
    isSelected,
    onClick,
    styles
}) => {
    const cellKey = `${userId}-${dia}`;

    // Determinar estilo baseado em estatísticas
    const getCellStyle = () => {
        if (isSelected) {
            return { ...styles.gradeCell, ...styles.gradeCellSelected };
        }

        if (!estatisticas) {
            return styles.gradeCell;
        }

        if (estatisticas.faltas && estatisticas.faltas.length > 0) {
            return { ...styles.gradeCell, backgroundColor: '#ffe6e6' }; // Falta
        }

        if (estatisticas.horasExtras && estatisticas.horasExtras.length > 0) {
            return { ...styles.gradeCell, backgroundColor: '#e6ffe6' }; // Hora extra
        }

        if (estatisticas.totalRegistos >= 4) {
            return { ...styles.gradeCell, backgroundColor: '#d4edda' }; // Completo
        }

        if (estatisticas.totalRegistos > 0) {
            return { ...styles.gradeCell, backgroundColor: '#fff3cd' }; // Parcial
        }

        return styles.gradeCell;
    };

    // Determinar conteúdo da célula
    const getCellContent = () => {
        if (!estatisticas) return '';

        if (estatisticas.faltas && estatisticas.faltas.length > 0) {
            return '🚫';
        }

        if (estatisticas.totalRegistos >= 4) {
            return '✓';
        }

        if (estatisticas.totalRegistos > 0) {
            return estatisticas.totalRegistos;
        }

        return '';
    };

    return (
        <td
            data-cell-key={cellKey}
            style={getCellStyle()}
            onClick={onClick}
        >
            {getCellContent()}
        </td>
    );
}, (prevProps, nextProps) => {
    // Custom comparison para otimizar ainda mais
    return (
        prevProps.userId === nextProps.userId &&
        prevProps.dia === nextProps.dia &&
        prevProps.isSelected === nextProps.isSelected &&
        JSON.stringify(prevProps.estatisticas) === JSON.stringify(nextProps.estatisticas)
    );
});

RegistoGradeCell.displayName = 'RegistoGradeCell';

export default RegistoGradeCell;
