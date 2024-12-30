// Modal.js
import React from 'react';

const Modal = ({ children, onClose }) => {
    return (
        <div style={modalOverlayStyle}>
            <div style={modalStyle}>
                {children}
            </div>
        </div>
    );
};

// Estilos para o modal
const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
};

const modalStyle = {
    backgroundColor: '#d4e4ff',
    padding: '20px',
    borderRadius: '5px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
    position: 'relative',
    width: '90%',               // Largura responsiva
    maxWidth: '500px',         // Largura m�xima
    maxHeight: '80%',          // Altura m�xima para o modal
    overflowY: 'auto',         // Habilita rolagem se o conte�do exceder a altura
};

export default Modal;
