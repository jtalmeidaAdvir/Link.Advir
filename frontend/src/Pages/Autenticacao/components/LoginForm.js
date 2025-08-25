import React, { useState, useEffect } from "react";
import RecuperarPasswordLink from "./RecuperarPasswordLink";
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
        </form>
    );
};

export default LoginForm;