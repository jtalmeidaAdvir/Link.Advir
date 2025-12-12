import React, { useEffect } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Pages/Home';
import RegistoPontoFacial from './Pages/Assiduidade/RegistoPontoFacial';
import LoginPOS from './Pages/Autenticacao/pages/LoginPOS';
import GestaoPOS from './Pages/Autenticacao/GestaoPOS';
import PainelAdmin from './Pages/Autenticacao/PainelAdmin';
import WhatsAppWebConfig from './Pages/WhatsApp/WhatsAppWebConfig';
import NFCScanner from './Pages/WhatsApp/NFCScanner';
import { migrateToSecureStorage, isMigrationCompleted } from './utils/migrateToSecureStorage';


function App() {
    // Executar migração para secureStorage na primeira vez
    useEffect(() => {
        if (!isMigrationCompleted()) {
            console.log('🔐 Migrando dados para armazenamento seguro...');
            migrateToSecureStorage();
        }
        
        // Limpar tokens inválidos após migração
        const loginToken = secureStorage.getItem('loginToken');
        if (loginToken) {
            try {
                // Tentar desencriptar e validar
                const { secureStorage } = require('./utils/secureStorage');
                const decrypted = secureStorage.getItem('loginToken');
                
                // Verificar se é um JWT válido (3 partes separadas por ponto)
                if (!decrypted || typeof decrypted !== 'string' || decrypted.split('.').length !== 3) {
                    console.warn('⚠️ Token inválido detectado, a limpar...');
                    secureStorage.clear();
                }
            } catch (error) {
                console.warn('⚠️ Erro ao validar token, a limpar storage:', error);
                secureStorage.clear();
            }
        }
    }, []);

    // Check for NFC scanner route BEFORE any router setup
    const currentHash = window.location.hash;

    // If URL contains /nfc-scanner, render NFCScanner directly without any routing
    if (currentHash.includes('/nfc-scanner')) {
        return <NFCScanner />;
    }

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/registo-ponto-facial" element={<RegistoPontoFacial />} />
                <Route path="/pos" element={<LoginPOS />} />
                <Route path="/gestao-pos" element={<GestaoPOS />} />
                <Route path="/painel-admin" element={<PainelAdmin />} />
                <Route path="/whatsapp-config" element={<WhatsAppWebConfig />} />
                <Route path="/nfc-scanner" element={<NFCScanner />} />
            </Routes>
        </Router>
    );
}

export default App;