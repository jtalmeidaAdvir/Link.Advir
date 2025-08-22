import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TouchableOpacity, Text } from 'react-native';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
const RedefinirPassword = ({ route }) => {
    // Para React Web, o token vem da URL, não de route.params
    const urlParams = new URLSearchParams(window.location.search);
    const pathParts = window.location.pathname.split('/');
    const tokenFromUrl = pathParts[pathParts.length - 1]; // Pega a última parte da URL
    const token = route?.params?.token || tokenFromUrl;

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();
    const { t } = useTranslation();

    // Debug para verificar se o token está a ser obtido
    console.log('Token obtido:', token);

    // Verificar se o token existe
    if (!token) {
        setError('Token de recuperação inválido ou não encontrado.');
    }
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (!token) {
            setError('Token de recuperação inválido.');
            setLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError('A password deve ter pelo menos 6 caracteres.');
            setLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t("RedefenirPassword.Error.1"));
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`https://backend.advir.pt/api/users/redefinir-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Password redefinida com sucesso! Redirecionando...');
                setTimeout(() => {
                    navigation.navigate('Login');
                }, 2000);
            } else {
                setError(data.error || 'Erro ao redefinir a password.');
            }
        } catch (error) {
            console.error('Erro de rede:', error);
            setError('Erro de rede. Tente novamente.');
        } finally {
            setLoading(false);
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
                        color: '#1792FE',
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
                        <div style={{
                            color: '#dc3545',
                            backgroundColor: '#f8d7da',
                            border: '1px solid #f5c6cb',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '20px',
                            textAlign: 'center',
                            fontSize: '14px'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}
                    {success && (
                        <div style={{
                            color: '#155724',
                            backgroundColor: '#d4edda',
                            border: '1px solid #c3e6cb',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '20px',
                            textAlign: 'center',
                            fontSize: '14px'
                        }}>
                            ✅ {success}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading || !token}
                        style={{
                            borderRadius: '10px',
                            padding: '12px',
                            fontSize: '1.1rem',
                            backgroundColor: loading || !token ? '#ccc' : '#1792FE',
                            color: 'white',
                            width: '100%',
                            border: 'none',
                            cursor: loading || !token ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.3s',
                        }}
                    >
                        {loading ? '⏳ A redefinir...' : t("RedefenirPassword.BtRedefenir")}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RedefinirPassword;
