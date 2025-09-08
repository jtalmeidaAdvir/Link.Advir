// Importações principais de React e bibliotecas auxiliares
import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native'; // Navegação do React Native
import { useTranslation } from 'react-i18next'; // i18n para internacionalização
import { stopTokenValidation } from '../../../utils/authUtils';

// Imagens utilizadas no ecrã de login
import logo from '../../../../assets/img_logo.png';
import backgroundImage from '../../../../images/ImagemFundo.png';

// Componentes e lógica modularizada
import LoginForm from '../components/LoginForm'; // Formulário reutilizável de login
import { handleSubmitLogin } from '../handlers/loginHandlers'; // Lógica de submissão de login

// Estilos extraídos para ficheiro externo para manter código limpo
import {
    containerStyle,
    cardStyle,
    logoContainerStyle,
    logoStyle,
    backgroundStyle,
} from '../styles/LoginFormStyles';


// Componente principal de Login
const Login = ({ setIsAdmin, setUsername, setIsLoggedIn, onLoginComplete }) => {
    // Estados para armazenar os dados introduzidos pelo utilizador e mensagens de erro
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Hooks para navegação e tradução
    const navigation = useNavigation();
    const { t } = useTranslation();

    // Parar verificação automática de tokens quando estiver na página de login
    useEffect(() => {
        stopTokenValidation();
        console.log('Verificação automática de tokens parada na página de login');

        // Cleanup ao sair da página
        return () => {
            console.log('Saindo da página de login');
        };
    }, []);

    // Função para lidar com sucesso da autenticação biométrica
    const handleBiometricSuccess = (result) => {
        setUsername(result.userNome || result.username);
        setIsAdmin(result.isAdmin);
        setIsLoggedIn(true);

        if (onLoginComplete) {
            onLoginComplete();
        }

        navigation.navigate('Home');
    };

    // Disponibilizar função globalmente para o componente BiometricLoginButton
    window.handleBiometricSuccess = handleBiometricSuccess;

    // Função que trata o submit, utilizando a lógica separada em loginHandlers
    const handleSubmit = handleSubmitLogin({
        email,
        password,
        username: '', // username não está a ser usado, mas mantido para compatibilidade
        setEmail,
        setUsername,
        setIsAdmin,
        setIsLoggedIn,
        onLoginComplete,
        setErrorMessage,
        navigation,
        t,
    });

    return (
        // Container de fundo com imagem de background definida via estilo dinâmico
        <div style={backgroundStyle(backgroundImage)}>
            <div style={cardStyle}>
                {/* Área do logotipo no topo do formulário */}
                <div style={logoContainerStyle}>
                    <img src={logo} alt="Logo" style={logoStyle} />
                </div>

                {/* Componente de formulário que recebe os estados e a função de submit */}
                <LoginForm
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    errorMessage={errorMessage}
                    handleLogin={handleSubmit}
                    t={t}
                    navigation={navigation}
                    onLoginComplete={onLoginComplete}
                    setUsername={setUsername}
                    setIsAdmin={setIsAdmin}
                    setIsLoggedIn={setIsLoggedIn}
                />
            </div>
        </div>
    );
};

export default Login;