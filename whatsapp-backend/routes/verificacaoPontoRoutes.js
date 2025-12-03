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
            horario_verificacao,
            mensagem_template,
            dias_semana,
            ativo,
        } = req.body;

        if (!nome || !lista_contactos_id) {
            return res.status(400).json({
                error: "Nome e lista de contactos são obrigatórios",
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
            time: new Date(`1970-01-01T${horario_verificacao}:00Z`),
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
                horario: horario_verificacao,
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

// Endpoint para executar verificação manualmente
// Endpoint para executar verificação manualmente
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

        // Processar contactos direto do schedule
// Supondo que lista.contacts já é um JSON string ou array
// Processar contactos direto do Schedule
let contactos = [];
try {
    // Primeiro parse
    let rawContacts = JSON.parse(verificacao.contact_list);

    // Se ainda for string, parse novamente
if (typeof rawContacts === "string") {
    rawContacts = JSON.parse(rawContacts);
}
if (!Array.isArray(rawContacts)) throw new Error("contact_list não é array");

    // Garantir que é array
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



console.log("👥 Total contactos processados:", contactos.length);

        const hoje = new Date().toISOString().split("T")[0];

        let mensagensEnviadas = 0;
        let semRegisto = 0;
        let erros = 0;
        let comRegisto = 0;

  for (const contacto of contactos) {
    console.log(`🔍 Processando ${contacto.phone} (user_id: ${contacto.user_id ?? "N/A"})`);
            const phone = contacto.phone;
            const user_id = contacto.user_id;

            console.log(`🔍 Processando ${phone} (user_id: ${user_id ?? "N/A"})`);

            try {
                if (user_id) {
                    const check = await axios.get(
                        `http://localhost:3000/api/registo-ponto-obra/verificar-registo?user_id=${user_id}&data=${hoje}`,
                        { headers: { Authorization: req.headers.authorization } }
                    );

                    if (check.data.temRegisto) {
                        comRegisto++;
                        continue;
                    }
                }

                semRegisto++;

           const whatsappService = req.app.get("whatsappService");
if (!whatsappService?.isClientReady) {
    console.error("❌ WhatsApp não está pronto");
    erros++;
    continue;
}

                await whatsappService.sendMessage(phone + "@c.us", verificacao.message);
                mensagensEnviadas++;
                await new Promise(r => setTimeout(r, 2000));

            } catch (e) {
                console.error("Erro enviar:", e.message);
                erros++;
            }
        }

        await verificacao.update({
            last_sent: new Date(),
            total_sent: (verificacao.total_sent || 0) + 1,
        });

        return res.json({
            success: true,
            mensagensEnviadas,
            semRegisto,
            comRegisto,
            erros,
            totalContactos: contactos.length,
        });

    } catch (error) {
        console.error("Erro exec:", error);
        return res.status(500).json({ error: "Erro interno" });
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
