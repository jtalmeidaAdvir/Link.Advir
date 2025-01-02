import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaFileContract, FaPhone, FaBoxOpen, FaQuestionCircle,FaBars } from 'react-icons/fa';

import { motion } from 'framer-motion';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Home = () => {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('Contrato'); // Estado para o menu ativo
  const [contratoInfo, setContratoInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const toggleDrawer = () => {
    setDrawerOpen(!isDrawerOpen);
  };

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
  };


  const [expandedIndex, setExpandedIndex] = useState(null); // Estado para controlar qual pergunta está expandida

  const faqItems = [
    {
      question: 'Como posso alterar as minhas informações de contrato?',
      answer: 'Para alterar as informações de contrato, aceda à secção "Contrato" e clique em "Editar".',
    },
    {
      question: 'Quais são os métodos de pagamento disponíveis?',
      answer: 'Pode pagar através de transferência bancária, cartão de crédito ou débito direto.',
    },
    {
      question: 'Como posso contactar o suporte?',
      answer: 'Pode contactar o suporte através do número de telefone listado na secção "Pedidos".',
    },
  ];
  
  const handleToggle = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index); // Alterna entre expandido e fechado
  };
  



  const menus = [
    { title: 'Contrato', color: '#0022FF', icon: <FaFileContract size={32} /> },
    { title: 'Pedidos', color: '#0022FF', icon: <FaPhone size={32} /> }, // Ícone de telefone para "Pedidos"
    { title: 'Produtos', color: '#0022FF', icon: <FaBoxOpen size={32} /> },
    { title: 'FAQ', color: '#0022FF', icon: <FaQuestionCircle size={32} /> }, // Ícone de perguntas para "FAQ"
  ];


  useEffect(() => {
    const fetchContratoInfo = async () => {
      try {
        const token = await AsyncStorage.getItem('painelAdminToken');
        const urlempresa = await AsyncStorage.getItem('urlempresa');
        const id = await AsyncStorage.getItem('empresa_areacliente');

        if (!id) {
          setErrorMessage('ID da empresa não encontrado.');
          setLoading(false);
          return;
        }

        if (!token || !urlempresa) {
          setErrorMessage('Token ou URL da empresa não encontrados.');
          setLoading(false);
          return;
        }

          const response = await fetch(`https://webapiprimavera.advir.pt/clientArea/ObterInfoContrato/${id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            urlempresa,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Erro : ${response.statusText}`);
        }

        const data = await response.json();
        setContratoInfo(data);
        console.log('Dados recebidos do endpoint:', data);
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContratoInfo();
  }, []);

  return (
    <div style={{ height: '100vh', overflowY: 'auto', fontFamily: 'Poppins, sans-serif', background: 'linear-gradient(135deg, #f3f6fb, #d4e4ff)' }}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet" />
      
      {/* Sticky Navbar */}
      <nav className="navbar navbar-light fixed-top" style={{ backgroundColor: '#d4e4ff', color: '#FFFFFF' }}>
        <div className="container-fluid">
          <button className="btn" onClick={toggleDrawer}>
            <FaBars size={24} style={{ color: '#FFFFFF' }} />
          </button>
          <span className="navbar-brand mb-0 h1" style={{ color: '#FFFFFF' }}>Advir Plan</span>
        </div>
      </nav>

      {/* Drawer Navigation */}
      <div className={`drawer ${isDrawerOpen ? 'open' : ''}`} style={{
        width: isDrawerOpen ? '250px' : '0',
        height: '100%',
        backgroundColor: '#d4e4ff',
        position: 'fixed',
        top: '0',
        left: '0',
        overflowX: 'hidden',
        transition: '0.5s',
        zIndex: '9999',
      }}>
        <button className="closebtn" onClick={toggleDrawer} style={{ color: '#FFFFFF', fontSize: '24px', marginLeft: '10px' }}>&times;</button>
        <div className="drawer-content" style={{ padding: '10px', color: '#FFFFFF', marginTop: '20px' }}>
          <a href="#about" style={{ color: '#FFFFFF', textDecoration: 'none', display: 'block', padding: '10px' }}>Sobre Nós</a>
          <a href="#services" style={{ color: '#FFFFFF', textDecoration: 'none', display: 'block', padding: '10px' }}>Serviços</a>
        </div>
      </div>

      {/* Main Content */}
      <section className="text-center" style={{
        padding: '50px 20px',
        backgroundColor: '#d4e4ff',
        minHeight: '100vh',
        fontFamily: 'Poppins, sans-serif',
      }}>
        <h2 style={{ fontWeight: '600', color: '#0022FF', marginBottom: '20px' }}>Área do Cliente - Advir</h2>

        {/* Menu Section */}
        <div style={{
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: '20px',
  marginBottom: '40px',
}}>
  {menus.map((menu, index) => (
    <div
      key={index}
      onClick={() => handleMenuClick(menu.title)}
      style={{
        width: '200px',
        height: '150px',
        backgroundColor: activeMenu === menu.title ? '#0056FF' : menu.color, // Cor do menu ativo
        borderRadius: '15px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#FFFFFF',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        transition: 'transform 0.2s, background-color 0.3s', // Animação de transição
      }}
      onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
      onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
    >
      {menu.icon}
      <span style={{ fontSize: '18px', marginTop: '10px' }}>{menu.title}</span>
    </div>
  ))}
</div>


        {/* Content Based on Active Menu */}
        {activeMenu === 'Contrato' && (
          <>
            {loading ? (
              <p>Carregando informações...</p>
            ) : errorMessage ? (
              <p style={{ color: 'red', fontSize: '18px' }}>{errorMessage}</p>
            ) : contratoInfo ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  maxWidth: '600px',
                  margin: '0 auto',
                  padding: '30px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '15px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                  textAlign: 'left',
                }}
              >
                <h2 style={{ fontWeight: '300', color: '#0022FF', marginBottom: '20px' }}>Informações do Contrato</h2>
                <div style={{ borderBottom: '1px solid #E0E0E0', paddingBottom: '15px', marginBottom: '15px' }}>
                  <p style={{ margin: '5px 0' }}>
                    <strong style={{ color: '#555' }}>Código:</strong> {contratoInfo.DataSet.Table[0]?.Codigo}
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <strong style={{ color: '#555' }}>Descrição:</strong> {contratoInfo.DataSet.Table[0]?.Descricao}
                  </p>
                </div>
                <p style={{ margin: '10px 0' }}>
                  <strong style={{ color: '#555' }}>Horas Contratualizadas:</strong> {contratoInfo.DataSet.Table[0]?.HorasTotais} h
                </p>
                <p style={{ margin: '10px 0' }}>
                  <strong style={{ color: '#555' }}>Horas Gastas:</strong> {contratoInfo.DataSet.Table[0]?.HorasGastas} h
                </p>
              </motion.div>
            ) : (
              <p style={{ fontSize: '18px', color: '#333' }}>Informações não disponíveis.</p>
            )}
          </>
        )}
        {activeMenu === 'Pedidos' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              maxWidth: '600px',
              margin: '0 auto',
              padding: '30px',
              backgroundColor: '#FFFFFF',
              borderRadius: '15px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontWeight: '300', color: '#0022FF', marginBottom: '20px' }}>Pedidos</h2>
            <p>Conteúdo relacionado com Pedidos.</p>
          </motion.div>
        )}
       {activeMenu === 'Produtos' && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#FFFFFF',
      borderRadius: '15px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
      textAlign: 'center',
    }}
  >
    <h2 style={{ fontWeight: '300', color: '#0022FF', marginBottom: '20px' }}>Produtos</h2>
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '20px',
      }}
    >
      {/* Produto Primavera */}
      <div
        style={{
          width: '200px',
          textAlign: 'center',
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '15px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
        }}
      >
        <img
          src="https://pt.primaverabss.com/temas/primavera/img/cegid-logo-footer.svg"
          alt="Primavera"
          style={{ width: '100%', height: 'auto', marginBottom: '10px' }}
        />
        <a
          href="https://www.primaverabss.com/pt/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            textDecoration: 'none',
            color: '#0056FF',
            fontWeight: '500',
          }}
        >
          Primavera
        </a>
      </div>
{/* Produto AdvirLink */}
<div
        style={{
          width: '200px',
          textAlign: 'center',
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '15px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
        }}
      >
        <img
          src="http://localhost:19006/static/media/img_logo.a2a85989c690f4bfd096.png"
          alt="Syslog"
          style={{ width: '100%', height: 'auto', marginBottom: '10px' }}
        />
        <a
          href="https://link.advir.pt"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            textDecoration: 'none',
            color: '#0056FF',
            fontWeight: '500',
          }}
        >
          AdvirLink
        </a>
      </div>

      {/* Produto Syslog */}
      <div
        style={{
          width: '200px',
          textAlign: 'center',
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '15px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
        }}
      >
        <img
          src="https://www.syslogmobile.com/wp-content/themes/syslog/images/logo-syslog.png"
          alt="Syslog"
          style={{ width: '100%', height: 'auto', marginBottom: '10px' }}
        />
        <a
          href="https://www.syslogmobile.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            textDecoration: 'none',
            color: '#0056FF',
            fontWeight: '500',
          }}
        >
          Syslog
        </a>
      </div>
    </div>
  </motion.div>
)}



        {activeMenu === 'FAQ' && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#FFFFFF',
      borderRadius: '15px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
    }}
  >
    <h2 style={{ fontWeight: '300', color: '#0022FF', marginBottom: '20px' }}>Perguntas Frequentes</h2>
    <div>
      {faqItems.map((item, index) => (
        <div key={index} style={{ borderBottom: '1px solid #E0E0E0', paddingBottom: '15px', marginBottom: '15px' }}>
          <div
            onClick={() => handleToggle(index)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 15px',
              backgroundColor: expandedIndex === index ? '#f3f6fb' : '#FFFFFF',
              borderRadius: '8px',
              boxShadow: expandedIndex === index ? '0 2px 5px rgba(0, 0, 0, 0.1)' : 'none',
            }}
          >
            <strong style={{ color: '#333', fontSize: '16px' }}>{item.question}</strong>
            <span style={{ fontSize: '20px', color: '#666' }}>
              {expandedIndex === index ? '-' : '+'}
            </span>
          </div>
          {expandedIndex === index && (
            <div
              style={{
                backgroundColor: '#f9f9f9',
                padding: '10px 15px',
                borderRadius: '8px',
                marginTop: '5px',
                color: '#555',
                fontSize: '14px',
              }}
            >
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  </motion.div>
)}


      </section>
    </div>
  );
};

export default Home;
