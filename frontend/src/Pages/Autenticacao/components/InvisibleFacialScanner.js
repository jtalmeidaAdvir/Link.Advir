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
    const scanCompletedRef = useRef(false); // Flag para evitar scans duplicados
    const lastScanTimeRef = useRef(0); // Timestamp do último scan completo

    const detectingRef = useRef(false); // evita duas detecções ao mesmo tempo
    const finishedRef  = useRef(false); // garante que só um completeFastScan corre
    const restartTimeoutRef = useRef(null); // throttle a reinícios por orientação


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
        }, 8000); // Reduzido para 8 segundos
    };

    // HUD minimalista
    const FaceHUD = ({ progress = 0, onCancel }) => {
        if (typeof document === 'undefined') return null;
        return createPortal(
            <>
                <style>{`
                    .hud-wrap{position:fixed; top:calc(env(safe-area-inset-top, 0px) + 8px); left:50%; transform:translateX(-50%); z-index:2147483647;}
                    .hud-badge{
                        width:44px; height:44px; border-radius:9999px;
                        background:rgba(0,0,0,.65); backdrop-filter:blur(6px);
                        display:flex; align-items:center; justify-content:center;
                        box-shadow:0 2px 12px rgba(0,0,0,.3); position:relative; cursor:pointer;
                    }
                    .hud-face{font-size:22px; line-height:1; animation:pulse 1.2s ease-in-out infinite}
                    .hud-ring{
                        position:absolute; inset:-3px; border-radius:inherit;
                        background: conic-gradient(#1792FE ${(progress || 0) * 3.6}deg, rgba(255,255,255,.2) ${(progress || 0) * 3.6}deg);
                        mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0);
                        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0);
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
                    @media (prefers-reduced-motion: reduce){ .hud-face, .hud-ring{ animation:none } }
                `}</style>
                <div className="hud-wrap" role="status" aria-live="polite" aria-busy="true">
                    <div className="hud-badge" title="Cancelar" onClick={onCancel}>
                        <div className="hud-ring" />
                        <div className="hud-face" aria-hidden="true">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor"/>
                                <circle cx="9"  cy="10" r="1" fill="currentColor"/>
                                <circle cx="15" cy="10" r="1" fill="currentColor"/>
                                <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeLinecap="round"/>
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

    // Adicionar listener para mudanças de orientação
    useEffect(() => {
  const handleOrientationChange = () => {
    if (!isScanning || !cameraReady || finishedRef.current) return;
    if (restartTimeoutRef.current) return;
    restartTimeoutRef.current = setTimeout(() => {
      console.log('Orientação mudou, reiniciando câmera...');
      stopCamera();
      startCamera();
      restartTimeoutRef.current = null;
    }, 300);
  };

  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('resize', handleOrientationChange);
  return () => {
    window.removeEventListener('orientationchange', handleOrientationChange);
    window.removeEventListener('resize', handleOrientationChange);
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  };
}, [isScanning, cameraReady]);


    useEffect(() => {
        if (isScanning && modelsLoaded && cameraReady) {
            startFastScan();
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
            setStatusMessage('Carregando sistema...');
            setScanProgress(20);

            const CDN_MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

            // Carregar apenas modelos essenciais em paralelo
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(CDN_MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(CDN_MODEL_URL)
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
            setScanProgress(70);
            setStatusMessage('Conectando câmera...');

            // Configurações adaptáveis para diferentes dispositivos e orientações
            const isTablet = /iPad|Tablet|Android.*(?!Mobile)/i.test(navigator.userAgent);
            const isPortrait = window.innerHeight > window.innerWidth;
            
            let videoConstraints = {
                facingMode: 'user',
                // Configurações baseadas na orientação e tipo de dispositivo
                ...(isTablet ? {
                    width: { ideal: isPortrait ? 480 : 640 },
                    height: { ideal: isPortrait ? 640 : 480 },
                } : {
                    width: { ideal: 480 },
                    height: { ideal: 360 }
                })
            };

            // Forçar orientação específica em tablets
            if (isTablet) {
                videoConstraints.aspectRatio = isPortrait ? (3/4) : (4/3);
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints
            });

            const videoEl = videoRef.current;
            if (!videoEl) return;

            const handleReady = () => {
                if (cameraReady) return;
                
                // Aplicar correção de orientação CSS se necessário
                const videoWidth = videoEl.videoWidth;
                const videoHeight = videoEl.videoHeight;
                
                console.log(`Dimensões do vídeo: ${videoWidth}x${videoHeight}`);
                console.log(`Dimensões da tela: ${window.innerWidth}x${window.innerHeight}`);
                
                // Se as dimensões do vídeo não coincidem com a orientação esperada, aplicar rotação
                const videoIsLandscape = videoWidth > videoHeight;
                const screenIsLandscape = window.innerWidth > window.innerHeight;
                
                if (videoIsLandscape !== screenIsLandscape && isTablet) {
                    console.log('Aplicando correção de orientação');
                    videoEl.style.transform = 'rotate(90deg)';
                    videoEl.style.transformOrigin = 'center center';
                }
                
                setCameraReady(true);
                setScanProgress(90);
                setStatusMessage('Sistema pronto!');
            };

            videoEl.addEventListener('loadedmetadata', handleReady, { once: true });
            videoEl.srcObject = stream;
            streamRef.current = stream;

            await videoEl.play();
            setScanProgress(85);

            // Fallback rápido
            setTimeout(() => {
                if (!cameraReady && videoEl.videoWidth > 0) {
                    handleReady();
                }
            }, 500);

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
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setCameraReady(false);
    };

 const startFastScan = async () => {
  console.log('Iniciando scan rápido...');
  setScanProgress(95);
  setStatusMessage('Procurando face...');
  startNoFaceTimeout();

  // garante que só existe um intervalo
  if (scanIntervalRef.current) {
    clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = null;
  }
  finishedRef.current = false;
  detectingRef.current = false;

  const scans = [];
  const maxScans = 5;
  let currentScan = 0;
  let consecutiveFailures = 0;

  scanIntervalRef.current = setInterval(async () => {
    if (!isScanning || finishedRef.current) return;
    if (detectingRef.current) return; // já há uma deteção em curso
    detectingRef.current = true;

    try {
      const video = videoRef.current;
      if (!video) return;

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 1) {
        clearNoFaceTimeout();
        consecutiveFailures = 0;

        const d = detections[0];
        if (d.detection.score > 0.5) {
          scans.push({ confidence: d.detection.score, descriptor: d.descriptor, landmarks: d.landmarks });
          currentScan++;
          const progress = 95 + (currentScan / maxScans) * 5;
          setScanProgress(progress);
          setStatusMessage(`Capturando... ${currentScan}/${maxScans}`);

          if (currentScan >= maxScans && !finishedRef.current) {
            finishedRef.current = true; // ✅ trava chamadas múltiplas
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
            await completeFastScan(scans);
            return;
          }
        }
      } else {
        consecutiveFailures++;
        if (consecutiveFailures > 8) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
          setStatusMessage('Face não detectada consistentemente.');
          setTimeout(() => { if (onStopScan) onStopScan(); }, 1500);
          return;
        }
      }
    } catch (e) {
      console.error('Erro na detecção:', e);
    } finally {
      detectingRef.current = false; // ✅ liberta o “tick”
    }
  }, 250);
};


 const completeFastScan = async (scans) => {
  try {
    const now = Date.now();
    if (scanCompletedRef.current || (now - lastScanTimeRef.current) < 2000) {
      console.log('⚠️ Scan já completado/muito recente – ignorado');
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

    const avgConfidence = scans.reduce((s, x) => s + x.confidence, 0) / scans.length;
    setStatusMessage(`Processando... (${Math.round(avgConfidence * 100)}%)`);
    setScanProgress(100);

    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

      const facialData = createBiometricData(imageDataUrl, scans, avgConfidence);

      setTimeout(() => {
        if (facialData) {
          onScanComplete(facialData);
          if (onStopScan) onStopScan();
        }
      }, 300);
    }
  } catch (e) {
    console.error('Erro ao completar scan:', e);
    scanCompletedRef.current = false; // permite nova tentativa se falhar
    setTimeout(() => { if (onStopScan) onStopScan(); }, 1500);
  }
};


    const createBiometricData = (imageDataUrl, scans, avgConfidence) => {
        const avgDescriptor = calculateAvgDescriptor(scans);

        const features = {
            faceDetected: true,
            confidence: avgConfidence,
            algorithm: 'face-api.js',
            version: '1.0.0',
            biometricTemplate: {
                descriptor: avgDescriptor,
                sampleCount: scans.length
            },
            scanQuality: {
                confidence: avgConfidence,
                sampleCount: scans.length,
                securityLevel: avgConfidence > 0.7 ? 'HIGH' : 'MEDIUM'
            },
            timestamp: new Date().toISOString(),
            validationPassed: true,
            encoding: avgDescriptor
        };

        return {
            type: 'facial',
            data: JSON.stringify(features),
            imageData: imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl
        };
    };

    const calculateAvgDescriptor = (scans) => {
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
                style={{ 
                    display: 'none',
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease'
                }}
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