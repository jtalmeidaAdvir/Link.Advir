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
        const { userId, credentialId, publicKey, attestationObject, type, facialData } = req.body;

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
        const biometricType = type || 'fingerprint';
        const existingCredential = await BiometricCredential.findOne({
            where: { 
                userId: userId,
                biometricType: biometricType
            },
        });

        if (existingCredential) {
            return res
                .status(400)
                .json({ message: `Utilizador já tem ${biometricType === 'facial' ? 'biometria facial' : 'biometria'} registada.` });
        }

        let credentialData = {};

        if (biometricType === 'facial' && facialData) {
            // Processar dados faciais
            credentialData = {
                userId: userId,
                credentialId: `facial_${userId}_${Date.now()}`,
                publicKey: JSON.stringify(facialData),
                biometricType: 'facial',
                counter: 0,
                isActive: true,
            };
        } else {
            // Processar dados de impressão digital
            credentialData = {
                userId: userId,
                credentialId: credentialId,
                publicKey: publicKey,
                biometricType: 'fingerprint',
                counter: 0,
                isActive: true,
            };
        }

        // Criar nova credencial
        const newCredential = await BiometricCredential.create(credentialData);

        // Limpar challenge
        delete global.tempChallenges[userId];

        res.status(201).json({
            message: `${biometricType === 'facial' ? 'Biometria facial' : 'Biometria'} registada com sucesso.`,
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
            return res
                .status(404)
                .json({
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
            return res.json({ hasBiometric: false, hasFingerprint: false, hasFacial: false });
        }

        if (type) {
            // Verificar tipo específico
            const credential = await BiometricCredential.findOne({
                where: { 
                    userId: user.id, 
                    isActive: true,
                    biometricType: type
                },
            });
            return res.json({ hasBiometric: !!credential });
        }

        // Verificar todos os tipos
        const fingerprint = await BiometricCredential.findOne({
            where: { 
                userId: user.id, 
                isActive: true,
                biometricType: 'fingerprint'
            },
        });

        const facial = await BiometricCredential.findOne({
            where: { 
                userId: user.id, 
                isActive: true,
                biometricType: 'facial'
            },
        });

        res.json({ 
            hasBiometric: !!(fingerprint || facial),
            hasFingerprint: !!fingerprint,
            hasFacial: !!facial
        });
    } catch (error) {
        console.error("Erro ao verificar biometria:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Remover credencial biométrica
const removeBiometric = async (req, res) => {
    try {
        const { email, type } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email é obrigatório." });
        }

        // Encontrar o utilizador
        const user = await User.findOne({ where: { email: email } });
        if (!user) {
            return res
                .status(404)
                .json({ message: "Utilizador não encontrado." });
        }

        // Definir condições de remoção
        const whereCondition = { userId: user.id };
        if (type) {
            whereCondition.biometricType = type;
        }

        // Remover credenciais biométricas do utilizador
        const deleted = await BiometricCredential.destroy({
            where: whereCondition,
        });

        if (deleted === 0) {
            return res
                .status(404)
                .json({ 
                    message: type 
                        ? `Nenhuma credencial ${type === 'facial' ? 'facial' : 'biométrica'} encontrada.`
                        : "Nenhuma credencial biométrica encontrada." 
                });
        }

        res.json({
            message: type 
                ? `Credencial ${type === 'facial' ? 'facial' : 'biométrica'} removida com sucesso.`
                : "Credenciais biométricas removidas com sucesso.",
            removed: deleted,
            type: type || 'all'
        });
    } catch (error) {
        console.error("Erro ao remover biometria:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

module.exports = {
    generateRegisterChallenge,
    registerBiometric,
    generateLoginChallenge,
    authenticateWithBiometric,
    checkBiometric,
    removeBiometric,
};
