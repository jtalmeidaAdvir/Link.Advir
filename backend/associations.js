const User = require('./models/user');
const Empresa = require('./models/empresa');
const UserEmpresa = require('./models/user_empresa');
const Modulo = require('./models/modulo');
const Submodulo = require('./models/submodulo');
const UserModulo = require('./models/user_modulo');
const UserSubmodulo = require('./models/user_submodulo');
const EmpresaModulo = require('./models/empresa_modulo');
const EmpresaSubmodulo = require('./models/empresa_submodulo');
const Obra = require('./models/obra');
const RegistoPonto = require('./models/registoPonto');
const Intervalo = require('./models/intervalo');
const PedidoAlteracao = require('./models/pedidoalteracao');
const FaltasFerias = require('./models/faltas_ferias');
const RegistoPontoObra = require('./models/registoPontoObra');
const TrabalhadorExterno = require('./models/trabalhadorExterno');
const EquipaObra = require('./models/equipaObra');
const BiometricCredential = require('./models/biometricCredential');
const Notificacao = require('./models/notificacao');
const ParteDiariaCabecalho = require('./models/parteDiariaCabecalho');
const ParteDiariaItem = require('./models/parteDiariaItem');
const AnexoPedido = require('./models/anexoPedido');
const POS = require('./models/pos');
const Visitante = require('./models/visitante');
const RegistoPontoVisitante = require('./models/registoPontoVisitante');
const Configuracao = require('./models/configuracao');

// Nota: Contact e Schedule são tabelas independentes para o WhatsApp Web
// sem relações diretas com outras tabelas

// Relação N:N entre User e Empresa
User.belongsToMany(Empresa, { through: UserEmpresa, foreignKey: 'user_id' });
Empresa.belongsToMany(User, { through: UserEmpresa, foreignKey: 'empresa_id' });

// Relação N:N entre User e Modulo
User.belongsToMany(Modulo, { through: UserModulo, as: 'modulos', foreignKey: 'user_id' });
Modulo.belongsToMany(User, { through: UserModulo, as: 'utilizadores', foreignKey: 'modulo_id' });

// Relação 1:N entre Modulo e Submodulo
Modulo.hasMany(Submodulo, { foreignKey: 'moduloId', as: 'submodulos' });
Submodulo.belongsTo(Modulo, { foreignKey: 'moduloId', as: 'modulo' });

// Relação N:N entre User e Submodulo
User.belongsToMany(Submodulo, { through: UserSubmodulo, as: 'submodulos', foreignKey: 'user_id' });
Submodulo.belongsToMany(User, { through: UserSubmodulo, as: 'utilizadores', foreignKey: 'submodulo_id' });


// Associação entre Empresa e Modulo
Empresa.belongsToMany(Modulo, { through: EmpresaModulo, foreignKey: 'empresa_id', as: 'modulos' });
Modulo.belongsToMany(Empresa, { through: EmpresaModulo, foreignKey: 'modulo_id', as: 'empresas' });

// Associações entre Empresa e Submodulo (many-to-many)
Empresa.belongsToMany(Submodulo, {
    through: EmpresaSubmodulo,
    as: 'submodulos',
    foreignKey: 'empresa_id',
    otherKey: 'submodulo_id'
});

Submodulo.belongsToMany(Empresa, {
    through: EmpresaSubmodulo,
    as: 'empresas',
    foreignKey: 'submodulo_id',
    otherKey: 'empresa_id'
});

// User_Empresa associações
UserEmpresa.belongsTo(User, { foreignKey: "user_id" });
UserEmpresa.belongsTo(Empresa, { foreignKey: "empresa_id" });

// User_Modulo associações
UserModulo.belongsTo(User, { foreignKey: "user_id" });
UserModulo.belongsTo(Modulo, { foreignKey: "modulo_id" });
UserModulo.belongsTo(Empresa, { foreignKey: "empresa_id" });

// User_Submodulo associações
UserSubmodulo.belongsTo(User, { foreignKey: "user_id" });
UserSubmodulo.belongsTo(Submodulo, { foreignKey: "submodulo_id" });
UserSubmodulo.belongsTo(Empresa, { foreignKey: "empresa_id" });

// Relacionamentos para EquipaObra
User.hasMany(EquipaObra, { foreignKey: 'user_id', as: 'equipasMembro' });
User.hasMany(EquipaObra, { foreignKey: 'encarregado_id', as: 'equipasEncarregado' });
EquipaObra.belongsTo(User, { foreignKey: 'user_id', as: 'membro' });
EquipaObra.belongsTo(User, { foreignKey: 'encarregado_id', as: 'encarregado' });


// Relacionamento RegistoPonto com Obra
Obra.hasMany(RegistoPonto, { foreignKey: 'obra_id' });
RegistoPonto.belongsTo(Obra, { foreignKey: 'obra_id' });

Empresa.hasMany(Obra, { foreignKey: 'empresa_id' });
Obra.belongsTo(Empresa, { foreignKey: 'empresa_id' });


ParteDiariaCabecalho.hasMany(ParteDiariaItem, { foreignKey: 'DocumentoID' });
ParteDiariaItem.belongsTo(ParteDiariaCabecalho, { foreignKey: 'DocumentoID' });

// Associações BiometricCredential
BiometricCredential.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(BiometricCredential, { foreignKey: 'userId' });

// Associações POS
POS.belongsTo(Obra, { foreignKey: 'obra_predefinida_id', as: 'ObraPredefinida' });
POS.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'Empresa' });
Obra.hasMany(POS, { foreignKey: 'obra_predefinida_id' });
Empresa.hasMany(POS, { foreignKey: 'empresa_id' });

// Exportar os modelos para que as associações sejam aplicadas
module.exports = {
    User,
    Empresa,
    UserEmpresa,
    Modulo,
    UserModulo,
    Submodulo,
    UserSubmodulo,
    EmpresaModulo,
    EmpresaSubmodulo,
    RegistoPonto,
    Intervalo,
    FaltasFerias,
    PedidoAlteracao,
    Obra,
    EquipaObra,
    RegistoPontoObra,
    TrabalhadorExterno,
    Notificacao,
    ParteDiariaCabecalho,
    ParteDiariaItem,
    AnexoPedido,
    BiometricCredential,
    POS,
    Visitante,
    RegistoPontoVisitante,
    Configuracao
};