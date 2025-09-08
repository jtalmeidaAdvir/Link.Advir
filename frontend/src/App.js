import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Pages/Home';
import RegistoPontoFacial from './Pages/Assiduidade/RegistoPontoFacial';
import LoginPOS from './Pages/Autenticacao/pages/LoginPOS';
import GestaoPOS from './Pages/Autenticacao/GestaoPOS';
import PainelAdmin from './Pages/Autenticacao/PainelAdmin';
import WhatsAppWebConfig from './Pages/WhatsApp/WhatsAppWebConfig';
import NFCScanner from './Pages/WhatsApp/NFCScanner';

function App() {
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