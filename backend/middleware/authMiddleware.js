const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

    if (!token) {
        console.log('❌ AuthMiddleware: Token não fornecido');
        return res.status(401).json({ message: 'Token não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ AuthMiddleware: Token válido para user:', decoded.id || decoded.userId);
        console.log('🔍 Decoded token payload:', {
            id: decoded.id,
            userId: decoded.userId,
            userNome: decoded.userNome,
            type: decoded.type
        });

        // Garantir que req.user tem o campo 'id' independentemente da estrutura do token
        req.user = {
            ...decoded,
            id: decoded.id || decoded.userId // Usar userId se id não estiver presente (caso dos tokens faciais)
        };

        next();
    } catch (error) {
        console.log('❌ AuthMiddleware: Token inválido:', error.message);
        return res.status(401).json({ message: 'Token inválido' });
    }
};


const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'seusegredo', async (err, user) => {
        if (err) {
            console.error('Erro JWT:', err);
            return res.status(403).json({ success: false, error: 'Token inválido' });
        }

        try {
            const foundUser = await User.findByPk(user.id);
            if (!foundUser) {
                return res.status(404).json({ success: false, error: 'Utilizador não encontrado' });
            }

            req.user = foundUser;
            next();
        } catch (dbErr) {
            console.error('Erro ao carregar utilizador:', dbErr);
            res.status(500).json({ success: false, error: 'Erro interno ao validar utilizador' });
        }
    });
};


module.exports = { authMiddleware,authenticateToken };
