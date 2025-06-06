const RegistoPonto = require('../models/registoPonto');
const { Op } = require('sequelize');
const Intervalo = require('../models/intervalo'); 

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
        const dataAtual = new Date().toISOString().split('T')[0];
        const horaAtual = new Date().toISOString(); // Data e hora ISO completas
        const { latitude, longitude, endereco } = req.body;

        console.log("Recebido do frontend:", { latitude, longitude, endereco });

        let registo = await RegistoPonto.findOne({
            where: { user_id: userId, data: dataAtual },
        });

        if (registo) {
            if (registo.horaSaida) {
                return res.status(400).json({ message: "Já registou entrada e saída para hoje." });
            } else {
                registo.horaSaida = horaAtual;
                registo.latitude = latitude;
                registo.longitude = longitude;
                registo.endereco = endereco;
                const totalHorasTrabalhadas = calcularHorasTrabalhadas(registo.horaEntrada, horaAtual);
                registo.totalHorasTrabalhadas = totalHorasTrabalhadas;
                await registo.save();

                return res.status(200).json({ 
                    message: "Hora de saída registada com sucesso!",
                    registo: registo.toJSON()
                });
            }
        } else {
            registo = await RegistoPonto.create({
                user_id: userId,
                data: dataAtual,
                horaEntrada: horaAtual,
                latitude,
                longitude,
                endereco,
                totalHorasTrabalhadas: 0,
                totalTempoIntervalo: 0
            });

            return res.status(201).json({
                message: "Hora de entrada registada com sucesso!",
                registo: registo.toJSON()
            });
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
        if (!userId) {
            console.error("Erro: userId é undefined no controlador");
            return res.status(400).json({ message: "Erro: userId não fornecido." });
        }

        const { latitude, longitude } = req.body;
        const dataAtual = new Date().toISOString().split('T')[0];
        const horaAtual = new Date().toLocaleTimeString('en-GB', { hour12: false });

        let registo = await RegistoPonto.findOne({
            where: { user_id: userId, data: dataAtual },
        });

        if (registo) {
            if (registo.horaSaida) {
                return res.status(400).json({ message: "Já registou entrada e saída para hoje." });
            } else {
                const totalTempoIntervalo = registo.totalTempoIntervalo || 0;
                const totalHorasTrabalhadas = calcularTotalHorasTrabalhadas(
                    registo.horaEntrada,
                    horaAtual,
                    totalTempoIntervalo
                );

                console.log("Total Horas Trabalhadas Calculado:", totalHorasTrabalhadas);

                registo.horaSaida = horaAtual;
                registo.latitude = latitude;
                registo.longitude = longitude;
                registo.totalHorasTrabalhadas = totalHorasTrabalhadas;

                await registo.save();
                console.log("Registo atualizado:", registo.toJSON());

                return res.status(200).json({ message: "Hora de saída e localização registadas com sucesso!" });
            }
        } else {
            await RegistoPonto.create({
                user_id: userId,
                data: dataAtual,
                horaEntrada: horaAtual,
                latitude: latitude,
                longitude: longitude,
                totalHorasTrabalhadas: 0
            });
            return res.status(201).json({ message: "Hora de entrada e localização registadas com sucesso!" });
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
        const { mes, ano } = req.query;

        const dataAtual = new Date();
        const anoFiltro = ano || dataAtual.getFullYear();
        const mesFiltro = mes ? String(mes).padStart(2, '0') : String(dataAtual.getMonth() + 1).padStart(2, '0');
        const dataInicio = `${anoFiltro}-${mesFiltro}-01`;
        const dataFim = new Date(anoFiltro, mesFiltro, 0).toISOString().split('T')[0];

        const registos = await RegistoPonto.findAll({
            where: {
                user_id: userId,
                data: { [Op.between]: [dataInicio, dataFim] }
            },
            include: [Intervalo],
            order: [['data', 'ASC']]
        });

        const registosComTotais = registos.map(registo => {
            const intervalos = registo.intervalos || [];
            let totalIntervaloHoras = 0;

            // Somar cada duracaoIntervalo e adicionar log para verificar cada valor
            intervalos.forEach(intervalo => {
                console.log(`Intervalo ID: ${intervalo.id} - Duração: ${intervalo.duracaoIntervalo}`);
                totalIntervaloHoras += intervalo.duracaoIntervalo || 0;
            });

            console.log(`Registo ID: ${registo.id} - Total de Tempo de Intervalo Calculado: ${totalIntervaloHoras}`);

            return {
                ...registo.toJSON(),
                totalHorasTrabalhadas: registo.totalHorasTrabalhadas,
                totalTempoIntervalo: registo.totalTempoIntervalo  // Formata para duas casas decimais
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




module.exports = {
    registarLeituraQRCode,
    getRegistoDiario,
    listarHistoricoPontoAdmin,
    registarPontoComBotao,
    editarRegisto,
    obterEstadoPonto

};
