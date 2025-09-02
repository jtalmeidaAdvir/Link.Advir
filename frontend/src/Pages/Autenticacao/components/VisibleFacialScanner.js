
import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { FaCamera, FaStop, FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const VisibleFacialScanner = ({ onScanComplete, isScanning, onStartScan, onStopScan, t }) => {
    const [scanProgress, setScanProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [faceDetected, setFaceDetected] = useState(false);
    const [faceQuality, setFaceQuality] = useState('none'); // none, poor, good, excellent
    const [cameraReady, setCameraReady] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const scanIntervalRef = useRef(null);
    const noFaceTimeoutRef = useRef(null);
    const scanCompletedRef = useRef(false);
    const lastScanTimeRef = useRef(0);
    const detectingRef = useRef(false);
    const finishedRef = useRef(false);

    const clearNoFaceTimeout = () => {
        if (noFaceTimeoutRef.current) {
            clearTimeout(noFaceTimeoutRef.current);
            noFaceTimeoutRef.current = null;
        }
    };

    const startNoFaceTimeout = () => {
        clearNoFaceTimeout();
        noFaceTimeoutRef.current = setTimeout(() => {
            setStatusMessage('Tempo esgotado. Nenhuma face detectada.');
            setScanProgress(0);
            setFaceDetected(false);
            setFaceQuality('none');
            if (onStopScan) onStopScan();
        }, 10000);
    };

    useEffect(() => {
        if (isScanning) {
            setScanProgress(0);
            setStatusMessage('Iniciando reconhecimento facial...');
            setShowCamera(true);
            initializeFaceAPI();
        } else {
            cleanup();
        }
        return cleanup;
    }, [isScanning]);

    useEffect(() => {
        if (isScanning && modelsLoaded && cameraReady) {
            startFacialScan();
        }
    }, [isScanning, modelsLoaded, cameraReady]);

    const cleanup = () => {
        clearNoFaceTimeout();
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        stopCamera();
        setStatusMessage('');
        setScanProgress(0);
        setFaceDetected(false);
        setFaceQuality('none');
        setCameraReady(false);
        setModelsLoaded(false);
        setShowCamera(false);
        scanCompletedRef.current = false;
        lastScanTimeRef.current = 0;
        detectingRef.current = false;
        finishedRef.current = false;
    };

    const initializeFaceAPI = async () => {
        try {
            setStatusMessage('Carregando modelos de IA...');
            setScanProgress(20);

            const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);

            setScanProgress(60);
            setModelsLoaded(true);
            setStatusMessage('Iniciando câmera...');
            await startCamera();

        } catch (error) {
            console.error('Erro ao carregar modelos:', error);
            setStatusMessage('Erro no carregamento. Tente novamente.');
            setTimeout(() => { if (onStopScan) onStopScan(); }, 2000);
        }
    };

    const startCamera = async () => {
        try {
            setScanProgress(80);
            setStatusMessage('Conectando câmera...');

            const constraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 30 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            const videoEl = videoRef.current;
            
            if (!videoEl) return;

            videoEl.srcObject = stream;
            streamRef.current = stream;

            await new Promise((resolve) => {
                videoEl.onloadedmetadata = () => {
                    videoEl.play().then(() => {
                        setCameraReady(true);
                        setScanProgress(95);
                        setStatusMessage('Posicione seu rosto na área indicada');
                        resolve();
                    });
                };
            });

        } catch (error) {
            console.error('Erro na câmera:', error);
            setStatusMessage('Erro: Câmera indisponível.');
            setTimeout(() => { if (onStopScan) onStopScan(); }, 2000);
        }
    };

    const stopCamera = () => {
        const videoEl = videoRef.current;
        if (videoEl) {
            videoEl.pause();
            videoEl.srcObject = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraReady(false);
    };

    const startFacialScan = async () => {
        console.log('Iniciando scan facial...');
        setScanProgress(98);
        setStatusMessage('Procurando face...');
        startNoFaceTimeout();

        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
        }
        
        finishedRef.current = false;
        detectingRef.current = false;

        const scans = [];
        const maxScans = 5;
        let currentScan = 0;
        let consecutiveFailures = 0;
        const maxFailures = 8;

        const detectionOptions = new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.5
        });

        scanIntervalRef.current = setInterval(async () => {
            if (!isScanning || finishedRef.current) return;
            if (detectingRef.current) return;
            
            detectingRef.current = true;

            try {
                const video = videoRef.current;
                if (!video || video.videoWidth === 0) {
                    detectingRef.current = false;
                    return;
                }

                const detections = await faceapi
                    .detectAllFaces(video, detectionOptions)
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (detections.length === 1) {
                    clearNoFaceTimeout();
                    consecutiveFailures = 0;
                    setFaceDetected(true);
                    
                    const detection = detections[0];
                    const confidence = detection.detection.score;
                    
                    // Definir qualidade baseada na confiança
                    if (confidence > 0.8) {
                        setFaceQuality('excellent');
                    } else if (confidence > 0.6) {
                        setFaceQuality('good');
                    } else {
                        setFaceQuality('poor');
                    }
                    
                    if (confidence > 0.6) {
                        scans.push({
                            confidence: confidence,
                            descriptor: detection.descriptor,
                            landmarks: detection.landmarks
                        });
                        currentScan++;
                        
                        const progress = 98 + (currentScan / maxScans) * 2;
                        setScanProgress(progress);
                        setStatusMessage(`Capturando... ${currentScan}/${maxScans}`);

                        if (currentScan >= maxScans && !finishedRef.current) {
                            finishedRef.current = true;
                            clearInterval(scanIntervalRef.current);
                            scanIntervalRef.current = null;
                            await completeFacialScan(scans);
                            return;
                        }
                    } else {
                        setStatusMessage('Melhore o posicionamento do rosto');
                    }
                } else if (detections.length > 1) {
                    setFaceDetected(false);
                    setFaceQuality('none');
                    setStatusMessage('Múltiplas faces detectadas. Apenas uma pessoa deve estar visível.');
                    consecutiveFailures++;
                } else {
                    setFaceDetected(false);
                    setFaceQuality('none');
                    setStatusMessage('Posicione seu rosto na área indicada');
                    consecutiveFailures++;
                }

                if (consecutiveFailures > maxFailures) {
                    clearInterval(scanIntervalRef.current);
                    scanIntervalRef.current = null;
                    setStatusMessage('Face não detectada. Tente novamente.');
                    setTimeout(() => { if (onStopScan) onStopScan(); }, 1500);
                    return;
                }
            } catch (error) {
                console.error('Erro na detecção:', error);
                consecutiveFailures++;
            } finally {
                detectingRef.current = false;
            }
        }, 200);
    };

    const completeFacialScan = async (scans) => {
        try {
            const now = Date.now();
            if (scanCompletedRef.current || (now - lastScanTimeRef.current) < 2000) {
                console.log('Scan já completado ou muito recente');
                return;
            }
            
            scanCompletedRef.current = true;
            lastScanTimeRef.current = now;
            clearNoFaceTimeout();

            if (!scans.length) {
                setStatusMessage('Nenhuma face capturada.');
                setTimeout(() => { if (onStopScan) onStopScan(); }, 1500);
                return;
            }

            const avgConfidence = scans.reduce((sum, scan) => sum + scan.confidence, 0) / scans.length;
            
            if (avgConfidence < 0.6) {
                setStatusMessage('Qualidade insuficiente. Tente novamente.');
                scanCompletedRef.current = false;
                setTimeout(() => { if (onStopScan) onStopScan(); }, 1500);
                return;
            }

            setStatusMessage(`Processando... (${Math.round(avgConfidence * 100)}%)`);
            setScanProgress(100);
            setFaceQuality('excellent');

            const canvas = canvasRef.current;
            const video = videoRef.current;
            
            if (canvas && video) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                const facialData = createBiometricData(imageDataUrl, scans, avgConfidence);

                setTimeout(() => {
                    if (facialData) {
                        onScanComplete(facialData);
                        if (onStopScan) onStopScan();
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Erro ao completar scan:', error);
            scanCompletedRef.current = false;
            setTimeout(() => { if (onStopScan) onStopScan(); }, 1500);
        }
    };

    const createBiometricData = (imageDataUrl, scans, avgConfidence) => {
        const avgDescriptor = calculateAverageDescriptor(scans);

        let securityLevel = 'HIGH';
        if (avgConfidence < 0.7) securityLevel = 'MEDIUM';
        if (avgConfidence < 0.6) securityLevel = 'LOW';

        const features = {
            faceDetected: true,
            confidence: avgConfidence,
            algorithm: 'face-api.js',
            version: '1.0.0',
            biometricTemplate: {
                descriptor: avgDescriptor,
                sampleCount: scans.length,
                qualityScore: avgConfidence
            },
            scanQuality: {
                confidence: avgConfidence,
                sampleCount: scans.length,
                securityLevel: securityLevel,
                processingTime: Date.now() - lastScanTimeRef.current
            },
            timestamp: new Date().toISOString(),
            validationPassed: true,
            encoding: avgDescriptor
        };

        return {
            type: 'facial',
            data: JSON.stringify(features),
            imageData: imageDataUrl.split(',')[1]
        };
    };

    const calculateAverageDescriptor = (scans) => {
        if (scans.length === 0 || !scans[0].descriptor) return null;

        const descriptorLength = scans[0].descriptor.length;
        const avgDescriptor = new Array(descriptorLength).fill(0);

        scans.forEach(scan => {
            if (scan.descriptor) {
                scan.descriptor.forEach((value, index) => {
                    avgDescriptor[index] += value;
                });
            }
        });

        return avgDescriptor.map(sum => sum / scans.length);
    };

    const getFaceGuideColor = () => {
        switch (faceQuality) {
            case 'excellent': return '#28a745';
            case 'good': return '#ffc107';
            case 'poor': return '#fd7e14';
            default: return '#6c757d';
        }
    };

    const getFaceGuideAnimation = () => {
        if (faceDetected && faceQuality !== 'none') {
            return 'pulse 1s ease-in-out infinite';
        }
        return 'none';
    };

    if (!showCamera) return null;

    return (
        <div style={styles.overlay}>
            <style jsx>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes scanProgress {
                    0% { stroke-dashoffset: 251.2; }
                    100% { stroke-dashoffset: ${251.2 - (scanProgress / 100) * 251.2}; }
                }
                .face-guide-ring {
                    animation: ${getFaceGuideAnimation()};
                }
                .progress-ring {
                    transform: rotate(-90deg);
                    animation: scanProgress 0.5s ease-out forwards;
                }
            `}</style>
            
            <div style={styles.container}>
                {/* Header com botão de fechar */}
                <div style={styles.header}>
                    <h3 style={styles.title}>Reconhecimento Facial</h3>
                    <button 
                        style={styles.closeButton}
                        onClick={() => onStopScan && onStopScan()}
                        aria-label="Fechar"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Área da câmera */}
                <div style={styles.cameraContainer}>
                    <video
                        ref={videoRef}
                        style={styles.video}
                        autoPlay
                        playsInline
                        muted
                    />
                    
                    {/* Guia para posicionamento do rosto */}
                    <div style={styles.faceGuideContainer}>
                        <div 
                            className="face-guide-ring"
                            style={{
                                ...styles.faceGuide,
                                borderColor: getFaceGuideColor(),
                                boxShadow: `0 0 20px ${getFaceGuideColor()}33`
                            }}
                        >
                            {/* Anel de progresso */}
                            {scanProgress > 95 && (
                                <svg style={styles.progressRing} width="200" height="200">
                                    <circle
                                        className="progress-ring"
                                        cx="100"
                                        cy="100"
                                        r="40"
                                        fill="transparent"
                                        stroke="#1792FE"
                                        strokeWidth="4"
                                        strokeDasharray="251.2"
                                        strokeDashoffset="251.2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            )}
                            
                            {/* Ícone central */}
                            <div style={styles.faceIcon}>
                                {faceDetected ? (
                                    <FaCheckCircle 
                                        style={{ 
                                            color: getFaceGuideColor(), 
                                            fontSize: '2rem' 
                                        }} 
                                    />
                                ) : (
                                    <FaCamera 
                                        style={{ 
                                            color: '#6c757d', 
                                            fontSize: '2rem' 
                                        }} 
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Indicadores de qualidade */}
                    <div style={styles.qualityIndicators}>
                        <div style={{
                            ...styles.qualityDot,
                            backgroundColor: faceQuality === 'excellent' ? '#28a745' : '#e9ecef'
                        }} />
                        <div style={{
                            ...styles.qualityDot,
                            backgroundColor: ['good', 'excellent'].includes(faceQuality) ? '#ffc107' : '#e9ecef'
                        }} />
                        <div style={{
                            ...styles.qualityDot,
                            backgroundColor: ['poor', 'good', 'excellent'].includes(faceQuality) ? '#fd7e14' : '#e9ecef'
                        }} />
                    </div>
                </div>

                {/* Status e instruções */}
                <div style={styles.statusContainer}>
                    <div style={styles.statusMessage}>
                        {statusMessage}
                    </div>
                    
                    <div style={styles.progressContainer}>
                        <div style={styles.progressBar}>
                            <div 
                                style={{
                                    ...styles.progressFill,
                                    width: `${scanProgress}%`
                                }}
                            />
                        </div>
                        <span style={styles.progressText}>{Math.round(scanProgress)}%</span>
                    </div>

                    {/* Instruções */}
                    <div style={styles.instructions}>
                        <div style={styles.instructionItem}>
                            <FaCheckCircle style={styles.instructionIcon} />
                            Mantenha o rosto bem iluminado
                        </div>
                        <div style={styles.instructionItem}>
                            <FaCheckCircle style={styles.instructionIcon} />
                            Olhe diretamente para a câmera
                        </div>
                        <div style={styles.instructionItem}>
                            <FaCheckCircle style={styles.instructionIcon} />
                            Apenas uma pessoa deve estar visível
                        </div>
                    </div>
                </div>

                {/* Botão de cancelar */}
                <div style={styles.buttonContainer}>
                    <button 
                        style={styles.cancelButton}
                        onClick={() => onStopScan && onStopScan()}
                    >
                        <FaStop style={{ marginRight: '0.5rem' }} />
                        Cancelar
                    </button>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
            />
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem',
    },
    container: {
        backgroundColor: 'white',
        borderRadius: '20px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem',
        borderBottom: '1px solid #e9ecef',
        backgroundColor: '#f8f9fa',
    },
    title: {
        margin: 0,
        color: '#343a40',
        fontSize: '1.25rem',
        fontWeight: '600',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '1.25rem',
        color: '#6c757d',
        cursor: 'pointer',
        padding: '0.5rem',
        borderRadius: '50%',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraContainer: {
        position: 'relative',
        aspectRatio: '4/3',
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    faceGuideContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
    },
    faceGuide: {
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        border: '4px solid #6c757d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        position: 'relative',
        transition: 'all 0.3s ease',
    },
    progressRing: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
    },
    faceIcon: {
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qualityIndicators: {
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '0.5rem',
        zIndex: 2,
    },
    qualityDot: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: '2px solid white',
        transition: 'all 0.3s ease',
    },
    statusContainer: {
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #e9ecef',
    },
    statusMessage: {
        textAlign: 'center',
        fontSize: '1rem',
        fontWeight: '500',
        color: '#495057',
        marginBottom: '1rem',
        minHeight: '1.5rem',
    },
    progressContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem',
    },
    progressBar: {
        flex: 1,
        height: '8px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#1792FE',
        borderRadius: '4px',
        transition: 'width 0.3s ease',
    },
    progressText: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#495057',
        minWidth: '3rem',
        textAlign: 'right',
    },
    instructions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    instructionItem: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '0.875rem',
        color: '#6c757d',
        gap: '0.5rem',
    },
    instructionIcon: {
        color: '#28a745',
        fontSize: '0.75rem',
    },
    buttonContainer: {
        padding: '1rem 1.5rem',
        borderTop: '1px solid #e9ecef',
        display: 'flex',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '25px',
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    },
};

export default VisibleFacialScanner;
