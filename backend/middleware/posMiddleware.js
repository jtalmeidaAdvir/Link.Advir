
const jwt = require('jsonwebtoken');

const posMiddleware = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

    if (!token) {
        console.log('❌ POS Middleware: Token não fornecido');
        return res.status(401).json({ message: 'Token não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar se é um token POS
        if (!decoded.isPOS) {
            console.log('❌ POS Middleware: Token não é de POS');
            return res.status(403).json({ message: 'Acesso restrito a POS' });
        }

        console.log('✅ POS Middleware: Token POS válido:', decoded.posId);
        
        req.pos = {
            id: decoded.posId,
            empresa_id: decoded.empresa_id,
            obra_predefinida_id: decoded.obra_predefinida_id
        };

        next();
    } catch (error) {
        console.log('❌ POS Middleware: Token inválido:', error.message);
        return res.status(401).json({ message: 'Token inválido' });
    }
};

module.exports = posMiddleware;
