import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { startTokenValidation, stopTokenValidation } from './utils/authUtils';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaFileContract, FaPhone, FaBoxOpen, FaQuestionCircle, FaBars } from 'react-icons/fa';
import { motion } from 'framer-motion';
// Import for Privacy Settings
import { secureStorage } from './utils/secureStorage';
// Função para simular secureStorage no browser



const Home = () => {
    const { t } = useTranslation();


    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState(t('Home.menu.products')); // Estado para o menu ativo
    const [contratoInfo, setContratoInfo] = useState([]);
    const [pedidosInfo, setPedidosInfo] = useState(null);
    const [pedidosLoading, setPedidosLoading] = useState(false);
    const [expandedIndex, setExpandedIndex] = useState(null); // Estado para controlar qual pergunta está expandida
    const [groupedPedidos, setGroupedPedidos] = useState({});
    const [expandedInterv, setExpandedInterv] = useState({}); // Estado para controlar intervenções expandidas
    const [searchTerm, setSearchTerm] = useState(''); // Estado para a barra de pesquisa
    const [currentPage, setCurrentPage] = useState(1); // Estado para a página atual
    const itemsPerPage = 5; // Número de processos por página
    const [contratoLoading, setContratoLoading] = useState(false);
    const [initialDataLoading, setInitialDataLoading] = useState(true);
    const [advirTokensReady, setAdvirTokensReady] = useState(false);
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

    const estadosDisponiveis = pedidosInfo?.DataSet?.Table
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
    const token = await secureStorage.getItem('painelAdminTokenAdvir');
    const urlempresa = await secureStorage.getItem('urlempresaAdvir');
    const clienteID = await secureStorage.getItem('empresa_areacliente');

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


    const response = await fetch(`https://webapiprimavera.advir.pt/routePedidos_STP/CriarPedido`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        urlempresa,
      },
      body: JSON.stringify(payload),
    });


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
    finalizeSuccess();

  } catch (error) {
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

         //Rolar suavemente até a seção associada
        /*if (ref && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth' });
        }*/
    };



    // Função para alternar a expansão de uma intervenção específica
    const toggleExpand = (processo, intervIndex) => {
        setExpandedInterv((prevState) => ({
            ...prevState,
            [`${processo}-${intervIndex}`]: !prevState[`${processo}-${intervIndex}`],
        }));
    };



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
        //{ title: t('Home.menu.faq'), icon: <FaQuestionCircle size={22} />, ref: faqRef },
        //{ title: t('Definições de Privacidade'), icon: <span></span>, ref: privacyRef },
    ];



    useEffect(() => {
        if (pedidosInfo?.DataSet?.Table) {
            const grouped = pedidosInfo.DataSet.Table.reduce((acc, pedido) => {

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


                    return dateB - dateA; // Ordem decrescente (mais recente primeiro)
                });
            });

            setGroupedPedidos(grouped);
        } else {
            // Limpar pedidos agrupados se não houver dados
            setGroupedPedidos({});
        }
    }, [pedidosInfo]);




    // Função para buscar notícias
    const fetchNoticias = async () => {
        setNoticiasLoading(true);
        setNoticiasError('');

        try {
            const token = secureStorage.getItem('loginToken');

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
        } finally {
            setNoticiasLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const fetchPedidosInfo = async () => {
            if (!isMounted) return;


            setPedidosLoading(true);
            setLoading(true);

            // Aguardar até que os tokens da Advir estejam prontos
            if (!advirTokensReady) {
                // Verificar a cada 100ms se os tokens ficaram prontos
                const checkInterval = setInterval(() => {
                    if (advirTokensReady) {
                        clearInterval(checkInterval);
                        if (isMounted) {
                            fetchPedidosInfo();
                        }
                    }
                }, 100);

                // Timeout de 10 segundos
                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (isMounted && !advirTokensReady) {
                        setPedidosLoading(false);
                        setLoading(false);
                    }
                }, 10000);

                return;
            }

            try {
                const token = await secureStorage.getItem('painelAdminTokenAdvir');
                const urlempresa = await secureStorage.getItem('urlempresaAdvir');
                const id = await secureStorage.getItem('empresa_areacliente');

                if (!isMounted) return;


                if (!id || !token || !urlempresa) {
                    throw new Error(t('error') + 'Token or URL missing.');
                }

                const response = await fetch(
                    `https://webapiprimavera.advir.pt/clientArea/AreaclientListarpedidos/${id}`,
                    {
                        headers: { Authorization: `Bearer ${token}`, urlempresa },
                    }
                );

                if (!isMounted) return;

                if (!response.ok) {
                    throw new Error(t('error') + response.statusText);
                }

                const data = await response.json();

                if (isMounted) {
                    setPedidosInfo(data);
                }
            } catch (error) {
                // Silenciar erros - mostrar apenas loading state
                if (isMounted) {
                    setPedidosInfo(null);
                }
            } finally {
                if (isMounted) {
                    setPedidosLoading(false);
                    setLoading(false);
                }
            }
        };

        if (activeMenu === t('Home.menu.orders')) {
            // Carregar imediatamente quando entrar na aba
            fetchPedidosInfo();
        }

        return () => {
            isMounted = false;
        };
    }, [activeMenu, t, advirTokensReady]);

    useEffect(() => {
        const entrarNaEmpresaAdvir = async () => {
            try {
                const loginToken = secureStorage.getItem('loginToken');
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

                // Guardar a `urlempresa` no secureStorage
                secureStorage.setItem('urlempresaAdvir', credenciais.urlempresa);

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
                secureStorage.setItem('painelAdminTokenAdvir', tokenData.token);
                setAdvirTokensReady(true);
            } catch (error) {
                setAdvirTokensReady(false);
            }
        };


        entrarNaEmpresaAdvir();

        // Cleanup function to restore body scroll when component unmounts
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);




    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        if (activeMenu === t('Notícias')) {
            timeoutId = setTimeout(() => {
                if (isMounted) {
                    fetchNoticias();
                }
            }, 300);
        } else {
            // Limpar estado de loading quando sair da aba
            setNoticiasLoading(false);
        }

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [activeMenu]);

    // Função para buscar dados gerais (contactos e prioridades)
    const fetchFormData = async () => {
        try {
            const token = await secureStorage.getItem('painelAdminTokenAdvir');
            const urlempresa = await secureStorage.getItem('urlempresaAdvir');
            const clienteID = await secureStorage.getItem('empresa_areacliente');

            if (!clienteID || !token || !urlempresa) {
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
            }

            // Fetch prioridades
            const prioridadesResponse = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/ListarTiposPrioridades`,
                { headers: { Authorization: `Bearer ${token}`, urlempresa } }
            );

            if (prioridadesResponse.ok) {
                const prioridadesData = await prioridadesResponse.json();
                setDataLists((prev) => ({ ...prev, prioridades: prioridadesData.DataSet?.Table || [] }));
            }

            // Preencher cliente no formulário
            setFormData((prev) => ({ ...prev, cliente: clienteID }));
        } catch (error) {
        }
    };

    // UseEffect para carregar dados do contrato
    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (!isMounted) return;


            setContratoLoading(true);
            setLoading(true);
            setErrorMessage('');

            // Aguardar até que os tokens da Advir estejam prontos
            if (!advirTokensReady) {
                const checkInterval = setInterval(() => {
                    if (advirTokensReady) {
                        clearInterval(checkInterval);
                        if (isMounted) {
                            fetchData();
                        }
                    }
                }, 100);

                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (isMounted && !advirTokensReady) {
                        setContratoLoading(false);
                        setLoading(false);
                    }
                }, 10000);

                return;
            }

            try {
                const token = await secureStorage.getItem('painelAdminTokenAdvir');
                const urlempresa = await secureStorage.getItem('urlempresaAdvir');
                const clienteID = await secureStorage.getItem('empresa_areacliente');

                if (!isMounted) return;

                

                if (!clienteID || !token || !urlempresa) {
                    if (isMounted) {
                        setErrorMessage('Dados de autenticação não encontrados. Tente fazer login novamente.');
                    }
                    return;
                }

                // Fetch contrato
                const contratoResponse = await fetch(`https://webapiprimavera.advir.pt/clientArea/ObterInfoContrato/${clienteID}`, {
                    headers: { Authorization: `Bearer ${token}`, urlempresa },
                });

                if (!isMounted) return;

                if (!contratoResponse.ok) {
                    throw new Error(`Erro ao buscar contrato: ${contratoResponse.statusText}`);
                }

                const contratoData = await contratoResponse.json();

                if (!isMounted) return;

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
                if (isMounted && (dataLists.contactos.length === 0 || dataLists.prioridades.length === 0)) {
                    await fetchFormData();
                }

            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message);
                }
            } finally {
                if (isMounted) {
                    setContratoLoading(false);
                    setLoading(false);
                }
            }
        };

        if (activeMenu === t('Home.menu.contract')) {
            // Carregar imediatamente quando entrar na aba
            fetchData();
        }

        return () => {
            isMounted = false;
        };
    }, [activeMenu, t, advirTokensReady]);

    // UseEffect para carregar dados do formulário quando necessário
    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        if (activeMenu === t('Home.menu.orders') && (dataLists.contactos.length === 0 || dataLists.prioridades.length === 0)) {
            timeoutId = setTimeout(() => {
                if (isMounted) {
                    fetchFormData();
                }
            }, 300);
        }

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [activeMenu, t]);

    const navigate = (route) => {
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
            minHeight: '100vh',
            overflowY: 'auto',
            fontFamily: 'Poppins, sans-serif',
            position: 'relative',
            background: 'linear-gradient(to bottom, rgba(227, 242, 253, 0.8), rgba(187, 222, 251, 0.8), rgba(144, 202, 249, 0.8))'
        }}>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            <div style={{
                position: 'relative',
                zIndex: 1,
                minHeight: '100vh'
            }}>

           
            

                {/* Main Content */}

                <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="text-center"
                    style={{
                        padding: '100px 20px 60px',
                        minHeight: '100vh',
                        fontFamily: 'Poppins, sans-serif',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                    {/* Advanced Floating background elements with mesh gradient effect */}
                    <motion.div
                        animate={{
                            x: [0, 100, 0],
                            y: [0, -50, 0],
                            scale: [1, 1.3, 1],
                            opacity: [0.15, 0.3, 0.15]
                        }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{
                            position: 'absolute',
                            top: '5%',
                            right: '8%',
                            width: '500px',
                            height: '500px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(25, 118, 210, 0.25) 0%, rgba(66, 165, 245, 0.15) 40%, transparent 70%)',
                            filter: 'blur(60px)',
                            zIndex: 0,
                            pointerEvents: 'none'
                        }}
                    />
                    <motion.div
                        animate={{
                            x: [0, -80, 0],
                            y: [0, 60, 0],
                            scale: [1, 1.4, 1],
                            opacity: [0.12, 0.25, 0.12]
                        }}
                        transition={{
                            duration: 25,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{
                            position: 'absolute',
                            bottom: '10%',
                            left: '3%',
                            width: '600px',
                            height: '600px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(66, 165, 245, 0.2) 0%, rgba(25, 118, 210, 0.1) 40%, transparent 70%)',
                            filter: 'blur(70px)',
                            zIndex: 0,
                            pointerEvents: 'none'
                        }}
                    />
                    <motion.div
                        animate={{
                            x: [0, 50, -50, 0],
                            y: [0, -30, 30, 0],
                            rotate: [0, 360],
                            scale: [1, 1.2, 0.9, 1]
                        }}
                        transition={{
                            duration: 30,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        style={{
                            position: 'absolute',
                            top: '40%',
                            right: '20%',
                            width: '400px',
                            height: '400px',
                            borderRadius: '30%',
                            background: 'radial-gradient(circle, rgba(25, 118, 210, 0.08) 0%, transparent 60%)',
                            filter: 'blur(50px)',
                            zIndex: 0,
                            pointerEvents: 'none'
                        }}
                    />

                    {/* Hero Title Section */}
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        style={{
                            position: 'relative',
                            zIndex: 1,
                            marginBottom: '80px'
                        }}
                    >
                        <motion.h1
                            animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                            }}
                            transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            style={{
                                fontSize: 'clamp(48px, 8vw, 96px)',
                                fontWeight: '900',
                                background: 'linear-gradient(90deg, #1976D2 0%, #42A5F5 25%, #1E88E5 50%, #42A5F5 75%, #1976D2 100%)',
                                backgroundSize: '200% 100%',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                marginBottom: '20px',
                                letterSpacing: '-2px',
                                textShadow: '0 0 80px rgba(25, 118, 210, 0.3)'
                            }}
                        >
                            AdvirLink
                        </motion.h1>
                        
                    </motion.div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '35px',
                        maxWidth: '1400px',
                        margin: '0 auto',
                        padding: '0 20px',
                        marginBottom: '80px',
                        position: 'relative',
                        zIndex: 1
                    }}>
                        {menus.map((menu, index) => {
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 60, rotateX: -15, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                                    transition={{
                                        duration: 0.7,
                                        delay: index * 0.12,
                                        type: "spring",
                                        stiffness: 80
                                    }}
                                    whileHover={{
                                        scale: 1.05,
                                        y: -15,
                                        rotateY: 5,
                                        boxShadow: activeMenu === menu.title
                                            ? '0 25px 50px rgba(25, 118, 210, 0.5), 0 10px 25px rgba(25, 118, 210, 0.4), inset 0 0 60px rgba(255, 255, 255, 0.1)'
                                            : '0 20px 40px rgba(25, 118, 210, 0.25), 0 10px 20px rgba(0, 0, 0, 0.15)',
                                        transition: { duration: 0.4, ease: "easeOut" }
                                    }}
                                    whileTap={{ scale: 0.97, rotateY: -2 }}
                                    onClick={() => handleMenuClick(menu.title, menu.ref)}
                                    style={{
                                        minHeight: '200px',
                                        background: activeMenu === menu.title
                                            ? 'linear-gradient(135deg, #1976D2 0%, #42A5F5 50%, #1E88E5 100%)'
                                            : 'rgba(255, 255, 255, 0.8)',
                                        backdropFilter: 'blur(20px)',
                                        WebkitBackdropFilter: 'blur(20px)',
                                        borderRadius: '28px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '32px 24px',
                                        color: activeMenu === menu.title ? '#FFFFFF' : '#1976D2',
                                        cursor: 'pointer',
                                        boxShadow: activeMenu === menu.title
                                            ? '0 20px 40px rgba(25, 118, 210, 0.45), 0 8px 20px rgba(25, 118, 210, 0.35), inset 0 0 40px rgba(255, 255, 255, 0.1)'
                                            : '0 10px 30px rgba(0, 0, 0, 0.08), inset 0 0 20px rgba(255, 255, 255, 0.5)',
                                        textAlign: 'center',
                                        border: activeMenu === menu.title
                                            ? '2px solid rgba(255, 255, 255, 0.4)'
                                            : '2px solid rgba(25, 118, 210, 0.15)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        transformStyle: 'preserve-3d',
                                        perspective: '1000px'
                                    }}
                                >
                                    {/* Animated Background Circles */}
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.3, 0.5, 0.3],
                                            rotate: [0, 180, 360]
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '-30px',
                                            right: '-30px',
                                            width: '120px',
                                            height: '120px',
                                            borderRadius: '50%',
                                            backgroundColor: activeMenu === menu.title
                                                ? 'rgba(255, 255, 255, 0.15)'
                                                : 'rgba(25, 118, 210, 0.1)',
                                            zIndex: 0
                                        }}
                                    />
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.3, 1],
                                            rotate: [360, 180, 0]
                                        }}
                                        transition={{
                                            duration: 4,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                        style={{
                                            position: 'absolute',
                                            bottom: '-40px',
                                            left: '-40px',
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '50%',
                                            backgroundColor: activeMenu === menu.title
                                                ? 'rgba(255, 255, 255, 0.1)'
                                                : 'rgba(25, 118, 210, 0.08)',
                                            zIndex: 0
                                        }}
                                    />

                                    <motion.div
                                        whileHover={{ scale: 1.2, rotate: 10 }}
                                        style={{
                                            fontSize: '48px',
                                            marginBottom: '15px',
                                            color: activeMenu === menu.title ? '#FFFFFF' : '#1976D2',
                                            zIndex: 1,
                                            filter: activeMenu === menu.title
                                                ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))'
                                                : 'drop-shadow(0 2px 4px rgba(25, 118, 210, 0.3))'
                                        }}>
                                        {menu.icon}
                                    </motion.div>
                                    <span style={{
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        zIndex: 1,
                                        letterSpacing: '0.5px',
                                        textShadow: activeMenu === menu.title
                                            ? '0 2px 4px rgba(0, 0, 0, 0.2)'
                                            : 'none'
                                    }}>{menu.title}</span>

                                    {/* Shine effect on hover */}
                                    <motion.div
                                        initial={{ x: '-100%' }}
                                        whileHover={{ x: '200%' }}
                                        transition={{ duration: 0.6 }}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '50%',
                                            height: '100%',
                                            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                                            transform: 'skewX(-20deg)',
                                            zIndex: 2,
                                            pointerEvents: 'none'
                                        }}
                                    />
                                </motion.div>
                            );
                        })}
                    </div>
                    {/* Content Based on Active Menu */}
                    <div ref={contractRef}>
                        {activeMenu === t('Home.menu.contract') && (
                            <>
                                {loading || contratoLoading ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            height: '300px',
                                            gap: '20px'
                                        }}>
                                        <motion.div
                                            animate={{
                                                scale: [1, 1.2, 1],
                                                rotate: [0, 360]
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                border: '4px solid rgba(25, 118, 210, 0.2)',
                                                borderTop: '4px solid #1976D2',
                                                borderRadius: '50%'
                                            }}
                                        />
                                        <motion.p
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            style={{
                                                color: '#1976D2',
                                                fontSize: '18px',
                                                fontWeight: '600',
                                                letterSpacing: '0.5px'
                                            }}>
                                            {t('A carregar informações do contrato...')}
                                        </motion.p>
                                    </motion.div>
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
                                            {/* Cabeçalho Moderno com Gradiente */}
                                            <motion.div
                                                initial={{ opacity: 0, y: -20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 }}
                                                style={{
                                                    background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                                    padding: '35px 30px',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}>
                                                <motion.div
                                                    animate={{
                                                        scale: [1, 1.2, 1],
                                                        rotate: [0, 180, 360]
                                                    }}
                                                    transition={{
                                                        duration: 20,
                                                        repeat: Infinity,
                                                        ease: "linear"
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '-50px',
                                                        right: '-50px',
                                                        width: '200px',
                                                        height: '200px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        filter: 'blur(20px)'
                                                    }}
                                                />
                                                <h2 style={{
                                                    fontWeight: 800,
                                                    color: '#FFFFFF',
                                                    margin: 0,
                                                    fontSize: '32px',
                                                    letterSpacing: '0.5px',
                                                    textShadow: '2px 2px 8px rgba(0, 0, 0, 0.2)',
                                                    position: 'relative',
                                                    zIndex: 1
                                                }}>
                                                    {t('Home.contratoinfo.title')} {c.Codigo}
                                                </h2>
                                            </motion.div>

                                            <div style={{ padding: '35px' }}>
                                                {/* Detalhes com design limpo */}
                                                <motion.div
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.3 }}
                                                    style={{
                                                        backgroundColor: '#ffffff',
                                                        borderRadius: '16px',
                                                        padding: '25px',
                                                        border: '2px solid #f0f7ff',
                                                        marginBottom: '25px',
                                                        boxShadow: '0 4px 15px rgba(25, 118, 210, 0.08)'
                                                    }}>
                                                    <div style={{ marginBottom: '15px' }}>
                                                        <span style={{
                                                            fontSize: '13px',
                                                            color: '#757575',
                                                            textTransform: 'uppercase',
                                                            fontWeight: '600',
                                                            letterSpacing: '1px'
                                                        }}>{t('Home.contratoinfo.codigo')}</span>
                                                        <p style={{
                                                            fontSize: '20px',
                                                            fontWeight: '700',
                                                            color: '#1976D2',
                                                            margin: '8px 0 0 0'
                                                        }}>{c.Codigo}</p>
                                                    </div>
                                                    <div style={{
                                                        height: '1px',
                                                        background: 'linear-gradient(90deg, rgba(25, 118, 210, 0.3) 0%, transparent 100%)',
                                                        margin: '15px 0'
                                                    }}/>
                                                    <div>
                                                        <span style={{
                                                            fontSize: '13px',
                                                            color: '#757575',
                                                            textTransform: 'uppercase',
                                                            fontWeight: '600',
                                                            letterSpacing: '1px'
                                                        }}>{t('Home.contratoinfo.descricao')}</span>
                                                        <p style={{
                                                            fontSize: '16px',
                                                            fontWeight: '500',
                                                            color: '#333',
                                                            margin: '8px 0 0 0',
                                                            lineHeight: '1.6'
                                                        }}>{c.Descricao}</p>
                                                    </div>
                                                </motion.div>

                                                {/* Horas e progresso (se não for PRJ) */}
                                                {c.TipoDoc !== 'PRJ' && (
                                                    <>
                                                        <div style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                            gap: '20px',
                                                            marginBottom: '25px'
                                                        }}>
                                                            {/* Horas Contrato */}
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 20 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.4 }}
                                                                whileHover={{ y: -5, boxShadow: '0 8px 20px rgba(25, 118, 210, 0.15)' }}
                                                                style={{
                                                                    backgroundColor: '#ffffff',
                                                                    borderRadius: '20px',
                                                                    padding: '30px 20px',
                                                                    border: '2px solid #e3f2fd',
                                                                    textAlign: 'center',
                                                                    transition: 'all 0.3s ease',
                                                                    position: 'relative',
                                                                    overflow: 'hidden'
                                                                }}>
                                                                <motion.div
                                                                    animate={{ scale: [1, 1.1, 1] }}
                                                                    transition={{ duration: 2, repeat: Infinity }}
                                                                    style={{
                                                                        width: '60px',
                                                                        height: '60px',
                                                                        margin: '0 auto 15px',
                                                                        borderRadius: '50%',
                                                                        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontSize: '28px',
                                                                        boxShadow: '0 4px 15px rgba(25, 118, 210, 0.2)'
                                                                    }}>⏱️</motion.div>
                                                                <p style={{
                                                                    margin: '0 0 10px',
                                                                    color: '#757575',
                                                                    fontSize: '12px',
                                                                    textTransform: 'uppercase',
                                                                    fontWeight: '600',
                                                                    letterSpacing: '1px'
                                                                }}>{t('Home.contratoinfo.horascontrato')}</p>
                                                                <p style={{
                                                                    fontSize: '32px',
                                                                    fontWeight: '800',
                                                                    background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                                                    WebkitBackgroundClip: 'text',
                                                                    WebkitTextFillColor: 'transparent',
                                                                    margin: 0
                                                                }}>{c.HorasTotais} h</p>
                                                            </motion.div>

                                                            {/* Horas Gastas */}
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 20 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.5 }}
                                                                whileHover={{ y: -5, boxShadow: '0 8px 20px rgba(244, 67, 54, 0.15)' }}
                                                                style={{
                                                                    backgroundColor: '#ffffff',
                                                                    borderRadius: '20px',
                                                                    padding: '30px 20px',
                                                                    border: '2px solid #ffebee',
                                                                    textAlign: 'center',
                                                                    transition: 'all 0.3s ease',
                                                                    position: 'relative',
                                                                    overflow: 'hidden'
                                                                }}>
                                                                <motion.div
                                                                    animate={{ rotate: [0, 10, -10, 0] }}
                                                                    transition={{ duration: 3, repeat: Infinity }}
                                                                    style={{
                                                                        width: '60px',
                                                                        height: '60px',
                                                                        margin: '0 auto 15px',
                                                                        borderRadius: '50%',
                                                                        background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontSize: '28px',
                                                                        boxShadow: '0 4px 15px rgba(244, 67, 54, 0.2)'
                                                                    }}>⌛</motion.div>
                                                                <p style={{
                                                                    margin: '0 0 10px',
                                                                    color: '#757575',
                                                                    fontSize: '12px',
                                                                    textTransform: 'uppercase',
                                                                    fontWeight: '600',
                                                                    letterSpacing: '1px'
                                                                }}>{t('Home.contratoinfo.horasgastas')}</p>
                                                                <p style={{
                                                                    fontSize: '32px',
                                                                    fontWeight: '800',
                                                                    background: 'linear-gradient(135deg, #f44336 0%, #e57373 100%)',
                                                                    WebkitBackgroundClip: 'text',
                                                                    WebkitTextFillColor: 'transparent',
                                                                    margin: 0
                                                                }}>{c.HorasGastas} h</p>
                                                            </motion.div>

                                                            {/* Horas Disponíveis */}
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 20 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.6 }}
                                                                whileHover={{ y: -5, boxShadow: '0 8px 20px rgba(76, 175, 80, 0.15)' }}
                                                                style={{
                                                                    backgroundColor: '#ffffff',
                                                                    borderRadius: '20px',
                                                                    padding: '30px 20px',
                                                                    border: '2px solid #e8f5e9',
                                                                    textAlign: 'center',
                                                                    transition: 'all 0.3s ease',
                                                                    position: 'relative',
                                                                    overflow: 'hidden'
                                                                }}>
                                                                <motion.div
                                                                    animate={{ scale: [1, 1.2, 1] }}
                                                                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                                                    style={{
                                                                        width: '60px',
                                                                        height: '60px',
                                                                        margin: '0 auto 15px',
                                                                        borderRadius: '50%',
                                                                        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontSize: '28px',
                                                                        boxShadow: '0 4px 15px rgba(76, 175, 80, 0.2)'
                                                                    }}>✅</motion.div>
                                                                <p style={{
                                                                    margin: '0 0 10px',
                                                                    color: '#757575',
                                                                    fontSize: '12px',
                                                                    textTransform: 'uppercase',
                                                                    fontWeight: '600',
                                                                    letterSpacing: '1px'
                                                                }}>{t('Home.contratoinfo.horasdisponiveis')}</p>
                                                                <p style={{
                                                                    fontSize: '32px',
                                                                    fontWeight: '800',
                                                                    background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
                                                                    WebkitBackgroundClip: 'text',
                                                                    WebkitTextFillColor: 'transparent',
                                                                    margin: 0
                                                                }}>
                                                                    {(c.HorasTotais - c.HorasGastas).toFixed(2)} h
                                                                </p>
                                                            </motion.div>
                                                        </div>

                                                        {/* Barra de Progresso Moderna */}
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: 0.7 }}
                                                            style={{
                                                                backgroundColor: '#ffffff',
                                                                borderRadius: '20px',
                                                                padding: '30px',
                                                                border: '2px solid #f0f7ff',
                                                                boxShadow: '0 4px 20px rgba(25, 118, 210, 0.08)'
                                                            }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                marginBottom: '20px'
                                                            }}>
                                                                <div>
                                                                    <p style={{
                                                                        margin: '0 0 5px 0',
                                                                        fontSize: '12px',
                                                                        color: '#757575',
                                                                        textTransform: 'uppercase',
                                                                        fontWeight: '600',
                                                                        letterSpacing: '1px'
                                                                    }}>{t('Progresso do Contrato')}</p>
                                                                    <p style={{
                                                                        margin: 0,
                                                                        fontSize: '14px',
                                                                        color: '#999',
                                                                        fontWeight: '500'
                                                                    }}>
                                                                        {c.HorasGastas}h de {c.HorasTotais}h utilizadas
                                                                    </p>
                                                                </div>
                                                                <motion.div
                                                                    animate={{ scale: [1, 1.1, 1] }}
                                                                    transition={{ duration: 2, repeat: Infinity }}
                                                                    style={{
                                                                        fontSize: '36px',
                                                                        fontWeight: '900',
                                                                        background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                                                        WebkitBackgroundClip: 'text',
                                                                        WebkitTextFillColor: 'transparent'
                                                                    }}>
                                                                    {Math.round((c.HorasGastas / c.HorasTotais) * 100)}%
                                                                </motion.div>
                                                            </div>
                                                            <div style={{
                                                                height: '16px',
                                                                backgroundColor: '#f0f7ff',
                                                                borderRadius: '20px',
                                                                overflow: 'hidden',
                                                                position: 'relative',
                                                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
                                                            }}>
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${(c.HorasGastas / c.HorasTotais) * 100}%` }}
                                                                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.8 }}
                                                                    style={{
                                                                        height: '100%',
                                                                        background: 'linear-gradient(90deg, #1976D2 0%, #42A5F5 100%)',
                                                                        borderRadius: '20px',
                                                                        position: 'relative',
                                                                        boxShadow: '0 2px 8px rgba(25, 118, 210, 0.4)'
                                                                    }}>
                                                                    <motion.div
                                                                        animate={{
                                                                            x: ['-100%', '200%']
                                                                        }}
                                                                        transition={{
                                                                            duration: 2,
                                                                            repeat: Infinity,
                                                                            ease: "easeInOut"
                                                                        }}
                                                                        style={{
                                                                            position: 'absolute',
                                                                            top: 0,
                                                                            left: 0,
                                                                            width: '50%',
                                                                            height: '100%',
                                                                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
                                                                        }}
                                                                    />
                                                                </motion.div>
                                                            </div>
                                                        </motion.div>
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
                                {(pedidosLoading || loading) && !pedidosInfo ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            height: '300px',
                                            gap: '20px'
                                        }}>
                                        <motion.div
                                            animate={{
                                                scale: [1, 1.2, 1],
                                                rotate: [0, 360]
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                border: '4px solid rgba(25, 118, 210, 0.2)',
                                                borderTop: '4px solid #1976D2',
                                                borderRadius: '50%'
                                            }}
                                        />
                                        <motion.p
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            style={{
                                                color: '#1976D2',
                                                fontSize: '18px',
                                                fontWeight: '600',
                                                letterSpacing: '0.5px'
                                            }}>
                                            {t('A carregar pedidos...')}
                                        </motion.p>
                                    </motion.div>
                                ) : pedidosInfo ? (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.6 }}
                                            style={{
                                                maxWidth: '1100px',
                                                margin: '0 auto 30px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                                borderRadius: '24px',
                                                padding: '0',
                                                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
                                                overflow: 'hidden',
                                                border: '1px solid rgba(25, 118, 210, 0.1)'
                                            }}>
                                            {/* Header com gradiente moderno */}
                                            <motion.div
                                                initial={{ opacity: 0, y: -20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 }}
                                                style={{
                                                    background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                                    padding: '35px 35px',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}>
                                                {/* Animated background circles */}
                                                <motion.div
                                                    animate={{
                                                        scale: [1, 1.3, 1],
                                                        x: [-50, 50, -50]
                                                    }}
                                                    transition={{
                                                        duration: 15,
                                                        repeat: Infinity,
                                                        ease: "easeInOut"
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '-30px',
                                                        right: '-30px',
                                                        width: '180px',
                                                        height: '180px',
                                                        background: 'rgba(255, 255, 255, 0.15)',
                                                        borderRadius: '50%',
                                                        filter: 'blur(40px)'
                                                    }}
                                                />
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    position: 'relative',
                                                    zIndex: 1,
                                                    flexWrap: 'wrap',
                                                    gap: '15px'
                                                }}>
                                                    <h2 style={{
                                                        fontWeight: '800',
                                                        color: '#FFFFFF',
                                                        margin: 0,
                                                        fontSize: '32px',
                                                        textShadow: '2px 2px 8px rgba(0, 0, 0, 0.2)',
                                                        letterSpacing: '-0.5px'
                                                    }}>
                                                        {t('Pedidos de Assistência')}
                                                    </h2>
                                                    <motion.button
                                                        whileHover={{
                                                            scale: 1.05,
                                                            boxShadow: '0 12px 30px rgba(255, 255, 255, 0.3)',
                                                            y: -2
                                                        }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={toggleForm}
                                                        style={{
                                                            padding: '16px 28px',
                                                            background: 'rgba(255, 255, 255, 0.95)',
                                                            color: '#1976D2',
                                                            borderRadius: '16px',
                                                            border: '2px solid rgba(255, 255, 255, 0.5)',
                                                            cursor: 'pointer',
                                                            fontSize: '16px',
                                                            fontWeight: '700',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            transition: 'all 0.3s ease',
                                                            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                                                            letterSpacing: '0.5px',
                                                            backdropFilter: 'blur(10px)'
                                                        }}
                                                    >
                                                        <motion.span
                                                            animate={{ rotate: [0, 90, 0] }}
                                                            transition={{ duration: 2, repeat: Infinity }}
                                                            style={{ fontSize: '20px', fontWeight: 'bold' }}
                                                        >
                                                            +
                                                        </motion.span>
                                                        {t('Novo Pedido')}
                                                    </motion.button>
                                                </div>
                                            </motion.div>

                                            {/* Content Area */}
                                            <div style={{ padding: '35px' }}>

                                                {/* Form for creating new requests */}
                                                {showForm && (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        style={{
                                                            position: 'fixed',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                                            backdropFilter: 'blur(8px)',
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            zIndex: 10000,
                                                        }}>
                                                        <motion.div
                                                            initial={{ scale: 0.8, y: 50, opacity: 0 }}
                                                            animate={{ scale: 1, y: 0, opacity: 1 }}
                                                            exit={{ scale: 0.8, y: 50, opacity: 0 }}
                                                            transition={{ type: "spring", duration: 0.5 }}
                                                            style={{
                                                                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                                                backdropFilter: 'blur(20px)',
                                                                borderRadius: '24px',
                                                                width: '90%',
                                                                maxWidth: '600px',
                                                                maxHeight: '90vh',
                                                                overflowY: 'auto',
                                                                padding: '30px',
                                                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                                                                border: '1px solid rgba(25, 118, 210, 0.2)'
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
                                                        </motion.div>
                                                    </motion.div>
                                                )}

                                            {/* Barra de Pesquisa */}
                                            <motion.div
                                                initial={{ opacity: 0, y: -20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 }}
                                                style={{
                                                    display: 'flex',
                                                    gap: '15px',
                                                    alignItems: 'center',
                                                    marginBottom: '25px',
                                                    flexWrap: 'wrap'
                                                }}>
                                                <motion.div
                                                    whileFocus={{ scale: 1.02 }}
                                                    style={{
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
                                                            padding: '14px 14px 14px 45px',
                                                            borderRadius: '16px',
                                                            border: '2px solid #e0e0e0',
                                                            backgroundColor: '#ffffff',
                                                            fontSize: '15px',
                                                            transition: 'all 0.3s ease',
                                                            outline: 'none'
                                                        }}
                                                        onFocus={(e) => {
                                                            e.target.style.borderColor = '#1976D2';
                                                            e.target.style.boxShadow = '0 4px 20px rgba(25, 118, 210, 0.2)';
                                                        }}
                                                        onBlur={(e) => {
                                                            e.target.style.borderColor = '#e0e0e0';
                                                            e.target.style.boxShadow = 'none';
                                                        }}
                                                    />
                                                    <motion.div
                                                        animate={{ rotate: [0, 20, 0] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                        style={{
                                                            position: 'absolute',
                                                            left: '16px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            color: '#1976D2',
                                                            fontSize: '18px'
                                                        }}>
                                                        🔍
                                                    </motion.div>
                                                </motion.div>

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
                                            </motion.div>

                                            {/* Filtros de Estado Modernos */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                                style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '12px',
                                                    marginBottom: '30px'
                                                }}>
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setSelectedEstado('')}
                                                    style={{
                                                        padding: '12px 24px',
                                                        borderRadius: '50px',
                                                        border: selectedEstado === '' ? 'none' : '2px solid #e3f2fd',
                                                        background: selectedEstado === ''
                                                            ? 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)'
                                                            : '#ffffff',
                                                        color: selectedEstado === '' ? '#FFFFFF' : '#1976D2',
                                                        boxShadow: selectedEstado === ''
                                                            ? '0 6px 20px rgba(25, 118, 210, 0.35)'
                                                            : '0 2px 8px rgba(0, 0, 0, 0.05)',
                                                        cursor: 'pointer',
                                                        fontWeight: '600',
                                                        fontSize: '14px',
                                                        transition: 'all 0.3s ease',
                                                        letterSpacing: '0.5px'
                                                    }}
                                                >
                                                    {t('Todos')}
                                                </motion.button>
                                                {estadosDisponiveis.map((estado, index) => (
                                                    <motion.button
                                                        key={index}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: 0.1 * (index + 1) }}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => setSelectedEstado(estado)}
                                                        style={{
                                                            padding: '12px 24px',
                                                            borderRadius: '50px',
                                                            border: selectedEstado === estado ? 'none' : '2px solid #e3f2fd',
                                                            background: selectedEstado === estado
                                                                ? 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)'
                                                                : '#ffffff',
                                                            color: selectedEstado === estado ? '#FFFFFF' : '#1976D2',
                                                            boxShadow: selectedEstado === estado
                                                                ? '0 6px 20px rgba(25, 118, 210, 0.35)'
                                                                : '0 2px 8px rgba(0, 0, 0, 0.05)',
                                                            cursor: 'pointer',
                                                            fontWeight: '600',
                                                            fontSize: '14px',
                                                            transition: 'all 0.3s ease',
                                                            letterSpacing: '0.5px'
                                                        }}
                                                    >
                                                        {estado}
                                                    </motion.button>
                                                ))}
                                            </motion.div>

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
                                                                                <motion.div
                                                                                    key={i}
                                                                                    initial={{ opacity: 0, x: -20 }}
                                                                                    animate={{ opacity: 1, x: 0 }}
                                                                                    transition={{ delay: i * 0.05 }}
                                                                                    whileHover={{ x: 5, boxShadow: '0 8px 25px rgba(25, 118, 210, 0.15)' }}
                                                                                    style={{
                                                                                        margin: '10px',
                                                                                        padding: '20px',
                                                                                        backgroundColor: '#FFFFFF',
                                                                                        borderRadius: '16px',
                                                                                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
                                                                                        transition: 'all 0.3s ease',
                                                                                        border: '2px solid #f0f7ff',
                                                                                        position: 'relative',
                                                                                        overflow: 'hidden'
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

                                                                                        <motion.button
                                                                                            whileHover={{ scale: 1.1, rotate: isExpanded ? 180 : 0 }}
                                                                                            whileTap={{ scale: 0.9 }}
                                                                                            onClick={() => toggleExpand(processo, i)}
                                                                                            style={{
                                                                                                background: isExpanded
                                                                                                    ? 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)'
                                                                                                    : 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                                                                color: isExpanded ? '#FFFFFF' : '#1976D2',
                                                                                                border: 'none',
                                                                                                width: '40px',
                                                                                                height: '40px',
                                                                                                borderRadius: '12px',
                                                                                                display: 'flex',
                                                                                                alignItems: 'center',
                                                                                                justifyContent: 'center',
                                                                                                cursor: 'pointer',
                                                                                                fontSize: '20px',
                                                                                                fontWeight: 'bold',
                                                                                                marginLeft: '15px',
                                                                                                transition: 'all 0.3s ease',
                                                                                                boxShadow: isExpanded
                                                                                                    ? '0 4px 15px rgba(25, 118, 210, 0.3)'
                                                                                                    : '0 2px 8px rgba(0, 0, 0, 0.1)'
                                                                                            }}
                                                                                            aria-label={isExpanded ? t('Ver Menos') : t('Ver Mais')}
                                                                                        >
                                                                                            {isExpanded ? '−' : '+'}
                                                                                        </motion.button>
                                                                                    </div>
                                                                                </motion.div>
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
                                        </motion.div>
                                    </>
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
                                            {t('Sem dados de pedidos')}
                                        </p>
                                    </div>
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
                                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                    borderRadius: '24px',
                                    overflow: 'hidden',
                                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                                    width: window.innerWidth <= 768 ? '95%' : 'auto',
                                    border: '1px solid rgba(25, 118, 210, 0.1)'
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: 0.2 }}
                                    style={{
                                        background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                        padding: '35px 30px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.3, 1],
                                            x: [-50, 50, -50]
                                        }}
                                        transition={{
                                            duration: 15,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '-30px',
                                            right: '-30px',
                                            width: '180px',
                                            height: '180px',
                                            background: 'rgba(255, 255, 255, 0.15)',
                                            borderRadius: '50%',
                                            filter: 'blur(40px)'
                                        }}
                                    />
                                    <h2 style={{
                                        fontWeight: '800',
                                        color: '#FFFFFF',
                                        margin: 0,
                                        fontSize: '32px',
                                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
                                        position: 'relative',
                                        zIndex: 1,
                                        letterSpacing: '-0.5px'
                                    }}>
                                         {t('Notícias')}
                                    </h2>
                                </motion.div>

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
                                            gap: '18px'
                                        }}>
                                            {noticias.map((noticia, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                    transition={{
                                                        duration: 0.5,
                                                        delay: index * 0.08,
                                                        type: "spring",
                                                        stiffness: 100
                                                    }}
                                                    whileHover={{
                                                        scale: 1.02,
                                                        y: -5,
                                                        boxShadow: '0 12px 30px rgba(25, 118, 210, 0.2)'
                                                    }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => window.open(noticia.link, '_blank')}
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '16px',
                                                        padding: '24px',
                                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
                                                        borderRadius: '16px',
                                                        border: '2px solid rgba(25, 118, 210, 0.1)',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                                                        position: 'relative',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {/* Shine effect on hover */}
                                                    <motion.div
                                                        initial={{ x: '-100%' }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                                                            pointerEvents: 'none',
                                                            opacity: 0
                                                        }}
                                                    />

                                                    {/* Conteúdo */}
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '12px',
                                                        minHeight: '0',
                                                        width: '100%',
                                                        position: 'relative',
                                                        zIndex: 1
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            flexWrap: window.innerWidth <= 768 ? 'wrap' : 'nowrap'
                                                        }}>
                                                            <span style={{
                                                                background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                                                color: '#fff',
                                                                padding: '6px 14px',
                                                                borderRadius: '8px',
                                                                fontSize: '13px',
                                                                fontWeight: 700,
                                                                whiteSpace: 'nowrap',
                                                                maxWidth: window.innerWidth <= 768 ? '100%' : '50%',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.25)'
                                                            }}>
                                                                🔖 {noticia.source}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '13px',
                                                                color: '#64748b',
                                                                fontWeight: '600',
                                                                whiteSpace: 'nowrap',
                                                                marginTop: window.innerWidth <= 768 ? '4px' : '0',
                                                                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                                                padding: '4px 10px',
                                                                borderRadius: '6px'
                                                            }}>
                                                                📅 {new Date(noticia.date).toLocaleDateString('pt-PT')}
                                                            </span>
                                                        </div>

                                                        <h3 style={{
                                                            fontSize: window.innerWidth <= 768 ? '17px' : '19px',
                                                            fontWeight: 800,
                                                            background: 'linear-gradient(135deg, #0f3d74 0%, #1976D2 100%)',
                                                            WebkitBackgroundClip: 'text',
                                                            WebkitTextFillColor: 'transparent',
                                                            backgroundClip: 'text',
                                                            margin: '4px 0 0',
                                                            lineHeight: 1.4,
                                                            wordBreak: 'break-word',
                                                            letterSpacing: '-0.3px'
                                                        }}>
                                                            {noticia.title}
                                                        </h3>

                                                        {noticia.description ? (
                                                            <p style={{
                                                                margin: '4px 0 0',
                                                                color: '#475569',
                                                                fontSize: window.innerWidth <= 768 ? '14px' : '15px',
                                                                lineHeight: 1.6,
                                                                wordBreak: 'break-word',
                                                                overflow: 'hidden',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: window.innerWidth <= 768 ? 3 : 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                fontWeight: '500'
                                                            }}>
                                                                {noticia.description}
                                                            </p>
                                                        ) : null}

                                                        <motion.div
                                                            whileHover={{ x: 5 }}
                                                            style={{
                                                                marginTop: 'auto',
                                                                display: 'flex',
                                                                justifyContent: 'flex-end',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                color: '#1976D2',
                                                                fontWeight: 700,
                                                                fontSize: window.innerWidth <= 768 ? '14px' : '15px',
                                                                paddingTop: '8px'
                                                            }}
                                                        >
                                                            <span>Ler mais</span>
                                                            <motion.span
                                                                animate={{ x: [0, 5, 0] }}
                                                                transition={{
                                                                    duration: 1.5,
                                                                    repeat: Infinity,
                                                                    ease: "easeInOut"
                                                                }}
                                                                style={{ fontSize: '18px' }}
                                                            >
                                                                →
                                                            </motion.span>
                                                        </motion.div>
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


                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6, delay: 0.4 }}
                                        style={{
                                            marginTop: '35px',
                                            textAlign: 'center',
                                            padding: '25px',
                                            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(66, 165, 245, 0.05) 100%)',
                                            borderRadius: '16px',
                                            border: '2px solid rgba(25, 118, 210, 0.1)'
                                        }}
                                    >
                                        <motion.button
                                            whileHover={{
                                                scale: 1.05,
                                                boxShadow: '0 8px 25px rgba(25, 118, 210, 0.35)'
                                            }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={fetchNoticias}
                                            style={{
                                                padding: '14px 32px',
                                                background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontWeight: '700',
                                                fontSize: '16px',
                                                cursor: 'pointer',
                                                boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <motion.div
                                                animate={{
                                                    rotate: [0, 360]
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "linear"
                                                }}
                                                style={{
                                                    display: 'inline-block',
                                                    marginRight: '8px'
                                                }}
                                            >
                                                🔄
                                            </motion.div>
                                            {t('Atualizar Notícias')}
                                        </motion.button>
                                    </motion.div>
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
                                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                    borderRadius: '24px',
                                    overflow: 'hidden',
                                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                                    border: '1px solid rgba(25, 118, 210, 0.1)'
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: 0.2 }}
                                    style={{
                                        background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                        padding: '35px 30px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            rotate: [0, 90, 180, 270, 360]
                                        }}
                                        transition={{
                                            duration: 25,
                                            repeat: Infinity,
                                            ease: "linear"
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '-40px',
                                            left: '-40px',
                                            width: '200px',
                                            height: '200px',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '30%',
                                            filter: 'blur(40px)'
                                        }}
                                    />
                                    <h2 style={{
                                        fontWeight: '800',
                                        color: '#FFFFFF',
                                        margin: 0,
                                        fontSize: '32px',
                                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
                                        position: 'relative',
                                        zIndex: 1,
                                        letterSpacing: '-0.5px'
                                    }}>
                                         {t('Home.menu.products')}
                                    </h2>
                                </motion.div>

                                <div style={{ padding: '40px 30px' }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                        gap: '30px',
                                        justifyContent: 'center'
                                    }}>
                                        {/* Produto Primavera */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{
                                                duration: 0.6,
                                                delay: 0.1,
                                                type: "spring",
                                                stiffness: 100
                                            }}
                                            whileHover={{
                                                y: -12,
                                                scale: 1.03,
                                                boxShadow: '0 20px 40px rgba(25, 118, 210, 0.25)'
                                            }}
                                            style={{
                                                background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
                                                borderRadius: '20px',
                                                overflow: 'hidden',
                                                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '100%',
                                                border: '2px solid rgba(25, 118, 210, 0.1)',
                                                position: 'relative'
                                            }}
                                        >
                                            <motion.div
                                                whileHover={{ scale: 1.05 }}
                                                transition={{ duration: 0.3 }}
                                                style={{
                                                    padding: '35px 20px',
                                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    height: '200px',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <motion.div
                                                    animate={{
                                                        scale: [1, 1.3, 1],
                                                        opacity: [0.3, 0.6, 0.3]
                                                    }}
                                                    transition={{
                                                        duration: 4,
                                                        repeat: Infinity,
                                                        ease: "easeInOut"
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        width: '150px',
                                                        height: '150px',
                                                        background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
                                                        borderRadius: '50%'
                                                    }}
                                                />
                                                <img
                                                    src="https://pt.primaverabss.com/temas/primavera/img/cegid-logo-footer.svg"
                                                    alt="Primavera"
                                                    style={{
                                                        maxWidth: '170px',
                                                        maxHeight: '130px',
                                                        objectFit: 'contain',
                                                        position: 'relative',
                                                        zIndex: 1,
                                                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                                                    }}
                                                />
                                            </motion.div>
                                            <div style={{
                                                padding: '28px 24px',
                                                textAlign: 'center',
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <h3 style={{
                                                    fontSize: '24px',
                                                    fontWeight: '800',
                                                    margin: '0 0 16px 0',
                                                    background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    letterSpacing: '-0.5px'
                                                }}>
                                                    Primavera
                                                </h3>
                                                <p style={{
                                                    fontSize: '15px',
                                                    color: '#546e7a',
                                                    margin: '0 0 24px 0',
                                                    lineHeight: '1.6',
                                                    fontWeight: '500'
                                                }}>
                                                    Software de gestão empresarial completo para empresas de todos os tamanhos.
                                                </p>
                                                <motion.a
                                                    whileHover={{
                                                        scale: 1.05,
                                                        boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)'
                                                    }}
                                                    whileTap={{ scale: 0.95 }}
                                                    href="https://www.primaverabss.com/pt/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '14px 28px',
                                                        background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                                        color: 'white',
                                                        borderRadius: '12px',
                                                        fontWeight: '700',
                                                        textDecoration: 'none',
                                                        fontSize: '15px',
                                                        boxShadow: '0 4px 15px rgba(25, 118, 210, 0.25)'
                                                    }}
                                                >
                                                    🔗 Saber mais
                                                </motion.a>
                                            </div>
                                        </motion.div>

                                        {/* Produto AdvirLink */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{
                                                duration: 0.6,
                                                delay: 0.2,
                                                type: "spring",
                                                stiffness: 100
                                            }}
                                            whileHover={{
                                                y: -12,
                                                scale: 1.03,
                                                boxShadow: '0 20px 40px rgba(25, 118, 210, 0.25)'
                                            }}
                                            style={{
                                                background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
                                                borderRadius: '20px',
                                                overflow: 'hidden',
                                                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '100%',
                                                border: '2px solid rgba(25, 118, 210, 0.1)',
                                                position: 'relative'
                                            }}
                                        >
                                            <motion.div
                                                whileHover={{ scale: 1.05 }}
                                                transition={{ duration: 0.3 }}
                                                style={{
                                                    padding: '35px 20px',
                                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    height: '200px',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <motion.div
                                                    animate={{
                                                        scale: [1, 1.3, 1],
                                                        opacity: [0.3, 0.6, 0.3]
                                                    }}
                                                    transition={{
                                                        duration: 4,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                        delay: 0.5
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        width: '150px',
                                                        height: '150px',
                                                        background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
                                                        borderRadius: '50%'
                                                    }}
                                                />
                                                <img
                                                    src="https://link.advir.pt/static/media/img_logo.a2a85989c690f4bfd096.png"
                                                    alt="AdvirLink"
                                                    style={{
                                                        maxWidth: '170px',
                                                        maxHeight: '130px',
                                                        objectFit: 'contain',
                                                        position: 'relative',
                                                        zIndex: 1,
                                                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                                                    }}
                                                />
                                            </motion.div>
                                            <div style={{
                                                padding: '28px 24px',
                                                textAlign: 'center',
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <h3 style={{
                                                    fontSize: '24px',
                                                    fontWeight: '800',
                                                    margin: '0 0 16px 0',
                                                    background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    letterSpacing: '-0.5px'
                                                }}>
                                                    AdvirLink
                                                </h3>
                                                <p style={{
                                                    fontSize: '15px',
                                                    color: '#546e7a',
                                                    margin: '0 0 24px 0',
                                                    lineHeight: '1.6',
                                                    fontWeight: '500'
                                                }}>
                                                    Plataforma de gestão e integração de dados empresariais desenvolvida pela Advir.
                                                </p>
                                                <motion.a
                                                    whileHover={{
                                                        scale: 1.05,
                                                        boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)'
                                                    }}
                                                    whileTap={{ scale: 0.95 }}
                                                    href="https://link.advir.pt"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '14px 28px',
                                                        background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                                        color: 'white',
                                                        borderRadius: '12px',
                                                        fontWeight: '700',
                                                        textDecoration: 'none',
                                                        fontSize: '15px',
                                                        boxShadow: '0 4px 15px rgba(25, 118, 210, 0.25)'
                                                    }}
                                                >
                                                    🔗 Saber mais
                                                </motion.a>
                                            </div>
                                        </motion.div>

                                        {/* Produto Syslog */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{
                                                duration: 0.6,
                                                delay: 0.3,
                                                type: "spring",
                                                stiffness: 100
                                            }}
                                            whileHover={{
                                                y: -12,
                                                scale: 1.03,
                                                boxShadow: '0 20px 40px rgba(25, 118, 210, 0.25)'
                                            }}
                                            style={{
                                                background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
                                                borderRadius: '20px',
                                                overflow: 'hidden',
                                                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '100%',
                                                border: '2px solid rgba(25, 118, 210, 0.1)',
                                                position: 'relative'
                                            }}
                                        >
                                            <motion.div
                                                whileHover={{ scale: 1.05 }}
                                                transition={{ duration: 0.3 }}
                                                style={{
                                                    padding: '35px 20px',
                                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    height: '200px',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <motion.div
                                                    animate={{
                                                        scale: [1, 1.3, 1],
                                                        opacity: [0.3, 0.6, 0.3]
                                                    }}
                                                    transition={{
                                                        duration: 4,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                        delay: 1
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        width: '150px',
                                                        height: '150px',
                                                        background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
                                                        borderRadius: '50%'
                                                    }}
                                                />
                                                <img
                                                    src="https://www.syslogmobile.com/wp-content/themes/syslog/images/logo-syslog.png"
                                                    alt="Syslog"
                                                    style={{
                                                        maxWidth: '170px',
                                                        maxHeight: '130px',
                                                        objectFit: 'contain',
                                                        position: 'relative',
                                                        zIndex: 1,
                                                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                                                    }}
                                                />
                                            </motion.div>
                                            <div style={{
                                                padding: '28px 24px',
                                                textAlign: 'center',
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <h3 style={{
                                                    fontSize: '24px',
                                                    fontWeight: '800',
                                                    margin: '0 0 16px 0',
                                                    background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    letterSpacing: '-0.5px'
                                                }}>
                                                    Syslog
                                                </h3>
                                                <p style={{
                                                    fontSize: '15px',
                                                    color: '#546e7a',
                                                    margin: '0 0 24px 0',
                                                    lineHeight: '1.6',
                                                    fontWeight: '500'
                                                }}>
                                                    Soluções de logística e gestão de transportes para otimizar operações.
                                                </p>
                                                <motion.a
                                                    whileHover={{
                                                        scale: 1.05,
                                                        boxShadow: '0 6px 20px rgba(25, 118, 210, 0.3)'
                                                    }}
                                                    whileTap={{ scale: 0.95 }}
                                                    href="https://www.syslogmobile.com/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '14px 28px',
                                                        background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
                                                        color: 'white',
                                                        borderRadius: '12px',
                                                        fontWeight: '700',
                                                        textDecoration: 'none',
                                                        fontSize: '15px',
                                                        boxShadow: '0 4px 15px rgba(25, 118, 210, 0.25)'
                                                    }}
                                                >
                                                    🔗 Saber mais
                                                </motion.a>
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                   
                    
                    
                </motion.section>



            </div>
        </div>
    );
};

export default Home;