import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaFileContract, FaPhone, FaBoxOpen, FaQuestionCircle, FaBars } from 'react-icons/fa';
import { motion } from 'framer-motion';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './i18n'; // Import do i18n

const Home = () => {
    const { t } = useTranslation();

    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState(t('Home.menu.contract')); // Estado para o menu ativo
    const [contratoInfo, setContratoInfo] = useState(null);
    const [pedidosInfo, setPedidosInfo] = useState(null);
    const [pedidosError, setPedidosError] = useState('');
    const [pedidosLoading, setPedidosLoading] = useState(true);
    const [expandedIndex, setExpandedIndex] = useState(null); // Estado para controlar qual pergunta está expandida
    const [groupedPedidos, setGroupedPedidos] = useState({});
    const [expandedInterv, setExpandedInterv] = useState({}); // Estado para controlar intervenções expandidas
    const [searchTerm, setSearchTerm] = useState(''); // Estado para a barra de pesquisa
    const [currentPage, setCurrentPage] = useState(1); // Estado para a página atual
    const itemsPerPage = 5; // Número de processos por página


    const [selectedEstado, setSelectedEstado] = useState(''); // Estado para o filtro

    const estadosDisponiveis = pedidosInfo
    ? [...new Set(pedidosInfo.DataSet.Table.map((pedido) => pedido.DescricaoEstado))]
    : [];





 // Função para atualizar o termo da pesquisa
 const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
};


    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(true);

    const toggleDrawer = () => {
        setDrawerOpen(!isDrawerOpen);
    };

    const handleMenuClick = (menu) => {
        setActiveMenu(menu);
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
        { title: t('Home.menu.contract'), icon: <FaFileContract size={32} /> },
        { title: t('Home.menu.orders'), icon: <FaPhone size={32} /> },
        { title: t('Home.menu.products'), icon: <FaBoxOpen size={32} /> },
        { title: t('Home.menu.faq'), icon: <FaQuestionCircle size={32} /> },
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
            try {
                const token = await AsyncStorage.getItem('painelAdminToken');
                const urlempresa = await AsyncStorage.getItem('urlempresa');
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
            }
        };

        if (activeMenu === t('Home.menu.orders')) {
            fetchPedidosInfo();
        }
    }, [activeMenu, t]);


    useEffect(() => {
        const fetchContratoInfo = async () => {
            try {
                const token = await AsyncStorage.getItem('painelAdminToken');
                const urlempresa = await AsyncStorage.getItem('urlempresa');
                const id = await AsyncStorage.getItem('empresa_areacliente');

                if (!id || !token || !urlempresa) {
                    throw new Error(t('error') + 'Token or URL missing.');
                }

                const response = await fetch(`https://webapiprimavera.advir.pt/clientArea/ObterInfoContrato/${id}`, {
                    headers: { Authorization: `Bearer ${token}`, urlempresa },
                });

                if (!response.ok) throw new Error(t('error') + response.statusText);
                const data = await response.json();
                setContratoInfo(data);
            } catch (error) {
                setErrorMessage(error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchContratoInfo();
    }, [t]);

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
                <h2 style={{ fontWeight: '600', color: '#0022FF', marginBottom: '20px' }}>{t('Home.welcome')}</h2>

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
                {activeMenu === t('Home.menu.contract') && (
                    <>
                        {loading ? (
                            <p>{t('loading')}</p>
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
                                        <h2 style={{ fontWeight: '300', color: '#0022FF', marginBottom: '20px' }}>{t('Home.contratoinfo.title')}</h2>
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
                            </motion.div>
                        ) : (
                                        <p style={{ fontSize: '18px', color: '#333' }}>{t('Home.contratoinfo.error')}</p>
                        )}
                    </>
                )}









                
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
        {/* <button
            onClick={""} // Função que será chamada ao clicar no botão
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
        </button>*/}
    </div>

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
                        <h2 style={{ fontWeight: '300', color: '#0022FF', marginBottom: '20px' }}>
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
)}


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
                        <h2 style={{ fontWeight: '300', color: '#0022FF', marginBottom: '20px' }}>{t('Home.menu.products')}</h2>
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
                )}



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
                        <h2 style={{ fontWeight: '300', color: '#0022FF', marginBottom: '20px' }}>{t('Home.faq.title')}</h2>
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
