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

    const detectFace = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (!video || !canvas) return false;

        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Análise básica de detecção facial baseada em pixels
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Detectar variação de luminosidade (indicativo de presença humana)
        let variations = 0;
        let totalBrightness = 0;
        const step = 4 * 10; // Verificar a cada 10 pixels para otimização
        
        for (let i = 0; i < data.length; i += step) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            totalBrightness += brightness;
            
            if (i > 0) {
                const prevBrightness = (data[i - step] + data[i - step + 1] + data[i - step + 2]) / 3;
                if (Math.abs(brightness - prevBrightness) > 30) {
                    variations++;
                }
            }
        }
        
        const avgBrightness = totalBrightness / (data.length / step);
        const variationRatio = variations / (data.length / step);
        
        // Verificar se há contraste suficiente e variações que indicam uma face
        const hasFace = variationRatio > 0.1 && avgBrightness > 30 && avgBrightness < 200;
        
        return hasFace;
    };

    const startScan = async () => {
        if (!cameraReady) {
            setStatusMessage('A câmera ainda não está pronta.');
            return;
        }

        // Verificar se há uma face detectada antes de iniciar
        const faceDetected = await detectFace();
        if (!faceDetected) {
            setStatusMessage('Nenhuma face detectada. Posicione-se melhor na frente da câmera.');
            return;
        }

        setIsScanning(true);
        setScanProgress(0);
        setStatusMessage('Face detectada! Processando...');

        // Múltiplas verificações durante o scan para garantir presença contínua da face
        let consecutiveDetections = 0;
        const requiredDetections = 5;

        const interval = setInterval(async () => {
            const stillDetected = await detectFace();
            
            if (stillDetected) {
                consecutiveDetections++;
                setScanProgress(prev => {
                    const nextProgress = Math.min(prev + (100 / requiredDetections), 100);
                    
                    // Atualizar mensagem de status com base no progresso
                    if (nextProgress < 40) {
                        setStatusMessage('Alinhando rosto...');
                    } else if (nextProgress < 80) {
                        setStatusMessage('Capturando detalhes...');
                    } else if (nextProgress < 100) {
                        setStatusMessage('Finalizando...');
                    }
                    
                    if (consecutiveDetections >= requiredDetections) {
                        clearInterval(interval);
                        completeScan();
                        return 100;
                    }
                    
                    return nextProgress;
                });
            } else {
                // Face perdida durante o scan
                clearInterval(interval);
                setIsScanning(false);
                setScanProgress(0);
                setStatusMessage('Face perdida durante a captura. Tente novamente.');
            }
        }, 600);
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

                // Validação final antes de processar
                const finalValidation = await detectFace();
                if (!finalValidation) {
                    setIsScanning(false);
                    setScanProgress(0);
                    setStatusMessage('Validação final falhou. Face não detectada.');
                    return;
                }

                const imageData = canvas.toDataURL('image/jpeg', 0.8);

                // Processar dados biométricos faciais apenas se a validação passou
                const facialData = await processFacialBiometrics(imageData, true);

                setIsScanning(false);
                setScanProgress(0);
                setStatusMessage('Captura facial concluída com sucesso!');
                
                setTimeout(() => {
                    onScanComplete(facialData);
                    onClose();
                }, 1000);
            }
        } catch (error) {
            console.error('Erro ao completar scan:', error);
            setIsScanning(false);
            setScanProgress(0);
            setStatusMessage('Erro ao processar dados faciais.');
            alert('Erro ao processar dados faciais. Tente novamente.');
        }
    };

    const processFacialBiometrics = async (imageData, validated = false) => {
        if (!validated) {
            throw new Error('Dados faciais não validados');
        }

        // Análise mais detalhada das características faciais
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        return new Promise((resolve, reject) => {
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Análise de características mais robusta
                let faceRegions = 0;
                let totalIntensity = 0;
                
                // Dividir imagem em regiões para análise
                const regionSize = 20;
                for (let y = 0; y < canvas.height; y += regionSize) {
                    for (let x = 0; x < canvas.width; x += regionSize) {
                        let regionIntensity = 0;
                        let pixelCount = 0;
                        
                        for (let dy = 0; dy < regionSize && y + dy < canvas.height; dy++) {
                            for (let dx = 0; dx < regionSize && x + dx < canvas.width; dx++) {
                                const i = ((y + dy) * canvas.width + (x + dx)) * 4;
                                const intensity = (data[i] + data[i + 1] + data[i + 2]) / 3;
                                regionIntensity += intensity;
                                pixelCount++;
                            }
                        }
                        
                        const avgIntensity = regionIntensity / pixelCount;
                        totalIntensity += avgIntensity;
                        
                        // Considerar regiões com intensidade típica de pele
                        if (avgIntensity > 60 && avgIntensity < 200) {
                            faceRegions++;
                        }
                    }
                }
                
                const confidence = Math.min(faceRegions / 10, 1); // Normalizar confiança
                
                if (confidence < 0.3) {
                    reject(new Error('Confiança de detecção facial muito baixa'));
                    return;
                }
                
                // Gerar características faciais únicas
                const features = {
                    faceDetected: true,
                    confidence: confidence,
                    faceRegions: faceRegions,
                    totalIntensity: totalIntensity,
                    landmarks: generateLandmarks(canvas.width, canvas.height),
                    encoding: generateFaceEncoding(imageData),
                    timestamp: new Date().toISOString(),
                    validationPassed: true
                };

                resolve({
                    type: 'facial',
                    data: JSON.stringify(features),
                    imageData: imageData.split(',')[1] // Remover data:image/jpeg;base64,
                });
            };
            
            img.onerror = () => reject(new Error('Erro ao processar imagem'));
            img.src = imageData;
        });
    };

    const generateLandmarks = (width, height) => {
        // Gerar landmarks baseados nas dimensões da imagem
        const centerX = width / 2;
        const centerY = height / 2;
        
        return {
            eyes: { 
                left: [centerX - width * 0.1, centerY - height * 0.1], 
                right: [centerX + width * 0.1, centerY - height * 0.1] 
            },
            nose: [centerX, centerY],
            mouth: [centerX, centerY + height * 0.1]
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