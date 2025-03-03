import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const storedLanguage = localStorage.getItem('Idioma') || 'pt';
i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: {

                    Home: {
                        welcome: "Customer Area - Advir",
                        menu: {
                            contract: "Contract",
                            orders: "Orders",
                            products: "Products",
                            faq: "FAQ",
                        },
                        loading: "Loading information...",
                        error: "An error occurred: ",
                        Pedidos: {
                            title: "Content related to Orders.",
                        },
                        faq: {
                            title: "Frequently Asked Questions",
                            "questions":
                            {
                                "q1": "How can I change my contract information?",
                                "a1": "Go to the 'Contract' section and click 'Edit'.",
                                "q2": "What payment methods are available?",
                                "a2": "You can pay by bank transfer, credit card, or direct debit.",
                                "q3": "How can I contact support?",
                                "a3": "You can contact support using the number listed in the 'Orders' section.",
                            },
                        },
                        products: {
                            primavera: "Primavera",
                            advirLink: "AdvirLink",
                            syslog: "Syslog",
                        },
                        contratoinfo: {
                            title: "Contract Information",
                            codigo: "Code:",
                            descricao: "Description:",
                            horascontrato: "Contracted Hours:",
                            horasgastas: "Hours Spent:",
                            horasdisponiveis: "Available Hours",
                            error: "Information not available.",
                        },
                    },
                    Drawer: {
                        ADM: {
                            title: "> Administrator",
                            1: "> Admin Panel",
                            2: "> User Management",
                            3: "> Register User",
                            4: "> Admin Time Log",
                            5: "> Admin Change Requests",
                        },
                        Perfil: "My Profile",
                        Home: "Home",
                        SelecaoEmpresa: "Select Company",
                        Obra: "Projects",
                        Servicos: "Service Request",
                        ServicosTecnicos: "Tech Requests",
                        PontoQR: "Attendance (QR Code)",
                        PontoBT: "Attendance (Button)",

                        Exit: "Logout",
                    },
                    Login:{
                        Title: "Welcome",
                        BtLogin: "Login", 
                        TxtUsername: "Username",
                        TxtPass: "Password",
                        LinkRecoverPass: "Forgot your password?",
                        Error:{
                            1:"Error logging in",
                        },
                    },
                    RecuperarPassword: {
                        Title: "Recover My Password",
                        TxtEmail: "Enter your email",
                        LinkLogin: "Back to Login",
                        BtRecuperar: "Recover",
                        Avisos: {
                            Sucesso:"Email sent successfully! Please check your inbox.",
                        },
                        Error: {
                            1:"Error sending email.",
                        },
                    },
                    RedefenirPassword: {
                        Error: {
                            1: "The passwords do not match.",
                        },
                        TxtNovaPass: "New Password",
                        TxtConfirmar: "Confirm Password",
                        BtRedefenir: "Reset",
                        Title: "Reset Password",
                    },
                    RegistoUser: {
                        Title: "User Registration",
                        TxtUser: "Username",
                        TxtNome: "Name",
                        TxtPass: "Password",
                        TxtEmpresaArea: "Company or Client Area",
                        CBSelecionarEmpresa: "Select the Company",
                        BtRegistar: "Register",
                        Alert: {
                            1: "User created successfully.",
                        },
                    },
                    SelecaoEmpresa: {
                        Error: {
                            1: "Error retrieving companies.",
                        },
                        Aviso: {
                            1: "Please select a company.",
                        },
                        Title: "Select the Company",
                        CbSelecionar: "Select the Company",
                        BtEntrar: "Enter the Company",
                    },
                    UserModulesManagement: {
                        Title: "User Module Management", 
                    },
                    UsersEmpresa: {
                        Title: "Users",
                        procurar: "🔍 Search...",
                        Selecionar: "Select a Company",
                        BtAdcionar: "Add",
                        BtRemover: "Remove",
                    },
                    VerificaConta: {
                        Title: "Change Password",
                        TxtNovaPass: "New Password",
                        TxtConfirmar: "Confirm Password",
                        Btconfirmar: "Confirm",
                        Aviso: {
                            1: "Password updated successfully.",
                        },
                    },
                    PedidosAssistencia: {
                        Title: "Assistance Requests",
                        TxtProcurar: "🔍 Search...",
                        BtCriarPedido: "+ Request",
                        Aviso: {
                            1: "No requests found.",
                            2: "Are you sure you want to delete this request?",
                        },
                        BtCancelar: "Cancel",
                        BtEliminar: "Delete",
                        Pedido: {
                            TxtCliente: "Client:",
                            TxtDataAbert: "Opening Date:",
                            TxtPrioridade: "Priority:",
                            TxtEstado: "Status:",
                            TxtDescricao: "Description:",
                        },
                        Prioridades: {
                            1: "Low",
                            2: "Medium",
                            3: "High",
                        },
                        Estados: {
                            1: "New",
                            2: "Pending",
                            3: "Completed",
                        },
                        TxtPrioridade: "Priority:",
                        TxtEstado:"Status:",
                    },
                    RegistoAssistencia: {
                        Aviso: {
                            1: "Please fill in all required fields.",
                            2: "Request created successfully!",
                        },
                        Title: "Assistance Log",
                        TxtCliente:"Client",
                        TxtContacto:"Contact",
                        TxtTecnico:"Technician",
                        TxtOrigem: "Source",
                        Title2: "Assistance Details",
                        TxtObjeto: "Subject",
                        TxtPrioridade: "Priority",
                        TxtSecao: "Section",
                        TxtEstado:"Status",
                        TxtTipoProcesso: "Process Type",
                        TxtContrato: "Contract",
                        TxtProblema: "Issue",
                        TxtComoReproduzir: "How to Reproduce",
                        BtCancelar: "Cancel",
                        BtGravando: "Recording...",
                        BtGravar: "Record",
                    },
                    Intervencoes: {
                        Title: "Interventions",
                        Procurar: "🔍 Search...",
                        BtCriarIntervencao: "+ Intervention",
                        Aviso: {
                            1: "No intervention found.",
                            1: "Are you sure you want to delete this intervention?",
                        },
                        BtCancelar: "Cancel",
                        BtEliminar: "Delete",
                        BtVoltar: "Back",
                        Intervencao: {
                            Title: "Intervention:",
                            TxtInicio: "Start:",
                            TxtFim: "End:",
                            TxtDuracao: "Duration:",
                            TxtTipo: "Type:",
                            TxtTecnico: "Technician:",
                            TxtDescricao: "Description:",
                        },
                    },
                    RegistoIntervencao: {
                        Aviso:{
                            1: "Please fill in all required fields before proceeding.",
                            2:"Intervention saved successfully!",
                            3:"Success!",
                            4:"Close",
                        },
                        Title: "Intervention Log",
                        TxtTipoInter: "Type of Intervention",
                        TxtTecnico: "Technician",
                        DataInicio: "Start Date",
                        DataFim: "End Date",
                        HoraInicio: "Start Time",
                        HoraFim: "End Time",
                        Descricao: "Description",
                        Estado: "Status",
                        Tipo: "Type",
                        SubTitulo: "Add Items/Services",
                        SelecioneArtigo: "Select an Item",
                        Remover: "Remove",
                        Cancelar: "Cancel",
                        Criar: "Create Intervention",
                        Loading: "Loading...",
                        AddArtigo: "Add Item",
                        OcultarArtigo: "Hide Item Form",
                        Add: "Add",
                        Atualizar: "Update",
                        Expandir: "Expand",
                        Recolher: "Collapse",
                    },
                    Perfil: {
                        Alerta: {
                            1: "Image uploaded successfully.",
                            2: "The passwords do not match.",
                            3: "Password changed successfully.",
                        },
                        Error:{
                            1:"Error uploading image.",
                            2:"Error changing the password.",
                        },
                        Title: "Welcome",
                        Carregar: "Upload Image",
                        Alterar: "Change password",
                        Novapass: "New Password",
                        Confirmarpass: "Confirm Password",
                        Gravar: "Save",
                        ModalPergunta: "Are you sure you want to change the password?",
                        ModalCancelar: "Cancel",
                        ModalSim: "Yes",
                    },
                },
            },
            pt: {
                translation: {
                    Home: {
                        welcome: "Area do Cliente - Advir",
                        menu: {
                            contract: "Contrato",
                            orders: "Pedidos",
                            products: "Produtos",
                            faq: "FAQ",
                        },
                        loading: "Carregando informacoes...",
                        error: "Ocorreu um erro: ",
                        Pedidos: {
                            title: "Conteudo relacionado com Pedidos.",
                        },
                        faq: {
                            title: "Perguntas Frequentes",
                            "questions":
                            {
                                "q1": "As faturas que incluem produtos alimentares com isenção do IVA devem conter alguma menção?",
                                "a1": "Sim. As faturas que titulem operações abrangidas pela isenção prevista na Lei n.º 17/2023, de 14 de abril, devem conter a menção “IVA – Isenção prevista na Lei n.º 17/2023, de 14 de abril”..",
                                "q2": "O ERP PRIMAVERA suporta a faturação eletrónica? (CV)",
                                "a2": "Sim. O ERP suporta desde outubro de 2021 o regime jurídico de faturação eletrónica de Cabo Verde (ver comunicado). No entanto, para implementar este novo regime jurídico no ERP deverá garantir um conjunto de configurações importantes para a correta comunicação à DNRE.",
                                "q3": "Quais são as condições necessárias para garantir o inventário permanente?",
                                "a3": "Para garantir o inventário permanente, é necessário configurar todos os documentos de inventário para integrar com a contabilidade, bem como ter um cenário de contabilização definido.",
                                "q4": "Definição dos anos de suspensão no regime IRS Jovem",
                                "a4":"De acordo com as alterações ao regime fiscal IRS Jovem para 2025, a isenção referente a este regime não se aplica nos anos em que não sejam auferidos rendimentos das categorias A e B. Voltará a aplicar-se pelo número de anos de obtenção de rendimentos remanescente até perfazer um total de 10 anos de gozo da isenção, sem ultrapassar a idade máxima dos 35 anos.Para indicar no cálculo do IRS Jovem os anos em que não foram obtidos rendimentos, a ficha do funcionário do módulo de Recursos Humanos passa a disponibilizar o campo Anos de Suspensão, em que será possível indicar o número de anos que deverão ser subtraídos ao cálculo dos anos de rendimento a considerar para o IRS Jovem.Esta alteração está disponível a partir da versão 10.0020.1090 do módulo de Recursos Humanos.",
                                "q5": "Atualizações legais para 2025 aplicáveis a Recursos Humanos",
                                "a5":"A Cegid encara todos os temas relacionadas com a fiscalidade/legalidade como obrigatórios e prioritários. Neste sentido, o módulo de Recursos Humanos do ERP v10 e ERP Evolution foi atualizado para incluir as alterações legais recentemente aprovadas.",

                            }

                        },
                        products: {
                            primavera: "Primavera",
                            advirLink: "AdvirLink",
                            syslog: "Syslog",
                        },
                        contratoinfo: {
                            title: "Informacoes do Contrato",
                            codigo: "Codigo:",
                            descricao: "Descricao:",
                            horascontrato: "Horas Contratualizadas:",
                            horasgastas: "Horas Gastas:",
                            horasdisponiveis:"Horas Disponíveis:",
                            error: "Informacoes nao disponiveis.",
                        },
                    },
                    Drawer: {
                        ADM: {
                            title: "> Administrador",
                            1: "> Painel de Administracao",
                            2: "> Gestao de Utilizadores",
                            3: "> Registar Utilizador",
                            4: "> Registo Ponto Admin",
                            5: "> Pedidos Alteração Admin",
                        },
                        Perfil: "Meu Perfil",
                        Home: "Inicio",
                        SelecaoEmpresa: "Selecionar Empresa",
                        Obra: "Obras",
                        Servicos: "Pedido de Assistência",
                        ServicosTecnicos: "Dashboard Técnico",
                        PontoQR: "Assiduidade (QR Code)",
                        PontoBT: "Assiduidade (Botao)",

                        Exit: "Sair",
                    },
                    Login: {
                        Title: "Bem Vindo",
                        BtLogin: "Entrar",
                        TxtUsername: "Utilizador",
                        
                        TxtPass: "Palavra-passe",
                        LinkRecoverPass: "Esqueceu-se da sua palavra-passe?",
                        Error: {
                            1:"Erro ao fazer login",
                        },
                    },
                    RecuperarPassword: {
                        Title: "Recuperar a Minha Palavra-Passe",
                        TxtEmail: "Insere o teu email",
                        LinkLogin: "Voltar ao Login",
                        BtRecuperar: "Recuperar",
                        Avisos: {
                            Sucesso: "Email enviado com sucesso! Verifique a sua caixa de entrada.",
                        },
                        Error: {
                            1: "Erro ao enviar email.",
                        },
                    },
                    RedefenirPassword: {
                        Error: {
                            
                            1: "As passwords não coincidem.",
                        },
                        TxtNovaPass: "Nova Palavara-Passe",
                        TxtConfirmar: "Confirmar Palavra-Passe",
                        BtRedefenir: "Redefinir",
                        Title: "Redefinir Password",
                    },
                    RegistoUser: {
                        Title: "Registo de Utilizador",
                        TxtUser: "Utilizador",
                        TxtNome: "Nome",
                        TxtPass: "Palavra-passe",
                        TxtEmpresaArea: "Empresa ou Area de Cliente",
                        CBSelecionarEmpresa: "Selecione a Empresa",
                        BtRegistar: "Registar",
                        Alert: {
                            1: "Utilizador criado com sucesso.",
                        },
                    },
                    SelecaoEmpresa: {
                        Error: {
                            1: "Erro ao obter as empresas.",
                        },
                        Aviso: {
                            1: "Por favor, selecione uma empresa.",
                        },
                        Title: "Selecione a Empresa",
                        CbSelecionar: "Selecione a Empresa",
                        BtEntrar: "Entrar na Empresa",
                    },
                    UserModulesManagement: {
                        Title:"Gestao de Modulos do Utilizador",
                    },
                    UsersEmpresa: {
                        Title: "Utilizadores",
                        procurar: "🔍 Procurar...",
                        Selecionar: "Selecione uma Empresa",
                        BtAdcionar: "Adicionar",
                        BtRemover: "Remover",
                    },
                    VerificaConta: {
                        Title: "Alterar Password",
                        TxtNovaPass: "Nova Palavara-Passe",
                        TxtConfirmar: "Confirmar Palavra-Passe",
                        Btconfirmar: "Confirmar",
                        Aviso: {
                            1:"Password atualizada com sucesso.",
                        },
                    },
                    PedidosAssistencia: {
                        Title: "Pedidos de Assistência",
                        TxtProcurar: "🔍 Procurar...",
                        BtCriarPedido: "+ Pedido",
                        Aviso:{
                            1: "Nenhum pedido encontrado.",
                            2: "Tem certeza que deseja eliminar este pedido?",
                        },
                        BtEliminar: "Eliminar",
                        BtCancelar: "Cancelar",
                        Pedido: {
                            TxtCliente:"Cliente:",
                            TxtDataAbert:"Data de Abertura:",
                            TxtPrioridade:"Prioridade:",
                            TxtEstado:"Estado:",
                            TxtDescricao:"Descrição:",
                        },
                        Prioridades:{
                            1: "Baixa",
                            2: "Média",
                            3: "Alta",
                        },
                        Estados: {
                            1: "Novos",
                            2: "Pendentes",
                            3: "Terminados",
                        },
                        TxtPrioridade: "Prioridade:",
                        TxtEstado: "Estado:",
                    },
                    RegistoAssistencia: {
                        Aviso: {
                            1:"Por favor, preencha todos os campos obrigatórios.",
                            2:"Pedido criado com sucesso!",
                        },
                        Title: "Registo de Assistencia",
                        TxtCliente: "Cliente",
                        TxtContacto: "Contacto",
                        TxtTecnico: "Tecnico",
                        TxtOrigem: "Origem",
                        Title2: "Detalhes da Assistencia",
                        TxtObjeto: "Objeto",
                        TxtPrioridade: "Prioridade",
                        TxtSecao: "Secção",
                        TxtEstado: "Estado",
                        TxtTipoProcesso: "Tipo Processo",
                        TxtContrato: "Contrato",
                        TxtProblema: "Problema",
                        TxtComoReproduzir: "Como Reproduzir",
                        BtCancelar: "Cancelar",
                        BtGravando: "Gravando...",
                        BtGravar: "Gravar",
                    },
                    Intervencoes: {
                        Title: "Intervenções",
                        Procurar: "🔍 Procurar...",
                        BtCriarIntervencao: "+ Intervenção",
                        Aviso: {
                            1:"Nenhuma intervenção encontrada",
                            2:"Tem certeza que deseja eliminar esta intervenção?",
                        },
                        BtCancelar: "Cancelar",
                        BtEliminar: "Eliminar",
                        BtVoltar: "Voltar",
                        Intervencao: {
                            Title:"Intervenção:",
                            TxtInicio:"Início:",
                            TxtFim:"Fim:",
                            TxtDuracao:"Duração:",
                            TxtTipo:"Tipo:",
                            TxtTecnico:"Técnico:",
                            TxtDescricao:"Descrição:",
                        },

                    },
                    RegistoIntervencao: {
                        Aviso: {
                            1: "Por favor, preencha todos os campos obrigatorios antes de prosseguir.",
                            2: "Intervenção gravada com sucesso!",
                            3: "Sucesso!",
                            4: "Fechar",
                        },
                        Title: "Registo de Intervenções",
                        TxtTipoInter: "Tipo",
                        TxtTecnico: "Tecnico",
                        DataInicio: "Data Inicio",
                        DataFim: "Data Fim",
                        HoraInicio: "Hora Inicio",
                        HoraFim: "Hora Fim",
                        Descricao: "Descrição",
                        Estado: "Estado",
                        Tipo: "Tipo",
                        SubTitulo: "Adicionar Artigos/Servicos",
                        SelecioneArtigo: "Selecione um Artigo",
                        Remover: "Remover",
                        Cancelar: "Cancelar",
                        Criar: "Criar Intervencão",
                        Loading: "Carregando...",
                        AddArtigo: "Adicionar Artigo",
                        OcultarArtigo: "Ocultar Formulario de Artigo",
                        Add: "Adicionar",
                        Atualizar: "Atualizar",
                        Expandir: "Expandir",
                        Recolher: "Recolher",
                    },
                    Perfil: {
                        Alerta: {
                            1: "Imagem carregada com sucesso.",
                            2: "As passwords não coincidem.",
                            3: "Password alterada com sucesso.",
                        },
                        Error: {
                            1: "Erro ao carregar imagem.",
                            2: "Erro ao alterar a password.",
                        },
                        Title: "Bem Vindo",
                        Carregar: "Carregar Imagem",
                        Alterar: "Alterar password",
                        Novapass: "Nova Password",
                        Confirmarpass: "Confirmar Password",
                        Gravar: "Gravar",
                        ModalPergunta: "Deseja realmente alterar a password?",
                        ModalCancelar: "Cancelar",
                        ModalSim: "Sim",
                    },
                },
            },
        },
        lng: storedLanguage, // Define o idioma padrão como PT
        fallbackLng: "pt", 
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
