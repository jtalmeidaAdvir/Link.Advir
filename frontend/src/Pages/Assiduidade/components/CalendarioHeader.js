import React from 'react';

/**
 * Cabeçalho do calendário com navegação de mês
 * Memoizado para evitar re-renders desnecessários
 */
const CalendarioHeader = React.memo(({ mesAtual, onMesAnterior, onProximoMes, loading = false }) => {
    return (
        <>
            <div className="card card-moderno mb-3 mb-md-4">
                <div className="card-body text-center py-3 py-md-4">
                    <h1 className="h4 h3-md mb-2 text-primary">
                        <span className="d-none d-sm-inline">Agenda</span>
                        <span className="d-sm-none">Horas Trabalhadas</span>
                    </h1>
                    <p className="text-muted mb-0 small">Gerencie e visualize suas horas de trabalho</p>
                </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3 mb-md-4">
                <button
                    className="btn btn-outline-primary btn-responsive rounded-pill"
                    onClick={onMesAnterior}
                    disabled={loading}
                >
                    <span className="d-none d-sm-inline">&#8592; Anterior</span>
                    <span className="d-sm-none">&#8592;</span>
                </button>
                <h4 className="mb-0 fw-bold text-center px-2" style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>
                    <span className="d-none d-md-inline">
                        {mesAtual.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="d-md-none">
                        {mesAtual.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}
                    </span>
                </h4>
                <button
                    className="btn btn-outline-primary btn-responsive rounded-pill"
                    onClick={onProximoMes}
                    disabled={loading}
                >
                    <span className="d-none d-sm-inline">Próximo &#8594;</span>
                    <span className="d-sm-none">&#8594;</span>
                </button>
            </div>
        </>
    );
}, (prevProps, nextProps) => {
    // Comparação customizada - só re-renderiza se mesAtual ou loading mudarem
    return (
        prevProps.mesAtual.getTime() === nextProps.mesAtual.getTime() &&
        prevProps.loading === nextProps.loading
    );
});

CalendarioHeader.displayName = 'CalendarioHeader';

export default CalendarioHeader;
