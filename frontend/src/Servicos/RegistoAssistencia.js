import React, { useState } from 'react';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';


const getCurrentDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localTime = new Date(now.getTime() - offset * 60 * 1000);
    return localTime.toISOString().slice(0, 16); // Formato compatível com datetime-local
};


const RegistoAssistencia = (props) => {
    const [selectedObjeto, setSelectedObjeto] = useState(null);
    const token = localStorage.getItem('painelAdminToken');
    const urlempresa = localStorage.getItem('urlempresa');
    const { t } = useTranslation();
    // Variáveis de estado
    const [formData, setFormData] = useState({

        cliente: '',
        contacto: '',
        tecnico: '',
        origem: '',
        objeto: '',
        prioridade: '',
        secao: '',
        estado: '',
        tipoProcesso: '',
        contratoID: '',
        problema: '',
        comoReproduzir: '',
        datahoraabertura: '',
        datahorafimprevista:''
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
        tiposProcessos: []
    });

   // Atualizar handleChange
   const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === 'dataInicio' || name === 'horaInicio') {
        const newFormData = { ...formData, [name]: value };
        if (newFormData.dataInicio && newFormData.horaInicio) {
            const dataHoraInicioFormatted = `${newFormData.dataInicio}T${newFormData.horaInicio}:00`; // Adiciona segundos
            newFormData.datahoraabertura = dataHoraInicioFormatted;
        }
        setFormData(newFormData);
    } else if (name === 'dataFimPrevista' || name === 'horaFimPrevista') {
        const newFormData = { ...formData, [name]: value };
        if (newFormData.dataFimPrevista && newFormData.horaFimPrevista) {
            const dataHoraFimFormatted = `${newFormData.dataFimPrevista}T${newFormData.horaFimPrevista}:00`; // Adiciona segundos
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
        carregandoTiposProcessos: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    
    // Função para buscar dados
    const fetchData = async (url, key, loadingKey) => {
        console.log("Token:", localStorage.getItem('painelAdminToken'));
        console.log("URL Empresa:", localStorage.getItem('urlempresa'));
    
        if (!loadingStates[loadingKey] && (!dataLists[key] || dataLists[key].length === 0)) {
            setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }));
            try {
                const response = await fetch(`https://webapiprimavera.advir.pt/${url}`, {
                    method: 'GET',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'urlempresa': urlempresa,
                    }
                });
    
                if (!response.ok) {
                    console.error(`Error fetching data from ${url}: ${response.statusText}`);
                    throw new Error(`Error: ${response.status} ${response.statusText}`);
                }
    
                const data = await response.json();
                setDataLists((prev) => ({ ...prev, [key]: data.DataSet.Table || [] }));
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
    
        if (!formData.cliente || !formData.tecnico || !formData.origem || !formData.objeto || !formData.prioridade || !formData.secao || !formData.estado || !formData.tipoProcesso  || !formData.problema) {
            setMessage(t("RegistoAssistencia.Aviso.1"));
            return;
        }
    
        setIsSubmitting(true);
        setMessage('');
    
       // Define data atual e data fim prevista
        const dataAtual = new Date();
        const dataFimPrevista = new Date();
        dataFimPrevista.setDate(dataAtual.getDate() + 30); // Adiciona 30 dias à data atual

        // Formatar para DateTime
        const dataAtualFormatada = dataAtual.toISOString().replace('T', ' ').slice(0, 19);
        const dataFimPrevistaFormatada = dataFimPrevista.toISOString().replace('T', ' ').slice(0, 19);

        console.log('Data Abertura (DateTime):', dataAtualFormatada);
        console.log('Data Fim Prevista (DateTime):', dataFimPrevistaFormatada);

    
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
            comoReproduzir: formData.comoReproduzir ? formData.comoReproduzir : null,
            contacto: formData.contacto ? formData.contacto : null,
            contratoID: formData.contratoID ? formData.contratoID : null,
            datahoraabertura: formData.datahoraabertura, // Já formatado
            datahorafimprevista: formData.datahorafimprevista, // Já formatado
        };
        
        try {
            const response = await fetch(`https://webapiprimavera.advir.pt/routePedidos_STP/CriarPedido`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'urlempresa': urlempresa,
                },
                body: JSON.stringify(payload),
            });
    
 
    
            const data = await response.json();
            setMessage(t("RegistoAssistencia.Aviso.2"));

            /*
            try {
                const response = await fetch(`https://webapiprimavera.advir.pt/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // Indicando que estamos enviando JSON
                    },
                    body: JSON.stringify({
                        emailDestinatario,
                        dadosIntervencao
                    })
                });

                // Verificando a resposta do servidor
                if (response.ok) {
                    const data = await response.json();
                    console.log('E-mail enviado com sucesso:', data);
                   // alert('E-mail enviado com sucesso!');
                } else {
                    const errorData = await response.json();
                    console.error('Erro ao enviar e-mail:', errorData);
                    //alert('Erro ao enviar e-mail: ' + errorData.message);
                }
            } catch (error) {
                console.error('Erro ao fazer a requisição:', error);
                alert('Erro ao fazer a requisição: ' + error.message);
            }

            */

            setFormData({
                cliente: '',
                contacto: '',
                contratoID: '',
                tecnico: '',
                origem: '',
                objeto: '',
                prioridade: '',
                secao: '',
                estado: '',
                tipoProcesso: '',
                problema: '',
                comoReproduzir: '',
                datahoraabertura: '',
                datahorafimprevista: '',
            });
            setSelectedObjeto(null);
        } catch (error) {
            setMessage('Erro ao enviar pedido.');
            console.error('Erro ao enviar pedido:', error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    

    // Atualizar dados do formulário
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        console.log(formData);
    };

    return (
        
        <div style={containerStyle}>
            <h1 style={headerStyle}>{t("RegistoAssistencia.Title")}</h1>
            {message && <div style={messageStyle}>{message}</div>}
            {/* Informações do Cliente e Contacto */}
            <div style={formRowStyle}>
                <div style={selectColumnStyle}>
                    <select name="cliente" value={formData.cliente} onChange={handleChange} onClick={() => fetchData('routePedidos_STP/LstClientes', 'clientes', 'carregandoClientes')} style={selectStyle}>
                        <option value="">{t("RegistoAssistencia.TxtCliente")}</option>
                        {dataLists.clientes.map((c) => (
                            <option key={c.Cliente} value={c.Cliente}>
                                {c.Cliente} - {c.Nome}
                            </option>
                        ))}
                    </select>
                    <select name="contacto" value={formData.contacto} onChange={handleChange} onClick={() => fetchData(`routePedidos_STP/ListarContactos/${formData.cliente}`, 'contactos', 'carregandoContactos')} style={selectStyle}>
                        <option value="">{t("RegistoAssistencia.TxtContacto")}</option>
                        {dataLists.contactos.map((co) => (
                            <option key={co.Contacto} value={co.Contacto}>
                               {co.Contacto} - {co.PrimeiroNome} {co.UltimoNome}
                            </option>
                        ))}
                    </select>
                    
    
                    <input
                        type="date"
                        name="dataInicio"
                        style={inputDateTimeStyle}
                        onChange={handleFormChange}
                        required
                    />



                
                </div>
                <div style={selectColumnStyle}>
                    <select name="tecnico" value={formData.tecnico} onChange={handleChange} onClick={() => fetchData('routePedidos_STP/LstTecnicosTodos', 'tecnicos', 'carregandoTecnicos')} style={selectStyle}>
                        <option value="">{t("RegistoAssistencia.TxtTecnico")}</option>
                        {dataLists.tecnicos.map((t) => (
                            <option key={t.Tecnico} value={t.Tecnico}>
                                {t.Tecnico} - {t.Nome}
                            </option>
                        ))}
                    </select>
                    <select name="origem" value={formData.origem} onChange={handleChange} onClick={() => fetchData('routePedidos_STP/LstOrigensProcessos', 'origens', 'carregandoOrigens')} style={selectStyle}>
                        <option value="">{t("RegistoAssistencia.TxtOrigem")}</option>
                        {dataLists.origens.map((o) => (
                            <option key={o.OrigemProcesso} value={o.OrigemProcesso}>
                                {o.OrigemProcesso} - {o.Descricao}
                            </option>
                        ))}
                    </select>
                    

                    <input
                        type="time"
                        name="horaInicio"
                        style={inputDateTimeStyle}
                        onChange={handleFormChange}
                        required
                    />


                </div>
                
            </div>

            <h2 style={detailsHeaderStyle}>{t("RegistoAssistencia.Title2")}</h2>

            {/* Detalhes da Assistência */}
            <div style={formRowStyle}>
                
                <div style={selectColumnStyle}>
                    <select
                        name="objeto"
                        value={formData.objeto}
                        onChange={(e) => {
                            handleChange(e);
                            const objeto = dataLists.objetos.find(o => o.Objecto === e.target.value);
                            setSelectedObjeto(objeto);
                        }}
                        onClick={() => fetchData('routePedidos_STP/LstObjectos', 'objetos', 'carregandoObjetos')}
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
                <div style={selectColumnStyle}>
                    <select name="prioridade" value={formData.prioridade} onChange={handleChange} onClick={() => fetchData('routePedidos_STP/ListarTiposPrioridades', 'prioridades', 'carregandoPrioridades')} style={selectStyle}>
                        <option value="">{t("RegistoAssistencia.TxtPrioridade")}</option>
                        {dataLists.prioridades.map((p) => (
                            <option key={p.Prioridade} value={p.Prioridade}>
                                {p.Prioridade} - {p.Descricao}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            

            {/* Seção e Estado */}
            <div style={formRowStyle}>
                <div style={selectColumnStyle}>
                    <select name="secao" value={formData.secao} onChange={handleChange} onClick={() => fetchData('routePedidos_STP/ListarSeccoes', 'seccoes', 'carregandoSeccoes')} style={selectStyle}>
                        <option value="">{t("RegistoAssistencia.TxtSecao")}</option>
                        {dataLists.seccoes.map((s) => (
                            <option key={s.Seccao} value={s.Seccao}>
                                {s.Seccao} - {s.Nome}
                            </option>
                        ))}
                    </select>
                </div>
                <div style={selectColumnStyle}>
                    <select name="estado" value={formData.estado} onChange={handleChange} onClick={() => fetchData('routePedidos_STP/LstEstadosTodos', 'estados', 'carregandoEstados')} style={selectStyle}>
                        <option value="">{t("RegistoAssistencia.TxtEstado")}</option>
                        {dataLists.estados.map((e) => (
                            <option key={e.Estado} value={e.Estado}>
                                {e.Descricao}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tipo de Processo */}
            <div style={formRowStyle}>
                <div style={selectColumnStyle}>
                    <select name="tipoProcesso" value={formData.tipoProcesso} onChange={handleChange} onClick={() => fetchData('routePedidos_STP/ListarTiposProcesso', 'tiposProcessos', 'carregandoTiposProcessos')} style={selectStyle}>
                        <option value="">{t("RegistoAssistencia.TxtTipoProcesso")}</option>
                        {dataLists.tiposProcessos.map((tp) => (
                            <option key={tp.TipoProcesso} value={tp.TipoProcesso}>
                                {tp.TipoProcesso} - {tp.Descricao}
                            </option>
                        ))}
                    </select>
                </div>
            

            
                <div style={selectColumnStyle}>
                <select 
                    name="contratoID" 
                    value={formData.contratoID} 
                    onChange={handleChange} 
                    onClick={() => fetchData(`routePedidos_STP/Listarcontratos/${formData.cliente}`, 'contratosID', 'carregandocontratosID')} 
                    style={selectStyle}
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

                {/* Áreas de texto para Problema e Como Reproduzir */}
                <div style={textareaContainerStyle}>
                <textarea name="problema" placeholder={t("RegistoAssistencia.TxtProblema")} value={formData.problema} onChange={handleChange} style={textareaStyle} />
                <textarea name="comoReproduzir" placeholder={t("RegistoAssistencia.TxtComoReproduzir")} value={formData.comoReproduzir} onChange={handleChange} style={textareaStyle} />
            </div>

            {/* Botões de Cancelar e Gravar */}
            <div style={buttonContainerStyle}>
                <button onClick={() => props.navigation.navigate('PedidosAssistencia')} style={cancelButtonStyle}>
                    {t("RegistoAssistencia.BtCancelar")}
                </button>
                <button onClick={handleSubmit} style={saveButtonStyle} disabled={isSubmitting}>
                    {isSubmitting ? t("RegistoAssistencia.BtGravando") : t("RegistoAssistencia.BtGravar")}
                </button>
            </div>
        </div>
    );
};

// Estilos
const messageStyle = {
    color: 'green',
    marginBottom: '10px',
    fontWeight: 'bold',
    textAlign: 'center'
};

const inputDateTimeStyle = {
    appearance: 'none', // Remove o estilo padrão do browser
    backgroundColor: 'white',
    border: 'none',
    borderRadius: '30px',
    padding: '10px',
    fontSize: '1rem',
};


const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#d4e4ff',
    padding: '20px',
    overflowY: 'auto',
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
    width: '80%',
    marginBottom: '20px',
};

const selectColumnStyle = {
    display: 'flex',
    flexDirection: 'column',
    width: '48%',
};

const textareaContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    width: '80%',
    marginBottom: '20px',
};

const selectStyle = {
    padding: '10px',
    borderRadius: '30px',
    border: 'none',
    fontSize: '1rem',
    marginBottom: '10px',
    backgroundColor: 'white',
};

const textareaStyle = {
    padding: '10px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '1rem',
    marginBottom: '10px',
    height: '100px',
};

const buttonContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    width: '80%',
};

const inputStyle = {
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    marginBottom: '10px',
    width:'100%',
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

export default RegistoAssistencia;
