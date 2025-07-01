
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    criarEquipa,
    listarEquipasPorObra,
    listarMinhasEquipas,
    removerMembroEquipa
} = require('../controllers/equipaObraController');

router.post('/', authMiddleware, criarEquipa);
router.get('/obra/:obra_id', authMiddleware, listarEquipasPorObra);
router.get('/minhas', authMiddleware, listarMinhasEquipas);
router.delete('/:equipa_id', authMiddleware, removerMembroEquipa);

module.exports = router;
