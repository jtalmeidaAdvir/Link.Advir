
import React, { useState } from 'react';
import { FaCalendarTimes, FaBell } from 'react-icons/fa';
import { useFaltasPendentes } from '../hooks/useFaltasPendentes';

const NotificacaoFaltasPendentes = ({ tipoUser, onNavigate }) => {
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const faltasPendentes = useFaltasPendentes(tipoUser);

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
        {faltasPendentes > 0 && (
          <div style={badgeStyle}>
            {faltasPendentes > 99 ? '99+' : faltasPendentes}
          </div>
        )}
      </div>

      {mostrarDropdown && (
        <div style={dropdownStyle}>
          <div style={headerStyle}>
            <h4 style={titleStyle}>
              <FaCalendarTimes className="me-2" />
              Faltas/Férias Pendentes
            </h4>
            <button
              style={closeButtonStyle}
              onClick={() => setMostrarDropdown(false)}
            >
              ×
            </button>
          </div>

          <div style={contentStyle}>
            {faltasPendentes === 0 ? (
              <div style={emptyStyle}>
                <FaCalendarTimes size={32} color="#ccc" />
                <p>Não há faltas/férias pendentes</p>
              </div>
            ) : (
              <div style={notificationItemStyle}>
                <div style={notifHeaderStyle}>
                  <span style={notifTitleStyle}>
                    {faltasPendentes} pedido{faltasPendentes !== 1 ? 's' : ''} pendente{faltasPendentes !== 1 ? 's' : ''} de aprovação
                  </span>
                </div>
                <div style={notifMessageStyle}>
                  Existem pedidos de faltas/férias que necessitam da sua aprovação.
                </div>
                <button
                  style={actionButtonStyle}
                  onClick={handleNavigateToApproval}
                >
                  Ver Faltas/Férias Pendentes
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const containerStyle = {
  position: 'relative',
  display: 'inline-block',
};

const bellContainerStyle = {
  position: 'relative',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '50%',
  backgroundColor: '#f8f9fa',
  border: '2px solid #dee2e6',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const bellIconStyle = {
  fontSize: '20px',
  color: '#6c757d',
};

const badgeStyle = {
  position: 'absolute',
  top: '-5px',
  right: '-5px',
  backgroundColor: '#dc3545',
  color: 'white',
  borderRadius: '50%',
  padding: '2px 6px',
  fontSize: '12px',
  fontWeight: 'bold',
  minWidth: '18px',
  height: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '2px solid white',
};

const dropdownStyle = {
  position: 'absolute',
  top: '100%',
  right: 0,
  backgroundColor: 'white',
  border: '1px solid #dee2e6',
  borderRadius: '8px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
  zIndex: 1000,
  minWidth: '320px',
  maxWidth: '400px',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #e9ecef',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px 8px 0 0',
};

const titleStyle = {
  margin: 0,
  fontSize: '16px',
  fontWeight: '600',
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
  padding: '0',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  transition: 'background-color 0.2s',
};

const contentStyle = {
  padding: '16px',
  maxHeight: '300px',
  overflowY: 'auto',
};

const emptyStyle = {
  textAlign: 'center',
  padding: '20px',
  color: '#666',
};

const notificationItemStyle = {
  padding: '12px',
  backgroundColor: '#fff3cd',
  borderRadius: '8px',
  border: '1px solid #ffeaa7',
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
  backgroundColor: '#ffc107',
  color: '#212529',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '600',
  width: '100%',
  transition: 'background-color 0.2s',
};

export default NotificacaoFaltasPendentes;
