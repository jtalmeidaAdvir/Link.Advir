'6px',
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
        const { serialNumber } = event;
        const rfidCode = serialNumber || `RFID_${Date.now()}`;

        showStatus(`RFID lido com sucesso: ${rfidCode}`, "success");

        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        sendToWhatsApp(rfidCode);
        stopScanning();
    };

    const handleTestScan = () => {
        const phone = phoneNumber.trim();
        if (!phone) {
            showStatus("Por favor, insira o número de telefone para testar", "error");
            return;
        }

        // Simular código RFID de teste
        const testRfidCode = "12AB34CD";
        showStatus(`🧪 Teste: Simulando leitura RFID - ${testRfidCode}`, "info");
        
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        sendToWhatsApp(testRfidCode);
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
            showStatus("Enviando código para WhatsApp...", "info");

            // Usar a URL correta do backend WhatsApp
            let backendUrl = 'http://localhost:5001';
            if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                backendUrl = 'https://backend.advir.pt/whatsapi';
            }

            console.log('Enviando para:', `${backendUrl}/api/whatsapp/send`);
            console.log('Dados:', { to: phone, message: rfidCode, priority: "high" });

            const response = await fetch(`${backendUrl}/api/whatsapp/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    to: phone,
                    message: rfidCode,
                    priority: "high",
                }),
            });

            const responseData = await response.json();
            console.log('Resposta do servidor:', responseData);

            if (response.ok) {
                showStatus(
                    `✅ Código ${rfidCode} enviado com sucesso!\n\n` +
                    `📱 Verifique o WhatsApp agora\n` +
                    `🔄 Se não recebeu, verifique se o WhatsApp Web está conectado`,
                    "success"
                );

                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200, 100, 200]);
                }

                setTimeout(() => {
                    if (window.confirm("Deseja escanear outro artigo?")) {
                        startScanning();
                    }
                }, 3000);
            } else {
                showStatus(
                    `❌ Erro ao enviar código para WhatsApp\n\n` +
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
                    <h2 style={styles.title}>Scanner RFID/NFC</h2>
                    <p style={styles.subtitle}>AdvirLink - Sistema de Intervenções</p>
                </div>

                <div style={styles.content}>
                    <div style={styles.inputGroup}>
                        <label htmlFor="phoneNumber" style={styles.label}>Número WhatsApp</label>
                        <input
                            type="text"
                            id="phoneNumber"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="Ex: 351912345678"
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
                        <span style={styles.scanningIcon}>📱</span>
                        <p style={styles.scanningText}>Aproxime o cartão RFID do dispositivo</p>
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
                            <li style={styles.instructionsItem}>Verifique se o número WhatsApp está preenchido</li>
                            <li style={styles.instructionsItem}><strong>Para testar:</strong> Use o botão "🧪 Teste - Simular Leitura"</li>
                            <li style={styles.instructionsItem}><strong>Para uso real:</strong> Toque em "Iniciar Scanner NFC"</li>
                            <li style={styles.instructionsItem}>Aproxime o passe dos comboios/cartão RFID do telemóvel</li>
                            <li style={styles.instructionsItem}>O código será enviado automaticamente para o WhatsApp</li>
                            <li style={styles.instructionsItem}>Volte para o WhatsApp para continuar</li>
                        </ol>

                        <p style={styles.instructionsText}><strong>Como Testar:</strong></p>
                        <ul style={styles.instructionsList}>
                            <li style={styles.instructionsItem}>🧪 <strong>Modo Teste:</strong> Use o botão verde para simular</li>
                            <li style={styles.instructionsItem}>🎫 <strong>Teste Real:</strong> Passe dos comboios funciona perfeitamente</li>
                            <li style={styles.instructionsItem}>📱 <strong>Cartões:</strong> Cartões de transporte, crédito, etc.</li>
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
