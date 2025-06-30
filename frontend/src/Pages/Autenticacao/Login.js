import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import logo from '../../../assets/img_logo.png';
import backgroundImage from '../../../images/ImagemFundo.png';
import LoginForm from './components/LoginForm';
import { handleLogin } from './handlers/loginHandlers';

const Login = ({ setIsAdmin, setUsername, setIsLoggedIn, onLoginComplete }) => {
  const [email, setEmail] = useState('');
  const [username, setLocalUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigation = useNavigation();
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin({
      email,
      password,
      username,
      setEmail,
      setUsername,
      setIsAdmin,
      setIsLoggedIn,
      onLoginComplete,
      setErrorMessage,
      navigation,
      t,
    });
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
        backgroundSize: 'cover',
        backgroundPosition: 'center',
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <img src={logo} alt="Logo" style={{ width: '550px', height: 'auto' }} />
        </div>

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
