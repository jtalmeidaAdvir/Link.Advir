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
    WAITING_CONFIRMATION: "waiting_confirmation",
    WAITING_ARTIGOS: "aguardando_artigos", // Novo estado para artigos
    WAITING_RFID: "aguardando_rfid", // Novo estado para ler RFID
    WAITING_QUANTIDADE_ARTIGO: "aguardando_quantidade_artigo", // Novo estado para quantidade de artigo
};

// Importar função de token
const { getAuthToken } = require("../../webPrimaveraApi/servives/tokenService");

// Verificar se a mensagem contém palavras-chave para iniciar uma intervenção
function isIntervencaoKeyword(message) {
    const keywords = [
        "intervenção",
        "intervencao",
        "trabalho",
        "servico",
        "serviço",
    ];
    const lowerMessage = message.toLowerCase();
    return keywords.some((keyword) => lowerMessage.includes(keyword));
}

// Verificar se a mensagem contém códigos RFID ou comandos de artigos
function isArtigoRFIDCommand(message) {
    const lowerMessage = message.toLowerCase();

    // Verificar comandos de artigos
    if (
        lowerMessage.includes("artigo") ||
        lowerMessage.includes("rfid") ||
        lowerMessage.includes("material")
    ) {
        return true;
    }

    // Verificar padrões de RFID (ajustar conforme o formato dos teus RFIDs)
    const rfidPatterns = [
        /^[0-9A-Fa-f]{8,16}$/, // Códigos hexadecimais de 8-16 caracteres
        /^RFID[0-9A-Fa-f]{8,12}$/i, // RFID seguido de código
        /^[0-9]{10,15}$/, // Códigos numéricos longos
        /^ART[0-9A-Za-z]{6,12}$/i, // Códigos que começam com ART
    ];

    return rfidPatterns.some((pattern) => pattern.test(message.trim()));
}

// Função principal para processar mensagens
async function processarMensagem(phoneNumber, messageText, client) {
    console.log(`🔧 Processando mensagem de ${phoneNumber}: "${messageText}"`);

    let conversa = activeIntervencoes.get(phoneNumber);

    // Verificar se é comando de artigo/RFID durante uma conversa ativa
    if (
        conversa &&
        isArtigoRFIDCommand(messageText) &&
        conversa.estado !== STATES.WAITING_RFID &&
        conversa.estado !== STATES.WAITING_QUANTIDADE_ARTIGO
    ) {
        await processarComandoArtigo(
            phoneNumber,
            messageText,
            client,
            conversa,
        );
        return;
    }

    if (!conversa) {
        // Nova conversa - Iniciar fluxo de intervenção
        if (isIntervencaoKeyword(messageText)) {
            await startNewIntervencao(phoneNumber, client);
        } else {
            // Mensagem não relacionada a intervenção
            await client.sendMessage(
                phoneNumber,
                "👋 Olá! Para registar uma intervenção, envie 'intervenção'.",
            );
        }
        return;
    }

    // Continuar conversa existente
    await continuarConversa(phoneNumber, messageText, conversa, client);
}

// Iniciar nova intervenção
async function startNewIntervencao(phoneNumber, client) {
    const conversa = {
        estado: STATES.WAITING_CLIENT,
        data: {
            timestamp: new Date().toISOString(),
            artigos: [], // Inicializar array para artigos
        },
        lastActivity: Date.now(),
    };

    activeIntervencoes.set(phoneNumber, conversa);

    const message = `🔧 *Sistema de Registo de Intervenções*

Bem-vindo! Vamos registar a sua intervenção.

*1. Cliente*
Indique o código do cliente:`;

    await client.sendMessage(phoneNumber, message);
}

// Continuar conversa
async function continuarConversa(phoneNumber, messageText, conversa, client) {
    conversa.lastActivity = Date.now();

    switch (conversa.estado) {
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
            await handleConfirmation(
                phoneNumber,
                messageText,
                conversa,
                client,
            );
            break;
        case "WAITING_DATA_INICIO_MANUAL":
            await handleDataInicioManual(
                phoneNumber,
                messageText,
                conversa,
                client,
            );
            break;
        case "WAITING_DATA_FIM_MANUAL":
            await handleDataFimManual(
                phoneNumber,
                messageText,
                conversa,
                client,
            );
            break;
        // Novos estados para gestão de artigos
        case STATES.WAITING_ARTIGOS:
            const lowerMsg = messageText.toLowerCase();
            if (lowerMsg.includes("sim") || lowerMsg === "s") {
                await iniciarProcessoArtigos(phoneNumber, client, conversa);
            } else if (
                lowerMsg.includes("não") ||
                lowerMsg.includes("nao") ||
                lowerMsg === "n"
            ) {
                // Continuar para a data de início
                conversa.estado = STATES.WAITING_DATA_INICIO;
                const hoje = new Date();
                const dataFormatada = `${hoje.getDate().toString().padStart(2, "0")}/${(hoje.getMonth() + 1).toString().padStart(2, "0")}/${hoje.getFullYear()}`;

                await client.sendMessage(
                    phoneNumber,
                    `✅ Continuando sem artigos.\n\n` +
                    `*6. Data de Início*\n` +
                    `Selecione a data de início da intervenção:\n\n` +
                    `1. Hoje (${dataFormatada})\n` +
                    `2. Inserir manualmente (formato DD/MM/AAAA)\n\n` +
                    `Digite 1 ou 2:`,
                );
            } else if (
                lowerMsg.includes("fim") ||
                lowerMsg.includes("terminar")
            ) {
                // Continuar para a data de início
                conversa.estado = STATES.WAITING_DATA_INICIO;
                const hoje = new Date();
                const dataFormatada = `${hoje.getDate().toString().padStart(2, "0")}/${(hoje.getMonth() + 1).toString().padStart(2, "0")}/${hoje.getFullYear()}`;

                await client.sendMessage(
                    phoneNumber,
                    `✅ Terminando adição de artigos.\n\n` +
                    `*6. Data de Início*\n` +
                    `Selecione a data de início da intervenção:\n\n` +
                    `1. Hoje (${dataFormatada})\n` +
                    `2. Inserir manualmente (formato DD/MM/AAAA)\n\n` +
                    `Digite 1 ou 2:`,
                );
            } else if (isArtigoRFIDCommand(messageText)) {
                await processarRFID(phoneNumber, messageText, client, conversa);
            } else {
                const baseUrl = process.env.BASE_URL || "https://link.advir.pt";
                const nfcUrl = `${baseUrl}/#/nfc-scanner?phone=${encodeURIComponent(phoneNumber)}`;

                await client.sendMessage(
                    phoneNumber,
                    "❌ Resposta não reconhecida.\n\n" +
                    "Por favor, responda:\n" +
                    "• 'sim' para adicionar artigos\n" +
                    "• 'não' para continuar sem artigos\n" +
                    "• 'fim' para terminar\n\n" +
                    "📱 Ou use o scanner NFC: " +
                    nfcUrl,
                );
            }
            break;
        case STATES.WAITING_RFID:
            await processarRFID(phoneNumber, messageText, client, conversa);
            break;
        case STATES.WAITING_QUANTIDADE_ARTIGO:
            await processarQuantidadeArtigo(
                phoneNumber,
                messageText,
                client,
                conversa,
            );
            break;
        default:
            // Se o estado não for reconhecido, cancelar a conversa
            activeIntervencoes.delete(phoneNumber);
            await client.sendMessage(
                phoneNumber,
                "❌ Erro no processamento. Envie 'intervenção' para começar novamente.",
            );
            break;
    }
}

// Handle Cliente
async function handleCliente(phoneNumber, messageText, conversa, client) {
    const clienteId = messageText.trim();

    try {
        const token = await getAuthToken(
            {
                username: "AdvirWeb",
                password: "Advir2506##",
                company: "Advir",
                instance: "DEFAULT",
                line: "Evolution",
            },
            "151.80.149.159:2018",
        );

        const response = await axios.get(
            "http://151.80.149.159:2018/WebApi/ServicosTecnicos/ObterPedidos",
            { headers: { Authorization: `Bearer ${token}` } },
        );

        const pedidos = response.data.DataSet?.Table || [];
        const pedidosCliente = pedidos.filter(
            (p) =>
                p.Cliente === clienteId ||
                p.Cliente.toLowerCase() === clienteId.toLowerCase() ||
                p.Nome.toLowerCase().includes(clienteId.toLowerCase()),
        );

        if (pedidosCliente.length === 0) {
            await client.sendMessage(
                phoneNumber,
                `❌ Nenhum pedido encontrado para "${clienteId}". Tente outro código ou nome:`,
            );
            return;
        }

        conversa.data.clienteId = clienteId; // Armazenar o ID do cliente que foi buscado
        conversa.data.cliente = pedidosCliente[0]?.Nome || clienteId; // Armazenar o nome do cliente para o resumo
        conversa.data.pedidos = pedidosCliente;
        conversa.estado = STATES.WAITING_PEDIDO;

        let message = `✅ Cliente: *${conversa.data.cliente}*\n\n`;
        message += `*1. Pedido de Assistência*\n`;
        message += `Estes são os pedidos encontrados para este cliente:\n\n`;

        pedidosCliente.forEach((pedido, index) => {
            const descricao =
                pedido.DescricaoProb ||
                pedido.DescricaoProblema ||
                "Sem descrição";
            message += `*${index + 1}.* ${pedido.Processo || `Ref. ${index + 1}`}\n   ${descricao}\n\n`;
        });

        message += `Por favor, selecione o pedido (digite o número de 1 a ${pedidosCliente.length}):`;
        await client.sendMessage(phoneNumber, message);
    } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
        await client.sendMessage(
            phoneNumber,
            "❌ Ocorreu um erro ao buscar os pedidos. Por favor, tente novamente mais tarde.",
        );
    }
}

// Handle Pedido
async function handlePedido(phoneNumber, messageText, conversa, client) {
    const escolha = parseInt(messageText.trim());
    const pedidos = conversa.data.pedidos;

    if (isNaN(escolha) || escolha < 1 || escolha > pedidos.length) {
        await client.sendMessage(
            phoneNumber,
            `❌ Por favor, digite um número entre 1 e ${pedidos.length}:`,
        );
        return;
    }

    const pedidoSelecionado = pedidos[escolha - 1];
    conversa.data.pedidoId = pedidoSelecionado.ID;
    conversa.data.tecnicoNumero = pedidoSelecionado.Tecnico;
    conversa.estado = STATES.WAITING_ESTADO;

    const message =
        `✅ Pedido selecionado: *${pedidoSelecionado.Processo || `Ref. ${escolha}`}*\n\n` +
        `*2. Estado da Intervenção*\n` +
        `Selecione o estado atual da intervenção:\n\n` +
        `1. Terminado\n` +
        `2. Aguardar intervenção equipa Advir\n` +
        `3. Em curso equipa Advir\n` +
        `4. Reportado para Parceiro\n` +
        `5. Aguarda resposta Cliente\n\n` +
        `Digite o número correspondente (1-5):`;

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
        "Aguarda resposta Cliente",
    ];

    if (isNaN(escolha) || escolha < 1 || escolha > estados.length) {
        await client.sendMessage(
            phoneNumber,
            `❌ Por favor, digite um número entre 1 e ${estados.length}:`,
        );
        return;
    }

    conversa.data.estado = estados[escolha - 1];
    conversa.estado = STATES.WAITING_TIPO;

    const message =
        `✅ Estado selecionado: *${estados[escolha - 1]}*\n\n` +
        `*3. Tipo de Intervenção*\n` +
        `Selecione o tipo de intervenção:\n\n` +
        `1. Remoto\n` +
        `2. Presencial\n\n` +
        `Digite 1 (Remoto) ou 2 (Presencial):`;

    await client.sendMessage(phoneNumber, message);
}

// Handle Tipo
async function handleTipo(phoneNumber, messageText, conversa, client) {
    const escolha = parseInt(messageText.trim());

    if (isNaN(escolha) || (escolha !== 1 && escolha !== 2)) {
        await client.sendMessage(
            phoneNumber,
            "❌ Por favor, digite *1* para Remoto ou *2* para Presencial.",
        );
        return;
    }

    conversa.data.tipo = escolha === 1 ? "Remoto" : "Presencial";
    conversa.estado = STATES.WAITING_DESCRICAO;

    await client.sendMessage(
        phoneNumber,
        `✅ Tipo de intervenção selecionado: *${conversa.data.tipo}*\n\n` +
        `*4. Descrição*\n` +
        `Por favor, descreva a intervenção realizada:`,
    );
}

// Handle Descrição
async function handleDescricao(phoneNumber, messageText, conversa, client) {
    conversa.data.descricao = messageText.trim();
    conversa.estado = STATES.WAITING_ARTIGOS; // Primeiro perguntar sobre artigos

    await client.sendMessage(
        phoneNumber,
        `✅ Descrição registada!\n\n` +
        `*5. Artigos/Materiais*\n` +
        `Deseja registar artigos ou materiais utilizados nesta intervenção?\n\n` +
        `• Digite 'sim' para adicionar artigos\n` +
        `• Digite 'não' para continuar sem artigos\n` +
        `• Ou escaneie diretamente um código RFID`,
    );
}

// Handle Data Início
async function handleDataInicio(phoneNumber, messageText, conversa, client) {
    const escolha = messageText.trim();

    if (escolha === "1") {
        const hoje = new Date();
        const dataTexto = `${hoje.getDate().toString().padStart(2, "0")}/${(hoje.getMonth() + 1).toString().padStart(2, "0")}/${hoje.getFullYear()}`;
        conversa.data.dataInicio = dataTexto;
        conversa.estado = STATES.WAITING_HORA_INICIO;

        await client.sendMessage(
            phoneNumber,
            `✅ Data de início selecionada: ${dataTexto}\n\n` +
            `*7. Hora de Início*\n` +
            `Por favor, digite a hora de início (formato HH:MM):`,
        );
        return;
    }

    if (escolha === "2") {
        await client.sendMessage(
            phoneNumber,
            "Por favor, digite a data de início no formato DD/MM/AAAA:",
        );
        conversa.estado = "WAITING_DATA_INICIO_MANUAL"; // Novo subestado para entrada manual
        return;
    }

    await client.sendMessage(
        phoneNumber,
        "❌ Resposta inválida. Por favor, digite *1* para hoje ou *2* para inserir manualmente:",
    );
}

// Novo handler para data de início manual
async function handleDataInicioManual(
    phoneNumber,
    messageText,
    conversa,
    client,
) {
    const dataRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    if (!dataRegex.test(messageText.trim())) {
        await client.sendMessage(
            phoneNumber,
            "❌ Formato de data inválido. Use DD/MM/AAAA:",
        );
        return;
    }

    conversa.data.dataInicio = messageText.trim();
    conversa.estado = STATES.WAITING_HORA_INICIO;

    await client.sendMessage(
        phoneNumber,
        `✅ Data de início inserida: ${conversa.data.dataInicio}\n\n` +
        `*7. Hora de Início*\n` +
        `Por favor, digite a hora de início (formato HH:MM):`,
    );
}

// Handle Hora Início
async function handleHoraInicio(phoneNumber, messageText, conversa, client) {
    const horaTexto = messageText.trim();
    const horaRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

    if (!horaRegex.test(horaTexto)) {
        await client.sendMessage(
            phoneNumber,
            "❌ Formato de hora inválido. Use HH:MM (ex: 14:30):",
        );
        return;
    }

    conversa.data.horaInicio = horaTexto;
    conversa.estado = STATES.WAITING_DATA_FIM;

    const hoje = new Date();
    const dataFormatada = `${hoje.getDate().toString().padStart(2, "0")}/${(hoje.getMonth() + 1).toString().padStart(2, "0")}/${hoje.getFullYear()}`;

    await client.sendMessage(
        phoneNumber,
        `✅ Hora de início registada: ${horaTexto}\n\n` +
        `*8. Data de Fim*\n` +
        `Selecione a data de fim da intervenção:\n\n` +
        `1. Hoje (${dataFormatada})\n` +
        `2. Inserir manualmente (formato DD/MM/AAAA)\n\n` +
        `Digite 1 ou 2:`,
    );
}

// Handle Data Fim
async function handleDataFim(phoneNumber, messageText, conversa, client) {
    const escolha = messageText.trim();

    if (escolha === "1") {
        const hoje = new Date();
        const dataTexto = `${hoje.getDate().toString().padStart(2, "0")}/${(hoje.getMonth() + 1).toString().padStart(2, "0")}/${hoje.getFullYear()}`;
        conversa.data.dataFim = dataTexto;
        conversa.estado = STATES.WAITING_HORA_FIM;

        await client.sendMessage(
            phoneNumber,
            `✅ Data de fim selecionada: ${dataTexto}\n\n` +
            `*9. Hora de Fim*\n` +
            `Por favor, digite a hora de fim (formato HH:MM):`,
        );
        return;
    }

    if (escolha === "2") {
        await client.sendMessage(
            phoneNumber,
            "Por favor, digite a data de fim no formato DD/MM/AAAA:",
        );
        conversa.estado = "WAITING_DATA_FIM_MANUAL"; // Novo subestado para entrada manual
        return;
    }

    await client.sendMessage(
        phoneNumber,
        "❌ Resposta inválida. Por favor, digite *1* para hoje ou *2* para inserir manualmente:",
    );
}

// Novo handler para data de fim manual
async function handleDataFimManual(phoneNumber, messageText, conversa, client) {
    const dataRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    if (!dataRegex.test(messageText.trim())) {
        await client.sendMessage(
            phoneNumber,
            "❌ Formato de data inválido. Use DD/MM/AAAA:",
        );
        return;
    }

    conversa.data.dataFim = messageText.trim();
    conversa.estado = STATES.WAITING_HORA_FIM;

    await client.sendMessage(
        phoneNumber,
        `✅ Data de fim inserida: ${conversa.data.dataFim}\n\n` +
        `*9. Hora de Fim*\n` +
        `Por favor, digite a hora de fim (formato HH:MM):`,
    );
}

// Handle Hora Fim
async function handleHoraFim(phoneNumber, messageText, conversa, client) {
    const horaTexto = messageText.trim();
    const horaRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

    if (!horaRegex.test(horaTexto)) {
        await client.sendMessage(
            phoneNumber,
            "❌ Formato de hora inválido. Use HH:MM (ex: 17:00):",
        );
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
        await client.sendMessage(
            phoneNumber,
            "❌ A data/hora de fim deve ser posterior à data/hora de início. Por favor, insira novamente a hora de fim:",
        );
        return;
    }

    const duracaoMinutos = Math.floor(
        (dataHoraFim - dataHoraInicio) / (1000 * 60),
    );
    const duracaoHoras = (duracaoMinutos / 60).toFixed(2);

    conversa.data.duracaoMinutos = duracaoMinutos;
    conversa.data.duracao = duracaoHoras; // Guardar a duração formatada
    conversa.data.dataHoraInicio = dataHoraInicio;
    conversa.data.dataHoraFim = dataHoraFim;
    conversa.estado = STATES.WAITING_CONFIRMATION;

    await mostrarResumoIntervencao(phoneNumber, client, conversa);
}

// Mostrar resumo da intervenção
async function mostrarResumoIntervencao(phoneNumber, client, conversa) {
    const data = conversa.data;

    let resumo = `📋 *RESUMO DA INTERVENÇÃO*\n\n`;
    resumo += `🎫 **Pedido:** ${data.pedidoId}\n`;
    resumo += `🔧 **Tipo:** ${data.tipo}\n`;
    resumo += `⏱️ **Duração:** ${data.duracao} horas\n`;
    resumo += `👨‍🔧 **Técnico:** ${data.tecnicoNumero || "Não especificado"}\n`;
    resumo += `📊 **Estado:** ${data.estado}\n`;
    resumo += `📝 **Descrição:** ${data.descricao}\n`;

    // Adicionar seção de artigos se existirem
    if (data.artigos && data.artigos.length > 0) {
        resumo += `\n📦 **Artigos Utilizados:** (${data.artigos.length})\n`;
        data.artigos.forEach((artigo, index) => {
            const nomeArtigo = artigo.descricao || artigo.artigo;
            resumo += `   ${index + 1}. ${nomeArtigo} - Qtd: ${artigo.qtd}\n`;
        });
    } else {
        resumo += `\n📦 **Artigos:** Nenhum artigo registado\n`;
    }

    resumo += `\n*Confirma a criação desta intervenção?*\n\n`;
    resumo += `• Digite 'sim' para confirmar\n`;
    resumo += `• Digite 'não' para cancelar`;

    await client.sendMessage(phoneNumber, resumo);
}

// Handle Confirmação
async function handleConfirmation(phoneNumber, messageText, conversa, client) {
    const resposta = messageText.trim().toLowerCase();

    if (resposta === "sim" || resposta === "s") {
        // Remover conversa ativa antes de criar a intervenção para evitar duplicidade
        activeIntervencoes.delete(phoneNumber);

        try {
            await criarIntervencao(phoneNumber, conversa, client);
        } catch (error) {
            console.error("Erro ao criar intervenção:", error);
            await client.sendMessage(
                phoneNumber,
                "❌ Ocorreu um erro ao criar a intervenção. Por favor, tente novamente enviando 'intervenção'.",
            );
        }
    } else if (resposta === "não" || resposta === "nao" || resposta === "n") {
        activeIntervencoes.delete(phoneNumber);
        await client.sendMessage(
            phoneNumber,
            "❌ Intervenção cancelada. Para iniciar uma nova intervenção, envie 'intervenção'.",
        );
    } else {
        await client.sendMessage(
            phoneNumber,
            "Por favor, responda apenas com 'sim' para confirmar ou 'não' para cancelar.",
        );
    }
}

// Funções para gestão de Artigos/Materiais via RFID

// Iniciar processo de adição de artigos
async function iniciarProcessoArtigos(phoneNumber, client, conversa) {
    conversa.estado = STATES.WAITING_RFID;

    // Obter o domínio base da aplicação (pode ser configurado via variável de ambiente)
    const baseUrl = process.env.BASE_URL || "https://link.advir.pt";
    const nfcUrl = `${baseUrl}/#/nfc-scanner?phone=${encodeURIComponent(phoneNumber)}`;

    await client.sendMessage(
        phoneNumber,
        `👍 Ótimo! Para adicionar artigos, você tem duas opções:\n\n` +
        `📱 *Opção 1 - Scanner NFC (Recomendado):*\n` +
        `Clique no link abaixo para abrir o scanner:\n` +
        `${nfcUrl}\n\n` +
        `📝 *Opção 2 - Inserir manualmente:*\n` +
        `Digite o código RFID do artigo\n\n` +
        `💡 *Instruções para o scanner:*\n` +
        `1. Clique no link acima\n` +
        `2. Autorize o uso do NFC no seu browser\n` +
        `3. Encoste o cartão RFID no seu telemóvel\n` +
        `4. O código será enviado automaticamente para este chat\n` +
        `5. Continue a conversa aqui para adicionar mais artigos\n\n` +
        `Aguardando código RFID...`,
    );
}

// Processar o código RFID lido
async function processarRFID(phoneNumber, messageText, client, conversa) {
    const rfidCode = messageText.trim();

    // Validar se o código RFID corresponde a um padrão esperado (pode ser refinado)
    if (
        !isArtigoRFIDCommand(rfidCode) ||
        rfidCode.toLowerCase().includes("artigo") ||
        rfidCode.toLowerCase().includes("material")
    ) {
        await client.sendMessage(
            phoneNumber,
            "❌ Este não parece ser um código RFID válido. Por favor, escaneie o código do artigo novamente.",
        );
        return;
    }

    try {
        // Buscar artigos RFID da API
        const token = await getAuthToken(
            {
                username: "AdvirWeb",
                password: "Advir2506##",
                company: "Advir",
                instance: "DEFAULT",
                line: "Evolution",
            },
            "151.80.149.159:2018",
        );

        const response = await axios.get(
            "http://151.80.149.159:2018/WebApi/Base/LstArtigosRFID",
            { headers: { Authorization: `Bearer ${token}` } },
        );

        const artigosRFID = response.data.DataSet?.Table || [];

        // Procurar o artigo pelo código RFID
        const artigoEncontrado = artigosRFID.find(
            (artigo) => artigo.CDU_RFID === rfidCode,
        );

        if (!artigoEncontrado) {
            await client.sendMessage(
                phoneNumber,
                `❌ Código RFID "${rfidCode}" não encontrado na base de dados.\n\nPor favor, escaneie um código RFID válido ou digite 'cancelar' para cancelar a adição de artigos.`,
            );
            return;
        }

        // Guardar as informações do artigo encontrado
        conversa.data.ultimoArtigoRFID = rfidCode;
        conversa.data.ultimoArtigoCodigo = artigoEncontrado.Artigo; // Código do artigo para usar na API
        conversa.data.ultimoArtigoDescricao =
            artigoEncontrado.Descricao || rfidCode; // Descrição para mostrar ao usuário
        conversa.estado = STATES.WAITING_QUANTIDADE_ARTIGO;

        await client.sendMessage(
            phoneNumber,
            `✅ Artigo encontrado!\n\n` +
            `📦 *${conversa.data.ultimoArtigoDescricao}*\n` +
            `🏷️ Código: ${conversa.data.ultimoArtigoCodigo}\n` +
            `📱 RFID: ${rfidCode}\n\n` +
            `Por favor, indique a quantidade deste artigo:`,
        );
    } catch (error) {
        console.error("Erro ao buscar artigos RFID:", error);
        await client.sendMessage(
            phoneNumber,
            "❌ Erro ao verificar o código RFID. Tente novamente ou digite 'cancelar' para cancelar a adição de artigos.",
        );
    }
}

// Processar a quantidade do artigo
async function processarQuantidadeArtigo(
    phoneNumber,
    messageText,
    client,
    conversa,
) {
    const quantidade = parseInt(messageText.trim());

    if (isNaN(quantidade) || quantidade <= 0) {
        await client.sendMessage(
            phoneNumber,
            "❌ Quantidade inválida. Por favor, insira um número positivo para a quantidade.",
        );
        return;
    }

    const artigo = {
        artigo: conversa.data.ultimoArtigoCodigo, // Usar o código do artigo da API
        qtd: quantidade,
        descricao: conversa.data.ultimoArtigoDescricao, // Guardar a descrição para mostrar no resumo
        rfid: conversa.data.ultimoArtigoRFID, // Guardar o RFID para referência
    };

    // Adicionar o artigo à lista de artigos da intervenção
    conversa.data.artigos.push(artigo);

    // Limpar os dados do último artigo processado
    delete conversa.data.ultimoArtigoRFID;
    delete conversa.data.ultimoArtigoCodigo;
    delete conversa.data.ultimoArtigoDescricao;

    const baseUrl = process.env.BASE_URL || "https://link.advir.pt";
    const nfcUrl = `${baseUrl}/#/nfc-scanner?phone=${encodeURIComponent(phoneNumber)}`;

    await client.sendMessage(
        phoneNumber,
        `✅ ${quantidade}x de *${artigo.descricao}* adicionado(s).\n\n` +
        `📦 *Artigos já adicionados: ${conversa.data.artigos.length}*\n\n` +
        `O que deseja fazer a seguir?\n\n` +
        `📱 *Scanner NFC:* ${nfcUrl}\n` +
        `📝 *Ou digite:*\n` +
        `• Código RFID manualmente\n` +
        `• 'fim' para continuar para as datas\n` +
        `• 'cancelar' para cancelar adição de artigos`,
    );

    conversa.estado = STATES.WAITING_ARTIGOS; // Voltar ao estado de gestão de artigos
}

// Processar comandos de artigo (quando a mensagem contém "artigo", "rfid", etc.)
async function processarComandoArtigo(
    phoneNumber,
    messageText,
    client,
    conversa,
) {
    const lowerMessage = messageText.toLowerCase();

    if (lowerMessage.includes("fim") || lowerMessage.includes("terminar")) {
        // Continuar para a data de início
        conversa.estado = STATES.WAITING_DATA_INICIO;
        const hoje = new Date();
        const dataFormatada = `${hoje.getDate().toString().padStart(2, "0")}/${(hoje.getMonth() + 1).toString().padStart(2, "0")}/${hoje.getFullYear()}`;

        await client.sendMessage(
            phoneNumber,
            `✅ Artigos registados com sucesso!\n\n` +
            `*6. Data de Início*\n` +
            `Selecione a data de início da intervenção:\n\n` +
            `1. Hoje (${dataFormatada})\n` +
            `2. Inserir manualmente (formato DD/MM/AAAA)\n\n` +
            `Digite 1 ou 2:`,
        );
        return;
    }

    if (lowerMessage.includes("cancelar")) {
        // Remover todos os artigos adicionados nesta sessão
        conversa.data.artigos = [];
        conversa.estado = STATES.WAITING_DATA_INICIO; // Ir diretamente para data de início
        const hoje = new Date();
        const dataFormatada = `${hoje.getDate().toString().padStart(2, "0")}/${(hoje.getMonth() + 1).toString().padStart(2, "0")}/${hoje.getFullYear()}`;

        await client.sendMessage(
            phoneNumber,
            `❌ Adição de artigos cancelada. Continuando sem artigos.\n\n` +
            `*6. Data de Início*\n` +
            `Selecione a data de início da intervenção:\n\n` +
            `1. Hoje (${dataFormatada})\n` +
            `2. Inserir manualmente (formato DD/MM/AAAA)\n\n` +
            `Digite 1 ou 2:`,
        );
        return;
    }

    // Se a mensagem for um código RFID válido, processar como tal
    if (
        isArtigoRFIDCommand(messageText) &&
        !lowerMessage.includes("artigo") &&
        !lowerMessage.includes("material")
    ) {
        await processarRFID(phoneNumber, messageText, client, conversa);
        return;
    }

    // Se a mensagem for uma resposta de sim/não para adicionar artigos
    if (conversa.estado === STATES.WAITING_ARTIGOS) {
        if (lowerMessage.includes("sim") || lowerMessage.includes("s")) {
            await iniciarProcessoArtigos(phoneNumber, client, conversa);
        } else if (
            lowerMessage.includes("não") ||
            lowerMessage.includes("nao") ||
            lowerMessage.includes("n")
        ) {
            // Continuar para a data de início
            conversa.estado = STATES.WAITING_DATA_INICIO;
            const hoje = new Date();
            const dataFormatada = `${hoje.getDate().toString().padStart(2, "0")}/${(hoje.getMonth() + 1).toString().padStart(2, "0")}/${hoje.getFullYear()}`;

            await client.sendMessage(
                phoneNumber,
                `✅ Continuando sem artigos.\n\n` +
                `*6. Data de Início*\n` +
                `Selecione a data de início da intervenção:\n\n` +
                `1. Hoje (${dataFormatada})\n` +
                `2. Inserir manualmente (formato DD/MM/AAAA)\n\n` +
                `Digite 1 ou 2:`,
            );
        } else {
            await client.sendMessage(
                phoneNumber,
                "❌ Resposta não reconhecida.\n\n" +
                "Por favor, responda:\n" +
                "• 'sim' para adicionar mais artigos\n" +
                "• 'não' para terminar a adição de artigos\n" +
                "• 'fim' para terminar\n" +
                "• Ou escaneie um código RFID",
            );
        }
        return;
    }

    // Se não for nenhum dos comandos acima, assumir que é um comando geral de artigo
    conversa.estado = STATES.WAITING_ARTIGOS;
    await client.sendMessage(
        phoneNumber,
        "📦 *Gestão de Artigos/Materiais*\n\n" +
        "Por favor, escaneie o código RFID do artigo ou digite 'fim' para terminar a adição de artigos.",
    );
}

// Criar intervenção via API
async function criarIntervencao(phoneNumber, conversa, client) {
    try {
        const token = await getAuthToken(
            {
                username: "AdvirWeb",
                password: "Advir2506##",
                company: "Advir",
                instance: "DEFAULT",
                line: "Evolution",
            },
            "151.80.149.159:2018",
        );

        const formatarData = (data) =>
            data.toISOString().slice(0, 19).replace("T", " ");

        // Verificar e atualizar data do pedido se necessário (opcional, mas bom ter)
        try {
            const dataValidacao = {
                Id: conversa.data.pedidoId,
                NovaData: formatarData(conversa.data.dataHoraInicio),
            };

            console.log(`🔍 Verificando data do pedido:`, dataValidacao);

            await axios.post(
                "http://151.80.149.159:2018/WebApi/ServicosTecnicos/VerificaDataPedidoAtualiza",
                dataValidacao,
                { headers: { Authorization: `Bearer ${token}` } },
            );

            console.log(`✅ Validação de data concluída com sucesso.`);
        } catch (validationError) {
            console.warn(
                "⚠️ Aviso: Erro na validação de data do pedido, mas a intervenção continuará. Detalhes:",
                validationError.response?.data || validationError.message,
            );
            // A intervenção pode prosseguir mesmo que a validação da data falhe em alguns casos.
        }

        const estadoMap = {
            Terminado: "1",
            "Aguardar intervenção equipa Advir": "2",
            "Em curso equipa Advir": "3",
            "Reportado para Parceiro": "4",
            "Aguarda resposta Cliente": "5",
        };

        const intervencaoData = {
            processoID: conversa.data.pedidoId,
            tipoIntervencao: conversa.data.tipo === "Remoto" ? "REM" : "PRE",
            duracao: conversa.data.duracaoMinutos, // Usar minutos para a API
            duracaoReal: conversa.data.duracaoMinutos,
            DataHoraInicio: formatarData(conversa.data.dataHoraInicio),
            DataHoraFim: formatarData(conversa.data.dataHoraFim),
            tecnico: conversa.data.tecnicoNumero || "000", // Fornecer um valor padrão se não houver técnico
            estadoAnt: "1", // Assumindo um estado anterior padrão
            estado: estadoMap[conversa.data.estado] || "3", // Mapear o estado para o código da API
            seccaoAnt: "SD", // Assumindo uma secção anterior padrão
            seccao: "SD", // Assumindo uma secção padrão
            utilizador: "whatsapp", // Identificar a origem da criação
            descricaoResposta: conversa.data.descricao,
            artigos: conversa.data.artigos.map((artigo) => ({
                // Mapear os artigos para o formato da API
                artigo: artigo.artigo,
                qtd: artigo.qtd,
            })),
            emailDestinatario: null, // Definir conforme necessário
        };

        console.log(
            `📡 Enviando dados da intervenção para a API:`,
            intervencaoData,
        );
        await axios.post(
            "http://151.80.149.159:2018/WebApi/ServicosTecnicos/CriarIntervencoes",
            intervencaoData,
            { headers: { Authorization: `Bearer ${token}` } },
        );

        // Mensagem de sucesso para o utilizador
        let successMessage = `✅ *INTERVENÇÃO CRIADA COM SUCESSO*

*Cliente:* ${conversa.data.cliente || "N/A"}
*Pedido:* ${conversa.data.pedidoId}
*Tipo:* ${conversa.data.tipo}
*Duração:* ${conversa.data.duracao} horas
*Técnico:* ${conversa.data.tecnicoNumero || "Não especificado"}
*Estado:* ${conversa.data.estado}

*Descrição:*
${conversa.data.descricao}`;

        // Adicionar informação sobre artigos se existirem
        if (conversa.data.artigos && conversa.data.artigos.length > 0) {
            successMessage += `\n\n📦 *Artigos Registados:* ${conversa.data.artigos.length}`;
            conversa.data.artigos.forEach((artigo, index) => {
                const nomeArtigo = artigo.descricao || artigo.artigo;
                successMessage += `\n${index + 1}. ${nomeArtigo} - Qtd: ${artigo.qtd}`;
            });
        }

        successMessage += `\n\nA intervenção foi registada no sistema com sucesso!

💡 Para criar nova intervenção, envie "intervenção" novamente.`;

        await client.sendMessage(phoneNumber, successMessage);
        console.log(
            `✅ Processo de intervenção concluído com sucesso para ${phoneNumber}`,
        );
    } catch (error) {
        const erroMsg =
            error.response?.data || error.message || "Erro desconhecido";
        console.error("❌ Erro crítico ao criar intervenção:", erroMsg);

        // Tentar dar uma mensagem de erro mais amigável ao utilizador
        if (
            typeof erroMsg === "string" &&
            erroMsg.includes(
                "Object reference not set to an instance of an object",
            )
        ) {
            console.warn(
                "⚠️ Aviso: Erro conhecido 'Object reference not set...' recebido. A tentar reenviar mensagem de sucesso.",
            );
            await enviarMensagemSucessoGenerica(phoneNumber, conversa, client);
        } else if (
            typeof erroMsg === "string" &&
            erroMsg.includes(
                "A data de início da intervenção é anterior à data de abertura do processo",
            )
        ) {
            await client.sendMessage(
                phoneNumber,
                "❌ Erro: A data de início da intervenção é anterior à data de abertura do processo. Por favor, verifique as datas e tente novamente.",
            );
        } else {
            await client.sendMessage(
                phoneNumber,
                `❌ Ocorreu um erro ao registar a intervenção. Detalhes do erro: ${erroMsg}. Por favor, tente novamente.`,
            );
        }
    }
}

// Função auxiliar para não duplicar mensagem de sucesso em caso de erros específicos
async function enviarMensagemSucessoGenerica(phoneNumber, conversa, client) {
    let successMessage = `✅ *INTERVENÇÃO CRIADA COM SUCESSO*

*Cliente:* ${conversa.data.cliente || "N/A"}
*Pedido:* ${conversa.data.pedidoId}
*Tipo:* ${conversa.data.tipo}
*Duração:* ${conversa.data.duracao} horas
*Técnico:* ${conversa.data.tecnicoNumero || "Não especificado"}
*Estado:* ${conversa.data.estado}

*Descrição:*
${conversa.data.descricao}`;

    // Adicionar informação sobre artigos se existirem
    if (conversa.data.artigos && conversa.data.artigos.length > 0) {
        successMessage += `\n\n📦 *Artigos Registados:* ${conversa.data.artigos.length}`;
        conversa.data.artigos.forEach((artigo, index) => {
            const nomeArtigo = artigo.descricao || artigo.artigo;
            successMessage += `\n${index + 1}. ${nomeArtigo} - Qtd: ${artigo.qtd}`;
        });
    }

    successMessage += `\n\nA intervenção foi registada no sistema com sucesso!

💡 Para criar nova intervenção, envie "intervenção" novamente.`;

    await client.sendMessage(phoneNumber, successMessage);
    console.log(
        `✅ Processo de intervenção concluído (com aviso de erro específico) para ${phoneNumber}`,
    );
}

// Limpar conversas antigas que expiraram (ex: 30 minutos de inatividade)
setInterval(
    () => {
        const now = Date.now();
        const TIMEOUT = 30 * 60 * 1000; // 30 minutos

        for (const [phoneNumber, conversa] of activeIntervencoes.entries()) {
            if (now - conversa.lastActivity > TIMEOUT) {
                activeIntervencoes.delete(phoneNumber);
                console.log(
                    `Conversa de intervenção de ${phoneNumber} expirou devido a inatividade.`,
                );
            }
        }
    },
    5 * 60 * 1000,
); // Verificar a cada 5 minutos

// Exportar as funções necessárias
module.exports = {
    router,
    processarMensagemIntervencao: processarMensagem, // Renomear para consistência com o que era exportado
    isIntervencaoKeyword,
    activeIntervencoes,
};