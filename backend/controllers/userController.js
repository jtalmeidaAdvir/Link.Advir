const { Op } = require('sequelize'); // Certifica-te de que isto está presente
const User = require('../models/user');

const Empresa = require('../models/empresa');
const Modulo = require('../models/modulo');
const User_Modulo = require('../models/user_modulo');
const User_Submodulo = require('../models/user_submodulo');
const Submodulo = require('../models/submodulo');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const transporter = require('../config/email'); // O ficheiro configurado para envio de e-mails
const User_Empresa = require('../models/user_empresa');


const parseImageToBinary = (req, res, next) => {
    if (req.body.imageData) {
        req.body.imageData = Buffer.from(req.body.imageData, 'base64');
    }
    next();
};


// Função para criar um novo utilizador e enviar e-mail de verificação
const criarUtilizadorAdmin = async (req, res) => {
    try {
        const { nome, username, email, password, isAdmin = false, empresa_areacliente } = req.body;

        // Verificar se o campo empresa_areacliente foi fornecido
        if (!empresa_areacliente) {
            return res.status(400).json({ message: 'O campo empresa_areacliente é obrigatório.' });
        }

        // Gerar um token de verificação aleatório
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Criptografar a password
        const hashedPassword = await bcryptjs.hash(password, 10);

        // Criar o utilizador
        console.log({ nome, username, email, password, isAdmin, empresa_areacliente });

        const novoUser = await User.create({
            nome,
            username,
            email,
            password: hashedPassword,
            isAdmin,
            verificationToken,
            isActive: false,
            empresa_areacliente, // Verifique se este campo está correto
        });


        // Enviar e-mail de verificação
        const verificationLink = `https://backend.advir.pt/api/users/verify/${verificationToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verificação de Conta',
            html: `
            <div style="font-family: Arial, sans-serif; text-align: center;">
                <img src="https://link.advir.pt/static/media/img_logo.a2a85989c690f4bfd096.png" alt="Advir Plan" style="width: 200px; margin-bottom: 20px;" />
                <h2 style="color: #1F2D50;">Bem-vindo, ${nome}!</h2>
                <p style="font-size: 16px; color: #333;">Obrigado por te juntares a nós. Para tirares o maior partido da nossa plataforma clica no botão abaixo!</p>
                <a href="${verificationLink}" style="background-color: #1792FE; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block; margin: 20px 0;">Verifica a minha Conta</a>
                <p style="font-size: 14px; color: #333;">Se tiveres alguma questão ou precisares de ajuda, não hesites em contactar a <a href="mailto:support@advir.pt" style="color: #1792FE;">equipa de suporte</a>.</p>
                <p style="font-size: 14px; color: #333;">Obrigado,<br>Advir</p>
            </div>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.error('Erro ao enviar e-mail:', error);
            }
            console.log('E-mail enviado:', info.response);
        });

        res.status(201).json({ message: 'Utilizador criado com sucesso. Por favor, verifica o teu e-mail.' });

    } catch (error) {
        console.error('Erro ao criar utilizador:', error);
        res.status(500).json({ error: 'Erro ao criar o utilizador.' });
    }
};







// Função para criar um novo utilizador e enviar e-mail de verificação
const criarUtilizador = async (req, res) => {
    try {
        const { nome, username, email, password, empresa_id, isAdmin = false, empresa_areacliente } = req.body;

        // Verificar se a empresa existe
        const empresa = await Empresa.findByPk(empresa_id);
        if (!empresa) {
            return res.status(404).json({ message: 'Empresa não encontrada.' });
        }

        // Gerar um token de verificação aleatório
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Criptografar a password
        const hashedPassword = await bcryptjs.hash(password, 10);

        // Criar o utilizador
        const novoUser = await User.create({
            nome,
            username,
            email,
            password: hashedPassword,
            isAdmin,
            verificationToken,
            isActive: false, // A conta começa inativa até verificar o e-mail
            empresa_areacliente, // Verifique se este campo está correto
        });

        // Associar o utilizador à empresa
        await novoUser.addEmpresa(empresa);  // Usa o método gerado pelo Sequelize para associar muitos-para-muitos

        // Enviar e-mail de verificação
        const verificationLink = `https://backend.advir.pt/api/users/verify/${verificationToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verificação de Conta',
            html: `
            <div style="font-family: Arial, sans-serif; text-align: center;">
                <img src="https://link.advir.pt/static/media/img_logo.a2a85989c690f4bfd096.png" alt="Advir Plan" style="width: 200px; margin-bottom: 20px;" />
                <h2 style="color: #1F2D50;">Bem-vindo, ${nome}!</h2>
                <p style="font-size: 16px; color: #333;">O seu administrador definiu o seguinte email: ${email}  e password: ${password}. Obrigado por te juntares a nós. Para tirares o maior partido da nossa plataforma clica no botão abaixo!</p>
                <a href="${verificationLink}" style="background-color: #1792FE; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block; margin: 20px 0;">Verifica a minha Conta</a>
                <p style="font-size: 14px; color: #333;">Se tiveres alguma questão ou precisares de ajuda, não hesites em contactar a <a href="mailto:support@advir.pt" style="color: #1792FE;">equipa de suporte</a>.</p>
                <p style="font-size: 14px; color: #333;">Obrigado,<br>Advir</p>
            </div>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.error('Erro ao enviar e-mail:', error);
            }
            console.log('E-mail enviado:', info.response);
        });

        res.status(201).json({ message: 'Utilizador criado com sucesso. Por favor, verifica o teu e-mail.' });

    } catch (error) {
        console.error('Erro ao criar utilizador:', error);
        res.status(500).json({ error: 'Erro ao criar o utilizador.' });
    }
};


// Verificar o token e ativar a conta
const verificarConta = async (req, res) => {
    const { token } = req.params;

    try {
        // Procura o utilizador pelo token de verificação
        const user = await User.findOne({ where: { verificationToken: token } });

        if (!user) {
            return res.status(400).json({ message: 'Token inválido ou já utilizado.' });
        }

        // Ativa a conta
        user.isActive = true;
        user.verificationToken = null; // Remove o token de verificação após o uso
        await user.save();

        // Redireciona para o frontend (login) após a verificação
        return res.redirect('https://link.advir.pt'); // Altera a URL para o endereço do frontend
    } catch (error) {
        console.error('Erro ao verificar a conta:', error);
        return res.status(500).json({ error: 'Erro ao verificar a conta.' });
    }
};


const jwt = require('jsonwebtoken');

const loginUtilizador = async (req, res) => {
    try {
        const { email, password } = req.body;

      const user = await User.findOne({
  where: { email }
});

console.log("→ Empresa predefinida do utilizador:", user.empresaPredefinida);
console.log("→ Campos completos:", user.get({ plain: true }));



        if (!user) {
            return res.status(400).json({ error: 'Utilizador não encontrado.' });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'Conta não verificada. Verifica o teu e-mail para ativar a conta.' });
        }

        const isPasswordValid = await bcryptjs.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Password incorreta.' });
        }

const userPlain = user.get({ plain: true });
console.log("→ Empresa predefinida do utilizador:", userPlain.empresaPredefinida);

        const token = jwt.sign(
            { id: user.id, userNome: user.nome, isAdmin: user.isAdmin, superAdmin: user.superAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            message: 'Login bem-sucedido',
            token,
            userId: user.id,
            isAdmin: user.isAdmin,
            superAdmin: user.superAdmin,
            empresa_areacliente: user.empresa_areacliente,
            id_tecnico: user.id_tecnico,
            userNome: user.nome,
            userEmail: user.email,
            empresaPredefinida: user.empresaPredefinida
        });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ error: 'Erro ao fazer login.' });
    }
};






const alterarPassword = async (req, res) => {
    try {
        const { newPassword, confirmNewPassword } = req.body;

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ error: 'As passwords não coincidem.' });
        }

        // Decodifica o token JWT para obter o ID do utilizador
        const { id } = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET);

        // Encontra o utilizador pelo ID
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }

        // Criptografar a nova password
        const hashedPassword = await bcryptjs.hash(newPassword, 10);

        // Atualizar a password e definir isFirstLogin como falso
        user.password = hashedPassword;
        user.isFirstLogin = false; // Atualiza o campo após a primeira alteração de password
        await user.save();

        return res.status(200).json({ message: 'Password alterada com sucesso.' });

    } catch (error) {
        console.error('Erro ao alterar password:', error);
        return res.status(500).json({ error: 'Erro ao alterar a password.' });
    }
};





const getUsersByEmpresa = async (req, res) => {
    const userId = req.user.id;  // Obtém o ID do utilizador autenticado a partir do token

    try {
        // Obtém o utilizador autenticado e as suas empresas associadas
        const user = await User.findByPk(userId, {
            include: {
                model: Empresa,
                attributes: ['id', 'empresa'],  // Inclui os campos necessários da empresa
                include: [{ model: User, attributes: ['id', 'username', 'email'] }]  // Inclui os utilizadores
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        // Mapeia os utilizadores e associa a empresa a que pertencem
        const usersInSameEmpresas = user.Empresas.flatMap(empresa =>
            empresa.Users.map(user => ({
                ...user.dataValues,  // Inclui os dados do utilizador
                empresa: empresa.empresa // Adiciona o nome da empresa
            }))
        );

        res.json(usersInSameEmpresas);
    } catch (error) {
        console.error('Erro ao obter utilizadores por empresa:', error);
        res.status(500).json({ message: 'Erro ao obter utilizadores.' });
    }
};




const getEmpresasByUser = async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await User.findByPk(userId, {
            include: {
                model: Empresa,
                attributes: ['id', 'empresa'],  // Ajusta conforme o teu modelo
                through: { attributes: [] }  // Remove os atributos da tabela de junção
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        if (!user.Empresas || user.Empresas.length === 0) {
            return res.status(204).send();  // Resposta sem conteúdo (204 No Content)
        }

        // Retorna apenas os dataValues (dados importantes) de cada empresa
        const empresasData = user.Empresas.map(empresa => empresa.dataValues);

        res.json(empresasData);
    } catch (error) {
        console.error('Erro ao obter empresas associadas ao utilizador:', error);
        res.status(500).json({ message: 'Erro ao obter empresas.' });
    }
};


// Função para associar um utilizador existente a uma nova empresa
const adicionarEmpresaAoUser = async (req, res) => {
    const { userId, novaEmpresaId } = req.body;

    try {
        // Verifica se o utilizador existe
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        // Verifica se a empresa existe
        const empresa = await Empresa.findByPk(novaEmpresaId);
        if (!empresa) {
            return res.status(404).json({ message: 'Empresa não encontrada.' });
        }

        // Verifica se o utilizador já está associado à empresa
        const associacaoExistente = await User_Empresa.findOne({ where: { user_id: userId, empresa_id: novaEmpresaId } });
        if (associacaoExistente) {
            return res.status(400).json({ message: 'O utilizador já está associado a esta empresa.' });
        }

        // Faz a associação
        await User_Empresa.create({ user_id: userId, empresa_id: novaEmpresaId });

        return res.status(200).json({ message: 'Empresa associada ao utilizador com sucesso.' });
    } catch (error) {
        console.error('Erro ao associar empresa ao utilizador:', error);
        return res.status(500).json({ message: 'Erro ao associar empresa ao utilizador.' });
    }
};


const removerEmpresaDoUser = async (req, res) => {
    const { userId, empresaId } = req.body;

    try {
        // Verifica se a associação existe
        const associacao = await User_Empresa.findOne({ where: { user_id: userId, empresa_id: empresaId } });
        if (!associacao) {
            return res.status(404).json({ message: 'A associação não foi encontrada.' });
        }

        // Remove a associação
        await User_Empresa.destroy({ where: { user_id: userId, empresa_id: empresaId } });

        return res.status(200).json({ message: 'Empresa removida do utilizador com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover empresa do utilizador:', error);
        return res.status(500).json({ message: 'Erro ao remover empresa do utilizador.' });
    }
};


const recuperarPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }

        // Gerar token de recuperação e definir a expiração para 1 hora
        const recoveryToken = crypto.randomBytes(32).toString('hex');
        user.recoveryToken = recoveryToken;
        user.recoveryTokenExpiry = Date.now() + 3600000; // 1 hora de validade
        await user.save();

        // Enviar email com o link de recuperação
        const recoveryLink = `https://link.advir.pt/redefinir-password/${recoveryToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Recuperação de Senha',
            html: `<p>Para redefinir a sua senha, clique no link abaixo:</p><a href="${recoveryLink}">Redefinir Senha</a>`,
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                return res.status(500).json({ error: 'Erro ao enviar email.' });
            }
            res.status(200).json({ message: 'Email enviado com sucesso.' });
        });

    } catch (error) {
        console.error('Erro ao recuperar password:', error);
        res.status(500).json({ error: 'Erro ao recuperar password.' });
    }
};


const redefinirPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        const user = await User.findOne({
            where: {
                recoveryToken: token,
                recoveryTokenExpiry: { [Op.gt]: Date.now() },  // Verifica se o token ainda é válido
            },
        });

        if (!user) {
            return res.status(400).json({ error: 'Token inválido ou expirado.' });
        }

        // Atualiza a senha
        const hashedPassword = await bcryptjs.hash(newPassword, 10);
        user.password = hashedPassword;
        user.recoveryToken = null;  // Limpa o token após uso
        user.recoveryTokenExpiry = null;
        await user.save();

        res.status(200).json({ message: 'Senha alterada com sucesso.' });
    } catch (error) {
        console.error('Erro ao redefinir a senha:', error);
        res.status(500).json({ error: 'Erro ao redefinir a senha.' });
    }
};


const listarModulosDoUtilizador = async (req, res) => {
    try {
        const { userid } = req.params;
        const utilizador = await User.findByPk(userid, {
            include: [
                { model: Modulo, as: 'modulos' }
            ]
        });

        if (!utilizador) {
            return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }

        res.json({ modulos: utilizador.modulos });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar módulos do utilizador.' });
    }
};


const listarModulosESubmodulosDoUtilizador = async (req, res) => {
    try {
        const { userid } = req.params;
        const utilizador = await User.findByPk(userid, {
            include: [
                {
                    model: Modulo,
                    as: 'modulos',
                    through: { attributes: [] },
                    include: [
                        {
                            model: Submodulo,
                            as: 'submodulos',
                            required: true,
                            include: {
                                model: User,
                                as: 'utilizadores',
                                where: { id: userid },
                                attributes: []
                            }
                        }
                    ]
                }
            ]
        });

        if (!utilizador) {
            return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }

        const modulosAssociados = utilizador.modulos.map(modulo => ({
            id: modulo.id,
            nome: modulo.nome,
            descricao: modulo.descricao,
            submodulos: modulo.submodulos.map(submodulo => ({
                id: submodulo.id,
                nome: submodulo.nome,
                descricao: submodulo.descricao
            }))
        }));

        res.status(200).json({ modulos: modulosAssociados });
    } catch (error) {
        console.error('Erro ao listar módulos e submódulos do utilizador:', error);
        res.status(500).json({ error: 'Erro ao listar módulos e submódulos do utilizador.' });
    }
};



// Função para atualizar a imagem de perfil no servidor
const updateProfileImage = async (req, res) => {
    const { userId } = req.params;

    if (!req.files || !req.files.profileImage) {
        console.log("Nenhuma imagem foi enviada.");
        return res.status(400).json({ message: 'Nenhuma imagem foi enviada.' });
    }

    try {
        const profileImage = req.files.profileImage.data;
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        user.profileImage = profileImage;
        await user.save();

        res.status(200).json({ message: 'Imagem de perfil atualizada com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar a imagem de perfil:', error);
        res.status(500).json({ message: 'Erro ao atualizar a imagem de perfil.' });
    }
};











// Função para obter a imagem de perfil
const getProfileImage = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByPk(userId);

        if (!user || !user.profileImage) {
            return res.status(404).json({ message: 'Imagem não encontrada.' });
        }

        res.set('Content-Type', 'image/png'); // Defina o tipo MIME
        return res.send(user.profileImage);
    } catch (error) {
        console.error('Erro ao obter a imagem do perfil:', error);
        return res.status(500).json({ message: 'Erro ao obter a imagem do perfil.' });
    }
};


// Função para fazer o upload da imagem de perfil
const uploadProfileImage = async (file) => {
    const token = localStorage.getItem('loginToken');
    const userId = localStorage.getItem('userId');

    if (!token || !userId) {
        alert("Autenticação necessária.");
        return;
    }

    const formData = new FormData();
    formData.append('profileImage', file); // Envia o ficheiro diretamente

    try {
        const response = await fetch(`https://backend.advir.pt/api/users/${userId}/uploadProfileImage`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData,
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message || "Imagem carregada com sucesso.");
        } else {
            console.error("Erro do servidor:", data);
            alert(data.error || "Erro ao carregar imagem.");
        }
    } catch (error) {
        console.error("Erro ao carregar imagem:", error);
        alert("Erro de rede ao tentar carregar a imagem.");
    }
};





const listarModulosDaEmpresaDoUser = async (req, res) => {
    const { userId } = req.params;
    try {
        const empresa = await Empresa.findOne({
            include: [
                {
                    model: User,
                    where: { id: userId },
                    attributes: [], // Evita carregar dados adicionais do utilizador
                },
                {
                    model: Modulo,
                    as: 'modulos',
                    include: [
                        {
                            model: Submodulo,
                            as: 'submodulos', // Certifica-te de que o alias é correto
                        },
                    ],
                },
            ],
        });

        if (!empresa) {
            return res.status(404).json({ message: 'Empresa não associada ao utilizador.' });
        }

        const modulos = empresa.modulos.map(modulo => ({
            id: modulo.id,
            nome: modulo.nome,
            descricao: modulo.descricao,
            submodulos: modulo.submodulos.map(submodulo => ({
                id: submodulo.id,
                nome: submodulo.nome,
                descricao: submodulo.descricao,
            })),
        }));

        res.status(200).json({ modulos });
    } catch (error) {
        console.error('Erro ao carregar módulos e submódulos da empresa do utilizador:', error);
        res.status(500).json({ error: 'Erro ao carregar módulos e submódulos da empresa do utilizador.' });
    }
};

const removerEmpresa = async (req, res) => {
    const { userId, empresaId } = req.body;

    try {
        const utilizador = await User.findByPk(userId);
        const empresa = await Empresa.findByPk(empresaId);

        if (!utilizador || !empresa) {
            return res.status(404).json({ message: 'Utilizador ou Empresa não encontrados.' });
        }

        await utilizador.removeEmpresa(empresa);

        res.status(200).json({ message: 'Empresa removida do utilizador com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover empresa do utilizador:', error);
        res.status(500).json({ message: 'Erro ao remover empresa do utilizador.' });
    }
};

const obterEmpresaPredefinida = async (req, res) => {
    const { userId } = req.params;

    try {
        const utilizador = await User.findByPk(userId);

        if (!utilizador) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        res.status(200).json({ empresaPredefinida: utilizador.empresaPredefinida });
    } catch (error) {
        console.error('Erro ao obter empresa predefinida:', error);
        res.status(500).json({ message: 'Erro ao obter empresa predefinida.' });
    }
};

const definirEmpresaPredefinida = async (req, res) => {
    const { userId } = req.params;
    const { empresaPredefinida } = req.body;

    try {
        const utilizador = await User.findByPk(userId);

        if (!utilizador) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        console.log("→ Antes:", utilizador.empresaPredefinida);
        
        // Força a alteração e garante que o Sequelize grava
        utilizador.setDataValue('empresaPredefinida', empresaPredefinida);
        await utilizador.save({ fields: ['empresaPredefinida'] });

        console.log("→ Depois:", utilizador.empresaPredefinida);

        res.status(200).json({ message: 'Empresa predefinida atualizada com sucesso.' });
    } catch (error) {
        console.error("→ Erro ao atualizar empresa predefinida:", error);
        res.status(500).json({ message: 'Erro ao definir empresa predefinida.' });
    }
};








module.exports = {
    criarUtilizador,
    verificarConta,
    loginUtilizador,
    getUsersByEmpresa,
    getEmpresasByUser,
    alterarPassword,
    criarUtilizadorAdmin,
    adicionarEmpresaAoUser,
    removerEmpresaDoUser,
    recuperarPassword,
    redefinirPassword,
    listarModulosDoUtilizador,
    listarModulosESubmodulosDoUtilizador,
    updateProfileImage,
    getProfileImage,
    parseImageToBinary,
    uploadProfileImage,
    listarModulosDaEmpresaDoUser,
    removerEmpresa,
    obterEmpresaPredefinida,
    definirEmpresaPredefinida
};