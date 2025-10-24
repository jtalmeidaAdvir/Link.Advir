const Visitante = require('../models/visitante');
const RegistoPontoVisitante = require('../models/registoPontoVisitante');
const Obra = require('../models/obra');
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

    console.log('📥 Dados recebidos:', { visitante_id, obra_id, empresa_id });

    if (!visitante_id || !obra_id || !empresa_id) {
      return res.status(400).json({ message: 'Dados incompletos' });
    }

    // Validar visitante e obra ANTES de criar registo
    const visitante = await Visitante.findByPk(visitante_id);
    if (!visitante) {
      console.error(`❌ Visitante ${visitante_id} não encontrado`);
      return res.status(404).json({ message: 'Visitante não encontrado' });
    }

    const obra = await Obra.findByPk(obra_id);
    if (!obra) {
      console.error(`❌ Obra ${obra_id} não encontrada`);
      return res.status(404).json({ message: 'Obra não encontrada' });
    }

    console.log('✅ Visitante encontrado:', `${visitante.primeiroNome} ${visitante.ultimoNome}`);
    console.log('✅ Obra encontrada:', `${obra.codigo} - ${obra.nome}`);

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

    console.log('📧 Iniciando processo de envio de email...');

    // Enviar email automático
    try {
      const transporter = require('../config/email');
        const dataHoraFormatada = new Date().toLocaleString('pt-PT', {
          dateStyle: 'short',
          timeStyle: 'short'
        });

        const tipoTexto = tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA';
        const icone = tipo === 'entrada' ? '🟢' : '🔴';

        const mailOptions = {
          from: 'noreply.advir@gmail.com',
          to: 'jtalmeida@advir.pt',
          subject: `${icone} Registo de ${tipoTexto} - Visitante ${visitante.primeiroNome} ${visitante.ultimoNome}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
              <div style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, ${tipo === 'entrada' ? '#10b981' : '#ef4444'} 0%, ${tipo === 'entrada' ? '#059669' : '#dc2626'} 100%); color: white; padding: 20px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px;">${icone} Registo de ${tipoTexto}</h1>
                </div>

                <!-- Body -->
                <div style="padding: 30px;">
                  <h2 style="color: #1e3a8a; margin-top: 0;">Detalhes do Registo</h2>

                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 12px 0; font-weight: bold; color: #374151; width: 40%;">Visitante:</td>
                      <td style="padding: 12px 0; color: #6b7280;">${visitante.primeiroNome} ${visitante.ultimoNome}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 12px 0; font-weight: bold; color: #374151;">NIF:</td>
                      <td style="padding: 12px 0; color: #6b7280;">${visitante.numeroContribuinte}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 12px 0; font-weight: bold; color: #374151;">Empresa:</td>
                      <td style="padding: 12px 0; color: #6b7280;">${visitante.nomeEmpresa || 'N/A'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 12px 0; font-weight: bold; color: #374151;">NIF Empresa:</td>
                      <td style="padding: 12px 0; color: #6b7280;">${visitante.nifEmpresa || 'N/A'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 12px 0; font-weight: bold; color: #374151;">Obra:</td>
                      <td style="padding: 12px 0; color: #6b7280;">${obra.codigo} - ${obra.nome}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 12px 0; font-weight: bold; color: #374151;">Tipo de Registo:</td>
                      <td style="padding: 12px 0; color: #6b7280; font-weight: bold;">${tipoTexto}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 12px 0; font-weight: bold; color: #374151;">Data/Hora:</td>
                      <td style="padding: 12px 0; color: #6b7280;">${dataHoraFormatada}</td>
                    </tr>
                    ${latitude && longitude ? `
                    <tr>
                      <td style="padding: 12px 0; font-weight: bold; color: #374151;">Coordenadas:</td>
                      <td style="padding: 12px 0; color: #6b7280;">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">AdvirLink - Sistema de Gestão de Visitantes</p>
                  <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Advir Plan Consultoria</p>
                </div>
              </div>
            </div>
          `
        };

        console.log('📤 Enviando email para jtalmeida@advir.pt...');
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email enviado com sucesso!`);
        console.log(`   MessageID: ${info.messageId}`);
        console.log(`   Para: jtalmeida@advir.pt`);
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
    } catch (emailError) {
      console.error('❌ ERRO INESPERADO AO PROCESSAR EMAIL:');
      console.error('   Erro:', emailError.message);
    }

    res.status(201).json({
      message: `${tipo === 'entrada' ? 'Entrada' : 'Saída'} registada com sucesso`,
      registo,
      visitante,
      obra,
      action: tipo
    });

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