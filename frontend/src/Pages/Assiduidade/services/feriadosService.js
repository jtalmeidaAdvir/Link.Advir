/**
 * Serviço para gestão de feriados do Primavera ERP
 */
import { extractDateISO, toLocalDate } from '../utils/dateUtils';

/**
 * Normaliza dados de feriados vindos do Primavera
 * Aceita múltiplos formatos e estruturas de resposta
 * @param {Object|Array} payload - Dados de feriados do Primavera
 * @returns {Set<string>} Set de datas em formato ISO (YYYY-MM-DD)
 */
export const normalizarFeriados = (payload) => {
    try {
        const out = new Set();

        /**
         * Valida e adiciona uma data ISO ao set
         * @param {string} s - Data no formato YYYY-MM-DD
         */
        const addISO = (s) => {
            if (s && s.match(/^\d{4}-\d{2}-\d{2}$/)) out.add(s);
        };

        /**
         * Processa uma linha de dados de feriado
         * @param {Object} row - Objeto com dados de feriado
         */
        const handleRow = (row) => {
            if (!row) return;

            // Procura por diferentes propriedades de data
            const dStr =
                extractDateISO(row.Feriado) ||
                extractDateISO(row.feriado) ||
                extractDateISO(row.Data) ||
                extractDateISO(row.data) ||
                extractDateISO(row.Date) ||
                extractDateISO(row.date) ||
                extractDateISO(row.DataFeriado) ||
                extractDateISO(row.dataFeriado) ||
                extractDateISO(row.DataDia) ||
                extractDateISO(row.dataDia) ||
                extractDateISO(row.DataInicio) ||
                extractDateISO(row.dataInicio);

            const fStrRaw =
                row.DataFim || row.dataFim || row.Fim || row.fim;

            if (dStr && fStrRaw) {
                // Intervalo [dStr..fStr]
                const fStr = extractDateISO(typeof fStrRaw === 'string' ? fStrRaw : String(fStrRaw));
                if (!fStr) {
                    addISO(dStr);
                    return;
                }

                // Adiciona todos os dias do intervalo
                let cur = toLocalDate(dStr);
                const end = toLocalDate(fStr);
                while (cur <= end) {
                    addISO(
                        `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
                    );
                    cur.setDate(cur.getDate() + 1);
                }
            } else if (dStr) {
                addISO(dStr);
            }
        };

        // Processa diferentes estruturas de payload
        if (Array.isArray(payload)) {
            payload.forEach((item) => {
                if (typeof item === 'string') addISO(extractDateISO(item));
                else handleRow(item);
            });
        } else if (payload?.DataSet?.Table) {
            payload.DataSet.Table.forEach(handleRow);
        } else {
            handleRow(payload);
        }

        return out;

    } catch (error) {
        console.error('Erro na normalização de feriados:', error);
        console.error('Payload que causou o erro:', payload);
        return new Set(); // Retorna conjunto vazio em caso de erro
    }
};

/**
 * Carrega feriados do Primavera ERP com retry automático
 * @param {string} painelAdminToken - Token de autenticação do painel admin
 * @param {string} urlempresa - URL da empresa no Primavera
 * @param {number} ano - Ano para carregar feriados (opcional, usa ano atual se não fornecido)
 * @param {number} tentativa - Tentativa atual (uso interno)
 * @param {number} maxTentativas - Número máximo de tentativas
 * @returns {Promise<Set<string>>} Set de datas de feriados em formato ISO
 */
export const carregarFeriados = async (
    painelAdminToken,
    urlempresa,
    ano = new Date().getFullYear(),
    tentativa = 1,
    maxTentativas = 3
) => {
    if (!painelAdminToken || !urlempresa) {
        console.warn('Token ou URL da empresa não encontrados para carregar feriados');
        return new Set();
    }

    try {
        const res = await fetch(`https://webapiprimavera.advir.pt/routesFaltas/Feriados`, {
            headers: {
                'Authorization': `Bearer ${painelAdminToken}`,
                'urlempresa': urlempresa,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Erro na resposta da API feriados:', errorText);

            // Se for erro 409 e ainda temos tentativas, aguardar e tentar novamente
            if (res.status === 409 && tentativa < maxTentativas) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return carregarFeriados(painelAdminToken, urlempresa, ano, tentativa + 1, maxTentativas);
            }

            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        const listaISO = normalizarFeriados(data);

        return listaISO;

    } catch (err) {
        console.error(`Erro ao carregar feriados (tentativa ${tentativa}):`, err);

        // Se ainda temos tentativas e não foi um erro de rede crítico
        if (tentativa < maxTentativas && !err.message.includes('TypeError: Failed to fetch')) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            return carregarFeriados(painelAdminToken, urlempresa, ano, tentativa + 1, maxTentativas);
        }

        console.warn('Usando conjunto vazio de feriados como fallback');
        return new Set(); // fallback para conjunto vazio
    }
};
