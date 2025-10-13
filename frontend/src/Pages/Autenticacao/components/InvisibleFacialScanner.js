import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { createPortal } from 'react-dom';

// ——————————— Cache global dos modelos (carrega uma vez por sessão) ———————————
let __modelsReady = false;
let __modelsPromise = null;
const ensureModels = async () => {
  if (__modelsReady) return;
  if (!__modelsPromise) {
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    __modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => { __modelsReady = true; });
  }
  await __modelsPromise;
};


  // Garante múltiplos de 32 e limites razoáveis
const snap32 = (n, min = 128, max = 224) => {
  const clamped = Math.max(min, Math.min(max, n));
  return Math.round(clamped / 32) * 32;
};


const InvisibleFacialScanner = ({ onScanComplete, isScanning, onStartScan, onStopScan, t }) => {
  const [scanProgress, setScanProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const scanLoopStopRef = useRef(false);
  const noFaceTimeoutRef = useRef(null);
  const scanCompletedRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const detectingRef = useRef(false);
  const finishedRef = useRef(false);

  // opções do detetor (adaptativas)
  const detectionOptsRef = useRef({ inputSize: 160, scoreThreshold: 0.5 });
// garantir já arredondado
detectionOptsRef.current.inputSize = snap32(detectionOptsRef.current.inputSize);


  const multiFaceCheckRef = useRef(0);


// Cria opções válidas sempre que instanciamos o detector
const makeDetectorOpts = () => new faceapi.TinyFaceDetectorOptions({
  inputSize: snap32(detectionOptsRef.current.inputSize || 160),
  scoreThreshold: detectionOptsRef.current.scoreThreshold ?? 0.5,
});

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
    }, 1000);
  };

  // HUD
  const FaceHUD = ({ progress = 0, onCancel }) => {
    if (typeof document === 'undefined') return null;
    return createPortal(
      <>
        <style>{`
          .hud-wrap{position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:9999;}
          .hud-badge{width:50px; height:50px; border-radius:50%;
            background:rgba(0,0,0,0.8); backdrop-filter:blur(8px);
            display:flex; align-items:center; justify-content:center;
            box-shadow:0 4px 12px rgba(0,0,0,0.3); position:relative; cursor:pointer;}
          .hud-face{font-size:22px; color:#fff;}
          .hud-ring{position:absolute; top:-3px; left:-3px; right:-3px; bottom:-3px;
            border-radius:50%; border:3px solid transparent;
            background: conic-gradient(#1792FE ${progress * 3.6}deg, rgba(255,255,255,0.2) 0deg);
            mask: radial-gradient(farthest-side, transparent calc(100% - 3px), black 0);
            -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), black 0);}
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
    stopCamera();
    setStatusMessage('');
    setScanProgress(0);
    setCameraReady(false);
    // não voltamos a descarregar modelos (mantemos em cache)
    scanCompletedRef.current = false;
    lastScanTimeRef.current = 0;
    detectingRef.current = false;
    finishedRef.current = false;
    scanLoopStopRef.current = true;
  };

  const initializeFaceAPI = async () => {
    try {
      setStatusMessage('Carregando modelos...');
      setScanProgress(20);

      // força backend WebGL quando disponível (sem trocar libs)
      try {
        if (faceapi?.tf?.getBackend && faceapi.tf.getBackend() !== 'webgl') {
          await faceapi.tf.setBackend('webgl');
        }
        await faceapi?.tf?.ready?.();
      } catch { /* ignora se não houver tf exposto */ }

      await ensureModels();

      setScanProgress(60);
      setModelsLoaded(true);
      setStatusMessage('Iniciando câmara...');
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
      setStatusMessage('Conectando câmara...');

      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 480, max: 640 },    // menor resolução = deteção mais rápida
          height: { ideal: 360, max: 480 },
          frameRate: { ideal: 24, max: 30 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const videoEl = videoRef.current;
      if (!videoEl) return;

      videoEl.srcObject = stream;
      streamRef.current = stream;

      await new Promise((resolve) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play().then(async () => {
            // warm-up: 1 deteção para compilar grafos e “aquecer” kernels
            try {
              await faceapi
                .detectSingleFace(videoEl, makeDetectorOpts());
            } catch {}
            setCameraReady(true);
            setScanProgress(95);
            setStatusMessage('Câmara pronta!');
            resolve();
          });
        };
      });
    } catch (error) {
      console.error('Erro na câmara:', error);
      setStatusMessage('Erro: câmara indisponível.');
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

  const startFacialScan = () => {
    setScanProgress(98);
    setStatusMessage('A procurar face...');
    startNoFaceTimeout();

    finishedRef.current = false;
    detectingRef.current = false;
    scanLoopStopRef.current = false;

    const scans = [];
    const maxScans = 3;
    let currentScan = 0;
    let consecutiveFailures = 0;
    const maxFailures = 8;

    const stepAdaptiveInputSize = (ms) => {
  const opts = detectionOptsRef.current;
  let next = opts.inputSize || 160;
  // se estiver lento, baixa; se estiver muito rápido, sobe — em passos de 32
  if (ms > 70 && next > 128) next -= 32;
  if (ms < 30 && next < 224) next += 32;
  opts.inputSize = snap32(next);
};


    const tick = async () => {
      if (!isScanning || finishedRef.current || scanLoopStopRef.current) return;
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) {
        scheduleNext();
        return;
      }
      if (detectingRef.current) {
        scheduleNext();
        return;
      }
      detectingRef.current = true;

      try {
        const t0 = performance.now();

        // 1) verificação barata para múltiplas faces a cada ~600ms (sem landmarks/descritores)
        const now = performance.now();
        if (now - multiFaceCheckRef.current > 600) {
          multiFaceCheckRef.current = now;
          const facesOnly = await faceapi.detectAllFaces(video, makeDetectorOpts());
          if (facesOnly.length > 1) {
            setStatusMessage('Múltiplas faces detectadas. Apenas uma pessoa deve estar visível.');
            consecutiveFailures++;
            detectingRef.current = false;
            scheduleNext();
            return;
          }
        }

        // 2) caminho rápido: tentar uma única face
        const detectionFull = await faceapi
          .detectSingleFace(video, makeDetectorOpts())
          .withFaceLandmarks()
          .withFaceDescriptor();

        const dt = performance.now() - t0;
        stepAdaptiveInputSize(dt);

        if (detectionFull) {
          clearNoFaceTimeout();
          consecutiveFailures = 0;

          if (detectionFull.detection.score > 0.6) {
            scans.push({
              confidence: detectionFull.detection.score,
              descriptor: detectionFull.descriptor,
              landmarks: detectionFull.landmarks
            });
            currentScan++;

            const progress = 98 + (currentScan / maxScans) * 2;
            setScanProgress(progress);
            setStatusMessage(`Capturando... ${currentScan}/${maxScans}`);

            if (currentScan >= maxScans && !finishedRef.current) {
              finishedRef.current = true;
              await completeFacialScan(scans, currentScan);
              detectingRef.current = false;
              return; // não agendar próximo
            }
          }
        } else {
          consecutiveFailures++;
        }

        if (consecutiveFailures > maxFailures) {
          setStatusMessage('Face não detectada consistentemente.');
          setTimeout(() => { if (onStopScan) onStopScan(); }, 1500);
          detectingRef.current = false;
          return;
        }
      } catch (err) {
        console.error('Erro na deteção:', err);
      } finally {
        detectingRef.current = false;
        scheduleNext();
      }
    };

    const scheduleNext = () => {
      if (!isScanning || finishedRef.current || scanLoopStopRef.current) return;
      const video = videoRef.current;
      // usa requestVideoFrameCallback se disponível; senão, fallback leve
      if (video && 'requestVideoFrameCallback' in video) {
        video.requestVideoFrameCallback(() => tick());
      } else {
        setTimeout(tick, 120);
      }
    };

    // arrancar o loop
    scheduleNext();
  };

  const completeFacialScan = async (scans, currentScanCount) => {
    try {
      const now = Date.now();
      if (scanCompletedRef.current || (now - lastScanTimeRef.current) < 1000) {
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

      const avgConfidence = scans.reduce((sum, s) => sum + s.confidence, 0) / scans.length;
      setStatusMessage(`Processando... (${Math.round(avgConfidence * 100)}%)`);
      setScanProgress(100);

      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        ctx.drawImage(video, 0, 0);

        // JPEG mais leve para transporte
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.6);
        const facialData = createBiometricData(imageDataUrl, scans, avgConfidence);

        setTimeout(() => {
          if (facialData) {
            onScanComplete(facialData);
            if (onStopScan) onStopScan();
          }
        }, 200);
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
    for (const s of scans) {
      if (s.descriptor) {
        for (let i = 0; i < descriptorLength; i++) {
          avgDescriptor[i] += s.descriptor[i];
        }
      }
    }
    return avgDescriptor.map(sum => sum / scans.length);
  };

  return (
    <div>
      <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
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
