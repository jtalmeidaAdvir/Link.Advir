const express = require('express');
const router = express.Router();
const {
    criarPedido,
    listarPendentes,
    confirmarNivel1,
    confirmarNivel2,
    aprovarPedido,
    rejeitarPedido
    
} = require('../controllers/faltasFeriasController');
const authMiddleware = require('../middleware/authMiddleware');


router.post('/aprovacao', authMiddleware,criarPedido);
router.get('/aprovacao/pendentes', authMiddleware,listarPendentes);
router.put('/aprovacao/:id/confirmar-nivel1', authMiddleware,confirmarNivel1);
router.put('/aprovacao/:id/confirmar-nivel2', authMiddleware,confirmarNivel2);
router.put('/aprovacao/:id/aprovar', authMiddleware,aprovarPedido);
router.put('/aprovacao/:id/rejeitar', authMiddleware,rejeitarPedido);

module.exports = router;
