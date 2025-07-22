
import React from 'react';
import NotificacoesBell from './NotificacoesBell';

const HeaderWithNotifications = ({ userId, title, onBack }) => {
    return (
        <div style={headerStyle}>
            <div style={leftSectionStyle}>
                {onBack && (
                    <button onClick={onBack} style={backButtonStyle}>
                        ← Voltar
                    </button>
                )}
                <h1 style={titleStyle}>{title}</h1>
            </div>
            
            <div style={rightSectionStyle}>
                <NotificacoesBell userId={userId} />
            </div>
        </div>
    );
};

const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#1792FE',
    color: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const leftSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
};

const rightSectionStyle = {
    display: 'flex',
    alignItems: 'center',
};

const backButtonStyle = {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
};

const titleStyle = {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
};

export default HeaderWithNotifications;
