import React from 'react';
import styles from '../RegistosPorUtilizadorStyles';

/**
 * Componente reutilizável para seleção de obra
 * @param {string} value - ID da obra selecionada
 * @param {Function} onChange - Callback chamado quando obra muda
 * @param {Array} obras - Lista de obras disponíveis
 * @param {string} label - Label opcional para o campo (default: "🏗️ Obra")
 * @param {boolean} required - Se o campo é obrigatório (default: false)
 */
const ObraSelector = ({ value, onChange, obras = [], label = '🏗️ Obra', required = false }) => {
    return (
        <div style={styles.fieldGroup}>
            <label style={styles.label}>
                {label} {!required && '(Opcional)'}
            </label>
            <select
                style={styles.obraSelect}
                value={value}
                onChange={e => onChange(e.target.value)}
            >
                <option value="">-- Selecione uma obra --</option>
                {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
            </select>
        </div>
    );
};

export default ObraSelector;
