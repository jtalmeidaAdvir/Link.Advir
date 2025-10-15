const express = require('express');
const router = express.Router();
const {
    criarPedido,
    listarPendentes,
    confirmarNivel1,
    confirmarNivel2,
    aprovarPedido,
    rejeitarPedido,
    listarAprovados,
    listarRejeitados,
    eliminarPedido,
    listarMinhaLista
    
} = require('../controllers/faltasFeriasController');
const authMiddleware = require('../middleware/authMiddleware');


router.post('/aprovacao', authMiddleware,criarPedido);
router.get('/aprovacao/pendentes', authMiddleware,listarPendentes);
router.get('/aprovacao/aprovados', authMiddleware, listarAprovados);
router.get('/aprovacao/rejeitados', authMiddleware, listarRejeitados);
router.get('/aprovacao/minha-lista', authMiddleware, listarMinhaLista);

router.put('/aprovacao/:id/confirmar-nivel1', authMiddleware,confirmarNivel1);
router.put('/aprovacao/:id/confirmar-nivel2', authMiddleware,confirmarNivel2);
router.put('/aprovacao/:id/aprovar', authMiddleware,aprovarPedido);
router.put('/aprovacao/:id/rejeitar', authMiddleware,rejeitarPedido);
router.delete('/aprovacao/:id', authMiddleware,eliminarPedido);


module.exports = router;
