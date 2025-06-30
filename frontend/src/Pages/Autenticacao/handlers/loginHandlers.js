import { checkTokenExpired } from '../../../utils/authUtils';

export const handleLogin = async ({
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
}) => {
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
      localStorage.setItem('empresa_areacliente', data.empresa_areacliente);
      localStorage.setItem('id_tecnico', data.id_tecnico);
      localStorage.setItem('empresaPredefinida', data.empresaPredefinida || '');


      setUsername(username);
      setEmail(email);
      setIsAdmin(data.isAdmin);
      setIsLoggedIn(true);
      onLoginComplete();

      if (data.redirect) {
        navigation.navigate('VerificaConta');
      } else {
        setTimeout(() => navigation.navigate('SelecaoEmpresa'), 100);
      }
    } else {
      const errorData = await response.json();
      if (checkTokenExpired(errorData)) return;
      setErrorMessage(errorData.error || t("Login.Error.1"));
    }
  } catch (error) {
    console.error('Erro de rede:', error);
    setErrorMessage('Erro de rede, tente novamente mais tarde.');
  }
};
