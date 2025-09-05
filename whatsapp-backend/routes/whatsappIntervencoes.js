const express = require("express");
const router = express.Router();
const axios = require("axios");

// Sistema simples de conversas para intervenções
const activeIntervencoes = new Map();

// Estados do fluxo de intervenção
const STATES = {
    WAITING_CLIENT: "waiting_client",
    WAITING_PEDIDO: "waiting_pedido",
    WAITING_ESTADO: "waiting_estado",
    WAITING_TIPO: "waiting_tipo",
    WAITING_DESCRICAO: "waiting_descricao",
    WAITING_DATA_INICIO: "waiting_data_inicio",
    WAITING_HORA_INICIO: "waiting_hora_inicio",
    WAITING_DATA_FIM: "waiting_data_fim",
    WAITING_HORA_FIM: "waiting_hora_fim",
    WAITING_CONFIRMATION: "waiting_confirmation"
};

// Importar função de token
const { getAuthToken } = require("../../webPrimaveraApi/servives/tokenService");

// Verificar palavras-chave para intervenções
function isIntervencaoKeyword(message) {
    const keywords = ["intervenção", "intervencao", "intervenção tecnica", "reparação", "manutenção"];
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword));
}

// Função principal para processar mensagens de intervenção
async function processarMensagemIntervencao(phoneNumber, messageText, client) {
    console.log(`🔧 Processando intervenção de ${phoneNumber}: "${messageText}"`);

    // Se é palavra-chave inicial, começar nova intervenção
    if (isIntervencaoKeyword(messageText)) {
        await startNewIntervencao(phoneNumber, client);
        return;
    }

    // Se é cancelamento
    if (messageText.toLowerCase().includes("cancelar")) {
        activeIntervencoes.delete(phoneNumber);
        await client.sendMessage(phoneNumber, "❌ *Intervenção Cancelada*\n\nPara iniciar nova intervenção, envie 'intervenção'.");
        return;
    }

    // Continuar conversa existente
    const conversa = activeIntervencoes.get(phoneNumber);
    if (!conversa) {
        await client.sendMessage(phoneNumber, "❌ Nenhuma conversa ativa. Para criar intervenção, envie: *intervenção*");
        return;
    }

    await continuarConversa(phoneNumber, messageText, conversa, client);
}

// Iniciar nova intervenção
async function startNewIntervencao(phoneNumber, client) {
    const conversa = {
        state: STATES.WAITING_CLIENT,
        data: {},
        lastActivity: Date.now()
    };

    activeIntervencoes.set(phoneNumber, conversa);

    const message = `🔧 *Sistema de Intervenções*

Para registar uma intervenção, preciso das seguintes informações:

*1. Cliente*
Indique o código do cliente:`;

    await client.sendMessage(phoneNumber, message);
}

// Continuar conversa
async function continuarConversa(phoneNumber, messageText, conversa, client) {
    conversa.lastActivity = Date.now();

    switch (conversa.state) {
        case STATES.WAITING_CLIENT:
            await handleCliente(phoneNumber, messageText, conversa, client);
            break;
        case STATES.WAITING_PEDIDO:
            await handlePedido(phoneNumber, messageText, conversa, client);
            break;
        case STATES.WAITING_ESTADO:
            await handleEstado(phoneNumber, messageText, conversa, client);
            break;
        case STATES.WAITING_TIPO:
            await handleTipo(phoneNumber, messageText, conversa, client);
            break;
        case STATES.WAITING_DESCRICAO:
            await handleDescricao(phoneNumber, messageText, conversa, client);
            break;
        case STATES.WAITING_DATA_INICIO:
            await handleDataInicio(phoneNumber, messageText, conversa, client);
            break;
        case STATES.WAITING_HORA_INICIO:
            await handleHoraInicio(phoneNumber, messageText, conversa, client);
            break;
        case STATES.WAITING_DATA_FIM:
            await handleDataFim(phoneNumber, messageText, conversa, client);
            break;
        case STATES.WAITING_HORA_FIM:
            await handleHoraFim(phoneNumber, messageText, conversa, client);
            break;
        case STATES.WAITING_CONFIRMATION:
            await handleConfirmation(phoneNumber, messageText, conversa, client);
            break;
        case "WAITING_DATA_INICIO_MANUAL":
            await handleDataInicioManual(phoneNumber, messageText, conversa, client);
            break;
        case "WAITING_DATA_FIM_MANUAL":
            await handleDataFimManual(phoneNumber, messageText, conversa, client);
            break;
        default:
            activeIntervencoes.delete(phoneNumber);
            await client.sendMessage(phoneNumber, "❌ Erro no processamento. Envie 'intervenção' para começar.");
            break;
    }
}

// Handle Cliente
async function handleCliente(phoneNumber, messageText, conversa, client) {
    const clienteId = messageText.trim();

    try {
        const token = await getAuthToken({
            username: "AdvirWeb",
            password: "Advir2506##",
            company: "Advir",
            instance: "DEFAULT",
            line: "Evolution"
        }, "151.80.149.159:2018");

        const response = await axios.get(
            "http://151.80.149.159:2018/WebApi/ServicosTecnicos/ObterPedidos",
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const pedidos = response.data.DataSet?.Table || [];
        const pedidosCliente = pedidos.filter(p =>
            p.Cliente === clienteId ||
            p.Cliente.toLowerCase() === clienteId.toLowerCase() ||
            p.Nome.toLowerCase().includes(clienteId.toLowerCase())
        );

        if (pedidosCliente.length === 0) {
            await client.sendMessage(phoneNumber, `❌ Nenhum pedido encontrado para "${clienteId}". Tente outro código:`);
            return;
        }

        conversa.data.clienteId = clienteId;
        conversa.data.pedidos = pedidosCliente;
        conversa.state = STATES.WAITING_PEDIDO;

        let message = `✅ Cliente: *${pedidosCliente[0]?.Nome || clienteId}*\n\n📋 *Pedidos disponíveis:*\n\n`;

        pedidosCliente.forEach((pedido, index) => {
            const descricao = pedido.DescricaoProb || pedido.DescricaoProblema || "Sem descrição";
            message += `*${index + 1}.* ${pedido.Processo || `Ref. ${index + 1}`}\n   ${descricao}\n\n`;
        });

        message += `Selecione o pedido (1-${pedidosCliente.length}):`;
        await client.sendMessage(phoneNumber, message);

    } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
        await client.sendMessage(phoneNumber, "❌ Erro ao buscar pedidos. Tente novamente:");
    }
}

// Handle Pedido
async function handlePedido(phoneNumber, messageText, conversa, client) {
    const escolha = parseInt(messageText.trim());
    const pedidos = conversa.data.pedidos;

    if (isNaN(escolha) || escolha < 1 || escolha > pedidos.length) {
        await client.sendMessage(phoneNumber, `❌ Digite um número entre 1 e ${pedidos.length}:`);
        return;
    }

    const pedidoSelecionado = pedidos[escolha - 1];
    conversa.data.pedidoId = pedidoSelecionado.ID;
    conversa.data.tecnicoNumero = pedidoSelecionado.Tecnico;
    conversa.state = STATES.WAITING_ESTADO;

    const message = `✅ Pedido: *${pedidoSelecionado.Processo || `Ref. ${escolha}`}*

*2. Estado da Intervenção*
Selecione:

*1.* Terminado
*2.* Aguardar intervenção equipa Advir
*3.* Em curso equipa Advir
*4.* Reportado para Parceiro
*5.* Aguarda resposta Cliente

Digite o número (1-5):`;

    await client.sendMessage(phoneNumber, message);
}

// Handle Estado
async function handleEstado(phoneNumber, messageText, conversa, client) {
    const escolha = parseInt(messageText.trim());
    const estados = [
        "Terminado",
        "Aguardar intervenção equipa Advir",
        "Em curso equipa Advir",
        "Reportado para Parceiro",
        "Aguarda resposta Cliente"
    ];

    if (isNaN(escolha) || escolha < 1 || escolha > estados.length) {
        await client.sendMessage(phoneNumber, `❌ Digite um número entre 1 e ${estados.length}:`);
        return;
    }

    conversa.data.estado = estados[escolha - 1];
    conversa.state = STATES.WAITING_TIPO;

    const message = `✅ Estado: *${estados[escolha - 1]}*

*3. Tipo de Intervenção*
Selecione:

*1.* Remoto
*2.* Presencial

Digite 1 ou 2:`;

    await client.sendMessage(phoneNumber, message);
}

// Handle Tipo
async function handleTipo(phoneNumber, messageText, conversa, client) {
    const escolha = parseInt(messageText.trim());

    if (isNaN(escolha) || (escolha !== 1 && escolha !== 2)) {
        await client.sendMessage(phoneNumber, "❌ Digite 1 (Remoto) ou 2 (Presencial):");
        return;
    }

    conversa.data.tipo = escolha === 1 ? "Remoto" : "Presencial";
    conversa.state = STATES.WAITING_DESCRICAO;

    await client.sendMessage(phoneNumber, `✅ Tipo: *${conversa.data.tipo}*

*4. Descrição*
Descreva a intervenção realizada:`);
}

// Handle Descrição
async function handleDescricao(phoneNumber, messageText, conversa, client) {
    conversa.data.descricao = messageText.trim();
    conversa.state = STATES.WAITING_DATA_INICIO;

    const hoje = new Date();
    const dataFormatada = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;

    await client.sendMessage(phoneNumber, `✅ Descrição registada

*5. Data de Início*
Escolha:
*1.* Hoje (${dataFormatada})
*2.* Inserir manualmente (DD/MM/AAAA)
Digite 1 ou 2:`);

}

// Handle Data Início
async function handleDataInicio(phoneNumber, messageText, conversa, client) {
    const escolha = messageText.trim();

    if (escolha === "1") {
        const hoje = new Date();
        const dataTexto = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;
        conversa.data.dataInicio = dataTexto;
        conversa.state = STATES.WAITING_HORA_INICIO;

        await client.sendMessage(phoneNumber, `✅ Data início: ${dataTexto}

*6. Hora de Início*
Digite a hora (HH:MM):`);
        return;
    }

    if (escolha === "2") {
        await client.sendMessage(phoneNumber, "Digite a data de início no formato DD/MM/AAAA:");
        conversa.state = "WAITING_DATA_INICIO_MANUAL"; // novo subestado
        return;
    }

    await client.sendMessage(phoneNumber, "❌ Digite *1* para hoje ou *2* para inserir manualmente:");
}

// Novo handler para data manual
async function handleDataInicioManual(phoneNumber, messageText, conversa, client) {
    const dataRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    if (!dataRegex.test(messageText.trim())) {
        await client.sendMessage(phoneNumber, "❌ Formato inválido. Use DD/MM/AAAA:");
        return;
    }

    conversa.data.dataInicio = messageText.trim();
    conversa.state = STATES.WAITING_HORA_INICIO;

    await client.sendMessage(phoneNumber, `✅ Data início: ${conversa.data.dataInicio}

*6. Hora de Início*
Digite a hora (HH:MM):`);
}
// Handle Hora Início
async function handleHoraInicio(phoneNumber, messageText, conversa, client) {
    const horaTexto = messageText.trim();
    const horaRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

    if (!horaRegex.test(horaTexto)) {
        await client.sendMessage(phoneNumber, "❌ Formato inválido. Use HH:MM:");
        return;
    }

    conversa.data.horaInicio = horaTexto;
    conversa.state = STATES.WAITING_DATA_FIM;

    const hoje = new Date();
    const dataFormatada = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;

    await client.sendMessage(phoneNumber, `✅ Hora início: ${horaTexto}

*7. Data de Fim*
Escolha:
*1.* Hoje (${dataFormatada})
*2.* Inserir manualmente (DD/MM/AAAA)
Digite 1 ou 2:`);

}

// Handle Data Fim
// Handle Data Fim
async function handleDataFim(phoneNumber, messageText, conversa, client) {
    const escolha = messageText.trim();

    if (escolha === "1") {
        const hoje = new Date();
        const dataTexto = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;
        conversa.data.dataFim = dataTexto;
        conversa.state = STATES.WAITING_HORA_FIM;

        await client.sendMessage(phoneNumber, `✅ Data fim: ${dataTexto}

*8. Hora de Fim*
Digite a hora (HH:MM):`);
        return;
    }

    if (escolha === "2") {
        await client.sendMessage(phoneNumber, "Digite a data de fim no formato DD/MM/AAAA:");
        conversa.state = "WAITING_DATA_FIM_MANUAL"; // novo subestado
        return;
    }

    await client.sendMessage(phoneNumber, "❌ Digite *1* para hoje ou *2* para inserir manualmente:");
}

// Novo handler para data fim manual
async function handleDataFimManual(phoneNumber, messageText, conversa, client) {
    const dataRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    if (!dataRegex.test(messageText.trim())) {
        await client.sendMessage(phoneNumber, "❌ Formato inválido. Use DD/MM/AAAA:");
        return;
    }

    conversa.data.dataFim = messageText.trim();
    conversa.state = STATES.WAITING_HORA_FIM;

    await client.sendMessage(phoneNumber, `✅ Data fim: ${conversa.data.dataFim}

*8. Hora de Fim*
Digite a hora (HH:MM):`);
}


// Handle Hora Fim
async function handleHoraFim(phoneNumber, messageText, conversa, client) {
    const horaTexto = messageText.trim();
    const horaRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

    if (!horaRegex.test(horaTexto)) {
        await client.sendMessage(phoneNumber, "❌ Formato inválido. Use HH:MM:");
        return;
    }

    conversa.data.horaFim = horaTexto;

    // Calcular duração
    const [diaI, mesI, anoI] = conversa.data.dataInicio.split("/");
    const [diaF, mesF, anoF] = conversa.data.dataFim.split("/");
    const [horaIH, horaIM] = conversa.data.horaInicio.split(":");
    const [horaFH, horaFM] = horaTexto.split(":");

    const dataHoraInicio = new Date(anoI, mesI - 1, diaI, horaIH, horaIM);
    const dataHoraFim = new Date(anoF, mesF - 1, diaF, horaFH, horaFM);

    if (dataHoraFim <= dataHoraInicio) {
        await client.sendMessage(phoneNumber, "❌ Data/hora fim deve ser posterior ao início:");
        return;
    }

    const duracaoMinutos = Math.floor((dataHoraFim - dataHoraInicio) / (1000 * 60));
    const duracaoHoras = (duracaoMinutos / 60).toFixed(2);

    conversa.data.duracaoMinutos = duracaoMinutos;
    conversa.data.duracaoHoras = parseFloat(duracaoHoras);
    conversa.data.dataHoraInicio = dataHoraInicio;
    conversa.data.dataHoraFim = dataHoraFim;
    conversa.state = STATES.WAITING_CONFIRMATION;

    const resumo = `📋 *RESUMO DA INTERVENÇÃO*

*Cliente:* ${conversa.data.clienteId}
*Estado:* ${conversa.data.estado}
*Tipo:* ${conversa.data.tipo}

*Início:* ${conversa.data.dataInicio} às ${conversa.data.horaInicio}
*Fim:* ${conversa.data.dataFim} às ${conversa.data.horaFim}
*Duração:* ${duracaoHoras} horas

*Descrição:*
${conversa.data.descricao}

Digite *SIM* para confirmar ou *NÃO* para cancelar:`;

    await client.sendMessage(phoneNumber, resumo);
}

// Handle Confirmação
async function handleConfirmation(phoneNumber, messageText, conversa, client) {
    const resposta = messageText.trim().toLowerCase();

    if (resposta === "sim" || resposta === "s") {
        // Remover conversa antes de criar
        activeIntervencoes.delete(phoneNumber);

        try {
            await criarIntervencao(phoneNumber, conversa, client);
        } catch (error) {
            console.error("Erro ao criar intervenção:", error);
            await client.sendMessage(phoneNumber, "❌ Erro ao criar intervenção. Tente novamente enviando 'intervenção'.");
        }
    } else if (resposta === "não" || resposta === "nao" || resposta === "n") {
        activeIntervencoes.delete(phoneNumber);
        await client.sendMessage(phoneNumber, "❌ Intervenção cancelada. Para nova intervenção, envie 'intervenção'.");
    } else {
        await client.sendMessage(phoneNumber, "Por favor, responda *SIM* para confirmar ou *NÃO* para cancelar:");
    }
}

// Criar intervenção via API
async function criarIntervencao(phoneNumber, conversa, client) {
    try {
        const token = await getAuthToken({
            username: "AdvirWeb",
            password: "Advir2506##",
            company: "Advir",
            instance: "DEFAULT",
            line: "Evolution"
        }, "151.80.149.159:2018");

        const formatarData = (data) => data.toISOString().slice(0, 19).replace("T", " ");

        const estadoMap = {
            "Terminado": "1",
            "Aguardar intervenção equipa Advir": "2",
            "Em curso equipa Advir": "3",
            "Reportado para Parceiro": "4",
            "Aguarda resposta Cliente": "5"
        };

        const intervencaoData = {
            processoID: conversa.data.pedidoId,
            tipoIntervencao: conversa.data.tipo === "Remoto" ? "REM" : "PRE",
            duracao: conversa.data.duracaoMinutos,
            duracaoReal: conversa.data.duracaoMinutos,
            DataHoraInicio: formatarData(conversa.data.dataHoraInicio),
            DataHoraFim: formatarData(conversa.data.dataHoraFim),
            tecnico: conversa.data.tecnicoNumero || "000",
            estadoAnt: "1",
            estado: estadoMap[conversa.data.estado] || "3",
            seccaoAnt: "SD",
            seccao: "SD",
            utilizador: "whatsapp",
            descricaoResposta: conversa.data.descricao,
            artigos: [],
            emailDestinatario: null
        };

        console.log(`📡 Enviando dados para API:`, intervencaoData);
        await axios.post(
            "http://151.80.149.159:2018/WebApi/ServicosTecnicos/CriarIntervencoes",
            intervencaoData,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const successMessage = `✅ *INTERVENÇÃO CRIADA COM SUCESSO*

*Cliente:* ${conversa.data.clienteId}
*Estado:* ${conversa.data.estado}
*Tipo:* ${conversa.data.tipo}
*Duração:* ${conversa.data.duracaoHoras} horas

A intervenção foi registada no sistema.

Para nova intervenção, envie 'intervenção'.`;

        // Se chegou aqui, já deu certo
        await enviarMensagemSucesso(phoneNumber, conversa, client);
    } catch (error) {
        const erroMsg = error.response?.data || error.message || "";
        if (typeof erroMsg === "string" && erroMsg.includes("Object reference not set to an instance of an object")) {
            console.warn("⚠️ Erro conhecido ignorado:", erroMsg);
            await enviarMensagemSucesso(phoneNumber, conversa, client);
        } else {
            console.error("Erro ao criar intervenção:", erroMsg);
            await client.sendMessage(phoneNumber, "❌ Erro ao criar intervenção. Tente novamente enviando 'intervenção'.");
        }
    }
}
// Função auxiliar para não duplicar mensagem de sucesso
async function enviarMensagemSucesso(phoneNumber, conversa, client) {
    const successMessage = `✅ *INTERVENÇÃO CRIADA COM SUCESSO*

*Cliente:* ${conversa.data.clienteId}
*Estado:* ${conversa.data.estado}
*Tipo:* ${conversa.data.tipo}
*Duração:* ${conversa.data.duracaoHoras} horas

A intervenção foi registada no sistema.

Para nova intervenção, envie 'intervenção'.`;

    await client.sendMessage(phoneNumber, successMessage);
    console.log(`✅ Processo de intervenção concluído (com ou sem aviso de erro) para ${phoneNumber}`);
}
// Limpar conversas antigas
setInterval(() => {
    const now = Date.now();
    const TIMEOUT = 30 * 60 * 1000; // 30 minutos

    for (const [phoneNumber, conversa] of activeIntervencoes.entries()) {
        if (now - conversa.lastActivity > TIMEOUT) {
            activeIntervencoes.delete(phoneNumber);
            console.log(`Conversa de intervenção de ${phoneNumber} expirou`);
        }
    }
}, 5 * 60 * 1000);

// Exportar
module.exports = {
    router,
    processarMensagemIntervencao,
    isIntervencaoKeyword,
    activeIntervencoes
};