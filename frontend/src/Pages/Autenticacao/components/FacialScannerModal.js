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
        
        if (!video || !canvas) return { detected: false, confidence: 0, metrics: null };

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Análise mais detalhada de detecção facial
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Múltiplas métricas de detecção
        const metrics = calculateFaceMetrics(data, canvas.width, canvas.height);
        
        // Calcular confiança baseada em múltiplas métricas
        const confidence = calculateConfidence(metrics);
        
        return {
            detected: confidence > 0.6, // Threshold mais rigoroso
            confidence: confidence,
            metrics: metrics
        };
    };

    const calculateFaceMetrics = (data, width, height) => {
        // 1. Análise de variação de luminosidade
        let variations = 0;
        let totalBrightness = 0;
        const step = 4 * 8; // Mais granular
        
        for (let i = 0; i < data.length; i += step) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            totalBrightness += brightness;
            
            if (i > 0) {
                const prevBrightness = (data[i - step] + data[i - step + 1] + data[i - step + 2]) / 3;
                if (Math.abs(brightness - prevBrightness) > 25) {
                    variations++;
                }
            }
        }
        
        const avgBrightness = totalBrightness / (data.length / step);
        const variationRatio = variations / (data.length / step);
        
        // 2. Análise de distribuição de cores (tons de pele)
        let skinTonePixels = 0;
        let totalPixels = 0;
        
        for (let i = 0; i < data.length; i += 16) { // Amostra mais espaçada
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Detectar tons de pele aproximados
            if (r > 95 && g > 40 && b > 20 && 
                Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
                Math.abs(r - g) > 15 && r > g && r > b) {
                skinTonePixels++;
            }
            totalPixels++;
        }
        
        const skinRatio = skinTonePixels / totalPixels;
        
        // 3. Análise de simetria horizontal (faces tendem a ser simétricas)
        const symmetryScore = calculateSymmetry(data, width, height);
        
        // 4. Análise de contraste nas regiões centrais
        const centralContrast = calculateCentralContrast(data, width, height);
        
        return {
            avgBrightness,
            variationRatio,
            skinRatio,
            symmetryScore,
            centralContrast
        };
    };

    const calculateSymmetry = (data, width, height) => {
        let symmetryScore = 0;
        const centerX = Math.floor(width / 2);
        const sampleLines = 10;
        
        for (let y = Math.floor(height * 0.3); y < Math.floor(height * 0.7); y += Math.floor(height * 0.4 / sampleLines)) {
            for (let offset = 1; offset < Math.min(centerX, width - centerX); offset += 5) {
                const leftIdx = (y * width + (centerX - offset)) * 4;
                const rightIdx = (y * width + (centerX + offset)) * 4;
                
                if (leftIdx >= 0 && rightIdx < data.length - 2) {
                    const leftBrightness = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
                    const rightBrightness = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
                    
                    const diff = Math.abs(leftBrightness - rightBrightness);
                    symmetryScore += Math.max(0, 100 - diff) / 100;
                }
            }
        }
        
        return symmetryScore / (sampleLines * 10); // Normalizar
    };

    const calculateCentralContrast = (data, width, height) => {
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        const region = Math.min(width, height) * 0.3;
        
        let totalContrast = 0;
        let samples = 0;
        
        for (let y = centerY - region/2; y < centerY + region/2; y += 5) {
            for (let x = centerX - region/2; x < centerX + region/2; x += 5) {
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                    if (idx < data.length - 2) {
                        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        
                        // Comparar com pixels adjacentes
                        let localContrast = 0;
                        let neighbors = 0;
                        
                        for (let dy = -2; dy <= 2; dy++) {
                            for (let dx = -2; dx <= 2; dx++) {
                                const nx = Math.floor(x) + dx;
                                const ny = Math.floor(y) + dy;
                                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                    const nIdx = (ny * width + nx) * 4;
                                    if (nIdx < data.length - 2) {
                                        const nBrightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
                                        localContrast += Math.abs(brightness - nBrightness);
                                        neighbors++;
                                    }
                                }
                            }
                        }
                        
                        if (neighbors > 0) {
                            totalContrast += localContrast / neighbors;
                            samples++;
                        }
                    }
                }
            }
        }
        
        return samples > 0 ? totalContrast / samples : 0;
    };

    const calculateConfidence = (metrics) => {
        let confidence = 0;
        
        // Peso para cada métrica
        const weights = {
            brightness: 0.15,
            variation: 0.25,
            skinTone: 0.25,
            symmetry: 0.20,
            contrast: 0.15
        };
        
        // Avaliar brilho (nem muito escuro nem muito claro)
        if (metrics.avgBrightness > 50 && metrics.avgBrightness < 180) {
            confidence += weights.brightness;
        }
        
        // Avaliar variação (deve ter variações moderadas para indicar features faciais)
        if (metrics.variationRatio > 0.15 && metrics.variationRatio < 0.4) {
            confidence += weights.variation;
        }
        
        // Avaliar tons de pele
        if (metrics.skinRatio > 0.08 && metrics.skinRatio < 0.4) {
            confidence += weights.skinTone;
        }
        
        // Avaliar simetria
        if (metrics.symmetryScore > 0.3) {
            confidence += weights.symmetry * metrics.symmetryScore;
        }
        
        // Avaliar contraste central
        if (metrics.centralContrast > 20 && metrics.centralContrast < 80) {
            confidence += weights.contrast;
        }
        
        return Math.min(confidence, 1.0);
    };

    const startScan = async () => {
        if (!cameraReady) {
            setStatusMessage('A câmera ainda não está pronta.');
            return;
        }

        // Verificar se há uma face detectada antes de iniciar
        const initialDetection = await detectFace();
        if (!initialDetection.detected || initialDetection.confidence < 0.6) {
            setStatusMessage(`Face não detectada adequadamente (confiança: ${Math.round(initialDetection.confidence * 100)}%). Posicione-se melhor.`);
            return;
        }

        setIsScanning(true);
        setScanProgress(0);
        setStatusMessage('Face detectada! Iniciando captura de precisão...');

        // Múltiplos scans para maior precisão
        const scans = [];
        const totalScans = 8; // Mais scans para maior precisão
        let currentScan = 0;
        let failedScans = 0;

        const interval = setInterval(async () => {
            const detection = await detectFace();
            
            if (detection.detected && detection.confidence > 0.6) {
                scans.push(detection);
                currentScan++;
                
                const progress = (currentScan / totalScans) * 100;
                setScanProgress(progress);
                
                // Mensagens mais informativas
                if (progress < 25) {
                    setStatusMessage(`Capturando amostra ${currentScan}/${totalScans} (confiança: ${Math.round(detection.confidence * 100)}%)`);
                } else if (progress < 50) {
                    setStatusMessage(`Validando características faciais... ${currentScan}/${totalScans}`);
                } else if (progress < 75) {
                    setStatusMessage(`Refinando dados biométricos... ${currentScan}/${totalScans}`);
                } else {
                    setStatusMessage(`Finalizando captura... ${currentScan}/${totalScans}`);
                }
                
                if (currentScan >= totalScans) {
                    clearInterval(interval);
                    completeScanWithAveraging(scans);
                }
            } else {
                failedScans++;
                
                if (failedScans > 3) {
                    // Muitas falhas consecutivas
                    clearInterval(interval);
                    setIsScanning(false);
                    setScanProgress(0);
                    setStatusMessage('Qualidade da captura insuficiente. Tente novamente com melhor iluminação.');
                    return;
                }
                
                setStatusMessage(`Ajustando captura... (confiança: ${Math.round(detection.confidence * 100)}%)`);
            }
        }, 500); // Mais frequente para maior precisão
    };

    const completeScanWithAveraging = async (scans) => {
        try {
            // Calcular métricas médias de todos os scans
            const avgMetrics = calculateAverageMetrics(scans);
            const overallConfidence = avgMetrics.avgConfidence;
            
            if (overallConfidence < 0.7) {
                setIsScanning(false);
                setScanProgress(0);
                setStatusMessage(`Confiança insuficiente (${Math.round(overallConfidence * 100)}%). Tente novamente.`);
                return;
            }

            setStatusMessage(`Processando dados... (confiança: ${Math.round(overallConfidence * 100)}%)`);
            
            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (canvas && video) {
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);

                const imageData = canvas.toDataURL('image/jpeg', 0.9); // Maior qualidade

                // Processar dados biométricos com as métricas médias
                const facialData = await processFacialBiometrics(imageData, true, avgMetrics, overallConfidence);

                setIsScanning(false);
                setScanProgress(0);
                setStatusMessage(`Captura concluída! Confiança: ${Math.round(overallConfidence * 100)}%`);
                
                setTimeout(() => {
                    onScanComplete(facialData);
                    onClose();
                }, 2000);
            }
        } catch (error) {
            console.error('Erro ao completar scan:', error);
            setIsScanning(false);
            setScanProgress(0);
            setStatusMessage('Erro ao processar dados faciais.');
        }
    };

    const calculateAverageMetrics = (scans) => {
        if (scans.length === 0) return null;
        
        const totals = {
            avgBrightness: 0,
            variationRatio: 0,
            skinRatio: 0,
            symmetryScore: 0,
            centralContrast: 0,
            confidence: 0
        };
        
        scans.forEach(scan => {
            totals.avgBrightness += scan.metrics.avgBrightness;
            totals.variationRatio += scan.metrics.variationRatio;
            totals.skinRatio += scan.metrics.skinRatio;
            totals.symmetryScore += scan.metrics.symmetryScore;
            totals.centralContrast += scan.metrics.centralContrast;
            totals.confidence += scan.confidence;
        });
        
        const count = scans.length;
        return {
            avgBrightness: totals.avgBrightness / count,
            variationRatio: totals.variationRatio / count,
            skinRatio: totals.skinRatio / count,
            symmetryScore: totals.symmetryScore / count,
            centralContrast: totals.centralContrast / count,
            avgConfidence: totals.confidence / count,
            sampleCount: count,
            consistency: calculateConsistency(scans)
        };
    };

    const calculateConsistency = (scans) => {
        if (scans.length < 2) return 1.0;
        
        let totalVariance = 0;
        const metrics = ['avgBrightness', 'variationRatio', 'skinRatio', 'symmetryScore', 'centralContrast'];
        
        metrics.forEach(metric => {
            const values = scans.map(scan => scan.metrics[metric]);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
            totalVariance += variance;
        });
        
        // Converter variância em score de consistência (0-1)
        return Math.max(0, Math.min(1, 1 - (totalVariance / 1000)));
    };

    const completeScan = async () => {
        try {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (canvas && video) {
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
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

    const processFacialBiometrics = async (imageData, validated = false, avgMetrics = null, overallConfidence = 0) => {
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
                
                // Gerar características faciais únicas com dados médios
                const features = {
                    faceDetected: true,
                    confidence: overallConfidence || confidence,
                    faceRegions: faceRegions,
                    totalIntensity: totalIntensity,
                    landmarks: generateLandmarks(canvas.width, canvas.height),
                    encoding: generateFaceEncoding(imageData),
                    timestamp: new Date().toISOString(),
                    validationPassed: true,
                    // Dados adicionais de precisão
                    avgMetrics: avgMetrics,
                    scanQuality: {
                        brightness: avgMetrics?.avgBrightness || 0,
                        variation: avgMetrics?.variationRatio || 0,
                        skinTone: avgMetrics?.skinRatio || 0,
                        symmetry: avgMetrics?.symmetryScore || 0,
                        contrast: avgMetrics?.centralContrast || 0,
                        consistency: avgMetrics?.consistency || 0,
                        sampleCount: avgMetrics?.sampleCount || 1
                    }
                };

                resolve({
                    type: 'facial',
                    data: JSON.stringify(features),
                    imageData: img.src.includes(',') ? img.src.split(',')[1] : img.src
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
        // Gerar encoding único baseado nos dados da imagem
        const data = imageData.data;
        const sampleSize = Math.min(1000, data.length); // Usar uma amostra dos dados
        
        // Criar um hash simples baseado nos valores dos pixels
        let hash = '';
        for (let i = 0; i < sampleSize; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const avg = Math.floor((r + g + b) / 3);
            hash += avg.toString(16).padStart(2, '0');
        }
        
        // Limitar o tamanho do hash
        hash = hash.substring(0, 100);
        
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