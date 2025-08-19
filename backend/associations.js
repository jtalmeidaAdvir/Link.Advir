const User = require('./models/user');
const Empresa = require('./models/empresa');
const UserEmpresa = require('./models/user_empresa');
const Modulo = require('./models/modulo');
const Submodulo = require('./models/submodulo');
const UserModulo = require('./models/user_modulo');
const UserSubmodulo = require('./models/user_submodulo');
const EmpresaModulo = require('./models/empresa_modulo');
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
const PartesDiarias = require('./models/partesDiarias');
const AnexoPedido = require('./models/anexoPedido');

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
Empresa.belongsToMany(Modulo, { through: 'EmpresaModulo', foreignKey: 'empresa_id', as: 'modulos' });
Modulo.belongsToMany(Empresa, { through: 'EmpresaModulo', foreignKey: 'modulo_id', as: 'empresas' });





// Relacionamentos para Obra
User.hasMany(PartesDiarias, { foreignKey: 'user_id' });
PartesDiarias.belongsTo(User, { foreignKey: 'user_id' });

Obra.hasMany(PartesDiarias, { foreignKey: 'obra_id' });
PartesDiarias.belongsTo(Obra, { foreignKey: 'obra_id' });

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

// Relação User -> BiometricCredential (1:N)
User.hasMany(BiometricCredential, { foreignKey: 'userId' });
BiometricCredential.belongsTo(User, { foreignKey: 'userId' });

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
    PartesDiarias,
    AnexoPedido,
    BiometricCredential,
};