import React from 'react';
import { View, Text } from 'react-native';

/**
 * Componente memoizado para cabeçalho de dia na grade
 */
const DiaHeader = React.memo(({ dia, isWeekend, styles }) => {
    const dayOfWeek = new Date(2025, 0, dia).getDay(); // Calcula dia da semana
    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
        <View
            style={[
                styles.headerCell,
                isWeekendDay && styles.weekendHeader
            ]}
        >
            <Text style={[
                styles.headerText,
                isWeekendDay && styles.weekendHeaderText
            ]}>
                {dia}
            </Text>
            <Text style={[
                styles.dayNameText,
                isWeekendDay && styles.weekendDayNameText
            ]}>
                {dayNames[dayOfWeek]}
            </Text>
        </View>
    );
}, (prevProps, nextProps) => {
    return prevProps.dia === nextProps.dia;
});

DiaHeader.displayName = 'DiaHeader';

/**
 * Cabeçalho completo com todos os dias do mês
 */
const DiasHeaderRow = React.memo(({ diasDoMes, mesAno, styles }) => {
    return (
        <View style={styles.headerRow}>
            <View style={[styles.headerCell, styles.nomeHeaderCell]}>
                <Text style={styles.headerText}>Trabalhador</Text>
            </View>

            {diasDoMes.map(dia => (
                <DiaHeader
                    key={dia}
                    dia={dia}
                    styles={styles}
                />
            ))}
        </View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.diasDoMes.length === nextProps.diasDoMes.length &&
        prevProps.mesAno.mes === nextProps.mesAno.mes &&
        prevProps.mesAno.ano === nextProps.mesAno.ano
    );
});

DiasHeaderRow.displayName = 'DiasHeaderRow';

export { DiaHeader, DiasHeaderRow };
export default DiasHeaderRow;
