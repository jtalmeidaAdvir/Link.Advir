const express = require("express");
const router = express.Router();
const Schedule = require("../models/Schedule");
const { Op } = require("sequelize");
const axios = require("axios");

console.log("✅ [VERIFICAÇÃO PONTO] Router carregado");

// Endpoint para criar verificação de ponto
router.post("/criar", async (req, res) => {
    try {
        const {
            nome,
            lista_contactos_id,
            horario_inicio,
            horario_fim,
            intervalo_minutos,
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
                error: "Lista de contactos não encontrada2",
            });
        }

        const novaVerificacao = await Schedule.create({
            message:
                mensagem_template ||
                "⚠️ Olá! Notamos que ainda não registou o seu ponto de hoje. Por favor, regularize a situação o mais breve possível.",
           contact_list: JSON.stringify(lista.contacts),

            frequency: "custom",
            time: new Date(`1970-01-01T${horario_inicio}:00Z`),
            horario_inicio: horario_inicio,
            horario_fim: horario_fim,
            intervalo_minutos: intervalo_minutos || 1,
            days: JSON.stringify(dias_semana || [1, 2, 3, 4, 5]),
            start_date: new Date(),
            enabled: ativo !== undefined ? ativo : true,
            priority: "warning",
            tipo: "verificacao_ponto",
            lista_contactos_id: lista_contactos_id,
            nome_configuracao: nome,
        });

        res.json({
            success: true,
            message: "Verificação de ponto criada com sucesso",
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
        console.error("Erro ao criar verificação de ponto:", error);
        res.status(500).json({
            error: "Erro interno ao criar verificação de ponto",
        });
    }
});

// Endpoint para listar verificações
router.get("/listar", async (req, res) => {
    try {
        const Contact = require("../models/Contact");

        const verificacoes = await Schedule.findAll({
            where: {
                tipo: "verificacao_ponto",
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
        console.error("Erro ao listar verificações:", error);
        res.status(500).json({
            error: "Erro ao listar verificações",
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
        tipo: "verificacao_ponto",
    },
});

if (!verificacao) {
    console.log(`❌ [VERIFICAÇÃO PONTO] Verificação ${id} não encontrada`);
    return res.status(404).json({
        error: "Verificação não encontrada",
    });
} else {
    console.log(`✅ [VERIFICAÇÃO PONTO] Verificação encontrada: ${verificacao.nome_configuracao}`);
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
                tipo: "verificacao_ponto",
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

// Endpoint para executar verificação manualmente com lógica melhorada
router.post("/:id/executar", async (req, res) => {
    console.log(`🎯 [VERIFICAÇÃO PONTO] Executar verificação ID: ${req.params.id}`);

    try {
        const { id } = req.params;

        const verificacao = await Schedule.findOne({
            where: { id, tipo: "verificacao_ponto" },
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
        let semRegisto = 0;
        let erros = 0;
        let comRegisto = 0;
        let semHorario = 0;
        let foraDoPeriodo = 0;
        let jaNotificado = 0;

        for (const contacto of contactos) {
            const phone = contacto.phone;
            const user_id = contacto.user_id;

            console.log(`\n🔍 Processando ${phone} (user_id: ${user_id ?? "N/A"})`);

            try {
                // 1. Verificar se tem user_id (obrigatório para verificação de horário e ponto)
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

                // 3. Verificar se tem horário associado e se está no período válido
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

                // 5. Verificar se hoje é um dia de trabalho segundo o horário
                const diaSemana = agora.getDay(); // 0=Domingo, 1=Segunda, etc
                if (horarioInfo.diasSemana && !horarioInfo.diasSemana.includes(diaSemana)) {
                    console.log(`📅 Hoje (${diaSemana}) não é dia de trabalho para este utilizador`);
                    continue;
                }

                // 6. Verificar se já passou tempo suficiente após a hora de entrada
                // Para dar margem, só enviamos a mensagem depois de um certo tempo após a hora de entrada
                if (horarioInfo.horaEntrada) {
                    const [horaEntradaH, horaEntradaM] = horarioInfo.horaEntrada.split(':').map(Number);
                    const [horaAtualH, horaAtualM] = horaAtual.split(':').map(Number);

                    const minutosEntrada = horaEntradaH * 60 + horaEntradaM;
                    const minutosAtual = horaAtualH * 60 + horaAtualM;
                    const diferencaMinutos = minutosAtual - minutosEntrada;

                    // Só enviar se já passou pelo menos 30 minutos da hora de entrada
                    if (diferencaMinutos < 30) {
                        console.log(`⏰ Ainda não passou tempo suficiente desde a hora de entrada (${horarioInfo.horaEntrada}). Diferença: ${diferencaMinutos} min`);
                        continue;
                    }
                }

                // 7. Verificar se já registou ponto hoje
                const pontoCheck = await axios.get(
                    `https://backend.advir.pt/api/registo-ponto-obra/verificar-registo?user_id=${user_id}&data=${hoje}`,
                    { headers: { Authorization: req.headers.authorization } }
                );

                if (pontoCheck.data.temRegisto) {
                    console.log(`✅ Utilizador já registou ponto hoje`);
                    comRegisto++;
                    continue;
                }

                console.log(`⚠️ Utilizador sem registo de ponto, enviando mensagem...`);
                semRegisto++;

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

                // Adicionar à lista de notificados hoje para evitar duplicados
                notificadosHoje.push(user_id.toString());

                // Delay entre mensagens para evitar bloqueio
                await new Promise(r => setTimeout(r, 2000));

            } catch (e) {
                console.error(`❌ Erro ao processar ${phone}:`, e.message);
                erros++;
            }
        }

        // Atualizar estatísticas da verificação e salvar lista de notificados
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
        console.log(`   - Com registo: ${comRegisto}`);
        console.log(`   - Sem registo: ${semRegisto}`);
        console.log(`   - Sem horário: ${semHorario}`);
        console.log(`   - Fora do período: ${foraDoPeriodo}`);
        console.log(`   - Já notificado: ${jaNotificado}`);
        console.log(`   - Erros: ${erros}`);

        return res.json({
            success: true,
            mensagensEnviadas,
            semRegisto,
            comRegisto,
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

// Rota de teste WhatsApp dentro do router
router.get('/teste-whatsapp', async (req, res) => {
    const whatsappService = req.app.get('whatsappService');

    if (!whatsappService?.isReady && !whatsappService?.isClientReady) {
        return res.status(500).send("WhatsApp não está pronto!");
    }

    try {
        await whatsappService.sendMessage("351912345678@c.us", "Teste de mensagem");
        res.send("Mensagem enviada com sucesso!");
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao enviar mensagem: " + err.message);
    }
});


module.exports = router;
