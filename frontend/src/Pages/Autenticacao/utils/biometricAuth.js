import { fetchWithAuth } from "./authUtils";
import { secureStorage } from '../../../utils/secureStorage';
// Verificar se o navegador suporta WebAuthn
export const isBiometricSupported = () => {
    return (
        window.PublicKeyCredential &&
        navigator.credentials &&
        navigator.credentials.create &&
        navigator.credentials.get
    );
};

// Verificar se há biometria disponível no dispositivo
export const isBiometricAvailable = async () => {
    if (!isBiometricSupported()) return false;

    try {
        const available =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
    } catch (error) {
        console.error("Erro ao verificar biometria:", error);
        return false;
    }
};

// Registar credencial biométrica
export const registerBiometric = async (userId, userEmail) => {
    if (!isBiometricSupported()) {
        throw new Error("Biometria não suportada neste dispositivo");
    }

    try {
        // Obter token de autorização
        const token = secureStorage.getItem("loginToken");
        if (!token) {
            throw new Error("Token não fornecido.");
        }

        // Obter challenge do servidor
        const response = await fetch(
            "https://backend.advir.pt/api/auth/biometric/register-challenge",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ userId, userEmail }),
            },
        );

        const challengeData = await response.json();

        if (!response.ok) {
            throw new Error(challengeData.message || "Erro ao obter challenge");
        }

        // Criar credencial
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: new Uint8Array(challengeData.challenge),
                rp: {
                    name: "AdvirLink",
                    id: window.location.hostname,
                },
                user: {
                    id: new TextEncoder().encode(userId.toString()),
                    name: userEmail,
                    displayName: userEmail,
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                },
                timeout: 60000,
                attestation: "direct",
            },
        });

        // Enviar credencial para o servidor
        const registrationResponse = await fetch(
            "https://backend.advir.pt/api/auth/biometric/register",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId,
                    credentialId: btoa(
                        String.fromCharCode(
                            ...new Uint8Array(credential.rawId),
                        ),
                    ),
                    publicKey: btoa(
                        String.fromCharCode(
                            ...new Uint8Array(
                                credential.response.getPublicKey(),
                            ),
                        ),
                    ),
                    attestationObject: btoa(
                        String.fromCharCode(
                            ...new Uint8Array(
                                credential.response.attestationObject,
                            ),
                        ),
                    ),
                }),
            },
        );

        const result = await registrationResponse.json();

        if (!registrationResponse.ok) {
            throw new Error(result.message || "Erro ao registar biometria");
        }

        return result;
    } catch (error) {
        console.error("Erro no registo biométrico:", error);
        throw error;
    }
};

// Autenticar com biometria
export const authenticateWithBiometric = async (email) => {
    if (!isBiometricSupported()) {
        throw new Error("Biometria não suportada neste dispositivo");
    }

    try {
        // Obter challenge do servidor
        const response = await fetch(
            "https://backend.advir.pt/api/auth/biometric/login-challenge",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            },
        );

        const challengeData = await response.json();

        if (!response.ok) {
            throw new Error(challengeData.message || "Erro ao obter challenge");
        }

        // Autenticar com credencial
        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge: new Uint8Array(challengeData.challenge),
                allowCredentials: challengeData.allowCredentials.map(
                    (cred) => ({
                        id: new Uint8Array(
                            atob(cred.id)
                                .split("")
                                .map((c) => c.charCodeAt(0)),
                        ),
                        type: "public-key",
                    }),
                ),
                timeout: 60000,
                userVerification: "required",
            },
        });

        // Verificar autenticação no servidor
        const loginResponse = await fetch(
            "https://backend.advir.pt/api/auth/biometric/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    credentialId: btoa(
                        String.fromCharCode(...new Uint8Array(assertion.rawId)),
                    ),
                    authenticatorData: btoa(
                        String.fromCharCode(
                            ...new Uint8Array(
                                assertion.response.authenticatorData,
                            ),
                        ),
                    ),
                    clientDataJSON: btoa(
                        String.fromCharCode(
                            ...new Uint8Array(
                                assertion.response.clientDataJSON,
                            ),
                        ),
                    ),
                    signature: btoa(
                        String.fromCharCode(
                            ...new Uint8Array(assertion.response.signature),
                        ),
                    ),
                }),
            },
        );

        const result = await loginResponse.json();

        if (!loginResponse.ok) {
            throw new Error(
                result.message || "Erro na autenticação biométrica",
            );
        }

        return result;
    } catch (error) {
        console.error("Erro na autenticação biométrica:", error);
        throw error;
    }
};

// Verificar se o utilizador tem biometria registada
export const hasBiometricRegistered = async (email) => {
    try {
        const response = await fetch(
            "https://backend.advir.pt/api/auth/biometric/check",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            },
        );

        const data = await response.json();
        return data.hasBiometric || false;
    } catch (error) {
        console.error("Erro ao verificar biometria registada:", error);
        return false;
    }
};

// Remover credencial biométrica
export const removeBiometric = async (email) => {
    try {
        const response = await fetch(
            "https://backend.advir.pt/api/auth/biometric/remove",
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            },
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Erro ao remover biometria");
        }

        return result;
    } catch (error) {
        console.error("Erro ao remover biometria:", error);
        throw error;
    }
};
