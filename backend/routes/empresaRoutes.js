const express = require('express');
const router = express.Router();
const Empresa = require('../models/empresa');
const User_Empresa = require('../models/user_empresa');
const { criarEmpresa, getEmpresaByNome, listarEmpresas, listarModulosDaEmpresa, adicionarModuloAEmpresa, atualizarUrlEmpresa, removerModuloDaEmpresa, atualizarEmpresaInfo, addSubmoduloToEmpresa, removeSubmoduloFromEmpresa, listarSubmodulosDisponiveisParaEmpresa, listarSubmodulosEmpresaPorModulo } = require('../controllers/empresaController');
const authMiddleware = require('../middleware/authMiddleware'); // Importa o middleware
 
// Rota para criar uma nova empresa, com o middleware de autenticação
router.post('/', authMiddleware, criarEmpresa);
router.get('/nome/:empresaNome', authMiddleware, getEmpresaByNome);
 
 
router.put('/:empresaId/urlempresa', atualizarUrlEmpresa);
 
// 1. Rota para listar todas as empresas
router.get('/listar', listarEmpresas);
 
// 2. Rota para listar módulos associados a uma empresa específica
router.get('/:empresaId/modulos', listarModulosDaEmpresa);
 
// 3. Rota para associar um módulo a uma empresa
router.post('/:empresaId/modulos', adicionarModuloAEmpresa);
 
// 4. Rota para remover um módulo de uma empresa
router.delete('/:empresaId/modulos/:moduloId', removerModuloDaEmpresa);
 
router.put('/:empresaId/updateMaxUsers', async (req, res) => {
    const { empresaId } = req.params;
    const { maxUsers } = req.body;
 
    console.log("ID da Empresa:", empresaId);
    console.log("Novo Limite de Utilizadores:", maxUsers);
 
    try {
        const empresa = await Empresa.findByPk(empresaId);
        if (!empresa) {
            console.log("Empresa não encontrada");
            return res.status(404).json({ error: 'Empresa não encontrada.' });
        }
 
        empresa.maxUsers = maxUsers;
        await empresa.save();
 
        res.status(200).json({ message: 'Número máximo de utilizadores atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar o número máximo de utilizadores:', error);
        res.status(500).json({ error: 'Erro ao atualizar o número máximo de utilizadores.' });
    }
});
 
 
router.get('/:empresaId', async (req, res) => {
    try {
        const empresaId = req.params.empresaId;
 
        // Obter a empresa
        const empresa = await Empresa.findByPk(empresaId, {
            attributes: ['id', 'empresa', 'maxUsers', 'tempoIntervaloPadrao', 'urlempresa', 'username', 'password', 'linha'], // Inclui credenciais para Primavera
        });
 
        if (!empresa) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }
 
        // Contar o número de utilizadores associados a esta empresa
        const currentUsers = await User_Empresa.count({
            where: { empresa_id: empresaId }
        });
 
        // Retornar a resposta com `currentUsers`
        res.json({
            id: empresa.id,
            empresa: empresa.empresa,
            maxUsers: empresa.maxUsers,
            tempoIntervaloPadrao: empresa.tempoIntervaloPadrao,
            urlempresa: empresa.urlempresa,
            username: empresa.username, // Credenciais para autenticação Primavera
            password: empresa.password,
            linha: empresa.linha,
            currentUsers: currentUsers,
        });
    } catch (error) {
        console.error('Erro ao obter informações da empresa:', error);
        res.status(500).json({ error: 'Erro ao obter informações da empresa' });
    }
});
 
router.put('/:empresaId/updateEmpresaInfo', atualizarEmpresaInfo);
 
// Rotas para gestão de submódulos
router.post('/:empresaId/submodulos', addSubmoduloToEmpresa);
router.delete('/:empresaId/submodulos/:submoduloId', removeSubmoduloFromEmpresa);
router.get('/:empresaId/modulos/:moduloId/submodulos-disponiveis', listarSubmodulosDisponiveisParaEmpresa);
router.get('/:empresaId/modulos/:moduloId/submodulos-empresa', listarSubmodulosEmpresaPorModulo);
router.get('/:empresaId/modulos/:moduloId/submodulos', listarSubmodulosEmpresaPorModulo);
 
module.exports = router;