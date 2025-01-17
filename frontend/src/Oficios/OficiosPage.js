import React, { useRef, useState, useEffect } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from '../../images/jpa-construtora.png';


const OficiosPage = () => {
    const [isEditable, setIsEditable] = useState(false);
    const docxContainer = useRef(null);
    const [formData, setFormData] = useState({
        codigo: "OFI/1210214PP",
        assunto: "Relatório Final - Recurso à Instância Superior",
        data: new Date().toISOString().split("T")[0],
        remetente: "Paulo Peixoto, Eng.º",
        email: "",
        texto: `JOAQUIM PEIXOTO AZEVEDO, & FILHOS, LDA, com sede na Rua de Longras, nº 44, 4730-360 Vila Verde, na qualidade de concorrente no procedimento de concurso EMP_DOP 29/24 encetado pelo Município de Fafe, relativo à "Construção do Conjunto Habitacional da Alvorada - Rua José Cardoso Vieira de Castro - Fafe, no âmbito do Investimento RE-C02-i01-1 - '1º Direito' - Programa de Apoio ao acesso à Habitação - Componente 02 'Habitação' do Plano de Recuperação e Resiliência, vem pelo presente, muito respeitosamente,`,
    });
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

            console.log("Dados atualizados:", {
                codigo: codigoMatch?.[1] || formData.codigo,
                data: dataMatch?.[1] || formData.data,
            });
        }

        if (editableAssunto) {
            const assuntoMatch = editableAssunto.textContent.match(/ASSUNTO:\s*(.*?)\s*Exmo/);
            const textoMatch = editableAssunto.textContent.match(/Exmo\. Senhores,\s*(.*)/);
       
            setFormData((prevData) => ({
                ...prevData,
                assunto: assuntoMatch?.[1] || prevData.assunto,
                texto: textoMatch?.[1] || prevData.texto,
            }));

            console.log("Dados atualizados:", {
                assunto: assuntoMatch?.[1] || formData.assunto,
                texto: textoMatch?.[1] || formData.texto,
            });
        }

        if (editableRemetente) {
            const assuntoMatch = editableRemetente.textContent.match(/REMETENTE\s*(\S+)/);

            setFormData((prevData) => ({
                ...prevData,
                remetente: assuntoMatch?.[1] || prevData.remetente,
            }));

            console.log("Dados atualizados:", {
                remetente: assuntoMatch?.[1] || formData.remetente,
            });
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

    const toggleEdit = () => {
        setIsEditable(!isEditable);
        const container = docxContainer.current;
        if (container) {
            container.contentEditable = !isEditable;
        }
    };

    const handleSaveFile = () => {
        const content = docxContainer.current.innerHTML;
        const blob = new Blob([content], { type: "application/msword" });
        saveAs(blob, "oficio_editado.docx");
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

            // Salva o PDF em blob para ser usado na impressão
            const pdfBlob = pdf.output("blob");

            // Cria uma URL do blob
            const pdfUrl = URL.createObjectURL(pdfBlob);

            // Abre o PDF em uma nova aba e chama a impressão
            const printWindow = window.open(pdfUrl);
            printWindow.onload = () => {
                printWindow.focus();
                printWindow.print();
            };
        }
    };


    const handleSubmit = async () => {
        const token = localStorage.getItem("painelAdminToken");
        const urlempresa = localStorage.getItem("urlempresa");


        try {
            const response = await fetch("http://localhost:3001/oficio/Criar", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`, // Certifique-se de que o token é válido
                    "urlempresa": urlempresa, // URL da empresa
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log("Ofício enviado com sucesso:", data);
        } catch (error) {
            console.error("Erro ao enviar o ofício:", error);
        } 
    };









    return (
        <div style={styles.pageContainer}>
            <h1 style={styles.title}>Editor de Oficios</h1>

            <button onClick={toggleEdit} style={styles.button}>
                {isEditable ? "Visualizar" : "Editar"}
            </button>

            <button onClick={handleSavePDF} style={styles.button}>
                Salvar PDF
            </button>

            <button onClick={handleSubmit} style={styles.button}>
                Salvar
            </button>


            <div ref={docxContainer} style={styles.docxContainer}></div>
        </div>
    );
};

const styles = {
    pageContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        backgroundColor: "#d4e4ff",
        width: "100%",
        height: "100vh",
        overflowY: "auto",
    },
    title: {
        textAlign: "center",
        fontSize: "24px",
        marginBottom: "20px",
    },
    button: {
        padding: "10px 20px",
        backgroundColor: "#007BFF",
        color: "white",
        border: "none",
        cursor: "pointer",
        margin: "10px 5px",
        fontSize: "16px",
        borderRadius: "5px",
    },
    docxContainer: {
        marginTop: "20px",
        width: "90%",
        maxWidth: "21cm",
        height: "auto",
        border: "1px solid #ccc",
        backgroundColor: "#fff",
        padding: "20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
};

export default OficiosPage;