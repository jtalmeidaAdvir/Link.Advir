const Visitante = require('../models/visitante');
const RegistoPontoVisitante = require('../models/registoPontoVisitante');
const Obra = require('../models/obra');
const Configuracao = require('../models/configuracao');
const { Op } = require('sequelize');

// Criar ficha de visitante
const criarVisitante = async (req, res) => {
  try {
    const { primeiroNome, ultimoNome, numeroContribuinte, nomeEmpresa, nifEmpresa, empresa_id } = req.body;
    const empresaId = empresa_id || req.user?.empresa_id;

    console.log('📝 Tentando criar visitante:', { primeiroNome, ultimoNome, numeroContribuinte, nomeEmpresa, nifEmpresa, empresaId });

    if (!primeiroNome || !ultimoNome || !numeroContribuinte || !nomeEmpresa || !nifEmpresa || !empresaId) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios (Nome, Apelido, NIF, Nome Empresa e NIF Empresa)' });
    }

    // Verificar se já existe
    const existente = await Visitante.findOne({
      where: { numeroContribuinte, empresa_id: empresaId }
    });

    if (existente) {
      console.log('⚠️ Visitante já existe:', existente.id);
      return res.status(400).json({ message: 'Já existe um visitante com este número de contribuinte' });
    }

    const visitante = await Visitante.create({
      primeiroNome,
      ultimoNome,
      numeroContribuinte,
      nomeEmpresa,
      nifEmpresa,
      empresa_id: empresaId
    });

    console.log('✅ Visitante criado com sucesso:', visitante.id);
    res.status(201).json({ message: 'Visitante criado com sucesso', visitante });
  } catch (error) {
    console.error('❌ Erro ao criar visitante:', error);
    res.status(500).json({ message: 'Erro ao criar visitante', error: error.message });
  }
};

// Buscar visitante por número de contribuinte
const buscarVisitantePorContribuinte = async (req, res) => {
  try {
    const { numeroContribuinte } = req.params;
    const empresaId = req.query.empresa_id;

    if (!empresaId) {
      return res.status(400).json({ message: 'empresa_id é obrigatório' });
    }

    console.log(`🔍 Buscando visitante: ${numeroContribuinte} na empresa: ${empresaId}`);

    const visitante = await Visitante.findOne({
      where: { numeroContribuinte, empresa_id: empresaId }
    });

    if (!visitante) {
      console.log(`❌ Visitante não encontrado: ${numeroContribuinte}`);
      return res.status(404).json({ 
        message: 'Visitante não encontrado',
        found: false 
      });
    }

    console.log(`✅ Visitante encontrado:`, visitante.id);
    res.json(visitante);
  } catch (error) {
    console.error('Erro ao buscar visitante:', error);
    res.status(500).json({ message: 'Erro ao buscar visitante', error: error.message });
  }
};

// Registar ponto de visitante
const registarPontoVisitante = async (req, res) => {
  try {
    const { visitante_id, obra_id, empresa_id, latitude, longitude } = req.body;

    if (!visitante_id || !obra_id || !empresa_id) {
      return res.status(400).json({ message: 'Dados incompletos' });
    }

    // Verificar última entrada/saída
    const hoje = new Date().toISOString().split('T')[0];
    const ultimoRegisto = await RegistoPontoVisitante.findOne({
      where: {
        visitante_id,
        obra_id,
        timestamp: {
          [Op.gte]: new Date(hoje)
        }
      },
      order: [['timestamp', 'DESC']]
    });

    const tipo = !ultimoRegisto || ultimoRegisto.tipo === 'saida' ? 'entrada' : 'saida';

    const registo = await RegistoPontoVisitante.create({
      visitante_id,
      obra_id,
      empresa_id,
      tipo,
      timestamp: new Date(),
      latitude,
      longitude
    });

    const visitante = await Visitante.findByPk(visitante_id);
    const obra = await Obra.findByPk(obra_id);

    console.log('📧 Iniciando processo de envio de email...');
    console.log('Visitante:', visitante ? `${visitante.primeiroNome} ${visitante.ultimoNome}` : 'não encontrado');
    console.log('Obra:', obra ? `${obra.codigo} - ${obra.nome}` : 'não encontrada');
    obra = "teste";
    // Verificar se visitante e obra existem antes de enviar email
    if (!visitante || !obra) {
      console.error('❌ Não é possível enviar email - dados incompletos:', {
        visitante: visitante ? 'OK' : 'NÃO ENCONTRADO',
        obra: obra ? 'OK' : 'NÃO ENCONTRADA'
      });
    }

    // Enviar email automático apenas se visitante e obra existirem
    if (visitante && obra) {
      try {
        // Obter email configurado
        let emailDestino = 'jtalmeida@advir.pt'; // valor padrão
        try {
          const configEmail = await Configuracao.findOne({ where: { chave: 'email_visitantes' } });
          if (configEmail && configEmail.valor) {
            emailDestino = configEmail.valor;
          }
        } catch (configError) {
          console.log('⚠️ Erro ao obter email configurado, usando padrão:', configError.message);
        }

        const transporter = require('../config/email');
        const dataHoraFormatada = new Date().toLocaleString('pt-PT', {
          dateStyle: 'short',
          timeStyle: 'short'
        });

        const tipoTexto = tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA';
        const icone = tipo === 'entrada' ? '🟢' : '🔴';

        const mailOptions = {
          from: 'noreply.advir@gmail.com',
          to: emailDestino,
          subject: `${icone} Registo de ${tipoTexto} - Visitante ${visitante.primeiroNome} ${visitante.ultimoNome}`,
          html: `
            <!DOCTYPE html>
            <html lang="pt">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f2f5;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f2f5; padding: 20px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      
                      <!-- Header com Gradiente -->
                      <tr>
                        <td style="background: linear-gradient(135deg, ${tipo === 'entrada' ? '#10b981 0%, #059669' : '#ef4444 0%, #dc2626'} 100%); padding: 40px 30px; text-align: center;">
                          <div style="font-size: 48px; margin-bottom: 10px;">${icone}</div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                            Registo de ${tipoTexto}
                          </h1>
                          <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                            ${dataHoraFormatada}
                          </p>
                        </td>
                      </tr>

                      <!-- Informação do Visitante -->
                      <tr>
                        <td style="padding: 35px 30px;">
                          <div style="background: linear-gradient(to right, ${tipo === 'entrada' ? '#d1fae5' : '#fee2e2'}, transparent); border-left: 4px solid ${tipo === 'entrada' ? '#10b981' : '#ef4444'}; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                            <h2 style="margin: 0 0 5px 0; color: #1f2937; font-size: 20px; font-weight: 600;">
                              ${visitante.primeiroNome} ${visitante.ultimoNome}
                            </h2>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                              NIF: ${visitante.numeroContribuinte}
                            </p>
                          </div>

                          <!-- Tabela de Detalhes -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                            <tr>
                              <td colspan="2" style="padding-bottom: 15px;">
                                <h3 style="margin: 0; color: #374151; font-size: 16px; font-weight: 600; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                                  📋 Detalhes do Registo
                                </h3>
                              </td>
                            </tr>
                            
                            <tr>
                              <td style="padding: 12px 0; color: #6b7280; font-size: 14px; width: 45%;">
                                <strong style="color: #374151;">🏢 Empresa Visitante:</strong>
                              </td>
                              <td style="padding: 12px 0; color: #1f2937; font-size: 14px;">
                                ${visitante.nomeEmpresa || 'N/A'}
                              </td>
                            </tr>
                            
                            <tr style="background-color: #f9fafb;">
                              <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                                <strong style="color: #374151;">🆔 NIF Empresa:</strong>
                              </td>
                              <td style="padding: 12px 0; color: #1f2937; font-size: 14px;">
                                ${visitante.nifEmpresa || 'N/A'}
                              </td>
                            </tr>
                            
                            <tr>
                              <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                                <strong style="color: #374151;">🏗️ Obra:</strong>
                              </td>
                              <td style="padding: 12px 0; color: #1f2937; font-size: 14px;">
                                <strong>${obra.codigo}</strong> - ${obra.nome}
                              </td>
                            </tr>
                            
                            <tr style="background-color: #f9fafb;">
                              <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                                <strong style="color: #374151;">⏰ Tipo de Registo:</strong>
                              </td>
                              <td style="padding: 12px 0;">
                                <span style="display: inline-block; background-color: ${tipo === 'entrada' ? '#d1fae5' : '#fee2e2'}; color: ${tipo === 'entrada' ? '#065f46' : '#991b1b'}; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                                  ${tipo === 'entrada' ? '🟢' : '🔴'} ${tipoTexto.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                            
                            ${latitude && longitude ? `
                            <tr>
                              <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">
                                <strong style="color: #374151;">📍 Coordenadas GPS:</strong>
                              </td>
                              <td style="padding: 12px 0; color: #1f2937; font-size: 14px; font-family: 'Courier New', monospace;">
                                ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
                              </td>
                            </tr>
                            ` : ''}
                          </table>

                          <!-- Info Box -->
                          <div style="margin-top: 30px; background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 6px;">
                            <p style="margin: 0; color: #1e40af; font-size: 13px; line-height: 1.6;">
                              <strong>ℹ️ Informação:</strong> Este registo foi efetuado automaticamente através do sistema AdvirLink. 
                              Para consultar mais detalhes ou histórico, aceda à plataforma de gestão.
                            </p>
                          </div>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background: linear-gradient(to bottom, #f8fafc, #e5e7eb); padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                          <div style="margin-bottom: 12px;">
                            <p style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                              AdvirLink - Sistema de Gestão de Visitantes
                            </p>
                          </div>
                          <div style="margin-bottom: 15px;">
                            <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">
                              📧 support@advir.pt | ☎️ +351 253 176 493
                            </p>
                          </div>
                          <div style="padding-top: 12px; border-top: 1px solid #cbd5e1;">
                            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                              © ${new Date().getFullYear()} Advir Plan Consultoria - Todos os direitos reservados
                            </p>
                          </div>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `
        };

        console.log(`📤 Enviando email para ${emailDestino}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email enviado com sucesso!`);
        console.log(`   MessageID: ${info.messageId}`);
        console.log(`   Para: ${emailDestino}`);
        console.log(`   Assunto: ${mailOptions.subject}`);
        console.log(`   Tipo: ${tipoTexto}`);
        console.log(`   Visitante: ${visitante.primeiroNome} ${visitante.ultimoNome}`);
      } catch (emailError) {
        console.error('❌ ERRO AO ENVIAR EMAIL (registo foi salvo):');
        console.error('   Erro:', emailError.message);
        console.error('   Stack:', emailError.stack);
        console.error('   Code:', emailError.code);
        // Não falhar o registo se o email falhar
      }
    }

    res.status(201).json({
      message: `${tipo === 'entrada' ? 'Entrada' : 'Saída'} registada com sucesso`,
      registo,
      visitante,
      obra,
      action: tipo
    });
  } catch (error) {
    console.error('Erro ao registar ponto visitante:', error);
    res.status(500).json({ message: 'Erro ao registar ponto' });
  }
};

// Listar todos os visitantes
const listarVisitantes = async (req, res) => {
  try {
    const empresaId = req.query.empresa_id;
    const visitantes = await Visitante.findAll({
      where: { empresa_id: empresaId },
      order: [['createdAt', 'DESC']]
    });
    res.json(visitantes);
  } catch (error) {
    console.error('Erro ao listar visitantes:', error);
    res.status(500).json({ message: 'Erro ao listar visitantes' });
  }
};

// Obter resumo de visitantes por obra
const obterResumoObraVisitantes = async (req, res) => {
  try {
    const { obra_id, empresa_id, data } = req.query;

    if (!obra_id || !empresa_id) {
      return res.status(400).json({ message: 'obra_id e empresa_id são obrigatórios' });
    }

    console.log('📊 Obtendo resumo de visitantes - obra:', obra_id, 'empresa:', empresa_id, 'data:', data);

    // Usar a data fornecida ou a data atual
    const dataBase = data ? new Date(data) : new Date();
    const inicioDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate());
    const fimDia = new Date(inicioDia);
    fimDia.setDate(fimDia.getDate() + 1);

    // Buscar todos os registos de hoje
    const registosHoje = await RegistoPontoVisitante.findAll({
      where: {
        obra_id: obra_id,
        empresa_id: empresa_id,
        timestamp: {
          [Op.gte]: inicioDia,
          [Op.lt]: fimDia
        }
      },
      include: [{
        model: Visitante,
        attributes: ['id', 'primeiroNome', 'ultimoNome', 'numeroContribuinte', 'nomeEmpresa', 'nifEmpresa']
      }],
      order: [['timestamp', 'DESC']]
    });

    console.log(`📋 ${registosHoje.length} registos de visitantes encontrados`);

    // Agrupar por visitante para determinar quem está a trabalhar
    const visitantesMap = new Map();

    registosHoje.forEach(registo => {
      const visitanteId = registo.visitante_id;

      if (!visitantesMap.has(visitanteId)) {
        visitantesMap.set(visitanteId, {
          visitante: registo.Visitante,
          registos: []
        });
      }

      visitantesMap.get(visitanteId).registos.push(registo);
    });

    // Contar visitantes a trabalhar (última entrada sem saída)
    let visitantesATrabalhar = 0;

    visitantesMap.forEach(({ registos }) => {
      registos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (registos.length > 0 && registos[0].tipo === 'entrada') {
        visitantesATrabalhar++;
      }
    });

    console.log(`👥 ${visitantesATrabalhar} visitantes a trabalhar`);

    // Formatar registos para exibição
    const entradasSaidas = registosHoje.map(r => {
      const dadosFormatados = {
        id: r.id,
        visitante_id: r.visitante_id,
        nome: `${r.Visitante.primeiroNome} ${r.Visitante.ultimoNome}`,
        nomeEmpresa: r.Visitante.nomeEmpresa || 'N/A',
        numeroContribuinte: r.Visitante.numeroContribuinte,
        tipo: r.tipo,
        timestamp: r.timestamp,
        latitude: r.latitude,
        longitude: r.longitude
      };

      console.log('📋 Formatando visitante:', {
        nome: dadosFormatados.nome,
        nomeEmpresa: dadosFormatados.nomeEmpresa,
        visitanteData: r.Visitante
      });

      return dadosFormatados;
    });

    res.json({
      visitantesATrabalhar,
      entradasSaidas
    });
  } catch (error) {
    console.error('❌ Erro ao obter resumo de visitantes:', error);
    res.status(500).json({ 
      message: 'Erro ao obter resumo de visitantes',
      error: error.message 
    });
  }
};

module.exports = {
  criarVisitante,
  buscarVisitantePorContribuinte,
  registarPontoVisitante,
  listarVisitantes,
  obterResumoObraVisitantes
};