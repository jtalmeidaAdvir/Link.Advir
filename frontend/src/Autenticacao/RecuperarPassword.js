import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TouchableOpacity, Text } from 'react-native';

const RecuperarPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigation = useNavigation();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('http://backend.advir.pt/api/users/recuperar-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setMessage('Email enviado com sucesso! Verifique a sua caixa de entrada.');
                setError('');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erro ao enviar email.');
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
                    Recuperar a Minha Palavra-Passe
                </h1>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="email"
                            placeholder="Insere o teu email"
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
                            backgroundColor: '#0022FF',
                            color: 'white',
                            width: '100%',
                            border: 'none',
                        }}
                    >
                        Recuperar
                    </button>
                </form>

                <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={{ color: '#0022FF', fontSize: 14 }}>Voltar ao Login</Text>
                    </TouchableOpacity>
                </View>
            </div>
        </div>
    );
};

export default RecuperarPassword;
