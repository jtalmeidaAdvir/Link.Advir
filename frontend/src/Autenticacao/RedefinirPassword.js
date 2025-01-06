import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TouchableOpacity, Text } from 'react-native';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
const RedefinirPassword = ({ route }) => {
    const { token } = route.params; // Obtém o token da URL
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigation = useNavigation();
    const { t } = useTranslation();
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError(t("RedefenirPassword.Error.1"));
            return;
        }

        try {
            const response = await fetch(`https://backend.advir.pt/api/users/redefinir-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword }),
            });

            if (response.ok) {
                navigation.navigate('Login');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erro ao redefinir a senha.');
            }
        } catch (error) {
            console.error('Erro de rede:', error);
            setError('Erro de rede. Tente novamente.');
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100vw',
                backgroundColor: '#d4e4ff',
                margin: '0',
                padding: '0',
            }}
        >
            <div
                style={{
                    maxWidth: '400px',
                    width: '100%',
                    padding: '20px',
                    borderRadius: '15px',
                }}
            >
                <h1
                    style={{
                        textAlign: 'center',
                        color: '#0022FF',
                        fontWeight: '600',
                        fontSize: '2rem',
                        marginBottom: '50px',
                    }}
                >
                    {t("RedefenirPassword.Title")}
                </h1>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="password"
                            placeholder={t("RedefenirPassword.TxtNovaPass")}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="password"
                            placeholder={t("RedefenirPassword.TxtConfirmar")}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>
                    {error && (
                        <div style={{ color: 'red', marginBottom: '20px', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        style={{
                            borderRadius: '10px',
                            padding: '12px',
                            fontSize: '1.1rem',
                            backgroundColor: '#0022FF',
                            color: 'white',
                            width: '100%',
                            border: 'none',
                        }}
                    >
                        {t("RedefenirPassword.BtRedefenir")}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RedefinirPassword;
