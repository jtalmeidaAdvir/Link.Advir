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

        setIsFacialLoading(true);
        try {
            const response = await fetch("https://backend.advir.pt/api/auth/facial-login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    facialData: facialData
                }),
            });

            if (response.ok) {
                const result = await response.json();
                
                // Armazenar dados do utilizador no localStorage
                localStorage.setItem("userId", result.userId);
                localStorage.setItem("userNome", result.userNome);
                localStorage.setItem("userEmail", result.userEmail);
                localStorage.setItem("loginToken", result.token);
                localStorage.setItem("isAdmin", result.isAdmin);

                // Usar o mesmo handler do login tradicional
                if (window.handleBiometricSuccess) {
                    window.handleBiometricSuccess(result);
                }
            } else {
                const errorData = await response.json();
                alert(errorData.message || "Falha na autenticação facial. Utilizador não reconhecido.");
            }
        } catch (error) {
            console.error("Erro na autenticação facial:", error);
            alert("Erro ao processar autenticação facial. Tente novamente.");
        } finally {
            setIsFacialLoading(false);
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