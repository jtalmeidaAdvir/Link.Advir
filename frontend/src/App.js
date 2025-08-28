import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Pages/Home';
import RegistoPontoFacial from './Pages/Assiduidade/RegistoPontoFacial';
import LoginPOS from './Pages/Autenticacao/pages/LoginPOS';
import GestaoPOS from './Pages/Autenticacao/GestaoPOS';
import PainelAdmin from './Pages/Autenticacao/PainelAdmin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/registo-ponto-facial" element={<RegistoPontoFacial />} />
        <Route path="/pos" element={<LoginPOS />} />
        <Route path="/gestao-pos" element={<GestaoPOS />} />
        <Route path="/painel-admin" element={<PainelAdmin />} />
      </Routes>
    </Router>
  );
}

export default App;