// Funções que geram os templates HTML dos documentos
import logo from "../../images/jpa-construtora.png";
import PMEPreto from "../../images/PMEPRETO.png";
import QualidadePreto from "../../images/QUALIDADEPRETO.png";
import Logo50 from "../../images/Logo50.jpg";
import { secureStorage } from '../utils/secureStorage';
export const getTemplate1 = ({
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
}) => {
    const usernome =
        formData.nome || secureStorage.getItem("userNome") || "Email não disponível";
    const useremail =
        formData.email ||
        secureStorage.getItem("userEmail") ||
        "Email não disponível";
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
      text-align: justify;
      vertical-align: top;
    }
    .footer { font-size: 8pt; line-height: 1.6; }
    .footer p { margin: 0.5em 0; }
    .logo { text-align: left; }
    .logo img { max-width: 30%; height: auto; }
    .PMEPreto img { max-width: 25%; height: auto; }
    @media (max-width: 768px) {
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
  <td>
        <img src="${Logo50}" alt="Logo" style="width: 50%;" />
  </td>
  <td></td>
  </tr>
  <tr>
  <td style="font-weight: bold; text-align: center;">
      <hr style="border: 3px solid black; margin: 0;">
  </td>
  <td style="font-weight: bold; text-align: center;">
      <hr style="border: 3px solid black; margin: 0;">
  </td>
  </tr>
  <tr>
  <td style="width: 28%; font-size: 6pt; font-family: 'TitilliumText22L', sans-serif; color: black; text-align: left; font-weight: bold;" contentEditable="true" id="editableCellCodigo">
    REF: ${formData?.codigo}<br>
    DATA: ${formData.data}<br>
    ANEXOS: </br>${anexostext || ""}<br><br><br><br><br>
    REMETENTE<br><br>
    <span contentEditable="true" >${usernome || "Remetente não disponível"}</span><br>
    <span contentEditable="true" >${useremail || "Email não existe"}</span><br><br><br><br><br>
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
    <div contentEditable="true" id="editableCellAssunto" oninput="window.updateTexto(this.innerText)" style="width: 100%; min-height: 594px; max-height: 600px; max-width: 490px;  font-family: 'TitilliumText22L', sans-serif; color: black; font-size: 13px;">
      <span style="font-weight: bold; font-style: normal; text-decoration: none; text-transform: none; font-size: 10px;">
        ASSUNTO:  ${assuntoDoc}
      </span><br><br>
      <span style="font-weight: normal; font-style: normal; text-decoration: none; text-transform: none; font-size: 9px;">
        EXMO(s) SR(s)
      </span><br><br>
      ${textParts.part1.replace(/\n/g, "<br>")}<br><br>
      <span>Sem outro assunto,</span><br>
      Com os melhores cumprimentos,<br>
      De V/Exas.<br>
      Atentamente<br>
      <span contentEditable="true">${usernome}</span>
    </div>
  </td>
  </tr>
  <tr>
  <td></td>
  <td style="font-weight: normal; font-style: normal; text-decoration: none; text-transform: none; font-size: 13px; color: black;" contentEditable="true"></td>
  </tr>
  <tr>
  <td class="PMEPreto">
  <img src="${PMEPreto}" alt="Logo" />
  <img src="${QualidadePreto}" alt="Logo" />
  </td>
  <td style="font-size: 8px;">
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

export const getTemplate1SecondPage = ({
    textParts,
    calculateTextHeight,
    createPage,
    donoObra,
}) => {
    if (!textParts.part2) return "";
    let pages = [];
    let remainingText = textParts.part2;
    let isFirstPage = true;

    while (remainingText.length > 0) {
        const pageContent = remainingText.substring(0, 1800);
        remainingText = remainingText.substring(1800);
        pages.push(createPage(pageContent, { donoObra, isFirstPage }));
        isFirstPage = false;
    }
    return pages
        .map((page, index) => {
            return `
              <div style="
                      width: 793.7px;
                      height: 1122.5px;
                      border: 0px solid rgb(204, 204, 204);
                      background-color: rgb(255, 255, 255);
                      padding: 20px;
                      border-radius: 8px;
                      box-shadow: rgba(0, 0, 0, 0.1) 0px 2px 4px;
                  ">
                  ${page}
              </div>
          `;
        })
        .join("");
};

export const getTemplate2 = ({
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
    PMEPreto,
    QualidadePreto,
    Logo50,
}) => {
    const usernome =
        formData.nome || secureStorage.getItem("userNome") || "Email não disponível";
    const useremail =
        formData.email ||
        secureStorage.getItem("userEmail") ||
        "Email não disponível";
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
      text-align: justify;
      vertical-align: top;
    }
    .footer { font-size: 8pt; line-height: 1.6; }
    .footer p { margin: 0.5em 0; }
    .logo { text-align: left; visibility: hidden; }
    .logo img { max-width: 30%; height: auto; visibility: hidden; }
    .PMEPreto img { max-width: 25%; height: auto; visibility: hidden; }
    @media (max-width: 768px) {
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
  <td>
        <img src="${Logo50}" alt="Logo" style="width: 50%; visibility: hidden;" />
  </td>
  <td></td>
  </tr>
  <tr>
  <td style="font-weight: bold; text-align: center; visibility: hidden;">
      <hr style="border: 3px solid black; margin: 0; visibility: hidden;">
  </td>
  <td style="font-weight: bold; text-align: center; visibility: hidden;">
      <hr style="border: 3px solid black; margin: 0; visibility: hidden;">
  </td>
  </tr>
  <tr>
  <td style="width: 28%; font-size: 6pt; font-family: 'TitilliumText22L', sans-serif; color: black; text-align: left; font-weight: bold;" contentEditable="true" id="editableCellCodigo">
    REF: ${formData?.codigo}<br>
    DATA: ${formData.data}<br>
    ANEXOS: </br>${anexostext || ""}<br><br><br><br><br>
    REMETENTE<br><br>
    <span contentEditable="true" >${usernome || "Remetente não disponível"}</span><br>
    <span contentEditable="true" >${useremail || "Email não existe"}</span><br><br><br><br><br>
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
    <div contentEditable="true" id="editableCellAssunto" oninput="window.updateTexto(this.innerText)" style="width: 100%; min-height: 594px; max-height: 600px; max-width: 490px; overflow: auto;">
      <span style="font-weight: bold; font-style: normal; text-decoration: none; text-transform: none; font-size: 10px;">
        ASSUNTO:  ${assuntoDoc}
      </span><br><br>
      <span style="font-weight: normal; font-style: normal; text-decoration: none; text-transform: none; font-size: 9px;">
        EXMO(s) SR(s)
      </span><br><br>
      ${textParts.part1.replace(/\n/g, "<br>").replace(/ /g, "&nbsp;")}<br><br>
      <span>Sem outro assunto,</span><br>
      Com os melhores cumprimentos,<br>
      De V/Exas.<br>
      Atentamente<br>
      <span contentEditable="true">${usernome}</span>
    </div>
  </td>
  </tr>
  <tr>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="PMEPreto">
  <img src="${PMEPreto}" alt="Logo" style="visibility: hidden;"/>
  <img src="${QualidadePreto}" alt="Logo" style="visibility: hidden;"/>
  </td>
  <td style="visibility: hidden; font-size: 8px;">
          <br>_____________________________________________________________________________________________________________________<br>
          Joaquim Peixoto Azevedo & Filhos, Lda * Alvará n.º 44085 . NIF / Nºmatrícula reg.c.r.c.:502244585 . Capital social: 750000.00 €
  </td>
  </tr>
  </table>
  </div>
  </body>
  </html>
  `;
};

export const getTemplate2SecondPage = ({
    textParts,
    calculateTextHeight,
    createPage2,
    donoObra,
}) => {
    if (!textParts.part2) return "";
    let pages = [];
    let remainingText = textParts.part2;
    let isFirstPage = true;

    while (remainingText.length > 0) {
        const pageContent = remainingText.substring(0, 1800);
        remainingText = remainingText.substring(1800);
        pages.push(createPage2(pageContent, { donoObra, isFirstPage }));
        isFirstPage = false;
    }
    return pages
        .map((page, index) => {
            return `
              <div style="
                      width: 793.7px;
                      height: 1122.5px;
                      border: 0px solid rgb(204, 204, 204);
                      background-color: rgb(255, 255, 255);
                      padding: 20px;
                      border-radius: 8px;
                      box-shadow: rgba(0, 0, 0, 0.1) 0px 2px 4px;
                  ">
                  ${page}
              </div>
          `;
        })
        .join("");
};

export const createPage = (content, { donoObra, isFirstPage = true } = {}) => {
    donoObra = donoObra || {};
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
          font-size: 10pt;
        }
        .page {
          max-width: 100%;
          margin: auto;
          padding: 2rem;
          border: 0px solid #ccc;
          background-color: #fff;
          box-sizing: border-box;
          font-size: 10pt;
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
          <td style="padding-left:243px; font-weight: bold; text-align: justify; font-family: 'TitilliumText22L', sans-serif; color: black; font-size: 13px;" contentEditable="true" colspan="2">
                       ${isFirstPage ? `EXMO(s) SR(s) ${donoObra?.Nome || ""}<br>` : ""
        }
          </td>
          </tr>
          <tr>
            <td colspan="2">
    <div contentEditable="true" id="editableCellAssunto" oninput="window.updateTexto(this.innerText)" style="width: 100%; min-height: 764px; max-height: 600px; overflow: auto;">
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
  <td style=" font-size: 8px;">
          <br>_____________________________________________________________________________________________________________________<br>
          Joaquim Peixoto Azevedo & Filhos, Lda * Alvará n.º 44085 . NIF / Nºmatrícula reg.c.r.c.:502244585 . Capital social: 750000.00 €
  </td>
  </tr>
        </table>
      </div>
      </body>
      </html>
      `;
};
export const createPage2 = (content, { donoObra, isFirstPage = true } = {}) => {
    donoObra = donoObra || {};
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
          font-size: 10pt;
        }
        .page {
          max-width: 100%;
          margin: auto;
          padding: 2rem;
          border: 0px solid #ccc;
          background-color: #fff;
          box-sizing: border-box;
          font-size: 10pt;
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
          <tr>      
            <td style="padding-left:243px; font-weight: bold; text-align: justify; font-family: 'TitilliumText22L', sans-serif; color: black; font-size: 13px;" contentEditable="true" colspan="2">
                ${isFirstPage ? `EXMO(s) SR(s) ${donoObra?.Nome || ""}<br>` : ""
        }
            </td>
          </tr>

          <tr>
            <td colspan="2">
    <div contentEditable="true" id="editableCellAssunto" oninput="window.updateTexto(this.innerText)" style="width: 100%; min-height: 764px; max-height: 600px; overflow: auto;">
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
  <td style="visibility: hidden; font-size: 8px;">
          <br>_____________________________________________________________________________________________________________________<br>
          Joaquim Peixoto Azevedo & Filhos, Lda * Alvará n.º 44085 . NIF / Nºmatrícula reg.c.r.c.:502244585 . Capital social: 750000.00 €
  </td>
  </tr>
        </table>
      </div>
      </body>
      </html>
      `;
};
