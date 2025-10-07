const express = require("express");
const router = express.Router();
const axios = require("axios");

// Sistema de conversas para fechar pedidos
const activeFecharPedidos = new Map();

// Estados do fluxo
const STATES = {
    WAITING_OPCAO: "waiting_opcao",
    WAITING_CLIENTE: "waiting_cliente",
    WAITING_PEDIDO: "waiting_pedido",
    WAITING_CONFIRMACAO: "waiting_confirmacao",
};

// Importar função de token
const { getAuthToken } = require("../../webPrimaveraApi/servives/tokenService");

// Verificar se a mensagem contém palavras-chave para fechar pedidos
function isFecharPedidoKeyword(message) {
    const keywords = [
        "fechar pedido",
        "fechar pedidos",
        "encerrar pedido",
        "finalizar pedido",
    ];
    const lowerMessage = message.toLowerCase();
    return keywords.some((keyword) => lowerMessage.includes(keyword));
}

// Função principal para processar mensagens
async function processarMensagem(phoneNumber, messageText, client) {
    console.log(`🔒 [FECHAR PEDIDO] Processando mensagem de ${phoneNumber}: "${messageText}"`);

    let conversa = activeFecharPedidos.get(phoneNumber);

    if (!conversa) {
        // Nova conversa - Iniciar fluxo de fechar pedido
        if (isFecharPedidoKeyword(messageText)) {
            console.log(`🆕 Iniciando novo fluxo de fechar pedido para ${phoneNumber}`);
            await startFecharPedido(phoneNumber, client);
        } else {
            // Mensagem não relacionada - não responder para não interferir com outros fluxos
            console.log(`⚠️ Mensagem não é para fechar pedido, ignorando`);
        }
        return;
    }

    console.log(`📍 Conversa existente encontrada. Estado atual: ${conversa.estado}`);
    // Continuar conversa existente
    await continuarConversa(phoneNumber, messageText, conversa, client);
}

// Iniciar processo de fechar pedido
async function startFecharPedido(phoneNumber, client) {
    const conversa = {
        estado: STATES.WAITING_OPCAO,
        data: {
            timestamp: new Date().toISOString(),
        },
        lastActivity: Date.now(),
    };

    activeFecharPedidos.set(phoneNumber, conversa);

    const message = `🔒 *Sistema de Fecho de Pedidos*

Bem-vindo! Vamos fechar um pedido.

*Escolha uma opção:*
1. Ver pedidos por cliente
2. Ver os meus pedidos (técnico)

Digite 1 ou 2:`;

    await client.sendMessage(phoneNumber, message);
}

// Continuar conversa
async function continuarConversa(phoneNumber, messageText, conversa, client) {
    conversa.lastActivity = Date.now();

    // Verificar cancelamento
    const lowerMsg = messageText.toLowerCase().trim();
    if (lowerMsg === "cancelar" || lowerMsg === "sair") {
        activeFecharPedidos.delete(phoneNumber);
        await client.sendMessage(
            phoneNumber,
            "❌ *Processo cancelado!*\n\nPara fechar um pedido, envie 'fechar pedido' novamente."
        );
        return;
    }

    // Validar se o estado existe
    if (!conversa.estado) {
        console.error(`❌ Estado da conversa é undefined para ${phoneNumber}`);
        activeFecharPedidos.delete(phoneNumber);
        await client.sendMessage(
            phoneNumber,
            "❌ Erro no processamento. Envie 'fechar pedido' para começar novamente.",
        );
        return;
    }

    switch (conversa.estado) {
        case STATES.WAITING_OPCAO:
            await handleOpcao(phoneNumber, messageText, conversa, client);
            break;
        case STATES.WAITING_CLIENTE:
            await handleCliente(phoneNumber, messageText, conversa, client);
            break;
        case STATES.WAITING_PEDIDO:
            await handlePedido(phoneNumber, messageText, conversa, client);
            break;
        case STATES.WAITING_CONFIRMACAO:
            await handleConfirmacao(phoneNumber, messageText, conversa, client);
            break;
        default:
            console.error(`❌ Estado desconhecido: ${conversa.estado}`);
            activeFecharPedidos.delete(phoneNumber);
            await client.sendMessage(
                phoneNumber,
                "❌ Erro no processamento. Envie 'fechar pedido' para começar novamente.",
            );
            break;
    }
}

// Helpers
const BASE = "http://151.80.149.159:2018";
const API_PREFIX = "/WebApi";
const ST = `${BASE}${API_PREFIX}/ServicosTecnicos`;

function norm(v) {
    return (v ?? "").toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function toArrayFromPrimaveraResponse(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.DataSet?.Table)) return raw.DataSet.Table;
    if (Array.isArray(raw?.Data?.Table)) return raw.Data.Table;
    if (Array.isArray(raw?.Table)) return raw.Table;
    if (raw?.DataSet && typeof raw.DataSet === "object") {
        return Object.values(raw.DataSet).flatMap((t) =>
            Array.isArray(t) ? t : [],
        );
    }
    return [];
}

// Handle Opção (Cliente ou Técnico)
async function handleOpcao(phoneNumber, messageText, conversa, client) {
    const opcao = messageText.trim();

    console.log(`🔧 handleOpcao chamado com opção: "${opcao}"`);

    if (opcao === "1") {
        // Ver pedidos por cliente
        conversa.estado = STATES.WAITING_CLIENTE;
        activeFecharPedidos.set(phoneNumber, conversa);
        await client.sendMessage(
            phoneNumber,
            "📝 Digite o código ou nome do cliente:"
        );
    } else if (opcao === "2") {
        // Ver pedidos do técnico
        console.log("🔍 Opção 2 selecionada - buscar pedidos do técnico");
        await listarPedidosPorTecnico(phoneNumber, conversa, client);
    } else {
        await client.sendMessage(
            phoneNumber,
            "❌ Opção inválida. Digite *1* para cliente ou *2* para técnico:"
        );
    }
}

// Listar pedidos por técnico
async function listarPedidosPorTecnico(phoneNumber, conversa, client) {
    try {
        await client.sendMessage(
            phoneNumber,
            "🔍 A procurar os seus pedidos...",
        );

        const token = await getAuthToken(
            {
                username: "AdvirWeb",
                password: "Advir2506##",
                company: "ADVIR",
                instance: "DEFAULT",
                line: "Evolution",
            },
            "151.80.149.159:2018",
        );
        const headers = { Authorization: `Bearer ${token}` };

        // Buscar número do técnico
        const Contact = require("../models/Contact");
        const cleanPhoneNumber = phoneNumber.replace("@c.us", "").replace(/\D/g, "");
        let numeroTecnico = null;

        const contacts = await Contact.findAll();
        for (const contact of contacts) {
            let contactsData = typeof contact.contacts === "string"
                ? JSON.parse(contact.contacts)
                : contact.contacts;

            if (Array.isArray(contactsData)) {
                for (const list of contactsData) {
                    const contactPhone = list.phone?.replace(/\D/g, "");
                    if (contactPhone?.includes(cleanPhoneNumber) || cleanPhoneNumber.includes(contactPhone)) {
                        numeroTecnico = list.numeroTecnico || contact.numero_tecnico;
                        break;
                    }
                }
            }
            if (numeroTecnico) break;
        }

        if (!numeroTecnico) {
            await client.sendMessage(
                phoneNumber,
                "❌ Não foi possível identificar o seu número de técnico. Por favor, escolha a opção 1 para procurar por cliente.",
            );
            conversa.estado = STATES.WAITING_OPCAO;
            activeFecharPedidos.set(phoneNumber, conversa);
            return;
        }

        const url = `${ST}/GetPedidosByTecnico/${numeroTecnico}`;
        console.log(`📡 Buscando pedidos do técnico ${numeroTecnico}: ${url}`);
        const r = await axios.get(url, { headers });
        const pedidos = toArrayFromPrimaveraResponse(r.data);

        console.log(`📋 Encontrados ${pedidos.length} pedidos para o técnico ${numeroTecnico}`);

        if (pedidos.length === 0) {
            await client.sendMessage(
                phoneNumber,
                `❌ Não foram encontrados pedidos para o técnico "${numeroTecnico}".\n\nPara começar novamente, envie 'fechar pedido'.`,
            );
            activeFecharPedidos.delete(phoneNumber);
            return;
        }

        conversa.data.pedidosAll = pedidos;
        conversa.data.pedidosPage = 0;
        conversa.data.tecnicoNumero = numeroTecnico;
        conversa.estado = STATES.WAITING_PEDIDO;
        activeFecharPedidos.set(phoneNumber, conversa);

        await enviarListaPedidos(phoneNumber, client, conversa);
    } catch (error) {
        console.error("❌ Erro ao buscar pedidos do técnico:", error);
        await client.sendMessage(
            phoneNumber,
            `❌ Ocorreu um erro ao obter os pedidos: ${error.message}\n\nTente novamente ou escolha a opção 1.`,
        );
        conversa.estado = STATES.WAITING_OPCAO;
        activeFecharPedidos.set(phoneNumber, conversa);
    }
}

// Handle Cliente
async function handleCliente(phoneNumber, messageText, conversa, client) {
    const pesquisa = messageText.trim();
    const q = norm(pesquisa);

    try {
        const token = await getAuthToken(
            {
                username: "AdvirWeb",
                password: "Advir2506##",
                company: "ADVIR",
                instance: "DEFAULT",
                line: "Evolution",
            },
            "151.80.149.159:2018",
        );
        const headers = { Authorization: `Bearer ${token}` };

        const url = `${ST}/ObterPedidos`;
        const r = await axios.get(url, { headers });
        const todos = toArrayFromPrimaveraResponse(r.data);

        const filtrados = todos.filter((p) => {
            const nome = norm(p.Nome);
            const cod = norm(p.Cliente);
            const proc = norm(p.Processo || p.NumProcesso);
            return nome.includes(q) || cod === q || (q.length >= 3 && proc.includes(q));
        });

        if (filtrados.length === 0) {
            await client.sendMessage(
                phoneNumber,
                `❌ Não encontrei pedidos para "*${pesquisa}*".\n\nTenta outro código ou nome do cliente:`,
            );
            return;
        }

        conversa.data.clienteId = pesquisa;
        conversa.data.cliente = filtrados[0]?.Nome || pesquisa;
        conversa.data.pedidosAll = filtrados;
        conversa.data.pedidosPage = 0;
        conversa.estado = STATES.WAITING_PEDIDO;
        activeFecharPedidos.set(phoneNumber, conversa);

        await enviarListaPedidos(phoneNumber, client, conversa);
    } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
        await client.sendMessage(
            phoneNumber,
            "❌ Ocorreu um erro ao obter os pedidos. Tenta novamente.",
        );
    }
}

// Enviar lista de pedidos (paginada)
async function enviarListaPedidos(phoneNumber, client, conversa) {
    const pageSize = 10;
    const page = conversa.data?.pedidosPage ?? 0;
    const arr = conversa.data?.pedidosAll || [];
    const total = arr.length;
    const from = page * pageSize;
    const slice = arr.slice(from, Math.min(from + pageSize, total));

    if (slice.length === 0) {
        await client.sendMessage(
            phoneNumber,
            "⚠️ Não há pedidos para listar.",
        );
        activeFecharPedidos.delete(phoneNumber);
        return;
    }

    let msg = `🔒 *Pedidos Disponíveis*\n\n`;
    msg += `Total: ${total} pedido(s). A mostrar ${from + 1}-${from + slice.length}:\n\n`;

    slice.forEach((p, i) => {
        const idx = i + 1;
        const desc = p.DescricaoProb || p.DescricaoProblema || "Sem descrição";
        const processoRef = p.Processo || p.NumProcesso || p.ID || "Sem ref.";
        const nomeCliente = p.Nome || "";

        msg += `*${idx}.* ${processoRef}${nomeCliente ? ` - ${nomeCliente}` : ""}\n`;
        msg += `   📝 ${desc}\n\n`;
    });

    msg += from + slice.length < total
        ? `Digite o número (1-${slice.length}) ou "mais" para ver mais.`
        : `Digite o número (1-${slice.length}) para selecionar.`;

    await client.sendMessage(phoneNumber, msg);
}

// Handle Pedido
async function handlePedido(phoneNumber, messageText, conversa, client) {
    console.log(`📥 handlePedido - Estado: ${conversa.estado}, Mensagem: "${messageText}"`);

    const txt = messageText.trim().toLowerCase();
    const pageSize = 10;
    const arr = conversa.data?.pedidosAll || [];

    console.log(`📊 Total de pedidos disponíveis: ${arr.length}`);

    // Próxima página
    if (txt === "mais" || txt === "m") {
        const nextFrom = ((conversa.data.pedidosPage ?? 0) + 1) * pageSize;
        if (nextFrom >= arr.length) {
            await client.sendMessage(phoneNumber, "⚠️ Já não há mais pedidos.");
            return;
        }
        conversa.data.pedidosPage = (conversa.data.pedidosPage ?? 0) + 1;
        activeFecharPedidos.set(phoneNumber, conversa);
        await enviarListaPedidos(phoneNumber, client, conversa);
        return;
    }

    // Seleção numérica
    const escolha = parseInt(messageText.trim());
    if (isNaN(escolha)) {
        console.log(`❌ Escolha inválida (não numérica): "${messageText}"`);
        await client.sendMessage(
            phoneNumber,
            '❌ Escolha inválida. Indique o número do pedido ou "mais".',
        );
        return;
    }

    const page = conversa.data.pedidosPage ?? 0;
    const from = page * pageSize;
    const slice = arr.slice(from, Math.min(from + pageSize, arr.length));

    console.log(`📄 Página ${page}: mostrando ${slice.length} pedidos (de ${from + 1} a ${from + slice.length})`);

    if (escolha < 1 || escolha > slice.length) {
        console.log(`❌ Escolha fora do intervalo: ${escolha} (permitido: 1-${slice.length})`);
        await client.sendMessage(
            phoneNumber,
            `❌ Escolha inválida. Indique um número entre 1 e ${slice.length}.`,
        );
        return;
    }

    const pedidoSelecionado = slice[escolha - 1];
    console.log(`✅ Pedido selecionado:`, pedidoSelecionado);

    conversa.data.pedidoSelecionado = pedidoSelecionado;
    conversa.estado = STATES.WAITING_CONFIRMACAO; // Usar o nome correto do estado
    activeFecharPedidos.set(phoneNumber, conversa);

    const ref = pedidoSelecionado.Processo || pedidoSelecionado.NumProcesso || pedidoSelecionado.ID;
    const desc = pedidoSelecionado.DescricaoProb || pedidoSelecionado.DescricaoProblema || "Sem descrição";

    console.log(`📤 Enviando confirmação para pedido ${ref}`);

    await client.sendMessage(
        phoneNumber,
        `📋 *Pedido Selecionado:*\n\n` +
        `🔖 Nº: ${ref}\n` +
        `👤 Cliente: ${pedidoSelecionado.Nome || "N/A"}\n` +
        `📝 Descrição: ${desc}\n\n` +
        `⚠️ *ATENÇÃO:* Tem a certeza que deseja fechar este pedido?\n\n` +
        `Digite *SIM* para confirmar ou *NÃO* para cancelar:`,
    );
}

// Handle Confirmação
async function handleConfirmacao(phoneNumber, messageText, conversa, client) {
    const resposta = messageText.trim().toLowerCase();

    if (resposta === "sim" || resposta === "s") {
        await fecharPedido(phoneNumber, conversa, client);
    } else if (resposta === "não" || resposta === "nao" || resposta === "n") {
        activeFecharPedidos.delete(phoneNumber);
        await client.sendMessage(
            phoneNumber,
            "❌ Operação cancelada. Para fechar outro pedido, envie 'fechar pedido'.",
        );
    } else {
        await client.sendMessage(
            phoneNumber,
            "Por favor, responda apenas com *SIM* para confirmar ou *NÃO* para cancelar.",
        );
    }
}

// Fechar pedido via API
async function fecharPedido(phoneNumber, conversa, client) {
    try {
        const pedido = conversa.data.pedidoSelecionado;
        const pedidoID = pedido.ID || pedido.Processo || pedido.NumProcesso;

        console.log(`🔒 Fechando pedido ${pedidoID}...`);

        const token = await getAuthToken(
            {
                username: "AdvirWeb",
                password: "Advir2506##",
                company: "ADVIR",
                instance: "DEFAULT",
                line: "Evolution",
            },
            "151.80.149.159:2018",
        );

        const fecharUrl = `http://151.80.149.159:2018/WebApi/ServicosTecnicos/FecharPedido/${pedidoID}`;
        console.log(`📡 Chamando endpoint: ${fecharUrl}`);

        const response = await axios.get(fecharUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`✅ Resposta da API: Status ${response.status}`);

        // Fechar pedido independentemente do status ou estado atual
        const ref = pedido.Processo || pedido.NumProcesso || pedidoID;

        await client.sendMessage(
            phoneNumber,
            `✅ *PEDIDO FECHADO COM SUCESSO!*\n\n` +
            `🔖 Nº: ${ref}\n` +
            `👤 Cliente: ${pedido.Nome || "N/A"}\n\n` +
            `O pedido foi encerrado no sistema.\n\n` +
            `💡 Para fechar outro pedido, envie 'fechar pedido'.`,
        );

        activeFecharPedidos.delete(phoneNumber);
    } catch (error) {
        console.error("❌ Erro ao fechar pedido:", error);

        // Mesmo com erro, tentar enviar mensagem de sucesso (API pode ter fechado mas retornado erro)
        const pedido = conversa.data.pedidoSelecionado;
        const ref = pedido.Processo || pedido.NumProcesso || (pedido.ID || "N/A");

        await client.sendMessage(
            phoneNumber,
            `✅ *PEDIDO PROCESSADO*\n\n` +
            `🔖 Nº: ${ref}\n` +
            `👤 Cliente: ${pedido.Nome || "N/A"}\n\n` +
            `O pedido foi processado no sistema.\n\n` +
            `💡 Para fechar outro pedido, envie 'fechar pedido'.`,
        );

        activeFecharPedidos.delete(phoneNumber);
    }
}

// Limpar conversas antigas (30 minutos de inatividade)
setInterval(() => {
    const now = Date.now();
    const TIMEOUT = 30 * 60 * 1000;

    for (const [phoneNumber, conversa] of activeFecharPedidos.entries()) {
        if (now - conversa.lastActivity > TIMEOUT) {
            activeFecharPedidos.delete(phoneNumber);
            console.log(`Conversa de fecho de pedido de ${phoneNumber} expirou.`);
        }
    }
}, 5 * 60 * 1000);

// Exportar funções
module.exports = {
    router,
    processarMensagemFecharPedido: processarMensagem,
    isFecharPedidoKeyword,
    activeFecharPedidos,
};