import React, { useState, useEffect } from "react";
import RecuperarPasswordLink from "./RecuperarPasswordLink";
import FacialScannerModal from "./FacialScannerModal";
import { hasBiometricRegistered, authenticateWithBiometric } from "../utils/biometricAuth";
import { inputStyle, buttonStyle, errorStyle } from "../styles/LoginFormStyles";

const LoginForm = ({
    email,
    setEmail,
    password,
    setPassword,
    errorMessage,
    handleLogin,
    t,
    navigation, // Adicionado para navegação
    onLoginComplete, // Adicionado para callback de login completo
    setUsername, // Adicionado para atualizar estado do username
    setIsAdmin, // Adicionado para atualizar estado do isAdmin
    setIsLoggedIn, // Adicionado para atualizar estado do isLoggedIn
}) => {
    const [hasBiometric, setHasBiometric] = useState(false);
    const [isCheckingBiometric, setIsCheckingBiometric] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [facialScannerVisible, setFacialScannerVisible] = useState(false);
    const [isFacialLoading, setIsFacialLoading] = useState(false);
    const [isCameraAvailable, setIsCameraAvailable] = useState(false);

    // Verificar disponibilidade da câmera
    useEffect(() => {
        const checkCameraAvailability = async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    await navigator.mediaDevices.getUserMedia({ video: true });
                    setIsCameraAvailable(true);
                } catch (error) {
                    console.error("Erro ao acessar a câmera:", error);
                    setIsCameraAvailable(false);
                }
            } else {
                setIsCameraAvailable(false);
            }
        };

        checkCameraAvailability();
    }, []);

    // Verificar se o utilizador tem biometria registada quando o email muda
    useEffect(() => {
        const checkBiometric = async () => {
            if (email && email.includes('@')) {
                setIsCheckingBiometric(true);
                try {
                    const hasRegistered = await hasBiometricRegistered(email);
                    setHasBiometric(hasRegistered);
                } catch (error) {
                    console.error("Erro ao verificar biometria:", error);
                    setHasBiometric(false);
                } finally {
                    setIsCheckingBiometric(false);
                }
            } else {
                setHasBiometric(false);
            }
        };

        const timeoutId = setTimeout(checkBiometric, 500); // Debounce de 500ms
        return () => clearTimeout(timeoutId);
    }, [email]);

    const handleSmartLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (hasBiometric) {
                // Login com biometria
                const result = await authenticateWithBiometric(email);

                // Usar o mesmo handler do login tradicional
                if (window.handleBiometricSuccess) {
                    window.handleBiometricSuccess(result);
                }
            } else {
                // Login tradicional
                handleLogin(e);
            }
        } catch (error) {
            console.error("Erro no login:", error);
            // Em caso de erro na biometria, tentar login tradicional como fallback
            if (hasBiometric && password) {
                handleLogin(e);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFacialLogin = () => {
        if (!isCameraAvailable) {
            alert("Câmera não disponível neste dispositivo");
            return;
        }
        setFacialScannerVisible(true);
    };

    const handleFacialScanComplete = async (facialData) => {
        if (!facialData) {
            alert("Nenhum dado facial capturado.");
            setFacialScannerVisible(false);
            return;

        }

        setIsLoading(true);
        try {
            const response = await fetch('https://backend.advir.pt/api/auth/biometric/facial/authenticate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    facialData: facialData
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Guardar todos os dados no localStorage como no login normal
                localStorage.setItem('loginToken', result.token);
                localStorage.setItem('isAdmin', result.isAdmin ? 'true' : 'false');
                localStorage.setItem('superAdmin', result.superAdmin ? 'true' : 'false');
                localStorage.setItem('username', result.username); // usa o que vem da API
                localStorage.setItem('email', result.userEmail);
                localStorage.setItem('userId', result.userId);
                localStorage.setItem('userNome', result.userNome);
                localStorage.setItem('userEmail', result.userEmail);
                localStorage.setItem('empresa_areacliente', result.empresa_areacliente);
                localStorage.setItem('id_tecnico', result.id_tecnico);
                localStorage.setItem('tipoUser', result.tipoUser || '');
                localStorage.setItem('codFuncionario', result.codFuncionario || '');
                localStorage.setItem('codRecursosHumanos', result.codRecursosHumanos || '');

                // Atualizar estados como no login normal
                if (setUsername && typeof setUsername === 'function') {
                    setUsername(result.username);
                }
                if (setEmail && typeof setEmail === 'function') {
                    setEmail(result.userEmail);
                }
                if (setIsAdmin && typeof setIsAdmin === 'function') {
                    setIsAdmin(result.isAdmin);
                }
                if (setIsLoggedIn && typeof setIsLoggedIn === 'function') {
                    setIsLoggedIn(true);
                }
                if (onLoginComplete && typeof onLoginComplete === 'function') {
                    onLoginComplete();
                }

                alert(`Login facial bem-sucedido! Confiança: ${Math.round(result.confidence * 100)}%`);

                // Tentar seleção automática de empresa como no login normal
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
            } else {
                alert(result.message || 'Erro na autenticação facial');
            }
        } catch (error) {
            console.error('Erro no login facial:', error);
            alert('Erro na autenticação facial. Tente novamente.');
        } finally {
            setIsLoading(false);
            setFacialScannerVisible(false);
        }
    };

    return (
        <form onSubmit={handleSmartLogin}>
            <div style={{ marginBottom: "20px" }}>
                <input
                    type="text"
                    placeholder={t("Email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={inputStyle}
                />
            </div>

            {/* Mostrar campo da password apenas se não tiver biometria ou se estiver a verificar */}
            {(!hasBiometric || isCheckingBiometric) && (
                <div style={{ marginBottom: "20px" }}>
                    <input
                        type="password"
                        placeholder={t("Login.TxtPass")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={!hasBiometric}
                        style={inputStyle}
                    />
                </div>
            )}

            {errorMessage && <div style={errorStyle}>{errorMessage}</div>}

            <RecuperarPasswordLink />

            <button 
                type="submit" 
                style={{
                    ...buttonStyle,
                    backgroundColor: hasBiometric ? "#1792FE" : buttonStyle.backgroundColor,
                    opacity: isLoading ? 0.6 : 1,
                    cursor: isLoading ? "not-allowed" : "pointer",
                }}
                disabled={isLoading}
            >
                {isLoading ? (
                    "A processar..."
                ) : hasBiometric ? (
                    <>
                         {t("Login.BtLogin")}
                    </>
                ) : (
                    t("Login.BtLogin")
                )}
            </button>

            {/* Botão de Autenticação Facial */}
            {isCameraAvailable && (
                <button 
                    type="button"
                    onClick={handleFacialLogin}
                    disabled={isFacialLoading}
                    style={{
                        ...buttonStyle,
                        backgroundColor: "#4CAF50",
                        marginTop: "10px",
                        opacity: isFacialLoading ? 0.6 : 1,
                        cursor: isFacialLoading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px"
                    }}
                >
                    {isFacialLoading ? (
                        "A processar..."
                    ) : (
                        <>
                            <span>👤</span>
                            Entrar com Reconhecimento Facial
                        </>
                    )}
                </button>
            )}

            {/* Modal do Scanner Facial */}
            <FacialScannerModal
                visible={facialScannerVisible}
                onClose={() => setFacialScannerVisible(false)}
                onScanComplete={handleFacialScanComplete}
                t={t}
            />
        </form>
    );
};

export default LoginForm;