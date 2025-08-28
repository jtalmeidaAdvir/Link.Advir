
const User = require('./models/user');
const Empresa = require('./models/empresa');
const Modulo = require('./models/modulo');
const Submodulo = require('./models/submodulo');
const UserEmpresa = require('./models/user_empresa');
const UserModulo = require('./models/user_modulo');
const UserSubmodulo = require('./models/user_submodulo');
const EmpresaModulo = require('./models/empresa_modulo');
const EmpresaSubmodulo = require('./models/empresa_submodulo');
const RegistoPonto = require('./models/registoPonto');
const Intervalo = require('./models/intervalo');
const PedidoAlteracao = require('./models/pedidoalteracao');
const Obra = require('./models/obra');
const EquipaObra = require('./models/equipaObra');
const RegistoPontoObra = require('./models/registoPontoObra');
const FaltasFerias = require('./models/faltas_ferias');
const Notificacao = require('./models/notificacao');
const ParteDiariaCabecalho = require('./models/parteDiariaCabecalho');
const ParteDiariaItem = require('./models/parteDiariaItem');
const AnexoPedido = require('./models/anexoPedido');
const BiometricCredential = require('./models/biometricCredential');
const TrabalhadorExterno = require('./models/trabalhadorExterno');
const Contact = require('./models/contact');
const Schedule = require('./models/schedule');
const POS = require('./models/pos');

// Associações User
User.belongsToMany(Empresa, { through: UserEmpresa, foreignKey: 'user_id' });
User.belongsToMany(Modulo, { through: UserModulo, foreignKey: 'user_id' });
User.belongsToMany(Submodulo, { through: UserSubmodulo, foreignKey: 'user_id' });
User.belongsTo(Empresa, { foreignKey: 'empresa_id' });
User.hasMany(RegistoPonto, { foreignKey: 'user_id' });
User.hasMany(Intervalo, { foreignKey: 'user_id' });
User.hasMany(PedidoAlteracao, { foreignKey: 'user_id' });
User.hasMany(RegistoPontoObra, { foreignKey: 'user_id' });
User.hasMany(FaltasFerias, { foreignKey: 'user_id' });
User.hasMany(Notificacao, { foreignKey: 'user_id' });
User.hasMany(BiometricCredential, { foreignKey: 'user_id' });

// Associações Empresa
Empresa.belongsToMany(User, { through: UserEmpresa, foreignKey: 'empresa_id' });
Empresa.belongsToMany(Modulo, { through: EmpresaModulo, foreignKey: 'empresa_id' });
Empresa.belongsToMany(Submodulo, { through: EmpresaSubmodulo, foreignKey: 'empresa_id' });
Empresa.hasMany(User, { foreignKey: 'empresa_id' });
Empresa.hasMany(Obra, { foreignKey: 'empresa_id' });
Empresa.hasMany(TrabalhadorExterno, { foreignKey: 'empresa_id' });
Empresa.hasMany(POS, { foreignKey: 'empresa_id' });

// Associações Modulo
Modulo.belongsToMany(User, { through: UserModulo, foreignKey: 'modulo_id' });
Modulo.belongsToMany(Empresa, { through: EmpresaModulo, foreignKey: 'modulo_id' });
Modulo.hasMany(Submodulo, { foreignKey: 'modulo_id' });

// Associações Submodulo
Submodulo.belongsToMany(User, { through: UserSubmodulo, foreignKey: 'submodulo_id' });
Submodulo.belongsToMany(Empresa, { through: EmpresaSubmodulo, foreignKey: 'empresa_id' });
Submodulo.belongsTo(Modulo, { foreignKey: 'modulo_id' });

// Associações RegistoPonto
RegistoPonto.belongsTo(User, { foreignKey: 'user_id' });

// Associações Intervalo
Intervalo.belongsTo(User, { foreignKey: 'user_id' });

// Associações PedidoAlteracao
PedidoAlteracao.belongsTo(User, { foreignKey: 'user_id' });
PedidoAlteracao.hasMany(AnexoPedido, { foreignKey: 'pedido_id' });

// Associações Obra
Obra.belongsTo(Empresa, { foreignKey: 'empresa_id' });
Obra.hasMany(EquipaObra, { foreignKey: 'obra_id' });
Obra.hasMany(RegistoPontoObra, { foreignKey: 'obra_id' });
Obra.hasMany(ParteDiariaCabecalho, { foreignKey: 'obra_id' });
Obra.hasMany(POS, { foreignKey: 'obra_predefinida_id', as: 'POSs' });

// Associações EquipaObra
EquipaObra.belongsTo(User, { foreignKey: 'user_id' });
EquipaObra.belongsTo(Obra, { foreignKey: 'obra_id' });

// Associações RegistoPontoObra
RegistoPontoObra.belongsTo(User, { foreignKey: 'user_id' });
RegistoPontoObra.belongsTo(Obra, { foreignKey: 'obra_id' });

// Associações FaltasFerias
FaltasFerias.belongsTo(User, { foreignKey: 'user_id' });

// Associações Notificacao
Notificacao.belongsTo(User, { foreignKey: 'user_id' });

// Associações ParteDiariaCabecalho
ParteDiariaCabecalho.belongsTo(Obra, { foreignKey: 'obra_id' });
ParteDiariaCabecalho.hasMany(ParteDiariaItem, { foreignKey: 'cabecalho_id', as: 'itens' });

// Associações ParteDiariaItem
ParteDiariaItem.belongsTo(ParteDiariaCabecalho, { foreignKey: 'cabecalho_id' });

// Associações AnexoPedido
AnexoPedido.belongsTo(PedidoAlteracao, { foreignKey: 'pedido_id' });

// Associações BiometricCredential
BiometricCredential.belongsTo(User, { foreignKey: 'user_id' });

// Associações TrabalhadorExterno
TrabalhadorExterno.belongsTo(Empresa, { foreignKey: 'empresa_id' });

// Associações Contact
// (Contact não precisa de associações específicas por agora)

// Associações Schedule  
// (Schedule não precisa de associações específicas por agora)

// Associações POS
POS.belongsTo(Obra, { foreignKey: 'obra_predefinida_id', as: 'ObraPredefinida' });
POS.belongsTo(Empresa, { foreignKey: 'empresa_id' });

module.exports = {
    User,
    Empresa,
    Modulo,
    Submodulo,
    UserEmpresa,
    UserModulo,
    UserSubmodulo,
    EmpresaModulo,
    EmpresaSubmodulo,
    RegistoPonto,
    Intervalo,
    PedidoAlteracao,
    Obra,
    EquipaObra,
    RegistoPontoObra,
    FaltasFerias,
    Notificacao,
    ParteDiariaCabecalho,
    ParteDiariaItem,
    AnexoPedido,
    BiometricCredential,
    TrabalhadorExterno,
    Contact,
    Schedule,
    POS
};
