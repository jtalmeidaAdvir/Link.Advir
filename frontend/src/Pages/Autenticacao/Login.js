import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View, Text, TextInput, Image,
  TouchableOpacity, ScrollView, StyleSheet,
  Dimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
import logo from '../../../assets/img_logo.png';
import backgroundImage from '../../../images/ImagemFundo.png';
import { checkTokenExpired } from '../../utils/authUtils';

const Login = ({ setIsAdmin, setUsername, setIsLoggedIn, onLoginComplete }) => {
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
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${loginToken}`,
          },
        }
      );

      if (credenciaisResponse.ok) {
        const credenciais = await credenciaisResponse.json();
        localStorage.setItem("urlempresa", credenciais.urlempresa);

        const response = await fetch(
          "https://webapiprimavera.advir.pt/connect-database/token",
          {
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
          }
        );

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
        localStorage.setItem('username', username);
        localStorage.setItem('email', email);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userNome', data.userNome);
        localStorage.setItem('userEmail', data.userEmail);
        localStorage.setItem('nomeuser', data.nome);
        localStorage.setItem('empresa_areacliente', data.empresa_areacliente);
        localStorage.setItem('id_tecnico', data.id_tecnico);
        localStorage.setItem('empresaPredefinida', data.empresaPredefinida);

        setUsername(username);
        setEmail(email);
        setIsAdmin(data.isAdmin);
        setIsLoggedIn(true);
        onLoginComplete();

        if (data.redirect) {
          navigation.navigate('VerificaConta');
        } else if (data.empresaPredefinida) {
          localStorage.setItem("empresaSelecionada", data.empresaPredefinida);
          await entrarEmpresaPredefinida(data.empresaPredefinida);
        } else {
          navigation.navigate("SelecaoEmpresa");
        }
      } else {
        const errorData = await response.json();
        if (checkTokenExpired(errorData)) return;
        setErrorMessage(errorData.error || t("Login.Error.1"));
      }
    } catch (error) {
      setErrorMessage('Erro de rede, tente novamente mais tarde.');
    }
  };

  const RecuperarPasswordLink = () => (
    <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 10 }}>
      <TouchableOpacity onPress={() => navigation.navigate('RecuperarPassword')}>
        <Text style={{ color: '#1792FE', fontSize: 14 }}>
          {t("Login.LinkRecoverPass")}
        </Text>
      </TouchableOpacity>
    </View>
  );

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d4e4ff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  background: {
    position: 'absolute',
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  box: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 15,
    padding: 20,
  },
  logo: {
    width: 250,
    height: 100,
    alignSelf: 'center',
    marginBottom: 20,
  },
  input: {
    borderRadius: 30,
    padding: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 16,
    marginBottom: 15,
  },
  loginButton: {
    marginTop: 15,
    borderRadius: 10,
    padding: 20,
    backgroundColor: '#1792FE',
    alignItems: 'center',
  },
  loginText: {
    color: 'white',
    fontSize: 18,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default Login;
