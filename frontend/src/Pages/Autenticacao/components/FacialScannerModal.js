
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

const FacialScannerModal = ({ visible, onClose, onScanComplete, t }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (visible) {
            startCamera();
        } else {
            stopCamera();
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
            }
        } catch (error) {
            console.error('Erro ao acessar câmera:', error);
            alert('Erro ao acessar a câmera. Verifique as permissões.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const startScan = () => {
        setIsScanning(true);
        setScanProgress(0);

        // Simular progresso do scan
        const interval = setInterval(() => {
            setScanProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    completeScan();
                    return 100;
                }
                return prev + 10;
            });
        }, 200);
    };

    const completeScan = async () => {
        try {
            // Capturar frame da câmera
            const canvas = canvasRef.current;
            const video = videoRef.current;
            
            if (canvas && video) {
                const ctx = canvas.getContext('2d');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);
                
                // Converter para base64
                const imageData = canvas.toDataURL('image/jpeg', 0.8);
                
                // Processar dados biométricos faciais
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
            alert('Erro ao processar dados faciais. Tente novamente.');
        }
    };

    const processFacialBiometrics = async (imageData) => {
        // Simular processamento de características faciais
        // Em produção, aqui seria usado um algoritmo de reconhecimento facial
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
            imageData: imageData.split(',')[1] // Remove data:image/jpeg;base64,
        };
    };

    const generateFaceEncoding = (imageData) => {
        // Gerar encoding único baseado na imagem
        // Em produção, usar algoritmo real de face encoding
        const hash = btoa(imageData.slice(-100));
        return Array.from({ length: 128 }, (_, i) => 
            Math.sin(hash.charCodeAt(i % hash.length) + i) * 100
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Scanner Facial</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.cameraContainer}>
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
                    
                    <View style={styles.overlay}>
                        <View style={styles.faceGuide}>
                            <Text style={styles.guideText}>
                                Posicione o rosto dentro do círculo
                            </Text>
                        </View>
                    </View>
                </View>

                {isScanning && (
                    <View style={styles.progressContainer}>
                        <Text style={styles.progressText}>
                            Processando... {scanProgress}%
                        </Text>
                        <View style={styles.progressBar}>
                            <View 
                                style={[
                                    styles.progressFill,
                                    { width: `${scanProgress}%` }
                                ]}
                            />
                        </View>
                    </View>
                )}

                <View style={styles.controls}>
                    <TouchableOpacity
                        style={[
                            styles.scanButton,
                            isScanning && styles.scanButtonDisabled
                        ]}
                        onPress={startScan}
                        disabled={isScanning}
                    >
                        <Text style={styles.scanButtonText}>
                            {isScanning ? 'Processando...' : '📷 Iniciar Scan'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.instructions}>
                    <Text style={styles.instructionText}>
                        • Mantenha o rosto bem iluminado
                    </Text>
                    <Text style={styles.instructionText}>
                        • Olhe diretamente para a câmera
                    </Text>
                    <Text style={styles.instructionText}>
                        • Mantenha-se imóvel durante o scan
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#1792FE',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    closeButton: {
        padding: 10,
    },
    closeText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cameraContainer: {
        flex: 1,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceGuide: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 3,
        borderColor: '#1792FE',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(23, 146, 254, 0.1)',
    },
    guideText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 'bold',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        borderRadius: 10,
    },
    progressContainer: {
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    progressText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
        marginBottom: 10,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 3,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#1792FE',
        borderRadius: 3,
    },
    controls: {
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    scanButton: {
        backgroundColor: '#1792FE',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    scanButtonDisabled: {
        backgroundColor: '#666',
    },
    scanButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    instructions: {
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    instructionText: {
        color: 'white',
        fontSize: 14,
        marginBottom: 5,
        textAlign: 'center',
    },
});

export default FacialScannerModal;
