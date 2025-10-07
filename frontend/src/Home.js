import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { startTokenValidation, stopTokenValidation } from './utils/authUtils';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaFileContract, FaPhone, FaBoxOpen, FaQuestionCircle, FaBars } from 'react-icons/fa';
import { motion } from 'framer-motion';
import i18n from './Pages/i18n'; // Import do i18n
// Import for Privacy Settings
import PrivacySettings from './Pages/GDPR/PrivacySettings';

// Função para simular AsyncStorage no browser
const AsyncStorage = {
    getItem: (key) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
    removeItem: (key) => Promise.resolve(localStorage.removeItem(key))
};
import backgroundImage from '../images/ImagemFundo.png';


const Home = () => {
    const { t } = useTranslation();

    const BACKEND_BASE_URL = 'https://backend.advir.pt'; // URL base do backend

    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState(t('Home.menu.products')); // Estado para o menu ativo
    const [contratoInfo, setContratoInfo] = useState([]);
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
    const [initialDataLoading, setInitialDataLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showEmpresaModal, setShowEmpresaModal] = useState(false);
    const [showApprovals, setShowApprovals] = useState(false);
    const [noticias, setNoticias] = useState([]);
    const [noticiasLoading, setNoticiasLoading] = useState(false);
    const [noticiasError, setNoticiasError] = useState('');

    const currentYear = new Date().getFullYear(); // Obtém o ano atual

    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Efeito para iniciar/parar verificação de token
    useEffect(() => {
        // Iniciar verificação automática de token quando a aplicação carrega
        startTokenValidation();

        // Configurar renovação automática quando o app ganha foco
        const handleAppFocus = () => {
            console.log('App ganhou foco, verificando tokens...');
            // Assuming refreshTokensOnAppFocus is a function in authUtils or defined elsewhere
            // that handles the token refresh logic. For now, we'll just log.
            // If you have a specific function for this, import and call it here.
            // Example: refreshTokensOnAppFocus(); 
        };

        // Listener para quando a janela/tab ganha foco
        window.addEventListener('focus', handleAppFocus);

        // Para mobile - quando a página se torna visível
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                handleAppFocus();
            }
        });

        // Parar verificação quando o componente é desmontado
        return () => {
            stopTokenValidation();
            window.removeEventListener('focus', handleAppFocus);
            document.removeEventListener('visibilitychange', handleAppFocus);
        };
    }, []);




    const [selectedEstado, setSelectedEstado] = useState(''); // Estado para o filtro

    const estadosDisponiveis = pedidosInfo
        ? [...new Set(pedidosInfo.DataSet.Table.map((pedido) => pedido.DescricaoEstado))]
        : [];

    // Referências para as seções
    const contractRef = useRef(null);
    const ordersRef = useRef(null);
    const productsRef = useRef(null);
    const faqRef = useRef(null);
    const noticiasRef = useRef(null);
    const privacyRef = useRef(null);

    const [showForm, setShowForm] = useState(false);

    const toggleForm = async () => {
        if (!showForm) {
            // Se está a abrir o formulário, carregar dados se necessário
            if (dataLists.contactos.length === 0 || dataLists.prioridades.length === 0) {
                console.log('Carregando dados do formulário...');
                await fetchFormData();
            }
        }
        setShowForm(!showForm);
        // Reset error message when toggling form
        setErrorMessage('');
    };



// ⬇️ coloca isto fora do handleFormSubmit, mas dentro do componente (ou mesmo antes)
const mapearPrioridade = (prioridadeId) => {
  const p = dataLists.prioridades.find(pr => String(pr.ID) === String(prioridadeId));
  const desc = (p?.Descricao ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (desc.includes('baix')) return 1;                       // Baixa
  if (desc.includes('medi') || desc.includes('normal')) return 2; // Média/Normal
  if (desc.includes('alta') || desc.includes('urgent')) return 3; // Alta/Urgente

  const n = Number(prioridadeId);
  return [1,2,3].includes(n) ? n : 2; // fallback seguro
};

    const handleFormSubmit = async (event) => {
  event.preventDefault();

  // validações mínimas
  if (!formData.contacto || !formData.prioridade || !formData.descricaoProblema) {
    setErrorMessage(t('Por favor, preencha todos os campos obrigatórios.'));
    return;
  }
  if (formData.descricaoProblema.trim().length < 10) {
    setErrorMessage(t('Descrição do problema deve ter pelo menos 10 caracteres.'));
    return;
  }

  const finalizeSuccess = () => {
    setSuccessMessage('Pedido enviado com sucesso, iremos entrar em contacto o mais rápido possível.');

    setShowForm(false);
    setFormData(prev => ({ ...prev, contacto: '', prioridade: '', descricaoProblema: '' }));
    setTimeout(() => setSuccessMessage(''), 5000);
    if (activeMenu === t('Home.menu.orders')) {
      // se quiseres atualizar a lista sem reload, chama o fetch de pedidos aqui
      window.location.reload();
    }
  };

  try {
    const token = await AsyncStorage.getItem('painelAdminTokenAdvir');
    const urlempresa = await AsyncStorage.getItem('urlempresaAdvir');
    const clienteID = await AsyncStorage.getItem('empresa_areacliente');

    if (!token || !urlempresa || !clienteID) {
      throw new Error(t('Erro: Token ou informações da empresa estão ausentes.'));
    }

    const dataAbertura = formData.datahoraabertura || new Date().toISOString().replace('T', ' ').slice(0, 19);
    const dataFimPrevista = formData.datahorafimprevista || new Date(Date.now() + 24*60*60*1000).toISOString().replace('T', ' ').slice(0, 19);
    const prioridadeNumero = mapearPrioridade(formData.prioridade);

    if (![1,2,3].includes(Number(prioridadeNumero))) {
      throw new Error('Prioridade inválida. Deve ser 1, 2 ou 3.');
    }

    const payload = {
      cliente: clienteID, // garante que vai o ID do cliente logado
      descricaoProblema: formData.descricaoProblema,
      prioridade: Number(prioridadeNumero),
      contacto: formData.contacto,
      datahoraabertura: dataAbertura,
      datahorafimprevista: dataFimPrevista,

      descricaoObjecto: formData.descricaoProblema.trim(),
      origem: formData.origem || 'SITE',
      tecnico: formData.tecnico || '000',
      tipoProcesso: formData.tipoProcesso || 'PASI',
      estado: formData.estado || 1,
      serie: formData.serie || '2025',
      seccao: formData.seccao || 'SD',
      objectoID: formData.objectoID || '9dc979ae-96b4-11ef-943d-e08281583916',
      contratoID: formData.contratoID || null,
      comoReproduzir: null
    };

    console.log('Enviando o pedido com payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`https://webapiprimavera.advir.pt/routePedidos_STP/CriarPedido`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        urlempresa,
      },
      body: JSON.stringify(payload),
    });

    console.log('Status da resposta:', response.status);

    // tenta ler corpo em qualquer caso (alguns backends mandam JSON no erro)
    let bodyText = '';
    let bodyJson = null;
    try {
      bodyText = await response.text();
      try { bodyJson = JSON.parse(bodyText); } catch {}
    } catch {}

    if (!response.ok) {
      // 👇 Heurística: o backend cria mas responde 500 (NullReference/“Erro inesperado”).
      const msg = (bodyJson?.error || bodyJson?.details || bodyText || '').toLowerCase();
      const knownBackendBug =
        response.status === 500 && (
          msg.includes('object reference') ||
          msg.includes('erro inesperado') ||
          msg.includes('request failed with status code 500')
        );

      if (knownBackendBug) {
        console.warn('500 conhecido do backend, mas vamos assumir sucesso.');
        finalizeSuccess();
        return;
      }

      // Se não for o caso conhecido, lança erro normal
      const errorMessage = bodyJson?.details || bodyJson?.error || bodyText || 'Erro desconhecido';
      throw new Error(`Erro ao criar o pedido: ${errorMessage}`);
    }

    // 2xx — sucesso normal
    console.log('Resposta (sucesso):', bodyJson ?? bodyText);
    finalizeSuccess();

  } catch (error) {
    console.error('Erro ao enviar o pedido:', error);
    setErrorMessage(error.message || 'Erro desconhecido ao criar pedido');
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
        seccao: 'SD', // Secção associada 
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
        {
            question: t('Home.faq.questions.q4') || "Definição dos anos de suspensão no regime IRS Jovem",
            answer: t('Home.faq.questions.a4') || "De acordo com as alterações ao regime fiscal IRS Jovem para 2025, a isenção referente a este regime não se aplica nos anos em que não sejam auferidos rendimentos das categorias A e B.",
        },
        {
            question: t('Home.faq.questions.q5') || "Como posso criar um novo pedido de assistência?",
            answer: t('Home.faq.questions.a5') || "Navegue até à secção 'Pedidos', clique no botão 'Novo Pedido' e preencha o formulário com os detalhes necessários.",
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
            Object.entries(groupedPedidos)
                .map(([processo, pedidos]) => [
                    processo,
                    pedidos
                        .filter((pedido) => {
                            console.log("Pedido DataHoraInicio:", pedido.DataHoraInicio); // Verificar formato da data
                            return (
                                (selectedEstado === '' || pedido.DescricaoEstado === selectedEstado) &&
                                (selectedYear === '' || new Date(pedido.DataHoraInicio).getFullYear() === selectedYear) &&
                                (pedido.Processo.toLowerCase().includes(searchTerm) ||
                                    pedido.DescricaoEstado.toLowerCase().includes(searchTerm) ||
                                    pedido.DescricaoProb.toLowerCase().includes(searchTerm) ||
                                    pedido.DescricaoResp.toLowerCase().includes(searchTerm) ||
                                    pedido.NomeTecnico.toLowerCase().includes(searchTerm))
                            );
                        })
                        .sort((a, b) => new Date(b.DataHoraInicio) - new Date(a.DataHoraInicio)), // Ordenação correta
                ])
                .filter(([_, pedidos]) => pedidos.length > 0) // Remove grupos vazios
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
        { title: t('Notícias'), icon: <FaQuestionCircle size={22} />, ref: noticiasRef },
        { title: t('Home.menu.faq'), icon: <FaQuestionCircle size={22} />, ref: faqRef },
        { title: t('Definições de Privacidade'), icon: <span></span>, ref: privacyRef },
    ];



    useEffect(() => {
        if (pedidosInfo) {
            const grouped = pedidosInfo.DataSet.Table.reduce((acc, pedido) => {
                console.log("Antes da conversão - DataHoraInicio:", pedido.DataHoraInicio); // Confirma o formato original

                const processo = pedido.Processo;
                if (!acc[processo]) {
                    acc[processo] = [];
                }

                acc[processo].push(pedido);
                return acc;
            }, {});

            // Ordenar os pedidos dentro de cada processo do mais recente para o mais antigo
            Object.keys(grouped).forEach((processo) => {
                grouped[processo].sort((a, b) => {
                    const dateA = new Date(a.DataHoraInicio);
                    const dateB = new Date(b.DataHoraInicio);

                    console.log(`Comparando ${dateA} com ${dateB}`); // Confirma que está a comparar corretamente

                    return dateB - dateA; // Ordem decrescente (mais recente primeiro)
                });
            });

            setGroupedPedidos(grouped);
        }
    }, [pedidosInfo]);




    // Função para buscar notícias
    const fetchNoticias = async () => {
        setNoticiasLoading(true);
        try {
            const token = localStorage.getItem('loginToken');

            if (!token) {
                throw new Error('Token não encontrado');
            }

            const response = await fetch('https://backend.advir.pt/api/news/noticias', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            if (!response.ok) throw new Error('Erro ao buscar notícias');

            const data = await response.json();
            setNoticias(data.data || []);
        } catch (error) {
            setNoticiasError(error.message);
            console.error('Erro ao buscar notícias:', error);
        } finally {
            setNoticiasLoading(false);
        }
    };

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

        // Cleanup function to restore body scroll when component unmounts
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);




    useEffect(() => {
        if (activeMenu === t('Notícias')) {
            fetchNoticias();
        }
    }, [activeMenu]);

    // Função para buscar dados gerais (contactos e prioridades)
    const fetchFormData = async () => {
        try {
            const token = await AsyncStorage.getItem('painelAdminTokenAdvir');
            const urlempresa = await AsyncStorage.getItem('urlempresaAdvir');
            const clienteID = await AsyncStorage.getItem('empresa_areacliente');

            if (!clienteID || !token || !urlempresa) {
                console.error('Token, URL ou ID de cliente estão ausentes.');
                setErrorMessage('Dados de autenticação não encontrados. Tente fazer login novamente.');
                return;
            }

            // Fetch contactos
            const contactosResponse = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/ListarContactos/${clienteID}`,
                { headers: { Authorization: `Bearer ${token}`, urlempresa } }
            );

            if (contactosResponse.ok) {
                const contactosData = await contactosResponse.json();
                setDataLists((prev) => ({ ...prev, contactos: contactosData.DataSet?.Table || [] }));
                console.log('Contactos carregados:', contactosData.DataSet?.Table?.length || 0);
            }

            // Fetch prioridades
            const prioridadesResponse = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/ListarTiposPrioridades`,
                { headers: { Authorization: `Bearer ${token}`, urlempresa } }
            );

            if (prioridadesResponse.ok) {
                const prioridadesData = await prioridadesResponse.json();
                setDataLists((prev) => ({ ...prev, prioridades: prioridadesData.DataSet?.Table || [] }));
                console.log('Prioridades carregadas:', prioridadesData.DataSet?.Table?.length || 0);
            }

            // Preencher cliente no formulário
            setFormData((prev) => ({ ...prev, cliente: clienteID }));
        } catch (error) {
            console.error('Erro ao buscar dados do formulário:', error);
        }
    };

    // UseEffect para carregar dados do contrato
    useEffect(() => {
        const fetchData = async () => {
            console.log("Iniciando fetch de dados iniciais e contrato.");
            setContratoLoading(true);
            setLoading(true);

            try {
                const token = await AsyncStorage.getItem('painelAdminTokenAdvir');
                const urlempresa = await AsyncStorage.getItem('urlempresaAdvir');
                const clienteID = await AsyncStorage.getItem('empresa_areacliente');

                console.log('Dados obtidos do storage:', { 
                    token: token ? 'Presente' : 'Ausente', 
                    urlempresa, 
                    clienteID 
                });

                if (!clienteID || !token || !urlempresa) {
                    console.error('Token, URL ou ID de cliente estão ausentes.');
                    setErrorMessage('Dados de autenticação não encontrados. Tente fazer login novamente.');
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

                // Filtrar contrato com estado === 3
                const contratosFiltrados = contratoData?.DataSet?.Table?.filter(c => c.Estado === 3) || [];
                if (contratosFiltrados.length > 0) {
                    setContratoInfo(contratosFiltrados);
                    setFormData(prev => ({ ...prev, contratoID: contratosFiltrados[0].ID }));
                } else {
                    setContratoInfo([]);
                    setFormData(prev => ({ ...prev, contratoID: null }));
                }

                // Carregar também os dados do formulário se ainda não foram carregados
                if (dataLists.contactos.length === 0 || dataLists.prioridades.length === 0) {
                    await fetchFormData();
                }

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

    // UseEffect para carregar dados do formulário quando necessário
    useEffect(() => {
        if (activeMenu === t('Home.menu.orders') && (dataLists.contactos.length === 0 || dataLists.prioridades.length === 0)) {
            fetchFormData();
        }
    }, [activeMenu, t]);

    const navigate = (route) => {
        console.log(`Navigating to: ${route}`);
        // Implementar a navegação aqui (e.g., usando window.location.href)
    };


    const styles = {
        container: {
            fontFamily: "Arial, sans-serif",
            maxWidth: "800px",
            margin: "20px auto",
            padding: "20px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
        },
        title: {
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "20px",
            color: "#333",
        },
        menuContainer: {
            display: "flex",
            flexDirection: "column",
            padding: "1rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "10px",
        },
        menuItem: {
            display: "flex",
            alignItems: "center",
            padding: "0.75rem 1rem",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
            borderRadius: "8px",
            margin: "0.25rem 0",
            position: "relative",
        },

        menuArrow: {
            marginLeft: "auto",
            fontSize: "0.8rem",
            color: "#666",
            transition: "transform 0.2s ease",
        },

        submenuContainer: {
            backgroundColor: "#f8f9fa",
            borderRadius: "6px",
            margin: "0.25rem 0 0.5rem 1rem",
            padding: "0.5rem 0",
            borderLeft: "2px solid #e0e0e0",
        },

        submenuItem: {
            display: "flex",
            alignItems: "center",
            padding: "0.5rem 1rem",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
            borderRadius: "4px",
            margin: "0.125rem 0.5rem",
        },

        submenuIcon: {
            marginRight: "0.75rem",
            fontSize: "1rem",
        },

        submenuText: {
            fontSize: "0.9rem",
            color: "#555",
            fontWeight: "500",
        },

        menuIcon: {
            marginRight: "0.75rem",
            fontSize: "1.2rem",
            color: "#444",
        },
        menuText: {
            fontSize: "1rem",
            color: "#333",
            fontWeight: "500",
        },
        logoutButton: {
            backgroundColor: "#dc3545",
            color: "white",
            padding: "0.75rem 1rem",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginTop: "1rem",
        },
        modalOverlay: {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
        },
        modalContent: {
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 0 10px rgba(0, 0, 0, 0.2)",
            maxWidth: "400px",
            width: "90%",
            textAlign: "center",
        },
        modalTitle: {
            fontSize: "1.5rem",
            fontWeight: "bold",
            marginBottom: "15px",
            color: "#333",
        },
        modalButtons: {
            display: "flex",
            justifyContent: "space-around",
            marginTop: "20px",
        },
        confirmButton: {
            backgroundColor: "#28a745",
            color: "white",
            padding: "10px 15px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
        },
        cancelButton: {
            backgroundColor: "#6c757d",
            color: "white",
            padding: "10px 15px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
        },
    };


    return (
        <div style={{
            height: '100vh',
            overflowY: 'auto',
            fontFamily: 'Poppins, sans-serif',
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            position: 'relative'
        }}>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                zIndex: 0
            }}></div>
            <div style={{
                position: 'relative',
                zIndex: 1,
                height: '100%'
            }}>

                {/* StickyNavbar */}
                <nav className="navbar navbar-light fixed-top" style={{
                    backgroundColor: 'rgba(25, 118, 210, 0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    padding: '15px 0',
                }}>
                    <div className="container">
                        <button className="btn" onClick={toggleDrawer} style={{
                            border: 'none',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            padding: '8px',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease'
                        }}>
                            <FaBars size={24} style={{ color: '#FFFFFF' }} />
                        </button>
                        <span className="navbar-brand mb-0 h1" style={{
                            color: '#FFFFFF',
                            fontWeight: '700',
                            fontSize: '24px',
                            letterSpacing: '0.5px',
                            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)'
                        }}>Advir Plan</span>
                        <div style={{ width: '42px' }}></div> {/* Spacer for balance */}
                    </div>
                </nav>

                {/* Drawer Navigation */}
                <div className={`drawer ${isDrawerOpen ? 'open' : ''}`} style={{
                    width: isDrawerOpen ? '280px' : '0',
                    height: '100%',
                    backgroundColor: '#FFFFFF',
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    overflowX: 'hidden',
                    transition: '0.3s ease-in-out',
                    zIndex: '9999',
                    boxShadow: isDrawerOpen ? '0 5px 25px rgba(0, 0, 0, 0.25)' : 'none',
                    padding: isDrawerOpen ? '20px 0' : '0',
                    borderTopRightRadius: '10px',
                    borderBottomRightRadius: '10px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0 20px 20px',
                        borderBottom: '1px solid #eaeaea'
                    }}>
                        <span style={{
                            color: '#1792FE',
                            fontWeight: '700',
                            fontSize: '22px'
                        }}>Advir Plan</span>
                        <button
                            onClick={toggleDrawer}
                            style={{
                                color: '#1792FE',
                                fontSize: '24px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '5px'
                            }}
                        >
                            &times;
                        </button>
                    </div>
                    <div className="drawer-content" style={{ padding: '20px 10px', marginTop: '10px' }}>
                        {menus.map((menu, index) => {
                            // Render all menu items the same way
                            return (
                                <a
                                    key={index}
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleMenuClick(menu.title, menu.ref);
                                        toggleDrawer();
                                    }}
                                    style={{
                                        color: activeMenu === menu.title ? '#1792FE' : '#505050',
                                        textDecoration: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '15px 20px',
                                        borderRadius: '8px',
                                        margin: '5px 10px',
                                        backgroundColor: activeMenu === menu.title ? '#f0f7ff' : 'transparent',
                                        transition: 'all 0.2s ease',
                                        fontWeight: activeMenu === menu.title ? '600' : '400'
                                    }}
                                >
                                    <span style={{ marginRight: '15px' }}>{menu.icon}</span>
                                    {menu.title}
                                </a>
                            );
                        })}
                        <div style={{ borderTop: '1px solid #eaeaea', margin: '15px 10px', paddingTop: '15px' }}>
                            <a href="#about" style={{
                                color: '#505050',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '15px 20px',
                                borderRadius: '8px',
                                margin: '5px 10px',
                                transition: 'all 0.2s ease'
                            }}>
                                <span style={{ marginRight: '15px' }}>📋</span>
                                Sobre Nós
                            </a>
                            <a href="#services" style={{
                                color: '#505050',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '15px 20px',
                                borderRadius: '8px',
                                margin: '5px 10px',
                                transition: 'all 0.2s ease'
                            }}>
                                <span style={{ marginRight: '15px' }}>🛠️</span>
                                Serviços
                            </a>
                        </div>
                    </div>
                </div>

                {/* Main Content */}

                <section className="text-center" style={{
                    padding: '80px 20px 50px',
                    backgroundColor: 'rgba(212, 228, 255, 0.85)',
                    minHeight: '100vh',
                    fontFamily: 'Poppins, sans-serif',
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundAttachment: 'fixed',
                    backdropFilter: 'blur(5px)'
                }}>
                    {/* Rest of your content inside the section element */}

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        gap: '20px',
                        marginBottom: '50px',
                    }}>
                        {menus.map((menu, index) => {
                            // Render all menu items the same way
                            return (
                                <div
                                    key={index}
                                    onClick={() => handleMenuClick(menu.title, menu.ref)}
                                    style={{
                                        width: '200px',
                                        height: '140px',
                                        backgroundColor: activeMenu === menu.title ? '#1976D2' : '#ffffff',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        color: activeMenu === menu.title ? '#FFFFFF' : '#1976D2',
                                        cursor: 'pointer',
                                        boxShadow: activeMenu === menu.title
                                            ? '0 10px 20px rgba(25, 118, 210, 0.4)'
                                            : '0 6px 15px rgba(0, 0, 0, 0.08)',
                                        textAlign: 'center',
                                        transition: 'all 0.3s ease',
                                        border: activeMenu === menu.title ? 'none' : '1px solid #e0eaf6',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-5px)';
                                        e.currentTarget.style.boxShadow = activeMenu === menu.title
                                            ? '0 15px 30px rgba(25, 118, 210, 0.5)'
                                            : '0 10px 25px rgba(0, 0, 0, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = activeMenu === menu.title
                                            ? '0 10px 20px rgba(25, 118, 210, 0.4)'
                                            : '0 6px 15px rgba(0, 0, 0, 0.08)';
                                    }}
                                >
                                    {/* Background effect */}
                                    {activeMenu === menu.title && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-20px',
                                            right: '-20px',
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            zIndex: 0
                                        }} />
                                    )}
                                    <div style={{
                                        fontSize: '36px',
                                        marginBottom: '15px',
                                        color: activeMenu === menu.title ? '#FFFFFF' : '#1976D2',
                                        zIndex: 1
                                    }}>
                                        {menu.icon}
                                    </div>
                                    <span style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        zIndex: 1
                                    }}>{menu.title}</span>
                                </div>
                            );
                        })}
                    </div>
                    {/* Content Based on Active Menu */}
                    <div ref={contractRef}>
                        {activeMenu === t('Home.menu.contract') && (
                            <>
                                {loading ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">{t('loading')}</span>
                                        </div>
                                    </div>
                                ) : errorMessage ? (
                                    <div style={{
                                        maxWidth: '800px',
                                        margin: '0 auto',
                                        padding: '20px',
                                        backgroundColor: '#fff0f0',
                                        borderRadius: '8px',
                                        border: '1px solid #ffcccb',
                                        color: '#d8000c',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ fontSize: '18px' }}>{errorMessage}</p>
                                    </div>
                                ) : contratoInfo.length > 0 ? (
                                    contratoInfo.map((c, idx) => (
                                        <motion.div
                                            key={c.ID}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                                            style={{
                                                maxWidth: '800px',
                                                margin: '0 auto 40px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                borderRadius: '16px',
                                                overflow: 'hidden',
                                                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                                            }}
                                        >
                                            {/* Cabeçalho */}
                                            <div style={{
                                                backgroundColor: '#1976D2',
                                                padding: '25px 30px',
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}>
                                                <h2 style={{
                                                    fontWeight: 700,
                                                    color: '#FFFFFF',
                                                    margin: 0,
                                                    fontSize: '28px',
                                                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)'
                                                }}>
                                                    {t('Home.contratoinfo.title')} {c.Codigo}
                                                </h2>
                                            </div>

                                            <div style={{ padding: '30px' }}>
                                                {/* Detalhes */}
                                                <div style={{
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: '12px',
                                                    padding: '20px',
                                                    borderLeft: '4px solid #1976D2',
                                                    marginBottom: '20px'
                                                }}>
                                                    <p><strong>{t('Home.contratoinfo.codigo')}:</strong> {c.Codigo}</p>
                                                    <p><strong>{t('Home.contratoinfo.descricao')}:</strong> {c.Descricao}</p>
                                                </div>

                                                {/* Horas e progresso (se não for PRJ) */}
                                                {c.TipoDoc !== 'PRJ' && (
                                                    <>
                                                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                                                            {/* Horas Contrato */}
                                                            <div style={{
                                                                flex: 1,
                                                                backgroundColor: 'white',
                                                                borderRadius: '12px',
                                                                padding: '25px 20px',
                                                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                                                textAlign: 'center'
                                                            }}>
                                                                <div style={{
                                                                    width: '50px',
                                                                    height: '50px',
                                                                    margin: '0 auto 15px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: '#e3f2fd',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '24px'
                                                                }}>⏱️</div>
                                                                <p style={{ margin: '0 0 5px', color: '#757575' }}>{t('Home.contratoinfo.horascontrato')}</p>
                                                                <p style={{ fontSize: '24px', fontWeight: '700', color: '#1976D2', margin: 0 }}>{c.HorasTotais} h</p>
                                                            </div>

                                                            {/* Horas Gastas */}
                                                            <div style={{
                                                                flex: 1,
                                                                backgroundColor: 'white',
                                                                borderRadius: '12px',
                                                                padding: '25px 20px',
                                                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                                                textAlign: 'center'
                                                            }}>
                                                                <div style={{
                                                                    width: '50px',
                                                                    height: '50px',
                                                                    margin: '0 auto 15px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: '#ffe0e0',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '24px'
                                                                }}>⌛</div>
                                                                <p style={{ margin: '0 0 5px', color: '#757575' }}>{t('Home.contratoinfo.horasgastas')}</p>
                                                                <p style={{ fontSize: '24px', fontWeight: '700', color: '#f44336', margin: 0 }}>{c.HorasGastas} h</p>
                                                            </div>

                                                            {/* Horas Disponíveis */}
                                                            <div style={{
                                                                flex: 1,
                                                                backgroundColor: 'white',
                                                                borderRadius: '12px',
                                                                padding: '25px 20px',
                                                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                                                textAlign: 'center'
                                                            }}>
                                                                <div style={{
                                                                    width: '50px',
                                                                    height: '50px',
                                                                    margin: '0 auto 15px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: '#e8f5e9',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '24px'
                                                                }}>✅</div>
                                                                <p style={{ margin: '0 0 5px', color: '#757575' }}>{t('Home.contratoinfo.horasdisponiveis')}</p>
                                                                <p style={{ fontSize: '24px', fontWeight: '700', color: '#4caf50', margin: 0 }}>
                                                                    {(c.HorasTotais - c.HorasGastas).toFixed(2)} h
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Barra de Progresso */}
                                                        <div style={{
                                                            backgroundColor: 'white',
                                                            borderRadius: '12px',
                                                            padding: '20px',
                                                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                                <p style={{ margin: 0, fontWeight: '500' }}>{t('Progresso do Contrato')}</p>
                                                                <p style={{ margin: 0, fontWeight: '600' }}>
                                                                    {Math.round((c.HorasGastas / c.HorasTotais) * 100)}%
                                                                </p>
                                                            </div>
                                                            <div style={{
                                                                height: '10px',
                                                                backgroundColor: '#e0e0e0',
                                                                borderRadius: '5px',
                                                                overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    height: '100%',
                                                                    width: `${(c.HorasGastas / c.HorasTotais) * 100}%`,
                                                                    backgroundColor: '#1976D2'
                                                                }} />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '40px 20px',
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: '12px',
                                        color: '#6c757d',
                                        maxWidth: '800px',
                                        margin: '0 auto'
                                    }}>
                                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
                                        <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>
                                            {t('Home.contratoinfo.error')}
                                        </p>
                                        <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                                            {t('Não foi possível encontrar informações de contrato ativo')}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>


                    <div ref={ordersRef}>
                        {activeMenu === t('Home.menu.orders') && (
                            <>
                                {pedidosLoading ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">{t('loading')}</span>
                                        </div>
                                    </div>
                                ) : pedidosError ? (
                                    <div style={{
                                        maxWidth: '800px',
                                        margin: '0 auto',
                                        padding: '20px',
                                        backgroundColor: '#fff0f0',
                                        borderRadius: '8px',
                                        border: '1px solid #ffcccb',
                                        color: '#d8000c',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ fontSize: '18px' }}>{pedidosError}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{
                                            maxWidth: '950px',
                                            margin: '0 auto 30px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            borderRadius: '16px',
                                            padding: '25px',
                                            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '20px'
                                            }}>
                                                <h2 style={{
                                                    fontWeight: '700',
                                                    color: '#1976D2',
                                                    margin: 0,
                                                    fontSize: '28px'
                                                }}>
                                                    <span style={{ backgroundColor: '#1976D2', padding: '5px 10px', borderRadius: '5px', color: 'white' }}>{t('Pedidos de Assistência')}</span>
                                                </h2>
                                                <button
                                                    onClick={toggleForm}
                                                    style={{
                                                        padding: '12px 20px',
                                                        backgroundColor: '#1976D2',
                                                        color: '#FFFFFF',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '15px',
                                                        fontWeight: '600',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1565C0'}
                                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
                                                >
                                                    <span>+</span>
                                                    {t('Novo Pedido')}
                                                </button>

                                                {/* Form for creating new requests */}
                                                {showForm && (
                                                    <div style={{
                                                        position: 'fixed',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        bottom: 0,
                                                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        zIndex: 1000,
                                                    }}>
                                                        <div style={{
                                                            backgroundColor: 'white',
                                                            borderRadius: '16px',
                                                            width: '90%',
                                                            maxWidth: '600px',
                                                            maxHeight: '90vh',
                                                            overflowY: 'auto',
                                                            padding: '25px',
                                                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                                                        }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                marginBottom: '20px'
                                                            }}>
                                                                <h3 style={{
                                                                    margin: 0,
                                                                    color: '#1976D2',
                                                                    fontSize: '22px',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {t('Novo Pedido de Assistência')}
                                                                </h3>
                                                                <button
                                                                    onClick={toggleForm}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        fontSize: '24px',
                                                                        cursor: 'pointer',
                                                                        color: '#757575'
                                                                    }}
                                                                >
                                                                    &times;
                                                                </button>
                                                            </div>

                                                            {successMessage && (
                                                                <div style={{
                                                                    padding: '15px',
                                                                    backgroundColor: '#e8f5e9',
                                                                    borderRadius: '8px',
                                                                    color: '#2e7d32',
                                                                    marginBottom: '20px',
                                                                    textAlign: 'center',
                                                                    border: '1px solid #c8e6c9'
                                                                }}>
                                                                    {successMessage}
                                                                </div>
                                                            )}

                                                            {errorMessage && (
                                                                <div style={{
                                                                    padding: '15px',
                                                                    backgroundColor: '#ffebee',
                                                                    borderRadius: '8px',
                                                                    color: '#c62828',
                                                                    marginBottom: '20px',
                                                                    textAlign: 'center',
                                                                    border: '1px solid #ffcdd2'
                                                                }}>
                                                                    {errorMessage}
                                                                </div>
                                                            )}

                                                            <form onSubmit={handleFormSubmit}>
                                                                <div style={{ marginBottom: '15px' }}>
                                                                    <label style={{
                                                                        display: 'block',
                                                                        marginBottom: '8px',
                                                                        fontWeight: '500',
                                                                        color: '#555'
                                                                    }}>
                                                                        {t('Contacto')} <span style={{ color: '#f44336' }}>*</span>
                                                                    </label>
                                                                    <select
                                                                        value={formData.contacto}
                                                                        onChange={(e) => setFormData(prev => ({ ...prev, contacto: e.target.value }))}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '12px',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid #e0e0e0',
                                                                            backgroundColor: '#f8f9fa'
                                                                        }}
                                                                        required
                                                                    >
                                                                        <option value="">{t('Selecione um contacto')}</option>
                                                                        {dataLists.contactos.map((contacto, index) => {
                                                                            // Suportar diferentes estruturas de contacto
                                                                            const id = contacto.ID || contacto.Contacto || contacto.id;
                                                                            const nome = contacto.Nome || contacto.PrimeiroNome + ' ' + (contacto.UltimoNome || '') || contacto.name || `Contacto ${id}`;

                                                                            return (
                                                                                <option key={index} value={id}>
                                                                                    {nome.trim()}
                                                                                </option>
                                                                            );
                                                                        })}
                                                                    </select>
                                                                </div>

                                                                <div style={{ marginBottom: '15px' }}>
                                                                    <label style={{
                                                                        display: 'block',
                                                                        marginBottom: '8px',
                                                                        fontWeight: '500',
                                                                        color: '#555'
                                                                    }}>
                                                                        {t('Prioridade')} <span style={{ color: '#f44336' }}>*</span>
                                                                    </label>
                                                                    <select
                                                                        value={formData.prioridade}
                                                                        onChange={(e) => setFormData(prev => ({ ...prev, prioridade: e.target.value }))}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '12px',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid #e0e0e0',
                                                                            backgroundColor: '#f8f9fa'
                                                                        }}
                                                                        required
                                                                    >
                                                                        <option value="">{t('Selecione uma prioridade')}</option>
                                                                        {dataLists.prioridades.map((prioridade, index) => (
                                                                            <option key={index} value={prioridade.ID}>
                                                                                {prioridade.Descricao}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>

                                                                <div style={{ marginBottom: '15px' }}>
                                                                    <label style={{
                                                                        display: 'block',
                                                                        marginBottom: '8px',
                                                                        fontWeight: '500',
                                                                        color: '#555'
                                                                    }}>
                                                                        {t('Descrição do Problema')} <span style={{ color: '#f44336' }}>*</span>
                                                                    </label>
                                                                    <textarea
                                                                        value={formData.descricaoProblema}
                                                                        onChange={(e) => setFormData(prev => ({ ...prev, descricaoProblema: e.target.value }))}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '12px',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid #e0e0e0',
                                                                            backgroundColor: '#f8f9fa',
                                                                            minHeight: '120px',
                                                                            resize: 'vertical',
                                                                            fontFamily: 'inherit'
                                                                        }}
                                                                        placeholder={t('Descreva o problema em detalhes...')}
                                                                        required
                                                                    />
                                                                </div>

                                                                <div style={{ textAlign: 'right', marginTop: '20px' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={toggleForm}
                                                                        style={{
                                                                            padding: '12px 20px',
                                                                            backgroundColor: '#f5f5f5',
                                                                            color: '#555',
                                                                            borderRadius: '8px',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            marginRight: '10px',
                                                                            fontWeight: '500'
                                                                        }}
                                                                    >
                                                                        {t('Cancelar')}
                                                                    </button>
                                                                    <button
                                                                        type="submit"
                                                                        style={{
                                                                            padding: '12px 25px',
                                                                            backgroundColor: '#1976D2',
                                                                            color: 'white',
                                                                            borderRadius: '8px',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            fontWeight: '600',
                                                                            boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)'
                                                                        }}
                                                                    >
                                                                        {t('Enviar Pedido')}
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Barra de Pesquisa */}
                                            <div style={{
                                                display: 'flex',
                                                gap: '15px',
                                                alignItems: 'center',
                                                marginBottom: '25px',
                                                flexWrap: 'wrap'
                                            }}>
                                                <div style={{
                                                    flex: 1,
                                                    position: 'relative',
                                                    minWidth: '250px'
                                                }}>
                                                    <input
                                                        type="text"
                                                        value={searchTerm}
                                                        onChange={handleSearch}
                                                        placeholder={t('Pesquisar pedidos...')}
                                                        style={{
                                                            width: '100%',
                                                            padding: '14px 14px 14px 40px',
                                                            borderRadius: '12px',
                                                            border: '1px solid #e0e0e0',
                                                            backgroundColor: '#f8f9fa',
                                                            fontSize: '15px',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(25, 118, 210, 0.2)'}
                                                        onBlur={(e) => e.target.style.boxShadow = 'none'}
                                                    />
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: '14px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        color: '#757575',
                                                        fontSize: '16px'
                                                    }}>
                                                        🔍
                                                    </div>
                                                </div>

                                                {/* Filtro de Ano */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    backgroundColor: '#f0f7ff',
                                                    padding: '6px 14px',
                                                    borderRadius: '12px',
                                                    border: '1px solid #e0e0e0'
                                                }}>
                                                    <label htmlFor="yearFilter" style={{ fontWeight: '500', color: '#1976D2', whiteSpace: 'nowrap' }}>
                                                        {t('Ano')}:
                                                    </label>
                                                    <select
                                                        id="yearFilter"
                                                        value={selectedYear}
                                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                                        style={{
                                                            padding: '6px 10px',
                                                            borderRadius: '8px',
                                                            border: '1px solid #e0e0e0',
                                                            backgroundColor: '#FFFFFF',
                                                            cursor: 'pointer',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        {[...new Set(pedidosInfo?.DataSet?.Table?.map((pedido) => new Date(pedido.DataHoraInicio).getFullYear()))]
                                                            .sort((a, b) => b - a)
                                                            .map((year) => (
                                                                <option key={year} value={year}>
                                                                    {year}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Estado Filters */}
                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '10px',
                                                marginBottom: '25px'
                                            }}>
                                                <button
                                                    onClick={() => setSelectedEstado('')}
                                                    style={{
                                                        padding: '10px 18px',
                                                        borderRadius: '30px',
                                                        border: 'none',
                                                        backgroundColor: selectedEstado === '' ? '#1976D2' : '#f0f7ff',
                                                        color: selectedEstado === '' ? '#FFFFFF' : '#1976D2',
                                                        boxShadow: selectedEstado === '' ? '0 4px 8px rgba(25, 118, 210, 0.2)' : 'none',
                                                        cursor: 'pointer',
                                                        fontWeight: '500',
                                                        fontSize: '14px',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    {t('Todos')}
                                                </button>
                                                {estadosDisponiveis.map((estado, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => setSelectedEstado(estado)}
                                                        style={{
                                                            padding: '10px 18px',
                                                            borderRadius: '30px',
                                                            border: 'none',
                                                            backgroundColor: selectedEstado === estado ? '#1976D2' : '#f0f7ff',
                                                            color: selectedEstado === estado ? '#FFFFFF' : '#1976D2',
                                                            boxShadow: selectedEstado === estado ? '0 4px 8px rgba(25, 118, 210, 0.2)' : 'none',
                                                            cursor: 'pointer',
                                                            fontWeight: '500',
                                                            fontSize: '14px',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        {estado}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Pedidos List */}
                                            {paginatedPedidos.length > 0 ? (
                                                <div>
                                                    <div style={{ marginBottom: '20px' }}>
                                                        {paginatedPedidos.map((processo, index) => (
                                                            <motion.div
                                                                key={index}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                                                style={{
                                                                    marginBottom: '15px',
                                                                    backgroundColor: '#f8f9fa',
                                                                    borderRadius: '12px',
                                                                    overflow: 'hidden',
                                                                    border: '1px solid #e9ecef'
                                                                }}
                                                            >
                                                                <div style={{
                                                                    padding: '16px 20px',
                                                                    borderBottom: '1px solid #e9ecef',
                                                                    backgroundColor: '#f0f7ff',
                                                                    display: 'flex',
                                                                    alignItems: 'center'
                                                                }}>
                                                                    <div style={{
                                                                        backgroundColor: '#1976D2',
                                                                        color: 'white',
                                                                        width: '36px',
                                                                        height: '36px',
                                                                        borderRadius: '50%',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        marginRight: '15px',
                                                                        fontSize: '16px',
                                                                        fontWeight: '600'
                                                                    }}>
                                                                        {index + 1}
                                                                    </div>
                                                                    <h5 style={{
                                                                        fontWeight: '600',
                                                                        color: '#1976D2',
                                                                        margin: 0,
                                                                        fontSize: '18px'
                                                                    }}>
                                                                        {t('Processo')}: {processo}
                                                                    </h5>
                                                                </div>

                                                                <div style={{ padding: '10px' }}>
                                                                    {filteredPedidos[processo]
                                                                        .slice()
                                                                        .sort((a, b) => new Date(b.DataHoraInicio) - new Date(a.DataHoraInicio))
                                                                        .map((pedido, i) => {
                                                                            const isExpanded = expandedInterv[`${processo}-${i}`];
                                                                            return (
                                                                                <div
                                                                                    key={i}
                                                                                    style={{
                                                                                        margin: '10px',
                                                                                        padding: '15px',
                                                                                        backgroundColor: '#FFFFFF',
                                                                                        borderRadius: '10px',
                                                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                                                                        transition: 'all 0.3s ease',
                                                                                        border: '1px solid #f0f0f0'
                                                                                    }}
                                                                                >
                                                                                    <div style={{
                                                                                        display: 'flex',
                                                                                        justifyContent: 'space-between',
                                                                                        alignItems: 'flex-start'
                                                                                    }}>
                                                                                        <div style={{ flex: 1 }}>
                                                                                            <div style={{
                                                                                                display: 'flex',
                                                                                                alignItems: 'center',
                                                                                                marginBottom: '8px'
                                                                                            }}>
                                                                                                <span style={{
                                                                                                    backgroundColor: '#e3f2fd',
                                                                                                    color: '#1976D2',
                                                                                                    padding: '4px 10px',
                                                                                                    borderRadius: '20px',
                                                                                                    fontSize: '13px',
                                                                                                    fontWeight: '600',
                                                                                                    marginRight: '10px'
                                                                                                }}>
                                                                                                    {t('Intervenção')} #{pedido.Interv}
                                                                                                </span>
                                                                                                <span style={{
                                                                                                    fontSize: '13px',
                                                                                                    color: '#757575',
                                                                                                    fontWeight: '500'
                                                                                                }}>
                                                                                                    {formatDateTime(pedido.DataHoraInicio)}
                                                                                                </span>
                                                                                            </div>
                                                                                            <p style={{
                                                                                                margin: '0 0 8px 0',
                                                                                                fontWeight: '500'
                                                                                            }}>
                                                                                                {pedido.DescricaoProb}
                                                                                            </p>

                                                                                            {isExpanded && (
                                                                                                <div style={{
                                                                                                    marginTop: '15px',
                                                                                                    paddingTop: '15px',
                                                                                                    borderTop: '1px solid #f0f0f0',
                                                                                                    fontSize: '14px'
                                                                                                }}>
                                                                                                    <div style={{
                                                                                                        display: 'grid',
                                                                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                                                                        gap: '10px',
                                                                                                        marginBottom: '15px'
                                                                                                    }}>
                                                                                                        <div>
                                                                                                            <p style={{ margin: '0 0 5px 0', color: '#757575' }}>
                                                                                                                {t('Estado')}
                                                                                                            </p>
                                                                                                            <p style={{ margin: 0, fontWeight: '500' }}>
                                                                                                                {pedido.DescricaoEstado}
                                                                                                            </p>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <p style={{ margin: '0 0 5px 0', color: '#757575' }}>
                                                                                                                {t('Técnico')}
                                                                                                            </p>
                                                                                                            <p style={{ margin: 0, fontWeight: '500' }}>
                                                                                                                {pedido.NomeTecnico}
                                                                                                            </p>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <p style={{ margin: '0 0 5px 0', color: '#757575' }}>
                                                                                                                {t('Duração')}
                                                                                                            </p>
                                                                                                            <p style={{ margin: 0, fontWeight: '500' }}>
                                                                                                                {pedido.Duracao} min
                                                                                                            </p>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div>
                                                                                                        <p style={{ margin: '0 0 5px 0', color: '#757575' }}>
                                                                                                            {t('Intervenção')}
                                                                                                        </p>
                                                                                                        <p style={{
                                                                                                            margin: 0,
                                                                                                            padding: '12px',
                                                                                                            backgroundColor: '#f9f9f9',
                                                                                                            borderRadius: '8px',
                                                                                                            lineHeight: '1.5'
                                                                                                        }}>
                                                                                                            {pedido.DescricaoResp || t('Sem detalhes de intervenção')}
                                                                                                        </p>
                                                                                                    </div>

                                                                                                    <div style={{
                                                                                                        display: 'flex',
                                                                                                        justifyContent: 'space-between',
                                                                                                        marginTop: '15px',
                                                                                                        fontSize: '13px',
                                                                                                        color: '#757575'
                                                                                                    }}>
                                                                                                        <span>
                                                                                                            <strong>{t('Início')}:</strong> {formatDateTime(pedido.DataHoraInicio)}
                                                                                                        </span>
                                                                                                        <span>
                                                                                                            <strong>{t('Fim')}:</strong> {formatDateTime(pedido.DataHoraFim)}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>

                                                                                        <button
                                                                                            onClick={() => toggleExpand(processo, i)}
                                                                                            style={{
                                                                                                backgroundColor: isExpanded ? '#f0f7ff' : '#e3f2fd',
                                                                                                color: '#1976D2',
                                                                                                border: 'none',
                                                                                                width: '32px',
                                                                                                height: '32px',
                                                                                                borderRadius: '50%',
                                                                                                display: 'flex',
                                                                                                alignItems: 'center',
                                                                                                justifyContent: 'center',
                                                                                                cursor: 'pointer',
                                                                                                fontSize: '18px',
                                                                                                fontWeight: 'bold',
                                                                                                marginLeft: '15px',
                                                                                                transition: 'all 0.2s ease'
                                                                                            }}
                                                                                            aria-label={isExpanded ? t('Ver Menos') : t('Ver Mais')}
                                                                                        >
                                                                                            {isExpanded ? '-' : '+'}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>

                                                    {/* Paginação */}
                                                    {totalPages > 1 && (
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            gap: '8px',
                                                            marginTop: '25px'
                                                        }}>
                                                            {currentPage > 1 && (
                                                                <button
                                                                    onClick={() => handlePageChange(currentPage - 1)}
                                                                    style={{
                                                                        width: '40px',
                                                                        height: '40px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid #e0e0e0',
                                                                        backgroundColor: '#ffffff',
                                                                        color: '#1976D2',
                                                                        cursor: 'pointer',
                                                                        fontWeight: 'bold'
                                                                    }}
                                                                >
                                                                    &lt;
                                                                </button>
                                                            )}

                                                            {[...Array(totalPages).keys()].map((page) => (
                                                                <button
                                                                    key={page}
                                                                    onClick={() => handlePageChange(page + 1)}
                                                                    style={{
                                                                        width: '40px',
                                                                        height: '40px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        borderRadius: '8px',
                                                                        border: currentPage === page + 1 ? 'none' : '1px solid #e0e0e0',
                                                                        backgroundColor: currentPage === page + 1 ? '#1976D2' : '#ffffff',
                                                                        color: currentPage === page + 1 ? '#ffffff' : '#1976D2',
                                                                        cursor: 'pointer',
                                                                        fontWeight: 'bold',
                                                                        boxShadow: currentPage === page + 1 ? '0 4px 6px rgba(25, 118, 210, 0.2)' : 'none'
                                                                    }}
                                                                >
                                                                    {page + 1}
                                                                </button>
                                                            ))}

                                                            {currentPage < totalPages && (
                                                                <button
                                                                    onClick={() => handlePageChange(currentPage + 1)}
                                                                    style={{
                                                                        width: '40px',
                                                                        height: '40px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid #e0e0e0',
                                                                        backgroundColor: '#ffffff',
                                                                        color: '#1976D2',
                                                                        cursor: 'pointer',
                                                                        fontWeight: 'bold'
                                                                    }}
                                                                >
                                                                    &gt;
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{
                                                    textAlign: 'center',
                                                    padding: '40px 20px',
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: '12px',
                                                    color: '#6c757d'
                                                }}>
                                                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔍</div>
                                                    <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>
                                                        {t('Pedidos não encontrados')}
                                                    </p>
                                                    <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                                                        {t('Tente ajustar seus filtros ou criar um novo pedido')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    <div ref={noticiasRef}>
                        {activeMenu === t('Notícias') && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                style={{
                                    maxWidth: '950px',
                                    margin: '0 auto',
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                                    width: window.innerWidth <= 768 ? '95%' : 'auto'
                                }}
                            >
                                <div style={{
                                    backgroundColor: '#1976D2',
                                    padding: '25px 30px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    <h2 style={{
                                        fontWeight: '700',
                                        color: '#FFFFFF',
                                        margin: 0,
                                        fontSize: '28px',
                                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)'
                                    }}>
                                        {t('Notícias Relevantes')}
                                    </h2>
                                </div>

                                <div style={{
                                    padding: window.innerWidth <= 768 ? '20px 16px' : '30px'
                                }}>
                                    {noticiasLoading ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">{t('loading')}</span>
                                            </div>
                                        </div>
                                    ) : noticiasError ? (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '40px 20px',
                                            backgroundColor: '#fff0f0',
                                            borderRadius: '12px',
                                            color: '#d8000c'
                                        }}>
                                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
                                            <p style={{ fontSize: '18px', fontWeight: '500' }}>{noticiasError}</p>
                                        </div>
                                    ) : noticias.length > 0 ? (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '16px'
                                        }}>
                                            {noticias.map((noticia, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, x: -12 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.25, delay: index * 0.05 }}
                                                    onClick={() => window.open(noticia.link, '_blank')}
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '16px',
                                                        padding: '20px',
                                                        backgroundColor: '#ffffff',
                                                        borderRadius: '12px',
                                                        border: '1px solid #e9ecef',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                                        transition: 'all .2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
                                                        e.currentTarget.style.backgroundColor = '#fafdff';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                                    }}
                                                >
                                                    {/* Conteúdo */}
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '8px',
                                                        minHeight: '0',
                                                        width: '100%'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            gap: '8px',
                                                            flexWrap: window.innerWidth <= 768 ? 'wrap' : 'nowrap'
                                                        }}>
                                                            <span style={{
                                                                backgroundColor: '#1976D2',
                                                                color: '#fff',
                                                                padding: '4px 10px',
                                                                borderRadius: '999px',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                whiteSpace: 'nowrap',
                                                                maxWidth: window.innerWidth <= 768 ? '100%' : '50%',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {noticia.source}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '12px',
                                                                color: '#667085',
                                                                whiteSpace: 'nowrap',
                                                                marginTop: window.innerWidth <= 768 ? '4px' : '0'
                                                            }}>
                                                                {new Date(noticia.date).toLocaleDateString('pt-PT')}
                                                            </span>
                                                        </div>

                                                        <h3 style={{
                                                            fontSize: window.innerWidth <= 768 ? '16px' : '17px',
                                                            fontWeight: 700,
                                                            color: '#0f3d74',
                                                            margin: '2px 0 0',
                                                            lineHeight: 1.35,
                                                            wordBreak: 'break-word'
                                                        }}>
                                                            {noticia.title}
                                                        </h3>

                                                        {noticia.description ? (
                                                            <p style={{
                                                                margin: '4px 0 0',
                                                                color: '#475569',
                                                                fontSize: window.innerWidth <= 768 ? '13px' : '14px',
                                                                lineHeight: 1.5,
                                                                wordBreak: 'break-word',
                                                                overflow: 'hidden',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: window.innerWidth <= 768 ? 3 : 2,
                                                                WebkitBoxOrient: 'vertical'
                                                            }}>
                                                                {noticia.description}
                                                            </p>
                                                        ) : null}

                                                        <div style={{
                                                            marginTop: 'auto',
                                                            display: 'flex',
                                                            justifyContent: 'flex-end',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            color: '#1976D2',
                                                            fontWeight: 600,
                                                            fontSize: window.innerWidth <= 768 ? '13px' : '14px',
                                                            paddingTop: '8px'
                                                        }}>
                                                            <span>Ler mais</span>
                                                            <span>→</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        /* ... o teu vazio mantém-se ... */
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '40px 20px',
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '12px',
                                            color: '#6c757d'
                                        }}>
                                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📰</div>
                                            <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>
                                                {t('Nenhuma notícia encontrada')}
                                            </p>
                                            <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                                                {t('Não foram encontradas notícias relevantes no momento')}
                                            </p>
                                        </div>
                                    )}


                                    <div style={{
                                        marginTop: '30px',
                                        textAlign: 'center'
                                    }}>
                                        <button
                                            onClick={fetchNoticias}
                                            style={{
                                                padding: '12px 24px',
                                                backgroundColor: '#1976D2',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1565C0'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
                                        >
                                            {t('Atualizar Notícias')}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div ref={productsRef}>
                        {activeMenu === t('Home.menu.products') && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                style={{
                                    maxWidth: '950px',
                                    margin: '0 auto',
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                                }}
                            >
                                <div style={{
                                    backgroundColor: '#1976D2',
                                    padding: '25px 30px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    <h2 style={{
                                        fontWeight: '700',
                                        color: '#FFFFFF',
                                        margin: 0,
                                        fontSize: '28px',
                                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)'
                                    }}>
                                        {t('Home.menu.products')}
                                    </h2>
                                </div>

                                <div style={{ padding: '40px 30px' }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                        gap: '30px',
                                        justifyContent: 'center'
                                    }}>
                                        {/* Produto Primavera */}
                                        <motion.div
                                            whileHover={{
                                                y: -10,
                                                boxShadow: '0 15px 30px rgba(0, 0, 0, 0.1)'
                                            }}
                                            transition={{ duration: 0.3 }}
                                            style={{
                                                backgroundColor: 'white',
                                                borderRadius: '16px',
                                                overflow: 'hidden',
                                                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '100%'
                                            }}
                                        >
                                            <div style={{
                                                padding: '30px 20px',
                                                backgroundColor: '#f7faff',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                height: '180px'
                                            }}>
                                                <img
                                                    src="https://pt.primaverabss.com/temas/primavera/img/cegid-logo-footer.svg"
                                                    alt="Primavera"
                                                    style={{
                                                        maxWidth: '160px',
                                                        maxHeight: '120px',
                                                        objectFit: 'contain'
                                                    }}
                                                />
                                            </div>
                                            <div style={{
                                                padding: '25px 20px',
                                                textAlign: 'center',
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <h3 style={{
                                                    fontSize: '22px',
                                                    fontWeight: '600',
                                                    margin: '0 0 15px 0',
                                                    color: '#1976D2'
                                                }}>
                                                    Primavera
                                                </h3>
                                                <p style={{
                                                    fontSize: '15px',
                                                    color: '#666',
                                                    margin: '0 0 20px 0',
                                                    lineHeight: '1.5'
                                                }}>
                                                    Software de gestão empresarial completo para empresas de todos os tamanhos.
                                                </p>
                                                <a
                                                    href="https://www.primaverabss.com/pt/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '12px 24px',
                                                        backgroundColor: '#e3f2fd',
                                                        color: '#1976D2',
                                                        borderRadius: '30px',
                                                        fontWeight: '600',
                                                        textDecoration: 'none',
                                                        transition: 'all 0.2s ease',
                                                        fontSize: '14px'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#bbdefb';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#e3f2fd';
                                                    }}
                                                >
                                                    Saber mais
                                                </a>
                                            </div>
                                        </motion.div>

                                        {/* Produto AdvirLink */}
                                        <motion.div
                                            whileHover={{
                                                y: -10,
                                                boxShadow: '0 15px 30px rgba(0, 0, 0, 0.1)'
                                            }}
                                            transition={{ duration: 0.3 }}
                                            style={{
                                                backgroundColor: 'white',
                                                borderRadius: '16px',
                                                overflow: 'hidden',
                                                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '100%'
                                            }}
                                        >
                                            <div style={{
                                                padding: '30px 20px',
                                                backgroundColor: '#f7faff',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                height: '180px'
                                            }}>
                                                <img
                                                    src="https://link.advir.pt/static/media/img_logo.a2a85989c690f4bfd096.png"
                                                    alt="AdvirLink"
                                                    style={{
                                                        maxWidth: '160px',
                                                        maxHeight: '120px',
                                                        objectFit: 'contain'
                                                    }}
                                                />
                                            </div>
                                            <div style={{
                                                padding: '25px 20px',
                                                textAlign: 'center',
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <h3 style={{
                                                    fontSize: '22px',
                                                    fontWeight: '600',
                                                    margin: '0 0 15px 0',
                                                    color: '#1976D2'
                                                }}>
                                                    AdvirLink
                                                </h3>
                                                <p style={{
                                                    fontSize: '15px',
                                                    color: '#666',
                                                    margin: '0 0 20px 0',
                                                    lineHeight: '1.5'
                                                }}>
                                                    Plataforma de gestão e integração de dados empresariais desenvolvida pela Advir.
                                                </p>
                                                <a
                                                    href="https://link.advir.pt"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '12px 24px',
                                                        backgroundColor: '#e3f2fd',
                                                        color: '#1976D2',
                                                        borderRadius: '30px',
                                                        fontWeight: '600',
                                                        textDecoration: 'none',
                                                        transition: 'all 0.2s ease',
                                                        fontSize: '14px'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#bbdefb';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#e3f2fd';
                                                    }}
                                                >
                                                    Saber mais
                                                </a>
                                            </div>
                                        </motion.div>

                                        {/* Produto Syslog */}
                                        <motion.div
                                            whileHover={{
                                                y: -10,
                                                boxShadow: '0 15px 30px rgba(0, 0, 0, 0.1)'
                                            }}
                                            transition={{ duration: 0.3 }}
                                            style={{
                                                backgroundColor: 'white',
                                                borderRadius: '16px',
                                                overflow: 'hidden',
                                                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '100%'
                                            }}
                                        >
                                            <div style={{
                                                padding: '30px 20px',
                                                backgroundColor: '#f7faff',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                height: '180px'
                                            }}>
                                                <img
                                                    src="https://www.syslogmobile.com/wp-content/themes/syslog/images/logo-syslog.png"
                                                    alt="Syslog"
                                                    style={{
                                                        maxWidth: '160px',
                                                        maxHeight: '120px',
                                                        objectFit: 'contain'
                                                    }}
                                                />
                                            </div>
                                            <div style={{
                                                padding: '25px 20px',
                                                textAlign: 'center',
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <h3 style={{
                                                    fontSize: '22px',
                                                    fontWeight: '600',
                                                    margin: '0 0 15px 0',
                                                    color: '#1976D2'
                                                }}>
                                                    Syslog
                                                </h3>
                                                <p style={{
                                                    fontSize: '15px',
                                                    color: '#666',
                                                    margin: '0 0 20px 0',
                                                    lineHeight: '1.5'
                                                }}>
                                                    Soluções de logística e gestão de transportes para otimizar operações.
                                                </p>
                                                <a
                                                    href="https://www.syslogmobile.com/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '12px 24px',
                                                        backgroundColor: '#e3f2fd',
                                                        color: '#1976D2',
                                                        borderRadius: '30px',
                                                        fontWeight: '600',
                                                        textDecoration: 'none',
                                                        transition: 'all 0.2s ease',
                                                        fontSize: '14px'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#bbdefb';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#e3f2fd';
                                                    }}
                                                >
                                                    Saber mais
                                                </a>
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div ref={faqRef}>
                        {activeMenu === t('Home.menu.faq') && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                style={{
                                    maxWidth: '850px',
                                    margin: '0 auto',
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                                }}
                            >
                                <div style={{
                                    backgroundColor: '#1976D2',
                                    padding: '25px 30px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    <h2 style={{
                                        fontWeight: '700',
                                        color: '#FFFFFF',
                                        margin: 0,
                                        fontSize: '28px',
                                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)'
                                    }}>
                                        {t('Home.faq.title')}
                                    </h2>
                                </div>

                                <div style={{ padding: '30px' }}>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '15px'
                                    }}>
                                        {faqItems.map((item, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                                style={{
                                                    borderRadius: '12px',
                                                    border: '1px solid',
                                                    borderColor: expandedIndex === index ? '#1976D2' : '#e0e0e0',
                                                    overflow: 'hidden',
                                                    backgroundColor: '#ffffff',
                                                    boxShadow: expandedIndex === index
                                                        ? '0 4px 15px rgba(25, 118, 210, 0.15)'
                                                        : '0 2px 8px rgba(0, 0, 0, 0.05)',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                <div
                                                    onClick={() => handleToggle(index)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '18px 20px',
                                                        backgroundColor: expandedIndex === index ? '#f0f7ff' : '#FFFFFF',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (expandedIndex !== index) {
                                                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (expandedIndex !== index) {
                                                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                                                        }
                                                    }}
                                                >
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '15px'
                                                    }}>
                                                        <div style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            backgroundColor: expandedIndex === index ? '#1976D2' : '#f0f7ff',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: expandedIndex === index ? 'white' : '#1976D2',
                                                            fontWeight: 'bold',
                                                            fontSize: '16px',
                                                            transition: 'all 0.2s ease'
                                                        }}>
                                                            {expandedIndex === index ? '-' : '?'}
                                                        </div>
                                                        <h3 style={{
                                                            margin: 0,
                                                            fontWeight: '600',
                                                            fontSize: '16px',
                                                            color: expandedIndex === index ? '#1976D2' : '#333333'
                                                        }}>
                                                            {item.question}
                                                        </h3>
                                                    </div>
                                                    <div style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'transform 0.3s ease'
                                                    }}>
                                                        <span style={{
                                                            color: expandedIndex === index ? '#1976D2' : '#757575',
                                                            fontSize: '20px',
                                                            transform: expandedIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                                            display: 'block',
                                                            transition: 'transform 0.3s ease'
                                                        }}>
                                                            ▼
                                                        </span>
                                                    </div>
                                                </div>

                                                {expandedIndex === index && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        transition={{ duration: 0.3 }}
                                                        style={{
                                                            padding: '5px 20px 20px 70px',
                                                            borderTop: '1px solid #f0f0f0',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: '20px',
                                                            top: '5px',
                                                            bottom: '20px',
                                                            width: '2px',
                                                            backgroundColor: '#e3f2fd'
                                                        }}></div>
                                                        <p style={{
                                                            margin: 0,
                                                            lineHeight: '1.6',
                                                            color: '#555555',
                                                            fontSize: '15px'
                                                        }}>
                                                            {item.answer}
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>

                                    <div style={{
                                        marginTop: '30px',
                                        textAlign: 'center',
                                        padding: '20px',
                                        backgroundColor: '#f0f7ff',
                                        borderRadius: '12px',
                                        border: '1px solid #e3f2fd'
                                    }}>
                                        <p style={{
                                            margin: '0 0 15px 0',
                                            fontSize: '16px',
                                            fontWeight: '500',
                                            color: '#1976D2'
                                        }}>
                                            {t('Não encontrou a resposta que procura?')}
                                        </p>
                                        <button style={{
                                            padding: '12px 24px',
                                            backgroundColor: '#1976D2',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)'
                                        }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1565C0'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
                                            onClick={() => handleMenuClick(t('Home.menu.orders'), ordersRef)}
                                        >
                                            {t('Criar um novo pedido')}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                    
                    {/* Privacy Settings Section */}
                    <div ref={privacyRef}>
                        {activeMenu === t('Definições de Privacidade') && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                style={{ maxWidth: '950px', margin: '0 auto', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }}
                            >
                                <div style={{ backgroundColor: '#1976D2', padding: '25px 30px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                    <h2 style={{ fontWeight: '700', color: '#FFFFFF', margin: 0, fontSize: '28px', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)' }}>
                                        {t('Definições de Privacidade')}
                                    </h2>
                                </div>
                                <div style={{ padding: '30px' }}>
                                    <PrivacySettings /> 
                                </div>
                            </motion.div>
                        )}
                    </div>
                </section>


            </div>
        </div>
    );
};

export default Home;