/**
 * Serviço para gestão de pedidos pendentes de faltas e férias
 */

/**
 * Carrega pedidos pendentes de aprovação
 * @param {string} token - Token de autenticação
 * @param {string} empresaId - ID da empresa
 * @returns {Promise<Array>} Lista de pedidos pendentes
 */
export const carregarPedidosPendentes = async (token, empresaId) => {
    try {
        const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/pendentes`, {
            headers: {
                Authorization: `Bearer ${token}`,
                urlempresa: empresaId,
                'Content-Type': 'application/json'
            }
        });

        if (res.ok) {
            const data = await res.json();
            return data || [];
        } else {
            console.warn("Erro ao buscar pendentes:", await res.text());
            return [];
        }
    } catch (err) {
        console.error("Erro ao carregar pedidos pendentes:", err);
        return [];
    }
};

/**
 * Carrega dias pendentes de um funcionário específico
 * Retorna array de datas ISO para marcar no calendário
 * @param {string} token - Token de autenticação
 * @param {string} empresaId - ID da empresa
 * @param {string} funcionarioId - ID do funcionário
 * @returns {Promise<string[]>} Array de datas no formato ISO (YYYY-MM-DD)
 */
export const carregarDiasPendentesFuncionario = async (token, empresaId, funcionarioId) => {
    try {
        const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/pendentes`, {
            headers: {
                Authorization: `Bearer ${token}`,
                urlempresa: empresaId,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            console.warn("Erro ao carregar pendentes:", await res.text());
            return [];
        }

        const data = await res.json();
        const apenasDoFuncionario = data.filter(p => p.funcionario === funcionarioId);
        const diasPendentesSet = new Set();

        apenasDoFuncionario.forEach(p => {
            if (p.tipoPedido === 'FERIAS' && p.dataInicio && p.dataFim) {
                // Para férias, marcar todos os dias do intervalo
                const inicio = new Date(p.dataInicio);
                const fim = new Date(p.dataFim);
                let dataAtual = new Date(inicio);

                while (dataAtual <= fim) {
                    const iso = dataAtual.toISOString().split('T')[0];
                    diasPendentesSet.add(iso);
                    dataAtual.setDate(dataAtual.getDate() + 1);
                }
            } else if (p.dataPedido) {
                // Para faltas, marcar apenas a data do pedido
                const data = new Date(p.dataPedido).toISOString().split('T')[0];
                diasPendentesSet.add(data);
            }
        });

        return Array.from(diasPendentesSet);

    } catch (err) {
        console.error("Erro ao carregar dias pendentes:", err);
        return [];
    }
};

/**
 * Carrega pedidos pendentes de falta/férias de um funcionário
 * @param {string} token - Token de autenticação
 * @param {string} empresaId - ID da empresa
 * @param {string} funcionarioId - ID do funcionário (opcional, se não fornecido retorna todos)
 * @returns {Promise<Array>} Lista de pedidos pendentes do funcionário
 */
export const carregarFaltasPendentesFuncionario = async (token, empresaId, funcionarioId = null) => {
    try {
        const res = await fetch(`https://backend.advir.pt/api/faltas-ferias/aprovacao/pendentes`, {
            headers: {
                Authorization: `Bearer ${token}`,
                urlempresa: empresaId,
                'Content-Type': 'application/json'
            }
        });

        if (res.ok) {
            const data = await res.json();
            if (funcionarioId) {
                return (data || []).filter(p => p.funcionario === funcionarioId);
            }
            return data || [];
        } else {
            console.warn("Erro ao buscar pendentes:", await res.text());
            return [];
        }
    } catch (err) {
        console.error("Erro ao carregar faltas pendentes:", err);
        return [];
    }
};
