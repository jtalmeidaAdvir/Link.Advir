const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de acesso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido ou expirado' });
        }

        req.user = decoded;

        // Adicionar flag para identificar se é POS
        if (decoded.isPOS) {
            req.isPOS = true;
            req.posId = decoded.posId;
        }

        next();
    });
};

module.exports = { authenticateToken };