import React, { useRef, useState, useEffect } from "react";
import { saveAs } from "file-saver"; // Para salvar arquivos no navegador
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from '../../images/jpa-construtora.png'; // Importe a imagem

const OficiosPage = () => {
    const [isEditable, setIsEditable] = useState(false); // Estado para alternar edição
    const docxContainer = useRef(null); // Referência para o contêiner do documento

    // Função para gerar uma página em branco com título
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
            width: 21cm;
            min-height: 29.7cm;
            margin: auto;
            padding: 2cm;
            border: 1px solid #ccc;
            background-color: #fff;
            box-sizing: border-box;
            font-size: 8pt;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2cm;
            font-size: 8pt;
        }

        table, th, td {
            border: 0px solid #ccc;
            font-size: 8pt;
        }

        th, td {
            padding: 10px;
            text-align: left;
            vertical-align: top;
            font-size: 8pt;
        }

        .footer {
            font-size: 8pt;
            line-height: 1.6;
        }

        .footer p {
            margin: 0.5em 0;
            font-size: 8pt;
        }
            .logo {
            text-align: left;
        }

        .logo img {
            max-width: 200px;
            height: auto;
        }
    </style>
</head>
<body>
    <div class="page">
        <table>
            <tr>
                 <td class="logo" colspan="2">
                    <img src=${logo} alt="Logo JPA Construtora" 
/>
                </td>
            </tr>
            <tr>
                <td colspan="2"></td>
            </tr>
            <tr>
                <td></td>
                <td style="padding-left:99px;">
                
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
                <td colspan="2" style="font-weight: bold; text-align: center;"></td>
            </tr>
            <tr>
                <td>
                    REF: OFI/1210214PP (numeração sequencial)<br>
                    DATA: 2024/12/12<br>
                    ANEXOS:
                </td>
                <td>
                    ASSUNTO: Relatório Final - Recurso à Instância Superior<br><br>
                    Exmo. Senhores,<br><br>
                    JOAQUIM PEIXOTO AZEVEDO, & FILHOS, LDA, com sede na Rua de Longras, nº 44, 4730-360 Vila Verde, na qualidade de concorrente no procedimento de concurso EMP_DOP 29/24 encetado pelo Município de Fafe, relativo à "Construção do Conjunto Habitacional da Alvorada - Rua José Cardoso Vieira de Castro - Fafe, no âmbito do Investimento RE-C02-i01-1 - '1º Direito' - Programa de Apoio ao acesso à Habitação - Componente 02 'Habitação' do Plano de Recuperação e Resiliência, vem pelo presente, muito respeitosamente,<br><br>
                    XXXX
                </td>
            </tr>
            
            <tr>
                <td>
                    REMETENTE<br><br>
                    Paulo Peixoto, Eng.º (remetente editável)<br>
                    pp@paeconstructora.com (email do remetente)
                </td>
                <td></td>
            </tr>
            <tr>
                <td></td>
                <td></td>
                
            </tr>
            <tr>
                <td></td>
                <td>
                    Sem outro assunto,<br><br>
                    Com os melhores cumprimentos,<br><br>
                    De V/Exas.<br><br>
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
            docxContainer.current.innerHTML = blankPageContent; // Insere o conteúdo da página em branco com título
        }
    };

// Carregar a página em branco com título quando a página for aberta
useEffect(() => {
    generateBlankPageWithTitle();
}, []);

// Alternar entre visualização e edição
const toggleEdit = () => {
    setIsEditable(!isEditable);
    const container = docxContainer.current;
    if (container) {
        container.contentEditable = !isEditable; // Torna o conteúdo editável
    }
};

// Função para salvar o documento editado
const handleSaveFile = () => {
    const content = docxContainer.current.innerHTML;
    const blob = new Blob([content], { type: "application/msword" });
    saveAs(blob, "oficio_editado.docx");
};

// Função para salvar como PDF
const handleSavePDF = async () => {
    const container = docxContainer.current;
    if (container) {
        const canvas = await html2canvas(container, { scale: 2 }); // Captura o conteúdo
        const imgData = canvas.toDataURL("image/png"); // Converte para imagem
        const pdf = new jsPDF("portrait", "mm", "a4");
        const imgWidth = 210; // Largura do PDF em mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        pdf.save("oficio_editado.pdf");
    }
};

return (
    <div style={styles.pageContainer}>
        <h1 style={styles.title}>Editor de Oficios</h1>

        {/* Botão para alternar entre edição e visualização */}
        <button onClick={toggleEdit} style={styles.button}>
            {isEditable ? "Visualizar" : "Editar"}
        </button>

        {/* Botão para salvar o arquivo 
        <button onClick={handleSaveFile} style={styles.button}>
            Salvar DOCX
        </button>
        */}

        {/* Botão para salvar como PDF */}
        <button onClick={handleSavePDF} style={styles.button}>
            Salvar PDF
        </button>

        {/* Contêiner do documento */}
        <div ref={docxContainer} style={styles.docxContainer}></div>
    </div>
);
};

// Estilos
const styles = {
    pageContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        backgroundColor: "#f4f4f4",
        width: "100%",
        height: "100vh", // Altura da página inteira
        overflowY: "auto", // Adiciona a barra de rolagem para a página inteira
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
        width: "24cm", // Largura de uma página A4
        height: "32.7cm", // Altura de uma página A4
        border: "1px solid #ccc",
        backgroundColor: "#fff",
        padding: "20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
};

export default OficiosPage;
