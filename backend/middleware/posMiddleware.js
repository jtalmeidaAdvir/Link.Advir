
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const POS = require('../models/pos');

const posMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Token de acesso requerido' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        
        // Verificar se é um POS ou um utilizador admin
        if (decoded.isPOS) {
            const pos = await POS.findByPk(decoded.posId);
            if (!pos || !pos.ativo) {
                return res.status(401).json({ message: 'POS não encontrado ou inativo' });
            }
            req.pos = pos;
            req.empresa_id = pos.empresa_id;
        } else if (decoded.userId) {
            const user = await User.findByPk(decoded.userId);
            if (!user || !user.ativo) {
                return res.status(401).json({ message: 'Utilizador não encontrado ou inativo' });
            }
            
            // Verificar se o utilizador é admin ou tem permissões adequadas
            if (!user.isAdmin && user.role !== 'admin') {
                return res.status(403).json({ message: 'Sem permissões para esta operação' });
            }
            
            req.user = user;
            req.empresa_id = user.empresa_id;
        } else {
            return res.status(401).json({ message: 'Token inválido' });
        }
        
        next();
    } catch (error) {
        console.error('Erro no middleware POS:', error);
        return res.status(401).json({ message: 'Token inválido' });
    }
};

module.exports = { posMiddleware };
