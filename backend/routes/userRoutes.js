const express = require('express');
const {
    criarUtilizador,
    verificarConta,
    listarModulosDoUtilizador,
    loginUtilizador,
    getUsersByEmpresa,
    getEmpresasByUser,
    alterarPassword,
    criarUtilizadorAdmin,
    adicionarEmpresaAoUser,
    removerEmpresaDoUser,
    recuperarPassword,
    listarModulosESubmodulosDoUtilizador,
    updateProfileImage,
    getProfileImage,
    redefinirPassword,
    listarModulosDaEmpresaDoUser,
    obterEmpresaPredefinida,
    definirEmpresaPredefinida,
    atualizarDadosUtilizador,
    getDadosUtilizador,
    removerUtilizador,
    getCodFuncionario
} = require('../controllers/userController');
const router = express.Router();

const { authenticateToken } = require('../middleware/authMiddleware');


// Rotas de criação e autenticação de utilizadores
router.post('/', criarUtilizador);
router.post('/criarUtilizadorAdmin', criarUtilizadorAdmin);
router.post('/login', loginUtilizador);

// Rota para alterar a password
router.post('/alterarPassword', authenticateToken, alterarPassword);

// Rotas de verificação de conta e recuperação de password
router.get('/verify/:token', verificarConta);
router.post('/recuperar-password', recuperarPassword);
router.post('/redefinir-password/:token', redefinirPassword);

router.get('/getCodFuncionario/:userId', getCodFuncionario);

// Rotas para operações de empresa
router.get('/usersByEmpresa', authenticateToken, getUsersByEmpresa);
router.get('/empresas', authenticateToken, getEmpresasByUser);
router.post('/adicionar-empresa', authenticateToken, adicionarEmpresaAoUser);
router.post('/remover-empresa', authenticateToken, removerEmpresaDoUser);

// Rotas para módulos e submódulos
router.get('/:userid/modulos', listarModulosDoUtilizador);
router.get('/:userid/modulos-e-submodulos', listarModulosESubmodulosDoUtilizador);

// Rota para fazer upload da imagem de perfil com autenticação
router.post('/:userId/uploadProfileImage', authenticateToken, updateProfileImage);

// Corrija a rota para obter a imagem de perfil com o método GET
router.get('/:userId/profileImage', authenticateToken, getProfileImage);

// Rotas para empresa predefinida
router.get('/:userId/empresa-predefinida', authenticateToken, obterEmpresaPredefinida);
router.put('/:userId/empresa-predefinida', authenticateToken, definirEmpresaPredefinida);

router.get('/:userId/empresa-modulos', listarModulosDaEmpresaDoUser);

// Rota para atualizar dados do utilizador (empresa_areacliente, id_tecnico, tipoUser)
router.put('/:userId/dados-utilizador', authenticateToken, atualizarDadosUtilizador);

router.get('/:userId', authenticateToken, getDadosUtilizador);

// Rota para remover utilizador
router.delete('/:userId', authenticateToken, removerUtilizador);



module.exports = router;