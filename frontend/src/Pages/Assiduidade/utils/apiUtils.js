/**
 * Utilitários para chamadas HTTP com retry e timeout
 */
import { sleep } from './dateUtils';

/**
 * Wrapper simples para fetch que retorna JSON
 * Lança erro se a resposta não for ok
 * @param {string} url - URL para fazer fetch
 * @param {Object} options - Opções do fetch
 * @returns {Promise<any>} Dados JSON ou null se resposta vazia
 */
export const fetchJSON = async (url, options = {}) => {
    const res = await fetch(url, options);
    const txt = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${txt || res.statusText}`);
    return txt ? JSON.parse(txt) : null;
};

/**
 * Wrapper para promises que retorna objeto com status de sucesso/erro
 * @param {Promise} p - Promise para executar
 * @returns {Promise<{ok: true, v: any} | {ok: false, e: Error}>}
 */
export const safeJson = (p) =>
    p.then((v) => ({ ok: true, v })).catch((e) => ({ ok: false, e }));

/**
 * Fetch com retry automático e timeout
 * Útil para endpoints instáveis ou que podem estar sob carga
 *
 * @param {string} url - URL para fazer fetch
 * @param {Object} options - Configurações da requisição
 * @param {string} options.method - Método HTTP (GET, POST, etc)
 * @param {Object} options.headers - Headers da requisição
 * @param {string|FormData} options.body - Body da requisição
 * @param {number} options.maxAttempts - Número máximo de tentativas (padrão: 4)
 * @param {number} options.timeoutMs - Timeout por tentativa em ms (padrão: 12000)
 * @param {number} options.backoffBaseMs - Base para cálculo de backoff exponencial (padrão: 600)
 * @param {number[]} options.retryOn - Status codes que disparam retry (padrão: [429, 500, 502, 503, 504])
 * @returns {Promise<any>} Dados JSON ou null se resposta vazia
 */
export const fetchJSONWithRetry = async (url, {
    method = 'GET',
    headers = {},
    body,
    maxAttempts = 4,
    timeoutMs = 12000,
    backoffBaseMs = 600,
    retryOn = [429, 500, 502, 503, 504]
} = {}) => {
    let attempt = 0;
    let lastErr;

    while (attempt < maxAttempts) {
        attempt++;
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), timeoutMs);

        try {
            const res = await fetch(url, { method, headers, body, signal: ac.signal });
            const txt = await res.text();
            clearTimeout(t);

            if (!res.ok) {
                if (!retryOn.includes(res.status)) {
                    throw new Error(`${res.status} ${txt || res.statusText}`);
                }
                lastErr = new Error(`${res.status} ${txt || res.statusText}`);
            } else {
                return txt ? JSON.parse(txt) : null;
            }
        } catch (e) {
            clearTimeout(t);
            lastErr = e.name === 'AbortError' ? new Error('Timeout') : e;
        }

        // Backoff exponencial com jitter
        const wait = Math.round(backoffBaseMs * (2 ** (attempt - 1)) * (0.75 + Math.random() * 0.5));
        await sleep(wait);
    }

    throw lastErr || new Error('Falha ao obter recurso');
};
