import React, { useCallback } from 'react';
import * as XLSX from 'xlsx-js-style';

/**
 * Componente de ações de exportação
 * Permite exportar dados para Excel com diferentes formatos
 */
const ExportActions = React.memo(({
    dadosGrade,
    diasDoMes,
    mesSelecionado,
    anoSelecionado,
    obraSelecionada,
    obras,
    tiposFaltas,
    styles
}) => {
    /**
     * Exportar para Excel - Formato Resumido
     */
    const exportarResumo = useCallback(() => {
        if (!dadosGrade || dadosGrade.length === 0) {
            alert('Sem dados para exportar');
            return;
        }

        const wb = XLSX.utils.book_new();
        const data = [];

        // Header
        data.push(['Funcionário', 'Código', ...diasDoMes.map(d => `Dia ${d}`)]);

        // Dados
        dadosGrade.forEach(item => {
            const row = [
                item.utilizador.nome || item.utilizador.username,
                item.utilizador.codFuncionario || ''
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

            data.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Resumo');

        const nomeObra = obraSelecionada
            ? obras.find(o => o.id.toString() === obraSelecionada.toString())?.nome || 'Obra'
            : 'Todas';

        XLSX.writeFile(wb, `Registos_${nomeObra}_${mesSelecionado}_${anoSelecionado}.xlsx`);
    }, [dadosGrade, diasDoMes, mesSelecionado, anoSelecionado, obraSelecionada, obras]);

    /**
     * Exportar para Excel - Formato Detalhado
     */
    const exportarDetalhado = useCallback(() => {
        if (!dadosGrade || dadosGrade.length === 0) {
            alert('Sem dados para exportar');
            return;
        }

        const wb = XLSX.utils.book_new();
        const data = [];

        // Header
        data.push([
            'Funcionário',
            'Código',
            'Dia',
            'Data',
            'Dia Semana',
            'Total Registos',
            'Faltas',
            'Tipo Falta',
            'Horas Extras',
            'Status'
        ]);

        // Dias da semana
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        // Dados
        dadosGrade.forEach(item => {
            diasDoMes.forEach(dia => {
                const est = item.estatisticasDias?.[dia];
                const dataObj = new Date(anoSelecionado, mesSelecionado - 1, dia);
                const diaSemana = diasSemana[dataObj.getDay()];
                const dataFormatada = `${String(dia).padStart(2, '0')}/${String(mesSelecionado).padStart(2, '0')}/${anoSelecionado}`;

                let status = '';
                let tipoFalta = '';
                let horasExtras = '';

                if (est) {
                    if (est.faltas?.length > 0) {
                        status = 'FALTA';
                        tipoFalta = est.faltas.map(f => tiposFaltas[f.tipoFalta] || f.tipoFalta).join(', ');
                    } else if (est.totalRegistos >= 4) {
                        status = 'COMPLETO';
                    } else if (est.totalRegistos > 0) {
                        status = 'PARCIAL';
                    }

                    if (est.horasExtras?.length > 0) {
                        horasExtras = est.horasExtras.map(h => `${h.tipo}: ${h.tempo}h`).join(', ');
                    }
                }

                data.push([
                    item.utilizador.nome || item.utilizador.username,
                    item.utilizador.codFuncionario || '',
                    dia,
                    dataFormatada,
                    diaSemana,
                    est?.totalRegistos || 0,
                    est?.faltas?.length || 0,
                    tipoFalta,
                    horasExtras,
                    status
                ]);
            });
        });

        const ws = XLSX.utils.aoa_to_sheet(data);

        // Auto-size columns
        const maxWidths = data[0].map((_, colIndex) => {
            return Math.max(
                ...data.map(row => String(row[colIndex] || '').length)
            );
        });
        ws['!cols'] = maxWidths.map(width => ({ wch: Math.min(width + 2, 50) }));

        XLSX.utils.book_append_sheet(wb, ws, 'Detalhado');

        const nomeObra = obraSelecionada
            ? obras.find(o => o.id.toString() === obraSelecionada.toString())?.nome || 'Obra'
            : 'Todas';

        XLSX.writeFile(wb, `Registos_Detalhado_${nomeObra}_${mesSelecionado}_${anoSelecionado}.xlsx`);
    }, [dadosGrade, diasDoMes, mesSelecionado, anoSelecionado, obraSelecionada, obras, tiposFaltas]);

    /**
     * Exportar Estatísticas
     */
    const exportarEstatisticas = useCallback(() => {
        if (!dadosGrade || dadosGrade.length === 0) {
            alert('Sem dados para exportar');
            return;
        }

        const wb = XLSX.utils.book_new();
        const data = [];

        // Header
        data.push([
            'Funcionário',
            'Código',
            'Total Dias Trabalho',
            'Total Faltas',
            'Total Horas Extras',
            'Dias Completos',
            'Dias Parciais',
            'Dias Vazios',
            '% Assiduidade'
        ]);

        // Calcular estatísticas por funcionário
        dadosGrade.forEach(item => {
            let diasTrabalho = 0;
            let totalFaltas = 0;
            let totalHorasExtras = 0;
            let diasCompletos = 0;
            let diasParciais = 0;
            let diasVazios = 0;

            diasDoMes.forEach(dia => {
                const est = item.estatisticasDias?.[dia];
                const dataObj = new Date(anoSelecionado, mesSelecionado - 1, dia);
                const isWeekend = dataObj.getDay() === 0 || dataObj.getDay() === 6;

                if (!isWeekend) {
                    if (est) {
                        if (est.faltas?.length > 0) {
                            totalFaltas += est.faltas.length;
                        } else if (est.totalRegistos >= 4) {
                            diasCompletos++;
                            diasTrabalho++;
                        } else if (est.totalRegistos > 0) {
                            diasParciais++;
                        } else {
                            diasVazios++;
                        }

                        if (est.horasExtras?.length > 0) {
                            totalHorasExtras += est.horasExtras.length;
                        }
                    } else {
                        diasVazios++;
                    }
                }
            });

            const totalDiasUteis = diasDoMes.filter(dia => {
                const dataObj = new Date(anoSelecionado, mesSelecionado - 1, dia);
                return dataObj.getDay() !== 0 && dataObj.getDay() !== 6;
            }).length;

            const assiduidade = totalDiasUteis > 0
                ? ((diasTrabalho / totalDiasUteis) * 100).toFixed(1)
                : 0;

            data.push([
                item.utilizador.nome || item.utilizador.username,
                item.utilizador.codFuncionario || '',
                diasTrabalho,
                totalFaltas,
                totalHorasExtras,
                diasCompletos,
                diasParciais,
                diasVazios,
                `${assiduidade}%`
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);

        // Auto-size columns
        ws['!cols'] = [
            { wch: 30 }, // Nome
            { wch: 15 }, // Código
            { wch: 18 }, // Total Dias
            { wch: 15 }, // Faltas
            { wch: 18 }, // Horas Extras
            { wch: 16 }, // Completos
            { wch: 15 }, // Parciais
            { wch: 14 }, // Vazios
            { wch: 15 }  // Assiduidade
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Estatísticas');

        const nomeObra = obraSelecionada
            ? obras.find(o => o.id.toString() === obraSelecionada.toString())?.nome || 'Obra'
            : 'Todas';

        XLSX.writeFile(wb, `Estatisticas_${nomeObra}_${mesSelecionado}_${anoSelecionado}.xlsx`);
    }, [dadosGrade, diasDoMes, mesSelecionado, anoSelecionado, obraSelecionada, obras]);

    return (
        <div style={{
            ...styles.filtersCard,
            marginTop: '10px'
        }}>
            <h3 style={{
                ...styles.sectionTitle,
                fontSize: '1.1rem',
                marginBottom: '12px'
            }}>
                <span style={styles.sectionIcon}>📥</span>
                Exportar Dados
            </h3>

            <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
            }}>
                <button
                    style={{
                        ...styles.button,
                        ...styles.successButton,
                        padding: '8px 16px',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                    onClick={exportarResumo}
                    title="Exportar vista resumida (✓, Faltas, etc.)"
                >
                    📊 Excel Resumido
                </button>

                <button
                    style={{
                        ...styles.button,
                        ...styles.primaryButton,
                        padding: '8px 16px',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                    onClick={exportarDetalhado}
                    title="Exportar todos os detalhes por dia"
                >
                    📋 Excel Detalhado
                </button>

                <button
                    style={{
                        ...styles.button,
                        ...styles.infoButton,
                        padding: '8px 16px',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                    onClick={exportarEstatisticas}
                    title="Exportar estatísticas agregadas por funcionário"
                >
                    📈 Estatísticas
                </button>
            </div>

            <p style={{
                fontSize: '0.75rem',
                color: '#666',
                marginTop: '8px',
                fontStyle: 'italic'
            }}>
                💡 Dica: Use Excel Resumido para visão rápida, Detalhado para análise completa, ou Estatísticas para métricas agregadas.
            </p>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.dadosGrade.length === nextProps.dadosGrade.length &&
        prevProps.diasDoMes.length === nextProps.diasDoMes.length &&
        prevProps.mesSelecionado === nextProps.mesSelecionado &&
        prevProps.anoSelecionado === nextProps.anoSelecionado &&
        prevProps.obraSelecionada === nextProps.obraSelecionada
    );
});

ExportActions.displayName = 'ExportActions';

export default ExportActions;
