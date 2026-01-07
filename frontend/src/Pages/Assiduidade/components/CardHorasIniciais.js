import React, { useState } from 'react';
import * as API from '../services/apiService';
import { secureStorage } from '../../../utils/secureStorage';

/**
 * Componente para editar horas iniciais de um utilizador
 */
const CardHorasIniciais = ({ userId, ano, horasIniciais, existeRegisto, ultimaAtualizacao, onSave }) => {
    const [editando, setEditando] = useState(false);
    const [valor, setValor] = useState(horasIniciais || 0);
    const [salvando, setSalvando] = useState(false);
    const token = secureStorage.getItem('loginToken');

    const handleEditar = () => {
        setValor(horasIniciais || 0);
        setEditando(true);
    };

    const handleCancelar = () => {
        setEditando(false);
        setValor(horasIniciais || 0);
    };

    const handleGuardar = async () => {
        setSalvando(true);
        try {
            await API.definirHorasIniciais(token, userId, ano, valor);
            alert('✅ Horas iniciais guardadas com sucesso!');
            setEditando(false);
            if (onSave) onSave();
        } catch (error) {
            console.error('Erro ao guardar horas iniciais:', error);
            alert('❌ Erro ao guardar horas iniciais');
        } finally {
            setSalvando(false);
        }
    };

    const formatarHoras = (horasDecimais) => {
        const horas = Math.floor(horasDecimais);
        const minutos = Math.round((horasDecimais - horas) * 60);
        return `${horas}h ${String(minutos).padStart(2, '0')}m`;
    };

    const styles = {
        cardHoras: {
            backgroundColor: '#E3F2FD',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '15px',
            border: '1px solid #90CAF9'
        },
        labelHoras: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
        },
        titulo: {
            fontSize: '14px',
            fontWeight: '600',
            color: '#1976D2'
        },
        dataAtualizacao: {
            fontSize: '11px',
            color: '#666',
            fontStyle: 'italic'
        },
        editContainer: {
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
        },
        input: {
            flex: 1,
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
        },
        btnSalvar: {
            padding: '8px 14px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: salvando ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            opacity: salvando ? 0.6 : 1
        },
        btnCancelar: {
            padding: '8px 14px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500'
        },
        displayContainer: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        valorDisplay: {
            fontSize: '18px',
            fontWeight: '700',
            color: '#1976D2'
        },
        btnEditar: {
            padding: '8px 14px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500'
        },
        semRegisto: {
            color: '#999',
            fontSize: '13px',
            fontStyle: 'italic',
            marginTop: '5px'
        }
    };

    return (
        <div style={styles.cardHoras}>
            <div style={styles.labelHoras}>
                <span style={styles.titulo}>
                    📅 Horas Iniciais {ano} (transitadas do ano anterior)
                </span>
                {ultimaAtualizacao && (
                    <span style={styles.dataAtualizacao}>
                        Atualizado: {new Date(ultimaAtualizacao).toLocaleString('pt-PT')}
                    </span>
                )}
            </div>

            {editando ? (
                <div style={styles.editContainer}>
                    <input
                        type="number"
                        step="0.25"
                        value={valor}
                        onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
                        style={styles.input}
                        placeholder="Horas (ex: 10.5)"
                        disabled={salvando}
                    />
                    <button
                        onClick={handleGuardar}
                        style={styles.btnSalvar}
                        disabled={salvando}
                    >
                        {salvando ? '...' : '✓ Guardar'}
                    </button>
                    <button
                        onClick={handleCancelar}
                        style={styles.btnCancelar}
                        disabled={salvando}
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <div style={styles.displayContainer}>
                    <span style={styles.valorDisplay}>
                        {formatarHoras(horasIniciais || 0)}
                    </span>
                    <button
                        onClick={handleEditar}
                        style={styles.btnEditar}
                    >
                        ✏️ Editar
                    </button>
                </div>
            )}

            {!existeRegisto && (
                <div style={styles.semRegisto}>
                    ℹ️ Sem registo guardado - defina as horas iniciais e clique em Recalcular
                </div>
            )}
        </div>
    );
};

export default CardHorasIniciais;
