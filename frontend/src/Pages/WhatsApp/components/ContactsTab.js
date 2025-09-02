import React, { useState, useEffect } from "react";

// Assuming API_BASE_URL is defined elsewhere, e.g., in a config file
const API_BASE_URL = "https://backend.advir.pt/api/whatsapp";
const empresaId = localStorage.getItem("empresa_id");
const ContactsTab = ({
    newContactList,
    setNewContactList,
    contactLists,
    setContactLists, // Added setContactLists prop
    contactListsLoaded,
    editingContactList,
    setEditingContactList,
    handleCreateContactList,
    handleEditContactList,
    cancelEditingContactList,
    startEditingContactList,
    deleteContactList,
    addNewContact,
    removeContact,
    updateContact,
    addEditContact,
    removeEditContact,
    updateEditContact,
    styles,
}) => {
    const [users, setUsers] = useState([]);
    const [obras, setObras] = useState([]);
    // Assume these functions are defined elsewhere or passed as props,
    // but for the sake of completeness, let's mock them if they are missing context.
    // If these are indeed passed via props, this is fine.
    // If they are meant to be defined here, they would need proper implementation.
    const removeContactIfMissing = removeContact || (() => { });
    const updateContactIfMissing = updateContact || (() => { });
    const addNewContactIfMissing = addNewContact || (() => { });
    const removeEditContactIfMissing = removeEditContact || (() => { });
    const updateEditContactIfMissing = updateEditContact || (() => { });
    const addEditContactIfMissing = addEditContact || (() => { });

    const loadContactLists = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/contact-lists`);
            if (response.ok) {
                const data = await response.json();
                setContactLists(data.contactLists || []);
            }
        } catch (error) {
            console.error("Erro ao carregar listas:", error);
        }
    };

    const loadUsers = async () => {
        try {
            const token = localStorage.getItem("loginToken");
            const response = await fetch(
                `https://backend.advir.pt/api/users/usersByEmpresa?empresaId=${empresaId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                },
            );
            if (response.ok) {
                const data = await response.json();
                // Agrupar utilizadores únicos
                const uniqueUsers = data.reduce((acc, curr) => {
                    const existing = acc.find((u) => u.id === curr.id);
                    if (!existing) {
                        acc.push(curr);
                    }
                    return acc;
                }, []);
                setUsers(uniqueUsers || []);
            }
        } catch (error) {
            console.error("Erro ao carregar utilizadores:", error);
        }
    };

    const loadObras = async () => {
        try {
            const token = localStorage.getItem("loginToken");
            const response = await fetch(
                `https://backend.advir.pt/api/obra/por-empresa?empresa_id=${empresaId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                },
            );
            if (response.ok) {
                const data = await response.json();
                // Filtrar apenas obras ativas
                const obrasAtivas = data.filter(obra => obra.estado === 'Ativo');
                setObras(obrasAtivas || []);
            }
        } catch (error) {
            console.error("Erro ao carregar obras:", error);
        }
    };

    const [tecnicos, setTecnicos] = useState([]);
    const [clientes, setClientes] = useState([]);

    const loadTecnicos = async () => {
        try {
            const token = localStorage.getItem("painelAdminToken") || localStorage.getItem("loginToken");
            const urlempresa = localStorage.getItem("urlempresa");

            if (!token || !urlempresa) {
                console.error("Token ou URL da empresa não encontrados para técnicos");
                return;
            }

            console.log("Carregando técnicos...");
            const response = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/LstTecnicosTodos`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );

            console.log("Status resposta técnicos:", response.status);

            if (response.ok) {
                const data = await response.json();
                console.log("Dados dos técnicos recebidos:", JSON.stringify(data, null, 2));

                // Verificar diferentes estruturas possíveis dos dados
                let tecnicosData = [];
                if (data.DataSet && data.DataSet.Table && Array.isArray(data.DataSet.Table)) {
                    tecnicosData = data.DataSet.Table;
                } else if (Array.isArray(data)) {
                    tecnicosData = data;
                } else if (data.Table && Array.isArray(data.Table)) {
                    tecnicosData = data.Table;
                } else {
                    console.warn("Estrutura de dados inesperada para técnicos:", data);
                }

                setTecnicos(tecnicosData);
                console.log("Técnicos carregados:", tecnicosData.length, "itens");
            } else {
                const errorText = await response.text();
                console.error("Erro na resposta da API técnicos:", response.status, response.statusText);
                console.error("Corpo da resposta de erro técnicos:", errorText);
            }
        } catch (error) {
            console.error("Erro ao carregar técnicos:", error);
        }
    };

    const loadClientes = async () => {
        try {
            const token = localStorage.getItem("painelAdminToken") || localStorage.getItem("loginToken");
            const urlempresa = localStorage.getItem("urlempresa");

            if (!token || !urlempresa) {
                console.error("Token ou URL da empresa não encontrados para clientes");
                console.log("Token:", token ? "Presente" : "Ausente");
                console.log("URL Empresa:", urlempresa ? urlempresa : "Ausente");
                return;
            }

            console.log("Iniciando carregamento de clientes...");
            console.log("URL:", `https://webapiprimavera.advir.pt/routePedidos_STP/LstClientes`);

            const response = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/LstClientes`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );

            console.log("Status da resposta clientes:", response.status);

            if (response.ok) {
                const data = await response.json();
                console.log("Resposta completa clientes:", JSON.stringify(data, null, 2));

                // Tentar diferentes estruturas de dados
                let clientesData = [];

                // Estrutura mais comum: DataSet.Table
                if (data?.DataSet?.Table && Array.isArray(data.DataSet.Table)) {
                    clientesData = data.DataSet.Table;
                    console.log("Clientes carregados via DataSet.Table:", clientesData.length);
                }
                // Estrutura alternativa: data.Table
                else if (data?.Table && Array.isArray(data.Table)) {
                    clientesData = data.Table;
                    console.log("Clientes carregados via data.Table:", clientesData.length);
                }
                // Array direto
                else if (Array.isArray(data)) {
                    clientesData = data;
                    console.log("Clientes carregados via array direto:", clientesData.length);
                }
                // Tentar encontrar array em qualquer propriedade
                else if (data && typeof data === 'object') {
                    for (const [key, value] of Object.entries(data)) {
                        if (Array.isArray(value) && value.length > 0) {
                            // Verificar se parece ser uma lista de clientes
                            const firstItem = value[0];
                            if (firstItem && (firstItem.Cliente || firstItem.Nome || firstItem.cliente || firstItem.nome)) {
                                clientesData = value;
                                console.log(`Clientes encontrados em ${key}:`, clientesData.length);
                                break;
                            }
                        }
                    }
                }

                // Log dos primeiros clientes para debug
                if (clientesData.length > 0) {
                    console.log("Primeiro cliente exemplo:", clientesData[0]);
                    console.log("Propriedades do primeiro cliente:", Object.keys(clientesData[0]));
                } else {
                    console.warn("Nenhum cliente encontrado na resposta");
                }

                setClientes(clientesData);
            } else {
                const errorText = await response.text();
                console.error("Erro na resposta da API clientes:", response.status, response.statusText);
                console.error("Corpo da resposta de erro:", errorText);
                setClientes([]);
            }
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
            setClientes([]);
        }
    };

    useEffect(() => {
        loadContactLists();
        loadUsers();
        loadObras();
        loadTecnicos();
        loadClientes();
    }, []);

    // Function to save edited contacts
    const saveEditedContacts = async (contactListData) => {
        try {
            const token = localStorage.getItem("loginToken");

            // Preparar dados dos contactos individuais
            const contactsToSave = contactListData.contacts.map(contact => {
                const contactData = {
                    name: contactListData.name,
                    contacts: JSON.stringify([{
                        phone: contact.phone || contact,
                        numeroTecnico: contact.numeroTecnico || "",
                        numeroCliente: contact.numeroCliente || "",
                        canCreateTickets: contact.canCreateTickets || false,
                        canRegisterPonto: contact.canRegisterPonto || false,
                        userID: contact.userID || contact.user_id || "",
                        obrasAutorizadas: contact.obrasAutorizadas || [],
                        dataInicioAutorizacao: contact.dataInicioAutorizacao || "",
                        dataFimAutorizacao: contact.dataFimAutorizacao || ""
                    }]),
                    can_create_tickets: contact.canCreateTickets || false,
                    can_register_ponto: contact.canRegisterPonto || false,
                    numero_tecnico: contact.numeroTecnico || null,
                    numero_cliente: contact.numeroCliente || null,
                    user_id: contact.userID || contact.user_id || null,
                    // Adicionar os novos campos específicos
                    obrasAutorizadas: contact.obrasAutorizadas || [],
                    dataInicioAutorizacao: contact.dataInicioAutorizacao || null,
                    dataFimAutorizacao: contact.dataFimAutorizacao || null
                };

                return contactData;
            });

            // Salvar cada contacto individualmente
            for (const contactData of contactsToSave) {
                const response = await fetch(`https://backend.advir.pt/api/whatsapp/contacts`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(contactData)
                });

                if (!response.ok) {
                    throw new Error(`Erro ao salvar contacto: ${response.statusText}`);
                }
            }

            console.log('Contactos salvos com sucesso');

        } catch (error) {
            console.error('Erro ao salvar contactos editados:', error);
            throw error;
        }
    };


    return (
        <div style={styles.grid}>
            {/* Create Contact List */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>👥 Criar Lista de Contactos</h3>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    // Preparar dados para salvar no novo formato
                    const contactsForSaving = {
                        ...newContactList,
                        contacts: newContactList.contacts.map(contact => ({
                            ...contact,
                            obrasAutorizadas: contact.obrasAutorizadas || [],
                            dataInicioAutorizacao: contact.dataInicioAutorizacao || null,
                            dataFimAutorizacao: contact.dataFimAutorizacao || null
                        }))
                    };

                    await saveEditedContacts(contactsForSaving);
                    await loadContactLists(); // Recarregar listas após criar
                    setNewContactList({ name: "", contacts: [{ phone: "" }] }); // Limpar formulário
                }}>
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
                        <label style={styles.label}>Contactos</label>
                        {newContactList.contacts.map((contact, index) => (
                            <div key={index} style={styles.contactItem}>
                                <div style={styles.contactItemHeader}>
                                    <span style={{ fontWeight: "600" }}>
                                        Contacto #{index + 1}
                                    </span>
                                    {newContactList.contacts.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeContactIfMissing(index)
                                            }
                                            style={{
                                                ...styles.button,
                                                ...styles.buttonDanger,
                                                ...styles.smallButton,
                                            }}
                                        >
                                            🗑️ Remover
                                        </button>
                                    )}
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        Número de Telefone *
                                    </label>
                                    <input
                                        type="tel"
                                        style={styles.input}
                                        value={contact.phone}
                                        onChange={(e) =>
                                            updateContactIfMissing(
                                                index,
                                                "phone",
                                                e.target.value,
                                            )
                                        }
                                        placeholder="351912345678"
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label
                                        style={{
                                            ...styles.label,
                                            display: "flex",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            padding: "12px 16px",
                                            backgroundColor:
                                                contact.canCreateTickets
                                                    ? "#e3f2fd"
                                                    : "#f8f9fa",
                                            borderRadius: "8px",
                                            border: `2px solid ${contact.canCreateTickets ? "#007bff" : "#e9ecef"}`,
                                            transition: "all 0.3s ease",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={contact.canCreateTickets}
                                            onChange={(e) =>
                                                updateContactIfMissing(
                                                    index,
                                                    "canCreateTickets",
                                                    e.target.checked,
                                                )
                                            }
                                            style={{
                                                marginRight: "12px",
                                                transform: "scale(1.2)",
                                            }}
                                        />
                                        <div>
                                            <span
                                                style={{
                                                    fontWeight: "600",
                                                    color: "#343a40",
                                                }}
                                            >
                                                🎫 Autorizar criação de pedidos
                                            </span>
                                            <div
                                                style={{
                                                    fontSize: "0.85rem",
                                                    color: "#6c757d",
                                                    marginTop: "4px",
                                                }}
                                            >
                                                Este contacto pode criar pedidos
                                                via WhatsApp
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                {contact.canCreateTickets && (
                                    <>
                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>
                                                Selecionar Técnico (opcional)
                                            </label>
                                            <select
                                                style={styles.input}
                                                value={contact.numeroTecnico || ""}
                                                onChange={(e) =>
                                                    updateContactIfMissing(
                                                        index,
                                                        "numeroTecnico",
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">Selecione um técnico...</option>
                                                {tecnicos.map((tecnico) => (
                                                    <option key={tecnico.Tecnico} value={tecnico.Tecnico}>
                                                        {tecnico.Tecnico} - {tecnico.Nome}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>
                                                Selecionar Cliente (opcional)
                                            </label>
                                            <select
                                                style={styles.input}
                                                value={contact.numeroCliente || ""}
                                                onChange={(e) =>
                                                    updateContactIfMissing(
                                                        index,
                                                        "numeroCliente",
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">Selecione um cliente...</option>
                                                {clientes.map((cliente, index) => {
                                                    const clienteId = cliente.Cliente || cliente.cliente || cliente.id || cliente.codigo || index;
                                                    const clienteNome = cliente.Nome || cliente.nome || cliente.name || cliente.descricao || "Nome não disponível";
                                                    return (
                                                        <option key={clienteId} value={clienteId}>
                                                            {clienteId} - {clienteNome}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div style={styles.formGroup}>
                                    <label
                                        style={{
                                            ...styles.label,
                                            display: "flex",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            padding: "12px 16px",
                                            backgroundColor:
                                                contact.canRegisterPonto
                                                    ? "#e8f5e8"
                                                    : "#f8f9fa",
                                            borderRadius: "8px",
                                            border: `2px solid ${contact.canRegisterPonto ? "#28a745" : "#e9ecef"}`,
                                            transition: "all 0.3s ease",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={contact.canRegisterPonto}
                                            onChange={(e) =>
                                                updateContactIfMissing(
                                                    index,
                                                    "canRegisterPonto",
                                                    e.target.checked,
                                                )
                                            }
                                            style={{
                                                marginRight: "12px",
                                                transform: "scale(1.2)",
                                            }}
                                        />
                                        <div>
                                            <span
                                                style={{
                                                    fontWeight: "600",
                                                    color: "#343a40",
                                                }}
                                            >
                                                ⏰ Autorizar registo de ponto
                                            </span>
                                            <div
                                                style={{
                                                    fontSize: "0.85rem",
                                                    color: "#6c757d",
                                                    marginTop: "4px",
                                                }}
                                            >
                                                Este contacto pode registar
                                                entrada/saída via WhatsApp
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                {contact.canRegisterPonto && (
                                    <>
                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>
                                                Selecionar Utilizador (opcional)
                                            </label>
                                            <select
                                                style={styles.input}
                                                value={contact.userID || ""}
                                                onChange={(e) =>
                                                    updateContactIfMissing(
                                                        index,
                                                        "userID",
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">Selecione um utilizador...</option>
                                                {users.map((user) => (
                                                    <option key={user.id} value={user.id.toString()}>
                                                        {user.nome} ({user.email})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>
                                                Obras Autorizadas (opcional)
                                            </label>
                                            <div style={{
                                                ...styles.input,
                                                height: "auto",
                                                maxHeight: "200px",
                                                overflowY: "auto",
                                                padding: "12px",
                                                backgroundColor: "#f8f9fa"
                                            }}>
                                                <div style={{
                                                    marginBottom: "8px",
                                                    padding: "8px",
                                                    backgroundColor: "white",
                                                    borderRadius: "4px",
                                                    border: "1px solid #e9ecef"
                                                }}>
                                                    <label style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        cursor: "pointer",
                                                        fontWeight: "600",
                                                        color: "#495057"
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!contact.obrasAutorizadas || contact.obrasAutorizadas.length === 0}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    updateContactIfMissing(
                                                                        index,
                                                                        "obrasAutorizadas",
                                                                        []
                                                                    );
                                                                }
                                                            }}
                                                            style={{
                                                                marginRight: "8px",
                                                                transform: "scale(1.1)"
                                                            }}
                                                        />
                                                        🏗️ Todas as obras
                                                    </label>
                                                </div>
                                                {obras.map((obra) => (
                                                    <div key={obra.id} style={{
                                                        marginBottom: "4px",
                                                        padding: "6px",
                                                        backgroundColor: "white",
                                                        borderRadius: "4px",
                                                        border: "1px solid #e9ecef"
                                                    }}>
                                                        <label style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            cursor: "pointer",
                                                            fontSize: "0.9rem"
                                                        }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={(contact.obrasAutorizadas || []).includes(obra.id.toString())}
                                                                onChange={(e) => {
                                                                    const currentObras = contact.obrasAutorizadas || [];
                                                                    let newObras;
                                                                    if (e.target.checked) {
                                                                        newObras = [...currentObras, obra.id.toString()];
                                                                    } else {
                                                                        newObras = currentObras.filter(id => id !== obra.id.toString());
                                                                    }
                                                                    updateContactIfMissing(
                                                                        index,
                                                                        "obrasAutorizadas",
                                                                        newObras
                                                                    );
                                                                }}
                                                                style={{
                                                                    marginRight: "8px",
                                                                    transform: "scale(1.1)"
                                                                }}
                                                            />
                                                            <span style={{
                                                                fontWeight: "500",
                                                                color: "#343a40"
                                                            }}>
                                                                {obra.codigo}
                                                            </span>
                                                            <span style={{
                                                                marginLeft: "4px",
                                                                color: "#6c757d"
                                                            }}>
                                                                - {obra.nome}
                                                            </span>
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                            <small
                                                style={{
                                                    color: "#6c757d",
                                                    marginTop: "4px",
                                                    display: "block",
                                                }}
                                            >
                                                Selecione as obras específicas ou escolha "Todas as obras"
                                            </small>
                                        </div>

                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>
                                                Data Início Autorização
                                                (opcional)
                                            </label>
                                            <input
                                                type="date"
                                                style={styles.input}
                                                value={
                                                    contact.dataInicioAutorizacao ||
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    updateContactIfMissing(
                                                        index,
                                                        "dataInicioAutorizacao",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>

                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>
                                                Data Fim Autorização (opcional)
                                            </label>
                                            <input
                                                type="date"
                                                style={styles.input}
                                                value={
                                                    contact.dataFimAutorizacao ||
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    updateContactIfMissing(
                                                        index,
                                                        "dataFimAutorizacao",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addNewContactIfMissing}
                            style={{
                                ...styles.button,
                                ...styles.buttonSecondary,
                                width: "100%",
                                marginTop: "10px",
                            }}
                        >
                            ➕ Adicionar Contacto
                        </button>
                    </div>

                    <button
                        type="submit"
                        style={{
                            ...styles.button,
                            ...styles.buttonSuccess,
                            width: "100%",
                        }}
                    >
                        ✅ Criar Lista
                    </button>
                </form>
            </div>

            {/* Contact Lists */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>
                    📋 Listas de Contactos (
                    {Array.isArray(contactLists) ? contactLists.length : 0})
                </h3>
                {!contactListsLoaded ? (
                    <p
                        style={{
                            textAlign: "center",
                            color: "#6c757d",
                            padding: "20px",
                        }}
                    >
                        Carregando listas de contactos...
                    </p>
                ) : !Array.isArray(contactLists) ||
                    contactLists.length === 0 ? (
                    <p
                        style={{
                            textAlign: "center",
                            color: "#6c757d",
                            padding: "20px",
                        }}
                    >
                        Nenhuma lista de contactos criada ainda.
                    </p>
                ) : (
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        {Array.isArray(contactLists) &&
                            contactLists.map((list) => {
                                const hasAuthorizedContacts =
                                    list.contacts &&
                                    (Array.isArray(list.contacts)
                                        ? list.contacts.some((c) =>
                                            typeof c === "object"
                                                ? c.canCreateTickets
                                                : false,
                                        )
                                        : list.canCreateTickets);

                                const contactCount = Array.isArray(
                                    list.contacts,
                                )
                                    ? list.contacts.length
                                    : typeof list.contacts === "string"
                                        ? JSON.parse(list.contacts).length
                                        : 0;

                                return (
                                    <div
                                        key={list.id}
                                        style={{
                                            ...styles.listItem,
                                            border: `2px solid ${hasAuthorizedContacts ? "#28a745" : "#e9ecef"}`,
                                            backgroundColor:
                                                hasAuthorizedContacts
                                                    ? "#f8fff8"
                                                    : styles.listItem
                                                        .backgroundColor,
                                        }}
                                    >
                                        <div style={styles.listContent}>
                                            <div style={styles.listTitle}>
                                                {hasAuthorizedContacts && (
                                                    <span
                                                        style={{
                                                            color: "#28a745",
                                                            marginRight: "8px",
                                                        }}
                                                    >
                                                        🎫
                                                    </span>
                                                )}
                                                {list.name}
                                            </div>
                                            <div style={styles.listMeta}>
                                                👥 {contactCount} contactos
                                            </div>
                                            <div style={styles.listMeta}>
                                                📅{" "}
                                                {new Date(
                                                    list.createdAt,
                                                ).toLocaleDateString("pt-PT")}
                                            </div>
                                            <div
                                                style={{
                                                    ...styles.listMeta,
                                                    color: hasAuthorizedContacts
                                                        ? "#28a745"
                                                        : "#dc3545",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                {hasAuthorizedContacts
                                                    ? "✅ Alguns contactos podem criar pedidos"
                                                    : "❌ Sem contactos autorizados"}
                                            </div>
                                        </div>
                                        <div style={styles.buttonGroup}>
                                            <button
                                                onClick={() => {
                                                    let displayText = `Lista: ${list.name}\n\nContactos:\n`;
                                                    if (
                                                        Array.isArray(
                                                            list.contacts,
                                                        ) &&
                                                        list.contacts.length >
                                                        0 &&
                                                        typeof list
                                                            .contacts[0] ===
                                                        "object"
                                                    ) {
                                                        list.contacts.forEach(
                                                            (
                                                                contact,
                                                                index,
                                                            ) => {
                                                                displayText += `\n${index + 1}. ${contact.phone}`;
                                                                if (
                                                                    contact.numeroTecnico
                                                                )
                                                                    displayText += `\n   Técnico: ${contact.numeroTecnico}`;
                                                                if (
                                                                    contact.numeroCliente
                                                                )
                                                                    displayText += `\n   Cliente: ${contact.numeroCliente}`;
                                                                if (
                                                                    contact.userID
                                                                )
                                                                    displayText += `\n   Utilizador ID: ${contact.userID}`;
                                                                displayText += `\n   Pode criar pedidos: ${contact.canCreateTickets ? "Sim" : "Não"}`;
                                                                displayText +=
                                                                    "\n";
                                                            },
                                                        );
                                                    } else {
                                                        const phones =
                                                            Array.isArray(
                                                                list.contacts,
                                                            )
                                                                ? list.contacts
                                                                : typeof list.contacts ===
                                                                    "string"
                                                                    ? JSON.parse(
                                                                        list.contacts,
                                                                    )
                                                                    : [];
                                                        phones.forEach(
                                                            (phone, index) => {
                                                                displayText += `${index + 1}. ${phone}\n`;
                                                            },
                                                        );
                                                        if (list.numeroTecnico)
                                                            displayText += `\nTécnico geral: ${list.numeroTecnico}`;
                                                        if (list.numeroCliente)
                                                            displayText += `\nCliente geral: ${list.numeroCliente}`;
                                                        if (list.userID)
                                                            displayText += `\nID de Utilizador geral: ${list.userID}`;
                                                        displayText += `\nTodos podem criar pedidos: ${list.canCreateTickets ? "Sim" : "Não"}`;
                                                    }
                                                    alert(displayText);
                                                }}
                                                style={{
                                                    ...styles.button,
                                                    padding: "8px 12px",
                                                    fontSize: "0.85rem",
                                                }}
                                            >
                                                👁️ Ver
                                            </button>
                                            <button
                                                onClick={() =>
                                                    startEditingContactList(
                                                        list,
                                                    )
                                                }
                                                style={{
                                                    ...styles.button,
                                                    ...styles.buttonWarning,
                                                    padding: "8px 12px",
                                                    fontSize: "0.85rem",
                                                }}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                onClick={() =>
                                                    deleteContactList(list.id)
                                                }
                                                style={{
                                                    ...styles.button,
                                                    ...styles.buttonDanger,
                                                    padding: "8px 12px",
                                                    fontSize: "0.85rem",
                                                }}
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>

            {/* Modal de Edição */}
            {editingContactList && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#fff",
                            borderRadius: "12px",
                            padding: "30px",
                            maxWidth: "800px",
                            width: "90%",
                            maxHeight: "80vh",
                            overflowY: "auto",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                        }}
                    >
                        <h3 style={styles.cardTitle}>
                            ✏️ Editar Lista de Contactos
                        </h3>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                // Preparar dados para salvar no novo formato
                                const contactsForSaving = {
                                    ...editingContactList,
                                    contacts: editingContactList.contacts.map(contact => ({
                                        ...contact,
                                        obrasAutorizadas: contact.obrasAutorizadas || [],
                                        dataInicioAutorizacao: contact.dataInicioAutorizacao || null,
                                        dataFimAutorizacao: contact.dataFimAutorizacao || null
                                    }))
                                };
                                handleEditContactList(contactsForSaving);
                            }}
                        >
                            <div style={styles.formGroup}>
                                <label style={styles.label}>
                                    Nome da Lista *
                                </label>
                                <input
                                    type="text"
                                    style={styles.input}
                                    value={editingContactList.name}
                                    onChange={(e) =>
                                        setEditingContactList({
                                            ...editingContactList,
                                            name: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Contactos</label>
                                {editingContactList.contacts.map(
                                    (contact, index) => (
                                        <div
                                            key={index}
                                            style={styles.contactItem}
                                        >
                                            <div
                                                style={styles.contactItemHeader}
                                            >
                                                <span
                                                    style={{
                                                        fontWeight: "600",
                                                    }}
                                                >
                                                    Contacto #{index + 1}
                                                </span>
                                                {editingContactList.contacts
                                                    .length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeEditContactIfMissing(
                                                                    index,
                                                                )
                                                            }
                                                            style={{
                                                                ...styles.button,
                                                                ...styles.buttonDanger,
                                                                ...styles.smallButton,
                                                            }}
                                                        >
                                                            🗑️ Remover
                                                        </button>
                                                    )}
                                            </div>

                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>
                                                    Número de Telefone *
                                                </label>
                                                <input
                                                    type="tel"
                                                    style={styles.input}
                                                    value={
                                                        contact.phone || contact
                                                    }
                                                    onChange={(e) =>
                                                        updateEditContactIfMissing(
                                                            index,
                                                            "phone",
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="351912345678"
                                                    required
                                                />
                                            </div>

                                            <div style={styles.formGroup}>
                                                <label
                                                    style={{
                                                        ...styles.label,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        cursor: "pointer",
                                                        padding: "12px 16px",
                                                        backgroundColor:
                                                            contact.canCreateTickets
                                                                ? "#e3f2fd"
                                                                : "#f8f9fa",
                                                        borderRadius: "8px",
                                                        border: `2px solid ${contact.canCreateTickets ? "#007bff" : "#e9ecef"}`,
                                                        transition:
                                                            "all 0.3s ease",
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            contact.canCreateTickets ||
                                                            false
                                                        }
                                                        onChange={(e) =>
                                                            updateEditContactIfMissing(
                                                                index,
                                                                "canCreateTickets",
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        style={{
                                                            marginRight: "12px",
                                                            transform:
                                                                "scale(1.2)",
                                                        }}
                                                    />
                                                    <div>
                                                        <span
                                                            style={{
                                                                fontWeight:
                                                                    "600",
                                                                color: "#343a40",
                                                            }}
                                                        >
                                                            🎫 Autorizar criação
                                                            de pedidos
                                                        </span>
                                                        <div
                                                            style={{
                                                                fontSize:
                                                                    "0.85rem",
                                                                color: "#6c757d",
                                                                marginTop:
                                                                    "4px",
                                                            }}
                                                        >
                                                            Este contacto pode
                                                            criar pedidos via
                                                            WhatsApp
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>

                                            {contact.canCreateTickets && (
                                                <>
                                                    <div
                                                        style={styles.formGroup}
                                                    >
                                                        <label
                                                            style={styles.label}
                                                        >
                                                            Selecionar Técnico
                                                            (opcional)
                                                        </label>
                                                        <select
                                                            style={styles.input}
                                                            value={
                                                                contact.numeroTecnico ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                updateEditContactIfMissing(
                                                                    index,
                                                                    "numeroTecnico",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        >
                                                            <option value="">Selecione um técnico...</option>
                                                            {tecnicos.map((tecnico) => (
                                                                <option key={tecnico.Tecnico} value={tecnico.Tecnico}>
                                                                    {tecnico.Tecnico} - {tecnico.Nome}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div
                                                        style={styles.formGroup}
                                                    >
                                                        <label
                                                            style={styles.label}
                                                        >
                                                            Selecionar Cliente
                                                            (opcional)
                                                        </label>
                                                        <select
                                                            style={styles.input}
                                                            value={
                                                                contact.numeroCliente ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                updateEditContactIfMissing(
                                                                    index,
                                                                    "numeroCliente",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        >
                                                            <option value="">Selecione um cliente...</option>
                                                            {clientes.map((cliente, index) => {
                                                                const clienteId = cliente.Cliente || cliente.cliente || cliente.id || cliente.codigo || index;
                                                                const clienteNome = cliente.Nome || cliente.nome || cliente.name || cliente.descricao || "Nome não disponível";
                                                                return (
                                                                    <option key={clienteId} value={clienteId}>
                                                                        {clienteId} - {clienteNome}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                </>
                                            )}

                                            <div style={styles.formGroup}>
                                                <label
                                                    style={{
                                                        ...styles.label,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        cursor: "pointer",
                                                        padding: "12px 16px",
                                                        backgroundColor:
                                                            contact.canRegisterPonto
                                                                ? "#e8f5e8"
                                                                : "#f8f9fa",
                                                        borderRadius: "8px",
                                                        border: `2px solid ${contact.canRegisterPonto ? "#28a745" : "#e9ecef"}`,
                                                        transition:
                                                            "all 0.3s ease",
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            contact.canRegisterPonto ||
                                                            false
                                                        }
                                                        onChange={(e) =>
                                                            updateEditContactIfMissing(
                                                                index,
                                                                "canRegisterPonto",
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        style={{
                                                            marginRight: "12px",
                                                            transform:
                                                                "scale(1.2)",
                                                        }}
                                                    />
                                                    <div>
                                                        <span
                                                            style={{
                                                                fontWeight:
                                                                    "600",
                                                                color: "#343a40",
                                                            }}
                                                        >
                                                            ⏰ Autorizar registo
                                                            de ponto
                                                        </span>
                                                        <div
                                                            style={{
                                                                fontSize:
                                                                    "0.85rem",
                                                                color: "#6c757d",
                                                                marginTop:
                                                                    "4px",
                                                            }}
                                                        >
                                                            Este contacto pode
                                                            registar
                                                            entrada/saída via
                                                            WhatsApp
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>

                                            {contact.canRegisterPonto && (
                                                <>
                                                    <div
                                                        style={styles.formGroup}
                                                    >
                                                        <label
                                                            style={styles.label}
                                                        >
                                                            Selecionar Utilizador
                                                            (opcional)
                                                        </label>
                                                        <select
                                                            style={styles.input}
                                                            value={
                                                                contact.userID ||
                                                                contact.user_id ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                updateEditContactIfMissing(
                                                                    index,
                                                                    "userID",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        >
                                                            <option value="">Selecione um utilizador...</option>
                                                            {users.map((user) => (
                                                                <option key={user.id} value={user.id.toString()}>
                                                                    {user.nome} ({user.email})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div
                                                        style={styles.formGroup}
                                                    >
                                                        <label
                                                            style={styles.label}
                                                        >
                                                            Obras Autorizadas
                                                            (opcional)
                                                        </label>
                                                        <div style={{
                                                            ...styles.input,
                                                            height: "auto",
                                                            maxHeight: "200px",
                                                            overflowY: "auto",
                                                            padding: "12px",
                                                            backgroundColor: "#f8f9fa"
                                                        }}>
                                                            <div style={{
                                                                marginBottom: "8px",
                                                                padding: "8px",
                                                                backgroundColor: "white",
                                                                borderRadius: "4px",
                                                                border: "1px solid #e9ecef"
                                                            }}>
                                                                <label style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    cursor: "pointer",
                                                                    fontWeight: "600",
                                                                    color: "#495057"
                                                                }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!contact.obrasAutorizadas || contact.obrasAutorizadas.length === 0}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                updateEditContactIfMissing(
                                                                                    index,
                                                                                    "obrasAutorizadas",
                                                                                    []
                                                                                );
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            marginRight: "8px",
                                                                            transform: "scale(1.1)"
                                                                        }}
                                                                    />
                                                                    🏗️ Todas as obras
                                                                </label>
                                                            </div>
                                                            {obras.map((obra) => (
                                                                <div key={obra.id} style={{
                                                                    marginBottom: "4px",
                                                                    padding: "6px",
                                                                    backgroundColor: "white",
                                                                    borderRadius: "4px",
                                                                    border: "1px solid #e9ecef"
                                                                }}>
                                                                    <label style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        cursor: "pointer",
                                                                        fontSize: "0.9rem"
                                                                    }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={(contact.obrasAutorizadas || []).includes(obra.id.toString())}
                                                                            onChange={(e) => {
                                                                                const currentObras = contact.obrasAutorizadas || [];
                                                                                let newObras;
                                                                                if (e.target.checked) {
                                                                                    newObras = [...currentObras, obra.id.toString()];
                                                                                } else {
                                                                                    newObras = currentObras.filter(id => id !== obra.id.toString());
                                                                                }
                                                                                updateEditContactIfMissing(
                                                                                    index,
                                                                                    "obrasAutorizadas",
                                                                                    newObras
                                                                                );
                                                                            }}
                                                                            style={{
                                                                                marginRight: "8px",
                                                                                transform: "scale(1.1)"
                                                                            }}
                                                                        />
                                                                        <span style={{
                                                                            fontWeight: "500",
                                                                            color: "#343a40"
                                                                        }}>
                                                                            {obra.codigo}
                                                                        </span>
                                                                        <span style={{
                                                                            marginLeft: "4px",
                                                                            color: "#6c757d"
                                                                        }}>
                                                                            - {obra.nome}
                                                                        </span>
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <small
                                                            style={{
                                                                color: "#6c757d",
                                                                marginTop: "4px",
                                                                display: "block",
                                                            }}
                                                        >
                                                            Selecione as obras específicas ou escolha "Todas as obras"
                                                        </small>
                                                    </div>

                                                    <div
                                                        style={styles.formGroup}
                                                    >
                                                        <label
                                                            style={styles.label}
                                                        >
                                                            Data Início
                                                            Autorização
                                                            (opcional)
                                                        </label>
                                                        <input
                                                            type="date"
                                                            style={styles.input}
                                                            value={
                                                                contact.dataInicioAutorizacao ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                updateEditContactIfMissing(
                                                                    index,
                                                                    "dataInicioAutorizacao",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <div
                                                        style={styles.formGroup}
                                                    >
                                                        <label
                                                            style={styles.label}
                                                        >
                                                            Data Fim Autorização
                                                            (opcional)
                                                        </label>
                                                        <input
                                                            type="date"
                                                            style={styles.input}
                                                            value={
                                                                contact.dataFimAutorizacao ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                updateEditContactIfMissing(
                                                                    index,
                                                                    "dataFimAutorizacao",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ),
                                )}

                                <button
                                    type="button"
                                    onClick={addEditContactIfMissing}
                                    style={{
                                        ...styles.button,
                                        ...styles.buttonSecondary,
                                        width: "100%",
                                        marginTop: "10px",
                                    }}
                                >
                                    ➕ Adicionar Contacto
                                </button>
                            </div>

                            <div style={styles.buttonGroup}>
                                <button
                                    type="submit"
                                    style={{
                                        ...styles.button,
                                        ...styles.buttonSuccess,
                                        flex: 1,
                                    }}
                                >
                                    ✅ Salvar Alterações
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelEditingContactList}
                                    style={{
                                        ...styles.button,
                                        ...styles.buttonSecondary,
                                        flex: 1,
                                    }}
                                >
                                    ❌ Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactsTab;