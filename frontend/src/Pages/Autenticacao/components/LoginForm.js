import React, { useState, useEffect, useRef } from "react";
import RecuperarPasswordLink from "./RecuperarPasswordLink";

import InvisibleFacialScanner from "./InvisibleFacialScanner";
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
    const [isCameraAvailable, setIsCameraAvailable] = useState(false);
    const [isInvisibleScanning, setIsInvisibleScanning] = useState(false);
    const autoScanTriedRef = useRef(false); // Ref para evitar múltiplas tentativas automáticas



// 1) Disponibilidade: apenas detetar API; a permissão é pedida no scanner
useEffect(() => {
  setIsCameraAvailable(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
}, []);

// 2) (Opcional) Pré-preencher email com o último usado — ajuda se quiseres manter a verificação de biometria
useEffect(() => {
  const cached = localStorage.getItem('userEmail') || localStorage.getItem('email');
  if (cached) setEmail(cached);
}, [setEmail]);


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


      // AUTO-START: arranca o scan invisível assim que houver câmara e biometria
  useEffect(() => {
    if (!isCameraAvailable || isInvisibleScanning || autoScanTriedRef.current) return;

    const kickOff = () => {
      autoScanTriedRef.current = true;
      setIsInvisibleScanning(true);
    };

    // iOS/Safari às vezes exige gesto do utilizador para media
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const once = { once: true };
      const handler = () => { kickOff(); };
      window.addEventListener('pointerdown', handler, once);
      window.addEventListener('keydown', handler, once);
      // Se já houver dimensões/câmara pronta, tenta logo:
      setTimeout(() => { if (!autoScanTriedRef.current) kickOff(); }, 800);
      return () => {
        window.removeEventListener('pointerdown', handler);
        window.removeEventListener('keydown', handler);
      };
    } else {
      kickOff(); // Chrome/Edge/Firefox: pode arrancar já
    }
  }, [isCameraAvailable, isInvisibleScanning]);

    const handleSmartLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Verificar se é login POS (emails que contenham "pos" ou terminam com "@pos.local")
            const isPOSLogin = email.toLowerCase().includes('pos') || email.toLowerCase().endsWith('@pos.local');
            
            if (isPOSLogin) {
                // Login POS
                await handlePOSLogin();
            } else if (hasBiometric) {
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

    const handlePOSLogin = async () => {
        try {
            const response = await fetch('https://backend.advir.pt/api/pos/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Guardar dados no localStorage
                localStorage.setItem('loginToken', result.token);
                localStorage.setItem('isPOS', 'true');
                localStorage.setItem('posId', result.posId);
                localStorage.setItem('posNome', result.posNome);
                localStorage.setItem('posCodigo', result.posCodigo);
                localStorage.setItem('email', result.email);
                localStorage.setItem('empresa_id', result.empresa_id);
                localStorage.setItem('empresa_areacliente', result.empresa_areacliente);
                localStorage.setItem('obra_predefinida_id', result.obra_predefinida_id);
                localStorage.setItem('obra_predefinida_nome', result.obra_predefinida_nome);

                // Atualizar estados
                if (setEmail && typeof setEmail === 'function') {
                    setEmail(result.email);
                }
                if (setIsLoggedIn && typeof setIsLoggedIn === 'function') {
                    setIsLoggedIn(true);
                }
                
                if (onLoginComplete && typeof onLoginComplete === 'function') {
                    onLoginComplete();
                }

                // Navegar diretamente para a página de ponto facial
                setTimeout(() => {
                    if (navigation && navigation.navigate) {
                        navigation.navigate('RegistoPontoFacial');
                    } else {
                        // Para web, usar window.location
                        window.location.href = '/registo-ponto-facial';
                    }
                }, 500);
            } else {
                alert(result.message || 'Erro no login do POS');
            }
        } catch (error) {
            console.error('Erro no login POS:', error);
            alert('Erro na conexão. Tente novamente.');
        }
    };

    

    const handleInvisibleFacialLogin = () => {
        if (!isCameraAvailable) {
            alert("Câmera não disponível neste dispositivo");
            return;
        }
        setIsInvisibleScanning(true);
    };

    const handleInvisibleFacialScanComplete = async (facialData) => {
        if (!facialData) {
            alert("Nenhum dado facial capturado.");
            setIsInvisibleScanning(false);
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
                // Guardar dados no localStorage como no login normal
                localStorage.setItem('loginToken', result.token);
                localStorage.setItem('isAdmin', result.isAdmin ? 'true' : 'false');
                localStorage.setItem('superAdmin', result.superAdmin ? 'true' : 'false');
                localStorage.setItem('username', result.username);
                localStorage.setItem('email', result.userEmail);
                localStorage.setItem('userId', result.userId);
                localStorage.setItem('userNome', result.userNome);
                localStorage.setItem('userEmail', result.userEmail);
                localStorage.setItem('empresa_areacliente', result.empresa_areacliente || '');
                localStorage.setItem('id_tecnico', result.id_tecnico || '');
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

                await new Promise(resolve => setTimeout(resolve, 100));

                setTimeout(async () => {
                    try {
                        const token = localStorage.getItem('loginToken');
                        console.log('🔍 Token após login facial invisível:', token ? 'encontrado' : 'não encontrado');

                        if (!token) {
                            console.error('Token não encontrado após login facial');
                            navigation.navigate('SelecaoEmpresa', { autoLogin: true });
                            return;
                        }

                        const { handleAutoCompanySelection } = await import('../utils/autoCompanySelection');
                        const autoSelectionSuccess = await handleAutoCompanySelection(navigation);

                        if (!autoSelectionSuccess) {
                            navigation.navigate('SelecaoEmpresa', { autoLogin: true });
                        }
                    } catch (error) {
                        console.error('Erro na seleção automática:', error);
                        navigation.navigate('SelecaoEmpresa', { autoLogin: true });
                    }
                }, 1000);
            } else {
                alert(result.message || 'Erro na autenticação facial');
            }
        } catch (error) {
            console.error('Erro no login facial invisível:', error);
            alert('Erro na autenticação facial. Tente novamente.');
        } finally {
            setIsLoading(false);
            setIsInvisibleScanning(false);
        }
    };

    

    return (
        <form onSubmit={handleSmartLogin}>
            <div style={{ marginBottom: "20px" }}>
              <input
  type="text"
  placeholder={t("Email")}
  value={email}
  onFocus={() => { if (isInvisibleScanning) setIsInvisibleScanning(false); }}
  onKeyDown={() => { if (isInvisibleScanning) setIsInvisibleScanning(false); }}
  onChange={(e) => {
    setEmail(e.target.value);
    if (isInvisibleScanning) setIsInvisibleScanning(false);
  }}
  required
  style={inputStyle}
/>


            </div>

            {/* Mostrar campo da password apenas se não tiver biometria ou se estiver a verificar */}
           
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

        

            

            {/* Scanner Facial Invisível */}
            <InvisibleFacialScanner
                onScanComplete={handleInvisibleFacialScanComplete}
                isScanning={isInvisibleScanning}
                onStartScan={() => setIsInvisibleScanning(true)}
                onStopScan={() => setIsInvisibleScanning(false)}
                t={t}
            />

            
        </form>
    );
};

export default LoginForm;