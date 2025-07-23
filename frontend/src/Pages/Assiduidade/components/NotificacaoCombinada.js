
import React, { useState } from 'react';
import { FaClock, FaCalendarTimes, FaBell } from 'react-icons/fa';
import { useRegistosPendentes } from '../hooks/useRegistosPendentes';
import { useFaltasPendentes } from '../hooks/useFaltasPendentes';

const NotificacaoCombinada = ({ tipoUser, onNavigateRegistos, onNavigateFaltas }) => {
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const registosPendentes = useRegistosPendentes(tipoUser);
  const faltasPendentes = useFaltasPendentes(tipoUser);
  
  const totalPendentes = registosPendentes + faltasPendentes;

  if (tipoUser !== 'Administrador') return null;

  const handleClick = () => {
    setMostrarDropdown(!mostrarDropdown);
  };

  const handleNavigateToRegistos = () => {
    setMostrarDropdown(false);
    if (onNavigateRegistos) {
      onNavigateRegistos();
    }
  };

  const handleNavigateToFaltas = () => {
    setMostrarDropdown(false);
    if (onNavigateFaltas) {
      onNavigateFaltas();
    }
  };

  return (
    <div style={containerStyle}>
      <div style={bellContainerStyle} onClick={handleClick}>
        <FaBell style={bellIconStyle} />
        {totalPendentes > 0 && (
          <div style={badgeStyle}>
            {totalPendentes > 99 ? '99+' : totalPendentes}
          </div>
        )}
      </div>

      {mostrarDropdown && (
        <div style={dropdownStyle}>
          <div style={headerStyle}>
            <h4 style={titleStyle}>
              <FaBell className="me-2" />
              Notificações Pendentes
            </h4>
            <button
              style={closeButtonStyle}
              onClick={() => setMostrarDropdown(false)}
            >
              ×
            </button>
          </div>

          <div style={contentStyle}>
            {totalPendentes === 0 ? (
              <div style={emptyStyle}>
                <FaBell size={32} color="#ccc" />
                <p>Não há itens pendentes</p>
              </div>
            ) : (
              <div>
                {/* Notificação de Registos Pendentes */}
                {registosPendentes > 0 && (
                  <div style={notificationItemStyle}>
                    <div style={notifHeaderStyle}>
                      <div style={iconTitleStyle}>
                        <FaClock style={iconStyle} />
                        <span style={notifTitleStyle}>
                          {registosPendentes} registo{registosPendentes !== 1 ? 's' : ''} de ponto
                        </span>
                      </div>
                      <div style={countBadgeStyle}>
                        {registosPendentes}
                      </div>
                    </div>
                    <div style={notifMessageStyle}>
                      Registos de ponto que necessitam de aprovação.
                    </div>
                    <button
                      style={actionButtonRegistosStyle}
                      onClick={handleNavigateToRegistos}
                    >
                      Ver Registos Pendentes
                    </button>
                  </div>
                )}

                {/* Notificação de Faltas Pendentes */}
                {faltasPendentes > 0 && (
                  <div style={{...notificationItemStyle, ...faltasItemStyle}}>
                    <div style={notifHeaderStyle}>
                      <div style={iconTitleStyle}>
                        <FaCalendarTimes style={iconStyle} />
                        <span style={notifTitleStyle}>
                          {faltasPendentes} pedido{faltasPendentes !== 1 ? 's' : ''} de faltas/férias
                        </span>
                      </div>
                      <div style={countBadgeFaltasStyle}>
                        {faltasPendentes}
                      </div>
                    </div>
                    <div style={notifMessageStyle}>
                      Pedidos de faltas/férias que necessitam de aprovação.
                    </div>
                    <button
                      style={actionButtonFaltasStyle}
                      onClick={handleNavigateToFaltas}
                    >
                      Ver Faltas/Férias Pendentes
                    </button>
                  </div>
                )}
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
  width: '380px',
  maxHeight: '500px',
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
  maxHeight: '400px',
  overflowY: 'auto',
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
  marginBottom: '12px',
};

const faltasItemStyle = {
  backgroundColor: '#fff3cd',
  borderColor: '#ffeaa7',
};

const notifHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
};

const iconTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  flex: 1,
};

const iconStyle = {
  marginRight: '8px',
  fontSize: '16px',
};

const notifTitleStyle = {
  fontWeight: '600',
  color: '#333',
  fontSize: '14px',
};

const countBadgeStyle = {
  backgroundColor: '#1792FE',
  color: 'white',
  borderRadius: '12px',
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: 'bold',
  minWidth: '20px',
  textAlign: 'center',
};

const countBadgeFaltasStyle = {
  backgroundColor: '#ffc107',
  color: '#212529',
  borderRadius: '12px',
  padding: '4px 8px',
  fontSize: '12px',
  fontWeight: 'bold',
  minWidth: '20px',
  textAlign: 'center',
};

const notifMessageStyle = {
  fontSize: '13px',
  color: '#666',
  marginBottom: '12px',
  lineHeight: '1.4',
};

const actionButtonRegistosStyle = {
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

const actionButtonFaltasStyle = {
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

export default NotificacaoCombinada;
