import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TouchableOpacity, Text } from 'react-native';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';

const RecuperarPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigation = useNavigation();
    const { t } = useTranslation();
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('https://backend.advir.pt/api/users/recuperar-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setMessage(t("RecuperarPassword.Avisos.Sucesso"));
                setError('');
            } else {
                const errorData = await response.json();
                setError(errorData.error || t("RecuperarPassword.Error.1"));
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
                        color: '#1792FE',
                        fontWeight: '600',
                        fontSize: '2rem',
                        marginBottom: '50px',
                    }}
                >
                    {t("RecuperarPassword.Title")}
                </h1>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="email"
                            placeholder={t("RecuperarPassword.TxtEmail")}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                    {message && (
                        <div style={{ color: 'green', marginBottom: '20px', textAlign: 'center' }}>
                            {message}
                        </div>
                    )}
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
                            backgroundColor: '#1792FE',
                            color: 'white',
                            width: '100%',
                            border: 'none',
                        }}
                    >
                        {t("RecuperarPassword.BtRecuperar")}
                    </button>
                </form>

                <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={{ color: '#1792FE', fontSize: 14 }}>{t("RecuperarPassword.LinkLogin")}</Text>
                    </TouchableOpacity>
                </View>
            </div>
        </div>
    );
};

export default RecuperarPassword;
