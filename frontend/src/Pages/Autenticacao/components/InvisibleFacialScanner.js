
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


    const noFaceTimeoutRef = useRef(null);

  const clearNoFaceTimeout = () => {
    if (noFaceTimeoutRef.current) {
      clearTimeout(noFaceTimeoutRef.current);
      noFaceTimeoutRef.current = null;
    }
  };
  const startNoFaceTimeoutOnce = (ms = 10000) => {
    // não reinicia se já existir — conta 10s acumulados desde o arranque
    if (noFaceTimeoutRef.current) return;
    noFaceTimeoutRef.current = setTimeout(() => {
      setStatusMessage('Nenhuma face detetada em 10s. A fechar...');
      setScanProgress(0);
      // fecha/cancela o scan
      if (onStopScan) onStopScan();
    }, ms);
  };

 // 1) Repor o efeito que arranca/paralisa o scanner
 useEffect(() => {
   if (isScanning) {
     setScanProgress(0);
     setStatusMessage('Iniciando sistema de reconhecimento facial...');
     initializeFaceAPI();
   } else {
    clearNoFaceTimeout();
     stopCamera();
     setStatusMessage('');
     setScanProgress(0);
     setCameraReady(false);
     setModelsLoaded(false);
   }
   return () => {
    clearNoFaceTimeout();
     stopCamera();
   };
 }, [isScanning]);

// Já tinhas este efeito (ok manter):
useEffect(() => {
  if (isScanning && modelsLoaded && cameraReady) {
    startScan();
  }
}, [isScanning, modelsLoaded, cameraReady]);


    const initializeFaceAPI = async () => {
        const timeout = setTimeout(() => {
            setStatusMessage('Carregamento está demorando... Verifique sua conexão.');
        }, 10000);

        try {
            setStatusMessage('Carregando modelos de detecção facial...');
            setScanProgress(10);

            const CDN_MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

            // Carregar modelos com progress feedback
            await faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_URL);
            setScanProgress(25);
            setStatusMessage('Carregando detector facial...');

            await faceapi.nets.faceLandmark68Net.loadFromUri(CDN_MODEL_URL);
            setScanProgress(40);
            setStatusMessage('Carregando detector de pontos faciais...');

            await faceapi.nets.faceRecognitionNet.loadFromUri(CDN_MODEL_URL);
            setScanProgress(55);
            setStatusMessage('Carregando reconhecimento facial...');

            clearTimeout(timeout);
            setModelsLoaded(true);
            setScanProgress(70);
            setStatusMessage('Modelos carregados! Iniciando câmera...');
            await startCamera();

        } catch (error) {
            clearTimeout(timeout);
            console.error('Erro ao carregar modelos face-api.js:', error);
            setStatusMessage('Erro ao carregar modelos. Tentando modo básico...');
            setScanProgress(20);
            
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_URL);
                setScanProgress(50);
                setModelsLoaded(true);
                setStatusMessage('Modo básico carregado! Iniciando câmera...');
                await startCamera();
                
            } catch (fallbackError) {
                console.error('Erro no fallback:', fallbackError);
                setStatusMessage('Falha no carregamento. Clique para tentar novamente.');
                setScanProgress(0);
                setTimeout(() => {
                    if (onStopScan) onStopScan();
                }, 3000);
            }
        }
    };

  const startCamera = async () => {
  try {
    setScanProgress(75);
    setStatusMessage('Solicitando acesso à câmera...');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
    });

    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Limpar handlers antigos
    videoEl.onloadedmetadata = null;

    const handleReady = () => {
      // Evita múltiplas execuções
      if (cameraReady) return;
      console.log('loadedmetadata/canplay ->', videoEl.videoWidth, 'x', videoEl.videoHeight);
      setCameraReady(true);
      setScanProgress(90);
      setStatusMessage('Sistema pronto! Iniciando detecção facial...');
    };

    // 1) Anexar listeners ANTES do srcObject
    videoEl.addEventListener('loadedmetadata', handleReady, { once: true });
    videoEl.addEventListener('canplay', handleReady, { once: true });

    videoEl.srcObject = stream;
    streamRef.current = stream;

    try { await videoEl.play(); } catch (e) { console.warn('play() falhou:', e); }

    setScanProgress(85);
    setStatusMessage('Câmera conectada. Preparando scan...');

    // 2) Fallback imediato: se já houver dimensões, marca pronto
    if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
      handleReady();
    } else {
      // 3) Fallback por timeout (caso os eventos se percam)
      setTimeout(() => {
        if (!cameraReady && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          handleReady();
        } else if (!cameraReady) {
          setStatusMessage('Não consegui inicializar a câmera. Tente novamente.');
          if (onStopScan) onStopScan();
        }
      }, 1500);
    }
  } catch (error) {
    console.error('Erro ao acessar câmera:', error);
    setCameraReady(false);
    setScanProgress(0);
    setStatusMessage('Erro: Câmera não disponível ou sem permissão.');
    setTimeout(() => { if (onStopScan) onStopScan(); }, 3000);
  }
};


   const stopCamera = () => {
    clearNoFaceTimeout();
  const videoEl = videoRef.current;
  if (videoEl) {
    videoEl.pause();
    videoEl.removeAttribute('src'); // para Safari
    videoEl.srcObject = null;
    videoEl.onloadedmetadata = null;
    videoEl.removeEventListener('canplay', () => {});
  }
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }
  setCameraReady(false);
};


    const startScan = async () => {
        console.log('startScan chamado - cameraReady:', cameraReady, 'modelsLoaded:', modelsLoaded);
        if (!isScanning) return; // se o utilizador cancelou mean-time
     
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) {
            console.log('Video não está pronto:', video ? `${video.videoWidth}x${video.videoHeight}` : 'null');
            setStatusMessage('Aguardando inicialização da câmera...');
            setTimeout(startScan, 500);
            return;
        }

        console.log('Iniciando detecção facial...');
        setScanProgress(95);
        setStatusMessage('Posicione-se em frente à câmera e aguarde...');
        startNoFaceTimeoutOnce(10000);

        // Adicionar timeout para evitar bloqueios
        const scanTimeout = setTimeout(() => {
            console.log('Timeout na detecção inicial');
            setStatusMessage('Tempo esgotado. Clique para tentar novamente.');
            setScanProgress(0);
            if (onStopScan) onStopScan();
        }, 10000); // 10 segundos timeout

        let detections;
        try {
            console.log('Tentando detecção facial completa...');
            detections = await faceapi
                .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();
        } catch (error) {
            console.log('Erro na detecção completa, tentando com landmarks:', error);
            try {
                detections = await faceapi
                    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks();
            } catch (landmarkError) {
                console.log('Erro com landmarks, tentando detecção básica:', landmarkError);
                try {
                    detections = await faceapi
                        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
                } catch (basicError) {
                    console.error('Erro em todas as tentativas de detecção:', basicError);
                    clearTimeout(scanTimeout);
                    setStatusMessage('Erro na detecção facial. Clique para tentar novamente.');
                    setScanProgress(0);
                    if (onStopScan) onStopScan();
                    return;
                }
            }
        }
        
        clearTimeout(scanTimeout); // Limpar timeout se chegou até aqui
        console.log('Detecções encontradas:', detections.length);

        if (detections.length === 0) {
            console.log('Nenhuma face detectada');
            setStatusMessage('Face não detectada. Posicione-se em frente à câmera.');
            setTimeout(startScan, 1500);
            return;
        }
        clearNoFaceTimeout(); // Limpar timeout de "nenhuma face" se uma face foi detectada
        if (detections.length > 1) {
            console.log('Múltiplas faces detectadas:', detections.length);
            setStatusMessage('Múltiplas faces detectadas. Apenas uma pessoa permitida.');
            setTimeout(startScan, 1500);
            return;
        }

        const detection = detections[0];
        const confidence = detection.detection.score;
        const qualityScore = calculateFaceQuality(detection, video);

        console.log('Detecção inicial - Confiança:', confidence, 'Qualidade:', qualityScore);

        if (confidence < 0.5 || qualityScore < 0.3) { // Reduzir requisitos iniciais
            setStatusMessage(`Qualidade insuficiente (${Math.round(confidence * 100)}%). Ajuste seu posicionamento.`);
            setTimeout(startScan, 1500);
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
         const width  = video?.videoWidth  || 640;
 const height = video?.videoHeight || 480;
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
            clearNoFaceTimeout();
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
                    textAlign: 'center',
                    border: '1px solid rgba(23, 146, 254, 0.3)'
                }}>
                    <div style={{
                        color: '#1792FE',
                        fontSize: '14px',
                        marginBottom: '8px',
                        fontWeight: 'bold',
                        minHeight: '20px'
                    }}>
                        {statusMessage || 'Preparando sistema...'}
                    </div>
                    
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '8px'
                    }}>
                        <div style={{
                            flexGrow: 1,
                            height: '8px',
                            backgroundColor: 'rgba(23, 146, 254, 0.2)',
                            borderRadius: '4px',
                            marginRight: '8px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                backgroundColor: scanProgress < 100 ? '#1792FE' : '#4CAF50',
                                borderRadius: '4px',
                                width: `${Math.max(5, scanProgress)}%`,
                                transition: 'all 0.3s ease-in-out'
                            }} />
                        </div>
                        <span style={{
                            color: '#1792FE',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            minWidth: '35px'
                        }}>
                            {Math.round(scanProgress)}%
                        </span>
                    </div>

                    <button
                        onClick={() => {
                            if (onStopScan) onStopScan();
                        }}
                        style={{
                            marginTop: '10px',
                            padding: '5px 15px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                </div>
            )}
        </div>
    );
};

export default InvisibleFacialScanner;
