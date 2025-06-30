import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TouchableOpacity, Text, Image } from 'react-native';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
import logo from '../../../assets/img_logo.png';
import backgroundImage from '../../../images/ImagemFundo.png';
import { checkTokenExpired } from '../../utils/authUtils';
const Login = ({ setIsAdmin, setUsername, setIsLoggedIn, onLoginComplete }) => {  // Adicione setIsLoggedIn como prop
    const [username, setLocalUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const navigation = useNavigation();
    const { t } = useTranslation();


 const entrarEmpresaPredefinida = async (empresa) => {
    const loginToken = localStorage.getItem("loginToken");
    try {
      const credenciaisResponse = await fetch(
        `https://backend.advir.pt/api/empresas/nome/${encodeURIComponent(empresa)}`,
        { method: "GET", headers: { Authorization: `Bearer ${loginToken}` } }
      );

      if (credenciaisResponse.ok) {
        const credenciais = await credenciaisResponse.json();
        localStorage.setItem("urlempresa", credenciais.urlempresa);

        const response = await fetch("https://webapiprimavera.advir.pt/connect-database/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${loginToken}`,
          },
          body: JSON.stringify({
            username: credenciais.username,
            password: credenciais.password,
            company: credenciais.empresa,
            line: credenciais.linha,
            instance: "DEFAULT",
            urlempresa: credenciais.urlempresa,
            forceRefresh: true,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem("painelAdminToken", data.token);
          localStorage.setItem("empresaSelecionada", empresa);
          navigation.navigate("Home");
        } else {
          navigation.navigate("SelecaoEmpresa");
        }
      } else {
        navigation.navigate("SelecaoEmpresa");
      }
    } catch (error) {
      console.error("Erro de rede:", error);
      navigation.navigate("SelecaoEmpresa");
    }
  };

 const handleLogin = async () => {
    try {
      const response = await fetch('https://backend.advir.pt/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (checkTokenExpired(data)) return;

        localStorage.setItem('loginToken', data.token);
        localStorage.setItem('isAdmin', data.isAdmin ? 'true' : 'false');
        localStorage.setItem('superAdmin', data.superAdmin ? 'true' : 'false');
        localStorage.setItem('username', data.username || '');
        localStorage.setItem('email', email);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userNome', data.userNome);
        localStorage.setItem('userEmail', data.userEmail);
        localStorage.setItem('nomeuser', data.nome);
        localStorage.setItem('empresa_areacliente', data.empresa_areacliente);
        localStorage.setItem('id_tecnico', data.id_tecnico);
        localStorage.setItem('empresaPredefinida', data.empresaPredefinida);

        setUsername(email);
        setIsAdmin(data.isAdmin);
        setIsLoggedIn(true);
        onLoginComplete();

        if (data.redirect) {
          navigation.navigate('VerificaConta');
        } else if (data.empresaPredefinida) {
          await entrarEmpresaPredefinida(data.empresaPredefinida);
        } else {
          navigation.navigate("SelecaoEmpresa");
        }
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || t("Login.Error.1"));
      }
    } catch (error) {
      console.error("Erro de rede:", error);
      setErrorMessage("Erro de rede, tente novamente mais tarde.");
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

                    <TouchableOpacity onPress={handleLogin} style={{
                        marginTop: '15px',
                        borderRadius: '10px',
                        padding: '20px',
                        fontSize: '1.1rem',
                        backgroundColor: '#1792FE',
                        width: '100%',
                        alignItems: 'center',
                    }}>
                    <Text style={{ color: 'white' }}>{t("Login.BtLogin")}</Text>
                    </TouchableOpacity>

                </form>
            </div>
        </div>
    );
};

export default Login;