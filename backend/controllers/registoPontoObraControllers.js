const RegistoPontoObra = require('../models/registoPontoObra');
const Obra = require('../models/obra');
const User = require('../models/user');
const { Op } = require('sequelize');
const Sequelize = require('sequelize');

console.log('🔧 Models importados:', {
    RegistoPontoObra: !!RegistoPontoObra,
    Obra: !!Obra,
    User: !!User
});


const registarPonto = async (req, res) => {
  try {
    // Se for fornecido targetUserId (para registo biométrico), usar esse; caso contrário, usar o utilizador logado
    const userId = req.body.targetUserId || req.user.id;
    const { tipo, obra_id, latitude, longitude } = req.body;

    const novoRegisto = await RegistoPontoObra.create({
      user_id: userId,
      obra_id,
      tipo,
      timestamp: new Date(),
      latitude,
      longitude
    });

    res.status(201).json(novoRegisto);
  } catch (error) {
    console.error('Erro ao registar ponto:', error);
    res.status(500).json({ message: 'Erro interno ao registar ponto.' });
  }
};

const listarRegistosPorDia = async (req, res) => {
  try {
    const { data, userId, user_id } = req.query;

    if (!data || isNaN(Date.parse(data))) {
      return res.status(400).json({ message: 'Data inválida.' });
    }

    // Utilizador alvo: query > logado
    const alvoId = Number(userId ?? user_id ?? req.user.id);

    // Se o alvo for diferente do logado, verificar permissões
    const mesmoUser = alvoId === req.user.id;
    const tipo = (req.user.tipoUser || '').toString();
    const isPrivileged =
      !!req.user.isAdmin ||
      !!req.user.superAdmin ||
      ['Administrador', 'Encarregado', 'Diretor'].includes(tipo);

    if (!mesmoUser && !isPrivileged) {
      return res.status(403).json({ message: 'Sem permissões para consultar registos de outro utilizador.' });
    }

    // Opcional: validar se pertence à mesma empresa
    // if (req.user.empresa_id && userExiste.empresa_id && req.user.empresa_id !== userExiste.empresa_id) {
    //   return res.status(403).json({ message: 'Utilizador alvo não pertence à mesma empresa.' });
    // }

    const dataInicio = new Date(`${data}T00:00:00.000Z`);
    const dataFim    = new Date(`${data}T23:59:59.999Z`);

    const registos = await RegistoPontoObra.findAll({
      where: {
        user_id: alvoId,
        timestamp: { [Op.between]: [dataInicio, dataFim] }
      },
      include: [{ model: Obra, attributes: ['id', 'nome', 'localizacao'] }],
      order: [['timestamp', 'ASC']]
    });

    return res.status(200).json(registos);
  } catch (error) {
    console.error('Erro ao listar registos:', error);
    return res.status(500).json({ message: 'Erro interno ao listar registos.' });
  }
};



const resumoMensalPorUser = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { ano, mes } = req.query;

    if (!ano || !mes) {
      return res.status(400).json({ message: 'Ano e mês são obrigatórios.' });
    }

    const dataInicio = new Date(`${ano}-${mes}-01T00:00:00Z`);
    const dataFim = new Date(dataInicio);
    dataFim.setMonth(dataFim.getMonth() + 1);

    const registos = await RegistoPontoObra.findAll({
      where: {
        user_id,
        timestamp: {
          [Op.between]: [dataInicio, dataFim]
        }
      },
      order: [['timestamp', 'ASC']],
    });

    const dias = {};

    for (const registo of registos) {
      const dataDia = new Date(registo.timestamp).toISOString().split('T')[0];

      if (!dias[dataDia]) dias[dataDia] = [];

      dias[dataDia].push(registo);
    }

    const resultado = Object.entries(dias).map(([dia, registosDia]) => {
      let totalMs = 0;
      let ultimaEntrada = null;

      for (const reg of registosDia) {
        if (reg.tipo === 'entrada') {
          ultimaEntrada = new Date(reg.timestamp);
        } else if (reg.tipo === 'saida' && ultimaEntrada) {
          const saida = new Date(reg.timestamp);
          totalMs += saida - ultimaEntrada;
          ultimaEntrada = null;
        }
      }

      const horas = Math.floor(totalMs / 3600000);
      const minutos = Math.floor((totalMs % 3600000) / 60000);

      return { dia, horas, minutos };
    });

    res.json(resultado);
  } catch (error) {
    console.error('Erro no resumo mensal:', error);
    res.status(500).json({ message: 'Erro interno ao obter resumo mensal.' });
  }
};


const registarPontoEsquecido = async (req, res) => {
  try {
    const { tipo, obra_id, timestamp, justificacao } = req.body;
    const user_id = req.user.id;

    const novoRegisto = await RegistoPontoObra.create({
      user_id,
      obra_id,
      tipo,
      timestamp: new Date(timestamp),
      is_confirmed: false,
      justificacao
    });

    res.status(201).json(novoRegisto);
  } catch (err) {
    console.error('Erro ao registar ponto esquecido:', err);
    res.status(500).json({ message: 'Erro interno ao registar ponto esquecido.' });
  }
};


const listarPorObraEDia = async (req, res) => {
  try {
    const { data, obra_id } = req.query;

    if (!data || !obra_id) {
      return res.status(400).json({ message: 'Data e obra_id são obrigatórios.' });
    }

    const dataInicio = new Date(`${data}T00:00:00.000Z`);
    const dataFim = new Date(`${data}T23:59:59.999Z`);

    const registos = await RegistoPontoObra.findAll({
      where: {
        obra_id,
        timestamp: {
          [Op.between]: [dataInicio, dataFim]
        }
      },
      include: [
        { model: User, attributes: ['id', 'nome', 'email'] },
        { model: Obra, attributes: ['id', 'nome'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    res.status(200).json(registos);
  } catch (err) {
    console.error('Erro ao listar registos por obra e dia:', err);
    res.status(500).json({ message: 'Erro interno ao listar registos.' });
  }
};


const registarPontoEquipa = async (req, res) => {
  try {
    const { tipo, obra_id, latitude, longitude, membros } = req.body;

    if (!['entrada', 'saida'].includes(tipo) || !obra_id || !latitude || !longitude || !Array.isArray(membros)) {
      return res.status(400).json({ message: 'Dados inválidos.' });
    }

    const registosCriados = await Promise.all(membros.map(user_id =>
      RegistoPontoObra.create({
        tipo,
        obra_id,
        latitude,
        longitude,
        user_id,
        timestamp: new Date()
      })
    ));

    res.status(201).json(registosCriados);
  } catch (error) {
    console.error('Erro no registo por equipa:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

const listarRegistosHojeEquipa = async (req, res) => {
  try {
    const { membros } = req.query;

    if (!membros) return res.status(400).json({ message: 'IDs de membros em falta.' });

    const ids = membros.split(',').map(id => parseInt(id));
    const hoje = new Date();
    const dataInicio = new Date(hoje.setHours(0, 0, 0, 0));
    const dataFim = new Date(hoje.setHours(23, 59, 59, 999));

    const registos = await RegistoPontoObra.findAll({
      where: {
        user_id: { [Op.in]: ids },
        timestamp: { [Op.between]: [dataInicio, dataFim] }
      },
      include: [
        { model: User, attributes: ['id', 'nome', 'email'] },
        { model: Obra, attributes: ['id', 'nome'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    res.status(200).json(registos);
  } catch (err) {
    console.error('Erro ao listar registos da equipa:', err);
    res.status(500).json({ message: 'Erro ao listar registos da equipa.' });
  }
};

const confirmarPonto = async (req, res) => {
  try {
    const { id } = req.params;

    const registo = await RegistoPontoObra.findByPk(id);

    if (!registo) {
      return res.status(404).json({ message: 'Registo não encontrado.' });
    }

    if (registo.is_confirmed) {
      return res.status(400).json({ message: 'Este registo já está confirmado.' });
    }

    registo.is_confirmed = true;
    await registo.save();

    res.status(200).json({ message: 'Registo confirmado com sucesso.', registo });
  } catch (err) {
    console.error('Erro ao confirmar registo:', err);
    res.status(500).json({ message: 'Erro interno ao confirmar registo.' });
  }
};

const cancelarPonto = async (req, res) => {
  try {
    const { id } = req.params;

    const registo = await RegistoPontoObra.findByPk(id);

    if (!registo) {
      return res.status(404).json({ message: 'Registo não encontrado.' });
    }



    await registo.destroy();

    res.status(200).json({ message: 'Registo cancelado (eliminado) com sucesso.' });
  } catch (err) {
    console.error('Erro ao cancelar registo:', err);
    res.status(500).json({ message: 'Erro interno ao cancelar registo.' });
  }
};

const listarPendentes = async (req, res) => {
  try {
    const { empresa_id } = req.query;

    let whereClause = { is_confirmed: false };
    let includeObra = { model: Obra, attributes: ['id', 'nome', 'localizacao'] };

    // Se foi especificado empresa_id, filtrar pelas obras dessa empresa
    if (empresa_id) {
      includeObra.where = { empresa_id: empresa_id };
    }

    const pendentes = await RegistoPontoObra.findAll({
      where: whereClause,
      include: [
        { model: User, attributes: ['id', 'nome', 'email'] },
        includeObra
      ],
      order: [['timestamp', 'ASC']]
    });

    res.status(200).json(pendentes);
  } catch (err) {
    console.error('Erro ao listar registos pendentes:', err);
    res.status(500).json({ message: 'Erro interno ao listar pendentes.' });
  }
};

const listarPorUserEDia = async (req, res) => {
  try {
    const { user_id, data } = req.query;

    if (!user_id || !data || isNaN(Date.parse(data))) {
      return res.status(400).json({ message: 'Parâmetros user_id e data são obrigatórios e válidos.' });
    }

    const dataInicio = new Date(`${data}T00:00:00.000Z`);
    const dataFim = new Date(`${data}T23:59:59.999Z`);

    const registos = await RegistoPontoObra.findAll({
      where: {
        user_id,
        timestamp: {
          [Op.between]: [dataInicio, dataFim]
        }
      },
      include: [
        { model: User, attributes: ['id', 'nome', 'email'] },
        { model: Obra, attributes: ['id', 'nome', 'localizacao'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    res.status(200).json(registos);
  } catch (err) {
    console.error('Erro ao listar registos por user e dia:', err);
    res.status(500).json({ message: 'Erro interno ao listar registos por user e dia.' });
  }
};


const listarPorUserPeriodo = async (req, res) => {
  try {
    const { user_id, data, ano, mes, obra_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ message: 'Parâmetro user_id é obrigatório.' });
    }

    let dataInicio, dataFim;

    // Se vier data → busca do dia
    if (data) {
      if (isNaN(Date.parse(data))) {
        return res.status(400).json({ message: 'Data inválida.' });
      }
      dataInicio = new Date(`${data}T00:00:00.000Z`);
      dataFim = new Date(`${data}T23:59:59.999Z`);
    }

    // Se vier ano + mês → busca do mês
    else if (ano && mes) {
      dataInicio = new Date(`${ano}-${mes}-01T00:00:00.000Z`);
      dataFim = new Date(dataInicio);
      dataFim.setMonth(dataFim.getMonth() + 1);
    }

    // Se vier só ano → busca do ano
    else if (ano) {
      dataInicio = new Date(`${ano}-01-01T00:00:00.000Z`);
      dataFim = new Date(`${parseInt(ano) + 1}-01-01T00:00:00.000Z`);
    }

    // Where base
    const whereClause = {
      user_id,
      ...(dataInicio && dataFim && {
        timestamp: { [Op.between]: [dataInicio, dataFim] }
      }),
      ...(obra_id && { obra_id }) // filtro por obra, se existir
    };

    const registos = await RegistoPontoObra.findAll({
      where: whereClause,
      include: [
        { model: User, attributes: ['id', 'nome', 'email'] },
        { model: Obra, attributes: ['id', 'nome', 'localizacao'] }
      ],
      order: [['timestamp', 'ASC']]
    });

    res.status(200).json(registos);
  } catch (err) {
    console.error('Erro ao listar registos por período:', err);
    res.status(500).json({ message: 'Erro interno ao listar registos.' });
  }
};

// --- NOVO: registar ponto esquecido por outro utilizador ---
const registarPontoEsquecidoPorOutro = async (req, res) => {
  try {
    const {
      tipo,
      obra_id,
      obraId,
      timestamp,
      justificacao,
      user_id: bodyUserId,
      userId: bodyUserIdCamel
    } = req.body;

    // Permissões: ajusta à tua realidade
    const podeAgirPorOutros = true;

    if (!podeAgirPorOutros) {
      return res.status(403).json({ message: 'Sem permissões para registar por outros utilizadores.' });
    }

    const targetUserId = Number(bodyUserId ?? bodyUserIdCamel);
    const targetObraId = Number(obra_id ?? obraId);

    if (!targetUserId || !targetObraId || !tipo || !timestamp) {
      return res.status(400).json({ message: 'Campos obrigatórios: user_id, obra_id, tipo, timestamp.' });
    }

    // (Opcional) validações extra
    const userExiste = await User.findByPk(targetUserId);
    if (!userExiste) return res.status(404).json({ message: 'Utilizador alvo não encontrado.' });

    const obraExiste = await Obra.findByPk(targetObraId);
    if (!obraExiste) return res.status(404).json({ message: 'Obra não encontrada.' });

    // (Opcional) garantir que pertence à mesma empresa
    if (req.user.empresa_id && userExiste.empresa_id && req.user.empresa_id !== userExiste.empresa_id) {
      return res.status(403).json({ message: 'Utilizador alvo não pertence à mesma empresa.' });
    }

    const novoRegisto = await RegistoPontoObra.create({
      user_id: targetUserId,
      obra_id: targetObraId,
      tipo,
      timestamp: new Date(timestamp),
      is_confirmed: false,
      justificacao
    });

    return res.status(201).json(novoRegisto);
  } catch (err) {
    console.error('Erro ao registar ponto esquecido por outro:', err);
    return res.status(500).json({ message: 'Erro interno ao registar ponto.' });
  }
};



const eliminarRegisto = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;


    // Verificar se o registo existe
    const registo = await RegistoPontoObra.findByPk(id);
    if (!registo) {
      return res.status(404).json({ message: 'Registo não encontrado.' });
    }

    // Eliminar o registo
    await registo.destroy();

    console.log(`Registo de ponto ${id} eliminado por admin (${req.user.id})`);
    return res.status(200).json({ message: 'Registo eliminado com sucesso.' });

  } catch (err) {
    console.error('Erro ao eliminar registo de ponto:', err);
    return res.status(500).json({ message: 'Erro interno ao eliminar registo.' });
  }
};

const obterRegistosObraPorDia = async (req, res) => {
    try {
        const { obraId } = req.params;
        const { data } = req.query;

        const dataConsulta = data || new Date().toISOString().split('T')[0];

        const registos = await RegistoPontoObra.findAll({
            where: {
                obra_id: obraId,
                timestamp: {
                    [Op.between]: [
                        new Date(dataConsulta + 'T00:00:00.000Z'),
                        new Date(dataConsulta + 'T23:59:59.999Z')
                    ]
                }
            },
            include: [
                {
                    model: User,
                    attributes: ['id', 'nome', 'username', 'email']
                },
                {
                    model: Obra,
                    attributes: ['id', 'nome']
                }
            ],
            order: [['timestamp', 'DESC']]
        });

        res.json(registos);
    } catch (error) {
        console.error('Erro ao obter registos da obra por dia:', error);
        res.status(500).json({ 
            message: 'Erro ao obter registos da obra',
            error: error.message 
        });
    }
};

const obterResumoObra = async (req, res) => {
    try {
        const { obraId } = req.params;
        const dataHoje = new Date().toISOString().split('T')[0];

        console.log(`📊 Obtendo resumo da obra ${obraId} para a data ${dataHoje}`);
        console.log(`🔍 Query SQL: obra_id = ${obraId} AND DATE(timestamp) = '${dataHoje}'`);

        // Obter todos os registos de hoje para esta obra
        const registosHoje = await RegistoPontoObra.findAll({
            where: {
                obra_id: obraId,
                timestamp: {
                    [Op.between]: [
                        new Date(dataHoje + 'T00:00:00.000Z'),
                        new Date(dataHoje + 'T23:59:59.999Z')
                    ]
                }
            },
            include: [
                {
                    model: User,
                    attributes: ['id', 'nome', 'username', 'email']
                }
            ],
            order: [['timestamp', 'DESC']]
        });

        console.log(`📋 Encontrados ${registosHoje.length} registos para hoje`);

        if (registosHoje.length > 0) {
            console.log(`🔍 Primeiros registos:`);
            registosHoje.slice(0, 3).forEach((reg, idx) => {
                console.log(`  ${idx + 1}. ${reg.User?.nome || 'N/A'} - ${reg.tipo} - ${reg.timestamp}`);
            });
        }

        // Calcular quantas pessoas estão atualmente a trabalhar
        const pessoasAtivas = new Set();
        const registosPorUser = {};

        // Organizar registos por utilizador
        registosHoje.forEach(registo => {
            const userId = registo.user_id;
            if (!registosPorUser[userId]) {
                registosPorUser[userId] = [];
            }
            registosPorUser[userId].push(registo);
        });

        console.log(`👥 Utilizadores únicos encontrados: ${Object.keys(registosPorUser).length}`);

        // Para cada utilizador, verificar se tem entrada ativa
        Object.keys(registosPorUser).forEach(userId => {
            const registosUser = registosPorUser[userId].sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );

            const ultimoRegisto = registosUser[0];
            console.log(`👤 User ${userId} (${ultimoRegisto.User?.nome}): último registo = ${ultimoRegisto.tipo} às ${ultimoRegisto.timestamp}`);

            // Se o registo mais recente é uma entrada, está ativo
            if (registosUser.length > 0 && registosUser[0].tipo === 'entrada') {
                pessoasAtivas.add(parseInt(userId));
                console.log(`✅ User ${userId} está ATIVO (última entrada sem saída)`);
            } else {
                console.log(`❌ User ${userId} NÃO está ativo (última ação: ${ultimoRegisto.tipo})`);
            }
        });

        const pessoasAConsultar = pessoasAtivas.size;

        // Pegar os últimos 10 registos para mostrar na lista
        const entradasSaidas = registosHoje.slice(0, 10);

        console.log(`🎯 RESULTADO FINAL: ${pessoasAConsultar} pessoas a trabalhar`);
        console.log(`📋 ${entradasSaidas.length} registos para mostrar na lista`);

        const resultado = {
            pessoasAConsultar,
            entradasSaidas
        };

        res.json(resultado);
    } catch (error) {
        console.error('❌ Erro ao obter resumo da obra:', error);
        res.status(500).json({ 
            message: 'Erro ao obter resumo da obra',
            error: error.message 
        });
    }
};

// --- NOVO: registar ponto com lógica automática de entrada/saída ---
const registarPontoObra = async (req, res) => {
    try {
        let { tipo, obra_id, latitude, longitude, targetUserId } = req.body;
        const userId = targetUserId || req.user.id;
        const empresaNome = req.body.empresa || req.user.empresa;

        // Se tipo for 'auto', determinar automaticamente
        if (tipo === 'auto') {
            const hoje = new Date().toISOString().split('T')[0];
            const registosHoje = await RegistoPontoObra.findAll({
                where: {
                    user_id: userId,
                    timestamp: {
                        [Op.gte]: `${hoje}T00:00:00`,
                        [Op.lt]: `${hoje}T23:59:59`
                    }
                },
                order: [['timestamp', 'DESC']]
            });

            // Verificar se tem entrada ativa na mesma obra
            const entradaAtivaMesmaObra = registosHoje.find(r => 
                r.tipo === 'entrada' && 
                r.obra_id == obra_id && 
                !registosHoje.some(s => 
                    s.tipo === 'saida' && 
                    s.obra_id == obra_id && 
                    new Date(s.timestamp) > new Date(r.timestamp)
                )
            );

            if (entradaAtivaMesmaObra) {
                tipo = 'saida';
            } else {
                // Verificar se tem entrada ativa noutra obra
                const ultimaEntradaAtiva = registosHoje
                    .filter(r => r.tipo === 'entrada')
                    .find(e => !registosHoje.some(s => 
                        s.tipo === 'saida' && 
                        new Date(s.timestamp) > new Date(e.timestamp)
                    ));

                if (ultimaEntradaAtiva && ultimaEntradaAtiva.obra_id != obra_id) {
                    // Fechar entrada na obra anterior
                    await RegistoPontoObra.create({
                        user_id: userId,
                        empresa_id: req.user.empresa_id,
                        obra_id: ultimaEntradaAtiva.obra_id,
                        tipo: 'saida',
                        timestamp: new Date().toISOString(),
                        latitude,
                        longitude
                    });
                }
                tipo = 'entrada';
            }
        }

        const novoRegisto = await RegistoPontoObra.create({
            user_id: userId,
            obra_id,
            tipo,
            timestamp: new Date(),
            latitude,
            longitude,
            empresa_id: req.user.empresa_id
        });

        await novoRegisto.save();

        res.status(201).json({ 
            message: 'Ponto registado com sucesso', 
            registo: novoRegisto,
            tipo: tipo
        });
    } catch (error) {
        console.error('Erro ao registar ponto na obra:', error);
        res.status(500).json({ message: 'Erro ao registar ponto na obra' });
    }
};


module.exports = {
  registarPonto,
  listarRegistosPorDia,
  resumoMensalPorUser,
  registarPontoEsquecido,
  listarPorObraEDia,
  registarPontoEquipa,
  listarRegistosHojeEquipa,
  confirmarPonto,
  cancelarPonto,
  listarPendentes,
  listarPorUserEDia,
  listarPorUserPeriodo,
  registarPontoEsquecidoPorOutro,
  eliminarRegisto,
  obterRegistosObraPorDia,
  obterResumoObra,
  registarPontoObra, // Adicionado a função exportada
};