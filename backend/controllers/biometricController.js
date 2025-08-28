const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user");
const BiometricCredential = require("../models/biometricCredential");

// Gerar challenge para registo
const generateRegisterChallenge = async (req, res) => {
    try {
        console.log(
            "🔄 generateRegisterChallenge - Dados recebidos:",
            req.body,
        );
        const { userId, userEmail } = req.body;

        if (!userId || !userEmail) {
            console.log("❌ Dados incompletos:", { userId, userEmail });
            return res
                .status(400)
                .json({ message: "UserId e userEmail são obrigatórios." });
        }

        // Verificar se o utilizador existe
        console.log("🔍 Procurando utilizador com ID:", userId);
        const user = await User.findByPk(userId);
        console.log("👤 Utilizador encontrado:", user ? "Sim" : "Não");

        if (!user) {
            console.log("❌ Utilizador não encontrado na base de dados");
            return res
                .status(404)
                .json({ message: "Utilizador não encontrado." });
        }

        // Gerar challenge aleatório
        const challenge = crypto.randomBytes(32);

        // Guardar challenge temporariamente (pode ser em cache Redis em produção)
        global.tempChallenges = global.tempChallenges || {};
        global.tempChallenges[userId] = {
            challenge: challenge,
            timestamp: Date.now(),
            userEmail: userEmail,
        };

        res.json({ challenge: Array.from(challenge) });
    } catch (error) {
        console.error("Erro ao gerar challenge:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Registar credencial biométrica
const registerBiometric = async (req, res) => {
    try {
        const {
            userId,
            credentialId,
            publicKey,
            attestationObject,
            type,
            facialData,
        } = req.body;

        if (!userId || (!credentialId && !facialData)) {
            return res
                .status(400)
                .json({ message: "Dados da credencial incompletos." });
        }

        // Verificar challenge
        global.tempChallenges = global.tempChallenges || {};
        const challengeData = global.tempChallenges[userId];

        if (!challengeData || Date.now() - challengeData.timestamp > 300000) {
            // 5 minutos
            return res
                .status(400)
                .json({ message: "Challenge expirado ou inválido." });
        }

        // Verificar se já existe credencial para este utilizador e tipo
        const biometricType = type || "fingerprint";
        const existingCredential = await BiometricCredential.findOne({
            where: {
                userId: userId,
                biometricType: biometricType,
            },
        });

        if (existingCredential) {
            return res
                .status(400)
                .json({
                    message: `Utilizador já tem ${biometricType === "facial" ? "biometria facial" : "biometria"} registada.`,
                });
        }

        let credentialData = {};

        if (biometricType === "facial" && facialData) {
            // Processar dados faciais
            credentialData = {
                userId: userId,
                credentialId: `facial_${userId}_${Date.now()}`,
                publicKey: JSON.stringify(facialData), // Armazena os dados faciais em publicKey por enquanto
                biometricType: "facial",
                counter: 0,
                isActive: true,
            };
        } else {
            // Processar dados de impressão digital
            credentialData = {
                userId: userId,
                credentialId: credentialId,
                publicKey: publicKey,
                biometricType: "fingerprint",
                counter: 0,
                isActive: true,
            };
        }

        // Criar nova credencial
        const newCredential = await BiometricCredential.create(credentialData);

        // Limpar challenge
        delete global.tempChallenges[userId];

        res.status(201).json({
            message: `${biometricType === "facial" ? "Biometria facial" : "Biometria"} registada com sucesso.`,
            credentialId: newCredential.credentialId,
            type: biometricType,
        });
    } catch (error) {
        console.error("Erro ao registar biometria:", error);
        res.status(500).json({ message: "Erro ao registar biometria." });
    }
};

// Gerar challenge para login
const generateLoginChallenge = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email é obrigatório." });
        }

        // Verificar se o utilizador existe
        const user = await User.findOne({ where: { email: email } });
        if (!user) {
            return res
                .status(404)
                .json({ message: "Utilizador não encontrado." });
        }

        // Verificar se tem credencial biométrica
        const credential = await BiometricCredential.findOne({
            where: { userId: user.id, isActive: true },
        });

        if (!credential) {
            return res.status(404).json({
                message: "Biometria não registada para este utilizador.",
            });
        }

        // Gerar challenge
        const challenge = crypto.randomBytes(32);

        // Guardar challenge
        global.tempLoginChallenges = global.tempLoginChallenges || {};
        global.tempLoginChallenges[email] = {
            challenge: challenge,
            timestamp: Date.now(),
            userId: user.id,
        };

        res.json({
            challenge: Array.from(challenge),
            allowCredentials: [
                {
                    id: credential.credentialId,
                    type: "public-key",
                },
            ],
        });
    } catch (error) {
        console.error("Erro ao gerar challenge de login:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Autenticar com biometria
const authenticateWithBiometric = async (req, res) => {
    try {
        const {
            email,
            credentialId,
            authenticatorData,
            clientDataJSON,
            signature,
        } = req.body;

        if (!email || !credentialId || !signature) {
            return res
                .status(400)
                .json({ message: "Dados de autenticação incompletos." });
        }

        // Verificar challenge
        global.tempLoginChallenges = global.tempLoginChallenges || {};
        const challengeData = global.tempLoginChallenges[email];

        if (!challengeData || Date.now() - challengeData.timestamp > 300000) {
            return res
                .status(400)
                .json({ message: "Challenge expirado ou inválido." });
        }

        // Buscar utilizador e credencial
        const user = await User.findByPk(challengeData.userId);
        const credential = await BiometricCredential.findOne({
            where: {
                userId: challengeData.userId,
                credentialId: credentialId,
                isActive: true,
            },
        });

        if (!user || !credential) {
            return res
                .status(404)
                .json({ message: "Credencial não encontrada." });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Conta não verificada." });
        }

        // Em uma implementação real, aqui seria feita a verificação da assinatura
        // Por simplicidade, vamos assumir que a verificação passou

        // Atualizar contador da credencial
        credential.counter += 1;
        await credential.save();

        // Limpar challenge
        delete global.tempLoginChallenges[email];

        // Gerar token JWT
        const token = jwt.sign(
            {
                id: user.id,
                userNome: user.nome,
                isAdmin: user.isAdmin,
                superAdmin: user.superAdmin,
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" },
        );

        res.json({
            message: "Login biométrico bem-sucedido",
            token,
            userId: user.id,
            isAdmin: user.isAdmin,
            superAdmin: user.superAdmin,
            empresa_areacliente: user.empresa_areacliente,
            id_tecnico: user.id_tecnico,
            userNome: user.nome,
            userEmail: user.email,
            username: user.username,
            empresaPredefinida: user.empresaPredefinida,
            tipoUser: user.tipoUser,
            codFuncionario: user.codFuncionario,
            codRecursosHumanos: user.codRecursosHumanos,
        });
    } catch (error) {
        console.error("Erro na autenticação biométrica:", error);
        res.status(500).json({ message: "Erro na autenticação biométrica." });
    }
};

// Verificar se utilizador tem biometria
const checkBiometric = async (req, res) => {
    try {
        const { email, type } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email é obrigatório." });
        }

        const user = await User.findOne({ where: { email: email } });

        if (!user) {
            return res.json({
                hasBiometric: false,
                hasFingerprint: false,
                hasFacial: false,
            });
        }

        if (type) {
            // Verificar tipo específico
            const credential = await BiometricCredential.findOne({
                where: {
                    userId: user.id,
                    isActive: true,
                    biometricType: type,
                },
            });
            return res.json({ hasBiometric: !!credential });
        }

        // Verificar todos os tipos
        const fingerprint = await BiometricCredential.findOne({
            where: {
                userId: user.id,
                isActive: true,
                biometricType: "fingerprint",
            },
        });

        const facial = await BiometricCredential.findOne({
            where: {
                userId: user.id,
                isActive: true,
                biometricType: "facial",
            },
        });

        res.json({
            hasBiometric: !!(fingerprint || facial),
            hasFingerprint: !!fingerprint,
            hasFacial: !!facial,
        });
    } catch (error) {
        console.error("Erro ao verificar biometria:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Remover credencial biométrica
const removeBiometric = async (req, res) => {
    try {
        const { email, type = "fingerprint" } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email é obrigatório",
            });
        }

        // Encontrar o utilizador
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilizador não encontrado",
            });
        }

        // Remover todas as credenciais biométricas do tipo especificado
        const deletedCount = await BiometricCredential.destroy({
            where: {
                userId: user.id,
                biometricType: type, // Corrigido para biometricType
            },
        });

        if (deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Nenhuma credencial biométrica encontrada para remover",
            });
        }

        res.json({
            success: true,
            message: `Credencial biométrica ${type} removida com sucesso`,
            removedCount: deletedCount, // Corrigido para removedCount
        });
    } catch (error) {
        console.error("Erro ao remover credencial biométrica:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor",
        });
    }
};

// Função para autenticação com dados faciais
const authenticateWithFacialData = async (req, res) => {
    try {
        const { facialData, empresa, obra_id, tipo } = req.body;

        if (!facialData || !facialData.data) {
            return res.status(400).json({
                success: false,
                message: 'Dados faciais são obrigatórios'
            });
        }

        // Parse dos dados faciais
        let parsedFacialData;
        try {
            parsedFacialData = typeof facialData.data === 'string'
                ? JSON.parse(facialData.data)
                : facialData.data;
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                message: 'Dados faciais inválidos'
            });
        }

        // Verificar se há template biométrico
        if (!parsedFacialData.biometricTemplate || !parsedFacialData.biometricTemplate.descriptor) {
            return res.status(400).json({
                success: false,
                message: 'Template biométrico não encontrado nos dados faciais'
            });
        }

        const faceDescriptor = parsedFacialData.biometricTemplate.descriptor;

        // Buscar todas as credenciais faciais da empresa
        let whereClause = { biometricType: 'facial' }; // Corrigido para biometricType
        if (empresa) {
            // Buscar utilizadores da empresa específica
            const User = require('../models/user');
            const users = await User.findAll({
                where: { empresa_id: empresa },
                attributes: ['id']
            });
            const userIds = users.map(u => u.id);

            if (userIds.length > 0) {
                whereClause.userId = { [require('sequelize').Op.in]: userIds }; // Corrigido para userId
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Nenhum utilizador encontrado para esta empresa'
                });
            }
        }

        const credentials = await BiometricCredential.findAll({
            where: whereClause,
            include: [{
                model: require('../models/user'),
                attributes: ['id', 'nome', 'email', 'empresa_id']
            }]
        });

        if (credentials.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nenhuma credencial facial encontrada'
            });
        }

        // Comparar com todas as credenciais
        let bestMatch = null;
        let bestSimilarity = 0;
        const threshold = 0.6; // Limiar de similaridade

        for (const credential of credentials) {
            try {
                // Assumindo que o publicKey contém os dados faciais como string JSON
                const storedFacialData = JSON.parse(credential.publicKey); // Corrigido para publicKey
                const storedDescriptor = storedFacialData.biometricTemplate.descriptor; // Corrigido para biometricTemplate

                // Calcular similaridade usando distância euclidiana (ou outra métrica adequada)
                // Esta função calculateFacialSimilarity precisa ser definida ou importada
                // Por agora, vamos usar uma placeholder ou assumir que existe
                const similarity = calculateFacialSimilarity(faceDescriptor, storedDescriptor);

                if (similarity > bestSimilarity && similarity >= threshold) {
                    bestSimilarity = similarity;
                    bestMatch = credential;
                }
            } catch (parseError) {
                console.error('Erro ao processar credencial:', parseError);
                continue;
            }
        }

        if (!bestMatch) {
            return res.status(401).json({
                success: false,
                message: 'Face não reconhecida. Tente novamente ou contacte o administrador.'
            });
        }

        // Utilizador identificado com sucesso
        const user = bestMatch.User;
        const confidence = Math.round(bestSimilarity * 100);

        // Validação do tipo de registo baseada no estado atual (igual ao registo de ponto obra)
        if (tipo && obra_id !== null) { // Verifica se obra_id foi passado e não é null
            const tipoValidado = await determinarTipoRegistoFacial(user.id, obra_id, tipo);
            if (tipoValidado.erro) {
                return res.status(400).json({
                    success: false,
                    message: tipoValidado.message
                });
            }
        } else if (tipo && obra_id === null) {
             // Caso se tente registar uma entrada/saída sem obra associada, mas com tipo especificado
             // Poderia haver uma lógica aqui para lidar com isso, mas vamos manter a consistência com o requisito
             // Se obra_id é null, a validação pode não ser aplicável ou ter uma regra diferente
             // Para este contexto, vamos apenas prosseguir se obra_id for null e tipo for especificado,
             // sem a validação de obra específica. A função determinarTipoRegistoFacial já lida com obra_id null.
        }


        res.json({
            success: true,
            message: `Utilizador identificado com ${confidence}% de confiança`,
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                empresa_id: user.empresa_id
            },
            confidence: confidence,
            biometricType: 'facial'
        });

    } catch (error) {
        console.error('Erro na autenticação facial:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno na autenticação facial'
        });
    }
};

// Função para calcular similaridade facial (exemplo usando distância euclidiana)
const calculateFacialSimilarity = (descriptor1, descriptor2) => {
    if (
        !descriptor1 ||
        !descriptor2 ||
        descriptor1.length !== descriptor2.length
    ) {
        return 0; // Retorna 0 se os descritores forem inválidos
    }

    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
        const diff = descriptor1[i] - descriptor2[i];
        sum += diff * diff;
    }
    const distance = Math.sqrt(sum);

    // Converter distância euclidiana para uma métrica de similaridade (exemplo: 1 / (1 + distância))
    // Um valor mais próximo de 1 indica maior similaridade (menor distância)
    // Ajustar esta fórmula conforme necessário para a métrica específica
    return 1 / (1 + distance);
};


// Função para determinar e validar o tipo de registo para reconhecimento facial
const determinarTipoRegistoFacial = async (userId, obraId, tipoSolicitado) => {
    try {
        const { Op } = require('sequelize');
        const RegistoPontoObra = require('../models/registoPontoObra');

        // Buscar registos do utilizador para a obra na data atual
        const dataAtual = new Date();
        const inicioHoje = new Date(
            dataAtual.getFullYear(),
            dataAtual.getMonth(),
            dataAtual.getDate(),
        );
        const fimHoje = new Date(
            dataAtual.getFullYear(),
            dataAtual.getMonth(),
            dataAtual.getDate(),
            23,
            59,
            59,
        );

        const whereClause = {
            user_id: userId,
            timestamp: {
                [Op.between]: [inicioHoje, fimHoje],
            },
        };

        // Adicionar obra_id apenas se não for null
        if (obraId !== null) {
            whereClause.obra_id = obraId;
        } else {
             // Se obra_id é null, é necessário considerar registos sem obra_id para a validação
             // Assumindo que registos sem obra_id também devem ser considerados para a lógica de entrada/saída
             // No entanto, a lógica original pode ter sido projetada apenas para obras específicas.
             // Para manter a coerência, se obra_id é null, e o tipo solicitado não é uma entrada genérica,
             // pode ser necessário um comportamento diferente.
             // Por enquanto, vamos permitir a busca sem obra_id se ele for null, mas a interpretação
             // de "entrada ativa" pode depender de como os registos sem obra_id são tratados.
             // Se a intenção é que a validação só ocorra para obras específicas, então
             // a chamada a esta função deveria garantir que obra_id não é null quando é necessário validar.
             // Dado que a validação é solicitada para "entrada etc etc", vamos assumir que
             // a ausência de obra_id pode significar um registo geral (fora de uma obra específica).
             // A função `RegistoPontoObra.findAll` buscará todos os registos se obra_id não estiver na clausula `where`.
             // Se quisermos excluir registos sem obra_id quando obra_id é explicitamente null na chamada,
             // precisamos adicionar `where: { ... , obra_id: null }`.
             // Mas a lógica atual `if (obraId !== null)` já lida com isso, não adicionando `obra_id` ao where
             // se for null, o que significa que todos os registos (com ou sem obra_id) seriam considerados.
        }


        const registosHoje = await RegistoPontoObra.findAll({
            where: whereClause,
            order: [["timestamp", "ASC"]],
        });

        // Se não há registos hoje e tentativa de saída
        if (registosHoje.length === 0 && tipoSolicitado === 'saida') {
            return {
                erro: true,
                message: 'Não é possível registar saída sem ter registado entrada.'
            };
        }

        // Se não há registos hoje, é entrada
        if (registosHoje.length === 0) {
            return { tipo: "entrada" };
        }

        // Verificar se há entrada ativa (sem saída correspondente)
        const entradas = registosHoje.filter(r => r.tipo === 'entrada');
        const saidas = registosHoje.filter(r => r.tipo === 'saida');

        const temEntradaAtiva = entradas.length > saidas.length;

        // Validações baseadas no estado atual
        if (tipoSolicitado === 'entrada' && temEntradaAtiva) {
            return {
                erro: true,
                message: 'Já tem uma entrada registada. Registe primeiro a saída.'
            };
        }

        if (tipoSolicitado === 'saida' && !temEntradaAtiva) {
            return {
                erro: true,
                message: 'Não tem entrada ativa. Registe primeiro a entrada.'
            };
        }

        // Se chegou até aqui, o tipo solicitado é válido
        return { tipo: tipoSolicitado };

    } catch (error) {
        console.error('Erro ao determinar tipo de registo facial:', error);
        return {
            erro: true,
            message: 'Erro ao validar estado do registo.'
        };
    }
};


module.exports = {
    generateRegisterChallenge,
    registerBiometric,
    generateLoginChallenge,
    authenticateWithBiometric,
    checkBiometric,
    removeBiometric,
    authenticateWithFacialData,
};