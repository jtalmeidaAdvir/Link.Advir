const express = require("express");
const router = express.Router();
const Schedule = require("../models/Schedule");
const transporter = require("../../backend/config/email");
const RegistoPontoObra = require("../models/registoPontoObra");
const User = require("../models/user");
const Obra = require("../models/obra");
const { Op } = require("sequelize");

// Listar todos os relatórios agendados
router.get("/relatorios-agendados", async (req, res) => {
    try {
        const relatorios = await Schedule.findAll({
            where: { tipo: "relatorio_email" },
            order: [["created_at", "DESC"]],
        });

        const formattedRelatorios = relatorios.map((rel) => ({
            id: rel.id,
            nome: rel.message,
            tipo: rel.priority || "registos_obra_dia",
            obra_id: rel.empresa_id,
            emails: rel.contact_list
                ? JSON.parse(rel.contact_list).join(", ")
                : "",
            frequency: rel.frequency,
            time: rel.time,
            days: rel.days ? JSON.parse(rel.days) : [],
            enabled: rel.enabled,
            last_sent: rel.last_sent,
            total_sent: rel.total_sent,
            createdAt: rel.created_at,
        }));

        res.json(formattedRelatorios);
    } catch (error) {
        console.error("Erro ao listar relatórios:", error);
        res.status(500).json({ error: "Erro ao listar relatórios agendados" });
    }
});

// Criar novo relatório agendado
router.post("/relatorios-agendados", async (req, res) => {
    try {
        const { nome, tipo, obra_id, emails, frequency, time, days, enabled } =
            req.body;

        if (!nome || !emails) {
            return res
                .status(400)
                .json({ error: "Nome e emails são obrigatórios" });
        }

        // Converter emails de string para array
        const emailsArray = emails.split(",").map((e) => e.trim());

        const novoRelatorio = await Schedule.create({
            message: nome,
            tipo: "relatorio_email",
            priority: tipo || "registos_obra_dia",
            empresa_id: obra_id || null,
            contact_list: JSON.stringify(emailsArray),
            frequency: frequency || "daily",
            time: new Date(`1970-01-01T${time}:00.000Z`),
            days: days ? JSON.stringify(days) : JSON.stringify([1, 2, 3, 4, 5]),
            enabled: enabled !== undefined ? enabled : true,
        });

        res.status(201).json({
            message: "Relatório agendado com sucesso",
            relatorio: novoRelatorio,
        });
    } catch (error) {
        console.error("Erro ao criar relatório:", error);
        res.status(500).json({ error: "Erro ao criar relatório agendado" });
    }
});

// Atualizar relatório
router.put("/relatorios-agendados/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const relatorio = await Schedule.findByPk(id);
        if (!relatorio) {
            return res.status(404).json({ error: "Relatório não encontrado" });
        }

        await relatorio.update({
            enabled:
                updates.enabled !== undefined
                    ? updates.enabled
                    : relatorio.enabled,
        });

        res.json({ message: "Relatório atualizado com sucesso" });
    } catch (error) {
        console.error("Erro ao atualizar relatório:", error);
        res.status(500).json({ error: "Erro ao atualizar relatório" });
    }
});

// Eliminar relatório
router.delete("/relatorios-agendados/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Schedule.destroy({ where: { id } });

        if (deleted) {
            res.json({ message: "Relatório eliminado com sucesso" });
        } else {
            res.status(404).json({ error: "Relatório não encontrado" });
        }
    } catch (error) {
        console.error("Erro ao eliminar relatório:", error);
        res.status(500).json({ error: "Erro ao eliminar relatório" });
    }
});

// Executar relatório manualmente
router.post("/relatorios-agendados/:id/executar", async (req, res) => {
    try {
        const { id } = req.params;

        const relatorio = await Schedule.findByPk(id);
        if (!relatorio) {
            return res.status(404).json({ error: "Relatório não encontrado" });
        }

        const resultado = await executarRelatorio(relatorio);

        res.json(resultado);
    } catch (error) {
        console.error("Erro ao executar relatório:", error);
        res.status(500).json({ error: "Erro ao executar relatório" });
    }
});

// Função para executar o relatório
async function executarRelatorio(schedule) {
    try {
        const tipo = schedule.priority || "registos_obra_dia";
        const emails = JSON.parse(schedule.contact_list);
        const obra_id = schedule.empresa_id; // Use o empresa_id do schedule

        let dadosRelatorio = "";
        let assunto = "";

        // Gerar dados do relatório baseado no tipo
        switch (tipo) {
            case "registos_obra_dia":
                const resultado = await gerarRelatorioRegistosDia(obra_id); // Passa obra_id (que pode ser o empresa_id)
                dadosRelatorio = resultado.html;
                assunto = resultado.assunto;
                break;

            case "resumo_mensal":
                const resultadoMensal =
                    await gerarRelatorioResumoMensal(obra_id);
                dadosRelatorio = resultadoMensal.html;
                assunto = resultadoMensal.assunto;
                break;

            case "mapa_registos":
                const resultadoMapa = await gerarRelatorioMapaRegistos();
                dadosRelatorio = resultadoMapa.html;
                assunto = resultadoMapa.assunto;
                break;

            default:
                dadosRelatorio = "<p>Tipo de relatório não reconhecido</p>";
                assunto = "Relatório Advir";
        }

        // Enviar email para cada destinatário
        for (const email of emails) {
            await transporter.sendMail({
                from: "noreply.advir@gmail.com",
                to: email,
                subject: assunto,
                html: dadosRelatorio,
            });
        }

        // Atualizar última execução
        await schedule.update({
            last_sent: new Date(),
            total_sent: (schedule.total_sent || 0) + emails.length,
        });

        return {
            success: true,
            message: `Relatório enviado para ${emails.length} destinatário(s)`,
        };
    } catch (error) {
        console.error("Erro ao executar relatório:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

// Gerar relatório de registos do dia
async function gerarRelatorioRegistosDia(empresa_ou_obra_id) {
    const hoje = new Date().toISOString().split("T")[0];
    const dataInicio = new Date(`${hoje}T00:00:00.000Z`);
    const dataFim = new Date(`${hoje}T23:59:59.999Z`);

    const whereClause = {
        timestamp: { [Op.between]: [dataInicio, dataFim] },
    };

    let obraNome = "Todas as Obras";
    let obrasParaFiltrar = [];

    if (empresa_ou_obra_id) {
        // Primeiro tentar como obra
        const obra = await Obra.findByPk(empresa_ou_obra_id);

        if (obra && obra.empresa_id) {
            // É uma obra específica
            whereClause.obra_id = obra.id;
            obrasParaFiltrar.push(obra.id);
            obraNome = `${obra.codigo} - ${obra.nome}`;
        } else {
            // Tentar como empresa_id
            const obrasDaEmpresa = await Obra.findAll({
                where: { empresa_id: empresa_ou_obra_id },
            });

            if (obrasDaEmpresa.length > 0) {
                obrasParaFiltrar = obrasDaEmpresa.map((o) => o.id);
                whereClause.obra_id = { [Op.in]: obrasParaFiltrar };

                // Buscar nome da empresa
                const { sequelize } = require("../config/database");
                const empresaResult = await sequelize.query(
                    "SELECT empresa FROM empresa WHERE id = ?",
                    {
                        replacements: [empresa_ou_obra_id],
                        type: sequelize.QueryTypes.SELECT,
                    },
                );

                const empresaNome =
                    empresaResult.length > 0
                        ? empresaResult[0].empresa
                        : `Empresa ${empresa_ou_obra_id}`;
                obraNome = ` ${empresaNome}`;
            } else {
                // Nenhuma obra encontrada para esta empresa
                return {
                    html: "<p>Nenhuma obra encontrada para esta empresa.</p>",
                    assunto: `📊 Relatório Diário - Sem dados - ${hoje}`,
                };
            }
        }
    } else {
        // Se não especificar empresa ou obra, não retornar dados
        return {
            html: "<p>Por favor, selecione uma empresa ou obra específica para gerar o relatório.</p>",
            assunto: `📊 Relatório Diário - Filtro necessário - ${hoje}`,
        };
    }

    const registos = await RegistoPontoObra.findAll({
        where: whereClause,
        include: [
            {
                model: User,
                attributes: ["id", "nome"],
            },
            {
                model: Obra,
                attributes: ["id", "codigo", "nome", "empresa_id"], // Incluir empresa_id para referência
            },
        ],
        order: [
            ["user_id", "ASC"],
            ["obra_id", "ASC"],
            ["timestamp", "ASC"],
        ],
    });

    // Agrupar por obra primeiro, depois por utilizador
    const agrupadosPorObra = {};

    registos.forEach((r) => {
        const obraId = r.obra_id;
        const obraInfo = r.Obra
            ? `${r.Obra.codigo} - ${r.Obra.nome}`
            : "Sem obra";

        if (!agrupadosPorObra[obraId]) {
            agrupadosPorObra[obraId] = {
                obraInfo: obraInfo,
                utilizadores: {},
            };
        }

        const userId = r.user_id;
        if (!agrupadosPorObra[obraId].utilizadores[userId]) {
            agrupadosPorObra[obraId].utilizadores[userId] = {
                utilizador: r.User?.nome || "Desconhecido",
                registos: [],
            };
        }

        agrupadosPorObra[obraId].utilizadores[userId].registos.push({
            tipo: r.tipo,
            timestamp: new Date(r.timestamp),
        });
    });

    // Processar cada obra
    const obrasSections = Object.entries(agrupadosPorObra)
        .map(([obraId, obraData]) => {
            const registosProcessados = Object.values(
                obraData.utilizadores,
            ).map((userGroup) => {
                const registosOrdenados = userGroup.registos.sort(
                    (a, b) => a.timestamp - b.timestamp,
                );
                const ultimoRegisto =
                    registosOrdenados[registosOrdenados.length - 1];

                let horasTrabalhadas = 0;

                // Calcular horas entre entradas e saídas
                for (let i = 0; i < registosOrdenados.length; i++) {
                    if (registosOrdenados[i].tipo === "entrada") {
                        const entrada = registosOrdenados[i].timestamp;
                        const saida =
                            registosOrdenados[i + 1]?.tipo === "saida"
                                ? registosOrdenados[i + 1].timestamp
                                : new Date();

                        const diff = (saida - entrada) / (1000 * 60 * 60);
                        horasTrabalhadas += diff;
                    }
                }

                const horas = Math.floor(horasTrabalhadas);
                const minutos = Math.round((horasTrabalhadas - horas) * 60);

                // Adicionar 1 hora para corrigir timezone
                const timestampCorrigido = new Date(
                    ultimoRegisto.timestamp.getTime() + 60 * 60 * 1000,
                );

                return {
                    utilizador: userGroup.utilizador,
                    tipo: ultimoRegisto.tipo.toUpperCase(),
                    hora: timestampCorrigido.toLocaleTimeString("pt-PT", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    }),
                    horasTrabalhadas: `${horas}h${minutos > 0 ? ` ${minutos}min` : ""}`,
                };
            });

            return `
            <h3 style="margin-top: 20px; color: #333;">🏗️ ${obraData.obraInfo}</h3>
            <p><strong>Total de trabalhadores:</strong> ${registosProcessados.length}</p>
            <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
                <thead style="background-color: #f0f0f0;">
                    <tr>
                        <th>Trabalhador</th>
                        <th>Estado Atual</th>
                        <th>Última Ação</th>
                        <th>Horas Trabalhadas</th>
                    </tr>
                </thead>
                <tbody>
                    ${registosProcessados
                        .map(
                            (r) => `
                        <tr>
                            <td>${r.utilizador}</td>
                            <td>
                                ${r.tipo === "ENTRADA" ? "🟢 ENTRADA" : "🔴 SAÍDA"}
                            </td>
                            <td>${r.hora}</td>
                            <td><strong>${r.horasTrabalhadas}</strong></td>
                        </tr>
                    `,
                        )
                        .join("")}
                </tbody>
            </table>
        `;
        })
        .join("");

    const totalRegistos = registos.length;

    let html = `
        <h2>📊 Relatório de Registos de Ponto - ${new Date().toLocaleDateString("pt-PT")}</h2>
        <h3 style="color: #0066cc;">📋 ${obraNome}</h3>
      
        <hr>
        ${obrasSections}
        <br>
        <p style="color: #666; font-size: 12px;">
            Relatório gerado automaticamente por Advir Link<br>
            Data/Hora: ${new Date().toLocaleString("pt-PT")}
        </p>
    `;

    return {
        html,
        assunto: `📊 Relatório Diário de Registos - ${obraNome} - ${new Date().toLocaleDateString("pt-PT")}`,
    };
}

// Gerar relatório resumo mensal
async function gerarRelatorioResumoMensal(empresa_ou_obra_id) {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;

    const dataInicio = new Date(`${ano}-${mes}-01T00:00:00Z`);
    const dataFim = new Date(dataInicio);
    dataFim.setMonth(dataFim.getMonth() + 1);

    let whereClause = {
        timestamp: { [Op.between]: [dataInicio, dataFim] },
    };

    let obraNome = `Resumo Mensal - ${mes}/${ano}`;

    if (empresa_ou_obra_id) {
        // Primeiro tentar como obra
        const obra = await Obra.findByPk(empresa_ou_obra_id);

        if (obra && obra.empresa_id) {
            whereClause.obra_id = obra.id;
            obraNome = `Resumo Mensal - ${obra.codigo} - ${obra.nome} - ${mes}/${ano}`;
        } else {
            // Tentar como empresa_id
            const obrasDaEmpresa = await Obra.findAll({
                where: { empresa_id: empresa_ou_obra_id },
            });

            if (obrasDaEmpresa.length > 0) {
                const obrasIds = obrasDaEmpresa.map((o) => o.id);
                whereClause.obra_id = { [Op.in]: obrasIds };

                // Buscar nome da empresa
                const { sequelize } = require("../config/database");
                const empresaResult = await sequelize.query(
                    "SELECT empresa FROM empresa WHERE id = ?",
                    {
                        replacements: [empresa_ou_obra_id],
                        type: sequelize.QueryTypes.SELECT,
                    },
                );

                const empresaNome =
                    empresaResult.length > 0
                        ? empresaResult[0].empresa
                        : `Empresa ${empresa_ou_obra_id}`;
                obraNome = `Resumo Mensal - ${empresaNome} - ${mes}/${ano}`;
            } else {
                // Nenhuma obra encontrada para esta empresa
                return {
                    html: "<p>Nenhuma obra encontrada para esta empresa.</p>",
                    assunto: `📅 Resumo Mensal - Sem dados - ${mes}/${ano}`,
                };
            }
        }
    } else {
        // Se não especificar empresa ou obra, não retornar dados
        return {
            html: "<p>Por favor, selecione uma empresa ou obra específica para gerar o relatório.</p>",
            assunto: `📅 Resumo Mensal - Filtro necessário - ${mes}/${ano}`,
        };
    }

    const registos = await RegistoPontoObra.findAll({
        where: whereClause,
        include: [
            { model: User, attributes: ["nome"] },
            { model: Obra, attributes: ["codigo", "nome", "empresa_id"] },
        ],
        order: [["timestamp", "ASC"]],
    });

    const html = `
        <h2>📅 ${obraNome}</h2>
        <p><strong>Total de registos:</strong> ${registos.length}</p>
        <p>Este é um relatório resumido. Detalhes completos disponíveis no sistema.</p>
    `;

    return {
        html,
        assunto: `📅 ${obraNome}`,
    };
}

// Gerar relatório mapa de registos
async function gerarRelatorioMapaRegistos() {
    const hoje = new Date().toISOString().split("T")[0];

    const html = `
        <h2>🗺️ Mapa de Registos - ${new Date().toLocaleDateString("pt-PT")}</h2>
        <p>Mapa completo de registos disponível no sistema Advir Link.</p>
    `;

    return {
        html,
        assunto: `🗺️ Mapa de Registos - ${new Date().toLocaleDateString("pt-PT")}`,
    };
}

module.exports = { router, executarRelatorio };
