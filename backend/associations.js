const User = require('./models/user');
const Empresa = require('./models/empresa');
const User_Empresa = require('./models/user_empresa');
const Modulo = require('./models/modulo');
const User_Modulo = require('./models/user_modulo');
const Submodulo = require('./models/submodulo');
const User_Submodulo = require('./models/user_submodulo');

// Relação N:N entre User e Empresa
User.belongsToMany(Empresa, { through: User_Empresa, foreignKey: 'user_id' });
Empresa.belongsToMany(User, { through: User_Empresa, foreignKey: 'empresa_id' });

// Relação N:N entre User e Modulo
User.belongsToMany(Modulo, { through: User_Modulo, as: 'modulos', foreignKey: 'user_id' });
Modulo.belongsToMany(User, { through: User_Modulo, as: 'utilizadores', foreignKey: 'modulo_id' });

// Relação 1:N entre Modulo e Submodulo
Modulo.hasMany(Submodulo, { foreignKey: 'moduloId', as: 'submodulos' });
Submodulo.belongsTo(Modulo, { foreignKey: 'moduloId', as: 'modulo' });

// Relação N:N entre User e Submodulo
User.belongsToMany(Submodulo, { through: User_Submodulo, as: 'submodulos', foreignKey: 'user_id' });
Submodulo.belongsToMany(User, { through: User_Submodulo, as: 'utilizadores', foreignKey: 'submodulo_id' });


// Associação entre Empresa e Modulo
Empresa.belongsToMany(Modulo, { through: 'EmpresaModulo', foreignKey: 'empresa_id', as: 'modulos' });
Modulo.belongsToMany(Empresa, { through: 'EmpresaModulo', foreignKey: 'modulo_id', as: 'empresas' });





module.exports = { User, Empresa, User_Empresa, Modulo, User_Modulo, Submodulo, User_Submodulo };
