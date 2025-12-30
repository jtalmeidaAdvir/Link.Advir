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
