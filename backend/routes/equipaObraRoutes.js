const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    criarEquipa,
    listarMinhasEquipas,
    removerMembroEquipa,
    listarTodasEquipasAgrupadas,
    atualizarNomeEquipa,
    listarEquipasPorEmpresa,
    removerEquipaInteira,
    listarMinhasEquipasAgrupadas,
    editarEquipa,

} = require('../controllers/equipaObraController');

router.post('/', authMiddleware, criarEquipa);
router.get('/minhas', authMiddleware, listarMinhasEquipas);
router.delete('/:equipa_id', authMiddleware, removerMembroEquipa);
router.get('/listar-todas', authMiddleware, listarTodasEquipasAgrupadas);
router.put('/:equipa_id', authMiddleware, atualizarNomeEquipa);
router.get('/por-empresa', authMiddleware, listarEquipasPorEmpresa);
router.post('/remover-equipa', authMiddleware, removerEquipaInteira);
router.get('/minhas-agrupadas', authMiddleware, listarMinhasEquipasAgrupadas);
router.put('/editar-equipa/:equipa_id', authMiddleware, editarEquipa);



module.exports = router;