import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from "../../images/jpa-construtora.png";
import { FaSave, FaEnvelope, FaFilePdf, FaPaperclip } from "react-icons/fa";
import { useFocusEffect } from "@react-navigation/native";
import PMEPreto from "../../images/PMEPRETO.png";
import QualidadePreto from "../../images/QUALIDADEPRETO.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Logo50 from "../../images/Logo50.jpg";

const EditOficio = (props) => {
    // Obter dados do ofício para edição
    const navigation = useNavigation();
    const route = useRoute();
    const { oficioId, oficioData } = route.params || {};

    // ==============================
    // 1) Estados para o documento
    // ==============================
    const [pageCount2, setPageCount2] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false); // Controla a abertura do modal
    const [currentTemplate, setCurrentTemplate] = useState(
        oficioData?.CDU_template === "1" ? 1 : 2,
    ); // Controla o template ativo (1 ou 2)
    const [donoObra, setDonoObra] = useState({
        Nome: oficioData?.CDU_DonoObra || "",
        Morada: oficioData?.CDU_Morada || "",
        Localidade: oficioData?.CDU_Localidade || "",
        CodPostal: oficioData?.CDU_CodPostal || "",
        CodPostalLocal: oficioData?.CDU_CodPostalLocal || "",
    });
    const [isEditable, setIsEditable] = useState(false);
    const [selectedObra, setSelectedObra] = useState("");
    const [assuntoDoc, setAssuntoDoc] = useState(oficioData?.CDU_assunto || "");
    const [textoDoc, setTextoDoc] = useState("");
    const [anexos, setAnexos] = useState([]);
    const [anexostext, setAnexostext] = useState(oficioData?.CDU_Anexos || "");
    const docxContainer = useRef(null);
    const docxContainer2 = useRef(null);
    const [isTemplateVisible, setIsTemplateVisible] = useState(false);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [isButtonSave, setIsButtonSave] = useState(false);
    const [morada, setMorada] = useState(oficioData?.CDU_Morada || "");
    const [localidade, setLocalidade] = useState(
        oficioData?.CDU_Localidade || "",
    );
    const [codigoPostal, setCodigoPostal] = useState(
        oficioData?.CDU_CodPostal || "",
    );
    const [localCopPostal, setLocalCopPostal] = useState(
        oficioData?.CDU_CodPostalLocal || "",
    );
    const [paginasCriadas, setPaginasCriadas] = useState(0);
    const [estadodoc, setEstado] = useState("");
    const Executado = useRef(false);
    const contentEditableRef = useRef(null);
    const [atencao, setAtencao] = useState(""); // Novo estado para o campo de atenção

    const handleBlur = () => {
        // Atualiza o estado apenas ao perder o foco
        if (contentEditableRef.current) {
            setTextoDoc(contentEditableRef.current.innerHTML);
        }
    };

    // Estado para guardar a divisão do texto (se exceder um limite)
    const [textParts, setTextParts] = useState({
        part1:
            oficioData?.CDU_texto1 ||
            "JOAQUIM PEIXOTO AZEVEDO, & FILHOS, LDA, com sede na Rua de Longras, n.º 44, 4730 360 Vila Verde, na qualidade de",
        part2: oficioData?.CDU_texto2 || "",
    });

    // formData para o documento (sem campos de email do modal)
    const [formData, setFormData] = useState({
        codigo: oficioData?.CDU_codigo || "",
        data: oficioData?.CDU_Datadoc || new Date().toISOString().slice(0, 10), // yyyy-mm-dd
        remetente: oficioData?.CDU_remetente || "",
        email: oficioData?.CDU_email || "",
        texto1: oficioData?.CDU_texto1 || "",
        texto2: oficioData?.CDU_texto2 || "",
        texto3: oficioData?.CDU_texto3 || "",
        template: oficioData?.CDU_template || "",
        createdby: oficioData?.CDU_createdby || "",
        donoObra: oficioData?.CDU_DonoObra || "",
    });

    const [obras, setObras] = useState([]);
    const [obras2, setObras2] = useState([]);
    const [inputValue, setInputValue] = useState(oficioData?.CDU_obra || "");

    const [showOptions, setShowOptions] = useState(false);
    const comboBoxRef = useRef(null);
    // Estados para a segunda combobox
    const comboBoxRef2 = useRef(null);
    const [inputValue2, setInputValue2] = useState("");
    const [showOptions2, setShowOptions2] = useState(false);
    const [filteredObras2, setFilteredObras2] = useState([]);
    const [selectedObra2, setSelectedObra2] = useState(null);
    const [donoObra2, setDonoObra2] = useState("");

    // ==============================
    // 2) Estados para o modal de envio de email
    // ==============================
    const [emailTo, setEmailTo] = useState(
        oficioData?.CDU_email || "jtalmeida@advir.pt",
    ); // Destinatário do email
    const [emailCC, setEmailCC] = useState(""); // Destinatário do email
    const [emailAssunto, setEmailAssunto] = useState(""); // Assunto do email
    const [emailTexto, setEmailTexto] = useState(""); // Corpo do email

    // ======================================
    // 3) Efeito para acompanhar o texto digitado no contentEditable e resetar estado quando muda o ofício
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

    // Resetar estado quando o componente é montado com novos props
    useEffect(() => {
        if (oficioId && oficioData) {
            // Reset all states with data from the current oficioData
            setCurrentTemplate(oficioData?.CDU_template === "1" ? 1 : 2);
            setDonoObra({
                Nome: oficioData?.CDU_DonoObra || "",
                Morada: oficioData?.CDU_Morada || "",
                Localidade: oficioData?.CDU_Localidade || "",
                CodPostal: oficioData?.CDU_CodPostal || "",
                CodPostalLocal: oficioData?.CDU_CodPostalLocal || "",
            });
            setAssuntoDoc(oficioData?.CDU_assunto || "");
            setAnexostext(oficioData?.CDU_Anexos || "");
            setTextParts({
                part1:
                    oficioData?.CDU_texto1 ||
                    "JOAQUIM PEIXOTO AZEVEDO, & FILHOS, LDA, com sede na Rua de Longras, n.º 44, 4730 360 Vila Verde, na qualidade de",
                part2: oficioData?.CDU_texto2 || "",
            });
            setFormData({
                codigo: oficioData?.CDU_codigo || "",
                data:
                    oficioData?.CDU_Datadoc ||
                    new Date().toISOString().slice(0, 10),
                remetente: oficioData?.CDU_remetente || "",
                email: oficioData?.CDU_email || "",
                texto1: oficioData?.CDU_texto1 || "",
                texto2: oficioData?.CDU_texto2 || "",
                texto3: oficioData?.CDU_texto3 || "",
                template: oficioData?.CDU_template || "",
                createdby: oficioData?.CDU_createdby || "",
                donoObra: oficioData?.CDU_DonoObra || "",
            });
            setInputValue(oficioData?.CDU_obra || "");
            setEmailTo(oficioData?.CDU_email || "");
            setAtencao(oficioData?.CDU_atencao || ""); // Initialize atencao from oficioData
        }
    }, [oficioId, oficioData]);

    // ======================================
    // 4) Dividir texto se exceder limite de caracteres (ex. 2500)
    // ======================================
    // Função para dividir o texto baseado no limite
    const limitText = (texto, limit) => {
        return texto.length > limit ? texto.substring(0, limit) : texto;
    };

    const handleInputPart1 = (e) => {
        const newText = e.target.innerHTML;
        const limitedText = limitText(newText, 1020); // Limita a 1020 caracteres
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

    // ======================================
    // 5) Carregar lista de obras do backend
    // ======================================
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
                    },
                );

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
                    },
                );

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();
                // Se data.DataSet.Table for array, atualiza
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

    // Usando onFocus no input para garantir que a lista apareça ao focar
    // Adicionando o evento de foco no input
    const handleFocus = () => {
        if (filteredObras2.length === 0 && !showOptions2) {
            // Se não houver obras e as opções ainda não foram mostradas
            fetchEntidades(); // Carrega as opções ao focar no campo
            setShowOptions2(true); // Exibe as opções ao focar
        }
    };

    const handleComboBoxClick = () => {
        setShowOptions2(true); // Garante que a lista de opções seja exibida ao clicar
        fetchEntidades(); // Carrega as opções ao clicar
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
                },
            );

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            // Se data.DataSet.Table for array, atualiza
            if (data && data.DataSet && Array.isArray(data.DataSet.Table)) {
                console.log(data.DataSet.Table);
                setObras2(data.DataSet.Table); // Atualiza a lista de obras
            }
        } catch (error) {
            console.error("Erro ao carregar obras:", error);
        } finally {
        }
    };

    const filterObras = (inputValue, obras) => {
        return obras.filter((obra) => {
            return (
                obra?.Codigo?.toLowerCase().includes(
                    inputValue.toLowerCase(),
                ) ||
                obra?.Nome?.toLowerCase().includes(inputValue.toLowerCase())
            );
        });
    };

    // ======================================
    // 6) Gerar PDF (multi-página se existir part2)
    // ======================================
    const handleSavePDF = async () => {
        const containers = [docxContainer.current, docxContainer2.current]; // Containers de conteúdo
        const validContainers = containers.filter((container) => container); // Filtra containers válidos

        if (validContainers.length === 0) {
            return;
        }
        try {
            // Geração do primeiro PDF (apenas para o primeiro container)
            const pdf1 = new jsPDF("portrait", "mm", "a4");
            const pdfWidth = 210; // Largura do PDF em mm
            const pdfHeight = 297; // Altura do PDF em mm (A4)

            // Captura o conteúdo do primeiro container e gera o PDF
            const canvas1 = await html2canvas(validContainers[0], {
                scale: 2,
                useCORS: true,
                logging: true,
                scrollX: 0,
                scrollY: 0,
            });

            const imgData1 = canvas1.toDataURL("image/jpeg", 0.8);
            const imgHeight1 = (canvas1.height * pdfWidth) / canvas1.width;

            // Adiciona a imagem no primeiro PDF
            pdf1.addImage(
                imgData1,
                "JPEG",
                0,
                0,
                pdfWidth,
                imgHeight1,
                undefined,
                "FAST",
            );

            // Salva o primeiro PDF
            pdf1.save("oficio_primeiro_container.pdf");

            // Geração do segundo PDF (com várias páginas do segundo container)
            const pdf2 = new jsPDF("portrait", "mm", "a4");
            const container2 = validContainers[1];

            // Captura o conteúdo do segundo container
            const canvas2 = await html2canvas(container2, {
                scale: 2,
                useCORS: true,
                logging: true,
                scrollX: 0,
                scrollY: 0,
            });

            const imgData2 = canvas2.toDataURL("image/jpeg", 0.8);
            const imgHeight2 = (canvas2.height * pdfWidth) / canvas2.width;

            let currentHeight = 0; // Altura inicial para adicionar imagem
            let pageIndex = 0; // Índice da página

            // Adiciona a primeira página
            pdf2.addImage(
                imgData2,
                "JPEG",
                0,
                0,
                pdfWidth,
                imgHeight2,
                undefined,
                "FAST",
            );
            currentHeight += pdfHeight; // Aumenta a altura
            for (var i = 1; i < pageCount; i++) {
                pdf2.addPage(); // Adiciona uma nova página
                pdf2.addImage(
                    imgData2,
                    "JPEG",
                    0,
                    -currentHeight,
                    pdfWidth,
                    imgHeight2,
                    undefined,
                    "FAST",
                );
                currentHeight += pdfHeight; // Atualiza a altura
                pageIndex++; // Atualiza o número da página
            }

            // Salva o segundo PDF com todas as páginas
            pdf2.save("oficio_segundo_container.pdf");
        } catch (error) {
            console.error("Erro ao gerar os PDFs:", error);
        }
        if (!isButtonSave) {
            console.log("Chamando handleSave com o estado 'Imprimir'");
            handleSave("Imprimido");
        }
    };

    // ======================================
    // 7) Enviar PDF + anexos para o backend
    // ======================================
    const handleSavePDFAndSendToBackend = async () => {
        const containers = [docxContainer.current, docxContainer2.current]; // Containers de conteúdo
        const validContainers = containers.filter((container) => container); // Filtra containers válidos

        if (validContainers.length === 0) {
            return;
        }
        setEstado("Imprimido");
        try {
            const pdfWidth = 210; // Largura do PDF em mm
            const pdfHeight = 297; // Altura do PDF em mm (A4)

            // Geração do primeiro PDF (apenas para o primeiro container)
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
            pdf1.addImage(
                imgData1,
                "JPEG",
                0,
                0,
                pdfWidth,
                imgHeight1,
                undefined,
                "FAST",
            );

            // Permite o usuário escolher o local para salvar o primeiro PDF
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

            // Geração do segundo PDF (com várias páginas do segundo container)
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

            // Adiciona múltiplas páginas se necessário
            console.log(pageCount2);

            // Aumenta a altura
            let pageIndex = 0;
            let currentHeight = 0; // Altura inicial para adicionar imagem

            let pageCount = pageCount2;
            pdf2.addImage(
                imgData2,
                "JPEG",
                0,
                0,
                pdfWidth,
                imgHeight2,
                undefined,
                "FAST",
            );
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
                    "FAST",
                );
                currentHeight += pdfHeight;
                pageIndex++;
            }

            // Permite o usuário escolher o local para salvar o segundo PDF
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

    // ======================================
    // 8) Remover um anexo específico
    // ======================================
    const handleRemoveAnexo = (index) => {
        setAnexos((prevAnexos) => {
            const updatedAnexos = prevAnexos.filter((_, i) => i !== index);

            // Reconstroi a lista de anexos no rodapé do doc
            const anexosNomes = updatedAnexos
                .map((file) => file.name)
                .join(", ");
            const editableCellCodigo =
                document.getElementById("editableCellCodigo");
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

    // ======================================
    // 9) Enviar Email com Office API (usando dados do modal)
    // ======================================
    const handleSendEmailWithOfficeAPI = async () => {
        // Se o assunto do email estiver vazio, use o assunto do documento
        if (!emailAssunto && assuntoDoc) {
            setEmailAssunto(assuntoDoc);
        }

        console.log(pageCount2);
        const containers = [docxContainer.current, docxContainer2.current]; // Lista de contêineres para as páginas

        if (!containers[0]) {
            return;
        }
        try {
            // Geração do primeiro PDF (apenas para o primeiro container)
            const pdf1 = new jsPDF("portrait", "mm", "a4");
            const pdfWidth = 210; // Largura do PDF em mm
            const pdfHeight = 297; // Altura do PDF em mm (A4)

            // Captura o conteúdo do primeiro container e gera o PDF
            const canvas1 = await html2canvas(containers[0], {
                scale: 2,
                useCORS: true,
                logging: true,
                scrollX: 0,
                scrollY: 0,
            });

            const imgData1 = canvas1.toDataURL("image/jpeg", 0.5);
            const imgHeight1 = (canvas1.height * pdfWidth) / canvas1.width;

            // Adiciona a imagem no primeiro PDF
            pdf1.addImage(
                imgData1,
                "JPEG",
                0,
                0,
                pdfWidth,
                imgHeight1,
                undefined,
                "FAST",
            );

            // Salva o primeiro PDF
            const pdf1Blob = pdf1.output("blob");
            const pdf1Base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(",")[1]);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(pdf1Blob);
            });

            // Geração do segundo PDF (com várias páginas do segundo container)
            const pdf2 = new jsPDF("portrait", "mm", "a4");
            const container2 = containers[1];
            // Converter anexos adicionais
            const processedAnexos = await Promise.all(
                anexos.map(
                    (file) =>
                        new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64Content =
                                    reader.result.split(",")[1];
                                resolve({
                                    name: file.name,
                                    content: base64Content,
                                });
                            };
                            reader.onerror = (error) => reject(error);
                            reader.readAsDataURL(file);
                        }),
                ),
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
                        pdf2.addPage(); // Adiciona nova página depois da primeira
                    }

                    pdf2.addImage(
                        imgData2,
                        "JPEG",
                        0,
                        -yPosition, // Ajusta a posição Y para cada página
                        pdfWidth,
                        imgHeight2,
                        undefined,
                        "FAST",
                    );

                    yPosition += pdfHeight;
                    remainingHeight -= pdfHeight;
                }

                const pdf2Blob = pdf2.output("blob");
                const pdf2Base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () =>
                        resolve(reader.result.split(",")[1]);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(pdf2Blob);
                });
                processedAnexos.push({
                    name: "oficio_segundo_container.pdf",
                    content: pdf2Base64,
                });
            }

            // Adicionar os dois PDFs gerados à lista de anexos
            processedAnexos.push({
                name: "oficio_primeiro_container.pdf",
                content: pdf1Base64,
            });

            let formattedEmailTexto = emailTexto.replace(/\n/g, "<br />");

            // Obter o email de resposta do localStorage
            const useremail = localStorage.getItem("userEmail");

            // Adicionar mensagem informativa sobre respostas
            formattedEmailTexto += `<br /><br /><div style='color: #777; font-size: 12px; border-top: 1px solid #eee; padding-top: 10px;'><p>Este email é enviado automaticamente de oficio@jpaconstrutora.com. Para responder, por favor envie email para ${useremail}.</p></div>`;

            // Verificar se a assinatura deve ser incluída
            const includeSignature =
                document.getElementById("includeSignature").checked;
            if (includeSignature) {
                // Capturar o conteúdo HTML da assinatura
                const signatureElement =
                    document.getElementById("emailSignature");
                const signatureHtml = signatureElement.innerHTML;

                // Adicionar a assinatura ao final do texto do email
                formattedEmailTexto += "<br /><br />--<br />" + signatureHtml;
            }

            // Montar payload com os dados do modal
            const payload = {
                emailDestinatario: emailTo,
                emailCC: emailCC,
                assunto: emailAssunto,
                texto: formattedEmailTexto,
                remetente: formData.remetente,
                anexos: processedAnexos,
                replyTo: useremail, // Configura o email de resposta para o email do usuário atual
                from: "oficio@jpaconstrutora.com", // Mantém o email de envio como oficio@jpaconstrutora.com
            };

            // Enviar para o backend
            const response = await fetch(
                "https://webapiprimavera.advir.pt/sendmailoficios",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                console.log("E-mail enviado com sucesso!");
                alert("E-mail enviado com sucesso!");
            } else {
                const errorData = await response.json();
                console.error("Erro ao enviar email:", errorData);
                alert(
                    "Erro ao enviar email. Verifique os logs para mais detalhes.",
                );
            }

            console.log("Chamando handleSave com o estado 'Imprimir'");
            handleSave("Enviado Por Email");
        } catch (error) {
            console.error("Erro ao gerar ou enviar o PDF com anexos:", error);
            handleSave("Erro no envio");
            alert("Erro ao gerar ou enviar o PDF com anexos.");
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

            const anexosNomes = updatedAnexos
                .map((file) => file.name)
                .join(", ");
            const editableCellCodigo =
                document.getElementById("editableCellCodigo");
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

    // ======================================
    // 12) Salvar dados do documento (criar ofício) no backend
    // ======================================
    useEffect(() => { }, [estadodoc]);

    const handleSave = async (estado) => {
        console.log("teste" + estado);
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

        const nomesAnexos = anexos.map((anexo) => anexo.name).join(", ");
        if (inputValue === "Não tem obra") {
            console.log(donoObra.Nome);
            nomeDonoObra = donoObra.Nome || "";
            moradaDonoObra = morada || "";
            localidadeDonoObra = localidade || "";
            codPostalDonoObra = codigoPostal || "";
            codPostalLocalDonoObra = localCopPostal || "";
            console.log(formData?.codigo);
            obraSlecionadaSave = inputValue || "";
        } else {
            nomeDonoObra = donoObra.Nome;

            moradaDonoObra = donoObra.Morada;
            localidadeDonoObra = donoObra.Localidade;
            codPostalDonoObra = donoObra.CodPostal;
            codPostalLocalDonoObra = donoObra.CodPostalLocal;
            obraSlecionadaSave = selectedObra?.Codigo || "";
        }

        if (currentTemplate === 1) {
            var templateestado = "2";
        } else if (currentTemplate === 2) {
            var templateestado = "1";
        }

        // Função para dividir texto em partes de 4000 caracteres
        const splitText = (text, chunkSize = 4000) => {
            const chunks = [];
            for (let i = 0; i < text.length; i += chunkSize) {
                chunks.push(text.substring(i, i + chunkSize));
            }
            return chunks;
        };
        const part2Chunks = splitText(textParts.part2 || "");
        // Vamos inserir assuntoDoc e textoDoc dentro de formData, para enviar e gravar no backend

        const payloadDoc = {
            ...formData,
            codigo: formData?.codigo || "",
            assunto: assuntoDoc,
            texto1: textParts.part1 || "",
            texto2: part2Chunks[0] || "", // Adiciona a primeira parte
            texto3: part2Chunks[1] || "",
            obra: obraSlecionadaSave || "",
            remetente: usernome,
            createdby: usernome,
            email: useremail,
            template: templateestado,
            donoObra: nomeDonoObra,
            Morrada: moradaDonoObra,
            Localidade: localidadeDonoObra,
            CodPostal: codPostalDonoObra,
            CodPostalLocal: codPostalLocalDonoObra,
            anexos: anexostext || "",
            texto4: part2Chunks[2],
            texto5: part2Chunks[3],
            estado: estado,
            atencao: atencao, // Include atencao field in payload
        };

        try {
            const response = await fetch(
                "https://webapiprimavera.advir.pt/oficio/Criar",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payloadDoc),
                },
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    `Erro https: ${response.status} - ${errorData.error}`,
                );
            }

            const data = await response.json();
            // Depois de criar o ofício, podemos também salvar o PDF e anexos

            console.log("Resposta do servidor:", data);
        } catch (error) {
            console.error("Erro ao criar o ofício:", error);
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
                const response = await fetch(
                    `https://webapiprimavera.advir.pt/oficio/GetEntidade/${entidadeid}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            urlempresa: urlempresa,
                            "Content-Type": "application/json",
                        },
                    },
                );

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const data = await response.json();
                if (
                    data &&
                    data.DataSet &&
                    data.DataSet.Table &&
                    data.DataSet.Table.length > 0
                ) {
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

            const response = await fetch(
                `https://webapiprimavera.advir.pt/oficio/GetEmail/${donoObra.ID}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                },
            );

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            if (
                data &&
                data.DataSet &&
                data.DataSet.Table &&
                data.DataSet.Table.length > 0
            ) {
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

    // ======================================
    // 15) Mudar Template
    // ======================================
    const changeTemplate = () => {
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
        const usernome =
            formData.nome ||
            localStorage.getItem("userNome") ||
            "Email não disponível";
        const useremail =
            formData.email ||
            localStorage.getItem("userEmail") ||
            "Email não disponível";
        console.log(selectedObra);
        setPageCount2(0);
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

  .page1 {
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
      height: 100%;
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
  @media (maxWidth: 768pxx) {
    .page1 { padding: 1rem; }
    th, td { font-size: 6pt; padding: 0.3rem; }
  }
</style>
</head>
<body>
<div class="page1">
<table>
<tr>
<td class="logo" colspan="2">
<img src="${logo}" alt="Logo JPA Construtora" />
</td>
</tr>
<tr>
<td></td>
<td style="padding-left:99px; font-weight: bold; font-style: normal; text-decoration: none; text-transform: none; font-family: 'TitilliumText22L', sans-serif; color: black; font-size: 13px;">
    <span style="font-size: 11px;">EXMO(s) SR(s)<br></span>
    <span style="font-size: 9px;">${donoObra.Nome || ""}<br></span>
    <span style="font-size: 9px;">${atencao ? atencao + "<br>" : ""}</span>
    <span style="font-size: 9px;">${donoObra.Morada || morada}<br></span>
    <span style="font-size: 9px;">${donoObra.Localidade || localidade}<br></span>
    <span style="font-size: 9px;">${donoObra.CodPostal || codigoPostal} ${donoObra.CodPostalLocal || localCopPostal}</span>
</td>

</tr>
<tr>
<td  >
      <img src="${Logo50}" alt="Logo" style="
    width: 50%;
"/>

</td>
<td  >

</td>
</tr>
<tr>
<td  style="font-weight: bold; text-align: center;">

    <hr style="border: 3px solid black; margin: 0;">
</td>
<td  style="font-weight: bold; text-align: center;">
    <hr style="border: 3px solid black; margin: 0;">
</td>
</tr>
<tr>
<td style="width: 28%; font-size: 6pt; font-family: 'TitilliumText22L', sans-serif; color: black; text-align: left; font-weight: bold;" contentEditable="true" id="editableCellCodigo">
  REF: ${formData?.codigo}<br>
  DATA: ${formData.data}<br>
  ANEXOS: </br>${anexostext || ""}<br><br><br><br><br>
  REMETENTE<br><br>

  <span contentEditable="true" >
    ${usernome || "Remetente não disponível"}
  </span><br>

  <span contentEditable="true" >
    ${useremail || "Email não existe"}
  </span><br><br><br><br><br>

  <strong>JPA - CONSTRUTORA</strong><br>
  <span style="color: #999;">Rua de Longras, nº 44</span><br>
  <span style="color: #999;">4730-360 Pedregais,</span><br>
  <span style="color: #999;">Vila Verde - Portugal</span><br><br>

  <span style="color: #999;">www.jpaconstrutora.com</span><br>
  <span style="color: #999;">geral@jpaconstrutora.com</span><br>
  <span style="color: #999;">t. (+351) 253 38 13 10</span><br>
  <span style="color: #999;">f. (+351) 253 38 22 44</span><br>
</td>




<td style="vertical-align: top;">
  <div
    contentEditable="true"
    id="editableCellAssunto"
    oninput="window.updateTexto(this.innerText)"
    style="width: 100%; min-height: 594px; max-height: 600px; max-width: 490px; overflow: auto;  font-family: 'TitilliumText22L', sans-serif; color: black; font-size: 13px;"
  >
    <span style="font-weight: bold; font-style: normal; text-decoration: none; text-transform: none; font-size: 10px;">
      ASSUNTO:  ${assuntoDoc}
    </span><br><br>
    <span style="font-weight: normal; font-style: normal; text-decoration: none; text-transform: none; font-size: 9px;">
      EXMO(s) SR(s) 
    </span><br><br>
    ${textParts.part1.replace(/\n/g, "<br>").replace(/ /g, "&nbsp;")}
<br><br>

    <span>
      Sem outro assunto,
    </span><br>
    Com os melhores cumprimentos,<br>
    De V/Exas.<br>
    Atentamente<br>
    <span contentEditable="true">
      ${usernome}
    </span>
  </div>
</td>


</tr>
<tr>

<td>
</td>
<td style="font-weight: normal; font-style: normal; text-decoration: none; text-transform: none; font-size: 13px; color: black;" contentEditable="true">

</td>
</tr>
<tr>
<td class="PMEPreto">
<img src="${PMEPreto}" alt="Logo" />
<img src="${QualidadePreto}" alt="Logo" />

</td>
<td style="
    font-size: 8px;">
        <br>_____________________________________________________________________________________________________________________<br>
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

        const pageHeight = 1095.5; // Altura da página (ajuste conforme necessário)
        const textHeight = calculateTextHeight(textParts.part2); // Função para calcular a altura do texto

        // Verifique se o conteúdo excede a altura da página
        let pages = [];
        let remainingText = textParts.part2;

        // Enquanto o conteúdo for maior que a altura da página, crie novas páginas
        while (remainingText.length > 0) {
            const pageContent = remainingText.substring(0, 1800); // Pegue uma quantidade de caracteres
            remainingText = remainingText.substring(1800); // Remova a parte já usada

            pages.push(createPage(pageContent)); // Adiciona a página com o conteúdo atual
        }

        // Agora, adicionamos os containers adequados para cada página
        return pages
            .map((page, index) => {
                return `
            <div 
                ref={docxContainer${index + 2}} 
                style="
                    width: 793.7px;
                    height: 1122.5px;
                    border: 0px solid rgb(204, 204, 204);
                    background-color: rgb(255, 255, 255);
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: rgba(0, 0, 0, 0.1) 0px 2px 4px;
                "
            >
                ${page}
            </div>
        `;
            })
            .join("");
    };

    const calculateTextHeight = (text) => {
        // Uma forma simples de calcular a altura do texto, pode ser ajustada conforme necessário
        const avgCharHeight = 20; // altura média de um caractere, ajustável
        return text.length * avgCharHeight;
    };
    let pageCount = 0;
    const createPage = (content) => {
        pageCount++;
        const isFirstPage = pageCount === 1;

        setPageCount2((prevCount) => prevCount + 1);
        console.log(pageCount2);
        return `
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
        font-size: 10pt; /* Changed font size to 10pt */
      }
      .page {
            max-width: 100%;
        margin: auto;
        padding: 2rem;
        border: 0px solid #ccc;
        background-color: #fff;
        box-sizing: border-box;
        font-size: 10pt; /* Changed font size to 10pt */
        height: 1095.5px;
        font-size: 13pt;
        text-align: justify;
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
        <td style="padding-left:300px; padding-left:243px; font-weight: bold; font-style: normal; text-decoration: none; text-transform: none; text-align: justify; font-family: 'TitilliumText22L', sans-serif; color: black; font-size: 13px;" contentEditable="true" colspan="2">
        ${isFirstPage
                ? `
              EXMO(s) SR(s)${donoObra.Nome}<br>`
                : ""
            }

          </td>
        </tr>
        <tr>

          <td colspan="2">
  <div
    contentEditable="true"
    id="editableCellAssunto"
    oninput="window.updateTexto(this.innerText)"
    style="
      width: 100%;
      min-height: 764px;
      max-height: 600px;
      overflow: auto;
    "
  >
    ${isFirstPage
                ? `
      <span 
        style="
          font-family: 'TitilliumText22L', sans-serif;
          font-size: 10pt;
          font-weight: bold; /* Negrito ON */
          font-style: normal; /* Itálico OFF */
          text-decoration: none; /* Sublinhado OFF */
          text-transform: none; /* Maiúscula OFF */
          color: black;
          text-align: justify;
          display: block;
        "
      >
        ASSUNTO: ${donoObra.Nome} - ${assuntoDoc}
      </span>
      <br><br>
      <span
        style="
          font-family: 'TitilliumText22L', sans-serif;
          font-size: 9pt;
          font-weight: normal; /* Negrito OFF */
          font-style: normal; /* Itálico OFF */
          text-decoration: none; /* Sublinhado OFF */
          text-transform: none; /* Maiúscula OFF */
          color: black;
          text-align: justify;
          display: block;
        "
      >
        Exmo(s) Senhores,
      </span>
      <br><br>`
                : ""
            }
       ${content.replace(/\n/g, "<br>")}

  </div>
</td>

        </tr>
<tr>
<td class="PMEPreto">
<img src="${PMEPreto}" alt="Logo" />
<img src="${QualidadePreto}" alt="Logo" />
<img src="${Logo50}" alt="Logo" style="max-width: 43%;"/>
</td>
<td style="
    font-size: 8px;">
        <br>_____________________________________________________________________________________________________________________<br>
        Joaquim Peixoto Azevedo & Filhos, Lda * Alvará n.º 44085 . NIF / Nºmatrícula reg.c.r.c.:502244585 . Capital social: 750.000.00 €
</td>
</tr>
      </table>
    </div>
    </body>
    </html>
    `;
    };

    const getTemplate2 = () => {
        const usernome =
            formData.nome ||
            localStorage.getItem("userNome") ||
            "Email não disponível";
        const useremail =
            formData.email ||
            localStorage.getItem("userEmail") ||
            "Email não disponível";
        setPageCount2(0);
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

  .page1 {
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
      height: 100%;
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
  .logo { text-align: left; visibility: hidden;}
  .logo img { max-width: 30%; height: auto; visibility: hidden;}
  .PMEPreto img { max-width: 25%; height: auto; visibility: hidden;}
  @media (maxWidth: 768px) {
    .page1 { padding: 1rem; }
    th, td { font-size: 6pt; padding: 0.3rem; }
  }
</style>
</head>
<body>
<div class="page1">
<table>
<tr>
<td class="logo" colspan="2">
<img src="${logo}" alt="Logo JPA Construtora" />
</td>
</tr>
<tr>
<td></td>
<td style="padding-left:99px; font-weight: bold; font-style: normal; text-decoration: none; text-transform: none; font-family: 'TitilliumText22L', sans-serif; color: black; font-size: 13px;">
    <span style="font-size: 11px;">EXMO(s) SR(s)<br></span>
    <span style="font-size: 9px;">${donoObra.Nome || ""}<br></span>
    <span style="font-size: 9px;">${atencao ? atencao + "<br>" : ""}</span>
    <span style="font-size: 9px;">${donoObra.Morada || morada}<br></span>
    <span style="font-size: 9px;">${donoObra.Localidade || localidade}<br></span>
    <span style="font-size: 9px;">${donoObra.CodPostal || codigoPostal} ${donoObra.CodPostalLocal || localCopPostal}</span>
</td>

</tr>
<tr>
<td  >
      <img src="${Logo50}" alt="Logo" style="
    width: 50%; visibility: hidden;
"/>

</td>
<td  >

</td>
</tr>
<tr>
<td  style="font-weight: bold; text-align: center; visibility: hidden;">

    <hr style="border: 3px solid black; margin: 0; visibility: hidden;">
</td>
<td  style="font-weight: bold; text-align: center; visibility: hidden;">
    <hr style="border: 3px solid black; margin: 0; visibility: hidden;">
</td>
</tr>
<tr>
<td style="width: 28%; font-size: 6pt; font-family: 'TitilliumText22L', sans-serif; color: black; text-align: left; font-weight: bold;" contentEditable="true" id="editableCellCodigo">
  REF: ${formData?.codigo}<br>
  DATA: ${formData.data}<br>
  ANEXOS: </br>${anexostext || ""}<br><br><br><br><br>
  REMETENTE<br><br>

  <span contentEditable="true" >
    ${usernome || "Remetente não disponível"}
  </span><br>

  <span contentEditable="true" >
    ${useremail || "Email não existe"}
  </span><br><br><br><br><br>

  <strong>JPA - CONSTRUTORA</strong><br>
  <span style="color: #999;">Rua de Longras, nº 44</span><br>
  <span style="color: #999;">4730-360 Pedregais,</span><br>
  <span style="color: #999;">Vila Verde - Portugal</span><br><br>

  <span style="color: #999;">www.jpaconstrutora.com</span><br>
  <span style="color: #999;">geral@jpaconstrutora.com</span><br>
  <span style="color: #999;">t. (+351) 253 38 13 10</span><br>
  <span style="color: #999;">f. (+351) 253 38 22 44</span><br>
</td>

<td style="vertical-align: top;">
  <div
    contentEditable="true"
    id="editableCellAssunto"
    oninput="window.updateTexto(this.innerText)"
    style="width: 100%; min-height: 594px; max-height: 600px; max-width: 490px; overflow: auto;  font-family: 'TitilliumText22L', sans-serif; color: black; font-size: 13px;"
  >
    <span style="font-weight: bold; font-style: normal; text-decoration: none; text-transform: none; font-size: 10px;">
      ASSUNTO:  ${assuntoDoc}
    </span><br><br>
    <span style="font-weight: normal; font-style: normal; text-decoration: none; text-transform: none; font-size: 9px;">
      EXMO(s) SR(s) 
    </span><br><br>


    ${textParts.part1.replace(/\n/g, "<br>").replace(/ /g, "&nbsp;")}
<br><br>

    <span>
      Sem outro assunto,
    </span><br>
    Com os melhores cumprimentos,<br>
    De V/Exas.<br>
    Atentamente<br>
    <span contentEditable="true">
      ${usernome}
    </span>
  </div>
</td>



</tr>
<tr>
<td>
</td>
<td >

</td>
</tr>
<tr>
<td class="PMEPreto">
<img src="${PMEPreto}" alt="Logo"  style="visibility: hidden;"/>
<img src="${QualidadePreto}" alt="Logo" style="visibility: hidden;"/>
</td>
<td style="visibility: hidden;
    font-size: 8px;">
        <br>_____________________________________________________________________________________________________________________<br>
        Joaquim Peixoto Azevedo & Filhos, Lda * Alvará n.º 44085 . NIF / Nºmatrícula reg.c.r.c.:502244585 . Capital social: 750.000.00 €
</td>
</tr>
</table>
</div>
</body>
</html>
`;
    };

    const getTemplate2SecondPage = () => {
        if (!textParts.part2) {
            return "";
        }

        const pageHeight = 1095.5; // Height of the page (adjust as necessary)
        const textHeight = calculateTextHeight(textParts.part2); // Function to calculate the text height

        // Check if the content exceeds the height of the page
        let pages = [];
        let remainingText = textParts.part2;

        // While the content is larger than the page height, create new pages
        while (remainingText.length > 0) {
            const pageContent = remainingText.substring(0, 1800); // Take a chunk of characters
            remainingText = remainingText.substring(1800); // Remove the used part

            pages.push(createPage2(pageContent)); // Add the page with current content
        }

        // Add appropriate containers for each page
        return pages
            .map((page, index) => {
                return `
            <div 
                ref={docxContainer${index + 2}} 
                style="
                    width: 793.7px;
                    height: 1122.5px;
                    border: 0px solid rgb(204, 204, 204);
                    background-color: rgb(255, 255, 255);
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: rgba(0, 0, 0, 0.1) 0px 2px 4px;
                "
            >
                ${page}
            </div>
        `;
            })
            .join("");
    };

    const createPage2 = (content) => {
        pageCount++;
        const isFirstPage = pageCount === 1;

        setPageCount2((prevCount) => prevCount + 1);
        console.log(pageCount2);
        return `
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
        font-size: 10pt; /* Changed font size to 10pt */
      }
      .page {
            max-width: 100%;
        margin: auto;
        padding: 2rem;
        border: 0px solid #ccc;
        background-color: #fff;
        box-sizing: border-box;
        font-size: 10pt; /* Changed font size to 10pt */
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
                <td style="padding-left:300px; padding-left:243px; font-weight: bold; font-style: normal; text-decoration: none; text-transform: none; text-align: justify; font-family: 'TitilliumText22L', sans-serif; color: black; font-size: 13px;" contentEditable="true" colspan="2">
        ${isFirstPage
                ? `
              EXMO(s) SR(s)${donoObra.Nome}<br>`
                : ""
            }

          </td>
        </tr>
        <tr>

          <td colspan="2">
  <div
    contentEditable="true"
    id="editableCellAssunto"
    oninput="window.updateTexto(this.innerText)"
    style="
      width: 100%;
      min-height: 764px;
      max-height: 600px;
      overflow: auto;
    "
  >
    ${isFirstPage
                ? `
      <span 
        style="
          font-family: 'TitilliumText22L', sans-serif;
          font-size: 10pt;
          font-weight: bold; /* Negrito ON */
          font-style: normal; /* Itálico OFF */
          text-decoration: none; /* Sublinhado OFF */
          text-transform: none; /* Maiúscula OFF */
          color: black;
          text-align: justify;
          display: block;
        "
      >
        ASSUNTO: ${donoObra.Nome} - ${assuntoDoc}
      </span>
      <br><br>
      <span
        style="
          font-family: 'TitilliumText22L', sans-serif;
          font-size: 9pt;
          font-weight: normal; /* Negrito OFF */
          font-style: normal; /* Itálico OFF */
          text-decoration: none; /* Sublinhado OFF */
          text-transform: none; /* Maiúscula OFF */
          color: black;
          text-align: justify;
          display: block;
        "
      >
        Exmo(s) Senhores,
      </span>
      <br><br>`
                : ""
            }
       ${content.replace(/\n/g, "<br>")}

  </div>
</td>

        </tr>
<tr>
<td class="PMEPreto">
<img src="${PMEPreto}" alt="Logo" />
<img src="${QualidadePreto}" alt="Logo" />
<img src="${Logo50}" alt="Logo" style="max-width: 43%;"/>
</td>
<td style="visibility: hidden;
    font-size: 8px;">
        <br>_____________________________________________________________________________________________________________________<br>
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
    const docxContainerUpdated = useRef(false);
    useEffect(() => {
        if (docxContainer.current) {
            const newContent =
                currentTemplate === 1 ? getTemplate1() : getTemplate2();
            docxContainer.current.innerHTML = newContent;

            if (docxContainer2.current) {
                const secondPageContent =
                    currentTemplate === 1
                        ? getTemplate1SecondPage()
                        : getTemplate2SecondPage();
                docxContainer2.current.innerHTML = secondPageContent;
            }

            // Marca que o conteúdo foi atualizado
            docxContainerUpdated.current = true;
        }
    }, [currentTemplate, donoObra, formData, textParts, assuntoDoc, atencao]);

    // Adicionar efeito para fechar o dropdown ao clicar em qualquer lugar fora dele
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

    // Função para gerar o PDF quando o conteúdo estiver pronto
    const handleGeneratePDF = async () => {
        // Verifique se o conteúdo foi atualizado antes de gerar o PDF
        if (docxContainerUpdated.current) {
            await handleSavePDF(); // Chama a função de gerar PDF
            docxContainerUpdated.current = false; // Reseta para evitar a geração do PDF de novo sem mudança
        } else {
            console.log("Conteúdo ainda não foi atualizado!");
        }
    };

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

    const filteredObras = obras.filter(
        (obra) =>
            obra.Codigo.toLowerCase().includes(inputValue.toLowerCase()) ||
            obra.Descricao.toLowerCase().includes(inputValue.toLowerCase()),
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                comboBoxRef.current &&
                !comboBoxRef.current.contains(event.target)
            ) {
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

        var nomeDonoObra = "";
        var moradaDonoObra = "";
        var localidadeDonoObra = "";
        var codPostalDonoObra = "";
        var codPostalLocalDonoObra = "";
        var obraSlecionadaSave = "";

        const nomesAnexos = anexos.map((anexo) => anexo.name).join(", ");
        if (inputValue === "Não tem obra") {
            console.log(donoObra.Nome);
            nomeDonoObra = donoObra.Nome || "";
            moradaDonoObra = morada || "";
            localidadeDonoObra = localidade || "";
            codPostalDonoObra = codigoPostal || "";
            codPostalLocalDonoObra = localCopPostal || "";
            console.log(formData?.codigo);
            obraSlecionadaSave = inputValue || "";
        } else {
            nomeDonoObra = donoObra.Nome;
            moradaDonoObra = donoObra.Morada;
            localidadeDonoObra = donoObra.Localidade;
            codPostalDonoObra = donoObra.CodPostal;
            codPostalLocalDonoObra = donoObra.CodPostalLocal;
            obraSlecionadaSave = selectedObra?.Codigo || "";
        }

        // Função para dividir texto em partes de 4000 caracteres
        const splitText = (text, chunkSize = 4000) => {
            const chunks = [];
            for (let i = 0; i < text.length; i += chunkSize) {
                chunks.push(text.substring(i, i + chunkSize));
            }
            return chunks;
        };

        const part2Chunks = splitText(textParts.part2 || "");

        const payloadDoc = {
            ...formData,
            codigo: formData?.codigo || oficioData?.CDU_codigo || "",
            assunto: assuntoDoc,
            texto1: textParts.part1 || "",
            texto2: part2Chunks[0] || "", // Adiciona a primeira parte
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
            estado: estadodoc || oficioData?.CDU_estado || "",
            atencao: atencao, // Include atencao field in payload
        };

        try {
            const response = await fetch(
                "https://webapiprimavera.advir.pt/oficio/atualizar",
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        urlempresa: urlempresa,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payloadDoc),
                },
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    `Erro https: ${response.status} - ${errorData.error}`,
                );
            }

            const data = await response.json();
            console.log("Resposta do servidor:", data);
            alert("Ofício atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar o ofício:", error);
            alert(
                "Erro ao atualizar o ofício. Verifique os logs para mais detalhes.",
            );
        }
    };

    const goBackToOficiosList = () => {
        navigation.navigate("OficiosList"); // Navigate to OficiosList screen
    };

    const handleOptionClick2 = (obra) => {
        var input = obra.Codigo + " - " + obra.Nome;
        setInputValue2(input);
        setSelectedObra2(obra);
        setShowOptions2(false);
        setDonoObra(obra);
        setAtencao(`A/C.: ${obra.Nome}`); // Define o campo de atenção
    };

    return (
        <div style={styles.pageContainer}>
            <header style={styles.header}>
                <div style={styles.controlsAlignedLeft}>
                    <TouchableOpacity
                        onPress={goBackToOficiosList}
                        style={{
                            position: "absolute", // Posiciona o botão fora do fluxo normal
                            top: 10, // Define a distância do topo
                            left: 10, // Define a distância da esquerda
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 10,
                            borderRadius: 30,
                            borderColor: "#1792FE",
                            borderWidth: 1,
                            zIndex: 1000, // Garante que o botão fique acima de outros elementos
                        }}
                    >
                        <FontAwesomeIcon
                            icon={faArrowLeft}
                            style={{ color: "#1792FE", marginRight: 5 }}
                        />
                        <Text style={{ color: "#1792FE" }}>Voltar</Text>
                    </TouchableOpacity>

                    {/* Botão Mudar Template só aparece na pré-visualização */}
                    {isPreviewVisible && (
                        <>
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
                                onClick={changeTemplate}
                                style={{
                                    ...styles.button,
                                    backgroundColor: "#28a745",
                                }}
                            >
                                Alterar Template
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
                                    // Set email subject from document subject
                                    if (assuntoDoc) {
                                        setEmailAssunto(assuntoDoc);
                                    }

                                    // Certifica que o corpo do email está vazio antes de abrir o modal
                                    if (emailTexto === "") {
                                        setEmailTexto(
                                            "Segue em anexo o ofício com referência: " +
                                            formData.codigo,
                                        );
                                    }

                                    if (!isButtonSave) {
                                        setIsButtonSave(true);
                                        setIsModalOpen(true);
                                    } else {
                                        setIsModalOpen(true);
                                        handleSaveOrUpdate();
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

            {/* Renderiza os inputs ou a pré-visualização */}
            {isPreviewVisible ? (
                <>
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
                                <option value="Times New Roman">Times New Roman</option>
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
                                onClick={() => document.execCommand("bold", false, null)}
                                style={styles.toolbarButton}
                                title="Negrito (Ctrl+B)"
                            >
                                <b>N</b>
                            </button>
                            <button
                                onClick={() => document.execCommand("italic", false, null)}
                                style={styles.toolbarButton}
                                title="Itálico (Ctrl+I)"
                            >
                                <i>I</i>
                            </button>
                            <button
                                onClick={() => document.execCommand("underline", false, null)}
                                style={styles.toolbarButton}
                                title="Sublinhado (Ctrl+U)"
                            >
                                <u>S</u>
                            </button>
                            <button
                                onClick={() => document.execCommand("strikeThrough", false, null)}
                                style={styles.toolbarButton}
                                title="Tachado"
                            >
                                <span style={{ textDecoration: "line-through" }}>T</span>
                            </button>
                        </div>

                        <div style={styles.toolbarGroup}>
                            <button
                                onClick={() => document.execCommand("justifyLeft", false, null)}
                                style={styles.toolbarButton}
                                title="Alinhar à esquerda"
                            >
                                <span role="img" aria-label="Alinhar à esquerda">⫷</span>
                            </button>
                            <button
                                onClick={() => document.execCommand("justifyCenter", false, null)}
                                style={styles.toolbarButton}
                                title="Centralizar"
                            >
                                <span role="img" aria-label="Centralizar">≡</span>
                            </button>
                            <button
                                onClick={() => document.execCommand("justifyRight", false, null)}
                                style={styles.toolbarButton}
                                title="Alinhar à direita"
                            >
                                <span role="img" aria-label="Alinhar à direita">⫸</span>
                            </button>
                            <button
                                onClick={() => document.execCommand("justifyFull", false, null)}
                                style={styles.toolbarButton}
                                title="Justificar"
                            >
                                <span role="img" aria-label="Justificar">☰</span>
                            </button>
                        </div>

                        <div style={styles.toolbarGroup}>
                            <label style={styles.toolbarLabel} title="Cor do texto">
                                <span role="img" aria-label="Cor do texto" style={{ marginRight: "5px" }}>🎨</span>
                                <input
                                    type="color"
                                    onChange={(e) => document.execCommand("foreColor", false, e.target.value)}
                                    style={styles.colorPicker}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Área de visualização do DOCUMENTO (template) */}
                    <div ref={docxContainer} style={styles.docxContainer}></div>
                    {textParts.part2 && <div ref={docxContainer2}></div>}
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
                    {/* Campo para selecionar obra */}
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            marginBottom: "20px",
                        }}
                        ref={comboBoxRef}
                    >
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
                                            setInputValue(
                                                `${obra.Codigo} - ${obra.Descricao}`,
                                            );
                                            setShowOptions(false);
                                        }}
                                        style={{
                                            padding: "10px",
                                            cursor: "pointer",
                                            color: "#333",
                                            background:
                                                selectedObra?.Codigo ===
                                                    obra.Codigo
                                                    ? "#e6f7ff"
                                                    : "white",
                                            borderRadius: "6px",
                                            marginBottom: "5px",
                                        }}
                                    >
                                        {obra?.Codigo || ""} -{" "}
                                        {obra?.Descricao || ""}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            marginBottom: "20px",
                        }}
                        ref={comboBoxRef2}
                        onClick={handleComboBoxClick} // Chama a função ao clicar
                    >
                        <input
                            type="text"
                            value={inputValue2}
                            onChange={(e) => {
                                setInputValue2(e.target.value);
                                // Aplica o filtro diretamente ao digitar, para que a lista seja filtrada conforme o input
                                const filtered = filterObras(
                                    e.target.value,
                                    obras2,
                                );
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
                            onFocus={handleFocus} // Garante que as opções sejam carregadas quando o campo é focado
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
                                    <li
                                        style={{
                                            padding: "10px",
                                            color: "#999",
                                        }}
                                    >
                                        Escreva aqui para escolher a entidade
                                        pretendida
                                    </li>
                                ) : (
                                    filteredObras2.map((obra, index) => (
                                        <li
                                            key={index}
                                            onClick={() =>
                                                handleOptionClick2(obra)
                                            }
                                            style={{
                                                padding: "10px",
                                                cursor: "pointer",
                                                color: "#333",
                                                background:
                                                    selectedObra2?.Codigo ===
                                                        obra.Codigo
                                                        ? "#e6f7ff"
                                                        : "white",
                                                borderRadius: "6px",
                                                marginBottom: "5px",
                                            }}
                                        >
                                            {obra?.Codigo || ""} -{" "}
                                            {obra?.Nome || ""}
                                        </li>
                                    ))
                                )}
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
                    />

                    {/* Exibe campos somente quando a opção "Não tem obra" está selecionada */}
                    <>
                        {/* Campo de morada */}
                        <input
                            type="text"
                            placeholder="Morada"
                            value={donoObra?.Morada || ""}
                            onChange={(e) =>
                                setDonoObra((prev) => ({
                                    ...prev,
                                    Morada: e.target.value,
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

                        {/* Campo de localidade */}
                        <input
                            type="text"
                            placeholder="Localidade"
                            value={donoObra?.Localidade || ""}
                            onChange={(e) =>
                                setDonoObra((prev) => ({
                                    ...prev,
                                    Localidade: e.target.value,
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
                        {/* Campo de código postal e local coppostal lado a lado */}
                        <div
                            style={{
                                display: "flex",
                                gap: "10px",
                                margin: "10px 0",
                            }}
                        >
                            <input
                                type="text"
                                placeholder="Código Postal"
                                value={donoObra?.CodPostal || ""}
                                onChange={(e) =>
                                    setDonoObra((prev) => ({
                                        ...prev,
                                        CodPostal: e.target.value,
                                    }))
                                }
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
                                value={donoObra?.CodPostalLocal || ""}
                                onChange={(e) =>
                                    setDonoObra((prev) => ({
                                        ...prev,
                                        CodPostalLocal: e.target.value,
                                    }))
                                }
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

                    {/* Campo de email */}
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

                    {/* Campo de assunto */}
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

                    {/* Contador de caracteres */}
                    <div
                        style={{
                            fontSize: "14px",
                            marginTop: "5px",
                            color: "#555",
                        }}
                    >
                        {textParts.part1.length} / 1120 caracteres |{" "}
                        {textParts.part1.split("\n").length} / 19 linhas
                    </div>

                    {/* Textarea para o texto principal */}
                    <textarea
                        placeholder="Texto do Ofício"
                        value={textParts.part1}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            const lineCount = (newValue.match(/\n/g) || [])
                                .length; // Conta linhas

                            if (lineCount <= 19) {
                                setTextParts({ ...textParts, part1: newValue });
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Tab") {
                                e.preventDefault(); // Impede o foco para outro campo
                                const cursorPos = e.target.selectionStart;
                                const newValue =
                                    textParts.part1.substring(0, cursorPos) +
                                    "    " +
                                    textParts.part1.substring(cursorPos);

                                setTextParts({ ...textParts, part1: newValue });

                                // Reposiciona o cursor após os espaços
                                setTimeout(() => {
                                    e.target.selectionStart =
                                        e.target.selectionEnd = cursorPos + 4;
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

                    {/* Div para conteúdo editável (oculto) */}
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
                            display: "none", // Torna o conteúdo invisível, mas o espaço permanece
                        }}
                        dangerouslySetInnerHTML={{ __html: textParts.part1 }}
                    ></div>

                    {/* Textarea para a segunda parte do texto */}
                    <textarea
                        placeholder="Texto do Ofício Timbrado"
                        value={textParts.part2}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            const lineCount = (newValue.match(/\n/g) || [])
                                .length; // Conta linhas
                            setTextParts({ ...textParts, part2: newValue });
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Tab") {
                                e.preventDefault(); // Impede o foco para outro campo
                                const cursorPos = e.target.selectionStart; // Posição atual do cursor

                                // Adiciona quatro espaços no ponto do cursor
                                const newValue =
                                    textParts.part2.substring(0, cursorPos) +
                                    "    " +
                                    textParts.part2.substring(cursorPos);

                                setTextParts({ ...textParts, part2: newValue }); // Atualiza o estado com os novos dados

                                // Reposiciona o cursor após os espaços
                                setTimeout(() => {
                                    e.target.selectionStart =
                                        e.target.selectionEnd = cursorPos + 4; // Nova posição após os 4 espaços
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

                    {/* Div para conteúdo editável da parte 2 (oculto) */}
                    <div
                        ref={contentEditableRef}
                        contentEditable="true"
                        dir="ltr"
                        onInput={handleInputPart2} // Atualiza part2 sem limite
                        onKeyDown={(e) => {
                            if (e.key === "Tab") {
                                e.preventDefault();
                                const selection = window.getSelection();
                                const range = selection.getRangeAt(0);

                                const tabNode = document.createTextNode(
                                    "\u00A0\u00A0\u00A0\u00A0",
                                );
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
                            direction: "ltr",
                            display: "none",
                        }}
                        dangerouslySetInnerHTML={{ __html: textParts.part2 }} // Exibe a parte 2 sem limite
                    ></div>

                    {/* Botão para selecionar anexos */}
                    <label style={styles.fileInputLabel}>
                        <FaPaperclip /> Anexos
                        <input
                            type="file"
                            multiple
                                onChange={(e) => {
                                    handleAddAnexo(e);
                                const files = Array.from(e.target.files);
                                const fileNames = files
                                    .map((file) => file.name)
                                    .join("</br> ");
                                setAnexostext((prevText) =>
                                    prevText
                                        ? `${prevText}, ${fileNames}`
                                        : fileNames,
                                );
                            }}
                            style={styles.fileInput}
                        />
                    </label>

                    {/* Exibindo o texto com a quebra de linha corretamente renderizada */}
                    <div
                        style={{
                            whiteSpace: "pre-wrap", // Faz com quebras de linha apareçam corretamente no texto
                            wordWrap: "break-word",
                            padding: "12px",
                            margin: "10px 0",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            fontSize: "16px",
                            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                        }}
                        dangerouslySetInnerHTML={{ __html: anexostext }} // Exibe o texto com <br />
                    />

                    {/* Text box that appears when an entity is selected */}
                    {selectedObra2 && (
                        <div
                            style={{ marginTop: "10px", marginBottom: "20px" }}
                        >
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
                        <div style={styles.modalBody}>
                            <input
                                type="text"
                                placeholder="Para:"
                                value={emailTo}
                                onChange={(e) => setEmailTo(e.target.value)}
                                style={styles.input}
                            />

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    marginBottom: "10px",
                                }}
                            >
                                <input
                                    type="text"
                                    placeholder="CC:"
                                    value={emailCC}
                                    onChange={(e) => setEmailCC(e.target.value)}
                                    style={{
                                        ...styles.input,
                                        marginBottom: 0,
                                        flex: 1,
                                    }}
                                />
                                <div style={{ position: "relative" }}>
                                    <button
                                        onClick={() =>
                                            document
                                                .getElementById("emailDropdown")
                                                .classList.toggle("show")
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
                                            boxShadow:
                                                "0px 8px 16px 0px rgba(0,0,0,0.2)",
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
                                                    const currentEmails =
                                                        emailCC
                                                            ? emailCC
                                                                .split(";")
                                                                .map((e) =>
                                                                    e.trim(),
                                                                )
                                                            : [];
                                                    if (
                                                        !currentEmails.includes(
                                                            email,
                                                        )
                                                    ) {
                                                        const newEmailCC =
                                                            currentEmails.length >
                                                                0
                                                                ? `${emailCC}; ${email}`
                                                                : email;
                                                        setEmailCC(newEmailCC);
                                                    }
                                                    document
                                                        .getElementById(
                                                            "emailDropdown",
                                                        )
                                                        .classList.remove(
                                                            "show",
                                                        );
                                                }}
                                                style={{
                                                    padding: "10px 15px",
                                                    cursor: "pointer",
                                                    borderBottom:
                                                        index < 3
                                                            ? "1px solid #eee"
                                                            : "none",
                                                    borderRadius:
                                                        index === 0
                                                            ? "5px 5px 0 0"
                                                            : index === 3
                                                                ? "0 0 5px 5px"
                                                                : "0",
                                                }}
                                                onMouseOver={(e) =>
                                                (e.currentTarget.style.backgroundColor =
                                                    "#f1f1f1")
                                                }
                                                onMouseOut={(e) =>
                                                (e.currentTarget.style.backgroundColor =
                                                    "white")
                                                }
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
                                onChange={(e) =>
                                    setEmailAssunto(e.target.value)
                                }
                                style={styles.input}
                            />

                            <textarea
                                placeholder="Mensagem do Email"
                                value={emailTexto}
                                onChange={(e) => setEmailTexto(e.target.value)}
                                style={{
                                    ...styles.input,
                                    height: "150px",
                                    minHeight: "80px",
                                    resize: "vertical",
                                }}
                            />

                            <div style={styles.signatureSection}>
                                <div style={styles.signatureHeader}>
                                    <input
                                        type="checkbox"
                                        id="includeSignature"
                                        defaultChecked={true}
                                        onChange={(e) => {
                                            document.getElementById(
                                                "emailSignature",
                                            ).style.display = e.target.checked
                                                    ? "block"
                                                    : "none";
                                        }}
                                        style={{ marginRight: "5px" }}
                                    />
                                    <label htmlFor="includeSignature">
                                        Incluir assinatura
                                    </label>
                                </div>
                                <div
                                    id="emailSignature"
                                    style={styles.signaturePreview}
                                >
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ width: "70%", paddingRight: "15px", verticalAlign: "top" }}>

                                                    <div style={{ display: "flex", alignItems: "center", marginTop: "10px" }}>
                                                        <span style={{ color: "#1792FE", marginRight: "8px", fontSize: "14px" }}>
                                                            ✉
                                                        </span>
                                                        <a
                                                            href="mailto:oficio@jpaconstrutora.com"
                                                            style={{
                                                                color: "#1792FE",
                                                                textDecoration: "none",
                                                                fontSize: "13px"
                                                            }}
                                                        >
                                                            oficio@jpaconstrutora.com
                                                        </a>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", marginTop: "5px" }}>
                                                        <span style={{ color: "#666", marginRight: "8px", fontSize: "14px" }}>
                                                            📞
                                                        </span>
                                                        <span style={{ color: "#666", fontSize: "13px" }}>
                                                            t. (+351) 253 38 13 10 (Chamada rede fixa nacional)
                                                        </span>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", marginTop: "5px" }}>
                                                        <span style={{ color: "#666", marginRight: "8px", fontSize: "14px" }}>
                                                            📱
                                                        </span>
                                                        <span style={{ color: "#666", fontSize: "13px" }}>
                                                            tel. (+351) 910 11 76 22 (Chamada rede móvel nacional)
                                                        </span>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "flex-start", marginTop: "5px" }}>
                                                        <span style={{ color: "#666", marginRight: "8px", marginTop: "2px", fontSize: "14px" }}>
                                                            📍
                                                        </span>
                                                        <div>
                                                            <div style={{ color: "#666", fontSize: "13px" }}>
                                                                Rua Das Longras 44,
                                                            </div>
                                                            <div style={{ color: "#666", fontSize: "13px" }}>
                                                                4730-360 Pedregais
                                                            </div>
                                                            <div style={{ color: "#666", fontSize: "13px" }}>
                                                                Vila Verde - Portugal
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ width: "30%", textAlign: "right", verticalAlign: "top" }}>
                                                    <div style={{ marginBottom: "10px" }}>
                                                        <img src={logo} alt="JPA Construtora" style={{ maxWidth: "120px", height: "auto" }} />
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
                                                                fontSize: "13px"
                                                            }}
                                                        >
                                                            WWW.JPACONSTRUTORA.COM
                                                        </a>
                                                    </div>
                                                    <div style={{ marginTop: "10px", textAlign: "right" }}>
                                                        <img src={PMEPreto} alt="PME Logo" style={{ height: "30px", marginRight: "5px" }} />
                                                        <img src={QualidadePreto} alt="Qualidade Logo" style={{ height: "30px" }} />
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

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
                                                    onClick={() =>
                                                        handleRemoveAnexo(index)
                                                    }
                                                    style={styles.removeButton}
                                                >
                                                    Remover
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div style={styles.modalActions}>
                            <button
                                onClick={handleSendEmailWithOfficeAPI}
                                style={styles.button}
                            >
                                Enviar
                            </button>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={styles.cancelButton}
                            >
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
// Adicionar uma regra CSS global para o dropdown
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = `
        .dropdown-content.show {
            display: block !important;
        }
    `;
    document.head.appendChild(style);
}

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
    editorToolbar: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: "10px",
        padding: "10px",
        backgroundColor: "#f0f0f0",
        borderRadius: "8px",
        marginBottom: "10px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        width: "793.7px",
        flexWrap: "wrap",
        position: "sticky",
        top: 0,
        zIndex: 100,
    },
    toolbarGroup: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "5px",
        borderRight: "1px solid #ddd",
        paddingRight: "10px",
        marginRight: "10px",
    },
    toolbarButton: {
        padding: "6px 10px",
        backgroundColor: "#fff",
        border: "1px solid #ccc",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px",
        color: "#333",
        transition: "all 0.2s ease",
        minWidth: "32px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    toolbarSelect: {
        padding: "6px 10px",
        backgroundColor: "#fff",
        border: "1px solid #ccc",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px",
        color: "#333",
        minWidth: "120px",
    },
    colorPicker: {
        width: "30px",
        height: "30px",
        padding: "0",
        border: "1px solid #ccc",
        borderRadius: "4px",
        cursor: "pointer",
        backgroundColor: "transparent",
    },
    toolbarLabel: {
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: "4px",
        backgroundColor: "#fff",
        border: "1px solid #ccc",
    },
    body: {
        margin: 0,
        padding: 0,
        display: "flex",
        justifycontent: "center",
        alignItems: "center",
        minheight: "100vh",
        backgroundColor: "#d4e4ff" /* fundo azul claro */,
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
        width: "100%",
        padding: "10px",
        fontSize: "16px",
        border: "1px solid #ccc",
        borderRadius: "5px",
        marginBottom: "10px",
        boxSizing: "border-box",
        "@media (maxWidth: 768px)": {
            padding: "8px",
            fontSize: "14px",
        },
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
        margin: "0 !important",
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
        width: "700px",
        maxWidth: "95%",
        maxHeight: "90vh",
        minHeight: "50vh",
        overflowY: "hidden",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
    },
    modalBody: {
        overflowY: "auto",
        flex: "1 1 auto",
        marginBottom: "15px",
        paddingRight: "5px",
    },
    modalContentMobile: {
        "@media (maxWidth: 768px)": {
            padding: "15px",
            maxWidth: "100%",
            borderRadius: "8px",
        },
    },
    signatureSection: {
        marginTop: "15px",
        marginBottom: "15px",
        border: "1px solid #eee",
        borderRadius: "8px",
        padding: "10px",
        backgroundColor: "#f9f9f9",
    },
    signatureHeader: {
        display: "flex",
        alignItems: "center",
        marginBottom: "10px",
        padding: "5px 0",
        borderBottom: "1px solid #eee",
    },
    signaturePreview: {
        backgroundColor: "#fff",
        border: "1px solid #eee",
        borderRadius: "5px",
        padding: "10px",
        maxHeight: "200px",
        overflowY: "auto",
    },
    signatureTable: {
        width: "100%",
        borderCollapse: "collapse",
    },
    signatureMainContent: {
        width: "70%",
        padding: "10px",
        verticalAlign: "top",
        textAlign: "left",
    },
    signatureLogoContainer: {
        width: "30%",
        padding: "10px",
        verticalAlign: "top",
        textAlign: "center",
    },
    modalActions: {
        marginTop: "15px",
        display: "flex",
        justifyContent: "center",
        gap: "10px",
        flexWrap: "wrap",
        width: "100%",
        flex: "0 0 auto",
        borderTop: "1px solid #eee",
        paddingTop: "15px",
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

export default EditOficio;
