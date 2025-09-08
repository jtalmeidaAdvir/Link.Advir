import React, { useState, useEffect } from 'react';

const NFCScanner = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [rfidCode, setRfidCode] = useState('12AB34CD');
    const [isScanning, setIsScanning] = useState(false);
    const [status, setStatus] = useState({ message: '', type: '' });
    const [ndefReader, setNdefReader] = useState(null);

    const styles = {
        body: {
            margin: 0,
            padding: 0,
            fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif",
            backgroundColor: '#f8f9fa',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        },
        container: {
            maxWidth: '480px',
            width: '100%',
            margin: '20px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            overflow: 'hidden'
        },
        header: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '24px',
            textAlign: 'center'
        },
        title: {
            margin: '0 0 8px 0',
            fontSize: '24px',
            fontWeight: '700'
        },
        subtitle: {
            margin: 0,
            fontSize: '14px',
            opacity: 0.9
        },
        content: {
            padding: '24px'
        },
        inputGroup: {
            marginBottom: '20px'
        },
        label: {
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#495057'
        },
        input: {
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e9ecef',
            borderRadius: '8px',
            fontSize: '16px',
            transition: 'border-color 0.3s ease',
            boxSizing: 'border-box'
        },
        scanButton: {
            width: '100%',
            padding: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '12px'
        },
        scanButtonStop: {
            backgroundColor: '#dc3545'
        },
        scanButtonDisabled: {
            backgroundColor: '#6c757d',
            cursor: 'not-allowed'
        },
        scanningArea: {
            backgroundColor: '#f8f9fa',
            border: '2px dashed #dee2e6',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            margin: '20px 0',
            transition: 'all 0.3s ease'
        },
        scanningAreaActive: {
            backgroundColor: '#e3f2fd',
            borderColor: '#2196f3',
            borderStyle: 'solid'
        },
        scanningIcon: {
            fontSize: '48px',
            display: 'block',
            marginBottom: '12px'
        },
        scanningText: {
            margin: 0,
            color: '#6c757d',
            fontSize: '16px'
        },
        status: {
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: '500',
            whiteSpace: 'pre-line',
            textAlign: 'center'
        },
        statusSuccess: {
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb'
        },
        statusError: {
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb'
        },
        statusInfo: {
            backgroundColor: '#d1ecf1',
            color: '#0c5460',
            border: '1px solid #bee5eb'
        },
        instructions: {
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e9ecef'
        },
        instructionsTitle: {
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#495057'
        },
        instructionsList: {
            margin: '0 0 16px 0',
            paddingLeft: '20px'
        },
        instructionsItem: {
            marginBottom: '8px',
            fontSize: '12px',
            color: '#495057',
            padding: '6px',
            lineHeight: '1.4'
        },
        instructionsText: {
            fontSize: '14px',
            color: '#6c757d',
            lineHeight: '1.5',
            margin: '0 0 12px 0'
        }
    };

    useEffect(() => {
        // Set page title
        document.title = 'Scanner RFID/NFC - AdvirLink';

        // Check NFC support
        if (!("NDEFReader" in window)) {
            showStatus("NFC não é suportado neste navegador", "error");
        } else {
            showStatus("Sistema pronto - NFC disponível", "success");
        }

        // Auto-fill phone number from URL
        const urlParams = new URLSearchParams(window.location.search);
        const phoneFromUrl = urlParams.get('phone');
        if (phoneFromUrl) {
            setPhoneNumber(phoneFromUrl);
            showStatus("Número WhatsApp carregado automaticamente", "success");

            // Auto-start scanning after delay
            setTimeout(() => {
                if (phoneFromUrl.trim()) {
                    startScanning();
                }
            }, 1500);
        }
    }, []);

    const showStatus = (message, type) => {
        setStatus({ message, type });
    };

    const startScanning = async () => {
        const phone = phoneNumber.trim();
        if (!phone) {
            showStatus("Por favor, insira o número de telefone", "error");
            return;
        }

        try {
            setIsScanning(true);
            showStatus("Aguardando aproximação do cartão RFID...", "info");

            const reader = new window.NDEFReader();
            await reader.scan();
            setNdefReader(reader);

            reader.addEventListener("reading", handleNFCRead);
        } catch (error) {
            console.error("Erro NFC:", error);
            showStatus(`Erro ao iniciar scanner: ${error.message}`, "error");
            stopScanning();
        }
    };

    const stopScanning = () => {
        setIsScanning(false);
        setNdefReader(null);
        showStatus("Scanner parado", "info");
    };

    const handleNFCRead = (event) => {
        try {
            console.log("📡 Evento NFC completo:", event);
            
            // Ler o código RFID real do cartão
            let rfidCodeFromCard = null;
            let cardInfo = [];

            // 1. Tentar usar o serialNumber (UID do cartão) - mais comum em cartões de transporte
            if (event.serialNumber) {
                rfidCodeFromCard = event.serialNumber;
                cardInfo.push(`Serial: ${event.serialNumber}`);
                console.log("✅ Serial Number encontrado:", event.serialNumber);
            }

            // 2. Tentar extrair dados da mensagem NDEF
            if (event.message && event.message.records) {
                console.log("📋 Records encontrados:", event.message.records.length);
                
                for (let i = 0; i < event.message.records.length; i++) {
                    const record = event.message.records[i];
                    console.log(`Record ${i}:`, record);
                    
                    try {
                        if (record.recordType === "text") {
                            const decoder = new TextDecoder(record.encoding || 'utf-8');
                            const textData = decoder.decode(record.data);
                            if (!rfidCodeFromCard) rfidCodeFromCard = textData;
                            cardInfo.push(`Texto: ${textData}`);
                            console.log("📝 Texto encontrado:", textData);
                        } 
                        else if (record.recordType === "url") {
                            const decoder = new TextDecoder();
                            const urlData = decoder.decode(record.data);
                            if (!rfidCodeFromCard) rfidCodeFromCard = urlData;
                            cardInfo.push(`URL: ${urlData}`);
                            console.log("🔗 URL encontrada:", urlData);
                        }
                        else if (record.data) {
                            // Tentar ler dados raw como hex
                            const rawData = Array.from(new Uint8Array(record.data))
                                .map(b => b.toString(16).padStart(2, '0'))
                                .join('');
                            if (!rfidCodeFromCard && rawData.length > 0) {
                                rfidCodeFromCard = rawData.substring(0, 16); // Primeiros 16 chars
                            }
                            cardInfo.push(`Raw: ${rawData}`);
                            console.log("🔢 Dados Raw:", rawData);
                        }
                    } catch (recordError) {
                        console.log(`Erro ao processar record ${i}:`, recordError);
                    }
                }
            }

            // 3. Se ainda não temos dados, tentar outras propriedades do evento
            if (!rfidCodeFromCard) {
                if (event.tag && event.tag.id) {
                    const tagId = Array.from(new Uint8Array(event.tag.id))
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join('');
                    rfidCodeFromCard = tagId;
                    cardInfo.push(`Tag ID: ${tagId}`);
                    console.log("🏷️ Tag ID encontrado:", tagId);
                }
            }

            // 4. Se mesmo assim não temos dados, usar timestamp como ID único
            if (!rfidCodeFromCard) {
                rfidCodeFromCard = `CP_${Date.now().toString().slice(-8)}`;
                cardInfo.push("Gerado automaticamente");
                console.log("🤖 Código gerado automaticamente:", rfidCodeFromCard);
            }

            // Se não conseguir ler do cartão, usar o código do campo input como fallback
            const codeToSend = rfidCodeFromCard || rfidCode.trim() || "12AB34CD";

            const statusMessage = cardInfo.length > 0 
                ? `📡 Cartão CP detectado!\n\n🏷️ Código: ${codeToSend}\n\n📋 Dados encontrados:\n${cardInfo.slice(0, 3).join('\n')}`
                : `📡 Cartão detectado! Código: ${codeToSend}`;

            showStatus(statusMessage, "success");

            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100, 50, 100]);
            }

            sendToWhatsApp(codeToSend);
            stopScanning();
        } catch (error) {
            console.error("Erro ao ler NFC:", error);
            
            // Fallback: usar código do input ou gerar um baseado no timestamp
            const fallbackCode = rfidCode.trim() || `CP_${Date.now().toString().slice(-8)}`;
            showStatus(
                `⚠️ Erro na leitura NFC\n\n` +
                `🔧 Usando código alternativo: ${fallbackCode}\n\n` +
                `💡 Detalhes do erro: ${error.message}`, 
                "info"
            );
            
            sendToWhatsApp(fallbackCode);
            stopScanning();
        }
    };

    const handleTestScan = async () => {
        const phone = phoneNumber.trim();
        if (!phone) {
            showStatus("Por favor, insira o número de telefone para testar", "error");
            return;
        }

        // Simular leitura de cartão CP com códigos realistas
        const testCodes = [
            rfidCode.trim(),
            `CP_${Date.now().toString().slice(-8)}`,
            "04A2B3C4D5E6F7",
            "080012345678ABCD",
            "ANDANTE_789456123"
        ];
        
        const testRfidCode = testCodes.find(code => code && code.length > 0) || "CP_TEST123";
        showStatus(`🧪 Teste: Simulando leitura cartão CP - ${testRfidCode}`, "info");

        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        // Simular que o telefone recebeu uma mensagem RFID
        try {
            let backendUrl = 'http://localhost:5001';
            if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                backendUrl = 'https://backend.advir.pt/whatsapi';
            }

            // Simular que o número de telefone enviou uma mensagem com o código RFID
            const simulatedMessage = {
                to: phone, // Este é o número que está criando a intervenção
                message: testRfidCode, // O código RFID que será processado
                isTest: true, // Flag para indicar que é um teste
                isRFIDScan: true // Flag para identificar que é leitura RFID
            };

            console.log('Simulando mensagem RFID recebida de:', phone);
            console.log('Código RFID:', testRfidCode);

            const response = await fetch(`${backendUrl}/api/whatsapp/simulate-message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(simulatedMessage),
            });

            const responseData = await response.json();

            if (response.ok) {
                showStatus(
                    `✅ Teste realizado com sucesso!\n\n` +
                    `🧪 Código RFID simulado: ${testRfidCode}\n` +
                    `📱 Processado para: ${phone}\n` +
                    `🔧 Voltae para o WhatsApp para ver o processamento`,
                    "success"
                );
            } else {
                showStatus(
                    `❌ Erro no teste de simulação\n\n` +
                    `Detalhes: ${responseData.error || 'Erro desconhecido'}`,
                    "error"
                );
            }
        } catch (error) {
            // Fallback: se não conseguir simular via backend, mostrar instruções
            showStatus(
                `🧪 Teste local realizado!\n\n` +
                `📋 Para testar completamente:\n` +
                `1. Copie este código: ${testRfidCode}\n` +
                `2. Volte para o WhatsApp\n` +
                `3. Cole o código como uma mensagem\n` +
                `4. O sistema processará como RFID\n\n` +
                `⚠️ Erro de conexão com backend: ${error.message}`,
                "info"
            );
        }
    };

    const checkWhatsAppStatus = async () => {
        try {
            showStatus("🔍 Verificando status do WhatsApp...", "info");

            let backendUrl = 'http://localhost:5001';
            if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                backendUrl = 'https://backend.advir.pt/whatsapi';
            }

            const response = await fetch(`${backendUrl}/api/whatsapp/status`);
            const statusData = await response.json();

            if (response.ok) {
                const statusMessage = statusData.isReady 
                    ? "✅ WhatsApp Web está conectado e pronto!"
                    : `⚠️ WhatsApp Web não está pronto\nStatus: ${statusData.status}`;

                showStatus(statusMessage, statusData.isReady ? "success" : "error");
            } else {
                showStatus("❌ Erro ao verificar status do WhatsApp", "error");
            }
        } catch (error) {
            showStatus(`❌ Erro de conexão: ${error.message}`, "error");
        }
    };

    const sendToWhatsApp = async (rfidCode) => {
        const phone = phoneNumber.trim();

        try {
            showStatus("Processando código RFID para intervenção...", "info");

            // Usar a URL correta do backend WhatsApp
            let backendUrl = 'http://localhost:5001';
            if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                backendUrl = 'https://backend.advir.pt/whatsapi';
            }

            console.log('Enviando código RFID simulado para:', `${backendUrl}/api/whatsapp/simulate-message`);
            console.log('Dados:', { to: phone, message: rfidCode, isRFIDScan: true });

            // Simular que o número de telefone enviou uma mensagem com o código RFID
            const response = await fetch(`${backendUrl}/api/whatsapp/simulate-message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    to: phone,
                    message: rfidCode, // Enviar apenas o código RFID
                    isRFIDScan: true // Flag para identificar que é leitura RFID
                }),
            });

            const responseData = await response.json();
            console.log('Resposta do servidor:', responseData);

            if (response.ok) {
                showStatus(
                    `✅ Código RFID processado com sucesso!\n\n` +
                    `🏷️ Código: ${rfidCode}\n` +
                    `📱 Processado para: ${phone}\n` +
                    `🔧 Continuando no WhatsApp para completar a intervenção`,
                    "success"
                );

                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200, 100, 200]);
                }

                // Instruir o utilizador a voltar para o WhatsApp
                setTimeout(() => {
                    showStatus(
                        `✅ Código RFID processado!\n\n` +
                        `📱 Volte para o WhatsApp para continuar a conversa de intervenção.\n\n` +
                        `O sistema já recebeu o código: ${rfidCode}`,
                        "success"
                    );
                }, 2000);

                setTimeout(() => {
                    if (window.confirm("Deseja escanear outro código RFID?")) {
                        startScanning();
                    }
                }, 5000);
            } else {
                showStatus(
                    `❌ Erro ao processar código RFID\n\n` +
                    `Detalhes: ${responseData.error || 'Erro desconhecido'}\n` +
                    `Verifique se o WhatsApp Web está conectado`,
                    "error"
                );
            }
        } catch (error) {
            showStatus("Erro de conexão: " + error.message, "error");
        }
    };

    const toggleScanning = () => {
        if (!isScanning) {
            startScanning();
        } else {
            stopScanning();
        }
    };

    const getStatusStyle = () => {
        const baseStyle = styles.status;
        switch (status.type) {
            case 'success':
                return { ...baseStyle, ...styles.statusSuccess };
            case 'error':
                return { ...baseStyle, ...styles.statusError };
            case 'info':
                return { ...baseStyle, ...styles.statusInfo };
            default:
                return baseStyle;
        }
    };

    const nfcSupported = "NDEFReader" in window;

    return (
        <div style={styles.body}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Leitor RFID/NFC</h2>
                    <p style={styles.subtitle}>AdvirLink - Leitura de Códigos RFID</p>
                </div>

                <div style={styles.content}>
                    <div style={styles.inputGroup}>
                        <label htmlFor="phoneNumber" style={styles.label}>Número WhatsApp (que está criando a intervenção)</label>
                        <input
                            type="text"
                            id="phoneNumber"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="Ex: 351912345678 (número que está a criar a intervenção)"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label htmlFor="rfidCode" style={styles.label}>Código RFID Alternativo (se não conseguir ler do cartão)</label>
                        <input
                            type="text"
                            id="rfidCode"
                            value={rfidCode}
                            onChange={(e) => setRfidCode(e.target.value)}
                            placeholder="Ex: 12AB34CD (backup caso não leia o cartão)"
                            style={styles.input}
                        />
                    </div>

                    <button
                        onClick={toggleScanning}
                        disabled={!nfcSupported}
                        style={{
                            ...styles.scanButton,
                            ...(isScanning ? styles.scanButtonStop : {}),
                            ...(!nfcSupported ? styles.scanButtonDisabled : {})
                        }}
                    >
                        {isScanning ? 'Parar Scanner' :
                            !nfcSupported ? 'NFC Não Suportado' : 'Iniciar Scanner NFC'}
                    </button>

                    {/* Botão de Teste */}
                    <button
                        onClick={handleTestScan}
                        style={{
                            ...styles.scanButton,
                            backgroundColor: '#28a745',
                            marginTop: '10px'
                        }}
                    >
                        🧪 Teste - Simular Leitura
                    </button>

                    <div style={{
                        ...styles.scanningArea,
                        ...(isScanning ? styles.scanningAreaActive : {})
                    }}>
                        <span style={styles.scanningIcon}>🏷️</span>
                        <p style={styles.scanningText}>
                            {isScanning ? 
                                "Aproxime o cartão para LER seu código RFID" : 
                                "Pronto para ler códigos RFID dos cartões"
                            }
                        </p>
                    </div>

                    {status.message && (
                        <div style={getStatusStyle()}>
                            {status.message.split('\n').map((line, index) => (
                                <div key={index}>{line}</div>
                            ))}
                        </div>
                    )}

                    <div style={styles.instructions}>
                        <h4 style={styles.instructionsTitle}>Instruções de Uso</h4>
                        <ol style={styles.instructionsList}>
                            <li style={styles.instructionsItem}>Insira o número WhatsApp que está criando a intervenção</li>
                            <li style={styles.instructionsItem}>O campo alternativo é usado apenas se não conseguir ler o cartão</li>
                            <li style={styles.instructionsItem}><strong>Para testar:</strong> Use o botão "🧪 Teste - Simular Leitura"</li>
                            <li style={styles.instructionsItem}><strong>Para uso real:</strong> Toque em "Iniciar Scanner NFC"</li>
                            <li style={styles.instructionsItem}>Aproxime o cartão RFID do telemóvel para LER seu código</li>
                            <li style={styles.instructionsItem}>O código RFID lido será processado pelo sistema de intervenções</li>
                            <li style={styles.instructionsItem}>O sistema continuará o processo da intervenção automaticamente</li>
                        </ol>

                        <p style={styles.instructionsText}><strong>Como Funciona:</strong></p>
                        <ul style={styles.instructionsList}>
                            <li style={styles.instructionsItem}>📖 <strong>1. LER:</strong> O código único do cartão (Serial Number, UID, ou dados NDEF)</li>
                            <li style={styles.instructionsItem}>🔧 <strong>2. PROCESSAR:</strong> O código é enviado automaticamente para a intervenção ativa</li>
                            <li style={styles.instructionsItem}>📱 <strong>3. CONTINUAR:</strong> Voltar para o WhatsApp para continuar a conversa</li>
                            <li style={styles.instructionsItem}>✅ <strong>Resultado:</strong> O artigo é adicionado à intervenção automaticamente</li>
                            <li style={styles.instructionsItem}>🔄 <strong>Fluxo:</strong> Scanner → Leitura NFC → Processa na Intervenção → Continua no WhatsApp</li>
                        </ul>

                        <p style={styles.instructionsText}><strong>Tipos de Cartões Suportados:</strong></p>
                        <ul style={styles.instructionsList}>
                            <li style={styles.instructionsItem}>🚊 <strong>Cartões CP:</strong> Comboios de Portugal (Andante, Viva Viagem, etc.)</li>
                            <li style={styles.instructionsItem}>🏷️ <strong>Cartões RFID:</strong> Cartões de acesso, identificação</li>
                            <li style={styles.instructionsItem}>📱 <strong>Tags NFC:</strong> Etiquetas NFC programáveis</li>
                            <li style={styles.instructionsItem}>💳 <strong>Cartões Contactless:</strong> Com chip NFC ativo</li>
                        </ul>

                        <p style={styles.instructionsText}><strong>Requisitos do Sistema:</strong></p>
                        <ul style={styles.instructionsList}>
                            <li style={styles.instructionsItem}>Android com NFC ativado</li>
                            <li style={styles.instructionsItem}>Google Chrome</li>
                            <li style={styles.instructionsItem}>Ligação à internet ativa</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NFCScanner;