/**
 * Utilitário para exportação de dados para Excel (XLSX)
 */
import * as XLSX from 'xlsx-js-style';

/**
 * Cria e faz download de um ficheiro Excel
 * @param {Object} config - Configuração da exportação
 * @param {string} config.fileName - Nome do ficheiro (sem extensão)
 * @param {string} config.sheetName - Nome da sheet
 * @param {Array} config.data - Dados a exportar (array de arrays)
 * @param {Array} config.headers - Cabeçalhos das colunas
 * @param {Array} config.columnWidths - Larguras das colunas (opcional)
 * @param {string} config.title - Título do documento (opcional)
 * @param {string} config.subtitle - Subtítulo/período (opcional)
 */
export const exportToExcel = ({
    fileName,
    sheetName,
    data,
    headers,
    columnWidths = [],
    title = '',
    subtitle = ''
}) => {
    if (!data || data.length === 0) {
        alert('Não há dados para exportar');
        return;
    }

    const workbook = XLSX.utils.book_new();
    const exportData = [];

    // Adicionar título se fornecido
    if (title) {
        const titleRow = [title];
        if (subtitle) {
            // Preencher células vazias até à última coluna e adicionar subtítulo
            for (let i = 1; i < headers.length - 1; i++) {
                titleRow.push('');
            }
            titleRow.push(subtitle);
        }
        exportData.push(titleRow);
        exportData.push([]); // Linha vazia
    }

    // Adicionar cabeçalhos
    exportData.push(headers);

    // Adicionar dados
    data.forEach(row => {
        exportData.push(row);
    });

    // Criar worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(exportData);

    // Aplicar larguras de colunas se fornecidas
    if (columnWidths.length > 0) {
        worksheet['!cols'] = columnWidths.map(width => ({ wch: width }));
    }

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Gerar nome do ficheiro com data atual
    const timestamp = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileName}_${timestamp}.xlsx`;

    // Download
    XLSX.writeFile(workbook, fullFileName);
};

/**
 * Cria um workbook Excel vazio para exportações customizadas
 */
export const createWorkbook = () => {
    return XLSX.utils.book_new();
};

/**
 * Adiciona uma sheet a um workbook existente
 */
export const addSheet = (workbook, sheetName, data, columnWidths = []) => {
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    if (columnWidths.length > 0) {
        worksheet['!cols'] = columnWidths.map(width => ({ wch: width }));
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
};

/**
 * Faz download de um workbook
 */
export const downloadWorkbook = (workbook, fileName) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileName}_${timestamp}.xlsx`;
    XLSX.writeFile(workbook, fullFileName);
};

/**
 * Formata dados tabulares para export
 * Converte um array de objetos em array de arrays
 */
export const formatDataForExport = (data, keys) => {
    return data.map(item => keys.map(key => item[key] ?? ''));
};
