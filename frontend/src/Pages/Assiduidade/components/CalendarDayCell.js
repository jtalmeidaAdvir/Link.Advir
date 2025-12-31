import React, { useMemo } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

/**
 * Célula do calendário otimizada com React.memo
 * Evita re-renders desnecessários ao memorizar props
 */
const CalendarDayCell = React.memo(({
    date,
    resumo,
    diasPendentes,
    feriadosSet,
    faltas,
    diaSelecionado,
    onDayClick
}) => {
    if (!date) {
        return <button className="invisible" disabled></button>;
    }

    // Formata data para YYYY-MM-DD (formato usado pelas chaves do resumo)
    const dataFormatada = useMemo(() => {
        const ano = date.getFullYear();
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const dia = String(date.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    }, [date]);

    const isPendente = diasPendentes.includes(dataFormatada);
    const isFeriado = feriadosSet.has(dataFormatada);

    const existeFaltaF50 = useMemo(() => {
        return Array.isArray(faltas) && faltas.some(f => {
            const dataFalta = new Date(f.Data);
            return (
                f.Falta === 'F50' &&
                dataFalta.getFullYear() === date.getFullYear() &&
                dataFalta.getMonth() === date.getMonth() &&
                dataFalta.getDate() === date.getDate()
            );
        });
    }, [faltas, date]);

    // Memoização da lógica de classes
    const classeDia = useMemo(() => {
        const formatarDataLocal = (d) => {
            const ano = d.getFullYear();
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const dia = String(d.getDate()).padStart(2, '0');
            return `${ano}-${mes}-${dia}`;
        };

        const hoje = new Date();
        const isHoje = formatarDataLocal(hoje) === dataFormatada;
        const isPassado = date < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const temRegisto = resumo[dataFormatada];
        const diaSemana = date.getDay();
        const isDiaUtil = diaSemana !== 0 && diaSemana !== 6;
        const isSelecionado = diaSelecionado === dataFormatada;

        const existeFalta = Array.isArray(faltas) && faltas.some(f => {
            const dataFalta = new Date(f.Data);
            return (
                dataFalta.getFullYear() === date.getFullYear() &&
                dataFalta.getMonth() === date.getMonth() &&
                dataFalta.getDate() === date.getDate()
            );
        });

        let classes = 'calendario-dia btn';

        // Prioridade ao feriado (fica laranja)
        if (isFeriado) {
            classes += ' dia-feriado';
            if (isSelecionado) classes += ' border-2';
            return classes;
        }

        const isFimDeSemana = diaSemana === 0 || diaSemana === 6;

        if (isSelecionado) classes += ' btn-primary';
        else if (existeFalta) classes += ' dia-falta';
        else if (isHoje) classes += ' btn-outline-primary';
        else if (isPendente) classes += ' dia-pendente';
        else if (temRegisto) {
            const horasStr = resumo[dataFormatada]?.split('h')[0];
            const horasTrabalhadas = parseInt(horasStr, 10);
            if (horasTrabalhadas >= 8) {
                classes += ' btn-success';
            } else {
                classes += ' btn-menor-8h';
            }
        } else if (isFimDeSemana) {
            classes += ' dia-weekend';
        } else {
            classes += ' btn-outline-secondary';
        }

        return classes;
    }, [date, dataFormatada, resumo, diaSelecionado, isPendente, isFeriado, faltas]);

    return (
        <button
            className={classeDia}
            onClick={() => onDayClick(dataFormatada)}
        >
            <span>{date.getDate()}</span>

            {isFeriado && (
                <span className="horas-dia" style={{ fontSize: '0.65rem', color: '#5d4037' }}>
                    Fe
                </span>
            )}

            {existeFaltaF50 && (
                <span
                    style={{
                        position: 'absolute',
                        top: '4px',
                        right: '6px',
                        fontSize: '0.8rem'
                    }}
                    title="Férias"
                >
                    🌴
                </span>
            )}

            {isPendente && (
                <span
                    style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '6px',
                        fontSize: '0.85rem',
                        color: '#f0ad4e'
                    }}
                    title="Pendente de aprovação"
                >
                    ⏳
                </span>
            )}

            {resumo[dataFormatada] && !isFeriado && (
                <span className="horas-dia">
                    {resumo[dataFormatada]}
                </span>
            )}

            {!resumo[dataFormatada] &&
                !isFeriado &&
                date < new Date() &&
                date.getDay() !== 0 &&
                date.getDay() !== 6 && (
                    <FaExclamationTriangle className="text-warning mt-1" size={12} />
                )}
        </button>
    );
}, (prevProps, nextProps) => {
    // Comparação customizada para evitar re-renders desnecessários
    // Retorna true se props são iguais (não deve re-renderizar)
    if (!prevProps.date && !nextProps.date) return true;
    if (!prevProps.date || !nextProps.date) return false;

    // Comparar data
    if (prevProps.date.getTime() !== nextProps.date.getTime()) return false;

    // Comparar dia selecionado
    if (prevProps.diaSelecionado !== nextProps.diaSelecionado) return false;

    // Comparar se tem resumo para esta data
    const prevDataFormatada = `${prevProps.date.getFullYear()}-${String(prevProps.date.getMonth() + 1).padStart(2, '0')}-${String(prevProps.date.getDate()).padStart(2, '0')}`;
    const nextDataFormatada = `${nextProps.date.getFullYear()}-${String(nextProps.date.getMonth() + 1).padStart(2, '0')}-${String(nextProps.date.getDate()).padStart(2, '0')}`;

    if (prevProps.resumo[prevDataFormatada] !== nextProps.resumo[nextDataFormatada]) return false;

    // Comparar se está nos pendentes
    const prevPendente = prevProps.diasPendentes.includes(prevDataFormatada);
    const nextPendente = nextProps.diasPendentes.includes(nextDataFormatada);
    if (prevPendente !== nextPendente) return false;

    // Comparar se é feriado
    const prevFeriado = prevProps.feriadosSet.has(prevDataFormatada);
    const nextFeriado = nextProps.feriadosSet.has(nextDataFormatada);
    if (prevFeriado !== nextFeriado) return false;

    // Props são iguais - não precisa re-renderizar
    return true;
});

CalendarDayCell.displayName = 'CalendarDayCell';

export default CalendarDayCell;
