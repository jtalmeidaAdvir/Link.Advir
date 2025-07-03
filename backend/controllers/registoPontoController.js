const RegistoPonto = require('../models/registoPonto');
const { Op } = require('sequelize');
const Intervalo = require('../models/intervalo'); 
const Empresa = require('../models/empresa'); // <-- ADICIONA ESTA LINHA


const calcularHorasTrabalhadas = (horaEntrada, horaSaida) => {
    const entrada = new Date(horaEntrada);
    const saida = new Date(horaSaida);

    if (isNaN(entrada.getTime()) || isNaN(saida.getTime())) {
        console.error("Erro: Hora inválida.");
        return "0.00";
    }

    // Calcular a diferença em milissegundos e converter para horas
    const diferencaMilissegundos = saida.getTime() - entrada.getTime();
    const horasTrabalhadas = diferencaMilissegundos / (1000 * 60 * 60); // converter ms para horas

    return horasTrabalhadas.toFixed(2); // arredondar para duas casas decimais
};



const registarPontoComBotao = async (req, res) => {
  try {
    const userId = req.user.id;
    const nomeEmpresa = req.body.empresa;
    const dataAtual = new Date().toISOString().split('T')[0];
    const horaAtual = new Date().toISOString();
    const { latitude, longitude, endereco, obra_id } = req.body;

    if (!nomeEmpresa) {
      return res.status(400).json({ message: "Nome da empresa não fornecido." });
    }

    const empresa = await Empresa.findOne({ where: { empresa: nomeEmpresa } });
    if (!empresa) {
      return res.status(404).json({ message: "Empresa não encontrada." });
    }

    const tempoIntervaloPadrao = empresa.tempoIntervaloPadrao || 0;

    let registo = await RegistoPonto.findOne({
      where: {
        user_id: userId,
        empresa_id: empresa.id,
        data: dataAtual,
      },
    });

    if (registo) {
      if (registo.horaSaida) {
        return res.status(400).json({ message: "Já registou entrada e saída para hoje." });
      } else {
        registo.horaSaida = horaAtual;
        registo.latitude = latitude;
        registo.longitude = longitude;
        registo.endereco = endereco;
        registo.totalHorasTrabalhadas = calcularHorasTrabalhadas(registo.horaEntrada, horaAtual);

        // Se ainda não tiver tempo de intervalo, aplica o padrão
        if (registo.totalTempoIntervalo === 0 && tempoIntervaloPadrao > 0) {
          registo.totalTempoIntervalo = tempoIntervaloPadrao;
        }

        await registo.save();
        return res.status(200).json({ message: "Hora de saída registada com sucesso!", registo: registo.toJSON() });
      }
    } else {
      registo = await RegistoPonto.create({
        user_id: userId,
        empresa_id: empresa.id,
        data: dataAtual,
        horaEntrada: horaAtual,
        latitude,
        longitude,
        endereco,
        obra_id: obra_id || null,
        totalHorasTrabalhadas: 0,
        totalTempoIntervalo: tempoIntervaloPadrao, // 👈 aplica o valor aqui
      });

      return res.status(201).json({ message: "Hora de entrada registada com sucesso!", registo: registo.toJSON() });
    }
  } catch (error) {
    console.error("Erro ao registar ponto:", error);
    res.status(500).json({ message: "Erro ao registar ponto." });
  }
};




const obterEstadoPonto = async (req, res) => {
    try {
        const userId = req.user.id;

        const dataAtual = new Date().toISOString().split('T')[0];

        // Obter o registo do dia atual
        const registo = await RegistoPonto.findOne({
            where: { user_id: userId, data: dataAtual },
            include: [Intervalo],
        });

        if (!registo) {
            return res.status(200).json({ intervaloAberto: false, horaInicioIntervalo: null });
        }

        const ultimoIntervalo = registo.intervalos?.slice(-1)[0]; // Último intervalo, se existir

        res.status(200).json({
            intervaloAberto: ultimoIntervalo?.aberto || false,
            horaInicioIntervalo: ultimoIntervalo?.horaInicio || null,
        });
    } catch (error) {
        console.error("Erro ao obter estado do ponto:", error);
        res.status(500).json({ message: 'Erro ao obter estado do ponto.' });
    }
};



const registarLeituraQRCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const nomeEmpresa = req.body.empresa;
    const dataAtual = new Date().toISOString().split('T')[0];
    const horaAtual = new Date().toISOString();
    const { latitude, longitude, endereco, obra_id } = req.body;

    if (!nomeEmpresa) {
      return res.status(400).json({ message: "Nome da empresa não fornecido." });
    }

    const empresa = await Empresa.findOne({ where: { empresa: nomeEmpresa } });
    if (!empresa) {
      return res.status(404).json({ message: "Empresa não encontrada." });
    }

    const tempoIntervaloPadrao = empresa.tempoIntervaloPadrao || 0;

    let registo = await RegistoPonto.findOne({
      where: {
        user_id: userId,
        empresa_id: empresa.id,
        data: dataAtual,
      },
    });

    if (registo) {
      if (registo.horaSaida) {
        return res.status(400).json({ message: "Já registou entrada e saída para hoje." });
      } else {
        registo.horaSaida = horaAtual;
        registo.latitude = latitude;
        registo.longitude = longitude;
        registo.endereco = endereco;
        registo.totalHorasTrabalhadas = calcularHorasTrabalhadas(registo.horaEntrada, horaAtual);

        // Se ainda não tiver intervalo definido, aplica o padrão
        if (!registo.totalTempoIntervalo || registo.totalTempoIntervalo === 0) {
          registo.totalTempoIntervalo = tempoIntervaloPadrao;
        }

        await registo.save();
        return res.status(200).json({ message: "Hora de saída registada com sucesso!", registo: registo.toJSON() });
      }
    } else {
      registo = await RegistoPonto.create({
        user_id: userId,
        empresa_id: empresa.id,
        data: dataAtual,
        horaEntrada: horaAtual,
        latitude,
        longitude,
        endereco,
        obra_id: obra_id || null,
        totalHorasTrabalhadas: 0,
        totalTempoIntervalo: tempoIntervaloPadrao // 👈 aqui aplicas o valor
      });

      return res.status(201).json({ message: "Hora de entrada registada com sucesso!", registo: registo.toJSON() });
    }
  } catch (error) {
    console.error("Erro ao registar ponto:", error);
    res.status(500).json({ message: "Erro ao registar ponto." });
  }
};


const editarRegisto = async (req, res) => {
    try {
        const { registoId } = req.params; // ID do registo a ser editado
        const { horaEntrada, horaSaida } = req.body; // Novos valores

        const registo = await RegistoPonto.findByPk(registoId);

        if (!registo) {
            return res.status(404).json({ message: 'Registo não encontrado.' });
        }

        // Atualiza os campos necessários
        registo.horaEntrada = horaEntrada || registo.horaEntrada;
        registo.horaSaida = horaSaida || registo.horaSaida;

        // Recalcular horas trabalhadas, se necessário
        if (horaEntrada && horaSaida) {
            registo.totalHorasTrabalhadas = calcularHorasTrabalhadas(horaEntrada, horaSaida);
        }

        await registo.save();

        res.status(200).json({ message: 'Registo atualizado com sucesso.', registo });
    } catch (error) {
        console.error("Erro ao editar registo:", error);
        res.status(500).json({ message: 'Erro ao editar registo.' });
    }
};



const getRegistoDiario = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mes, ano, empresa } = req.query; // <- adiciona empresa ao query

    if (!empresa) {
      return res.status(400).json({ message: "Empresa não especificada." });
    }

    const empresaSelecionada = await Empresa.findOne({ where: { empresa } });

    if (!empresaSelecionada) {
      return res.status(404).json({ message: "Empresa não encontrada." });
    }

    const dataAtual = new Date();
    const anoFiltro = ano || dataAtual.getFullYear();
    const mesFiltro = mes ? String(mes).padStart(2, '0') : String(dataAtual.getMonth() + 1).padStart(2, '0');
    const dataInicio = `${anoFiltro}-${mesFiltro}-01`;
    const dataFim = new Date(anoFiltro, mesFiltro, 0).toISOString().split('T')[0];

    const registos = await RegistoPonto.findAll({
      where: {
        user_id: userId,
        empresa_id: empresaSelecionada.id, // <- FILTRO ADICIONADO
        data: { [Op.between]: [dataInicio, dataFim] }
      },
      include: [Intervalo],
      order: [['data', 'ASC']]
    });

    const registosComTotais = registos.map(registo => {
      const intervalos = registo.intervalos || [];
      let totalIntervaloHoras = 0;

      intervalos.forEach(intervalo => {
        totalIntervaloHoras += intervalo.duracaoIntervalo || 0;
      });

      return {
        ...registo.toJSON(),
        totalHorasTrabalhadas: registo.totalHorasTrabalhadas,
        totalTempoIntervalo: registo.totalTempoIntervalo
      };
    });

    res.json(registosComTotais);
  } catch (error) {
    console.error("Erro ao obter registos diários:", error);
    res.status(500).json({ message: 'Erro ao obter registos diários.' });
  }
};





const listarHistoricoPontoAdmin = async (req, res) => {
    try {
        const { usuario, mes, ano } = req.query;

        // Verifica se os parâmetros obrigatórios foram fornecidos
        if (!usuario || !mes || !ano) {
            return res.status(400).json({ message: 'Parâmetros insuficientes. É necessário fornecer usuário, mês e ano.' });
        }

        // Define o intervalo de datas para o mês e ano especificados
        const dataInicio = new Date(ano, mes - 1, 1);
        const dataFim = new Date(ano, mes, 0); // Último dia do mês

        // Consulta os registos de ponto do utilizador no intervalo de datas especificado
        const registos = await RegistoPonto.findAll({
            where: {
                user_id: usuario,
                data: {
                    [Op.between]: [dataInicio, dataFim]
                }
            },
            attributes: ['id', 'data', 'horaEntrada', 'horaSaida', 'totalHorasTrabalhadas', 'totalTempoIntervalo'],
            order: [['data', 'ASC']]
        });

        // Retorna os registos ao frontend
        res.json({ registos });
    } catch (error) {
        console.error("Erro ao obter histórico de pontos para o administrador:", error);
        res.status(500).json({ message: 'Erro ao obter histórico de pontos.' });
    }
};




const registarPontoParaOutro = async (req, res) => {
  try {
 

    const { user_id, empresa, latitude, longitude, endereco, obra_id } = req.body;

    if (!user_id || !empresa) {
      return res.status(400).json({ message: 'user_id e empresa são obrigatórios.' });
    }

    const empresaRegisto = await Empresa.findOne({ where: { empresa } });
    if (!empresaRegisto) {
      return res.status(404).json({ message: "Empresa não encontrada." });
    }

    const dataAtual = new Date().toISOString().split('T')[0];
    const horaAtual = new Date().toISOString();
    const tempoIntervaloPadrao = empresaRegisto.tempoIntervaloPadrao || 0;

    let registo = await RegistoPonto.findOne({
      where: {
        user_id,
        empresa_id: empresaRegisto.id,
        data: dataAtual,
      },
    });

    if (registo) {
      if (registo.horaSaida) {
        return res.status(400).json({ message: "Utilizador já registou entrada e saída hoje." });
      }

      registo.horaSaida = horaAtual;
      registo.latitude = latitude;
      registo.longitude = longitude;
      registo.endereco = endereco;
      registo.totalHorasTrabalhadas = calcularHorasTrabalhadas(registo.horaEntrada, horaAtual);

      if (!registo.totalTempoIntervalo || registo.totalTempoIntervalo === 0) {
        registo.totalTempoIntervalo = tempoIntervaloPadrao;
      }

      await registo.save();
      return res.status(200).json({ message: `Saída registada para utilizador ${user_id}.`, registo: registo.toJSON() });
    } else {
      registo = await RegistoPonto.create({
        user_id,
        empresa_id: empresaRegisto.id,
        data: dataAtual,
        horaEntrada: horaAtual,
        latitude,
        longitude,
        endereco,
        obra_id: obra_id || null,
        totalHorasTrabalhadas: 0,
        totalTempoIntervalo: tempoIntervaloPadrao,
      });

      return res.status(201).json({ message: `Entrada registada para utilizador ${user_id}.`, registo: registo.toJSON() });
    }

  } catch (error) {
    console.error("Erro ao registar ponto para outro utilizador:", error);
    res.status(500).json({ message: "Erro interno ao registar ponto para outro utilizador." });
  }
};




module.exports = {
    registarLeituraQRCode,
    getRegistoDiario,
    listarHistoricoPontoAdmin,
    registarPontoComBotao,
    editarRegisto,
    obterEstadoPonto,
    registarPontoParaOutro

};
