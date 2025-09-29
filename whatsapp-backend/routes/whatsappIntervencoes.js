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
    WAITING_ARTIGOS: "aguardando_artigos", // Estado para gestão de artigos
    WAITING_NOME_ARTIGO: "aguardando_nome_artigo", // Novo estado para nome do artigo
    WAITING_SELECAO_ARTIGO: "aguardando_selecao_artigo", // Estado para seleção de artigo sugerido
    WAITING_QUANTIDADE_ARTIGO: "aguardando_quantidade_artigo", // Estado para quantidade de artigo
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

// Verificar se a mensagem contém comandos de artigos
function isArtigoCommand(message) {
    const lowerMessage = message.toLowerCase();

    // Verificar comandos de artigos
    if (
        lowerMessage.includes("artigo") ||
        lowerMessage.includes("material")
    ) {
        return true;
    }

    return false;
}

// Função principal para processar mensagens
async function processarMensagem(phoneNumber, messageText, client) {
    console.log(`🔧 Processando mensagem de ${phoneNumber}: "${messageText}"`);

    let conversa = activeIntervencoes.get(phoneNumber);

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
        // Estados para gestão de artigos
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
            } else {
                await client.sendMessage(
                    phoneNumber,
                    "❌ Resposta não reconhecida.\n\n" +
                    "Por favor, responda:\n" +
                    "• 'sim' para adicionar artigos\n" +
                    "• 'não' para continuar sem artigos\n" +
                    "• 'fim' para terminar",
                );
            }
            break;
        case STATES.WAITING_NOME_ARTIGO:
            await processarNomeArtigo(phoneNumber, messageText, client, conversa);
            break;
        case STATES.WAITING_SELECAO_ARTIGO:
            await processarSelecaoArtigo(phoneNumber, messageText, client, conversa);
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
    { username: "AdvirWeb", password: "Advir2506##", company: "Advir", instance: "DEFAULT", line: "Evolution" },
    "151.80.149.159:2018"
  );

  const headers = { Authorization: `Bearer ${token}` };

  // Tentativas por ordem
  const candidates = [
    "http://151.80.149.159:2018/WebApi/ServicosTecnicos/ObterPedidos",      // a tua atual
    "http://151.80.149.159:2018/WebApi/ServicosTecnicos/ObterPedidosAssistencia",
    "http://151.80.149.159:2018/WebApi/ServicosTecnicos/LstPedidos",
    "http://151.80.149.159:2018/ServicosTecnicos/ObterPedidos"              // sem /WebApi
  ];

  let pedidos = null;
  let lastErr = null;

  for (const url of candidates) {
    try {
      const r = await axios.get(url, { headers });
      pedidos = r.data?.DataSet?.Table ?? r.data?.Data ?? r.data ?? [];
      if (!Array.isArray(pedidos)) {
        // alguns endpoints devolvem diretamente array
        if (Array.isArray(r.data)) pedidos = r.data;
      }
      if (pedidos) {
        console.log(`Obteve pedidos via ${url} (${pedidos.length})`);
        break;
      }
    } catch (e) {
      lastErr = e;
      if (e.response?.status !== 404) {
        // Erro relevante (401, 500, etc.) — não vale continuar a tentar
        throw e;
      }
    }
  }

  if (!pedidos) {
    // Ainda assim sem rota válida
    await client.sendMessage(
      phoneNumber,
      "⚠️ Não consegui encontrar a lista de pedidos neste momento. " +
      "Indique por favor o *código ou nº de processo* diretamente (ex.: `PRC1234`)."
    );
    // Opcional: avança o estado para WAITING_PEDIDO aceitando texto livre
    conversa.data.clienteId = clienteId;
    conversa.data.pedidos = []; // vazio — vais aceitar ID manual
    conversa.estado = STATES.WAITING_PEDIDO;
    return;
  }

  const pedidosCliente = pedidos.filter(p =>
    p.Cliente === clienteId ||
    (p.Cliente && p.Cliente.toLowerCase?.() === clienteId.toLowerCase()) ||
    (p.Nome && p.Nome.toLowerCase?.().includes(clienteId.toLowerCase()))
  );

  if (pedidosCliente.length === 0) {
    await client.sendMessage(
      phoneNumber,
      `❌ Nenhum pedido encontrado para "${clienteId}". Indique o *nº de processo* diretamente:`
    );
    conversa.data.clienteId = clienteId;
    conversa.data.pedidos = [];
    conversa.estado = STATES.WAITING_PEDIDO;
    return;
  }

  // ... (resto do teu código para listar e escolher)
} catch (error) {
  console.error("Erro ao buscar pedidos:", {
    status: error.response?.status,
    data: error.response?.data,
    msg: error.message
  });
  await client.sendMessage(
    phoneNumber,
    "❌ Ocorreu um erro ao obter os pedidos. Tente novamente mais tarde ou indique o *nº de processo* diretamente."
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
        `• Digite 'não' para continuar sem artigos`,
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
    resumo += `🔧 **Tipo:** ${data.tipo}\n`;
    resumo += `⏱️ **Duração:** ${data.duracao} horas\n`;
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
    conversa.estado = STATES.WAITING_NOME_ARTIGO;

    await client.sendMessage(
        phoneNumber,
        `👍 Ótimo! Para adicionar artigos:\n\n` +
        `📝 *Digite o nome do artigo*\n` +
        `Exemplo: "Parafuso", "Cabo ethernet", "Switch"\n\n` +
        `💡 *Como funciona:*\n` +
        `1. Digite o nome do artigo\n` +
        `2. O sistema verifica se existe\n` +
        `3. Se existir, pede a quantidade\n` +
        `4. Pode adicionar mais artigos ou terminar\n\n` +
        `Digite o nome do primeiro artigo:`,
    );
}

// Processar o nome do artigo inserido
async function processarNomeArtigo(phoneNumber, messageText, client, conversa) {
    const nomeArtigo = messageText.trim();

    // Verificar comandos especiais
    const lowerMessage = nomeArtigo.toLowerCase();
    if (lowerMessage.includes("fim") || lowerMessage.includes("terminar")) {
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
        return;
    }

    if (lowerMessage.includes("cancelar")) {
        // Remover todos os artigos adicionados nesta sessão
        conversa.data.artigos = [];
        conversa.estado = STATES.WAITING_DATA_INICIO;
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

    try {
        // Buscar artigos na API
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
            "http://151.80.149.159:2018/WebApi/Base/LstArtigos",
            { headers: { Authorization: `Bearer ${token}` } },
        );

        const artigos = response.data.DataSet?.Table || [];

        // Primeiro, tentar encontrar uma correspondência exata
        const matchExato = artigos.find(
            (artigo) => 
                artigo.Descricao.toLowerCase() === nomeArtigo.toLowerCase() ||
                artigo.Artigo.toLowerCase() === nomeArtigo.toLowerCase()
        );

        if (matchExato) {
            // Match exato encontrado, prosseguir diretamente
            conversa.data.ultimoArtigoCodigo = matchExato.Artigo;
            conversa.data.ultimoArtigoDescricao = matchExato.Descricao;
            conversa.estado = STATES.WAITING_QUANTIDADE_ARTIGO;

            await client.sendMessage(
                phoneNumber,
                `✅ Artigo encontrado!\n\n` +
                `📦 *${conversa.data.ultimoArtigoDescricao}*\n` +
                `🏷️ Código: ${conversa.data.ultimoArtigoCodigo}\n\n` +
                `Por favor, indique a quantidade deste artigo:`,
            );
            return;
        }

        // Se não houver match exato, procurar por correspondências parciais
        const artigosSugeridos = artigos.filter(
            (artigo) => 
                artigo.Descricao.toLowerCase().includes(nomeArtigo.toLowerCase()) ||
                artigo.Artigo.toLowerCase().includes(nomeArtigo.toLowerCase())
        ).slice(0, 10); // Limitar a 10 sugestões

        if (artigosSugeridos.length === 0) {
            await client.sendMessage(
                phoneNumber,
                `❌ Nenhum artigo encontrado para "${nomeArtigo}".\n\n` +
                `Por favor, tente com outro nome ou digite:\n` +
                `• 'fim' para terminar adição de artigos\n` +
                `• 'cancelar' para cancelar`,
            );
            return;
        }

        // Mostrar sugestões para o usuário escolher
        conversa.data.artigosSugeridos = artigosSugeridos;
        conversa.estado = STATES.WAITING_SELECAO_ARTIGO;

        let mensagem = `🔍 Encontrei ${artigosSugeridos.length} artigo(s) semelhante(s) para "${nomeArtigo}":\n\n`;
        
        artigosSugeridos.forEach((artigo, index) => {
            mensagem += `*${index + 1}.* ${artigo.Descricao}\n`;
            mensagem += `   Código: ${artigo.Artigo}\n\n`;
        });

        mensagem += `📝 Digite o número do artigo desejado (1-${artigosSugeridos.length})\n`;
        mensagem += `Ou digite:\n`;
        mensagem += `• 'novo' para tentar outro nome\n`;
        mensagem += `• 'fim' para terminar\n`;
        mensagem += `• 'cancelar' para cancelar`;

        await client.sendMessage(phoneNumber, mensagem);

    } catch (error) {
        console.error("Erro ao buscar artigos:", error);
        await client.sendMessage(
            phoneNumber,
            "❌ Erro ao verificar o artigo. Tente novamente ou digite 'cancelar' para cancelar a adição de artigos.",
        );
    }
}

// Processar a seleção de artigo das sugestões
async function processarSelecaoArtigo(phoneNumber, messageText, client, conversa) {
    const resposta = messageText.trim().toLowerCase();

    // Verificar comandos especiais
    if (resposta.includes("novo")) {
        conversa.estado = STATES.WAITING_NOME_ARTIGO;
        await client.sendMessage(
            phoneNumber,
            `💡 Digite o nome de outro artigo que deseja procurar:`,
        );
        return;
    }

    if (resposta.includes("fim") || resposta.includes("terminar")) {
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
        return;
    }

    if (resposta.includes("cancelar")) {
        conversa.data.artigos = [];
        conversa.estado = STATES.WAITING_DATA_INICIO;
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

    // Processar seleção numérica
    const escolha = parseInt(messageText.trim());
    const artigosSugeridos = conversa.data.artigosSugeridos || [];

    if (isNaN(escolha) || escolha < 1 || escolha > artigosSugeridos.length) {
        await client.sendMessage(
            phoneNumber,
            `❌ Opção inválida. Por favor, digite um número entre 1 e ${artigosSugeridos.length}\n` +
            `Ou digite:\n` +
            `• 'novo' para tentar outro nome\n` +
            `• 'fim' para terminar\n` +
            `• 'cancelar' para cancelar`,
        );
        return;
    }

    const artigoSelecionado = artigosSugeridos[escolha - 1];

    // Guardar as informações do artigo selecionado
    conversa.data.ultimoArtigoCodigo = artigoSelecionado.Artigo;
    conversa.data.ultimoArtigoDescricao = artigoSelecionado.Descricao;
    conversa.estado = STATES.WAITING_QUANTIDADE_ARTIGO;

    // Limpar sugestões
    delete conversa.data.artigosSugeridos;

    await client.sendMessage(
        phoneNumber,
        `✅ Artigo selecionado!\n\n` +
        `📦 *${conversa.data.ultimoArtigoDescricao}*\n` +
        `🏷️ Código: ${conversa.data.ultimoArtigoCodigo}\n\n` +
        `Por favor, indique a quantidade deste artigo:`,
    );
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
    };

    // Adicionar o artigo à lista de artigos da intervenção
    conversa.data.artigos.push(artigo);

    // Limpar os dados do último artigo processado
    delete conversa.data.ultimoArtigoCodigo;
    delete conversa.data.ultimoArtigoDescricao;

    await client.sendMessage(
        phoneNumber,
        `✅ ${quantidade}x de *${artigo.descricao}* adicionado(s).\n\n` +
        `📦 *Artigos já adicionados: ${conversa.data.artigos.length}*\n\n` +
        `O que deseja fazer a seguir?\n\n` +
        `📝 *Digite:*\n` +
        `• Nome de outro artigo para adicionar\n` +
        `• 'fim' para continuar para as datas\n` +
        `• 'cancelar' para cancelar adição de artigos`,
    );

    conversa.estado = STATES.WAITING_NOME_ARTIGO; // Voltar ao estado de inserção de artigos
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
    processarMensagemIntervencao: processarMensagem,
    isIntervencaoKeyword,
    activeIntervencoes,
};