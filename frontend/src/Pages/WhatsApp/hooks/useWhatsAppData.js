import { useState, useEffect, useCallback } from "react";

const useWhatsAppData = (API_BASE_URL, activeTab) => {
    const [status, setStatus] = useState({
        status: "disconnected",
        isReady: false,
        qrCode: null,
        hasQrCode: false,
    });
    const [loading, setLoading] = useState(false);
    const [scheduledMessages, setScheduledMessages] = useState([]);
    const [contactLists, setContactLists] = useState([]);
    const [contactListsLoaded, setContactListsLoaded] = useState(false);
    const [externosDisponiveis, setExternosDisponiveis] = useState([]);
    const [obrasDisponiveis, setObrasDisponiveis] = useState([]);
    const [externosContactos, setExternosContactos] = useState([]);
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({});
    const [userInfo, setUserInfo] = useState(null);

    const checkStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/status`);
            const data = await response.json();
            setStatus(data);
        } catch (error) {
            console.error("Erro ao verificar status:", error);
        }
    };

    const loadScheduledMessages = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/schedules`);
            const data = await response.json();
            setScheduledMessages(data);
        } catch (error) {
            console.error("Erro ao carregar mensagens agendadas:", error);
        }
    };

    const loadContactLists = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/contacts`);
            const data = await response.json();

            if (Array.isArray(data)) {
                const convertedLists = data.map((list) => {
                    if (
                        Array.isArray(list.contacts) &&
                        list.contacts.length > 0 &&
                        typeof list.contacts[0] === "object"
                    ) {
                        return list;
                    }
                    const contacts = Array.isArray(list.contacts)
                        ? list.contacts
                        : typeof list.contacts === "string"
                            ? JSON.parse(list.contacts)
                            : [];

                    return {
                        ...list,
                        contacts: contacts.map((phone) => ({
                            phone: phone,
                            numeroTecnico: list.numeroTecnico || "",
                            numeroCliente: list.numeroCliente || "",
                            canCreateTickets: list.canCreateTickets || false,
                        })),
                    };
                });
                setContactLists(convertedLists);
            } else {
                console.warn("Resposta da API não é um array:", data);
                setContactLists([]);
            }
            setContactListsLoaded(true);
        } catch (error) {
            console.error("Erro ao carregar listas de contactos:", error);
            setContactLists([]);
            setContactListsLoaded(true);
        }
    };

    const loadLogs = async (logFilter) => {
        try {
            const params = new URLSearchParams();
            if (logFilter.scheduleId) params.append("scheduleId", logFilter.scheduleId);
            if (logFilter.type) params.append("type", logFilter.type);
            params.append("limit", logFilter.limit);

            const response = await fetch(`${API_BASE_URL}/logs?${params}`);
            const data = await response.json();
            setLogs(data.logs || []);
        } catch (error) {
            console.error("Erro ao carregar logs:", error);
        }
    };

    const loadStats = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/stats`);
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error("Erro ao carregar estatísticas:", error);
        }
    };

    const loadExternosDisponiveis = async () => {
        try {
            const token = localStorage.getItem("loginToken");
            const empresaId = localStorage.getItem("empresa_id");

            if (!token || !empresaId) {
                console.warn("Token ou empresa_id não encontrados");
                return;
            }

            const response = await fetch("https://backend.advir.pt/api/trabalhadores-externos?ativo=true&anulado=false&pageSize=500", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-Empresa-ID": empresaId,
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const data = await response.json();
                    const lista = Array.isArray(data) ? data : (data?.data || []);
                    setExternosDisponiveis(lista);
                } else {
                    console.error("Resposta não é JSON:", await response.text());
                }
            } else {
                console.error("Erro na resposta:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("Erro ao carregar externos:", error);
        }
    };

    const loadObrasDisponiveis = async () => {
        try {
            const token = localStorage.getItem("loginToken");
            const empresaId = localStorage.getItem("empresa_id");

            if (!token || !empresaId) {
                console.warn("Token ou empresa_id não encontrados");
                return;
            }

            const response = await fetch("https://webapi.advir.pt/api/Obras/listar", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-Empresa-ID": empresaId,
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const data = await response.json();
                    setObrasDisponiveis(data || []);
                } else {
                    console.error("Resposta não é JSON:", await response.text());
                }
            } else {
                console.error("Erro na resposta:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("Erro ao carregar obras:", error);
        }
    };

    const loadExternosContactos = async () => {
        try {
            const saved = localStorage.getItem("externosContactos");
            if (saved) {
                setExternosContactos(JSON.parse(saved));
            }
        } catch (error) {
            console.error("Erro ao carregar contactos de externos:", error);
        }
    };

    const loadUserInfo = async () => {
        if (status.isReady) {
            try {
                const response = await fetch(`${API_BASE_URL}/me`);
                if (response.ok) {
                    const data = await response.json();
                    setUserInfo(data);
                } else {
                    setUserInfo(null);
                }
            } catch (error) {
                console.error("Erro ao carregar informações do utilizador:", error);
                setUserInfo(null);
            }
        } else {
            setUserInfo(null);
        }
    };

    const fetchExternos = useCallback(async () => {
        try {
            const token = localStorage.getItem("loginToken");
            const empresaId = localStorage.getItem("empresa_id");

            if (!token || !empresaId) return;

            const response = await fetch("https://backend.advir.pt/api/trabalhadores-externos?ativo=true&anulado=false&pageSize=500", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "X-Empresa-ID": empresaId,
                },
            });

            if (response.ok) {
                const data = await response.json();
                // A API retorna {data: [...]} ou array direto
                const lista = Array.isArray(data) ? data : (data?.data || []);
                setExternosDisponiveis(lista);
            }
        } catch (error) {
            console.error("Erro ao carregar externos:", error);
        }
    }, []);


    useEffect(() => {
        checkStatus();
        loadScheduledMessages();
        loadContactLists();
        loadStats();
        if (activeTab === "externos") {
            fetchExternos();
            loadObrasDisponiveis();
            loadExternosContactos();
        }
        const interval = setInterval(() => {
            checkStatus();
            loadUserInfo();
            if (activeTab === "logs") {
                loadStats();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [activeTab, API_BASE_URL, fetchExternos]);

    return {
        status,
        setStatus,
        loading,
        setLoading,
        scheduledMessages,
        setScheduledMessages,
        contactLists,
        setContactLists,
        contactListsLoaded,
        setContactListsLoaded,
        externosDisponiveis,
        setExternosDisponiveis,
        obrasDisponiveis,
        setObrasDisponiveis,
        externosContactos,
        setExternosContactos,
        logs,
        setLogs,
        stats,
        setStats,
        userInfo,
        setUserInfo,
        checkStatus,
        loadScheduledMessages,
        loadContactLists,
        loadLogs,
        loadStats,
        loadExternosDisponiveis,
        loadObrasDisponiveis,
        loadExternosContactos,
        loadUserInfo,
        fetchExternos,
    };
};

export default useWhatsAppData;