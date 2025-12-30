import React from 'react';
import styles from '../RegistosPorUtilizadorStyles';

/**
 * Componente reutilizável para configuração de horários
 * @param {Object} horarios - Objeto com horários {entradaManha, saidaManha, entradaTarde, saidaTarde}
 * @param {Function} onChange - Callback chamado quando horários mudam
 */
const HorariosInput = ({ horarios, onChange }) => {
    const handleChange = (field, value) => {
        onChange(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div style={styles.horariosContainer}>
            <h4 style={styles.horariosTitle}>⏰ Configurar Horários</h4>

            <div style={styles.horariosGrid}>
                {/* Período da Manhã */}
                <div style={styles.periodoContainer}>
                    <div style={styles.periodoHeader}>
                        <span style={styles.periodoIcon}>🌅</span>
                        <span style={styles.periodoTitle}>Manhã</span>
                    </div>
                    <div style={styles.horarioRow}>
                        <div style={styles.inputGroup}>
                            <label style={styles.timeLabel}>Entrada</label>
                            <input
                                type="time"
                                style={styles.timeInput}
                                value={horarios.entradaManha}
                                onChange={e => handleChange('entradaManha', e.target.value)}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.timeLabel}>Saída</label>
                            <input
                                type="time"
                                style={styles.timeInput}
                                value={horarios.saidaManha}
                                onChange={e => handleChange('saidaManha', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Período da Tarde */}
                <div style={styles.periodoContainer}>
                    <div style={styles.periodoHeader}>
                        <span style={styles.periodoIcon}>🌇</span>
                        <span style={styles.periodoTitle}>Tarde</span>
                    </div>
                    <div style={styles.horarioRow}>
                        <div style={styles.inputGroup}>
                            <label style={styles.timeLabel}>Entrada</label>
                            <input
                                type="time"
                                style={styles.timeInput}
                                value={horarios.entradaTarde}
                                onChange={e => handleChange('entradaTarde', e.target.value)}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.timeLabel}>Saída</label>
                            <input
                                type="time"
                                style={styles.timeInput}
                                value={horarios.saidaTarde}
                                onChange={e => handleChange('saidaTarde', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HorariosInput;
