import React, { useState } from 'react';
import Modal from './Modal';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
const RegistoIntervencao = (props) => {

    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const { t } = useTranslation();

    const initialArtigoForm = () => ({
        artigo: '',
        descricao: '',
        unidade: '',
        armazem: '',
        localizacao: '',
        lote: '',
        qtd: '',
        custo: '',
        prCustoU: '',
        totCusto: '',
        qtdCliente: '',
        prClienteU: '',
        desc: '',
        totCliente: '',
        faturacao: '',
        doc: '',
    });
    const [formData, setFormData] = useState({
        tipoIntervencao: '',
        tecnico: '',
        estado: '',
        tipo: '',
        dataInicio: '',
        dataFim: '',
        horaInicio: '',
        horaFim: '',
        descricao: '',
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
    const [isLoading, setIsLoading] = useState(false); // Estado de loading
    const [successMessage, setSuccessMessage] = useState('');
    const token = localStorage.getItem('painelAdminToken');  // Usando localStorage para obter o token
    const empresaSelecionada = localStorage.getItem('empresaSelecionada'); // Recuperando empresa
    const urlempresa = localStorage.getItem('urlempresa'); // Recuperando urlempresa
    const [isModalOpen, setIsModalOpen] = useState(false); 

    const [qtdeCusto, setQtdeCusto] = useState(0);
    const [precoCusto, setPrecoCusto] = useState(0);
    const [qtdeCliente, setQtdeCliente] = useState(0);
    const [precoCliente, setPrecoCliente] = useState(0);
    const [descontoCliente, setDescontoCliente] = useState(0);

    // States for desloca��o service inputs
    const [qtdeCustoDeslocacao, setQtdeCustoDeslocacao] = useState(0);
    const [precoCustoDeslocacao, setPrecoCustoDeslocacao] = useState(0);
    const [qtdeClienteDeslocacao, setQtdeClienteDeslocacao] = useState(0);
    const [precoClienteDeslocacao, setPrecoClienteDeslocacao] = useState(0);
    const [descontoClienteDeslocacao, setDescontoClienteDeslocacao] = useState(0);

    // State for selected intervention type
    const [tipoIntervencaoSelecionado, setTipoIntervencaoSelecionado] = useState(null);

    const fetchTipos = async () => {
        try {
            const response = await fetch('https://webapiprimavera.advir.pt/routePedidos_STP/LstTiposIntervencao', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, // Passando o token no cabeçalho
                            'urlempresa': urlempresa, // Passando o urlempresa no cabeçalho
                            'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            setTipos(data.DataSet.Table);
        } catch (error) {
            console.error('Erro ao buscar tipos:', error);
        }
    };
    const fetchArtigos = async () => {
        try {
            const response = await fetch('https://webapiprimavera.advir.pt/routePedidos_STP/LstArtigos', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, // Passando o token no cabeçalho
                            'urlempresa': urlempresa, // Passando o urlempresa no cabeçalho
                            'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            setArtigosDisponiveis(data.DataSet.Table);
        } catch (error) {
            console.error('Erro ao buscar artigos:', error);
        }
    };
    const fetchTiposIntervencao = async () => {
        try {
            const response = await fetch('https://webapiprimavera.advir.pt/routePedidos_STP/ListarTiposPrioridades', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, // Passando o token no cabeçalho
                            'urlempresa': urlempresa, // Passando o urlempresa no cabeçalho
                            'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            setTiposIntervencao(data.DataSet.Table);
        } catch (error) {
            console.error('Erro ao buscar tipos de interven��o:', error);
        }
    };
    const fetchTecnicos = async () => {
        try {
            const response = await fetch('https://webapiprimavera.advir.pt/routePedidos_STP/LstTecnicosTodos', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, // Passando o token no cabeçalho
                            'urlempresa': urlempresa, // Passando o urlempresa no cabeçalho
                            'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            setTecnicos(data.DataSet.Table);
        } catch (error) {
            console.error('Erro ao buscar t�cnicos:', error);
        }
    };
    const fetchEstados = async () => {
        try {
            const response = await fetch('https://webapiprimavera.advir.pt/routePedidos_STP/LstEstadosTodos', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, // Passando o token no cabeçalho
                            'urlempresa': urlempresa, // Passando o urlempresa no cabeçalho
                            'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            setEstados(data.DataSet.Table);
        } catch (error) {
            console.error('Erro ao buscar estados:', error);
        }
    };

    const toggleArtigoExpansion = (index) => {
        setExpandedIndexes((prev) => ({
            ...prev,
            [index]: !prev[index], // Alterna entre expandir e recolher
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

        if (name === 'artigo') {
            const artigoSelecionado = artigosDisponiveis.find((art) => art.Artigo === value);
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
        console.log(formData);
    };
    const handleDeleteArtigo = (index) => {
        const updatedArtigos = addedArtigos.filter((_, i) => i !== index);
        setAddedArtigos(updatedArtigos);
        if (editingIndex === index) {
            setEditingIndex(null); // Reset editing index if the edited item is deleted
            setArtigoForm(initialArtigoForm()); // Reset form if the current item being edited is deleted
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
            const id = localStorage.getItem('intervencaoId');
            const processoID = id.toString();
            const apiBaseUrl = 'https://webapiprimavera.advir.pt/routePedidos_STP';
            let ultimoEstado;
            let secAnterior;
            let utilizador;
            let email;
            // Fetch the last state of the order
            try {
                const estadoResponse = await fetch(`${apiBaseUrl}/DaUltimoEstadoPedido/${processoID}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'urlempresa': urlempresa,
                        'Content-Type': 'application/json',
                    },
                });
                if (estadoResponse.ok) {
                    const estadoData = await estadoResponse.json();
                    ultimoEstado = estadoData.DataSet.Table[0]?.Estado || 1;
                } else {
                    console.warn('Último estado não encontrado, continuando com estado padrão 1');
                    ultimoEstado = 1;
                }
            } catch (error) {
                console.error('Erro ao buscar último estado do pedido:', error.message);
                ultimoEstado = 1;
            }
    
            try {
                const Response = await fetch(`${apiBaseUrl}/ListarSeccaoUtilizador/${processoID}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'urlempresa': urlempresa,
                        'Content-Type': 'application/json',
                    },
                });
                if (Response.ok) {
                    const estadoData = await Response.json();
                    secAnterior = estadoData.DataSet.Table[0]?.Seccao || 'PA';
                    utilizador = estadoData.DataSet.Table[0]?.Utilizador || 'Administrator';
                } else {
                    secAnterior = 'PA';
                    utilizador = 'Administrator';
                }
            } catch (error) {
                console.error('Erro ao buscar seção do utilizador:', error.message);
                secAnterior = 'PA';
                utilizador = 'Administrator';
            }
    
            // Calculate duration
            const dataHoraInicio = new Date(`${formData.dataInicio}T${formData.horaInicio}`);
            const dataHoraFim = new Date(`${formData.dataFim}T${formData.horaFim}`);
            const duracaoEmMinutos = Math.floor((dataHoraFim - dataHoraInicio) / (1000 * 60));



            try {
                // Making the API request
                const Emailresponse = await fetch(`${apiBaseUrl}/ObterContactoIntervencao/${processoID}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,  // Include the token if necessary
                        'urlempresa': urlempresa,
                        'Content-Type': 'application/json',
                    }
                });

                // Check if the response is successful
                if (!Emailresponse.ok) {
                    // Log the status code and status text for debugging
                    throw new Error(`Erro ao buscar dados: ${Emailresponse.status} - ${Emailresponse.statusText}`);
                }

                // Convert the response to JSON
                const data = await Emailresponse.json();

                // For example, check if the data contains a specific property
                if (data.DataSet && data.DataSet.Table) {
                    email = data.DataSet.Table[0].Email;
                    console.log("Email recebido: ", emailDestinatario);  // Verifique se está correto
                }


            } catch (error) {
                // Log any errors that occur during the fetch operation
                console.error('Erro ao fazer a requisição:', error.message);
            }

            // Calculate duration
           // const dataHoraInicio = new Date(`${formData.dataInicio}T${formData.horaInicio}`);
            //const dataHoraFim = new Date(`${formData.dataFim}T${formData.horaFim}`);
            //const duracaoEmMinutos = Math.floor((dataHoraFim - dataHoraInicio) / (1000 * 60));
            const duracaoRealEmHoras = Math.floor(duracaoEmMinutos / 60);

            // Add base article based on intervention type
            let artigoBase = null;
            const tipoIntervencaoSelecionado = tipos.find(tipo => tipo.TipoIntervencao === formData.tipo);

            const artigosAdicionados = [...addedArtigos]; // Clone the existing array

            if (tipoIntervencaoSelecionado) {
                // Create base article with selected intervention type properties
                artigoBase = {
                    artigo: tipoIntervencaoSelecionado.ServicoBase,
                    descricao: tipoIntervencaoSelecionado.Descricao,
                    ContabilizaMO: tipoIntervencaoSelecionado.ContabilizaMO,
                    TipoContabilizacao: tipoIntervencaoSelecionado.TipoContabilizacao,
                    TempoFixo: tipoIntervencaoSelecionado.TempoFixo,
                    TempoDebitoMin: tipoIntervencaoSelecionado.TempoDebitoMin,
                    TempoPeriodoSeg: tipoIntervencaoSelecionado.TempoPeriodoSeg,
                    ImplicaDeslocacoes: tipoIntervencaoSelecionado.ImplicaDeslocacoes,
                    ServicoDeslocacao: tipoIntervencaoSelecionado.ServicoDeslocacao,
                    ObrigaRegCaractVar: tipoIntervencaoSelecionado.ObrigaRegCaractVar,
                    qtdeCusto: qtdeCusto, // Using modal input value
                    precoCusto: precoCusto, // Using modal input value
                    qtdeCliente: qtdeCliente, // Using modal input value
                    precoCliente: precoCliente, // Using modal input value
                    descontoCliente: descontoCliente, // Using modal input value
                    
                };

                // If the transport service is not null, create an additional article
                if (tipoIntervencaoSelecionado.ServicoDeslocacao) {
                    const artigoDeslocacao = {
                        artigo: tipoIntervencaoSelecionado.ServicoDeslocacao,
                        descricao: "Descri��o do Servi�o de Desloca��o",
                        ContabilizaMO: false,
                        TipoContabilizacao: 0,
                        TempoFixo: 0,
                        TempoDebitoMin: 0,
                        TempoPeriodoSeg: 0,
                        ImplicaDeslocacoes: false,
                        ServicoDeslocacao: null,
                        ObrigaRegCaractVar: false,
                        qtdeCusto: qtdeCustoDeslocacao, // Using desloca��o modal input value
                        precoCusto: precoCustoDeslocacao, // Using desloca��o modal input value
                        qtdeCliente: qtdeClienteDeslocacao, // Using desloca��o modal input value
                        precoCliente: precoClienteDeslocacao, // Using desloca��o modal input value
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
                DataHoraInicio: dataHoraInicioFormatted, // Envia no formato correto
                DataHoraFim: dataHoraFimFormatted, // Envia no formato correto
                tecnico: formData.tecnico,
                estadoAnt: ultimoEstado.toString(),
                estado: formData.estado,
                seccaoAnt: secAnterior,
                seccao: secAnterior,
                utilizador: utilizador,
                descricaoResposta: formData.descricao || null,
                artigos: artigosAdicionados,
            };
            console.log(dataToSave);



            // Call the API to save the intervention
            const intervencaoResponse = await fetch(`${apiBaseUrl}/CriarIntervencoes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'urlempresa': urlempresa,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSave),
            });
    
            if (!intervencaoResponse.ok) {
                const errorData = await intervencaoResponse.json();
                throw new Error(errorData.error || 'Erro ao criar intervenção');
            }
    
            const intervencaoData = await intervencaoResponse.json();
            console.log('Sucesso:', intervencaoData);

            const numeroDetalhes = intervencaoData.detalhes;
            console.log('Número de detalhes:', numeroDetalhes);


            let ResponseData;
            // Realiza a chamada ao endpoint
            try {
                const emailResponse = await fetch(`${apiBaseUrl}/ObterInfoEmail/${processoID}/${numeroDetalhes}`, {
                    method: 'GET',  // Método GET, conforme sua rota no servidor
                    headers: {
                        'Authorization': `Bearer ${token}`, // Substitua pelo token de autenticação correto
                        'Content-Type': 'application/json', // Define o tipo de conteúdo
                        'urlempresa': urlempresa, // Substitua pelo valor correto ou configure o cabeçalho dinâmico
                    }
                });

                // Verifica se a resposta foi bem-sucedida
                if (emailResponse.ok) {
                    const responseData = await emailResponse.json();
                    console.log('Resposta de e-mail obtida com sucesso:', responseData);
                    ResponseData = responseData;  // Atribui corretamente a resposta
                } else {
                    console.error('Erro ao obter informações de e-mail:', emailResponse.status, await emailResponse.text());
                }
            } catch (error) {
                console.error('Erro durante a requisição:', error.message);
            }

            const enviarEmail = async () => {
                try {
                    const response = await fetch('https://webapiprimavera.advir.pt/send-email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
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
                                Estadointer: ResponseData.Estado.replace(/<|>/g, ''),
                                HoraInicioIntervencao: ResponseData.HoraInicioIntervencao,
                            },
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Erro ao enviar e-mail: ${response.status} - ${response.statusText}`);
                    }

                    const data = await response.json();
                    console.log('Email enviado com sucesso:', data);
                } catch (error) {
                    console.error('Erro:', error);
                }
            };

            // Chame a função para enviar o e-mail
            enviarEmail();

            
    
            // Reset form
            setIsSuccessModalOpen(true);
            setFormData({
                tipoIntervencao: '',
                tecnico: '',
                estado: '',
                tipo: '',
                dataInicio: '',
                dataFim: '',
                horaInicio: '',
                horaFim: '',
                descricao: '',
            });
            setAddedArtigos([]);
            setArtigoForm(initialArtigoForm());
        } catch (error) {
            console.error('Erro:', error.message);
            setSuccessMessage('Erro ao gravar intervenção.');
        } finally {
            setIsLoading(false);
            setIsModalOpen(false);
        }
    };
    

    const handleSave = () => {
        // Set the selected intervention type before opening the modal

        // Verifica se todos os campos obrigat�rios est�o preenchidos
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
        setSuccessMessage('');
        console.log('Tipo selecionado:', formData.tipo);
        const selectedTipo = tipos.find(tipo => tipo.TipoIntervencao === formData.tipo);
        setTipoIntervencaoSelecionado(selectedTipo);
        setIsModalOpen(false);
        handleConfirmSave();
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };




    return (
        <div style={containerStyle}>
            <h1 style={headerStyle}>{t("RegistoIntervencao.Title")}</h1>

            <div style={formRowStyle}>
                <div style={selectColumnStyle}>
                    <select
                        name="tipoIntervencao"
                        value={formData.tipoIntervencao}
                        onChange={handleFormChange}
                        style={selectStyle}
                        onClick={fetchTiposIntervencao}
                        required 
                    >
                        <option value="">{t("RegistoIntervencao.TxtTipoInter")}</option>
                        {tiposIntervencao.map((tipo) => (
                            <option key={tipo.Prioridade} value={tipo.Prioridade}>
                                {tipo.Prioridade} - {tipo.Descricao}
                            </option>
                        ))}
                    </select>
                    {/* Nova div para centralizar as datas e horas */}
                
                </div>

                <div style={selectColumnStyle}>
                    <select
                        name="tecnico"
                        value={formData.tecnico}
                        onChange={handleFormChange}
                        style={selectStyle}
                        onClick={fetchTecnicos}
                        required 
                    >
                        <option value="">{t("RegistoIntervencao.TxtTecnico")}</option>
                        {tecnicos.map((tecnico) => (
                            <option key={tecnico.Tecnico} value={tecnico.Tecnico}>
                                {tecnico.Tecnico} - {tecnico.Nome}
                            </option>
                        ))}
                    </select>
                    
                </div>
            </div>
            <div style={dateTimeContainerStyle}>
                <label>
                    {t("RegistoIntervencao.DataInicio")} </label>
                    <input
                        type="date"
                        name="dataInicio"
                        value={formData.dataInicio} // Vinculação ao estado
                        style={inputStyle}
                        onChange={handleFormChange}
                        required
                    />
               

                <label>
                    {t("RegistoIntervencao.DataFim")} </label>
                    <input
                        type="date"
                        name="dataFim"
                        value={formData.dataFim} // Vinculação ao estado
                        style={inputStyle}
                        onChange={handleFormChange}
                        required
                    />
               

                <label>
                    {t("RegistoIntervencao.HoraInicio")} </label>
                    <input
                        type="time"
                        name="horaInicio"
                        value={formData.horaInicio} // Vinculação ao estado
                        style={inputStyle}
                        onChange={handleFormChange}
                        required
                    />
                

                <label>
                    {t("RegistoIntervencao.HoraFim")}</label>
                    <input
                        type="time"
                        name="horaFim"
                        value={formData.horaFim} // Vinculação ao estado
                        style={inputStyle}
                        onChange={handleFormChange}
                        required
                    />
                
            </div>

            <div style={descricaodiv}>
                <label>
                    {t("RegistoIntervencao.Descricao")}</label>
                <textarea
                    type="text"
                    name="descricao"
                    placeholder="Descricao"
                    value={formData.descricao}
                    onChange={handleFormChange}
                    style={textareaStyle}  // Pode manter o estilo do textarea ou ajust�-lo conforme necess�rio
                    required
                />
            </div >
            <div style={formRowStyle}>
                <div style={selectColumnStyle}>

                    <select
                        name="estado"
                        value={formData.estado}
                        onChange={handleFormChange}
                        style={selectStyle}
                        onClick={fetchEstados}
                        required 
                    >
                        <option value="">{t("RegistoIntervencao.Estado")}</option>
                        {estados.map((estado) => (
                            <option key={estado.Estado} value={estado.Estado}>
                                {estado.Descricao}
                            </option>
                        ))}
                    </select>
                </div>
                {/* Novo ComboBox de Tipo ao lado de Estado */}
                <div style={selectColumnStyle}>
                    <select
                        name="tipo"
                        value={formData.tipo}
                        onChange={handleFormChange}
                        style={selectStyle}
                        onClick={fetchTipos}
                        required 
                    >
                        <option value="">{t("RegistoIntervencao.Tipo")}</option>
                        {tipos.map((tipo) => (
                            <option key={tipo.TipoIntervencao} value={tipo.TipoIntervencao}>
                                {tipo.TipoIntervencao}
                            </option>
                        ))}
                    </select>
                </div>

            </div>

            <h2 style={detailsHeaderStyle}>{t("RegistoIntervencao.SubTitulo")}</h2>
            <button style={toggleButtonStyle} onClick={toggleArtigoSection}>
                {isArtigoSectionOpen ? t("RegistoIntervencao.OcultarArtigo") :  t("RegistoIntervencao.AddArtigo") }
            </button>

            {isArtigoSectionOpen && (
                <div style={collapsibleSectionStyle}>
                    <div style={formRowStyle}>
                        <select
                            name="artigo"
                            value={artigoForm.artigo}
                            onChange={handleInputChange}
                            onClick={fetchArtigos}
                            style={selectStyle}
                        >
                            <option value="">{t("RegistoIntervencao.SelecioneArtigo")}</option>
                            {artigosDisponiveis.map((art) => (
                                <option key={art.Artigo} value={art.Artigo}>
                                    {art.Artigo}
                                </option>
                            ))}
                        </select>
                        <button
                            style={{
                                borderRadius: '10px',
                                padding: '10px',
                                fontSize: '1rem',
                                backgroundColor: 'rgb(40, 167, 69)',
                                color: 'white',
                                border: 'none',
                                marginBottom: '10px',
                            }}
                            onClick={handleAddArtigo}
                        >
                            {editingIndex !== null ? t("RegistoIntervencao.Atualizar") : t("RegistoIntervencao.Add") }
                        </button>
                    </div>
                </div>
            )}

                
                    

            <div style={artigoListContainerStyle}>
                {addedArtigos.map((artigo, index) => (
                    <div key={index} style={artigoItemStyle}>
                        <div
                            style={{
                                ...artigoHeaderStyle,
                                ...(expandedIndexes[index] ? artigoHeaderHoverStyle : {}), // Conditionally apply styles
                                display: 'flex', // Flexbox for horizontal alignment
                                justifyContent: 'space-between', // Space between items
                                alignItems: 'center', // Center items vertically
                            }}
                            onClick={() => toggleArtigoExpansion(index)}
                        >
                            <span>{artigo.artigo}</span>
                            <div>
                                <button style={expandButtonStyle}>
                                    {expandedIndexes[index] ? t("RegistoIntervencao.Recolher") : t("RegistoIntervencao.Expandir")}
                                </button>
                                <button
                                    style={{
                                        marginLeft: '10px', // Space between buttons
                                        padding: '5px 10px',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        backgroundColor: 'rgb(255, 0, 0)', // Red color for remove action
                                        color: 'white',
                                        fontWeight: 'bold', // Added for consistency
                                        fontSize: '1rem',   // Added for consistency
                                    }}
                                    onClick={() => handleDeleteArtigo(index)}
                                >
                                    {t("RegistoIntervencao.Remover")}
                                </button>
                            </div>
                        </div>

                        {expandedIndexes[index] && (
                            <div style={artigoDetailsStyle}>
                                {Object.entries(artigo).map(([key, value], i) => (
                                    <div key={i} style={detailRowStyle}>
                                        <strong>{key}:</strong>
                                        <input
                                            type="text"
                                            name={key}
                                            value={value}
                                            onChange={(e) => handleArtigoChange(e, index)}
                                            style={{ marginLeft: '10px', flex: 1 }}
                                        />
                                    </div>
                                ))}

                                
                            </div>
                        )}
                    </div>
                ))}


                <div style={buttonContainerStyle}>
                    <button
                        style={cancelButtonStyle}
                        onClick={() => props.navigation.navigate('Intervencoes')}
                    >
                        {t("RegistoIntervencao.Cancelar")}
                    </button>

                    <button
                        style={saveButtonStyle}
                        onClick={handleSave}
                    >
                        {t("RegistoIntervencao.Criar")}
                    </button>
                </div>

                {/* Loading Spinner */}
                {isLoading && <div style={loadingStyle}>{t("RegistoIntervencao.Loading")}</div>}

                {/* Mensagem de Sucesso */}
                {isSuccessModalOpen && (
                        <Modal onClose={() => setIsSuccessModalOpen(false)}>
                        <h2 style={modalTitleStyle}>{t("RegistoIntervencao.Aviso.3")}</h2>
                        <p>{t("RegistoIntervencao.Aviso.2")}</p>
                            <div style={buttonContainerStyle}>
                                <button
                                    style={saveButtonStyle}
                                    onClick={() => {
                                        setIsSuccessModalOpen(false);
                                        props.navigation.navigate('Intervencoes');
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

                        {/* Tabela para Dados do Servi�o Base */}
                        <h3 style={sectionTitleStyle}>Dados do Servico Base</h3>
                        <table style={tableStyle2}>

                            <tbody>
                                <tr>
                                    <td>Duracao Real:</td>
                                    <td>
                                        <input
                                            type="number"
                                            value={qtdeCusto}
                                            onChange={(e) => setQtdeCusto(Number(e.target.value))}
                                            style={inputStyle2}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Valor Hora:</td>
                                    <td>
                                        <input
                                            type="number"
                                            value={precoCusto}
                                            onChange={(e) => setPrecoCusto(Number(e.target.value))}
                                            style={inputStyle2}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Duracao Cliente:</td>
                                    <td>
                                        <input
                                            type="number"
                                            value={qtdeCliente}
                                            onChange={(e) => setQtdeCliente(Number(e.target.value))}
                                            style={inputStyle2}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Valor hora:</td>
                                    <td>
                                        <input
                                            type="number"
                                            value={precoCliente}
                                            onChange={(e) => setPrecoCliente(Number(e.target.value))}
                                            style={inputStyle2}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Desconto:</td>
                                    <td>
                                        <input
                                            type="number"
                                            value={descontoCliente}
                                            onChange={(e) => setDescontoCliente(Number(e.target.value))}
                                            style={inputStyle2}
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Tabela para Dados do Servi�o de Desloca��o */}
                        {tipoIntervencaoSelecionado?.ServicoDeslocacao && (
                            <>
                                <h3 style={sectionTitleStyle}>Dados do Servico de Deslocacao</h3>
                                <table style={tableStyle2}>

                                    <tbody>
                                        <tr>
                                            <td>Distancia Real:</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={qtdeCustoDeslocacao}
                                                    onChange={(e) => setQtdeCustoDeslocacao(Number(e.target.value))}
                                                    style={inputStyle2}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Preco por Km:</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={precoCustoDeslocacao}
                                                    onChange={(e) => setPrecoCustoDeslocacao(Number(e.target.value))}
                                                    style={inputStyle2}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Distancia Cliente:</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={qtdeClienteDeslocacao}
                                                    onChange={(e) => setQtdeClienteDeslocacao(Number(e.target.value))}
                                                    style={inputStyle2}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Valor Cliente:</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={precoClienteDeslocacao}
                                                    onChange={(e) => setPrecoClienteDeslocacao(Number(e.target.value))}
                                                    style={inputStyle2}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Desconto:</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={descontoClienteDeslocacao}
                                                    onChange={(e) => setDescontoClienteDeslocacao(Number(e.target.value))}
                                                    style={inputStyle2}
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </>
                        )}

                        <div style={buttonContainerStyle}>
                            <button onClick={handleCloseModal} style={cancelButtonStyle}>
                                Cancelar
                            </button>
                            <button onClick={handleConfirmSave} disabled={isLoading} style={saveButtonStyle}>
                                {isLoading ? 'Gravando...' : 'Confirmar'}
                            </button>
                        </div>
                        
                    </Modal>

                    
                )}

            </div>
        </div>
    );
};

const descricaodiv = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
}
const tableStyle2 = {
    width: '100%',
    borderCollapse: 'collapse', // Remove espa�os entre as c�lulas
    marginBottom: '20px', // Espa�amento inferior para separar das pr�ximas se��es
};
const modalTitleStyle = {
    textAlign: 'center',
    color: '#1792FE',
    margin: 0,
};
const inputStyle2 = {
    width: '100%', // Faz o input ocupar a largura total da c�lula
    padding: '5px', // Espa�amento interno para o input
    boxSizing: 'border-box', // Inclui padding no total width
};
const sectionTitleStyle = {
    color: '#1792FE',
    margin: '10px 0 5px',
};

const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#d4e4ff',
    overflowY: 'auto',
    maxHeight: '100vh'
};
const artigoListContainerStyle = {
    width: '100%',
    marginTop: '20px',
};
const headerStyle = {
    color: '#1792FE',
    fontSize: '2rem',
    fontWeight: '600',
    marginBottom: '30px',
};
const detailsHeaderStyle = {
    fontSize: '1.5rem',
    color: '#1792FE',
    marginBottom: '20px',
};
const formRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    gap: '20px',  // Espa�o entre as colunas
};
const selectColumnStyle = {
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    gap: '10px',
};
const dateTimeContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%', // Ocupa toda a largura da coluna
    gap: '10px',
};
const inputStyle = {
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    marginBottom: '10px',
    width:'100%',
};
const textareaStyle = {
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    marginBottom: '10px',
    height: '100px', // Maintain a fixed height
    width: '100%',
    resize: 'none', // Prevents resizing, optional
};
const selectStyle = {
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    fontSize: '1rem',
    marginBottom: '10px',
};
const buttonContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
};
const cancelButtonStyle = {
    borderRadius: '10px',
    padding: '12px',
    fontSize: '1.1rem',
    backgroundColor: '#A3C1FF',
    color: 'white',
    width: '48%',
    border: 'none',
};
const saveButtonStyle = {
    borderRadius: '10px',
    padding: '12px',
    fontSize: '1.1rem',
    backgroundColor: '#1792FE',
    color: 'white',
    width: '48%',
    border: 'none',
};
const toggleButtonStyle = {
    borderRadius: '10px',
    padding: '10px',
    fontSize: '1rem',
    backgroundColor: '#007BFF',
    color: 'white',
    border: 'none',
};
const collapsibleSectionStyle = {
    marginBottom: '20px',
};
const artigoItemStyle = {
    border: '1px solid #e0e0e0',
    borderRadius: '15px',
    marginBottom: '15px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    transition: 'all 0.3s ease-in-out',
};
const artigoHeaderStyle = {
    backgroundColor: '#0288D1', // Azul claro
    color: 'white',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
};
const artigoHeaderHoverStyle = {
    backgroundColor: '#0277BD', // Mudan�a de cor ao passar o mouse
};
const artigoDetailsStyle = {
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '10px',
    marginTop: '5px',
    maxHeight: '200px', // Limit the height of the details section
    overflowY: 'auto', // Allow scrolling if content exceeds max height
};
const detailRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    padding: '8px 0',
    borderBottom: '1px dashed #ddd',
};
const expandButtonStyle = {
    backgroundColor: 'white',
    border: 'none',
    cursor: 'pointer',
    color: '#0288D1',
    fontWeight: 'bold',
    fontSize: '1rem',
    borderRadius: '5px', // Added for consistency
    padding: '5px 10px', // Added for consistency
};
const loadingStyle = {
    marginTop: '10px',
    fontSize: '1.2rem',
    color: '#007BFF',
};
const successMessageStyle = {
    marginTop: '10px',
    fontSize: '1.2rem',
    color: '#28a745',
};

export default RegistoIntervencao;