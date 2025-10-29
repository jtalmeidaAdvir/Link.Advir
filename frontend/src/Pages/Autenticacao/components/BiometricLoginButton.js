import React, { useState, useEffect } from "react";
import { FontAwesome } from "@expo/vector-icons";
import {
    isBiometricAvailable,
    authenticateWithBiometric,
    hasBiometricRegistered,
} from "../utils/biometricAuth";
import { secureStorage } from '../../../utils/secureStorage';
// Adicionar estilos CSS para animação do spinner
const spinnerStyle = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Injetar estilos no documento se ainda não existirem
if (!document.getElementById('biometric-spinner-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'biometric-spinner-styles';
    styleSheet.textContent = spinnerStyle;
    document.head.appendChild(styleSheet);
}

const BiometricLoginButton = ({ email, onSuccess, t, style = {} }) => {
    const [isSupported, setIsSupported] = useState(false);
    const [hasRegistered, setHasRegistered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        checkBiometricSupport();
    }, []);

    useEffect(() => {
        if (email && isSupported) {
            checkRegisteredBiometric();
        }
    }, [email, isSupported]);

    const checkBiometricSupport = async () => {
        const supported = await isBiometricAvailable();
        setIsSupported(supported);
    };

    const checkRegisteredBiometric = async () => {
        try {
            const registered = await hasBiometricRegistered(email);
            setHasRegistered(registered);
        } catch (error) {
            console.error("Erro ao verificar biometria:", error);
        }
    };

    const handleBiometricLogin = async () => {
        if (!email) {
            alert(
                t?.("Biometric.EmailRequired") ||
                "Por favor, introduza o email primeiro",
            );
            return;
        }

        setIsLoading(true);
        try {
            const result = await authenticateWithBiometric(email);

            // Guardar dados de autenticação
            secureStorage.setItem("loginToken", result.token);
            secureStorage.setItem("userId", result.userId.toString());
            secureStorage.setItem("userNome", result.userNome);
            secureStorage.setItem("userEmail", result.userEmail);
            secureStorage.setItem("isAdmin", result.isAdmin.toString());
            secureStorage.setItem("superAdmin", result.superAdmin.toString());
            secureStorage.setItem(
                "empresa_areacliente",
                result.empresa_areacliente,
            );
            secureStorage.setItem(
                "empresaPredefinida",
                result.empresaPredefinida || "",
            );
            secureStorage.setItem("tipoUser", result.tipoUser || "");

            if (result.id_tecnico) {
                secureStorage.setItem(
                    "id_tecnico",
                    result.id_tecnico.toString(),
                );
            }

            if (onSuccess) {
                onSuccess(result);
            }
        } catch (error) {
            console.error("Erro no login biométrico:", error);
            alert(
                error.message ||
                t?.("Biometric.LoginError") ||
                "Erro na autenticação biométrica",
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (!isSupported || !hasRegistered) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={handleBiometricLogin}
            disabled={isLoading}
            style={{
                backgroundColor: "#4CAF50",
                color: "white",
                padding: "14px 24px",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                width: "100%",
                marginBottom: "15px",
                opacity: isLoading ? 0.6 : 1,
                transition: "all 0.3s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                ...style,
            }}
            onMouseEnter={(e) => {
                if (!isLoading) {
                    e.target.style.backgroundColor = "#45a049";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                }
            }}
            onMouseLeave={(e) => {
                if (!isLoading) {
                    e.target.style.backgroundColor = "#4CAF50";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                }
            }}
        >
            {isLoading ? (
                <>
                    <div
                        style={{
                            width: "18px",
                            height: "18px",
                            border: "2px solid #ffffff",
                            borderTop: "2px solid transparent",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                        }}
                    />
                    A autenticar...
                </>
            ) : (
                <>
                    <span style={{ fontSize: "20px" }}>🔐</span>
                    Entrar com Biometria
                </>
            )}
        </button>
    );
};

export default BiometricLoginButton;
