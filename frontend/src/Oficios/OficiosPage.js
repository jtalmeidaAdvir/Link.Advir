import React, { useRef, useState, useEffect } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from '../../images/jpa-construtora.png';
import { FaSave, FaEnvelope, FaFilePdf, FaPaperclip } from "react-icons/fa";
import { useFocusEffect } from '@react-navigation/native';

const OficiosPage = () => {
    const [donoObra, setDonoObra] = useState(null);
    const [isEditable, setIsEditable] = useState(false);
    const [selectedObra, setSelectedObra] = useState("");
    const [assunto, setAssunto] = useState("");
    const [anexos, setAnexos] = useState([]);
    const docxContainer = useRef(null);
    const docxContainer2 = useRef(null);
    const [showSecondDocument, setShowSecondDocument] = useState(false); // State to control visibility
    const [isSecondDocumentAdded, setIsSecondDocumentAdded] = useState(false);
    const [formData, setFormData] = useState({
        codigo: "",
        assunto: "Relatório Final - Recurso à Instância Superior",
        data: new Date().toISOString(),
        remetente: "Paulo Peixoto, Eng.º",
        email: "",
        texto: `JOAQUIM PEIXOTO AZEVEDO, & FILHOS, LDA, com sede na Rua de Longras, nº 44, 4730-360 Vila Verde, na qualidade de concorrente no procedimento de concurso EMP_DOP 29/24 encetado pelo Município de Fafe, relativo à "Construção do Conjunto Habitacional da Alvorada - Rua José Cardoso Vieira de Castro - Fafe, no âmbito do Investimento RE-C02-i01-1 - '1º Direito' - Programa de Apoio ao acesso à Habitação - Componente 02 'Habitação' do Plano de Recuperação e Resiliência, vem pelo presente, muito respeitosamente,`,
        donoObra: "",
    });
    const [pageCount, setPageCount] = useState(1);
    const [obras, setObras] = useState([]);

    const [inputValue, setInputValue] = useState("");
    const [showOptions, setShowOptions] = useState(false);
    const comboBoxRef = useRef(null);



    useEffect(() => {
        // Função assíncrona para buscar obras
        const fetchObras = async () => {
            const token = localStorage.getItem("painelAdminToken"); // Obtenha o token
            const urlempresa = localStorage.getItem("urlempresa"); // Obtenha a URL da empresa

            if (!urlempresa) return; // Se não encontrar URL, não faz a requisição

            try {
                const response = await fetch("http://localhost:3001/oficio/ListarObras", {
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
                console.log(data); // Verifique a estrutura da resposta

                // Verifique se a estrutura de dados é válida
                if (data && data.DataSet && Array.isArray(data.DataSet.Table)) {
                    setObras(data.DataSet.Table); // Atualize o estado com as obras
                }
            } catch (error) {
                console.error("Erro ao carregar obras:", error);
            }
        };

        fetchObras(); // Chama a função para buscar as obras
        setDonoObra("");
    }, []);
    useEffect(() => {
        generateBlankPageWithTitle();
    }, []);
    useEffect(() => {
        generateBlankPageWithTitle(); // Chama a função sempre que donoObra mudar
    }, [donoObra]);
    const handleEditableInput = () => {
        const editableAssunto = document.getElementById("editableCellAssunto");
        if (editableAssunto) {
            const assuntoMatch = editableAssunto.textContent.match(/ASSUNTO:\s*(.*?)\s*Exmo/);
            const textoMatch = editableAssunto.textContent.match(/Exmo\. Senhores,\s*(.*)/);
       
            setFormData((prevData) => ({
                ...prevData,
                assunto: assuntoMatch?.[1] || prevData.assunto,
                texto: textoMatch?.[1] || prevData.texto,
            }));
        }

    };

    const generateBlankPageWithTitle = () => {
        const blankPageContent = `
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Modelo de Documento</title>
<style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            color: #333;
            font-size: 8pt;
        }
        .page {
            max-width: 100%;
            margin: auto;
            padding: 2rem;
            border: 0px solid #ccc;
            background-color: #fff;
            box-sizing: border-box;
            font-size: 8pt;
            height: 1122.5px;
        }
         td {
          word-wrap: break-word;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2rem;
            font-size: 8pt;
        }
        table, th, td {
            border: 0px solid #ccc;
        }
        th, td {
            padding: 0.5rem;
            text-align: left;
            vertical-align: top;
        }
        .footer {
            font-size: 8pt;
            line-height: 1.6;
        }
        .footer p {
            margin: 0.5em 0;
        }
        .logo {
            text-align: left;
        }
        .logo img {
            max-width: 30%;
            height: auto;
        }
        @media (max-width: 768px) {
            .page {
                padding: 1rem;
            }
            th, td {
                font-size: 6pt;
                padding: 0.3rem;
            }
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
                    EXMO(s) SR(s) ${formData.donoObra || 'Nome do Dono da Obra'}<br>
                    Presidente do Município de Fafe<br>
                    Avenida 5 de Outubro<br>
                    4824 501 Fafe
</td>
</tr>
<tr>
<td colspan="2" style="font-weight: bold; text-align: center;"></td>
</tr>
<tr>
<td colspan="2" style="font-weight: bold; text-align: center;"></td>
</tr>
<tr>
<td style="width: 28%;" contentEditable="false" id="editableCellCodigo">
    REF: ${formData.codigo}<br>
    DATA: ${formData.data}<br>
    ANEXOS: ${anexos ? anexos : 'Nenhum anexo'}<br><br><br><br><br>
    REMETENTE<br><br>
    ${formData.remetente ? formData.remetente : 'Remetente não disponível'}<br>
    ${formData.email || 'Email não existe'}
</td>
<td contentEditable="true" id="editableCellAssunto">
                    ASSUNTO: ${formData.assunto}<br><br>
                    Exmo. Senhores,<br><br>
                    ${formData.texto}
</td>
</tr>
<tr>
<td colspan="2" contentEditable="false" id="editableCellRemetente">

                    
</td>
</tr>
<tr>
<td></td>
<td></td>
</tr>
<tr>
<td></td>
<td contentEditable="true">
                    Sem outro assunto,<br>
                    Com os melhores cumprimentos,<br>
                    De V/Exas.<br>
                    Atentamente
</td>
</tr>
<tr>
<td colspan="2" style="font-weight: bold; text-align: center;"></td>
</tr>
<tr>
<td colspan="2" style="font-weight: bold; text-align: center;"></td>
</tr>
<tr>
<td colspan="2" style="font-weight: bold; text-align: center;"></td>
</tr>
<tr>
<td colspan="2" style="font-weight: bold; text-align: center;"></td>
</tr>
<tr>
<td colspan="2" style="font-weight: bold; text-align: center;"></td>
</tr>
</table>
</div>
</body>
</html>
`;
        if (docxContainer.current) {
            docxContainer.current.innerHTML = blankPageContent;
            const editableCellAssunto = document.getElementById("editableCellAssunto");
            const editableCellRemetente = document.getElementById("editableCellRemetente");
            editableCellAssunto.addEventListener("input", handleEditableInput);
            editableCellRemetente.addEventListener("input", handleEditableInput);
        }
    };

    const handleSavePDF = async () => {
        const container1 = docxContainer.current;
        const container2 = docxContainer2.current;

        if (container1) {
            try {
                const pdf = new jsPDF("portrait", "mm", "a4");

                // Captura o primeiro documento
                const canvas1 = await html2canvas(container1, {
                    scale: 3,
                    useCORS: true,
                    logging: true,
                });
                const imgData1 = canvas1.toDataURL("image/png");
                const pdfWidth = 210; // Largura do PDF em mm
                const pdfHeight = (canvas1.height * pdfWidth) / canvas1.width;

                // Adiciona o primeiro documento à primeira página do PDF
                pdf.addImage(imgData1, "PNG", 0, 0, pdfWidth, pdfHeight);

                // Verifica se existe o segundo documento
                if (container2) {
                    const canvas2 = await html2canvas(container2, {
                        scale: 3,
                        useCORS: true,
                        logging: true,
                    });
                    const imgData2 = canvas2.toDataURL("image/png");

                    // Adiciona uma nova página para o segundo documento
                    pdf.addPage();

                    // Adiciona o segundo documento à segunda página
                    pdf.addImage(imgData2, "PNG", 0, 0, pdfWidth, pdfHeight);
                }

                // Salva o PDF com o nome especificado
                pdf.save("oficio.pdf");

                alert("PDF gerado e salvo com sucesso!");
            } catch (error) {
                console.error("Erro ao gerar o PDF:", error);
                alert("Erro ao gerar o PDF. Verifique o console para mais detalhes.");
            }
        } else {
            alert("Erro: não foi possível encontrar o conteúdo para gerar o PDF.");
        }
    };

    const handleSavePDFAndSendToBackend = async () => {
        const container = docxContainer.current; // Referência do container do documento
        if (container) {
            try {
                const canvas = await html2canvas(container, { scale: 3, useCORS: true });
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jsPDF("portrait", "mm", "a4");
                const pdfWidth = 210; // Largura do PDF em mm
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                const pdfBlob = pdf.output("blob");

                // Cria um novo FormData
                const formData2 = new FormData();
                formData2.append("file", pdfBlob, "oficio.pdf");  // O arquivo PDF
                formData2.append("codigo", formData.codigo);  // O código do ofício

                // Inclui os anexos no FormData
                anexos.forEach((anexo, index) => {
                    formData2.append("anexos", anexo, anexo.name);  // Adiciona cada anexo
                });

                const token = localStorage.getItem("painelAdminToken");
                const urlempresa = localStorage.getItem("urlempresa");

                // Envia o PDF e os anexos para o backend
                const response = await fetch("http://localhost:3001/oficio/save-pdf", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "urlempresa": urlempresa,
                    },
                    body: formData2,  // O corpo da requisição inclui o FormData
                });

                if (response.ok) {
                    alert("PDF e anexos enviados e salvos com sucesso!");
                } else {
                    alert("Erro ao salvar o PDF e anexos no backend.");
                }
            } catch (error) {
                console.error("Erro ao gerar ou enviar o PDF:", error);
            }
        }
    };

    const handleRemoveAnexo = (index) => {
        setAnexos((prevAnexos) => {
            const updatedAnexos = prevAnexos.filter((_, i) => i !== index);

            // Atualiza a célula de anexos no documento
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

    const handleSendEmailWithOfficeAPI = async () => {
        const container = docxContainer.current; // Referência do container do documento
        if (!container) {
            alert("Erro: não foi possível encontrar o conteúdo para gerar o PDF.");
            return;
        }

        try {
            // Gerar o PDF
            const canvas = await html2canvas(container, { scale: 3, useCORS: true });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("portrait", "mm", "a4");
            const pdfWidth = 210; // Largura do PDF em mm
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            const pdfBlob = pdf.output("blob");

            // Converter o PDF para Base64
            const pdfBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(",")[1]); // Remove o prefixo Base64
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(pdfBlob);
            });

            // Converter anexos adicionais para Base64
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

            // Adicionar o PDF gerado à lista de anexos
            processedAnexos.push({
                name: "oficio.pdf",
                content: pdfBase64,
            });

            // Preparar o payload do e-mail
            const payload = {
                emailDestinatario: "jtalmeida@advir.pt",
                assunto: formData.assunto,
                texto: formData.texto,
                remetente: formData.remetente,
                anexos: processedAnexos, // Lista completa de anexos
            };

            console.log("Payload para envio:", payload);

            // Enviar o e-mail com o PDF e anexos adicionais
            const response = await fetch("http://localhost:3001/sendmailoficios", {
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
        }
    };

    const handleAddAnexo = (event) => {
        const files = Array.from(event.target.files); // Obtém todos os ficheiros selecionados
        setAnexos((prevAnexos) => {
            const updatedAnexos = [...prevAnexos, ...files]; // Adiciona os novos ficheiros aos existentes

            // Atualiza a célula de anexos no documento
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
                
    const toggleEdit = () => {
        setIsEditable(!isEditable);
    };

    const handleSave = async () => {
        const token = localStorage.getItem("painelAdminToken"); // Obtém o token do localStorage
        const urlempresa = localStorage.getItem("urlempresa"); // Obtém o URL da empresa do localStorage

        try {
            // Envia os dados para a API backend
            const response = await fetch("http://localhost:3001/oficio/Criar", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`, // Inclui o token no cabeçalho
                    "urlempresa": urlempresa, // Inclui o URL da empresa no cabeçalho
                    "Content-Type": "application/json", // Define o tipo de conteúdo como JSON
                },
                body: JSON.stringify(formData), // Envia os dados do formulário no corpo da requisição
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro HTTP: ${response.status} - ${errorData.error}`);
            }

            const data = await response.json();
            await handleSavePDFAndSendToBackend();
            alert("Ofício criado e PDF salvo com sucesso!");
            console.log("Resposta do servidor:", data);
        } catch (error) {
            console.error("Erro ao criar o ofício:", error);
            alert("Erro ao criar o ofício. Verifique os logs para mais detalhes.");
        }
    };

    const handleObraChange = (e) => {

        console.log(e);

        //setSelectedObra(e.target.value);
        const selectedObra = e;
        //setSelectedObra(selectedObra.Codigo);
        console.log(selectedObra.EntidadeIDA); 

        var entidadeid = selectedObra.EntidadeIDA;
        var id = selectedObra.ID;

        const fetchObras = async () => {
            const token = localStorage.getItem("painelAdminToken"); // Obtenha o token
            const urlempresa = localStorage.getItem("urlempresa"); // Obtenha a URL da empresa
        
            if (!urlempresa || !entidadeid) {
                return; // Se não encontrar URL ou entidadeID, não faz a requisição
            }

            try {
                const response = await fetch(`http://localhost:3001/oficio/GetEntidade/${entidadeid}`, {
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
                console.log(data); // Verifique a estrutura da resposta
                if (data && data.DataSet && data.DataSet.Table && data.DataSet.Table.length > 0) {
                    const donoObra = data.DataSet.Table[0].Nome; // Pegue o nome da obra
                    console.log("Nome do dono da obra:", donoObra);

                    // Atualize o estado com o nome do dono da obra
                    setDonoObra(donoObra);

                    setFormData((prevFormData) => {
                        return {
                            ...prevFormData,
                            donoObra: donoObra,  // Update donoObra
                        };
                    });


                } else {
                    console.log("Nenhuma obra encontrada.");
                }
            } catch (error) {
                console.error('Erro ao buscar obras:', error);
            }



            try {
                const response = await fetch(`http://localhost:3001/oficio/GetEmail/${id}`, {
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
                console.log(data); // Verifique a estrutura da resposta
                if (data && data.DataSet && data.DataSet.Table && data.DataSet.Table.length > 0) {
                    const email = data.DataSet.Table[0].Email; // Pegue o nome da obra
                    console.log("Nome do dono da obra:", email);

                    setFormData((prevFormData) => {
                        return {
                            ...prevFormData,
                            email: email,
                        };
                    });


                } else {
                    console.log("Nenhuma obra encontrada.");
                }
            } catch (error) {
                console.error('Erro ao buscar obras:', error);
            }

        };

        // Chama a função de fetch após obter o `entidadeid`
        fetchObras();


    };

    const generateCodigo = () => {
        const currentYear = new Date().getFullYear(); // Pega o ano atual
        const currentMonth = new Date().getMonth() + 1; // Pega o mês atual (janeiro é 0, então somamos 1)
        const sequencial = 1; // Defina um número sequencial, podendo ser incrementado conforme os ofícios

        // Formata o mês e o sequencial para 2 e 3 dígitos, respectivamente
        const formattedMonth = currentMonth.toString().padStart(2, '0'); // Ex: 01
        const formattedSequencial = sequencial.toString().padStart(3, '0'); // Ex: 001

        var updatedCodigo = `OFI${currentYear}${formattedMonth}${formattedSequencial}`;
        const editableCellCodigo = document.getElementById("editableCellCodigo");
        if (editableCellCodigo) {
            editableCellCodigo.innerHTML = `REF: ${updatedCodigo}<br>DATA: ${formData.data}<br>ANEXOS: ${anexos}`;
        }

        return updatedCodigo;
    };

    useEffect(() => {
        setFormData((prevData) => ({
            ...prevData,
            codigo: generateCodigo(), // Atualiza o código com o formato desejado
        }));

    }, []); 

    const addSecondDocument = () => {
        if (!isSecondDocumentAdded) {
            setShowSecondDocument(true);
            setIsSecondDocumentAdded(true);
            // Add the content of the second document when the button is clicked for the first time
            const secondDocumentContent = `
            <!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Modelo de Documento</title>
<style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            color: #333;
            font-size: 8pt;
            
        }
        .page {
            max-width: 100%;
            margin: auto;
            padding: 2rem;
            border: 0px solid #ccc;
            background-color: #fff;
            box-sizing: border-box;
            font-size: 8pt;
            height: 1122.5px;
        }

        .logo {
            text-align: left;
        }
        .logo img {
            max-width: 30%;
            height: auto;
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
</div>
</body>
</html>
      `;

            // Set the content of the second document
            if (docxContainer2.current) {
                docxContainer2.current.innerHTML = secondDocumentContent;
            }

            // Now, make the second document container visible and update the state
 // Mark the second document as added
        } else {
            alert("Segunda página já foi adicionada.");
        }
    };

    const handleOptionClick = (obra) => {
        setInputValue(obra.Codigo); // Atualiza o texto no input com o valor selecionado
        setSelectedObra(obra); // Salva a obra selecionada
        setShowOptions(false); // Esconde a lista de opções

        handleObraChange(obra);
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        setShowOptions(true); // Mostrar as opções sempre que o usuário digitar
    };

    const filteredObras = obras.filter((obra) =>
        obra.Codigo.toLowerCase().includes(inputValue.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (comboBoxRef.current && !comboBoxRef.current.contains(event.target)) {
                setShowOptions(false); // Fecha a lista
            }
        };

        // Adiciona o listener no evento de clique
        document.addEventListener("mousedown", handleClickOutside);

        // Limpeza do listener ao desmontar o componente
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div style={styles.pageContainer}>
            <header style={styles.header}>


                <div style={styles.controlsAlignedLeft}>
                    {/* Botão para adicionar uma nova página */}
                    <button onClick={addSecondDocument} style={styles.button}>
                        Adicionar Segunda Página
                    </button>
                    <label style={styles.fileInputLabel}>
                        <FaPaperclip /> Anexos
                        <input
                            type="file"
                            multiple
                            onChange={handleAddAnexo}
                            style={styles.fileInput}
                        />
                    </label>
                    {/* Exibe a lista de anexos com botão de remoção */}
                    {anexos.length > 0 && (
                        <div style={styles.anexosList}>
                            <h4 style={styles.h4}>Anexos:</h4>
                            <ul style={styles.ul}>  {/* Adicionamos o estilo de lista */}
                                {anexos.map((anexo, index) => (
                                    <li key={index} style={styles.li}> {/* Adicionamos o estilo para os itens da lista */}
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
                    <button onClick={handleSavePDF} style={styles.button}><FaFilePdf /> PDF</button>
                    <button onClick={handleSendEmailWithOfficeAPI} style={styles.button}><FaEnvelope /> Enviar</button>
                    <button onClick={handleSave} style={styles.button}><FaSave /> Salvar</button>


                    {/* Combobox Editável */}
                    <div style={{ position: "relative", width: "300px" }} ref={comboBoxRef}>
                        {/* Input editável */}
                        <input
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            placeholder="Selecione ou escreva a obra"
                            style={{
                                width: "100%",
                                padding: "8px",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                            }}
                            onFocus={() => setShowOptions(true)} // Mostra as opções ao focar
                        />

                        {/* Lista suspensa */}
                        {showOptions && filteredObras.length > 0 && (
                            <ul
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    margin: 0,
                                    padding: "8px",
                                    listStyle: "none",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px",
                                    background: "white",
                                    maxHeight: "150px",
                                    overflowY: "auto",
                                    zIndex: 10,
                                }}
                            >
                                {filteredObras.map((obra, index) => (
                                    <li
                                        key={index}
                                        onClick={() => handleOptionClick(obra)}
                                        style={{
                                            padding: "8px",
                                            cursor: "pointer",
                                            color: "black",
                                            background: selectedObra?.Codigo === obra.Codigo ? "#f0f0f0" : "white",
                                        }}
                                    >
                                        {obra.Codigo}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <input
                        type="text"
                        placeholder="Assunto"
                        value={assunto}
                        onChange={(e) => setAssunto(e.target.value)}
                        style={styles.input}
                    />
                </div>

                
            </header>
            

            <div ref={docxContainer} style={styles.docxContainer}></div>
            <div ref={docxContainer2} style={styles.docxContainer}></div>
            {/* Second document container, shown only when showSecondDocument is true */}
         
                
        </div>
    );
};

const styles = {
    pageContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100vh",
        backgroundColor: "#d4e4ff",
        overflowY: "auto",
    },
    header: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        width: "100%",
        padding: "10px 20px",
        backgroundColor: "#d4e4ff",
        color: "#fff",
    },
    logoContainer: {
        marginBottom: "10px",
    },
    logo: {
        height: "50px",
    },
    controlsAlignedLeft: {
        display: "flex",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "10px",
    },
    select: {
        padding: "10px",
        fontSize: "14px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        width: "300px",
    },
    input: {
        padding: "10px",
        fontSize: "14px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        width: "700px",
    },
    fileInputLabel: {
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "10px 15px",
        fontSize: "14px",
        color: "#fff",
        backgroundColor: "#0056b3",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
    },
    fileInput: {
        display: "none",
    },
    button: {
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "10px 15px",
        fontSize: "14px",
        color: "#fff",
        backgroundColor: "#1792FE",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
    },
    docxContainer: {
        marginTop: "20px",
        width: "793.7px", // Largura equivalente a 210mm
        height: "1145.5px", // Altura equivalente a 297mm
        border: "1px solid #ccc",
        backgroundColor: "#fff",
        padding: "20px",
        boxSizing: "border-box", // Inclui padding no cálculo das dimensões
    },
    removeButton: {
        backgroundColor: "red",
        color: "white",
        border: "none",
        padding: "5px 10px",
        marginLeft: "10px",
        cursor: "pointer",
        borderRadius: "5px",
    },
    anexosList: {
        marginTop: "10px",
        padding: "10px",
        backgroundColor: "#f9f9f9",
        border: "1px solid #ccc",
        borderRadius: "5px",
        width: "100%",
    },
    h4: {
        color: "black",  // Cor do título "Anexos"
    },
    ul: {
        listStyleType: "none",  // Remove os marcadores de lista
        paddingLeft: "0",  // Remove o preenchimento à esquerda
        color: "black",  // Garante que a cor dos itens da lista seja preta
    },
    li: {
        color: "black",  // Define a cor preta para os itens de anexo
        fontSize: "14px",  // Ajuste o tamanho da fonte, se necessário
    },
};

export default OficiosPage;
