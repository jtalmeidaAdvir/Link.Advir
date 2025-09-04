
import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { createPortal } from 'react-dom';

const InvisibleFacialScanner = ({ onScanComplete, isScanning, onStartScan, onStopScan, t }) => {
    const [scanProgress, setScanProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
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
            if (onStopScan) onStopScan();
        }, 8000);
    };

    // HUD otimizado
    const FaceHUD = ({ progress = 0, onCancel }) => {
        if (typeof document === 'undefined') return null;
        return createPortal(
            <>
                <style>{`
                    .hud-wrap{position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:9999;}
                    .hud-badge{
                        width:50px; height:50px; border-radius:50%;
                        background:rgba(0,0,0,0.8); backdrop-filter:blur(8px);
                        display:flex; align-items:center; justify-content:center;
                        box-shadow:0 4px 12px rgba(0,0,0,0.3); position:relative; cursor:pointer;
                    }
                    .hud-face{font-size:22px; color:#fff;}
                    .hud-ring{
                        position:absolute; top:-3px; left:-3px; right:-3px; bottom:-3px;
                        border-radius:50%; border:3px solid transparent;
                        background: conic-gradient(#1792FE ${progress * 3.6}deg, rgba(255,255,255,0.2) 0deg);
                        mask: radial-gradient(farthest-side, transparent calc(100% - 3px), black 0);
                        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), black 0);
                    }
                `}</style>
                <div className="hud-wrap">
                    <div className="hud-badge" onClick={onCancel}>
                        <div className="hud-ring" />
                        <div className="hud-face" aria-hidden="true">
  <svg width="20" height="20" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor"/>
    <circle cx="9" cy="10" r="1" fill="currentColor"/>
    <circle cx="15" cy="10" r="1" fill="currentColor"/>
    <path d="M9 14 Q12 18 15 14" stroke="currentColor" strokeLinecap="round" fill="none"/>
  </svg>
</div>

                    </div>
                </div>
            </>,
            document.body
        );
    };

    useEffect(() => {
        if (isScanning) {
            setScanProgress(0);
            setStatusMessage('Iniciando reconhecimento facial...');
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
        setCameraReady(false);
        setModelsLoaded(false);
        scanCompletedRef.current = false;
        lastScanTimeRef.current = 0;
        detectingRef.current = false;
        finishedRef.current = false;
    };

    const initializeFaceAPI = async () => {
        try {
            setStatusMessage('Carregando modelos...');
            setScanProgress(20);

            const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

            // Carregar modelos essenciais
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
                        setStatusMessage('Câmera pronta!');
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
        const maxScans = 3;
        let currentScan = 0;
        let consecutiveFailures = 0;
        const maxFailures = 8;

        // Configurações otimizadas
        const detectionOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: 160,
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
                    
                    const detection = detections[0];
                    
                    if (detection.detection.score > 0.6) {
                        scans.push({
                            confidence: detection.detection.score,
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
                    }
                } else if (detections.length > 1) {
                    setStatusMessage('Múltiplas faces detectadas. Apenas uma pessoa deve estar visível.');
                    consecutiveFailures++;
                } else {
                    consecutiveFailures++;
                }

                if (consecutiveFailures > maxFailures) {
                    clearInterval(scanIntervalRef.current);
                    scanIntervalRef.current = null;
                    setStatusMessage('Face não detectada consistentemente.');
                    setTimeout(() => { if (onStopScan) onStopScan(); }, 1500);
                    return;
                }
            } catch (error) {
                console.error('Erro na detecção:', error);
                consecutiveFailures++;
            } finally {
                detectingRef.current = false;
            }
        }, 100); // Intervalo otimizado para 200ms
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
            
            if (avgConfidence > 0.8 && currentScan >= 2) {
                finishedRef.current = true;
                clearInterval(scanIntervalRef.current);
                await completeFacialScan(scans);
                return;
            }


            setStatusMessage(`Processando... (${Math.round(avgConfidence * 100)}%)`);
            setScanProgress(100);

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

    return (
        <div>
            <video
                ref={videoRef}
                style={{ display: 'none' }}
                autoPlay
                playsInline
                muted
            />
            <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
            />

            {isScanning && (
                <FaceHUD
                    progress={Math.round(scanProgress)}
                    onCancel={() => onStopScan && onStopScan()}
                />
            )}
        </div>
    );
};

export default InvisibleFacialScanner;
