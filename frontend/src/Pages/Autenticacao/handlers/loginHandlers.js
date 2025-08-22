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
            localStorage.setItem('username', data.username); // 👈 usa o que vem da API
            localStorage.setItem('email', data.userEmail);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('userNome', data.userNome);
            localStorage.setItem('userEmail', data.userEmail);
            localStorage.setItem('empresa_areacliente', data.empresa_areacliente);
            localStorage.setItem('id_tecnico', data.id_tecnico);
            localStorage.setItem('tipoUser', data.tipoUser || '');
            localStorage.setItem('codFuncionario', data.codFuncionario || '');
            localStorage.setItem('codRecursosHumanos', data.codRecursosHumanos || '');


            setUsername(data.username);
            setEmail(email);
            setIsAdmin(data.isAdmin);
            setIsLoggedIn(true);
            onLoginComplete();

            if (data.redirect) {
                navigation.navigate('VerificaConta');
            } else {
                // Tentar seleção automática de empresa
                setTimeout(async () => {
                    try {
                        const { handleAutoCompanySelection } = await import('../utils/autoCompanySelection');
                        const autoSelectionSuccess = await handleAutoCompanySelection(navigation);

                        if (!autoSelectionSuccess) {
                            // Se a seleção automática falhar, ir para seleção manual
                            navigation.navigate('SelecaoEmpresa', { autoLogin: true });
                        }
                    } catch (error) {
                        console.error('Erro na seleção automática:', error);
                        navigation.navigate('SelecaoEmpresa', { autoLogin: true });
                    }
                }, 100);
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

export const handleSubmitLogin = ({
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
}) => (e) => {
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
