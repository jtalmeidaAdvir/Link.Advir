
import React, { useState, useEffect } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { 
    isBiometricAvailable, 
    registerBiometric, 
    hasBiometricRegistered 
} from '../utils/biometricAuth';

const BiometricSetup = ({ userId, userEmail, t, onRegistered }) => {
    const [isSupported, setIsSupported] = useState(false);
    const [hasRegistered, setHasRegistered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        checkBiometricSupport();
        checkRegisteredBiometric();
    }, []);

    const checkBiometricSupport = async () => {
        const supported = await isBiometricAvailable();
        setIsSupported(supported);
    };

    const checkRegisteredBiometric = async () => {
        if (userEmail) {
            try {
                const registered = await hasBiometricRegistered(userEmail);
                setHasRegistered(registered);
            } catch (error) {
                console.error('Erro ao verificar biometria:', error);
            }
        }
    };

    const handleRegisterBiometric = async () => {
        setIsLoading(true);
        try {
            await registerBiometric(userId, userEmail);
            setHasRegistered(true);
            
            if (onRegistered) {
                onRegistered();
            }
            
            alert(t?.('Biometric.SetupSuccess') || 'Biometria configurada com sucesso!');
        } catch (error) {
            console.error('Erro ao registar biometria:', error);
            alert(error.message || t?.('Biometric.SetupError') || 'Erro ao configurar biometria');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isSupported) {
        return (
            <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '10px',
                textAlign: 'center'
            }}>
                <FontAwesome name="exclamation-triangle" size={16} color="#856404" />
                <span style={{ marginLeft: '8px', color: '#856404', fontSize: '14px' }}>
                    {t?.('Biometric.NotSupported') || 'Biometria não suportada neste dispositivo'}
                </span>
            </div>
        );
    }

    if (hasRegistered) {
        return (
            <div style={{
                backgroundColor: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '10px',
                textAlign: 'center'
            }}>
                <FontAwesome name="check-circle" size={16} color="#155724" />
                <span style={{ marginLeft: '8px', color: '#155724', fontSize: '14px' }}>
                    {t?.('Biometric.AlreadySetup') || 'Biometria já configurada'}
                </span>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '15px',
            marginTop: '10px',
            textAlign: 'center'
        }}>
            <h4 style={{ color: '#495057', marginBottom: '10px', fontSize: '16px' }}>
                {t?.('Biometric.SetupTitle') || 'Configurar Login Biométrico'}
            </h4>
            <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '15px' }}>
                {t?.('Biometric.SetupDescription') || 'Configure a biometria para um login mais rápido e seguro'}
            </p>
            <button
                type="button"
                onClick={handleRegisterBiometric}
                disabled={isLoading}
                style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: isLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    margin: '0 auto',
                    opacity: isLoading ? 0.7 : 1
                }}
            >
                {isLoading ? (
                    <>
                        <div style={{
                            width: '14px',
                            height: '14px',
                            border: '2px solid #ffffff',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                        {t?.('Biometric.Setting') || 'A configurar...'}
                    </>
                ) : (
                    <>
                        <FontAwesome name="fingerprint" size={16} color="white" />
                        {t?.('Biometric.SetupButton') || 'Configurar Biometria'}
                    </>
                )}
            </button>
        </div>
    );
};

export default BiometricSetup;
