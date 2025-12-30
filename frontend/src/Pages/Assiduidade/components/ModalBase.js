import React from 'react';

/**
 * Modal Base Reutilizável
 * Componente genérico para todos os modais do sistema
 */
const ModalBase = React.memo(({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'medium', // 'small', 'medium', 'large', 'full'
    styles
}) => {
    if (!isOpen) return null;

    const modalSizes = {
        small: { maxWidth: '400px' },
        medium: { maxWidth: '600px' },
        large: { maxWidth: '800px' },
        full: { maxWidth: '95vw', width: '95vw' }
    };

    const modalStyle = {
        ...styles.modal,
        ...modalSizes[size]
    };

    // Fechar ao clicar fora
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Fechar com ESC
    React.useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }}
            onClick={handleOverlayClick}
        >
            <div style={modalStyle}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    paddingBottom: '15px',
                    borderBottom: '2px solid #e2e8f0'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.3rem',
                        color: '#2d3748',
                        fontWeight: '600'
                    }}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: '#718096',
                            padding: '0 10px',
                            lineHeight: '1'
                        }}
                        title="Fechar (ESC)"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    maxHeight: '70vh',
                    overflowY: 'auto',
                    paddingRight: '10px'
                }}>
                    {children}
                </div>

                {/* Footer (se fornecido) */}
                {footer && (
                    <div style={{
                        marginTop: '20px',
                        paddingTop: '15px',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px'
                    }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
});

ModalBase.displayName = 'ModalBase';

export default ModalBase;
