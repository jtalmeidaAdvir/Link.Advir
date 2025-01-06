import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';




//HOME-PAGE
i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: {
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
                        error: "Information not available.",
                    },
                },
            },
            pt: {
                translation: {
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
                                "q1": "Como posso alterar as minhas informacoes de contrato?",
                                "a1": "Acesse a secoo 'Contrato' e clique em 'Editar'.",
                                "q2": "Quais são os metodos de pagamento disponiveis?",
                                "a2": "Pode pagar por transferencia bancaria, cartao de credito ou debito direto.",
                                "q3": "Como posso contactar o suporte?",
                                "a3": "Pode contactar o suporte pelo numero listado na secao 'Pedidos'.",
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
                        error: "Informacoes nao disponiveis.",
                    },
                },
            },
        },
        lng: "pt", // Define o idioma padrão como PT
        fallbackLng: "pt", 
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
