import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const closeDropdown = (event) => {
      if (mostrarDropdown && !event.target.closest('.notificacao-combinada')) {
        setMostrarDropdown(false);
      }
    };

    document.addEventListener('mousedown', closeDropdown);

    return () => {
      document.removeEventListener('mousedown', closeDropdown);
    };
  }, [mostrarDropdown]);

  return (
    <div style={containerStyle} className="notificacao-combinada">
      <div style={bellContainerStyle} onClick={handleClick}>
        <FaBell style={bellIconStyle} />
        {totalPendentes > 0 && (
          <div style={badgeStyle}>
            {totalPendentes > 99 ? '99+' : totalPendentes}
          </div>
        )}
      </div>

      {mostrarDropdown && (
        <>
          {/* Overlay para mobile */}
          {window.innerWidth <= 768 && (
            <div style={overlayStyle} onClick={() => setMostrarDropdown(false)} />
          )}
          
          <div style={getDropdownStyle()}>
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
        </>
      )}
    </div>
  );
};

// Estilos
const containerStyle = {
  position: 'relative',
  display: 'inline-block',
};

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  zIndex: 9998,
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

const getDropdownStyle = () => {
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    return {
      position: 'fixed',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      zIndex: 9999,
      overflow: 'hidden',
      ...(window.innerWidth <= 480 ? {
        // Mobile muito pequeno - ocupar quase toda a tela
        top: '60px',
        left: '10px',
        right: '10px',
        width: 'auto',
        maxHeight: `${window.innerHeight - 100}px`,
      } : {
        // Tablets e mobile médio
        top: '60px',
        right: '15px',
        width: '300px',
        maxHeight: `${window.innerHeight - 100}px`,
      }),
    };
  }
  
  // Desktop - posição absoluta relativa ao container
  return {
    position: 'absolute',
    top: '100%',
    right: '0',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    zIndex: 9999,
    overflow: 'hidden',
    width: '380px',
    maxHeight: '500px',
    marginTop: '5px',
  };
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: window.innerWidth <= 768 ? '12px' : '16px',
  borderBottom: '1px solid #e9ecef',
  backgroundColor: '#f8f9fa',
};

const titleStyle = {
  margin: 0,
  fontSize: window.innerWidth <= 480 ? '13px' : window.innerWidth <= 768 ? '14px' : '16px',
  color: '#333',
  display: 'flex',
  alignItems: 'center',
  flex: 1,
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  fontSize: window.innerWidth <= 480 ? '18px' : '20px',
  cursor: 'pointer',
  color: '#666',
  padding: '4px',
  borderRadius: '4px',
  minWidth: '32px',
  minHeight: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const contentStyle = {
  padding: window.innerWidth <= 480 ? '10px' : window.innerWidth <= 768 ? '12px' : '16px',
  maxHeight: window.innerWidth <= 480 ? `${window.innerHeight - 180}px` : window.innerWidth <= 768 ? `${window.innerHeight - 180}px` : '400px',
  overflowY: 'auto',
  // Melhorar scrollbar no mobile
  WebkitOverflowScrolling: 'touch',
};

const emptyStyle = {
  textAlign: 'center',
  color: '#666',
  padding: '20px',
};

const notificationItemStyle = {
  padding: window.innerWidth <= 768 ? '10px' : '12px',
  backgroundColor: '#e8f4fd',
  borderRadius: '8px',
  border: '1px solid #1792FE',
  marginBottom: window.innerWidth <= 768 ? '10px' : '12px',
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
  fontSize: window.innerWidth <= 768 ? '13px' : '14px',
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
  fontSize: window.innerWidth <= 768 ? '12px' : '13px',
  color: '#666',
  marginBottom: window.innerWidth <= 768 ? '10px' : '12px',
  lineHeight: '1.4',
};

const actionButtonRegistosStyle = {
  backgroundColor: '#1792FE',
  color: 'white',
  border: 'none',
  padding: window.innerWidth <= 768 ? '8px 12px' : '8px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: window.innerWidth <= 768 ? '12px' : '13px',
  fontWeight: '600',
  width: '100%',
  transition: 'background-color 0.2s',
};

const actionButtonFaltasStyle = {
  backgroundColor: '#ffc107',
  color: '#212529',
  border: 'none',
  padding: window.innerWidth <= 768 ? '8px 12px' : '8px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: window.innerWidth <= 768 ? '12px' : '13px',
  fontWeight: '600',
  width: '100%',
  transition: 'background-color 0.2s',
};

export default NotificacaoCombinada;