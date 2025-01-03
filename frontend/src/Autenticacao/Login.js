import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TouchableOpacity, Text } from 'react-native';

const Login = ({ setIsAdmin, setUsername, setIsLoggedIn, onLoginComplete }) => {  // Adicione setIsLoggedIn como prop
    const [username, setLocalUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const navigation = useNavigation();

    const handleLogin = async (e) => {
        e.preventDefault();
    
        try {
            const response = await fetch('https://backend.advir.pt/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
    
            if (response.ok) {
                const data = await response.json();
                console.log('Login bem-sucedido:', data);
    
                // Guardar o token no localStorage
                localStorage.setItem('loginToken', data.token);
                localStorage.setItem('isAdmin', data.isAdmin ? 'true' : 'false');
                localStorage.setItem('superAdmin', data.superAdmin ? 'true' : 'false'); // Adiciona superAdmin ao localStorage
                localStorage.setItem('username', username);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('empresa_areacliente', data.empresa_areacliente);
    
                // Atualiza o estado de login e permissões
                setUsername(username);
                setIsAdmin(data.isAdmin);
                setIsLoggedIn(true); 
                onLoginComplete(); // Chama para atualizar o Drawer
    
                // Redirecionamento após login
                if (data.redirect) {
                    navigation.navigate('VerificaConta');
                } else {
                    setTimeout(() => {
                        navigation.navigate('SelecaoEmpresa');
                    }, 100);
                }
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.error || 'Erro ao fazer login');
            }
        } catch (error) {
            console.error('Erro de rede:', error);
            setErrorMessage('Erro de rede, tente novamente mais tarde.');
        }
    };

    
    
    // Hiperligação para a página de Registo de Empresa
    const RegistarEmpresaLink = () => {
        return (
            <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
                <TouchableOpacity onPress={() => navigation.navigate('RegistoAdmin')}>
                    <Text style={{ color: '#0022FF', fontSize: 14 }}>
                        Registar a minha empresa
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Hiperligação para a página de recuperação de senha
    const RecuperarPasswordLink = () => {
        return (
            <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 10 }}>
                <TouchableOpacity onPress={() => navigation.navigate('RecuperarPassword')}>
                    <Text style={{ color: '#0022FF', fontSize: 14 }}>
                    Esqueceu-se da sua palavra-passe?
                    </Text>
                </TouchableOpacity>
            </View>
        );
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
                    Bem Vindo
                </h1>
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setLocalUsername(e.target.value)}
                            required
                            style={{
                                borderRadius: '30px',
                                padding: '10px 20px',
                                width: '100%',
                                marginBottom: '10px',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                    {errorMessage && (
                        <div style={{ color: 'red', marginBottom: '20px', textAlign: 'center' }}>
                            {errorMessage}
                        </div>
                    )}

                    <RecuperarPasswordLink/>



                    <button
                        type="submit"
                        style={{
                            marginTop:'15px',
                            borderRadius: '10px',
                            padding: '20px',
                            fontSize: '1.1rem',
                            backgroundColor: '#0022FF',
                            color: 'white',
                            width: '100%',
                            border: 'none',
                            alignContent: 'center',
                        }}
                    >
                        Login
                    </button>
                </form>

                {/*<RegistarEmpresaLink />*/}
                
                
                
            </div>
        </div>
    );
};

export default Login;
