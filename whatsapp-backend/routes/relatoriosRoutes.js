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
    console.log(
        `📧 executarRelatorio chamado para schedule ID: ${schedule.id}`,
    );
    console.log(`📋 Dados do schedule:`, {
        id: schedule.id,
        tipo: schedule.tipo,
        priority: schedule.priority,
        empresa_id: schedule.empresa_id,
        message: schedule.message?.substring(0, 50),
    });

    try {
        const tipo = schedule.priority || "registos_obra_dia";
        const emails = JSON.parse(schedule.contact_list);
        const empresa_ou_obra_id = schedule.empresa_id; // Usar empresa_id do schedule

        console.log(`📊 Tipo de relatório: ${tipo}`);
        console.log(`📧 Destinatários: ${emails.join(", ")}`);
        console.log(`🏢 Empresa/Obra ID: ${empresa_ou_obra_id}`);

        if (!empresa_ou_obra_id) {
            console.log(`❌ ERRO: empresa_id está vazio!`);
            return {
                success: false,
                error: "empresa_id não definido no agendamento",
            };
        }

        let dadosRelatorio = "";
        let assunto = "";

        // Gerar dados do relatório baseado no tipo
        switch (tipo) {
            case "registos_obra_dia":
                console.log(
                    `📊 Gerando relatório de registos do dia para empresa/obra ${empresa_ou_obra_id}...`,
                );
                const resultado =
                    await gerarRelatorioRegistosDia(empresa_ou_obra_id);
                dadosRelatorio = resultado.html;
                assunto = resultado.assunto;
                console.log(`✅ Relatório gerado - Assunto: ${assunto}`);
                break;

            case "resumo_mensal":
                console.log(
                    `📊 Gerando resumo mensal para empresa/obra ${empresa_ou_obra_id}...`,
                );
                const resultadoMensal =
                    await gerarRelatorioResumoMensal(empresa_ou_obra_id);
                dadosRelatorio = resultadoMensal.html;
                assunto = resultadoMensal.assunto;
                console.log(`✅ Resumo mensal gerado - Assunto: ${assunto}`);
                break;

            case "mapa_registos":
                console.log(`📊 Gerando mapa de registos...`);
                const resultadoMapa = await gerarRelatorioMapaRegistos();
                dadosRelatorio = resultadoMapa.html;
                assunto = resultadoMapa.assunto;
                console.log(`✅ Mapa gerado - Assunto: ${assunto}`);
                break;

            case "resumo_ausentes_dia":
                console.log(
                    `📊 Gerando resumo de ausentes para empresa/obra ${empresa_ou_obra_id}...`,
                );
                const resultadoAusentes =
                    await gerarRelatorioAusentesDia(empresa_ou_obra_id);
                dadosRelatorio = resultadoAusentes.html;
                assunto = resultadoAusentes.assunto;
                console.log(`✅ Resumo de ausentes gerado - Assunto: ${assunto}`);
                break;

            default:
                console.log(`❌ Tipo de relatório não reconhecido: ${tipo}`);
                dadosRelatorio = "<p>Tipo de relatório não reconhecido</p>";
                assunto = "Relatório Advir";
        }

        // Enviar email para cada destinatário
        console.log(
            `📤 Enviando emails para ${emails.length} destinatário(s)...`,
        );
        for (const email of emails) {
            console.log(`📧 Enviando para: ${email}`);
            await transporter.sendMail({
                from: "noreply.advir@gmail.com",
                to: email,
                subject: assunto,
                html: dadosRelatorio,
            });
            console.log(`✅ Email enviado para: ${email}`);
        }

        // Atualizar última execução APENAS se for um schedule da BD
        if (schedule.update && typeof schedule.update === "function") {
            await schedule.update({
                last_sent: new Date(),
                total_sent: (schedule.total_sent || 0) + emails.length,
            });
            console.log(`✅ Schedule atualizado na BD`);
        } else if (schedule.id && !schedule.id.toString().startsWith("TEST_")) {
            // Atualizar manualmente via Sequelize
            await Schedule.update(
                {
                    last_sent: new Date(),
                    total_sent: (schedule.total_sent || 0) + emails.length,
                },
                { where: { id: schedule.id } },
            );
            console.log(
                `✅ Schedule ${schedule.id} atualizado manualmente na BD`,
            );
        }

        console.log(`✅ executarRelatorio concluído com sucesso`);
        return {
            success: true,
            message: `Relatório enviado para ${emails.length} destinatário(s)`,
        };
    } catch (error) {
        console.error(`❌ Erro ao executar relatório:`, error);
        return {
            success: false,
            error: error.message,
        };
    }
}

// Gerar relatório de registos do dia
async function gerarRelatorioRegistosDia(empresa_ou_obra_id) {
    console.log(
        `📊 gerarRelatorioRegistosDia chamado com empresa_ou_obra_id: ${empresa_ou_obra_id}`,
    );
    console.log(`📊 Tipo de empresa_ou_obra_id: ${typeof empresa_ou_obra_id}`);
    console.log(`📊 Valor é null? ${empresa_ou_obra_id === null}`);
    console.log(`📊 Valor é undefined? ${empresa_ou_obra_id === undefined}`);

    const hoje = new Date().toISOString().split("T")[0];
    const dataInicio = new Date(`${hoje}T00:00:00.000Z`);
    const dataFim = new Date(`${hoje}T23:59:59.999Z`);

    const whereClause = {
        timestamp: { [Op.between]: [dataInicio, dataFim] },
    };

    let obraNome = "Todas as Obras";
    let obrasParaFiltrar = [];

    // Validação mais rigorosa - aceitar 0 como válido, mas rejeitar null/undefined
    if (empresa_ou_obra_id === null || empresa_ou_obra_id === undefined) {
        // Se não especificar empresa ou obra, retornar erro
        console.log(
            `❌ Nenhum filtro especificado - empresa_ou_obra_id está vazio`,
        );
        return {
            html: "<p>Por favor, selecione uma empresa ou obra específica para gerar o relatório.</p>",
            assunto: `📊 Relatório Diário - Filtro necessário - ${hoje}`,
        };
    }

    // Primeiro tentar como obra
    const obra = await Obra.findByPk(empresa_ou_obra_id);
    console.log(
        `🔍 Busca por obra ID ${empresa_ou_obra_id}:`,
        obra ? `Encontrada - ${obra.nome}` : "Não encontrada",
    );

    if (obra && obra.empresa_id) {
        // É uma obra específica
        whereClause.obra_id = obra.id;
        obrasParaFiltrar.push(obra.id);
        obraNome = `${obra.codigo} - ${obra.nome}`;
        console.log(`✅ Filtro definido para obra específica: ${obraNome}`);
    } else {
        // Tentar como empresa_id
        console.log(
            `🔍 Tentando buscar como empresa_id: ${empresa_ou_obra_id}`,
        );
        const obrasDaEmpresa = await Obra.findAll({
            where: {
                empresa_id: empresa_ou_obra_id,
                estado: "Ativo",
            },
        });
        console.log(
            `📋 Obras encontradas para empresa ${empresa_ou_obra_id}: ${obrasDaEmpresa.length}`,
        );

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
            obraNome = `${empresaNome}`;
            console.log(
                `✅ Filtro definido para empresa: ${obraNome} (${obrasParaFiltrar.length} obras)`,
            );
        } else {
            // Nenhuma obra encontrada para esta empresa
            console.log(
                `❌ Nenhuma obra ativa encontrada para empresa ${empresa_ou_obra_id}`,
            );
            return {
                html: "<p>Nenhuma obra ativa encontrada para esta empresa.</p>",
                assunto: `📊 Relatório Diário - Sem obras ativas - ${hoje}`,
            };
        }
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

    // Buscar visitantes
    const { sequelize } = require("../config/database");
    const visitantesQuery = `
        SELECT 
            rpv.id,
            rpv.visitante_id,
            rpv.obra_id,
            rpv.tipo,
            rpv.timestamp,
            v.primeiroNome + ' ' + v.ultimoNome as nome,
            v.nomeEmpresa,
            'visitante' as tipoEntidade
        FROM registo_ponto_visitantes rpv
        INNER JOIN visitantes v ON v.id = rpv.visitante_id
        WHERE rpv.obra_id ${obrasParaFiltrar.length > 0 ? "IN (" + obrasParaFiltrar.join(",") + ")" : "= " + empresa_ou_obra_id}
        AND CONVERT(DATE, rpv.timestamp) = CONVERT(DATE, GETDATE())
        ORDER BY rpv.timestamp ASC
    `;

    const visitantes = await sequelize.query(visitantesQuery, {
        type: sequelize.QueryTypes.SELECT,
    });

    // Buscar externos
    const externosQuery = `
        SELECT 
            rpe.id,
            rpe.externo_id,
            rpe.obra_id,
            rpe.tipo,
            rpe.timestamp,
            rpe.nome,
            e.empresa as nomeEmpresa,
            'externo' as tipoEntidade
        FROM RegistoPontoExternos rpe
        LEFT JOIN ExternosJPA e ON e.id = rpe.externo_id
        WHERE rpe.obra_id ${obrasParaFiltrar.length > 0 ? "IN (" + obrasParaFiltrar.join(",") + ")" : "= " + empresa_ou_obra_id}
        AND CONVERT(DATE, rpe.timestamp) = CONVERT(DATE,GETDATE())
        ORDER BY rpe.timestamp ASC
    `;

    const externos = await sequelize.query(externosQuery, {
        type: sequelize.QueryTypes.SELECT,
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
                tipoEntidade: "colaborador",
                registos: [],
            };
        }

        agrupadosPorObra[obraId].utilizadores[userId].registos.push({
            tipo: r.tipo,
            timestamp: new Date(r.timestamp),
        });
    });

    // Adicionar visitantes ao agrupamento
    visitantes.forEach((v) => {
        const obraId = v.obra_id;
        const obraInfo = `Obra ${obraId}`; // Poderia buscar nome da obra se necessário

        if (!agrupadosPorObra[obraId]) {
            agrupadosPorObra[obraId] = {
                obraInfo: obraInfo,
                utilizadores: {},
            };
        }

        const visitanteKey = `visitante_${v.visitante_id}`;
        if (!agrupadosPorObra[obraId].utilizadores[visitanteKey]) {
            agrupadosPorObra[obraId].utilizadores[visitanteKey] = {
                utilizador: v.nome,
                nomeEmpresa: v.nomeEmpresa,
                tipoEntidade: "visitante",
                registos: [],
            };
        }

        agrupadosPorObra[obraId].utilizadores[visitanteKey].registos.push({
            tipo: v.tipo,
            timestamp: new Date(v.timestamp),
        });
    });

    // Adicionar externos ao agrupamento
    externos.forEach((e) => {
        const obraId = e.obra_id;
        const obraInfo = `Obra ${obraId}`;

        if (!agrupadosPorObra[obraId]) {
            agrupadosPorObra[obraId] = {
                obraInfo: obraInfo,
                utilizadores: {},
            };
        }

        const externoKey = `externo_${e.externo_id}`;
        if (!agrupadosPorObra[obraId].utilizadores[externoKey]) {
            agrupadosPorObra[obraId].utilizadores[externoKey] = {
                utilizador: e.nome,
                nomeEmpresa: e.nomeEmpresa,
                tipoEntidade: "externo",
                registos: [],
            };
        }

        agrupadosPorObra[obraId].utilizadores[externoKey].registos.push({
            tipo: e.tipo,
            timestamp: new Date(e.timestamp),
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
                    tipoEntidade: userGroup.tipoEntidade || "colaborador",
                    nomeEmpresa: userGroup.nomeEmpresa || null,
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
                        .map((r) => {
                            let nomeCompleto = r.utilizador;

                            // Adicionar tipo e empresa se aplicável
                            if (r.tipoEntidade === "visitante") {
                                nomeCompleto = r.nomeEmpresa
                                    ? `👤 ${r.utilizador} (${r.nomeEmpresa})`
                                    : `👤 ${r.utilizador}`;
                            } else if (r.tipoEntidade === "externo") {
                                nomeCompleto = r.nomeEmpresa
                                    ? `🔧 ${r.utilizador} (${r.nomeEmpresa})`
                                    : `🔧 ${r.utilizador}`;
                            } else {
                                // Colaborador
                                nomeCompleto = `👷 ${r.utilizador}`;
                            }

                            return `
                        <tr>
                            <td>${nomeCompleto}</td>
                            <td>
                                ${r.tipo === "ENTRADA" ? "🟢 ENTRADA" : "🔴 SAÍDA"}
                            </td>
                            <td>${r.hora}</td>
                            <td><strong>${r.horasTrabalhadas}</strong></td>
                        </tr>
                    `;
                        })
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

// Gerar relatório de ausentes do dia
async function gerarRelatorioAusentesDia(empresa_ou_obra_id) {
    console.log(
        `📊 gerarRelatorioAusentesDia chamado com empresa_ou_obra_id: ${empresa_ou_obra_id}`,
    );

    const hoje = new Date().toISOString().split("T")[0];
    const dataInicio = new Date(`${hoje}T00:00:00.000Z`);
    const dataFim = new Date(`${hoje}T23:59:59.999Z`);

    let obraNome = "Todas as Obras";
    let obrasParaFiltrar = [];

    // Validação
    if (empresa_ou_obra_id === null || empresa_ou_obra_id === undefined) {
        console.log(
            `❌ Nenhum filtro especificado - empresa_ou_obra_id está vazio`,
        );
        return {
            html: "<p>Por favor, selecione uma empresa ou obra específica para gerar o relatório.</p>",
            assunto: `📊 Relatório de Ausentes - Filtro necessário - ${hoje}`,
        };
    }

    // Primeiro tentar como obra
    const obra = await Obra.findByPk(empresa_ou_obra_id);
    console.log(
        `🔍 Busca por obra ID ${empresa_ou_obra_id}:`,
        obra ? `Encontrada - ${obra.nome}` : "Não encontrada",
    );

    if (obra && obra.empresa_id) {
        // É uma obra específica
        obrasParaFiltrar.push(obra.id);
        obraNome = `${obra.codigo} - ${obra.nome}`;
        console.log(`✅ Filtro definido para obra específica: ${obraNome}`);
    } else {
        // Tentar como empresa_id
        console.log(
            `🔍 Tentando buscar como empresa_id: ${empresa_ou_obra_id}`,
        );
        const obrasDaEmpresa = await Obra.findAll({
            where: {
                empresa_id: empresa_ou_obra_id,
                estado: "Ativo",
            },
        });
        console.log(
            `📋 Obras encontradas para empresa ${empresa_ou_obra_id}: ${obrasDaEmpresa.length}`,
        );

        if (obrasDaEmpresa.length > 0) {
            obrasParaFiltrar = obrasDaEmpresa.map((o) => o.id);

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
            obraNome = `${empresaNome}`;
            console.log(
                `✅ Filtro definido para empresa: ${obraNome} (${obrasParaFiltrar.length} obras)`,
            );
        } else {
            console.log(
                `❌ Nenhuma obra ativa encontrada para empresa ${empresa_ou_obra_id}`,
            );
            return {
                html: "<p>Nenhuma obra ativa encontrada para esta empresa.</p>",
                assunto: `📊 Relatório de Ausentes - Sem obras ativas - ${hoje}`,
            };
        }
    }

    // Buscar todos os utilizadores ativos da empresa/obra
    const { sequelize } = require("../config/database");

    let ausentesQuery = "";
    let presentesQuery = "";

    if (obra && obra.empresa_id) {
        // Para uma obra específica, buscar apenas membros da equipa
        ausentesQuery = `
            SELECT DISTINCT u.id, u.nome
            FROM [user] u
            INNER JOIN equipaObra eo ON eo.user_id = u.id
            WHERE eo.obra_id = ${obra.id}
            AND NOT EXISTS (
                SELECT 1
                FROM registo_ponto_obra rpo
                WHERE rpo.user_id = u.id
                AND CAST(rpo.[timestamp] AS date) = CAST(GETDATE() AS date)
            )
            ORDER BY u.nome
        `;

        presentesQuery = `
            SELECT DISTINCT u.id, u.nome
            FROM [user] u
            INNER JOIN equipaObra eo ON eo.user_id = u.id
            WHERE eo.obra_id = ${obra.id}
            AND EXISTS (
                SELECT 1
                FROM registo_ponto_obra rpo
                WHERE rpo.user_id = u.id
                AND CAST(rpo.[timestamp] AS date) = CAST(GETDATE() AS date)
            )
            ORDER BY u.nome
        `;
    } else {
        // Para empresa, buscar utilizadores usando a tabela user_empresa
        ausentesQuery = `
            SELECT DISTINCT u.id, u.nome
            FROM [user] u
            INNER JOIN user_empresa ue ON ue.user_id = u.id
            WHERE ue.empresa_id = ${empresa_ou_obra_id}
            AND NOT EXISTS (
                SELECT 1
                FROM registo_ponto_obra rpo
                WHERE rpo.user_id = u.id
                AND CAST(rpo.[timestamp] AS date) = CAST(GETDATE() AS date)
            )
            ORDER BY u.nome
        `;

        presentesQuery = `
            SELECT DISTINCT u.id, u.nome
            FROM [user] u
            INNER JOIN user_empresa ue ON ue.user_id = u.id
            WHERE ue.empresa_id = ${empresa_ou_obra_id}
            AND EXISTS (
                SELECT 1
                FROM registo_ponto_obra rpo
                WHERE rpo.user_id = u.id
                AND CAST(rpo.[timestamp] AS date) = CAST(GETDATE() AS date)
            )
            ORDER BY u.nome
        `;
    }

    // Executar queries
    const ausentes = await sequelize.query(ausentesQuery, {
        type: sequelize.QueryTypes.SELECT,
    });

    const presentes = await sequelize.query(presentesQuery, {
        type: sequelize.QueryTypes.SELECT,
    });

    // Gerar HTML para presentes
    const presentesHtml = presentes.length > 0
        ? `
        <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
            <thead style="background-color: #d4edda;">
                <tr>
                    <th>Nome</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${presentes
                    .map(
                        (p) => `
                    <tr>
                        <td>👷 ${p.nome}</td>
                        <td style="color: green; font-weight: bold;">🟢 PRESENTE</td>
                    </tr>
                `,
                    )
                    .join("")}
            </tbody>
        </table>
    `
        : "<p>Nenhum trabalhador presente.</p>";

    // Gerar HTML para ausentes
    const ausentesHtml = ausentes.length > 0
        ? `
        <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
            <thead style="background-color: #f8d7da;">
                <tr>
                    <th>Nome</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${ausentes
                    .map(
                        (a) => `
                    <tr>
                        <td>👤 ${a.nome}</td>
                        <td style="color: red; font-weight: bold;">🔴 AUSENTE</td>
                    </tr>
                `,
                    )
                    .join("")}
            </tbody>
        </table>
    `
        : "<p>Todos os trabalhadores estão presentes! 🎉</p>";

    const html = `
        <h2>📊 Relatório de Presença/Ausência - ${new Date().toLocaleDateString("pt-PT")}</h2>
        <h3 style="color: #0066cc;">📋 ${obraNome}</h3>

        <hr>

        <h3>📈 Resumo</h3>
        <p><strong>Total de trabalhadores:</strong> ${ausentes.length + presentes.length}</p>
        <p><strong>Presentes:</strong> <span style="color: green;">${presentes.length}</span></p>
        <p><strong>Ausentes:</strong> <span style="color: red;">${ausentes.length}</span></p>

        <hr>

        <h3 style="color: green;">✅ Trabalhadores Presentes (${presentes.length})</h3>
        ${presentesHtml}

        <hr>

        <h3 style="color: red;">❌ Trabalhadores Ausentes (${ausentes.length})</h3>
        ${ausentesHtml}

        <br>
        <p style="color: #666; font-size: 12px;">
            Relatório gerado automaticamente por Advir Link<br>
            Data/Hora: ${new Date().toLocaleString("pt-PT")}
        </p>
    `;

    return {
        html,
        assunto: `📊 Relatório de Ausentes - ${obraNome} - ${new Date().toLocaleDateString("pt-PT")}`,
    };
}

module.exports = { router, executarRelatorio };