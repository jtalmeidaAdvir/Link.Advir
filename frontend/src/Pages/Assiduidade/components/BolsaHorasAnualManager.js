import React, { useState, useEffect } from 'react';
import * as API from '../services/apiService';
import { secureStorage } from '../../../utils/secureStorage';
import CardHorasIniciais from './CardHorasIniciais';

/**
 * Componente para gerir bolsa de horas anual com valores guardados na BD
 */
const BolsaHorasAnualManager = ({
    anoSelecionado,
    onAnoChange,
    utilizadores,
    horarios,
    onRecalcular,
    loadingRecalculo
}) => {
    const [bolsasGuardadas, setBolsasGuardadas] = useState({});
    const [loading, setLoading] = useState(false);
    const token = secureStorage.getItem('loginToken');

    // Carregar bolsas guardadas da BD quando muda o ano
    useEffect(() => {
        carregarBolsasGuardadas();
    }, [anoSelecionado]);

    const carregarBolsasGuardadas = async () => {
        setLoading(true);
        try {
            const empresaId = secureStorage.getItem('empresa_id');
            const response = await API.obterBolsasHorasPorAno(token, empresaId, anoSelecionado);

            if (response.success) {
                const mapa = {};
                response.data.forEach(bolsa => {
                    mapa[bolsa.user_id] = {
                        horas_iniciais: parseFloat(bolsa.horas_iniciais) || 0,
                        horas_calculadas: parseFloat(bolsa.horas_calculadas) || 0,
                        ultima_atualizacao: bolsa.ultima_atualizacao,
                        existe_registo: bolsa.existe_registo
                    };
                });
                setBolsasGuardadas(mapa);
            }
        } catch (error) {
            console.error('Erro ao carregar bolsas guardadas:', error);
        } finally {
            setLoading(false);
        }
    };

    // Expor bolsasGuardadas e função de recarregar via window para RegistosPorUtilizador
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.BolsaHorasData = {
                bolsasGuardadas,
                recarregar: carregarBolsasGuardadas,
                anoSelecionado
            };
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete window.BolsaHorasData;
            }
        };
    }, [bolsasGuardadas, anoSelecionado]);

    const styles = {
        container: {
            marginBottom: '20px'
        },
        controles: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            marginBottom: '20px',
            gap: '20px',
            flexWrap: 'wrap'
        },
        controloAno: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        selectAno: {
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '14px',
            cursor: 'pointer'
        },
        btnRecalcular: {
            padding: '12px 24px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background-color 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        btnRecalcularDisabled: {
            backgroundColor: '#ccc',
            cursor: 'not-allowed'
        },
        infoModo: {
            fontSize: '13px',
            fontWeight: '500',
            padding: '8px 16px',
            borderRadius: '4px',
            backgroundColor: 'white'
        }
    };

    return (
        <div style={styles.container}>
            {/* Controles de Topo */}
            <div style={styles.controles}>
                <div style={styles.controloAno}>
                    <label style={{ fontWeight: '600' }}>Ano:</label>
                    <select
                        value={anoSelecionado}
                        onChange={(e) => onAnoChange(parseInt(e.target.value))}
                        style={styles.selectAno}
                    >
                        {[2023, 2024, 2025, 2026, 2027].map(ano => (
                            <option key={ano} value={ano}>{ano}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={onRecalcular}
                    disabled={loadingRecalculo}
                    style={{
                        ...styles.btnRecalcular,
                        ...(loadingRecalculo ? styles.btnRecalcularDisabled : {})
                    }}
                >
                    <span style={{ fontSize: '18px' }}>🔄</span>
                    {loadingRecalculo ? 'A Recalcular...' : 'Recalcular Bolsa de Horas'}
                </button>

                <div style={styles.infoModo}>
                    {loadingRecalculo ? (
                        <span style={{color: '#ff9800'}}>⏳ A processar...</span>
                    ) : (
                        <span style={{color: '#4caf50'}}>✅ Valores guardados na BD</span>
                    )}
                </div>
            </div>

        </div>
    );
};

export default BolsaHorasAnualManager;
