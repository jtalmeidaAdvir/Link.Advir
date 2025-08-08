
import React, { useState, useEffect } from "react";

const WhatsAppWebConfig = () => {
    const [status, setStatus] = useState({
        status: "disconnected",
        isReady: false,
        qrCode: null,
        hasQrCode: false,
    });
    const [loading, setLoading] = useState(false);
    const [testMessage, setTestMessage] = useState({
        to: "",
        message: "",
        priority: "normal",
    });

    // Estados para agendamento
    const [scheduledMessages, setScheduledMessages] = useState([]);
    const [newSchedule, setNewSchedule] = useState({
        message: "",
        contactList: [],
        frequency: "daily",
        time: "09:00",
        days: [],
        startDate: "",
        enabled: true,
        priority: "normal",
    });

    // Estados para gestão de contactos
    const [contactLists, setContactLists] = useState([]);
    const [newContactList, setNewContactList] = useState({
        name: "",
        contacts: "",
    });
    const [selectedContactList, setSelectedContactList] = useState("");

    // Estados para visualização
    const [activeTab, setActiveTab] = useState("connection");

    // Estados para logs
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({});
    const [logFilter, setLogFilter] = useState({
        scheduleId: "",
        type: "",
        limit: 50,
    });

    // Estados para informações do utilizador conectado
    const [userInfo, setUserInfo] = useState(null);

    // API base URL
    const API_BASE_URL = "https://backend.advir.pt/api/whatsapp-web";

    // Add custom scrollbar styles for webkit browsers
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .custom-scroll::-webkit-scrollbar {
                width: 8px;
            }
            .custom-scroll::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 10px;
            }
            .custom-scroll::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 10px;
            }
            .custom-scroll::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    useEffect(() => {
        checkStatus();
        loadScheduledMessages();
        loadContactLists();
        loadLogs();
        loadStats();
        const interval = setInterval(() => {
            checkStatus();
            loadUserInfo();
            if (activeTab === "logs") {
                loadLogs();
                loadStats();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [activeTab]);

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
            setContactLists(data);
        } catch (error) {
            console.error("Erro ao carregar listas de contactos:", error);
        }
    };

    const loadLogs = async () => {
        try {
            const params = new URLSearchParams();
            if (logFilter.scheduleId)
                params.append("scheduleId", logFilter.scheduleId);
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

    const clearLogs = async (scheduleId = null) => {
        try {
            const url = scheduleId
                ? `${API_BASE_URL}/logs?scheduleId=${scheduleId}`
                : `${API_BASE_URL}/logs`;

            await fetch(url, { method: "DELETE" });
            loadLogs();
            loadStats();
            alert("Logs removidos com sucesso!");
        } catch (error) {
            console.error("Erro ao remover logs:", error);
            alert("Erro ao remover logs");
        }
    };

    const handleConnect = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/connect`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (response.ok) {
                alert("Iniciando conexão... Aguarde o QR Code aparecer!");
                checkStatus();
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error) {
            console.error("Erro ao conectar:", error);
            alert("Erro ao iniciar conexão WhatsApp Web");
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/disconnect`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (response.ok) {
                alert("WhatsApp Web desconectado com sucesso!");
                setUserInfo(null);
                checkStatus();
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error) {
            console.error("Erro ao desconectar:", error);
            alert("Erro ao desconectar WhatsApp Web");
        } finally {
            setLoading(false);
        }
    };

    const handleChangeAccount = async () => {
        if (
            confirm(
                "Tem certeza que deseja trocar de conta WhatsApp? Isso irá limpar completamente a sessão atual."
            )
        ) {
            setLoading(true);
            try {
                const clearResponse = await fetch(
                    `${API_BASE_URL}/clear-session`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (clearResponse.ok) {
                    setTimeout(async () => {
                        try {
                            const connectResponse = await fetch(
                                `${API_BASE_URL}/connect`,
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                }
                            );

                            if (connectResponse.ok) {
                                alert(
                                    "Sessão limpa! Aguarde o novo QR Code aparecer para conectar com uma conta diferente."
                                );
                                setUserInfo(null);
                                checkStatus();
                            } else {
                                alert("Erro ao iniciar nova conexão");
                            }
                        } catch (error) {
                            console.error("Erro ao conectar após limpeza:", error);
                            alert("Erro ao iniciar nova conexão");
                        } finally {
                            setLoading(false);
                        }
                    }, 2000);
                } else {
                    const errorData = await clearResponse.json();
                    alert(`Erro ao limpar sessão: ${errorData.error}`);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Erro ao limpar sessão:", error);
                alert("Erro ao limpar sessão WhatsApp");
                setLoading(false);
            }
        }
    };

    const handleTestMessage = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(testMessage),
            });

            const data = await response.json();

            if (response.ok) {
                alert("Mensagem enviada com sucesso!");
                setTestMessage({ to: "", message: "", priority: "normal" });
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            alert("Erro ao enviar mensagem");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateContactList = async (e) => {
        e.preventDefault();
        if (!newContactList.name || !newContactList.contacts) {
            alert("Nome da lista e contactos são obrigatórios");
            return;
        }

        const contacts = newContactList.contacts
            .split("\n")
            .map((contact) => contact.trim())
            .filter((contact) => contact.length > 0)
            .map((phone) => phone.replace(/\D/g, ""));

        if (contacts.length === 0) {
            alert("Adicione pelo menos um contacto válido");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/contact-lists`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: newContactList.name,
                    contacts: contacts,
                }),
            });

            if (response.ok) {
                setNewContactList({ name: "", contacts: "" });
                loadContactLists();
                alert("Lista de contactos criada com sucesso!");
            } else {
                const error = await response.json();
                alert(`Erro ao criar lista: ${error.error}`);
            }
        } catch (error) {
            console.error("Erro ao criar lista de contactos:", error);
            alert("Erro ao criar lista de contactos");
        }
    };

    const handleCreateSchedule = async (e) => {
        e.preventDefault();
        if (!newSchedule.message || newSchedule.contactList.length === 0) {
            alert("Mensagem e lista de contactos são obrigatórios");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/schedule`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newSchedule),
            });

            if (response.ok) {
                setNewSchedule({
                    message: "",
                    contactList: [],
                    frequency: "daily",
                    time: "09:00",
                    days: [],
                    startDate: "",
                    enabled: true,
                    priority: "normal",
                });
                setSelectedContactList("");
                loadScheduledMessages();
                alert("Agendamento criado com sucesso!");
            } else {
                const error = await response.json();
                alert(`Erro ao criar agendamento: ${error.error}`);
            }
        } catch (error) {
            console.error("Erro ao criar agendamento:", error);
            alert("Erro ao criar agendamento. Verificar logs.");
        }
    };

    const deleteSchedule = async (id) => {
        if (confirm("Tem certeza que deseja eliminar este agendamento?")) {
            try {
                const response = await fetch(`${API_BASE_URL}/schedule/${id}`, {
                    method: "DELETE",
                });

                if (response.ok) {
                    loadScheduledMessages();
                    alert("Agendamento removido com sucesso!");
                } else {
                    alert("Erro ao remover agendamento");
                }
            } catch (error) {
                console.error("Erro ao remover agendamento:", error);
                alert("Erro ao remover agendamento");
            }
        }
    };

    const deleteContactList = async (id) => {
        if (
            confirm("Tem certeza que deseja eliminar esta lista de contactos?")
        ) {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/contact-lists/${id}`,
                    {
                        method: "DELETE",
                    }
                );

                if (response.ok) {
                    loadContactLists();
                    alert("Lista removida com sucesso!");
                } else {
                    alert("Erro ao remover lista");
                }
            } catch (error) {
                console.error("Erro ao remover lista:", error);
                alert("Erro ao remover lista");
            }
        }
    };

    const testScheduleNow = async () => {
        if (scheduledMessages.length === 0) {
            alert("Crie pelo menos um agendamento primeiro");
            return;
        }

        const schedule = scheduledMessages[0];

        try {
            const response = await fetch(`${API_BASE_URL}/test-schedule`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: schedule.message,
                    contacts: schedule.contactList,
                    priority: schedule.priority,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                alert("Teste executado! Verificar logs para detalhes.");
            } else {
                alert(`Erro no teste: ${result.error}`);
            }
        } catch (error) {
            console.error("Erro no teste:", error);
            alert("Erro ao executar teste");
        }
    };

    const forceScheduleExecution = async (scheduleId) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/schedule/${scheduleId}/execute`,
                {
                    method: "POST",
                }
            );

            const result = await response.json();

            if (response.ok) {
                alert("Agendamento executado manualmente! Verificar logs.");
                loadLogs();
            } else {
                alert(`Erro: ${result.error}`);
            }
        } catch (error) {
            console.error("Erro ao executar agendamento:", error);
            alert("Erro ao executar agendamento");
        }
    };

    const simulateTimeExecution = async () => {
        const time = prompt("Digite a hora para simular (formato HH:MM):");
        if (!time || !/^\d{2}:\d{2}$/.test(time)) {
            alert("Formato de hora inválido. Use HH:MM");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/simulate-time`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ time }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(
                    `Simulação para ${time} concluída! Verificar logs para detalhes.`
                );
                loadLogs();
            } else {
                alert(`Erro na simulação: ${result.error}`);
            }
        } catch (error) {
            console.error("Erro na simulação:", error);
            alert("Erro na simulação de tempo");
        }
    };

    const toggleSchedule = async (id) => {
        const schedule = scheduledMessages.find((s) => s.id === id);
        if (!schedule) return;

        try {
            const response = await fetch(`${API_BASE_URL}/schedule/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    enabled: !schedule.enabled,
                }),
            });

            if (response.ok) {
                loadScheduledMessages();
            } else {
                alert("Erro ao atualizar agendamento");
            }
        } catch (error) {
            console.error("Erro ao atualizar agendamento:", error);
            alert("Erro ao atualizar agendamento");
        }
    };

    const getStatusColor = () => {
        switch (status.status) {
            case "ready":
                return "#28a745";
            case "qr_received":
                return "#ffc107";
            case "authenticated":
                return "#28a745";
            case "auth_failure":
                return "#dc3545";
            default:
                return "#6c757d";
        }
    };

    const getStatusText = () => {
        switch (status.status) {
            case "ready":
                return "Conectado e Pronto";
            case "qr_received":
                return "QR Code Disponível - Escaneie!";
            case "authenticated":
                return "Autenticado";
            case "auth_failure":
                return "Falha na Autenticação";
            default:
                return "Desconectado";
        }
    };

    const getStatusIcon = () => {
        switch (status.status) {
            case "ready":
                return "✅";
            case "qr_received":
                return "📱";
            case "authenticated":
                return "🔐";
            case "auth_failure":
                return "❌";
            default:
                return "⚫";
        }
    };

    const getLogColor = (type) => {
        switch (type) {
            case "success":
                return "#28a745";
            case "error":
                return "#dc3545";
            case "warning":
                return "#ffc107";
            case "info":
            default:
                return "#007bff";
        }
    };

    const getLogIcon = (type) => {
        switch (type) {
            case "success":
                return "✅";
            case "error":
                return "❌";
            case "warning":
                return "⚠️";
            case "info":
            default:
                return "ℹ️";
        }
    };

    const styles = {
        container: {
            minHeight: '100vh',
            backgroundColor: '#f8f9fa',
            padding: '20px',
            overflowY: 'auto',
            maxHeight: '100vh'
        },
        header: {
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '30px',
            marginBottom: '30px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center',
            border: '1px solid #e9ecef'
        },
        title: {
            color: '#343a40',
            fontSize: '2.5rem',
            fontWeight: '600',
            marginBottom: '10px',
            fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
        },
        subtitle: {
            color: '#6c757d',
            fontSize: '1.1rem',
            marginBottom: '0'
        },
        navTabs: {
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '8px',
            marginBottom: '30px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            gap: '8px',
            border: '1px solid #e9ecef'
        },
        tab: {
            flex: 1,
            padding: '15px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'all 0.3s ease',
            color: '#6c757d'
        },
        activeTab: {
            backgroundColor: '#007bff',
            color: '#fff',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,123,255,0.3)'
        },
        content: {
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '30px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: '1px solid #e9ecef',
            marginBottom: '20px'
        },
        statusCard: {
            background: `linear-gradient(135deg, ${getStatusColor()}15, ${getStatusColor()}05)`,
            padding: '25px',
            borderRadius: '12px',
            marginBottom: '30px',
            border: `2px solid ${getStatusColor()}`,
            textAlign: 'center'
        },
        statusIcon: {
            fontSize: '3rem',
            marginBottom: '15px',
            display: 'block'
        },
        statusText: {
            fontSize: '1.5rem',
            fontWeight: '600',
            color: getStatusColor(),
            marginBottom: '10px'
        },
        statusSubtext: {
            color: '#6c757d',
            fontSize: '1rem'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '30px',
            marginBottom: '30px'
        },
        card: {
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '25px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: '1px solid #e9ecef'
        },
        cardTitle: {
            fontSize: '1.4rem',
            fontWeight: '600',
            color: '#343a40',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        formGroup: {
            marginBottom: '20px'
        },
        label: {
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#495057',
            fontSize: '0.95rem'
        },
        input: {
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e9ecef',
            borderRadius: '8px',
            fontSize: '16px',
            transition: 'border-color 0.3s ease',
            fontFamily: 'inherit'
        },
        inputFocus: {
            borderColor: '#007bff',
            boxShadow: '0 0 0 3px rgba(0,123,255,0.1)'
        },
        textarea: {
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e9ecef',
            borderRadius: '8px',
            fontSize: '16px',
            minHeight: '120px',
            resize: 'vertical',
            transition: 'border-color 0.3s ease',
            fontFamily: 'inherit'
        },
        select: {
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e9ecef',
            borderRadius: '8px',
            fontSize: '16px',
            backgroundColor: '#fff',
            transition: 'border-color 0.3s ease'
        },
        button: {
            backgroundColor: '#007bff',
            color: '#fff',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
        },
        buttonHover: {
            backgroundColor: '#0056b3',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,123,255,0.3)'
        },
        buttonSuccess: {
            backgroundColor: '#28a745'
        },
        buttonDanger: {
            backgroundColor: '#dc3545'
        },
        buttonWarning: {
            backgroundColor: '#ffc107',
            color: '#212529'
        },
        buttonSecondary: {
            backgroundColor: '#6c757d'
        },
        buttonDisabled: {
            backgroundColor: '#e9ecef',
            color: '#6c757d',
            cursor: 'not-allowed'
        },
        buttonGroup: {
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
        },
        qrContainer: {
            backgroundColor: '#fff',
            padding: '30px',
            borderRadius: '12px',
            marginBottom: '30px',
            textAlign: 'center',
            border: '2px solid #ffc107',
            boxShadow: '0 4px 20px rgba(255,193,7,0.2)'
        },
        qrCode: {
            maxWidth: '280px',
            margin: '20px auto',
            display: 'block',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        },
        listItem: {
            backgroundColor: '#f8f9fa',
            padding: '20px',
            marginBottom: '15px',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'all 0.3s ease'
        },
        listItemHover: {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)'
        },
        listContent: {
            flex: 1
        },
        listTitle: {
            fontWeight: '600',
            color: '#343a40',
            fontSize: '1.1rem',
            marginBottom: '8px'
        },
        listMeta: {
            color: '#6c757d',
            fontSize: '0.9rem',
            marginBottom: '4px'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
        },
        statCard: {
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #e9ecef',
            transition: 'all 0.3s ease'
        },
        statNumber: {
            fontSize: '2rem',
            fontWeight: '700',
            color: '#343a40',
            marginBottom: '8px'
        },
        statLabel: {
            color: '#6c757d',
            fontSize: '0.9rem',
            fontWeight: '500'
        },
        logsContainer: {
            maxHeight: '500px',
            overflowY: 'auto',
            border: '1px solid #e9ecef',
            borderRadius: '12px',
            padding: '15px',
            backgroundColor: '#f8f9fa'
        },
        logItem: {
            padding: '15px',
            marginBottom: '12px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            borderLeft: '4px solid #007bff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        },
        logHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
        },
        logType: {
            fontWeight: '600',
            fontSize: '0.85rem',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: '#e9ecef'
        },
        logTime: {
            fontSize: '0.8rem',
            color: '#6c757d'
        },
        logMessage: {
            fontSize: '0.9rem',
            lineHeight: '1.4',
            color: '#495057'
        },
        userInfoCard: {
            background: 'linear-gradient(135deg, #28a74515, #28a74505)',
            padding: '25px',
            borderRadius: '12px',
            marginBottom: '30px',
            border: '2px solid #28a745'
        },
        userAvatar: {
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            margin: '0 auto 15px',
            display: 'block'
        },
        helpBox: {
            backgroundColor: '#e3f2fd',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '30px',
            border: '1px solid #bbdefb'
        },
        helpTitle: {
            color: '#1976d2',
            fontWeight: '600',
            marginBottom: '15px',
            fontSize: '1.2rem'
        },
        helpList: {
            color: '#424242',
            lineHeight: '1.6'
        }
    };

    const renderConnectionTab = () => (
        <div>
            {/* Status Card */}
            <div style={styles.statusCard}>
                <span style={styles.statusIcon}>{getStatusIcon()}</span>
                <div style={styles.statusText}>{getStatusText()}</div>
                <div style={styles.statusSubtext}>Status: {status.status}</div>
            </div>

            {/* Help Box */}
            <div style={styles.helpBox}>
                <h3 style={styles.helpTitle}>📋 Como conectar o WhatsApp Web</h3>
                <ol style={styles.helpList}>
                    <li>Clique em "Conectar WhatsApp Web"</li>
                    <li>Aguarde o QR Code aparecer</li>
                    <li>Abra o WhatsApp no seu telemóvel</li>
                    <li>Vá em Definições → Dispositivos conectados → Conectar dispositivo</li>
                    <li>Escaneie o QR Code</li>
                    <li>Aguarde a confirmação de conexão</li>
                </ol>
            </div>

            {/* Connection Controls */}
            <div style={{ ...styles.card, textAlign: 'center', marginBottom: '30px' }}>
                <div style={styles.buttonGroup}>
                    {!status.isReady ? (
                        <>
                            <button
                                onClick={handleConnect}
                                style={{
                                    ...styles.button,
                                    ...(loading ? styles.buttonDisabled : {}),
                                }}
                                disabled={loading}
                            >
                                {loading ? "🔄 Conectando..." : "🔗 Conectar WhatsApp Web"}
                            </button>
                            <button
                                onClick={async () => {
                                    if (confirm("Isso irá limpar completamente qualquer sessão existente. Continuar?")) {
                                        setLoading(true);
                                        try {
                                            const response = await fetch(`${API_BASE_URL}/clear-session`, {
                                                method: "POST",
                                            });

                                            if (response.ok) {
                                                alert("Sessão limpa! Agora pode conectar com qualquer conta.");
                                                setTimeout(() => handleConnect(), 1000);
                                            } else {
                                                alert("Erro ao limpar sessão");
                                            }
                                        } catch (error) {
                                            alert("Erro ao limpar sessão");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }
                                }}
                                style={{
                                    ...styles.button,
                                    ...styles.buttonWarning,
                                    ...(loading ? styles.buttonDisabled : {}),
                                }}
                                disabled={loading}
                            >
                                🗑️ Limpar Sessão
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleDisconnect}
                            style={{
                                ...styles.button,
                                ...styles.buttonDanger,
                                ...(loading ? styles.buttonDisabled : {}),
                            }}
                            disabled={loading}
                        >
                            {loading ? "🔄 Desconectando..." : "🔌 Desconectar"}
                        </button>
                    )}
                </div>
            </div>

            {/* QR Code */}
            {(status.status === "qr_received" || status.hasQrCode || status.qrCode) && (
                <div style={styles.qrContainer}>
                    <h3 style={styles.cardTitle}>📱 Escaneie o QR Code</h3>
                    {status.qrCode ? (
                        <div>
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(status.qrCode)}`}
                                alt="QR Code WhatsApp"
                                style={styles.qrCode}
                            />
                            <p style={{ color: '#ffc107', fontWeight: '600' }}>
                                ⏱️ Aguardando escaneamento...
                            </p>
                            <p style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                                O QR Code é atualizado automaticamente
                            </p>
                        </div>
                    ) : (
                        <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px' }}>
                            <p>⚠️ QR Code não disponível</p>
                            <button onClick={checkStatus} style={styles.button}>
                                🔄 Tentar Novamente
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* User Info */}
            {status.isReady && userInfo && (
                <div style={styles.userInfoCard}>
                    <h3 style={styles.cardTitle}>👤 Conta Conectada</h3>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>📱 Nome:</strong> {userInfo.pushname || "Utilizador WhatsApp"}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>🔢 Número:</strong> {userInfo.formattedNumber || userInfo.wid || "Não disponível"}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>💻 Plataforma:</strong> {userInfo.platform || "WhatsApp Web"}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={handleChangeAccount}
                            style={{
                                ...styles.button,
                                ...styles.buttonWarning,
                            }}
                            disabled={loading}
                        >
                            🔄 Trocar Conta
                        </button>
                    </div>
                </div>
            )}

            {/* Test Message */}
            {status.isReady && (
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>📤 Enviar Mensagem de Teste</h3>
                    <form onSubmit={handleTestMessage}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Número de Destino *</label>
                            <input
                                type="tel"
                                style={styles.input}
                                value={testMessage.to}
                                onChange={(e) =>
                                    setTestMessage({
                                        ...testMessage,
                                        to: e.target.value,
                                    })
                                }
                                placeholder="351912345678 (com código do país)"
                                required
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Mensagem *</label>
                            <textarea
                                style={styles.textarea}
                                value={testMessage.message}
                                onChange={(e) =>
                                    setTestMessage({
                                        ...testMessage,
                                        message: e.target.value,
                                    })
                                }
                                placeholder="Digite sua mensagem aqui..."
                                required
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Prioridade</label>
                            <select
                                style={styles.select}
                                value={testMessage.priority}
                                onChange={(e) =>
                                    setTestMessage({
                                        ...testMessage,
                                        priority: e.target.value,
                                    })
                                }
                            >
                                <option value="normal">Normal</option>
                                <option value="info">Informação</option>
                                <option value="warning">Aviso</option>
                                <option value="urgent">Urgente</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            style={{
                                ...styles.button,
                                ...styles.buttonSuccess,
                                width: '100%',
                                ...(loading ? styles.buttonDisabled : {}),
                            }}
                            disabled={loading}
                        >
                            {loading ? "📤 Enviando..." : "📤 Enviar Mensagem"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );

    const renderContactsTab = () => (
        <div style={styles.grid}>
            {/* Create Contact List */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>👥 Criar Lista de Contactos</h3>
                <form onSubmit={handleCreateContactList}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Nome da Lista *</label>
                        <input
                            type="text"
                            style={styles.input}
                            value={newContactList.name}
                            onChange={(e) =>
                                setNewContactList({
                                    ...newContactList,
                                    name: e.target.value,
                                })
                            }
                            placeholder="Ex: Clientes VIP, Equipa Vendas..."
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Contactos (um por linha) *</label>
                        <textarea
                            style={styles.textarea}
                            value={newContactList.contacts}
                            onChange={(e) =>
                                setNewContactList({
                                    ...newContactList,
                                    contacts: e.target.value,
                                })
                            }
                            placeholder="351912345678&#10;351923456789&#10;351934567890"
                            required
                        />
                        <small style={{ color: '#6c757d', fontSize: '0.85rem' }}>
                            Insira um número por linha, com código do país (ex: 351912345678)
                        </small>
                    </div>

                    <button
                        type="submit"
                        style={{
                            ...styles.button,
                            ...styles.buttonSuccess,
                            width: '100%'
                        }}
                    >
                        ✅ Criar Lista
                    </button>
                </form>
            </div>

            {/* Contact Lists */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📋 Listas de Contactos ({contactLists.length})</h3>
                {contactLists.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
                        Nenhuma lista de contactos criada ainda.
                    </p>
                ) : (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {contactLists.map((list) => (
                            <div key={list.id} style={styles.listItem}>
                                <div style={styles.listContent}>
                                    <div style={styles.listTitle}>{list.name}</div>
                                    <div style={styles.listMeta}>
                                        👥 {list.contacts.length} contactos
                                    </div>
                                    <div style={styles.listMeta}>
                                        📅 {new Date(list.createdAt).toLocaleDateString('pt-PT')}
                                    </div>
                                </div>
                                <div style={styles.buttonGroup}>
                                    <button
                                        onClick={() =>
                                            alert(`Contactos:\n${list.contacts.join("\n")}`)
                                        }
                                        style={{
                                            ...styles.button,
                                            padding: '8px 12px',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        👁️ Ver
                                    </button>
                                    <button
                                        onClick={() => deleteContactList(list.id)}
                                        style={{
                                            ...styles.button,
                                            ...styles.buttonDanger,
                                            padding: '8px 12px',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderScheduleTab = () => (
        <div style={styles.grid}>
            {/* Create Schedule */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>⏰ Agendar Mensagens</h3>
                <form onSubmit={handleCreateSchedule}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Mensagem *</label>
                        <textarea
                            style={styles.textarea}
                            value={newSchedule.message}
                            onChange={(e) =>
                                setNewSchedule({
                                    ...newSchedule,
                                    message: e.target.value,
                                })
                            }
                            placeholder="Digite a mensagem a ser enviada..."
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Lista de Contactos *</label>
                        <select
                            style={styles.select}
                            value={selectedContactList}
                            onChange={(e) => {
                                setSelectedContactList(e.target.value);
                                const list = contactLists.find(
                                    (l) => l.id.toString() === e.target.value
                                );
                                const formattedContacts = list
                                    ? list.contacts.map((phone) => ({
                                        name: `Contacto ${phone.slice(-4)}`,
                                        phone: phone,
                                    }))
                                    : [];
                                setNewSchedule({
                                    ...newSchedule,
                                    contactList: formattedContacts,
                                });
                            }}
                            required
                        >
                            <option value="">Selecione uma lista...</option>
                            {contactLists.map((list) => (
                                <option key={list.id} value={list.id}>
                                    {list.name} ({list.contacts.length} contactos)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Frequência</label>
                        <select
                            style={styles.select}
                            value={newSchedule.frequency}
                            onChange={(e) =>
                                setNewSchedule({
                                    ...newSchedule,
                                    frequency: e.target.value,
                                    days: [],
                                })
                            }
                        >
                            <option value="daily">Diariamente</option>
                            <option value="custom">Dias Específicos</option>
                            <option value="weekly">Semanalmente</option>
                            <option value="monthly">Mensalmente</option>
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Hora</label>
                        <input
                            type="time"
                            style={styles.input}
                            value={newSchedule.time}
                            onChange={(e) =>
                                setNewSchedule({
                                    ...newSchedule,
                                    time: e.target.value,
                                })
                            }
                        />
                    </div>

                    {(newSchedule.frequency === "weekly" || newSchedule.frequency === "custom") && (
                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                {newSchedule.frequency === "weekly" ? "Dias da Semana" : "Dias Específicos"}
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map((day, index) => (
                                    <label
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '8px 12px',
                                            backgroundColor: newSchedule.days.includes(index + 1) ? '#007bff' : '#f8f9fa',
                                            color: newSchedule.days.includes(index + 1) ? '#fff' : '#495057',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            style={{ marginRight: '8px' }}
                                            checked={newSchedule.days.includes(index + 1)}
                                            onChange={(e) => {
                                                const days = [...newSchedule.days];
                                                if (e.target.checked) {
                                                    days.push(index + 1);
                                                } else {
                                                    const i = days.indexOf(index + 1);
                                                    if (i > -1) days.splice(i, 1);
                                                }
                                                setNewSchedule({
                                                    ...newSchedule,
                                                    days,
                                                });
                                            }}
                                        />
                                        {day}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Data de Início (opcional)</label>
                        <input
                            type="date"
                            style={styles.input}
                            value={newSchedule.startDate}
                            onChange={(e) =>
                                setNewSchedule({
                                    ...newSchedule,
                                    startDate: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Prioridade</label>
                        <select
                            style={styles.select}
                            value={newSchedule.priority}
                            onChange={(e) =>
                                setNewSchedule({
                                    ...newSchedule,
                                    priority: e.target.value,
                                })
                            }
                        >
                            <option value="normal">Normal</option>
                            <option value="info">Informação</option>
                            <option value="warning">Aviso</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        style={{
                            ...styles.button,
                            ...styles.buttonSuccess,
                            width: '100%'
                        }}
                    >
                        ⏰ Agendar Mensagens
                    </button>
                </form>
            </div>

            {/* Scheduled Messages */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📅 Mensagens Agendadas ({scheduledMessages.length})</h3>

                {/* Test Tools */}
                <div style={{
                    backgroundColor: '#e3f2fd',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #bbdefb'
                }}>
                    <h4 style={{ color: '#1976d2', marginBottom: '15px' }}>🧪 Ferramentas de Teste</h4>
                    <div style={styles.buttonGroup}>
                        <button
                            onClick={testScheduleNow}
                            style={{
                                ...styles.button,
                                fontSize: '0.85rem',
                                padding: '8px 12px'
                            }}
                        >
                            🚀 Testar
                        </button>
                        <button
                            onClick={simulateTimeExecution}
                            style={{
                                ...styles.button,
                                fontSize: '0.85rem',
                                padding: '8px 12px'
                            }}
                        >
                            ⏰ Simular Hora
                        </button>
                        <button
                            onClick={() => loadScheduledMessages()}
                            style={{
                                ...styles.button,
                                fontSize: '0.85rem',
                                padding: '8px 12px'
                            }}
                        >
                            🔄 Atualizar
                        </button>
                    </div>
                </div>

                {scheduledMessages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
                        Nenhuma mensagem agendada ainda.
                    </p>
                ) : (
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {scheduledMessages.map((schedule) => (
                            <div key={schedule.id} style={styles.listItem}>
                                <div style={styles.listContent}>
                                    <div style={styles.listTitle}>
                                        {schedule.message.substring(0, 50)}...
                                    </div>
                                    <div style={styles.listMeta}>
                                        🔄 {schedule.frequency === "daily" ? "Diária" :
                                            schedule.frequency === "weekly" ? "Semanal" :
                                                schedule.frequency === "custom" ? "Dias Específicos" : "Mensal"} às {schedule.time}
                                    </div>
                                    <div style={styles.listMeta}>
                                        👥 {schedule.contactList.length} contactos
                                    </div>
                                    <div style={styles.listMeta}>
                                        {schedule.enabled ? "✅ Ativo" : "⏸️ Pausado"}
                                    </div>
                                </div>
                                <div style={styles.buttonGroup}>
                                    <button
                                        onClick={() => forceScheduleExecution(schedule.id)}
                                        style={{
                                            ...styles.button,
                                            padding: '6px 10px',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        ▶️ Executar
                                    </button>
                                    <button
                                        onClick={() => toggleSchedule(schedule.id)}
                                        style={{
                                            ...styles.button,
                                            ...(schedule.enabled ? styles.buttonWarning : styles.buttonSuccess),
                                            padding: '6px 10px',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        {schedule.enabled ? "⏸️ Pausar" : "▶️ Ativar"}
                                    </button>
                                    <button
                                        onClick={() => deleteSchedule(schedule.id)}
                                        style={{
                                            ...styles.button,
                                            ...styles.buttonDanger,
                                            padding: '6px 10px',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderLogsTab = () => (
        <div>
            {/* Stats Cards */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{stats.totalSchedules || 0}</div>
                    <div style={styles.statLabel}>📅 Total Agendamentos</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{stats.activeSchedules || 0}</div>
                    <div style={styles.statLabel}>🟢 Ativos</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{stats.totalLogs || 0}</div>
                    <div style={styles.statLabel}>📝 Total Logs</div>
                </div>
                {stats.logsByType && (
                    <div style={styles.statCard}>
                        <div style={styles.statNumber}>{stats.logsByType.error || 0}</div>
                        <div style={styles.statLabel}>❌ Erros</div>
                    </div>
                )}
            </div>

            <div style={styles.grid}>
                {/* Log Filters */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>🔍 Filtros de Logs</h3>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Agendamento</label>
                        <select
                            style={styles.select}
                            value={logFilter.scheduleId}
                            onChange={(e) =>
                                setLogFilter({
                                    ...logFilter,
                                    scheduleId: e.target.value,
                                })
                            }
                        >
                            <option value="">Todos os agendamentos</option>
                            {scheduledMessages.map((schedule) => (
                                <option key={schedule.id} value={schedule.id}>
                                    {schedule.message.substring(0, 30)}...
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Tipo</label>
                        <select
                            style={styles.select}
                            value={logFilter.type}
                            onChange={(e) =>
                                setLogFilter({
                                    ...logFilter,
                                    type: e.target.value,
                                })
                            }
                        >
                            <option value="">Todos os tipos</option>
                            <option value="info">ℹ️ Informação</option>
                            <option value="success">✅ Sucesso</option>
                            <option value="warning">⚠️ Aviso</option>
                            <option value="error">❌ Erro</option>
                        </select>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Limite</label>
                        <select
                            style={styles.select}
                            value={logFilter.limit}
                            onChange={(e) =>
                                setLogFilter({
                                    ...logFilter,
                                    limit: parseInt(e.target.value),
                                })
                            }
                        >
                            <option value={50}>50 logs</option>
                            <option value={100}>100 logs</option>
                            <option value={200}>200 logs</option>
                            <option value={500}>500 logs</option>
                        </select>
                    </div>

                    <div style={styles.buttonGroup}>
                        <button
                            onClick={loadLogs}
                            style={styles.button}
                        >
                            🔄 Atualizar
                        </button>
                        <button
                            onClick={() => clearLogs()}
                            style={{
                                ...styles.button,
                                ...styles.buttonDanger,
                            }}
                        >
                            🗑️ Limpar Todos
                        </button>
                    </div>
                </div>

                {/* Type Stats */}
                {stats.logsByType && (
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>📊 Estatísticas por Tipo</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div style={{ ...styles.statCard, backgroundColor: '#e3f2fd' }}>
                                <div style={{ ...styles.statNumber, fontSize: '1.5rem' }}>{stats.logsByType.info || 0}</div>
                                <div style={styles.statLabel}>ℹ️ Info</div>
                            </div>
                            <div style={{ ...styles.statCard, backgroundColor: '#e8f5e8' }}>
                                <div style={{ ...styles.statNumber, fontSize: '1.5rem' }}>{stats.logsByType.success || 0}</div>
                                <div style={styles.statLabel}>✅ Sucesso</div>
                            </div>
                            <div style={{ ...styles.statCard, backgroundColor: '#fff3e0' }}>
                                <div style={{ ...styles.statNumber, fontSize: '1.5rem' }}>{stats.logsByType.warning || 0}</div>
                                <div style={styles.statLabel}>⚠️ Avisos</div>
                            </div>
                            <div style={{ ...styles.statCard, backgroundColor: '#ffebee' }}>
                                <div style={{ ...styles.statNumber, fontSize: '1.5rem' }}>{stats.logsByType.error || 0}</div>
                                <div style={styles.statLabel}>❌ Erros</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Logs List */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📋 Logs dos Agendamentos ({logs.length})</h3>
                <div style={styles.logsContainer}>
                    {logs.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
                            Nenhum log encontrado.
                        </p>
                    ) : (
                        logs.map((log) => (
                            <div
                                key={log.id}
                                style={{
                                    ...styles.logItem,
                                    borderLeft: `4px solid ${getLogColor(log.type)}`,
                                }}
                            >
                                <div style={styles.logHeader}>
                                    <span style={{
                                        ...styles.logType,
                                        backgroundColor: getLogColor(log.type),
                                        color: '#fff'
                                    }}>
                                        {getLogIcon(log.type)} {log.type.toUpperCase()}
                                    </span>
                                    <span style={styles.logTime}>
                                        {new Date(log.timestamp).toLocaleString('pt-PT')}
                                    </span>
                                </div>
                                <div style={styles.logMessage}>
                                    {log.message}
                                </div>
                                {log.details && (
                                    <details style={{ marginTop: '10px' }}>
                                        <summary style={{ cursor: 'pointer', color: '#007bff' }}>
                                            Ver detalhes
                                        </summary>
                                        <pre style={{
                                            background: '#f8f9fa',
                                            padding: '10px',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            overflow: 'auto',
                                            maxHeight: '200px',
                                            marginTop: '8px'
                                        }}>
                                            {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div style={{
            ...styles.container,
            // Custom scrollbar styles
            scrollbarWidth: 'thin',
            scrollbarColor: '#c1c1c1 #f1f1f1'
        }}
            className="custom-scroll"
        >
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>WhatsApp Web API</h1>
                <p style={styles.subtitle}>
                    Sistema completo de gestão de mensagens WhatsApp
                </p>
            </div>

            {/* Navigation Tabs */}
            <div style={styles.navTabs}>
                {[
                    { id: 'connection', icon: '🔗', label: 'Conexão' },
                    { id: 'contacts', icon: '👥', label: 'Contactos' },
                    { id: 'schedule', icon: '⏰', label: 'Agendamento' },
                    { id: 'logs', icon: '📋', label: 'Logs' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        style={{
                            ...styles.tab,
                            ...(activeTab === tab.id ? styles.activeTab : {})
                        }}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={styles.content}>
                {activeTab === "connection" && renderConnectionTab()}
                {activeTab === "contacts" && renderContactsTab()}
                {activeTab === "schedule" && renderScheduleTab()}
                {activeTab === "logs" && renderLogsTab()}
            </div>
        </div>
    );
};

export default WhatsAppWebConfig;
