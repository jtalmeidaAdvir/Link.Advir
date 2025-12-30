import React from 'react';
import RegistoGradeCell from './RegistoGradeCell';

/**
 * Componente memoizado para renderizar cada linha (utilizador) da grade
 * Evita re-renders quando outras linhas mudam
 */
const RegistoGradeRow = React.memo(({
    item,
    index,
    diasDoMes,
    selectedCells,
    onCellClick,
    onUtilizadorClick,
    styles
}) => {
    const isEvenRow = index % 2 === 0;

    return (
        <tr
            key={item.utilizador.id}
            style={isEvenRow ? styles.gradeRowEven : styles.gradeRowOdd}
        >
            {/* Coluna fixa com nome do utilizador */}
            <td
                style={{ ...styles.gradeCell, ...styles.gradeCellFixed }}
                onClick={() => onUtilizadorClick(item.utilizador)}
            >
                <div style={styles.utilizadorGradeInfo}>
                    <div style={styles.utilizadorGradeNome}>{item.utilizador.username}</div>
                    <div style={styles.utilizadorGradeEmail}>{item.utilizador.codFuncionario}</div>
                </div>
            </td>

            {/* Células de cada dia */}
            {diasDoMes.map(dia => {
                const cellKey = `${item.utilizador.id}-${dia}`;
                const estatisticas = item.estatisticasDias?.[dia];
                const isSelected = selectedCells.includes(cellKey);

                return (
                    <RegistoGradeCell
                        key={cellKey}
                        userId={item.utilizador.id}
                        dia={dia}
                        estatisticas={estatisticas}
                        isSelected={isSelected}
                        onClick={(e) => onCellClick(e, item.utilizador.id, dia, cellKey)}
                        styles={styles}
                    />
                );
            })}
        </tr>
    );
}, (prevProps, nextProps) => {
    // Comparação otimizada
    return (
        prevProps.item.utilizador.id === nextProps.item.utilizador.id &&
        prevProps.index === nextProps.index &&
        prevProps.selectedCells === nextProps.selectedCells &&
        prevProps.diasDoMes === nextProps.diasDoMes &&
        JSON.stringify(prevProps.item.estatisticasDias) === JSON.stringify(nextProps.item.estatisticasDias)
    );
});

RegistoGradeRow.displayName = 'RegistoGradeRow';

export default RegistoGradeRow;
