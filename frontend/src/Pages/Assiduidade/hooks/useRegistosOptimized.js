import { useMemo, useCallback } from 'react';

/**
 * Hook customizado para otimizar cálculos e callbacks relacionados com registos
 */
export const useRegistosOptimized = (dadosGrade, diasDoMes, selectedCells) => {

    /**
     * Memoiza a contagem de células selecionadas agrupadas por utilizador
     */
    const cellsByUser = useMemo(() => {
        if (!selectedCells || selectedCells.length === 0) return {};

        const grouped = {};
        selectedCells.forEach(cellKey => {
            const [userId, dia] = cellKey.split('-');
            if (!grouped[userId]) {
                grouped[userId] = [];
            }
            grouped[userId].push(parseInt(dia, 10));
        });

        return grouped;
    }, [selectedCells]);

    /**
     * Memoiza array de utilizadores (evita re-criar em cada render)
     */
    const utilizadoresList = useMemo(() => {
        return dadosGrade.map(item => item.utilizador);
    }, [dadosGrade]);

    /**
     * Memoiza estatísticas gerais da grade
     */
    const estatisticasGerais = useMemo(() => {
        let totalRegistos = 0;
        let totalFaltas = 0;
        let totalHorasExtras = 0;
        let utilizadoresComRegistos = 0;

        dadosGrade.forEach(item => {
            let hasRegistos = false;

            diasDoMes.forEach(dia => {
                const est = item.estatisticasDias?.[dia];
                if (est) {
                    totalRegistos += est.totalRegistos || 0;
                    totalFaltas += est.faltas?.length || 0;
                    totalHorasExtras += est.horasExtras?.length || 0;
                    if (est.totalRegistos > 0) hasRegistos = true;
                }
            });

            if (hasRegistos) utilizadoresComRegistos++;
        });

        return {
            totalRegistos,
            totalFaltas,
            totalHorasExtras,
            utilizadoresComRegistos,
            totalUtilizadores: dadosGrade.length
        };
    }, [dadosGrade, diasDoMes]);

    /**
     * Callback memoizado para encontrar utilizador por ID
     */
    const findUtilizadorById = useCallback((userId) => {
        return dadosGrade.find(item => item.utilizador.id === parseInt(userId, 10));
    }, [dadosGrade]);

    /**
     * Callback memoizado para verificar se célula está selecionada
     */
    const isCellSelected = useCallback((userId, dia) => {
        const cellKey = `${userId}-${dia}`;
        return selectedCells.includes(cellKey);
    }, [selectedCells]);

    /**
     * Memoiza lista de dias vazios por utilizador
     */
    const diasVaziosPorUtilizador = useMemo(() => {
        const resultado = {};

        dadosGrade.forEach(item => {
            const diasVazios = diasDoMes.filter(dia => {
                const estatisticas = item.estatisticasDias?.[dia];

                // Verificar se é fim de semana
                const dataObj = new Date(
                    new Date().getFullYear(),
                    new Date().getMonth(),
                    dia
                );
                const isWeekend = dataObj.getDay() === 0 || dataObj.getDay() === 6;

                // Considerar vazio se não for fim de semana e não tiver registos/faltas
                return !isWeekend &&
                       (!estatisticas ||
                        (estatisticas.totalRegistos === 0 &&
                         (!estatisticas.faltas || estatisticas.faltas.length === 0)));
            });

            resultado[item.utilizador.id] = diasVazios;
        });

        return resultado;
    }, [dadosGrade, diasDoMes]);

    return {
        cellsByUser,
        utilizadoresList,
        estatisticasGerais,
        findUtilizadorById,
        isCellSelected,
        diasVaziosPorUtilizador
    };
};

/**
 * Hook para calcular horas trabalhadas de forma otimizada
 */
export const useCalcularHoras = (registos) => {
    return useMemo(() => {
        if (!registos || registos.length === 0) return { total: 0, formatted: '0:00' };

        // Agrupar por dia
        const porDia = {};
        registos.forEach(r => {
            const data = r.timestamp.split('T')[0];
            if (!porDia[data]) porDia[data] = [];
            porDia[data].push(r);
        });

        let totalHoras = 0;

        Object.values(porDia).forEach(registosDia => {
            const sorted = registosDia.sort((a, b) =>
                new Date(a.timestamp) - new Date(b.timestamp)
            );

            for (let i = 0; i < sorted.length - 1; i += 2) {
                const entrada = new Date(sorted[i].timestamp);
                const saida = new Date(sorted[i + 1].timestamp);
                const diff = (saida - entrada) / (1000 * 60 * 60); // horas
                totalHoras += diff;
            }
        });

        const horas = Math.floor(totalHoras);
        const minutos = Math.round((totalHoras - horas) * 60);

        return {
            total: totalHoras,
            formatted: `${horas}:${String(minutos).padStart(2, '0')}`
        };
    }, [registos]);
};

/**
 * Hook para formatar dados para exportação Excel
 */
export const useExportData = (dadosGrade, diasDoMes) => {
    return useMemo(() => {
        const exportRows = [];

        // Header
        const header = ['Funcionário', 'Código', ...diasDoMes.map(d => `Dia ${d}`)];
        exportRows.push(header);

        // Dados
        dadosGrade.forEach(item => {
            const row = [
                item.utilizador.nome,
                item.utilizador.codFuncionario
            ];

            diasDoMes.forEach(dia => {
                const est = item.estatisticasDias?.[dia];
                if (!est) {
                    row.push('');
                } else if (est.faltas?.length > 0) {
                    row.push('FALTA');
                } else if (est.totalRegistos >= 4) {
                    row.push('✓');
                } else if (est.totalRegistos > 0) {
                    row.push(est.totalRegistos);
                } else {
                    row.push('');
                }
            });

            exportRows.push(row);
        });

        return exportRows;
    }, [dadosGrade, diasDoMes]);
};
