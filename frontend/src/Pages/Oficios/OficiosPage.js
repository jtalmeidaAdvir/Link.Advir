import React, { useRef, useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { FaSave, FaEnvelope, FaFilePdf, FaPaperclip } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

// Importação de imagens
import logo from "../../../images/jpa-construtora.png";
import PMEPreto from "../../../images/PMEPRETO.png";
import QualidadePreto from "../../../images/QUALIDADEPRETO.png";
import Logo50 from "../../../images/Logo50.jpg";

// Importação dos módulos criados
import {
    getTemplate1,
    getTemplate1SecondPage,
    getTemplate2,
    getTemplate2SecondPage,
    createPage,
    createPage2,
} from "../../templates/DocumentTemplates";
import styles from "../../styles/OficiosStyles";
import { checkSpelling, limitText, splitText, calculateTextHeight } from "../../utils/helpers";

const OficiosPage = (props) => {
    // ==============================
    // 1) Estados e Referências
    // ==============================
    const comboBoxRef = useRef(null);

    const [pageCount2, setPageCount2] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false); // Modal de envio de email
    const [currentTemplate, setCurrentTemplate] = useState(2); // 1 ou 2
    const [donoObra, setDonoObra] = useState("");
    const navigation = useNavigation();
    const [isEditable, setIsEditable] = useState(false);
    const [selectedObra, setSelectedObra] = useState("");
    const [assuntoDoc, setAssuntoDoc] = useState("");
    const [textoDoc, setTextoDoc] = useState("");
    const [anexos, setAnexos] = useState([]);
    const [anexostext, setAnexostext] = useState("");
    const docxContainer = useRef(null);
    const docxContainer2 = useRef(null);
    const [isTemplateVisible, setIsTemplateVisible] = useState(false);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [isButtonSave, setIsButtonSave] = useState(false);
    const [morada, setMorada] = useState("");
    const [localidade, setLocalidade] = useState("");
    const [codigoPostal, setCodigoPostal] = useState("");
    const [localCopPostal, setLocalCopPostal] = useState("");
    const [paginasCriadas, setpaginasCriadas] = useState(0);
    const [estadodoc, setEstado] = useState("");
    const contentEditableRef = useRef(null);
    const [atencao, setAtencao] = useState("");

    // Texto dividido (se houver parte extra)
    const [textParts, setTextParts] = useState({
        part1:
            "JOAQUIM PEIXOTO AZEVEDO, & FILHOS, LDA, com sede na Rua de Longras, n.º 44, 4730 360 Vila Verde, na qualidade de",
        part2: "",
    });

    // Dados do documento
    const [formData, setFormData] = useState({
        codigo: "",
        data: new Date().toISOString().slice(0, 10),
        remetente: "",
        email: "",
        texto1: "",
        texto2: "",
        texto3: "",
        template: "",
        createdby: "",
        donoObra: "",
    });

    // Lista de obras
    const [obras, setObras] = useState([]);
    const [obras2, setObras2] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [showOptions, setShowOptions] = useState(false);
    const constComboBoxRef = useRef(null);
    // Segunda combobox
    const comboBoxRef2 = useRef(null);
    const [inputValue2, setInputValue2] = useState("");
    const [showOptions2, setShowOptions2] = useState(false);
    const [filteredObras2, setFilteredObras2] = useState([]);
    const [selectedObra2, setSelectedObra2] = useState(null);
    const [donoObra2, setDonoObra2] = useState("");

    // Estados para o modal de envio de email
    const [emailTo, setEmailTo] = useState("");
    const [emailCC, setEmailCC] = useState("");
    const [emailAssunto, setEmailAssunto] = useState("");
    const [emailTexto, setEmailTexto] = useState("");

    // ==============================
    // 2) Efeitos e Eventos Gerais
    // ==============================
    useEffect(() => {
        window.updateTexto = (novoTexto) => {
            setTextoDoc(novoTexto || "");
        };
        return () => {
            delete window.updateTexto;
        };
    }, []);

    const handleBlur = () => {
        if (contentEditableRef.current) {
            setTextoDoc(contentEditableRef.current.innerHTML);
        }
    };

    const handleInputPart1 = (e) => {
        const newText = e.target.innerHTML;
        const limitedText = limitText(newText, 1020);
        setTextParts((prev) => ({
            ...prev,
            part1: limitedText,
        }));
    };

    const handleInputPart2 = (e) => {
        const newText = e.target.innerHTML;
        setTextParts((prev) => ({
            ...prev,
            part2: newText,
        }));
    };

    // Carregar obras e entidades
    useEffect(() => {
        const fetchObras = async () => {
            const token = localStorage.getItem("painelAdminToken");
            const urlempresa = localStorage.getItem("urlempresa");
            if (!urlempresa) return;
            try {
                const response = await fetch(
                    "https://webapiprimavera.advir.pt/oficio/ListarObras",
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            urlempresa: urlempresa,
                            "Content-Type": "application/json",
                        },
                    }
                );
                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }
                const data = await response.json();
                if (data && data.DataSet && Array.isArray(data.DataSet.Table)) {
                    setObras(data.DataSet.Table);
                }
            } catch (error) {
                console.error("Erro ao carregar obras:", error);
            }
        };
        const fetchEntidades = async () => {
            const token = localStorage.getItem("painelAdminToken");
            const urlempresa = localStorage.getItem("urlempresa");
            if (!urlempresa) return;
            try {
                const response = await fetch(
                    "https://webapiprimavera.advir.pt/oficio/ListarEntidades",
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            urlempresa: urlempresa,
                            "Content-Type": "application/json",
                        },
                    }
                );
                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }
                const data = await response.json();
                if (data && data.DataSet && Array.isArray(data.DataSet.Table)) {
                    console.log(data.DataSet.Table);
                    setObras2(data.DataSet.Table);
                }
            } catch (error) {
                console.error("Erro ao carregar obras:", error);
            }
        };
        fetchObras();
        setDonoObra("");
    }, []);

    const handleFocus = () => {
        if (filteredObras2.length === 0 && !showOptions2) {
            fetchEntidades();
            setShowOptions2(true);
        }
    };

    const handleComboBoxClick = () => {
        setShowOptions2(true);
        fetchEntidades();
    };

    const fetchEntidades = async () => {
        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");
        if (!urlempresa) return;
        try {
            const response = await fetch(
                "https://webapiprimavera.advir.pt/oficio/ListarEntidades",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                }
            );
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }
            const data = await response.json();
            if (data && data.DataSet && Array.isArray(data.DataSet.Table)) {
                console.log(data.DataSet.Table);
                setObras2(data.DataSet.Table);
            }
        } catch (error) {
            console.error("Erro ao carregar obras:", error);
        }
    };

    const filterObras = (inputValue, obras) => {
        return obras.filter((obra) =>
            obra?.Codigo?.toLowerCase().includes(inputValue.toLowerCase()) ||
            obra?.Nome?.toLowerCase().includes(inputValue.toLowerCase())
        );
    };

    // ==============================
    // 3) Funções para gerar PDF, enviar email e salvar
    // (mantendo todo o código original)
    // ==============================
    const handleSavePDF = async () => {
        const containers = [docxContainer.current, docxContainer2.current];
        const validContainers = containers.filter((container) => container);
        if (validContainers.length === 0) return;
        try {
            const pdf1 = new jsPDF("portrait", "mm", "a4");
            const pdfWidth = 210;
            const canvas1 = await html2canvas(validContainers[0], {
                scale: 2,
                useCORS: true,
                logging: true,
                scrollX: 0,
                scrollY: 0,
            });
            const imgData1 = canvas1.toDataURL("image/jpeg", 0.8);
            const imgHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
            pdf1.addImage(imgData1, "JPEG", 0, 0, pdfWidth, imgHeight1, undefined, "FAST");
            pdf1.save(formData.codigo + ".pdf");

            const pdf2 = new jsPDF("portrait", "mm", "a4");
            const container2 = validContainers[1];
            const canvas2 = await html2canvas(container2, {
                scale: 2,
                useCORS: true,
                logging: true,
                scrollX: 0,
                scrollY: 0,
            });
            const imgData2 = canvas2.toDataURL("image/jpeg", 0.8);
            const imgHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
            let currentHeight = 0;
            let pageIndex = 0;
            pdf2.addImage(imgData2, "JPEG", 0, 0, pdfWidth, imgHeight2, undefined, "FAST");
            currentHeight += 297;
            for (var i = 1; i < pageCount2; i++) {
                pdf2.addPage();
                pdf2.addImage(
                    imgData2,
                    "JPEG",
                    0,
                    -currentHeight,
                    pdfWidth,
                    imgHeight2,
                    undefined,
                    "FAST"
                );
                currentHeight += 297;
                pageIndex++;
            }
            pdf2.save(formData.codigo + ".pdf");
        } catch (error) {
            console.error("Erro ao gerar os PDFs:", error);
        }
        if (!isButtonSave) {
            console.log("Chamando handleSave com o estado 'Imprimir'");
            handleSave("Imprimido");
        }
    };

    const handleSavePDFAndSendToBackend = async () => {
        const containers = [docxContainer.current, docxContainer2.current];
        const validContainers = containers.filter((container) => container);
        if (validContainers.length === 0) return;
        setEstado("Imprimido");
        try {
            const pdfWidth = 210;
            const pdfHeight = 297;
            const pdf1 = new jsPDF("portrait", "mm", "a4");
            const canvas1 = await html2canvas(validContainers[0], {
                scale: 2,
                useCORS: true,
                logging: true,
                scrollX: 0,
                scrollY: 0,
            });
            const imgData1 = canvas1.toDataURL("image/jpeg", 1);
            const imgHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
            pdf1.addImage(imgData1, "JPEG", 0, 0, pdfWidth, imgHeight1, undefined, "FAST");
            const fileHandle1 = await window.showSaveFilePicker({
                suggestedName: `${formData?.codigo || ""}.pdf`,
                types: [
                    {
                        description: "PDF File",
                        accept: { "application/pdf": [".pdf"] },
                    },
                ],
            });
            const writable1 = await fileHandle1.createWritable();
            await writable1.write(pdf1.output("blob"));
            await writable1.close();

            const pdf2 = new jsPDF("portrait", "mm", "a4");
            const container2 = validContainers[1];
            const canvas2 = await html2canvas(container2, {
                scale: 2,
                useCORS: true,
                logging: true,
                scrollX: 0,
                scrollY: 0,
            });
            const imgData2 = canvas2.toDataURL("image/jpeg", 0.8);
            const imgHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
            console.log(pageCount2);
            let pageIndex = 0;
            let currentHeight = 0;
            let pageCount = pageCount2;
            pdf2.addImage(imgData2, "JPEG", 0, 0, pdfWidth, imgHeight2, undefined, "FAST");
            currentHeight += pdfHeight;
            for (let i = 1; i < pageCount; i++) {
                pdf2.addPage();
                pdf2.addImage(
                    imgData2,
                    "JPEG",
                    0,
                    -currentHeight,
                    pdfWidth,
                    imgHeight2,
                    undefined,
                    "FAST"
                );
                currentHeight += pdfHeight;
                pageIndex++;
            }
            const fileHandle2 = await window.showSaveFilePicker({
                suggestedName: `${formData?.codigo || ""}.Anexo.pdf`,
                types: [
                    {
                        description: "PDF File",
                        accept: { "application/pdf": [".pdf"] },
                    },
                ],
            });
            const writable2 = await fileHandle2.createWritable();
            await writable2.write(pdf2.output("blob"));
            await writable2.close();
        } catch (error) {
            console.error("Erro ao gerar os PDFs:", error);
        }
        if (!isButtonSave) {
            console.log("Chamando handleSave com o estado 'Imprimir'");
            handleSave("Imprimido");
        }
    };

    const handleRemoveAnexo = (index) => {
        setAnexos((prevAnexos) => {
            const updatedAnexos = prevAnexos.filter((_, i) => i !== index);
            const anexosNomes = updatedAnexos.map((file) => file.name).join(", ");
            const editableCellCodigo = document.getElementById("editableCellCodigo");
            if (editableCellCodigo) {
                editableCellCodigo.innerHTML = `
          REF: ${formData.codigo}<br>
          DATA: ${formData.data}<br>
          ANEXOS: ${anexosNomes || ""}<br><br><br><br>
          REMETENTE<br><br>
          ${formData.remetente ? formData.remetente : "Remetente não disponível"}<br>
          ${formData.email || "Email não existe"}
        `;
            }
            return updatedAnexos;
        });
    };

    const handleSendEmailWithOfficeAPI = async () => {
        if (!emailAssunto && assuntoDoc) {
            setEmailAssunto(assuntoDoc);
        }
        const containers = [docxContainer.current, docxContainer2.current];
        if (!containers[0]) return;
        try {
            const pdf1 = new jsPDF("portrait", "mm", "a4");
            const pdfWidth = 210;
            const pdfHeight = 297;
            const canvas1 = await html2canvas(containers[0], {
                scale: 2,
                useCORS: true,
                logging: true,
                scrollX: 0,
                scrollY: 0,
            });
            const imgData1 = canvas1.toDataURL("image/jpeg", 0.5);
            const imgHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
            pdf1.addImage(imgData1, "JPEG", 0, 0, pdfWidth, imgHeight1, undefined, "FAST");
            const pdf1Blob = pdf1.output("blob");
            const pdf1Base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(",")[1]);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(pdf1Blob);
            });
            const pdf2 = new jsPDF("portrait", "mm", "a4");
            const container2 = containers[1];
            const processedAnexos = await Promise.all(
                anexos.map(
                    (file) =>
                        new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64Content = reader.result.split(",")[1];
                                resolve({
                                    name: file.name,
                                    content: base64Content,
                                });
                            };
                            reader.onerror = (error) => reject(error);
                            reader.readAsDataURL(file);
                        })
                )
            );
            if (container2) {
                const canvas2 = await html2canvas(container2, {
                    scale: 2,
                    useCORS: true,
                    logging: true,
                    scrollX: 0,
                    scrollY: 0,
                });
                const imgData2 = canvas2.toDataURL("image/jpeg", 0.5);
                const imgHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
                let yPosition = 0;
                let remainingHeight = imgHeight2;
                for (var i = 0; i < pageCount2; i++) {
                    if (yPosition > 0) {
                        pdf2.addPage();
                    }
                    pdf2.addImage(
                        imgData2,
                        "JPEG",
                        0,
                        -yPosition,
                        pdfWidth,
                        imgHeight2,
                        undefined,
                        "FAST"
                    );
                    yPosition += pdfHeight;
                    remainingHeight -= pdfHeight;
                }
                const pdf2Blob = pdf2.output("blob");
                const pdf2Base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(",")[1]);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(pdf2Blob);
                });
                processedAnexos.push({
                    name: "Anexo_" + formData.codigo + ".pdf",
                    content: pdf2Base64,
                });
            }
            processedAnexos.push({
                name: formData.codigo + ".pdf",
                content: pdf1Base64,
            });
            let formattedEmailTexto = emailTexto.replace(/\n/g, "<br />");
            const useremail = localStorage.getItem("userEmail");
            formattedEmailTexto += `<br /><br /><div style='color: #777; font-size: 12px; border-top: 1px solid #eee; padding-top: 10px;'><p>Este email é enviado automaticamente de oficio@jpaconstrutora.com. Para responder, por favor envie email para ${useremail}.</p></div>`;
            const includeSignature = document.getElementById("includeSignature").checked;
            if (includeSignature) {
                const signatureElement = document.getElementById("emailSignature");
                const signatureHtml = signatureElement.innerHTML;
                formattedEmailTexto += "<br />" + signatureHtml;
            }
            const payload = {
                emailDestinatario: emailTo,
                emailCC: emailCC,
                assunto: emailAssunto,
                texto: formattedEmailTexto,
                remetente: formData.remetente,
                anexos: processedAnexos,
                replyTo: useremail,
                from: "oficio@jpaconstrutora.com",
            };
            const response = await fetch("https://webapiprimavera.advir.pt/sendmailoficios", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            if (response.ok) {
                console.log("E-mail enviado com sucesso!");
            } else {
                const errorData = await response.json();
                console.error("Erro ao enviar email:", errorData);
            }
            handleSave("Enviado Por Email");
        } catch (error) {
            console.error("Erro ao gerar ou enviar o PDF com anexos:", error);
            handleSave("Erro no envio");
        } finally {
            setIsModalOpen(false);
        }
    };

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
          ${formData.remetente ? formData.remetente : "Remetente não disponível"}<br>
          ${formData.email || "Email não existe"}
        `;
            }
            return updatedAnexos;
        });
    };

    // ==============================
    // 4) Funções de salvar/atualizar ofício
    // ==============================
    useEffect(() => { }, [estadodoc]);

    const handleSave = async (estado) => {
        console.log("teste" + estado);
        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");
        const usernome = formData.remetente || localStorage.getItem("userNome");
        const useremail = formData.email || localStorage.getItem("userEmail");
        let nomeDonoObra = "";
        let moradaDonoObra = "";
        let localidadeDonoObra = "";
        let codPostalDonoObra = "";
        let codPostalLocalDonoObra = "";
        let obraSlecionadaSave = "";
        const nomesAnexos = anexos.map((anexo) => anexo.name).join(", ");
        if (inputValue === "Não tem obra") {
            nomeDonoObra = donoObra?.Nome || donoObra2?.Nome || "";
            moradaDonoObra = donoObra?.Morada || morada || "";
            localidadeDonoObra = donoObra?.Localidade || localidade || "";
            codPostalDonoObra = donoObra?.CodPostal || codigoPostal || "";
            codPostalLocalDonoObra = donoObra?.CodPostalLocal || localCopPostal || "";
            obraSlecionadaSave = "Não tem obra";
        } else {
            nomeDonoObra = donoObra.Nome;
            moradaDonoObra = donoObra.Morada;
            localidadeDonoObra = donoObra.Localidade;
            codPostalDonoObra = donoObra.CodPostal;
            codPostalLocalDonoObra = donoObra.CodPostalLocal;
            obraSlecionadaSave = selectedObra?.Codigo || "";
        }
        const templateestado = currentTemplate === 1 ? "2" : "1";
        const part2Chunks = splitText(textParts.part2 || "");
        const payloadDoc = {
            ...formData,
            codigo: formData?.codigo || "",
            assunto: assuntoDoc,
            texto1: textParts.part1 || "",
            texto2: part2Chunks[0] || "",
            texto3: part2Chunks[1] || "",
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
            anexos: anexostext || "",
            texto4: part2Chunks[2],
            texto5: part2Chunks[3],
            estado: estado,
            atencao: atencao,
        };
        try {
            const response = await fetch("https://webapiprimavera.advir.pt/oficio/Criar", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    urlempresa: urlempresa,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payloadDoc),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro https: ${response.status} - ${errorData.error}`);
            }
            const data = await response.json();
            console.log("Resposta do servidor:", data);
        } catch (error) {
            console.error("Erro ao criar o ofício:", error);
        }
    };

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
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
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
                console.error("Erro ao buscar obras:", error);
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
                    Authorization: `Bearer ${token}`,
                    urlempresa: urlempresa,
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
            console.error("Erro ao buscar email da obra:", error);
        }
    };

    useEffect(() => {
        if (donoObra?.EntidadeId) {
            fetchEmailObra();
        }
    }, [donoObra]);

    const generateCodigo = async () => {
        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");
        const userNome = localStorage.getItem("userNome");
        try {
            const response = await fetch("https://webapiprimavera.advir.pt/oficio/GetId", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    urlempresa: urlempresa,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro https: ${response.status} - ${errorData.error}`);
            }
            const data = await response.json();
            let conteudoCentral = data?.DataSet?.Table?.[0]?.Conteudo_Central || "000";
            const novoConteudoCentral = String(parseInt(conteudoCentral, 10) + 1).padStart(3, "0");
            const currentYear = new Date().getFullYear().toString().slice(-2);
            const currentMonth = new Date().getMonth() + 1;
            const formattedMonth = currentMonth.toString().padStart(2, "0");
            let iniciais = "";
            if (userNome) {
                const palavras = userNome.split(/\s+/);
                if (palavras.length >= 2) {
                    iniciais = palavras[0][0].toUpperCase() + palavras[1][0].toUpperCase();
                } else if (palavras.length === 1) {
                    iniciais = palavras[0][0].toUpperCase();
                }
            }
            const updatedCodigo = `OFI${currentYear}${formattedMonth}${novoConteudoCentral}${iniciais}`;
            const editableCellCodigo = document.getElementById("editableCellCodigo");
            if (editableCellCodigo) {
                editableCellCodigo.innerHTML = `
                    REF: ${updatedCodigo}<br>
                    DATA: ${formData.data}<br>
                    ANEXOS: ${anexos.map((a) => a.name).join(", ") || ""}<br>
                `;
            }
            setFormData((prevFormData) => ({
                ...prevFormData,
                codigo: updatedCodigo,
            }));
        } catch (error) {
            console.error("Erro ao obter o último ID:", error);
            throw error;
        }
    };

    const changeTemplate = () => {
        generateCodigo();
        const newTemplate = currentTemplate === 1 ? 2 : 1;
        setCurrentTemplate(newTemplate);
        setIsTemplateVisible(true);
        const newContent =
            currentTemplate === 1
                ? getTemplate1({
                    formData,
                    assuntoDoc,
                    textParts,
                    donoObra,
                    morada,
                    localidade,
                    codigoPostal,
                    localCopPostal,
                    anexostext,
                    atencao,
                    logo,
                    Logo50,
                    PMEPreto,
                    QualidadePreto,
                })
                : getTemplate2({
                    formData,
                    assuntoDoc,
                    textParts,
                    donoObra,
                    morada,
                    localidade,
                    codigoPostal,
                    localCopPostal,
                    anexostext,
                    logo,
                    Logo50,
                });
        if (docxContainer.current) {
            docxContainer.current.innerHTML = newContent;
            if (docxContainer2.current) {
                const secondPageContent =
                    currentTemplate === 1
                        ? getTemplate1SecondPage({ textParts, calculateTextHeight, createPage, donoObra })
                        : getTemplate2SecondPage({ textParts, calculateTextHeight, createPage2, donoObra });
                docxContainer2.current.innerHTML = secondPageContent;
            }
        }
    };

    const docxContainerUpdated = useRef(false);
    useEffect(() => {
        if (docxContainer.current) {
            const newContent =
                currentTemplate === 1
                    ? getTemplate1({
                        formData,
                        assuntoDoc,
                        textParts,
                        donoObra,
                        morada,
                        localidade,
                        codigoPostal,
                        localCopPostal,
                        anexostext,
                        atencao,
                        logo,
                        Logo50,
                        PMEPreto,
                        QualidadePreto,
                    })
                    : getTemplate2({
                        formData,
                        assuntoDoc,
                        textParts,
                        donoObra,
                        morada,
                        localidade,
                        codigoPostal,
                        localCopPostal,
                        anexostext,
                        logo,
                        Logo50,
                    });
            docxContainer.current.innerHTML = newContent;
            if (docxContainer2.current) {
                const secondPageContent =
                    currentTemplate === 1
                        ? getTemplate1SecondPage({ textParts, calculateTextHeight, createPage, donoObra })
                        : getTemplate2SecondPage({ textParts, calculateTextHeight, createPage2, donoObra, pageCount2 });
                docxContainer2.current.innerHTML = secondPageContent;
            }
            docxContainerUpdated.current = true;
        }
    }, [currentTemplate, donoObra, formData, textParts, assuntoDoc, atencao]);

    useEffect(() => {
        function handleClickOutside(event) {
            const dropdown = document.getElementById("emailDropdown");
            if (
                dropdown &&
                dropdown.classList.contains("show") &&
                !event.target.closest(".dropdown-content") &&
                !event.target.matches("button")
            ) {
                dropdown.classList.remove("show");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleGeneratePDF = async () => {
        if (docxContainerUpdated.current) {
            await handleSavePDF();
            docxContainerUpdated.current = false;
        } else {
            console.log("Conteúdo ainda não foi atualizado!");
        }
    };

    // ==============================
    // 5) Filtro de obras (comboBox)
    // ==============================
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

    const filteredObras = obras.filter(
        (obra) =>
            obra.Codigo.toLowerCase().includes(inputValue.toLowerCase()) ||
            obra.Descricao.toLowerCase().includes(inputValue.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            const comboBox = document.getElementById('comboBoxObras');
            if (comboBox && !comboBox.contains(event.target)) {
                setShowOptions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleInputChange2 = (e) => {
        const value = e.target.value;
        setInputValue2(value);
        const filtered = filterObras(e.target.value, obras2);
        setFilteredObras2(filtered);
        setShowOptions2(true);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (comboBoxRef2.current && !comboBoxRef2.current.contains(event.target)) {
                setShowOptions2(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleOptionClick2 = (obra) => {
        var input = obra.Codigo + " - " + obra.Nome;
        setInputValue2(input);
        setSelectedObra2(obra);
        setShowOptions2(false);
        setDonoObra(obra);
        setAtencao(`A/C.: ${obra.Nome}`);
    };

    // ==============================
    // 6) Salvar/Atualizar ofício
    // ==============================
    const handleSaveOrUpdate = async () => {
        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");
        const usernome = localStorage.getItem("userNome");
        const useremail = localStorage.getItem("userEmail");
        const templateestado = currentTemplate === 1 ? "1" : "2";
        let nomeDonoObra = "";
        let moradaDonoObra = "";
        let localidadeDonoObra = "";
        let codPostalDonoObra = "";
        let codPostalLocalDonoObra = "";
        let obraSlecionadaSave = "";
        const nomesAnexos = anexos.map((anexo) => anexo.name).join(", ");
        if (inputValue === "Não tem obra") {
            nomeDonoObra = donoObra?.Nome || donoObra2?.Nome || "";
            moradaDonoObra = donoObra?.Morada || morada || "";
            localidadeDonoObra = donoObra?.Localidade || localidade || "";
            codPostalDonoObra = donoObra?.CodPostal || codigoPostal || "";
            codPostalLocalDonoObra = donoObra?.CodPostalLocal || localCopPostal || "";
            obraSlecionadaSave = "Não tem obra";
        } else {
            nomeDonoObra = donoObra.Nome;
            moradaDonoObra = donoObra.Morada;
            localidadeDonoObra = donoObra.Localidade;
            codPostalDonoObra = donoObra.CodPostal;
            codPostalLocalDonoObra = donoObra.CodPostalLocal;
            obraSlecionadaSave = selectedObra?.Codigo || "";
        }
        const part2Chunks = splitText(textParts.part2 || "");
        const payloadDoc = {
            ...formData,
            codigo: formData?.codigo || "",
            assunto: assuntoDoc,
            texto1: textParts.part1 || "",
            texto2: part2Chunks[0] || "",
            texto3: part2Chunks[1] || "",
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
            anexos: anexostext || "",
            texto4: part2Chunks[2],
            texto5: part2Chunks[3],
            atencao: atencao,
        };
        try {
            // Decide if it's a create or update operation
            const isUpdate = formData?.codigo && formData.codigo.length > 0;
            const endpoint = isUpdate ? "atualizar" : "Criar";
            const method = isUpdate ? "PUT" : "POST";

            const response = await fetch(`https://webapiprimavera.advir.pt/oficio/${endpoint}`, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    urlempresa: urlempresa,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payloadDoc),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro https: ${response.status} - ${errorData.error}`);
            }

            const data = await response.json();
            console.log("Resposta do servidor:", data);
            alert(isUpdate ? "Ofício atualizado com sucesso!" : "Ofício criado com sucesso!");
        } catch (error) {
            console.error(`Erro ao ${isButtonSave ? "criar" : "atualizar"} o ofício:`, error);
            alert(`Erro ao ${isButtonSave ? "criar" : "atualizar"} o ofício. Verifique os logs para mais detalhes.`);
        }
    };

    const [showExitModal, setShowExitModal] = useState(false);
    const dicionarioSimples = [
        "joaquim",
        "peixoto",
        "azevedo",
        "filhos",
        "sede",
        "longras",
        "vila",
        "verde",
        "qualidade",
        "construtora",
        "ofício",
        "texto",
        "assunto",
        "anexo",
        "documento",
        "empresa",
        "obra",
        "email",
        "enviar",
        "guardar",
        "imprimir",
        "editar",
        "template",
        "modelo",
        "destinatário",
        "remetente",
        "morada",
        "localidade",
        "código",
        "postal",
        "data",
        "referência",
    ];
    const checkSpellingHandler = (texto) => {
        const erros = checkSpelling(texto, dicionarioSimples);
        return erros;
    };

    const openNewEmail = () => {
        window.open("https://outlook.live.com/mail/0/deeplink/compose", "_blank");
    };

    const goBackToOficiosList = () => {
        const hasChanges = assuntoDoc || textParts.part1 || textParts.part2 || anexos.length > 0;
        if (hasChanges) {
            setShowExitModal(true);
        } else {
            navigation.navigate("OficiosList");
        }
    };

    const confirmExit = () => {
        setDonoObra("");
        setAssuntoDoc("");
        setTextoDoc("");
        setTextParts({
            part1:
                "JOAQUIM PEIXOTO AZEVEDO, & FILHOS, LDA, com sede na Rua de Longras, n.º 44, 4730 360 Vila Verde, na qualidade de",
            part2: "",
        });
        setAnexos([]);
        setAnexostext("");
        setInputValue("");
        setInputValue2("");
        setSelectedObra(null);
        setSelectedObra2(null);
        setMorada("");
        setLocalidade("");
        setCodigoPostal("");
        setLocalCopPostal("");
        setAtencao("");
        setShowExitModal(false);
        navigation.navigate("OficiosList");
    };

    // ==============================
    // Renderização do componente
    // ==============================
    return (
        <div style={styles.pageContainer} translate="no">
            <header style={styles.header}>
                <div style={styles.controlsAlignedLeft}>
                    <button
                        onClick={goBackToOficiosList}
                        style={{
                            position: "absolute",
                            top: 10,
                            left: 10,
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 10,
                            borderRadius: 30,
                            borderColor: "#1792FE",
                            borderWidth: 1,
                            borderStyle: "solid",
                            backgroundColor: "transparent",
                            cursor: "pointer",
                            zIndex: 1000,
                        }}
                    >
                        <FontAwesomeIcon icon={faArrowLeft} style={{ color: "#1792FE", marginRight: 5 }} />
                        <span style={{ color: "#1792FE" }}>Voltar</span>
                    </button>
                    {isPreviewVisible && (
                        <>
                            <button
                                onClick={() => {
                                    setIsPreviewVisible(!isPreviewVisible);
                                    if (!isPreviewVisible) {
                                        changeTemplate();
                                    }
                                }}
                                style={styles.button}
                            >
                                {isPreviewVisible ? "Editar" : "Pré-visualizar"}
                            </button>
                            <button onClick={changeTemplate} style={{ ...styles.button, backgroundColor: "#28a745" }}>
                                Alterar Template
                            </button>
                            <button
                                onClick={() => {
                                    if (!isButtonSave) {
                                        setIsButtonSave(true);
                                        handleSave();
                                    }
                                    else {
                                        handleSaveOrUpdate();
                                    }

                                }
                                }
                                style={{
                                    ...styles.button,
                                    backgroundColor: "#ff9800"
                                }}
                            >
                                <FaSave /> Guardar Alterações
                            </button>
                            <button
                                onClick={() => {
                                    if (!isButtonSave) {
                                        setIsButtonSave(true);
                                        handleSavePDF();
                                    } else {
                                        handleSavePDF();
                                        handleSaveOrUpdate();
                                    }
                                }}
                                style={styles.button}
                            >
                                <FaFilePdf /> Guardar/PDF
                            </button>
                            <button
                                onClick={() => {
                                    if (assuntoDoc) {
                                        setEmailAssunto(assuntoDoc);
                                    }
                                    if (!isButtonSave) {
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
                                        handleSavePDFAndSendToBackend();
                                    } else {
                                        handleSaveOrUpdate();
                                        handleSavePDFAndSendToBackend();
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

            {isPreviewVisible ? (
                <>
                    {/* Toolbar de edição – pode ser extraída noutra componente se desejado */}

                    {/* Barra de ferramentas de edição do tipo Word */}
                    <div style={styles.editorToolbar}>
                        <div style={styles.toolbarGroup}>
                            <select
                                onChange={(e) => {
                                    document.execCommand(
                                        "fontName",
                                        false,
                                        e.target.value,
                                    );
                                }}
                                style={styles.toolbarSelect}
                            >
                                <option value="">Fonte</option>
                                <option value="Arial">Arial</option>
                                <option value="Calibri">Calibri</option>
                                <option value="Times New Roman">
                                    Times New Roman
                                </option>
                                <option value="Verdana">Verdana</option>
                                <option value="Tahoma">Tahoma</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Segoe UI">Segoe UI</option>
                            </select>

                            <select
                                onChange={(e) => {
                                    document.execCommand(
                                        "fontSize",
                                        false,
                                        e.target.value,
                                    );
                                }}
                                style={styles.toolbarSelect}
                            >
                                <option value="">Tamanho</option>
                                <option value="1">8pt</option>
                                <option value="2">10pt</option>
                                <option value="3">12pt</option>
                                <option value="4">14pt</option>
                                <option value="5">18pt</option>
                                <option value="6">24pt</option>
                                <option value="7">36pt</option>
                            </select>
                        </div>

                        <div style={styles.toolbarGroup}>
                            <button
                                onClick={() =>
                                    document.execCommand("bold", false, null)
                                }
                                style={styles.toolbarButton}
                                title="Negrito (Ctrl+B)"
                            >
                                <b>N</b>
                            </button>
                            <button
                                onClick={() =>
                                    document.execCommand("italic", false, null)
                                }
                                style={styles.toolbarButton}
                                title="Itálico (Ctrl+I)"
                            >
                                <i>I</i>
                            </button>
                            <button
                                onClick={() =>
                                    document.execCommand(
                                        "underline",
                                        false,
                                        null,
                                    )
                                }
                                style={styles.toolbarButton}
                                title="Sublinhado (Ctrl+U)"
                            >
                                <u>S</u>
                            </button>
                            <button
                                onClick={() =>
                                    document.execCommand(
                                        "strikeThrough",
                                        false,
                                        null,
                                    )
                                }
                                style={styles.toolbarButton}
                                title="Tachado"
                            >
                                <span
                                    style={{ textDecoration: "line-through" }}
                                >
                                    T
                                </span>
                            </button>
                        </div>

                        <div style={styles.toolbarGroup}>
                            <button
                                onClick={() =>
                                    document.execCommand(
                                        "justifyLeft",
                                        false,
                                        null,
                                    )
                                }
                                style={styles.toolbarButton}
                                title="Alinhar à esquerda"
                            >
                                <span
                                    role="img"
                                    aria-label="Alinhar à esquerda"
                                >
                                    ⫷
                                </span>
                            </button>
                            <button
                                onClick={() =>
                                    document.execCommand(
                                        "justifyCenter",
                                        false,
                                        null,
                                    )
                                }
                                style={styles.toolbarButton}
                                title="Centralizar"
                            >
                                <span role="img" aria-label="Centralizar">
                                    ≡
                                </span>
                            </button>
                            <button
                                onClick={() =>
                                    document.execCommand(
                                        "justifyRight",
                                        false,
                                        null,
                                    )
                                }
                                style={styles.toolbarButton}
                                title="Alinhar à direita"
                            >
                                <span role="img" aria-label="Alinhar à direita">
                                    ⫸
                                </span>
                            </button>
                            <button
                                onClick={() =>
                                    document.execCommand(
                                        "justifyFull",
                                        false,
                                        null,
                                    )
                                }
                                style={styles.toolbarButton}
                                title="Justificar"
                            >
                                <span role="img" aria-label="Justificar">
                                    ☰
                                </span>
                            </button>
                        </div>

                        <div style={styles.toolbarGroup}>
                            <button
                                onClick={() =>
                                    document.execCommand(
                                        "insertUnorderedList",
                                        false,
                                        null,
                                    )
                                }
                                style={styles.toolbarButton}
                                title="Lista com marcadores"
                            >
                                <span
                                    role="img"
                                    aria-label="Lista com marcadores"
                                >
                                    •
                                </span>
                            </button>
                            <button
                                onClick={() =>
                                    document.execCommand(
                                        "insertOrderedList",
                                        false,
                                        null,
                                    )
                                }
                                style={styles.toolbarButton}
                                title="Lista numerada"
                            >
                                <span role="img" aria-label="Lista numerada">
                                    1.
                                </span>
                            </button>
                            <button
                                onClick={() =>
                                    document.execCommand("indent", false, null)
                                }
                                style={styles.toolbarButton}
                                title="Aumentar recuo"
                            >
                                <span role="img" aria-label="Aumentar recuo">
                                    ⇥
                                </span>
                            </button>
                            <button
                                onClick={() =>
                                    document.execCommand("outdent", false, null)
                                }
                                style={styles.toolbarButton}
                                title="Diminuir recuo"
                            >
                                <span role="img" aria-label="Diminuir recuo">
                                    ⇤
                                </span>
                            </button>
                        </div>

                        <div style={styles.toolbarGroup}>
                            <label
                                style={styles.toolbarLabel}
                                title="Cor do texto"
                            >
                                <span
                                    role="img"
                                    aria-label="Cor do texto"
                                    style={{ marginRight: "5px" }}
                                >
                                    🎨
                                </span>
                                <input
                                    type="color"
                                    onChange={(e) =>
                                        document.execCommand(
                                            "foreColor",
                                            false,
                                            e.target.value,
                                        )
                                    }
                                    style={styles.colorPicker}
                                />
                            </label>

                            <label
                                style={styles.toolbarLabel}
                                title="Cor de fundo"
                            >
                                <span
                                    role="img"
                                    aria-label="Cor de fundo"
                                    style={{ marginRight: "5px" }}
                                >
                                    🖌️
                                </span>
                                <input
                                    type="color"
                                    onChange={(e) =>
                                        document.execCommand(
                                            "hiliteColor",
                                            false,
                                            e.target.value,
                                        )
                                    }
                                    style={styles.colorPicker}
                                />
                            </label>
                        </div>

                        <div style={styles.toolbarGroup}>
                            <button
                                onClick={() =>
                                    document.execCommand("undo", false, null)
                                }
                                style={styles.toolbarButton}
                                title="Desfazer (Ctrl+Z)"
                            >
                                <span role="img" aria-label="Desfazer">
                                    ↩️
                                </span>
                            </button>
                            <button
                                onClick={() =>
                                    document.execCommand("redo", false, null)
                                }
                                style={styles.toolbarButton}
                                title="Refazer (Ctrl+Y)"
                            >
                                <span role="img" aria-label="Refazer">
                                    ↪️
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    const selection = window.getSelection();
                                    if (selection.toString().length > 0) {
                                        const text = selection.toString();
                                        // Simulação simples de verificação ortográfica
                                        const possibleErrors =
                                            checkSpelling(text);
                                        if (possibleErrors.length > 0) {
                                            alert(
                                                `Possíveis erros ortográficos: ${possibleErrors.join(", ")}`,
                                            );
                                        } else {
                                            alert(
                                                "Nenhum erro ortográfico encontrado.",
                                            );
                                        }
                                    } else {
                                        alert(
                                            "Selecione um texto para verificar a ortografia.",
                                        );
                                    }
                                }}
                                style={{
                                    ...styles.toolbarButton,
                                    backgroundColor: "#28a745",
                                }}
                                title="Verificar ortografia"
                            >
                                <span
                                    role="img"
                                    aria-label="Verificar ortografia"
                                >
                                    ABC✓
                                </span>
                            </button>
                        </div>
                    </div>
                    <div
                        ref={docxContainer}
                        style={styles.docxContainer}
                        contentEditable={true}
                        onInput={(e) => {
                            // Processar alterações se necessário
                        }}
                    ></div>
                    {textParts.part2 && (
                        <div
                            ref={docxContainer2}
                            contentEditable={true}
                            onInput={(e) => {
                                // Processar alterações se necessário
                            }}
                        ></div>
                    )}
                </>
            ) : (
                <div
                    style={{
                        width: "60%",
                        margin: "0 auto",
                        padding: "20px",
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                    }}
                >
                    <div id="comboBoxObras" style={{ position: "relative", width: "100%", marginBottom: "20px" }} ref={constComboBoxRef}>
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
                                        setAtencao("");
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
                                            setInputValue(`${obra.Codigo} - ${obra.Descricao}`);
                                            setAssuntoDoc(`${obra.Descricao} - ${assuntoDoc}`);
                                            setShowOptions(false);
                                        }}
                                        style={{
                                            padding: "10px",
                                            cursor: "pointer",
                                            color: "#333",
                                            background: selectedObra?.Codigo === obra.Codigo ? "#e6f7ff" : "white",
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

                    <div style={{ position: "relative", width: "100%", marginBottom: "20px" }} ref={comboBoxRef2} onClick={handleComboBoxClick}>
                        <input
                            type="text"
                            value={inputValue2}
                            onChange={(e) => {
                                setInputValue2(e.target.value);
                                const filtered = filterObras(e.target.value, obras2);
                                setFilteredObras2(filtered);
                            }}
                            placeholder="Selecione outra Entidade"
                            style={{
                                width: "100%",
                                padding: "12px",
                                margin: "10px 0",
                                border: "1px solid #ddd",
                                borderRadius: "8px",
                                fontSize: "16px",
                                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                            }}
                            onFocus={handleFocus}
                        />
                        {showOptions2 && (
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
                                {filteredObras2.length === 0 ? (
                                    <li style={{ padding: "10px", color: "#999" }}>
                                        Escreva aqui para escolher a entidade pretendida
                                    </li>
                                ) : (
                                    filteredObras2.map((obra, index) => (
                                        <li
                                            key={index}
                                            onClick={() => handleOptionClick2(obra)}
                                            style={{
                                                padding: "10px",
                                                cursor: "pointer",
                                                color: "#333",
                                                background: selectedObra2?.Codigo === obra.Codigo ? "#e6f7ff" : "white",
                                                borderRadius: "6px",
                                                marginBottom: "5px",
                                            }}
                                        >
                                            {obra?.Codigo || ""} - {obra?.Nome || ""}
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </div>

                    {selectedObra2 && (
                        <div style={{ marginTop: "10px", marginBottom: "20px" }}>
                            <input
                                type="text"
                                placeholder="A/C.:"
                                value={atencao}
                                onChange={(e) => setAtencao(e.target.value)}
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
                        </div>
                    )}

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
                    />

                    <>
                        <input
                            type="text"
                            placeholder="Morada"
                            value={donoObra?.Morada || morada}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                setMorada(newValue);
                                setDonoObra(prev => ({ ...prev, Morada: newValue }));
                            }}
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
                        <input
                            type="text"
                            placeholder="Localidade"
                            value={donoObra?.Localidade || localidade}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                setLocalidade(newValue);
                                setDonoObra(prev => ({ ...prev, Localidade: newValue }));
                            }}
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
                        <div style={{ display: "flex", gap: "10px", margin: "10px 0" }}>
                            <input
                                type="text"
                                placeholder="Código Postal"
                                value={donoObra?.CodPostal || codigoPostal}
                                onChange={(e) => {
                                    const newValue = e.target.value;
                                    setCodigoPostal(newValue);
                                    setDonoObra(prev => ({ ...prev, CodPostal: newValue }));
                                }}
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
                                value={donoObra?.CodPostalLocal || localCopPostal}
                                onChange={(e) => {
                                    const newValue = e.target.value;
                                    setLocalCopPostal(newValue);
                                    setDonoObra(prev => ({ ...prev, CodPostalLocal: newValue }));
                                }}
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

                    <input
                        type="text"
                        placeholder="Email"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
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

                    <input
                        type="text"
                        placeholder="Assunto do Oficio"
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

                    <div style={{ fontSize: "14px", marginTop: "5px", color: "#555" }}>
                        {textParts.part1.length} / 1120 caracteres | {textParts.part1.split("\n").length} / 19 linhas
                    </div>

                    <textarea
                        placeholder="Texto do Ofício"
                        value={textParts.part1}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            const lineCount = (newValue.match(/\n/g) || []).length;
                            if (lineCount <= 19) {
                                setTextParts({ ...textParts, part1: newValue });
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Tab") {
                                e.preventDefault();
                                const cursorPos = e.target.selectionStart;
                                const newValue = textParts.part1.substring(0, cursorPos) + "    " + textParts.part1.substring(cursorPos);
                                setTextParts({ ...textParts, part1: newValue });
                                setTimeout(() => {
                                    e.target.selectionStart = e.target.selectionEnd = cursorPos + 4;
                                }, 0);
                            }
                        }}
                        maxLength={1120}
                        style={{
                            width: "100%",
                            padding: "12px",
                            margin: "10px 0",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            fontSize: "16px",
                            minHeight: "100px",
                            overflowY: "auto",
                            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                        }}
                    />

                    <div
                        contentEditable="true"
                        dir="ltr"
                        onInput={handleInputPart1}
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
                            textAlign: "left",
                            display: "none",
                        }}
                        dangerouslySetInnerHTML={{ __html: textParts.part1 }}
                    ></div>

                    <textarea
                        placeholder="Texto do Ofício"
                        value={textParts.part2}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            const lineCount = (newValue.match(/\n/g) || []).length;
                            if (lineCount <= 19) {
                                setTextParts({ ...textParts, part2: newValue });
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Tab") {
                                e.preventDefault();
                                const cursorPos = e.target.selectionStart;
                                const newValue = textParts.part2.substring(0, cursorPos) + "    " + textParts.part2.substring(cursorPos);
                                setTextParts({ ...textParts, part2: newValue });
                                setTimeout(() => {
                                    e.target.selectionStart = e.target.selectionEnd = cursorPos + 4;
                                }, 0);
                            }
                        }}
                        style={{
                            width: "100%",
                            padding: "12px",
                            margin: "10px 0",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            fontSize: "16px",
                            minHeight: "100px",
                            overflowY: "auto",
                            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                        }}
                    />

                    <label style={styles.fileInputLabel}>
                        <FaPaperclip /> Anexos
                        <input
                            type="file"
                            multiple
                            onChange={(e) => {
                                handleAddAnexo(e);
                                const files = Array.from(e.target.files);
                                const fileNames = files.map((file) => file.name).join("</br> ");
                                setAnexostext((prevText) => (prevText ? `${prevText}, ${fileNames}` : fileNames));
                            }}
                            style={styles.fileInput}
                        />
                    </label>

                    <div
                        style={{
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                            padding: "12px",
                            margin: "10px 0",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            fontSize: "16px",
                            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                        }}
                        dangerouslySetInnerHTML={{ __html: anexostext }}
                    />

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

            {showExitModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>Confirmar saída</h3>
                        <p style={styles.modalMessage}>
                            Se sair agora, perderá todas as alterações feitas. Deseja realmente sair?
                        </p>
                        <div style={styles.modalActions}>
                            <button onClick={() => setShowExitModal(false)} style={styles.cancelButton}>
                                Não
                            </button>
                            <button onClick={confirmExit} style={styles.button}>
                                Sim
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                            <input
                                type="text"
                                placeholder="CC:"
                                value={emailCC}
                                onChange={(e) => setEmailCC(e.target.value)}
                                style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                            />
                            <div style={{ position: "relative" }}>
                                <button
                                    onClick={() =>
                                        document.getElementById("emailDropdown").classList.toggle("show")
                                    }
                                    style={{
                                        marginLeft: "10px",
                                        padding: "8px 15px",
                                        backgroundColor: "#1792FE",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                    }}
                                >
                                    Adicionar
                                </button>
                                <div
                                    id="emailDropdown"
                                    style={{
                                        display: "none",
                                        position: "absolute",
                                        right: 0,
                                        top: "100%",
                                        backgroundColor: "white",
                                        minWidth: "200px",
                                        boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)",
                                        zIndex: 1,
                                        borderRadius: "5px",
                                        marginTop: "5px",
                                    }}
                                    className="dropdown-content"
                                >
                                    {[
                                        "comercial@jpaconstrutora.com",
                                        "geral@jpaconstrutora.com",
                                        "qualidade@jpaconstrutora.com",
                                        "tecnico@jpaconstrutora.com",
                                    ].map((email, index) => (
                                        <div
                                            key={index}
                                            onClick={() => {
                                                const currentEmails = emailCC
                                                    ? emailCC.split(";").map((e) => e.trim())
                                                    : [];
                                                if (!currentEmails.includes(email)) {
                                                    const newEmailCC =
                                                        currentEmails.length > 0 ? `${emailCC}; ${email}` : email;
                                                    setEmailCC(newEmailCC);
                                                }
                                                document.getElementById("emailDropdown").classList.remove("show");
                                            }}
                                            style={{
                                                padding: "10px 15px",
                                                cursor: "pointer",
                                                borderBottom: index < 3 ? "1px solid #eee" : "none",
                                                borderRadius: index === 0 ? "5px 5px 0 0" : index === 3 ? "0 0 5px 5px" : "0",
                                            }}
                                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f1f1f1")}
                                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
                                        >
                                            {email}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
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
                        <div style={styles.signatureSection}>
                            <div style={styles.signatureHeader}>
                                <input
                                    type="checkbox"
                                    id="includeSignature"
                                    defaultChecked={true}
                                    onChange={(e) => {
                                        document.getElementById("emailSignature").style.display = e.target.checked
                                            ? "block"
                                            : "none";
                                    }}
                                />
                                <label htmlFor="includeSignature">Incluir assinatura</label>
                            </div>
                            <div id="emailSignature" style={styles.signaturePreview}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: "70%", paddingRight: "15px", verticalAlign: "top" }}>
                                                <div style={{ display: "flex", alignItems: "center", marginTop: "10px" }}>
                                                    <span style={{ color: "#1792FE", marginRight: "8px", fontSize: "14px" }}>✉</span>
                                                    <a
                                                        href="mailto:oficio@jpaconstrutora.com"
                                                        style={{
                                                            color: "#1792FE",
                                                            textDecoration: "none",
                                                            fontSize: "13px",
                                                        }}
                                                    >
                                                        oficio@jpaconstrutora.com
                                                    </a>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", marginTop: "5px" }}>
                                                    <span style={{ color: "#666", marginRight: "8px", fontSize: "14px" }}>📞</span>
                                                    <span style={{ color: "#666", fontSize: "13px" }}>
                                                        t. (+351) 253 38 13 10 (Chamada rede fixa nacional)
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", marginTop: "5px" }}>
                                                    <span style={{ color: "#666", marginRight: "8px", fontSize: "14px" }}>📱</span>
                                                    <span style={{ color: "#666", fontSize: "13px" }}>
                                                        tel. (+351) 910 11 76 22 (Chamada rede móvel nacional)
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "flex-start", marginTop: "5px" }}>
                                                    <span style={{ color: "#666", marginRight: "8px", marginTop: "2px", fontSize: "14px" }}>📍</span>
                                                    <div>
                                                        <div style={{ color: "#666", fontSize: "13px" }}>Rua Das Longras 44,</div>
                                                        <div style={{ color: "#666", fontSize: "13px" }}>4730-360 Pedregais</div>
                                                        <div style={{ color: "#666", fontSize: "13px" }}>Vila Verde - Portugal</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ width: "30%", textAlign: "right", verticalAlign: "top" }}>
                                                <div style={{ marginBottom: "10px" }}>
                                                    <img
                                                        src="https://jpaconstrutora.com/wp-content/uploads/2016/11/jpa-construtora.png"
                                                        alt="JPA Construtora"
                                                        style={{ maxWidth: "120px", height: "auto" }}
                                                    />
                                                </div>
                                                <div style={{ textAlign: "right", marginTop: "5px" }}>
                                                    <a
                                                        href="https://www.jpaconstrutora.com"
                                                        style={{
                                                            color: "#1792FE",
                                                            textDecoration: "none",
                                                            fontWeight: "bold",
                                                            display: "block",
                                                            marginBottom: "5px",
                                                            fontSize: "13px",
                                                        }}
                                                    >
                                                        WWW.JPACONSTRUTORA.COM
                                                    </a>
                                                </div>
                                                <div style={{ marginTop: "10px", textAlign: "right" }}>
                                                    <img
                                                        src="https://seeklogo.com/images/P/pme-lider-logo-7FC1F4541D-seeklogo.com.png"
                                                        alt="PME Logo"
                                                        style={{ height: "30px", marginRight: "5px" }}
                                                    />
                                                    <img
                                                        src="https://comeipgroup.com/wp-content/uploads/2020/11/ISO_9001.png"
                                                        alt="Qualidade Logo"
                                                        style={{ height: "30px" }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <label style={styles.fileInputLabel}>
                            <FaPaperclip /> Anexos
                            <input type="file" multiple onChange={handleAddAnexo} style={styles.fileInput} />
                        </label>
                        {anexos.length > 0 && (
                            <div style={styles.anexosList}>
                                <h4 style={styles.h4}>Anexos:</h4>
                                <ul style={styles.ul}>
                                    {anexos.map((anexo, index) => (
                                        <li key={index} style={styles.li}>
                                            {anexo.name}
                                            <button onClick={() => handleRemoveAnexo(index)} style={styles.removeButton}>
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

export default OficiosPage;