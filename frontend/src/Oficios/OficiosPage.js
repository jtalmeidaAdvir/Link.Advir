import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from '../../images/jpa-construtora.png';
import { FaSave, FaEnvelope, FaFilePdf, FaPaperclip } from "react-icons/fa";
import { useFocusEffect } from '@react-navigation/native';
import PMEPreto from '../../images/PMEPRETO.png';
import QualidadePreto from '../../images/QUALIDADEPRETO.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
const OficiosPage = (props) => {
    // ==============================
    // 1) Estados para o documento
    // ==============================
    const [isModalOpen, setIsModalOpen] = useState(false); // Controla a abertura do modal
    const [currentTemplate, setCurrentTemplate] = useState(1); // Controla o template ativo (1 ou 2)
    const [donoObra, setDonoObra] = useState("");
    const navigation = useNavigation();
    const [isEditable, setIsEditable] = useState(false);
    const [selectedObra, setSelectedObra] = useState("");
    const [assuntoDoc, setAssuntoDoc] = useState("");   // <--- Assunto do documento
    const [textoDoc, setTextoDoc] = useState("");       // <--- Texto do documento
    const [anexos, setAnexos] = useState([]);
    const docxContainer = useRef(null);
    const docxContainer2 = useRef(null);
    const [isTemplateVisible, setIsTemplateVisible] = useState(false);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [isButtonSave, setIsButtonSave] = useState(false);
    const [morada, setMorada] = useState("");
    const [localidade, setLocalidade] = useState("");
    const [codigoPostal, setCodigoPostal] = useState("");
    const [localCopPostal, setLocalCopPostal] = useState("");


    const contentEditableRef = useRef(null);

    const handleBlur = () => {
        // Atualiza o estado apenas ao perder o foco
        if (contentEditableRef.current) {
            setTextoDoc(contentEditableRef.current.innerHTML);
        }
    };



    // Estado para guardar a divisão do texto (se exceder um limite)
    const [textParts, setTextParts] = useState({ part1: "", part2: "" });

    // formData para o documento (sem campos de email do modal)
    const [formData, setFormData] = useState({

        codigo: "",
        data: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
        remetente: "",
        email: "",
        texto1: "",
        texto2: "",
        texto3: "",
        template: "",
        createdby: "",
        donoObra: "",
    });

    const [obras, setObras] = useState([]);
    const [inputValue, setInputValue] = useState("");

    const [showOptions, setShowOptions] = useState(false);
    const comboBoxRef = useRef(null);

    // ==============================
    // 2) Estados para o modal de envio de email
    // ==============================
    const [emailTo, setEmailTo] = useState(""); // Destinatário do email
    const [emailCC, setEmailCC] = useState(""); // Destinatário do email
    const [emailAssunto, setEmailAssunto] = useState("");         // Assunto do email
    const [emailTexto, setEmailTexto] = useState("");             // Corpo do email

    // ======================================
    // 3) Efeito para acompanhar o texto digitado no contentEditable
    // ======================================
    useEffect(() => {
        // Criamos uma função global (window.updateTexto) para atualizar o textoDoc
        window.updateTexto = (novoTexto) => {
            setTextoDoc(novoTexto || "");
        };
        return () => {
            delete window.updateTexto;
        };
    }, []);

    // ======================================
    // 4) Dividir texto se exceder limite de caracteres (ex. 2500)
    // ======================================
    const splitTextByLimit = (texto, limit) => {
        if (!texto) return { part1: "", part2: "" };
        if (texto.length <= limit) {
            return { part1: texto, part2: "" };
        }
        const part1 = texto.substring(0, limit);
        const part2 = texto.substring(limit);
        return { part1, part2 };
    };

    useEffect(() => {
        const limit = currentTemplate === 1 ? 1020 : 2020; // Limite depende do template
        setTextParts(splitTextByLimit(textoDoc, limit));
    }, [textoDoc, currentTemplate]); // Inclui currentTemplate como dependência

    // ======================================
    // 5) Carregar lista de obras do backend
    // ======================================
    useEffect(() => {
     
        const fetchObras = async () => {
            const token = localStorage.getItem("painelAdminToken");
            const urlempresa = localStorage.getItem("urlempresa");
            if (!urlempresa) return;

            try {
                const response = await fetch("https://webapiprimavera.advir.pt/oficio/ListarObras", {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "urlempresa": urlempresa,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();
                // Se data.DataSet.Table for array, atualiza
                if (data && data.DataSet && Array.isArray(data.DataSet.Table)) {
                    setObras(data.DataSet.Table);
                }
            } catch (error) {
                console.error("Erro ao carregar obras:", error);
            }
        };

        fetchObras();
        setDonoObra("");
    }, []);

    // ======================================
    // 6) Gerar PDF (multi-página se existir part2)
    // ======================================
    const handleSavePDF = async () => {
        const container1 = docxContainer.current;
        const container2 = docxContainer2.current; // segunda página, se houver

        if (!container1) {
            alert("Erro: não foi possível encontrar o conteúdo para gerar o PDF.");
            return;
        }

        try {
            const pdf = new jsPDF("portrait", "mm", "a4");

            // Captura da primeira página
            const canvas1 = await html2canvas(container1, {
                scale: 2,
                useCORS: true,
                logging: true,
            });
            const imgData1 = canvas1.toDataURL("image/jpeg", 0.8);

            const pdfWidth = 210; // Largura do PDF em mm
            const pdfHeight = (canvas1.height * pdfWidth) / canvas1.width;

            pdf.addImage(imgData1, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

            // Se existe texto na part2 e container2 existe, geramos segunda página
            if (textParts.part2 && container2) {
                pdf.addPage();
                const canvas2 = await html2canvas(container2, {
                    scale: 2,
                    useCORS: true,
                    logging: true,
                });
                const imgData2 = canvas2.toDataURL("image/jpeg", 0.8);
                const pdfHeight2 = (canvas2.height * pdfWidth) / canvas2.width;

                pdf.addImage(imgData2, "JPEG", 0, 0, pdfWidth, pdfHeight2, undefined, "FAST");
            }

            pdf.save("oficio.pdf");
            alert("PDF gerado e salvo com sucesso!");
        } catch (error) {
            console.error("Erro ao gerar o PDF:", error);
            alert("Erro ao gerar o PDF. Verifique o console para mais detalhes.");
        }
    };

    // ======================================
    // 7) Enviar PDF + anexos para o backend
    // ======================================
    const handleSavePDFAndSendToBackend = async () => {
        const container = docxContainer.current;
        if (!container) {
            alert("Erro: não foi possível encontrar o conteúdo para gerar o PDF.");
            return;
        }

        try {
            // Gera o PDF
            const canvas = await html2canvas(container, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("portrait", "mm", "a4");
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            const pdfBlob = pdf.output("blob");

            // FormData para enviar PDF e anexos
            const formData2 = new FormData();
            formData2.append("file", pdfBlob, "oficio.pdf");
            formData2.append("codigo", formData.codigo);



            // Inclui anexos
            anexos.forEach((anexo) => {
                formData2.append("anexos", anexo, anexo.name);
            });

            const token = localStorage.getItem("painelAdminToken");
            const urlempresa = localStorage.getItem("urlempresa");

            const response = await fetch("https://webapiprimavera.advir.pt/oficio/save-pdf", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "urlempresa": urlempresa,
                },
                body: formData2,
            });

            if (response.ok) {
                alert("PDF e anexos enviados e salvos com sucesso!");
            } else {
                alert("Erro ao salvar o PDF e anexos no backend.");
            }
        } catch (error) {
            console.error("Erro ao gerar ou enviar o PDF:", error);
        }
    };

    // ======================================
    // 8) Remover um anexo específico
    // ======================================
    const handleRemoveAnexo = (index) => {
        setAnexos((prevAnexos) => {
            const updatedAnexos = prevAnexos.filter((_, i) => i !== index);

            // Reconstroi a lista de anexos no rodapé do doc
            const anexosNomes = updatedAnexos.map((file) => file.name).join(", ");
            const editableCellCodigo = document.getElementById("editableCellCodigo");
            if (editableCellCodigo) {
                editableCellCodigo.innerHTML = `
          REF: ${formData.codigo}<br>
          DATA: ${formData.data}<br>
          ANEXOS: ${anexosNomes || "Nenhum"}<br><br><br><br>
          REMETENTE<br><br>
          ${formData.remetente ? formData.remetente : 'Remetente não disponível'}<br>
          ${formData.email || 'Email não existe'}
        `;
            }

            return updatedAnexos;
        });
    };

    // ======================================
    // 9) Enviar Email com Office API (usando dados do modal)
    // ======================================
    const handleSendEmailWithOfficeAPI = async () => {
        const containers = [docxContainer.current, docxContainer2.current]; // Lista de contêineres para as páginas

        if (!containers[0]) {
            alert("Erro: não foi possível encontrar o conteúdo para gerar o PDF.");
            return;
        }

        try {

            const pdf = new jsPDF("portrait", "mm", "a4");
            const pdfWidth = 210; // Largura da página em mm
            let firstPage = true;

            for (const container of containers) {
                if (!container) continue; // Ignora contêineres não definidos

                const canvas = await html2canvas(container, {
                    scale: 3,
                    useCORS: true,
                    logging: true,
                });
                const imgData = canvas.toDataURL("image/png", 0.6);
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;

                if (!firstPage) {
                    pdf.addPage(); // Adiciona uma nova página se não for a primeira
                }
                firstPage = false;

                pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight, undefined, "FAST");
            }

            const pdfBlob = pdf.output("blob");

            // Converter PDF em Base64
            const pdfBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(",")[1]);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(pdfBlob);
            });

            // Converter anexos adicionais
            const processedAnexos = await Promise.all(
                anexos.map((file) =>
                    new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64Content = reader.result.split(",")[1];
                            resolve({ name: file.name, content: base64Content });
                        };
                        reader.onerror = (error) => reject(error);
                        reader.readAsDataURL(file);
                    })
                )
            );

            // Adicionar o PDF gerado (do documento) à lista de anexos do email
            processedAnexos.push({
                name: "oficio.pdf",
                content: pdfBase64,
            });

            // Montar payload com os dados do modal
            const payload = {
                emailDestinatario: emailTo,
                emailCC: emailCC,
                assunto: emailAssunto,
                texto: emailTexto,
                remetente: formData.remetente, // ou outro valor fixo, se necessário
                anexos: processedAnexos,
            };

            // Enviar para o backend
            const response = await fetch("https://webapiprimavera.advir.pt/sendmailoficios", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                alert("Email enviado com sucesso!");
            } else {
                const errorData = await response.json();
                console.error("Erro ao enviar email:", errorData);
                alert("Erro ao enviar email.");
            }
        } catch (error) {
            console.error("Erro ao gerar ou enviar o PDF com anexos:", error);
            alert("Erro ao processar o PDF ou anexos.");
        } finally {

            setIsModalOpen(false);
        }
    };

    // ======================================
    // 10) Adicionar anexos
    // ======================================
    const handleAddAnexo = (event) => {
        const files = Array.from(event.target.files);
        setAnexos((prevAnexos) => {
            const updatedAnexos = [...prevAnexos, ...files];

            const anexosNomes = updatedAnexos.map((file) => file.name).join(", ");
            const editableCellCodigo = document.getElementById("editableCellCodigo");
            if (editableCellCodigo) {
                editableCellCodigo.innerHTML = `
          REF: ${formData.codigo}<br>
          DATA: ${formData.data}<br>
          ANEXOS: ${anexosNomes}<br><br><br><br><br>
          REMETENTE<br><br>
          ${formData.remetente ? formData.remetente : 'Remetente não disponível'}<br>
          ${formData.email || 'Email não existe'}
        `;
            }

            return updatedAnexos;
        });
    };


    // ======================================
// 12) Salvar dados do documento (criar ofício) no backend
// ======================================
const handleSave = async () => {
    const token = localStorage.getItem("painelAdminToken");
    const urlempresa = localStorage.getItem("urlempresa");
    const usernome = localStorage.getItem("userNome");
    const useremail = localStorage.getItem("userEmail");
 
    var nomeDonoObra = "";
    var moradaDonoObra = "";
    var localidadeDonoObra = "";
    var codPostalDonoObra = "";
    var codPostalLocalDonoObra = "";
    var obraSlecionadaSave = "";
    console.log("CODIGO");
    console.log(inputValue);
 
    if (inputValue === "Não tem obra") {
 
        console.log(donoObra.Nome);
        nomeDonoObra = donoObra.Nome || "";
        moradaDonoObra = morada || "";
        localidadeDonoObra = localidade || "";
        codPostalDonoObra = codigoPostal || "";
        codPostalLocalDonoObra = localCopPostal || "";
        console.log(formData?.codigo);
        obraSlecionadaSave = inputValue || "";
 
 
    }else {
        nomeDonoObra = donoObra.Nome;
 
        moradaDonoObra = donoObra.Morada;
        localidadeDonoObra = donoObra.Localidade;
        codPostalDonoObra = donoObra.CodPostal;
        codPostalLocalDonoObra = donoObra.CodPostalLocal;
        obraSlecionadaSave = selectedObra?.Codigo || "";
 
    }
 
    
    if (currentTemplate === 1) {
        var templateestado = "2"
    } else if (currentTemplate === 2) {
        var templateestado = "1"
    }
    // Vamos inserir assuntoDoc e textoDoc dentro de formData, para enviar e gravar no backend
    const payloadDoc = {
        ...formData,
        codigo: formData?.codigo || "",
        assunto: assuntoDoc,
        texto1: textParts.part1 || "",
        texto2: textParts.part2 || "",
        obra: obraSlecionadaSave || "",
        remetente: usernome,
        createdby: usernome,
        email: useremail,
        template: templateestado,
        donoObra: nomeDonoObra,
        Morada: moradaDonoObra,
        Localidade: localidadeDonoObra,
        CodPostal: codPostalDonoObra,
        CodPostalLocal: codPostalLocalDonoObra,
    };
 
    try {
        const response = await fetch("https://webapiprimavera.advir.pt/oficio/Criar", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "urlempresa": urlempresa,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payloadDoc),
        });
 
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro https: ${response.status} - ${errorData.error}`);
        }
 
        const data = await response.json();
        // Depois de criar o ofício, podemos também salvar o PDF e anexos
        await handleSavePDFAndSendToBackend();
        alert("Ofício criado e PDF salvo com sucesso!");
        console.log("Resposta do servidor:", data);
    } catch (error) {
        console.error("Erro ao criar o ofício:", error);
        alert("Erro ao criar o ofício. Verifique os logs para mais detalhes.");
    }
};

    // ======================================
    // 13) Atualizar formData ao selecionar a Obra
    // ======================================
    const handleObraChange = (obra) => {
        const selectedObra = obra;
        const entidadeid = selectedObra.EntidadeIDA;


        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");

        if (!urlempresa || !entidadeid) return;

        const fetchDonoObra = async () => {
            try {
                const response = await fetch(`https://webapiprimavera.advir.pt/oficio/GetEntidade/${entidadeid}`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "urlempresa": urlempresa,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();
                if (data && data.DataSet && data.DataSet.Table && data.DataSet.Table.length > 0) {
                    const donoObra = data.DataSet.Table[0].Nome;
                    setDonoObra(data.DataSet.Table[0]);

                    setFormData((prevFormData) => ({
                        ...prevFormData,
                        donoObra: donoObra,
                    }));
                }
            } catch (error) {
                console.error('Erro ao buscar obras:', error);
            }
        };



        fetchDonoObra();

    };
    const fetchEmailObra = async () => {
        try {
            const token = localStorage.getItem("painelAdminToken");
            const urlempresa = localStorage.getItem("urlempresa");
            const emailuser = localStorage.getItem("userEmail");

            const response = await fetch(`https://webapiprimavera.advir.pt/oficio/GetEmail/${donoObra.ID}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "urlempresa": urlempresa,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            if (data && data.DataSet && data.DataSet.Table && data.DataSet.Table.length > 0) {
                const email = data.DataSet.Table[0].Email;
                setEmailTo(email);
                setEmailCC(emailuser);
                console.log("Email: " + email);
            }
        } catch (error) {
            console.error('Erro ao buscar email da obra:', error);
        }
    };
    useEffect(() => {
        if (donoObra?.EntidadeId) {
            fetchEmailObra();
        }
    }, [donoObra]);
    // ======================================
    // 14) Gerar automaticamente o "código" do ofício
    // ======================================
    const generateCodigo = async () => {
        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");
        const emailrementente = localStorage.getItem("userEmail");
        const userNome = localStorage.getItem("userNome");

        try {
            const response = await fetch("https://webapiprimavera.advir.pt/oficio/GetId", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "urlempresa": urlempresa,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro https: ${response.status} - ${errorData.error}`);
            }

            const data = await response.json();
            let conteudoCentral = data?.DataSet?.Table?.[0]?.Conteudo_Central || "000";

            const novoConteudoCentral = String(parseInt(conteudoCentral, 10) + 1).padStart(3, '0');

            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            const formattedMonth = currentMonth.toString().padStart(2, '0');

            let iniciais = "";
            if (userNome) {
                const palavras = userNome.split(/\s+/); // Divide o nome em palavras
                if (palavras.length >= 2) {
                    iniciais = palavras[0][0].toUpperCase() + palavras[1][0].toUpperCase(); // Só as iniciais das duas primeiras palavras
                } else if (palavras.length === 1) {
                    iniciais = palavras[0][0].toUpperCase(); // Caso só exista uma palavra
                }
            }

            const updatedCodigo = `OFI${currentYear}${formattedMonth}${novoConteudoCentral}${iniciais}`;

            const editableCellCodigo = document.getElementById("editableCellCodigo");
            if (editableCellCodigo) {
                editableCellCodigo.innerHTML = `
                    REF: ${updatedCodigo}<br>
                    DATA: ${formData.data}<br>
                    ANEXOS: ${anexos.map(a => a.name).join(", ") || "Nenhum anexo"}<br>
                `;
            }

            setFormData((prevFormData) => ({
                ...prevFormData,
                codigo: updatedCodigo,
            }));
        } catch (error) {
            console.error("Erro ao obter o último ID:", error);
            alert("Erro ao obter o último ID. Verifique os logs para mais detalhes.");
            throw error;
        }
    };



    // ======================================
    // 15) Mudar Template
    // ======================================
    const changeTemplate = () => {
        generateCodigo();
        const newTemplate = currentTemplate === 1 ? 2 : 1;
        setCurrentTemplate(newTemplate);

        // Torna a visualização do template visível
        setIsTemplateVisible(true);

        const newContent = newTemplate === 1 ? getTemplate1() : getTemplate2();
        if (docxContainer.current) {
            docxContainer.current.innerHTML = newContent;

            // Se for template 1, pode ter segunda página
            if (docxContainer2.current) {
                if (newTemplate === 1) {
                    docxContainer2.current.innerHTML = getTemplate1SecondPage();
                } else if (newTemplate === 2) {
                    docxContainer2.current.innerHTML = getTemplate2SecondPage();
                } else {
                    docxContainer2.current.innerHTML = "";
                }
            }
        }
    };



    // ======================================
    // 16) Templates do Documento
    // ======================================
    const getTemplate1 = () => {
        const usernome = formData.nome || localStorage.getItem("userNome") || 'Email não disponível';
        const useremail = formData.email || localStorage.getItem("userEmail") || 'Email não disponível';
 
        return `
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Modelo de Documento</title>
<style>
  body {
    font-family: Calibri, sans-serif;
    margin: 0; padding: 0;
    background-color: #f4f4f4; color: #333;
    font-size: 13pt;
  }
  .page {
    max-width: 100%;
    margin: auto;
    padding: 2rem;
    border: 0px solid #ccc;
    background-color: #fff;
    box-sizing: border-box;
    font-size: 8pt;
    height: 1095.5px;
    font-size: 13pt;
  }
  td { word-wrap: break-word; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 2rem;
    font-size: 13pt;
  }
  table, th, td { border: 0px solid #ccc; }
  th, td {
    padding: 0.5rem;
    text-align: left;
    vertical-align: top;
  }
  .footer { font-size: 8pt; line-height: 1.6; }
  .footer p { margin: 0.5em 0; }
  .logo { text-align: left; }
  .logo img { max-width: 30%; height: auto; }
  .PMEPreto img { max-width: 25%; height: auto; }
  @media (max-width: 768px) {
    .page { padding: 1rem; }
    th, td { font-size: 6pt; padding: 0.3rem; }
  }
</style>
</head>
<body>
<div class="page">
<table>
<tr>
<td class="logo" colspan="2">
<img src="${logo}" alt="Logo JPA Construtora" />
</td>
</tr>
<tr>
<td></td>
<td style="padding-left:99px;" contentEditable="false">
        EXMO(s) SR(s) ${donoObra.Nome || ''}<br>
        ${donoObra.Morada || morada}<br>
        ${donoObra.Localidade || localidade}<br>
        ${donoObra.CodPostal || codigoPostal} ${donoObra.CodPostalLocal || localCopPostal}
</td>
</tr>
<tr>
<td colspan="2" style="font-weight: bold; text-align: center;">
      ______________________________________________________________________________</td>
</tr>
<tr>
<td style="width: 28%; font-size: 10px" contentEditable="false" id="editableCellCodigo" >
        REF: ${formData?.codigo}<br>
        DATA: ${formData.data}<br>
        ANEXOS: ${anexos.map(a => a.name).join(", ") || "Nenhum anexo"}<br><br><br><br><br>
        REMETENTE<br><br>
        ${usernome || 'Remetente não disponível'}<br>
        ${useremail || 'Email não existe'}
</td>
<td style="vertical-align: top;">
<div
          contentEditable="false"
          id="editableCellAssunto"
          oninput="window.updateTexto(this.innerText)"
          style="width: 100%; min-height: 586px; max-height: 600px; overflow: auto;"
>
          ASSUNTO: ${assuntoDoc}<br><br>
          Exmo. Senhores,<br><br>
          ${textParts.part1 || ""}
</div>
</td>
</tr>
<tr style="${currentTemplate === 1 && textParts.part2 ? 'visibility:hidden;' : ''}">
<td>
</td>
<td contentEditable="true" >
        Sem outro assunto,<br>
        Com os melhores cumprimentos,<br>
        De V/Exas.<br>
        Atentamente
</td>
</tr>
<tr>
<td class="PMEPreto">
<img src="${PMEPreto}" alt="Logo" />
<img src="${QualidadePreto}" alt="Logo" />
</td>
<td style="
    font-size: 8px;">
        _____________________________________________________________________________________________________________________<br>
        Joaquim Peixoto Azevedo & Filhos, Lda * Alvará n.º 44085 . NIF / Nºmatrícula reg.c.r.c.:502244585 . Capital social: 750.000.00 €
</td>
</tr>
</table>
</div>
</body>
</html>
`;
    };

    const getTemplate1SecondPage = () => {
        if (!textParts.part2) {
            return "";
        }
        return `
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<style>
  .page {
    page-break-before: always;
    width: 100%;
    min-height: 1095.5px;
    font-size: 13pt;
  }
  .logo { text-align: left; }
  .logo img { max-width: 30%; height: auto; }
  .PMEPreto img { max-width: 25%; height: auto; }
</style>
</head>
<body>
<div class="page">
<table style="width:100%;height: 93%; border:0px solid #ccc;">
<tr>
<td class="logo" colspan="2" style="height: 130px;">
<img src="${logo}" alt="Logo JPA Construtora" />
</td>
</tr>
<tr>
<td colspan="2" style="vertical-align: top;height: 0px;">
<!-- Continuação do texto excedente -->
        ${textParts.part2}
</td>
</tr>
</tr>
<tr>
<td>
</td>
<td contentEditable="true" >
        Sem outro assunto,<br>
        Com os melhores cumprimentos,<br>
        De V/Exas.<br>
        Atentamente
</td>
</tr>
</table>
<table style="width:100%; border:0px solid #ccc;">
<tr>
<td class="PMEPreto">
<img src="${PMEPreto}" alt="Logo" />
<img src="${QualidadePreto}" alt="Logo" />
</td>
<td style="
    font-size: 8px;">
        _____________________________________________________________________________________________________________________<br>
        Joaquim Peixoto Azevedo & Filhos, Lda * Alvará n.º 44085 . NIF / Nºmatrícula reg.c.r.c.:502244585 . Capital social: 750.000.00 €
</td>
</tr>
</table>
</div>
</body>
</html>
`;
    };

    const getTemplate2 = () => `
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Modelo de Documento (Template 2)</title>
<style>
  body {
    font-family: Calibri, sans-serif;
    margin: 0; padding: 0;
    background-color: #f4f4f4; color: #333;
    font-size: 13pt;
  }
  .page {
    max-width: 100%;
    margin: auto;
    padding: 2rem;
    border: 0px solid #ccc;
    background-color: #fff;
    box-sizing: border-box;
    font-size: 8pt;
    height: 1095.5px;
    font-size: 13pt;
  }
  .logo { text-align: left; }
  .logo img { max-width: 30%; height: auto; }
  .PMEPreto img { max-width: 25%; height: auto; }
</style>
</head>
<body>
<div class="page">
  <table style="width:100%; border:0px solid #ccc;height: 100%;">
    <tr>
      <td class="logo" colspan="2">
        <img src="${logo}" alt="Logo JPA Construtora" />
      </td>
    </tr>
    <tr>
    <td colspan="2"></td>
    </tr>
    
    <tr>
    <td colspan="2"></td>
    </tr>
    
    <tr>
    <td colspan="2"></td>
    </tr>
    <tr>
    <td style="padding-left:300px;" contentEditable="false" colspan="2">
        EXMO(s) SR(s) ${donoObra.Nome}<br>
      </td>
    </tr>
    <tr>
    
      <td colspan="2">
       <div
          contentEditable="false"
          id="editableCellAssunto"
          oninput="window.updateTexto(this.innerText)"
          style="width: 100%; min-height: 800px; max-height: 600px; overflow: auto;"
        >
          ASSUNTO: ${assuntoDoc}<br><br>
          Exmo. Senhores,<br><br>
          ${textParts.part1 || ""}
        </div>
      </td>
    </tr>
    <tr>
      <td class="PMEPreto">
        <img src="${PMEPreto}" alt="Logo" />
        <img src="${QualidadePreto}" alt="Logo" />
      </td>
        <td style="
    font-size: 8px;">
        _____________________________________________________________________________________________________________________<br>
        Joaquim Peixoto Azevedo & Filhos, Lda * Alvará n.º 44085 . NIF / Nºmatrícula reg.c.r.c.:502244585 . Capital social: 750.000.00 €
      </td>
    </tr>
  </table>
</div>
</body>
</html>
`;

    const getTemplate2SecondPage = () => {
        if (!textParts.part2) {
            return "";
        }
        return `
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<style>
  .page {
    page-break-before: always;
    width: 100%;
    min-height: 1095.5px;
    font-size: 13pt;
  }
  .logo { text-align: left; }
  .logo img { max-width: 30%; height: auto; }
  .PMEPreto img { max-width: 25%; height: auto; }
</style>
</head>
<body>
<div class="page">
  <table style="width:100%;height: 93%; border:0px solid #ccc;">
    <tr>
      <td class="logo" colspan="2" style="height: 130px;">
        <img src="${logo}" alt="Logo JPA Construtora" />
      </td>
    </tr>
    <tr>
      <td colspan="2" style="vertical-align: top;">
        <!-- Continuação do texto excedente -->
        ${textParts.part2}
      </td>
    </tr>
  </table>
   <table style="width:100%; border:0px solid #ccc;">
       <tr>
      <td class="PMEPreto">
        <img src="${PMEPreto}" alt="Logo" />
        <img src="${QualidadePreto}" alt="Logo" />
      </td>
        <td style="
    font-size: 8px;">
        _____________________________________________________________________________________________________________________<br>
        Joaquim Peixoto Azevedo & Filhos, Lda * Alvará n.º 44085 . NIF / Nºmatrícula reg.c.r.c.:502244585 . Capital social: 750.000.00 €
      </td>
    </tr>
   </table>
</div>
</body>
</html>
`;
    };


    // ======================================
    // 17) Ao mudar algo de doc, recarregamos template
    // ======================================
    useEffect(() => {
        if (docxContainer.current) {
            const newContent = currentTemplate === 1 ? getTemplate1() : getTemplate2();
            docxContainer.current.innerHTML = newContent;

            if (docxContainer2.current) {
                const secondPageContent =
                    currentTemplate === 1 ? getTemplate1SecondPage() : getTemplate2SecondPage();
                docxContainer2.current.innerHTML = secondPageContent;
            }
        }
    }, [currentTemplate, donoObra, formData, textParts, assuntoDoc]);

    // ======================================
    // 18) Filtro de obras (comboBox)
    // ======================================
    const handleOptionClick = (obra) => {
        setInputValue(obra.Codigo);
        setSelectedObra(obra);
        setShowOptions(false);
        handleObraChange(obra);
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        setShowOptions(true);
    };


    const filteredObras = obras.filter((obra) =>
        obra.Codigo.toLowerCase().includes(inputValue.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (comboBoxRef.current && !comboBoxRef.current.contains(event.target)) {
                setShowOptions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    // ======================================
    // 19) Update
    // ======================================
    const handleSaveOrUpdate = async () => {
        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");
        const usernome = localStorage.getItem("userNome");
        const useremail = localStorage.getItem("userEmail");
        const templateestado = currentTemplate === 1 ? "1" : "2";

        // Payload comum para criação e atualização
        const payloadDoc = {
            ...formData,
            assunto: assuntoDoc,
            texto1: textParts.part1 || "",
            texto2: textParts.part2 || "",
            obra: selectedObra.ID,
            remetente: usernome,
            createdby: usernome,
            email: useremail,
            template: templateestado,
        };

        try {
            // Define URL e método com base na operação (criar ou atualizar)
            const url = isButtonSave
                ? `https://webapiprimavera.advir.pt/oficio/Criar` // Endpoint para criar
                : `https://webapiprimavera.advir.pt/oficio/atualizar`; // Endpoint para atualizar
            const method =  "PUT";

            const response = await fetch("https://webapiprimavera.advir.pt/oficio/atualizar", {
                method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "urlempresa": urlempresa,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payloadDoc),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro https: ${response.status} - ${errorData.error}`);
            }

            const data = await response.json();
            alert(isButtonSave ? "Ofício criado com sucesso!" : "Ofício atualizado com sucesso!");
            console.log("Resposta do servidor:", data);

            // Se necessário, atualize o estado local com a resposta
        } catch (error) {
            console.error(`Erro ao ${isButtonSave ? "criar" : "atualizar"} o ofício:`, error);
            alert(`Erro ao ${isButtonSave ? "criar" : "atualizar"} o ofício. Verifique os logs.`);
        }
    };

    const goBackToOficiosList = () => {
        navigation.navigate('OficiosList'); // Navigate to OficiosList screen
    };
    return (
        <div style={styles.pageContainer}>
            <header style={styles.header}>
                <div style={styles.controlsAlignedLeft}>
                    <TouchableOpacity
                                        onPress={goBackToOficiosList}
                                        style={{
                                            position: 'absolute', // Posiciona o botão fora do fluxo normal
                                            top: 10, // Define a distância do topo
                                            left: 10, // Define a distância da esquerda
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            padding: 10,
                                            borderRadius: 30,
                                            borderColor: '#1792FE',
                                            borderWidth: 1,
                                            zIndex: 1000, // Garante que o botão fique acima de outros elementos
                                        }}
                                    >
                                        <FontAwesomeIcon
                                            icon={faArrowLeft}
                                            style={{ color: '#1792FE', marginRight: 5 }}
                                        />
                                        <Text style={{ color: '#1792FE' }}>Voltar</Text>
                                    </TouchableOpacity>

                    {/* Botão Mudar Template só aparece na pré-visualização */}
                    {isPreviewVisible && (
                        <>
                            <button onClick={changeTemplate} style={styles.button}>
                                Mudar Template
                            </button>

                            <button
                                onClick={() => {
                                    setIsPreviewVisible(!isPreviewVisible); // Alterna entre pré-visualização e edição
                                    if (!isPreviewVisible) {
                                        
                                        changeTemplate(); // Garante que o template é inicializado ao ativar a pré-visualização
                                        
                                    }
                                }}
                                style={styles.button}
                            >
                                {isPreviewVisible ? "Editar" : "Pré-visualizar"}
                            </button>

                           
                            <button
                                onClick={() => {
                                    if (!isButtonSave) {
                                        setIsButtonSave(true);
                                        handleSavePDF(); 
                                        handleSave(); 
                                    } else {
                                        handleSavePDF();
                                    }
                                }}
                                style={styles.button}
                            >
                                <FaFilePdf /> Guardar/PDF
                            </button>
                            <button
                                onClick={() => {
                                    if (!isButtonSave) {
                                        setIsButtonSave(true);
                                        handleSave();
                                        setIsModalOpen(true);
                                    } else {
                                        setIsModalOpen(true);
                                    }
                                }}
                                style={styles.button}
                            >
                                <FaEnvelope /> Guardar/Email
                            </button>

                            <button
                                onClick={() => {
                                    if (!isButtonSave) {
                                        setIsButtonSave(true);
                                        handleSave();
                                    } else {
                                        handleSaveOrUpdate();
                                    }
                                }}
                                style={styles.button}
                            >
                                <FaSave /> Guardar
                            </button>

                        </>
                    )}

                </div>


            </header>

            {/* Renderiza os inputs ou a pré-visualização */}
            {isPreviewVisible ? (
                <>
                    {/* Área de visualização do DOCUMENTO (template) */}
                    <div ref={docxContainer} style={styles.docxContainer}></div>
                    {textParts.part2 && (
                        <div ref={docxContainer2} style={styles.docxContainer}></div>
                    )}
                </>
            ) : (
                <div style={{ width: "60%", margin: "0 auto", padding: "20px", backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
                {/* Campo para selecionar obra */}
                <div style={{ position: "relative", width: "100%", marginBottom: "20px" }} ref={comboBoxRef}>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        placeholder="Selecione ou escreva a obra"
                        style={{
                            width: "100%",
                            padding: "12px",
                            margin: "10px 0",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            fontSize: "16px",
                            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                        }}
                        onFocus={() => setShowOptions(true)}
                    />
                    {showOptions && (
                        <ul
                            style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                right: 0,
                                margin: 0,
                                padding: "10px",
                                listStyle: "none",
                                border: "1px solid #ddd",
                                borderRadius: "8px",
                                background: "white",
                                maxHeight: "150px",
                                overflowY: "auto",
                                zIndex: 10,
                                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                            }}
                        >
                            <li
                                onClick={() => {
                                    setSelectedObra(null);
                                    setInputValue("Não tem obra");
                                    setShowOptions(false);
                                    setDonoObra("");
                                }}
                                style={{
                                    padding: "10px",
                                    cursor: "pointer",
                                    color: "#333",
                                    background: "#f9f9f9",
                                    borderRadius: "6px",
                                }}
                            >
                                Não tem obra
                            </li>
                            {filteredObras.map((obra, index) => (
                                <li
                                    key={index}
                                    onClick={() => {
                                        handleOptionClick(obra);
                                        setDonoObra(obra.Codigo);
                                    }}
                                    style={{
                                        padding: "10px",
                                        cursor: "pointer",
                                        color: "#333",
                                        background:
                                            selectedObra?.Codigo === obra.Codigo ? "#e6f7ff" : "white",
                                        borderRadius: "6px",
                                        marginBottom: "5px",
                                    }}
                                >
                                    {obra?.Codigo || ""} - {obra?.Descricao || ""}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            
                {/* Campo de destinatário */}
                <input
                    type="text"
                    placeholder="Destinatário"
                    value={donoObra?.Nome || ""}
                    onChange={(e) =>
                        setDonoObra((prev) => ({
                            ...prev,
                            Nome: e.target.value,
                        }))
                    }
                    style={{
                        width: "100%",
                        padding: "12px",
                        margin: "10px 0",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        fontSize: "16px",
                        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                    }}
                    disabled={inputValue !== "Não tem obra"}
                />

                {/* Exibe campos somente quando a opção "Não tem obra" está selecionada */}
  {inputValue === "Não tem obra" && (
<>
          {/* Campo de morada */}
<input
              type="text"
              placeholder="Morada"
              value={morada}
              onChange={(e) => setMorada(e.target.value)}
              style={{
                  width: "100%",
                  padding: "12px",
                  margin: "10px 0",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "16px",
                  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
              }}
          />
 
          {/* Campo de localidade */}
<input
              type="text"
              placeholder="Localidade"
              value={localidade}
              onChange={(e) => setLocalidade(e.target.value)}
              style={{
                  width: "100%",
                  padding: "12px",
                  margin: "10px 0",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "16px",
                  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
              }}
          />
 
          {/* Campo de código postal e local coppostal lado a lado */}
            <div style={{ display: "flex", gap: "10px", margin: "10px 0" }}>
            <input
                            type="text"
                            placeholder="Código Postal"
                            value={codigoPostal}
                            onChange={(e) => setCodigoPostal(e.target.value)}
                            style={{
                                flex: 1,
                                padding: "12px",
                                border: "1px solid #ddd",
                                borderRadius: "8px",
                                fontSize: "16px",
                                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                            }}
                        />
            <input
                            type="text"
                            placeholder="Local CopPostal"
                            value={localCopPostal}
                            onChange={(e) => setLocalCopPostal(e.target.value)}
                            style={{
                                flex: 1,
                                padding: "12px",
                                border: "1px solid #ddd",
                                borderRadius: "8px",
                                fontSize: "16px",
                                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                            }}
                        />
            </div>
            </>
            )}
            
                {/* Campo de assunto */}
                <input
                    type="text"
                    placeholder="Assunto do Documento"
                    value={assuntoDoc}
                    onChange={(e) => setAssuntoDoc(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "12px",
                        margin: "10px 0",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        fontSize: "16px",
                        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                    }}
                />
            
                {/* Campo de texto editável */}
                <div
                        ref={contentEditableRef}
                        contentEditable="true"
                        dir="ltr"
                        onBlur={handleBlur}
                        onKeyDown={(e) => {
                            if (e.key === "Tab") {
                                e.preventDefault();
                                const selection = window.getSelection();
                                const range = selection.getRangeAt(0);

                                const tabNode = document.createTextNode("\u00A0\u00A0\u00A0\u00A0");
                                range.insertNode(tabNode);

                                range.setStartAfter(tabNode);
                                range.setEndAfter(tabNode);
                                selection.removeAllRanges();
                                selection.addRange(range);
                            }
                        }}
                        style={{
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                            backgroundColor: "white",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            padding: "12px",
                            minHeight: "200px",
                            overflowY: "auto",
                            fontSize: "16px",
                            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                        }}
                        dangerouslySetInnerHTML={{ __html: textoDoc }}
                    ></div>
            
                {/* Campo para anexos */}
                <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "20px", cursor: "pointer", color: "#1792FE", fontWeight: "bold" }}>
                    <FaPaperclip /> Anexos
                    <input
                        type="file"
                        multiple
                        onChange={handleAddAnexo}
                        style={{ display: "none" }}
                    />
                </label>
            
                {/* Lista de anexos */}
                {anexos.length > 0 && (
                    <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f9f9f9", border: "1px solid #ddd", borderRadius: "8px" }}>
                        <h4 style={{ fontSize: "16px", marginBottom: "10px", color: "#333" }}>Anexos:</h4>
                        <ul style={{ listStyleType: "none", paddingLeft: "0", margin: "0" }}>
                            {anexos.map((anexo, index) => (
                                <li
                                    key={index}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "10px",
                                        border: "1px solid #ddd",
                                        borderRadius: "8px",
                                        marginBottom: "8px",
                                        backgroundColor: "#fff",
                                    }}
                                >
                                    {anexo.name}
                                    <button
                                        onClick={() => handleRemoveAnexo(index)}
                                        style={{
                                            backgroundColor: "#ff4d4d",
                                            color: "#fff",
                                            border: "none",
                                            padding: "5px 10px",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Remover
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            
                {/* Botão de alternar entre pré-visualização e edição */}
                <button
                    onClick={() => {
                        setIsPreviewVisible(!isPreviewVisible);
                        if (!isPreviewVisible) {
                            changeTemplate();
                        }
                    }}
                    style={{
                        width: "100%",
                        padding: "12px",
                        marginTop: "20px",
                        backgroundColor: "#1792FE",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "16px",
                        cursor: "pointer",
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                    }}
                >
                    {isPreviewVisible ? "Editar" : "Pré-visualizar"}
                </button>
            </div>

            )}





            {/* MODAL para envio de email (campos independentes) */}
            {isModalOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>


                        <input
                            type="text"
                            placeholder="Para:"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                            style={styles.input}
                        />

                        <input
                            type="text"
                            placeholder="CC:"
                            value={emailCC}
                            onChange={(e) => setEmailCC(e.target.value)}
                            style={styles.input}
                        />


                        <input
                            type="text"
                            placeholder="Assunto do Email"
                            value={emailAssunto}
                            onChange={(e) => setEmailAssunto(e.target.value)}
                            style={styles.input}
                        />

                        <textarea
                            placeholder="Mensagem do Email"
                            value={emailTexto}
                            onChange={(e) => setEmailTexto(e.target.value)}
                            style={{ ...styles.input, height: "150px" }}
                        />

                        <label style={styles.fileInputLabel}>
                            <FaPaperclip /> Anexos
                            <input
                                type="file"
                                multiple
                                onChange={handleAddAnexo}
                                style={styles.fileInput}
                            />
                        </label>

                        {anexos.length > 0 && (
                            <div style={styles.anexosList}>
                                <h4 style={styles.h4}>Anexos:</h4>
                                <ul style={styles.ul}>
                                    {anexos.map((anexo, index) => (
                                        <li key={index} style={styles.li}>
                                            {anexo.name}
                                            <button
                                                onClick={() => handleRemoveAnexo(index)}
                                                style={styles.removeButton}
                                            >
                                                Remover
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div style={styles.modalActions}>
                            <button onClick={handleSendEmailWithOfficeAPI} style={styles.button}>
                                Enviar
                            </button>
                            <button onClick={() => setIsModalOpen(false)} style={styles.cancelButton}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==============================
// Estilos
// ==============================
const styles = {
    
    pageContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#d4e4ff",
        overflowY: "auto",
        padding: "20px",
    },
    body: {
        margin: 0,
        padding: 0,
        display: "flex",
        justifycontent: "center",
        alignItems: "center",
        minheight: "100vh",
        backgroundColor: "#d4e4ff", /* fundo azul claro */
      },
    header: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        padding: "15px 20px",
        backgroundColor: "#d4e4ff",
        color: "#fff",
        marginBottom: "20px",
    },
    controlsAlignedLeft: {
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        justifyContent: "center",
        alignItems: "center",
    },
    input: {
        width: "100%", // Ajusta para preencher a largura disponível
        padding: "10px",
        fontSize: "16px",
        border: "1px solid #ccc",
        borderRadius: "5px",
        marginBottom: "10px", // Espaçamento entre campos
        boxSizing: "border-box", // Inclui padding e border no cálculo da largura
    },
    textarea: {
        width: "100%",
        padding: "10px",
        fontSize: "16px",
        border: "1px solid #ccc",
        borderRadius: "5px",
        height: "300px",
        resize: "none", // Remove o redimensionamento
        whiteSpace: "pre-wrap", // Respeita as quebras de linha
        boxSizing: "border-box",
    },
    fileInputLabel: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 20px",
        fontSize: "16px",
        color: "#fff",
        backgroundColor: "#1792FE",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "background-color 0.3s ease",
        marginTop: "10px",
    },
    fileInput: {
        display: "none",
    },
    button: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 20px",
        fontSize: "16px",
        color: "#fff",
        backgroundColor: "#1792fe",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "background-color 0.3s ease",
        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
    },
    docxContainer: {
        marginTop: "20px",
        width: "793.7px",
        height: "1122.5px",
        border: "0px solid #ccc",
        backgroundColor: "#fff",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    removeButton: {
        backgroundColor: "#1792FE",
        color: "#fff",
        border: "none",
        padding: "5px 10px",
        marginLeft: "10px",
        cursor: "pointer",
        borderRadius: "5px",
        fontSize: "14px",
        transition: "background-color 0.3s ease",
    },
    anexosList: {
        marginTop: "15px",
        padding: "15px",
        backgroundColor: "#eef",
        border: "1px solid #ccc",
        borderRadius: "8px",
        width: "100%",
        maxWidth: "600px",
    },
    h4: {
        color: "#333",
        fontSize: "18px",
        marginBottom: "10px",
    },
    ul: {
        listStyleType: "none",
        paddingLeft: "0",
        margin: "0",
        color: "#333",
    },
    li: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 10px",
        marginBottom: "5px",
        border: "1px solid #ddd",
        borderRadius: "6px",
        backgroundColor: "#fff",
        fontSize: "14px",
        transition: "box-shadow 0.3s ease",
    },
    cancelButton: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 20px",
        fontSize: "16px",
        color: "#fff",
        backgroundColor: "#999",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "background-color 0.3s ease",
        margin: "20px auto", display: "block"
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: "#fff",
        padding: "20px",
        borderRadius: "10px",
        width: "400px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
    },
    modalActions: {
        marginTop: "20px",
        display: "flex",
        justifyContent: "center",
        gap: "10px",
    },
    formContainer: {
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
        width: "100%",
    },
};

export default OficiosPage;


