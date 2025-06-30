import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TextInput, TouchableOpacity, Text, Image, StyleSheet, ScrollView, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
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




    const LoginUI = ({ email, password, setEmail, setPassword, handleLogin, errorMessage, RecuperarPasswordLink, t }) => {
    return (
        <View style={styles.container}>
            <Image source={backgroundImage} style={styles.background} resizeMode="cover" />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.innerContainer}>
                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                    <View style={styles.box}>
                        <Image source={logo} style={styles.logo} resizeMode="contain" />

                        <TextInput
                            placeholder={t("Email")}
                            value={email}
                            onChangeText={setEmail}
                            style={styles.input}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <TextInput
                            placeholder={t("Login.TxtPass")}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            style={styles.input}
                        />

                        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                        <RecuperarPasswordLink />

                        <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
                            <Text style={styles.loginText}>{t("Login.BtLogin")}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

};

export default Login;