const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const transporter = require('../../backend/config/email');
const RegistoPontoObra = require('../models/registoPontoObra');
const User = require('../models/user');
const Obra = require('../models/obra');
const { Op } = require('sequelize');

// Listar todos os relatórios agendados
router.get('/relatorios-agendados', async (req, res) => {
    try {
        const relatorios = await Schedule.findAll({
            where: { tipo: 'relatorio_email' },
            order: [['created_at', 'DESC']]
        });

        const formattedRelatorios = relatorios.map(rel => ({
            id: rel.id,
            nome: rel.message,
            tipo: rel.priority || 'registos_obra_dia',
            obra_id: rel.empresa_id,
            emails: rel.contact_list ? JSON.parse(rel.contact_list).join(', ') : '',
            frequency: rel.frequency,
            time: rel.time,
            days: rel.days ? JSON.parse(rel.days) : [],
            enabled: rel.enabled,
            last_sent: rel.last_sent,
            total_sent: rel.total_sent,
            createdAt: rel.created_at
        }));

        res.json(formattedRelatorios);
    } catch (error) {
        console.error('Erro ao listar relatórios:', error);
        res.status(500).json({ error: 'Erro ao listar relatórios agendados' });
    }
});

// Criar novo relatório agendado
router.post('/relatorios-agendados', async (req, res) => {
    try {
        const { nome, tipo, obra_id, emails, frequency, time, days, enabled } = req.body;

        if (!nome || !emails) {
            return res.status(400).json({ error: 'Nome e emails são obrigatórios' });
        }

        // Converter emails de string para array
        const emailsArray = emails.split(',').map(e => e.trim());

        const novoRelatorio = await Schedule.create({
            message: nome,
            tipo: 'relatorio_email',
            priority: tipo || 'registos_obra_dia',
            empresa_id: obra_id || null,
            contact_list: JSON.stringify(emailsArray),
            frequency: frequency || 'daily',
            time: new Date(`1970-01-01T${time}:00.000Z`),
            days: days ? JSON.stringify(days) : JSON.stringify([1,2,3,4,5]),
            enabled: enabled !== undefined ? enabled : true
        });

        res.status(201).json({
            message: 'Relatório agendado com sucesso',
            relatorio: novoRelatorio
        });
    } catch (error) {
        console.error('Erro ao criar relatório:', error);
        res.status(500).json({ error: 'Erro ao criar relatório agendado' });
    }
});

// Atualizar relatório
router.put('/relatorios-agendados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const relatorio = await Schedule.findByPk(id);
        if (!relatorio) {
            return res.status(404).json({ error: 'Relatório não encontrado' });
        }

        await relatorio.update({
            enabled: updates.enabled !== undefined ? updates.enabled : relatorio.enabled
        });

        res.json({ message: 'Relatório atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar relatório:', error);
        res.status(500).json({ error: 'Erro ao atualizar relatório' });
    }
});

// Eliminar relatório
router.delete('/relatorios-agendados/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Schedule.destroy({ where: { id } });

        if (deleted) {
            res.json({ message: 'Relatório eliminado com sucesso' });
        } else {
            res.status(404).json({ error: 'Relatório não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao eliminar relatório:', error);
        res.status(500).json({ error: 'Erro ao eliminar relatório' });
    }
});

// Executar relatório manualmente
router.post('/relatorios-agendados/:id/executar', async (req, res) => {
    try {
        const { id } = req.params;

        const relatorio = await Schedule.findByPk(id);
        if (!relatorio) {
            return res.status(404).json({ error: 'Relatório não encontrado' });
        }

        const resultado = await executarRelatorio(relatorio);

        res.json(resultado);
    } catch (error) {
        console.error('Erro ao executar relatório:', error);
        res.status(500).json({ error: 'Erro ao executar relatório' });
    }
});

// Função para executar o relatório
async function executarRelatorio(schedule) {
    try {
        const tipo = schedule.priority || 'registos_obra_dia';
        const emails = JSON.parse(schedule.contact_list);
        const obra_id = schedule.empresa_id; // Use o empresa_id do schedule

        let dadosRelatorio = '';
        let assunto = '';

        // Gerar dados do relatório baseado no tipo
        switch (tipo) {
            case 'registos_obra_dia':
                const resultado = await gerarRelatorioRegistosDia(obra_id); // Passa obra_id (que pode ser o empresa_id)
                dadosRelatorio = resultado.html;
                assunto = resultado.assunto;
                break;

            case 'resumo_mensal':
                const resultadoMensal = await gerarRelatorioResumoMensal(obra_id);
                dadosRelatorio = resultadoMensal.html;
                assunto = resultadoMensal.assunto;
                break;

            case 'mapa_registos':
                const resultadoMapa = await gerarRelatorioMapaRegistos();
                dadosRelatorio = resultadoMapa.html;
                assunto = resultadoMapa.assunto;
                break;

            default:
                dadosRelatorio = '<p>Tipo de relatório não reconhecido</p>';
                assunto = 'Relatório Advir';
        }

        // Enviar email para cada destinatário
        for (const email of emails) {
            await transporter.sendMail({
                from: 'noreply.advir@gmail.com',
                to: email,
                subject: assunto,
                html: dadosRelatorio
            });
        }

        // Atualizar última execução
        await schedule.update({
            last_sent: new Date(),
            total_sent: (schedule.total_sent || 0) + emails.length
        });

        return {
            success: true,
            message: `Relatório enviado para ${emails.length} destinatário(s)`
        };

    } catch (error) {
        console.error('Erro ao executar relatório:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Gerar relatório de registos do dia
async function gerarRelatorioRegistosDia(obra_id) { // Recebe o ID que pode ser de obra ou empresa
    const hoje = new Date().toISOString().split('T')[0];
    const dataInicio = new Date(`${hoje}T00:00:00.000Z`);
    const dataFim = new Date(`${hoje}T23:59:59.999Z`);

    const whereClause = {
        timestamp: { [Op.between]: [dataInicio, dataFim] }
    };

    let obraNome = 'Escritório - Advir';
    let obrasParaFiltrar = [];

    if (obra_id) {
        // Se obra_id foi passado, verificar se é uma obra ou uma empresa
        const obra = await Obra.findByPk(obra_id);

        if (obra) {
            // É uma obra específica
            whereClause.obra_id = obra.id;
            obrasParaFiltrar.push(obra.id);
            obraNome = `${obra.codigo} - ${obra.nome}`;
        } else {
            // Pode ser um ID de empresa, então buscamos todas as obras dessa empresa
            const obrasDaEmpresa = await Obra.findAll({
                where: { empresa_id: obra_id }
            });
            obrasParaFiltrar = obrasDaEmpresa.map(o => o.id);
            if (obrasParaFiltrar.length > 0) {
                whereClause.obra_id = { [Op.in]: obrasParaFiltrar };
                // Tentar pegar o nome da primeira obra para o título, ou usar um placeholder
                obraNome = obrasDaEmpresa[0] ? `${obrasDaEmpresa[0].codigo} - ${obrasDaEmpresa[0].nome}` : `Obras da Empresa ${obra_id}`;
            } else {
                 // Se não encontrar obras para a empresa, usa o escritório como fallback
                 const obraEscritorio = await Obra.findOne({ where: { codigo: '2009.003' } });
                 if (obraEscritorio) {
                    whereClause.obra_id = obraEscritorio.id;
                    obraNome = `${obraEscritorio.codigo} - ${obraEscritorio.nome}`;
                 } else {
                    obraNome = `Empresa ${obra_id} (sem obras encontradas)`;
                 }
            }
        }
    } else {
        // Se não especificar obra_id, buscar apenas o escritório (código 2009.003)
        const obraEscritorio = await Obra.findOne({
            where: { codigo: '2009.003' }
        });

        if (obraEscritorio) {
            whereClause.obra_id = obraEscritorio.id;
            obraNome = `${obraEscritorio.codigo} - ${obraEscritorio.nome}`;
        }
    }

    const registos = await RegistoPontoObra.findAll({
        where: whereClause,
        include: [
            {
                model: User,
                attributes: ['id', 'nome'],
            },
            {
                model: Obra,
                attributes: ['id', 'codigo', 'nome', 'empresa_id'], // Incluir empresa_id para referência
            },
        ],
        order: [['user_id', 'ASC'], ['obra_id', 'ASC'], ['timestamp', 'ASC']],
    });

    // Agrupar por utilizador + obra
    const agrupados = {};

    registos.forEach((r) => {
        // Verifica se o registo pertence a uma obra da empresa correta, se a empresa foi especificada
        if (obra_id && r.Obra && r.Obra.empresa_id !== obra_id && !obrasParaFiltrar.includes(r.obra_id)) {
            return; // Pula este registo se não pertencer à empresa correta
        }

        const key = `${r.user_id}_${r.obra_id}`;

        if (!agrupados[key]) {
            agrupados[key] = {
                utilizador: r.User?.nome || 'Desconhecido',
                obra: r.Obra ? `${r.Obra.codigo} - ${r.Obra.nome}` : 'Sem obra',
                registos: []
            };
        }

        agrupados[key].registos.push({
            tipo: r.tipo,
            timestamp: new Date(r.timestamp)
        });
    });

    // Calcular horas trabalhadas
    const registosProcessados = Object.values(agrupados).map((grupo) => {
        const registosOrdenados = grupo.registos.sort((a, b) => a.timestamp - b.timestamp);
        const ultimoRegisto = registosOrdenados[registosOrdenados.length - 1];

        let horasTrabalhadas = 0;

        // Calcular horas entre entradas e saídas
        for (let i = 0; i < registosOrdenados.length; i++) {
            if (registosOrdenados[i].tipo === 'entrada') {
                const entrada = registosOrdenados[i].timestamp;
                const saida = registosOrdenados[i + 1]?.tipo === 'saida'
                    ? registosOrdenados[i + 1].timestamp
                    : new Date(); // Se não tem saída, usa agora

                const diff = (saida - entrada) / (1000 * 60 * 60); // Converter para horas
                horasTrabalhadas += diff;
            }
        }

        // Converter horas decimais para formato HH:MM
        const horas = Math.floor(horasTrabalhadas);
        const minutos = Math.round((horasTrabalhadas - horas) * 60);

        return {
            utilizador: grupo.utilizador,
            obra: grupo.obra,
            tipo: ultimoRegisto.tipo.toUpperCase(),
            hora: ultimoRegisto.timestamp.toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            }),
            horasTrabalhadas: `${horas}h${minutos > 0 ? ` ${minutos}min` : ''}`
        };
    });

    let html = `
        <h2>📊 Relatório de Registos de Ponto - ${new Date().toLocaleDateString('pt-PT')}</h2>
        <h3>🏗️ ${obraNome}</h3>
        <p><strong>Total de registos únicos (utilizador/obra):</strong> ${registosProcessados.length}</p>
        <hr>
        <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
            <thead>
                <tr>
                    <th>Utilizador</th>
                    <th>Obra</th>
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
                        <td>${r.obra}</td>
                        <td>
                            ${r.tipo === 'ENTRADA' ? '🟢 ENTRADA' : '🔴 SAÍDA'}
                        </td>
                        <td>${r.hora}</td>
                        <td><strong>${r.horasTrabalhadas}</strong></td>
                    </tr>
                `,
                    )
                    .join('')}
            </tbody>
        </table>
        <br>
        <p style="color: #666; font-size: 12px;">
            Relatório gerado automaticamente por Advir Link<br>
            Data/Hora: ${new Date().toLocaleString('pt-PT')}
        </p>
    `;

    return {
        html,
        assunto: `📊 Relatório Diário de Registos - ${obraNome} - ${new Date().toLocaleDateString('pt-PT')}`
    };
}

// Gerar relatório resumo mensal
async function gerarRelatorioResumoMensal(obra_id) {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;

    const dataInicio = new Date(`${ano}-${mes}-01T00:00:00Z`);
    const dataFim = new Date(dataInicio);
    dataFim.setMonth(dataFim.getMonth() + 1);

    let whereClause = {
        timestamp: { [Op.between]: [dataInicio, dataFim] }
    };

    if (obra_id) {
        // Buscar obras da empresa especificada
        const obrasDaEmpresa = await Obra.findAll({
            where: { empresa_id: obra_id }
        });
        const obrasIds = obrasDaEmpresa.map(o => o.id);
        if (obrasIds.length > 0) {
            whereClause.obra_id = { [Op.in]: obrasIds };
        } else {
            // Se não houver obras para a empresa, o relatório ficará vazio ou com um aviso
            // Por agora, vamos permitir que continue para ver se há registos de escritório associados
        }
    }

    const registos = await RegistoPontoObra.findAll({
        where: whereClause,
        include: [
            { model: User, attributes: ['nome'] },
            { model: Obra, attributes: ['codigo', 'nome', 'empresa_id'] }
        ],
        order: [['timestamp', 'ASC']]
    });

    // Filtrar registos para garantir que pertencem à empresa correta (se obra_id foi fornecido)
    const registosFiltrados = obra_id
        ? registos.filter(r => r.Obra && r.Obra.empresa_id === obra_id)
        : registos;


    let obraNome = `Resumo Mensal - ${mes}/${ano}`;
    if (obra_id) {
        const empresa = await Obra.findOne({ where: { id: obra_id } }); // Assumindo que obra_id pode ser o ID da empresa
        if(empresa) {
            obraNome = `Resumo Mensal - ${empresa.nome} - ${mes}/${ano}`;
        } else {
             // Tenta buscar o nome da empresa se obra_id não for um ID de obra válido
            const empresaNomeInfo = await Obra.findOne({ where: { id: obra_id } });
            if (empresaNomeInfo) {
                obraNome = `Resumo Mensal - ${empresaNomeInfo.nome} - ${mes}/${ano}`;
            } else {
                obraNome = `Resumo Mensal (Empresa ${obra_id}) - ${mes}/${ano}`;
            }
        }
    }


    const html = `
        <h2>📅 ${obraNome}</h2>
        <p><strong>Total de registos:</strong> ${registosFiltrados.length}</p>
        <p>Este é um relatório resumido. Detalhes completos disponíveis no sistema.</p>
    `;

    return {
        html,
        assunto: `📅 Resumo Mensal ${mes}/${ano}`
    };
}

// Gerar relatório mapa de registos
async function gerarRelatorioMapaRegistos() {
    const hoje = new Date().toISOString().split('T')[0];

    const html = `
        <h2>🗺️ Mapa de Registos - ${new Date().toLocaleDateString('pt-PT')}</h2>
        <p>Mapa completo de registos disponível no sistema Advir Link.</p>
    `;

    return {
        html,
        assunto: `🗺️ Mapa de Registos - ${new Date().toLocaleDateString('pt-PT')}`
    };
}

module.exports = { router, executarRelatorio };