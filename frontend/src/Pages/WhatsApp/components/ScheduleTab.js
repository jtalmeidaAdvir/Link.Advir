
import React from "react";

const ScheduleTab = ({
    newSchedule,
    setNewSchedule,
    scheduledMessages,
    contactLists,
    selectedContactList,
    setSelectedContactList,
    handleCreateSchedule,
    deleteSchedule,
    testScheduleNow,
    forceScheduleExecution,
    simulateTimeExecution,
    toggleSchedule,
    loadScheduledMessages,
    styles,
}) => {
    return (
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
                                const list = contactLists.find((l) => l.id.toString() === e.target.value);

                                if (list) {
                                    let formattedContacts;
                                    if (
                                        Array.isArray(list.contacts) &&
                                        list.contacts.length > 0 &&
                                        typeof list.contacts[0] === "object"
                                    ) {
                                        formattedContacts = list.contacts.map((contact) => ({
                                            name: `Contacto ${contact.phone.slice(-4)}`,
                                            phone: contact.phone,
                                        }));
                                    } else {
                                        const phones = Array.isArray(list.contacts)
                                            ? list.contacts
                                            : typeof list.contacts === "string"
                                                ? JSON.parse(list.contacts)
                                                : [];
                                        formattedContacts = phones.map((phone) => ({
                                            name: `Contacto ${phone.slice(-4)}`,
                                            phone: phone,
                                        }));
                                    }

                                    setNewSchedule({
                                        ...newSchedule,
                                        contactList: formattedContacts,
                                    });
                                } else {
                                    setNewSchedule({
                                        ...newSchedule,
                                        contactList: [],
                                    });
                                }
                            }}
                            required
                        >
                            <option value="">Selecione uma lista...</option>
                            {Array.isArray(contactLists) &&
                                contactLists.map((list) => {
                                    const contactCount = Array.isArray(list.contacts)
                                        ? list.contacts.length
                                        : typeof list.contacts === "string"
                                            ? JSON.parse(list.contacts).length
                                            : 0;
                                    return (
                                        <option key={list.id} value={list.id}>
                                            {list.name} ({contactCount} contactos)
                                        </option>
                                    );
                                })}
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
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                {["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map(
                                    (day, index) => (
                                        <label
                                            key={index}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                padding: "8px 12px",
                                                backgroundColor: newSchedule.days.includes(index + 1)
                                                    ? "#007bff"
                                                    : "#f8f9fa",
                                                color: newSchedule.days.includes(index + 1) ? "#fff" : "#495057",
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                                fontSize: "0.9rem",
                                                transition: "all 0.3s ease",
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                style={{ marginRight: "8px" }}
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
                                    )
                                )}
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
                            width: "100%",
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
                <div
                    style={{
                        backgroundColor: "#e3f2fd",
                        padding: "20px",
                        borderRadius: "8px",
                        marginBottom: "20px",
                        border: "1px solid #bbdefb",
                    }}
                >
                    <h4 style={{ color: "#1976d2", marginBottom: "15px" }}>🧪 Ferramentas de Teste</h4>
                    <div style={styles.buttonGroup}>
                        <button
                            onClick={testScheduleNow}
                            style={{
                                ...styles.button,
                                fontSize: "0.85rem",
                                padding: "8px 12px",
                            }}
                        >
                            🚀 Testar
                        </button>
                        <button
                            onClick={simulateTimeExecution}
                            style={{
                                ...styles.button,
                                fontSize: "0.85rem",
                                padding: "8px 12px",
                            }}
                        >
                            ⏰ Simular Hora
                        </button>
                        <button
                            onClick={() => loadScheduledMessages()}
                            style={{
                                ...styles.button,
                                fontSize: "0.85rem",
                                padding: "8px 12px",
                            }}
                        >
                            🔄 Atualizar
                        </button>
                    </div>
                </div>

                {scheduledMessages.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#6c757d", padding: "20px" }}>
                        Nenhuma mensagem agendada ainda.
                    </p>
                ) : (
                    <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                        {scheduledMessages.map((schedule) => (
                            <div key={schedule.id} style={styles.listItem}>
                                <div style={styles.listContent}>
                                    <div style={styles.listTitle}>{schedule.message.substring(0, 50)}...</div>
                                    <div style={styles.listMeta}>
                                        🔄{" "}
                                        {schedule.frequency === "daily"
                                            ? "Diária"
                                            : schedule.frequency === "weekly"
                                                ? "Semanal"
                                                : schedule.frequency === "custom"
                                                    ? "Dias Específicos"
                                                    : "Mensal"}{" "}
                                        às {schedule.time}
                                    </div>
                                    <div style={styles.listMeta}>👥 {schedule.contactList.length} contactos</div>
                                    <div style={styles.listMeta}>
                                        {schedule.enabled ? "✅ Ativo" : "⏸️ Pausado"}
                                    </div>
                                </div>
                                <div style={styles.buttonGroup}>
                                    <button
                                        onClick={() => forceScheduleExecution(schedule.id)}
                                        style={{
                                            ...styles.button,
                                            padding: "6px 10px",
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        ▶️ Executar
                                    </button>
                                    <button
                                        onClick={() => toggleSchedule(schedule.id)}
                                        style={{
                                            ...styles.button,
                                            ...(schedule.enabled ? styles.buttonWarning : styles.buttonSuccess),
                                            padding: "6px 10px",
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        {schedule.enabled ? "⏸️ Pausar" : "▶️ Ativar"}
                                    </button>
                                    <button
                                        onClick={() => deleteSchedule(schedule.id)}
                                        style={{
                                            ...styles.button,
                                            ...styles.buttonDanger,
                                            padding: "6px 10px",
                                            fontSize: "0.8rem",
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
};

export default ScheduleTab;
