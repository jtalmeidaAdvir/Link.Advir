import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

const FacialScannerModal = ({ visible, onClose, onScanComplete, t }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (visible) {
            startCamera();
            setStatusMessage('Posicione o rosto dentro do círculo.');
        } else {
            stopCamera();
            setStatusMessage('');
        }

        return () => {
            stopCamera();
        };
    }, [visible]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setCameraReady(true);
                setStatusMessage('Posicione o rosto dentro do círculo.');
            }
        } catch (error) {
            console.error('Erro ao acessar câmera:', error);
            setCameraReady(false);
            setStatusMessage('Erro ao acessar a câmera. Verifique as permissões.');
            alert('Erro ao acessar a câmera. Verifique as permissões.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setCameraReady(false);
        }
    };

    const startScan = () => {
        if (!cameraReady) {
            setStatusMessage('A câmera ainda não está pronta.');
            return;
        }

        setIsScanning(true);
        setScanProgress(0);
        setStatusMessage('Processando...');

        // Simular progresso do scan com feedback visual
        const interval = setInterval(() => {
            setScanProgress(prev => {
                const nextProgress = prev + 10;
                if (nextProgress >= 100) {
                    clearInterval(interval);
                    completeScan();
                    return 100;
                }
                // Atualizar mensagem de status com base no progresso
                if (nextProgress < 50) {
                    setStatusMessage('Alinhando rosto...');
                } else if (nextProgress < 80) {
                    setStatusMessage('Capturando detalhes...');
                } else {
                    setStatusMessage('Finalizando...');
                }
                return nextProgress;
            });
        }, 200);
    };

    const completeScan = async () => {
        try {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (canvas && video) {
                const ctx = canvas.getContext('2d');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);

                const imageData = canvas.toDataURL('image/jpeg', 0.8);

                // Simular processamento de dados biométricos faciais
                const facialData = await processFacialBiometrics(imageData);

                setIsScanning(false);
                setScanProgress(0);
                onScanComplete(facialData);
                onClose();
            }
        } catch (error) {
            console.error('Erro ao completar scan:', error);
            setIsScanning(false);
            setScanProgress(0);
            setStatusMessage('Erro ao processar dados faciais.');
            alert('Erro ao processar dados faciais. Tente novamente.');
        }
    };

    const processFacialBiometrics = async (imageData) => {
        // Simulação de processamento de características faciais
        const features = {
            faceDetected: true,
            confidence: 0.95,
            landmarks: {
                eyes: { left: [120, 150], right: [180, 150] },
                nose: [150, 170],
                mouth: [150, 200]
            },
            encoding: generateFaceEncoding(imageData),
            timestamp: new Date().toISOString()
        };

        return {
            type: 'facial',
            data: JSON.stringify(features),
            imageData: imageData.split(',')[1] // Remover data:image/jpeg;base64,
        };
    };

    const generateFaceEncoding = (imageData) => {
        // Gerar encoding único baseado na imagem
        const hash = btoa(imageData.slice(-100));
        return Array.from({ length: 128 }, (_, i) => 
            Math.sin(hash.charCodeAt(i % hash.length) + i) * 100
        );
    };

    // Estilos ajustados para Web
    const styles = {
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
        },
        modalContainer: {
            backgroundColor: '#1a1a1a',
            borderRadius: 15,
            width: '90%',
            maxWidth: '500px',
            overflow: 'hidden',
            boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
        },
        header: {
            backgroundColor: '#1792FE',
            padding: '15px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        title: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white',
            margin: 0,
        },
        closeButton: {
            backgroundColor: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '28px',
            cursor: 'pointer',
            fontWeight: 'bold',
        },
        cameraContainer: {
            position: 'relative',
            width: '100%',
            height: '350px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#000',
        },
        video: {
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
        },
        overlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
        },
        faceGuide: {
            width: '80%',
            maxWidth: '200px',
            height: '200px',
            borderRadius: '100px',
            border: '3px dashed #1792FE',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(23, 146, 254, 0.1)',
            position: 'relative',
        },
        faceCircle: {
            width: '100%',
            height: '100%',
            borderRadius: '100%',
            border: '2px solid rgba(255, 255, 255, 0.5)',
        },
        landmarks: {
            position: 'absolute',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
        landmarkPoint: {
            position: 'absolute',
            width: '8px',
            height: '8px',
            backgroundColor: '#FFEB3B',
            borderRadius: '50%',
            animation: 'blink 1s infinite',
        },
        statusContainer: {
            padding: '15px 20px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            textAlign: 'center',
        },
        statusMessage: {
            color: 'white',
            fontSize: '16px',
            marginBottom: '10px',
            minHeight: '20px', // Para evitar saltos de layout
        },
        progressContainer: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '10px',
        },
        progressBar: {
            flexGrow: 1,
            height: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '4px',
            marginRight: '10px',
            overflow: 'hidden',
        },
        progressFill: {
            height: '100%',
            backgroundColor: '#1792FE',
            borderRadius: '4px',
            transition: 'width 0.2s ease-in-out',
        },
        progressText: {
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
        },
        controls: {
            padding: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
        },
        scanButton: {
            backgroundColor: '#1792FE',
            padding: '15px 25px',
            borderRadius: '12px',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
        },
        scanButtonDisabled: {
            backgroundColor: '#666',
            cursor: 'not-allowed',
        },
        instructions: {
            padding: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            textAlign: 'center',
            borderTop: '1px solid #333',
        },
        instructionItem: {
            color: 'white',
            fontSize: '14px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
        },
        // Estilos CSS para animações (adicionar em um arquivo CSS separado ou dentro de uma tag style)
        '@keyframes blink': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.5 },
            '100%': { opacity: 1 },
        }
    };

    // Retorna null se o modal não estiver visível
    if (!visible) return null;

    // Renderização do modal para Web (usando divs e estilos inline/CSS)
    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContainer}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Scanner Facial</h2>
                    <button onClick={onClose} style={styles.closeButton}>
                        ✕
                    </button>
                </div>

                <div style={styles.cameraContainer}>
                    <video
                        ref={videoRef}
                        style={styles.video}
                        autoPlay
                        playsInline
                        muted
                    />
                    <canvas
                        ref={canvasRef}
                        style={{ display: 'none' }}
                    />

                    <div style={styles.overlay}>
                        <div style={styles.faceGuide}>
                            <div style={styles.faceCircle}></div>
                        </div>

                        {/* Pontos de referência animados */}
                        <div style={styles.landmarks}>
                            {isScanning && (
                                <>
                                    <div style={{...styles.landmarkPoint, top: '35%', left: '42%'}}></div>
                                    <div style={{...styles.landmarkPoint, top: '35%', left: '58%'}}></div>
                                    <div style={{...styles.landmarkPoint, top: '50%', left: '50%'}}></div>
                                    <div style={{...styles.landmarkPoint, top: '65%', left: '50%'}}></div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div style={styles.statusContainer}>
                    <div style={styles.statusMessage}>
                        {statusMessage}
                    </div>

                    {isScanning && (
                        <div style={styles.progressContainer}>
                            <div style={styles.progressBar}>
                                <div
                                    style={{
                                        ...styles.progressFill,
                                        width: `${scanProgress}%`
                                    }}
                                />
                            </div>
                            <span style={styles.progressText}>{scanProgress}%</span>
                        </div>
                    )}
                </div>

                {!isScanning && cameraReady && (
                    <div style={styles.controls}>
                        <button
                            style={styles.scanButton}
                            onClick={startScan}
                        >
                            📷 Iniciar Captura Facial
                        </button>
                    </div>
                )}

                <div style={styles.instructions}>
                    <div style={styles.instructionItem}>
                        💡 Mantenha o rosto bem iluminado
                    </div>
                    <div style={styles.instructionItem}>
                        👀 Olhe diretamente para a câmera
                    </div>
                    <div style={styles.instructionItem}>
                        🎯 Posicione-se dentro do círculo
                    </div>
                </div>
            </div>
        </div>
    );
};

// Adiciona os estilos CSS para as animações
const styles = StyleSheet.create({
    // ... (estilos existentes da aplicação React Native)
    // Aqui seriam adicionados os estilos CSS que faltam para a versão Web,
    // mas como estamos no contexto de um componente React Native,
    // o `StyleSheet.create` é usado. Para Web, isso seria transpilado para CSS.

    // Adicionando animação CSS para os pontos de referência
    // Nota: Esta parte é conceitual para um ambiente Web.
    // Em React Native puro, animações de pontos seriam feitas com `Animated` API.
    // Para este exemplo, estamos simulando a intenção de animação via estilos.
    // O código acima já inclui estilos inline para 'animation' que seriam
    // processados se este fosse um app web com um bundler CSS.
    // Para manter a compatibilidade com React Native, omitimos a definição
    // direta de keyframes aqui, confiando que o React Native cuidará disso
    // se a plataforma de destino suportar.
    // Se este código fosse para React Web, os keyframes seriam definidos em um arquivo CSS.

    // Placeholder para estilos adicionais que seriam necessários para Web
    modalOverlay: {},
    modalContainer: {},
    header: {},
    title: {},
    closeButton: {},
    cameraContainer: {},
    video: {},
    overlay: {},
    faceGuide: {},
    faceCircle: {},
    landmarks: {},
    landmarkPoint: {},
    statusContainer: {},
    statusMessage: {},
    progressContainer: {},
    progressBar: {},
    progressFill: {},
    progressText: {},
    controls: {},
    scanButton: {},
    scanButtonDisabled: {},
    instructions: {},
    instructionItem: {},

});

export default FacialScannerModal;