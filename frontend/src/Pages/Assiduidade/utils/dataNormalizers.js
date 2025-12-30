/**
 * Utilitários para normalização de dados do Primavera ERP
 *
 * O Primavera retorna dados com campos inconsistentes dependendo da API/versão.
 * Estas funções normalizam os dados para uma estrutura consistente.
 */

/**
 * Normaliza uma falta do Primavera para estrutura consistente
 * @param {Object} falta - Objeto de falta do Primavera
 * @param {string} dataFalta - Data da falta (ISO format)
 * @param {string} codigoFalta - Código da falta
 * @returns {Object} Falta normalizada
 */
export const normalizarFalta = (falta, dataFalta, codigoFalta) => {
    return {
        ...falta,
        Data: dataFalta,
        Falta: codigoFalta,
        // Primavera pode retornar Funcionario em 3 campos diferentes
        Funcionario: falta.Funcionario2 || falta.Funcionario1 || falta.Funcionario,
        // Tempo pode vir em diferentes campos
        Tempo: falta.Tempo1 || falta.TempoFalta || falta.Tempo,
        // Horas pode vir em diferentes campos
        Horas: falta.Horas || falta.HorasFalta
    };
};

/**
 * Normaliza uma hora extra do Primavera para estrutura consistente
 * @param {Object} horaExtra - Objeto de hora extra do Primavera
 * @param {string} dataHoraExtra - Data da hora extra (ISO format)
 * @param {string} tipoHoraExtra - Tipo/código da hora extra
 * @returns {Object} Hora extra normalizada
 */
export const normalizarHoraExtra = (horaExtra, dataHoraExtra, tipoHoraExtra) => {
    return {
        ...horaExtra,
        Data: dataHoraExtra,
        TipoHoraExtra: tipoHoraExtra,
        // Primavera pode retornar Funcionario em diferentes campos
        Funcionario: horaExtra.Funcionario2 || horaExtra.Funcionario1 || horaExtra.Funcionario,
        // Tempo/horas pode vir em diferentes formatos
        Tempo: horaExtra.Tempo || horaExtra.TempoHorasExtras,
        Horas: horaExtra.Horas || horaExtra.HorasExtras
    };
};
