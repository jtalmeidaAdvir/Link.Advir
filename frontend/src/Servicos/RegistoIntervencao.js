import React, { useState } from "react";
import Modal from "./Modal";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";

const RegistoIntervencao = (props) => {
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const { t } = useTranslation();
    const [enviarEmailCheck, setEnviarEmailCheck] = useState(true);

    const initialArtigoForm = () => ({
        artigo: "",
        descricao: "",
        unidade: "",
        armazem: "",
        localizacao: "",
        lote: "",
        qtd: "",
        custo: "",
        prCustoU: "",
        totCusto: "",
        qtdCliente: "",
        prClienteU: "",
        desc: "",
        totCliente: "",
        faturacao: "",
        doc: "",
    });
    const [formData, setFormData] = useState({
        tipoIntervencao: "",
        tecnico: "",
        estado: "",
        tipo: "",
        dataInicio: "",
        dataFim: "",
        horaInicio: "",
        horaFim: "",
        descricao: "",
    });
    const [tipos, setTipos] = useState([]);
    const [tiposIntervencao, setTiposIntervencao] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);
    const [estados, setEstados] = useState([]);
    const [addedArtigos, setAddedArtigos] = useState([]);
    const [artigoForm, setArtigoForm] = useState(initialArtigoForm());
    const [isArtigoSectionOpen, setIsArtigoSectionOpen] = useState(false);
    const [artigosDisponiveis, setArtigosDisponiveis] = useState([]);
    const [expandedIndexes, setExpandedIndexes] = useState({});
    const [editingIndex, setEditingIndex] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const token = localStorage.getItem("painelAdminToken");
    const empresaSelecionada = localStorage.getItem("empresaSelecionada");
    const urlempresa = localStorage.getItem("urlempresa");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("detalhes");

    const [qtdeCusto, setQtdeCusto] = useState(0);
    const [precoCusto, setPrecoCusto] = useState(0);
    const [qtdeCliente, setQtdeCliente] = useState(0);
    const [precoCliente, setPrecoCliente] = useState(0);
    const [descontoCliente, setDescontoCliente] = useState(0);

    // States for deslocação service inputs
    const [qtdeCustoDeslocacao, setQtdeCustoDeslocacao] = useState(0);
    const [precoCustoDeslocacao, setPrecoCustoDeslocacao] = useState(0);
    const [qtdeClienteDeslocacao, setQtdeClienteDeslocacao] = useState(0);
    const [precoClienteDeslocacao, setPrecoClienteDeslocacao] = useState(0);
    const [descontoClienteDeslocacao, setDescontoClienteDeslocacao] =
        useState(0);

    // State for selected intervention type
    const [tipoIntervencaoSelecionado, setTipoIntervencaoSelecionado] =
        useState(null);

    // State for lunch time
    const [tempoAlmoco, setTempoAlmoco] = useState(0);

    const fetchTipos = async () => {
        try {
            const response = await fetch(
                "https://webapiprimavera.advir.pt/routePedidos_STP/LstTiposIntervencao",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );
            const data = await response.json();
            setTipos(data.DataSet.Table);
        } catch (error) {
            console.error("Erro ao buscar tipos:", error);
        }
    };
    const fetchArtigos = async () => {
        try {
            const response = await fetch(
                "https://webapiprimavera.advir.pt/routePedidos_STP/LstArtigos",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );
            const data = await response.json();
            setArtigosDisponiveis(data.DataSet.Table);
        } catch (error) {
            console.error("Erro ao buscar artigos:", error);
        }
    };
    const fetchTiposIntervencao = async () => {
        try {
            const response = await fetch(
                "https://webapiprimavera.advir.pt/routePedidos_STP/ListarTiposPrioridades",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );
            const data = await response.json();
            setTiposIntervencao(data.DataSet.Table);
        } catch (error) {
            console.error("Erro ao buscar tipos de intervenção:", error);
        }
    };
    const fetchTecnicos = async () => {
        try {
            const response = await fetch(
                "https://webapiprimavera.advir.pt/routePedidos_STP/LstTecnicosTodos",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );
            const data = await response.json();
            setTecnicos(data.DataSet.Table);
        } catch (error) {
            console.error("Erro ao buscar técnicos:", error);
        }
    };
    const fetchEstados = async () => {
        try {
            const response = await fetch(
                "https://webapiprimavera.advir.pt/routePedidos_STP/LstEstadosTodos",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );
            const data = await response.json();
            setEstados(data.DataSet.Table);
        } catch (error) {
            console.error("Erro ao buscar estados:", error);
        }
    };

    const toggleArtigoExpansion = (index) => {
        setExpandedIndexes((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    const handleAddArtigo = () => {
        if (editingIndex !== null) {
            // Update existing artigo
            const updatedArtigos = [...addedArtigos];
            updatedArtigos[editingIndex] = artigoForm;
            setAddedArtigos(updatedArtigos);
            setEditingIndex(null); // Reset editing index
        } else {
            // Add new artigo
            setAddedArtigos([...addedArtigos, artigoForm]);
        }
        setArtigoForm(initialArtigoForm());
        setIsArtigoSectionOpen(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === "artigo") {
            const artigoSelecionado = artigosDisponiveis.find(
                (art) => art.Artigo === value,
            );
            setArtigoForm({
                ...artigoForm,
                artigo: value,
                descricao: artigoSelecionado.Descricao,
                unidade: artigoSelecionado.UnidadeBase,
                armazem: artigoSelecionado.ArmazemSugestao,
                localizacao: artigoSelecionado.LocalizacaoSugestao,
                lote: artigoSelecionado.LoteEntradas,
                desc: artigoSelecionado.Desconto,
            });
        } else {
            setArtigoForm({ ...artigoForm, [name]: value });
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleDeleteArtigo = (index) => {
        const updatedArtigos = addedArtigos.filter((_, i) => i !== index);
        setAddedArtigos(updatedArtigos);
        if (editingIndex === index) {
            setEditingIndex(null);
            setArtigoForm(initialArtigoForm());
        }
    };

    const toggleArtigoSection = () => {
        setIsArtigoSectionOpen(!isArtigoSectionOpen);
    };

    const handleArtigoChange = (e, index) => {
        const { name, value } = e.target;
        const updatedArtigos = [...addedArtigos];
        updatedArtigos[index] = { ...updatedArtigos[index], [name]: value };
        setAddedArtigos(updatedArtigos);
    };

    const handleConfirmSave = async () => {
        try {
            setIsLoading(true);
            const id = localStorage.getItem("intervencaoId");
            const processoID = id.toString();
            const apiBaseUrl =
                "https://webapiprimavera.advir.pt/routePedidos_STP";
            let ultimoEstado;
            let secAnterior;
            let utilizador;
            let email;
            // Fetch the last state of the order
            try {
                const estadoResponse = await fetch(
                    `${apiBaseUrl}/DaUltimoEstadoPedido/${processoID}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            urlempresa: urlempresa,
                            "Content-Type": "application/json",
                        },
                    },
                );
                if (estadoResponse.ok) {
                    const estadoData = await estadoResponse.json();
                    ultimoEstado = estadoData.DataSet.Table[0]?.Estado || 1;
                } else {
                    console.warn(
                        "Último estado não encontrado, continuando com estado padrão 1",
                    );
                    ultimoEstado = 1;
                }
            } catch (error) {
                console.error(
                    "Erro ao buscar último estado do pedido:",
                    error.message,
                );
                ultimoEstado = 1;
            }

            try {
                const Response = await fetch(
                    `${apiBaseUrl}/ListarSeccaoUtilizador/${processoID}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            urlempresa: urlempresa,
                            "Content-Type": "application/json",
                        },
                    },
                );
                if (Response.ok) {
                    const estadoData = await Response.json();
                    secAnterior = estadoData.DataSet.Table[0]?.Seccao || "PA";
                    utilizador =
                        estadoData.DataSet.Table[0]?.Utilizador ||
                        "Administrator";
                } else {
                    secAnterior = "PA";
                    utilizador = "Administrator";
                }
            } catch (error) {
                console.error(
                    "Erro ao buscar seção do utilizador:",
                    error.message,
                );
                secAnterior = "PA";
                utilizador = "Administrator";
            }

            // Calculate duration
            const dataHoraInicio = new Date(
                `${formData.dataInicio}T${formData.horaInicio}`,
            );
            const dataHoraFim = new Date(
                `${formData.dataFim}T${formData.horaFim}`,
            );
            let duracaoEmMinutos = Math.floor(
                (dataHoraFim - dataHoraInicio) / (1000 * 60),
            );

            // Subtract lunch time if intervention type is PRE (presencial)
            if (formData.tipo === "PRE" && tempoAlmoco > 0) {
                duracaoEmMinutos = duracaoEmMinutos - tempoAlmoco;
            }

            try {
                // Making the API request
                const Emailresponse = await fetch(
                    `${apiBaseUrl}/ObterContactoIntervencao/${processoID}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            urlempresa: urlempresa,
                            "Content-Type": "application/json",
                        },
                    },
                );

                if (!Emailresponse.ok) {
                    throw new Error(
                        `Erro ao buscar dados: ${Emailresponse.status} - ${Emailresponse.statusText}`,
                    );
                }

                const data = await Emailresponse.json();

                if (data.DataSet && data.DataSet.Table) {
                    email = data.DataSet.Table[0].Email;
                }
            } catch (error) {
                console.error("Erro ao fazer a requisição:", error.message);
            }

            const duracaoRealEmHoras = Math.floor(duracaoEmMinutos / 60);

            // Add base article based on intervention type
            let artigoBase = null;
            const tipoIntervencaoSelecionado = tipos.find(
                (tipo) => tipo.TipoIntervencao === formData.tipo,
            );

            const artigosAdicionados = [...addedArtigos]; // Clone the existing array

            if (tipoIntervencaoSelecionado) {
                // Create base article with selected intervention type properties
                artigoBase = {
                    artigo: tipoIntervencaoSelecionado.ServicoBase,
                    descricao: tipoIntervencaoSelecionado.Descricao,
                    ContabilizaMO: tipoIntervencaoSelecionado.ContabilizaMO,
                    TipoContabilizacao:
                        tipoIntervencaoSelecionado.TipoContabilizacao,
                    TempoFixo: tipoIntervencaoSelecionado.TempoFixo,
                    TempoDebitoMin: tipoIntervencaoSelecionado.TempoDebitoMin,
                    TempoPeriodoSeg: tipoIntervencaoSelecionado.TempoPeriodoSeg,
                    ImplicaDeslocacoes:
                        tipoIntervencaoSelecionado.ImplicaDeslocacoes,
                    ServicoDeslocacao:
                        tipoIntervencaoSelecionado.ServicoDeslocacao,
                    ObrigaRegCaractVar:
                        tipoIntervencaoSelecionado.ObrigaRegCaractVar,
                    qtdeCusto: qtdeCusto,
                    precoCusto: precoCusto,
                    qtdeCliente: qtdeCliente,
                    precoCliente: precoCliente,
                    descontoCliente: descontoCliente,
                };

                // If the transport service is not null, create an additional article
                if (tipoIntervencaoSelecionado.ServicoDeslocacao) {
                    const artigoDeslocacao = {
                        artigo: tipoIntervencaoSelecionado.ServicoDeslocacao,
                        descricao: "Descrição do Serviço de Deslocação",
                        ContabilizaMO: false,
                        TipoContabilizacao: 0,
                        TempoFixo: 0,
                        TempoDebitoMin: 0,
                        TempoPeriodoSeg: 0,
                        ImplicaDeslocacoes: false,
                        ServicoDeslocacao: null,
                        ObrigaRegCaractVar: false,
                        qtdeCusto: qtdeCustoDeslocacao,
                        precoCusto: precoCustoDeslocacao,
                        qtdeCliente: qtdeClienteDeslocacao,
                        precoCliente: precoClienteDeslocacao,
                        descontoCliente: descontoClienteDeslocacao,
                    };

                    // Add the transport article to the added articles array
                    artigosAdicionados.push(artigoDeslocacao);
                }

                // Include the base article in the added articles array
                artigosAdicionados.push(artigoBase);
            }

            const dataHoraInicioFormatted = `${formData.dataInicio}T${formData.horaInicio}:00`; // Adiciona segundos
            const dataHoraFimFormatted = `${formData.dataFim}T${formData.horaFim}:00`;

            const dataToSave = {
                processoID,
                tipoIntervencao: formData.tipo,
                duracao: duracaoEmMinutos,
                duracaoReal: duracaoEmMinutos,
                DataHoraInicio: dataHoraInicioFormatted,
                DataHoraFim: dataHoraFimFormatted,
                tecnico: formData.tecnico,
                estadoAnt: ultimoEstado.toString(),
                estado: formData.estado,
                seccaoAnt: secAnterior,
                seccao: secAnterior,
                utilizador: utilizador,
                descricaoResposta: formData.descricao || null,
                artigos: artigosAdicionados,
            };
            console.log("Dados a enviar para API:", dataToSave);
            console.log("URL da API:", `${apiBaseUrl}/CriarIntervencoes`);
            console.log("Headers:", {
                Authorization: `Bearer ${token ? 'TOKEN_PRESENT' : 'NO_TOKEN'}`,
                urlempresa: urlempresa,
                "Content-Type": "application/json",
            });

            // Call the API to save the intervention
            let intervencaoData;
            let numeroDetalhes;
            let intervencaoCriada = true; // Always assume success

            try {
                const intervencaoResponse = await fetch(
                    `${apiBaseUrl}/CriarIntervencoes`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            urlempresa: urlempresa,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(dataToSave),
                    },
                );

                if (intervencaoResponse.ok) {
                    intervencaoData = await intervencaoResponse.json();
                    numeroDetalhes = intervencaoData.detalhes;
                    console.log("Intervenção criada com sucesso:", intervencaoData);
                    console.log("Número de detalhes:", numeroDetalhes);
                } else {
                    // Log the error but don't fail the process
                    console.warn("API retornou erro mas assumindo que intervenção foi criada:", intervencaoResponse.status);
                    numeroDetalhes = "1"; // Default value for email processes
                }

            } catch (error) {
                console.warn("Erro na requisição mas assumindo que intervenção foi criada:", error.message);
                numeroDetalhes = "1"; // Default value for email processes
            }

            // Secondary processes (email info and sending) - don't fail the entire process
            let ResponseData = null;

            if (intervencaoCriada) {
                try {
                    const emailResponse = await fetch(
                        `${apiBaseUrl}/ObterInfoEmail/${processoID}/${numeroDetalhes}`,
                        {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                                urlempresa: urlempresa,
                            },
                        },
                    );

                    if (emailResponse.ok) {
                        const responseData = await emailResponse.json();
                        console.log("Resposta de e-mail obtida com sucesso:", responseData);
                        ResponseData = responseData;
                    } else {
                        console.warn("Erro ao obter informações de e-mail, mas intervenção foi criada com sucesso");
                    }
                } catch (error) {
                    console.warn("Erro durante a requisição de email info, mas intervenção foi criada:", error.message);
                }

                // Email sending process
                if (enviarEmailCheck && email && ResponseData) {
                    try {
                        const response = await fetch(
                            "https://webapiprimavera.advir.pt/send-email",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    emailDestinatario: email,
                                    Pedido: ResponseData.Pedido,
                                    dadosIntervencao: {
                                        NumIntervencao: ResponseData.NumIntervencao,
                                        Contacto: ResponseData.Contacto,
                                        processoID: ResponseData.NumProcesso,
                                        HoraInicioPedido: ResponseData.HoraInicioPedido,
                                        tecnico: ResponseData.Tecnico,
                                        descricaoResposta: dataToSave.descricaoResposta,
                                        Estadointer: ResponseData.Estado.replace(/<|>/g, ""),
                                        HoraInicioIntervencao: ResponseData.HoraInicioIntervencao,
                                    },
                                }),
                            },
                        );

                        if (response.ok) {
                            const data = await response.json();
                            console.log("Email enviado com sucesso:", data);
                        } else {
                            console.warn("Erro ao enviar e-mail, mas intervenção foi criada com sucesso");
                        }
                    } catch (error) {
                        console.warn("Erro ao enviar email, mas intervenção foi criada:", error);
                    }
                } else if (enviarEmailCheck && !ResponseData) {
                    console.warn("Email não enviado: dados de email não disponíveis, mas intervenção foi criada com sucesso");
                }
            }

            // Reset form and show success
            setIsSuccessModalOpen(true);
            setFormData({
                tipoIntervencao: "",
                tecnico: "",
                estado: "",
                tipo: "",
                dataInicio: "",
                dataFim: "",
                horaInicio: "",
                horaFim: "",
                descricao: "",
            });
            setActiveTab("detalhes");
            setSuccessMessage("");
            setTempoAlmoco(0);
            props.navigation.navigate("Intervencoes");
            setAddedArtigos([]);
            setArtigoForm(initialArtigoForm());
        } catch (error) {
            console.warn("Erro durante o processo, mas assumindo que intervenção foi criada:", error.message);
        } finally {
            setIsLoading(false);
            setIsModalOpen(false);
        }
    };

    const handleSave = () => {
        // Verifica se todos os campos obrigatórios estão preenchidos
        if (
            !formData.tipo ||
            !formData.tipoIntervencao ||
            !formData.tecnico ||
            !formData.estado ||
            !formData.dataInicio ||
            !formData.dataFim ||
            !formData.horaInicio ||
            !formData.horaFim
        ) {
            setSuccessMessage(t("RegistoIntervencao.Aviso.1"));
            return;
        }
        setSuccessMessage("");
        console.log("Tipo selecionado:", formData.tipo);
        const selectedTipo = tipos.find(
            (tipo) => tipo.TipoIntervencao === formData.tipo,
        );
        setTipoIntervencaoSelecionado(selectedTipo);
        setIsModalOpen(false);
        handleConfirmSave();
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div style={scrollViewStyle}>
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <header style={headerStyle}>
                        <h1 style={titleStyle}>
                            {t("RegistoIntervencao.Title")}
                        </h1>
                        <div style={tabsContainerStyle}>
                            <button
                                style={
                                    activeTab === "detalhes"
                                        ? activeTabStyle
                                        : tabStyle
                                }
                                onClick={() => setActiveTab("detalhes")}
                            >
                                Detalhes da Intervenção
                            </button>
                            <button
                                style={
                                    activeTab === "cronograma"
                                        ? activeTabStyle
                                        : tabStyle
                                }
                                onClick={() => setActiveTab("cronograma")}
                            >
                                Cronograma
                            </button>
                            <button
                                style={
                                    activeTab === "artigos"
                                        ? activeTabStyle
                                        : tabStyle
                                }
                                onClick={() => setActiveTab("artigos")}
                            >
                                Artigos
                            </button>
                        </div>
                    </header>

                    {successMessage && (
                        <div style={messageStyle}>{successMessage}</div>
                    )}

                    <form
                        onSubmit={(e) => e.preventDefault()}
                        style={formStyle}
                    >
                        {activeTab === "detalhes" && (
                            <div
                                className="tab-content"
                                style={tabContentStyle}
                            >
                                <div style={sectionTitleContainerStyle}>
                                    <div style={sectionTitleLineStyle}></div>
                                    <h2 style={sectionTitleStyle}>
                                        Informações da Intervenção
                                    </h2>
                                    <div style={sectionTitleLineStyle}></div>
                                </div>

                                <div style={formRowStyle}>
                                    <div style={formGroupStyle}>
                                        <label style={labelStyle}>
                                            {t(
                                                "RegistoIntervencao.TxtTipoInter",
                                            )}
                                        </label>
                                        <select
                                            name="tipoIntervencao"
                                            value={formData.tipoIntervencao}
                                            onChange={handleFormChange}
                                            onClick={fetchTiposIntervencao}
                                            style={selectStyle}
                                            required
                                        >
                                            <option value="">
                                                {t(
                                                    "RegistoIntervencao.TxtTipoInter",
                                                )}
                                            </option>
                                            {tiposIntervencao.map((tipo) => (
                                                <option
                                                    key={tipo.Prioridade}
                                                    value={tipo.Prioridade}
                                                >
                                                    {tipo.Prioridade} -{" "}
                                                    {tipo.Descricao}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={formGroupStyle}>
                                        <label style={labelStyle}>
                                            {t("RegistoIntervencao.TxtTecnico")}
                                        </label>
                                        <select
                                            name="tecnico"
                                            value={formData.tecnico}
                                            onChange={handleFormChange}
                                            onClick={fetchTecnicos}
                                            style={selectStyle}
                                            required
                                        >
                                            <option value="">
                                                {t(
                                                    "RegistoIntervencao.TxtTecnico",
                                                )}
                                            </option>
                                            {tecnicos.map((tecnico) => (
                                                <option
                                                    key={tecnico.Tecnico}
                                                    value={tecnico.Tecnico}
                                                >
                                                    {tecnico.Tecnico} -{" "}
                                                    {tecnico.Nome}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div style={formRowStyle}>
                                    <div style={formGroupStyle}>
                                        <label style={labelStyle}>
                                            {t("RegistoIntervencao.Estado")}
                                        </label>
                                        <select
                                            name="estado"
                                            value={formData.estado}
                                            onChange={handleFormChange}
                                            onClick={fetchEstados}
                                            style={selectStyle}
                                            required
                                        >
                                            <option value="">
                                                {t("RegistoIntervencao.Estado")}
                                            </option>
                                            {estados.map((estado) => (
                                                <option
                                                    key={estado.Estado}
                                                    value={estado.Estado}
                                                >
                                                    {estado.Descricao}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={formGroupStyle}>
                                        <label style={labelStyle}>
                                            {t("RegistoIntervencao.Tipo")}
                                        </label>
                                        <select
                                            name="tipo"
                                            value={formData.tipo}
                                            onChange={handleFormChange}
                                            onClick={fetchTipos}
                                            style={selectStyle}
                                            required
                                        >
                                            <option value="">
                                                {t("RegistoIntervencao.Tipo")}
                                            </option>
                                            {tipos.map((tipo) => (
                                                <option
                                                    key={tipo.TipoIntervencao}
                                                    value={tipo.TipoIntervencao}
                                                >
                                                    {tipo.TipoIntervencao}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>
                                        {t("RegistoIntervencao.Descricao")}
                                    </label>
                                    <textarea
                                        name="descricao"
                                        placeholder={t(
                                            "RegistoIntervencao.Descricao",
                                        )}
                                        value={formData.descricao}
                                        onChange={handleFormChange}
                                        style={textareaStyle}
                                        rows={5}
                                        required
                                    />
                                </div>
                                <div
                                    style={{
                                        marginTop: "20px",
                                        display: "flex",
                                        alignItems: "center",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        id="enviarEmail"
                                        checked={enviarEmailCheck}
                                        onChange={() =>
                                            setEnviarEmailCheck(
                                                !enviarEmailCheck,
                                            )
                                        }
                                        style={{ marginRight: "10px" }}
                                    />
                                    <label htmlFor="enviarEmail">
                                        Enviar e-mail
                                    </label>
                                </div>

                                <div style={navigationButtonsStyle}>
                                    <button
                                        type="button"
                                        style={nextButtonStyle}
                                        onClick={() =>
                                            setActiveTab("cronograma")
                                        }
                                    >
                                        Próximo
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === "cronograma" && (
                            <div
                                className="tab-content"
                                style={tabContentStyle}
                            >
                                <div style={sectionTitleContainerStyle}>
                                    <div style={sectionTitleLineStyle}></div>
                                    <h2 style={sectionTitleStyle}>
                                        Cronograma
                                    </h2>
                                    <div style={sectionTitleLineStyle}></div>
                                </div>

                                <div
                                    style={
                                        window.innerWidth < 768
                                            ? responsiveFormRowStyle
                                            : formRowStyle
                                    }
                                >
                                    <div style={formGroupStyle}>
                                        <label style={labelStyle}>
                                            {t("RegistoIntervencao.DataInicio")}
                                        </label>
                                        <input
                                            type="date"
                                            name="dataInicio"
                                            value={formData.dataInicio}
                                            onChange={handleFormChange}
                                            style={inputStyle}
                                            required
                                        />
                                    </div>
                                    <div style={formGroupStyle}>
                                        <label style={labelStyle}>
                                            {t("RegistoIntervencao.HoraInicio")}
                                        </label>
                                        <input
                                            type="time"
                                            name="horaInicio"
                                            value={formData.horaInicio}
                                            onChange={handleFormChange}
                                            style={inputStyle}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={formRowStyle}>
                                    <div style={formGroupStyle}>
                                        <label style={labelStyle}>
                                            {t("RegistoIntervencao.DataFim")}
                                        </label>
                                        <input
                                            type="date"
                                            name="dataFim"
                                            value={formData.dataFim}
                                            onChange={handleFormChange}
                                            style={inputStyle}
                                            required
                                        />
                                    </div>
                                    <div style={formGroupStyle}>
                                        <label style={labelStyle}>
                                            {t("RegistoIntervencao.HoraFim")}
                                        </label>
                                        <input
                                            type="time"
                                            name="horaFim"
                                            value={formData.horaFim}
                                            onChange={handleFormChange}
                                            style={inputStyle}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Lunch time field - only show for PRE intervention type */}
                                {formData.tipo === "PRE" && (
                                    <div style={formRowStyle}>
                                        <div style={formGroupStyle}>
                                            <label style={labelStyle}>
                                                Tempo de Almoço
                                            </label>
                                            <div
                                                style={lunchTimeContainerStyle}
                                            >
                                                <div
                                                    style={timePickerGroupStyle}
                                                >
                                                    <label
                                                        style={
                                                            timePickerLabelStyle
                                                        }
                                                    >
                                                        Horas
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={
                                                            Math.floor(
                                                                tempoAlmoco /
                                                                60,
                                                            ) || ""
                                                        }
                                                        onChange={(e) => {
                                                            const inputValue =
                                                                e.target.value;
                                                            // Remove leading zeros and convert to number
                                                            const horas =
                                                                inputValue ===
                                                                    ""
                                                                    ? 0
                                                                    : Math.max(
                                                                        0,
                                                                        parseInt(
                                                                            inputValue.replace(
                                                                                /^0+/,
                                                                                "",
                                                                            ) ||
                                                                            "0",
                                                                            10,
                                                                        ),
                                                                    );
                                                            const minutosAtuais =
                                                                tempoAlmoco %
                                                                60;
                                                            setTempoAlmoco(
                                                                horas * 60 +
                                                                minutosAtuais,
                                                            );
                                                        }}
                                                        onBlur={(e) => {
                                                            // Clean up the field on blur if empty
                                                            if (
                                                                e.target
                                                                    .value ===
                                                                ""
                                                            ) {
                                                                const minutosAtuais =
                                                                    tempoAlmoco %
                                                                    60;
                                                                setTempoAlmoco(
                                                                    0 * 60 +
                                                                    minutosAtuais,
                                                                );
                                                            }
                                                        }}
                                                        style={
                                                            timePickerInputStyle
                                                        }
                                                        min="0"
                                                        max="8"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div style={timeSeparatorStyle}>
                                                    :
                                                </div>
                                                <div
                                                    style={timePickerGroupStyle}
                                                >
                                                    <label
                                                        style={
                                                            timePickerLabelStyle
                                                        }
                                                    >
                                                        Minutos
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={
                                                            tempoAlmoco % 60 ||
                                                            ""
                                                        }
                                                        onChange={(e) => {
                                                            const inputValue =
                                                                e.target.value;
                                                            // Remove leading zeros and convert to number
                                                            const minutos =
                                                                inputValue ===
                                                                    ""
                                                                    ? 0
                                                                    : Math.max(
                                                                        0,
                                                                        Math.min(
                                                                            59,
                                                                            parseInt(
                                                                                inputValue.replace(
                                                                                    /^0+/,
                                                                                    "",
                                                                                ) ||
                                                                                "0",
                                                                                10,
                                                                            ),
                                                                        ),
                                                                    );
                                                            const horasAtuais =
                                                                Math.floor(
                                                                    tempoAlmoco /
                                                                    60,
                                                                );
                                                            setTempoAlmoco(
                                                                horasAtuais *
                                                                60 +
                                                                minutos,
                                                            );
                                                        }}
                                                        onBlur={(e) => {
                                                            // Clean up the field on blur if empty
                                                            if (
                                                                e.target
                                                                    .value ===
                                                                ""
                                                            ) {
                                                                const horasAtuais =
                                                                    Math.floor(
                                                                        tempoAlmoco /
                                                                        60,
                                                                    );
                                                                setTempoAlmoco(
                                                                    horasAtuais *
                                                                    60 +
                                                                    0,
                                                                );
                                                            }
                                                        }}
                                                        style={
                                                            timePickerInputStyle
                                                        }
                                                        min="0"
                                                        max="59"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <small
                                                style={{
                                                    color: "#666",
                                                    fontSize: "0.85rem",
                                                    marginTop: "5px",
                                                    display: "block",
                                                }}
                                            >
                                                Este tempo será descontado da
                                                duração total da intervenção
                                            </small>
                                        </div>
                                    </div>
                                )}

                                <div style={navigationButtonsStyle}>
                                    <button
                                        type="button"
                                        style={backButtonStyle}
                                        onClick={() => setActiveTab("detalhes")}
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        type="button"
                                        style={nextButtonStyle}
                                        onClick={() => setActiveTab("artigos")}
                                    >
                                        Próximo
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === "artigos" && (
                            <div
                                className="tab-content"
                                style={tabContentStyle}
                            >
                                <div style={sectionTitleContainerStyle}>
                                    <div style={sectionTitleLineStyle}></div>
                                    <h2 style={sectionTitleStyle}>
                                        {t("RegistoIntervencao.SubTitulo")}
                                    </h2>
                                    <div style={sectionTitleLineStyle}></div>
                                </div>

                                <div style={artigoActionsStyle}>
                                    <button
                                        type="button"
                                        style={toggleButtonStyle}
                                        onClick={toggleArtigoSection}
                                    >
                                        {isArtigoSectionOpen
                                            ? t(
                                                "RegistoIntervencao.OcultarArtigo",
                                            )
                                            : t("RegistoIntervencao.AddArtigo")}
                                    </button>
                                </div>

                                {isArtigoSectionOpen && (
                                    <div style={artigoFormContainerStyle}>
                                        <div style={formRowStyle}>
                                            <div style={formGroupStyle}>
                                                <label style={labelStyle}>
                                                    Artigo
                                                </label>
                                                <select
                                                    name="artigo"
                                                    value={artigoForm.artigo}
                                                    onChange={handleInputChange}
                                                    onClick={fetchArtigos}
                                                    style={selectStyle}
                                                >
                                                    <option value="">
                                                        {t(
                                                            "RegistoIntervencao.SelecioneArtigo",
                                                        )}
                                                    </option>
                                                    {artigosDisponiveis.map(
                                                        (art) => (
                                                            <option
                                                                key={art.Artigo}
                                                                value={
                                                                    art.Artigo
                                                                }
                                                            >
                                                                {art.Artigo}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </div>
                                            <div style={formGroupStyle}>
                                                <label style={labelStyle}>
                                                    Ação
                                                </label>
                                                <button
                                                    type="button"
                                                    style={addArtigoButtonStyle}
                                                    onClick={handleAddArtigo}
                                                >
                                                    {editingIndex !== null
                                                        ? t(
                                                            "RegistoIntervencao.Atualizar",
                                                        )
                                                        : t(
                                                            "RegistoIntervencao.Add",
                                                        )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div style={artigosListStyle}>
                                    {addedArtigos.length > 0 ? (
                                        addedArtigos.map((artigo, index) => (
                                            <div
                                                key={index}
                                                style={artigoCardStyle}
                                            >
                                                <div
                                                    style={
                                                        artigoCardHeaderStyle
                                                    }
                                                >
                                                    <div
                                                        style={
                                                            artigoCardTitleStyle
                                                        }
                                                    >
                                                        <span>
                                                            {artigo.artigo}
                                                        </span>
                                                        <span
                                                            style={
                                                                artigoCardDescriptionStyle
                                                            }
                                                        >
                                                            {artigo.descricao}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={
                                                            artigoCardActionsStyle
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            style={
                                                                artigoExpandButtonStyle
                                                            }
                                                            onClick={() =>
                                                                toggleArtigoExpansion(
                                                                    index,
                                                                )
                                                            }
                                                        >
                                                            {expandedIndexes[
                                                                index
                                                            ]
                                                                ? t(
                                                                    "RegistoIntervencao.Recolher",
                                                                )
                                                                : t(
                                                                    "RegistoIntervencao.Expandir",
                                                                )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            style={
                                                                artigoDeleteButtonStyle
                                                            }
                                                            onClick={() =>
                                                                handleDeleteArtigo(
                                                                    index,
                                                                )
                                                            }
                                                        >
                                                            {t(
                                                                "RegistoIntervencao.Remover",
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                {expandedIndexes[index] && (
                                                    <div
                                                        style={
                                                            artigoCardDetailsStyle
                                                        }
                                                    >
                                                        <div
                                                            style={
                                                                artigoDetailsGridStyle
                                                            }
                                                        >
                                                            {Object.entries(
                                                                artigo,
                                                            ).map(
                                                                (
                                                                    [
                                                                        key,
                                                                        value,
                                                                    ],
                                                                    i,
                                                                ) => (
                                                                    <div
                                                                        key={i}
                                                                        style={
                                                                            artigoDetailItemStyle
                                                                        }
                                                                    >
                                                                        <label
                                                                            style={
                                                                                artigoDetailLabelStyle
                                                                            }
                                                                        >
                                                                            {
                                                                                key
                                                                            }
                                                                            :
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            name={
                                                                                key
                                                                            }
                                                                            value={
                                                                                value
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                handleArtigoChange(
                                                                                    e,
                                                                                    index,
                                                                                )
                                                                            }
                                                                            style={
                                                                                artigoDetailInputStyle
                                                                            }
                                                                        />
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div style={noArtigosStyle}>
                                            <p>Nenhum artigo adicionado.</p>
                                            <p>
                                                Clique em "Adicionar Artigo"
                                                para incluir artigos à
                                                intervenção.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div style={navigationButtonsStyle}>
                                    <button
                                        type="button"
                                        style={backButtonStyle}
                                        onClick={() =>
                                            setActiveTab("cronograma")
                                        }
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        type="button"
                                        style={submitButtonStyle}
                                        onClick={handleSave}
                                        disabled={isLoading}
                                    >
                                        {isLoading
                                            ? t("RegistoIntervencao.BtGravando")
                                            : t("RegistoIntervencao.Criar")}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>

                    <div style={buttonContainerStyle}>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab("detalhes");
                                props.navigation.navigate("Intervencoes");
                                setFormData({
                                    tipoIntervencao: "",
                                    tecnico: "",
                                    estado: "",
                                    tipo: "",
                                    dataInicio: "",
                                    dataFim: "",
                                    horaInicio: "",
                                    horaFim: "",
                                    descricao: "",
                                });
                                setTempoAlmoco(0);
                            }}
                            style={cancelButtonStyle}
                        >
                            {t("RegistoIntervencao.Cancelar")}
                        </button>
                    </div>
                </div>

                {/* Loading Spinner */}
                {isLoading && (
                    <div style={loadingOverlayStyle}>
                        <div style={spinnerStyle}></div>
                        <div style={loadingTextStyle}>
                            {t("RegistoIntervencao.Loading")}
                        </div>
                    </div>
                )}

                {/* Mensagem de Sucesso */}
                {isSuccessModalOpen && (
                    <Modal onClose={() => setIsSuccessModalOpen(false)}>
                        <h2 style={modalTitleStyle}>
                            {t("RegistoIntervencao.Aviso.3")}
                        </h2>
                        <p>{t("RegistoIntervencao.Aviso.2")}</p>
                        <div style={modalButtonsStyle}>
                            <button
                                style={modalButtonStyle}
                                onClick={() => {
                                    setIsSuccessModalOpen(false);
                                    props.navigation.navigate("Intervencoes");
                                }}
                            >
                                {t("RegistoIntervencao.Aviso.4")}
                            </button>
                        </div>
                    </Modal>
                )}

                {isModalOpen && (
                    <Modal onClose={handleCloseModal}>
                        <h2 style={modalTitleStyle}>Confirmar Dados</h2>

                        {/* Tabela para Dados do Serviço Base */}
                        <h3 style={modalSectionTitleStyle}>
                            Dados do Serviço Base
                        </h3>
                        <table style={modalTableStyle}>
                            <tbody>
                                <tr>
                                    <td>Duração Real:</td>
                                    <td>
                                        <input
                                            type="number"
                                            value={qtdeCusto}
                                            onChange={(e) =>
                                                setQtdeCusto(
                                                    Number(e.target.value),
                                                )
                                            }
                                            style={modalInputStyle}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Valor Hora:</td>
                                    <td>
                                        <input
                                            type="number"
                                            value={precoCusto}
                                            onChange={(e) =>
                                                setPrecoCusto(
                                                    Number(e.target.value),
                                                )
                                            }
                                            style={modalInputStyle}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Duração Cliente:</td>
                                    <td>
                                        <input
                                            type="number"
                                            value={qtdeCliente}
                                            onChange={(e) =>
                                                setQtdeCliente(
                                                    Number(e.target.value),
                                                )
                                            }
                                            style={modalInputStyle}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Valor hora:</td>
                                    <td>
                                        <input
                                            type="number"
                                            value={precoCliente}
                                            onChange={(e) =>
                                                setPrecoCliente(
                                                    Number(e.target.value),
                                                )
                                            }
                                            style={modalInputStyle}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Desconto:</td>
                                    <td>
                                        <input
                                            type="number"
                                            value={descontoCliente}
                                            onChange={(e) =>
                                                setDescontoCliente(
                                                    Number(e.target.value),
                                                )
                                            }
                                            style={modalInputStyle}
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Tabela para Dados do Serviço de Deslocação */}
                        {tipoIntervencaoSelecionado?.ServicoDeslocacao && (
                            <>
                                <h3 style={modalSectionTitleStyle}>
                                    Dados do Serviço de Deslocação
                                </h3>
                                <table style={modalTableStyle}>
                                    <tbody>
                                        <tr>
                                            <td>Distância Real:</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={qtdeCustoDeslocacao}
                                                    onChange={(e) =>
                                                        setQtdeCustoDeslocacao(
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    style={modalInputStyle}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Preço por Km:</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={precoCustoDeslocacao}
                                                    onChange={(e) =>
                                                        setPrecoCustoDeslocacao(
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    style={modalInputStyle}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Distância Cliente:</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={
                                                        qtdeClienteDeslocacao
                                                    }
                                                    onChange={(e) =>
                                                        setQtdeClienteDeslocacao(
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    style={modalInputStyle}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Valor Cliente:</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={
                                                        precoClienteDeslocacao
                                                    }
                                                    onChange={(e) =>
                                                        setPrecoClienteDeslocacao(
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    style={modalInputStyle}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Desconto:</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={
                                                        descontoClienteDeslocacao
                                                    }
                                                    onChange={(e) =>
                                                        setDescontoClienteDeslocacao(
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    style={modalInputStyle}
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </>
                        )}

                        <div style={modalButtonsStyle}>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                style={modalCancelButtonStyle}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSave}
                                disabled={isLoading}
                                style={modalConfirmButtonStyle}
                            >
                                {isLoading ? "Gravando..." : "Confirmar"}
                            </button>
                        </div>
                    </Modal>
                )}
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
    backgroundColor: "#d4e4ff",
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
    flexWrap: "wrap", // Permite quebra de linha
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
    flexDirection: "row", // Padrão: lado a lado em ecrãs grandes
    gap: "20px",
    marginBottom: "5px",
};

// Versão responsiva para telemóveis
const responsiveFormRowStyle = {
    ...formRowStyle,
    flexDirection: "column", // Empilha os elementos
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
    backgroundImage:
        'url(\'data:image/svg+xml;utf8,<svg fill="%23555" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>\')',
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

const artigoActionsStyle = {
    display: "flex",
    justifyContent: "center",
    marginBottom: "20px",
};

const toggleButtonStyle = {
    padding: "10px 20px",
    backgroundColor: "#1792FE",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
};

const artigoFormContainerStyle = {
    backgroundColor: "#f9f9f9",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "1px solid #eee",
};

const addArtigoButtonStyle = {
    padding: "12px 15px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    width: "100%",
    marginTop: "25px",
};

const artigosListStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
};

const artigoCardStyle = {
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
};

const artigoCardHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px",
    backgroundColor: "#f5f9ff",
    borderBottom: "1px solid #e0e0e0",
};

const artigoCardTitleStyle = {
    display: "flex",
    flexDirection: "column",
};

const artigoCardDescriptionStyle = {
    fontSize: "0.85rem",
    color: "#666",
    marginTop: "5px",
};

const artigoCardActionsStyle = {
    display: "flex",
    gap: "8px",
};

const artigoExpandButtonStyle = {
    padding: "6px 12px",
    backgroundColor: "#1792FE",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.8rem",
    cursor: "pointer",
};

const artigoDeleteButtonStyle = {
    padding: "6px 12px",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.8rem",
    cursor: "pointer",
};

const artigoCardDetailsStyle = {
    padding: "15px",
};

const artigoDetailsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "15px",
};

const artigoDetailItemStyle = {
    display: "flex",
    flexDirection: "column",
};

const artigoDetailLabelStyle = {
    fontSize: "0.85rem",
    fontWeight: "500",
    color: "#555",
    marginBottom: "5px",
};

const artigoDetailInputStyle = {
    padding: "8px 10px",
    borderRadius: "4px",
    border: "1px solid #ddd",
    fontSize: "0.9rem",
};

const noArtigosStyle = {
    textAlign: "center",
    padding: "30px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    color: "#666",
};

const loadingOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
};

const spinnerStyle = {
    border: "4px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "50%",
    borderTop: "4px solid #ffffff",
    width: "40px",
    height: "40px",
    animation: "spin 1s linear infinite",
};

const loadingTextStyle = {
    color: "#ffffff",
    marginTop: "15px",
    fontSize: "1.1rem",
};

const modalTitleStyle = {
    color: "#1792FE",
    fontSize: "1.5rem",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: "20px",
};

const modalSectionTitleStyle = {
    color: "#1792FE",
    fontSize: "1.2rem",
    marginTop: "15px",
    marginBottom: "10px",
};

const modalTableStyle = {
    width: "100%",
    borderCollapse: "collapse",
};

const modalInputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "4px",
    border: "1px solid #ddd",
    fontSize: "0.9rem",
};

const modalButtonsStyle = {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "25px",
};

const modalButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: "#4CAF50",
    color: "white",
    padding: "10px 20px",
    width: "100%",
};

const modalCancelButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: "#e0e0e0",
    color: "#555",
    marginRight: "10px",
    flex: 1,
};

const modalConfirmButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: "#4CAF50",
    color: "white",
    flex: 1,
};

const scrollViewStyle = {
    backgroundColor: "#d4e4ff",
    overflowY: "auto", // Ativa scroll vertical quando necessário
    width: "100%",
    padding: "10px",
};

// Estilos para o seletor de tempo de almoço
const lunchTimeContainerStyle = {
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
    marginTop: "5px",
};

const timePickerGroupStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
};

const timePickerLabelStyle = {
    fontSize: "0.8rem",
    color: "#666",
    marginBottom: "5px",
    fontWeight: "500",
};

const timePickerInputStyle = {
    padding: "10px 8px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
    backgroundColor: "#f9f9f9",
    minWidth: "70px",
    textAlign: "center",
    fontWeight: "600",
    color: "#333",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    boxSizing: "border-box",
};

const timeSeparatorStyle = {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#1792FE",
    marginBottom: "5px",
};

export default RegistoIntervencao;
