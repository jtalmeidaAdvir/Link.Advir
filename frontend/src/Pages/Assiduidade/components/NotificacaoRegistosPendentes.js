
import React, { useState } from 'react';
import { FaClock, FaBell } from 'react-icons/fa';
import { useRegistosPendentes } from '../hooks/useRegistosPendentes';

const NotificacaoRegistosPendentes = ({ tipoUser, onNavigate }) => {
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const registosPendentes = useRegistosPendentes(tipoUser);

  if (tipoUser !== 'Administrador' && tipoUser !== 'Encarregado' && tipoUser !== 'Diretor') return null;

  const handleClick = () => {
    setMostrarDropdown(!mostrarDropdown);
  };

  const handleNavigateToApproval = () => {
    setMostrarDropdown(false);
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div style={containerStyle}>
      <div style={bellContainerStyle} onClick={handleClick}>
        <FaBell style={bellIconStyle} />
        {registosPendentes > 0 && (
          <div style={badgeStyle}>
            {registosPendentes > 99 ? '99+' : registosPendentes}
          </div>
        )}
      </div>

      {mostrarDropdown && (
        <div style={dropdownStyle}>
          <div style={headerStyle}>
            <h4 style={titleStyle}>
              <FaClock className="me-2" />
              Registos Pendentes
            </h4>
            <button
              style={closeButtonStyle}
              onClick={() => setMostrarDropdown(false)}
            >
              ×
            </button>
          </div>

          <div style={contentStyle}>
            {registosPendentes === 0 ? (
              <div style={emptyStyle}>
                <FaClock size={32} color="#ccc" />
                <p>Não há registos pendentes</p>
              </div>
            ) : (
              <div style={notificationItemStyle}>
                <div style={notifHeaderStyle}>
                  <span style={notifTitleStyle}>
                    {registosPendentes} registo{registosPendentes !== 1 ? 's' : ''} pendente{registosPendentes !== 1 ? 's' : ''} de aprovação
                  </span>
                </div>
                <div style={notifMessageStyle}>
                  Existem registos de ponto que necessitam da sua aprovação.
                </div>
                <button
                  style={actionButtonStyle}
                  onClick={handleNavigateToApproval}
                >
                  Ver Registos Pendentes
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Estilos
const containerStyle = {
  position: 'relative',
  display: 'inline-block',
};

const bellContainerStyle = {
  position: 'relative',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '50%',
  backgroundColor: 'transparent',
  transition: 'background-color 0.2s',
};

const bellIconStyle = {
  fontSize: '24px',
  color: '#1792FE',
};

const badgeStyle = {
  position: 'absolute',
  top: '0',
  right: '0',
  backgroundColor: '#ff4444',
  color: 'white',
  borderRadius: '50%',
  padding: '2px 6px',
  fontSize: '12px',
  fontWeight: 'bold',
  minWidth: '18px',
  textAlign: 'center',
};

const dropdownStyle = {
  position: 'absolute',
  top: '100%',
  right: '0',
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  zIndex: 1000,
  width: '350px',
  maxHeight: '400px',
  overflow: 'hidden',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px',
  borderBottom: '1px solid #e9ecef',
  backgroundColor: '#f8f9fa',
};

const titleStyle = {
  margin: 0,
  fontSize: '16px',
  color: '#333',
  display: 'flex',
  alignItems: 'center',
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  fontSize: '20px',
  cursor: 'pointer',
  color: '#666',
};

const contentStyle = {
  padding: '16px',
};

const emptyStyle = {
  textAlign: 'center',
  color: '#666',
  padding: '20px',
};

const notificationItemStyle = {
  padding: '12px',
  backgroundColor: '#e8f4fd',
  borderRadius: '8px',
  border: '1px solid #1792FE',
};

const notifHeaderStyle = {
  marginBottom: '8px',
};

const notifTitleStyle = {
  fontWeight: '600',
  color: '#333',
  fontSize: '14px',
};

const notifMessageStyle = {
  fontSize: '13px',
  color: '#666',
  marginBottom: '12px',
  lineHeight: '1.4',
};

const actionButtonStyle = {
  backgroundColor: '#1792FE',
  color: 'white',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '600',
  width: '100%',
  transition: 'background-color 0.2s',
};

export default NotificacaoRegistosPendentes;
