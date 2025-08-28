
import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const InvisibleFacialScanner = ({ onScanComplete, isScanning, onStartScan, onStopScan, t }) => {
    const [scanProgress, setScanProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (isScanning) {
            initializeFaceAPI();
        } else {
            stopCamera();
            setStatusMessage('');
            setScanProgress(0);
        }

        return () => {
            stopCamera();
        };
    }, [isScanning]);

    const initializeFaceAPI = async () => {
        try {
            setStatusMessage('Carregando modelos de detecção facial...');

            const CDN_MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(CDN_MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(CDN_MODEL_URL)
            ]);

            setModelsLoaded(true);
            setStatusMessage('Modelos carregados! Iniciando câmera...');
            await startCamera();

        } catch (error) {
            console.error('Erro ao carregar modelos face-api.js:', error);
            setStatusMessage('Erro ao carregar modelos de detecção facial.');
            
            try {
                setStatusMessage('Tentando modo básico de detecção...');
                
                await faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_URL);
                
                setModelsLoaded(true);
                setStatusMessage('Modo básico carregado! Iniciando câmera...');
                await startCamera();
                
            } catch (fallbackError) {
                console.error('Erro no fallback:', fallbackError);
                setStatusMessage('Não foi possível carregar os modelos de detecção facial. Verifique sua conexão.');
                if (onStopScan) onStopScan();
            }
        }
    };

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

                videoRef.current.onloadedmetadata = () => {
                    setCameraReady(true);
                    setStatusMessage('Câmera ativa. Iniciando scan facial...');
                    if (modelsLoaded) {
                        startScan();
                    }
                };
            }
        } catch (error) {
            console.error('Erro ao acessar câmera:', error);
            setCameraReady(false);
            setStatusMessage('Erro ao acessar a câmera. Verifique as permissões.');
            if (onStopScan) onStopScan();
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setCameraReady(false);
        }
    };

    const startScan = async () => {
        if (!cameraReady || !modelsLoaded) {
            setStatusMessage('Sistema ainda não está pronto. Aguarde o carregamento.');
            return;
        }

        const video = videoRef.current;
        if (!video) return;

        let detections;
        try {
            detections = await faceapi
                .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();
        } catch (error) {
            try {
                detections = await faceapi
                    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks();
            } catch (landmarkError) {
                detections = await faceapi
                    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
            }
        }

        if (detections.length === 0) {
            setStatusMessage('Face não detectada. Posicione-se em frente à câmera.');
            setTimeout(startScan, 1000);
            return;
        }
        if (detections.length > 1) {
            setStatusMessage('Múltiplas faces detectadas. Apenas uma pessoa permitida.');
            setTimeout(startScan, 1000);
            return;
        }

        const detection = detections[0];
        const confidence = detection.detection.score;
        const qualityScore = calculateFaceQuality(detection, video);

        if (confidence < 0.6 || qualityScore < 0.4) {
            setStatusMessage(`Qualidade insuficiente (${Math.round(confidence * 100)}%). Ajuste seu posicionamento.`);
            setTimeout(startScan, 1000);
            return;
        }

        setStatusMessage('Face detectada! Iniciando captura biométrica...');

        const scans = [];
        const totalScans = 8;
        let currentScan = 0;
        let failedScans = 0;

        const interval = setInterval(async () => {
            let scanDetection;
            try {
                scanDetection = await faceapi
                    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptors();
            } catch (error) {
                try {
                    scanDetection = await faceapi
                        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                        .withFaceLandmarks();
                } catch (landmarkError) {
                    scanDetection = await faceapi
                        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
                }
            }

            if (scanDetection.length > 0) {
                const currentDetection = scanDetection[0];
                const currentConfidence = currentDetection.detection.score;
                const currentQuality = calculateFaceQuality(currentDetection, video);

                if (currentConfidence > 0.6 && currentQuality > 0.4) {
                    scans.push({
                        confidence: currentConfidence,
                        qualityScore: currentQuality,
                        landmarks: currentDetection.landmarks,
                        descriptor: currentDetection.descriptor,
                        expressions: currentDetection.expressions
                    });
                    currentScan++;

                    const progress = (currentScan / totalScans) * 100;
                    setScanProgress(progress);

                    if (progress < 25) {
                        setStatusMessage(`Capturando dados biométricos ${currentScan}/${totalScans}`);
                    } else if (progress < 50) {
                        setStatusMessage(`Analisando características faciais... ${currentScan}/${totalScans}`);
                    } else if (progress < 75) {
                        setStatusMessage(`Gerando template biométrico... ${currentScan}/${totalScans}`);
                    } else {
                        setStatusMessage(`Finalizando captura... ${currentScan}/${totalScans}`);
                    }

                    if (currentScan >= totalScans) {
                        clearInterval(interval);
                        completeScan(scans);
                    }
                } else {
                    failedScans++;
                    setStatusMessage(`Ajustando captura... (${Math.round(currentConfidence * 100)}%)`);
                }
            } else {
                failedScans++;
                setStatusMessage('Face não detectada nesta amostra. Ajustando...');
            }

            if (failedScans > 5) {
                clearInterval(interval);
                setStatusMessage('Qualidade da captura insuficiente. Clique para tentar novamente.');
                setScanProgress(0);
                if (onStopScan) onStopScan();
            }
        }, 500);
    };

    const calculateFaceQuality = (detection, video) => {
        const { width, height } = video;
        const box = detection.detection.box;

        const faceCenterX = box.x + box.width / 2;
        const faceCenterY = box.y + box.height / 2;
        const imageCenterX = width / 2;
        const imageCenterY = height / 2;
        const centerDistance = Math.sqrt(Math.pow(faceCenterX - imageCenterX, 2) + Math.pow(faceCenterY - imageCenterY, 2));
        const maxDistance = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
        const centeringScore = Math.max(0.3, 1 - (centerDistance / maxDistance));

        const faceArea = box.width * box.height;
        const videoArea = width * height;
        const faceRatio = faceArea / videoArea;
        let sizeScore = 0;
        if (faceRatio > 0.02 && faceRatio < 0.8) sizeScore = 1.0;
        else if (faceRatio > 0.01 && faceRatio < 0.9) sizeScore = 0.8;
        else sizeScore = 0.5;

        const landmarkQuality = detection.landmarks ? 1.0 : 0.7;
        const confidenceScore = detection.detection.score;

        return Math.max(0.4, (centeringScore * 0.2 + sizeScore * 0.3 + landmarkQuality * 0.2 + confidenceScore * 0.3));
    };

    const completeScan = async (scans) => {
        try {
            const avgMetrics = calculateAverageDetections(scans);
            const overallConfidence = avgMetrics.avgConfidence;

            if (overallConfidence < 0.75) {
                setStatusMessage(`Confiança insuficiente (${Math.round(overallConfidence * 100)}%). Clique para tentar novamente.`);
                setScanProgress(0);
                if (onStopScan) onStopScan();
                return;
            }

            setStatusMessage(`Processando template biométrico... (${Math.round(overallConfidence * 100)}%)`);

            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (canvas && video) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

                const facialData = await processFacialBiometrics(imageDataUrl, avgMetrics, overallConfidence);

                setStatusMessage(`Captura concluída! Confiança: ${Math.round(overallConfidence * 100)}%`);
                setScanProgress(100);

                setTimeout(() => {
                    onScanComplete(facialData);
                    if (onStopScan) onStopScan();
                }, 1500);
            }
        } catch (error) {
            console.error('Erro ao completar scan:', error);
            setStatusMessage('Erro ao processar dados faciais. Clique para tentar novamente.');
            setScanProgress(0);
            if (onStopScan) onStopScan();
        }
    };

    const calculateAverageDetections = (scans) => {
        if (scans.length === 0) return null;

        let totalConfidence = 0;
        let totalQuality = 0;
        const allDescriptors = [];
        const allLandmarks = [];

        scans.forEach(scan => {
            totalConfidence += scan.confidence;
            totalQuality += scan.qualityScore;
            if (scan.descriptor) allDescriptors.push(scan.descriptor);
            if (scan.landmarks) allLandmarks.push(scan.landmarks);
        });

        const count = scans.length;
        const avgDescriptor = calculateAverageDescriptor(allDescriptors);
        const avgLandmarks = calculateAverageLandmarks(allLandmarks);

        return {
            avgConfidence: totalConfidence / count,
            avgQuality: totalQuality / count,
            sampleCount: count,
            consistency: calculateDescriptorConsistency(allDescriptors),
            avgDescriptor: avgDescriptor,
            avgLandmarks: avgLandmarks
        };
    };

    const calculateAverageDescriptor = (descriptors) => {
        if (descriptors.length === 0) return null;
        const descriptorLength = descriptors[0].length;
        const avgDescriptor = new Array(descriptorLength).fill(0);

        descriptors.forEach(descriptor => {
            descriptor.forEach((value, index) => {
                avgDescriptor[index] += value;
            });
        });

        return avgDescriptor.map(sum => sum / descriptors.length);
    };

    const calculateAverageLandmarks = (landmarksArray) => {
        if (landmarksArray.length === 0) return null;

        const landmarkCount = landmarksArray[0].positions.length;
        const avgLandmarks = Array.from({ length: landmarkCount }, () => ({ x: 0, y: 0 }));

        landmarksArray.forEach(landmarks => {
            landmarks.positions.forEach((pos, index) => {
                avgLandmarks[index].x += pos.x;
                avgLandmarks[index].y += pos.y;
            });
        });

        return {
            positions: avgLandmarks.map(p => ({ x: p.x / landmarksArray.length, y: p.y / landmarksArray.length }))
        };
    };

    const calculateDescriptorConsistency = (descriptors) => {
        if (descriptors.length < 2) return 1.0;

        const avgDescriptor = calculateAverageDescriptor(descriptors);
        let totalVariance = 0;

        descriptors.forEach(descriptor => {
            let variance = 0;
            descriptor.forEach((value, index) => {
                variance += Math.pow(value - avgDescriptor[index], 2);
            });
            totalVariance += variance / descriptor.length;
        });

        const avgVariance = totalVariance / descriptors.length;
        return Math.max(0, Math.min(1, 1 - (avgVariance / 10)));
    };

    const processFacialBiometrics = async (imageDataUrl, avgMetrics, overallConfidence) => {
        const features = {
            faceDetected: true,
            confidence: overallConfidence,
            qualityScore: avgMetrics.avgQuality,
            algorithm: 'face-api.js',
            version: '1.0.0',
            biometricTemplate: {
                descriptor: avgMetrics.avgDescriptor,
                landmarks: avgMetrics.avgLandmarks,
                consistency: avgMetrics.consistency,
                sampleCount: avgMetrics.sampleCount
            },
            scanQuality: {
                confidence: overallConfidence,
                qualityScore: avgMetrics.avgQuality,
                consistency: avgMetrics.consistency,
                sampleCount: avgMetrics.sampleCount,
                securityLevel: avgMetrics.consistency > 0.8 ? 'HIGH' : avgMetrics.consistency > 0.6 ? 'MEDIUM' : 'LOW'
            },
            timestamp: new Date().toISOString(),
            validationPassed: true,
            captureMethod: 'face-api.js',
            encoding: avgMetrics.avgDescriptor,
            landmarks: convertLandmarksToLegacyFormat(avgMetrics.avgLandmarks)
        };

        return {
            type: 'facial',
            data: JSON.stringify(features),
            imageData: imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl
        };
    };

    const convertLandmarksToLegacyFormat = (landmarks) => {
        if (!landmarks || !landmarks.positions || landmarks.positions.length === 0) {
            const video = videoRef.current;
            if (!video) return null;
            const centerX = video.videoWidth / 2;
            const centerY = video.videoHeight / 2;
            return {
                eyes: { left: [centerX - video.videoWidth * 0.1, centerY - video.videoHeight * 0.1], right: [centerX + video.videoWidth * 0.1, centerY - video.videoHeight * 0.1] },
                nose: [centerX, centerY],
                mouth: [centerX, centerY + video.videoHeight * 0.1]
            };
        }

        const positions = landmarks.positions;
        return {
            eyes: {
                left: [positions[36].x, positions[36].y],
                right: [positions[45].x, positions[45].y]
            },
            nose: [positions[30].x, positions[30].y],
            mouth: [positions[51].x, positions[51].y]
        };
    };

    return (
        <div>
            {/* Video e canvas ocultos */}
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

            {/* Status do scan */}
            {isScanning && (
                <div style={{
                    padding: '15px',
                    backgroundColor: 'rgba(23, 146, 254, 0.1)',
                    borderRadius: '8px',
                    marginTop: '10px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        color: '#1792FE',
                        fontSize: '14px',
                        marginBottom: '8px',
                        fontWeight: 'bold'
                    }}>
                        {statusMessage}
                    </div>
                    
                    {scanProgress > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '8px'
                        }}>
                            <div style={{
                                flexGrow: 1,
                                height: '6px',
                                backgroundColor: 'rgba(23, 146, 254, 0.2)',
                                borderRadius: '3px',
                                marginRight: '8px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    backgroundColor: '#1792FE',
                                    borderRadius: '3px',
                                    width: `${scanProgress}%`,
                                    transition: 'width 0.2s ease-in-out'
                                }} />
                            </div>
                            <span style={{
                                color: '#1792FE',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}>
                                {Math.round(scanProgress)}%
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default InvisibleFacialScanner;
