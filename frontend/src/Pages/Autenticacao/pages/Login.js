// Importações principais de React e bibliotecas auxiliares
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native'; // Navegação do React Native
import { useTranslation } from 'react-i18next'; // i18n para internacionalização

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
        />
      </div>
    </div>
  );
};

export default Login;
