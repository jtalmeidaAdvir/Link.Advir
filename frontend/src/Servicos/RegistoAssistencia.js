
import React, { useState, useEffect } from "react";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";

const getCurrentDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localTime = new Date(now.getTime() - offset * 60 * 1000);
    return localTime.toISOString().slice(0, 16);
};

const RegistoAssistencia = (props) => {
    const [selectedObjeto, setSelectedObjeto] = useState(null);
    const token = localStorage.getItem("painelAdminToken");
    const urlempresa = localStorage.getItem("urlempresa");
    const { t } = useTranslation();
    
    // Variáveis de estado
    const [formData, setFormData] = useState({
        cliente: "",
        contacto: "",
        tecnico: "",
        origem: "",
        objeto: "",
        prioridade: "",
        secao: "",
        estado: "",
        tipoProcesso: "",
        contratoID: "",
        problema: "",
        comoReproduzir: "",
        datahoraabertura: getCurrentDateTime(),
        datahorafimprevista: "",
    });

    const [dataLists, setDataLists] = useState({
        clientes: [],
        contactos: [],
        contratosID: [],
        tecnicos: [],
        origens: [],
        objetos: [],
        prioridades: [],
        seccoes: [],
        estados: [],
        tiposProcessos: [],
    });

    // Atualizar handleChange
    const handleFormChange = (e) => {
        const { name, value } = e.target;

        if (name === "dataInicio" || name === "horaInicio") {
            const newFormData = { ...formData, [name]: value };
            if (newFormData.dataInicio && newFormData.horaInicio) {
                const dataHoraInicioFormatted = `${newFormData.dataInicio}T${newFormData.horaInicio}:00`;
                newFormData.datahoraabertura = dataHoraInicioFormatted;
            }
            setFormData(newFormData);
        } else if (name === "dataFimPrevista" || name === "horaFimPrevista") {
            const newFormData = { ...formData, [name]: value };
            if (newFormData.dataFimPrevista && newFormData.horaFimPrevista) {
                const dataHoraFimFormatted = `${newFormData.dataFimPrevista}T${newFormData.horaFimPrevista}:00`;
                newFormData.datahorafimprevista = dataHoraFimFormatted;
            }
            setFormData(newFormData);
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const [loadingStates, setLoadingStates] = useState({
        carregandoClientes: false,
        carregandoContactos: false,
        carregandocontratosID: false,
        carregandoTecnicos: false,
        carregandoOrigens: false,
        carregandoObjetos: false,
        carregandoPrioridades: false,
        carregandoSeccoes: false,
        carregandoEstados: false,
        carregandoTiposProcessos: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [activeTab, setActiveTab] = useState("cliente");

    // Função para buscar dados
    const fetchData = async (url, key, loadingKey) => {
        if (
            !loadingStates[loadingKey] &&
            (!dataLists[key] || dataLists[key].length === 0)
        ) {
            setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }));
            try {
                const response = await fetch(
                    `https://webapiprimavera.advir.pt/${url}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                            urlempresa: urlempresa,
                        },
                    },
                );

                if (!response.ok) {
                    console.error(
                        `Error fetching data from ${url}: ${response.statusText}`,
                    );
                    throw new Error(
                        `Error: ${response.status} ${response.statusText}`,
                    );
                }

                const data = await response.json();
                setDataLists((prev) => ({
                    ...prev,
                    [key]: data.DataSet.Table || [],
                }));
            } catch (error) {
                console.error(`Error fetching data for ${key}:`, error);
            } finally {
                setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }));
            }
        }
    };

    // Função para tratar o envio do formulário
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (
            !formData.cliente ||
            !formData.tecnico ||
            !formData.origem ||
            !formData.objeto ||
            !formData.prioridade ||
            !formData.secao ||
            !formData.estado ||
            !formData.tipoProcesso ||
            !formData.problema
        ) {
            setMessage(t("RegistoAssistencia.Aviso.1"));
            return;
        }

        setIsSubmitting(true);
        setMessage("");

        // Define data atual e data fim prevista
        const dataAtual = new Date();
        const dataFimPrevista = new Date();
        dataFimPrevista.setDate(dataAtual.getDate() + 30);

        // Formatar para DateTime
        const dataAtualFormatada = dataAtual
            .toISOString()
            .replace("T", " ")
            .slice(0, 19);
        const dataFimPrevistaFormatada = dataFimPrevista
            .toISOString()
            .replace("T", " ")
            .slice(0, 19);

        const objetotipo = selectedObjeto ? selectedObjeto.TipoObjecto : null;
        const objetoID = selectedObjeto ? selectedObjeto.ID : null;

        const payload = {
            cliente: formData.cliente,
            descricaoObjecto: formData.objeto,
            descricaoProblema: formData.problema,
            origem: formData.origem,
            tipoProcesso: formData.tipoProcesso,
            prioridade: formData.prioridade,
            tecnico: formData.tecnico,
            objectoID: objetoID,
            tipoDoc: objetotipo,
            serie: "2025",
            estado: formData.estado,
            seccao: formData.secao,
            comoReproduzir: formData.comoReproduzir
                ? formData.comoReproduzir
                : null,
            contacto: formData.contacto ? formData.contacto : null,
            contratoID: formData.contratoID ? formData.contratoID : null,
            datahoraabertura: formData.datahoraabertura,
            datahorafimprevista: formData.datahorafimprevista,
        };

        try {
            const response = await fetch(
                `https://webapiprimavera.advir.pt/routePedidos_STP/CriarPedido`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        urlempresa: urlempresa,
                    },
                    body: JSON.stringify(payload),
                },
            );

            const data = await response.json();
            setMessage(t("RegistoAssistencia.Aviso.2"));

            setFormData({
                cliente: "",
                contacto: "",
                contratoID: "",
                tecnico: "",
                origem: "",
                objeto: "",
                prioridade: "",
                secao: "",
                estado: "",
                tipoProcesso: "",
                problema: "",
                comoReproduzir: "",
                datahoraabertura: "",
                datahorafimprevista: "",
            });
            setSelectedObjeto(null);
        } catch (error) {
            setMessage("Erro ao enviar pedido.");
            console.error("Erro ao enviar pedido:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Atualizar dados do formulário
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <header style={headerStyle}>
                    <h1 style={titleStyle}>{t("RegistoAssistencia.Title")}</h1>
                    <div style={tabsContainerStyle}>
                        <button 
                            style={activeTab === "cliente" ? activeTabStyle : tabStyle}
                            onClick={() => setActiveTab("cliente")}
                        >
                            Informações do Cliente
                        </button>
                        <button 
                            style={activeTab === "detalhes" ? activeTabStyle : tabStyle}
                            onClick={() => setActiveTab("detalhes")}
                        >
                            Detalhes da Assistência
                        </button>
                        <button 
                            style={activeTab === "descricao" ? activeTabStyle : tabStyle}
                            onClick={() => setActiveTab("descricao")}
                        >
                            Descrição do Problema
                        </button>
                    </div>
                </header>

                {message && <div style={messageStyle}>{message}</div>}

                <form onSubmit={handleSubmit} style={formStyle}>
                    {activeTab === "cliente" && (
                        <div className="tab-content" style={tabContentStyle}>
                            <div style={sectionTitleContainerStyle}>
                                <div style={sectionTitleLineStyle}></div>
                                <h2 style={sectionTitleStyle}>Informações do Cliente</h2>
                                <div style={sectionTitleLineStyle}></div>
                            </div>
                            
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>{t("RegistoAssistencia.TxtCliente")}</label>
                                <select
                                    name="cliente"
                                    value={formData.cliente}
                                    onChange={handleChange}
                                    onClick={() =>
                                        fetchData(
                                            "routePedidos_STP/LstClientes",
                                            "clientes",
                                            "carregandoClientes",
                                        )
                                    }
                                    style={selectStyle}
                                >
                                    <option value="">{t("RegistoAssistencia.TxtCliente")}</option>
                                    {dataLists.clientes.map((c) => (
                                        <option key={c.Cliente} value={c.Cliente}>
                                            {c.Cliente} - {c.Nome}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={formRowStyle}>
                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>{t("RegistoAssistencia.TxtContacto")}</label>
                                    <select
                                        name="contacto"
                                        value={formData.contacto}
                                        onChange={handleChange}
                                        onClick={() =>
                                            fetchData(
                                                `routePedidos_STP/ListarContactos/${formData.cliente}`,
                                                "contactos",
                                                "carregandoContactos",
                                            )
                                        }
                                        style={selectStyle}
                                        disabled={!formData.cliente}
                                    >
                                        <option value="">{t("RegistoAssistencia.TxtContacto")}</option>
                                        {dataLists.contactos.map((co) => (
                                            <option key={co.Contacto} value={co.Contacto}>
                                                {co.Contacto} - {co.PrimeiroNome} {co.UltimoNome}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>{t("RegistoAssistencia.TxtContrato")}</label>
                                    <select
                                        name="contratoID"
                                        value={formData.contratoID}
                                        onChange={handleChange}
                                        onClick={() =>
                                            fetchData(
                                                `routePedidos_STP/Listarcontratos/${formData.cliente}`,
                                                "contratosID",
                                                "carregandocontratosID",
                                            )
                                        }
                                        style={selectStyle}
                                        disabled={!formData.cliente}
                                    >
                                        <option value="">{t("RegistoAssistencia.TxtContrato")}</option>
                                        {dataLists.contratosID.map((ct) => (
                                            <option key={ct.ID} value={ct.ID}>
                                                {ct.Codigo} - {ct.Descricao1}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={formRowStyle}>
                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>Data de Abertura</label>
                                    <input
                                        type="date"
                                        name="dataInicio"
                                        style={inputStyle}
                                        onChange={handleFormChange}
                                        required
                                    />
                                </div>
                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>Hora de Abertura</label>
                                    <input
                                        type="time"
                                        name="horaInicio"
                                        style={inputStyle}
                                        onChange={handleFormChange}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div style={navigationButtonsStyle}>
                                <button type="button" style={nextButtonStyle} onClick={() => setActiveTab("detalhes")}>
                                    Próximo
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "detalhes" && (
                        <div className="tab-content" style={tabContentStyle}>
                            <div style={sectionTitleContainerStyle}>
                                <div style={sectionTitleLineStyle}></div>
                                <h2 style={sectionTitleStyle}>Detalhes da Assistência</h2>
                                <div style={sectionTitleLineStyle}></div>
                            </div>
                            
                            <div style={formRowStyle}>
                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>{t("RegistoAssistencia.TxtTecnico")}</label>
                                    <select
                                        name="tecnico"
                                        value={formData.tecnico}
                                        onChange={handleChange}
                                        onClick={() =>
                                            fetchData(
                                                "routePedidos_STP/LstTecnicosTodos",
                                                "tecnicos",
                                                "carregandoTecnicos",
                                            )
                                        }
                                        style={selectStyle}
                                    >
                                        <option value="">{t("RegistoAssistencia.TxtTecnico")}</option>
                                        {dataLists.tecnicos.map((t) => (
                                            <option key={t.Tecnico} value={t.Tecnico}>
                                                {t.Tecnico} - {t.Nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>{t("RegistoAssistencia.TxtOrigem")}</label>
                                    <select
                                        name="origem"
                                        value={formData.origem}
                                        onChange={handleChange}
                                        onClick={() =>
                                            fetchData(
                                                "routePedidos_STP/LstOrigensProcessos",
                                                "origens",
                                                "carregandoOrigens",
                                            )
                                        }
                                        style={selectStyle}
                                    >
                                        <option value="">{t("RegistoAssistencia.TxtOrigem")}</option>
                                        {dataLists.origens.map((o) => (
                                            <option
                                                key={o.OrigemProcesso}
                                                value={o.OrigemProcesso}
                                            >
                                                {o.OrigemProcesso} - {o.Descricao}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={formRowStyle}>
                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>{t("RegistoAssistencia.TxtObjeto")}</label>
                                    <select
                                        name="objeto"
                                        value={formData.objeto}
                                        onChange={(e) => {
                                            handleChange(e);
                                            const objeto = dataLists.objetos.find(
                                                (o) => o.Objecto === e.target.value,
                                            );
                                            setSelectedObjeto(objeto);
                                        }}
                                        onClick={() =>
                                            fetchData(
                                                "routePedidos_STP/LstObjectos",
                                                "objetos",
                                                "carregandoObjetos",
                                            )
                                        }
                                        style={selectStyle}
                                    >
                                        <option value="">{t("RegistoAssistencia.TxtObjeto")}</option>
                                        {dataLists.objetos.map((o) => (
                                            <option key={o.ID} value={o.Objecto}>
                                                {o.Objecto}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>{t("RegistoAssistencia.TxtPrioridade")}</label>
                                    <select
                                        name="prioridade"
                                        value={formData.prioridade}
                                        onChange={handleChange}
                                        onClick={() =>
                                            fetchData(
                                                "routePedidos_STP/ListarTiposPrioridades",
                                                "prioridades",
                                                "carregandoPrioridades",
                                            )
                                        }
                                        style={selectStyle}
                                    >
                                        <option value="">{t("RegistoAssistencia.TxtPrioridade")}</option>
                                        {dataLists.prioridades.map((p) => (
                                            <option key={p.Prioridade} value={p.Prioridade}>
                                                {p.Prioridade} - {p.Descricao}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={formRowStyle}>
                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>{t("RegistoAssistencia.TxtSecao")}</label>
                                    <select
                                        name="secao"
                                        value={formData.secao}
                                        onChange={handleChange}
                                        onClick={() =>
                                            fetchData(
                                                "routePedidos_STP/ListarSeccoes",
                                                "seccoes",
                                                "carregandoSeccoes",
                                            )
                                        }
                                        style={selectStyle}
                                    >
                                        <option value="">{t("RegistoAssistencia.TxtSecao")}</option>
                                        {dataLists.seccoes.map((s) => (
                                            <option key={s.Seccao} value={s.Seccao}>
                                                {s.Seccao} - {s.Nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>{t("RegistoAssistencia.TxtEstado")}</label>
                                    <select
                                        name="estado"
                                        value={formData.estado}
                                        onChange={handleChange}
                                        onClick={() =>
                                            fetchData(
                                                "routePedidos_STP/LstEstadosTodos",
                                                "estados",
                                                "carregandoEstados",
                                            )
                                        }
                                        style={selectStyle}
                                    >
                                        <option value="">{t("RegistoAssistencia.TxtEstado")}</option>
                                        {dataLists.estados.map((e) => (
                                            <option key={e.Estado} value={e.Estado}>
                                                {e.Descricao}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>{t("RegistoAssistencia.TxtTipoProcesso")}</label>
                                <select
                                    name="tipoProcesso"
                                    value={formData.tipoProcesso}
                                    onChange={handleChange}
                                    onClick={() =>
                                        fetchData(
                                            "routePedidos_STP/ListarTiposProcesso",
                                            "tiposProcessos",
                                            "carregandoTiposProcessos",
                                        )
                                    }
                                    style={selectStyle}
                                >
                                    <option value="">{t("RegistoAssistencia.TxtTipoProcesso")}</option>
                                    {dataLists.tiposProcessos.map((tp) => (
                                        <option
                                            key={tp.TipoProcesso}
                                            value={tp.TipoProcesso}
                                        >
                                            {tp.TipoProcesso} - {tp.Descricao}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div style={navigationButtonsStyle}>
                                <button type="button" style={backButtonStyle} onClick={() => setActiveTab("cliente")}>
                                    Voltar
                                </button>
                                <button type="button" style={nextButtonStyle} onClick={() => setActiveTab("descricao")}>
                                    Próximo
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "descricao" && (
                        <div className="tab-content" style={tabContentStyle}>
                            <div style={sectionTitleContainerStyle}>
                                <div style={sectionTitleLineStyle}></div>
                                <h2 style={sectionTitleStyle}>Descrição do Problema</h2>
                                <div style={sectionTitleLineStyle}></div>
                            </div>
                            
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>{t("RegistoAssistencia.TxtProblema")}</label>
                                <textarea
                                    name="problema"
                                    placeholder={t("RegistoAssistencia.TxtProblema")}
                                    value={formData.problema}
                                    onChange={handleChange}
                                    style={textareaStyle}
                                    rows={5}
                                />
                            </div>
                            
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>{t("RegistoAssistencia.TxtComoReproduzir")}</label>
                                <textarea
                                    name="comoReproduzir"
                                    placeholder={t("RegistoAssistencia.TxtComoReproduzir")}
                                    value={formData.comoReproduzir}
                                    onChange={handleChange}
                                    style={textareaStyle}
                                    rows={5}
                                />
                            </div>
                            
                            <div style={navigationButtonsStyle}>
                                <button type="button" style={backButtonStyle} onClick={() => setActiveTab("detalhes")}>
                                    Voltar
                                </button>
                                <button type="submit" style={submitButtonStyle} disabled={isSubmitting}>
                                    {isSubmitting
                                        ? t("RegistoAssistencia.BtGravando")
                                        : t("RegistoAssistencia.BtGravar")}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
                
                <div style={buttonContainerStyle}>
                    <button
                        onClick={() => props.navigation.navigate("PedidosAssistencia")}
                        style={cancelButtonStyle}
                    >
                        {t("RegistoAssistencia.BtCancelar")}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Estilos modernos
const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minHeight: "100vh",
    width: "100%",
    backgroundColor: '#d4e4ff',
    padding: "20px",
    boxSizing: "border-box",
};

const cardStyle = {
    width: "90%",
    maxWidth: "1000px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
    marginBottom: "30px",
};

const headerStyle = {
    backgroundColor: "#1792FE",
    padding: "25px",
    textAlign: "center",
    position: "relative",
};

const titleStyle = {
    color: "#ffffff",
    fontSize: "1.8rem",
    fontWeight: "600",
    marginTop: "0",
    marginBottom: "20px",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
};

const tabsContainerStyle = {
    display: "flex",
    justifyContent: "center",
    gap: "5px",
    marginTop: "10px",
};

const tabStyle = {
    padding: "10px 20px",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    color: "#fff",
    border: "none",
    borderRadius: "20px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "0.9rem",
    transition: "all 0.2s ease",
};

const activeTabStyle = {
    ...tabStyle,
    backgroundColor: "#ffffff",
    color: "#1792FE",
    fontWeight: "600",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
};

const formStyle = {
    padding: "0 20px",
};

const tabContentStyle = {
    padding: "20px 0",
    animation: "fadeIn 0.3s ease-in-out",
};

const sectionTitleContainerStyle = {
    display: "flex",
    alignItems: "center",
    margin: "10px 0 25px 0",
};

const sectionTitleLineStyle = {
    flex: 1,
    height: "1px",
    backgroundColor: "#e0e0e0",
};

const sectionTitleStyle = {
    fontSize: "1.2rem",
    fontWeight: "500",
    color: "#1792FE",
    margin: "0 15px",
    padding: "0 10px",
};

const formGroupStyle = {
    marginBottom: "20px",
    width: "100%",
};

const formRowStyle = {
    display: "flex",
    gap: "20px",
    marginBottom: "5px",
};

const labelStyle = {
    display: "block",
    marginBottom: "8px",
    fontSize: "0.95rem",
    fontWeight: "500",
    color: "#555",
};

const selectStyle = {
    width: "100%",
    padding: "12px 15px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "0.95rem",
    backgroundColor: "#f9f9f9",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    boxSizing: "border-box",
    appearance: "none",
    backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=\"%23555\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 10l5 5 5-5z\"/><path d=\"M0 0h24v24H0z\" fill=\"none\"/></svg>')",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
};

const inputStyle = {
    width: "100%",
    padding: "12px 15px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "0.95rem",
    backgroundColor: "#f9f9f9",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    boxSizing: "border-box",
};

const textareaStyle = {
    width: "100%",
    padding: "12px 15px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "0.95rem",
    backgroundColor: "#f9f9f9",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: "120px",
};

const navigationButtonsStyle = {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "30px",
    paddingBottom: "10px",
};

const buttonBaseStyle = {
    padding: "12px 25px",
    borderRadius: "8px",
    border: "none",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
};

const backButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: "#e0e0e0",
    color: "#555",
};

const nextButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: "#1792FE",
    color: "white",
};

const submitButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: "#4CAF50",
    color: "white",
};

const buttonContainerStyle = {
    display: "flex",
    justifyContent: "center",
    padding: "20px",
    borderTop: "1px solid #eee",
};

const cancelButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: "#f44336",
    color: "white",
    padding: "10px 30px",
};

const messageStyle = {
    backgroundColor: "#e8f5e9",
    border: "1px solid #c8e6c9",
    color: "#2e7d32",
    padding: "12px 15px",
    borderRadius: "8px",
    margin: "10px 20px",
    textAlign: "center",
    fontWeight: "500",
};

export default RegistoAssistencia;
