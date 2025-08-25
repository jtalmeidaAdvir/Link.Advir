import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import {
    createDrawerNavigator,
    DrawerContentScrollView,
    DrawerItem,
} from "@react-navigation/drawer";
import {
    View,
    Image,
    Text,
    ActivityIndicator,
    TouchableOpacity,
    ImageBackground,
    StyleSheet,
    Modal,
    Pressable,
} from "react-native";
import { List } from "react-native-paper";
import {
    FaHome,
    FaUser,
    FaTool,
    FaClock,
    FaBriefcase,
    FaSignOutAlt,
    FaCog,
} from "react-icons/fa";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native"; // Importa o hook
import backgroundPattern from "./assets/pattern.png"; // Caminho para a imagem do padrão
import { MaterialCommunityIcons } from "@expo/vector-icons";

import "bootstrap/dist/css/bootstrap.min.css";

// Importa as páginas
import Login from "./src/Pages/Autenticacao/pages/Login";
import Home from "./src/Home";
import ADHome from "./src/Pages/BackOffice/ADHome";
import Perfil from "./src/Pages/Perfil";
import PainelAdmin from "./src/Pages/Autenticacao/PainelAdmin";
import WhatsAppWebConfig from "./src/Pages/WhatsApp/WhatsAppWebConfig";
import UsersEmpresa from "./src/Pages/Autenticacao/UsersEmpresa";
import RegistoUser from "./src/Pages/Autenticacao/RegistoUser";
import RegistoAdmin from "./src/Pages/Autenticacao/RegistoAdmin";
import VerificaConta from "./src/Pages/Autenticacao/VerificaConta";
import SelecaoEmpresa from "./src/Pages/Autenticacao/pages/SelecaoEmpresa";
import RecuperarPassword from "./src/Pages/Autenticacao/RecuperarPassword";
import RedefinirPassword from "./src/Pages/Autenticacao/RedefinirPassword";

import ContratosList from "./src/Pages/BackOffice/ContratosList";

// SERVICOS
import PedidosAssistencia from "./src/Pages/Servicos/PedidosAssistencia";
import PandIByTecnico from "./src/Pages/Servicos/PandIByTecnico";
import RegistoPedido from "./src/Pages/Servicos/RegistoAssistencia";
import intervencoes from "./src/Pages/Servicos/Intervencoes";
import RegistoIntervencao from "./src/Pages/Servicos/RegistoIntervencao";
import DashboardAnalytics from "./src/Pages/Servicos/DashboardAnalytics";

// ASSIDUIDADE
import LeitorQRCode from "./src/Pages/Assiduidade/LeitorQRCode";
import PontoBotao from "./src/Pages/Assiduidade/PontoBotao";
import RegistoPontoAdmin from "./src/Pages/Assiduidade/RegistoPontoAdmin";
import PedidosAlteracaoAdmin from "./src/Pages/Assiduidade/PedidosAlteracaoAdmin";
import ListarRegistos from "./src/Pages/Assiduidade/ListarRegistos";

import RegistoPontoObra from "./src/Pages/Assiduidade/RegistoPontoObra";
import CalendarioHorasTrabalho from "./src/Pages/Assiduidade/CalendarioHorasTrabalho";

import AprovacaoFaltaFerias from "./src/Pages/Assiduidade/AprovacaoFaltaFerias";

import GestaoTrabalhadoresExternos from "./src/Pages/Obras/Externos/GestaoTrabalhadoresExternos";
import GestaoPartesDiarias from "./src/Pages/Obras/GestaoPartesDiarias";

import AprovacaoPontoPendentes from "./src/Pages/Assiduidade/AprovacaoPontoPendentes";
//Aprovaçoes Pendentes
import ConcursosAprovacao from "./src/Pages/Concursos/ConcursosAprovacao";

import Obras from "./src/Pages/Obras/Obras";
import Escritorio from "./src/Pages/Obras/Escritorio";
import PartesDiarias from "./src/Pages/Obras/PartesDiarias";

import PessoalObra from "./src/Pages/Obras/PessoalObra";

import CriarEquipa from "./src/Pages/Obras/CriarEquipa";

import RegistosPorUtilizador from "./src/Pages/Assiduidade/RegistosPorUtilizador";

import UserModulesManagement from "./src/Pages/Autenticacao/UserModulesManagement";
import logo from "./assets/app.png";
import i18n from "./src/Pages/i18n";
import { useTranslation } from "react-i18next";
import OficiosPage from "./src/Pages/Oficios/OficiosPage";
import OficiosList from "./src/Pages/Oficios/OficiosList";
import EditOficio from "./src/Pages/Oficios/EditOficio";
// Importa a nova página MapaRegistos
import MapaRegistos from "./src/Pages/Obras/MapaRegistos";

// Importa o TokenManager
import { TokenManager } from "./src/utils/TokenManager";
import { ThemeProvider } from "./ThemeContext";

const Drawer = createDrawerNavigator();

// Configuração de deep linking para reconhecer URLs com parâmetros dinâmicos como o token
const linking = {
    prefixes: [
        "https://link.advir.pt",
        "https://backend.advir.pt:8081",
        "http://localhost:19006",
    ],
    config: {
        screens: {
            RedefinirPassword: {
                path: "redefinir-password/:token",
                parse: {
                    token: (token) => token,
                },
            },
            Login: "login",
        },
    },
};

const CustomDrawerContent = ({
    isAdmin,
    isSuperAdmin,
    isLoggedIn,
    modules,
    tipoUser,
    hasContratosAtivosModule,
    hasPainelAdministracaoModule,
    hasWhatsappConfigsModule,
    hasGestaoUtilizadoresModule,
    hasRegistarUtilizadorModule,
    hasRegistoPontoAdminModule,
    hasPedidosAlteracaoAdminModule,
    ...props
}) => {
    const [expandedModules, setExpandedModules] = useState({});
    const { t } = useTranslation();

    const handleModulePress = (moduleName) => {
        setExpandedModules((prev) => ({
            ...prev,
            [moduleName]: !prev[moduleName],
        }));
    };

    const handleLogout = () => {
        localStorage.clear();
        props.navigation.navigate("Login");
        setTimeout(() => {
            window.location.reload();
        }, 500);
    };

    // Se for superAdmin, mostra apenas opções específicas
    if (isSuperAdmin) {
        return (
            <View style={drawerStyles.container}>
                {/* Header */}
                <View style={drawerStyles.header}>
                    <View style={drawerStyles.logoContainer}>
                        <Image source={logo} style={drawerStyles.logo} />
                        <Text style={drawerStyles.appName}>AdvirLink</Text>
                    </View>
                    <Text style={drawerStyles.userRole}>Super Admin</Text>
                </View>

                <DrawerContentScrollView
                    {...props}
                    contentContainerStyle={{ flexGrow: 1, paddingTop: 0 }}
                >
                    <DrawerItem
                        label="Início"
                        onPress={() => props.navigation.navigate("ADHome")}
                        icon={() => (
                            <FontAwesome
                                name="home"
                                size={18}
                                color="#1792FE"
                            />
                        )}
                        labelStyle={drawerStyles.menuItemLabel}
                        style={drawerStyles.menuItem}
                    />
                    <DrawerItem
                        label="Registo Admin"
                        onPress={() =>
                            props.navigation.navigate("RegistoAdmin")
                        }
                        icon={() => (
                            <FontAwesome
                                name="user-plus"
                                size={18}
                                color="#1792FE"
                            />
                        )}
                        labelStyle={drawerStyles.menuItemLabel}
                        style={drawerStyles.menuItem}
                    />

                    <View style={drawerStyles.bottomSection}>
                        <DrawerItem
                            label="Meu Perfil"
                            onPress={() => props.navigation.navigate("Perfil")}
                            icon={() => (
                                <FontAwesome
                                    name="user"
                                    size={18}
                                    color="#1792FE"
                                />
                            )}
                            labelStyle={drawerStyles.menuItemLabel}
                            style={drawerStyles.menuItem}
                        />
                        <DrawerItem
                            label="Sair"
                            onPress={handleLogout}
                            icon={() => (
                                <FontAwesome
                                    name="sign-out"
                                    size={18}
                                    color="#4A9EFF"
                                />
                            )}
                            labelStyle={[
                                drawerStyles.menuItemLabel,
                                { color: "#4A9EFF" },
                            ]}
                            style={[
                                drawerStyles.menuItem,
                                drawerStyles.logoutItem,
                            ]}
                        />
                    </View>
                </DrawerContentScrollView>
            </View>
        );
    }

    // Organizar módulos para drawer
    const getModuleIcon = (moduleName) => {
        const icons = {
            Obras: "building",
            Assiduidade: "clock-o",
            Servicos: "wrench",
            Oficios: "file-text",
            Administrador: "cog",
        };
        return icons[moduleName] || "circle";
    };

    const getSubmoduleIcon = (submoduleName) => {
        const icons = {
            Obras: "road",
            Escritório: "building-o",
            PartesDiarias: "book",
            Equipas: "users",
            Agenda: "calendar",
            GestaoFaltas: "check-square-o",
            GestaoPontos: "calendar-check-o",
            GestaoExternos: "user-plus",
            GestaoPartes: "clipboard",
            Ponto: "map-marker",
            MapaRegistos: "map",
            QrCode: "qrcode",
            Botao: "clock-o",
            Aprovacoes: "check-square-o",
        };
        return icons[submoduleName] || "circle-o";
    };

    // Filtrar módulos disponíveis para o usuário
    console.log(`📋 Módulos recebidos:`, modules);
    console.log(`👤 Estado atual - tipoUser: "${tipoUser}", isLoggedIn: ${isLoggedIn}`);
    console.log(`🔧 Valores do localStorage:`, {
        tipoUser: localStorage.getItem("tipoUser"),
        userTipo: localStorage.getItem("userTipo"),
        tipo_user: localStorage.getItem("tipo_user"),
        isAdmin: localStorage.getItem("isAdmin"),
        superAdmin: localStorage.getItem("superAdmin")
    });

    const availableModules = modules.filter((module) => {
        console.log(`🔍 Verificando módulo: ${module.nome}, tipoUser: "${tipoUser}"`);

        // Log detalhado para o módulo Obras
        if (module.nome === "Obras") {
            console.log(`🏗️ MÓDULO OBRAS ENCONTRADO:`, {
                moduloNome: module.nome,
                tipoUser: tipoUser,
                tipoUserType: typeof tipoUser,
                tipoUserLength: tipoUser?.length,
                isEncarregado: tipoUser === "Encarregado",
                isDiretor: tipoUser === "Diretor",
                isAdministrador: tipoUser === "Administrador",
                submodulos: module.submodulos,
                localStorageTipoUser: localStorage.getItem("tipoUser")
            });
        }

        // Se o tipoUser parece ser um JWT (contém pontos), permitir todos os módulos temporariamente
        if (tipoUser && tipoUser.includes('.')) {
            console.log(`⚠️ tipoUser parece ser um token JWT, permitindo módulo ${module.nome} temporariamente`);
            return true;
        }

        if (
            module.nome === "Obras" &&
            !(
                tipoUser === "Encarregado" ||
                tipoUser === "Diretor" ||
                tipoUser === "Administrador" ||
                tipoUser === "Trabalhador"  // Permitir Trabalhadores terem acesso ao módulo Obras
            )
        ) {
            console.log(`❌ Módulo Obras bloqueado para tipoUser: "${tipoUser}"`);
            return false;
        }
        console.log(`✅ Módulo ${module.nome} permitido para tipoUser: "${tipoUser}"`);
        return true;
    });

    console.log(`📊 Módulos disponíveis após filtro:`, availableModules);

    // Check if user has any admin module
    const hasAnyAdminModule =
        hasContratosAtivosModule ||
        hasPainelAdministracaoModule ||
        hasWhatsappConfigsModule ||
        hasGestaoUtilizadoresModule ||
        hasRegistarUtilizadorModule ||
        hasRegistoPontoAdminModule ||
        hasPedidosAlteracaoAdminModule;

    const userNome = localStorage.getItem("userNome") || "";
    const empresa = localStorage.getItem("empresaSelecionada") || "";

    return (
        <View style={drawerStyles.container}>
            {/* Header */}
            <View style={drawerStyles.header}>
                <View style={drawerStyles.logoContainer}>
                    <Image source={logo} style={drawerStyles.logo} />
                    <Text style={drawerStyles.appName}>AdvirLink</Text>
                </View>
                {userNome && (
                    <Text style={drawerStyles.userName}>{userNome}</Text>
                )}
            </View>

            <DrawerContentScrollView
                {...props}
                contentContainerStyle={{ flexGrow: 1, paddingTop: 0 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Menu Principal */}
                <View style={drawerStyles.mainSection}>
                    <DrawerItem
                        label="Início"
                        onPress={() => props.navigation.navigate("Home")}
                        icon={() => (
                            <FontAwesome
                                name="home"
                                size={18}
                                color="#1792FE"
                            />
                        )}
                        labelStyle={drawerStyles.menuItemLabel}
                        style={drawerStyles.menuItem}
                    />

                    {isLoggedIn && (
                        <DrawerItem
                            label="Selecionar Empresa"
                            onPress={() =>
                                props.navigation.navigate("SelecaoEmpresa")
                            }
                            icon={() => (
                                <FontAwesome
                                    name="building"
                                    size={18}
                                    color="#1792FE"
                                />
                            )}
                            labelStyle={drawerStyles.menuItemLabel}
                            style={drawerStyles.menuItem}
                        />
                    )}
                </View>

                {/* Módulos */}
                {isLoggedIn && availableModules.length > 0 && (
                    <View style={drawerStyles.modulesSection}>
                        {availableModules.map((module) => {
                            const hasVisibleSubmodules =
                                module.submodulos &&
                                module.submodulos.length > 0;

                            if (
                                !hasVisibleSubmodules &&
                                module.nome !== "Servicos" &&
                                module.nome !== "Oficios"
                            ) {
                                return null;
                            }

                            // Para módulos sem submódulos ou com comportamento especial
                            if (module.nome === "Servicos") {
                                return (
                                    <View
                                        key={module.nome}
                                        style={drawerStyles.moduleContainer}
                                    >
                                        <TouchableOpacity
                                            style={drawerStyles.moduleHeader}
                                            onPress={() =>
                                                handleModulePress(module.nome)
                                            }
                                        >
                                            <View
                                                style={drawerStyles.moduleTitle}
                                            >
                                                <FontAwesome
                                                    name={getModuleIcon(
                                                        module.nome,
                                                    )}
                                                    size={18}
                                                    color="#1792FE"
                                                />
                                                <Text
                                                    style={
                                                        drawerStyles.moduleText
                                                    }
                                                >
                                                    Serviços
                                                </Text>
                                            </View>
                                            <FontAwesome
                                                name={
                                                    expandedModules[module.nome]
                                                        ? "angle-down"
                                                        : "angle-right"
                                                }
                                                size={16}
                                                color="#666"
                                            />
                                        </TouchableOpacity>

                                        {expandedModules[module.nome] && (
                                            <View
                                                style={
                                                    drawerStyles.submoduleContainer
                                                }
                                            >
                                                <TouchableOpacity
                                                    style={
                                                        drawerStyles.submoduleItem
                                                    }
                                                    onPress={() =>
                                                        props.navigation.navigate(
                                                            "PedidosAssistencia",
                                                        )
                                                    }
                                                >
                                                    <FontAwesome
                                                        name="wrench"
                                                        size={16}
                                                        color="#1792FE"
                                                    />
                                                    <Text
                                                        style={
                                                            drawerStyles.submoduleText
                                                        }
                                                    >
                                                        Pedidos de Assistência
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={
                                                        drawerStyles.submoduleItem
                                                    }
                                                    onPress={() =>
                                                        props.navigation.navigate(
                                                            "PandIByTecnico",
                                                        )
                                                    }
                                                >
                                                    <FontAwesome
                                                        name="bar-chart"
                                                        size={16}
                                                        color="#1792FE"
                                                    />
                                                    <Text
                                                        style={
                                                            drawerStyles.submoduleText
                                                        }
                                                    >
                                                        Dashboard Técnico
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            }

                            if (module.nome === "Oficios") {
                                return (
                                    <View
                                        key={module.nome}
                                        style={drawerStyles.moduleContainer}
                                    >
                                        <TouchableOpacity
                                            style={drawerStyles.moduleHeader}
                                            onPress={() =>
                                                handleModulePress(module.nome)
                                            }
                                        >
                                            <View
                                                style={drawerStyles.moduleTitle}
                                            >
                                                <FontAwesome
                                                    name={getModuleIcon(
                                                        module.nome,
                                                    )}
                                                    size={18}
                                                    color="#1792FE"
                                                />
                                                <Text
                                                    style={
                                                        drawerStyles.moduleText
                                                    }
                                                >
                                                    Ofícios
                                                </Text>
                                            </View>
                                            <FontAwesome
                                                name={
                                                    expandedModules[module.nome]
                                                        ? "angle-down"
                                                        : "angle-right"
                                                }
                                                size={16}
                                                color="#666"
                                            />
                                        </TouchableOpacity>

                                        {expandedModules[module.nome] && (
                                            <View
                                                style={
                                                    drawerStyles.submoduleContainer
                                                }
                                            >
                                                <TouchableOpacity
                                                    style={
                                                        drawerStyles.submoduleItem
                                                    }
                                                    onPress={() =>
                                                        props.navigation.navigate(
                                                            "OficiosList",
                                                        )
                                                    }
                                                >
                                                    <FontAwesome
                                                        name="list"
                                                        size={16}
                                                        color="#1792FE"
                                                    />
                                                    <Text
                                                        style={
                                                            drawerStyles.submoduleText
                                                        }
                                                    >
                                                        Lista de Ofícios
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            }

                            // Não mostrar o módulo Administrador como módulo normal
                            if (module.nome === "Administrador") {
                                return null;
                            }

                            return (
                                <View
                                    key={module.nome}
                                    style={drawerStyles.moduleContainer}
                                >
                                    <TouchableOpacity
                                        style={drawerStyles.moduleHeader}
                                        onPress={() =>
                                            handleModulePress(module.nome)
                                        }
                                    >
                                        <View style={drawerStyles.moduleTitle}>
                                            <FontAwesome
                                                name={getModuleIcon(
                                                    module.nome,
                                                )}
                                                size={18}
                                                color="#1792FE"
                                            />
                                            <Text
                                                style={drawerStyles.moduleText}
                                            >
                                                {module.nome}
                                            </Text>
                                        </View>
                                        <FontAwesome
                                            name={
                                                expandedModules[module.nome]
                                                    ? "angle-down"
                                                    : "angle-right"
                                            }
                                            size={16}
                                            color="#666"
                                        />
                                    </TouchableOpacity>

                                    {expandedModules[module.nome] && (
                                        <View
                                            style={
                                                drawerStyles.submoduleContainer
                                            }
                                        >
                                            {module.submodulos.map(
                                                (submodulo) => {
                                                    // Mapear submódulos para navegação
                                                    const navigationMap = {
                                                        Obras: "Obras",
                                                        Escritório:
                                                            "Escritorio",
                                                        PartesDiarias:
                                                            "PartesDiarias",
                                                        Equipas: "CriarEquipa",
                                                        Agenda: "CalendarioHorasTrabalho",
                                                        GestaoFaltas:
                                                            "AprovacaoFaltaFerias",
                                                        GestaoPontos:
                                                            "AprovacaoPontoPendentes",
                                                        GestaoExternos:
                                                            "GestaoTrabalhadoresExternos",
                                                        GestaoPartes:
                                                            "GestaoPartesDiarias",
                                                        Ponto: "RegistoPontoObra",
                                                        MapaRegistos:
                                                            "MapaRegistos",
                                                        QrCode: "LeitorQRCode",
                                                        Botao: "PontoBotao",
                                                        Aprovacoes:
                                                            "ConcursosAprovacao",
                                                    };

                                                    const screenName =
                                                        navigationMap[
                                                        submodulo.nome
                                                        ];
                                                    if (!screenName) {
                                                        console.log(`⚠️ Submódulo sem mapeamento: ${submodulo.nome}`);
                                                        return null;
                                                    }

                                                    // Log específico para Ponto e Agenda
                                                    if (submodulo.nome === "Ponto" || submodulo.nome === "Agenda") {
                                                        console.log(`🎯 Processando submódulo ${submodulo.nome} para tipoUser: "${tipoUser}"`);
                                                    }

                                                    // Verificar permissões especiais
                                                    if (
                                                        (submodulo.nome ===
                                                            "GestaoFaltas" ||
                                                            submodulo.nome ===
                                                            "GestaoPontos") &&
                                                        !(
                                                            tipoUser ===
                                                            "Encarregado" ||
                                                            tipoUser ===
                                                            "Diretor" ||
                                                            tipoUser ===
                                                            "Administrador"
                                                        )
                                                    ) {
                                                        return null;
                                                    }

                                                    // Trabalhadores têm acesso APENAS aos submódulos Ponto e Agenda
                                                    if (tipoUser === "Trabalhador") {
                                                        if (!(submodulo.nome === "Ponto" || submodulo.nome === "Agenda")) {
                                                            console.log(`❌ Submódulo ${submodulo.nome} bloqueado para Trabalhador`);
                                                            return null;
                                                        }
                                                        console.log(`✅ Submódulo ${submodulo.nome} permitido para Trabalhador`);
                                                    }

                                                    if (
                                                        submodulo.nome ===
                                                        "GestaoExternos" &&
                                                        tipoUser !==
                                                        "Administrador"
                                                    ) {
                                                        return null;
                                                    }

                                                    if (
                                                        submodulo.nome ===
                                                        "GestaoPartes" &&
                                                        !(
                                                            tipoUser ===
                                                            "Diretor" ||
                                                            tipoUser ===
                                                            "Administrador"
                                                        )
                                                    ) {
                                                        return null;
                                                    }

                                                    const displayName =
                                                        {
                                                            PartesDiarias:
                                                                "Partes Diárias",
                                                            GestaoFaltas:
                                                                "Gestão Faltas",
                                                            GestaoPontos:
                                                                "Gestão Pontos",
                                                            GestaoExternos:
                                                                "Gestão Externos",
                                                            GestaoPartes:
                                                                "Gestão Partes Diárias",
                                                            QrCode: "Ponto QR",
                                                            Botao: "Ponto Botão",
                                                            Aprovacoes:
                                                                "Aprovações",
                                                        }[submodulo.nome] ||
                                                        submodulo.nome;

                                                    return (
                                                        <TouchableOpacity
                                                            key={submodulo.nome}
                                                            style={[
                                                                drawerStyles.submoduleItem,
                                                                {
                                                                    backgroundColor: "transparent",
                                                                }
                                                            ]}
                                                            onPress={() =>
                                                                props.navigation.navigate(
                                                                    screenName,
                                                                )
                                                            }
                                                            onPressIn={(e) => {
                                                                e.currentTarget.setNativeProps({
                                                                    style: {
                                                                        backgroundColor: "#F0F9FF",
                                                                    }
                                                                });
                                                            }}
                                                            onPressOut={(e) => {
                                                                e.currentTarget.setNativeProps({
                                                                    style: {
                                                                        backgroundColor: "transparent",
                                                                    }
                                                                });
                                                            }}
                                                            activeOpacity={0.7}
                                                        >
                                                            <FontAwesome
                                                                name={getSubmoduleIcon(
                                                                    submodulo.nome,
                                                                )}
                                                                size={18}
                                                                color="#4A9EFF"
                                                            />
                                                            <Text
                                                                style={
                                                                    drawerStyles.submoduleText
                                                                }
                                                            >
                                                                {displayName}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                },
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Área de Administração */}
                {hasAnyAdminModule && (
                    <View style={drawerStyles.adminSection}>
                        <View style={drawerStyles.sectionDivider} />
                        <TouchableOpacity
                            style={drawerStyles.moduleHeader}
                            onPress={() => handleModulePress("admin")}
                        >
                            <View style={drawerStyles.moduleTitle}>
                                <FontAwesome
                                    name="cog"
                                    size={18}
                                    color="#1792FE"
                                />
                                <Text style={drawerStyles.moduleText}>
                                    Administrador
                                </Text>
                            </View>
                            <FontAwesome
                                name={
                                    expandedModules["admin"]
                                        ? "angle-down"
                                        : "angle-right"
                                }
                                size={16}
                                color="#666"
                            />
                        </TouchableOpacity>

                        {expandedModules["admin"] && (
                            <View style={drawerStyles.submoduleContainer}>
                                {hasContratosAtivosModule && (
                                    <TouchableOpacity
                                        style={drawerStyles.submoduleItem}
                                        onPress={() =>
                                            props.navigation.navigate(
                                                "ContratosList",
                                            )
                                        }
                                    >
                                        <FontAwesome
                                            name="file-text-o"
                                            size={16}
                                            color="#1792FE"
                                        />
                                        <Text
                                            style={drawerStyles.submoduleText}
                                        >
                                            Contratos Ativos
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {hasPainelAdministracaoModule && (
                                    <TouchableOpacity
                                        style={drawerStyles.submoduleItem}
                                        onPress={() =>
                                            props.navigation.navigate(
                                                "PainelAdmin",
                                            )
                                        }
                                    >
                                        <FontAwesome
                                            name="dashboard"
                                            size={16}
                                            color="#1792FE"
                                        />
                                        <Text
                                            style={drawerStyles.submoduleText}
                                        >
                                            Painel Administração
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {hasWhatsappConfigsModule && (
                                    <TouchableOpacity
                                        style={drawerStyles.submoduleItem}
                                        onPress={() =>
                                            props.navigation.navigate(
                                                "WhatsAppWebConfig",
                                            )
                                        }
                                    >
                                        <FontAwesome
                                            name="whatsapp"
                                            size={16}
                                            color="#1792FE"
                                        />
                                        <Text
                                            style={drawerStyles.submoduleText}
                                        >
                                            WhatsApp Configs
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {hasGestaoUtilizadoresModule && (
                                    <TouchableOpacity
                                        style={drawerStyles.submoduleItem}
                                        onPress={() =>
                                            props.navigation.navigate(
                                                "UsersEmpresa",
                                            )
                                        }
                                    >
                                        <FontAwesome
                                            name="users"
                                            size={16}
                                            color="#1792FE"
                                        />
                                        <Text
                                            style={drawerStyles.submoduleText}
                                        >
                                            Gestão Utilizadores
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {hasRegistarUtilizadorModule && (
                                    <TouchableOpacity
                                        style={drawerStyles.submoduleItem}
                                        onPress={() =>
                                            props.navigation.navigate(
                                                "RegistoUser",
                                            )
                                        }
                                    >
                                        <FontAwesome
                                            name="user-plus"
                                            size={16}
                                            color="#1792FE"
                                        />
                                        <Text
                                            style={drawerStyles.submoduleText}
                                        >
                                            Registar Utilizador
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {hasRegistoPontoAdminModule && (
                                    <TouchableOpacity
                                        style={drawerStyles.submoduleItem}
                                        onPress={() =>
                                            props.navigation.navigate(
                                                "RegistoPontoAdmin",
                                            )
                                        }
                                    >
                                        <FontAwesome
                                            name="clock-o"
                                            size={16}
                                            color="#1792FE"
                                        />
                                        <Text
                                            style={drawerStyles.submoduleText}
                                        >
                                            Registo Ponto Admin
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {hasPedidosAlteracaoAdminModule && (
                                    <TouchableOpacity
                                        style={drawerStyles.submoduleItem}
                                        onPress={() =>
                                            props.navigation.navigate(
                                                "PedidosAlteracaoAdmin",
                                            )
                                        }
                                    >
                                        <FontAwesome
                                            name="edit"
                                            size={16}
                                            color="#1792FE"
                                        />
                                        <Text
                                            style={drawerStyles.submoduleText}
                                        >
                                            Pedidos Alteração Admin
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Área de Perfil e Logout */}
                <View style={drawerStyles.bottomSection}>
                    <View style={drawerStyles.sectionDivider} />
                    {localStorage.getItem("loginToken") && (
                        <DrawerItem
                            label="Meu Perfil"
                            onPress={() => props.navigation.navigate("Perfil")}
                            icon={() => (
                                <FontAwesome
                                    name="user"
                                    size={18}
                                    color="#1792FE"
                                />
                            )}
                            labelStyle={drawerStyles.menuItemLabel}
                            style={drawerStyles.menuItem}
                        />
                    )}
                    {localStorage.getItem("loginToken") && (
                        <DrawerItem
                            label="Sair"
                            icon={() => (
                                <FontAwesome
                                    name="sign-out"
                                    size={18}
                                    color="#FFFFFF"
                                />
                            )}
                            onPress={handleLogout}
                            labelStyle={[
                                drawerStyles.menuItemLabel,
                                { color: "#FFFFFF" },
                            ]}
                            style={[
                                drawerStyles.menuItem,
                                drawerStyles.logoutItem,
                            ]}
                        />
                    )}
                </View>
            </DrawerContentScrollView>
        </View>
    );
};

const AppNavigator = () => {
    const navigation = useNavigation(); // Obtém o objeto de navegação

    const [isAdmin, setIsAdmin] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState("");
    const [userNome, setUserNome] = useState("");
    const [empresa, setEmpresa] = useState("");
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [languageSelectorVisible, setLanguageSelectorVisible] =
        useState(false);
    const [hoveredLanguage, setHoveredLanguage] = useState(null);
    const [initialRoute, setInitialRoute] = useState("Login"); // Define a rota inicial com Login por padrão
    const [tipoUser, setTipoUser] = useState("");
    const [profileMenuVisible, setProfileMenuVisible] = useState(false);

    // Filtros para submódulos do módulo Administrador
    const hasContratosAtivosModule = modules.some(
        (module) =>
            module.nome === "Administrador" &&
            module.submodulos.some((sub) => sub.nome === "ContratosAtivos"),
    );
    const hasPainelAdministracaoModule = modules.some(
        (module) =>
            module.nome === "Administrador" &&
            module.submodulos.some((sub) => sub.nome === "PainelAdministracao"),
    );
    const hasWhatsappConfigsModule = modules.some(
        (module) =>
            module.nome === "Administrador" &&
            module.submodulos.some((sub) => sub.nome === "WhatsappConfigs"),
    );
    const hasGestaoUtilizadoresModule = modules.some(
        (module) =>
            module.nome === "Administrador" &&
            module.submodulos.some((sub) => sub.nome === "GestaoUtilizadores"),
    );
    const hasRegistarUtilizadorModule = modules.some(
        (module) =>
            module.nome === "Administrador" &&
            module.submodulos.some((sub) => sub.nome === "RegistarUtilizador"),
    );
    const hasRegistoPontoAdminModule = modules.some(
        (module) =>
            module.nome === "Administrador" &&
            module.submodulos.some((sub) => sub.nome === "RegistoPontoAdmin"),
    );
    const hasPedidosAlteracaoAdminModule = modules.some(
        (module) =>
            module.nome === "Administrador" &&
            module.submodulos.some(
                (sub) => sub.nome === "PedidosAlteracaoAdmin",
            ),
    );

    // Dentro de AppNavigator:
    const fetchUserData = async () => {
        setLoading(true);
        const token = localStorage.getItem("loginToken");
        const empresaLs = localStorage.getItem("empresaSelecionada");
        let tipoUserLs = localStorage.getItem("tipoUser");

        // Verificar se tipoUser é um token JWT em vez do valor correto
        if (tipoUserLs && tipoUserLs.includes('.')) {
            console.log(`⚠️ tipoUser parece ser um token JWT, tentando recuperar o valor correto...`);
            // Tentar recuperar de outras fontes ou limpar
            tipoUserLs = localStorage.getItem("userTipo") || localStorage.getItem("tipo_user") || "";
            if (!tipoUserLs) {
                console.log(`🔧 Tentando decodificar informações do token...`);
                try {
                    // Se ainda não temos o tipo, podemos tentar recuperar do token de login
                    const payload = JSON.parse(atob(token.split(".")[1]));
                    // Note: normalmente o tipo não está no token, mas vamos verificar
                    console.log(`📋 Payload do token:`, payload);
                } catch (error) {
                    console.error("Erro ao decodificar token:", error);
                }
            }
        }

        console.log(`👤 fetchUserData - Dados do localStorage:`, {
            token: token ? "exists" : "null",
            empresa: empresaLs,
            tipoUser: tipoUserLs,
            tipoUserOriginal: localStorage.getItem("tipoUser")
        });

        if (token && isTokenValid(token)) {
            setIsLoggedIn(true);
            setIsSuperAdmin(localStorage.getItem("superAdmin") === "true");
            setIsAdmin(localStorage.getItem("isAdmin") === "true");
            setUsername(localStorage.getItem("username") || "");
            setUserNome(localStorage.getItem("userNome") || "");
            setEmpresa(empresaLs || "");
            setTipoUser(tipoUserLs || "");

            console.log(`✅ Estado definido - tipoUser: "${tipoUserLs}"`);

            // buscar módulos (agora com filtro por empresa)
            await fetchUserModules();

            // definir rota inicial
            if (localStorage.getItem("superAdmin") === "true") {
                setInitialRoute("ADHome");
            } else if (tipoUserLs && empresaLs) {
                setInitialRoute("RegistoPontoObra");
            } else if (empresaLs) {
                setInitialRoute("Home");
            } else {
                setInitialRoute("SelecaoEmpresa");
            }

            // Configurar notificações após login
            //setupNotifications();
        } else {
            localStorage.clear();
            setIsLoggedIn(false);
            setInitialRoute("Login");
        }

        setLoading(false);
    };

    /* const setupNotifications = async () => {
        try {
            // Solicitar permissão para notificações se ainda não foi concedida
            if (!isPermissionGranted) {
                await requestNotificationPermission();
            }

            // Agendar lembrete de registo de ponto
            await scheduleRegistoPontoReminder();
        } catch (error) {
            console.error('Erro ao configurar notificações:', error);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);
*/

    const fetchUserModules = async () => {
        const token = localStorage.getItem("loginToken");
        const userId = localStorage.getItem("userId");
        const empresaId = localStorage.getItem("empresa_id");

        console.log(`🔧 fetchUserModules - Parâmetros:`, {
            userId,
            empresaId,
            hasToken: !!token
        });

        if (userId && token) {
            try {
                let url = `https://backend.advir.pt/api/users/${userId}/modulos-e-submodulos`;

                // Se há empresa selecionada, adicionar o parâmetro
                if (empresaId) {
                    url += `?empresa_id=${empresaId}`;
                }

                console.log(`🌐 Fazendo request para:`, url);

                const response = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();

                console.log(`📨 Resposta da API:`, data);
                console.log(`📁 Módulos recebidos:`, data.modulos);

                setModules(data.modulos || []);
            } catch (error) {
                console.error("Erro ao buscar módulos:", error);
                setModules([]);
            }
        } else {
            console.log(`❌ fetchUserModules - Dados em falta:`, {
                userId: !!userId,
                token: !!token
            });
        }
    };

    // Função para verificar se o token é válido
    const isTokenValid = (token) => {
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const currentTime = Date.now() / 1000;
            return payload.exp > currentTime;
        } catch (error) {
            console.error("Erro ao verificar token:", error);
            return false;
        }
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem("loginToken");
            const empresa = localStorage.getItem("empresaSelecionada");
            let tipoUser = localStorage.getItem("tipoUser");

            // Verificar se tipoUser é um token JWT e tentar corrigir
            if (tipoUser && tipoUser.includes('.')) {
                console.log(`🔧 Detectado tipoUser como JWT, tentando recuperar valor correto...`);
                tipoUser = localStorage.getItem("userTipo") || localStorage.getItem("tipo_user") || "";

                // Se ainda não encontramos, definir como vazio para forçar nova seleção
                if (!tipoUser || tipoUser.includes('.')) {
                    console.log(`❌ Não foi possível recuperar tipoUser válido, limpando...`);
                    localStorage.removeItem("tipoUser");
                    tipoUser = "";
                }
            }

            console.log(`🔍 fetchUserData - valores após verificação:`, {
                token: token ? "exists" : "null",
                empresa,
                tipoUser,
                originalTipoUser: localStorage.getItem("tipoUser")
            });

            // Verificar se o token existe e é válido
            if (token && isTokenValid(token)) {
                setIsLoggedIn(true);
                setIsSuperAdmin(localStorage.getItem("superAdmin") === "true");
                setIsAdmin(localStorage.getItem("isAdmin") === "true");
                setUsername(localStorage.getItem("username") || "");
                setUserNome(localStorage.getItem("userNome") || "");
                setEmpresa(empresa || "");
                setTipoUser(tipoUser || "");

                await fetchUserModules();

                // Definir a rota inicial baseada no estado
                if (localStorage.getItem("superAdmin") === "true") {
                    setInitialRoute("ADHome");
                } else if (tipoUser && empresa) {
                    // Se tipoUser está definido e tem empresa, vai direto para RegistoPontoObra
                    setInitialRoute("RegistoPontoObra");
                } else if (empresa) {
                    setInitialRoute("Home");
                } else {
                    setInitialRoute("SelecaoEmpresa");
                }
            } else {
                // Token inválido ou inexistente - limpar localStorage e ir para login
                localStorage.clear();
                setIsLoggedIn(false);
                setInitialRoute("Login");
            }

            setLoading(false);
        };

        fetchUserData();
    }, []);

    const toggleLanguageSelector = () => {
        setLanguageSelectorVisible(!languageSelectorVisible); // Alterna a visibilidade do combobox de idiomas
    };

    const handleLanguageHover = (language) => {
        setHoveredLanguage(language); // Atualiza o idioma que está em hover
    };

    const handleLanguageLeave = () => {
        setHoveredLanguage(null); // Restaura quando o hover sai
    };

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        setProfileMenuVisible(false);
        setInitialRoute("Login");
        setTimeout(() => {
            window.location.reload();
        }, 500);
    };

    const toggleProfileMenu = () => {
        setProfileMenuVisible(!profileMenuVisible);
    };

    // Fechar dropdown do perfil automaticamente após 5 segundos
    useEffect(() => {
        if (profileMenuVisible) {
            const timer = setTimeout(() => {
                setProfileMenuVisible(false);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [profileMenuVisible]);

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <ActivityIndicator size="large" color="#1792FE" />
                <Text>A carregar...</Text>
            </View>
        );
    }

    return (
        <ThemeProvider>
            <TokenManager>
                <Drawer.Navigator
                    key={
                        tipoUser +
                        JSON.stringify(tipoUser) +
                        isLoggedIn +
                        isAdmin +
                        isSuperAdmin +
                        modules
                    } // Adiciona uma chave única para forçar a atualização do Drawer
                    initialRouteName={initialRoute}
                    drawerContent={(props) => (
                        <CustomDrawerContent
                            {...props}
                            isAdmin={isAdmin}
                            isSuperAdmin={isSuperAdmin}
                            isLoggedIn={isLoggedIn}
                            modules={modules}
                            tipoUser={tipoUser}
                            hasContratosAtivosModule={hasContratosAtivosModule}
                            hasPainelAdministracaoModule={
                                hasPainelAdministracaoModule
                            }
                            hasWhatsappConfigsModule={hasWhatsappConfigsModule}
                            hasGestaoUtilizadoresModule={
                                hasGestaoUtilizadoresModule
                            }
                            hasRegistarUtilizadorModule={
                                hasRegistarUtilizadorModule
                            }
                            hasRegistoPontoAdminModule={
                                hasRegistoPontoAdminModule
                            }
                            hasPedidosAlteracaoAdminModule={
                                hasPedidosAlteracaoAdminModule
                            }
                        />
                    )}
                    screenOptions={({ navigation }) => ({
                        headerStyle: {
                            backgroundColor: "#FFFFFF",
                            elevation: 8,
                            shadowColor: "#E5E7EB",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 12,
                            height: 80,
                        },
                        headerTintColor: "#4A9EFF",
                        headerTitle: () => (
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    flex: 1,
                                    justifyContent: "center",
                                }}
                            >
                                <Image
                                    source={logo}
                                    style={{
                                        width: 36,
                                        height: 36,
                                        resizeMode: "contain",
                                        marginRight: 12,
                                        borderRadius: 8,
                                    }}
                                />
                                <Text
                                    style={{
                                        fontSize: 20,
                                        fontWeight: "700",
                                        color: "#4A9EFF",
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    
                                </Text>
                            </View>
                        ),
                        headerRight: () => (
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginRight: 20,
                                    position: "relative",
                                }}
                            >
                                {/* Botão de perfil/login */}
                                <TouchableOpacity
                                    onPress={() => {
                                        console.log(
                                            "Clicou no botão do perfil",
                                            isLoggedIn,
                                        );
                                        if (isLoggedIn) {
                                            toggleProfileMenu();
                                        } else {
                                            navigation.navigate("Login");
                                        }
                                    }}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        backgroundColor: "rgba(30, 64, 175, 0.1)",
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                        borderRadius: 20,
                                        position: "relative",
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <View
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: "rgba(30, 64, 175, 0.2)",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            marginRight: 8,
                                        }}
                                    >
                                        <FontAwesome
                                            name="user"
                                            size={16}
                                            color="#4A9EFF"
                                        />
                                    </View>
                                    <View style={{ alignItems: "flex-start" }}>
                                        <Text
                                            style={{
                                                color: "#4A9EFF",
                                                fontSize: 14,
                                                fontWeight: "600",
                                            }}
                                        >
                                            {userNome || "Utilizador"}
                                        </Text>
                                        {empresa && (
                                            <Text
                                                style={{
                                                    color: "#4A9EFF",
                                                    fontSize: 12,
                                                    fontWeight: "500",
                                                }}
                                            >
                                                {empresa}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>

                                {/* Modal do perfil */}
                                {/* Menu de perfil com click-outside */}
                                <Modal
                                    transparent
                                    visible={profileMenuVisible && isLoggedIn}
                                    animationType="fade"
                                    onRequestClose={() =>
                                        setProfileMenuVisible(false)
                                    }
                                >
                                    {/* Backdrop que fecha ao clicar fora */}
                                    <Pressable
                                        style={StyleSheet.absoluteFill}
                                        onPress={() =>
                                            setProfileMenuVisible(false)
                                        }
                                    />

                                    {/* Contentor para posicionar o dropdown no canto superior direito */}
                                    <View
                                        pointerEvents="box-none"
                                        style={{ flex: 1 }}
                                    >
                                        <View
                                            style={[
                                                profileMenuStyles.dropdown,
                                                {
                                                    position: "absolute",
                                                    top: 56,
                                                    right: 10,
                                                }, // ajusta se precisares
                                            ]}
                                        >
                                            <TouchableOpacity
                                                style={[
                                                    profileMenuStyles.menuItem,
                                                    profileMenuStyles.buttonStyle,
                                                ]}
                                                onPress={() => {
                                                    setProfileMenuVisible(
                                                        false,
                                                    );
                                                    navigation.navigate(
                                                        "Perfil",
                                                    );
                                                }}
                                                activeOpacity={0.6}
                                            >
                                                <FontAwesome
                                                    name="user"
                                                    size={16}
                                                    color="#1792FE"
                                                />
                                                <Text
                                                    style={
                                                        profileMenuStyles.menuText
                                                    }
                                                >
                                                    Perfil
                                                </Text>
                                            </TouchableOpacity>

                                            <View
                                                style={
                                                    profileMenuStyles.divider
                                                }
                                            />

                                            <TouchableOpacity
                                                style={[
                                                    profileMenuStyles.menuItem,
                                                    profileMenuStyles.buttonStyle,
                                                ]}
                                                onPress={() => {
                                                    setProfileMenuVisible(
                                                        false,
                                                    );
                                                    handleLogout();
                                                }}
                                                activeOpacity={0.6}
                                            >
                                                <FontAwesome
                                                    name="sign-out"
                                                    size={16}
                                                    color="#1792FE"
                                                />
                                                <Text
                                                    style={
                                                        profileMenuStyles.menuText
                                                    }
                                                >
                                                    Sair
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </Modal>

                                {/* Botão de Idioma */}
                                <TouchableOpacity
                                    onPress={toggleLanguageSelector} // Alterna a visibilidade do combobox de idiomas
                                    style={{ marginRight: 10, marginLeft: 10 }}
                                >
                                    <Text
                                        style={{
                                            color: "#1792FE",
                                            fontSize: 16,
                                        }}
                                    >
                                        {i18n.language === "pt" ? "PT" : "EN"}
                                    </Text>
                                </TouchableOpacity>

                                {/* Exibe o combobox de idiomas se estiver visível */}
                                {languageSelectorVisible && (
                                    <View
                                        style={{
                                            position: "absolute",
                                            top: 50,
                                            right: 0,
                                            width: 75,
                                            backgroundColor: "white",
                                            borderRadius: 5,
                                            shadowColor: "#000",
                                            shadowOpacity: 0.25,
                                            shadowRadius: 3.5,
                                            elevation: 5,
                                        }}
                                    >
                                        <TouchableOpacity
                                            onPress={() => {
                                                i18n.changeLanguage("pt");
                                                setLanguageSelectorVisible(
                                                    false,
                                                ); // Fecha o combobox
                                            }}
                                            onMouseEnter={() =>
                                                handleLanguageHover("pt")
                                            } // Evento de hover
                                            onMouseLeave={handleLanguageLeave} // Evento de sair do hover
                                            style={{
                                                padding: 10,
                                                backgroundColor:
                                                    hoveredLanguage === "pt"
                                                        ? "#e1e1e1"
                                                        : "transparent",
                                            }}
                                        >
                                            <Text style={{ fontSize: 16 }}>
                                                PT-PT
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                i18n.changeLanguage("en");
                                                setLanguageSelectorVisible(
                                                    false,
                                                ); // Fecha o combobox
                                            }}
                                            onMouseEnter={() =>
                                                handleLanguageHover("en")
                                            } // Evento de hover
                                            onMouseLeave={handleLanguageLeave} // Evento de sair do hover
                                            style={{
                                                padding: 10,
                                                backgroundColor:
                                                    hoveredLanguage === "en"
                                                        ? "#e1e1e1"
                                                        : "transparent",
                                            }}
                                        >
                                            <Text style={{ fontSize: 16 }}>
                                                EN-EN
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ),
                    })}
                >
                    <Drawer.Screen name="Login">
                        {(props) => (
                            <Login
                                {...props}
                                setIsLoggedIn={setIsLoggedIn}
                                setIsAdmin={setIsAdmin}
                                setUsername={setUsername}
                                setUserNome={setUserNome}
                                onLoginComplete={fetchUserData}
                            />
                        )}
                    </Drawer.Screen>

                    {isSuperAdmin && (
                        <>
                            <Drawer.Screen name="ADHome" component={ADHome} />
                            <Drawer.Screen
                                name="RegistoAdmin"
                                component={RegistoAdmin}
                            />
                        </>
                    )}

                    <Drawer.Screen
                        name="ListarRegistos"
                        component={ListarRegistos}
                        options={{
                            title: "AdvirLink - Registos",
                            drawerItemStyle: { display: "none" },
                        }}
                    />
                    <Drawer.Screen
                        name="LeitorQRCode"
                        component={LeitorQRCode}
                    />
                    <Drawer.Screen
                        name="RegistoPontoObra"
                        component={RegistoPontoObra}
                    />
                    <Drawer.Screen
                        name="CalendarioHorasTrabalho"
                        component={CalendarioHorasTrabalho}
                    />

                    <Drawer.Screen
                        name="AprovacaoFaltaFerias"
                        component={AprovacaoFaltaFerias}
                    />
                    <Drawer.Screen
                        name="GestaoTrabalhadoresExternos"
                        component={GestaoTrabalhadoresExternos}
                    />
                    <Drawer.Screen
                        name="AprovacaoPontoPendentes"
                        component={AprovacaoPontoPendentes}
                    />
                    <Drawer.Screen
                        name="GestaoPartesDiarias"
                        component={GestaoPartesDiarias}
                    />

                    <Drawer.Screen
                        name="RegistosPorUtilizador"
                        component={RegistosPorUtilizador}
                    />

                    {(() => {
                        const canAccessObras = !loading &&
                            (tipoUser === "Encarregado" ||
                                tipoUser === "Diretor" ||
                                tipoUser === "Administrador");

                        console.log(`🏗️ Verificando acesso às screens de Obras:`, {
                            loading,
                            tipoUser,
                            canAccessObras
                        });

                        return canAccessObras;
                    })() && (
                            <>
                                <Drawer.Screen
                                    name="Obras"
                                    component={Obras}
                                    options={{
                                        title: "AdvirLink - Obras",
                                    }}
                                />
                                <Drawer.Screen
                                    name="Escritorio"
                                    component={Escritorio}
                                    options={{
                                        title: "AdvirLink - Escritório",
                                    }}
                                />

                                <Drawer.Screen
                                    name="PartesDiarias"
                                    component={PartesDiarias}
                                />
                                <Drawer.Screen
                                    name="CriarEquipa"
                                    component={CriarEquipa}
                                />
                                <Drawer.Screen
                                    name="PessoalObra"
                                    component={PessoalObra}
                                    options={{
                                        drawerItemStyle: { display: "none" },
                                    }}
                                />
                                {/* Adicionar a nova tela ao Drawer.Navigator */}
                                <Drawer.Screen
                                    name="MapaRegistos"
                                    component={MapaRegistos}
                                    options={{
                                        title: "AdvirLink - Mapa Registos",
                                    }}
                                />
                            </>
                        )}

                    <Drawer.Screen name="PontoBotao" component={PontoBotao} />
                    <Drawer.Screen
                        name="Perfil"
                        options={{ title: "AdvirLink - Perfil" }}
                    >
                        {(props) => (
                            <Perfil
                                {...props}
                                user={{ name: userNome, company: empresa }}
                            />
                        )}
                    </Drawer.Screen>

                    <Drawer.Screen
                        name="ConcursosAprovacao"
                        component={ConcursosAprovacao}
                        options={{
                            title: "AdvirLink - Pedidos de Assistência",
                        }}
                    />
                    <Drawer.Screen
                        name="PedidosAssistencia"
                        component={PedidosAssistencia}
                        options={{
                            title: "AdvirLink - Pedidos de Assistência",
                        }}
                    />
                    <Drawer.Screen
                        name="PandIByTecnico"
                        component={PandIByTecnico}
                        options={{ title: "AdvirLink - Dashboard Técnico" }}
                    />
                    <Drawer.Screen
                        name="RegistoIntervencao"
                        component={RegistoIntervencao}
                        options={{
                            title: "AdvirLink - Intervenção",
                            drawerItemStyle: { display: "none" },
                        }}
                    />
                    <Drawer.Screen
                        name="RegistarPedido"
                        component={RegistoPedido}
                        options={{
                            title: "AdvirLink - Pedido",
                            drawerItemStyle: { display: "none" },
                        }}
                    />
                    <Drawer.Screen
                        name="Intervencoes"
                        component={intervencoes}
                        options={{
                            title: "AdvirLink - Intervenção",
                            drawerItemStyle: { display: "none" },
                        }}
                    />
                    <Drawer.Screen
                        name="DashboardAnalytics"
                        component={DashboardAnalytics}
                        options={{ title: "AdvirLink - Dashboard Analytics" }}
                    />

                    <Drawer.Screen
                        name="RegistoPontoAdmin"
                        component={RegistoPontoAdmin}
                    />
                    <Drawer.Screen
                        name="PedidosAlteracaoAdmin"
                        component={PedidosAlteracaoAdmin}
                    />
                    <Drawer.Screen
                        name="UserModulesManagement"
                        component={UserModulesManagement}
                        options={{ drawerItemStyle: { display: "none" } }}
                    />
                    <Drawer.Screen
                        name="VerificaConta"
                        component={VerificaConta}
                        options={{ drawerItemStyle: { display: "none" } }}
                    />
                    <Drawer.Screen
                        name="OficiosPage"
                        component={OficiosPage}
                        options={{ title: "AdvirLink - Oficios" }}
                    />
                    <Drawer.Screen
                        name="OficiosList"
                        component={OficiosList}
                        options={{ title: "AdvirLink - Oficios" }}
                    />
                    <Drawer.Screen
                        name="EditOficio"
                        component={EditOficio}
                        options={{ title: "AdvirLink - Oficios" }}
                    />
                    <Drawer.Screen
                        name="Home"
                        component={Home}
                        options={{ title: "AdvirLink - Home" }}
                    />
                    {isLoggedIn && (
                        <Drawer.Screen
                            name="SelecaoEmpresa"
                            options={{ title: "AdvirLink - Empresa" }}
                        >
                            {(props) => (
                                <SelecaoEmpresa
                                    {...props}
                                    setEmpresa={setEmpresa}
                                />
                            )}
                        </Drawer.Screen>
                    )}
                    <Drawer.Screen
                        name="RecuperarPassword"
                        component={RecuperarPassword}
                        options={{ drawerItemStyle: { display: "none" } }}
                    />
                    <Drawer.Screen
                        name="RedefinirPassword"
                        component={RedefinirPassword}
                        options={{ drawerItemStyle: { display: "none" } }}
                    />

                    {hasPainelAdministracaoModule && (
                        <Drawer.Screen
                            name="PainelAdmin"
                            component={PainelAdmin}
                        />
                    )}
                    {hasWhatsappConfigsModule && (
                        <Drawer.Screen
                            name="WhatsAppWebConfig"
                            component={WhatsAppWebConfig}
                        />
                    )}
                    {hasGestaoUtilizadoresModule && (
                        <Drawer.Screen
                            name="UsersEmpresa"
                            component={UsersEmpresa}
                        />
                    )}
                    {hasContratosAtivosModule && (
                        <Drawer.Screen
                            name="ContratosList"
                            component={ContratosList}
                        />
                    )}
                    {hasRegistarUtilizadorModule && (
                        <Drawer.Screen
                            name="RegistoUser"
                            component={RegistoUser}
                        />
                    )}
                </Drawer.Navigator>
            </TokenManager>
        </ThemeProvider>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: "100%",
        height: "100%",
        justifyContent: "center", // Garante que o conteúdo está centrado
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.7)", // Ajusta a opacidade para suavizar o padrão
    },
});

    const drawerStyles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: "#F8FAFC",
        },
        header: {
            backgroundColor: "#4A9EFF",
            paddingTop: 50,
            paddingBottom: 25,
            paddingHorizontal: 24,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            shadowColor: "#4A9EFF",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
        },
        logoContainer: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
            justifyContent: "center",
        },
        logo: {
            width: 40,
            height: 40,
            marginRight: 12,
            borderRadius: 8,
        },
        appName: {
            fontSize: 24,
            fontWeight: "700",
            color: "#FFFFFF",
            letterSpacing: 0.5,
        },
        userName: {
            fontSize: 16,
            color: "#E0E7FF",
            fontWeight: "600",
            textAlign: "center",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 12,
            marginTop: 8,
        },
        userRole: {
            fontSize: 13,
            color: "#C7D2FE",
            fontWeight: "500",
            textAlign: "center",
            marginTop: 4,
        },
        mainSection: {
            paddingTop: 16,
            paddingHorizontal: 4,
        },
        modulesSection: {
            paddingTop: 12,
            paddingHorizontal: 4,
        },
        adminSection: {
            paddingTop: 12,
            paddingHorizontal: 4,
        },
        bottomSection: {
            marginTop: "auto",
            paddingBottom: 24,
            paddingHorizontal: 4,
        },
        sectionDivider: {
            height: 1,
            backgroundColor: "#E2E8F0",
            marginVertical: 16,
            marginHorizontal: 20,
        },
        menuItem: {
            marginHorizontal: 12,
            marginVertical: 3,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: "#FFFFFF",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 1,
        },
        menuItemLabel: {
            fontSize: 16,
            paddingHorizontal: 1,
            fontWeight: "600",
            color: "#64748B",
            marginLeft: "-10 !important",
        },
        logoutItem: {
            backgroundColor: "#4A9EFF",
            borderWidth: 1,
            borderColor: "#4A9EFF",
        },
        moduleContainer: {
            marginHorizontal: 12,
            marginVertical: 6,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
            overflow: "hidden",
        },
        moduleHeader: {
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 16,            
            shadowOpacity: 0.08,
            
            shadowRadius: 8,
            justifyContent: "space-between",
            paddingVertical: 16,
            paddingHorizontal: 20,
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: "#FFFFFF",
        },
        moduleTitle: {
            flexDirection: "row",
            alignItems: "center",
        },
        moduleText: {
            fontSize: 15,
            fontWeight: "600",
            color: "#64748B",
            marginLeft: 35,
        },
        submoduleContainer: {
            backgroundColor: "#FFFFFF",
            paddingVertical: 8,
        },
        submoduleItem: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 24,
            marginVertical: 2,
            marginHorizontal: 8,
            borderRadius: 10,
            backgroundColor: "transparent",
            transition: "background-color 0.2s ease",
        },
        submoduleText: {
            fontSize: 15,
            color: "#64748B",
            marginLeft: 14,
            fontWeight: "600",
        },
    });

const profileMenuStyles = StyleSheet.create({
    dropdown: {
        position: "absolute",
        top: "100%",
        right: 0,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
        minWidth: 180,
        zIndex: 1000,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        paddingHorizontal: 20,
        minHeight: 52,
        backgroundColor: "transparent",
    },
    buttonStyle: {
        cursor: "pointer",
        backgroundColor: "transparent",
        borderRadius: 12,
        marginHorizontal: 6,
        marginVertical: 3,
        transition: "background-color 0.2s ease",
    },
    menuText: {
        marginLeft: 14,
        fontSize: 15,
        fontWeight: "600",
        color: "#374151",
    },
    divider: {
        height: 1,
        backgroundColor: "#F3F4F6",
        marginHorizontal: 12,
        marginVertical: 6,
    },
});

export default function App() {
    const [appReady, setAppReady] = useState(false);

    useEffect(() => {
        // Só para garantir que o AppNavigator não carrega antes de saber o tipoUser
        setTimeout(() => setAppReady(true), 100); // pequeno delay para garantir fetchUserData concluir
    }, []);

    return (
        <NavigationContainer linking={linking}>
            <ImageBackground
                source={backgroundPattern}
                style={styles.background}
            >
                <View style={styles.overlay}>
                    {appReady && <AppNavigator />}
                </View>
            </ImageBackground>
        </NavigationContainer>
    );
}
