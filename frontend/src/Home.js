import React, { useState, useEffect,useRef  } from 'react';
import { useTranslation } from 'react-i18next';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaFileContract, FaPhone, FaBoxOpen, FaQuestionCircle, FaBars } from 'react-icons/fa';
import { motion } from 'framer-motion';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './i18n'; // Import do i18n

const Home = () => {
    const { t } = useTranslation();
    

    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState(t('Home.menu.products')); // Estado para o menu ativo
    const [contratoInfo, setContratoInfo] = useState(null);
    const [pedidosInfo, setPedidosInfo] = useState(null);
    const [pedidosError, setPedidosError] = useState('');
    const [pedidosLoading, setPedidosLoading] = useState(false);
    const [expandedIndex, setExpandedIndex] = useState(null); // Estado para controlar qual pergunta está expandida
    const [groupedPedidos, setGroupedPedidos] = useState({});
    const [expandedInterv, setExpandedInterv] = useState({}); // Estado para controlar intervenções expandidas
    const [searchTerm, setSearchTerm] = useState(''); // Estado para a barra de pesquisa
    const [currentPage, setCurrentPage] = useState(1); // Estado para a página atual
    const itemsPerPage = 5; // Número de processos por página
    const [contratoLoading, setContratoLoading] = useState(false);
    const [initialDataLoading, setInitialDataLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    

    const [selectedEstado, setSelectedEstado] = useState(''); // Estado para o filtro

    const estadosDisponiveis = pedidosInfo
    ? [...new Set(pedidosInfo.DataSet.Table.map((pedido) => pedido.DescricaoEstado))]
    : [];

// Referências para as seções
const contractRef = useRef(null);
const ordersRef = useRef(null);
const productsRef = useRef(null);
const faqRef = useRef(null);


const [showForm, setShowForm] = useState(false);

const toggleForm = () => {
    setShowForm(!showForm);
};


const handleFormSubmit = async (event) => {
    event.preventDefault();

    // Validação de campos obrigatórios
    if (!formData.contacto || !formData.prioridade || !formData.descricaoProblema) {
        setErrorMessage(t('Por favor, preencha todos os campos obrigatórios.'));
        return;
    }

    try {
        const token = await AsyncStorage.getItem('painelAdminToken');
        const urlempresa = await AsyncStorage.getItem('urlempresa');
        const clienteID = await AsyncStorage.getItem('empresa_areacliente');

        if (!token || !urlempresa || !clienteID) {
            throw new Error(t('Erro: Token ou informações da empresa estão ausentes.'));
        }

        const payload = {
            ...formData,
            cliente: clienteID, // Define o cliente a partir do AsyncStorage
            datahoraabertura: new Date().toISOString(),
        };

        console.log('Enviando o pedido com payload:', payload);

        const response = await fetch(`https://webapiprimavera.advir.pt/routePedidos_STP/CriarPedido`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                urlempresa,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro ao criar pedido:', errorData);
            throw new Error(t('Erro ao criar o pedido: ') + errorData.message);
        }

        const responseData = await response.json();
        console.log('Resposta da criação do pedido:', responseData);

        // Mensagem de sucesso e fechar o formulário
        setSuccessMessage(t('Pedido criado com sucesso!'));
        setShowForm(false); // Fecha o formulário
        setFormData({
            cliente: '',
            contacto: '',
            prioridade: '',
            descricaoProblema: '',
            origem: 'SITE',
            tecnico: '',
            tipoProcesso: 'PASI',
            estado: 1,
            serie: '2025',
            seccao: 'SD',
            objectoID: '9dc979ae-96b4-11ef-943d-e08281583916',
            contratoID: '',
        });

        // Limpar mensagem de sucesso após 3 segundos
        setTimeout(() => {
            setSuccessMessage('');
        }, 3000);
    } catch (error) {
        console.error('Erro ao enviar o pedido:', error);
        setErrorMessage(error.message);
    }
};




 // Função para atualizar o termo da pesquisa
 const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
};

const [formData, setFormData] = useState({
    cliente: '', // ID do cliente logado
    contacto: '', // ID do contacto selecionado
    prioridade: '', // ID da prioridade selecionada
    descricaoProblema: '', // Descrição do problema
    origem: 'SITE', // Origem padrão ou ajustável
    tecnico: '000', // vazio
    tipoProcesso: 'PASI', // Tipo de processo
    estado: 1, // Estado inicial
    serie: '2025',
    seccao: 'SD' , // Secção associada 
    objectoID: '9dc979ae-96b4-11ef-943d-e08281583916',
    contratoID: '', // contrato associado
    datahoraabertura: '', // Preenchido automaticamente
    datahorafimprevista: '', // Calculado automaticamente
});


const [dataLists, setDataLists] = useState({
    contactos: [],
    prioridades: [],
});


    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(true);

    const toggleDrawer = () => {
        setDrawerOpen(!isDrawerOpen);
    };

 // Função para alternar o menu e rolar para a seção correspondente
 const handleMenuClick = (menu, ref) => {
    setActiveMenu(menu);

    // Rolar suavemente até a seção associada
    if (ref && ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth' });
    }
};



    // Função para alternar a expansão de uma intervenção específica
    const toggleExpand = (processo, intervIndex) => {
        setExpandedInterv((prevState) => ({
            ...prevState,
            [`${processo}-${intervIndex}`]: !prevState[`${processo}-${intervIndex}`],
        }));
    };


    const faqItems = [
        {
            question: t('Home.faq.questions.q1'),
            answer: t('Home.faq.questions.a1'),
        },
        {
            question: t('Home.faq.questions.q2'),
            answer: t('Home.faq.questions.a2'),
        },
        {
            question: t('Home.faq.questions.q3'),
            answer: t('Home.faq.questions.a3'),
        },
    ];

    const handleToggle = (index) => {
        setExpandedIndex(expandedIndex === index ? null : index); // Alterna entre expandido e fechado
    };

    // Função para formatar datas
    const formatDateTime = (dateString) => {
        if (!dateString) return ''; // Caso a data seja inválida ou nula
        const date = new Date(dateString);
        const twoDigits = (num) => (num < 10 ? `0${num}` : num); // Adiciona zero à esquerda
        return `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear()} - ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}`;
    };

  // Filtrar pedidos com base no termo de pesquisa
  const filteredPedidos = groupedPedidos
  ? Object.fromEntries(
      Object.entries(groupedPedidos).filter(([processo, pedidos]) =>
          pedidos.some(
              (pedido) =>
                  (selectedEstado === '' || pedido.DescricaoEstado === selectedEstado) &&
                  (pedido.Processo.toLowerCase().includes(searchTerm) ||
                      pedido.DescricaoEstado.toLowerCase().includes(searchTerm) ||
                      pedido.DescricaoProb.toLowerCase().includes(searchTerm) ||
                      pedido.DescricaoResp.toLowerCase().includes(searchTerm) ||
                      pedido.NomeTecnico.toLowerCase().includes(searchTerm))
          )
      ).map(([processo, pedidos]) => [
          processo,
          pedidos.filter(
              (pedido) =>
                  (selectedEstado === '' || pedido.DescricaoEstado === selectedEstado) &&
                  (pedido.Processo.toLowerCase().includes(searchTerm) ||
                      pedido.DescricaoEstado.toLowerCase().includes(searchTerm) ||
                      pedido.DescricaoProb.toLowerCase().includes(searchTerm) ||
                      pedido.DescricaoResp.toLowerCase().includes(searchTerm) ||
                      pedido.NomeTecnico.toLowerCase().includes(searchTerm))
          ),
      ])
  )
  : {};


      // Função para calcular os processos a serem exibidos na página atual
      const paginatedPedidos = Object.keys(filteredPedidos).slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Total de páginas
    const totalPages = Math.ceil(Object.keys(filteredPedidos).length / itemsPerPage);

    // Função para alterar a página
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };


    const menus = [
        { title: t('Home.menu.contract'), icon: <FaFileContract size={22} />, ref: contractRef },
        { title: t('Home.menu.orders'), icon: <FaPhone size={22} />, ref: ordersRef },
        { title: t('Home.menu.products'), icon: <FaBoxOpen size={22} />, ref: productsRef },
        { title: t('Home.menu.faq'), icon: <FaQuestionCircle size={22} />, ref: faqRef },
    ];

    useEffect(() => {
        if (pedidosInfo) {
            const grouped = pedidosInfo.DataSet.Table.reduce((acc, pedido) => {
                const processo = pedido.Processo;
                if (!acc[processo]) {
                    acc[processo] = [];
                }
                acc[processo].push(pedido);
                return acc;
            }, {});
            setGroupedPedidos(grouped);
        }
    }, [pedidosInfo]);

    useEffect(() => {
        const fetchPedidosInfo = async () => {
            setPedidosLoading(true);
            setLoading(true);
            try {
                const token = await AsyncStorage.getItem('painelAdminTokenAdvir');
                const urlempresa = await AsyncStorage.getItem('urlempresaAdvir');
                const id = await AsyncStorage.getItem('empresa_areacliente');

                if (!id || !token || !urlempresa) {
                    throw new Error(t('error') + 'Token or URL missing.');
                }

                const response = await fetch(
                    `https://webapiprimavera.advir.pt/clientArea/AreaclientListarpedidos/${id}`,
                    {
                        headers: { Authorization: `Bearer ${token}`, urlempresa },
                    }
                );

                if (!response.ok) throw new Error(t('error') + response.statusText);
                const data = await response.json();
                setPedidosInfo(data);
            } catch (error) {
                setPedidosError(error.message);
            } finally {
                setPedidosLoading(false);
            setLoading(false);
            console.log("Finalizado fetch de dados iniciais e contrato.");
            }
        };

        if (activeMenu === t('Home.menu.orders')) {
            fetchPedidosInfo();
        }
    }, [activeMenu, t]);

    useEffect(() => {
        const entrarNaEmpresaAdvir = async () => {
            try {
                const loginToken = localStorage.getItem('loginToken');
                if (!loginToken) {
                    throw new Error('Token de login não encontrado.');
                }
    
                // Buscar as credenciais da empresa Advir
                const credenciaisResponse = await fetch(
                    'https://backend.advir.pt/api/empresas/nome/Advir',
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${loginToken}`,
                        },
                    }
                );
    
                if (!credenciaisResponse.ok) {
                    throw new Error('Erro ao buscar credenciais da empresa Advir.');
                }
    
                const credenciais = await credenciaisResponse.json();
    
                // Guardar a `urlempresa` no localStorage
                localStorage.setItem('urlempresaAdvir', credenciais.urlempresa);
    
                // Obter o token para a empresa Advir
                const tokenResponse = await fetch(
                    'https://webapiprimavera.advir.pt/connect-database/token',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${loginToken}`,
                        },
                        body: JSON.stringify({
                            username: credenciais.username,
                            password: credenciais.password,
                            company: credenciais.empresa,
                            line: credenciais.linha,
                            instance: 'DEFAULT',
                            urlempresa: credenciais.urlempresa,
                            forceRefresh: true,
                        }),
                    }
                );
    
                if (!tokenResponse.ok) {
                    throw new Error('Erro ao obter o token da empresa Advir.');
                }
    
                const tokenData = await tokenResponse.json();
                localStorage.setItem('painelAdminTokenAdvir', tokenData.token);
                console.log('Login automático na empresa Advir concluído.');
            } catch (error) {
                console.error('Erro ao entrar automaticamente na empresa Advir:', error.message);
            }
        };
        

        entrarNaEmpresaAdvir();
    }, []);
    


    
 useEffect(() => {
    const fetchData = async () => {
        console.log("Iniciando fetch de dados iniciais e contrato.");
        setContratoLoading(true);
        setLoading(true);

        try {
            const token = await AsyncStorage.getItem('painelAdminTokenAdvir');
            const urlempresa = await AsyncStorage.getItem('urlempresaAdvir');
            const clienteID = await AsyncStorage.getItem('empresa_areacliente');

            console.log('Token:', token, 'URL Empresa:', urlempresa, 'Cliente ID:', clienteID);

            if (!clienteID || !token || !urlempresa) {
                console.error('Token, URL ou ID de cliente estão ausentes.');
                return;
            }

            // Fetch contrato
            const contratoResponse = await fetch(`https://webapiprimavera.advir.pt/clientArea/ObterInfoContrato/${clienteID}`, {
                headers: { Authorization: `Bearer ${token}`, urlempresa },
            });

            if (!contratoResponse.ok) {
                throw new Error(`Erro ao buscar contrato: ${contratoResponse.statusText}`);
            }
            const contratoData = await contratoResponse.json();
            console.log('Contrato Data:', contratoData);

            // Atualizar informações do contrato
            setContratoInfo(contratoData);

            // Atualizar contratoID no formulário automaticamente
            if (contratoData?.DataSet?.Table?.length > 0) {
                const contratoID = contratoData.DataSet.Table[0]?.ID; // Obter o contratoID
                setFormData((prev) => ({ ...prev, contratoID }));
            }

            // Fetch contactos
            const contactosResponse = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/ListarContactos/${clienteID}`,
                { headers: { Authorization: `Bearer ${token}`, urlempresa } }
            );
            const contactosData = await contactosResponse.json();
            setDataLists((prev) => ({ ...prev, contactos: contactosData.DataSet.Table || [] }));

            // Fetch prioridades
            const prioridadesResponse = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/ListarTiposPrioridades`,
                { headers: { Authorization: `Bearer ${token}`, urlempresa } }
            );
            const prioridadesData = await prioridadesResponse.json();
            setDataLists((prev) => ({ ...prev, prioridades: prioridadesData.DataSet.Table || [] }));

            // Preencher cliente no formulário
            setFormData((prev) => ({ ...prev, cliente: clienteID }));
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            setErrorMessage(error.message);
        } finally {
            setContratoLoading(false);
            setLoading(false);
            console.log("Finalizado fetch de dados iniciais e contrato.");
        }
    };

    if (activeMenu === t('Home.menu.contract')) {
        fetchData();
    }
}, [activeMenu, t]);


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
                <h2 style={{ fontWeight: '600', color: '#1792FE', marginBottom: '20px' }}>{t('Home.welcome')}</h2>

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
                            onClick={() => handleMenuClick(menu.title, menu.ref)}
                            style={{
                                width: '150px',
                                height: '100px',
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
                <div ref={contractRef}>
                {activeMenu === t('Home.menu.contract') && (
                    
                    <>
                        {loading ? (
                            <p>{t('loading')}</p>
                        ) : errorMessage ? (
                            <p style={{ color: 'red', fontSize: '18px' }}>{errorMessage}</p>
                        ) : contratoInfo?.DataSet?.Table?.length > 0 ? (
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
                                        <h2 style={{ fontWeight: '300', color: '#1792FE', marginBottom: '20px' }}>{t('Home.contratoinfo.title')}</h2>
                                <div style={{ borderBottom: '1px solid #E0E0E0', paddingBottom: '15px', marginBottom: '15px' }}>
                                    <p style={{ margin: '5px 0' }}>
                                                <strong style={{ color: '#555' }}>{t('Home.contratoinfo.codigo')}</strong> {contratoInfo.DataSet.Table[0]?.Codigo}
                                    </p>
                                    <p style={{ margin: '5px 0' }}>
                                                <strong style={{ color: '#555' }}>{t('Home.contratoinfo.descricao')}</strong> {contratoInfo.DataSet.Table[0]?.Descricao}
                                    </p>
                                </div>
                                <p style={{ margin: '10px 0' }}>
                                            <strong style={{ color: '#555' }}>{t('Home.contratoinfo.horascontrato')}</strong> {contratoInfo.DataSet.Table[0]?.HorasTotais} h
                                </p>
                                <p style={{ margin: '10px 0' }}>
                                            <strong style={{ color: '#555' }}>{t('Home.contratoinfo.horasgastas')}</strong> {contratoInfo.DataSet.Table[0]?.HorasGastas} h
                                </p>
                        
                                <p style={{ margin: '10px 0' }}>
                        <strong style={{ color: '#555' }}>{t('Home.contratoinfo.horasdisponiveis')}</strong> {contratoInfo.DataSet.Table[0]?.HorasTotais - contratoInfo.DataSet.Table[0]?.HorasGastas} h
                    </p>
                                
                            </motion.div>
                        ) : (
                                        <p style={{ fontSize: '18px', color: '#333' }}>{t('Home.contratoinfo.error')}</p>
                        )}
                    </>
                )}</div>









<div ref={ordersRef}>
{activeMenu === t('Home.menu.orders') && (
    <>
        {pedidosLoading ? (
            <p>{t('loading')}</p>
        ) : pedidosError ? (
            <p style={{ color: 'red', fontSize: '18px' }}>{pedidosError}</p>
        ) : (
            <>
                <div
    style={{
        maxWidth: '800px',
        margin: '20px auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px', // Espaçamento entre os elementos
        textAlign: 'center',
    }}
>
    {/* Barra de Pesquisa e Botão "Pedido +" */}
    <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
        <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder={t('Pesquisar pedidos...')}
            style={{
                flex: '1',
                maxWidth: '800px',
                padding: '10px',
                borderRadius: '15px',
                border: '1px solid #ddd',
            }}
        />
         <button
    onClick={toggleForm} // Alternar a visibilidade do formulário
    style={{
        padding: '10px 20px',
        backgroundColor: '#0056FF',
        color: '#FFFFFF',
        borderRadius: '15px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
    }}
>
    {t('Pedido +')}
</button>

    </div>


    {showForm && (
    <div
        style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '9999',
        }}
        onClick={toggleForm}
    >
        <div
            style={{
                width: '400px',
                backgroundColor: '#FFFFFF',
                borderRadius: '15px',
                padding: '20px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={toggleForm}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                }}
            >
                &times;
            </button>
            <h3 style={{ textAlign: 'center', color: '#0056FF' }}>{t('Novo Pedido')}</h3>
            <form onSubmit={handleFormSubmit}>
                

                <div style={{ marginBottom: '15px' }}>
                    <label>{t('Contacto')}</label>
                    <select
                        name="contacto"
                        value={formData.contacto}
                        onChange={(e) => setFormData((prev) => ({ ...prev, contacto: e.target.value }))}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid #ddd',
                        }}
                    >
                        <option value="">{t('Selecione um contacto')}</option>
                        {dataLists.contactos.map((contacto) => (
                            <option key={contacto.Contacto} value={contacto.Contacto}>
                                {contacto.Contacto} - {contacto.PrimeiroNome} {contacto.UltimoNome}
                            </option>
                        ))}
                    </select>
                </div>

                



                <div style={{ marginBottom: '15px' }}>
                    <label>{t('Prioridade')}</label>
                    <select
                        name="prioridade"
                        value={formData.prioridade}
                        onChange={(e) => setFormData((prev) => ({ ...prev, prioridade: e.target.value }))}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid #ddd',
                        }}
                    >
                        <option value="">{t('Selecione a prioridade')}</option>
                        {dataLists.prioridades.map((prioridade) => (
                            <option key={prioridade.Prioridade} value={prioridade.Prioridade}>
                                {prioridade.Prioridade} - {prioridade.Descricao}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label>{t('Descrição')}</label>
                    <textarea
                        name="descricaoProblema"
                        value={formData.descricaoProblema}
                        onChange={(e) => setFormData((prev) => ({ ...prev, descricaoProblema: e.target.value }))}
                        rows="4"
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid #ddd',
                        }}
                        required
                    />
                </div>

                

                <button
                    type="submit"
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#0056FF',
                        color: '#FFFFFF',
                        borderRadius: '15px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                    }}
                >
                    {t('Submeter Pedido')}
                </button>
            </form>
        </div>
    </div>
)}

{successMessage && (
    <div
        style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '10px 20px',
            backgroundColor: '#4caf50',
            color: '#fff',
            borderRadius: '5px',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
        }}
    >
        {successMessage}
    </div>
)}

    {/* Botões de Filtro */}
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
        <button
            onClick={() => setSelectedEstado('')} // Limpar filtro
            style={{
                padding: '10px 20px',
                borderRadius: '15px',
                border: 'none',
                backgroundColor: selectedEstado === '' ? '#0056FF' : '#FFFFFF',
                color: selectedEstado === '' ? '#FFFFFF' : '#0056FF',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'background-color 0.3s, color 0.3s',
            }}
        >
            {t('Todos')}
        </button>
        {estadosDisponiveis.map((estado, index) => (
            <button
                key={index}
                onClick={() => setSelectedEstado(estado)} // Atualiza o estado do filtro
                style={{
                    padding: '10px 20px',
                    borderRadius: '15px',
                    border: 'none',
                    backgroundColor: selectedEstado === estado ? '#0056FF' : '#FFFFFF',
                    color: selectedEstado === estado ? '#FFFFFF' : '#0056FF',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'background-color 0.3s, color 0.3s',
                }}
            >
                {estado}
            </button>
        ))}
    </div>
</div>


                {paginatedPedidos.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{
                            maxWidth: '800px',
                            margin: '0 auto',
                            padding: '30px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '15px',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                            textAlign: 'left',
                        }}
                    >
                        <h2 style={{ fontWeight: '300', color: '#1792FE', marginBottom: '20px' }}>
                            {t('Pedidos de Assistência')}
                        </h2>

                        {paginatedPedidos.map((processo, index) => (
    <div key={index}>
        <h5 style={{ fontWeight: '400', color: '#0056FF' }}>
            {t('Processo')}: {processo}
            
        </h5>
        {filteredPedidos[processo].map((pedido, i) => {
            const isExpanded = expandedInterv[`${processo}-${i}`];
            return (
                <div
                    key={i}
                    style={{
                        marginLeft: '20px',
                        marginTop: '10px',
                        paddingBottom: '20px',
                        backgroundColor: '#F9F9F9',
                        borderRadius: '10px',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                        padding: '15px',
                    }}
                >
                    <p>
                        <strong>{t('Intervenção nº')}:</strong> {pedido.Interv}
                    </p>
                    <p>
                        <strong>{t('Problema')}:</strong> {pedido.DescricaoProb}
                    </p>

                    {isExpanded && (
                        <>
                            <p>
                                <strong>{t('Intervenção')}:</strong> {pedido.DescricaoResp}
                            </p>
                            <p>
                                <strong>{t('Intervencionado por')}:</strong> {pedido.NomeTecnico}
                            </p>
                            <p><strong>{t('Estado')}:</strong> {pedido.DescricaoEstado}</p>
                            <p>
                                <strong>{t('Duração')}:</strong> {pedido.Duracao} min
                            </p>
                            <p>
                                <strong>{t('Inicio')}:</strong> {formatDateTime(pedido.DataHoraInicio)}
                            </p>
                            <p>
                                <strong>{t('Fim')}:</strong> {formatDateTime(pedido.DataHoraFim)}
                            </p>
                        </>
                    )}

                    <button
                        onClick={() => toggleExpand(processo, i)}
                        style={{
                            backgroundColor: 'transparent',
                            color: isExpanded ? '#FF0000' : '#0056FF',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            marginTop: '10px',
                        }}
                    >
                        <span style={{ fontSize: '18px', marginRight: '5px' }}>
                            {isExpanded ? '-' : '+'}
                        </span>
                        {isExpanded ? t('Ver Menos') : t('Ver Mais')}
                    </button>
                </div>
            );
        })}
    </div>
))}
                    </motion.div>
                ) : (
                    <p style={{ fontSize: '18px', color: '#333' }}>{t('Pedidos não encontrados')}</p>
                )}

                {/* Paginação */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginTop: '20px',
                    }}
                >
                    {[...Array(totalPages).keys()].map((page) => (
                        <button
                            key={page}
                            onClick={() => handlePageChange(page + 1)}
                            style={{
                                padding: '10px 15px',
                                margin: '0 5px',
                                backgroundColor: currentPage === page + 1 ? '#0056FF' : '#FFFFFF',
                                color: currentPage === page + 1 ? '#FFFFFF' : '#0056FF',
                                border: '1px solid #0056FF',
                                borderRadius: '5px',
                                cursor: 'pointer',
                            }}
                        >
                            {page + 1}
                        </button>
                    ))}
                </div>
            </>
        )}
    </>
)}</div>

<div ref={productsRef}>
                {activeMenu === t('Home.menu.products') && (
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
                        <h2 style={{ fontWeight: '300', color: '#1792FE', marginBottom: '20px' }}>{t('Home.menu.products')}</h2>
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
                                    style={{ width: '150px',
                                        height: '150px',
                                        objectFit: 'contain',
                                        marginBottom: '10px', }}
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
                                    src="https://link.advir.pt/static/media/img_logo.a2a85989c690f4bfd096.png"
                                    alt="Syslog"
                                    style={{width: '150px',
                                        height: '150px',
                                        objectFit: 'contain',
                                        marginBottom: '10px', }}
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
                                    style={{ width: '150px',
                                        height: '150px',
                                        objectFit: 'contain',
                                        marginBottom: '10px', }}
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
                )}</div>


<div ref={faqRef}>
                {activeMenu === t('Home.menu.faq') && (
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
                        <h2 style={{ fontWeight: '300', color: '#1792FE', marginBottom: '20px' }}>{t('Home.faq.title')}</h2>
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
                )}</div>


            </section>
        </div>
    );
};

export default Home;
