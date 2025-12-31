import React from 'react';
import { FaPlus } from 'react-icons/fa';

/**
 * Modal/Formulário para registar férias
 * Memoizado para evitar re-renders desnecessários
 */
const ModalFerias = React.memo(({
    show,
    novaFaltaFerias,
    setNovaFaltaFerias,
    modoEdicao,
    loading,
    onSubmit,
    onCancelarEdicao
}) => {
    if (!show) return null;

    return (
        <div className="border border-danger rounded p-3 mt-4" style={{ backgroundColor: '#fff5f5' }}>
            <h6 className="text-danger fw-bold mb-3">
                <FaPlus className="me-2" />
                <span className="d-none d-sm-inline">Registar Férias</span>
                <span className="d-sm-none">Férias</span>
            </h6>

            <form onSubmit={onSubmit}>
                {/* Data Início e Fim */}
                <div className="row g-2 mb-3">
                    <div className="col-6">
                        <label className="form-label small fw-semibold">Data Início</label>
                        <input
                            type="date"
                            className="form-control form-moderno"
                            value={novaFaltaFerias.dataInicio}
                            onChange={(e) => setNovaFaltaFerias({ ...novaFaltaFerias, dataInicio: e.target.value })}
                            required
                        />
                    </div>
                    <div className="col-6">
                        <label className="form-label small fw-semibold">Data Fim</label>
                        <input
                            type="date"
                            className="form-control form-moderno"
                            value={novaFaltaFerias.dataFim}
                            onChange={(e) => setNovaFaltaFerias({ ...novaFaltaFerias, dataFim: e.target.value })}
                            required
                        />
                    </div>
                </div>

                {/* Observações */}
                <div className="mb-3">
                    <label className="form-label small fw-semibold">Observações</label>
                    <textarea
                        className="form-control form-moderno"
                        rows="2"
                        value={novaFaltaFerias.Observacoes}
                        onChange={(e) => setNovaFaltaFerias({ ...novaFaltaFerias, Observacoes: e.target.value })}
                    />
                </div>

                {/* Botão Submit */}
                <button
                    type="submit"
                    className={`btn ${modoEdicao ? "btn-warning" : "btn-danger"} w-100 rounded-pill btn-responsive`}
                    disabled={loading}
                >
                    {loading
                        ? modoEdicao ? "A editar..." : "A registar..."
                        : modoEdicao ? "Guardar Alterações" : "Registar Férias"}
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

ModalFerias.displayName = 'ModalFerias';

export default ModalFerias;
