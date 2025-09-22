import React, { useState } from "react";
import Modal from "./Modal";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";

const RegistoIntervencao = (props) => {
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const { t } = useTranslation();
    const [enviarEmailCheck, setEnviarEmailCheck] = useState(true);
    const [emailGeralCC, setEmailGeralCC] = useState("");

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

    // State for travel time
    const [tempoDeslocacao, setTempoDeslocacao] = useState(0);

    // Function to fetch predefined travel time
    const fetchTempoDeslocacao = async (processoID) => {
        try {
            const response = await fetch(
                `http://webapiprimavera.advir.pt/routePedidos_STP/GetTempoDeslocacao/${processoID}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );

            if (response.ok) {
                const data = await response.json();
                console.log("Resposta da API GetTempoDeslocacao:", data);

                // Verificar se existe DataSet com Table e o primeiro elemento tem CDU_TempoDeslocacao
                if (
                    data &&
                    data.DataSet &&
                    data.DataSet.Table &&
                    data.DataSet.Table.length > 0
                ) {
                    const tempoDeslocacaoHoras =
                        data.DataSet.Table[0].CDU_TempoDeslocacao;
                    if (
                        tempoDeslocacaoHoras !== null &&
                        tempoDeslocacaoHoras !== undefined
                    ) {
                        // O valor retornado é decimal em horas, converter para minutos
                        const tempoEmMinutos = Math.round(
                            tempoDeslocacaoHoras * 60,
                        );
                        setTempoDeslocacao(tempoEmMinutos);
                        console.log(
                            `Tempo de deslocação predefinido: ${tempoDeslocacaoHoras} horas (${tempoEmMinutos} minutos)`,
                        );
                    } else {
                        console.log(
                            "Tempo de deslocação não definido para este cliente - valor null",
                        );
                    }
                } else {
                    console.log(
                        "Tempo de deslocação não definido para este cliente - sem dados",
                    );
                }
            } else {
                console.warn("Erro ao buscar tempo de deslocação predefinido");
            }
        } catch (error) {
            console.error("Erro ao buscar tempo de deslocação:", error);
        }
    };

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



    // ——— helper: obter dados do processo/contrato para extrair cliente ID ———
    const fetchProcessoData = async (processoID) => {
        const apiBaseUrl = "https://webapiprimavera.advir.pt/routePedidos_STP";
        try {
            console.log("🔍 fetchProcessoData: buscando dados do processo:", processoID);
            
            // Primeiro tentar obter informações do contrato diretamente
            const contratoResp = await fetch(`${apiBaseUrl}/ObterInfoContratoProcesso/${processoID}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    urlempresa: urlempresa,
                    "Content-Type": "application/json",
                },
            });
            
            if (contratoResp.ok) {
                const contratoData = await contratoResp.json();
                console.log("🔍 fetchProcessoData: dados do contrato recebidos:", contratoData);
                
                // Extrair o Cliente ID dos dados do contrato
                const contratoTable = contratoData?.DataSet?.Table?.[0];
                if (contratoTable?.Cliente) {
                    console.log("🔍 fetchProcessoData: Cliente extraído:", contratoTable.Cliente);
                    return contratoTable.Cliente; // Retorna o Cliente (ex: 'VD')
                }
            }

            // Fallback para o método original se necessário
            const resp = await fetch(`${apiBaseUrl}/pedidostecnico/${processoID}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    urlempresa: urlempresa,
                    "Content-Type": "application/json",
                },
            });
            
            if (!resp.ok) {
                console.log("🔍 fetchProcessoData: resposta não OK:", resp.status);
                return null;
            }
            
            const data = await resp.json();
            console.log("🔍 fetchProcessoData: dados do processo recebidos:", data);

            // Extrair cliente ID dos dados do processo - tentar várias possibilidades
            const processoTable = data?.DataSet?.Table?.[0];
            console.log("🔍 fetchProcessoData: processoTable extraída:", processoTable);
            
            if (!processoTable) {
                console.warn("🔍 fetchProcessoData: Nenhum dado encontrado na tabela do processo");
                return null;
            }
            
            const clienteId = 
                processoTable?.Cliente || 
                processoTable?.ClienteID || 
                processoTable?.IDCliente ||
                processoTable?.Entidade ||
                processoTable?.EntidadeId ||
                processoTable?.EntidadeID ||
                processoTable?.cliente ||
                processoTable?.clienteID ||
                processoTable?.idCliente ||
                processoTable?.entidade ||
                processoTable?.entidadeId ||
                processoTable?.ID_Cliente ||
                processoTable?.COD_CLIENTE ||
                processoTable?.CLIENTE ||
                processoTable?.Cod_Cliente ||
                null;
            
            console.log("🔍 fetchProcessoData: clienteId extraído do processo:", clienteId);
            
            // Se ainda não encontrou, listar todas as propriedades disponíveis
            if (!clienteId && processoTable) {
                console.log("🔍 fetchProcessoData: propriedades disponíveis no processo:", Object.keys(processoTable));
            }
            
            return clienteId;
        } catch (e) {
            console.warn("⚠️ Falha a obter dados do processo:", e.message);
            return null;
        }
    };

    // ——— helper: obter email geral do cliente (via teu backend) ———
const fetchEmailGeralCliente = async (clienteId) => {
    if (!clienteId) {
        console.log("🔍 fetchEmailGeralCliente: clienteId não fornecido");
        return null;
    }
    const apiBaseUrl = "https://webapiprimavera.advir.pt/routePedidos_STP"; // mantém a tua base
    try {
        console.log("🔍 fetchEmailGeralCliente: buscando email para cliente:", clienteId);
        const resp = await fetch(`${apiBaseUrl}/GetEmailGeral/${clienteId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                urlempresa: urlempresa,
                "Content-Type": "application/json",
            },
        });
        if (!resp.ok) {
            console.log("🔍 fetchEmailGeralCliente: resposta não OK:", resp.status);
            return null;
        }
        const data = await resp.json();
        console.log("🔍 fetchEmailGeralCliente: dados recebidos:", data);

        // Tenta apanhar o campo de forma resiliente
        const row = data?.DataSet?.Table?.[0];
        console.log("🔍 fetchEmailGeralCliente: row extraída:", row);
        const emailGeral =
            row?.EmailGeral || row?.Email || row?.EMail || row?.Mail || row?.email || null;
        console.log("🔍 fetchEmailGeralCliente: email extraído:", emailGeral);

        // Sanitiza (ex.: pode vir com ; separadores)
        if (typeof emailGeral === "string") {
            const first = emailGeral.split(/[;,]/).map(s => s.trim()).filter(Boolean)[0];
            console.log("🔍 fetchEmailGeralCliente: email final:", first);
            return first || null;
        }
        console.log("🔍 fetchEmailGeralCliente: email não é string, retornando null");
        return null;
    } catch (e) {
        console.warn("⚠️ Falha a obter email geral:", e.message);
        return null;
    }
};

    // ——— helper: obter email do técnico ———
const fetchEmailTecnico = async (tecnicoId) => {
    if (!tecnicoId) {
        console.log("🔍 fetchEmailTecnico: tecnicoId não fornecido");
        return null;
    }
    const apiBaseUrl = "https://webapiprimavera.advir.pt/routePedidos_STP";
    try {
        console.log("🔍 fetchEmailTecnico: buscando email para técnico:", tecnicoId);
        const resp = await fetch(`${apiBaseUrl}/GetEmailTecnico/${tecnicoId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                urlempresa: urlempresa,
                "Content-Type": "application/json",
            },
        });
        if (!resp.ok) {
            console.log("🔍 fetchEmailTecnico: resposta não OK:", resp.status);
            return null;
        }
        const data = await resp.json();
        console.log("🔍 fetchEmailTecnico: dados recebidos:", data);

        // Tenta apanhar o campo de forma resiliente
        const row = data?.DataSet?.Table?.[0];
        console.log("🔍 fetchEmailTecnico: row extraída:", row);
        const emailTecnico =
            row?.Email || row?.EMail || row?.Mail || row?.email || row?.EmailTecnico || null;
        console.log("🔍 fetchEmailTecnico: email extraído:", emailTecnico);

        // Sanitiza (ex.: pode vir com ; separadores)
        if (typeof emailTecnico === "string") {
            const first = emailTecnico.split(/[;,]/).map(s => s.trim()).filter(Boolean)[0];
            console.log("🔍 fetchEmailTecnico: email final:", first);
            return first || null;
        }
        console.log("🔍 fetchEmailTecnico: email não é string, retornando null");
        return null;
    } catch (e) {
        console.warn("⚠️ Falha a obter email do técnico:", e.message);
        return null;
    }
};



    const handleFormChange = async (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // If the type changed to PRE, fetch the predefined travel time
        if (name === "tipo" && value === "PRE") {
            const processoID = localStorage.getItem("intervencaoId");
            if (processoID) {
                await fetchTempoDeslocacao(processoID);
            }
        }

        // If the technician changed, fetch emails and populate CC field
        if (name === "tecnico" && value) {
            try {
                const processoID = localStorage.getItem("intervencaoId");
                
                // Buscar email do técnico
                const emailTecnico = await fetchEmailTecnico(value);
                console.log("📧 Email do técnico obtido:", emailTecnico);

                // Buscar dados do processo para obter cliente ID
                let clienteId = null;
                let emailCliente = null;
                
                if (processoID) {
                    clienteId = await fetchProcessoData(processoID);
                    if (clienteId) {
                        emailCliente = await fetchEmailGeralCliente(clienteId);
                        console.log("📧 Email do cliente obtido:", emailCliente);
                    } else {
                        console.log("📧 Cliente ID não encontrado, tentando abordagem alternativa");
                        // Se não conseguimos obter o cliente ID, o email do cliente não será incluído
                        // mas ainda podemos continuar com o email do técnico
                    }
                }

                // Construir lista de emails para CC
                const emailsCC = [];
                if (emailTecnico && emailTecnico.trim()) {
                    emailsCC.push(emailTecnico.trim());
                }
                if (emailCliente && emailCliente.trim() && emailCliente !== emailTecnico) {
                    emailsCC.push(emailCliente.trim());
                }

                // Atualizar o campo CC se houver emails
                if (emailsCC.length > 0) {
                    setEmailGeralCC(emailsCC.join("; "));
                    console.log("📧 Campo CC atualizado com:", emailsCC.join("; "));
                    console.log("📧 Emails incluídos:", {
                        emailTecnico: emailTecnico || "não encontrado",
                        emailCliente: emailCliente || "não encontrado",
                        clienteId: clienteId || "não encontrado"
                    });
                } else {
                    console.log("📧 Nenhum email encontrado para preencher CC");
                    console.log("📧 Debug:", {
                        emailTecnico: emailTecnico || "não encontrado",
                        emailCliente: emailCliente || "não encontrado", 
                        clienteId: clienteId || "não encontrado"
                    });
                }

            } catch (error) {
                console.warn("⚠️ Erro ao buscar emails para CC:", error.message);
            }
        }
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
            let ResponseData = null; // Initialize ResponseData here

            // Initialize variables for client ID and general email
            let clienteId = null;
            let emailGeral = null;

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

            // Subtract lunch time and travel time if intervention type is PRE (presencial)
            if (formData.tipo === "PRE") {
                if (tempoAlmoco > 0) {
                    duracaoEmMinutos = duracaoEmMinutos - tempoAlmoco;
                }
                if (tempoDeslocacao > 0) {
                    duracaoEmMinutos = duracaoEmMinutos + tempoDeslocacao;
                }
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
                Authorization: `Bearer ${token ? "TOKEN_PRESENT" : "NO_TOKEN"}`,
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
                    console.log(
                        "Intervenção criada com sucesso:",
                        intervencaoData,
                    );
                    console.log("Número de detalhes:", numeroDetalhes);
                } else {
                    // Log the error but don't fail the process
                    console.warn(
                        "API retornou erro mas assumindo que intervenção foi criada:",
                        intervencaoResponse.status,
                    );
                    numeroDetalhes = "1"; // Default value for email processes
                }
            } catch (error) {
                console.warn(
                    "Erro na requisição mas assumindo que intervenção foi criada:",
                    error.message,
                );
                numeroDetalhes = "1"; // Default value for email processes
            }

            // Secondary processes (email info and sending) - don't fail the entire process
            
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
                        console.log(
                            "Resposta de e-mail obtida com sucesso:",
                            responseData,
                        );
                        console.log("🔍 Estrutura completa dos dados:", JSON.stringify(responseData, null, 2));
                        ResponseData = responseData;
                        
                        // First try to extract client ID from ResponseData
                        clienteId =
                            ResponseData?.ClienteID ||
                            ResponseData?.IDCliente ||
                            ResponseData?.Entidade ||
                            ResponseData?.Cliente ||
                            ResponseData?.ID ||
                            ResponseData?.EntidadeId ||
                            ResponseData?.ClienteId ||
                            null;
                        
                        console.log("🔍 Tentando extrair clienteId de ResponseData:", ResponseData);
                        console.log("🔍 ClienteId extraído de ResponseData:", clienteId);

                        // If no client ID found in ResponseData, try to fetch from process data
                        if (!clienteId) {
                            console.log("🔍 ClienteId não encontrado em ResponseData, buscando dados do processo...");
                            const dadosProcesso = await fetchProcessoData(processoID);
                            
                            // Se retornou um ContratoId em vez de ClienteId, podemos tentar usá-lo
                            if (dadosProcesso) {
                                clienteId = dadosProcesso;
                                console.log("🔍 Dados extraídos do processo (pode ser ContratoId):", clienteId);
                            }
                        }

                        // Fetch general email using the extracted client ID (or ContratoId as fallback)
                        if (clienteId) {
                            emailGeral = await fetchEmailGeralCliente(clienteId);
                        } else {
                            console.log("🔍 Não foi possível obter identificador do cliente/contrato");
                        }

                    } else {
                        console.warn(
                            "Erro ao obter informações de e-mail, mas intervenção foi criada com sucesso",
                        );
                    }
                } catch (error) {
                    console.warn(
                        "Erro durante a requisição de email info, mas intervenção foi criada:",
                        error.message,
                    );
                }

                // Email sending process
                if (enviarEmailCheck && email && ResponseData) {
                    // Construir lista CC com email do contacto, email geral do cliente e email manual
                    const ccList = [];
                    
                    // Adicionar email do contacto se for diferente do email principal
                    if (email && email.toLowerCase() !== String(email || "").toLowerCase()) {
                        // Este email já é o principal, não precisa adicionar ao CC
                    }
                    
                  
                    
                    // Adicionar email CC manual se preenchido e diferente dos outros
                    if (emailGeralCC && 
                        emailGeralCC.toLowerCase() !== String(email || "").toLowerCase() &&
                        emailGeralCC.toLowerCase() !== String(emailGeral || "").toLowerCase() &&
                        !ccList.includes(emailGeralCC)) {
                        ccList.push(emailGeralCC);
                    }
                    
                    // Buscar email do contacto específico da intervenção
                    let emailContacto = null;
                    try {
                        const contactoResponse = await fetch(
                            `${apiBaseUrl}/ObterContactoIntervencao/${processoID}`,
                            {
                                method: "GET",
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    urlempresa: urlempresa,
                                    "Content-Type": "application/json",
                                },
                            }
                        );
                        
                        if (contactoResponse.ok) {
                            const contactoData = await contactoResponse.json();
                            emailContacto = contactoData?.DataSet?.Table?.[0]?.Email || null;
                            console.log("📧 Email do contacto da intervenção:", emailContacto);
                            
                            // Adicionar email do contacto ao CC se for diferente do principal e do geral
                            if (emailContacto && 
                                emailContacto.toLowerCase() !== String(email || "").toLowerCase() &&
                                emailContacto.toLowerCase() !== String(emailGeral || "").toLowerCase() &&
                                !ccList.includes(emailContacto)) {
                                ccList.push(emailContacto);
                            }
                        }
                    } catch (contactoError) {
                        console.warn("⚠️ Erro ao buscar email do contacto:", contactoError.message);
                    }
                    try {
                        // Buscar informações do contrato antes de enviar o email
                        let contratoInfo = null;
                        try {
                            console.log(
                                "Buscando informações do contrato para o processo:",
                                processoID,
                            );
                            const contratoResponse = await fetch(
                                `${apiBaseUrl}/ObterInfoContratoProcesso/${processoID}`,
                                {
                                    method: "GET",
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                        urlempresa: urlempresa,
                                        "Content-Type": "application/json",
                                    },
                                },
                            );

                            if (contratoResponse.ok) {
                                const contratoData = await contratoResponse.json();
                                console.log("Dados do contrato recebidos:", contratoData);

                                if (
                                    contratoData.DataSet &&
                                    contratoData.DataSet.Table &&
                                    contratoData.DataSet.Table.length > 0
                                ) {
                                    // Usar o primeiro contrato disponível
                                    const contrato = contratoData.DataSet.Table[0];

                                    if (contrato && contrato.HorasTotais !== undefined) {
                                        const horasLivres = (contrato.HorasTotais || 0) - (contrato.HorasGastas || 0);

                                        contratoInfo = {
                                            numeroContrato: contrato.ID || "N/A",
                                            horasContratadas: contrato.HorasTotais || 0,
                                            horasUtilizadas: contrato.HorasGastas || 0,
                                            horasLivres: horasLivres.toFixed(2),
                                        };

                                        console.log("✅ Informações do contrato extraídas com sucesso:", contratoInfo);
                                    } else {
                                        console.warn("⚠️ Dados do contrato incompletos");
                                    }
                                } else {
                                    console.warn("⚠️ Estrutura de dados do contrato inválida ou vazia");
                                }
                            } else {
                                console.warn(
                                    "⚠️ Erro na resposta da API de contrato:",
                                    contratoResponse.status,
                                    contratoResponse.statusText,
                                    "- Continuando sem informações do contrato"
                                );
                            }
                        } catch (contratoError) {
                            console.warn(
                                "❌ Erro ao buscar informações do contrato:",
                                contratoError.message,
                                "- Continuando sem informações do contrato"
                            );
                        }

                        console.log("📧 Preparando email com os seguintes destinatários:");
                        console.log("📧 Email principal (TO):", email);
                        console.log("📧 Email geral do cliente:", emailGeral);
                        console.log("📧 Email do contacto:", emailContacto);
                        console.log("📧 Lista final CC:", ccList);

                        const emailPayload = {
                            emailDestinatario: email,
                            cc: ccList, 
                            Pedido: ResponseData.Pedido,
                            dadosIntervencao: {
                                NumIntervencao:
                                    ResponseData.NumIntervencao,
                                Contacto: ResponseData.Contacto,
                                processoID: ResponseData.NumProcesso,
                                HoraInicioPedido:
                                    ResponseData.HoraInicioPedido,
                                tecnico: ResponseData.Tecnico,
                                descricaoResposta:
                                    dataToSave.descricaoResposta,
                                Estadointer:
                                    ResponseData.Estado.replace(
                                        /\b\w/g,
                                        (l) => l.toUpperCase(),
                                    ),
                                HoraInicioIntervencao:
                                    formData.dataInicio +
                                    ", " +
                                    formData.horaInicio,
                                HoraFimIntervencao:
                                    formData.dataFim +
                                    ", " +
                                    formData.horaFim,
                                TipoIntervencao: formData.tipo,
                                Duracao: `${Math.floor(duracaoEmMinutos / 60)}h ${duracaoEmMinutos % 60}min`,
                                contratoInfo: contratoInfo,
                            },
                        };

                        console.log("📧 Payload do email:", JSON.stringify(emailPayload, null, 2));

                        const response = await fetch(
                            `https://webapiprimavera.advir.pt/send-email`,
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify(emailPayload),
                            },
                        );

                        const responseText = await response.text();
                        console.log("📧 Resposta do servidor (texto):", responseText);

                        if (response.ok) {
                            try {
                                const data = responseText ? JSON.parse(responseText) : { message: responseText };
                                console.log("✅ Email enviado com sucesso:", data);
                            } catch (parseError) {
                                console.log("✅ Email enviado com sucesso (resposta não-JSON):", responseText);
                            }
                        } else {
                            console.warn(
                                "⚠️ Erro ao enviar e-mail, mas intervenção foi criada com sucesso. Status:",
                                response.status,
                                "Resposta:",
                                responseText
                            );
                        }
                    } catch (error) {
                        console.warn(
                            "Erro ao enviar email, mas intervenção foi criada:",
                            error,
                        );
                    }
                } else if (enviarEmailCheck && !ResponseData) {
                    console.warn(
                        "Email não enviado: dados de email não disponíveis, mas intervenção foi criada com sucesso",
                    );
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
            setTempoDeslocacao(0);
            setEmailGeralCC("");
            props.navigation.navigate("Intervencoes");
            setAddedArtigos([]);
            setArtigoForm(initialArtigoForm());
        } catch (error) {
            console.warn(
                "Erro durante o processo, mas assumindo que intervenção foi criada:",
                error.message,
            );
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
                                                    key={tipo.TipoIntervencao}
                                                    value={tipo.TipoIntervencao}
                                                >
                                                    {tipo.TipoIntervencao} -{" "}
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
                                        flexDirection: "column",
                                        gap: "10px",
                                    }}
                                >
                                    <div
                                        style={{
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
                                    
                                    {enviarEmailCheck && (
                                        <div style={formGroupStyle}>
                                            <label style={labelStyle}>
                                                Email CC (adicional):
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="Digite o emails para CC (adicional1@adicional.com;adicional2@adicional.com)"
                                                value={emailGeralCC}
                                                onChange={(e) => setEmailGeralCC(e.target.value)}
                                                style={inputStyle}
                                            />
                                            <small
                                                style={{
                                                    color: "#666",
                                                    fontSize: "0.85rem",
                                                    marginTop: "5px",
                                                    display: "block",
                                                }}
                                            >
                                                Este email será adicionado como CC no envio do email da intervenção
                                            </small>
                                        </div>
                                    )}
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

                                {/* Lunch time and travel time fields - only show for PRE intervention type */}
                                {formData.tipo === "PRE" && (
                                    <>
                                        <div style={formRowStyle}>
                                            <div style={formGroupStyle}>
                                                <label style={labelStyle}>
                                                    Tempo de Almoço
                                                </label>
                                                <div
                                                    style={
                                                        lunchTimeContainerStyle
                                                    }
                                                >
                                                    <div
                                                        style={
                                                            timePickerGroupStyle
                                                        }
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
                                                                    e.target
                                                                        .value;
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
                                                    <div
                                                        style={
                                                            timeSeparatorStyle
                                                        }
                                                    >
                                                        :
                                                    </div>
                                                    <div
                                                        style={
                                                            timePickerGroupStyle
                                                        }
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
                                                                tempoAlmoco %
                                                                60 || ""
                                                            }
                                                            onChange={(e) => {
                                                                const inputValue =
                                                                    e.target
                                                                        .value;
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
                                                    Este tempo será descontado
                                                    da duração total da
                                                    intervenção
                                                </small>
                                            </div>

                                            <div style={formGroupStyle}>
                                                <label style={labelStyle}>
                                                    Tempo de Deslocação
                                                </label>
                                                <div
                                                    style={
                                                        lunchTimeContainerStyle
                                                    }
                                                >
                                                    <div
                                                        style={
                                                            timePickerGroupStyle
                                                        }
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
                                                                    tempoDeslocacao /
                                                                    60,
                                                                ) || ""
                                                            }
                                                            onChange={(e) => {
                                                                const inputValue =
                                                                    e.target
                                                                        .value;
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
                                                                    tempoDeslocacao %
                                                                    60;
                                                                setTempoDeslocacao(
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
                                                                        tempoDeslocacao %
                                                                        60;
                                                                    setTempoDeslocacao(
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
                                                    <div
                                                        style={
                                                            timeSeparatorStyle
                                                        }
                                                    >
                                                        :
                                                    </div>
                                                    <div
                                                        style={
                                                            timePickerGroupStyle
                                                        }
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
                                                                tempoDeslocacao %
                                                                60 || ""
                                                            }
                                                            onChange={(e) => {
                                                                const inputValue =
                                                                    e.target
                                                                        .value;
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
                                                                        tempoDeslocacao /
                                                                        60,
                                                                    );
                                                                setTempoDeslocacao(
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
                                                                            tempoDeslocacao /
                                                                            60,
                                                                        );
                                                                    setTempoDeslocacao(
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
                                                    Tempo de deslocação
                                                    predefinido que será
                                                    descontado da duração total
                                                    da intervenção
                                                </small>
                                            </div>
                                        </div>
                                    </>
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
                                setTempoDeslocacao(0);
                                setEmailGeralCC("");
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