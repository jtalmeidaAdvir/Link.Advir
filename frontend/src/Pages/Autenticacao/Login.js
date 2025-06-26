import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TouchableOpacity, Text, Image } from 'react-native';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
import logo from '../../../assets/img_logo.png';
import backgroundImage from '../../../images/ImagemFundo.png';
import { checkTokenExpired } from '../utils/authUtils';
const Login = ({ setIsAdmin, setUsername, setIsLoggedIn, onLoginComplete }) => {  // Adicione setIsLoggedIn como prop
    const [username, setLocalUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const navigation = useNavigation();
    const { t } = useTranslation();

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('https://backend.advir.pt/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Login bem-sucedido:', data);

                // Verificar se houve erro de token expirado mesmo com resposta OK
                if (checkTokenExpired(data)) {
                    return;
                }

                // Guardar o token no localStorage
                localStorage.setItem('loginToken', data.token);
                localStorage.setItem('isAdmin', data.isAdmin ? 'true' : 'false');
                localStorage.setItem('superAdmin', data.superAdmin ? 'true' : 'false'); // Adiciona superAdmin ao localStorage
                localStorage.setItem('username', username);
                localStorage.setItem('email', email);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('userNome', data.userNome);
                localStorage.setItem('userEmail', data.userEmail);
                //localStorage.setItem('nomeuser', data.nome);
                localStorage.setItem('empresa_areacliente', data.empresa_areacliente);
                localStorage.setItem('id_tecnico', data.id_tecnico);
                localStorage.setItem('empresaPredifinida', data.empresaPredifinida);

                // Atualiza o estado de login e permissões
                setUsername(username);
                setEmail(email);
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

                // Verificar se é erro de token expirado
                if (checkTokenExpired(errorData)) {
                    return;
                }

                setErrorMessage(errorData.error || t("Login.Error.1"));
            }
        } catch (error) {
            console.error('Erro de rede:', error);
            setErrorMessage('Erro de rede, tente novamente mais tarde.');
        }
    };

    // Hiperligação para a página de recuperação de senha
    const RecuperarPasswordLink = () => {
        return (
            <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 10 }}>
                <TouchableOpacity onPress={() => navigation.navigate('RecuperarPassword')}>
                    <Text style={{ color: '#1792FE', fontSize: 14 }}>
                        {t("Login.LinkRecoverPass")}
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
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover', // Ajusta para cobrir todo o ecrã
                backgroundPosition: 'center', // Centraliza a imagem
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
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
                {/* Logo acima do título */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <img src={logo} alt="Logo" style={{ width: '550px', height: 'auto' }} />
                </div>


                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder={t("Email")}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                            placeholder={t("Login.TxtPass")}
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

                    <RecuperarPasswordLink />

                    <button
                        type="submit"
                        style={{
                            marginTop: '15px',
                            borderRadius: '10px',
                            padding: '20px',
                            fontSize: '1.1rem',
                            backgroundColor: '#1792FE',
                            color: 'white',
                            width: '100%',
                            border: 'none',
                            alignContent: 'center',
                        }}
                    >
                        {t("Login.BtLogin")}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;