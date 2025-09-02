import React, { useState, useEffect } from "react";
import ConnectionTab from "./components/ConnectionTab";
import ContactsTab from "./components/ContactsTab";
import ScheduleTab from "./components/ScheduleTab";
import ExternosTab from "./components/ExternosTab";
import LogsTab from "./components/LogsTab";
import useWhatsAppData from "./hooks/useWhatsAppData";
import { getWhatsAppStyles } from "./styles/whatsAppStyles";

const WhatsAppWebConfig = () => {
    // API base URL
    const API_BASE_URL = "http://51.254.116.237:7001/api/whatsapp";
    // Estados principais
    const [activeTab, setActiveTab] = useState("connection");
    const [testMessage, setTestMessage] = useState({
        to: "",
        message: "",
        priority: "normal",
    });

    // Estados para agendamento
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

    // Estados para gestão de contactos individuais
    const [newContactList, setNewContactList] = useState({
        name: "",
        contacts: [
            {
                phone: "",
                numeroTecnico: "",
                numeroCliente: "",
                canCreateTickets: false,
                canRegisterPonto: false,
                userID: "",
            },
        ],
    });
    const [selectedContactList, setSelectedContactList] = useState("");
    const [editingContactList, setEditingContactList] = useState(null);

    // Estados para gestão de externos
    const [novoExternoContacto, setNovoExternoContacto] = useState({
        externoId: "",
        telefone: "",
        autorizaEntradaObra: false,
        obraAutorizada: "",
        dataAutorizacaoInicio: "",
        dataAutorizacaoFim: "",
    });

    // Estados para logs
    const [logFilter, setLogFilter] = useState({
        scheduleId: "",
        type: "",
        limit: 50,
    });

    // Hook customizado para dados
    const {
        status,
        loading,
        setLoading,
        scheduledMessages,
        setScheduledMessages,
        contactLists,
        setContactLists,
        contactListsLoaded,
        externosDisponiveis,
        obrasDisponiveis,
        externosContactos,
        setExternosContactos,
        logs,
        stats,
        userInfo,
        setUserInfo,
        checkStatus,
        loadScheduledMessages,
        loadContactLists,
        loadLogs,
        loadStats,
        loadUserInfo,
    } = useWhatsAppData(API_BASE_URL, activeTab);

    // Estilos
    const styles = getWhatsAppStyles();

    // Add custom scrollbar styles for webkit browsers
    useEffect(() => {
        const style = document.createElement("style");
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
        // Load initial data when the component mounts or activeTab changes
        checkStatus();
        loadScheduledMessages();
        loadContactLists();
        loadStats();
        loadUserInfo(); // Load user info initially
        if (activeTab === "externos") {
            // Assuming these functions are available within useWhatsAppData or globally imported
            // For now, they are not explicitly passed to the hook, so we'll keep them here if needed
            // Or they should be handled within useWhatsAppData
        }
        if (activeTab === "logs") {
            loadLogs(logFilter);
        }

        // Set up interval for periodic updates
        const interval = setInterval(() => {
            checkStatus();
            loadUserInfo();
            if (activeTab === "logs") {
                loadLogs(logFilter);
                loadStats();
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [activeTab, logFilter]); // Re-run effect if activeTab or logFilter changes

    // Connection handlers
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
                "Tem certeza que deseja trocar de conta WhatsApp? Isso irá limpar completamente a sessão atual.",
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
                    },
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
                                },
                            );

                            if (connectResponse.ok) {
                                alert(
                                    "Sessão limpa! Aguarde o novo QR Code aparecer para conectar com uma conta diferente.",
                                );
                                setUserInfo(null);
                                checkStatus();
                            } else {
                                alert("Erro ao iniciar nova conexão");
                            }
                        } catch (error) {
                            console.error(
                                "Erro ao conectar após limpeza:",
                                error,
                            );
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

    const handleQuickChangeAccount = async () => {
        if (
            confirm(
                "Deseja trocar para um número WhatsApp diferente? O processo será automático."
            )
        ) {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/change-account`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Troca iniciada! Aguarde o QR Code aparecer para escanear com o novo número.");
                    setUserInfo(null);
                    checkStatus();
                } else {
                    alert(`Erro: ${data.error}`);
                }
            } catch (error) {
                console.error("Erro ao trocar conta:", error);
                alert("Erro ao trocar conta WhatsApp");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleForceReconnect = async () => {
        if (
            confirm(
                "Forçar reconexão do WhatsApp Web? Isso irá verificar e corrigir problemas de sincronização."
            )
        ) {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/force-reconnect`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Reconexão forçada iniciada! Aguarde alguns segundos e verifique o status.");
                    setTimeout(() => {
                        checkStatus();
                        loadUserInfo();
                    }, 3000);
                } else {
                    alert(`Erro: ${data.error}`);
                }
            } catch (error) {
                console.error("Erro ao forçar reconexão:", error);
                alert("Erro ao forçar reconexão WhatsApp");
            } finally {
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

    // Contact list handlers
    const addNewContact = () => {
        setNewContactList((prev) => ({
            ...prev,
            contacts: [
                ...prev.contacts,
                {
                    phone: "",
                    numeroTecnico: "",
                    numeroCliente: "",
                    canCreateTickets: false,
                    canRegisterPonto: false,
                    userID: "",
                },
            ],
        }));
    };

    const removeContact = (index) => {
        if (newContactList.contacts.length > 1) {
            setNewContactList((prev) => ({
                ...prev,
                contacts: prev.contacts.filter((_, i) => i !== index),
            }));
        }
    };

    const updateContact = (index, field, value) => {
        setNewContactList((prev) => ({
            ...prev,
            contacts: prev.contacts.map((contact, i) =>
                i === index ? { ...contact, [field]: value } : contact,
            ),
        }));
    };

    const handleCreateContactList = async (e) => {
        e.preventDefault();
        if (!newContactList.name || newContactList.contacts.length === 0) {
            alert("Nome da lista e pelo menos um contacto são obrigatórios");
            return;
        }

        const validContacts = newContactList.contacts.filter(
            (contact) => contact.phone && contact.phone.trim().length > 0,
        );

        if (validContacts.length === 0) {
            alert("Adicione pelo menos um contacto com número válido");
            return;
        }

        const processedContacts = validContacts.map((contact) => ({
            phone: contact.phone.replace(/\D/g, ""),
            numeroTecnico: contact.numeroTecnico,
            numeroCliente: contact.numeroCliente,
            canCreateTickets: contact.canCreateTickets,
            canRegisterPonto: contact.canRegisterPonto,
            user_id: contact.userID || contact.user_id || null
        }));

        try {
            const response = await fetch(`${API_BASE_URL}/contact-lists`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: newContactList.name,
                    contacts: processedContacts.map((c) => c.phone),
                    canCreateTickets: processedContacts.some(
                        (c) => c.canCreateTickets,
                    ),
                    canRegisterPonto: processedContacts.some(
                        (c) => c.canRegisterPonto,
                    ),
                    numeroTecnico:
                        processedContacts.find((c) => c.numeroTecnico)
                            ?.numeroTecnico || "",
                    numeroCliente:
                        processedContacts.find((c) => c.numeroCliente)
                            ?.numeroCliente || "",
                    individualContacts: processedContacts,
                }),
            });

            if (response.ok) {
                setNewContactList({
                    name: "",
                    contacts: [
                        {
                            phone: "",
                            numeroTecnico: "",
                            numeroCliente: "",
                            canCreateTickets: false,
                            canRegisterPonto: false,
                            userID: "",
                        },
                    ],
                });
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

    const handleEditContactList = async (listToUpdate) => {
        const processedContacts = listToUpdate.contacts.map((contact) => {
            if (typeof contact === "object" && contact.phone) {
                return {
                    phone: contact.phone,
                    numeroTecnico: contact.numeroTecnico || "",
                    numeroCliente: contact.numeroCliente || "",
                    canCreateTickets: contact.canCreateTickets || false,
                    canRegisterPonto: contact.canRegisterPonto || false,
                    user_id: contact.userID || contact.user_id || null
                };
            }
            return {
                phone: contact,
                numeroTecnico: "",
                numeroCliente: "",
                canCreateTickets: false,
                canRegisterPonto: false,
                user_id: null
            };
        });

        const formattedList = {
            id: listToUpdate.id,
            name: listToUpdate.name,
            contacts: processedContacts.map((c) => c.phone),
            canCreateTickets: processedContacts.some((c) => c.canCreateTickets),
            canRegisterPonto: processedContacts.some((c) => c.canRegisterPonto),
            numeroTecnico:
                processedContacts.find((c) => c.numeroTecnico)?.numeroTecnico ||
                "",
            numeroCliente:
                processedContacts.find((c) => c.numeroCliente)?.numeroCliente ||
                "",
            individualContacts: processedContacts,
        };

        try {
            const response = await fetch(
                `${API_BASE_URL}/contact-lists/${formattedList.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: editingContactList.name,
                        contacts: editingContactList.contacts.map((c) =>
                            typeof c === "string" ? c : c.phone,
                        ),
                        canCreateTickets: editingContactList.contacts.some(
                            (c) =>
                                typeof c === "object" ? c.canCreateTickets : false,
                        ),
                        canRegisterPonto: editingContactList.contacts.some(
                            (c) =>
                                typeof c === "object" ? c.canRegisterPonto : false,
                        ),
                        numeroTecnico:
                            editingContactList.contacts.find(
                                (c) =>
                                    typeof c === "object" && c.numeroTecnico,
                            )?.numeroTecnico || "",
                        numeroCliente:
                            editingContactList.contacts.find(
                                (c) =>
                                    typeof c === "object" && c.numeroCliente,
                            )?.numeroCliente || "",
                        individualContacts: editingContactList.contacts.map(contact => ({
                            ...contact,
                            user_id: contact.userID || contact.user_id || null // Map userID to user_id
                        })),
                    }),
                },
            );

            if (response.ok) {
                loadContactLists();
                setEditingContactList(null);
                alert("Lista atualizada com sucesso!");
            } else {
                const error = await response.json();
                alert(`Erro ao atualizar lista: ${error.error}`);
            }
        } catch (error) {
            console.error("Erro ao atualizar lista:", error);
            alert("Erro ao atualizar lista");
        }
    };

    const cancelEditingContactList = () => {
        setEditingContactList(null);
    };

    const startEditingContactList = (list) => {
        let editContacts;
        if (
            Array.isArray(list.contacts) &&
            list.contacts.length > 0 &&
            typeof list.contacts[0] === "object"
        ) {
            editContacts = list.contacts;
        } else {
            const phones = Array.isArray(list.contacts)
                ? list.contacts
                : typeof list.contacts === "string"
                    ? JSON.parse(list.contacts)
                    : [];
            editContacts = phones.map((phone) => ({
                phone: phone,
                numeroTecnico: list.numeroTecnico || "",
                numeroCliente: list.numeroCliente || "",
                canCreateTickets: list.canCreateTickets || false,
                canRegisterPonto: list.canRegisterPonto || false,
                user_id: list.userID || list.user_id || null // Ensure user_id is also considered if present in original list structure
            }));
        }

        setEditingContactList({
            ...list,
            contacts: editContacts,
        });
    };

    const addEditContact = () => {
        setEditingContactList((prev) => ({
            ...prev,
            contacts: [
                ...prev.contacts,
                {
                    phone: "",
                    numeroTecnico: "",
                    numeroCliente: "",
                    canCreateTickets: false,
                    canRegisterPonto: false,
                    userID: "",
                    user_id: null
                },
            ],
        }));
    };

    const removeEditContact = (index) => {
        if (editingContactList.contacts.length > 1) {
            setEditingContactList((prev) => ({
                ...prev,
                contacts: prev.contacts.filter((_, i) => i !== index),
            }));
        }
    };

    const updateEditContact = (index, field, value) => {
        setEditingContactList((prev) => ({
            ...prev,
            contacts: prev.contacts.map((contact, i) =>
                i === index ? { ...contact, [field]: value } : contact,
            ),
        }));
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
                    },
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

    // Schedule handlers
    const handleCreateSchedule = async (e) => {
        e.preventDefault();
        if (!newSchedule.message || newSchedule.contactList.length === 0) {
            alert("Mensagem e lista de contactos são obrigatórios");
            return;
        }

        try {
            const scheduleWithTimezone = {
                ...newSchedule,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timezoneOffset: new Date().getTimezoneOffset(),
            };

            const response = await fetch(`${API_BASE_URL}/schedule`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(scheduleWithTimezone),
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
                },
            );

            const result = await response.json();

            if (response.ok) {
                alert("Agendamento executado manualmente! Verificar logs.");
                loadLogs(logFilter);
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
                    `Simulação para ${time} concluída! Verificar logs para detalhes.`,
                );
                loadLogs(logFilter);
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

    // Externos handlers
    const handleCreateExternoContacto = async (e) => {
        e.preventDefault();

        if (!novoExternoContacto.externoId || !novoExternoContacto.telefone) {
            alert("Externo e telefone são obrigatórios");
            return;
        }

        const existe = externosContactos.find(
            (ec) => ec.externoId === novoExternoContacto.externoId,
        );
        if (existe) {
            alert("Já existe um contacto para este externo");
            return;
        }

        const externoSelecionado = externosDisponiveis.find(
            (ext) => ext.id.toString() === novoExternoContacto.externoId,
        );

        const novoContacto = {
            ...novoExternoContacto,
            id: Date.now(),
            externoNome: externoSelecionado
                ? externoSelecionado.funcionario
                : "",
            externoEmpresa: externoSelecionado
                ? externoSelecionado.empresa
                : "",
        };

        const novosContactos = [...externosContactos, novoContacto];
        setExternosContactos(novosContactos);

        localStorage.setItem(
            "externosContactos",
            JSON.stringify(novosContactos),
        );

        setNovoExternoContacto({
            externoId: "",
            telefone: "",
            autorizaEntradaObra: false,
            obraAutorizada: "",
            dataAutorizacaoInicio: "",
            dataAutorizacaoFim: "",
        });

        alert("Contacto externo adicionado com sucesso!");
    };

    const deleteExternoContacto = (id) => {
        if (confirm("Tem certeza que deseja eliminar este contacto externo?")) {
            const novosContactos = externosContactos.filter(
                (ec) => ec.id !== id,
            );
            setExternosContactos(novosContactos);
            localStorage.setItem(
                "externosContactos",
                JSON.stringify(novosContactos),
            );
        }
    };

    // Logs handlers
    const clearLogs = async (scheduleId = null) => {
        try {
            const url = scheduleId
                ? `${API_BASE_URL}/logs?scheduleId=${scheduleId}`
                : `${API_BASE_URL}/logs`;

            await fetch(url, { method: "DELETE" });
            loadLogs(logFilter);
            loadStats();
            alert("Logs removidos com sucesso!");
        } catch (error) {
            console.error("Erro ao remover logs:", error);
            alert("Erro ao remover logs");
        }
    };

    // Render functions for each tab
    const renderConnectionTab = () => (
        <ConnectionTab
            status={status}
            loading={loading}
            userInfo={userInfo}
            testMessage={testMessage}
            setTestMessage={setTestMessage}
            handleConnect={handleConnect}
            handleDisconnect={handleDisconnect}
            handleChangeAccount={handleChangeAccount}
            handleQuickChangeAccount={handleQuickChangeAccount}
            handleForceReconnect={handleForceReconnect}
            handleTestMessage={handleTestMessage}
            checkStatus={checkStatus}
            API_BASE_URL={API_BASE_URL}
            styles={styles}
        />
    );

    const renderContactsTab = () => (
        <ContactsTab
            newContactList={newContactList}
            setNewContactList={setNewContactList}
            contactLists={contactLists}
            contactListsLoaded={contactListsLoaded}
            editingContactList={editingContactList}
            setEditingContactList={setEditingContactList}
            handleCreateContactList={handleCreateContactList}
            handleEditContactList={handleEditContactList}
            cancelEditingContactList={cancelEditingContactList}
            startEditingContactList={startEditingContactList}
            deleteContactList={deleteContactList}
            addNewContact={addNewContact}
            removeContact={removeContact}
            updateContact={updateContact}
            addEditContact={addEditContact}
            removeEditContact={removeEditContact}
            updateEditContact={updateEditContact}
            styles={styles}
        />
    );

    const renderScheduleTab = () => (
        <ScheduleTab
            newSchedule={newSchedule}
            setNewSchedule={setNewSchedule}
            scheduledMessages={scheduledMessages}
            contactLists={contactLists}
            selectedContactList={selectedContactList}
            setSelectedContactList={setSelectedContactList}
            handleCreateSchedule={handleCreateSchedule}
            deleteSchedule={deleteSchedule}
            testScheduleNow={testScheduleNow}
            forceScheduleExecution={forceScheduleExecution}
            simulateTimeExecution={simulateTimeExecution}
            toggleSchedule={toggleSchedule}
            loadScheduledMessages={loadScheduledMessages}
            styles={styles}
        />
    );

    const renderExternosTab = () => (
        <ExternosTab
            novoExternoContacto={novoExternoContacto}
            setNovoExternoContacto={setNovoExternoContacto}
            externosDisponiveis={externosDisponiveis}
            obrasDisponiveis={obrasDisponiveis}
            externosContactos={externosContactos}
            setExternosContactos={setExternosContactos} // Ensure this is passed if needed by the component
            handleCreateExternoContacto={handleCreateExternoContacto}
            deleteExternoContacto={deleteExternoContacto}
            styles={styles}
        />
    );

    const renderLogsTab = () => (
        <LogsTab
            logs={logs}
            stats={stats}
            logFilter={logFilter}
            setLogFilter={setLogFilter}
            scheduledMessages={scheduledMessages}
            loadLogs={loadLogs}
            clearLogs={clearLogs}
            styles={styles}
        />
    );

    return (
        <div
            style={{
                ...styles.container,
                scrollbarWidth: "thin",
                scrollbarColor: "#c1c1c1 #f1f1f1",
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
                    { id: "connection", icon: "🔗", label: "Conexão" },
                    { id: "contacts", icon: "👥", label: "Contactos" },
                    { id: "schedule", icon: "⏰", label: "Agendamento" },
                    { id: "externos", icon: "🏗️", label: "Externos" },
                    { id: "logs", icon: "📋", label: "Logs" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        style={{
                            ...styles.tab,
                            ...(activeTab === tab.id ? styles.activeTab : {}),
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
                {activeTab === "externos" && renderExternosTab()}
                {activeTab === "logs" && renderLogsTab()}
            </div>
        </div>
    );
};

export default WhatsAppWebConfig;