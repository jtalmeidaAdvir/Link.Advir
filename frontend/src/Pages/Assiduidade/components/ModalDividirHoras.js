import React from 'react';
import { FaPlus } from 'react-icons/fa';

/**
 * Modal para dividir horas trabalhadas entre diferentes obras
 * Permite redistribuir o tempo registado numa obra para múltiplas obras
 * Memoizado para evitar re-renders desnecessários
 */
const ModalDividirHoras = React.memo(({
    show,
    onClose,
    obraSelecionada,
    horasParaDividir,
    minutosParaDividir,
    divisoes,
    obrasDestino,
    onAtualizarDivisao,
    onRemoverDivisao,
    onAdicionarDivisao,
    onReconstruir
}) => {
    if (!show) return null;

    const totalDividido = divisoes.reduce((acc, div) => acc + (div.horas * 60 + div.minutos), 0);
    const totalOrigem = horasParaDividir * 60 + minutosParaDividir;
    const restante = totalOrigem - totalDividido;
    const restanteHoras = Math.floor(Math.abs(restante) / 60);
    const restanteMinutos = Math.abs(restante) % 60;

    return (
        <div
            className="modal fade show"
            style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
            role="dialog"
            aria-modal="true"
        >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '95%', margin: '1rem auto' }}>
                <div className="modal-content" style={{ borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                    {/* Header */}
                    <div className="modal-header bg-primary text-white" style={{ borderRadius: '12px 12px 0 0', padding: '1rem' }}>
                        <h6 className="modal-title mb-0" style={{ fontSize: 'clamp(0.95rem, 3vw, 1.1rem)', fontWeight: '600' }}>
                            Dividir Horas
                        </h6>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    {/* Body */}
                    <div className="modal-body" style={{ padding: 'clamp(0.75rem, 3vw, 1.5rem)' }}>
                        {/* Informação da obra original */}
                        <div className="mb-3 p-2 bg-light rounded" style={{ fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)' }}>
                            <div className="fw-bold text-muted mb-1" style={{ fontSize: '0.75rem' }}>Obra Original:</div>
                            <div className="text-truncate mb-2" style={{ fontSize: '0.85rem' }}>
                                {obraSelecionada?.nome}
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Total a dividir:</span>
                                <span className="badge bg-primary" style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                                    {horasParaDividir}h {minutosParaDividir}min
                                </span>
                            </div>
                        </div>

                        {/* Alerta de progresso da divisão */}
                        {divisoes.length > 0 && (
                            <div
                                className={`alert ${restante === 0 ? 'alert-success' : restante > 0 ? 'alert-warning' : 'alert-danger'} mb-3`}
                                style={{ padding: '0.6rem', fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)', borderRadius: '8px' }}
                            >
                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                    <span>
                                        <strong>Dividido:</strong> {Math.floor(totalDividido / 60)}h {totalDividido % 60}min
                                    </span>
                                    {restante !== 0 ? (
                                        <span className="badge bg-dark">
                                            {restante > 0 ? 'Falta' : 'Excede'}: {restanteHoras}h {restanteMinutos}min
                                        </span>
                                    ) : (
                                        <span className="badge bg-success">✓ Completo</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Lista de divisões */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold mb-2" style={{ fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)' }}>
                                Divisões por obra:
                            </label>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {divisoes.map((div, index) => (
                                    <div key={index} className="card mb-2" style={{ borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                                        <div className="card-body p-2">
                                            <div className="mb-2">
                                                <label className="form-label mb-1" style={{ fontSize: '0.75rem', color: '#666' }}>
                                                    Obra de destino
                                                </label>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={div.obra_id}
                                                    onChange={(e) => onAtualizarDivisao(index, 'obra_id', e.target.value)}
                                                    style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', borderRadius: '6px' }}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {obrasDestino.map(obra => (
                                                        <option key={obra.id} value={obra.id}>
                                                            {obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="d-flex gap-2 align-items-end">
                                                <div className="flex-fill">
                                                    <label className="form-label mb-1" style={{ fontSize: '0.7rem', color: '#666' }}>
                                                        Horas
                                                    </label>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        className="form-control form-control-sm text-center"
                                                        placeholder="0"
                                                        value={div.horas || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, '');
                                                            onAtualizarDivisao(index, 'horas', val === '' ? 0 : parseInt(val));
                                                        }}
                                                        style={{ fontSize: '1rem', fontWeight: '500', borderRadius: '6px', padding: '0.5rem' }}
                                                    />
                                                </div>
                                                <div className="flex-fill">
                                                    <label className="form-label mb-1" style={{ fontSize: '0.7rem', color: '#666' }}>
                                                        Minutos
                                                    </label>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        className="form-control form-control-sm text-center"
                                                        placeholder="0"
                                                        value={div.minutos || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, '');
                                                            const num = val === '' ? 0 : parseInt(val);
                                                            onAtualizarDivisao(index, 'minutos', Math.min(59, num));
                                                        }}
                                                        style={{ fontSize: '1rem', fontWeight: '500', borderRadius: '6px', padding: '0.5rem' }}
                                                    />
                                                </div>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => onRemoverDivisao(index)}
                                                    style={{ padding: '0.5rem 0.75rem', borderRadius: '6px' }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Botão adicionar divisão */}
                        <button
                            className="btn btn-outline-primary w-100 btn-sm"
                            onClick={onAdicionarDivisao}
                            style={{ borderRadius: '8px', padding: '0.6rem', fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)' }}
                        >
                            <FaPlus size={14} className="me-2" /> Adicionar Divisão
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer" style={{ padding: '0.75rem 1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="btn btn-secondary flex-fill"
                            onClick={onClose}
                            style={{ borderRadius: '8px', fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)', minWidth: '100px' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary flex-fill"
                            onClick={onReconstruir}
                            style={{ borderRadius: '8px', fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)', minWidth: '100px' }}
                        >
                            Reconstruir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

ModalDividirHoras.displayName = 'ModalDividirHoras';

export default ModalDividirHoras;
