const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extrai o token após 'Bearer'

    if (!token) {
        return res.status(403).json({ message: 'Token não fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: 'Token expirado',
                    error: 'Token expirado',
                    expired: true 
                });
            }
            return res.status(403).json({ 
                message: 'Token inválido.',
                error: 'Token inválido'
            });
        }

        req.user = { id: user.id };  // Garante que `id` está presente e simplifica o acesso
        console.log("User ID from token in middleware:", req.user.id); // Confirmação
        next();
    });
};

module.exports = authMiddleware;
