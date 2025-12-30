import React from 'react';

/**
 * Componente memoizado para option de dia
 */
const DayOption = React.memo(({ dia, mes, ano }) => {
    return (
        <option key={dia} value={dia}>
            Dia {dia} ({mes}/{ano})
        </option>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.dia === nextProps.dia &&
        prevProps.mes === nextProps.mes &&
        prevProps.ano === nextProps.ano
    );
});

DayOption.displayName = 'DayOption';

/**
 * Lista completa de seleção de dias
 */
const DaySelectionList = React.memo(({
    diasDoMes,
    mesSelecionado,
    anoSelecionado,
    value,
    onChange,
    placeholder = "-- Selecione um dia --",
    style
}) => {
    return (
        <select
            style={style}
            value={value || ''}
            onChange={onChange}
        >
            <option value="">{placeholder}</option>
            {diasDoMes.map(dia => (
                <DayOption
                    key={dia}
                    dia={dia}
                    mes={mesSelecionado}
                    ano={anoSelecionado}
                />
            ))}
        </select>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.value === nextProps.value &&
        prevProps.diasDoMes.length === nextProps.diasDoMes.length &&
        prevProps.mesSelecionado === nextProps.mesSelecionado &&
        prevProps.anoSelecionado === nextProps.anoSelecionado
    );
});

DaySelectionList.displayName = 'DaySelectionList';

export { DayOption, DaySelectionList };
export default DaySelectionList;
