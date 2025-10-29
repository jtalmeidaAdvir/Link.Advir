import { checkTokenExpired } from '../../../utils/authUtils';
import { secureStorage } from '../../../utils/secureStorage';
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
        // Detetar se é um login POS
        const isPOSLogin = email.toLowerCase().includes('pos') || email.toLowerCase().endsWith('@pos.local');
        const loginEndpoint = isPOSLogin ? 
            'https://backend.advir.pt/api/pos/login' : 
            'https://backend.advir.pt/api/users/login';

        console.log('🔐 Tipo de login:', isPOSLogin ? 'POS' : 'Utilizador');
        console.log('🔗 Endpoint:', loginEndpoint);
        console.log('📧 Email:', email);
        console.log('🔑 Password length:', password ? password.length : 0);

        const requestBody = { email, password };
        console.log('📤 Request body:', requestBody);

        const response = await fetch(loginEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Response data:', data);

            if (checkTokenExpired(data)) return;

            // Se for login POS, processar diferentemente
            if (isPOSLogin && data.isPOS) {
                console.log('✅ Login POS bem-sucedido:', data);
                
                // Guardar dados do POS conforme estrutura do backend
                secureStorage.setItem('posToken', data.token);
                secureStorage.setItem('posId', data.posId);
                secureStorage.setItem('posNome', data.posNome);
                secureStorage.setItem('posCodigo', data.posCodigo);
                secureStorage.setItem('posEmail', data.email);
                secureStorage.setItem('posObraId', data.obra_predefinida_id);
                secureStorage.setItem('posObraNome', data.obra_predefinida_nome || 'N/A');
                secureStorage.setItem('isPOS', 'true');
                secureStorage.setItem('empresa_areacliente', data.empresa_areacliente);
                
                console.log('💾 Dados POS guardados no secureStorage');

                // Redirecionar para registo de ponto facial
                window.location.href = '/registo-ponto-facial';
                return;
            }

            // Login de utilizador normal
            secureStorage.setItem('loginToken', data.token);
            secureStorage.setItem('isAdmin', data.isAdmin ? 'true' : 'false');
            secureStorage.setItem('superAdmin', data.superAdmin ? 'true' : 'false');
            secureStorage.setItem('username', data.username);
            secureStorage.setItem('email', data.userEmail);
            secureStorage.setItem('userId', data.userId);
            secureStorage.setItem('userNome', data.userNome);
            secureStorage.setItem('userEmail', data.userEmail);
            secureStorage.setItem('empresa_areacliente', data.empresa_areacliente);
            secureStorage.setItem('id_tecnico', data.id_tecnico);
            secureStorage.setItem('tipoUser', data.tipoUser || '');
            secureStorage.setItem('codFuncionario', data.codFuncionario || '');
            secureStorage.setItem('codRecursosHumanos', data.codRecursosHumanos || '');

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
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: `Erro ${response.status}: ${response.statusText}` };
            }
            
            console.error('❌ Erro na resposta:', {
                status: response.status,
                statusText: response.statusText,
                errorData,
                url: loginEndpoint,
                isPOSLogin
            });
            
            if (checkTokenExpired(errorData)) return;
            
            // Mensagem de erro mais específica para POS
            let errorMessage = errorData.error || errorData.message;
            
            if (isPOSLogin) {
                errorMessage = errorMessage || 'Erro no login POS. Verifique as credenciais.';
            } else {
                errorMessage = errorMessage || t("Login.Error.1");
            }
            
            setErrorMessage(errorMessage);
        }
    } catch (error) {
        console.error('❌ Erro de rede:', error);
        setErrorMessage('Erro de conexão com o servidor. Verifique sua internet e tente novamente.');
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
