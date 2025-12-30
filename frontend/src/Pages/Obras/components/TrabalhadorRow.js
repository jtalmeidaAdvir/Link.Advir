import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Componente memoizado para linha de trabalhador em PartesDiarias
 * Evita re-renders quando outras linhas mudam
 */
const TrabalhadorRow = React.memo(({
    trabalhador,
    diasDoMes,
    onPressCell,
    onPressNome,
    styles,
    categoriaColors = {
        MaoObra: '#4CAF50',
        Equipamentos: '#2196F3',
        SubEmpSubs: '#FF9800',
        default: '#757575'
    }
}) => {
    const getBackgroundColor = (info) => {
        if (!info) return 'transparent';

        if (info.faltas) return '#ffebee';
        if (info.horasExtras) return '#e8f5e9';
        if (info.especialidade || info.quantidade > 0) {
            return categoriaColors[info.categoria] || categoriaColors.default;
        }

        return 'transparent';
    };

    const getCellContent = (info) => {
        if (!info) return null;

        if (info.faltas) {
            return (
                <View style={{ alignItems: 'center' }}>
                    <FontAwesome name="ban" size={16} color="#c62828" />
                    <Text style={{ fontSize: 10, color: '#c62828' }}>Falta</Text>
                </View>
            );
        }

        if (info.horasExtras) {
            return (
                <View style={{ alignItems: 'center' }}>
                    <MaterialCommunityIcons name="clock-plus-outline" size={16} color="#2e7d32" />
                    <Text style={{ fontSize: 10, color: '#2e7d32' }}>H.Extra</Text>
                </View>
            );
        }

        if (info.especialidade) {
            return (
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '600' }}>
                        {info.especialidade}
                    </Text>
                    <Text style={{ fontSize: 10 }}>
                        {info.quantidade}h
                    </Text>
                </View>
            );
        }

        return null;
    };

    return (
        <View style={styles.row}>
            {/* Coluna fixa com nome do trabalhador */}
            <TouchableOpacity
                style={styles.nomeCell}
                onPress={() => onPressNome && onPressNome(trabalhador)}
            >
                <Text style={styles.nomeText} numberOfLines={2}>
                    {trabalhador.nome || trabalhador.username}
                </Text>
                {trabalhador.codFuncionario && (
                    <Text style={styles.codText}>
                        {trabalhador.codFuncionario}
                    </Text>
                )}
            </TouchableOpacity>

            {/* Células dos dias */}
            {diasDoMes.map(dia => {
                const info = trabalhador.diasInfo?.[dia];

                return (
                    <TouchableOpacity
                        key={`${trabalhador.id}-${dia}`}
                        style={[
                            styles.diaCell,
                            { backgroundColor: getBackgroundColor(info) }
                        ]}
                        onPress={() => onPressCell && onPressCell(trabalhador, dia)}
                    >
                        {getCellContent(info)}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}, (prevProps, nextProps) => {
    // Comparação otimizada
    return (
        prevProps.trabalhador.id === nextProps.trabalhador.id &&
        prevProps.diasDoMes.length === nextProps.diasDoMes.length &&
        JSON.stringify(prevProps.trabalhador.diasInfo) === JSON.stringify(nextProps.trabalhador.diasInfo)
    );
});

TrabalhadorRow.displayName = 'TrabalhadorRow';

export default TrabalhadorRow;
