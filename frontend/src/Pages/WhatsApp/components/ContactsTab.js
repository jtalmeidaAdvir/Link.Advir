
import React from "react";

const ContactsTab = ({
    newContactList,
    setNewContactList,
    contactLists,
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
    return (
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
                        <label style={styles.label}>Contactos</label>
                        {newContactList.contacts.map((contact, index) => (
                            <div key={index} style={styles.contactItem}>
                                <div style={styles.contactItemHeader}>
                                    <span style={{ fontWeight: "600" }}>Contacto #{index + 1}</span>
                                    {newContactList.contacts.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeContact(index)}
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
                                    <label style={styles.label}>Número de Telefone *</label>
                                    <input
                                        type="tel"
                                        style={styles.input}
                                        value={contact.phone}
                                        onChange={(e) =>
                                            updateContact(index, "phone", e.target.value)
                                        }
                                        placeholder="351912345678"
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Número do Técnico (opcional)</label>
                                    <input
                                        type="tel"
                                        style={styles.input}
                                        value={contact.numeroTecnico}
                                        onChange={(e) =>
                                            updateContact(index, "numeroTecnico", e.target.value)
                                        }
                                        placeholder="351912345678"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Número do Cliente (opcional)</label>
                                    <input
                                        type="tel"
                                        style={styles.input}
                                        value={contact.numeroCliente}
                                        onChange={(e) =>
                                            updateContact(index, "numeroCliente", e.target.value)
                                        }
                                        placeholder="351912345678"
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
                                            backgroundColor: contact.canCreateTickets ? "#e3f2fd" : "#f8f9fa",
                                            borderRadius: "8px",
                                            border: `2px solid ${contact.canCreateTickets ? "#007bff" : "#e9ecef"}`,
                                            transition: "all 0.3s ease",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={contact.canCreateTickets}
                                            onChange={(e) =>
                                                updateContact(index, "canCreateTickets", e.target.checked)
                                            }
                                            style={{
                                                marginRight: "12px",
                                                transform: "scale(1.2)",
                                            }}
                                        />
                                        <div>
                                            <span style={{ fontWeight: "600", color: "#343a40" }}>
                                                🎫 Autorizar criação de pedidos
                                            </span>
                                            <div style={{
                                                fontSize: "0.85rem",
                                                color: "#6c757d",
                                                marginTop: "4px",
                                            }}>
                                                Este contacto pode criar pedidos via WhatsApp
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addNewContact}
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
                    📋 Listas de Contactos ({Array.isArray(contactLists) ? contactLists.length : 0})
                </h3>
                {!contactListsLoaded ? (
                    <p style={{ textAlign: "center", color: "#6c757d", padding: "20px" }}>
                        Carregando listas de contactos...
                    </p>
                ) : !Array.isArray(contactLists) || contactLists.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#6c757d", padding: "20px" }}>
                        Nenhuma lista de contactos criada ainda.
                    </p>
                ) : (
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        {Array.isArray(contactLists) &&
                            contactLists.map((list) => {
                                const hasAuthorizedContacts = list.contacts &&
                                    (Array.isArray(list.contacts)
                                        ? list.contacts.some((c) =>
                                            typeof c === "object" ? c.canCreateTickets : false
                                        )
                                        : list.canCreateTickets);

                                const contactCount = Array.isArray(list.contacts)
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
                                            backgroundColor: hasAuthorizedContacts ? "#f8fff8" : styles.listItem.backgroundColor,
                                        }}
                                    >
                                        <div style={styles.listContent}>
                                            <div style={styles.listTitle}>
                                                {hasAuthorizedContacts && (
                                                    <span style={{ color: "#28a745", marginRight: "8px" }}>🎫</span>
                                                )}
                                                {list.name}
                                            </div>
                                            <div style={styles.listMeta}>👥 {contactCount} contactos</div>
                                            <div style={styles.listMeta}>
                                                📅 {new Date(list.createdAt).toLocaleDateString("pt-PT")}
                                            </div>
                                            <div
                                                style={{
                                                    ...styles.listMeta,
                                                    color: hasAuthorizedContacts ? "#28a745" : "#dc3545",
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
                                                        Array.isArray(list.contacts) &&
                                                        list.contacts.length > 0 &&
                                                        typeof list.contacts[0] === "object"
                                                    ) {
                                                        list.contacts.forEach((contact, index) => {
                                                            displayText += `\n${index + 1}. ${contact.phone}`;
                                                            if (contact.numeroTecnico)
                                                                displayText += `\n   Técnico: ${contact.numeroTecnico}`;
                                                            if (contact.numeroCliente)
                                                                displayText += `\n   Cliente: ${contact.numeroCliente}`;
                                                            displayText += `\n   Pode criar pedidos: ${contact.canCreateTickets ? "Sim" : "Não"}`;
                                                            displayText += "\n";
                                                        });
                                                    } else {
                                                        const phones = Array.isArray(list.contacts)
                                                            ? list.contacts
                                                            : typeof list.contacts === "string"
                                                                ? JSON.parse(list.contacts)
                                                                : [];
                                                        phones.forEach((phone, index) => {
                                                            displayText += `${index + 1}. ${phone}\n`;
                                                        });
                                                        if (list.numeroTecnico)
                                                            displayText += `\nTécnico geral: ${list.numeroTecnico}`;
                                                        if (list.numeroCliente)
                                                            displayText += `\nCliente geral: ${list.numeroCliente}`;
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
                                                onClick={() => startEditingContactList(list)}
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
                                                onClick={() => deleteContactList(list.id)}
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
                        <h3 style={styles.cardTitle}>✏️ Editar Lista de Contactos</h3>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleEditContactList(editingContactList);
                            }}
                        >
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Nome da Lista *</label>
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
                                {editingContactList.contacts.map((contact, index) => (
                                    <div key={index} style={styles.contactItem}>
                                        <div style={styles.contactItemHeader}>
                                            <span style={{ fontWeight: "600" }}>Contacto #{index + 1}</span>
                                            {editingContactList.contacts.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeEditContact(index)}
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
                                            <label style={styles.label}>Número de Telefone *</label>
                                            <input
                                                type="tel"
                                                style={styles.input}
                                                value={contact.phone || contact}
                                                onChange={(e) =>
                                                    updateEditContact(index, "phone", e.target.value)
                                                }
                                                placeholder="351912345678"
                                                required
                                            />
                                        </div>

                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>Número do Técnico (opcional)</label>
                                            <input
                                                type="tel"
                                                style={styles.input}
                                                value={contact.numeroTecnico || ""}
                                                onChange={(e) =>
                                                    updateEditContact(index, "numeroTecnico", e.target.value)
                                                }
                                                placeholder="351912345678"
                                            />
                                        </div>

                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>Número do Cliente (opcional)</label>
                                            <input
                                                type="tel"
                                                style={styles.input}
                                                value={contact.numeroCliente || ""}
                                                onChange={(e) =>
                                                    updateEditContact(index, "numeroCliente", e.target.value)
                                                }
                                                placeholder="351912345678"
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
                                                    backgroundColor: contact.canCreateTickets ? "#e3f2fd" : "#f8f9fa",
                                                    borderRadius: "8px",
                                                    border: `2px solid ${contact.canCreateTickets ? "#007bff" : "#e9ecef"}`,
                                                    transition: "all 0.3s ease",
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={contact.canCreateTickets || false}
                                                    onChange={(e) =>
                                                        updateEditContact(index, "canCreateTickets", e.target.checked)
                                                    }
                                                    style={{
                                                        marginRight: "12px",
                                                        transform: "scale(1.2)",
                                                    }}
                                                />
                                                <div>
                                                    <span style={{ fontWeight: "600", color: "#343a40" }}>
                                                        🎫 Autorizar criação de pedidos
                                                    </span>
                                                    <div style={{
                                                        fontSize: "0.85rem",
                                                        color: "#6c757d",
                                                        marginTop: "4px",
                                                    }}>
                                                        Este contacto pode criar pedidos via WhatsApp
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addEditContact}
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
