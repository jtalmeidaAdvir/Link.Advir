import React from 'react';

/**
 * Componente memoizado para renderizar lista de utilizadores
 * Usado em modais e dropdowns
 */
const UserSelectionOption = React.memo(({ item, children }) => {
    return (
        <option key={item.utilizador.id} value={item.utilizador.id}>
            {children || `${item.utilizador.nome} (${item.utilizador.codFuncionario})`}
        </option>
    );
}, (prevProps, nextProps) => {
    return prevProps.item.utilizador.id === nextProps.item.utilizador.id;
});

UserSelectionOption.displayName = 'UserSelectionOption';

/**
 * Lista completa de seleção de utilizadores
 */
const UserSelectionList = React.memo(({ dadosGrade, value, onChange, placeholder = "-- Selecione um utilizador --", style }) => {
    return (
        <select
            style={style}
            value={value || ''}
            onChange={onChange}
        >
            <option value="">{placeholder}</option>
            {dadosGrade.map(item => (
                <UserSelectionOption key={item.utilizador.id} item={item} />
            ))}
        </select>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.value === nextProps.value &&
        prevProps.dadosGrade.length === nextProps.dadosGrade.length &&
        prevProps.placeholder === nextProps.placeholder
    );
});

UserSelectionList.displayName = 'UserSelectionList';

export { UserSelectionOption, UserSelectionList };
export default UserSelectionList;
