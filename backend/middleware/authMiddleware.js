const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    console.log('🔐 AuthMiddleware - Verificando autenticação para:', req.method, req.path);

    const authHeader = req.headers.authorization;
    console.log('🔐 Authorization header:', authHeader ? authHeader.substring(0, 30) + '...' : 'não encontrado');

    const token = authHeader?.split(' ')[1];

    if (!token) {
        console.log('❌ AuthMiddleware - Token não fornecido');
        return res.status(401).json({ error: 'Token não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ AuthMiddleware - Token válido para user:', decoded.id);
        req.user = decoded;
        next();
    } catch (error) {
        console.log('❌ AuthMiddleware - Token inválido:', error.message);
        return res.status(401).json({ error: 'Token inválido.' });
    }
};

module.exports = authMiddleware;