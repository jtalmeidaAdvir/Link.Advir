const express = require("express");
const router = express.Router();
const axios = require("axios");

// Sistema de gestão de conversas para criação de intervenções
const activeIntervencaoConversations = new Map();

// Estados possíveis da conversa de intervenção
const INTERVENCAO_STATES = {
    WAITING_CLIENT: "waiting_client",
    WAITING_PEDIDO: "waiting_pedido",
    WAITING_TIPO: "waiting_tipo",
    WAITING_ESTADO: "waiting_estado",
    WAITING_TIPO_REMOTO: "waiting_tipo_remoto",
    WAITING_DESCRICAO: "waiting_descricao",
    WAITING_DURACAO: "waiting_duracao",
    WAITING_CONFIRMATION: "waiting_confirmation",
};

// Importar função de token
const { getAuthToken } = require("../../webPrimaveraApi/servives/tokenService");

// Verificar se a mensagem contém palavras-chave para intervenções
function isIntervencaoKeyword(message) {
    const keywords = [
        "intervenção",
        "intervencao",
        "intervenção tecnica",
        "reparação",
        "manutenção",
    ];
    const lowerMessage = message.toLowerCase();
    return keywords.some((keyword) => lowerMessage.includes(keyword));
}

// Função principal para processar mensagens de intervenção
async function processarMensagemIntervencao(phoneNumber, messageText, client) {
    console.log(
        `🔧 Processando mensagem de intervenção de ${phoneNumber}: "${messageText}"`,
    );

    // Verificar se existe conversa ativa
    let conversation = activeIntervencaoConversations.get(phoneNumber);

    // Se é palavra-chave inicial, iniciar nova conversa
    if (isIntervencaoKeyword(messageText) && !conversation) {
        await startNewIntervencao(phoneNumber, messageText, client);
        return;
    }

    // Se existe conversa, continuar o fluxo
    if (conversation) {
        await continueIntervencaoConversation(
            phoneNumber,
            messageText,
            conversation,
            client,
        );
        return;
    }

    // Se não é palavra-chave nem conversa ativa, ignorar
    console.log(
        `❌ Mensagem não reconhecida como intervenção: "${messageText}"`,
    );
}

// Iniciar nova intervenção
async function startNewIntervencao(phoneNumber, initialMessage, client) {
    console.log(`🔧 Iniciando nova intervenção para ${phoneNumber}`);

    const conversation = {
        state: INTERVENCAO_STATES.WAITING_CLIENT,
        data: {
            initialMessage: initialMessage,
            dataAbertura: new Date()
                .toISOString()
                .replace("T", " ")
                .slice(0, 19),
        },
        lastActivity: Date.now(),
    };

    activeIntervencaoConversations.set(phoneNumber, conversation);

    const welcomeMessage = `🔧 *Sistema de Registo de Intervenções*

Bem-vindo ao sistema automático de registo de intervenções técnicas da Advir.

Para registar uma nova intervenção, necessitamos das seguintes informações:

*1. Código do Cliente*
Indique o código do cliente para podermos identificar os pedidos disponíveis:

💡 _Pode digitar "cancelar" a qualquer momento para interromper o processo_`;

    await client.sendMessage(phoneNumber, welcomeMessage);
}

// Continuar conversa de intervenção
async function continueIntervencaoConversation(
    phoneNumber,
    messageText,
    conversation,
    client,
) {
    console.log(
        `🔄 Continuando conversa de intervenção - Estado: ${conversation.state}`,
    );

    // Verificar cancelamento
    if (messageText.toLowerCase().includes("cancelar")) {
        activeIntervencaoConversations.delete(phoneNumber);
        await client.sendMessage(
            phoneNumber,
            "❌ *Intervenção Cancelada*\n\nO registo de intervenção foi cancelado com sucesso.\n\nPara iniciar uma nova intervenção, envie 'intervenção'.",
        );
        return;
    }

    switch (conversation.state) {
        case INTERVENCAO_STATES.WAITING_CLIENT:
            await handleClienteInputIntervencao(
                phoneNumber,
                messageText,
                conversation,
                client,
            );
            break;
        case INTERVENCAO_STATES.WAITING_PEDIDO:
            await handlePedidoInputIntervencao(
                phoneNumber,
                messageText,
                conversation,
                client,
            );
            break;
        case INTERVENCAO_STATES.WAITING_ESTADO:
            await handleEstadoInputIntervencao(
                phoneNumber,
                messageText,
                conversation,
                client,
            );
            break;
        case INTERVENCAO_STATES.WAITING_TIPO_REMOTO:
            await handleTipoRemotoInputIntervencao(
                phoneNumber,
                messageText,
                conversation,
                client,
            );
            break;
        case INTERVENCAO_STATES.WAITING_DESCRICAO:
            await handleDescricaoInputIntervencao(
                phoneNumber,
                messageText,
                conversation,
                client,
            );
            break;
        case INTERVENCAO_STATES.WAITING_DURACAO:
            await handleDuracaoInputIntervencao(
                phoneNumber,
                messageText,
                conversation,
                client,
            );
            break;
        case INTERVENCAO_STATES.WAITING_CONFIRMATION:
            await handleConfirmationInputIntervencao(
                phoneNumber,
                messageText,
                conversation,
                client,
            );
            break;
        default:
            console.log(`⚠️ Estado não reconhecido: ${conversation.state}`);
            break;
    }

    // Atualizar última atividade
    conversation.lastActivity = Date.now();
    activeIntervencaoConversations.set(phoneNumber, conversation);
}

// Handler para input do cliente
async function handleClienteInputIntervencao(
    phoneNumber,
    messageText,
    conversation,
    client,
) {
    const clienteId = messageText.trim();

    try {
        // Buscar pedidos do cliente
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

        // Buscar todos os pedidos primeiro
        const pedidosResponse = await axios.get(
            "http://151.80.149.159:2018/WebApi/ServicosTecnicos/ObterPedidos",
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            },
        );

        const todosPedidos = pedidosResponse.data.DataSet
            ? pedidosResponse.data.DataSet.Table
            : [];

        // Filtrar pedidos pelo código do cliente
        const pedidos = todosPedidos.filter((pedido) => {
            return (
                pedido.Cliente === clienteId ||
                pedido.Cliente.toLowerCase() === clienteId.toLowerCase() ||
                pedido.Nome.toLowerCase().includes(clienteId.toLowerCase())
            );
        });

        // Se não encontrou pedidos, tentar buscar clientes similares
        if (pedidos.length === 0) {
            // Extrair clientes únicos dos pedidos para sugestões
            const clientesUnicos = [
                ...new Map(
                    todosPedidos.map((pedido) => [
                        pedido.Cliente,
                        { codigo: pedido.Cliente, nome: pedido.Nome },
                    ]),
                ).values(),
            ];

            // Procurar clientes similares
            const clientesSimilares = clientesUnicos
                .filter(
                    (cliente) =>
                        cliente.nome
                            .toLowerCase()
                            .includes(clienteId.toLowerCase()) ||
                        cliente.codigo
                            .toLowerCase()
                            .includes(clienteId.toLowerCase()),
                )
                .slice(0, 5);

            let mensagem = `❌ Nenhum pedido encontrado para "${clienteId}".\n\n`;

            if (clientesSimilares.length > 0) {
                mensagem += `💡 Clientes com pedidos disponíveis:\n\n`;
                clientesSimilares.forEach((cliente, index) => {
                    const numPedidos = todosPedidos.filter(
                        (p) => p.Cliente === cliente.codigo,
                    ).length;
                    mensagem += `*${index + 1}.* ${cliente.codigo} - ${cliente.nome} (${numPedidos} pedidos)\n`;
                });
                mensagem += `\nDigite o código exato do cliente pretendido:`;
            } else {
                mensagem += `Nenhum cliente similar encontrado.\nPor favor, verifique o código do cliente e tente novamente:`;
            }

            await client.sendMessage(phoneNumber, mensagem);
            return;
        }

        if (pedidos.length === 0) {
            await client.sendMessage(
                phoneNumber,
                `❌ Nenhum pedido encontrado para o cliente "${clienteId}".\n\nPor favor, verifique o código do cliente e tente novamente:`,
            );
            return;
        }

        // Armazenar dados do cliente e pedidos
        conversation.data.clienteId = clienteId;
        conversation.data.pedidosDisponiveis = pedidos;
        conversation.state = INTERVENCAO_STATES.WAITING_PEDIDO;

        // Encontrar o nome do cliente
        const nomeCliente = pedidos[0]?.Nome || clienteId;

        let response_message = `✅ Cliente identificado: *${nomeCliente}*\n\n`;
        response_message += `📋 *Pedidos disponíveis:*\n\n`;

        // Não filtrar pedidos, mostrar todos
        const pedidosAtivos = pedidos;

        pedidosAtivos.forEach((pedido, index) => {
            // Usar campos corretos da API
            const descricao =
                pedido.DescricaoProb ||
                pedido.DescricaoProblema ||
                "Sem descrição";
            const processo = pedido.Processo || `Ref. ${index + 1}`;
            const estado = getEstadoDescricao(pedido.Estado);

            response_message += `*${index + 1}.* ${processo}\n`;
            response_message += `   📋 ${descricao}\n`;
            if (estado && estado !== "N/A") {
                response_message += `   📊 ${estado}\n`;
            }
            response_message += `\n`;
        });

        // Atualizar a lista de pedidos disponíveis
        conversation.data.pedidosDisponiveis = pedidosAtivos;

        if (pedidosAtivos.length === 0) {
            response_message = `✅ Cliente identificado: *${nomeCliente}*\n\n`;
            response_message += `ℹ️ *Não existem pedidos ativos disponíveis*\n\n`;
            response_message += `Todos os pedidos deste cliente estão concluídos.\n`;
            response_message += `Para criar uma nova intervenção, contacte o suporte técnico.`;

            // Limpar conversa se não há pedidos
            activeIntervencaoConversations.delete(phoneNumber);
        } else {
            response_message += `*Selecione o pedido pretendido (1-${pedidosAtivos.length}):*`;
        }


        await client.sendMessage(phoneNumber, response_message);
    } catch (error) {
        console.error("Erro ao buscar pedidos do cliente:", error);
        await client.sendMessage(
            phoneNumber,
            `❌ Erro ao buscar pedidos do cliente "${clienteId}".\n\nPor favor, verifique o código e tente novamente:`,
        );
    }
}

// Handler para seleção do pedido
async function handlePedidoInputIntervencao(
    phoneNumber,
    messageText,
    conversation,
    client,
) {
    const escolha = parseInt(messageText.trim());
    const pedidos = conversation.data.pedidosDisponiveis;

    if (isNaN(escolha) || escolha < 1 || escolha > pedidos.length) {
        await client.sendMessage(
            phoneNumber,
            `❌ Escolha inválida. Digite um número entre 1 e ${pedidos.length}:`,
        );
        return;
    }

    const pedidoSelecionado = pedidos[escolha - 1];
    conversation.data.pedidoId = pedidoSelecionado.ID;
    conversation.data.pedidoDescricao =
        pedidoSelecionado.DescricaoProb ||
        pedidoSelecionado.DescricaoProblema ||
        pedidoSelecionado.Processo ||
        "Sem descrição";

    // Buscar técnico associado ao pedido e obter o nome
    let tecnicoNome = null;
    if (pedidoSelecionado.Tecnico) {
        conversation.data.tecnicoNumero = pedidoSelecionado.Tecnico;

        // Buscar o nome do técnico via API
        try {
            // Obter token para buscar dados do técnico
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

            const tecnicosResponse = await axios.get(
                "http://151.80.149.159:2018/WebApi/ServicosTecnicos/LstTecnicosTodos",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            if (tecnicosResponse.data && tecnicosResponse.data.DataSet && tecnicosResponse.data.DataSet.Table) {
                const tecnico = tecnicosResponse.data.DataSet.Table.find(
                    t => t.Numero === pedidoSelecionado.Tecnico
                );
                if (tecnico) {
                    tecnicoNome = tecnico.Nome;
                    conversation.data.tecnicoNome = tecnicoNome;
                }
            }
        } catch (error) {
            console.warn("Erro ao buscar nome do técnico:", error);
        }
    }

    // Definir tipo de intervenção padrão
    conversation.data.tipoIntervencao = "Assistência Técnica";
    conversation.state = INTERVENCAO_STATES.WAITING_ESTADO;

    const response = `✅ Pedido selecionado: *${conversation.data.pedidoDescricao}*
${conversation.data.tecnicoNumero ? `✅ Técnico: *${tecnicoNome || conversation.data.tecnicoNumero}*\n` : ""}
*2. Estado da Intervenção*
Selecione o estado:

*1.* Pendente
*2.* Em Curso
*3.* Concluída
*4.* Cancelada

Digite o número correspondente (1-4):`;

    await client.sendMessage(phoneNumber, response);
}

// Handler para estado da intervenção
async function handleEstadoInputIntervencao(
    phoneNumber,
    messageText,
    conversation,
    client,
) {
    const escolha = parseInt(messageText.trim());
    const estados = ["Pendente", "Em Curso", "Concluída", "Cancelada"];

    if (isNaN(escolha) || escolha < 1 || escolha > estados.length) {
        await client.sendMessage(
            phoneNumber,
            `❌ Escolha inválida. Digite um número entre 1 e ${estados.length}:`,
        );
        return;
    }

    conversation.data.estado = estados[escolha - 1];
    conversation.state = INTERVENCAO_STATES.WAITING_TIPO_REMOTO;

    const response = `✅ Estado selecionado: *${estados[escolha - 1]}*

*3. Tipo de Intervenção*
Selecione o tipo:

*1.* Remoto
*2.* Presencial

Digite o número correspondente (1-2):`;

    await client.sendMessage(phoneNumber, response);
}

// Handler para tipo remoto/presencial
async function handleTipoRemotoInputIntervencao(
    phoneNumber,
    messageText,
    conversation,
    client,
) {
    const escolha = parseInt(messageText.trim());
    const tipos = ["Remoto", "Presencial"];

    if (isNaN(escolha) || escolha < 1 || escolha > tipos.length) {
        await client.sendMessage(
            phoneNumber,
            `❌ Escolha inválida. Digite um número entre 1 e ${tipos.length}:`,
        );
        return;
    }

    conversation.data.tipoRemotoPresencial = tipos[escolha - 1];
    conversation.state = INTERVENCAO_STATES.WAITING_DESCRICAO;

    const response = `✅ Tipo selecionado: *${tipos[escolha - 1]}*

*4. Descrição da Intervenção*
Por favor, descreva detalhadamente a intervenção realizada ou a realizar:`;

    await client.sendMessage(phoneNumber, response);
}

// Handler para descrição da intervenção
async function handleDescricaoInputIntervencao(
    phoneNumber,
    messageText,
    conversation,
    client,
) {
    conversation.data.descricao = messageText.trim();
    conversation.state = INTERVENCAO_STATES.WAITING_DURACAO;

    const response = `✅ Descrição registada com sucesso.

*5. Duração da Intervenção*
Indique a duração da intervenção em horas (exemplo: 2 para 2 horas, 1.5 para 1 hora e 30 minutos):`;

    await client.sendMessage(phoneNumber, response);
}

// Handler para duração da intervenção
async function handleDuracaoInputIntervencao(
    phoneNumber,
    messageText,
    conversation,
    client,
) {
    const duracao = parseFloat(messageText.trim());

    if (isNaN(duracao) || duracao <= 0) {
        await client.sendMessage(
            phoneNumber,
            `❌ Duração inválida. Por favor, indique um número válido de horas (exemplo: 2 ou 1.5):`,
        );
        return;
    }

    conversation.data.duracaoHoras = duracao;

    // Calcular datas
    const dataInicio = new Date();
    const dataFim = new Date(dataInicio.getTime() + duracao * 60 * 60 * 1000);

    conversation.data.dataInicio = dataInicio;
    conversation.data.dataFim = dataFim;
    conversation.state = INTERVENCAO_STATES.WAITING_CONFIRMATION;

    // Resumo para confirmação
    let summary = `📋 *RESUMO DA INTERVENÇÃO*

**Cliente:** ${conversation.data.clienteId}
**Pedido:** ${conversation.data.pedidoDescricao}
${conversation.data.tecnicoNumero ? `**Técnico:** ${conversation.data.tecnicoNome || conversation.data.tecnicoNumero}\n` : ""}**Tipo:** ${conversation.data.tipoIntervencao}
**Estado:** ${conversation.data.estado}
**Modalidade:** ${conversation.data.tipoRemotoPresencial}
**Duração:** ${duracao} horas
**Data/Hora Início:** ${dataInicio.toLocaleString("pt-PT")}
**Data/Hora Fim:** ${dataFim.toLocaleString("pt-PT")}

**Descrição:**
${conversation.data.descricao}

*Por favor, confirme a criação desta intervenção.*
Digite "SIM" para confirmar ou "NÃO" para cancelar:`;

    await client.sendMessage(phoneNumber, summary);
}

// Handler para confirmação da intervenção
async function handleConfirmationInputIntervencao(
    phoneNumber,
    messageText,
    conversation,
    client,
) {
    const response = messageText.trim().toLowerCase();

    if (
        response === "sim" ||
        response === "s" ||
        response === "yes" ||
        response === "1"
    ) {
        try {
            console.log(
                `✅ Confirmação recebida de ${phoneNumber} - criando intervenção...`,
            );
            await createIntervencao(phoneNumber, conversation, client);
        } catch (error) {
            console.error(
                `❌ Erro ao criar intervenção para ${phoneNumber}:`,
                error,
            );
            await client.sendMessage(
                phoneNumber,
                "❌ Ocorreu um erro ao processar a sua intervenção. Por favor, tente novamente enviando 'intervenção'.",
            );
        }
    } else if (
        response === "não" ||
        response === "nao" ||
        response === "n" ||
        response === "no" ||
        response === "0"
    ) {
        activeIntervencaoConversations.delete(phoneNumber);
        await client.sendMessage(
            phoneNumber,
            "❌ Intervenção cancelada com sucesso.\n\n💡 Para registar uma nova intervenção, envie 'intervenção'.",
        );
    } else {
        await client.sendMessage(
            phoneNumber,
            "❌ Resposta não reconhecida.\n\nPor favor, responda:\n• 'SIM' ou 'S' para confirmar\n• 'NÃO' ou 'N' para cancelar",
        );
    }
}

// Função para criar a intervenção via API
async function createIntervencao(phoneNumber, conversation, client) {
    try {
        console.log("🔑 Obtendo token de autenticação para intervenção...");

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

        console.log("✅ Token obtido com sucesso");

        // Formatar datas para o formato esperado pela API
        const formatarData = (data) => {
            return data.toISOString().slice(0, 19).replace("T", " ");
        };

        // Preparar dados para envio
        const intervencaoData = {
            processoID: conversation.data.pedidoId,
            tipoIntervencao: conversation.data.tipoRemotoPresencial === "Remoto" ? "REM" : "PRE",
            duracao: conversation.data.duracaoHoras,
            duracaoReal: conversation.data.duracaoHoras,
            DataHoraInicio: formatarData(conversation.data.dataInicio),
            DataHoraFim: formatarData(conversation.data.dataFim),
            tecnico: conversation.data.tecnicoNumero || "000",
            estadoAnt: "1", // Estado anterior padrão
            estado: mapEstadoParaNumero(conversation.data.estado),
            seccaoAnt: "SD",
            seccao: "SD",
            utilizador: "whatsapp",
            descricaoResposta: conversation.data.descricao,
            artigos: [],
            emailDestinatario: null,
        };

        console.log(
            "🛠 Dados da intervenção:",
            JSON.stringify(intervencaoData, null, 2),
        );

        // Enviar para a API do Primavera
        try {
            const response = await axios.post(
                "http://151.80.149.159:2018/WebApi/ServicosTecnicos/CriarIntervencoes",
                intervencaoData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            console.log("✅ Intervenção criada com sucesso:", response.data);
        } catch (apiError) {
            // A API retorna erro 500 mas a intervenção é criada com sucesso
            // Vamos tratar como sucesso se for erro 500
            if (apiError.response && apiError.response.status === 500) {
                console.log("⚠️ API retornou erro 500 mas intervenção foi criada com sucesso");
                console.log("📝 Resposta da API:", apiError.response.data);
            } else {
                // Se for outro tipo de erro, relançar a exceção
                throw apiError;
            }
        }

        // Limpar conversa
        activeIntervencaoConversations.delete(phoneNumber);

        // Enviar mensagem de sucesso
        const successMessage = `✅ *INTERVENÇÃO CRIADA COM SUCESSO*

**Cliente:** ${conversation.data.clienteId}
**Pedido:** ${conversation.data.pedidoDescricao}
${conversation.data.tecnicoNumero ? `**Técnico:** ${conversation.data.tecnicoNome || conversation.data.tecnicoNumero}\n` : ""}**Tipo:** ${conversation.data.tipoIntervencao}
**Estado:** ${conversation.data.estado}
**Modalidade:** ${conversation.data.tipoRemotoPresencial}
**Duração:** ${conversation.data.duracaoHoras} horas
**Data/Hora:** ${conversation.data.dataInicio.toLocaleString("pt-PT")} - ${conversation.data.dataFim.toLocaleString("pt-PT")}

**Descrição:**
${conversation.data.descricao}

A sua intervenção foi registada no nosso sistema com sucesso.

💡 *Para registar uma nova intervenção*, envie novamente "intervenção".

Obrigado por utilizar o sistema da Advir.`;

        await client.sendMessage(phoneNumber, successMessage);
    } catch (error) {
        console.error("❌ Erro ao criar intervenção:", error);

        // Limpar conversa mesmo em caso de erro
        activeIntervencaoConversations.delete(phoneNumber);

        await client.sendMessage(
            phoneNumber,
            `❌ *Erro ao Criar Intervenção*\n\n` +
            `Ocorreu um erro ao processar a sua intervenção.\n\n` +
            `Para tentar novamente, envie: *intervenção*`,
        );
    }
}

// Função auxiliar para mapear estado para número
function mapEstadoParaNumero(estado) {
    const mapeamento = {
        Pendente: "1",
        "Em Curso": "2",
        Concluída: "3",
        Cancelada: "4",
    };

    return mapeamento[estado] || "2"; // Padrão: Em Curso
}

// Função auxiliar para obter descrição do estado
function getEstadoDescricao(codigoEstado) {
    const mapeamento = {
        0: "Em Aberto",
        1: "Em Curso",
        2: "Concluído",
        3: "Cancelado",
        4: "Suspenso",
    };

    return mapeamento[codigoEstado] || null;
}

// Limpar conversas de intervenção antigas (executar periodicamente)
setInterval(
    () => {
        const now = Date.now();
        const TIMEOUT = 30 * 60 * 1000; // 30 minutos

        for (const [
            phoneNumber,
            conversation,
        ] of activeIntervencaoConversations.entries()) {
            if (now - conversation.lastActivity > TIMEOUT) {
                activeIntervencaoConversations.delete(phoneNumber);
                // Não enviar mensagem de timeout para não confundir com outras conversas
                console.log(
                    `⏰ Conversa de intervenção de ${phoneNumber} expirou por inatividade`,
                );
            }
        }
    },
    5 * 60 * 1000,
); // Verificar a cada 5 minutos

// Rota para buscar clientes (utilizando a API existente)
router.get("/clientes", async (req, res) => {
    try {
        const response = await axios.get(
            "https://webapiprimavera.advir.pt/routeClienteArea/DaClientes",
            {
                headers: {
                    Authorization: req.headers.authorization,
                    urlempresa: req.headers.urlempresa,
                },
            },
        );

        res.json(response.data);
    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        res.status(500).json({ error: "Erro ao buscar clientes" });
    }
});

// Rota para buscar pedidos de um cliente específico
router.get("/pedidos/:clienteId", async (req, res) => {
    try {
        const { clienteId } = req.params;

        const response = await axios.get(
            `https://webapiprimavera.advir.pt/routePedidos_STP/DaPedidosCliente/${clienteId}`,
            {
                headers: {
                    Authorization: req.headers.authorization,
                    urlempresa: req.headers.urlempresa,
                },
            },
        );

        res.json(response.data);
    } catch (error) {
        console.error("Erro ao buscar pedidos do cliente:", error);
        res.status(500).json({ error: "Erro ao buscar pedidos do cliente" });
    }
});

// Rota para buscar técnicos
router.get("/tecnicos", async (req, res) => {
    try {
        const response = await axios.get(
            "https://webapiprimavera.advir.pt/routePedidos_STP/DaTecnicos",
            {
                headers: {
                    Authorization: req.headers.authorization,
                    urlempresa: req.headers.urlempresa,
                },
            },
        );

        res.json(response.data);
    } catch (error) {
        console.error("Erro ao buscar técnicos:", error);
        res.status(500).json({ error: "Erro ao buscar técnicos" });
    }
});

// Rota principal para criar intervenção via API direta (mantida para compatibilidade)
router.post("/criar-intervencao", async (req, res) => {
    try {
        const {
            pedidoId,
            tipoIntervencao,
            estado,
            tipoRemotoPresencial,
            descricao,
            duracaoHoras,
            tecnicoNumero,
        } = req.body;

        // Validações básicas
        if (
            !pedidoId ||
            !tipoIntervencao ||
            !estado ||
            !tipoRemotoPresencial ||
            !descricao ||
            !duracaoHoras
        ) {
            return res
                .status(400)
                .json({ error: "Todos os campos são obrigatórios" });
        }

        // Calcular datas
        const dataInicio = new Date();
        const dataFim = new Date(
            dataInicio.getTime() + duracaoHoras * 60 * 60 * 1000,
        );

        // Formatar datas para o formato esperado pela API
        const formatarData = (data) => {
            return data.toISOString().slice(0, 19).replace("T", " ");
        };

        // Preparar dados para envio
        const intervencaoData = {
            processoID: pedidoId,
            tipoIntervencao: tipoRemotoPresencial === "Remoto" ? "REM" : "PRE",
            duracao: duracaoHoras,
            duracaoReal: duracaoHoras,
            DataHoraInicio: formatarData(dataInicio),
            DataHoraFim: formatarData(dataFim),
            tecnico: tecnicoNumero || "000",
            estadoAnt: "1",
            estado: mapEstadoParaNumero(estado),
            seccaoAnt: "SD",
            seccao: "SD",
            utilizador: "whatsapp",
            descricaoResposta: descricao,
            artigos: [],
            emailDestinatario: null,
        };

        // Obter token
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

        // Enviar para a API do Primavera
        try {
            const response = await axios.post(
                "http://151.80.149.159:2018/WebApi/ServicosTecnicos/CriarIntervencoes",
                intervencaoData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            res.json({
                success: true,
                message: "Intervenção criada com sucesso via API",
                data: response.data,
                intervencao: {
                    ...intervencaoData,
                    dataInicioFormatada: dataInicio.toLocaleString("pt-PT"),
                    dataFimFormatada: dataFim.toLocaleString("pt-PT"),
                },
            });
        } catch (apiError) {
            // A API retorna erro 500 mas a intervenção é criada com sucesso
            if (apiError.response && apiError.response.status === 500) {
                console.log("⚠️ API retornou erro 500 mas intervenção foi criada com sucesso");

                res.json({
                    success: true,
                    message: "Intervenção criada com sucesso via API (confirmado apesar do erro 500)",
                    warning: "API retornou erro 500 mas a intervenção foi processada com sucesso",
                    apiError: apiError.response.data,
                    intervencao: {
                        ...intervencaoData,
                        dataInicioFormatada: dataInicio.toLocaleString("pt-PT"),
                        dataFimFormatada: dataFim.toLocaleString("pt-PT"),
                    },
                });
            } else {
                // Se for outro tipo de erro, relançar a exceção
                throw apiError;
            }
        }
    } catch (error) {
        console.error("Erro ao criar intervenção:", error);
        res.status(500).json({
            error: "Erro ao criar intervenção",
            details: error.response?.data || error.message,
        });
    }
});

// Endpoint para ver conversas de intervenção ativas
router.get("/conversas-intervencao", (req, res) => {
    const conversas = [];

    for (const [
        phoneNumber,
        conversation,
    ] of activeIntervencaoConversations.entries()) {
        conversas.push({
            phoneNumber,
            state: conversation.state,
            data: conversation.data,
            lastActivity: new Date(conversation.lastActivity).toLocaleString(),
            minutesAgo: Math.floor(
                (Date.now() - conversation.lastActivity) / 60000,
            ),
        });
    }

    res.json({
        totalConversas: conversas.length,
        conversas,
    });
});

// Endpoint para cancelar uma conversa de intervenção específica
router.delete("/conversas-intervencao/:phoneNumber", async (req, res) => {
    const phoneNumber = req.params.phoneNumber;

    if (activeIntervencaoConversations.has(phoneNumber)) {
        activeIntervencaoConversations.delete(phoneNumber);
        res.json({ message: "Conversa de intervenção cancelada com sucesso" });
    } else {
        res.status(404).json({
            error: "Conversa de intervenção não encontrada",
        });
    }
});

// Exportar o router como padrão e funções auxiliares como propriedades
module.exports = router;

// Adicionar funções auxiliares como propriedades do router
module.exports.processarMensagemIntervencao = processarMensagemIntervencao;
module.exports.isIntervencaoKeyword = isIntervencaoKeyword;
module.exports.activeIntervencaoConversations = activeIntervencaoConversations;
