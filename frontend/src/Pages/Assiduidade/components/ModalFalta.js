import React from 'react';
import { FaPlus } from 'react-icons/fa';

/**
 * Modal/Formulário para registar uma falta
 * Memoizado para evitar re-renders desnecessários
 */
const ModalFalta = React.memo(({
    show,
    novaFalta,
    setNovaFalta,
    tiposFalta,
    anexosFalta,
    uploadingAnexo,
    modoEdicao,
    loading,
    onSubmit,
    onAnexoChange,
    onRemoverAnexo,
    onCancelarEdicao
}) => {
    if (!show) return null;

    return (
        <div className="border border-danger rounded p-3 mt-4" style={{ backgroundColor: '#fff5f5' }}>
            <h6 className="text-danger fw-bold mb-3">
                <FaPlus className="me-2" />
                <span className="d-none d-sm-inline">Registar Falta</span>
                <span className="d-sm-none">Falta</span>
            </h6>

            <form onSubmit={onSubmit}>
                {/* Tipo de Falta */}
                <div className="mb-3">
                    <label className="form-label small fw-semibold">Tipo de Falta</label>
                    <select
                        className="form-select form-moderno"
                        value={novaFalta.Falta}
                        onChange={(e) => {
                            const codigo = e.target.value;
                            const faltaSelecionada = tiposFalta.find(f => f.Falta === codigo);
                            if (faltaSelecionada) {
                                setNovaFalta({
                                    Falta: codigo,
                                    Horas: Number(faltaSelecionada.Horas) === 1,
                                    Tempo: 1,
                                    Observacoes: '',
                                    DescontaAlimentacao: Number(faltaSelecionada.DescontaSubsAlim) === 1,
                                    DescontaSubsidioTurno: Number(faltaSelecionada.DescontaSubsTurno) === 1
                                });
                            } else {
                                setNovaFalta({
                                    Falta: '',
                                    Horas: false,
                                    Tempo: 1,
                                    Observacoes: '',
                                    DescontaAlimentacao: false,
                                    DescontaSubsidioTurno: false
                                });
                            }
                        }}
                        required
                    >
                        <option value="">Selecione o tipo...</option>
                        {tiposFalta.map((t, i) => (
                            <option key={i} value={t.Falta}>
                                {t.Falta} – {t.Descricao}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Duração e Tipo */}
                <div className="row g-2 mb-3">
                    <div className="col-6">
                        <label className="form-label small fw-semibold">Duração</label>
                        <input
                            type="number"
                            className="form-control form-moderno"
                            min="1"
                            value={novaFalta.Tempo}
                            onChange={(e) => setNovaFalta({ ...novaFalta, Tempo: parseInt(e.target.value) })}
                            required
                        />
                    </div>
                    <div className="col-6">
                        <label className="form-label small fw-semibold">Tipo</label>
                        <input
                            type="text"
                            className="form-control form-moderno bg-light"
                            readOnly
                            value={novaFalta.Horas ? 'Por horas' : 'Dia completo'}
                        />
                    </div>
                </div>

                {/* Observações */}
                <div className="mb-3">
                    <label className="form-label small fw-semibold">Observações</label>
                    <textarea
                        className="form-control form-moderno"
                        rows="2"
                        value={novaFalta.Observacoes}
                        onChange={(e) => setNovaFalta({ ...novaFalta, Observacoes: e.target.value })}
                    />
                </div>

                {/* Anexos */}
                <div className="mb-3">
                    <label className="form-label small fw-semibold">Anexos (opcional)</label>
                    <input
                        type="file"
                        className="form-control form-moderno"
                        onChange={onAnexoChange}
                        disabled={uploadingAnexo}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    {uploadingAnexo && (
                        <div className="text-primary small mt-1">
                            <span className="spinner-border spinner-border-sm me-1"></span>
                            A enviar...
                        </div>
                    )}
                    {anexosFalta.length > 0 && (
                        <div className="mt-2">
                            <small className="text-muted">Anexos adicionados:</small>
                            {anexosFalta.map((anexo, idx) => (
                                <div key={idx} className="d-flex align-items-center justify-content-between border rounded p-2 mt-1">
                                    <span className="small text-truncate">{anexo.nome_arquivo}</span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => onRemoverAnexo(idx)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Resumo das configurações */}
                {novaFalta.Falta && (
                    <div className="alert alert-light border small">
                        <div><strong>Tipo:</strong> {novaFalta.Horas ? 'Por horas' : 'Dia completo'}</div>
                        <div><strong>Desconta Subsídio Alimentação:</strong> {novaFalta.DescontaAlimentacao ? 'Sim' : 'Não'}</div>
                        <div><strong>Desconta Subsídio Turno:</strong> {novaFalta.DescontaSubsidioTurno ? 'Sim' : 'Não'}</div>
                    </div>
                )}

                {/* Botão Submit */}
                <button
                    type="submit"
                    className={`btn ${modoEdicao ? "btn-warning" : "btn-danger"} w-100 rounded-pill btn-responsive`}
                    disabled={loading}
                >
                    {loading
                        ? modoEdicao ? "A editar..." : "A registar..."
                        : modoEdicao ? "Guardar Alterações" : "Registar Falta"}
                </button>

                {/* Botão Cancelar Edição */}
                {modoEdicao && (
                    <button
                        type="button"
                        className="btn btn-outline-secondary w-100 rounded-pill btn-responsive mt-2"
                        onClick={onCancelarEdicao}
                    >
                        Cancelar Edição
                    </button>
                )}
            </form>
        </div>
    );
});

ModalFalta.displayName = 'ModalFalta';

export default ModalFalta;
