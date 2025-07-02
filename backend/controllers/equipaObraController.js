
const EquipaObra = require('../models/equipaObra');
const User = require('../models/user');
const Obra = require('../models/obra');

// Criar equipa
const criarEquipa = async (req, res) => {
    try {
        const { nome, obra_id, membros } = req.body;
        const encarregado_id = req.user.id;
        
        // Verificar se o utilizador é encarregado ou diretor
        const user = await User.findByPk(encarregado_id);
        if (!user || !['Encarregado', 'Diretor'].includes(user.tipoUser)) {
            return res.status(403).json({ message: 'Apenas encarregados e diretores podem criar equipas.' });
        }
        
        // Verificar se a obra existe
        const obra = await Obra.findByPk(obra_id);
        if (!obra) {
            return res.status(404).json({ message: 'Obra não encontrada.' });
        }
        
        // Criar registos da equipa para cada membro
        const equipaPromises = membros.map(user_id => 
            EquipaObra.create({
                nome,
                encarregado_id,
                user_id,
                obra_id
            })
        );
        
        const equipaCriada = await Promise.all(equipaPromises);
        res.status(201).json(equipaCriada);
    } catch (error) {
        console.error('Erro ao criar equipa:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Listar equipas por obra
const listarEquipasPorObra = async (req, res) => {
    try {
        const { obra_id } = req.params;
        
        const equipas = await EquipaObra.findAll({
            where: { obra_id },
            include: [
                { model: User, as: 'membro', attributes: ['id', 'nome', 'tipoUser'] },
                { model: User, as: 'encarregado', attributes: ['id', 'nome'] },
                { model: Obra, attributes: ['id', 'nome', 'codigo'] }
            ]
        });
        
        res.status(200).json(equipas);
    } catch (error) {
        console.error('Erro ao listar equipas:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Listar equipas do utilizador
const listarMinhasEquipas = async (req, res) => {
    try {
        const user_id = req.user.id;
        
        const equipas = await EquipaObra.findAll({
            where: { user_id },
            include: [
                { model: User, as: 'membro', attributes: ['id', 'nome', 'tipoUser'] },
                { model: User, as: 'encarregado', attributes: ['id', 'nome'] },
                { model: Obra, attributes: ['id', 'nome', 'codigo'] }
            ]
        });
        
        res.status(200).json(equipas);
    } catch (error) {
        console.error('Erro ao listar minhas equipas:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Remover membro da equipa
const removerMembroEquipa = async (req, res) => {
    try {
        const { equipa_id } = req.params;
        const encarregado_id = req.user.id;
        
        const equipa = await EquipaObra.findByPk(equipa_id);
        if (!equipa) {
            return res.status(404).json({ message: 'Registo de equipa não encontrado.' });
        }
        
        // Verificar se o utilizador é o encarregado da equipa
        if (equipa.encarregado_id !== encarregado_id) {
            return res.status(403).json({ message: 'Apenas o encarregado da equipa pode remover membros.' });
        }
        
        await equipa.destroy();
        res.status(200).json({ message: 'Membro removido da equipa com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover membro da equipa:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// Listar todas as equipas com os seus membros
const listarTodasEquipasAgrupadas = async (req, res) => {
  try {
    const registos = await EquipaObra.findAll({
      include: [
        { model: User, as: 'membro', attributes: ['id', 'email', 'nome', 'username'] },
        { model: User, as: 'encarregado', attributes: ['id', 'nome', 'username'] },
        { model: Obra, attributes: ['id', 'codigo', 'nome'] }
      ]
    });

    // Agrupar por nome da equipa
    const equipasAgrupadas = {};
    for (const reg of registos) {
      if (!equipasAgrupadas[reg.nome]) {
        equipasAgrupadas[reg.nome] = {
          nome: reg.nome,
          obra: reg.Obra,
          encarregado: reg.encarregado,
          membros: []
        };
      }
      equipasAgrupadas[reg.nome].membros.push(reg.membro);
    }

    res.status(200).json(Object.values(equipasAgrupadas));
  } catch (error) {
    console.error('Erro ao listar equipas agrupadas:', error);
    res.status(500).json({ message: 'Erro ao listar equipas.' });
  }
};


module.exports = {
    criarEquipa,
    listarEquipasPorObra,
    listarMinhasEquipas,
    removerMembroEquipa,
    listarTodasEquipasAgrupadas
};
