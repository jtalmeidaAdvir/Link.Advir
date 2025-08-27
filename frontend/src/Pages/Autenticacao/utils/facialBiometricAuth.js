
// Verificar se a câmera está disponível
export const isCameraAvailable = async () => {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return false;
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some(device => device.kind === 'videoinput');
    } catch (error) {
        console.error('Erro ao verificar câmera:', error);
        return false;
    }
};

// Registar biometria facial
export const registerFacialBiometric = async (userId, userEmail, facialData) => {
    try {
        // Obter challenge do servidor
        const challengeResponse = await fetch(
            "https://backend.advir.pt/api/auth/biometric/register-challenge",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId: parseInt(userId), userEmail }),
            }
        );

        const challengeData = await challengeResponse.json();

        if (!challengeResponse.ok) {
            throw new Error(challengeData.message || "Erro ao obter challenge");
        }

        // Registar biometria facial
        const registerResponse = await fetch(
            "https://backend.advir.pt/api/auth/biometric/register",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: parseInt(userId),
                    type: 'facial',
                    facialData: facialData
                }),
            }
        );

        const result = await registerResponse.json();

        if (!registerResponse.ok) {
            throw new Error(result.message || "Erro ao registar biometria facial");
        }

        return result;
    } catch (error) {
        console.error("Erro no registo de biometria facial:", error);
        throw error;
    }
};

// Verificar se tem biometria facial registada
export const hasFacialBiometricRegistered = async (email) => {
    try {
        const response = await fetch(
            "https://backend.advir.pt/api/auth/biometric/check",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, type: 'facial' }),
            },
        );

        const data = await response.json();
        return data.hasBiometric || false;
    } catch (error) {
        console.error("Erro ao verificar biometria facial:", error);
        return false;
    }
};

// Remover biometria facial
export const removeFacialBiometric = async (email) => {
    try {
        const response = await fetch(
            "https://backend.advir.pt/api/auth/biometric/remove",
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, type: 'facial' }),
            },
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Erro ao remover biometria facial");
        }

        return result;
    } catch (error) {
        console.error("Erro ao remover biometria facial:", error);
        throw error;
    }
};
