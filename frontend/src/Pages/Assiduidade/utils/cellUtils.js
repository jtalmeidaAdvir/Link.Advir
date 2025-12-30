/**
 * Utilitários para manipulação de células da grade
 */

/**
 * Agrupa células selecionadas por utilizador
 * @param {Array<string>} selectedCells - Array de strings no formato "userId-dia"
 * @returns {Object} Objeto com userId como chave e array de dias como valor
 *
 * @example
 * const cells = ['10-1', '10-2', '20-1'];
 * const grouped = groupCellsByUser(cells);
 * // { 10: [1, 2], 20: [1] }
 */
export const groupCellsByUser = (selectedCells) => {
    const cellsByUser = {};

    selectedCells.forEach(cellKey => {
        const [userId, dia] = cellKey.split('-');
        const userIdNumber = parseInt(userId, 10);

        if (!cellsByUser[userIdNumber]) {
            cellsByUser[userIdNumber] = [];
        }

        cellsByUser[userIdNumber].push(parseInt(dia, 10));
    });

    return cellsByUser;
};
