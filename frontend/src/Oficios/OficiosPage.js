import React, { useRef, useState, useEffect } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from '../../images/jpa-construtora.png';
import { FaSave, FaEnvelope, FaFilePdf, FaPaperclip } from "react-icons/fa";

const OficiosPage = () => {
    const [isEditable, setIsEditable] = useState(false);
    const [selectedObra, setSelectedObra] = useState("");
    const [assunto, setAssunto] = useState("");
    const [anexos, setAnexos] = useState([]);
    const docxContainer = useRef(null);
    const [formData, setFormData] = useState({
        codigo: "OFI/1210214AS",
        assunto: "Relatório Final - Recurso à Instância Superior",
        data: new Date().toISOString(),
        remetente: "Paulo Peixoto, Eng.º",
        email: "",
        texto: `JOAQUIM PEIXOTO AZEVEDO, & FILHOS, LDA, com sede na Rua de Longras, nº 44, 4730-360 Vila Verde, na qualidade de concorrente no procedimento de concurso EMP_DOP 29/24 encetado pelo Município de Fafe, relativo à "Construção do Conjunto Habitacional da Alvorada - Rua José Cardoso Vieira de Castro - Fafe, no âmbito do Investimento RE-C02-i01-1 - '1º Direito' - Programa de Apoio ao acesso à Habitação - Componente 02 'Habitação' do Plano de Recuperação e Resiliência, vem pelo presente, muito respeitosamente,`,
    });

    const obras = ["Obra 1", "Obra 2", "Obra 3"]; // Lista de obras para a combobox

    const handleEditableInput = () => {
        const editableCell = document.getElementById("editableCell");
        const editableCodigo = document.getElementById("editableCellCodigo"); 
        const editableAssunto = document.getElementById("editableCellAssunto");
        const editableRemetente = document.getElementById("editableCellRemetente");
        if (editableCodigo) {
            const codigoMatch = editableCodigo.textContent.match(/REF:\s*(\S+)/);
            const dataMatch = editableCodigo.textContent.match(/DATA:\s*(\S+)/);

            setFormData((prevData) => ({
                ...prevData,
                codigo: codigoMatch?.[1] || prevData.codigo,
                data: dataMatch?.[1] || prevData.data,
            }));
        }

        if (editableAssunto) {
            const assuntoMatch = editableAssunto.textContent.match(/ASSUNTO:\s*(.*?)\s*Exmo/);
            const textoMatch = editableAssunto.textContent.match(/Exmo\. Senhores,\s*(.*)/);
       
            setFormData((prevData) => ({
                ...prevData,
                assunto: assuntoMatch?.[1] || prevData.assunto,
                texto: textoMatch?.[1] || prevData.texto,
            }));
        }

        if (editableRemetente) {
            const assuntoMatch = editableRemetente.textContent.match(/REMETENTE\s*(\S+)/);

            setFormData((prevData) => ({
                ...prevData,
                remetente: assuntoMatch?.[1] || prevData.remetente,
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
<td style="padding-left:99px;" contentEditable="true">
                    EXMO(s) SR(s) (Dono de Obra, por defeito como registado no Primavera)<br>
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
<td style="width: 33%;" contentEditable="true" id="editableCellCodigo">
                    REF: ${formData.codigo}<br>
                    DATA: ${formData.data}<br>
                    ANEXOS:
</td>
<td contentEditable="true" id="editableCellAssunto">
                    ASSUNTO: ${formData.assunto}<br><br>
                    Exmo. Senhores,<br><br>
                    ${formData.texto}
</td>
</tr>
<tr>
<td colspan="2" contentEditable="true" id="editableCellRemetente">
                    REMETENTE<br><br>
                    ${formData.remetente}<br>
                    pp@paeconstructora.com
</td>
</tr>
<tr>
<td></td>
<td></td>
</tr>
<tr>
<td></td>
<td contentEditable="true">
                    Sem outro assunto,<br><br>
                    Com os melhores cumprimentos,<br><br>
                    De V/Exas.<br><br>
                    Atentamente
</td>
</tr>
<tr>
<td colspan="2" style="font-weight: bold; text-align: center;"></td>
</tr>
<!-- Continue preenchendo o conteúdo com os campos editáveis desejados -->
</table>
</div>
</body>
</html>
`;

        if (docxContainer.current) {
            docxContainer.current.innerHTML = blankPageContent;
            const editableCellCodigo = document.getElementById("editableCellCodigo");
            const editableCellAssunto = document.getElementById("editableCellAssunto");
            const editableCellRemetente = document.getElementById("editableCellRemetente");
            editableCellCodigo.addEventListener("input", handleEditableInput);
            editableCellAssunto.addEventListener("input", handleEditableInput);
            editableCellRemetente.addEventListener("input", handleEditableInput);
        }
    };

    useEffect(() => {
        generateBlankPageWithTitle();
    }, []);
    /*
    const handleSavePDF = async () => {
        const container = docxContainer.current;
        if (container) {
            const canvas = await html2canvas(container, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("portrait", "mm", "a4");
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save("oficio.pdf");
        }
    };
    */
    const handleSendEmail = () => {
        alert("Função de enviar email ainda não implementada!");
    };

    const handleAddAnexo = (event) => {
        const files = Array.from(event.target.files);
        setAnexos((prevAnexos) => [...prevAnexos, ...files]);
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
            alert("Ofício criado e PDF salvo com sucesso!");
            console.log("Resposta do servidor:", data);

            await handleSavePDF();
        } catch (error) {
            console.error("Erro ao criar o ofício:", error);
            alert("Erro ao criar o ofício. Verifique os logs para mais detalhes.");
        }
    };

    const handleSavePDF = async () => {
        const container = docxContainer.current;

        if (container) {
            // Define uma largura fixa para o container antes de capturar
            const originalWidth = container.style.width;
            container.style.width = "794px"; // Largura aproximada de A4 em pixels

            // Captura o conteúdo com uma escala fixa
            const canvas = await html2canvas(container, {
                scale: 2, // Aumenta a resolução para qualidade
                useCORS: true, // Garante que imagens externas sejam capturadas
            });

            // Restaura o estilo original do container
            container.style.width = originalWidth;

            // Converte o conteúdo capturado para imagem
            const imgData = canvas.toDataURL("image/png");

            // Calcula as dimensões do PDF
            const pdf = new jsPDF("portrait", "mm", "a4");
            const pdfWidth = 210; // Largura A4 em mm
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // Adiciona a imagem ao PDF
            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

            // Nome e localização do ficheiro
            const fileName = `${formData.codigo}.pdf`;

            // Guardar o PDF
            try {
                saveAs(pdf.output("blob"), fileName);
                alert(`Por favor, guarde o ficheiro na pasta 'C:\\Users\\jtalm\\Desktop\\Oficios'`);
            } catch (error) {
                console.error("Erro ao guardar o PDF:", error);
                alert("Erro ao tentar salvar o PDF.");
            }
        }
    };

    return (
        <div style={styles.pageContainer}>
            <header style={styles.header}>
                
                <div style={styles.controlsAlignedLeft}>
                   
                    <label style={styles.fileInputLabel}>
                        <FaPaperclip /> Anexos
                        <input
                            type="file"
                            multiple
                            onChange={handleAddAnexo}
                            style={styles.fileInput}
                        />
                    </label>
                    <button onClick={handleSavePDF} style={styles.button}><FaFilePdf /> PDF</button>
                    <button onClick={handleSendEmail} style={styles.button}><FaEnvelope /> Enviar</button>
                    <button onClick={handleSave} style={styles.button}><FaSave /> Salvar</button>


                    <select
                        value={selectedObra}
                        onChange={(e) => setSelectedObra(e.target.value)}
                        style={styles.select}
                    >
                        <option value="">Selecione a obra</option>
                        {obras.map((obra, index) => (
                            <option key={index} value={obra}>{obra}</option>
                        ))}
                    </select>
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
        backgroundColor: "#0056b3",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
    },
    docxContainer: {
        marginTop: "20px",
        width: "90%",
        maxWidth: "21cm",
        height: "auto",
        border: "1px solid #ccc",
        backgroundColor: "#fff",
        padding: "20px",
    },
};

export default OficiosPage;
