/**
 * Serviço para gestão de anexos de faltas/férias
 */

/**
 * Tipos de ficheiros permitidos para upload
 */
const ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
];

/**
 * Tamanho máximo de ficheiro (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Valida um ficheiro antes do upload
 * @param {File} file - Ficheiro para validar
 * @returns {{valid: boolean, error: string|null}}
 */
export const validarFicheiro = (file) => {
    if (!file) {
        return { valid: false, error: 'Nenhum ficheiro selecionado' };
    }

    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: 'Ficheiro demasiado grande. Máximo 10MB.' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: 'Tipo de ficheiro não permitido. Use: JPG, PNG, GIF, PDF, DOC, DOCX ou TXT.'
        };
    }

    return { valid: true, error: null };
};

/**
 * Faz upload de um anexo temporário
 * @param {string} token - Token de autenticação
 * @param {File} file - Ficheiro para upload
 * @returns {Promise<{success: boolean, arquivo_temp?: string, error?: string}>}
 */
export const uploadAnexoTemporario = async (token, file) => {
    const validacao = validarFicheiro(file);
    if (!validacao.valid) {
        return { success: false, error: validacao.error };
    }

    const formData = new FormData();
    formData.append('arquivo', file);

    try {
        const res = await fetch('https://backend.advir.pt/api/anexo-falta/upload-temp', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Não incluir Content-Type - o browser define automaticamente com boundary
            },
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            return { success: true, arquivo_temp: data.arquivo_temp };
        } else {
            const erro = await res.text();
            console.error('Erro do servidor:', erro);
            return { success: false, error: 'Erro ao fazer upload: ' + erro };
        }
    } catch (err) {
        console.error('Erro no upload:', err);
        return { success: false, error: 'Erro ao fazer upload do anexo: ' + err.message };
    }
};

/**
 * Associa anexos temporários a um pedido de falta
 * @param {string} token - Token de autenticação
 * @param {string} empresaId - ID da empresa
 * @param {string} pedidoFaltaId - ID do pedido de falta
 * @param {string[]} anexosTemp - Array com paths dos anexos temporários
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const associarAnexosAPedido = async (token, empresaId, pedidoFaltaId, anexosTemp) => {
    if (!anexosTemp || anexosTemp.length === 0) {
        return { success: true }; // Nada para associar
    }

    try {
        const res = await fetch('https://backend.advir.pt/api/anexo-falta/associar-temp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'urlempresa': empresaId
            },
            body: JSON.stringify({
                pedido_falta_id: pedidoFaltaId.toString(),
                anexos_temp: anexosTemp
            })
        });

        if (!res.ok) {
            const erroTexto = await res.text();
            console.warn('Erro ao associar anexos:', erroTexto);
            return { success: false, error: erroTexto };
        }

        const result = await res.json();
        console.log('Anexos associados com sucesso:', result);
        return { success: true };

    } catch (err) {
        console.error('Erro ao associar anexos:', err);
        return { success: false, error: err.message };
    }
};
