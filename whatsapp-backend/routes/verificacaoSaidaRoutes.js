const express = require("express");
const router = express.Router();
const Schedule = require("../models/Schedule");
const { Op } = require("sequelize");
const axios = require("axios");

console.log("✅ [VERIFICAÇÃO SAÍDA] Router carregado");

// Endpoint para criar verificação de saída
router.post("/criar", async (req, res) => {
    try {
        const {
            nome,
            lista_contactos_id,
            horario_inicio,
            horario_fim,
            intervalo_minutos,
            minutos_tolerancia,
            mensagem_template,
            dias_semana,
            ativo,
        } = req.body;

        if (!nome || !lista_contactos_id || !horario_inicio || !horario_fim) {
            return res.status(400).json({
                error: "Nome, lista de contactos, horário de início e fim são obrigatórios",
            });
        }

        // Buscar dados da lista de contactos
        const Contact = require("../models/Contact");
        const lista = await Contact.findByPk(lista_contactos_id);

        if (!lista) {
            return res.status(404).json({
                error: "Lista de contactos não encontrada",
            });
        }

        const novaVerificacao = await Schedule.create({
            message:
                mensagem_template ||
                "🚪 Olá! Notamos que ainda não registou a sua saída de hoje. Por favor, regularize a situação o mais breve possível.",
           contact_list: JSON.stringify(lista.contacts),

            frequency: "custom",
            time: new Date(`1970-01-01T${horario_inicio}:00Z`),
            horario_inicio: horario_inicio,
            horario_fim: horario_fim,
            intervalo_minutos: intervalo_minutos || 1,
            minutos_tolerancia: minutos_tolerancia || 10,
            days: JSON.stringify(dias_semana || [1, 2, 3, 4, 5]),
            start_date: new Date(),
            enabled: ativo !== undefined ? ativo : true,
            priority: "warning",
            tipo: "verificacao_saida",
            lista_contactos_id: lista_contactos_id,
            nome_configuracao: nome,
        });

        res.json({
            success: true,
            message: "Verificação de saída criada com sucesso",
            configuracao: {
                id: novaVerificacao.id,
                nome: nome,
                lista_contactos_id: lista_contactos_id,
                horario_inicio: horario_inicio,
                horario_fim: horario_fim,
                intervalo_minutos: intervalo_minutos || 1,
                ativo: novaVerificacao.enabled,
            },
        });
    } catch (error) {
        console.error("Erro ao criar verificação de saída:", error);
        res.status(500).json({
            error: "Erro interno ao criar verificação de saída",
        });
    }
});

// Endpoint para listar verificações de saída
router.get("/listar", async (req, res) => {
    try {
        const Contact = require("../models/Contact");

        const verificacoes = await Schedule.findAll({
            where: {
                tipo: "verificacao_saida",
            },
            order: [["id", "DESC"]],
        });

        const configuracoes = await Promise.all(
            verificacoes.map(async (verif) => {
                let listaNome = "Lista não encontrada";
                if (verif.lista_contactos_id) {
                    const lista = await Contact.findByPk(
                        verif.lista_contactos_id,
                    );
                    if (lista) {
                        listaNome = lista.name;
                    }
                }

                const diasSemana = JSON.parse(verif.days || "[]");
                const diasTexto = diasSemana
                    .map((d) => {
                        const dias = [
                            "Dom",
                            "Seg",
                            "Ter",
                            "Qua",
                            "Qui",
                            "Sex",
                            "Sáb",
                        ];
                        return dias[d] || d;
                    })
                    .join(", ");

                return {
                    id: verif.id,
                    nome: verif.nome_configuracao,
                    lista_contactos_id: verif.lista_contactos_id,
                    lista_nome: listaNome,
                    horario_verificacao: new Date(
                        verif.time,
                    ).toLocaleTimeString("pt-PT", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    horario_inicio: verif.horario_inicio || verif.time,
                    horario_fim: verif.horario_fim || verif.time,
                    intervalo_minutos: verif.intervalo_minutos || 60,
                    mensagem_template: verif.message,
                    dias_semana: diasSemana,
                    dias_semana_texto: diasTexto,
                    ativo: verif.enabled,
                    ultima_execucao: verif.last_sent,
                    total_execucoes: verif.total_sent,
                };
            }),
        );

        res.json({
            success: true,
            configuracoes: configuracoes,
        });
    } catch (error) {
        console.error("Erro ao listar verificações de saída:", error);
        res.status(500).json({
            error: "Erro ao listar verificações de saída",
        });
    }
});

// Endpoint para alternar estado
router.put("/:id/toggle", async (req, res) => {
    try {
        const { id } = req.params;
        const { ativo } = req.body;

        const verificacao = await Schedule.findOne({
            where: {
                id: id,
                tipo: "verificacao_saida",
            },
        });

        if (!verificacao) {
            console.log(`❌ [VERIFICAÇÃO SAÍDA] Verificação ${id} não encontrada`);
            return res.status(404).json({
                error: "Verificação não encontrada",
            });
        } else {
            console.log(`✅ [VERIFICAÇÃO SAÍDA] Verificação encontrada: ${verificacao.nome_configuracao}`);
        }

        await verificacao.update({ enabled: ativo });

        res.json({
            success: true,
            message: `Verificação ${ativo ? "ativada" : "desativada"} com sucesso`,
        });
    } catch (error) {
        console.error("Erro ao alternar estado:", error);
        res.status(500).json({
            error: "Erro ao alternar estado",
        });
    }
});

// Endpoint para eliminar verificação
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const verificacao = await Schedule.findOne({
            where: {
                id: id,
                tipo: "verificacao_saida",
            },
        });

        if (!verificacao) {
            return res.status(404).json({
                error: "Verificação não encontrada",
            });
        }

        await verificacao.destroy();

        res.json({
            success: true,
            message: "Verificação eliminada com sucesso",
        });
    } catch (error) {
        console.error("Erro ao eliminar verificação:", error);
        res.status(500).json({
            error: "Erro ao eliminar verificação",
        });
    }
});

// Endpoint para executar verificação manualmente
router.post("/:id/executar", async (req, res) => {
    console.log(`🎯 [VERIFICAÇÃO SAÍDA] Executar verificação ID: ${req.params.id}`);

    try {
        const { id } = req.params;

        const verificacao = await Schedule.findOne({
            where: { id, tipo: "verificacao_saida" },
        });

        if (!verificacao) {
            return res.status(404).json({ error: "Verificação não encontrada" });
        }

        console.log(`📌 Verificação encontrada: ${verificacao.nome_configuracao}`);
        console.log(`📋 Contact list raw:`, verificacao.contact_list);

        // Processar contactos direto do Schedule
        let contactos = [];
        try {
            let rawContacts = JSON.parse(verificacao.contact_list);

            // Se ainda for string, parse novamente
            if (typeof rawContacts === "string") {
                rawContacts = JSON.parse(rawContacts);
            }

            if (!Array.isArray(rawContacts)) {
                throw new Error("contact_list não é array");
            }

            contactos = rawContacts.map(c => ({
                phone: c.phone || c.numeroTecnico || c.numero || c.telefone,
                user_id: c.user_id || c.userID || null,
            }));

            console.log("👥 Total contactos processados:", contactos.length);

        } catch (e) {
            console.error("Erro ao processar contactos:", e);
            return res.status(500).json({ error: "Contact_list inválido" });
        }

        const hoje = new Date().toISOString().split("T")[0];
        const agora = new Date();
        const horaAtual = `${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}`;

        // Carregar lista de já notificados hoje
        let notificadosHoje = [];
        try {
            if (verificacao.notificados_hoje) {
                const dados = JSON.parse(verificacao.notificados_hoje);
                // Verificar se é do mesmo dia
                if (dados.data === hoje) {
                    notificadosHoje = dados.user_ids || [];
                }
            }
        } catch (e) {
            console.log("⚠️ Erro ao carregar notificados_hoje, iniciando vazio");
        }

        let mensagensEnviadas = 0;
        let semSaida = 0;
        let erros = 0;
        let comSaida = 0;
        let semHorario = 0;
        let foraDoPeriodo = 0;
        let jaNotificado = 0;
        let semEntrada = 0;

        for (const contacto of contactos) {
            const phone = contacto.phone;
            const user_id = contacto.user_id;

            console.log(`\n🔍 Processando ${phone} (user_id: ${user_id ?? "N/A"})`);

            try {
                // 1. Verificar se tem user_id
                if (!user_id) {
                    console.log(`⚠️ Contacto sem user_id, pulando verificação`);
                    semHorario++;
                    continue;
                }

                // 2. Verificar se já foi notificado hoje
                if (notificadosHoje.includes(user_id.toString())) {
                    console.log(`✅ Utilizador ${user_id} já foi notificado hoje, pulando...`);
                    jaNotificado++;
                    continue;
                }

                // 3. Verificar se tem horário associado
                const horarioCheck = await axios.get(
                    `https://backend.advir.pt/api/registo-ponto-obra/verificar-horario?user_id=${user_id}&data=${hoje}`,
                    { headers: { Authorization: req.headers.authorization } }
                );

                if (!horarioCheck.data.temHorario) {
                    console.log(`⏰ Utilizador sem horário associado, não enviando mensagem`);
                    semHorario++;
                    continue;
                }

                const horarioInfo = horarioCheck.data.horario;
                console.log(`✅ Horário encontrado:`, horarioInfo);

                // 4. Verificar se a data atual está dentro do período do horário
                const dataInicio = new Date(horarioInfo.dataInicio);
                const dataFim = horarioInfo.dataFim ? new Date(horarioInfo.dataFim) : null;
                const dataHoje = new Date(hoje);

                if (dataHoje < dataInicio) {
                    console.log(`📅 Data atual (${hoje}) é anterior ao início do horário (${horarioInfo.dataInicio})`);
                    foraDoPeriodo++;
                    continue;
                }

                if (dataFim && dataHoje > dataFim) {
                    console.log(`📅 Data atual (${hoje}) é posterior ao fim do horário (${horarioInfo.dataFim})`);
                    foraDoPeriodo++;
                    continue;
                }

                // 5. Verificar se hoje é um dia de trabalho
                const diaSemana = agora.getDay();
                if (horarioInfo.diasSemana && !horarioInfo.diasSemana.includes(diaSemana)) {
                    console.log(`📅 Hoje (${diaSemana}) não é dia de trabalho para este utilizador`);
                    continue;
                }

                // 6. Verificar se já passou a hora de saída + margem
                if (horarioInfo.horaSaida) {
                    let horaSaida = horarioInfo.horaSaida;

                    // Se vier como timestamp ISO, extrair apenas a hora
                    if (horaSaida.includes('T')) {
                        const date = new Date(horaSaida);
                        horaSaida = `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
                    }

                    const [horaSaidaH, horaSaidaM] = horaSaida.split(':').map(Number);
                    const [horaAtualH, horaAtualM] = horaAtual.split(':').map(Number);

                    const minutosSaida = horaSaidaH * 60 + horaSaidaM;
                    const minutosAtual = horaAtualH * 60 + horaAtualM;
                    const diferencaMinutos = minutosAtual - minutosSaida;

                    // Só enviar se já passou pelo menos 10 minutos da hora de saída
                    if (diferencaMinutos < 10) {
                        console.log(`⏰ Ainda não passaram 10min da saída esperada (${horaSaida}). Diferença: ${diferencaMinutos} min`);
                        continue;
                    }
                } else {
                    console.log(`⏰ Utilizador sem hora de saída definida no horário`);
                    semHorario++;
                    continue;
                }

                // 7. Verificar se já registou saída hoje
                const saidaCheck = await axios.get(
                    `https://backend.advir.pt/api/registo-ponto-obra/verificar-saida?user_id=${user_id}&data=${hoje}`,
                    { headers: { Authorization: req.headers.authorization } }
                );

                // Se não tem entrada, não faz sentido cobrar saída
                if (!saidaCheck.data.temEntrada) {
                    console.log(`⚠️ Utilizador não tem entrada registada hoje`);
                    semEntrada++;
                    continue;
                }

                if (saidaCheck.data.temSaida) {
                    console.log(`✅ Utilizador já registou saída hoje`);
                    comSaida++;
                    continue;
                }

                console.log(`⚠️ Utilizador sem registo de saída, enviando mensagem...`);
                semSaida++;

                // 8. Enviar mensagem via WhatsApp
                const whatsappService = req.app.get("whatsappService");
                if (!whatsappService?.isClientReady) {
                    console.error("❌ WhatsApp não está pronto");
                    erros++;
                    continue;
                }

                await whatsappService.sendMessage(phone + "@c.us", verificacao.message);
                console.log(`✅ Mensagem enviada com sucesso para ${phone}`);
                mensagensEnviadas++;

                // Adicionar à lista de notificados hoje
                notificadosHoje.push(user_id.toString());

                // Delay entre mensagens
                await new Promise(r => setTimeout(r, 2000));

            } catch (e) {
                console.error(`❌ Erro ao processar ${phone}:`, e.message);
                erros++;
            }
        }

        // Atualizar estatísticas
        await verificacao.update({
            last_sent: new Date(),
            total_sent: (verificacao.total_sent || 0) + 1,
            notificados_hoje: JSON.stringify({
                data: hoje,
                user_ids: notificadosHoje
            })
        });

        console.log(`\n📊 Resumo da execução:`);
        console.log(`   - Total contactos: ${contactos.length}`);
        console.log(`   - Mensagens enviadas: ${mensagensEnviadas}`);
        console.log(`   - Com saída: ${comSaida}`);
        console.log(`   - Sem saída: ${semSaida}`);
        console.log(`   - Sem entrada: ${semEntrada}`);
        console.log(`   - Sem horário: ${semHorario}`);
        console.log(`   - Fora do período: ${foraDoPeriodo}`);
        console.log(`   - Já notificado: ${jaNotificado}`);
        console.log(`   - Erros: ${erros}`);

        return res.json({
            success: true,
            mensagensEnviadas,
            semSaida,
            comSaida,
            semEntrada,
            semHorario,
            foraDoPeriodo,
            jaNotificado,
            erros,
            totalContactos: contactos.length,
        });

    } catch (error) {
        console.error("❌ Erro na execução:", error);
        return res.status(500).json({ error: "Erro interno: " + error.message });
    }
});

module.exports = router;
