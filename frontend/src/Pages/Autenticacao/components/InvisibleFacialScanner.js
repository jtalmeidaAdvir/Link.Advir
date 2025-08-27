import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const InvisibleFacialScanner = ({ isActive, onScanComplete, onError }) => {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const scanningRef = useRef(false);

    useEffect(() => {
        if (isActive && !modelsLoaded) {
            initializeFaceAPI();
        } else if (!isActive) {
            stopCamera();
            resetState();
        }

        return () => {
            stopCamera();
        };
    }, [isActive]);

    // Auto-iniciar scan quando tudo estiver pronto
    useEffect(() => {
        if (modelsLoaded && cameraReady && isActive && !scanningRef.current) {
            // Aguardar um pouco para câmera estabilizar e então iniciar scan automaticamente
            setTimeout(() => {
                startScan();
            }, 2000);
        }
    }, [modelsLoaded, cameraReady, isActive]);

    const resetState = () => {
        setIsScanning(false);
        setModelsLoaded(false);
        setCameraReady(false);
        scanningRef.current = false;
    };

    const initializeFaceAPI = async () => {
        try {
            console.log('🔄 Carregando modelos invisíveis...');
            const CDN_MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(CDN_MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(CDN_MODEL_URL)
            ]);

            setModelsLoaded(true);
            console.log('✅ Modelos carregados! Iniciando câmera invisível...');
            await startCamera();

        } catch (error) {
            console.error('❌ Erro ao carregar modelos:', error);
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_URL);
                setModelsLoaded(true);
                await startCamera();
            } catch (fallbackError) {
                console.error('❌ Erro no fallback:', fallbackError);
                if (onError) onError('Não foi possível carregar os modelos de detecção facial.');
            }
        }
    };

    const startCamera = async () => {
        try {
            console.log('📷 Iniciando câmera invisível...');
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
                    console.log('✅ Câmera invisível iniciada');
                    setCameraReady(true);
                };
            }
        } catch (error) {
            console.error('❌ Erro ao acessar câmera invisível:', error);
            setCameraReady(false);
            if (onError) onError('Erro ao acessar a câmera invisível.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setCameraReady(false);
            scanningRef.current = false;
        }
    };

    const startScan = async () => {
        if (!cameraReady || !modelsLoaded || scanningRef.current) {
            return;
        }

        console.log('🔬 Iniciando scan facial invisível...');

        // Fazer uma detecção inicial para verificar se está tudo pronto
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

        // Se não há faces, aguardar um pouco e tentar novamente
        if (detections.length === 0) {
            console.log('👤 Aguardando face ser detectada...');
            setTimeout(startScan, 2000);
            return;
        }

        if (detections.length > 1) {
            console.log('👥 Múltiplas faces detectadas. Aguardando...');
            setTimeout(startScan, 2000);
            return;
        }

        const detection = detections[0];
        const confidence = detection.detection.score;
        const qualityScore = calculateFaceQuality(detection, video);

        if (confidence < 0.6 || qualityScore < 0.4) {
            console.log(`🔄 Qualidade insuficiente (Confiança: ${Math.round(confidence * 100)}%, Qualidade: ${Math.round(qualityScore * 100)}%). Tentando novamente...`);
            setTimeout(startScan, 2000);
            return;
        }

        // Agora iniciar o processo de captura múltipla
        scanningRef.current = true;
        setIsScanning(true);
        console.log('✅ Face detectada! Iniciando captura biométrica invisível...');

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

                    console.log(`✅ Scan invisível ${currentScan}/${totalScans} capturado - Confiança: ${Math.round(currentConfidence * 100)}%`);

                    if (currentScan >= totalScans) {
                        clearInterval(interval);
                        completeScanWithFaceAPI(scans);
                    }
                } else {
                    failedScans++;
                    console.log(`🔄 Ajustando captura invisível... (Confiança: ${Math.round(currentConfidence * 100)}%)`);
                }
            } else {
                failedScans++;
                console.log('❌ Face não detectada nesta amostra invisível');
            }

            if (failedScans > 3) {
                clearInterval(interval);
                scanningRef.current = false;
                setIsScanning(false);
                console.log('❌ Muitas falhas no scan invisível - Tentando novamente...');
                setTimeout(startScan, 3000);
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

    const completeScanWithFaceAPI = async (scans) => {
        try {
            console.log('🧮 Processando template biométrico invisível...');
            const avgMetrics = calculateAverageDetections(scans);
            const overallConfidence = avgMetrics.avgConfidence;

            console.log(`📊 Confiança final invisível: ${Math.round(overallConfidence * 100)}%`);

            if (overallConfidence < 0.75) {
                setIsScanning(false);
                scanningRef.current = false;
                console.log(`❌ Confiança insuficiente (${Math.round(overallConfidence * 100)}%). Tentando novamente...`);
                setTimeout(startScan, 3000);
                return;
            }

            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (canvas && video) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

                const facialData = await processFacialBiometricsWithAPI(imageDataUrl, avgMetrics, overallConfidence);

                setIsScanning(false);
                scanningRef.current = false;

                console.log('🎉 Scan facial invisível concluído com sucesso!');
                console.log('📤 Enviando dados para autenticação...');

                if (onScanComplete) {
                    onScanComplete(facialData);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao completar scan invisível:', error);
            setIsScanning(false);
            scanningRef.current = false;
            if (onError) onError('Erro ao processar dados faciais invisível.');
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

    const processFacialBiometricsWithAPI = async (imageDataUrl, avgMetrics, overallConfidence) => {
        const img = new Image();
        img.src = imageDataUrl;

        return new Promise((resolve, reject) => {
            img.onload = () => {
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
                    captureMethod: 'face-api.js-invisible',
                    encoding: avgMetrics.avgDescriptor,
                    landmarks: convertLandmarksToLegacyFormat(avgMetrics.avgLandmarks)
                };
                resolve({
                    type: 'facial',
                    data: JSON.stringify(features),
                    imageData: imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl
                });
            };
            img.onerror = () => reject(new Error('Erro ao processar imagem invisível'));
        });
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
        <div style={{ display: 'none' }}>
            {/* Elementos completamente ocultos para captura */}
            <video
                ref={videoRef}
                style={{ width: '320px', height: '240px', visibility: 'hidden', position: 'absolute', left: '-9999px' }}
                autoPlay
                playsInline
                muted
            />
            <canvas
                ref={canvasRef}
                width={320}
                height={240}
                style={{ visibility: 'hidden', position: 'absolute', left: '-9999px' }}
            />
        </div>
    );
};

export default InvisibleFacialScanner;