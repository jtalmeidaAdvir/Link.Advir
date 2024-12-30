const Empresa = require('../models/empresa');
const User = require('../models/user');
const Modulo = require('../models/modulo');
const { encrypt, decrypt } = require('../utils/encryption');
const Submodulo = require('../models/submodulo');

// Controlador para criar uma nova empresa e associar ao utilizador
const criarEmpresa = async (req, res) => {
    const { username, password, urlempresa, empresa, linha } = req.body;
    const userId = req.user.id;

    try {
        const empresaExistente = await Empresa.findOne({ where: { username, empresa } });
        if (empresaExistente) {
            return res.status(400).json({ message: 'Já existe uma empresa com este username e nome de empresa.' });
        }

        // Encriptar a password
        const encryptedPassword = encrypt(password);

        // Criar nova empresa
        const novaEmpresa = await Empresa.create({
            username,
            password: encryptedPassword,
            urlempresa,
            empresa,
            linha,
        });

        const utilizador = await User.findByPk(userId);
        if (!utilizador) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        await utilizador.addEmpresa(novaEmpresa);

        res.status(201).json({ message: 'Empresa criada com sucesso e associada ao utilizador!', empresa: novaEmpresa });
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        res.status(500).json({ message: 'Erro ao criar empresa.' });
    }
};

// Função para obter as credenciais de uma empresa específica
const getEmpresaByNome = async (req, res) => {
    const { empresaNome } = req.params; // Recebe o nome da empresa dos parâmetros da URL
    console.log("Nome da empresa recebido:", empresaNome);

    try {
        const empresa = await Empresa.findOne({
            where: { empresa: empresaNome }, // Alteração para procurar pelo nome da empresa
            attributes: ['username', 'password', 'urlempresa', 'empresa', 'linha'],
        });

        if (!empresa) {
            console.log("Empresa não encontrada no banco de dados.");
            return res.status(404).json({ message: 'Empresa não encontrada.' });
        }

        // Desencriptar a password antes de enviá-la (se necessário)
        const decryptedPassword = decrypt(empresa.password);

        console.log("Dados da empresa encontrados:", empresa);
        res.json({
            username: empresa.username,
            password: decryptedPassword,
            empresa: empresa.empresa,
            urlempresa: empresa.urlempresa,
            linha: empresa.linha,
        });
    } catch (error) {
        console.error('Erro ao buscar empresa:', error);
        res.status(500).json({ error: 'Erro ao obter informações da empresa' });
    }
};



// Endpoint para atualizar o URL da empresa (urlempresa)
const atualizarUrlEmpresa = async (req, res) => {
    const { empresaId } = req.params;
    const { urlempresa } = req.body;

    try {
        const empresa = await Empresa.findByPk(empresaId);
        if (!empresa) {
            return res.status(404).json({ message: 'Empresa não encontrada.' });
        }

        empresa.urlempresa = urlempresa;
        await empresa.save();

        res.json({ message: 'URL da empresa atualizado com sucesso', urlempresa: empresa.urlempresa });
    } catch (error) {
        console.error('Erro ao atualizar URL da empresa:', error);
        res.status(500).json({ message: 'Erro ao atualizar URL da empresa.' });
    }
};

// 1. Listar todas as empresas
const listarEmpresas = async (req, res) => {
    try {
        const empresas = await Empresa.findAll();
        res.status(200).json(empresas);
    } catch (error) {
        console.error('Erro ao listar empresas:', error);
        res.status(500).json({ message: 'Erro ao listar empresas.' });
    }
};

// 2. Listar módulos associados a uma empresa específica
const listarModulosDaEmpresa = async (req, res) => {
    const { empresaId } = req.params;

    try {
        const empresa = await Empresa.findByPk(empresaId, {
            include: {
                model: Modulo,
                as: 'modulos',
            },
        });

        if (!empresa) {
            return res.status(404).json({ message: 'Empresa não encontrada.' });
        }

        res.status(200).json({ modulos: empresa.modulos });
    } catch (error) {
        console.error('Erro ao listar módulos da empresa:', error);
        res.status(500).json({ message: 'Erro ao listar módulos da empresa.' });
    }
};

// 3. Adicionar um módulo a uma empresa
const adicionarModuloAEmpresa = async (req, res) => {
    const { empresaId } = req.params;
    const { moduloId } = req.body;

    try {
        const empresa = await Empresa.findByPk(empresaId);
        const modulo = await Modulo.findByPk(moduloId);

        if (!empresa || !modulo) {
            return res.status(404).json({ message: 'Empresa ou módulo não encontrado.' });
        }

        await empresa.addModulo(modulo);
        res.status(200).json({ message: 'Módulo associado à empresa com sucesso.' });
    } catch (error) {
        console.error('Erro ao associar módulo à empresa:', error);
        res.status(500).json({ message: 'Erro ao associar módulo à empresa.' });
    }
};

// 4. Remover um módulo de uma empresa
const removerModuloDaEmpresa = async (req, res) => {
    const { empresaId, moduloId } = req.params;

    try {
        const empresa = await Empresa.findByPk(empresaId);
        const modulo = await Modulo.findByPk(moduloId);

        if (!empresa || !modulo) {
            return res.status(404).json({ message: 'Empresa ou módulo não encontrado.' });
        }

        await empresa.removeModulo(modulo);
        res.status(200).json({ message: 'Módulo removido da empresa com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover módulo da empresa:', error);
        res.status(500).json({ message: 'Erro ao remover módulo da empresa.' });
    }
};

const atualizarMaxUsers = async (req, res) => {
    const { empresaId } = req.params;
    const { maxUsers } = req.body;

    try {
        const empresa = await Empresa.findByPk(empresaId);
        if (!empresa) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        empresa.maxUsers = maxUsers;
        await empresa.save();

        res.json({ message: 'Número máximo de utilizadores atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar maxUsers:', error);
        res.status(500).json({ error: 'Erro ao atualizar maxUsers' });
    }
};

// Função utilitária para obter o URL da empresa com base no nome
async function getEmpresaUrlByEmpresa(empresa) {
    const empresaRecord = await Empresa.findOne({
        where: { empresa },
        attributes: ['urlempresa']
    });
    return empresaRecord ? empresaRecord.urlempresa : null;
}

module.exports = {
    criarEmpresa,
    getEmpresaByNome,
    atualizarUrlEmpresa,  // Exportar o novo endpoint
    listarEmpresas,
    listarModulosDaEmpresa,
    adicionarModuloAEmpresa,
    removerModuloDaEmpresa,
    atualizarMaxUsers,
    getEmpresaUrlByEmpresa,
};
