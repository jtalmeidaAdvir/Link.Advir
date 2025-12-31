/**
 * Utilitários para formatação de datas e timestamps
 */

/**
 * Formata ano, mês e dia em formato ISO (YYYY-MM-DD)
 */
export const formatDate = (year, month, day) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Retorna a data de hoje em formato ISO
 */
export const getTodayISO = () => {
    return new Date().toISOString().split('T')[0];
};

/**
 * Converte objeto Date em formato ISO (YYYY-MM-DD)
 */
export const getISODate = (date) => {
    return new Date(date).toISOString().split('T')[0];
};

/**
 * Cria timestamp UTC a partir de strings de data e hora
 * @param {string} dataStr - Data no formato YYYY-MM-DD
 * @param {string} horaStr - Hora no formato HH:MM
 * @returns {string} Timestamp ISO UTC
 */
export const createTimestamp = (dataStr, horaStr = '00:00') => {
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const [hora, minuto] = horaStr.split(':').map(Number);
    const d = new Date(ano, mes - 1, dia, hora, minuto, 0);
    return d.toISOString();
};

/**
 * Cria timestamp UTC a partir de componentes separados
 * @param {number} ano
 * @param {number} mes - 1-12
 * @param {number} dia
 * @param {string} horaStr - Hora no formato HH:MM
 * @returns {string} Timestamp ISO UTC
 */
export const createTimestampFromParts = (ano, mes, dia, horaStr = '00:00') => {
    const dataStr = formatDate(ano, mes, dia);
    return createTimestamp(dataStr, horaStr);
};

/**
 * Formata horas em formato de exibição
 * @param {number} horas - Número de horas (pode ser decimal)
 * @returns {string} Horas formatadas (ex: "8h00" ou "8h30")
 */
export const formatarHorasParaExibicao = (horas) => {
    if (!horas || horas === 0) return '0h00';
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return `${h}h${String(m).padStart(2, '0')}`;
};

/**
 * Verifica se uma data é fim de semana
 * @param {number} ano
 * @param {number} mes - 1-12
 * @param {number} dia
 * @returns {boolean}
 */
export const isWeekend = (ano, mes, dia) => {
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemana = dataObj.getDay();
    return diaSemana === 0 || diaSemana === 6;
};

/**
 * Retorna o nome do dia da semana
 * @param {number} ano
 * @param {number} mes - 1-12
 * @param {number} dia
 * @returns {string}
 */
export const getDayName = (ano, mes, dia) => {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dataObj = new Date(ano, mes - 1, dia);
    return dias[dataObj.getDay()];
};

/**
 * Converte qualquer valor de data para formato ISO local (YYYY-MM-DD)
 * Evita problemas de timezone ao usar hora local em vez de UTC
 * @param {Date|string|number} value - Data para converter
 * @returns {string} Data no formato YYYY-MM-DD
 */
export const toLocalISODate = (value) => {
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * Alias para toLocalISODate para compatibilidade com código legado
 * @param {Date|string|number} d - Data para formatar
 * @returns {string} Data no formato YYYY-MM-DD
 */
export const formatISO = (d) => toLocalISODate(d);

/**
 * Formata data para exibição em português (DD/MM/YYYY)
 * @param {Date|string} value - Data para formatar
 * @returns {string} Data formatada
 */
export const formatarData = (value) => {
    const d = new Date(value);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
};

/**
 * Verifica se uma data é anterior ao dia de hoje
 * @param {Date|string} dateLike - Data para verificar
 * @returns {boolean} True se a data é anterior a hoje
 */
export const isBeforeToday = (dateLike) => {
    if (!dateLike) return false;
    const d = new Date(dateLike);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
};

/**
 * Extrai apenas a parte da data (YYYY-MM-DD) de strings datetime
 * Compatível com formatos ISO datetime (com 'T') e strings de data simples
 * @param {string} v - String de data/datetime
 * @returns {string|null} Data no formato YYYY-MM-DD ou null se inválida
 */
export const extractDateISO = (v) => {
    if (typeof v !== 'string') return null;
    // Se a string contém 'T' (formato ISO datetime), pega apenas a parte da data
    if (v.includes('T')) {
        return v.split('T')[0];
    }
    // Senão, assume que já está no formato YYYY-MM-DD e pega os primeiros 10 caracteres
    return v.slice(0, 10);
};

/**
 * Converte data ISO (YYYY-MM-DD) para objeto Date local
 * Evita problemas de timezone usando hora local
 * @param {string} isoYYYYMMDD - Data no formato YYYY-MM-DD
 * @returns {Date} Objeto Date em hora local
 */
export const toLocalDate = (isoYYYYMMDD) => {
    const [y, m, d] = isoYYYYMMDD.split('-').map(Number);
    return new Date(y, m - 1, d); // local time, evita desvios por fuso/DST
};

/**
 * Utilitário de sleep para delays em código assíncrono
 * @param {number} ms - Milissegundos para aguardar
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
